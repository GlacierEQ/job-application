from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path
from typing import Any

SCHEMA = "glaciereq.workflow-topology.v1"
OUTPUT_SCHEMA = "glaciereq.workflow-role-lens.v1"
ROLE_WEIGHTS = {
    "recruiter": {
        "job-application": 8,
        "helix": 7,
        "receipt-router": 5,
        "doctor-strange": 2,
        "pro-code-runtime": 2,
    },
    "engineering-lead": {
        "pro-code-runtime": 8,
        "tower-of-babel": 7,
        "helix": 5,
        "akos": 4,
        "doctor-strange": 3,
    },
    "systems-architect": {
        "akos": 8,
        "sigma-glue": 8,
        "doctor-strange": 7,
        "tower-of-babel": 6,
        "pro-code-runtime": 5,
        "receipt-router": 4,
    },
}


class RoleLensError(ValueError):
    pass


def _stable(value: Any) -> str:
    return json.dumps(value, sort_keys=True, separators=(",", ":"), ensure_ascii=False)


def _receipt(value: Any) -> str:
    return hashlib.sha256(_stable(value).encode("utf-8")).hexdigest()


def _validate_topology(topology: dict[str, Any]) -> None:
    if topology.get("schema") != SCHEMA:
        raise RoleLensError(f"unsupported topology schema: {topology.get('schema')!r}")
    flows = topology.get("flows")
    if not isinstance(flows, list) or not flows:
        raise RoleLensError("topology.flows must be a non-empty list")
    for flow in flows:
        if not isinstance(flow, dict) or not flow.get("id") or not flow.get("name"):
            raise RoleLensError("every flow requires id and name")
        steps = flow.get("steps")
        if not isinstance(steps, list) or not steps:
            raise RoleLensError(f"flow {flow.get('id')} has no steps")
        for step in steps:
            system = step.get("system") if isinstance(step, dict) else None
            if not isinstance(system, dict) or not system.get("id"):
                raise RoleLensError(f"flow {flow.get('id')} contains a step without system.id")


def build_role_lens(topology: dict[str, Any], role: str) -> dict[str, Any]:
    _validate_topology(topology)
    if role not in ROLE_WEIGHTS:
        raise RoleLensError(f"unknown role: {role}; expected one of {', '.join(sorted(ROLE_WEIGHTS))}")

    weights = ROLE_WEIGHTS[role]
    ranked = []
    for flow in topology["flows"]:
        systems = [step["system"]["id"] for step in flow["steps"]]
        contributions = []
        score = 0
        for system_id in systems:
            weight = weights.get(system_id, 0)
            if weight:
                contributions.append({"system_id": system_id, "weight": weight})
                score += weight
        # WHY: reward cross-system proof breadth, but keep explicit role relevance dominant.
        breadth_bonus = min(len(set(systems)), 4)
        score += breadth_bonus
        ranked.append(
            {
                "flow_id": flow["id"],
                "name": flow["name"],
                "intent": flow.get("intent", ""),
                "score": score,
                "breadth_bonus": breadth_bonus,
                "matched_systems": contributions,
                "systems": systems,
                "steps": flow["steps"],
            }
        )

    ranked.sort(key=lambda item: (-item["score"], item["flow_id"]))
    core = {
        "schema": OUTPUT_SCHEMA,
        "role": role,
        "topology_receipt_sha256": topology.get("receipt_sha256"),
        "ranking_policy": {
            "role_weights": weights,
            "breadth_bonus": "min(unique_system_count, 4)",
            "tie_breaker": "flow_id ascending",
        },
        "ranked_flows": ranked,
    }
    return {**core, "receipt_sha256": _receipt(core)}


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Rank GlacierEQ workflow topology for a recruiter-facing role lens."
    )
    parser.add_argument("--topology", required=True, type=Path)
    parser.add_argument("--role", required=True, choices=sorted(ROLE_WEIGHTS))
    parser.add_argument("--output", type=Path)
    args = parser.parse_args()

    topology = json.loads(args.topology.read_text(encoding="utf-8"))
    result = build_role_lens(topology, args.role)
    rendered = json.dumps(result, indent=2, ensure_ascii=False) + "\n"
    if args.output:
        args.output.parent.mkdir(parents=True, exist_ok=True)
        tmp = args.output.with_suffix(args.output.suffix + ".tmp")
        tmp.write_text(rendered, encoding="utf-8")
        tmp.replace(args.output)
    print(rendered, end="")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

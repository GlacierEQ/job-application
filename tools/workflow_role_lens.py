from __future__ import annotations

import argparse
import hashlib
import json
import math
from pathlib import Path
from typing import Any

SCHEMA = "glaciereq.workflow-topology.v1"
OUTPUT_SCHEMA = "glaciereq.workflow-role-lens.v2"
FRESHNESS_SCHEMA = "glaciereq.evidence-freshness.v1"
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
    return json.dumps(
        value,
        sort_keys=True,
        separators=(",", ":"),
        ensure_ascii=False,
        allow_nan=False,
    )


def _receipt(value: Any) -> str:
    try:
        rendered = _stable(value)
    except (TypeError, ValueError) as exc:
        raise RoleLensError(f"role-lens payload is not strict JSON: {exc}") from exc
    return hashlib.sha256(rendered.encode("utf-8")).hexdigest()


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
                raise RoleLensError(
                    f"flow {flow.get('id')} contains a step without system.id"
                )


def _verify_freshness_receipt(freshness: dict[str, Any]) -> None:
    receipt = freshness.get("receipt_sha256")
    if (
        not isinstance(receipt, str)
        or len(receipt) != 64
        or any(char not in "0123456789abcdef" for char in receipt)
    ):
        raise RoleLensError("freshness receipt_sha256 must be exact lowercase SHA-256")
    unsigned = {
        key: value for key, value in freshness.items() if key != "receipt_sha256"
    }
    expected = _receipt(unsigned)
    if receipt != expected:
        raise RoleLensError("freshness receipt_sha256 does not match freshness content")


def _freshness_by_system(freshness: dict[str, Any] | None) -> dict[str, dict[str, Any]]:
    if freshness is None:
        return {}
    if freshness.get("schema") != FRESHNESS_SCHEMA:
        raise RoleLensError(
            f"unsupported freshness schema: {freshness.get('schema')!r}"
        )
    _verify_freshness_receipt(freshness)
    entries = freshness.get("entries")
    if not isinstance(entries, list) or not entries:
        raise RoleLensError("freshness.entries must be a non-empty list")
    indexed: dict[str, dict[str, Any]] = {}
    for entry in entries:
        if not isinstance(entry, dict):
            raise RoleLensError("freshness entry must be an object")
        system_id = str(entry.get("id") or "").strip()
        weight = entry.get("freshness_weight")
        state = str(entry.get("state") or "").strip()
        age_days = entry.get("age_days")
        if not system_id or system_id in indexed:
            raise RoleLensError(f"invalid or duplicate freshness id: {system_id!r}")
        if not isinstance(weight, (int, float)) or isinstance(weight, bool):
            raise RoleLensError(f"freshness {system_id} requires numeric weight")
        if not math.isfinite(float(weight)) or weight < 0 or weight > 1:
            raise RoleLensError(
                f"freshness {system_id} weight must be finite and within 0..1"
            )
        if state not in {"fresh", "aging", "stale"}:
            raise RoleLensError(f"freshness {system_id} has invalid state: {state!r}")
        if not isinstance(age_days, int) or isinstance(age_days, bool) or age_days < 0:
            raise RoleLensError(
                f"freshness {system_id} age_days must be a non-negative integer"
            )
        indexed[system_id] = entry
    return indexed


def build_role_lens(
    topology: dict[str, Any],
    role: str,
    freshness: dict[str, Any] | None = None,
) -> dict[str, Any]:
    _validate_topology(topology)
    if role not in ROLE_WEIGHTS:
        raise RoleLensError(
            f"unknown role: {role}; expected one of {', '.join(sorted(ROLE_WEIGHTS))}"
        )

    weights = ROLE_WEIGHTS[role]
    freshness_index = _freshness_by_system(freshness)
    freshness_enabled = freshness is not None
    ranked = []
    for flow in topology["flows"]:
        systems = [step["system"]["id"] for step in flow["steps"]]
        contributions = []
        static_role_score = 0
        freshness_adjusted_score = 0.0
        proof_freshness_weights = []
        for system_id in systems:
            role_weight = weights.get(system_id, 0)
            static_role_score += role_weight
            evidence_freshness = freshness_index.get(system_id)
            if freshness_enabled and evidence_freshness is None:
                freshness_weight = 0.0
                freshness_state = "unverified"
                age_days = None
            elif evidence_freshness is None:
                freshness_weight = 1.0
                freshness_state = "not-applied"
                age_days = None
            else:
                freshness_weight = float(evidence_freshness["freshness_weight"])
                freshness_state = evidence_freshness["state"]
                age_days = evidence_freshness["age_days"]
            weighted = round(role_weight * freshness_weight, 6)
            freshness_adjusted_score += weighted
            proof_freshness_weights.append(freshness_weight)
            contributions.append(
                {
                    "system_id": system_id,
                    "role_weight": role_weight,
                    "freshness_weight": freshness_weight,
                    "freshness_state": freshness_state,
                    "age_days": age_days,
                    "weighted_contribution": weighted,
                }
            )

        # WHY: breadth represents the whole proof chain, so every proof node must carry
        # freshness. A zero-role-weight node can still weaken confidence in the flow.
        breadth_bonus = min(len(set(systems)), 4)
        if freshness_enabled and proof_freshness_weights:
            freshness_breadth_factor = sum(proof_freshness_weights) / len(
                proof_freshness_weights
            )
        elif freshness_enabled:
            freshness_breadth_factor = 0.0
        else:
            freshness_breadth_factor = 1.0
        adjusted_breadth_bonus = round(breadth_bonus * freshness_breadth_factor, 6)
        score = round(freshness_adjusted_score + adjusted_breadth_bonus, 6)
        ranked.append(
            {
                "flow_id": flow["id"],
                "name": flow["name"],
                "intent": flow.get("intent", ""),
                "score": score,
                "static_role_score": static_role_score,
                "freshness_adjusted_role_score": round(freshness_adjusted_score, 6),
                "breadth_bonus": breadth_bonus,
                "freshness_adjusted_breadth_bonus": adjusted_breadth_bonus,
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
        "freshness_receipt_sha256": freshness.get("receipt_sha256")
        if freshness_enabled
        else None,
        "ranking_policy": {
            "role_weights": weights,
            "freshness": (
                "role contribution multiplied by verified evidence freshness; missing proof scores zero"
                if freshness_enabled
                else "not applied; backward-compatible unit weight"
            ),
            "breadth_bonus": "min(unique_system_count, 4) scaled by mean freshness across the full proof chain",
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
    parser.add_argument("--freshness", type=Path)
    parser.add_argument("--output", type=Path)
    args = parser.parse_args()

    topology = json.loads(args.topology.read_text(encoding="utf-8"))
    freshness = (
        json.loads(args.freshness.read_text(encoding="utf-8"))
        if args.freshness
        else None
    )
    result = build_role_lens(topology, args.role, freshness)
    rendered = json.dumps(result, indent=2, ensure_ascii=False, allow_nan=False) + "\n"
    if args.output:
        args.output.parent.mkdir(parents=True, exist_ok=True)
        tmp = args.output.with_suffix(args.output.suffix + ".tmp")
        tmp.write_text(rendered, encoding="utf-8")
        tmp.replace(args.output)
    print(rendered, end="")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

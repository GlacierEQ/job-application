from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path
from typing import Any

try:
    from tools.workflow_role_lens import RoleLensError, build_role_lens
except ModuleNotFoundError:
    from workflow_role_lens import RoleLensError, build_role_lens

OUTPUT_SCHEMA = "glaciereq.recruiter-proof-brief.v1"


def _stable(value: Any) -> str:
    return json.dumps(value, sort_keys=True, separators=(",", ":"), ensure_ascii=False)


def _receipt(value: Any) -> str:
    return hashlib.sha256(_stable(value).encode("utf-8")).hexdigest()


def _require_text(value: Any, field: str, flow_id: str) -> str:
    if not isinstance(value, str) or not value.strip():
        raise RoleLensError(f"flow {flow_id} requires non-empty {field}")
    return value.strip()


def _compile_flow(flow: dict[str, Any]) -> dict[str, Any]:
    flow_id = _require_text(flow.get("flow_id"), "flow_id", "unknown")
    proof_points: list[dict[str, str]] = []
    ceilings: list[dict[str, str]] = []
    repositories: list[str] = []

    for step in flow.get("steps", []):
        if not isinstance(step, dict) or not isinstance(step.get("system"), dict):
            raise RoleLensError(f"flow {flow_id} contains malformed step")
        system = step["system"]
        system_id = _require_text(system.get("id"), "system.id", flow_id)
        evidence = _require_text(system.get("evidence"), "system.evidence", flow_id)
        repo = _require_text(system.get("repo"), "system.repo", flow_id)
        if not repo.startswith("https://github.com/GlacierEQ/"):
            raise RoleLensError(
                f"flow {flow_id} repo outside GlacierEQ boundary: {repo}"
            )
        proof_points.append(
            {
                "system_id": system_id,
                "evidence": evidence,
                "contribution": str(step.get("transition") or "").strip(),
            }
        )
        limit = str(system.get("limit") or "").strip()
        if limit:
            ceilings.append({"system_id": system_id, "limit": limit})
        if repo not in repositories:
            repositories.append(repo)

    if not proof_points:
        raise RoleLensError(f"flow {flow_id} has no recruiter-usable proof points")

    return {
        "flow_id": flow_id,
        "name": _require_text(flow.get("name"), "name", flow_id),
        "intent": str(flow.get("intent") or "").strip(),
        "score": flow.get("score"),
        "proof_points": proof_points,
        "current_ceilings": ceilings,
        "repositories": repositories,
    }


def build_recruiter_brief(
    topology: dict[str, Any], role: str, top_k: int = 3
) -> dict[str, Any]:
    if not isinstance(top_k, int) or top_k < 1 or top_k > 10:
        raise RoleLensError("top_k must be an integer from 1 through 10")

    lens = build_role_lens(topology, role)
    selected = lens["ranked_flows"][:top_k]
    compiled = [_compile_flow(flow) for flow in selected]
    core = {
        "schema": OUTPUT_SCHEMA,
        "role": role,
        "topology_receipt_sha256": lens.get("topology_receipt_sha256"),
        "role_lens_receipt_sha256": lens["receipt_sha256"],
        "selection_policy": {
            "top_k": top_k,
            "ordering": "workflow_role_lens score descending then flow_id ascending",
            "evidence_policy": "surface source evidence and current ceilings without inventing claims",
        },
        "briefs": compiled,
    }
    return {**core, "receipt_sha256": _receipt(core)}


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Compile ranked GlacierEQ workflow evidence into a recruiter-facing proof brief."
    )
    parser.add_argument("--topology", required=True, type=Path)
    parser.add_argument("--role", required=True)
    parser.add_argument("--top-k", type=int, default=3)
    parser.add_argument("--output", type=Path)
    args = parser.parse_args()

    topology = json.loads(args.topology.read_text(encoding="utf-8"))
    result = build_recruiter_brief(topology, args.role, args.top_k)
    rendered = json.dumps(result, indent=2, ensure_ascii=False) + "\n"
    if args.output:
        args.output.parent.mkdir(parents=True, exist_ok=True)
        temp = args.output.with_suffix(args.output.suffix + ".tmp")
        temp.write_text(rendered, encoding="utf-8")
        temp.replace(args.output)
    print(rendered, end="")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

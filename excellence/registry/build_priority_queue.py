#!/usr/bin/env python3
"""Derive a compact, deterministic execution queue from the live registry."""
from __future__ import annotations

import json
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
REGISTRY = ROOT / "excellence" / "registry" / "excellence-repo-registry.json"
OUTPUT = ROOT / "excellence" / "registry" / "excellence-priority-queue.json"

ACTION_ORDER = {
    "REPAIR_STATE": 0,
    "ADVANCE_GATE": 1,
    "INITIALIZE_STATE": 2,
    "EVOLVE": 3,
    "REVIEW_SIDE_EXIT": 4,
    "RETRY_INSPECTION": 5,
}


def main() -> int:
    registry = json.loads(REGISTRY.read_text(encoding="utf-8"))
    groups: dict[tuple[str, str], list[dict]] = defaultdict(list)
    for record in registry["repositories"]:
        state = record["state"]
        action = state["next_action_class"]
        gate = state.get("next_failing_gate") or "NONE"
        groups[(action, gate)].append(
            {
                "company": record["company"],
                "repository": record["repository"],
                "head_sha": record.get("head_sha"),
                "declared_principal_state": state.get("declared_principal_state"),
                "effective_principal_state": state["effective_principal_state"],
                "observed": record.get("observed", {}),
                "prerequisite_errors": state.get("prerequisite_errors", []),
                "disposition_errors": state.get("disposition_errors", []),
            }
        )

    queue = []
    for (action, gate), records in sorted(
        groups.items(),
        key=lambda item: (
            ACTION_ORDER.get(item[0][0], 99),
            item[0][1],
            min(row["repository"] for row in item[1]),
        ),
    ):
        records.sort(key=lambda row: row["repository"])
        queue.append(
            {
                "priority": len(queue) + 1,
                "action": action,
                "gate": gate,
                "count": len(records),
                "repositories": records,
            }
        )

    out = {
        "schema": "glaciereq.excellence-priority-queue.v1",
        "registry_generated_at": registry["generated_at"],
        "registry_authority": registry["authority"],
        "ordering": "repair invalid claimed state; advance valid state; initialize missing state; evolve mature state",
        "queue": queue,
    }
    OUTPUT.write_text(json.dumps(out, indent=2) + "\n", encoding="utf-8")
    print("priority-queue:", " ".join(f"{item['action']}:{item['gate']}={item['count']}" for item in queue))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

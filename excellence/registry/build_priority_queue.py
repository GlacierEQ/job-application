#!/usr/bin/env python3
"""Derive a deterministic execution queue from the live excellence registry.

For mature EVOLVING repositories, the next operation is not another state gate.
The queue resolves each repository's existing evolution_cursor from the exact live
head captured by the registry so mature work remains actionable instead of being
collapsed into EVOLVE:NONE.
"""

from __future__ import annotations

import json
import os
from collections import defaultdict
from pathlib import Path
from typing import Any, Callable

import build_registry

ROOT = Path(__file__).resolve().parents[2]
REGISTRY = ROOT / "excellence" / "registry" / "excellence-repo-registry.json"
OUTPUT = ROOT / "excellence" / "registry" / "excellence-priority-queue.json"
STATE_PATH = "machine/excellence-state.json"

ACTION_ORDER = {
    "REPAIR_STATE": 0,
    "ADVANCE_GATE": 1,
    "INITIALIZE_STATE": 2,
    "EVOLVE": 3,
    "REVIEW_SIDE_EXIT": 4,
    "RETRY_INSPECTION": 5,
}


def _normalize_evolution_cursor(value: Any, repository: str) -> str:
    if not isinstance(value, str) or not value.strip():
        raise ValueError(f"{repository}: EVOLVING state lacks evolution_cursor")
    cursor = value.strip()
    if not cursor.startswith("next:") or len(cursor) <= len("next:"):
        raise ValueError(
            f"{repository}: evolution_cursor must be a material next:* cursor"
        )
    return cursor


def _material_action(cursor: str) -> str:
    return cursor.split(":", 1)[1]


def build_queue(
    registry: dict[str, Any],
    *,
    token: str | None = None,
    fetch_state: Callable[[str, str, str, str | None], tuple[dict[str, Any], str]] | None = None,
) -> dict[str, Any]:
    """Build a queue while preserving exact-head evolution intent.

    `fetch_state` is injectable for deterministic unit tests. Production uses the
    same exact-ref JSON reader as the live registry builder.
    """
    fetch_state = fetch_state or build_registry.fetch_json_file
    groups: dict[tuple[str, str], list[dict[str, Any]]] = defaultdict(list)

    for record in registry["repositories"]:
        state = record["state"]
        action = state["next_action_class"]
        evolution_cursor = None
        evolution_state_blob_sha = None

        if action == "EVOLVE":
            repository = record["repository"]
            head_sha = record.get("head_sha")
            if not isinstance(head_sha, str) or not head_sha:
                raise ValueError(f"{repository}: EVOLVE requires exact head_sha")
            raw_state, evolution_state_blob_sha = fetch_state(
                repository,
                STATE_PATH,
                head_sha,
                token,
            )
            if raw_state.get("principal_state") != "EVOLVING":
                raise ValueError(
                    f"{repository}: exact-head state changed during queue derivation"
                )
            evolution_cursor = _normalize_evolution_cursor(
                raw_state.get("evolution_cursor"), repository
            )
            gate = "EVOLUTION_CURSOR"
        else:
            gate = state.get("next_failing_gate") or "NONE"

        groups[(action, gate)].append(
            {
                "company": record["company"],
                "repository": record["repository"],
                "head_sha": record.get("head_sha"),
                "inspection_status": record.get("inspection_status"),
                "inspection_error": record.get("error"),
                "declared_principal_state": state.get("declared_principal_state"),
                "effective_principal_state": state["effective_principal_state"],
                "evolution_cursor": evolution_cursor,
                "next_material_action": (
                    _material_action(evolution_cursor) if evolution_cursor else None
                ),
                "evolution_state_blob_sha": evolution_state_blob_sha,
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

    return {
        "schema": "glaciereq.excellence-priority-queue.v1",
        "registry_generated_at": registry["generated_at"],
        "registry_authority": registry["authority"],
        "ordering": (
            "repair invalid claimed state; advance valid state; initialize missing "
            "state; evolve mature state from exact-head evolution cursors"
        ),
        "queue": queue,
    }


def main() -> int:
    registry = json.loads(REGISTRY.read_text(encoding="utf-8"))
    out = build_queue(registry, token=os.environ.get("GH_TOKEN"))
    OUTPUT.write_text(json.dumps(out, indent=2) + "\n", encoding="utf-8")
    print(
        "priority-queue:",
        " ".join(f"{item['action']}:{item['gate']}={item['count']}" for item in out["queue"]),
    )
    evolving = [
        row
        for item in out["queue"]
        if item["action"] == "EVOLVE"
        for row in item["repositories"]
    ]
    if evolving:
        print(
            "evolution-cursors:",
            " | ".join(
                f"{row['repository']}={row['evolution_cursor']}" for row in evolving
            ),
        )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

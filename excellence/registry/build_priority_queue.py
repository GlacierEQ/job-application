#!/usr/bin/env python3
"""Derive a deterministic execution queue from the live excellence registry.

For mature EVOLVING repositories, the next operation is material evolution from the
exact-head evolution cursor. Tower-of-Babel placement remains useful engineering
analysis, but it is advisory metadata and may not become a prerequisite that blocks
or replaces the material action.

Within the EVOLVE cohort, repositories with fewer successfully consumed evolution
cursors are ordered first. This prevents one repository from monopolizing continuous
evolution while preserving estate-wide forward motion.
"""

from __future__ import annotations

import json
import os
import sys
from collections import defaultdict
from collections.abc import Callable
from pathlib import Path
from typing import Any

REGISTRY_DIR = Path(__file__).resolve().parent
if str(REGISTRY_DIR) not in sys.path:
    sys.path.insert(0, str(REGISTRY_DIR))

import build_registry
import tower_placement

ROOT = Path(__file__).resolve().parents[2]
REGISTRY = ROOT / "excellence" / "registry" / "excellence-repo-registry.json"
OUTPUT = ROOT / "excellence" / "registry" / "excellence-priority-queue.json"
STATE_PATH = "machine/excellence-state.json"

ACTION_ORDER = {
    "REPAIR_STATE": 0,
    "ADVANCE_GATE": 1,
    "INITIALIZE_STATE": 2,
    "EVOLVE": 3,
    # Retained only so stale historical inputs remain sortable. This builder never
    # converts EVOLVE into TOWER_PLACE.
    "TOWER_PLACE": 4,
    "REVIEW_SIDE_EXIT": 5,
    "RETRY_INSPECTION": 6,
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


def _evolution_progress(
    raw_state: dict[str, Any], repository: str
) -> tuple[int, str | None, str | None]:
    history = raw_state.get("evolution_history", [])
    if history is None:
        history = []
    if not isinstance(history, list):
        raise TypeError(f"{repository}: evolution_history must be a list")

    successful: list[dict[str, Any]] = []
    for index, entry in enumerate(history):
        if not isinstance(entry, dict):
            raise TypeError(
                f"{repository}: evolution_history[{index}] must be an object"
            )
        if entry.get("result") != "PASS":
            continue
        consumed = entry.get("consumed_cursor")
        if not isinstance(consumed, str) or not consumed.startswith("next:"):
            raise ValueError(
                f"{repository}: successful evolution history must bind a next:* consumed_cursor"
            )
        successful.append(entry)

    if not successful:
        return 0, None, None
    latest = successful[-1]
    receipt = latest.get("receipt")
    if receipt is not None and not isinstance(receipt, str):
        raise TypeError(f"{repository}: evolution receipt reference must be a string")
    return len(successful), latest["consumed_cursor"], receipt


def _tower_advisory(
    *,
    repository: str,
    head_sha: str,
    evolution_cursor: str,
    token: str | None,
    tower_authority: dict[str, Any] | None,
    tower_authority_error: str | None,
    fetch_placement: Callable[
        [str, str, str | None], tuple[dict[str, Any] | None, str | None]
    ],
) -> tuple[dict[str, Any], str | None]:
    """Return non-blocking Tower analysis for an EVOLVE record.

    Placement failure is telemetry. It never rewrites the queue action or gate.
    """
    if tower_authority is None:
        return (
            {
                "status": "UNAVAILABLE",
                "valid": False,
                "decision": None,
                "errors": [
                    tower_authority_error
                    or "Tower placement authority unavailable; evolution remains actionable"
                ],
            },
            None,
        )

    try:
        placement, placement_blob_sha = fetch_placement(repository, head_sha, token)
        analysis = tower_placement.analyze_placement(
            placement,
            repository,
            evolution_cursor,
            tower_authority,
        )
        return analysis, placement_blob_sha
    except Exception as exc:
        return (
            {
                "status": "ERROR",
                "valid": False,
                "decision": None,
                "errors": [f"{type(exc).__name__}: {exc}"],
            },
            None,
        )


def build_queue(
    registry: dict[str, Any],
    *,
    token: str | None = None,
    fetch_state: Callable[[str, str, str, str | None], tuple[dict[str, Any], str]]
    | None = None,
    fetch_tower_authority: Callable[[str | None], dict[str, Any]] | None = None,
    fetch_placement: Callable[
        [str, str, str | None], tuple[dict[str, Any] | None, str | None]
    ]
    | None = None,
) -> dict[str, Any]:
    """Build the exact-head queue with Tower placement as advisory engineering input."""
    fetch_state = fetch_state or build_registry.fetch_json_file
    fetch_tower_authority = (
        fetch_tower_authority or tower_placement.fetch_tower_authority
    )
    fetch_placement = fetch_placement or tower_placement.fetch_placement
    groups: dict[tuple[str, str], list[dict[str, Any]]] = defaultdict(list)

    has_evolving = any(
        record.get("state", {}).get("next_action_class") == "EVOLVE"
        for record in registry["repositories"]
    )
    tower_authority: dict[str, Any] | None = None
    tower_authority_error: str | None = None
    if has_evolving:
        try:
            candidate = fetch_tower_authority(token)
            if isinstance(candidate, dict):
                tower_authority = candidate
            else:
                tower_authority_error = (
                    "Tower authority unavailable; placement advisory skipped"
                )
        except Exception as exc:
            tower_authority_error = f"{type(exc).__name__}: {exc}"

    for record in registry["repositories"]:
        state = record["state"]
        action = state["next_action_class"]
        evolution_cursor = None
        evolution_state_blob_sha = None
        evolution_generation = None
        last_consumed_cursor = None
        last_evolution_receipt = None
        placement_blob_sha = None
        placement_analysis: dict[str, Any] | None = None

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
            (
                evolution_generation,
                last_consumed_cursor,
                last_evolution_receipt,
            ) = _evolution_progress(raw_state, repository)

            placement_analysis, placement_blob_sha = _tower_advisory(
                repository=repository,
                head_sha=head_sha,
                evolution_cursor=evolution_cursor,
                token=token,
                tower_authority=tower_authority,
                tower_authority_error=tower_authority_error,
                fetch_placement=fetch_placement,
            )
            # Material evolution remains the executable action regardless of advisory state.
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
                "evolution_generation": evolution_generation,
                "last_consumed_cursor": last_consumed_cursor,
                "last_evolution_receipt": last_evolution_receipt,
                "tower_placement_advisory": placement_analysis is not None,
                "tower_placement_blocking": False,
                "tower_placement_status": (
                    placement_analysis["status"] if placement_analysis else None
                ),
                "tower_placement_valid": (
                    placement_analysis["valid"] if placement_analysis else None
                ),
                "tower_placement_decision": (
                    placement_analysis["decision"] if placement_analysis else None
                ),
                "tower_placement_errors": (
                    placement_analysis["errors"] if placement_analysis else []
                ),
                "tower_placement_blob_sha": placement_blob_sha,
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
        if action == "EVOLVE":
            records.sort(
                key=lambda row: (
                    row["evolution_generation"],
                    row["repository"],
                )
            )
            selection_policy = "least_successful_evolutions_first_then_repository"
        else:
            records.sort(key=lambda row: row["repository"])
            selection_policy = "repository"
        queue.append(
            {
                "priority": len(queue) + 1,
                "action": action,
                "gate": gate,
                "count": len(records),
                "selection_policy": selection_policy,
                "repositories": records,
            }
        )

    return {
        "schema": "glaciereq.excellence-priority-queue.v3",
        "registry_generated_at": registry["generated_at"],
        "registry_authority": registry["authority"],
        "tower_advisory": {
            "blocking": False,
            "authority": (
                tower_placement.public_authority(tower_authority)
                if tower_authority is not None
                else None
            ),
            "authority_error": tower_authority_error,
        },
        # Compatibility field retained for consumers, but placement is explicitly advisory.
        "tower_authority": (
            tower_placement.public_authority(tower_authority)
            if tower_authority is not None
            else None
        ),
        "ordering": (
            "repair invalid claimed state; advance valid state; initialize missing state; "
            "then execute exact-head material evolution with least-evolved-first fairness; "
            "Tower placement is advisory and cannot replace EVOLVE"
        ),
        "queue": queue,
    }


def main() -> int:
    registry = json.loads(REGISTRY.read_text(encoding="utf-8"))
    out = build_queue(registry, token=os.environ.get("GH_TOKEN"))
    OUTPUT.write_text(json.dumps(out, indent=2) + "\n", encoding="utf-8")
    print(
        "priority-queue:",
        " ".join(
            f"{item['action']}:{item['gate']}={item['count']}" for item in out["queue"]
        ),
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
                f"{row['tower_placement_status']}:g{row['evolution_generation']}:"
                f"{row['repository']}={row['evolution_cursor']}"
                for row in evolving
            ),
        )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

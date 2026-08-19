"""Build one exact decision inventory for every live applicant-controlled prompt.

The existing decision-packet runtime produces an evidence-bound proposed answer for the
exceptional-work field. This runtime composes that proven decision with every other live
prompt in the same preparation artifact, preserving exact provider field identity while
refusing to invent values for prompts that have no reviewed answer source.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import sys
import tempfile
from collections.abc import Mapping, Sequence
from pathlib import Path
from typing import Any

try:
    from tools.build_applicant_decision_packet import build_decision_packet
except ModuleNotFoundError:  # direct script execution from tools/
    sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
    from tools.build_applicant_decision_packet import build_decision_packet

INVENTORY_SCHEMA = "glaciereq.applicant-decision-inventory.v1"


class ApplicantDecisionInventoryError(RuntimeError):
    """Raised when the live prompt inventory cannot be represented without identity loss."""


def _canonical_bytes(payload: Mapping[str, object]) -> bytes:
    return json.dumps(payload, sort_keys=True, separators=(",", ":")).encode("utf-8")


def _required_text(value: object, *, field: str) -> str:
    if not isinstance(value, str) or not value.strip():
        raise ApplicantDecisionInventoryError(
            f"required non-empty string missing: {field}"
        )
    return value.strip()


def _load_preparation(path: Path) -> dict[str, Any]:
    try:
        payload = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        raise ApplicantDecisionInventoryError(
            f"invalid preparation {path}: {exc}"
        ) from exc
    if not isinstance(payload, dict):
        raise ApplicantDecisionInventoryError("preparation must be a JSON object")
    return payload


def _live_prompts(preparation: Mapping[str, Any]) -> list[dict[str, str]]:
    prompts = preparation.get("prompts")
    if not isinstance(prompts, list) or not prompts:
        raise ApplicantDecisionInventoryError(
            "preparation.prompts must be a non-empty list"
        )

    result: list[dict[str, str]] = []
    seen: set[str] = set()
    for index, prompt in enumerate(prompts):
        if not isinstance(prompt, Mapping):
            raise ApplicantDecisionInventoryError(
                f"preparation.prompts[{index}] must be an object"
            )
        field_name = _required_text(
            prompt.get("field_name"), field=f"prompts[{index}].field_name"
        )
        label = _required_text(prompt.get("label"), field=f"prompts[{index}].label")
        if field_name in seen:
            raise ApplicantDecisionInventoryError(
                f"duplicate live field identity: {field_name}"
            )
        seen.add(field_name)
        result.append({"field_name": field_name, "label": label})
    return result


def build_decision_inventory(preparation_path: Path) -> dict[str, Any]:
    """Return an identity-complete inventory without inferring unresolved applicant values."""
    preparation = _load_preparation(preparation_path)
    application_id = _required_text(
        preparation.get("application_id"), field="application_id"
    )
    opening_id = _required_text(preparation.get("opening_id"), field="opening_id")
    prompts = _live_prompts(preparation)

    try:
        reviewed_packet = build_decision_packet(preparation_path)
    except RuntimeError as exc:
        raise ApplicantDecisionInventoryError(str(exc)) from exc

    if (
        reviewed_packet.get("application_id") != application_id
        or reviewed_packet.get("opening_id") != opening_id
    ):
        raise ApplicantDecisionInventoryError(
            "reviewed decision identity drifted from live preparation"
        )

    reviewed = reviewed_packet["decision"]
    reviewed_field = _required_text(
        reviewed.get("field_name"), field="reviewed.field_name"
    )
    if reviewed_field not in {prompt["field_name"] for prompt in prompts}:
        raise ApplicantDecisionInventoryError(
            "reviewed field is absent from the live prompt inventory"
        )

    decisions: list[dict[str, Any]] = []
    for prompt in prompts:
        if prompt["field_name"] == reviewed_field:
            decisions.append(
                {
                    "field_name": prompt["field_name"],
                    "label": prompt["label"],
                    "decision_state": "APPLICANT_CONFIRMATION_REQUIRED",
                    "review_receipt_sha256": reviewed["review_receipt_sha256"],
                    "proposed_text": reviewed["proposed_text"],
                    "evidence": reviewed["evidence"],
                    "evidence_classes": reviewed["evidence_classes"],
                    "confirmation_template": reviewed["confirmation_template"],
                }
            )
            continue

        decisions.append(
            {
                "field_name": prompt["field_name"],
                "label": prompt["label"],
                "decision_state": "APPLICANT_INPUT_REQUIRED",
                "review_receipt_sha256": None,
                "proposed_text": None,
                "evidence": [],
                "evidence_classes": [],
                "confirmation_template": None,
            }
        )

    unresolved = sum(decision["decision_state"] != "READY" for decision in decisions)
    inventory: dict[str, Any] = {
        "schema": INVENTORY_SCHEMA,
        "application_id": application_id,
        "opening_id": opening_id,
        "decision_state": "APPLICANT_DECISIONS_REQUIRED" if unresolved else "READY",
        "live_field_count": len(decisions),
        "unresolved_field_count": unresolved,
        "decisions": decisions,
        "authority": {
            "applicant_controls_all_values": True,
            "machine_may_infer_unreviewed_values": False,
            "machine_may_infer_confirmation": False,
            "machine_may_submit_externally": False,
            "reviewed_edits_require_new_evidence_review": True,
        },
        "reviewed_packet_receipt_sha256": reviewed_packet["receipt_sha256"],
    }
    inventory["receipt_sha256"] = hashlib.sha256(
        _canonical_bytes(inventory)
    ).hexdigest()
    return inventory


def _atomic_write_json(path: Path, payload: Mapping[str, object]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    encoded = json.dumps(payload, indent=2, sort_keys=True) + "\n"
    fd, temporary_name = tempfile.mkstemp(
        dir=path.parent, prefix=f".{path.name}.", suffix=".tmp", text=True
    )
    temporary = Path(temporary_name)
    try:
        with os.fdopen(fd, "w", encoding="utf-8") as handle:
            handle.write(encoded)
            handle.flush()
            os.fsync(handle.fileno())
        temporary.replace(path)
    finally:
        temporary.unlink(missing_ok=True)


def main(argv: Sequence[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        description="Build an exact multi-field applicant decision inventory."
    )
    parser.add_argument("--preparation", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args(argv)
    try:
        inventory = build_decision_inventory(args.preparation)
        _atomic_write_json(args.output, inventory)
    except (ApplicantDecisionInventoryError, OSError) as exc:
        parser.error(str(exc))
    print(json.dumps(inventory, indent=2, sort_keys=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

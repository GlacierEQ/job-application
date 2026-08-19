"""Compose all explicitly resolved applicant decisions into one live semantic source.

The job application pipeline has two intentionally separate authority paths:

* applicant-authored direct inputs for APPLICANT_INPUT_REQUIRED fields; and
* an evidence-bound generated answer that is usable only after explicit applicant confirmation.

This runtime joins those paths only when they resolve the complete, exact live decision
inventory. It preserves provider field order and identity, verifies deterministic receipts,
rejects stale/duplicate/partial coverage, and emits a semantic answer source directly
consumable by the existing Greenhouse semantic-answer bridge.

It never infers applicant intent, edits reviewed prose, confirms generated text, or performs
an external submission.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import tempfile
from collections.abc import Mapping, Sequence
from pathlib import Path
from typing import Any

SUBMISSION_PACKAGE_SCHEMA = "glaciereq.applicant-submission-package.v1"


class ApplicantSubmissionPackageError(RuntimeError):
    """Raised when independently authorized answer paths cannot compose losslessly."""


def _canonical_bytes(payload: Mapping[str, object]) -> bytes:
    return json.dumps(payload, sort_keys=True, separators=(",", ":")).encode("utf-8")


def _required_text(value: object, *, field: str) -> str:
    if not isinstance(value, str) or not value.strip():
        raise ApplicantSubmissionPackageError(
            f"required non-empty string missing: {field}"
        )
    return value.strip()


def _read_object(path: Path, *, kind: str) -> dict[str, Any]:
    try:
        payload = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        raise ApplicantSubmissionPackageError(f"invalid {kind} {path}: {exc}") from exc
    if not isinstance(payload, dict):
        raise ApplicantSubmissionPackageError(f"{kind} must be a JSON object")
    return payload


def _verify_receipt(payload: Mapping[str, Any], *, kind: str) -> str:
    receipt = _required_text(
        payload.get("receipt_sha256"), field=f"{kind}.receipt_sha256"
    )
    unsigned = dict(payload)
    unsigned.pop("receipt_sha256", None)
    actual = hashlib.sha256(_canonical_bytes(unsigned)).hexdigest()
    if receipt != actual:
        raise ApplicantSubmissionPackageError(
            f"{kind} receipt mismatch: expected {receipt}, computed {actual}"
        )
    return receipt


def _identity(payload: Mapping[str, Any], *, kind: str) -> tuple[str, str]:
    return (
        _required_text(payload.get("application_id"), field=f"{kind}.application_id"),
        _required_text(payload.get("opening_id"), field=f"{kind}.opening_id"),
    )


def _require_same_identity(
    expected: tuple[str, str], payload: Mapping[str, Any], *, kind: str
) -> None:
    actual = _identity(payload, kind=kind)
    if actual != expected:
        raise ApplicantSubmissionPackageError(
            f"{kind} identity drift: application/opening {actual!r} != {expected!r}"
        )


def _answer_map(source: Mapping[str, Any], *, kind: str) -> dict[str, dict[str, Any]]:
    rows = source.get("answers")
    if not isinstance(rows, list):
        raise ApplicantSubmissionPackageError(f"{kind}.answers must be a list")
    result: dict[str, dict[str, Any]] = {}
    for index, row in enumerate(rows):
        if not isinstance(row, dict):
            raise ApplicantSubmissionPackageError(
                f"{kind}.answers[{index}] must be an object"
            )
        match = row.get("match")
        if not isinstance(match, Mapping):
            raise ApplicantSubmissionPackageError(
                f"{kind}.answers[{index}].match must be an object"
            )
        field_name = _required_text(
            match.get("field_name"), field=f"{kind}.answers[{index}].match.field_name"
        )
        _required_text(row.get("key"), field=f"{kind}.answers[{index}].key")
        _required_text(row.get("value"), field=f"{kind}.answers[{index}].value")
        _required_text(
            row.get("provenance"), field=f"{kind}.answers[{index}].provenance"
        )
        if field_name in result:
            raise ApplicantSubmissionPackageError(
                f"duplicate {kind} answer field identity: {field_name}"
            )
        result[field_name] = row
    return result


def _decision_inventory(
    inventory: Mapping[str, Any],
) -> tuple[list[dict[str, Any]], set[str], set[str]]:
    rows = inventory.get("decisions")
    if not isinstance(rows, list) or not rows:
        raise ApplicantSubmissionPackageError(
            "decision inventory requires non-empty decisions"
        )

    decisions: list[dict[str, Any]] = []
    direct_required: set[str] = set()
    confirmation_required: set[str] = set()
    seen: set[str] = set()
    for index, row in enumerate(rows):
        if not isinstance(row, dict):
            raise ApplicantSubmissionPackageError(
                f"inventory.decisions[{index}] must be an object"
            )
        field_name = _required_text(
            row.get("field_name"), field=f"inventory.decisions[{index}].field_name"
        )
        _required_text(row.get("label"), field=f"inventory.decisions[{index}].label")
        state = _required_text(
            row.get("decision_state"),
            field=f"inventory.decisions[{index}].decision_state",
        )
        if field_name in seen:
            raise ApplicantSubmissionPackageError(
                f"duplicate inventory field identity: {field_name}"
            )
        seen.add(field_name)
        if state == "APPLICANT_INPUT_REQUIRED":
            direct_required.add(field_name)
        elif state == "APPLICANT_CONFIRMATION_REQUIRED":
            confirmation_required.add(field_name)
        else:
            raise ApplicantSubmissionPackageError(
                f"unsupported unresolved decision state for {field_name}: {state}"
            )
        decisions.append(row)
    return decisions, direct_required, confirmation_required


def compose_submission_package(
    inventory_path: Path,
    direct_binding_path: Path,
    confirmed_review_source_path: Path,
) -> dict[str, Any]:
    """Return one complete human-submission-ready semantic source, or fail closed."""
    inventory = _read_object(inventory_path, kind="decision inventory")
    direct = _read_object(direct_binding_path, kind="direct input binding")
    confirmed = _read_object(
        confirmed_review_source_path, kind="confirmed review source"
    )

    inventory_receipt = _verify_receipt(inventory, kind="decision inventory")
    direct_receipt = _verify_receipt(direct, kind="direct input binding")
    confirmed_receipt = _verify_receipt(confirmed, kind="confirmed review source")

    expected_identity = _identity(inventory, kind="decision inventory")
    _require_same_identity(expected_identity, direct, kind="direct input binding")
    _require_same_identity(expected_identity, confirmed, kind="confirmed review source")

    if direct.get("inventory_receipt_sha256") != inventory_receipt:
        raise ApplicantSubmissionPackageError(
            "direct input binding does not reference the exact decision inventory receipt"
        )

    decisions, direct_required, confirmation_required = _decision_inventory(inventory)
    direct_answers = _answer_map(direct, kind="direct input binding")
    confirmed_answers = _answer_map(confirmed, kind="confirmed review source")

    if set(direct_answers) != direct_required:
        missing = sorted(direct_required - set(direct_answers))
        extra = sorted(set(direct_answers) - direct_required)
        raise ApplicantSubmissionPackageError(
            f"direct input coverage mismatch: missing={missing}, extra={extra}"
        )
    if set(confirmed_answers) != confirmation_required:
        missing = sorted(confirmation_required - set(confirmed_answers))
        extra = sorted(set(confirmed_answers) - confirmation_required)
        raise ApplicantSubmissionPackageError(
            f"confirmed review coverage mismatch: missing={missing}, extra={extra}"
        )

    if direct.get("remaining_direct_input_fields") not in ([], None):
        raise ApplicantSubmissionPackageError(
            "direct input binding still reports unresolved applicant-input fields"
        )

    ordered_answers: list[dict[str, Any]] = []
    resolution: list[dict[str, str]] = []
    for decision in decisions:
        field_name = decision["field_name"]
        state = decision["decision_state"]
        if state == "APPLICANT_INPUT_REQUIRED":
            answer = direct_answers[field_name]
            authority_path = "APPLICANT_DIRECT_INPUT"
        else:
            answer = confirmed_answers[field_name]
            authority_path = "APPLICANT_CONFIRMED_EVIDENCE_REVIEW"
            review_receipt = _required_text(
                decision.get("review_receipt_sha256"),
                field=f"decision[{field_name}].review_receipt_sha256",
            )
            if confirmed.get("source_review_receipt_sha256") != review_receipt:
                raise ApplicantSubmissionPackageError(
                    f"confirmed review receipt drift for {field_name}"
                )
            proposed = _required_text(
                decision.get("proposed_text"),
                field=f"decision[{field_name}].proposed_text",
            )
            if (
                _required_text(
                    answer.get("value"), field=f"confirmed[{field_name}].value"
                )
                != proposed
            ):
                raise ApplicantSubmissionPackageError(
                    f"confirmed review text drift for {field_name}; edited text requires a new review"
                )

        ordered_answers.append(dict(answer))
        resolution.append(
            {
                "field_name": field_name,
                "decision_state_before": state,
                "decision_state_after": "RESOLVED",
                "authority_path": authority_path,
            }
        )

    result: dict[str, Any] = {
        "schema": SUBMISSION_PACKAGE_SCHEMA,
        "application_id": expected_identity[0],
        "opening_id": expected_identity[1],
        "decision_state": "READY_FOR_HUMAN_SUBMISSION",
        "ready_for_human_submission": True,
        "live_field_count": len(decisions),
        "resolved_field_count": len(resolution),
        "answers": ordered_answers,
        "resolution": resolution,
        "source_receipts": {
            "decision_inventory_sha256": inventory_receipt,
            "direct_input_binding_sha256": direct_receipt,
            "confirmed_review_source_sha256": confirmed_receipt,
        },
        "authority": {
            "all_live_applicant_fields_resolved": True,
            "direct_values_are_applicant_supplied": True,
            "generated_values_are_explicitly_applicant_confirmed": True,
            "machine_inferred_values": False,
            "machine_inferred_confirmation": False,
            "external_submission_performed": False,
            "human_submission_gate_required": True,
        },
    }
    result["receipt_sha256"] = hashlib.sha256(_canonical_bytes(result)).hexdigest()
    return result


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
        description="Compose complete explicitly authorized applicant answers for human submission."
    )
    parser.add_argument("--inventory", type=Path, required=True)
    parser.add_argument("--direct-binding", type=Path, required=True)
    parser.add_argument("--confirmed-review-source", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args(argv)
    try:
        result = compose_submission_package(
            args.inventory, args.direct_binding, args.confirmed_review_source
        )
        _atomic_write_json(args.output, result)
    except (ApplicantSubmissionPackageError, OSError) as exc:
        parser.error(str(exc))
    print(json.dumps(result, indent=2, sort_keys=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

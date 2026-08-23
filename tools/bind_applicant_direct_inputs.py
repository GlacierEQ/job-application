"""Bind explicit applicant-controlled values to exact unresolved live application fields.

This runtime consumes the decision inventory emitted by build_applicant_decision_inventory
and a separate applicant-authored value artifact. It resolves only fields that are explicitly
APPLICANT_INPUT_REQUIRED, requires exact application/opening/provider-field identity, rejects
stale, duplicate, unknown, reviewed, or empty bindings, and emits a deterministic semantic
answer source accepted by the existing Greenhouse semantic answer bridge.

It does not infer values, confirm generated answers, determine submission readiness, or submit
anything externally. Field resolution is descriptive preparation state only.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import re
import tempfile
from collections.abc import Mapping, Sequence
from pathlib import Path
from typing import Any

DIRECT_INPUT_SCHEMA = "glaciereq.applicant-direct-inputs.v1"
BOUND_SOURCE_SCHEMA = "glaciereq.applicant-direct-input-binding.v2"


class ApplicantDirectInputError(RuntimeError):
    """Raised when explicit applicant values cannot bind without identity loss."""


def _canonical_bytes(payload: Mapping[str, object]) -> bytes:
    return json.dumps(payload, sort_keys=True, separators=(",", ":")).encode("utf-8")


def _required_text(value: object, *, field: str) -> str:
    if not isinstance(value, str) or not value.strip():
        raise ApplicantDirectInputError(f"required non-empty string missing: {field}")
    return value.strip()


def _read_json(path: Path, *, kind: str) -> dict[str, Any]:
    try:
        payload = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        raise ApplicantDirectInputError(f"invalid {kind} {path}: {exc}") from exc
    if not isinstance(payload, dict):
        raise ApplicantDirectInputError(f"{kind} must be a JSON object")
    return payload


def _verify_receipt(payload: Mapping[str, Any], *, kind: str) -> None:
    receipt = payload.get("receipt_sha256")
    if receipt is None:
        return
    expected = _required_text(receipt, field=f"{kind}.receipt_sha256")
    unsigned = dict(payload)
    unsigned.pop("receipt_sha256", None)
    actual = hashlib.sha256(_canonical_bytes(unsigned)).hexdigest()
    if expected != actual:
        raise ApplicantDirectInputError(
            f"{kind} receipt mismatch: expected {expected}, computed {actual}"
        )


def _input_rows(source: Mapping[str, Any]) -> list[dict[str, str]]:
    rows = source.get("inputs")
    if not isinstance(rows, list) or not rows:
        raise ApplicantDirectInputError("direct input source requires non-empty inputs")

    result: list[dict[str, str]] = []
    seen: set[str] = set()
    for index, row in enumerate(rows):
        if not isinstance(row, Mapping):
            raise ApplicantDirectInputError(f"inputs[{index}] must be an object")
        field_name = _required_text(
            row.get("field_name"), field=f"inputs[{index}].field_name"
        )
        value = _required_text(row.get("value"), field=f"inputs[{index}].value")
        if field_name in seen:
            raise ApplicantDirectInputError(f"duplicate direct input: {field_name}")
        seen.add(field_name)
        result.append({"field_name": field_name, "value": value})
    return result


def bind_direct_inputs(inventory_path: Path, direct_input_path: Path) -> dict[str, Any]:
    """Bind explicit values to exact APPLICANT_INPUT_REQUIRED live fields."""
    inventory = _read_json(inventory_path, kind="decision inventory")
    source = _read_json(direct_input_path, kind="direct input source")
    _verify_receipt(inventory, kind="decision inventory")
    _verify_receipt(source, kind="direct input source")

    application_id = _required_text(
        inventory.get("application_id"), field="inventory.application_id"
    )
    opening_id = _required_text(
        inventory.get("opening_id"), field="inventory.opening_id"
    )
    source_application_id = _required_text(
        source.get("application_id"), field="direct_inputs.application_id"
    )
    source_opening_id = _required_text(
        source.get("opening_id"), field="direct_inputs.opening_id"
    )
    if source_application_id != application_id:
        raise ApplicantDirectInputError(
            "direct input/application identity drift: "
            f"{source_application_id} != {application_id}"
        )
    if source_opening_id != opening_id:
        raise ApplicantDirectInputError(
            f"direct input/opening identity drift: {source_opening_id} != {opening_id}"
        )

    decisions = inventory.get("decisions")
    if not isinstance(decisions, list) or not decisions:
        raise ApplicantDirectInputError(
            "decision inventory requires non-empty decisions"
        )

    live: dict[str, dict[str, Any]] = {}
    for index, decision in enumerate(decisions):
        if not isinstance(decision, dict):
            raise ApplicantDirectInputError(f"decisions[{index}] must be an object")
        field_name = _required_text(
            decision.get("field_name"), field=f"decisions[{index}].field_name"
        )
        if field_name in live:
            raise ApplicantDirectInputError(
                f"duplicate live decision identity: {field_name}"
            )
        live[field_name] = decision

    rows = _input_rows(source)
    bound_answers: list[dict[str, str | list[str] | dict[str, object]]] = []
    bindings: list[dict[str, str]] = []
    bound_field_names = {row["field_name"] for row in rows}
    for row in rows:
        field_name = row["field_name"]
        decision = live.get(field_name)
        if decision is None:
            raise ApplicantDirectInputError(
                f"unknown live field identity: {field_name}"
            )
        state = _required_text(
            decision.get("decision_state"),
            field=f"decision[{field_name}].decision_state",
        )
        if state != "APPLICANT_INPUT_REQUIRED":
            raise ApplicantDirectInputError(
                f"direct input cannot bind field {field_name} in state {state}"
            )
        label = _required_text(
            decision.get("label"), field=f"decision[{field_name}].label"
        )
        semantic_key = f"applicant-direct:{field_name}"
        provenance = f"{direct_input_path}#{field_name}"
        bound_answers.append(
            {
                "key": semantic_key,
                "value": row["value"],
                "provenance": provenance,
                "match": {
                    "label_pattern": f"^{re.escape(label)}$",
                    "field_types": [],
                    "field_name": field_name,
                },
            }
        )
        bindings.append(
            {
                "semantic_key": semantic_key,
                "field_name": field_name,
                "label": label,
                "decision_state_before": state,
                "decision_state_after": "DIRECT_INPUT_BOUND",
            }
        )

    unresolved_input_fields = [
        field_name
        for field_name, decision in live.items()
        if decision.get("decision_state") == "APPLICANT_INPUT_REQUIRED"
        and field_name not in bound_field_names
    ]
    generated_confirmation_fields = [
        field_name
        for field_name, decision in live.items()
        if decision.get("decision_state") == "APPLICANT_CONFIRMATION_REQUIRED"
    ]
    field_resolution_complete = (
        not unresolved_input_fields and not generated_confirmation_fields
    )

    result: dict[str, Any] = {
        "schema": BOUND_SOURCE_SCHEMA,
        "application_id": application_id,
        "opening_id": opening_id,
        "inventory_receipt_sha256": inventory.get("receipt_sha256"),
        "direct_input_receipt_sha256": source.get("receipt_sha256"),
        "answers": bound_answers,
        "bindings": bindings,
        "bound_direct_input_count": len(bindings),
        "remaining_direct_input_fields": unresolved_input_fields,
        "remaining_generated_confirmation_fields": generated_confirmation_fields,
        "applicant_field_resolution_complete": field_resolution_complete,
        "submission_readiness_claimed": False,
        "authority": {
            "values_are_applicant_supplied": True,
            "machine_inferred_values": False,
            "generated_answers_auto_confirmed": False,
            "external_submission_performed": False,
            "artifact_set_verified": False,
            "provider_submission_verified": False,
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
        description="Bind explicit applicant values to unresolved live application fields without claiming submission readiness."
    )
    parser.add_argument("--inventory", type=Path, required=True)
    parser.add_argument("--direct-inputs", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args(argv)
    try:
        result = bind_direct_inputs(args.inventory, args.direct_inputs)
        _atomic_write_json(args.output, result)
    except (ApplicantDirectInputError, OSError) as exc:
        parser.error(str(exc))
    print(json.dumps(result, indent=2, sort_keys=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

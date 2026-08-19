"""Promote an evidence-bound application review into a semantic answer only after explicit confirmation.

This tool closes the gap between a provenance-bound DRAFT_REVIEW_REQUIRED artifact and the
existing live Greenhouse semantic-answer bridge. It never infers applicant intent: promotion
requires a separate confirmation artifact that names the exact review receipt, application,
opening, field, and exact accepted draft text.
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

REVIEW_SCHEMA = "glaciereq.evidence-bound-application-review.v1"
CONFIRMATION_SCHEMA = "glaciereq.evidence-review-confirmation.v1"
OUTPUT_SCHEMA = "glaciereq.applicant-semantic-answers.v1"


class ReviewConfirmationError(RuntimeError):
    """Raised when an applicant confirmation cannot be promoted safely."""


def _canonical_bytes(payload: Mapping[str, object]) -> bytes:
    return json.dumps(payload, sort_keys=True, separators=(",", ":")).encode("utf-8")


def _sha256_bytes(value: bytes) -> str:
    return hashlib.sha256(value).hexdigest()


def _sha256_file(path: Path) -> str:
    try:
        return _sha256_bytes(path.read_bytes())
    except OSError as exc:
        raise ReviewConfirmationError(f"cannot hash {path}: {exc}") from exc


def _load_object(path: Path) -> dict[str, Any]:
    try:
        payload = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        raise ReviewConfirmationError(f"invalid JSON at {path}: {exc}") from exc
    if not isinstance(payload, dict):
        raise ReviewConfirmationError(f"expected JSON object at {path}")
    return payload


def _required_text(value: object, *, field: str) -> str:
    if not isinstance(value, str) or not value.strip():
        raise ReviewConfirmationError(f"required non-empty string missing: {field}")
    return value.strip()


def _verify_review(review: Mapping[str, Any]) -> str:
    if review.get("schema") != REVIEW_SCHEMA:
        raise ReviewConfirmationError(f"unsupported review schema: {review.get('schema')!r}")
    if review.get("status") != "DRAFT_REVIEW_REQUIRED":
        raise ReviewConfirmationError("review is not in DRAFT_REVIEW_REQUIRED state")

    policy = review.get("review_policy")
    if not isinstance(policy, dict):
        raise ReviewConfirmationError("review.review_policy must be an object")
    if policy.get("applicant_confirmation_required") is not True:
        raise ReviewConfirmationError("review must require explicit applicant confirmation")
    if policy.get("external_submission_performed") is not False:
        raise ReviewConfirmationError("review indicates external submission or has invalid policy state")

    receipt = _required_text(review.get("receipt_sha256"), field="review.receipt_sha256")
    unsigned = dict(review)
    unsigned.pop("receipt_sha256", None)
    expected = _sha256_bytes(_canonical_bytes(unsigned))
    if receipt != expected:
        raise ReviewConfirmationError("review receipt SHA-256 does not match review content")
    return receipt


def _verify_confirmation(
    review: Mapping[str, Any], confirmation: Mapping[str, Any], review_receipt: str
) -> str:
    if confirmation.get("schema") != CONFIRMATION_SCHEMA:
        raise ReviewConfirmationError(
            f"unsupported confirmation schema: {confirmation.get('schema')!r}"
        )
    if confirmation.get("confirmed") is not True:
        raise ReviewConfirmationError("confirmation.confirmed must be true")

    identity_fields = ("application_id", "opening_id", "field_name")
    for field in identity_fields:
        expected = _required_text(review.get(field), field=f"review.{field}")
        actual = _required_text(confirmation.get(field), field=f"confirmation.{field}")
        if actual != expected:
            raise ReviewConfirmationError(
                f"confirmation {field} does not match review: {actual!r} != {expected!r}"
            )

    confirmation_receipt = _required_text(
        confirmation.get("review_receipt_sha256"),
        field="confirmation.review_receipt_sha256",
    )
    if confirmation_receipt != review_receipt:
        raise ReviewConfirmationError("confirmation references a different review receipt")

    draft = _required_text(review.get("draft"), field="review.draft")
    accepted_text = _required_text(
        confirmation.get("accepted_text"), field="confirmation.accepted_text"
    )
    if accepted_text != draft:
        raise ReviewConfirmationError(
            "accepted_text must exactly equal the evidence-bound review draft; "
            "edited prose requires a new reviewed artifact"
        )
    return accepted_text


def build_semantic_answer_source(
    review_path: Path, confirmation_path: Path
) -> dict[str, Any]:
    """Return a semantic answer source consumable by the live Greenhouse bridge."""
    review = _load_object(review_path)
    confirmation = _load_object(confirmation_path)
    review_receipt = _verify_review(review)
    accepted_text = _verify_confirmation(review, confirmation, review_receipt)

    label = _required_text(review.get("label"), field="review.label")
    field_name = _required_text(review.get("field_name"), field="review.field_name")
    application_id = _required_text(review.get("application_id"), field="review.application_id")
    opening_id = _required_text(review.get("opening_id"), field="review.opening_id")
    confirmation_sha256 = _sha256_file(confirmation_path)
    review_sha256 = _sha256_file(review_path)

    base: dict[str, Any] = {
        "schema": OUTPUT_SCHEMA,
        "application_id": application_id,
        "opening_id": opening_id,
        "source_review_receipt_sha256": review_receipt,
        "source_review_sha256": review_sha256,
        "confirmation_sha256": confirmation_sha256,
        "answers": [
            {
                "key": "exceptional_work",
                "value": accepted_text,
                "match": {
                    "label_pattern": rf"^\s*{re.escape(label)}\s*$",
                    "field_types": [],
                },
                "provenance": (
                    "applicant_confirmed_evidence_review:"
                    f"review={review_receipt};confirmation={confirmation_sha256};"
                    f"field={field_name}"
                ),
            }
        ],
        "promotion_policy": {
            "explicit_applicant_confirmation_required": True,
            "exact_review_text_required": True,
            "external_submission_performed": False,
        },
    }
    base["receipt_sha256"] = _sha256_bytes(_canonical_bytes(base))
    return base


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
        description=(
            "Promote an explicitly confirmed evidence-bound review into a semantic "
            "answer source for live provider binding."
        )
    )
    parser.add_argument("--review", type=Path, required=True)
    parser.add_argument("--confirmation", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args(argv)
    try:
        result = build_semantic_answer_source(args.review, args.confirmation)
        _atomic_write_json(args.output, result)
    except (ReviewConfirmationError, OSError) as exc:
        parser.error(str(exc))
    print(json.dumps(result, indent=2, sort_keys=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

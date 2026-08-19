"""Build a human-controlled decision packet from a live evidence-bound application preparation.

The live xAI/Greenhouse pipeline already knows how to build evidence-bound review drafts
and how to promote an explicitly confirmed review into a semantic answer. This runtime
closes the human-computer gap between those stages: it composes the current preparation
into a compact, source-bound decision surface that carries the exact live field identity,
opening identity, reviewed evidence, and a deliberately unconfirmed confirmation template.

It never chooses an applicant answer, never flips confirmation to true, and never submits
externally. Its job is to make the human decision fast, inspectable, and difficult to bind
to the wrong field or stale opening.
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

from scripts.build_evidence_bound_application_review import build_review

PACKET_SCHEMA = "glaciereq.applicant-decision-packet.v1"
CONFIRMATION_SCHEMA = "glaciereq.evidence-review-confirmation.v1"


class ApplicantDecisionPacketError(RuntimeError):
    """Raised when a decision packet cannot be built without weakening identity binding."""


def _canonical_bytes(payload: Mapping[str, object]) -> bytes:
    return json.dumps(payload, sort_keys=True, separators=(",", ":")).encode("utf-8")


def _sha256_bytes(value: bytes) -> str:
    return hashlib.sha256(value).hexdigest()


def _required_text(value: object, *, field: str) -> str:
    if not isinstance(value, str) or not value.strip():
        raise ApplicantDecisionPacketError(f"required non-empty string missing: {field}")
    return value.strip()


def _verified_evidence(review: Mapping[str, Any]) -> list[dict[str, str]]:
    rows = review.get("evidence")
    if not isinstance(rows, list) or not rows:
        raise ApplicantDecisionPacketError("review.evidence must be a non-empty list")

    evidence: list[dict[str, str]] = []
    for index, row in enumerate(rows):
        if not isinstance(row, Mapping):
            raise ApplicantDecisionPacketError(f"review.evidence[{index}] must be an object")
        evidence.append(
            {
                "text": _required_text(row.get("text"), field=f"review.evidence[{index}].text"),
                "provenance": _required_text(
                    row.get("provenance"), field=f"review.evidence[{index}].provenance"
                ),
                "evidence_class": _required_text(
                    row.get("evidence_class"),
                    field=f"review.evidence[{index}].evidence_class",
                ),
                "source_sha256": str(row.get("source_sha256") or ""),
            }
        )
    return evidence


def _verify_review_receipt(review: Mapping[str, Any]) -> str:
    receipt = _required_text(review.get("receipt_sha256"), field="review.receipt_sha256")
    unsigned = dict(review)
    unsigned.pop("receipt_sha256", None)
    expected = _sha256_bytes(_canonical_bytes(unsigned))
    if receipt != expected:
        raise ApplicantDecisionPacketError("review receipt SHA-256 does not match review content")
    return receipt


def build_decision_packet(preparation_path: Path) -> dict[str, Any]:
    """Compose one live preparation into an explicit applicant decision surface."""
    try:
        review = build_review(preparation_path)
    except (OSError, RuntimeError) as exc:
        raise ApplicantDecisionPacketError(str(exc)) from exc

    review_receipt = _verify_review_receipt(review)
    application_id = _required_text(review.get("application_id"), field="review.application_id")
    opening_id = _required_text(review.get("opening_id"), field="review.opening_id")
    field_name = _required_text(review.get("field_name"), field="review.field_name")
    label = _required_text(review.get("label"), field="review.label")
    draft = _required_text(review.get("draft"), field="review.draft")
    evidence = _verified_evidence(review)

    confirmation_template = {
        "schema": CONFIRMATION_SCHEMA,
        "application_id": application_id,
        "opening_id": opening_id,
        "field_name": field_name,
        "review_receipt_sha256": review_receipt,
        "confirmed": False,
        "accepted_text": draft,
    }

    packet: dict[str, Any] = {
        "schema": PACKET_SCHEMA,
        "application_id": application_id,
        "opening_id": opening_id,
        "decision_state": "APPLICANT_DECISION_REQUIRED",
        "review": review,
        "decision": {
            "field_name": field_name,
            "label": label,
            "review_receipt_sha256": review_receipt,
            "proposed_text": draft,
            "evidence": evidence,
            "evidence_classes": sorted({row["evidence_class"] for row in evidence}),
            "confirmation_template": confirmation_template,
        },
        "authority": {
            "applicant_controls_confirmation": True,
            "applicant_controls_accepted_text": True,
            "machine_may_infer_confirmation": False,
            "machine_may_submit_externally": False,
            "edited_text_requires_new_evidence_review": True,
        },
        "next_executable_step": {
            "when_confirmed": (
                "Set confirmation_template.confirmed=true only after applicant review, write that "
                "object as a confirmation artifact, then pass the review and confirmation to "
                "tools/confirm_evidence_bound_review.py."
            ),
            "when_rejected_or_edited": (
                "Do not promote this review. Generate a new evidence-bound review before any edited "
                "text can enter the live semantic-answer bridge."
            ),
        },
    }
    packet["receipt_sha256"] = _sha256_bytes(_canonical_bytes(packet))
    return packet


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
        description="Build an applicant-controlled decision packet from a live evidence-bound preparation."
    )
    parser.add_argument("--preparation", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args(argv)
    try:
        packet = build_decision_packet(args.preparation)
        _atomic_write_json(args.output, packet)
    except (ApplicantDecisionPacketError, OSError) as exc:
        parser.error(str(exc))
    print(json.dumps(packet, indent=2, sort_keys=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

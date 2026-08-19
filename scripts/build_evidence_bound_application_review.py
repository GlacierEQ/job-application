"""Build a provenance-diverse review draft for a live application prompt.

The Helix preparation artifact intentionally keeps generated prose review-only. This
adapter strengthens that review surface by selecting evidence across independent classes
instead of allowing a long CandidateProfile achievement list to starve source-reviewed
portfolio evidence. It never submits an application and never promotes a draft to an
applicant-confirmed answer.
"""

import argparse
import hashlib
import json
import os
import tempfile
from collections.abc import Mapping, Sequence
from pathlib import Path

SCHEMA = "glaciereq.evidence-bound-application-review.v1"
TARGET_STATUS = "DRAFT_REVIEW_REQUIRED"


class EvidenceReviewError(RuntimeError):
    """Raised when an evidence-bound review artifact cannot be built safely."""


def _canonical_bytes(payload: Mapping[str, object]) -> bytes:
    return json.dumps(payload, sort_keys=True, separators=(",", ":")).encode("utf-8")


def _sha256_bytes(value: bytes) -> str:
    return hashlib.sha256(value).hexdigest()


def _load_object(path: Path) -> dict[str, object]:
    try:
        raw = path.read_bytes()
        payload = json.loads(raw)
    except (OSError, json.JSONDecodeError) as exc:
        raise EvidenceReviewError(f"invalid JSON input {path}: {exc}") from exc
    if not isinstance(payload, dict):
        raise EvidenceReviewError(f"input must be a JSON object: {path}")
    return payload


def _required_text(value: object, *, field: str) -> str:
    if not isinstance(value, str) or not value.strip():
        raise EvidenceReviewError(f"required non-empty string missing: {field}")
    return value.strip()


def _evidence_rows(preparation: Mapping[str, object]) -> list[dict[str, object]]:
    rows = preparation.get("evidence")
    if not isinstance(rows, list):
        raise EvidenceReviewError("preparation.evidence must be a list")
    result: list[dict[str, object]] = []
    for index, row in enumerate(rows):
        if not isinstance(row, dict):
            raise EvidenceReviewError(f"preparation.evidence[{index}] must be an object")
        text = _required_text(row.get("text"), field=f"evidence[{index}].text")
        provenance = _required_text(
            row.get("provenance"), field=f"evidence[{index}].provenance"
        )
        evidence_class = _required_text(
            row.get("evidence_class"), field=f"evidence[{index}].evidence_class"
        )
        result.append(
            {
                "text": text,
                "provenance": provenance,
                "evidence_class": evidence_class,
                "source_sha256": row.get("source_sha256"),
            }
        )
    return result


def _exceptional_prompt(preparation: Mapping[str, object]) -> dict[str, object]:
    prompts = preparation.get("prompts")
    if not isinstance(prompts, list):
        raise EvidenceReviewError("preparation.prompts must be a list")
    matches: list[dict[str, object]] = []
    for index, prompt in enumerate(prompts):
        if not isinstance(prompt, dict):
            raise EvidenceReviewError(f"preparation.prompts[{index}] must be an object")
        label = str(prompt.get("label") or "")
        field_name = str(prompt.get("field_name") or "")
        if "exceptional work" in f"{label} {field_name}".casefold():
            matches.append(prompt)
    if len(matches) != 1:
        raise EvidenceReviewError(
            f"expected exactly one exceptional-work live field, found {len(matches)}"
        )
    return matches[0]


def _dedupe(rows: Sequence[dict[str, object]]) -> list[dict[str, object]]:
    result: list[dict[str, object]] = []
    seen: set[str] = set()
    for row in rows:
        key = str(row["text"]).casefold().strip()
        if key in seen:
            continue
        seen.add(key)
        result.append(row)
    return result


def select_diverse_evidence(
    rows: Sequence[dict[str, object]],
) -> tuple[dict[str, object], ...]:
    """Select at most three claims while guaranteeing independent provenance when available."""
    deduped = _dedupe(rows)
    achievements = [r for r in deduped if r["evidence_class"] == "candidate_achievement"]
    reviewed = [
        r for r in deduped if r["evidence_class"] == "source_reviewed_portfolio_claim"
    ]
    experience = [r for r in deduped if r["evidence_class"] == "candidate_experience"]

    if not reviewed:
        raise EvidenceReviewError(
            "source-reviewed portfolio evidence is required for an evidence-bound review draft"
        )
    if not achievements and not experience:
        raise EvidenceReviewError(
            "CandidateProfile achievement or experience evidence is required for applicant identity binding"
        )

    selected: list[dict[str, object]] = []
    if achievements:
        selected.append(achievements[0])
    else:
        selected.append(experience[0])
    selected.append(reviewed[0])

    for pool in (experience, achievements[1:], reviewed[1:]):
        for row in pool:
            if row not in selected:
                selected.append(row)
                break
        if len(selected) == 3:
            break

    return tuple(selected[:3])


def build_review(preparation_path: Path) -> dict[str, object]:
    preparation_bytes = preparation_path.read_bytes()
    preparation = _load_object(preparation_path)
    prompt = _exceptional_prompt(preparation)
    selected = select_diverse_evidence(_evidence_rows(preparation))

    application_id = _required_text(preparation.get("application_id"), field="application_id")
    opening_id = _required_text(preparation.get("opening_id"), field="opening_id")
    field_name = _required_text(prompt.get("field_name"), field="prompt.field_name")
    label = _required_text(prompt.get("label"), field="prompt.label")

    claims = [str(row["text"]).rstrip(". ") for row in selected]
    draft = "Examples of work I can substantiate include: " + "; ".join(claims) + "."
    evidence = [
        {
            "text": row["text"],
            "provenance": row["provenance"],
            "evidence_class": row["evidence_class"],
            "source_sha256": row.get("source_sha256"),
        }
        for row in selected
    ]
    base: dict[str, object] = {
        "schema": SCHEMA,
        "application_id": application_id,
        "opening_id": opening_id,
        "field_name": field_name,
        "label": label,
        "status": TARGET_STATUS,
        "draft": draft,
        "evidence": evidence,
        "preparation_sha256": _sha256_bytes(preparation_bytes),
        "review_policy": {
            "applicant_confirmation_required": True,
            "external_submission_performed": False,
            "source_reviewed_portfolio_evidence_required": True,
            "candidate_identity_evidence_required": True,
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
        description="Build a provenance-diverse, review-only draft for the live exceptional-work field."
    )
    parser.add_argument("--preparation", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args(argv)
    try:
        review = build_review(args.preparation)
        _atomic_write_json(args.output, review)
    except (EvidenceReviewError, OSError) as exc:
        parser.error(str(exc))
    print(json.dumps(review, indent=2, sort_keys=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

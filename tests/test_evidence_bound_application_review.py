from __future__ import annotations

import importlib.util
import json
from pathlib import Path

import pytest


SCRIPT = Path(__file__).resolve().parents[1] / "scripts" / "build_evidence_bound_application_review.py"
SPEC = importlib.util.spec_from_file_location("evidence_review", SCRIPT)
assert SPEC is not None and SPEC.loader is not None
review = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(review)


def _write_preparation(tmp_path: Path, *, include_reviewed: bool = True) -> Path:
    evidence = [
        {
            "text": f"Candidate achievement {index} with exact evidence.",
            "provenance": f"CandidateProfile.achievements[{index}]",
            "evidence_class": "candidate_achievement",
            "source_sha256": None,
        }
        for index in range(4)
    ]
    evidence.append(
        {
            "text": "Built an evidence-bound production application runtime.",
            "provenance": "CandidateProfile.experience[0]",
            "evidence_class": "candidate_experience",
            "source_sha256": None,
        }
    )
    if include_reviewed:
        evidence.append(
            {
                "text": "Typed PUE/headroom scenario calculation under supplied assumptions.",
                "provenance": ".helix-runtime/docs/evidence/constellations/xai.md:L24",
                "evidence_class": "source_reviewed_portfolio_claim",
                "source_sha256": "evidence-source-digest",
            }
        )
    payload = {
        "schema": "glaciereq.greenhouse-application-preparation.v2",
        "application_id": "app-live-xai",
        "opening_id": "4956028007",
        "evidence": evidence,
        "prompts": [
            {
                "field_name": "question_exceptional",
                "label": "What exceptional work have you done?",
                "status": "DRAFT_REVIEW_REQUIRED",
                "draft": "old draft",
            }
        ],
    }
    path = tmp_path / "preparation.json"
    path.write_text(json.dumps(payload), encoding="utf-8")
    return path


def test_review_forces_source_reviewed_evidence_into_top_three(tmp_path: Path) -> None:
    result = review.build_review(_write_preparation(tmp_path))

    assert result["schema"] == review.SCHEMA
    assert result["status"] == "DRAFT_REVIEW_REQUIRED"
    assert result["review_policy"]["applicant_confirmation_required"] is True
    assert result["review_policy"]["external_submission_performed"] is False
    selected = result["evidence"]
    assert len(selected) == 3
    assert selected[0]["evidence_class"] == "candidate_achievement"
    assert selected[1]["evidence_class"] == "source_reviewed_portfolio_claim"
    assert "xai.md:L24" in selected[1]["provenance"]
    assert selected[2]["evidence_class"] == "candidate_experience"
    assert "PUE/headroom" in result["draft"]


def test_review_is_deterministic_and_hash_bound(tmp_path: Path) -> None:
    source = _write_preparation(tmp_path)
    first = review.build_review(source)
    second = review.build_review(source)

    assert first == second
    assert len(first["preparation_sha256"]) == 64
    assert len(first["receipt_sha256"]) == 64


def test_review_refuses_to_relabel_unreviewed_profile_only_evidence(tmp_path: Path) -> None:
    source = _write_preparation(tmp_path, include_reviewed=False)
    with pytest.raises(review.EvidenceReviewError, match="source-reviewed portfolio evidence"):
        review.build_review(source)


def test_review_requires_exactly_one_live_exceptional_work_field(tmp_path: Path) -> None:
    source = _write_preparation(tmp_path)
    payload = json.loads(source.read_text(encoding="utf-8"))
    payload["prompts"] = []
    source.write_text(json.dumps(payload), encoding="utf-8")

    with pytest.raises(review.EvidenceReviewError, match="exactly one exceptional-work"):
        review.build_review(source)

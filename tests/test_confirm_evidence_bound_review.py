from __future__ import annotations

import hashlib
import json
import tempfile
import unittest
from pathlib import Path

from tools.confirm_evidence_bound_review import (
    ReviewConfirmationError,
    build_semantic_answer_source,
    build_semantic_answer_sources,
)
from tools.greenhouse_semantic_answer_bridge import (
    AnswerBridgeError,
    compile_answer_source,
)


def canonical_sha(payload: dict[str, object]) -> str:
    return hashlib.sha256(
        json.dumps(payload, sort_keys=True, separators=(",", ":")).encode("utf-8")
    ).hexdigest()


class EvidenceReviewConfirmationTests(unittest.TestCase):
    def setUp(self) -> None:
        self.temp = tempfile.TemporaryDirectory()
        root = Path(self.temp.name)
        self.root = root
        self.review_path = root / "review.json"
        self.confirmation_path = root / "confirmation.json"

        review: dict[str, object] = {
            "schema": "glaciereq.evidence-bound-application-review.v1",
            "application_id": "app-live-xai",
            "opening_id": "4956028007",
            "field_name": "question_12196821007",
            "label": "What exceptional work have you done?",
            "status": "DRAFT_REVIEW_REQUIRED",
            "draft": "Examples of work I can substantiate include: evidence A; evidence B.",
            "evidence": [
                {
                    "text": "evidence A",
                    "provenance": "CandidateProfile.achievements[0]",
                    "evidence_class": "candidate_achievement",
                    "source_sha256": None,
                },
                {
                    "text": "evidence B",
                    "provenance": "xai.md:L23",
                    "evidence_class": "source_reviewed_portfolio_claim",
                    "source_sha256": "a" * 64,
                },
            ],
            "preparation_sha256": "b" * 64,
            "review_policy": {
                "applicant_confirmation_required": True,
                "external_submission_performed": False,
                "source_reviewed_portfolio_evidence_required": True,
                "candidate_identity_evidence_required": True,
            },
        }
        review["receipt_sha256"] = canonical_sha(review)
        self.review = review
        self.review_path.write_text(json.dumps(review), encoding="utf-8")

        confirmation = {
            "schema": "glaciereq.evidence-review-confirmation.v1",
            "review_receipt_sha256": review["receipt_sha256"],
            "application_id": review["application_id"],
            "opening_id": review["opening_id"],
            "field_name": review["field_name"],
            "confirmed": True,
            "accepted_text": review["draft"],
        }
        self.confirmation = confirmation
        self.confirmation_path.write_text(json.dumps(confirmation), encoding="utf-8")

    def tearDown(self) -> None:
        self.temp.cleanup()

    def _second_pair(self) -> tuple[Path, Path]:
        review = dict(self.review)
        review.update(
            {
                "field_name": "question_12196822007",
                "label": "Why are you interested in xAI?",
                "draft": (
                    "I want to build systems whose capability is matched by rigor and speed."
                ),
            }
        )
        review.pop("receipt_sha256", None)
        review["receipt_sha256"] = canonical_sha(review)
        review_path = self.root / "review-two.json"
        review_path.write_text(json.dumps(review), encoding="utf-8")

        confirmation = {
            "schema": "glaciereq.evidence-review-confirmation.v1",
            "review_receipt_sha256": review["receipt_sha256"],
            "application_id": review["application_id"],
            "opening_id": review["opening_id"],
            "field_name": review["field_name"],
            "confirmed": True,
            "accepted_text": review["draft"],
        }
        confirmation_path = self.root / "confirmation-two.json"
        confirmation_path.write_text(json.dumps(confirmation), encoding="utf-8")
        return review_path, confirmation_path

    def test_promotes_exact_confirmed_review_to_semantic_answer(self) -> None:
        result = build_semantic_answer_source(self.review_path, self.confirmation_path)
        self.assertEqual(result["application_id"], "app-live-xai")
        self.assertEqual(result["opening_id"], "4956028007")
        answers = result["answers"]
        self.assertEqual(len(answers), 1)
        self.assertEqual(answers[0]["value"], self.review["draft"])
        self.assertEqual(answers[0]["key"], "exceptional_work")
        self.assertEqual(
            answers[0]["match"]["label_pattern"],
            r"^\s*What\ exceptional\ work\ have\ you\ done\?\s*$",
        )
        self.assertEqual(
            answers[0]["match"]["field_name"],
            "question_12196821007",
        )
        self.assertIn(self.review["receipt_sha256"], answers[0]["provenance"])
        self.assertFalse(result["promotion_policy"]["external_submission_performed"])
        receipt = result["receipt_sha256"]
        unsigned = dict(result)
        del unsigned["receipt_sha256"]
        self.assertEqual(receipt, canonical_sha(unsigned))

    def test_promotes_multiple_independently_confirmed_fields_atomically(self) -> None:
        second_review, second_confirmation = self._second_pair()
        result = build_semantic_answer_sources(
            [
                (self.review_path, self.confirmation_path),
                (second_review, second_confirmation),
            ]
        )
        self.assertEqual(result["application_id"], "app-live-xai")
        self.assertEqual(result["opening_id"], "4956028007")
        self.assertEqual(
            [answer["match"]["field_name"] for answer in result["answers"]],
            ["question_12196821007", "question_12196822007"],
        )
        self.assertEqual(len(result["source_lineage"]), 2)
        self.assertTrue(result["promotion_policy"]["per_field_review_receipt_required"])
        receipt = result["receipt_sha256"]
        unsigned = dict(result)
        del unsigned["receipt_sha256"]
        self.assertEqual(receipt, canonical_sha(unsigned))

    def test_multi_field_source_binds_end_to_end_to_exact_live_fields(self) -> None:
        second_review, second_confirmation = self._second_pair()
        semantic = build_semantic_answer_sources(
            [
                (self.review_path, self.confirmation_path),
                (second_review, second_confirmation),
            ]
        )
        semantic_path = self.root / "semantic-multi.json"
        semantic_path.write_text(json.dumps(semantic), encoding="utf-8")
        field_bundle_path = self.root / "fields-multi.json"
        field_bundle_path.write_text(
            json.dumps(
                {
                    "job_id": "4956028007",
                    "fields": [
                        {
                            "field": {
                                "name": "question_12196821007",
                                "label": "What exceptional work have you done?",
                                "field_type": "textarea",
                                "required": True,
                            }
                        },
                        {
                            "field": {
                                "name": "question_12196822007",
                                "label": "Why are you interested in xAI?",
                                "field_type": "textarea",
                                "required": True,
                            }
                        },
                    ],
                }
            ),
            encoding="utf-8",
        )
        compiled = compile_answer_source(field_bundle_path, semantic_path)
        self.assertEqual(
            [answer["field_name"] for answer in compiled["answers"]],
            ["question_12196821007", "question_12196822007"],
        )

    def test_multi_field_rejects_cross_application_composition(self) -> None:
        second_review, second_confirmation = self._second_pair()
        review = json.loads(second_review.read_text(encoding="utf-8"))
        review["application_id"] = "different-app"
        review.pop("receipt_sha256", None)
        review["receipt_sha256"] = canonical_sha(review)
        second_review.write_text(json.dumps(review), encoding="utf-8")
        confirmation = json.loads(second_confirmation.read_text(encoding="utf-8"))
        confirmation["application_id"] = "different-app"
        confirmation["review_receipt_sha256"] = review["receipt_sha256"]
        second_confirmation.write_text(json.dumps(confirmation), encoding="utf-8")
        with self.assertRaisesRegex(ReviewConfirmationError, "same application_id"):
            build_semantic_answer_sources(
                [
                    (self.review_path, self.confirmation_path),
                    (second_review, second_confirmation),
                ]
            )

    def test_multi_field_rejects_duplicate_provider_field(self) -> None:
        with self.assertRaisesRegex(
            ReviewConfirmationError, "duplicate confirmed provider field"
        ):
            build_semantic_answer_sources(
                [
                    (self.review_path, self.confirmation_path),
                    (self.review_path, self.confirmation_path),
                ]
            )

    def test_confirmed_review_binds_end_to_end_to_exact_live_field(self) -> None:
        semantic = build_semantic_answer_source(
            self.review_path,
            self.confirmation_path,
        )
        semantic_path = self.root / "semantic.json"
        semantic_path.write_text(json.dumps(semantic), encoding="utf-8")
        field_bundle_path = self.root / "fields.json"
        field_bundle_path.write_text(
            json.dumps(
                {
                    "job_id": "4956028007",
                    "fields": [
                        {
                            "field": {
                                "name": "question_12196821007",
                                "label": "What exceptional work have you done?",
                                "field_type": "textarea",
                                "required": True,
                            }
                        }
                    ],
                }
            ),
            encoding="utf-8",
        )
        compiled = compile_answer_source(field_bundle_path, semantic_path)
        self.assertEqual(compiled["application_id"], "app-live-xai")
        self.assertEqual(compiled["opening_id"], "4956028007")
        self.assertEqual(
            compiled["answers"],
            [
                {
                    "field_name": "question_12196821007",
                    "value": self.review["draft"],
                    "provenance": semantic["answers"][0]["provenance"],
                }
            ],
        )

    def test_confirmed_review_refuses_rotated_provider_field(self) -> None:
        semantic = build_semantic_answer_source(
            self.review_path,
            self.confirmation_path,
        )
        semantic_path = self.root / "semantic.json"
        semantic_path.write_text(json.dumps(semantic), encoding="utf-8")
        field_bundle_path = self.root / "fields.json"
        field_bundle_path.write_text(
            json.dumps(
                {
                    "job_id": "4956028007",
                    "fields": [
                        {
                            "field": {
                                "name": "question_rotated",
                                "label": "What exceptional work have you done?",
                                "field_type": "textarea",
                                "required": True,
                            }
                        }
                    ],
                }
            ),
            encoding="utf-8",
        )
        with self.assertRaisesRegex(AnswerBridgeError, "matched 0 live fields"):
            compile_answer_source(field_bundle_path, semantic_path)

    def test_rejects_unconfirmed_promotion(self) -> None:
        confirmation = dict(self.confirmation)
        confirmation["confirmed"] = False
        self.confirmation_path.write_text(json.dumps(confirmation), encoding="utf-8")
        with self.assertRaisesRegex(ReviewConfirmationError, "confirmed must be true"):
            build_semantic_answer_source(self.review_path, self.confirmation_path)

    def test_rejects_applicant_edit_without_new_review(self) -> None:
        confirmation = dict(self.confirmation)
        confirmation["accepted_text"] = "I changed the evidence-bound draft."
        self.confirmation_path.write_text(json.dumps(confirmation), encoding="utf-8")
        with self.assertRaisesRegex(ReviewConfirmationError, "exactly equal"):
            build_semantic_answer_source(self.review_path, self.confirmation_path)

    def test_rejects_tampered_review_even_when_confirmation_points_to_old_receipt(
        self,
    ) -> None:
        review = dict(self.review)
        review["draft"] = "tampered"
        self.review_path.write_text(json.dumps(review), encoding="utf-8")
        with self.assertRaisesRegex(
            ReviewConfirmationError, "does not match review content"
        ):
            build_semantic_answer_source(self.review_path, self.confirmation_path)

    def test_rejects_field_identity_drift(self) -> None:
        confirmation = dict(self.confirmation)
        confirmation["field_name"] = "question_rotated"
        self.confirmation_path.write_text(json.dumps(confirmation), encoding="utf-8")
        with self.assertRaisesRegex(
            ReviewConfirmationError, "field_name does not match"
        ):
            build_semantic_answer_source(self.review_path, self.confirmation_path)


if __name__ == "__main__":
    unittest.main()

from __future__ import annotations

import hashlib
import json
import tempfile
import unittest
from pathlib import Path

from tools.compose_applicant_submission_package import (
    ApplicantSubmissionPackageError,
    compose_submission_package,
)
from tools.greenhouse_semantic_answer_bridge import compile_answer_source


def _seal(payload: dict[str, object]) -> dict[str, object]:
    unsigned = dict(payload)
    unsigned.pop("receipt_sha256", None)
    payload["receipt_sha256"] = hashlib.sha256(
        json.dumps(unsigned, sort_keys=True, separators=(",", ":")).encode("utf-8")
    ).hexdigest()
    return payload


class ApplicantSubmissionPackageTests(unittest.TestCase):
    def setUp(self) -> None:
        self.tempdir = tempfile.TemporaryDirectory()
        self.addCleanup(self.tempdir.cleanup)
        self.root = Path(self.tempdir.name)
        self.inventory_path = self.root / "inventory.json"
        self.direct_path = self.root / "direct-binding.json"
        self.confirmed_path = self.root / "confirmed-review.json"
        self.package_path = self.root / "package.json"
        self.bundle_path = self.root / "fields.json"

        review_receipt = "a" * 64
        inventory = _seal(
            {
                "schema": "glaciereq.applicant-decision-inventory.v1",
                "application_id": "app-xai-1",
                "opening_id": "4956028007",
                "decision_state": "APPLICANT_DECISIONS_REQUIRED",
                "live_field_count": 3,
                "unresolved_field_count": 3,
                "decisions": [
                    {
                        "field_name": "field_exceptional",
                        "label": "Please describe some exceptional work you have done",
                        "decision_state": "APPLICANT_CONFIRMATION_REQUIRED",
                        "review_receipt_sha256": review_receipt,
                        "proposed_text": "Built a deterministic application execution engine.",
                    },
                    {
                        "field_name": "field_interest",
                        "label": "Why are you interested in this role?",
                        "decision_state": "APPLICANT_INPUT_REQUIRED",
                    },
                    {
                        "field_name": "field_other",
                        "label": "Anything else you want us to know?",
                        "decision_state": "APPLICANT_INPUT_REQUIRED",
                    },
                ],
            }
        )
        inventory_receipt = str(inventory["receipt_sha256"])
        direct = _seal(
            {
                "schema": "glaciereq.applicant-direct-input-binding.v1",
                "application_id": "app-xai-1",
                "opening_id": "4956028007",
                "inventory_receipt_sha256": inventory_receipt,
                "answers": [
                    {
                        "key": "applicant-direct:field_interest",
                        "value": "I want to build reliable frontier systems.",
                        "provenance": "direct.json#field_interest",
                        "match": {
                            "label_pattern": "^Why are you interested in this role\\?$",
                            "field_types": [],
                            "field_name": "field_interest",
                        },
                    },
                    {
                        "key": "applicant-direct:field_other",
                        "value": "I ship production-grade systems across runtimes.",
                        "provenance": "direct.json#field_other",
                        "match": {
                            "label_pattern": "^Anything else you want us to know\\?$",
                            "field_types": [],
                            "field_name": "field_other",
                        },
                    },
                ],
                "remaining_direct_input_fields": [],
                "remaining_generated_confirmation_fields": ["field_exceptional"],
            }
        )
        confirmed = _seal(
            {
                "schema": "glaciereq.applicant-semantic-answers.v1",
                "application_id": "app-xai-1",
                "opening_id": "4956028007",
                "source_review_receipt_sha256": review_receipt,
                "answers": [
                    {
                        "key": "exceptional_work",
                        "value": "Built a deterministic application execution engine.",
                        "provenance": "applicant_confirmed_evidence_review:review=aaa",
                        "match": {
                            "label_pattern": "^Please describe some exceptional work you have done$",
                            "field_types": [],
                            "field_name": "field_exceptional",
                        },
                    }
                ],
            }
        )
        self.inventory_path.write_text(json.dumps(inventory), encoding="utf-8")
        self.direct_path.write_text(json.dumps(direct), encoding="utf-8")
        self.confirmed_path.write_text(json.dumps(confirmed), encoding="utf-8")
        self.bundle_path.write_text(
            json.dumps(
                {
                    "job_id": "4956028007",
                    "fields": [
                        {
                            "field": {
                                "name": "field_exceptional",
                                "label": "Please describe some exceptional work you have done",
                                "field_type": "input_text",
                                "required": True,
                            }
                        },
                        {
                            "field": {
                                "name": "field_interest",
                                "label": "Why are you interested in this role?",
                                "field_type": "input_text",
                                "required": True,
                            }
                        },
                        {
                            "field": {
                                "name": "field_other",
                                "label": "Anything else you want us to know?",
                                "field_type": "input_text",
                                "required": False,
                            }
                        },
                    ],
                }
            ),
            encoding="utf-8",
        )

    def _rewrite_sealed(self, path: Path, mutate) -> None:  # type: ignore[no-untyped-def]
        payload = json.loads(path.read_text(encoding="utf-8"))
        mutate(payload)
        path.write_text(json.dumps(_seal(payload)), encoding="utf-8")

    def test_complete_composition_is_ready_and_preserves_live_order(self) -> None:
        package = compose_submission_package(
            self.inventory_path, self.direct_path, self.confirmed_path
        )
        self.assertTrue(package["ready_for_human_submission"])
        self.assertEqual(package["decision_state"], "READY_FOR_HUMAN_SUBMISSION")
        self.assertEqual(package["live_field_count"], 3)
        self.assertEqual(package["resolved_field_count"], 3)
        self.assertEqual(
            [answer["match"]["field_name"] for answer in package["answers"]],
            ["field_exceptional", "field_interest", "field_other"],
        )
        self.assertFalse(package["authority"]["external_submission_performed"])
        self.assertTrue(package["authority"]["human_submission_gate_required"])

    def test_package_is_directly_consumable_by_live_greenhouse_bridge(self) -> None:
        package = compose_submission_package(
            self.inventory_path, self.direct_path, self.confirmed_path
        )
        self.package_path.write_text(json.dumps(package), encoding="utf-8")
        compiled = compile_answer_source(self.bundle_path, self.package_path)
        self.assertEqual(len(compiled["answers"]), 3)
        self.assertEqual(
            [row["field_name"] for row in compiled["answers"]],
            ["field_exceptional", "field_interest", "field_other"],
        )
        self.assertEqual(compiled["opening_id"], "4956028007")

    def test_partial_direct_input_coverage_fails_closed(self) -> None:
        def remove_one(payload: dict[str, object]) -> None:
            answers = payload["answers"]
            assert isinstance(answers, list)
            answers.pop()

        self._rewrite_sealed(self.direct_path, remove_one)
        with self.assertRaisesRegex(
            ApplicantSubmissionPackageError, "direct input coverage mismatch"
        ):
            compose_submission_package(
                self.inventory_path, self.direct_path, self.confirmed_path
            )

    def test_stale_inventory_binding_fails_closed(self) -> None:
        self._rewrite_sealed(
            self.direct_path,
            lambda payload: payload.__setitem__("inventory_receipt_sha256", "f" * 64),
        )
        with self.assertRaisesRegex(
            ApplicantSubmissionPackageError, "exact decision inventory receipt"
        ):
            compose_submission_package(
                self.inventory_path, self.direct_path, self.confirmed_path
            )

    def test_identity_drift_fails_closed(self) -> None:
        self._rewrite_sealed(
            self.confirmed_path,
            lambda payload: payload.__setitem__("opening_id", "stale-opening"),
        )
        with self.assertRaisesRegex(ApplicantSubmissionPackageError, "identity drift"):
            compose_submission_package(
                self.inventory_path, self.direct_path, self.confirmed_path
            )

    def test_edited_confirmed_review_text_fails_closed(self) -> None:
        def edit_confirmed(payload: dict[str, object]) -> None:
            answers = payload["answers"]
            assert isinstance(answers, list)
            answer = answers[0]
            assert isinstance(answer, dict)
            answer["value"] = "Edited after review."

        self._rewrite_sealed(self.confirmed_path, edit_confirmed)
        with self.assertRaisesRegex(
            ApplicantSubmissionPackageError, "edited text requires a new review"
        ):
            compose_submission_package(
                self.inventory_path, self.direct_path, self.confirmed_path
            )

    def test_tampered_receipt_fails_before_composition(self) -> None:
        payload = json.loads(self.direct_path.read_text(encoding="utf-8"))
        payload["answers"][0]["value"] = "Tampered without resealing."
        self.direct_path.write_text(json.dumps(payload), encoding="utf-8")
        with self.assertRaisesRegex(ApplicantSubmissionPackageError, "receipt mismatch"):
            compose_submission_package(
                self.inventory_path, self.direct_path, self.confirmed_path
            )


if __name__ == "__main__":
    unittest.main()

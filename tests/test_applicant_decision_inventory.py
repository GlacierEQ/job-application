from __future__ import annotations

import json
import tempfile
import unittest
from pathlib import Path

from tools.build_applicant_decision_inventory import (
    ApplicantDecisionInventoryError,
    build_decision_inventory,
)


class ApplicantDecisionInventoryTests(unittest.TestCase):
    def setUp(self) -> None:
        self.tempdir = tempfile.TemporaryDirectory()
        self.addCleanup(self.tempdir.cleanup)
        self.root = Path(self.tempdir.name)
        self.preparation = self.root / "preparation.json"
        self.preparation.write_text(
            json.dumps(
                {
                    "application_id": "app-xai-1",
                    "opening_id": "4956028007",
                    "prompts": [
                        {
                            "field_name": "job_application_answers_attributes_0_text_value",
                            "label": "Please describe some exceptional work you have done",
                        },
                        {
                            "field_name": "job_application_answers_attributes_1_text_value",
                            "label": "Why are you interested in this role?",
                        },
                        {
                            "field_name": "job_application_answers_attributes_2_text_value",
                            "label": "Anything else you want us to know?",
                        },
                    ],
                    "evidence": [
                        {
                            "text": "Built a deterministic application execution engine.",
                            "provenance": "candidate-profile:achievement:0",
                            "evidence_class": "candidate_achievement",
                            "source_sha256": "a" * 64,
                        },
                        {
                            "text": "Designed a source-reviewed multi-agent execution architecture.",
                            "provenance": "xai.md:L40-L55",
                            "evidence_class": "source_reviewed_portfolio_claim",
                            "source_sha256": "b" * 64,
                        },
                        {
                            "text": "Operated production automation across heterogeneous runtimes.",
                            "provenance": "candidate-profile:experience:0",
                            "evidence_class": "candidate_experience",
                            "source_sha256": "c" * 64,
                        },
                    ],
                },
                indent=2,
            ),
            encoding="utf-8",
        )

    def test_inventory_exposes_every_live_field_without_inventing_values(self) -> None:
        inventory = build_decision_inventory(self.preparation)

        self.assertEqual(inventory["live_field_count"], 3)
        self.assertEqual(inventory["unresolved_field_count"], 3)
        self.assertEqual(len(inventory["decisions"]), 3)
        reviewed, *unreviewed = inventory["decisions"]
        self.assertEqual(reviewed["decision_state"], "APPLICANT_CONFIRMATION_REQUIRED")
        self.assertIsNotNone(reviewed["proposed_text"])
        self.assertIsNotNone(reviewed["confirmation_template"])
        for decision in unreviewed:
            self.assertEqual(decision["decision_state"], "APPLICANT_INPUT_REQUIRED")
            self.assertIsNone(decision["proposed_text"])
            self.assertIsNone(decision["confirmation_template"])
            self.assertEqual(decision["evidence"], [])
        self.assertFalse(inventory["authority"]["machine_may_infer_unreviewed_values"])

    def test_inventory_preserves_exact_field_order_and_identity(self) -> None:
        inventory = build_decision_inventory(self.preparation)
        self.assertEqual(
            [decision["field_name"] for decision in inventory["decisions"]],
            [
                "job_application_answers_attributes_0_text_value",
                "job_application_answers_attributes_1_text_value",
                "job_application_answers_attributes_2_text_value",
            ],
        )
        self.assertEqual(inventory["application_id"], "app-xai-1")
        self.assertEqual(inventory["opening_id"], "4956028007")

    def test_inventory_is_deterministic(self) -> None:
        self.assertEqual(
            build_decision_inventory(self.preparation),
            build_decision_inventory(self.preparation),
        )

    def test_duplicate_provider_field_identity_fails_closed(self) -> None:
        payload = json.loads(self.preparation.read_text(encoding="utf-8"))
        payload["prompts"].append(dict(payload["prompts"][0]))
        self.preparation.write_text(json.dumps(payload), encoding="utf-8")
        with self.assertRaisesRegex(
            ApplicantDecisionInventoryError, "duplicate live field identity"
        ):
            build_decision_inventory(self.preparation)


if __name__ == "__main__":
    unittest.main()

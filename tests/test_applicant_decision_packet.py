from __future__ import annotations

import json
import tempfile
import unittest
from pathlib import Path

from tools.build_applicant_decision_packet import (
    ApplicantDecisionPacketError,
    build_decision_packet,
)
from tools.confirm_evidence_bound_review import build_semantic_answer_source


class ApplicantDecisionPacketTests(unittest.TestCase):
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
                        }
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
                            "text": "Operated production-grade automation across heterogeneous runtimes.",
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

    def test_packet_preserves_exact_live_identity_and_stays_unconfirmed(self) -> None:
        packet = build_decision_packet(self.preparation)
        decision = packet["decision"]
        template = decision["confirmation_template"]

        self.assertEqual(packet["application_id"], "app-xai-1")
        self.assertEqual(packet["opening_id"], "4956028007")
        self.assertEqual(
            decision["field_name"],
            "job_application_answers_attributes_0_text_value",
        )
        self.assertFalse(template["confirmed"])
        self.assertEqual(template["accepted_text"], decision["proposed_text"])
        self.assertEqual(template["review_receipt_sha256"], decision["review_receipt_sha256"])
        self.assertFalse(packet["authority"]["machine_may_infer_confirmation"])
        self.assertFalse(packet["authority"]["machine_may_submit_externally"])

    def test_packet_is_deterministic_for_unchanged_preparation(self) -> None:
        first = build_decision_packet(self.preparation)
        second = build_decision_packet(self.preparation)
        self.assertEqual(first, second)
        self.assertEqual(len(first["receipt_sha256"]), 64)

    def test_packet_carries_provenance_diversity_for_human_review(self) -> None:
        packet = build_decision_packet(self.preparation)
        classes = packet["decision"]["evidence_classes"]
        self.assertIn("candidate_achievement", classes)
        self.assertIn("source_reviewed_portfolio_claim", classes)
        self.assertGreaterEqual(len(packet["decision"]["evidence"]), 2)

    def test_missing_source_reviewed_evidence_fails_closed(self) -> None:
        payload = json.loads(self.preparation.read_text(encoding="utf-8"))
        payload["evidence"] = [
            row
            for row in payload["evidence"]
            if row["evidence_class"] != "source_reviewed_portfolio_claim"
        ]
        self.preparation.write_text(json.dumps(payload), encoding="utf-8")
        with self.assertRaisesRegex(ApplicantDecisionPacketError, "source-reviewed portfolio evidence"):
            build_decision_packet(self.preparation)

    def test_human_confirmation_template_composes_into_existing_live_answer_bridge(self) -> None:
        packet = build_decision_packet(self.preparation)
        review_path = self.root / "review.json"
        confirmation_path = self.root / "confirmation.json"
        review_path.write_text(json.dumps(packet["review"], indent=2), encoding="utf-8")

        confirmation = dict(packet["decision"]["confirmation_template"])
        confirmation["confirmed"] = True
        confirmation_path.write_text(json.dumps(confirmation, indent=2), encoding="utf-8")

        promoted = build_semantic_answer_source(review_path, confirmation_path)
        answer = promoted["answers"][0]
        self.assertEqual(promoted["application_id"], packet["application_id"])
        self.assertEqual(promoted["opening_id"], packet["opening_id"])
        self.assertEqual(
            answer["match"]["field_name"],
            packet["decision"]["field_name"],
        )
        self.assertEqual(answer["value"], packet["decision"]["proposed_text"])
        self.assertFalse(promoted["promotion_policy"]["external_submission_performed"])


if __name__ == "__main__":
    unittest.main()

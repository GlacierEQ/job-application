from __future__ import annotations

import hashlib
import json
import tempfile
import unittest
from pathlib import Path

from tools.bind_applicant_direct_inputs import (
    ApplicantDirectInputError,
    bind_direct_inputs,
)
from tools.build_applicant_decision_inventory import build_decision_inventory


def _seal(payload: dict[str, object]) -> dict[str, object]:
    unsigned = dict(payload)
    unsigned.pop("receipt_sha256", None)
    payload["receipt_sha256"] = hashlib.sha256(
        json.dumps(unsigned, sort_keys=True, separators=(",", ":")).encode("utf-8")
    ).hexdigest()
    return payload


class ApplicantDirectInputBindingTests(unittest.TestCase):
    def setUp(self) -> None:
        self.tempdir = tempfile.TemporaryDirectory()
        self.addCleanup(self.tempdir.cleanup)
        self.root = Path(self.tempdir.name)
        self.preparation = self.root / "preparation.json"
        self.inventory_path = self.root / "inventory.json"
        self.direct_inputs = self.root / "direct-inputs.json"
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
        inventory = build_decision_inventory(self.preparation)
        self.inventory_path.write_text(json.dumps(inventory), encoding="utf-8")
        direct = _seal(
            {
                "schema": "glaciereq.applicant-direct-inputs.v1",
                "application_id": "app-xai-1",
                "opening_id": "4956028007",
                "inputs": [
                    {
                        "field_name": "job_application_answers_attributes_1_text_value",
                        "value": "I want to build reliable systems at frontier scale.",
                    },
                    {
                        "field_name": "job_application_answers_attributes_2_text_value",
                        "value": "I care deeply about execution quality and measurable outcomes.",
                    },
                ],
            }
        )
        self.direct_inputs.write_text(json.dumps(direct), encoding="utf-8")

    def test_binds_only_explicit_unresolved_fields(self) -> None:
        result = bind_direct_inputs(self.inventory_path, self.direct_inputs)
        self.assertEqual(result["bound_direct_input_count"], 2)
        self.assertEqual(result["remaining_direct_input_fields"], [])
        self.assertEqual(
            result["remaining_generated_confirmation_fields"],
            ["job_application_answers_attributes_0_text_value"],
        )
        self.assertFalse(result["ready_for_human_submission"])
        self.assertTrue(result["authority"]["values_are_applicant_supplied"])
        self.assertFalse(result["authority"]["machine_inferred_values"])
        self.assertEqual(
            [answer["match"]["field_name"] for answer in result["answers"]],
            [
                "job_application_answers_attributes_1_text_value",
                "job_application_answers_attributes_2_text_value",
            ],
        )

    def test_rejects_identity_drift(self) -> None:
        payload = json.loads(self.direct_inputs.read_text(encoding="utf-8"))
        payload["opening_id"] = "stale-opening"
        _seal(payload)
        self.direct_inputs.write_text(json.dumps(payload), encoding="utf-8")
        with self.assertRaisesRegex(ApplicantDirectInputError, "opening identity drift"):
            bind_direct_inputs(self.inventory_path, self.direct_inputs)

    def test_rejects_direct_binding_to_reviewed_generated_field(self) -> None:
        payload = _seal(
            {
                "schema": "glaciereq.applicant-direct-inputs.v1",
                "application_id": "app-xai-1",
                "opening_id": "4956028007",
                "inputs": [
                    {
                        "field_name": "job_application_answers_attributes_0_text_value",
                        "value": "Bypass the evidence review.",
                    }
                ],
            }
        )
        self.direct_inputs.write_text(json.dumps(payload), encoding="utf-8")
        with self.assertRaisesRegex(
            ApplicantDirectInputError, "APPLICANT_CONFIRMATION_REQUIRED"
        ):
            bind_direct_inputs(self.inventory_path, self.direct_inputs)

    def test_rejects_unknown_duplicate_empty_and_tampered_inputs(self) -> None:
        cases = [
            (
                [
                    {
                        "field_name": "missing-field",
                        "value": "value",
                    }
                ],
                "unknown live field identity",
            ),
            (
                [
                    {
                        "field_name": "job_application_answers_attributes_1_text_value",
                        "value": "one",
                    },
                    {
                        "field_name": "job_application_answers_attributes_1_text_value",
                        "value": "two",
                    },
                ],
                "duplicate direct input",
            ),
            (
                [
                    {
                        "field_name": "job_application_answers_attributes_1_text_value",
                        "value": "   ",
                    }
                ],
                "required non-empty string missing",
            ),
        ]
        for inputs, expected in cases:
            with self.subTest(expected=expected):
                payload = _seal(
                    {
                        "schema": "glaciereq.applicant-direct-inputs.v1",
                        "application_id": "app-xai-1",
                        "opening_id": "4956028007",
                        "inputs": inputs,
                    }
                )
                self.direct_inputs.write_text(json.dumps(payload), encoding="utf-8")
                with self.assertRaisesRegex(ApplicantDirectInputError, expected):
                    bind_direct_inputs(self.inventory_path, self.direct_inputs)

        payload = json.loads(self.direct_inputs.read_text(encoding="utf-8"))
        payload["inputs"][0]["value"] = "tampered after sealing"
        self.direct_inputs.write_text(json.dumps(payload), encoding="utf-8")
        with self.assertRaisesRegex(ApplicantDirectInputError, "receipt mismatch"):
            bind_direct_inputs(self.inventory_path, self.direct_inputs)

    def test_binding_is_deterministic(self) -> None:
        first = bind_direct_inputs(self.inventory_path, self.direct_inputs)
        second = bind_direct_inputs(self.inventory_path, self.direct_inputs)
        self.assertEqual(first, second)


if __name__ == "__main__":
    unittest.main()

import json
import tempfile
import unittest
from pathlib import Path

from tools.greenhouse_semantic_answer_bridge import (
    AnswerBridgeError,
    compile_answer_source,
)


class SemanticAnswerBridgeTest(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.root = Path(self.tmp.name)
        self.bundle = self.root / "fields.json"
        self.bundle.write_text(
            json.dumps(
                {
                    "job_id": "4956028007",
                    "fields": [
                        {
                            "field": {
                                "name": "phone",
                                "label": "Phone",
                                "field_type": "input_text",
                                "required": True,
                            }
                        },
                        {
                            "field": {
                                "name": "question_123",
                                "label": (
                                    "Will you now or in the future require sponsorship?"
                                ),
                                "field_type": "select",
                                "required": True,
                                "options": [["0", "No"], ["1", "Yes"]],
                            }
                        },
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
                                "name": "resume",
                                "label": "Resume/CV",
                                "field_type": "input_file",
                                "required": True,
                            }
                        },
                    ],
                }
            ),
            encoding="utf-8",
        )

    def tearDown(self):
        self.tmp.cleanup()

    def _source(self, answers, **metadata):
        path = self.root / "answers.json"
        path.write_text(
            json.dumps({**metadata, "answers": answers}),
            encoding="utf-8",
        )
        return path

    def test_binds_semantics_to_current_opaque_field_names_and_normalizes_options(self):
        source = self._source(
            [
                {
                    "key": "phone",
                    "value": "+1 808 555 0100",
                    "match": {
                        "label_pattern": "\\bphone\\b",
                        "field_types": ["input_text"],
                    },
                },
                {
                    "key": "sponsorship",
                    "value": "No",
                    "match": {
                        "label_pattern": "sponsor",
                        "field_types": ["select"],
                    },
                },
            ]
        )
        result = compile_answer_source(self.bundle, source)
        self.assertEqual(
            [row["field_name"] for row in result["answers"]],
            ["phone", "question_123"],
        )
        self.assertEqual(result["answers"][1]["value"], "0")
        self.assertEqual(result["bindings"][1]["semantic_key"], "sponsorship")
        self.assertEqual(len(result["receipt_sha256"]), 64)

    def test_exact_confirmed_field_uses_label_only_and_preserves_identity(self):
        source = self._source(
            [
                {
                    "key": "exceptional_work",
                    "value": "Evidence-bound accepted draft.",
                    "match": {
                        "label_pattern": (
                            r"^\s*What\ exceptional\ work\ have\ you\ done\?\s*$"
                        ),
                        "field_name": "question_12196821007",
                        "field_types": [],
                    },
                }
            ],
            application_id="app-live-xai",
            opening_id="4956028007",
        )
        result = compile_answer_source(self.bundle, source)
        self.assertEqual(result["application_id"], "app-live-xai")
        self.assertEqual(result["opening_id"], "4956028007")
        self.assertEqual(
            result["answers"][0]["field_name"],
            "question_12196821007",
        )
        self.assertEqual(
            result["answers"][0]["value"],
            "Evidence-bound accepted draft.",
        )

    def test_refuses_exact_field_identity_drift_even_when_label_matches(self):
        source = self._source(
            [
                {
                    "key": "exceptional_work",
                    "value": "Evidence-bound accepted draft.",
                    "match": {
                        "label_pattern": "exceptional work",
                        "field_name": "question_rotated",
                        "field_types": [],
                    },
                }
            ],
            opening_id="4956028007",
        )
        with self.assertRaisesRegex(AnswerBridgeError, "matched 0 live fields"):
            compile_answer_source(self.bundle, source)

    def test_refuses_opening_identity_drift_before_field_binding(self):
        source = self._source(
            [
                {
                    "key": "phone",
                    "value": "+1 808 555 0100",
                    "match": {
                        "label_pattern": "phone",
                        "field_types": ["input_text"],
                    },
                }
            ],
            opening_id="different-opening",
        )
        with self.assertRaisesRegex(AnswerBridgeError, "opening identity drift"):
            compile_answer_source(self.bundle, source)

    def test_refuses_ambiguous_semantic_match(self):
        payload = json.loads(self.bundle.read_text())
        payload["fields"].append(
            {
                "field": {
                    "name": "phone_secondary",
                    "label": "Phone number",
                    "field_type": "input_text",
                    "required": False,
                }
            }
        )
        self.bundle.write_text(json.dumps(payload), encoding="utf-8")
        source = self._source(
            [
                {
                    "key": "phone",
                    "value": "x",
                    "match": {
                        "label_pattern": "phone",
                        "field_types": ["input_text"],
                    },
                }
            ]
        )
        with self.assertRaisesRegex(AnswerBridgeError, "matched 2 live fields"):
            compile_answer_source(self.bundle, source)

    def test_never_binds_file_or_hidden_provider_fields(self):
        source = self._source(
            [
                {
                    "key": "resume",
                    "value": "fake",
                    "match": {
                        "label_pattern": "resume",
                        "field_types": ["input_file"],
                    },
                }
            ]
        )
        with self.assertRaisesRegex(AnswerBridgeError, "matched 0 live fields"):
            compile_answer_source(self.bundle, source)


if __name__ == "__main__":
    unittest.main()

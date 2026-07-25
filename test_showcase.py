#!/usr/bin/env python3
"""Tests for the evidence-bound recruiter showcase."""
from __future__ import annotations

import copy
import re
import sys
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT))

import generate_showcase  # noqa: E402

LEGAL_RE = re.compile(
    r"1FDV|SUPERLUMINAL_CASE|FEDERAL.?WARFARE|family.?court|court.?case|"
    r"docket|Kekoa|CSEA|civil.?rico|§1983|apex-legal|legal.?warfare",
    re.I,
)


class ShowcaseTests(unittest.TestCase):
    def setUp(self) -> None:
        self.manifest = generate_showcase.load_manifest()

    def test_manifest_has_exactly_three_evidence_bound_flagships(self) -> None:
        flagships = self.manifest["flagships"]
        self.assertEqual(len(flagships), 3)
        self.assertEqual(flagships[0]["id"], "resume-shapeshifter")

        for item in flagships:
            self.assertTrue(item["demonstrates"])
            self.assertTrue(item["evidence_paths"])
            self.assertTrue(item["verified_proof"])
            self.assertTrue(item["current_gaps"])

    def test_generate_writes_concentrated_showcase(self) -> None:
        rc = generate_showcase.main()
        self.assertEqual(rc, 0)

        text = (ROOT / "SHOWCASE.md").read_text(encoding="utf-8")
        self.assertGreater(len(text), 1_500)
        self.assertIn("three-minute proof", text.lower())
        self.assertIn("Ten-minute engineering review", text)
        self.assertIn("Release gates", text)

        for item in self.manifest["flagships"]:
            self.assertEqual(text.count(f"## {self.manifest['flagships'].index(item) + 1}. {item['name']}"), 1)

    def test_public_product_is_the_direct_entry_path(self) -> None:
        text = generate_showcase.build(self.manifest)
        public_url = "https://github.com/GlacierEQ/JOB-RESUME-BUILDER-"
        self.assertIn(public_url, text)
        self.assertIn("lib/truthfulness.ts", text)
        self.assertIn("tests/truthfulness.test.ts", text)

    def test_private_repositories_are_not_presented_as_public_links(self) -> None:
        text = generate_showcase.build(self.manifest)
        for repo in ("AKOS", "pro-code", "xai-colossus-cooling"):
            self.assertNotIn(f"https://github.com/GlacierEQ/{repo}", text)
            self.assertIn(f"`{repo}`", text)

    def test_showcase_rejects_repo_count_hype_and_legal_material(self) -> None:
        text = generate_showcase.build(self.manifest)
        self.assertNotIn("1,052", text)
        self.assertNotIn("hundreds of repos", text.lower())
        self.assertIsNone(LEGAL_RE.search(text))

    def test_manifest_requires_a_public_flagship(self) -> None:
        invalid = copy.deepcopy(self.manifest)
        for item in invalid["flagships"]:
            item["visibility"] = "private"

        with self.assertRaisesRegex(ValueError, "at least one public flagship"):
            generate_showcase.validate_manifest(invalid)

    def test_manifest_rejects_legal_or_case_content(self) -> None:
        invalid = copy.deepcopy(self.manifest)
        invalid["flagships"][0]["verified_proof"].append("family court case material")

        with self.assertRaisesRegex(ValueError, "legal or case material"):
            generate_showcase.validate_manifest(invalid)


if __name__ == "__main__":
    unittest.main(verbosity=2)

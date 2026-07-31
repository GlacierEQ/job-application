"""Tests for the evidence-bound recruiter showcase."""

from __future__ import annotations

import copy
import re
import sys
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT))

import generate_showcase

LEGAL_RE = re.compile(
    r"1FDV|SUPERLUMINAL_CASE|FEDERAL.?WARFARE|family.?court|court.?case|"
    r"docket|Kekoa|CSEA|civil.?rico|§1983|apex-legal|legal.?warfare",
    re.IGNORECASE,
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

    def test_current_flagships_are_public_and_linkable(self) -> None:
        flagships = self.manifest["flagships"]
        self.assertTrue(all(item["visibility"] == "public" for item in flagships))

        text = generate_showcase.build(self.manifest)
        for repo in (
            "JOB-RESUME-BUILDER-",
            "AKOS",
            "pro-code",
            "xai-colossus-cooling",
            "job-app-helix",
        ):
            self.assertIn(f"https://github.com/GlacierEQ/{repo}", text)

    def test_generate_writes_concentrated_showcase(self) -> None:
        rc = generate_showcase.main()
        self.assertEqual(rc, 0)

        text = (ROOT / "SHOWCASE.md").read_text(encoding="utf-8")
        self.assertGreater(len(text), 2_000)
        self.assertIn("three-minute proof", text.lower())
        self.assertIn("Ten-minute engineering review", text)
        self.assertIn("Portfolio control", text)
        self.assertIn("Release gates", text)
        self.assertNotIn("private architecture systems", text.lower())

        for item in self.manifest["flagships"]:
            heading = (
                f"## {self.manifest['flagships'].index(item) + 1}. {item['name']}"
            )
            self.assertEqual(text.count(heading), 1)

    def test_public_product_is_the_direct_entry_path(self) -> None:
        text = generate_showcase.build(self.manifest)
        public_url = "https://github.com/GlacierEQ/JOB-RESUME-BUILDER-"
        self.assertIn(public_url, text)
        self.assertIn("truthfulness boundary", text)
        self.assertIn("adversarial tests", text)

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

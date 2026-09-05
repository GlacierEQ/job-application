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

    def test_manifest_has_an_open_ended_orientation_list(self) -> None:
        flagships = self.manifest["flagships"]
        self.assertIsInstance(flagships, list)
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
        expected_repositories = {
            repository
            for item in self.manifest["flagships"]
            for repository in ([item["repo"]] if item.get("repo") else item["repos"])
        }
        expected_repositories.add("job-app-helix")
        for repo in expected_repositories:
            self.assertIn(f"https://github.com/GlacierEQ/{repo}", text)

    def test_governance_reconciles_public_flagships_with_helix(self) -> None:
        governance = self.manifest["governance"]
        self.assertEqual(governance["control_plane"], "job-app-helix")
        self.assertEqual(governance["live_inventory_total"], 67)
        self.assertEqual(governance["live_workspace_children"], 66)
        self.assertTrue(governance["public_flagships_present_in_control_plane"])
        self.assertEqual(governance["private_operations_repository"], "job-app")
        self.assertTrue(governance["private_operations_excluded_from_public_inventory"])

        declared_public_repositories = {
            repository
            for item in self.manifest["flagships"]
            for repository in ([item["repo"]] if item.get("repo") else item["repos"])
        }
        self.assertSetEqual(
            declared_public_repositories,
            set(governance["public_flagship_repositories"]),
        )
        self.assertNotIn(
            governance["private_operations_repository"],
            governance["public_flagship_repositories"],
        )

    def test_generate_writes_concentrated_showcase(self) -> None:
        rc = generate_showcase.main()
        self.assertEqual(rc, 0)

        text = (ROOT / "SHOWCASE.md").read_text(encoding="utf-8")
        self.assertGreater(len(text), 2_000)
        self.assertIn("proof path", text.lower())
        self.assertIn("Ten-minute engineering review", text)
        self.assertIn("Portfolio control", text)
        self.assertIn("Release gates", text)
        self.assertNotIn("private architecture systems", text.lower())

        for item in self.manifest["flagships"]:
            heading = f"## {self.manifest['flagships'].index(item) + 1}. {item['name']}"
            self.assertEqual(text.count(heading), 1)

    def test_public_product_is_the_direct_entry_path(self) -> None:
        text = generate_showcase.build(self.manifest)
        public_url = "https://github.com/GlacierEQ/JOB-RESUME-BUILDER-"
        self.assertIn(public_url, text)
        self.assertIn("deterministic truthfulness enforcement", text)
        self.assertIn("tests/truthfulness.test.ts", text)

    def test_showcase_rejects_repo_count_hype_and_legal_material(self) -> None:
        text = generate_showcase.build(self.manifest)
        self.assertNotIn("1,052", text)
        self.assertNotIn("hundreds of repos", text.lower())
        self.assertIsNone(LEGAL_RE.search(text))

    def test_manifest_allows_zero_orientation_systems(self) -> None:
        empty = copy.deepcopy(self.manifest)
        empty["flagships"] = []
        generate_showcase.validate_manifest(empty)
        text = generate_showcase.build(empty)
        self.assertIn("full Systems Atlas", text)

    def test_manifest_has_no_fixed_flagship_count(self) -> None:
        expanded = copy.deepcopy(self.manifest)
        extra = copy.deepcopy(expanded["flagships"][0])
        extra["id"] = "additional-orientation-system"
        extra["name"] = "Additional Orientation System"
        expanded["flagships"].append(extra)
        generate_showcase.validate_manifest(expanded)
        text = generate_showcase.build(expanded)
        self.assertIn("Additional Orientation System", text)

    def test_manifest_rejects_legal_or_case_content(self) -> None:
        invalid = copy.deepcopy(self.manifest)
        invalid["flagships"][0]["verified_proof"].append("family court case material")

        with self.assertRaisesRegex(ValueError, "legal or case material"):
            generate_showcase.validate_manifest(invalid)


if __name__ == "__main__":
    unittest.main(verbosity=2)

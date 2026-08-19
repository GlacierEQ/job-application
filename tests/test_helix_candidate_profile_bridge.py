from __future__ import annotations

import importlib.util
import json
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
MODULE_PATH = ROOT / "scripts" / "export_helix_candidate_profile.py"
SPEC = importlib.util.spec_from_file_location("helix_profile_bridge", MODULE_PATH)
assert SPEC is not None and SPEC.loader is not None
MODULE = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(MODULE)


class HelixCandidateProfileBridgeTests(unittest.TestCase):
    def setUp(self) -> None:
        source = ROOT / "site-v15" / "data" / "resume.json"
        self.resume = json.loads(source.read_text(encoding="utf-8"))
        self.profile = MODULE.build_helix_profile(self.resume)

    def test_real_production_resume_projects_to_helix_contract(self) -> None:
        self.assertEqual(self.profile["name"], "Casey Del Carpio Barton")
        self.assertTrue(self.profile["profile_id"].startswith("candidate-"))
        self.assertIn("Applied AI Systems Architect", self.profile["headline"])
        self.assertIn("Python", self.profile["skills"])
        self.assertIn("TypeScript", self.profile["skills"])
        self.assertGreaterEqual(len(self.profile["experience"]), 3)
        self.assertGreaterEqual(len(self.profile["achievements"]), 5)
        self.assertEqual(
            self.profile["provenance"]["source"],
            "site-v15/data/resume.json",
        )
        self.assertEqual(len(self.profile["provenance"]["source_sha256"]), 64)

    def test_projection_is_deterministic(self) -> None:
        again = MODULE.build_helix_profile(json.loads(json.dumps(self.resume)))
        self.assertEqual(MODULE.render(self.profile), MODULE.render(again))

    def test_duplicate_skill_evidence_collapses_without_reordering(self) -> None:
        resume = json.loads(json.dumps(self.resume))
        resume["skills"].append({"name": "Python", "keywords": ["python", "New Signal"]})
        profile = MODULE.build_helix_profile(resume)
        folded = [item.casefold() for item in profile["skills"]]
        self.assertEqual(folded.count("python"), 1)
        self.assertIn("New Signal", profile["skills"])

    def test_missing_identity_fails_closed(self) -> None:
        resume = json.loads(json.dumps(self.resume))
        resume["basics"]["name"] = ""
        with self.assertRaisesRegex(ValueError, "requires name"):
            MODULE.build_helix_profile(resume)


if __name__ == "__main__":
    unittest.main()

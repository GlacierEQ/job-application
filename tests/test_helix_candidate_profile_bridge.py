from __future__ import annotations

import importlib.util
import json
import tempfile
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

    def test_real_production_resume_projects_to_complete_helix_contract(self) -> None:
        self.assertTrue(self.profile["profile_id"].startswith("candidate-"))
        self.assertTrue(self.profile["name"])
        self.assertTrue(self.profile["headline"])
        self.assertTrue(self.profile["summary"])
        self.assertGreaterEqual(len(self.profile["skills"]), 2)
        self.assertGreaterEqual(len(self.profile["experience"]), 1)
        self.assertGreaterEqual(len(self.profile["achievements"]), 1)
        self.assertEqual(
            self.profile["provenance"]["source"], "site-v15/data/resume.json"
        )
        self.assertEqual(len(self.profile["provenance"]["source_sha256"]), 64)

    def test_projection_is_deterministic(self) -> None:
        again = MODULE.build_helix_profile(json.loads(json.dumps(self.resume)))
        self.assertEqual(MODULE.render(self.profile), MODULE.render(again))

    def test_duplicate_skill_evidence_collapses_without_reordering(self) -> None:
        resume = json.loads(json.dumps(self.resume))
        resume.setdefault("skills", []).append(
            {"name": "Python", "keywords": ["python", "New Signal"]}
        )
        profile = MODULE.build_helix_profile(resume)
        folded = [item.casefold() for item in profile["skills"]]
        self.assertEqual(folded.count("python"), 1)
        self.assertIn("New Signal", profile["skills"])

    def test_missing_identity_fails_closed(self) -> None:
        resume = json.loads(json.dumps(self.resume))
        resume["basics"]["name"] = ""
        with self.assertRaisesRegex(ValueError, "requires name"):
            MODULE.build_helix_profile(resume)

    def test_missing_required_helix_evidence_fails_closed(self) -> None:
        resume = json.loads(json.dumps(self.resume))
        resume["projects"] = []
        with self.assertRaisesRegex(ValueError, "required fields"):
            MODULE.build_helix_profile(resume)

    def test_atomic_projection_round_trip_is_checkable(self) -> None:
        with tempfile.TemporaryDirectory() as tempdir:
            output = Path(tempdir) / "candidate-profile.json"
            MODULE._atomic_write(output, MODULE.render(self.profile))
            loaded = json.loads(output.read_text(encoding="utf-8"))
            self.assertEqual(
                loaded["provenance"]["source_sha256"],
                self.profile["provenance"]["source_sha256"],
            )


if __name__ == "__main__":
    unittest.main()

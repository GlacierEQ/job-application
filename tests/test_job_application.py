"""Test suite for Job Application repository artifacts and showcase generation."""

import json
import unittest
from pathlib import Path


class TestJobApplication(unittest.TestCase):
    def test_resume_and_manifest_exist(self):
        root = Path(__file__).parent.parent
        resume_path = root / "RESUME.md"
        manifest_path = root / "portfolio_manifest.json"

        self.assertTrue(resume_path.exists())
        self.assertTrue(manifest_path.exists())

        manifest = json.loads(manifest_path.read_text())
        self.assertEqual(manifest["owner"], "GlacierEQ")
        self.assertGreater(len(manifest["flagships"]), 0)


if __name__ == "__main__":
    unittest.main()

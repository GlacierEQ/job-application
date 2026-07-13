#!/usr/bin/env python3
"""Real-path tests for the hireable showcase.

Drives generate_showcase.main() and reads SHOWCASE.md / README.md from disk.
No hard-coded success without opening the real entry artifacts.
"""
from __future__ import annotations

import re
import sys
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT))

import generate_showcase  # noqa: E402


MUST_NAMES = ["AKOS", "pro-code", "Pro-", "xAI", "SpaceX", "Anthropic", "NVIDIA", "Notion"]
LEGAL_RE = re.compile(
    r"1FDV-23|FEDERAL-WARFARE|SUPERLUMINAL_CASE|DOCKETS|AspenGrove-KEKOA",
    re.I,
)


class ShowcaseTests(unittest.TestCase):
    def test_generate_writes_showcase(self) -> None:
        rc = generate_showcase.main()
        self.assertEqual(rc, 0)
        path = ROOT / "SHOWCASE.md"
        self.assertTrue(path.is_file(), "SHOWCASE.md must exist after generate")
        text = path.read_text()
        self.assertGreater(len(text), 800, "showcase must be non-empty substantive content")
        for name in MUST_NAMES:
            self.assertIn(name, text, f"missing {name}")

    def test_readme_is_entry_path(self) -> None:
        readme = ROOT / "README.md"
        self.assertTrue(readme.is_file())
        body = readme.read_text()
        self.assertIn("SHOWCASE.md", body)
        self.assertIn("AKOS", body)

    def test_no_legal_case_leak(self) -> None:
        generate_showcase.main()
        text = (ROOT / "SHOWCASE.md").read_text()
        self.assertIsNone(LEGAL_RE.search(text), "legal/case docket content must not appear")

    def test_framework_cards_have_role_and_location(self) -> None:
        generate_showcase.main()
        text = (ROOT / "SHOWCASE.md").read_text()
        # AKOS + pro-code + at least one motion sample with github pointer
        self.assertIn("Apex Knowledge OS", text)
        self.assertIn("pro-code", text)
        self.assertIn("https://github.com/GlacierEQ/AKOS", text)
        self.assertIn("https://github.com/GlacierEQ/pro-code", text)
        self.assertTrue(
            "xai-colossus-cooling" in text or "colossus-gateway" in text,
            "need a colossus/xAI motion sample",
        )
        self.assertIn("spacex-thermal-protection", text)

    def test_company_map_rows(self) -> None:
        generate_showcase.main()
        text = (ROOT / "SHOWCASE.md").read_text()
        for company in ("xAI", "SpaceX", "Anthropic", "NVIDIA", "Notion"):
            self.assertIn(company, text)
        # each should have a concrete pointer nearby (github or local state)
        self.assertIn("github.com/GlacierEQ", text)
        self.assertIn("cathedrals_cases_distill.json", text)


if __name__ == "__main__":
    unittest.main(verbosity=2)

#!/usr/bin/env python3
"""Run the recruiter-portfolio verification contract on the public action face."""
from __future__ import annotations

import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
COMMANDS = (
    [sys.executable, "generate_showcase.py"],
    [sys.executable, "test_showcase.py"],
    ["git", "diff", "--exit-code", "--", "SHOWCASE.md"],
)


def main() -> int:
    for command in COMMANDS:
        completed = subprocess.run(command, cwd=ROOT, check=False)
        if completed.returncode != 0:
            return completed.returncode
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

"""Shipped portfolio surface — loads portfolio_manifest.json from leaf root."""

from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def load_manifest() -> dict:
    return json.loads((ROOT / "portfolio_manifest.json").read_text(encoding="utf-8"))


def flagship_count() -> int:
    return len(load_manifest().get("flagships", []))

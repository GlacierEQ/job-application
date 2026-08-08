#!/usr/bin/env python3
from __future__ import annotations

from hashlib import sha256
import json
from pathlib import Path
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[1]


def file_hash(path: Path) -> str:
    return sha256(path.read_bytes()).hexdigest()


def main() -> int:
    manifest = json.loads((ROOT / "proof" / "proof_manifest.json").read_text())
    if manifest.get("schema") != "glaciereq.mission-assurance-proof-manifest.v1":
        raise SystemExit("proof manifest schema mismatch")

    failures = []
    for relative, expected in manifest["governed_files"].items():
        path = ROOT / relative
        actual = file_hash(path) if path.is_file() else None
        if actual != expected:
            failures.append({"path": relative, "expected": expected, "actual": actual})

    demo = subprocess.run(
        [sys.executable, str(ROOT / "scripts" / "demo.py")],
        cwd=ROOT,
        env={**__import__("os").environ, "PYTHONPATH": str(ROOT / "src")},
        text=True,
        capture_output=True,
        check=True,
    )
    actual_receipt = json.loads(demo.stdout)
    expected_receipt = json.loads((ROOT / "proof" / "reproduced_receipt.json").read_text())
    if actual_receipt != expected_receipt:
        failures.append({"path": "proof/reproduced_receipt.json", "error": "demo drift"})

    if actual_receipt.get("receipt_id") != manifest.get("reproduced_receipt_id"):
        failures.append({"path": "proof/reproduced_receipt.json", "error": "receipt id drift"})

    if failures:
        print(json.dumps({"status": "FAIL", "failures": failures}, indent=2))
        return 1

    print(json.dumps({
        "status": "PASS",
        "schema": manifest["schema"],
        "governed_files": len(manifest["governed_files"]),
        "reproduced_receipt_id": manifest["reproduced_receipt_id"],
        "test_count": manifest["test_count"],
        "network_required": manifest["network_required"],
        "credentials_required": manifest["credentials_required"],
        "external_model_required": manifest["external_model_required"],
    }, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

from __future__ import annotations

import json
import subprocess
import sys
from hashlib import sha256
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
EXPECTED_RECEIPT_ID = "b7a3e3cba968e19bb91ed8f6881b69e37efc97d7e8414be0aca431dff501123f"
GOVERNED_FILES = {
    ".github/workflows/ci.yml",
    "MASTER.md",
    "MESH.yaml",
    "README.md",
    "buf.yaml",
    "evidence/problem_trusted_agentic_ai_integration.json",
    "evidence/role_734997br.json",
    "examples/lockheed_public_lens.json",
    "glaciereq/mission_assurance/v1/contract.proto",
    "machine/INTEGRATION.md",
    "machine/remedy.json",
    "proof/claim_receipt.json",
    "proof/implementation_receipt.json",
    "proof/reproduced_receipt.json",
    "pyproject.toml",
    "scripts/demo.py",
    "scripts/verify_proof.py",
    "src/mission_assurance/__init__.py",
    "src/mission_assurance/core.py",
    "tests/test_assurance.py",
}


def file_hash(path: Path) -> str:
    return sha256(path.read_bytes()).hexdigest()


def main() -> int:
    manifest = json.loads((ROOT / "proof" / "proof_manifest.json").read_text())
    failures = []

    if manifest.get("schema") != "glaciereq.mission-assurance-proof-manifest.v1":
        failures.append({"path": "proof/proof_manifest.json", "error": "schema mismatch"})

    manifest_files = set(manifest.get("governed_files", {}))
    if manifest_files != GOVERNED_FILES:
        failures.append(
            {
                "path": "proof/proof_manifest.json",
                "error": "governed file set drift",
                "missing": sorted(GOVERNED_FILES - manifest_files),
                "unexpected": sorted(manifest_files - GOVERNED_FILES),
            }
        )

    if manifest.get("reproduced_receipt_id") != EXPECTED_RECEIPT_ID:
        failures.append({"path": "proof/proof_manifest.json", "error": "receipt anchor drift"})

    for relative in sorted(GOVERNED_FILES):
        expected = manifest.get("governed_files", {}).get(relative)
        path = ROOT / relative
        actual = file_hash(path) if path.is_file() else None
        if actual != expected:
            failures.append({"path": relative, "expected": expected, "actual": actual})

    demo = None
    try:
        demo = subprocess.run(
            [sys.executable, str(ROOT / "scripts" / "demo.py")],
            cwd=ROOT,
            env={"PYTHONPATH": str(ROOT / "src")},
            text=True,
            capture_output=True,
            check=True,
        )
    except subprocess.CalledProcessError as error:
        failures.append(
            {
                "path": "scripts/demo.py",
                "error": "demo execution failed",
                "returncode": error.returncode,
                "stderr": error.stderr[-2000:],
            }
        )

    if demo is not None:
        try:
            actual_receipt = json.loads(demo.stdout)
        except json.JSONDecodeError as error:
            failures.append({"path": "scripts/demo.py", "error": f"invalid demo JSON: {error}"})
        else:
            expected_receipt = json.loads((ROOT / "proof" / "reproduced_receipt.json").read_text())
            if actual_receipt != expected_receipt:
                failures.append({"path": "proof/reproduced_receipt.json", "error": "demo drift"})
            if actual_receipt.get("receipt_id") != EXPECTED_RECEIPT_ID:
                failures.append(
                    {"path": "proof/reproduced_receipt.json", "error": "receipt id drift"}
                )

    if failures:
        print(json.dumps({"status": "FAIL", "failures": failures}, indent=2))
        return 1

    print(
        json.dumps(
            {
                "status": "PASS",
                "schema": manifest["schema"],
                "governed_files": len(GOVERNED_FILES),
                "reproduced_receipt_id": EXPECTED_RECEIPT_ID,
                "test_count": manifest["test_count"],
                "network_required": manifest["network_required"],
                "credentials_required": manifest["credentials_required"],
                "external_model_required": manifest["external_model_required"],
                "trust_anchor": "fixed file set + fixed receipt id + immutable Git commit when promoted",
            },
            indent=2,
        )
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

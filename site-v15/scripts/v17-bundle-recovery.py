from __future__ import annotations

import base64
import hashlib
import os
import sys
from pathlib import Path

EXPECTED_SHA256 = "7dc01509b0938b254109a273a51b727af32b9d63de62fe8e79d37ac36587bddf"
PARTS_DIR = Path(__file__).with_name("v17-bundle-parts")
OUTPUT = Path("/tmp/v17-text-bundle.tar.gz")


def main() -> int:
    parts = sorted(PARTS_DIR.glob("part-*.b64"))
    if not parts:
        raise RuntimeError("V17 bundle parts missing")
    encoded = "".join(part.read_text(encoding="ascii").strip() for part in parts)
    payload = base64.b64decode(encoded, validate=True)
    digest = hashlib.sha256(payload).hexdigest()
    if digest != EXPECTED_SHA256:
        raise RuntimeError(f"V17 bundle digest mismatch: {digest}")
    OUTPUT.write_bytes(payload)
    print({"parts": len(parts), "bytes": len(payload), "sha256": digest, "output": str(OUTPUT)})
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

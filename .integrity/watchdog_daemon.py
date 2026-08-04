"""Integrity watchdog — scoped SHA-256 baselines for executable Python surfaces."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path


class WatchdogDaemon:
    """Verify a deliberately scoped set of Python files against a baseline.

    Public prose, résumés, generated portfolio assets, and release candidates use
    their own contract checks. They are not silently treated as immutable source.
    """

    PATTERNS = (
        "src/**/*.py",
        "*.py",
        "connectors/**/*.py",
        "scripts/**/*.py",
        "tests/**/*.py",
    )

    def __init__(self, repo_root: str | None = None):
        integrity_dir = Path(__file__).resolve().parent
        self.repo_root = (
            Path(repo_root).resolve() if repo_root else integrity_dir.parent
        )
        self.hash_store = integrity_dir / "file_hashes.json"
        self.baseline: dict[str, str] = {}
        if self.hash_store.exists():
            payload = json.loads(self.hash_store.read_text(encoding="utf-8"))
            self.baseline = payload.get("hashes", payload)

    def scan(self) -> dict[str, str]:
        current: dict[str, str] = {}
        for pattern in self.PATTERNS:
            for path in self.repo_root.glob(pattern):
                if "__pycache__" in path.parts or ".git" in path.parts:
                    continue
                if path.is_file():
                    relative = str(path.relative_to(self.repo_root))
                    current[relative] = hashlib.sha256(path.read_bytes()).hexdigest()
        return dict(sorted(current.items()))

    def update_baseline(self) -> None:
        current = self.scan()
        payload = {
            "schema": "glaciereq.integrity-python-baseline.v2",
            "scope": list(self.PATTERNS),
            "file_count": len(current),
            "hashes": current,
        }
        self.hash_store.write_text(
            json.dumps(payload, indent=2) + "\n",
            encoding="utf-8",
        )
        self.baseline = current

    def verify(self) -> dict[str, bool]:
        current = self.scan()
        paths = sorted(set(current) | set(self.baseline))
        return {
            path: path in current
            and path in self.baseline
            and self.baseline[path] == current[path]
            for path in paths
        }


if __name__ == "__main__":
    watchdog = WatchdogDaemon()
    result = watchdog.verify()
    ok = bool(result) and all(result.values())
    print("Integrity check:", "PASS" if ok else "FAIL", f"({len(result)} files)")
    if not ok:
        for path, valid in result.items():
            if not valid:
                print("MISMATCH:", path)

from __future__ import annotations

import unittest
from datetime import UTC, datetime

from tools.workflow_evidence_freshness import (
    EvidenceFreshnessError,
    build_evidence_freshness,
)

AS_OF = datetime(2026, 8, 20, tzinfo=UTC)


def _entry(evidence_id: str, verified_at: str, sha: str = "a" * 40) -> dict:
    return {
        "id": evidence_id,
        "repository": "GlacierEQ/job-application",
        "commit_sha": sha,
        "verified_at": verified_at,
    }


class EvidenceFreshnessTests(unittest.TestCase):
    def test_scores_and_orders_freshness_deterministically(self) -> None:
        manifest = {
            "schema": "glaciereq.evidence-manifest.v1",
            "entries": [
                _entry("old", "2025-01-01T00:00:00Z"),
                _entry("fresh", "2026-08-19T00:00:00Z", "b" * 40),
                _entry("aging", "2026-05-25T00:00:00Z", "c" * 40),
            ],
        }
        first = build_evidence_freshness(manifest, as_of=AS_OF)
        second = build_evidence_freshness(manifest, as_of=AS_OF)
        self.assertEqual(first, second)
        self.assertEqual([e["id"] for e in first["entries"]], ["fresh", "aging", "old"])
        self.assertEqual(first["entries"][0]["freshness_weight"], 1.0)
        self.assertEqual(first["entries"][-1]["state"], "stale")
        self.assertEqual(len(first["receipt_sha256"]), 64)

    def test_rejects_duplicate_evidence_ids(self) -> None:
        manifest = {
            "schema": "glaciereq.evidence-manifest.v1",
            "entries": [
                _entry("same", "2026-08-19T00:00:00Z"),
                _entry("same", "2026-08-18T00:00:00Z", "b" * 40),
            ],
        }
        with self.assertRaisesRegex(EvidenceFreshnessError, "duplicate"):
            build_evidence_freshness(manifest, as_of=AS_OF)

    def test_rejects_non_exact_sha(self) -> None:
        manifest = {
            "schema": "glaciereq.evidence-manifest.v1",
            "entries": [_entry("bad", "2026-08-19T00:00:00Z", "abc123")],
        }
        with self.assertRaisesRegex(EvidenceFreshnessError, "40-char"):
            build_evidence_freshness(manifest, as_of=AS_OF)

    def test_rejects_future_evidence(self) -> None:
        manifest = {
            "schema": "glaciereq.evidence-manifest.v1",
            "entries": [_entry("future", "2026-08-22T00:00:00Z")],
        }
        with self.assertRaisesRegex(EvidenceFreshnessError, "future"):
            build_evidence_freshness(manifest, as_of=AS_OF)

    def test_rejects_repository_outside_boundary(self) -> None:
        entry = _entry("foreign", "2026-08-19T00:00:00Z")
        entry["repository"] = "OtherOrg/repo"
        manifest = {"schema": "glaciereq.evidence-manifest.v1", "entries": [entry]}
        with self.assertRaisesRegex(EvidenceFreshnessError, "outside GlacierEQ"):
            build_evidence_freshness(manifest, as_of=AS_OF)


if __name__ == "__main__":
    unittest.main()

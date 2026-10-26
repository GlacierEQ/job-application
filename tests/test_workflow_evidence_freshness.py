from __future__ import annotations

import json
import sys
import tempfile
import unittest
from datetime import UTC, datetime
from pathlib import Path
from unittest import mock

from tools.workflow_evidence_freshness import (
    EvidenceFreshnessError,
    build_evidence_freshness,
    main,
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

    def test_rejects_invalid_timestamp(self) -> None:
        manifest = {
            "schema": "glaciereq.evidence-manifest.v1",
            "entries": [_entry("bad-time", "not-a-timestamp")],
        }
        with self.assertRaisesRegex(
            EvidenceFreshnessError, "invalid evidence timestamp"
        ):
            build_evidence_freshness(manifest, as_of=AS_OF)

    def test_rejects_naive_timestamp(self) -> None:
        manifest = {
            "schema": "glaciereq.evidence-manifest.v1",
            "entries": [_entry("naive", "2026-08-19T10:00:00")],
        }
        with self.assertRaisesRegex(
            EvidenceFreshnessError, "must include timezone"
        ):
            build_evidence_freshness(manifest, as_of=AS_OF)

    def test_scores_mid_age_bands(self) -> None:
        manifest = {
            "schema": "glaciereq.evidence-manifest.v1",
            "entries": [
                _entry("mid", "2026-04-22T00:00:00Z", "b" * 40),
                _entry("older", "2026-01-22T00:00:00Z", "c" * 40),
            ],
        }
        result = build_evidence_freshness(manifest, as_of=AS_OF)
        weights = {entry["id"]: entry for entry in result["entries"]}
        self.assertEqual(weights["mid"]["freshness_weight"], 0.65)
        self.assertEqual(weights["mid"]["state"], "aging")
        self.assertEqual(weights["older"]["freshness_weight"], 0.4)
        self.assertEqual(weights["older"]["state"], "stale")

    def test_rejects_unsupported_manifest_schema(self) -> None:
        manifest = {
            "schema": "something-else",
            "entries": [_entry("x", "2026-08-19T00:00:00Z")],
        }
        with self.assertRaisesRegex(
            EvidenceFreshnessError, "unsupported evidence manifest schema"
        ):
            build_evidence_freshness(manifest, as_of=AS_OF)

    def test_rejects_naive_as_of(self) -> None:
        manifest = {
            "schema": "glaciereq.evidence-manifest.v1",
            "entries": [_entry("x", "2026-08-19T00:00:00Z")],
        }
        with self.assertRaisesRegex(
            EvidenceFreshnessError, "as_of must include timezone"
        ):
            build_evidence_freshness(manifest, as_of=datetime(2026, 8, 20))

    def test_rejects_missing_entries(self) -> None:
        for entries in ([], None):
            manifest = {"schema": "glaciereq.evidence-manifest.v1", "entries": entries}
            with self.assertRaisesRegex(
                EvidenceFreshnessError, "requires entries"
            ):
                build_evidence_freshness(manifest, as_of=AS_OF)

    def test_rejects_non_object_entry(self) -> None:
        manifest = {
            "schema": "glaciereq.evidence-manifest.v1",
            "entries": ["not-an-object"],
        }
        with self.assertRaisesRegex(EvidenceFreshnessError, "must be an object"):
            build_evidence_freshness(manifest, as_of=AS_OF)

    def test_main_writes_scored_output(self) -> None:
        manifest = {
            "schema": "glaciereq.evidence-manifest.v1",
            "entries": [_entry("fresh", "2026-08-19T00:00:00Z")],
        }
        with tempfile.TemporaryDirectory() as tmp:
            manifest_path = Path(tmp) / "manifest.json"
            output_path = Path(tmp) / "freshness.json"
            manifest_path.write_text(json.dumps(manifest), encoding="utf-8")
            argv = [
                "workflow_evidence_freshness",
                "--manifest",
                str(manifest_path),
                "--as-of",
                "2026-08-20T00:00:00Z",
                "--output",
                str(output_path),
            ]
            with mock.patch.object(sys, "argv", argv):
                self.assertEqual(main(), 0)
            scored = json.loads(output_path.read_text(encoding="utf-8"))
            self.assertEqual(scored["schema"], "glaciereq.evidence-freshness.v1")
            self.assertEqual(scored["entries"][0]["id"], "fresh")


if __name__ == "__main__":
    unittest.main()

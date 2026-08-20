from __future__ import annotations

import unittest
from datetime import UTC, datetime

from tools.workflow_recruiter_live_pipeline import (
    LiveRecruiterProofError,
    build_evidence_manifest,
    build_live_recruiter_proof,
)

AS_OF = datetime(2026, 8, 20, 6, 0, tzinfo=UTC)


def _system(system_id: str, repo: str) -> dict:
    return {
        "id": system_id,
        "name": system_id,
        "repo": f"https://github.com/GlacierEQ/{repo}",
        "state": "live",
        "summary": f"{system_id} summary",
        "evidence": f"{system_id} evidence",
        "limit": f"{system_id} ceiling",
        "level": "verified",
    }


def _topology() -> dict:
    return {
        "schema": "glaciereq.workflow-topology.v1",
        "receipt_sha256": "topology-receipt",
        "flows": [
            {
                "id": "application",
                "name": "Application",
                "intent": "application proof",
                "steps": [
                    {"transition": "compose", "system": _system("job-application", "job-application")},
                    {"transition": "route", "system": _system("receipt-router", "receipt-router")},
                ],
            },
            {
                "id": "architecture",
                "name": "Architecture",
                "intent": "architecture proof",
                "steps": [
                    {"transition": "build", "system": _system("helix", "Helix")},
                ],
            },
        ],
    }


def _run(sha: str, updated_at: str) -> dict:
    return {
        "conclusion": "success",
        "head_sha": sha,
        "updated_at": updated_at,
        "html_url": "https://github.com/GlacierEQ/example/actions/runs/1",
    }


def _fetcher(responses: dict[str, dict]) -> callable:
    def fetch(url: str) -> dict:
        for fragment, payload in responses.items():
            if fragment in url:
                return payload
        raise AssertionError(f"unexpected URL: {url}")

    return fetch


class LiveRecruiterProofTests(unittest.TestCase):
    def test_manifest_uses_newest_successful_verification_event_per_system(self) -> None:
        fetch = _fetcher(
            {
                "/job-application/actions/runs": {
                    "workflow_runs": [
                        _run("a" * 40, "2026-08-19T04:00:00Z"),
                        _run("b" * 40, "2026-08-18T04:00:00Z"),
                    ]
                },
                "/receipt-router/actions/runs": {
                    "workflow_runs": [_run("c" * 40, "2026-08-18T04:00:00Z")]
                },
                "/Helix/actions/runs": {
                    "workflow_runs": [_run("d" * 40, "2026-08-20T04:00:00Z")]
                },
            }
        )
        manifest = build_evidence_manifest(_topology(), fetch_json=fetch)
        by_id = {entry["id"]: entry for entry in manifest["entries"]}
        self.assertEqual(by_id["job-application"]["commit_sha"], "a" * 40)
        self.assertEqual(by_id["helix"]["repository"], "GlacierEQ/Helix")
        self.assertEqual(manifest["unverified_systems"], [])

    def test_missing_successful_run_remains_explicitly_unverified(self) -> None:
        fetch = _fetcher(
            {
                "/job-application/actions/runs": {
                    "workflow_runs": [_run("a" * 40, "2026-08-19T04:00:00Z")]
                },
                "/receipt-router/actions/runs": {"workflow_runs": []},
                "/Helix/actions/runs": {
                    "workflow_runs": [_run("d" * 40, "2026-08-20T04:00:00Z")]
                },
            }
        )
        result = build_live_recruiter_proof(
            _topology(), "recruiter", as_of=AS_OF, fetch_json=fetch, top_k=2
        )
        self.assertEqual(result["coverage"]["unverified_system_count"], 1)
        unverified = result["coverage"]["unverified_systems"][0]
        self.assertEqual(unverified["id"], "receipt-router")
        application = next(
            brief
            for brief in result["recruiter_brief"]["briefs"]
            if brief["flow_id"] == "application"
        )
        router = next(
            point
            for point in application["proof_points"]
            if point["system_id"] == "receipt-router"
        )
        self.assertEqual(router["freshness_weight"], 0.0)
        self.assertEqual(router["freshness_state"], "unverified")

    def test_live_pipeline_automatically_composes_manifest_freshness_and_brief(self) -> None:
        fetch = _fetcher(
            {
                "/job-application/actions/runs": {
                    "workflow_runs": [_run("a" * 40, "2025-01-01T00:00:00Z")]
                },
                "/receipt-router/actions/runs": {
                    "workflow_runs": [_run("b" * 40, "2025-01-01T00:00:00Z")]
                },
                "/Helix/actions/runs": {
                    "workflow_runs": [_run("c" * 40, "2026-08-20T04:00:00Z")]
                },
            }
        )
        result = build_live_recruiter_proof(
            _topology(), "recruiter", as_of=AS_OF, fetch_json=fetch, top_k=1
        )
        self.assertEqual(result["schema"], "glaciereq.live-recruiter-proof.v1")
        self.assertEqual(result["freshness"]["schema"], "glaciereq.evidence-freshness.v1")
        self.assertEqual(
            result["recruiter_brief"]["schema"], "glaciereq.recruiter-proof-brief.v2"
        )
        self.assertEqual(result["recruiter_brief"]["briefs"][0]["flow_id"], "architecture")
        self.assertEqual(result["coverage"]["verified_system_count"], 3)

    def test_rejects_repository_outside_glaciereq(self) -> None:
        topology = _topology()
        topology["flows"][0]["steps"][0]["system"]["repo"] = "https://github.com/OtherOrg/repo"
        with self.assertRaisesRegex(LiveRecruiterProofError, "outside GlacierEQ"):
            build_evidence_manifest(topology, fetch_json=lambda _: {})

    def test_rejects_when_no_system_has_a_successful_verification_event(self) -> None:
        with self.assertRaisesRegex(LiveRecruiterProofError, "no successful GitHub Actions"):
            build_evidence_manifest(
                _topology(), fetch_json=lambda _: {"workflow_runs": []}
            )

    def test_ignores_malformed_success_records_instead_of_inventing_proof(self) -> None:
        fetch = _fetcher(
            {
                "/job-application/actions/runs": {
                    "workflow_runs": [
                        {"conclusion": "success", "head_sha": "short", "updated_at": "2026-08-20T00:00:00Z"}
                    ]
                },
                "/receipt-router/actions/runs": {
                    "workflow_runs": [_run("b" * 40, "2026-08-19T00:00:00Z")]
                },
                "/Helix/actions/runs": {
                    "workflow_runs": [_run("c" * 40, "2026-08-19T00:00:00Z")]
                },
            }
        )
        manifest = build_evidence_manifest(_topology(), fetch_json=fetch)
        self.assertNotIn("job-application", {entry["id"] for entry in manifest["entries"]})
        self.assertEqual(manifest["unverified_systems"][0]["id"], "job-application")


if __name__ == "__main__":
    unittest.main()

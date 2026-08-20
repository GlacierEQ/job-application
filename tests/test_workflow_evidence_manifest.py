from __future__ import annotations

import unittest

from tools.workflow_evidence_manifest import (
    EvidenceManifestError,
    build_evidence_manifest,
)


def _topology() -> dict:
    return {
        "schema": "glaciereq.workflow-topology.v1",
        "receipt_sha256": "a" * 64,
        "flows": [
            {
                "id": "flow-a",
                "steps": [
                    {
                        "system": {
                            "id": "helix",
                            "repo": "https://github.com/GlacierEQ/job-app-helix",
                        }
                    },
                    {
                        "system": {
                            "id": "job-application",
                            "repo": "https://github.com/GlacierEQ/job-application",
                        }
                    },
                ],
            },
            {
                "id": "flow-b",
                "steps": [
                    {
                        "system": {
                            "id": "helix",
                            "repo": "https://github.com/GlacierEQ/job-app-helix",
                        }
                    }
                ],
            },
        ],
    }


def _run(
    run_id: int,
    *,
    name: str,
    sha: str,
    updated_at: str,
    branch: str = "main",
    status: str = "completed",
    conclusion: str = "success",
    path: str = ".github/workflows/proof.yml",
) -> dict:
    return {
        "id": run_id,
        "name": name,
        "display_title": name,
        "path": path,
        "head_branch": branch,
        "head_sha": sha,
        "updated_at": updated_at,
        "run_started_at": updated_at,
        "status": status,
        "conclusion": conclusion,
        "html_url": f"https://github.com/GlacierEQ/repo/actions/runs/{run_id}",
    }


class FakeGitHub:
    def __init__(self, runs_by_repo: dict[str, list[dict]]) -> None:
        self.runs_by_repo = runs_by_repo
        self.calls: list[str] = []

    def __call__(self, url: str) -> dict:
        self.calls.append(url)
        marker = "https://api.github.com/repos/GlacierEQ/"
        if not url.startswith(marker):
            raise AssertionError(url)
        tail = url.removeprefix(marker)
        repo = tail.split("/", 1)[0]
        if "/actions/runs" not in url:
            return {"default_branch": "main"}
        return {"workflow_runs": self.runs_by_repo[repo]}


class EvidenceManifestTests(unittest.TestCase):
    def test_derives_latest_successful_verification_per_system(self) -> None:
        fetch = FakeGitHub(
            {
                "job-app-helix": [
                    _run(
                        7,
                        name="Helix Candidate Profile Proof",
                        sha="b" * 40,
                        updated_at="2026-08-19T10:00:00Z",
                    ),
                    _run(
                        8,
                        name="Helix Candidate Profile Proof",
                        sha="c" * 40,
                        updated_at="2026-08-20T10:00:00Z",
                        branch="apex/proof-head",
                    ),
                ],
                "job-application": [
                    _run(
                        9,
                        name="APEX Estate Non-Regression",
                        sha="d" * 40,
                        updated_at="2026-08-20T11:00:00Z",
                    )
                ],
            }
        )
        result = build_evidence_manifest(_topology(), fetch)
        self.assertEqual(result["schema"], "glaciereq.evidence-manifest.v1")
        self.assertEqual(result["missing_systems"], [])
        entries = {entry["id"]: entry for entry in result["entries"]}
        self.assertEqual(entries["helix"]["commit_sha"], "c" * 40)
        self.assertEqual(entries["helix"]["verification_run_id"], 8)
        self.assertEqual(entries["helix"]["verification_branch"], "apex/proof-head")
        self.assertEqual(entries["job-application"]["commit_sha"], "d" * 40)
        self.assertEqual(len(fetch.calls), 4)

    def test_ignores_failed_and_non_verification_runs_but_accepts_pr_proof(
        self,
    ) -> None:
        fetch = FakeGitHub(
            {
                "job-app-helix": [
                    _run(
                        1,
                        name="Deploy Website",
                        sha="a" * 40,
                        updated_at="2026-08-20T14:00:00Z",
                        path=".github/workflows/deploy.yml",
                    ),
                    _run(
                        2,
                        name="Helix Proof",
                        sha="b" * 40,
                        updated_at="2026-08-20T13:00:00Z",
                        branch="feature",
                    ),
                    _run(
                        3,
                        name="Helix Proof",
                        sha="c" * 40,
                        updated_at="2026-08-20T15:00:00Z",
                        conclusion="failure",
                    ),
                    _run(
                        4,
                        name="Helix Verification",
                        sha="d" * 40,
                        updated_at="2026-08-20T11:00:00Z",
                    ),
                ],
                "job-application": [
                    _run(
                        5,
                        name="Strict CI",
                        sha="e" * 40,
                        updated_at="2026-08-20T11:30:00Z",
                    )
                ],
            }
        )
        result = build_evidence_manifest(_topology(), fetch)
        entries = {entry["id"]: entry for entry in result["entries"]}
        self.assertEqual(entries["helix"]["verification_run_id"], 2)
        self.assertEqual(entries["helix"]["verification_branch"], "feature")

    def test_rejects_missing_verification_by_default(self) -> None:
        fetch = FakeGitHub(
            {
                "job-app-helix": [],
                "job-application": [
                    _run(
                        5,
                        name="Strict CI",
                        sha="e" * 40,
                        updated_at="2026-08-20T11:30:00Z",
                    )
                ],
            }
        )
        with self.assertRaisesRegex(
            EvidenceManifestError, "helix@GlacierEQ/job-app-helix"
        ):
            build_evidence_manifest(_topology(), fetch)

    def test_allow_missing_preserves_unverified_system_for_fail_closed_ranking(
        self,
    ) -> None:
        fetch = FakeGitHub(
            {
                "job-app-helix": [],
                "job-application": [
                    _run(
                        5,
                        name="Strict CI",
                        sha="e" * 40,
                        updated_at="2026-08-20T11:30:00Z",
                    )
                ],
            }
        )
        result = build_evidence_manifest(_topology(), fetch, allow_missing=True)
        self.assertEqual(
            result["missing_systems"],
            [{"id": "helix", "repository": "GlacierEQ/job-app-helix"}],
        )
        self.assertEqual(
            [entry["id"] for entry in result["entries"]], ["job-application"]
        )

    def test_rejects_repo_outside_glaciereq(self) -> None:
        topology = _topology()
        topology["flows"][0]["steps"][0]["system"]["repo"] = (
            "https://github.com/OtherOrg/job-app-helix"
        )
        with self.assertRaisesRegex(EvidenceManifestError, "exact GlacierEQ"):
            build_evidence_manifest(topology, FakeGitHub({}))

    def test_rejects_conflicting_repository_identity_for_same_system(self) -> None:
        topology = _topology()
        topology["flows"][1]["steps"][0]["system"]["repo"] = (
            "https://github.com/GlacierEQ/helix-other"
        )
        with self.assertRaisesRegex(EvidenceManifestError, "conflicting repositories"):
            build_evidence_manifest(topology, FakeGitHub({}))

    def test_rejects_invalid_workflow_pattern(self) -> None:
        with self.assertRaisesRegex(EvidenceManifestError, "invalid workflow pattern"):
            build_evidence_manifest(_topology(), FakeGitHub({}), workflow_pattern="[")


if __name__ == "__main__":
    unittest.main()

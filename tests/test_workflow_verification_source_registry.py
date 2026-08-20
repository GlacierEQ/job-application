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


def _registry() -> dict:
    return {
        "schema": "glaciereq.verification-source-registry.v1",
        "repositories": {
            "GlacierEQ/job-app-helix": {
                "workflow_names": ["Helix Candidate Profile Proof"]
            },
            "GlacierEQ/job-application": {"workflow_names": ["CI"]},
        },
    }


class VerificationSourceRegistryTests(unittest.TestCase):
    def test_registry_rejects_newer_unapproved_heuristic_match(self) -> None:
        fetch = FakeGitHub(
            {
                "job-app-helix": [
                    _run(
                        10,
                        name="Experimental Proof",
                        sha="e" * 40,
                        updated_at="2026-08-20T15:00:00Z",
                    ),
                    _run(
                        9,
                        name="Helix Candidate Profile Proof",
                        sha="b" * 40,
                        updated_at="2026-08-20T14:00:00Z",
                    ),
                ],
                "job-application": [
                    _run(
                        8,
                        name="CI",
                        sha="d" * 40,
                        updated_at="2026-08-20T13:00:00Z",
                    )
                ],
            }
        )
        result = build_evidence_manifest(
            _topology(), fetch, verification_sources=_registry()
        )
        entries = {entry["id"]: entry for entry in result["entries"]}
        self.assertEqual(entries["helix"]["verification_run_id"], 9)
        self.assertTrue(result["verification_source_registry"])
        self.assertIsNone(result["workflow_pattern"])

    def test_unregistered_repository_fails_closed(self) -> None:
        registry = _registry()
        del registry["repositories"]["GlacierEQ/job-app-helix"]
        fetch = FakeGitHub(
            {
                "job-app-helix": [
                    _run(
                        9,
                        name="Helix Candidate Profile Proof",
                        sha="b" * 40,
                        updated_at="2026-08-20T14:00:00Z",
                    )
                ],
                "job-application": [
                    _run(
                        8,
                        name="CI",
                        sha="d" * 40,
                        updated_at="2026-08-20T13:00:00Z",
                    )
                ],
            }
        )
        with self.assertRaisesRegex(
            EvidenceManifestError, "helix@GlacierEQ/job-app-helix"
        ):
            build_evidence_manifest(
                _topology(), fetch, verification_sources=registry
            )

    def test_allow_missing_records_unregistered_repository(self) -> None:
        registry = _registry()
        del registry["repositories"]["GlacierEQ/job-app-helix"]
        fetch = FakeGitHub(
            {
                "job-app-helix": [],
                "job-application": [
                    _run(
                        8,
                        name="CI",
                        sha="d" * 40,
                        updated_at="2026-08-20T13:00:00Z",
                    )
                ],
            }
        )
        result = build_evidence_manifest(
            _topology(),
            fetch,
            verification_sources=registry,
            allow_missing=True,
        )
        self.assertEqual(
            result["missing_systems"][0]["reason"],
            "verification_source_not_registered",
        )

    def test_registry_rejects_bad_schema(self) -> None:
        with self.assertRaisesRegex(
            EvidenceManifestError, "unsupported verification source registry"
        ):
            build_evidence_manifest(
                _topology(),
                FakeGitHub({}),
                verification_sources={"schema": "bad", "repositories": {}},
            )

    def test_legacy_pattern_path_preserved(self) -> None:
        fetch = FakeGitHub(
            {
                "job-app-helix": [
                    _run(
                        9,
                        name="Helix Proof",
                        sha="b" * 40,
                        updated_at="2026-08-20T14:00:00Z",
                    )
                ],
                "job-application": [
                    _run(
                        8,
                        name="CI",
                        sha="d" * 40,
                        updated_at="2026-08-20T13:00:00Z",
                    )
                ],
            }
        )
        result = build_evidence_manifest(_topology(), fetch)
        self.assertFalse(result["verification_source_registry"])
        self.assertIsNotNone(result["workflow_pattern"])


if __name__ == "__main__":
    unittest.main()

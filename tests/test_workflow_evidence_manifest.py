from __future__ import annotations

import io
import json
import sys
import tempfile
import unittest
import urllib.error
from contextlib import redirect_stdout
from pathlib import Path
from unittest import mock

from tools.workflow_evidence_manifest import (
    EvidenceManifestError,
    _atomic_write_json,
    _github_fetcher,
    build_evidence_manifest,
    main,
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
            [
                {
                    "id": "helix",
                    "repository": "GlacierEQ/job-app-helix",
                    "reason": "no_qualifying_successful_verification_run",
                }
            ],
        )
        self.assertEqual(
            [entry["id"] for entry in result["entries"]], ["job-application"]
        )

    def test_allow_missing_isolates_unavailable_repository(self) -> None:
        fallback = FakeGitHub(
            {
                "job-application": [
                    _run(
                        12,
                        name="Strict CI",
                        sha="f" * 40,
                        updated_at="2026-08-20T12:00:00Z",
                    )
                ]
            }
        )

        def fetch(url: str) -> dict:
            if "/job-app-helix" in url:
                raise EvidenceManifestError("GitHub request failed: HTTP Error 404")
            return fallback(url)

        result = build_evidence_manifest(_topology(), fetch, allow_missing=True)
        self.assertEqual(
            [entry["id"] for entry in result["entries"]], ["job-application"]
        )
        self.assertEqual(result["missing_systems"][0]["id"], "helix")
        self.assertIn(
            "repository_verification_unavailable",
            result["missing_systems"][0]["reason"],
        )

    def test_unavailable_repository_fails_closed_without_allow_missing(self) -> None:
        def fetch(url: str) -> dict:
            raise EvidenceManifestError(f"GitHub request failed for {url}: HTTP 404")

        with self.assertRaisesRegex(EvidenceManifestError, "HTTP 404"):
            build_evidence_manifest(_topology(), fetch)

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

    def test_rejects_missing_system_id(self) -> None:
        topology = _topology()
        del topology["flows"][0]["steps"][0]["system"]["id"]
        with self.assertRaisesRegex(
            EvidenceManifestError, "required non-empty string missing: system.id"
        ):
            build_evidence_manifest(topology, FakeGitHub({}))

    def test_rejects_unsupported_topology_schema(self) -> None:
        topology = _topology()
        topology["schema"] = "something-else"
        with self.assertRaisesRegex(
            EvidenceManifestError, "unsupported topology schema"
        ):
            build_evidence_manifest(topology, FakeGitHub({}))

    def test_rejects_empty_flows(self) -> None:
        topology = _topology()
        topology["flows"] = []
        with self.assertRaisesRegex(
            EvidenceManifestError, "topology.flows must be a non-empty list"
        ):
            build_evidence_manifest(topology, FakeGitHub({}))

    def test_rejects_non_object_flow(self) -> None:
        topology = _topology()
        topology["flows"] = ["not-an-object"]
        with self.assertRaisesRegex(
            EvidenceManifestError, "topology flow must be an object"
        ):
            build_evidence_manifest(topology, FakeGitHub({}))

    def test_rejects_step_without_system(self) -> None:
        topology = _topology()
        topology["flows"][0]["steps"][0] = {"not-system": True}
        with self.assertRaisesRegex(
            EvidenceManifestError, "topology step requires system object"
        ):
            build_evidence_manifest(topology, FakeGitHub({}))

    def test_rejects_topology_without_systems(self) -> None:
        topology = _topology()
        topology["flows"] = [{"id": "empty", "steps": []}]
        with self.assertRaisesRegex(
            EvidenceManifestError, "topology contains no systems"
        ):
            build_evidence_manifest(topology, FakeGitHub({}))

    def test_ignores_non_object_and_malformed_runs(self) -> None:
        fetch = FakeGitHub(
            {
                "job-app-helix": [
                    "not-a-run",
                    _run(
                        1,
                        name="Helix Proof",
                        sha="zz",
                        updated_at="2026-08-20T10:00:00Z",
                    ),
                    _run(
                        2,
                        name="Helix Proof",
                        sha="b" * 40,
                        updated_at="2026-08-20T10:00:00",
                    ),
                    _run(
                        3,
                        name="Helix Proof",
                        sha="c" * 40,
                        updated_at="2026-08-20T11:00:00Z",
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
        entries = {entry["id"]: entry for entry in result["entries"]}
        self.assertEqual(entries["helix"]["verification_run_id"], 3)
        self.assertEqual(entries["helix"]["commit_sha"], "c" * 40)

    def test_rejects_non_list_workflow_runs(self) -> None:
        def fetch(url: str) -> dict:
            if "/actions/runs" in url:
                return {"workflow_runs": "not-a-list"}
            return {"default_branch": "main"}

        with self.assertRaisesRegex(
            EvidenceManifestError, "lacks workflow_runs"
        ):
            build_evidence_manifest(_topology(), fetch)

    def test_allow_missing_with_no_entries_raises(self) -> None:
        fetch = FakeGitHub({"job-app-helix": [], "job-application": []})
        with self.assertRaisesRegex(
            EvidenceManifestError, "no qualifying successful verification runs found"
        ):
            build_evidence_manifest(_topology(), fetch, allow_missing=True)


class GitHubFetcherTests(unittest.TestCase):
    def test_fetches_json_with_and_without_token(self) -> None:
        payload = {"default_branch": "main"}
        seen: list[object] = []

        def fake_urlopen(request, timeout=15):
            seen.append(request)
            response = mock.MagicMock()
            response.__enter__.return_value = io.BytesIO(
                json.dumps(payload).encode("utf-8")
            )
            return response

        with mock.patch("urllib.request.urlopen", side_effect=fake_urlopen):
            fetch = _github_fetcher("token-123")
            self.assertEqual(
                fetch("https://api.github.com/repos/GlacierEQ/x"), payload
            )
            fetch_no_token = _github_fetcher(None)
            self.assertEqual(
                fetch_no_token("https://api.github.com/repos/GlacierEQ/x"), payload
            )
        self.assertEqual(
            seen[0].get_header("Authorization"), "Bearer token-123"
        )
        self.assertIsNone(seen[1].get_header("Authorization"))

    def test_fetch_failure_raises_manifest_error(self) -> None:
        with mock.patch(
            "urllib.request.urlopen",
            side_effect=urllib.error.URLError("boom"),
        ):
            with self.assertRaisesRegex(
                EvidenceManifestError, "GitHub request failed"
            ):
                _github_fetcher(None)("https://api.github.com/repos/GlacierEQ/x")

    def test_fetch_non_object_payload_raises(self) -> None:
        response = mock.MagicMock()
        response.__enter__.return_value = io.BytesIO(b"[1, 2]")
        with mock.patch("urllib.request.urlopen", return_value=response):
            with self.assertRaisesRegex(
                EvidenceManifestError, "must be an object"
            ):
                _github_fetcher(None)("https://api.github.com/repos/GlacierEQ/x")

    def test_fetch_bad_json_raises(self) -> None:
        response = mock.MagicMock()
        response.__enter__.return_value = io.BytesIO(b"not json")
        with mock.patch("urllib.request.urlopen", return_value=response):
            with self.assertRaisesRegex(
                EvidenceManifestError, "GitHub request failed"
            ):
                _github_fetcher(None)("https://api.github.com/repos/GlacierEQ/x")

    def test_atomic_write_json_round_trips(self) -> None:
        payload = {"b": 1, "a": [1, 2, 3]}
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp) / "nested" / "out.json"
            _atomic_write_json(path, payload)
            self.assertEqual(json.loads(path.read_text(encoding="utf-8")), payload)


class EvidenceManifestMainTests(unittest.TestCase):
    def test_main_derives_and_writes_manifest(self) -> None:
        fetch = FakeGitHub(
            {
                "job-app-helix": [
                    _run(
                        8,
                        name="Helix Candidate Profile Proof",
                        sha="c" * 40,
                        updated_at="2026-08-20T10:00:00Z",
                    )
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
        with tempfile.TemporaryDirectory() as tmp:
            topology_path = Path(tmp) / "topology.json"
            output_path = Path(tmp) / "manifest.json"
            topology_path.write_text(json.dumps(_topology()), encoding="utf-8")
            argv = [
                "workflow_evidence_manifest",
                "--topology",
                str(topology_path),
                "--output",
                str(output_path),
            ]
            with (
                mock.patch.object(sys, "argv", argv),
                mock.patch(
                    "tools.workflow_evidence_manifest._github_fetcher",
                    return_value=fetch,
                ),
                redirect_stdout(io.StringIO()),
            ):
                self.assertEqual(main(), 0)
            result = json.loads(output_path.read_text(encoding="utf-8"))
            self.assertEqual(result["schema"], "glaciereq.evidence-manifest.v1")
            self.assertEqual(len(result["entries"]), 2)

    def test_main_rejects_invalid_topology(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            topology_path = Path(tmp) / "topology.json"
            topology_path.write_text("{not json", encoding="utf-8")
            output_path = Path(tmp) / "manifest.json"
            argv = [
                "workflow_evidence_manifest",
                "--topology",
                str(topology_path),
                "--output",
                str(output_path),
            ]
            with mock.patch.object(sys, "argv", argv):
                with self.assertRaises(SystemExit) as caught:
                    with redirect_stdout(io.StringIO()):
                        main()
                self.assertEqual(caught.exception.code, 2)

    def test_main_rejects_non_object_topology(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            topology_path = Path(tmp) / "topology.json"
            topology_path.write_text("[1, 2]", encoding="utf-8")
            output_path = Path(tmp) / "manifest.json"
            argv = [
                "workflow_evidence_manifest",
                "--topology",
                str(topology_path),
                "--output",
                str(output_path),
            ]
            with mock.patch.object(sys, "argv", argv):
                with self.assertRaises(SystemExit) as caught:
                    with redirect_stdout(io.StringIO()):
                        main()
                self.assertEqual(caught.exception.code, 2)


if __name__ == "__main__":
    unittest.main()

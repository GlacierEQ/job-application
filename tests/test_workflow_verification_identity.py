from __future__ import annotations

import unittest

from tools.workflow_verification_identity import (
    VerificationIdentityError,
    build_verification_identity_proof,
)


def _registry(policy: str = "default_or_pull_request") -> dict:
    return {
        "schema": "glaciereq.verification-source-registry.v1",
        "repositories": {
            "GlacierEQ/job-app-helix": {
                "workflow_names": ["CI", "Helix Candidate Profile Proof"],
                "workflow_paths": [
                    ".github/workflows/ci.yml",
                    ".github/workflows/candidate-profile-compiler-proof.yml",
                ],
                "branch_policy": policy,
            }
        },
    }


def _manifest() -> dict:
    return {
        "schema": "glaciereq.evidence-manifest.v1",
        "topology_receipt_sha256": "a" * 64,
        "entries": [
            {
                "id": "helix",
                "repository": "GlacierEQ/job-app-helix",
                "commit_sha": "b" * 40,
                "verified_at": "2026-08-20T12:00:00Z",
                "verification_run_id": 42,
                "verification_workflow": "Helix Candidate Profile Proof",
                "verification_url": "https://github.com/GlacierEQ/job-app-helix/actions/runs/42",
                "verification_branch": "main",
            }
        ],
    }


def _run(
    *,
    path: str = ".github/workflows/candidate-profile-compiler-proof.yml",
    branch: str = "main",
    event: str = "push",
    sha: str = "b" * 40,
    name: str = "Helix Candidate Profile Proof",
) -> dict:
    return {
        "id": 42,
        "name": name,
        "path": path,
        "head_branch": branch,
        "event": event,
        "head_sha": sha,
        "updated_at": "2026-08-20T12:00:00Z",
        "status": "completed",
        "conclusion": "success",
        "html_url": "https://github.com/GlacierEQ/job-app-helix/actions/runs/42",
    }


class FakeGitHub:
    def __init__(self, run: dict, default_branch: str = "main") -> None:
        self.run = run
        self.default_branch = default_branch
        self.calls: list[str] = []

    def __call__(self, url: str) -> dict:
        self.calls.append(url)
        if url == "https://api.github.com/repos/GlacierEQ/job-app-helix":
            return {"default_branch": self.default_branch}
        if url == "https://api.github.com/repos/GlacierEQ/job-app-helix/actions/runs/42":
            return self.run
        raise AssertionError(url)


class VerificationIdentityTests(unittest.TestCase):
    def test_exact_path_identity_passes_and_is_deterministic(self) -> None:
        fetch = FakeGitHub(_run())
        first = build_verification_identity_proof(_manifest(), _registry(), fetch)
        second = build_verification_identity_proof(
            _manifest(), _registry(), FakeGitHub(_run())
        )
        self.assertEqual(first, second)
        self.assertEqual(first["schema"], "glaciereq.verification-identity-proof.v1")
        self.assertEqual(first["exact_path_bound_entries"], 1)
        self.assertEqual(
            first["verified_entries"][0]["workflow_path"],
            ".github/workflows/candidate-profile-compiler-proof.yml",
        )
        self.assertEqual(len(first["receipt_sha256"]), 64)

    def test_same_display_name_wrong_workflow_path_is_rejected(self) -> None:
        fetch = FakeGitHub(_run(path=".github/workflows/experimental-proof.yml"))
        with self.assertRaisesRegex(VerificationIdentityError, "workflow path is not registered"):
            build_verification_identity_proof(_manifest(), _registry(), fetch)

    def test_pull_request_feature_branch_is_allowed_by_policy(self) -> None:
        run = _run(branch="feature/proof", event="pull_request")
        proof = build_verification_identity_proof(
            _manifest(), _registry(), FakeGitHub(run)
        )
        self.assertEqual(proof["verified_entries"][0]["verification_event"], "pull_request")
        self.assertEqual(proof["verified_entries"][0]["verification_branch"], "feature/proof")

    def test_feature_branch_push_is_rejected(self) -> None:
        run = _run(branch="feature/proof", event="push")
        with self.assertRaisesRegex(VerificationIdentityError, "is not default branch"):
            build_verification_identity_proof(
                _manifest(), _registry(), FakeGitHub(run)
            )

    def test_default_only_rejects_pull_request_branch(self) -> None:
        run = _run(branch="feature/proof", event="pull_request")
        with self.assertRaisesRegex(VerificationIdentityError, "is not default branch"):
            build_verification_identity_proof(
                _manifest(), _registry("default_only"), FakeGitHub(run)
            )

    def test_exact_run_sha_tamper_is_rejected(self) -> None:
        with self.assertRaisesRegex(VerificationIdentityError, "exact run SHA mismatch"):
            build_verification_identity_proof(
                _manifest(), _registry(), FakeGitHub(_run(sha="c" * 40))
            )

    def test_exact_run_timestamp_tamper_is_rejected(self) -> None:
        run = _run()
        run["updated_at"] = "2026-08-20T12:01:00Z"
        with self.assertRaisesRegex(VerificationIdentityError, "timestamp mismatch"):
            build_verification_identity_proof(
                _manifest(), _registry(), FakeGitHub(run)
            )

    def test_manifest_name_must_be_registered(self) -> None:
        manifest = _manifest()
        manifest["entries"][0]["verification_workflow"] = "Experimental Proof"
        with self.assertRaisesRegex(VerificationIdentityError, "manifest workflow is not registered"):
            build_verification_identity_proof(
                manifest, _registry(), FakeGitHub(_run())
            )


if __name__ == "__main__":
    unittest.main()

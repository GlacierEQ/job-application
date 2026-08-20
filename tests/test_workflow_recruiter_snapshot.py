from __future__ import annotations

import hashlib
import json
import unittest
from datetime import UTC, datetime
from typing import Any

from tools.workflow_recruiter_snapshot import (
    RecruiterSnapshotError,
    build_recruiter_snapshot,
)
from tools.workflow_verification_identity import VerificationIdentityError

AS_OF = datetime(2026, 8, 22, 12, 0, tzinfo=UTC)

REPOSITORIES = {
    "helix": "GlacierEQ/job-app-helix",
    "receipt-router": "GlacierEQ/xai-colossus-2",
    "job-application": "GlacierEQ/job-application",
}

WORKFLOWS = {
    "GlacierEQ/job-app-helix": (
        "Helix Candidate Profile Proof",
        ".github/workflows/candidate-profile-compiler-proof.yml",
    ),
    "GlacierEQ/xai-colossus-2": ("CI", ".github/workflows/ci.yml"),
    "GlacierEQ/job-application": (
        "APEX Recruiter Proof Brief",
        ".github/workflows/apex-recruiter-proof-brief.yml",
    ),
}


def _receipt(value: Any) -> str:
    stable = json.dumps(
        value,
        sort_keys=True,
        separators=(",", ":"),
        ensure_ascii=False,
        allow_nan=False,
    )
    return hashlib.sha256(stable.encode("utf-8")).hexdigest()


def _topology() -> dict[str, Any]:
    steps = []
    for ordinal, system_id in enumerate(
        ("helix", "receipt-router", "job-application"), start=1
    ):
        repository = REPOSITORIES[system_id]
        steps.append(
            {
                "ordinal": ordinal,
                "transition": f"{system_id} contributes verified proof",
                "system": {
                    "id": system_id,
                    "name": system_id,
                    "repo": f"https://github.com/{repository}",
                    "state": "PROMOTED",
                    "summary": f"{system_id} summary",
                    "evidence": f"{system_id} evidence",
                    "limit": f"{system_id} ceiling",
                    "level": "L4",
                },
            }
        )
    topology = {
        "schema": "glaciereq.workflow-topology.v1",
        "flows": [
            {
                "id": "opportunity-to-evidence-package",
                "name": "Opportunity to evidence package",
                "intent": "Turn a target role into inspectable proof.",
                "steps": steps,
            }
        ],
    }
    topology["receipt_sha256"] = _receipt(topology)
    return topology


def _registry() -> dict[str, Any]:
    return {
        "schema": "glaciereq.verification-source-registry.v1",
        "repositories": {
            repository: {
                "workflow_names": [name],
                "workflow_paths": [path],
                "branch_policy": "default_or_pull_request",
            }
            for repository, (name, path) in WORKFLOWS.items()
        },
    }


def _runs() -> dict[str, dict[str, Any]]:
    result = {}
    for index, (repository, (name, path)) in enumerate(WORKFLOWS.items(), start=1):
        run_id = 100 + index
        result[repository] = {
            "id": run_id,
            "name": name,
            "path": path,
            "head_sha": f"{index}" * 40,
            "head_branch": "main",
            "event": "push",
            "status": "completed",
            "conclusion": "success",
            "updated_at": f"2026-08-{18 + index:02d}T10:00:00Z",
            "html_url": f"https://github.com/{repository}/actions/runs/{run_id}",
        }
    return result


def _fetcher(
    *,
    tamper_path_repository: str | None = None,
    missing_repository: str | None = None,
):
    runs = _runs()

    def fetch(url: str) -> dict[str, Any]:
        prefix = "https://api.github.com/repos/"
        if not url.startswith(prefix):
            raise AssertionError(f"unexpected URL: {url}")
        rest = url[len(prefix) :]
        repository = next(
            (candidate for candidate in WORKFLOWS if rest.startswith(candidate)), None
        )
        if repository is None:
            raise AssertionError(f"unknown repository URL: {url}")
        suffix = rest[len(repository) :]
        if suffix == "":
            return {"default_branch": "main"}
        if suffix == "/actions/runs?status=success&per_page=100":
            if repository == missing_repository:
                return {"workflow_runs": []}
            return {"workflow_runs": [dict(runs[repository])]}
        expected_id = runs[repository]["id"]
        if suffix == f"/actions/runs/{expected_id}":
            exact = dict(runs[repository])
            if repository == tamper_path_repository:
                exact["path"] = ".github/workflows/unregistered-spoof.yml"
            return exact
        raise AssertionError(f"unexpected repository endpoint: {url}")

    return fetch


class RecruiterSnapshotTests(unittest.TestCase):
    def test_composes_identity_freshness_and_all_role_briefs_deterministically(
        self,
    ) -> None:
        first = build_recruiter_snapshot(
            _topology(),
            _registry(),
            _fetcher(),
            as_of=AS_OF,
            top_k=1,
        )
        second = build_recruiter_snapshot(
            _topology(),
            _registry(),
            _fetcher(),
            as_of=AS_OF,
            top_k=1,
        )

        self.assertEqual(first, second)
        self.assertEqual(first["schema"], "glaciereq.recruiter-proof-snapshot.v1")
        self.assertEqual(len(first["receipt_sha256"]), 64)
        self.assertTrue(first["policy"]["topology_receipt_verified_before_evidence_fetch"])
        self.assertEqual(first["coverage"]["manifest_entries"], 3)
        self.assertEqual(first["coverage"]["identity_verified_entries"], 3)
        self.assertEqual(first["coverage"]["exact_path_bound_entries"], 3)
        self.assertEqual(first["coverage"]["missing_systems"], 0)
        self.assertEqual(
            set(first["recruiter_briefs"]),
            {"recruiter", "engineering-lead", "systems-architect"},
        )
        for role, brief in first["recruiter_briefs"].items():
            self.assertEqual(brief["role"], role)
            self.assertEqual(
                brief["freshness_receipt_sha256"],
                first["receipts"]["freshness_sha256"],
            )
            self.assertEqual(len(brief["briefs"]), 1)

    def test_exact_identity_failure_blocks_snapshot_before_freshness_output(self) -> None:
        with self.assertRaisesRegex(
            VerificationIdentityError,
            "workflow path is not registered",
        ):
            build_recruiter_snapshot(
                _topology(),
                _registry(),
                _fetcher(tamper_path_repository="GlacierEQ/job-app-helix"),
                as_of=AS_OF,
            )

    def test_missing_registered_proof_remains_explicit_and_receives_no_snapshot_credit(
        self,
    ) -> None:
        snapshot = build_recruiter_snapshot(
            _topology(),
            _registry(),
            _fetcher(missing_repository="GlacierEQ/xai-colossus-2"),
            as_of=AS_OF,
            roles=["recruiter"],
            allow_missing=True,
        )

        self.assertEqual(snapshot["coverage"]["manifest_entries"], 2)
        self.assertEqual(snapshot["coverage"]["missing_systems"], 1)
        missing = snapshot["evidence_manifest"]["missing_systems"][0]
        self.assertEqual(missing["id"], "receipt-router")
        proof_point = snapshot["recruiter_briefs"]["recruiter"]["briefs"][0][
            "proof_points"
        ][1]
        self.assertEqual(proof_point["system_id"], "receipt-router")
        self.assertEqual(proof_point["freshness_weight"], 0.0)
        self.assertEqual(proof_point["weighted_contribution"], 0.0)

    def test_require_complete_rejects_missing_registered_proof(self) -> None:
        with self.assertRaises(RuntimeError):
            build_recruiter_snapshot(
                _topology(),
                _registry(),
                _fetcher(missing_repository="GlacierEQ/xai-colossus-2"),
                as_of=AS_OF,
                allow_missing=False,
            )

    def test_role_selection_is_deduplicated_and_invalid_roles_fail_closed(self) -> None:
        snapshot = build_recruiter_snapshot(
            _topology(),
            _registry(),
            _fetcher(),
            as_of=AS_OF,
            roles=["recruiter", "recruiter", "systems-architect"],
        )
        self.assertEqual(
            snapshot["coverage"]["roles"],
            ["recruiter", "systems-architect"],
        )
        with self.assertRaisesRegex(RecruiterSnapshotError, "unsupported role"):
            build_recruiter_snapshot(
                _topology(),
                _registry(),
                _fetcher(),
                as_of=AS_OF,
                roles=["chief-wizard"],
            )

    def test_explicit_empty_role_selection_fails_closed(self) -> None:
        with self.assertRaisesRegex(RecruiterSnapshotError, "at least one recruiter role"):
            build_recruiter_snapshot(
                _topology(),
                _registry(),
                _fetcher(),
                as_of=AS_OF,
                roles=[],
            )

    def test_tampered_topology_receipt_fails_before_evidence_fetch(self) -> None:
        topology = _topology()
        topology["flows"][0]["intent"] = "tampered after receipt"

        called = False

        def fail_if_called(_: str) -> dict[str, Any]:
            nonlocal called
            called = True
            raise AssertionError("evidence fetch must not run for tampered topology")

        with self.assertRaisesRegex(RecruiterSnapshotError, "does not match topology"):
            build_recruiter_snapshot(
                topology,
                _registry(),
                fail_if_called,
                as_of=AS_OF,
            )
        self.assertFalse(called)

    def test_naive_as_of_and_boolean_top_k_fail_closed(self) -> None:
        with self.assertRaisesRegex(RecruiterSnapshotError, "timezone-aware"):
            build_recruiter_snapshot(
                _topology(),
                _registry(),
                _fetcher(),
                as_of=datetime(2026, 8, 20, 12, 0, tzinfo=None),
            )
        with self.assertRaisesRegex(RecruiterSnapshotError, "top_k"):
            build_recruiter_snapshot(
                _topology(),
                _registry(),
                _fetcher(),
                as_of=AS_OF,
                top_k=True,
            )


if __name__ == "__main__":
    unittest.main()

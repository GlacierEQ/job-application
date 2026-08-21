from __future__ import annotations

import hashlib
import json
import unittest

from tools.workflow_recruiter_brief import build_recruiter_brief
from tools.workflow_role_lens import RoleLensError


def _system(system_id: str) -> dict:
    return {
        "id": system_id,
        "evidence": f"verified evidence for {system_id}",
        "repo": f"https://github.com/GlacierEQ/{system_id}",
        "limit": f"current ceiling for {system_id}",
    }


def _topology() -> dict:
    return {
        "schema": "glaciereq.workflow-topology.v1",
        "receipt_sha256": "topology-source-receipt",
        "flows": [
            {
                "id": "application",
                "name": "Application proof path",
                "intent": "compile evidence for recruiter review",
                "steps": [
                    {"transition": "rank evidence", "system": _system("helix")},
                    {
                        "transition": "bind receipts",
                        "system": _system("receipt-router"),
                    },
                    {
                        "transition": "compile application",
                        "system": _system("job-application"),
                    },
                ],
            },
            {
                "id": "architecture",
                "name": "Architecture proof path",
                "intent": "show production architecture depth",
                "steps": [
                    {
                        "transition": "define boundaries",
                        "system": _system("tower-of-babel"),
                    },
                    {
                        "transition": "run runtime",
                        "system": _system("pro-code-runtime"),
                    },
                    {"transition": "compose", "system": _system("helix")},
                ],
            },
            {
                "id": "operations",
                "name": "Operations proof path",
                "intent": "show orchestration capability",
                "steps": [
                    {"transition": "bind authority", "system": _system("akos")},
                    {"transition": "execute", "system": _system("sigma-glue")},
                    {"transition": "verify", "system": _system("doctor-strange")},
                ],
            },
        ],
    }


def _freshness() -> dict:
    core = {
        "schema": "glaciereq.evidence-freshness.v1",
        "as_of": "2026-08-20T00:00:00Z",
        "policy": "test fixture",
        "entries": [
            {
                "id": "helix",
                "freshness_weight": 1.0,
                "state": "fresh",
                "age_days": 2,
            },
            {
                "id": "receipt-router",
                "freshness_weight": 0.2,
                "state": "stale",
                "age_days": 500,
            },
            {
                "id": "job-application",
                "freshness_weight": 0.2,
                "state": "stale",
                "age_days": 500,
            },
            {
                "id": "pro-code-runtime",
                "freshness_weight": 1.0,
                "state": "fresh",
                "age_days": 3,
            },
            {
                "id": "tower-of-babel",
                "freshness_weight": 1.0,
                "state": "fresh",
                "age_days": 3,
            },
            {
                "id": "akos",
                "freshness_weight": 0.85,
                "state": "aging",
                "age_days": 60,
            },
            {
                "id": "sigma-glue",
                "freshness_weight": 0.65,
                "state": "aging",
                "age_days": 120,
            },
            {
                "id": "doctor-strange",
                "freshness_weight": 1.0,
                "state": "fresh",
                "age_days": 5,
            },
        ],
    }
    stable = json.dumps(core, sort_keys=True, separators=(",", ":"), ensure_ascii=False)
    return {
        **core,
        "receipt_sha256": hashlib.sha256(stable.encode("utf-8")).hexdigest(),
    }


class WorkflowRecruiterBriefTests(unittest.TestCase):
    def test_recruiter_brief_selects_highest_value_application_path(self) -> None:
        result = build_recruiter_brief(_topology(), "recruiter", 1)
        self.assertEqual(result["briefs"][0]["flow_id"], "application")
        self.assertEqual(len(result["briefs"][0]["proof_points"]), 3)
        self.assertEqual(len(result["briefs"][0]["current_ceilings"]), 3)

    def test_freshness_can_change_selected_recruiter_brief(self) -> None:
        freshness = _freshness()
        result = build_recruiter_brief(_topology(), "recruiter", 1, freshness)
        self.assertEqual(result["briefs"][0]["flow_id"], "architecture")
        self.assertEqual(
            result["freshness_receipt_sha256"], freshness["receipt_sha256"]
        )
        helix = next(
            point
            for point in result["briefs"][0]["proof_points"]
            if point["system_id"] == "helix"
        )
        self.assertEqual(helix["freshness_state"], "fresh")
        self.assertEqual(helix["freshness_weight"], 1.0)

    def test_zero_role_weight_proof_keeps_freshness_in_brief(self) -> None:
        result = build_recruiter_brief(_topology(), "recruiter", 3, _freshness())
        operations = next(
            brief for brief in result["briefs"] if brief["flow_id"] == "operations"
        )
        akos = next(
            point
            for point in operations["proof_points"]
            if point["system_id"] == "akos"
        )
        self.assertEqual(akos["role_weight"], 0)
        self.assertEqual(akos["freshness_weight"], 0.85)
        self.assertEqual(akos["freshness_state"], "aging")

    def test_architect_brief_reuses_same_evidence_graph_with_different_ranking(
        self,
    ) -> None:
        result = build_recruiter_brief(_topology(), "systems-architect", 1)
        self.assertEqual(result["briefs"][0]["flow_id"], "operations")

    def test_receipt_is_deterministic(self) -> None:
        freshness = _freshness()
        first = build_recruiter_brief(_topology(), "engineering-lead", 2, freshness)
        second = build_recruiter_brief(_topology(), "engineering-lead", 2, freshness)
        self.assertEqual(first, second)
        self.assertRegex(first["receipt_sha256"], r"^[a-f0-9]{64}$")

    def test_rejects_invalid_top_k(self) -> None:
        with self.assertRaises(RoleLensError):
            build_recruiter_brief(_topology(), "recruiter", 0)
        with self.assertRaises(RoleLensError):
            build_recruiter_brief(_topology(), "recruiter", 11)

    def test_rejects_unverified_evidence_gap(self) -> None:
        topology = _topology()
        topology["flows"][0]["steps"][0]["system"]["evidence"] = ""
        with self.assertRaises(RoleLensError):
            build_recruiter_brief(topology, "recruiter", 1)

    def test_rejects_repository_outside_glaciereq_boundary(self) -> None:
        topology = _topology()
        topology["flows"][0]["steps"][0]["system"]["repo"] = "https://example.com/fake"
        with self.assertRaises(RoleLensError):
            build_recruiter_brief(topology, "recruiter", 1)


if __name__ == "__main__":
    unittest.main()

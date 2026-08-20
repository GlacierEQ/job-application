from __future__ import annotations

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
                    {"transition": "bind receipts", "system": _system("receipt-router")},
                    {"transition": "compile application", "system": _system("job-application")},
                ],
            },
            {
                "id": "architecture",
                "name": "Architecture proof path",
                "intent": "show production architecture depth",
                "steps": [
                    {"transition": "define boundaries", "system": _system("tower-of-babel")},
                    {"transition": "run runtime", "system": _system("pro-code-runtime")},
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


class WorkflowRecruiterBriefTests(unittest.TestCase):
    def test_recruiter_brief_selects_highest_value_application_path(self) -> None:
        result = build_recruiter_brief(_topology(), "recruiter", 1)
        self.assertEqual(result["briefs"][0]["flow_id"], "application")
        self.assertEqual(len(result["briefs"][0]["proof_points"]), 3)
        self.assertEqual(len(result["briefs"][0]["current_ceilings"]), 3)

    def test_architect_brief_reuses_same_evidence_graph_with_different_ranking(self) -> None:
        result = build_recruiter_brief(_topology(), "systems-architect", 1)
        self.assertEqual(result["briefs"][0]["flow_id"], "operations")

    def test_receipt_is_deterministic(self) -> None:
        first = build_recruiter_brief(_topology(), "engineering-lead", 2)
        second = build_recruiter_brief(_topology(), "engineering-lead", 2)
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

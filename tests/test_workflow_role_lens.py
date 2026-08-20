from __future__ import annotations

import unittest

from tools.workflow_role_lens import RoleLensError, build_role_lens


def _topology() -> dict:
    return {
        "schema": "glaciereq.workflow-topology.v1",
        "receipt_sha256": "source-receipt",
        "flows": [
            {
                "id": "app",
                "name": "Application",
                "intent": "win role",
                "steps": [
                    {"system": {"id": "helix"}},
                    {"system": {"id": "receipt-router"}},
                    {"system": {"id": "job-application"}},
                ],
            },
            {
                "id": "arch",
                "name": "Architecture",
                "intent": "system design",
                "steps": [
                    {"system": {"id": "tower-of-babel"}},
                    {"system": {"id": "pro-code-runtime"}},
                    {"system": {"id": "helix"}},
                ],
            },
            {
                "id": "ops",
                "name": "Operations",
                "intent": "orchestration",
                "steps": [
                    {"system": {"id": "akos"}},
                    {"system": {"id": "sigma-glue"}},
                    {"system": {"id": "doctor-strange"}},
                ],
            },
        ],
    }


class WorkflowRoleLensTests(unittest.TestCase):
    def test_recruiter_prefers_application(self) -> None:
        result = build_role_lens(_topology(), "recruiter")
        self.assertEqual(result["ranked_flows"][0]["flow_id"], "app")

    def test_engineering_lead_prefers_architecture(self) -> None:
        result = build_role_lens(_topology(), "engineering-lead")
        self.assertEqual(result["ranked_flows"][0]["flow_id"], "arch")

    def test_systems_architect_prefers_operations(self) -> None:
        result = build_role_lens(_topology(), "systems-architect")
        self.assertEqual(result["ranked_flows"][0]["flow_id"], "ops")

    def test_receipt_is_deterministic(self) -> None:
        self.assertEqual(
            build_role_lens(_topology(), "recruiter"),
            build_role_lens(_topology(), "recruiter"),
        )

    def test_rejects_unknown_role(self) -> None:
        with self.assertRaises(RoleLensError):
            build_role_lens(_topology(), "ceo")

    def test_rejects_bad_schema(self) -> None:
        topology = _topology()
        topology["schema"] = "bad"
        with self.assertRaises(RoleLensError):
            build_role_lens(topology, "recruiter")


if __name__ == "__main__":
    unittest.main()

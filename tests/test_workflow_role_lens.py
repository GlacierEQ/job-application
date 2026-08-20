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


def _freshness(weights: dict[str, tuple[float, str]]) -> dict:
    return {
        "schema": "glaciereq.evidence-freshness.v1",
        "receipt_sha256": "freshness-receipt",
        "entries": [
            {
                "id": system_id,
                "freshness_weight": weight,
                "state": state,
                "age_days": 5 if state == "fresh" else 500,
            }
            for system_id, (weight, state) in weights.items()
        ],
    }


class WorkflowRoleLensTests(unittest.TestCase):
    def test_recruiter_prefers_application_without_freshness(self) -> None:
        result = build_role_lens(_topology(), "recruiter")
        self.assertEqual(result["ranked_flows"][0]["flow_id"], "app")

    def test_engineering_lead_prefers_architecture(self) -> None:
        result = build_role_lens(_topology(), "engineering-lead")
        self.assertEqual(result["ranked_flows"][0]["flow_id"], "arch")

    def test_systems_architect_prefers_operations(self) -> None:
        result = build_role_lens(_topology(), "systems-architect")
        self.assertEqual(result["ranked_flows"][0]["flow_id"], "ops")

    def test_stale_application_proof_loses_recruiter_ranking(self) -> None:
        result = build_role_lens(
            _topology(),
            "recruiter",
            _freshness(
                {
                    "job-application": (0.2, "stale"),
                    "receipt-router": (0.2, "stale"),
                    "helix": (1.0, "fresh"),
                    "pro-code-runtime": (1.0, "fresh"),
                    "doctor-strange": (1.0, "fresh"),
                }
            ),
        )
        self.assertEqual(result["ranked_flows"][0]["flow_id"], "arch")
        app = next(flow for flow in result["ranked_flows"] if flow["flow_id"] == "app")
        self.assertLess(app["score"], app["static_role_score"] + app["breadth_bonus"])
        self.assertEqual(result["freshness_receipt_sha256"], "freshness-receipt")

    def test_missing_freshness_fails_closed_for_that_system(self) -> None:
        result = build_role_lens(
            _topology(),
            "recruiter",
            _freshness({"helix": (1.0, "fresh")}),
        )
        app = next(flow for flow in result["ranked_flows"] if flow["flow_id"] == "app")
        job = next(
            item for item in app["matched_systems"] if item["system_id"] == "job-application"
        )
        self.assertEqual(job["freshness_weight"], 0.0)
        self.assertEqual(job["freshness_state"], "unverified")

    def test_receipt_is_deterministic(self) -> None:
        freshness = _freshness({"helix": (1.0, "fresh")})
        self.assertEqual(
            build_role_lens(_topology(), "recruiter", freshness),
            build_role_lens(_topology(), "recruiter", freshness),
        )

    def test_rejects_unknown_role(self) -> None:
        with self.assertRaises(RoleLensError):
            build_role_lens(_topology(), "ceo")

    def test_rejects_bad_schema(self) -> None:
        topology = _topology()
        topology["schema"] = "bad"
        with self.assertRaises(RoleLensError):
            build_role_lens(topology, "recruiter")

    def test_rejects_bad_freshness_schema(self) -> None:
        freshness = _freshness({"helix": (1.0, "fresh")})
        freshness["schema"] = "bad"
        with self.assertRaises(RoleLensError):
            build_role_lens(_topology(), "recruiter", freshness)


if __name__ == "__main__":
    unittest.main()

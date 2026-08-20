from __future__ import annotations

import hashlib
import json
import math
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


def _signed_freshness(entries: list[dict]) -> dict:
    core = {
        "schema": "glaciereq.evidence-freshness.v1",
        "as_of": "2026-08-20T00:00:00Z",
        "policy": "test fixture",
        "entries": entries,
    }
    stable = json.dumps(core, sort_keys=True, separators=(",", ":"), ensure_ascii=False)
    return {
        **core,
        "receipt_sha256": hashlib.sha256(stable.encode("utf-8")).hexdigest(),
    }


def _freshness(weights: dict[str, tuple[float, str]]) -> dict:
    return _signed_freshness(
        [
            {
                "id": system_id,
                "freshness_weight": weight,
                "state": state,
                "age_days": 5 if state == "fresh" else 500,
            }
            for system_id, (weight, state) in weights.items()
        ]
    )


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
        freshness = _freshness(
            {
                "job-application": (0.2, "stale"),
                "receipt-router": (0.2, "stale"),
                "helix": (1.0, "fresh"),
                "pro-code-runtime": (1.0, "fresh"),
                "doctor-strange": (1.0, "fresh"),
            }
        )
        result = build_role_lens(_topology(), "recruiter", freshness)
        self.assertEqual(result["ranked_flows"][0]["flow_id"], "arch")
        app = next(flow for flow in result["ranked_flows"] if flow["flow_id"] == "app")
        self.assertLess(app["score"], app["static_role_score"] + app["breadth_bonus"])
        self.assertEqual(
            result["freshness_receipt_sha256"], freshness["receipt_sha256"]
        )

    def test_missing_freshness_fails_closed_for_that_system(self) -> None:
        result = build_role_lens(
            _topology(),
            "recruiter",
            _freshness({"helix": (1.0, "fresh")}),
        )
        app = next(flow for flow in result["ranked_flows"] if flow["flow_id"] == "app")
        job = next(
            item
            for item in app["matched_systems"]
            if item["system_id"] == "job-application"
        )
        self.assertEqual(job["freshness_weight"], 0.0)
        self.assertEqual(job["freshness_state"], "unverified")

    def test_zero_role_weight_proof_still_carries_freshness_metadata(self) -> None:
        result = build_role_lens(
            _topology(),
            "recruiter",
            _freshness(
                {
                    "akos": (0.85, "aging"),
                    "sigma-glue": (0.65, "aging"),
                    "doctor-strange": (1.0, "fresh"),
                }
            ),
        )
        ops = next(flow for flow in result["ranked_flows"] if flow["flow_id"] == "ops")
        akos = next(
            item for item in ops["matched_systems"] if item["system_id"] == "akos"
        )
        self.assertEqual(akos["role_weight"], 0)
        self.assertEqual(akos["freshness_weight"], 0.85)
        self.assertEqual(akos["freshness_state"], "aging")

    def test_rejects_non_finite_freshness_weight(self) -> None:
        for invalid in (math.nan, math.inf, -math.inf):
            freshness = _signed_freshness(
                [
                    {
                        "id": "helix",
                        "freshness_weight": invalid,
                        "state": "fresh",
                        "age_days": 1,
                    }
                ]
            )
            with self.assertRaisesRegex(RoleLensError, "strict JSON|finite"):
                build_role_lens(_topology(), "recruiter", freshness)

    def test_rejects_tampered_freshness_receipt(self) -> None:
        freshness = _freshness({"helix": (1.0, "fresh")})
        freshness["entries"][0]["freshness_weight"] = 0.2
        with self.assertRaisesRegex(RoleLensError, "does not match"):
            build_role_lens(_topology(), "recruiter", freshness)

    def test_rejects_negative_or_non_integer_age(self) -> None:
        for invalid in (-1, 1.5, True):
            freshness = _signed_freshness(
                [
                    {
                        "id": "helix",
                        "freshness_weight": 1.0,
                        "state": "fresh",
                        "age_days": invalid,
                    }
                ]
            )
            with self.assertRaisesRegex(RoleLensError, "age_days"):
                build_role_lens(_topology(), "recruiter", freshness)

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

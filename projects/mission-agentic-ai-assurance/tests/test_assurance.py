from __future__ import annotations

import json
from pathlib import Path
import sys
import unittest

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "src"))

from mission_assurance import (
    AssuranceError,
    EvidenceRef,
    IdempotencyConflict,
    MissionAssuranceGateway,
    Policy,
)


def public_evidence():
    return [
        EvidenceRef(
            source_identity="https://example.com/evidence",
            source_ref="sha256:" + "a" * 64,
            verification_state="VERIFIED",
        )
    ]


def gateway():
    return MissionAssuranceGateway(
        Policy(
            allowed_actions=("agent.integration.assess", "agent.integration.execute"),
            max_payload_bytes=256,
            max_drift=0.10,
            require_evidence=True,
            breaker_failure_threshold=2,
        )
    )


class MissionAssuranceTests(unittest.TestCase):
    def test_valid_evidence_can_allow(self):
        receipt = gateway().assess(
            action_id="a1",
            action="agent.integration.assess",
            payload={"x": 1},
            evidence=public_evidence(),
            current_metric=1.02,
            baseline_metric=1.0,
            executor=lambda payload: {"ok": payload["x"]},
        )
        self.assertEqual(receipt["decision"], "ALLOW")
        self.assertEqual(receipt["reasons"], [])
        self.assertEqual(receipt["breaker_state"], "CLOSED")
        self.assertTrue(receipt["outcome_hash"])

    def test_missing_evidence_fails_closed(self):
        receipt = gateway().assess(
            action_id="a2",
            action="agent.integration.assess",
            payload={"x": 1},
            evidence=[],
            current_metric=1.0,
            baseline_metric=1.0,
        )
        self.assertEqual(receipt["decision"], "DENY")
        self.assertIn("evidence_required", receipt["reasons"])

    def test_malformed_immutable_ref_rejected(self):
        bad = EvidenceRef(
            source_identity="https://example.com/evidence",
            source_ref="main",
            verification_state="VERIFIED",
        )
        with self.assertRaises(AssuranceError):
            gateway().assess(
                action_id="a3",
                action="agent.integration.assess",
                payload={"x": 1},
                evidence=[bad],
                current_metric=1.0,
                baseline_metric=1.0,
            )

    def test_unknown_action_denied(self):
        receipt = gateway().assess(
            action_id="a4",
            action="agent.unknown",
            payload={"x": 1},
            evidence=public_evidence(),
            current_metric=1.0,
            baseline_metric=1.0,
        )
        self.assertEqual(receipt["decision"], "DENY")
        self.assertIn("action_not_allowed", receipt["reasons"])

    def test_excessive_drift_denied(self):
        receipt = gateway().assess(
            action_id="a5",
            action="agent.integration.assess",
            payload={"x": 1},
            evidence=public_evidence(),
            current_metric=1.25,
            baseline_metric=1.0,
        )
        self.assertEqual(receipt["decision"], "DENY")
        self.assertIn("drift_threshold_exceeded", receipt["reasons"])

    def test_identical_replay_is_exact(self):
        g = gateway()
        kwargs = dict(
            action_id="a6",
            action="agent.integration.assess",
            payload={"x": 1},
            evidence=public_evidence(),
            current_metric=1.0,
            baseline_metric=1.0,
            executor=lambda payload: {"ok": payload["x"]},
        )
        first = g.assess(**kwargs)
        second = g.assess(**kwargs)
        self.assertEqual(first, second)

    def test_conflicting_replay_rejected(self):
        g = gateway()
        g.assess(
            action_id="a7",
            action="agent.integration.assess",
            payload={"x": 1},
            evidence=public_evidence(),
            current_metric=1.0,
            baseline_metric=1.0,
        )
        with self.assertRaises(IdempotencyConflict):
            g.assess(
                action_id="a7",
                action="agent.integration.assess",
                payload={"x": 2},
                evidence=public_evidence(),
                current_metric=1.0,
                baseline_metric=1.0,
            )

    def test_repeated_executor_failure_opens_breaker(self):
        g = gateway()

        def fail(_payload):
            raise TimeoutError("bounded executor failure")

        first = g.assess(
            action_id="f1",
            action="agent.integration.execute",
            payload={"x": 1},
            evidence=public_evidence(),
            current_metric=1.0,
            baseline_metric=1.0,
            executor=fail,
        )
        self.assertEqual(first["decision"], "EXECUTION_FAILED")
        self.assertEqual(first["breaker_state"], "CLOSED")

        second = g.assess(
            action_id="f2",
            action="agent.integration.execute",
            payload={"x": 2},
            evidence=public_evidence(),
            current_metric=1.0,
            baseline_metric=1.0,
            executor=fail,
        )
        self.assertEqual(second["decision"], "EXECUTION_FAILED")
        self.assertEqual(second["breaker_state"], "OPEN")

        third = g.assess(
            action_id="f3",
            action="agent.integration.execute",
            payload={"x": 3},
            evidence=public_evidence(),
            current_metric=1.0,
            baseline_metric=1.0,
            executor=lambda payload: {"should_not_run": True},
        )
        self.assertEqual(third["decision"], "DENY")
        self.assertIn("circuit_open", third["reasons"])

    def test_payload_size_denied(self):
        receipt = gateway().assess(
            action_id="a8",
            action="agent.integration.assess",
            payload={"blob": "x" * 300},
            evidence=public_evidence(),
            current_metric=1.0,
            baseline_metric=1.0,
        )
        self.assertEqual(receipt["decision"], "DENY")
        self.assertIn("payload_too_large", receipt["reasons"])

    def test_demo_receipt_reproduces_exactly(self):
        fixture = json.loads((ROOT / "examples" / "lockheed_public_lens.json").read_text())
        evidence = [EvidenceRef(**item) for item in fixture["evidence"]]
        g = MissionAssuranceGateway(
            Policy(
                allowed_actions=("agent.integration.assess", "agent.integration.execute"),
                max_payload_bytes=4096,
                max_drift=0.10,
                require_evidence=True,
                breaker_failure_threshold=2,
            )
        )
        actual = g.assess(
            action_id=fixture["action_id"],
            action=fixture["action"],
            payload=fixture["payload"],
            evidence=evidence,
            current_metric=fixture["current_metric"],
            baseline_metric=fixture["baseline_metric"],
            executor=lambda payload: {
                "accepted": True,
                "component": payload["component"],
                "mode": payload["mode"],
            },
        )
        expected = json.loads((ROOT / "proof" / "reproduced_receipt.json").read_text())
        self.assertEqual(actual, expected)


if __name__ == "__main__":
    unittest.main()

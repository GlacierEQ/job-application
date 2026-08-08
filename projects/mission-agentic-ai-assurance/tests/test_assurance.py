from __future__ import annotations

import json
import math
import sys
import time
import unittest
from concurrent.futures import ThreadPoolExecutor
from hashlib import sha256
from pathlib import Path

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
    snapshot = b'{"evidence":"public"}\n'
    return [
        EvidenceRef(
            source_identity="https://example.com/evidence",
            source_ref="sha256:" + sha256(snapshot).hexdigest(),
            verification_state="VERIFIED",
            snapshot_content=snapshot,
        )
    ]


def fixture_evidence(fixture):
    return [
        EvidenceRef(
            source_identity=item["source_identity"],
            source_ref=item["source_ref"],
            verification_state=item["verification_state"],
            snapshot_content=(ROOT / item["snapshot_path"]).read_bytes(),
        )
        for item in fixture["evidence"]
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
            snapshot_content=b"evidence",
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

    def test_snapshot_hash_mismatch_rejected(self):
        bad = EvidenceRef(
            source_identity="https://example.com/evidence",
            source_ref="sha256:" + "a" * 64,
            verification_state="VERIFIED",
            snapshot_content=b"different-content",
        )
        with self.assertRaisesRegex(AssuranceError, "snapshot hash mismatch"):
            gateway().assess(
                action_id="hash-mismatch",
                action="agent.integration.assess",
                payload={"x": 1},
                evidence=[bad],
                current_metric=1.0,
                baseline_metric=1.0,
            )

    def test_private_or_credential_bearing_evidence_rejected(self):
        snapshot = b"public"
        source_ref = "sha256:" + sha256(snapshot).hexdigest()
        for identity in (
            "https://localhost/evidence",
            "https://127.0.0.1/evidence",
            "https://10.0.0.1/evidence",
            "https://user:secret@example.com/evidence",
        ):
            with self.subTest(identity=identity), self.assertRaises(AssuranceError):
                gateway().assess(
                    action_id=identity,
                    action="agent.integration.assess",
                    payload={"x": 1},
                    evidence=[EvidenceRef(identity, source_ref, "VERIFIED", snapshot)],
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

    def test_non_finite_metrics_rejected(self):
        for value in (math.nan, math.inf, -math.inf):
            with self.subTest(value=value), self.assertRaisesRegex(AssuranceError, "finite"):
                gateway().assess(
                    action_id=f"metric-{value}",
                    action="agent.integration.assess",
                    payload={"x": 1},
                    evidence=public_evidence(),
                    current_metric=value,
                    baseline_metric=1.0,
                )

    def test_identical_replay_is_exact(self):
        g = gateway()
        kwargs = {
            "action_id": "a6",
            "action": "agent.integration.assess",
            "payload": {"x": 1},
            "evidence": public_evidence(),
            "current_metric": 1.0,
            "baseline_metric": 1.0,
            "executor": lambda payload: {"ok": payload["x"]},
        }
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

    def test_concurrent_identical_calls_execute_once(self):
        g = gateway()
        executions = []

        def execute(payload):
            executions.append(payload["x"])
            time.sleep(0.03)
            return {"ok": payload["x"]}

        kwargs = {
            "action_id": "concurrent-1",
            "action": "agent.integration.execute",
            "payload": {"x": 7},
            "evidence": public_evidence(),
            "current_metric": 1.0,
            "baseline_metric": 1.0,
            "executor": execute,
        }
        with ThreadPoolExecutor(max_workers=2) as pool:
            receipts = list(pool.map(lambda _index: g.assess(**kwargs), range(2)))
        self.assertEqual(receipts[0], receipts[1])
        self.assertEqual(executions, [7])

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

    def test_noncanonical_executor_outcome_is_receipted_without_reexecution(self):
        g = gateway()
        executions = []

        def execute(_payload):
            executions.append(1)
            return {1, 2, 3}

        kwargs = {
            "action_id": "bad-outcome",
            "action": "agent.integration.execute",
            "payload": {"x": 1},
            "evidence": public_evidence(),
            "current_metric": 1.0,
            "baseline_metric": 1.0,
            "executor": execute,
        }
        first = g.assess(**kwargs)
        second = g.assess(**kwargs)
        self.assertEqual(first, second)
        self.assertEqual(executions, [1])
        self.assertEqual(first["decision"], "EXECUTION_FAILED")
        self.assertTrue(first["reasons"][0].startswith("executor_outcome_not_canonical:"))

    def test_payload_is_normalized_before_executor(self):
        observed = []
        gateway().assess(
            action_id="normalized-payload",
            action="agent.integration.execute",
            payload={1: "value"},
            evidence=public_evidence(),
            current_metric=1.0,
            baseline_metric=1.0,
            executor=lambda payload: observed.append(payload) or {"ok": True},
        )
        self.assertEqual(observed, [{"1": "value"}])

    def test_machine_adapter_requires_canonical_json(self):
        g = gateway()
        with self.assertRaisesRegex(AssuranceError, "not canonical"):
            g.assess_canonical_json(
                action_id="wire-bad",
                action="agent.integration.assess",
                canonical_payload_json='{"b": 2, "a": 1}',
                evidence=public_evidence(),
                current_metric=1.0,
                baseline_metric=1.0,
            )
        receipt = g.assess_canonical_json(
            action_id="wire-good",
            action="agent.integration.assess",
            canonical_payload_json='{"a":1,"b":2}',
            evidence=public_evidence(),
            current_metric=1.0,
            baseline_metric=1.0,
        )
        self.assertEqual(receipt["decision"], "ALLOW")

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
        evidence = fixture_evidence(fixture)
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

"""Deterministic mission-agent assurance gateway.

This module is intentionally standard-library only. It demonstrates bounded
policy enforcement, immutable provenance references, idempotency, drift gating,
circuit breaking, deterministic receipts, and replay verification.

It is an independent GlacierEQ reference implementation. It is not Lockheed
Martin software and does not claim company adoption or deployment.
"""

from __future__ import annotations

from dataclasses import dataclass, asdict
from hashlib import sha256
import json
import re
from typing import Any, Callable, Mapping, Sequence

SOURCE_REF_RE = re.compile(r"^(?:commit:[0-9a-f]{40}|sha256:[0-9a-f]{64})$")


class AssuranceError(RuntimeError):
    """Base exception for assurance contract violations."""


class IdempotencyConflict(AssuranceError):
    """Raised when an action id is reused for different canonical input."""


@dataclass(frozen=True)
class EvidenceRef:
    source_identity: str
    source_ref: str
    verification_state: str = "VERIFIED"

    def validate(self) -> None:
        if not (
            self.source_identity.startswith("https://")
            or self.source_identity.startswith("GlacierEQ/")
        ):
            raise AssuranceError("evidence source is not public-addressable")
        if not SOURCE_REF_RE.fullmatch(self.source_ref):
            raise AssuranceError("evidence source_ref is not immutable")
        if self.verification_state not in {"VERIFIED", "REPRODUCED"}:
            raise AssuranceError("unsupported evidence verification state")


@dataclass(frozen=True)
class Policy:
    allowed_actions: tuple[str, ...]
    max_payload_bytes: int = 4096
    max_drift: float = 0.25
    require_evidence: bool = True
    breaker_failure_threshold: int = 2

    def validate(self) -> None:
        if not self.allowed_actions:
            raise AssuranceError("policy must allow at least one action")
        if self.max_payload_bytes <= 0:
            raise AssuranceError("max_payload_bytes must be positive")
        if not 0 <= self.max_drift <= 1:
            raise AssuranceError("max_drift must be between 0 and 1")
        if self.breaker_failure_threshold <= 0:
            raise AssuranceError("breaker_failure_threshold must be positive")


def canonical_json(value: Any) -> str:
    return json.dumps(value, sort_keys=True, separators=(",", ":"), ensure_ascii=False)


def digest(value: Any) -> str:
    payload = value if isinstance(value, str) else canonical_json(value)
    return sha256(payload.encode("utf-8")).hexdigest()


class MissionAssuranceGateway:
    """A small deterministic control plane for agent actions."""

    def __init__(self, policy: Policy):
        policy.validate()
        self.policy = policy
        self._seen: dict[str, tuple[str, dict[str, Any]]] = {}
        self._breaker_failures = 0
        self._breaker_open = False

    @property
    def breaker_state(self) -> str:
        return "OPEN" if self._breaker_open else "CLOSED"

    def reset_breaker(self) -> None:
        self._breaker_failures = 0
        self._breaker_open = False

    def _policy_digest(self) -> str:
        return digest(
            {
                "allowed_actions": sorted(self.policy.allowed_actions),
                "max_payload_bytes": self.policy.max_payload_bytes,
                "max_drift": self.policy.max_drift,
                "require_evidence": self.policy.require_evidence,
                "breaker_failure_threshold": self.policy.breaker_failure_threshold,
            }
        )

    @staticmethod
    def _drift(current_metric: float, baseline_metric: float) -> float:
        denominator = max(abs(baseline_metric), 1e-12)
        return abs(current_metric - baseline_metric) / denominator

    def _request_hash(
        self,
        *,
        action_id: str,
        action: str,
        payload: Mapping[str, Any],
        evidence: Sequence[EvidenceRef],
        current_metric: float,
        baseline_metric: float,
    ) -> str:
        return digest(
            {
                "action_id": action_id,
                "action": action,
                "payload": payload,
                "evidence": [asdict(item) for item in evidence],
                "current_metric": current_metric,
                "baseline_metric": baseline_metric,
            }
        )

    def _make_receipt(
        self,
        *,
        action_id: str,
        action: str,
        request_hash: str,
        evidence: Sequence[EvidenceRef],
        drift: float,
        decision: str,
        reasons: Sequence[str],
        outcome: Any | None,
    ) -> dict[str, Any]:
        evidence_digest = digest([asdict(item) for item in evidence])
        outcome_hash = None if outcome is None else digest(outcome)
        core = {
            "schema": "glaciereq.mission-assurance-receipt.v1",
            "action_id": action_id,
            "action": action,
            "decision": decision,
            "reasons": list(reasons),
            "request_hash": request_hash,
            "policy_hash": self._policy_digest(),
            "evidence_digest": evidence_digest,
            "drift": round(drift, 12),
            "outcome_hash": outcome_hash,
            "breaker_state": self.breaker_state,
        }
        return {**core, "receipt_id": digest(core)}

    def assess(
        self,
        *,
        action_id: str,
        action: str,
        payload: Mapping[str, Any],
        evidence: Sequence[EvidenceRef],
        current_metric: float,
        baseline_metric: float,
        executor: Callable[[Mapping[str, Any]], Any] | None = None,
    ) -> dict[str, Any]:
        if not action_id or not action:
            raise AssuranceError("action_id and action are required")
        if not isinstance(payload, Mapping):
            raise AssuranceError("payload must be a mapping")

        for item in evidence:
            item.validate()

        request_hash = self._request_hash(
            action_id=action_id,
            action=action,
            payload=payload,
            evidence=evidence,
            current_metric=current_metric,
            baseline_metric=baseline_metric,
        )

        prior = self._seen.get(action_id)
        if prior:
            prior_hash, prior_receipt = prior
            if prior_hash != request_hash:
                raise IdempotencyConflict("action_id reused for different canonical request")
            return json.loads(canonical_json(prior_receipt))

        reasons: list[str] = []
        payload_size = len(canonical_json(payload).encode("utf-8"))
        drift = self._drift(current_metric, baseline_metric)

        if action not in self.policy.allowed_actions:
            reasons.append("action_not_allowed")
        if payload_size > self.policy.max_payload_bytes:
            reasons.append("payload_too_large")
        if self.policy.require_evidence and not evidence:
            reasons.append("evidence_required")
        if drift > self.policy.max_drift:
            reasons.append("drift_threshold_exceeded")
        if self._breaker_open:
            reasons.append("circuit_open")

        outcome = None
        decision = "DENY" if reasons else "ALLOW"

        if not reasons and executor is not None:
            try:
                outcome = executor(payload)
                self._breaker_failures = 0
            except Exception as error:  # executor boundary is intentionally broad
                self._breaker_failures += 1
                if self._breaker_failures >= self.policy.breaker_failure_threshold:
                    self._breaker_open = True
                decision = "EXECUTION_FAILED"
                reasons = [f"executor_failure:{type(error).__name__}"]

        receipt = self._make_receipt(
            action_id=action_id,
            action=action,
            request_hash=request_hash,
            evidence=evidence,
            drift=drift,
            decision=decision,
            reasons=reasons,
            outcome=outcome,
        )
        self._seen[action_id] = (request_hash, receipt)
        return json.loads(canonical_json(receipt))

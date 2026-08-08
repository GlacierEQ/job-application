"""Deterministic mission-agent assurance gateway.

This module is intentionally standard-library only. It demonstrates bounded
policy enforcement, content-bound provenance references, thread-safe single-
process idempotency, drift gating, circuit breaking, deterministic receipts,
and replay verification.

It is an independent GlacierEQ reference implementation. It is not Lockheed
Martin software and does not claim company adoption or deployment.
"""

from __future__ import annotations

import ipaddress
import json
import math
import re
from collections.abc import Callable, Mapping, Sequence
from dataclasses import dataclass
from hashlib import sha256
from threading import RLock
from typing import Any
from urllib.parse import urlsplit

SOURCE_REF_RE = re.compile(r"^(?:commit:[0-9a-f]{40}|sha256:[0-9a-f]{64})$")


class AssuranceError(RuntimeError):
    """Base exception for assurance contract violations."""


class IdempotencyConflict(AssuranceError):
    """Raised when an action id is reused for different canonical input."""


def canonical_json(value: Any) -> str:
    """Return strict deterministic JSON; reject NaN, infinity and non-JSON values."""
    try:
        return json.dumps(
            value,
            sort_keys=True,
            separators=(",", ":"),
            ensure_ascii=False,
            allow_nan=False,
        )
    except (TypeError, ValueError) as error:
        raise AssuranceError("value is not canonical JSON") from error


def digest(value: Any) -> str:
    payload = value if isinstance(value, str) else canonical_json(value)
    return sha256(payload.encode("utf-8")).hexdigest()


def normalize_payload(value: Mapping[str, Any]) -> dict[str, Any]:
    """Normalize a Python mapping through strict JSON before hashing/execution."""
    normalized = json.loads(canonical_json(value))
    if not isinstance(normalized, dict):
        raise AssuranceError("payload must normalize to a JSON object")
    return normalized


def parse_canonical_payload(payload_json: str) -> dict[str, Any]:
    """Decode a machine-contract payload and require exact canonical JSON bytes."""
    if not isinstance(payload_json, str) or not payload_json:
        raise AssuranceError("canonical_payload_json is required")
    try:
        parsed = json.loads(payload_json)
    except (TypeError, json.JSONDecodeError) as error:
        raise AssuranceError("canonical_payload_json is invalid JSON") from error
    if not isinstance(parsed, dict):
        raise AssuranceError("canonical_payload_json must encode an object")
    if canonical_json(parsed) != payload_json:
        raise AssuranceError("canonical_payload_json is not canonical")
    return parsed


@dataclass(frozen=True)
class EvidenceRef:
    source_identity: str
    source_ref: str
    verification_state: str = "VERIFIED"
    snapshot_content: bytes | None = None

    def identity(self) -> dict[str, str]:
        return {
            "source_identity": self.source_identity,
            "source_ref": self.source_ref,
            "verification_state": self.verification_state,
        }

    @staticmethod
    def _validate_https_identity(identity: str) -> None:
        parsed = urlsplit(identity)
        if parsed.scheme != "https" or not parsed.hostname:
            raise AssuranceError("evidence source is not public-addressable")
        if parsed.username is not None or parsed.password is not None:
            raise AssuranceError("evidence source must not contain credentials")
        hostname = parsed.hostname.rstrip(".").lower()
        if hostname == "localhost" or hostname.endswith(".localhost"):
            raise AssuranceError("evidence source must not be local")
        try:
            address = ipaddress.ip_address(hostname)
        except ValueError:
            return
        if (
            address.is_private
            or address.is_loopback
            or address.is_link_local
            or address.is_reserved
            or address.is_unspecified
        ):
            raise AssuranceError("evidence source must not use a non-public IP")

    def validate(self) -> None:
        if self.source_identity.startswith("https://"):
            self._validate_https_identity(self.source_identity)
        elif not self.source_identity.startswith("GlacierEQ/"):
            raise AssuranceError("evidence source is not public-addressable")

        if not SOURCE_REF_RE.fullmatch(self.source_ref):
            raise AssuranceError("evidence source_ref is not immutable")
        if self.verification_state not in {"VERIFIED", "REPRODUCED"}:
            raise AssuranceError("unsupported evidence verification state")

        kind, expected = self.source_ref.split(":", 1)
        if kind == "sha256":
            if self.snapshot_content is None:
                raise AssuranceError("sha256 evidence requires snapshot content")
            actual = sha256(self.snapshot_content).hexdigest()
            if actual != expected:
                raise AssuranceError("evidence snapshot hash mismatch")
        elif kind == "commit" and expected not in self.source_identity:
            raise AssuranceError("commit evidence identity does not bind the commit")


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
        if not math.isfinite(self.max_drift) or not 0 <= self.max_drift <= 1:
            raise AssuranceError("max_drift must be finite and between 0 and 1")
        if self.breaker_failure_threshold <= 0:
            raise AssuranceError("breaker_failure_threshold must be positive")


class MissionAssuranceGateway:
    """A deterministic single-process control boundary for agent actions."""

    def __init__(self, policy: Policy):
        policy.validate()
        self.policy = policy
        self._seen: dict[str, tuple[str, dict[str, Any]]] = {}
        self._breaker_failures = 0
        self._breaker_open = False
        self._lock = RLock()

    @property
    def breaker_state(self) -> str:
        with self._lock:
            return "OPEN" if self._breaker_open else "CLOSED"

    def reset_breaker(self) -> None:
        with self._lock:
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
        if not math.isfinite(current_metric) or not math.isfinite(baseline_metric):
            raise AssuranceError("metrics must be finite")
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
                "evidence": [item.identity() for item in evidence],
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
        evidence_digest = digest([item.identity() for item in evidence])
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
            "breaker_state": "OPEN" if self._breaker_open else "CLOSED",
        }
        return {**core, "receipt_id": digest(core)}

    def assess_canonical_json(
        self,
        *,
        action_id: str,
        action: str,
        canonical_payload_json: str,
        evidence: Sequence[EvidenceRef],
        current_metric: float,
        baseline_metric: float,
        executor: Callable[[Mapping[str, Any]], Any] | None = None,
    ) -> dict[str, Any]:
        """Machine-contract adapter: decode exact canonical JSON then assess it."""
        return self.assess(
            action_id=action_id,
            action=action,
            payload=parse_canonical_payload(canonical_payload_json),
            evidence=evidence,
            current_metric=current_metric,
            baseline_metric=baseline_metric,
            executor=executor,
        )

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

        normalized_payload = normalize_payload(payload)
        drift = self._drift(current_metric, baseline_metric)
        for item in evidence:
            item.validate()

        request_hash = self._request_hash(
            action_id=action_id,
            action=action,
            payload=normalized_payload,
            evidence=evidence,
            current_metric=current_metric,
            baseline_metric=baseline_metric,
        )

        with self._lock:
            prior = self._seen.get(action_id)
            if prior:
                prior_hash, prior_receipt = prior
                if prior_hash != request_hash:
                    raise IdempotencyConflict("action_id reused for different canonical request")
                return json.loads(canonical_json(prior_receipt))

            reasons: list[str] = []
            payload_size = len(canonical_json(normalized_payload).encode("utf-8"))

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
                    raw_outcome = executor(normalized_payload)
                    outcome = json.loads(canonical_json(raw_outcome))
                    self._breaker_failures = 0
                except AssuranceError as error:
                    self._breaker_failures += 1
                    if self._breaker_failures >= self.policy.breaker_failure_threshold:
                        self._breaker_open = True
                    decision = "EXECUTION_FAILED"
                    reasons = [f"executor_outcome_not_canonical:{type(error.__cause__).__name__}"]
                    outcome = None
                except Exception as error:  # noqa: BLE001
                    self._breaker_failures += 1
                    if self._breaker_failures >= self.policy.breaker_failure_threshold:
                        self._breaker_open = True
                    decision = "EXECUTION_FAILED"
                    reasons = [f"executor_failure:{type(error).__name__}"]
                    outcome = None

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

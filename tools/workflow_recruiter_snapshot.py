"""Compose live verification identity, freshness, and role proof into one recruiter snapshot.

This is the executable orchestration surface for the already-proven JOB_RESTORE chain. It does
not implement a second ranking algorithm. Instead it composes the owning modules in authority
order: live evidence selection -> exact workflow identity proof -> freshness -> role-ranked
recruiter briefs. If identity verification fails, no freshness-ranked snapshot is emitted.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import tempfile
from collections.abc import Callable, Mapping, Sequence
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

try:
    from tools.workflow_evidence_freshness import build_evidence_freshness
    from tools.workflow_evidence_manifest import (
        _github_fetcher,
        build_evidence_manifest,
    )
    from tools.workflow_recruiter_brief import build_recruiter_brief
    from tools.workflow_role_lens import ROLE_WEIGHTS
    from tools.workflow_verification_identity import build_verification_identity_proof
except ModuleNotFoundError:
    from workflow_evidence_freshness import build_evidence_freshness
    from workflow_evidence_manifest import _github_fetcher, build_evidence_manifest
    from workflow_recruiter_brief import build_recruiter_brief
    from workflow_role_lens import ROLE_WEIGHTS
    from workflow_verification_identity import build_verification_identity_proof

OUTPUT_SCHEMA = "glaciereq.recruiter-proof-snapshot.v1"


class RecruiterSnapshotError(RuntimeError):
    """Raised when a complete recruiter snapshot cannot be composed safely."""


def _stable(value: Any) -> str:
    try:
        return json.dumps(
            value,
            sort_keys=True,
            separators=(",", ":"),
            ensure_ascii=False,
            allow_nan=False,
        )
    except (TypeError, ValueError) as exc:
        raise RecruiterSnapshotError(f"snapshot is not strict JSON: {exc}") from exc


def _receipt(value: Any) -> str:
    return hashlib.sha256(_stable(value).encode("utf-8")).hexdigest()


def _normalize_as_of(value: datetime) -> datetime:
    if not isinstance(value, datetime) or value.tzinfo is None:
        raise RecruiterSnapshotError("as_of must be a timezone-aware datetime")
    return value.astimezone(UTC)


def _normalize_roles(roles: Sequence[str] | None) -> tuple[str, ...]:
    requested = tuple(ROLE_WEIGHTS) if roles is None else tuple(roles)
    if not requested:
        raise RecruiterSnapshotError("at least one recruiter role is required")
    normalized: list[str] = []
    seen: set[str] = set()
    for raw in requested:
        if not isinstance(raw, str) or not raw.strip():
            raise RecruiterSnapshotError("role names must be non-empty strings")
        role = raw.strip()
        if role not in ROLE_WEIGHTS:
            raise RecruiterSnapshotError(
                f"unsupported role {role!r}; expected one of "
                f"{', '.join(sorted(ROLE_WEIGHTS))}"
            )
        if role not in seen:
            normalized.append(role)
            seen.add(role)
    return tuple(normalized)


def _require_mapping(value: object, field: str) -> Mapping[str, Any]:
    if not isinstance(value, Mapping):
        raise RecruiterSnapshotError(f"{field} must be an object")
    return value


def _verify_topology_receipt(topology: Mapping[str, Any]) -> str:
    receipt = topology.get("receipt_sha256")
    if not isinstance(receipt, str) or len(receipt) != 64:
        raise RecruiterSnapshotError("topology requires a 64-character receipt_sha256")
    if any(character not in "0123456789abcdef" for character in receipt):
        raise RecruiterSnapshotError("topology receipt_sha256 must be lowercase hex")
    unsigned = dict(topology)
    unsigned.pop("receipt_sha256", None)
    expected = _receipt(unsigned)
    if receipt != expected:
        raise RecruiterSnapshotError("topology receipt_sha256 does not match topology")
    return receipt


def _verify_identity_covers_manifest(
    manifest: Mapping[str, Any], identity: Mapping[str, Any]
) -> None:
    manifest_entries = manifest.get("entries")
    verified_entries = identity.get("verified_entries")
    if not isinstance(manifest_entries, list) or not manifest_entries:
        raise RecruiterSnapshotError("evidence manifest has no verified entries")
    if not isinstance(verified_entries, list):
        raise RecruiterSnapshotError("identity proof lacks verified_entries")

    manifest_ids = {
        str(entry.get("id") or "")
        for entry in manifest_entries
        if isinstance(entry, Mapping)
    }
    identity_ids = {
        str(entry.get("id") or "")
        for entry in verified_entries
        if isinstance(entry, Mapping)
    }
    if "" in manifest_ids or "" in identity_ids:
        raise RecruiterSnapshotError(
            "manifest or identity proof contains an empty system id"
        )
    if identity_ids != manifest_ids:
        missing = sorted(manifest_ids - identity_ids)
        extra = sorted(identity_ids - manifest_ids)
        raise RecruiterSnapshotError(
            "identity proof does not exactly cover manifest entries; "
            f"missing={missing}, extra={extra}"
        )


def build_recruiter_snapshot(
    topology: Mapping[str, Any],
    verification_sources: Mapping[str, Any],
    fetch_json: Callable[[str], dict[str, Any]],
    *,
    as_of: datetime,
    roles: Sequence[str] | None = None,
    top_k: int = 3,
    allow_missing: bool = True,
) -> dict[str, Any]:
    """Build one identity-gated, freshness-ranked snapshot for one or more hiring roles."""
    topology = dict(_require_mapping(topology, "topology"))
    verification_sources = dict(
        _require_mapping(verification_sources, "verification_sources")
    )
    topology_receipt = _verify_topology_receipt(topology)
    normalized_as_of = _normalize_as_of(as_of)
    normalized_roles = _normalize_roles(roles)
    if not isinstance(top_k, int) or isinstance(top_k, bool) or not 1 <= top_k <= 10:
        raise RecruiterSnapshotError("top_k must be an integer from 1 through 10")

    manifest = build_evidence_manifest(
        topology,
        fetch_json,
        verification_sources=verification_sources,
        allow_missing=allow_missing,
    )
    identity = build_verification_identity_proof(
        manifest,
        verification_sources,
        fetch_json,
    )
    _verify_identity_covers_manifest(manifest, identity)

    freshness = build_evidence_freshness(manifest, as_of=normalized_as_of)
    briefs = {
        role: build_recruiter_brief(
            topology,
            role,
            top_k=top_k,
            freshness=freshness,
        )
        for role in normalized_roles
    }

    missing_systems = manifest.get("missing_systems")
    if not isinstance(missing_systems, list):
        raise RecruiterSnapshotError("evidence manifest missing_systems must be a list")
    exact_path_bound_entries = identity.get("exact_path_bound_entries")
    if not isinstance(exact_path_bound_entries, int) or isinstance(
        exact_path_bound_entries, bool
    ):
        raise RecruiterSnapshotError(
            "identity proof exact_path_bound_entries must be an integer"
        )

    core = {
        "schema": OUTPUT_SCHEMA,
        "as_of": normalized_as_of.isoformat().replace("+00:00", "Z"),
        "topology_receipt_sha256": topology_receipt,
        "pipeline": [
            "registered_live_evidence_manifest",
            "exact_workflow_identity_gate",
            "evidence_freshness",
            "role_lens",
            "recruiter_proof_brief",
        ],
        "policy": {
            "identity_gate_required_before_freshness": True,
            "topology_receipt_verified_before_evidence_fetch": True,
            "missing_proof_receives_zero_freshness_credit": True,
            "applicant_values_inferred": False,
        },
        "coverage": {
            "manifest_entries": len(manifest["entries"]),
            "missing_systems": len(missing_systems),
            "identity_verified_entries": len(identity["verified_entries"]),
            "exact_path_bound_entries": exact_path_bound_entries,
            "roles": list(normalized_roles),
            "top_k": top_k,
        },
        "receipts": {
            "identity_sha256": identity["receipt_sha256"],
            "freshness_sha256": freshness["receipt_sha256"],
            "recruiter_briefs_sha256": {
                role: brief["receipt_sha256"] for role, brief in briefs.items()
            },
        },
        "evidence_manifest": manifest,
        "identity_proof": identity,
        "freshness": freshness,
        "recruiter_briefs": briefs,
    }
    return {**core, "receipt_sha256": _receipt(core)}


def _load_json_object(path: Path, field: str) -> dict[str, Any]:
    try:
        value = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        raise RecruiterSnapshotError(f"invalid {field} JSON at {path}: {exc}") from exc
    if not isinstance(value, dict):
        raise RecruiterSnapshotError(f"{field} must be a JSON object")
    return value


def _parse_as_of(value: str | None) -> datetime:
    if value is None:
        return datetime.now(UTC)
    try:
        parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError as exc:
        raise RecruiterSnapshotError(f"invalid --as-of value: {value}") from exc
    return _normalize_as_of(parsed)


def _atomic_write_json(path: Path, payload: Mapping[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    rendered = json.dumps(payload, indent=2, sort_keys=True, allow_nan=False) + "\n"
    fd, temporary_name = tempfile.mkstemp(
        dir=path.parent,
        prefix=f".{path.name}.",
        suffix=".tmp",
        text=True,
    )
    temporary = Path(temporary_name)
    try:
        with os.fdopen(fd, "w", encoding="utf-8") as handle:
            handle.write(rendered)
            handle.flush()
            os.fsync(handle.fileno())
        temporary.replace(path)
    finally:
        temporary.unlink(missing_ok=True)


def main(argv: Sequence[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        description=(
            "Build one exact-identity-gated GlacierEQ recruiter proof snapshot across "
            "registered live verification, freshness, and role-specific recruiter briefs."
        )
    )
    parser.add_argument("--topology", required=True, type=Path)
    parser.add_argument("--verification-sources", required=True, type=Path)
    parser.add_argument("--output", required=True, type=Path)
    parser.add_argument("--role", action="append", dest="roles")
    parser.add_argument("--top-k", type=int, default=3)
    parser.add_argument("--as-of")
    parser.add_argument("--require-complete", action="store_true")
    parser.add_argument("--github-token-env", default="GITHUB_TOKEN")
    args = parser.parse_args(argv)

    try:
        snapshot = build_recruiter_snapshot(
            _load_json_object(args.topology, "topology"),
            _load_json_object(
                args.verification_sources,
                "verification source registry",
            ),
            _github_fetcher(os.environ.get(args.github_token_env)),
            as_of=_parse_as_of(args.as_of),
            roles=args.roles,
            top_k=args.top_k,
            allow_missing=not args.require_complete,
        )
        _atomic_write_json(args.output, snapshot)
    except (OSError, RecruiterSnapshotError, RuntimeError, ValueError) as exc:
        parser.error(str(exc))

    print(json.dumps(snapshot, indent=2, sort_keys=True, allow_nan=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

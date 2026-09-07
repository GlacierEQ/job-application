from __future__ import annotations

import argparse
import hashlib
import json
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

SCHEMA = "glaciereq.evidence-freshness.v1"


class EvidenceFreshnessError(ValueError):
    pass


def _stable(value: Any) -> str:
    return json.dumps(value, sort_keys=True, separators=(",", ":"), ensure_ascii=False)


def _receipt(value: Any) -> str:
    return hashlib.sha256(_stable(value).encode("utf-8")).hexdigest()


def _parse_time(value: str) -> datetime:
    try:
        parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError as exc:
        raise EvidenceFreshnessError(f"invalid evidence timestamp: {value}") from exc
    if parsed.tzinfo is None:
        raise EvidenceFreshnessError("evidence timestamp must include timezone")
    return parsed.astimezone(UTC)


def freshness_weight(age_days: int) -> float:
    if age_days < 0:
        raise EvidenceFreshnessError("evidence timestamp is in the future")
    if age_days <= 30:
        return 1.0
    if age_days <= 90:
        return 0.85
    if age_days <= 180:
        return 0.65
    if age_days <= 365:
        return 0.4
    return 0.2


def build_evidence_freshness(
    manifest: dict[str, Any], *, as_of: datetime
) -> dict[str, Any]:
    if manifest.get("schema") != "glaciereq.evidence-manifest.v1":
        raise EvidenceFreshnessError("unsupported evidence manifest schema")
    if as_of.tzinfo is None:
        raise EvidenceFreshnessError("as_of must include timezone")
    normalized_as_of = as_of.astimezone(UTC)
    entries = manifest.get("entries")
    if not isinstance(entries, list) or not entries:
        raise EvidenceFreshnessError("evidence manifest requires entries")

    scored = []
    seen: set[str] = set()
    for entry in entries:
        if not isinstance(entry, dict):
            raise EvidenceFreshnessError("evidence entry must be an object")
        evidence_id = str(entry.get("id") or "").strip()
        repository = str(entry.get("repository") or "").strip()
        commit_sha = str(entry.get("commit_sha") or "").strip().lower()
        verified_at = str(entry.get("verified_at") or "").strip()
        if not evidence_id or evidence_id in seen:
            raise EvidenceFreshnessError(
                f"invalid or duplicate evidence id: {evidence_id!r}"
            )
        seen.add(evidence_id)
        if not repository.startswith("GlacierEQ/"):
            raise EvidenceFreshnessError(
                f"evidence {evidence_id} repository outside GlacierEQ"
            )
        if len(commit_sha) != 40 or any(
            c not in "0123456789abcdef" for c in commit_sha
        ):
            raise EvidenceFreshnessError(
                f"evidence {evidence_id} requires exact 40-char commit SHA"
            )
        verified = _parse_time(verified_at)
        age_days = (normalized_as_of - verified).days
        weight = freshness_weight(age_days)
        scored.append(
            {
                "id": evidence_id,
                "repository": repository,
                "commit_sha": commit_sha,
                "verified_at": verified.isoformat().replace("+00:00", "Z"),
                "age_days": age_days,
                "freshness_weight": weight,
                "state": "fresh"
                if weight == 1.0
                else "aging"
                if weight >= 0.65
                else "stale",
            }
        )

    scored.sort(
        key=lambda item: (-item["freshness_weight"], item["age_days"], item["id"])
    )
    core = {
        "schema": SCHEMA,
        "as_of": normalized_as_of.isoformat().replace("+00:00", "Z"),
        "policy": "exact owning-repository SHA + verified timestamp; age reduces recruiter ranking weight",
        "entries": scored,
    }
    return {**core, "receipt_sha256": _receipt(core)}


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Score immutable GlacierEQ evidence by verification freshness."
    )
    parser.add_argument("--manifest", required=True, type=Path)
    parser.add_argument("--as-of", required=True)
    parser.add_argument("--output", type=Path)
    args = parser.parse_args()
    manifest = json.loads(args.manifest.read_text(encoding="utf-8"))
    result = build_evidence_freshness(manifest, as_of=_parse_time(args.as_of))
    rendered = json.dumps(result, indent=2, ensure_ascii=False) + "\n"
    if args.output:
        args.output.parent.mkdir(parents=True, exist_ok=True)
        temp = args.output.with_suffix(args.output.suffix + ".tmp")
        temp.write_text(rendered, encoding="utf-8")
        temp.replace(args.output)
    print(rendered, end="")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

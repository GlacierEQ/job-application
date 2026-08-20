from __future__ import annotations

import argparse
import json
import os
import time
import urllib.error
import urllib.parse
import urllib.request
from collections.abc import Callable
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

try:
    from tools.workflow_evidence_freshness import build_evidence_freshness
    from tools.workflow_recruiter_brief import build_recruiter_brief
except ModuleNotFoundError:
    from workflow_evidence_freshness import build_evidence_freshness
    from workflow_recruiter_brief import build_recruiter_brief

OUTPUT_SCHEMA = "glaciereq.live-recruiter-proof.v1"
MANIFEST_SCHEMA = "glaciereq.evidence-manifest.v1"
GITHUB_PREFIX = "https://github.com/GlacierEQ/"
GITHUB_API = "https://api.github.com"
FetchJson = Callable[[str], dict[str, Any]]


class LiveRecruiterProofError(RuntimeError):
    """Raised when live repository verification evidence cannot be composed safely."""


def _parse_time(value: str) -> datetime:
    try:
        parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError as exc:
        raise LiveRecruiterProofError(f"invalid ISO-8601 timestamp: {value!r}") from exc
    if parsed.tzinfo is None:
        raise LiveRecruiterProofError("timestamp must include timezone")
    return parsed.astimezone(UTC)


def _repository_slug(repo_url: object) -> str:
    if not isinstance(repo_url, str) or not repo_url.startswith(GITHUB_PREFIX):
        raise LiveRecruiterProofError(f"repository outside GlacierEQ boundary: {repo_url!r}")
    name = repo_url.removeprefix(GITHUB_PREFIX).strip("/")
    if not name or "/" in name:
        raise LiveRecruiterProofError(f"invalid GlacierEQ repository URL: {repo_url!r}")
    return f"GlacierEQ/{name}"


def _systems(topology: dict[str, Any]) -> dict[str, str]:
    if topology.get("schema") != "glaciereq.workflow-topology.v1":
        raise LiveRecruiterProofError(
            f"unsupported topology schema: {topology.get('schema')!r}"
        )
    flows = topology.get("flows")
    if not isinstance(flows, list) or not flows:
        raise LiveRecruiterProofError("topology.flows must be a non-empty list")

    systems: dict[str, str] = {}
    for flow in flows:
        if not isinstance(flow, dict):
            raise LiveRecruiterProofError("topology flow must be an object")
        steps = flow.get("steps")
        if not isinstance(steps, list) or not steps:
            raise LiveRecruiterProofError(f"flow {flow.get('id')!r} has no steps")
        for step in steps:
            system = step.get("system") if isinstance(step, dict) else None
            if not isinstance(system, dict):
                raise LiveRecruiterProofError("topology step missing system object")
            system_id = str(system.get("id") or "").strip()
            if not system_id:
                raise LiveRecruiterProofError("topology system missing id")
            repository = _repository_slug(system.get("repo"))
            previous = systems.get(system_id)
            if previous is not None and previous != repository:
                raise LiveRecruiterProofError(
                    f"system {system_id!r} maps to conflicting repositories"
                )
            systems[system_id] = repository
    return systems


def _verification_event(payload: dict[str, Any], repository: str) -> dict[str, str] | None:
    runs = payload.get("workflow_runs")
    if not isinstance(runs, list):
        raise LiveRecruiterProofError(
            f"GitHub Actions response for {repository} missing workflow_runs"
        )
    for run in runs:
        if not isinstance(run, dict) or run.get("conclusion") != "success":
            continue
        head_sha = str(run.get("head_sha") or "").strip().lower()
        verified_at = str(run.get("updated_at") or run.get("run_started_at") or "").strip()
        html_url = str(run.get("html_url") or "").strip()
        if len(head_sha) != 40 or any(char not in "0123456789abcdef" for char in head_sha):
            continue
        if not verified_at:
            continue
        _parse_time(verified_at)
        return {
            "commit_sha": head_sha,
            "verified_at": verified_at,
            "verification_url": html_url,
        }
    return None


def build_evidence_manifest(
    topology: dict[str, Any], *, fetch_json: FetchJson
) -> dict[str, Any]:
    """Derive freshness inputs from the newest successful GitHub Actions run per system."""
    entries: list[dict[str, Any]] = []
    unverified_systems: list[dict[str, str]] = []
    for system_id, repository in sorted(_systems(topology).items()):
        owner, name = repository.split("/", 1)
        query = urllib.parse.urlencode({"status": "success", "per_page": 10})
        url = f"{GITHUB_API}/repos/{owner}/{name}/actions/runs?{query}"
        event = _verification_event(fetch_json(url), repository)
        if event is None:
            unverified_systems.append(
                {
                    "id": system_id,
                    "repository": repository,
                    "reason": "no_successful_github_actions_verification_event",
                }
            )
            continue
        entries.append(
            {
                "id": system_id,
                "repository": repository,
                "commit_sha": event["commit_sha"],
                "verified_at": event["verified_at"],
                "verification_kind": "github_actions_success",
                "verification_url": event["verification_url"],
            }
        )

    if not entries:
        raise LiveRecruiterProofError(
            "no successful GitHub Actions verification events found for topology systems"
        )
    return {
        "schema": MANIFEST_SCHEMA,
        "entries": entries,
        "unverified_systems": unverified_systems,
        "derivation_policy": (
            "newest successful GitHub Actions run per topology system; "
            "systems without a successful run remain explicitly unverified"
        ),
    }


def build_live_recruiter_proof(
    topology: dict[str, Any],
    role: str,
    *,
    as_of: datetime,
    fetch_json: FetchJson,
    top_k: int = 3,
) -> dict[str, Any]:
    """Compose live verification events into freshness-aware recruiter proof."""
    manifest = build_evidence_manifest(topology, fetch_json=fetch_json)
    freshness = build_evidence_freshness(manifest, as_of=as_of)
    brief = build_recruiter_brief(topology, role, top_k, freshness)
    coverage = {
        "verified_system_count": len(manifest["entries"]),
        "unverified_system_count": len(manifest["unverified_systems"]),
        "unverified_systems": manifest["unverified_systems"],
    }
    return {
        "schema": OUTPUT_SCHEMA,
        "role": role,
        "as_of": as_of.astimezone(UTC).isoformat().replace("+00:00", "Z"),
        "verification_source": "github_actions_success",
        "coverage": coverage,
        "evidence_manifest": manifest,
        "freshness": freshness,
        "recruiter_brief": brief,
    }


def _github_fetch_json(url: str) -> dict[str, Any]:
    token = os.environ.get("GITHUB_TOKEN", "").strip()
    headers = {
        "Accept": "application/vnd.github+json",
        "User-Agent": "GlacierEQ-live-recruiter-proof/1.0",
        "X-GitHub-Api-Version": "2022-11-28",
    }
    if token:
        headers["Authorization"] = f"Bearer {token}"

    last_error: Exception | None = None
    for attempt in range(3):
        request = urllib.request.Request(url, headers=headers)
        try:
            with urllib.request.urlopen(request, timeout=12) as response:
                if response.status != 200:
                    raise LiveRecruiterProofError(
                        f"GitHub API returned HTTP {response.status} for {url}"
                    )
                payload = json.loads(response.read().decode("utf-8"))
                if not isinstance(payload, dict):
                    raise LiveRecruiterProofError(
                        f"GitHub API returned non-object JSON for {url}"
                    )
                return payload
        except (urllib.error.URLError, TimeoutError, json.JSONDecodeError) as exc:
            last_error = exc
            if attempt < 2:
                time.sleep(0.5 * (attempt + 1))
    raise LiveRecruiterProofError(f"GitHub API request failed for {url}: {last_error}")


def _atomic_write(path: Path, payload: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    rendered = json.dumps(payload, indent=2, sort_keys=True) + "\n"
    temporary = path.with_suffix(path.suffix + ".tmp")
    temporary.write_text(rendered, encoding="utf-8")
    temporary.replace(path)


def main() -> int:
    parser = argparse.ArgumentParser(
        description=(
            "Build freshness-aware recruiter proof directly from live GlacierEQ GitHub "
            "verification events."
        )
    )
    parser.add_argument("--topology", required=True, type=Path)
    parser.add_argument("--role", required=True)
    parser.add_argument("--top-k", type=int, default=3)
    parser.add_argument("--as-of")
    parser.add_argument("--output", type=Path)
    args = parser.parse_args()

    topology = json.loads(args.topology.read_text(encoding="utf-8"))
    as_of = _parse_time(args.as_of) if args.as_of else datetime.now(UTC)
    result = build_live_recruiter_proof(
        topology,
        args.role,
        as_of=as_of,
        fetch_json=_github_fetch_json,
        top_k=args.top_k,
    )
    if args.output:
        _atomic_write(args.output, result)
    print(json.dumps(result, indent=2, sort_keys=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

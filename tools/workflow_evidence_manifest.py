from __future__ import annotations

import argparse
import json
import os
import re
import tempfile
import urllib.error
import urllib.parse
import urllib.request
from collections.abc import Callable
from pathlib import Path
from typing import Any

TOPOLOGY_SCHEMA = "glaciereq.workflow-topology.v1"
OUTPUT_SCHEMA = "glaciereq.evidence-manifest.v1"
DEFAULT_WORKFLOW_PATTERN = r"(?:proof|verify|verification|validation|test|\bci\b|non-regression)"
SHA_RE = re.compile(r"^[0-9a-f]{40}$")
REPO_URL_RE = re.compile(r"^https://github\.com/(GlacierEQ)/([A-Za-z0-9_.-]+?)/?$")


class EvidenceManifestError(RuntimeError):
    """Raised when live verification evidence cannot be derived safely."""


def _require_text(value: object, field: str) -> str:
    if not isinstance(value, str) or not value.strip():
        raise EvidenceManifestError(f"required non-empty string missing: {field}")
    return value.strip()


def _repository_slug(repo_url: object, *, system_id: str) -> str:
    value = _require_text(repo_url, f"{system_id}.repo")
    match = REPO_URL_RE.fullmatch(value)
    if not match:
        raise EvidenceManifestError(
            f"system {system_id} repo must be an exact GlacierEQ GitHub repository URL"
        )
    return f"{match.group(1)}/{match.group(2)}"


def _systems_from_topology(topology: dict[str, Any]) -> dict[str, str]:
    if topology.get("schema") != TOPOLOGY_SCHEMA:
        raise EvidenceManifestError(
            f"unsupported topology schema: {topology.get('schema')!r}"
        )
    flows = topology.get("flows")
    if not isinstance(flows, list) or not flows:
        raise EvidenceManifestError("topology.flows must be a non-empty list")

    systems: dict[str, str] = {}
    for flow in flows:
        if not isinstance(flow, dict):
            raise EvidenceManifestError("topology flow must be an object")
        for step in flow.get("steps", []):
            system = step.get("system") if isinstance(step, dict) else None
            if not isinstance(system, dict):
                raise EvidenceManifestError("topology step requires system object")
            system_id = _require_text(system.get("id"), "system.id")
            repository = _repository_slug(system.get("repo"), system_id=system_id)
            previous = systems.setdefault(system_id, repository)
            if previous != repository:
                raise EvidenceManifestError(
                    f"system {system_id} maps to conflicting repositories: "
                    f"{previous} != {repository}"
                )
    if not systems:
        raise EvidenceManifestError("topology contains no systems")
    return systems


def _qualifying_run(
    runs: list[dict[str, Any]], *, default_branch: str, workflow_re: re.Pattern[str]
) -> dict[str, Any] | None:
    candidates: list[dict[str, Any]] = []
    for run in runs:
        if not isinstance(run, dict):
            continue
        if run.get("status") != "completed" or run.get("conclusion") != "success":
            continue
        if run.get("head_branch") != default_branch:
            continue
        head_sha = str(run.get("head_sha") or "").lower()
        if not SHA_RE.fullmatch(head_sha):
            continue
        searchable = " ".join(
            str(run.get(field) or "") for field in ("name", "display_title", "path")
        )
        if not workflow_re.search(searchable):
            continue
        verified_at = str(run.get("updated_at") or run.get("run_started_at") or "")
        if not verified_at.endswith("Z"):
            continue
        candidates.append(run)
    if not candidates:
        return None
    candidates.sort(
        key=lambda run: (str(run.get("updated_at") or ""), int(run.get("id") or 0)),
        reverse=True,
    )
    return candidates[0]


def build_evidence_manifest(
    topology: dict[str, Any],
    fetch_json: Callable[[str], dict[str, Any]],
    *,
    workflow_pattern: str = DEFAULT_WORKFLOW_PATTERN,
    allow_missing: bool = False,
) -> dict[str, Any]:
    """Derive one current successful verification run for each topology system."""
    systems = _systems_from_topology(topology)
    try:
        workflow_re = re.compile(workflow_pattern, re.IGNORECASE)
    except re.error as exc:
        raise EvidenceManifestError(f"invalid workflow pattern: {exc}") from exc

    entries: list[dict[str, Any]] = []
    missing: list[dict[str, str]] = []
    repo_cache: dict[str, tuple[str, list[dict[str, Any]]]] = {}

    for system_id, repository in sorted(systems.items()):
        if repository not in repo_cache:
            owner, name = repository.split("/", 1)
            repo_url = f"https://api.github.com/repos/{owner}/{name}"
            metadata = fetch_json(repo_url)
            default_branch = _require_text(metadata.get("default_branch"), "default_branch")
            encoded_branch = urllib.parse.quote(default_branch, safe="")
            runs_url = (
                f"{repo_url}/actions/runs?status=success&branch={encoded_branch}&per_page=100"
            )
            payload = fetch_json(runs_url)
            runs = payload.get("workflow_runs")
            if not isinstance(runs, list):
                raise EvidenceManifestError(
                    f"GitHub Actions response for {repository} lacks workflow_runs"
                )
            repo_cache[repository] = (default_branch, runs)

        default_branch, runs = repo_cache[repository]
        run = _qualifying_run(runs, default_branch=default_branch, workflow_re=workflow_re)
        if run is None:
            missing.append({"id": system_id, "repository": repository})
            continue
        entries.append(
            {
                "id": system_id,
                "repository": repository,
                "commit_sha": str(run["head_sha"]).lower(),
                "verified_at": str(run.get("updated_at") or run.get("run_started_at")),
                "verification_run_id": int(run["id"]),
                "verification_workflow": _require_text(run.get("name"), "run.name"),
                "verification_url": _require_text(run.get("html_url"), "run.html_url"),
            }
        )

    if missing and not allow_missing:
        summary = ", ".join(f"{item['id']}@{item['repository']}" for item in missing)
        raise EvidenceManifestError(f"no qualifying successful verification run: {summary}")
    if not entries:
        raise EvidenceManifestError("no qualifying successful verification runs found")

    return {
        "schema": OUTPUT_SCHEMA,
        "derivation_policy": (
            "latest completed successful default-branch GitHub Actions run whose workflow "
            "name/title/path matches the configured verification pattern"
        ),
        "workflow_pattern": workflow_pattern,
        "topology_receipt_sha256": topology.get("receipt_sha256"),
        "entries": entries,
        "missing_systems": missing,
    }


def _github_fetcher(token: str | None) -> Callable[[str], dict[str, Any]]:
    def fetch(url: str) -> dict[str, Any]:
        headers = {
            "Accept": "application/vnd.github+json",
            "User-Agent": "GlacierEQ-job-application-evidence-manifest/1.0",
            "X-GitHub-Api-Version": "2022-11-28",
        }
        if token:
            headers["Authorization"] = f"Bearer {token}"
        request = urllib.request.Request(url, headers=headers)
        try:
            with urllib.request.urlopen(request, timeout=15) as response:
                payload = json.load(response)
        except (urllib.error.URLError, TimeoutError, json.JSONDecodeError) as exc:
            raise EvidenceManifestError(f"GitHub request failed for {url}: {exc}") from exc
        if not isinstance(payload, dict):
            raise EvidenceManifestError(f"GitHub response for {url} must be an object")
        return payload

    return fetch


def _atomic_write_json(path: Path, payload: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    rendered = json.dumps(payload, indent=2, sort_keys=True, allow_nan=False) + "\n"
    fd, temporary_name = tempfile.mkstemp(
        dir=path.parent, prefix=f".{path.name}.", suffix=".tmp", text=True
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


def main() -> int:
    parser = argparse.ArgumentParser(
        description=(
            "Derive GlacierEQ evidence-manifest.v1 directly from successful owning-repository "
            "GitHub Actions verification runs referenced by workflow topology."
        )
    )
    parser.add_argument("--topology", required=True, type=Path)
    parser.add_argument("--output", required=True, type=Path)
    parser.add_argument("--workflow-pattern", default=DEFAULT_WORKFLOW_PATTERN)
    parser.add_argument("--allow-missing", action="store_true")
    parser.add_argument("--github-token-env", default="GITHUB_TOKEN")
    args = parser.parse_args()

    try:
        topology = json.loads(args.topology.read_text(encoding="utf-8"))
        if not isinstance(topology, dict):
            raise EvidenceManifestError("topology must be a JSON object")
        token = os.environ.get(args.github_token_env)
        result = build_evidence_manifest(
            topology,
            _github_fetcher(token),
            workflow_pattern=args.workflow_pattern,
            allow_missing=args.allow_missing,
        )
        _atomic_write_json(args.output, result)
    except (OSError, json.JSONDecodeError, EvidenceManifestError) as exc:
        parser.error(str(exc))

    print(json.dumps(result, indent=2, sort_keys=True, allow_nan=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

from __future__ import annotations

import argparse
import json
import os
import re
import tempfile
import urllib.error
import urllib.request
from collections.abc import Callable, Mapping, Sequence
from pathlib import Path
from typing import Any

TOPOLOGY_SCHEMA = "glaciereq.workflow-topology.v1"
OUTPUT_SCHEMA = "glaciereq.evidence-manifest.v1"
SOURCE_REGISTRY_SCHEMA = "glaciereq.verification-source-registry.v1"
DEFAULT_WORKFLOW_PATTERN = (
    r"(?:proof|verify|verification|validation|test|\bci\b|non-regression)"
)
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


def _normalize_source_registry(
    registry: Mapping[str, Any] | None,
) -> dict[str, frozenset[str]] | None:
    if registry is None:
        return None
    if registry.get("schema") != SOURCE_REGISTRY_SCHEMA:
        raise EvidenceManifestError(
            f"unsupported verification source registry schema: {registry.get('schema')!r}"
        )
    repositories = registry.get("repositories")
    if not isinstance(repositories, dict) or not repositories:
        raise EvidenceManifestError(
            "verification source registry requires non-empty repositories object"
        )
    normalized: dict[str, frozenset[str]] = {}
    for repository, source in repositories.items():
        if not isinstance(repository, str) or not repository.startswith("GlacierEQ/"):
            raise EvidenceManifestError(
                f"verification source registry repository outside GlacierEQ: {repository!r}"
            )
        if not isinstance(source, dict):
            raise EvidenceManifestError(
                f"verification source registry entry must be an object: {repository}"
            )
        names = source.get("workflow_names")
        if (
            isinstance(names, (str, bytes))
            or not isinstance(names, Sequence)
            or not names
            or any(not isinstance(name, str) or not name.strip() for name in names)
        ):
            raise EvidenceManifestError(
                f"repositories.{repository}.workflow_names must be a non-empty list of names"
            )
        normalized[repository] = frozenset(name.strip() for name in names)
    return normalized


def _qualifying_run(
    runs: list[dict[str, Any]],
    *,
    default_branch: str,
    workflow_re: re.Pattern[str] | None = None,
    workflow_names: frozenset[str] | None = None,
) -> dict[str, Any] | None:
    candidates: list[dict[str, Any]] = []
    for run in runs:
        if not isinstance(run, dict):
            continue
        if run.get("status") != "completed" or run.get("conclusion") != "success":
            continue
        head_sha = str(run.get("head_sha") or "").lower()
        if not SHA_RE.fullmatch(head_sha):
            continue
        if workflow_names is not None:
            if str(run.get("name") or "").strip() not in workflow_names:
                continue
        else:
            assert workflow_re is not None
            searchable = " ".join(
                str(run.get(field) or "")
                for field in ("name", "display_title", "path")
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
        key=lambda run: (
            str(run.get("updated_at") or ""),
            run.get("head_branch") == default_branch,
            int(run.get("id") or 0),
        ),
        reverse=True,
    )
    return candidates[0]


def _load_repository_runs(
    repository: str, fetch_json: Callable[[str], dict[str, Any]]
) -> tuple[str, list[dict[str, Any]]]:
    owner, name = repository.split("/", 1)
    repo_url = f"https://api.github.com/repos/{owner}/{name}"
    metadata = fetch_json(repo_url)
    default_branch = _require_text(metadata.get("default_branch"), "default_branch")
    payload = fetch_json(f"{repo_url}/actions/runs?status=success&per_page=100")
    runs = payload.get("workflow_runs")
    if not isinstance(runs, list):
        raise EvidenceManifestError(
            f"GitHub Actions response for {repository} lacks workflow_runs"
        )
    return default_branch, runs


def build_evidence_manifest(
    topology: dict[str, Any],
    fetch_json: Callable[[str], dict[str, Any]],
    *,
    workflow_pattern: str = DEFAULT_WORKFLOW_PATTERN,
    verification_sources: Mapping[str, Any] | None = None,
    allow_missing: bool = False,
) -> dict[str, Any]:
    """Derive one current successful verification run for each topology system."""
    systems = _systems_from_topology(topology)
    registry = _normalize_source_registry(verification_sources)
    try:
        fallback_re = re.compile(workflow_pattern, re.IGNORECASE)
    except re.error as exc:
        raise EvidenceManifestError(f"invalid workflow pattern: {exc}") from exc

    entries: list[dict[str, Any]] = []
    missing: list[dict[str, str]] = []
    repo_cache: dict[str, tuple[str, list[dict[str, Any]]] | EvidenceManifestError] = {}

    for system_id, repository in sorted(systems.items()):
        if repository not in repo_cache:
            try:
                repo_cache[repository] = _load_repository_runs(repository, fetch_json)
            except EvidenceManifestError as exc:
                repo_cache[repository] = exc

        cached = repo_cache[repository]
        if isinstance(cached, EvidenceManifestError):
            if not allow_missing:
                raise cached
            missing.append(
                {
                    "id": system_id,
                    "repository": repository,
                    "reason": f"repository_verification_unavailable: {cached}",
                }
            )
            continue

        if registry is not None:
            workflow_names = registry.get(repository)
            if workflow_names is None:
                missing.append(
                    {
                        "id": system_id,
                        "repository": repository,
                        "reason": "verification_source_not_registered",
                    }
                )
                continue
        else:
            workflow_names = None

        default_branch, runs = cached
        run = _qualifying_run(
            runs,
            default_branch=default_branch,
            workflow_re=fallback_re if registry is None else None,
            workflow_names=workflow_names,
        )
        if run is None:
            missing.append(
                {
                    "id": system_id,
                    "repository": repository,
                    "reason": "no_qualifying_successful_verification_run",
                }
            )
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
                "verification_branch": str(run.get("head_branch") or ""),
            }
        )

    if missing and not allow_missing:
        summary = ", ".join(f"{item['id']}@{item['repository']}" for item in missing)
        raise EvidenceManifestError(
            f"no qualifying successful verification run: {summary}"
        )
    if not entries:
        raise EvidenceManifestError("no qualifying successful verification runs found")

    return {
        "schema": OUTPUT_SCHEMA,
        "derivation_policy": (
            "latest completed successful owning-repository GitHub Actions run selected "
            "from explicit per-repository verification sources when a registry is supplied; "
            "otherwise the backward-compatible configured verification pattern is used; "
            "unavailable or unverified systems remain explicit and receive no freshness credit"
        ),
        "workflow_pattern": workflow_pattern if registry is None else None,
        "verification_source_registry": registry is not None,
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
            raise EvidenceManifestError(
                f"GitHub request failed for {url}: {exc}"
            ) from exc
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


def _load_registry(path: Path | None) -> dict[str, Any] | None:
    if path is None:
        return None
    try:
        payload = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        raise EvidenceManifestError(
            f"invalid verification source registry at {path}: {exc}"
        ) from exc
    if not isinstance(payload, dict):
        raise EvidenceManifestError("verification source registry must be a JSON object")
    return payload


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
    parser.add_argument("--verification-sources", type=Path)
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
            verification_sources=_load_registry(args.verification_sources),
            allow_missing=args.allow_missing,
        )
        _atomic_write_json(args.output, result)
    except (OSError, json.JSONDecodeError, EvidenceManifestError) as exc:
        parser.error(str(exc))

    print(json.dumps(result, indent=2, sort_keys=True, allow_nan=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

"""Verify exact GitHub Actions identity for recruiter-freshness evidence.

The evidence manifest selects successful verification runs. This module adds a second,
independent identity gate before those runs may influence freshness or recruiter ranking:
each selected run is fetched by exact run ID and checked against its owning repository,
registered workflow name, exact workflow file path, branch/event policy, SHA, timestamp,
and URL. Registries that have not yet declared workflow_paths remain compatible, but only
path-bound entries receive exact-path assurance.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import re
import tempfile
import urllib.error
import urllib.request
from collections.abc import Callable, Mapping, Sequence
from pathlib import Path
from typing import Any

MANIFEST_SCHEMA = "glaciereq.evidence-manifest.v1"
REGISTRY_SCHEMA = "glaciereq.verification-source-registry.v1"
OUTPUT_SCHEMA = "glaciereq.verification-identity-proof.v1"
SHA_RE = re.compile(r"^[0-9a-f]{40}$")
WORKFLOW_PATH_RE = re.compile(r"^\.github/workflows/[A-Za-z0-9_.\-/]+\.ya?ml$")
ALLOWED_BRANCH_POLICIES = frozenset({"default_only", "default_or_pull_request"})


class VerificationIdentityError(RuntimeError):
    """Raised when selected verification evidence cannot prove exact workflow identity."""


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
        raise VerificationIdentityError(f"identity proof is not strict JSON: {exc}") from exc


def _receipt(value: Any) -> str:
    return hashlib.sha256(_stable(value).encode("utf-8")).hexdigest()


def _require_text(value: object, field: str) -> str:
    if not isinstance(value, str) or not value.strip():
        raise VerificationIdentityError(f"required non-empty string missing: {field}")
    return value.strip()


def _normalize_string_list(value: object, field: str) -> tuple[str, ...]:
    if (
        isinstance(value, (str, bytes))
        or not isinstance(value, Sequence)
        or not value
        or any(not isinstance(item, str) or not item.strip() for item in value)
    ):
        raise VerificationIdentityError(f"{field} must be a non-empty list of strings")
    return tuple(dict.fromkeys(item.strip() for item in value))


def _registry_sources(registry: Mapping[str, Any]) -> dict[str, dict[str, Any]]:
    if registry.get("schema") != REGISTRY_SCHEMA:
        raise VerificationIdentityError(
            f"unsupported verification source registry schema: {registry.get('schema')!r}"
        )
    repositories = registry.get("repositories")
    if not isinstance(repositories, dict) or not repositories:
        raise VerificationIdentityError("verification source registry requires repositories")

    normalized: dict[str, dict[str, Any]] = {}
    for repository, raw in repositories.items():
        if not isinstance(repository, str) or not re.fullmatch(
            r"GlacierEQ/[A-Za-z0-9_.-]+", repository
        ):
            raise VerificationIdentityError(
                f"invalid GlacierEQ repository in verification registry: {repository!r}"
            )
        if not isinstance(raw, dict):
            raise VerificationIdentityError(f"registry entry must be object: {repository}")

        names = _normalize_string_list(
            raw.get("workflow_names"), f"repositories.{repository}.workflow_names"
        )
        paths_raw = raw.get("workflow_paths")
        paths: tuple[str, ...] | None = None
        if paths_raw is not None:
            paths = _normalize_string_list(
                paths_raw, f"repositories.{repository}.workflow_paths"
            )
            invalid = [path for path in paths if not WORKFLOW_PATH_RE.fullmatch(path)]
            if invalid:
                raise VerificationIdentityError(
                    f"repositories.{repository}.workflow_paths contains invalid paths: {invalid}"
                )

        policy = raw.get("branch_policy")
        if policy is None:
            policy = "default_or_pull_request"
        if policy not in ALLOWED_BRANCH_POLICIES:
            raise VerificationIdentityError(
                f"repositories.{repository}.branch_policy unsupported: {policy!r}"
            )
        normalized[repository] = {
            "workflow_names": frozenset(names),
            "workflow_paths": frozenset(paths) if paths is not None else None,
            "branch_policy": policy,
        }
    return normalized


def _manifest_entries(manifest: Mapping[str, Any]) -> list[dict[str, Any]]:
    if manifest.get("schema") != MANIFEST_SCHEMA:
        raise VerificationIdentityError(
            f"unsupported evidence manifest schema: {manifest.get('schema')!r}"
        )
    entries = manifest.get("entries")
    if not isinstance(entries, list) or not entries:
        raise VerificationIdentityError("evidence manifest requires entries")
    normalized: list[dict[str, Any]] = []
    seen: set[str] = set()
    for raw in entries:
        if not isinstance(raw, dict):
            raise VerificationIdentityError("evidence manifest entry must be an object")
        system_id = _require_text(raw.get("id"), "entry.id")
        if system_id in seen:
            raise VerificationIdentityError(f"duplicate evidence system id: {system_id}")
        seen.add(system_id)
        normalized.append(raw)
    return normalized


def _verify_branch_policy(
    *, policy: str, default_branch: str, head_branch: str, event: str, system_id: str
) -> None:
    if policy == "default_only":
        if head_branch != default_branch:
            raise VerificationIdentityError(
                f"{system_id} verification branch {head_branch!r} is not default branch "
                f"{default_branch!r}"
            )
        return
    if head_branch != default_branch and event != "pull_request":
        raise VerificationIdentityError(
            f"{system_id} verification branch {head_branch!r} is not default branch and "
            f"event {event!r} is not pull_request"
        )


def build_verification_identity_proof(
    manifest: Mapping[str, Any],
    registry: Mapping[str, Any],
    fetch_json: Callable[[str], dict[str, Any]],
) -> dict[str, Any]:
    """Prove selected manifest runs against exact GitHub run identity and registry policy."""
    sources = _registry_sources(registry)
    entries = _manifest_entries(manifest)
    verified: list[dict[str, Any]] = []
    repo_metadata: dict[str, dict[str, Any]] = {}

    for entry in sorted(entries, key=lambda item: str(item.get("id") or "")):
        system_id = _require_text(entry.get("id"), "entry.id")
        repository = _require_text(entry.get("repository"), f"{system_id}.repository")
        source = sources.get(repository)
        if source is None:
            raise VerificationIdentityError(
                f"{system_id} repository has no registered verification source: {repository}"
            )
        run_id = entry.get("verification_run_id")
        if isinstance(run_id, bool) or not isinstance(run_id, int) or run_id <= 0:
            raise VerificationIdentityError(f"{system_id} verification_run_id must be positive")
        manifest_sha = _require_text(entry.get("commit_sha"), f"{system_id}.commit_sha").lower()
        if not SHA_RE.fullmatch(manifest_sha):
            raise VerificationIdentityError(f"{system_id} commit_sha must be exact 40-char SHA")
        manifest_name = _require_text(
            entry.get("verification_workflow"), f"{system_id}.verification_workflow"
        )
        if manifest_name not in source["workflow_names"]:
            raise VerificationIdentityError(
                f"{system_id} manifest workflow is not registered: {manifest_name!r}"
            )

        if repository not in repo_metadata:
            repo_metadata[repository] = fetch_json(f"https://api.github.com/repos/{repository}")
        default_branch = _require_text(
            repo_metadata[repository].get("default_branch"),
            f"{repository}.default_branch",
        )
        run = fetch_json(f"https://api.github.com/repos/{repository}/actions/runs/{run_id}")
        if int(run.get("id") or 0) != run_id:
            raise VerificationIdentityError(f"{system_id} exact run id does not match manifest")
        if run.get("status") != "completed" or run.get("conclusion") != "success":
            raise VerificationIdentityError(f"{system_id} exact run is not completed success")

        run_name = _require_text(run.get("name"), f"{system_id}.run.name")
        if run_name != manifest_name or run_name not in source["workflow_names"]:
            raise VerificationIdentityError(f"{system_id} exact run workflow name mismatch")
        run_sha = _require_text(run.get("head_sha"), f"{system_id}.run.head_sha").lower()
        if run_sha != manifest_sha or not SHA_RE.fullmatch(run_sha):
            raise VerificationIdentityError(f"{system_id} exact run SHA mismatch")

        run_path = _require_text(run.get("path"), f"{system_id}.run.path")
        allowed_paths = source["workflow_paths"]
        if allowed_paths is not None and run_path not in allowed_paths:
            raise VerificationIdentityError(
                f"{system_id} workflow path is not registered: {run_path!r}"
            )
        event = _require_text(run.get("event"), f"{system_id}.run.event")
        head_branch = _require_text(run.get("head_branch"), f"{system_id}.run.head_branch")
        _verify_branch_policy(
            policy=source["branch_policy"],
            default_branch=default_branch,
            head_branch=head_branch,
            event=event,
            system_id=system_id,
        )

        manifest_verified_at = _require_text(
            entry.get("verified_at"), f"{system_id}.verified_at"
        )
        run_verified_at = _require_text(
            run.get("updated_at") or run.get("run_started_at"),
            f"{system_id}.run.updated_at",
        )
        if run_verified_at != manifest_verified_at:
            raise VerificationIdentityError(f"{system_id} verification timestamp mismatch")
        manifest_url = _require_text(
            entry.get("verification_url"), f"{system_id}.verification_url"
        )
        run_url = _require_text(run.get("html_url"), f"{system_id}.run.html_url")
        if run_url != manifest_url or not run_url.startswith(
            f"https://github.com/{repository}/actions/runs/"
        ):
            raise VerificationIdentityError(f"{system_id} verification URL mismatch")

        verified.append(
            {
                "id": system_id,
                "repository": repository,
                "verification_run_id": run_id,
                "workflow_name": run_name,
                "workflow_path": run_path,
                "workflow_path_bound": allowed_paths is not None,
                "branch_policy": source["branch_policy"],
                "default_branch": default_branch,
                "verification_branch": head_branch,
                "verification_event": event,
                "commit_sha": run_sha,
                "verified_at": run_verified_at,
                "verification_url": run_url,
            }
        )

    core = {
        "schema": OUTPUT_SCHEMA,
        "manifest_topology_receipt_sha256": manifest.get("topology_receipt_sha256"),
        "identity_policy": (
            "selected verification runs are re-fetched by exact run id and must match owning "
            "repository, registered workflow name, registered workflow path when declared, "
            "branch/event policy, commit SHA, timestamp, and run URL before freshness trust"
        ),
        "verified_entries": verified,
        "exact_path_bound_entries": sum(
            1 for entry in verified if entry["workflow_path_bound"]
        ),
    }
    return {**core, "receipt_sha256": _receipt(core)}


def _github_fetcher(token: str | None) -> Callable[[str], dict[str, Any]]:
    def fetch(url: str) -> dict[str, Any]:
        headers = {
            "Accept": "application/vnd.github+json",
            "User-Agent": "GlacierEQ-verification-identity/1.0",
            "X-GitHub-Api-Version": "2022-11-28",
        }
        if token:
            headers["Authorization"] = f"Bearer {token}"
        request = urllib.request.Request(url, headers=headers)
        try:
            with urllib.request.urlopen(request, timeout=15) as response:
                payload = json.load(response)
        except (urllib.error.URLError, TimeoutError, json.JSONDecodeError) as exc:
            raise VerificationIdentityError(
                f"GitHub identity request failed for {url}: {exc}"
            ) from exc
        if not isinstance(payload, dict):
            raise VerificationIdentityError(f"GitHub response for {url} must be an object")
        return payload

    return fetch


def _load_json(path: Path, label: str) -> dict[str, Any]:
    try:
        payload = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        raise VerificationIdentityError(f"invalid {label} at {path}: {exc}") from exc
    if not isinstance(payload, dict):
        raise VerificationIdentityError(f"{label} must be a JSON object")
    return payload


def _atomic_write_json(path: Path, payload: Mapping[str, Any]) -> None:
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
        description="Verify exact workflow identity for a GlacierEQ evidence manifest."
    )
    parser.add_argument("--manifest", required=True, type=Path)
    parser.add_argument("--verification-sources", required=True, type=Path)
    parser.add_argument("--output", required=True, type=Path)
    parser.add_argument("--github-token-env", default="GITHUB_TOKEN")
    args = parser.parse_args()
    try:
        proof = build_verification_identity_proof(
            _load_json(args.manifest, "evidence manifest"),
            _load_json(args.verification_sources, "verification source registry"),
            _github_fetcher(os.environ.get(args.github_token_env)),
        )
        _atomic_write_json(args.output, proof)
    except (OSError, VerificationIdentityError) as exc:
        parser.error(str(exc))
    print(json.dumps(proof, indent=2, sort_keys=True, allow_nan=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

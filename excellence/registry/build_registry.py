#!/usr/bin/env python3
"""Build the live company-repository excellence registry.

The roster is sourced from the existing multi-repo catalog, but the registry is an
engineering control artifact outside the site projection. Live repository state is
read from GitHub at exact heads. Monolith is fetched once, pinned to its observed
main SHA, and supplies the principal-state / gate authority for the entire run.

This script is read-only with respect to the inspected repositories.
"""
from __future__ import annotations

import argparse
import base64
import json
import os
import sys
import urllib.error
import urllib.parse
import urllib.request
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[2]
DEFAULT_CATALOG = ROOT / "site-v15" / "data" / "excellence-multi-repo-catalog.json"
DEFAULT_OUTPUT = ROOT / "excellence" / "registry" / "excellence-repo-registry.json"
API = "https://api.github.com"
OWNER = "GlacierEQ"
MONOLITH = "GlacierEQ/monolith"
STATE_PATH = "machine/excellence-state.json"


def utc_now() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def api_get(url: str, token: str | None = None) -> Any:
    headers = {
        "Accept": "application/vnd.github+json",
        "User-Agent": "GlacierEQ-excellence-registry/1.0",
        "X-GitHub-Api-Version": "2022-11-28",
    }
    if token:
        headers["Authorization"] = f"Bearer {token}"
    request = urllib.request.Request(url, headers=headers)
    try:
        with urllib.request.urlopen(request, timeout=30) as response:
            return json.load(response)
    except urllib.error.HTTPError as exc:
        body = exc.read().decode("utf-8", errors="replace")[:400]
        raise RuntimeError(f"GitHub API {exc.code} for {url}: {body}") from exc


def decode_content(payload: dict[str, Any]) -> str:
    if payload.get("encoding") != "base64":
        raise ValueError(f"unexpected GitHub content encoding: {payload.get('encoding')!r}")
    return base64.b64decode(payload["content"]).decode("utf-8")


def fetch_json_file(repo: str, path: str, ref: str, token: str | None) -> tuple[dict[str, Any], str]:
    encoded = urllib.parse.quote(path, safe="/")
    payload = api_get(f"{API}/repos/{repo}/contents/{encoded}?ref={urllib.parse.quote(ref, safe='')}", token)
    return json.loads(decode_content(payload)), payload["sha"]


def load_roster(catalog_path: Path) -> list[dict[str, str]]:
    data = json.loads(catalog_path.read_text(encoding="utf-8"))
    roster: list[dict[str, str]] = []
    for update in data.get("updates", []):
        company = update["slug"]
        for name in update.get("added", []):
            roster.append({"company": company, "repository": f"{OWNER}/{name}"})
    expected = data.get("created_public_repos")
    if expected is not None and len(roster) != expected:
        raise ValueError(f"catalog declares {expected} created repos but updates enumerate {len(roster)}")
    names = [item["repository"] for item in roster]
    if len(names) != len(set(names)):
        raise ValueError("duplicate repository in excellence roster")
    return roster


def fetch_monolith_authority(token: str | None) -> tuple[str, dict[str, Any], str, dict[str, Any], str]:
    branch = api_get(f"{API}/repos/{MONOLITH}/branches/main", token)
    sha = branch["commit"]["sha"]
    machine, machine_blob = fetch_json_file(
        MONOLITH, "catalog/repo_excellence_state_machine.json", sha, token
    )
    policy, policy_blob = fetch_json_file(
        MONOLITH, "catalog/repo_excellence_disposition_policy.json", sha, token
    )
    return sha, machine, machine_blob, policy, policy_blob


def prerequisite_gates(machine: dict[str, Any], principal_state: str) -> list[str]:
    states = machine["principal_states"]
    if principal_state not in states:
        return []
    end = states.index(principal_state)
    required: list[str] = []
    for stage in states[: end + 1]:
        gate = machine.get("stage_gates", {}).get(stage)
        if gate:
            required.append(gate)
    return required


def gate_pass(state: dict[str, Any], gate: str) -> bool:
    return (state.get("gates") or {}).get(gate, {}).get("status") == "PASS"


def analyze_state(
    state: dict[str, Any] | None,
    machine: dict[str, Any],
    policy: dict[str, Any],
) -> dict[str, Any]:
    states = machine["principal_states"]
    side_exits = set(machine.get("side_exits", []))
    if state is None:
        return {
            "state_status": "MISSING",
            "declared_principal_state": None,
            "effective_principal_state": "DISCOVERED",
            "prerequisite_errors": [],
            "disposition_errors": [],
            "state_valid": False,
            "next_failing_gate": machine["stage_gates"][states[1]],
            "next_action_class": "INITIALIZE_STATE",
        }

    declared = state.get("principal_state")
    errors: list[str] = []
    disposition_errors: list[str] = []

    if declared in states:
        declared_index = states.index(declared)
        effective = "DISCOVERED"
        for stage in states[1 : declared_index + 1]:
            gate = machine["stage_gates"][stage]
            if not gate_pass(state, gate):
                errors.append(f"{declared} outruns {gate}")
                break
            effective = stage
        if errors:
            next_gate = errors[0].split(" outruns ", 1)[1]
            action = "REPAIR_STATE"
        elif declared_index + 1 < len(states):
            next_gate = machine["stage_gates"][states[declared_index + 1]]
            action = "ADVANCE_GATE"
        else:
            next_gate = None
            action = "EVOLVE"
    elif declared in side_exits:
        effective = declared
        next_gate = None
        action = "REVIEW_SIDE_EXIT"
    else:
        effective = "DISCOVERED"
        errors.append(f"unknown principal_state: {declared}")
        next_gate = machine["stage_gates"][states[1]]
        action = "REPAIR_STATE"

    protected = set(policy.get("protected_side_exits", []))
    protected_actions = set(policy.get("protected_novelty_actions", []))
    if declared in protected or state.get("novelty_action") in protected_actions:
        evidence = state.get("disposition_evidence") or {}
        reason = evidence.get("reason_code")
        if not reason:
            disposition_errors.append("missing disposition_evidence.reason_code")
        elif reason in set(policy.get("forbidden_reason_codes", [])):
            disposition_errors.append(f"forbidden disposition reason: {reason}")
        elif reason not in set(policy.get("allowed_reason_codes", [])):
            disposition_errors.append(f"unknown disposition reason: {reason}")
        for field in policy.get("required_true_fields", []):
            if evidence.get(field) is not True:
                disposition_errors.append(f"{field} must be true")
        refs = evidence.get("evidence_refs")
        if not isinstance(refs, list) or not refs:
            disposition_errors.append("evidence_refs required")

    valid = not errors and not disposition_errors
    if not valid and action not in {"INITIALIZE_STATE", "REPAIR_STATE"}:
        action = "REPAIR_STATE"

    return {
        "state_status": "PRESENT",
        "declared_principal_state": declared,
        "effective_principal_state": effective,
        "prerequisite_errors": errors,
        "disposition_errors": disposition_errors,
        "state_valid": valid,
        "next_failing_gate": next_gate,
        "next_action_class": action,
    }


def observe_tree(tree: list[dict[str, Any]]) -> dict[str, Any]:
    blobs = [item for item in tree if item.get("type") == "blob"]
    paths = {item["path"] for item in blobs}
    source = [
        item
        for item in blobs
        if item["path"].startswith(("src/", "go/", "server/", "lib/"))
        and not item["path"].endswith(("_test.go", ".test.js", ".test.ts", ".spec.js", ".spec.ts"))
    ]
    tests = [
        item
        for item in blobs
        if item["path"].startswith("tests/")
        or item["path"].endswith(("_test.go", ".test.js", ".test.ts", ".spec.js", ".spec.ts"))
    ]
    workflows = [item for item in blobs if item["path"].startswith(".github/workflows/")]
    machine = [item for item in blobs if item["path"].startswith("machine/")]
    return {
        "files_total": len(blobs),
        "source_files": len(source),
        "source_bytes": sum(int(item.get("size") or 0) for item in source),
        "test_files": len(tests),
        "test_bytes": sum(int(item.get("size") or 0) for item in tests),
        "workflow_files": len(workflows),
        "machine_files": len(machine),
        "has_readme": "README.md" in paths,
        "has_issue_contract": "ISSUE_CONTRACT.md" in paths,
        "has_quality_contract": "QUALITY.md" in paths,
        "has_excellence_state": STATE_PATH in paths,
        "has_target_contract": "machine/target-contract.json" in paths,
        "has_proof_receipt": "machine/proof_receipt.json" in paths,
        "has_operability_receipt": "machine/operability_receipt.json" in paths,
        "has_canonical_position": "machine/canonical-position.json" in paths,
    }


def inspect_repository(
    item: dict[str, str],
    machine: dict[str, Any],
    policy: dict[str, Any],
    token: str | None,
) -> dict[str, Any]:
    repo = item["repository"]
    record: dict[str, Any] = {
        "company": item["company"],
        "repository": repo,
        "inspection_status": "OK",
    }
    try:
        meta = api_get(f"{API}/repos/{repo}", token)
        default_branch = meta["default_branch"]
        branch = api_get(
            f"{API}/repos/{repo}/branches/{urllib.parse.quote(default_branch, safe='')}", token
        )
        head_sha = branch["commit"]["sha"]
        tree_sha = branch["commit"]["commit"]["tree"]["sha"]
        tree_payload = api_get(f"{API}/repos/{repo}/git/trees/{tree_sha}?recursive=1", token)
        observed = observe_tree(tree_payload.get("tree", []))
        state = None
        state_blob = None
        if observed["has_excellence_state"]:
            state, state_blob = fetch_json_file(repo, STATE_PATH, head_sha, token)
        analysis = analyze_state(state, machine, policy)
        record.update(
            {
                "default_branch": default_branch,
                "head_sha": head_sha,
                "tree_sha": tree_sha,
                "tree_truncated": bool(tree_payload.get("truncated")),
                "observed": observed,
                "state_blob_sha": state_blob,
                "state": analysis,
            }
        )
    except Exception as exc:  # preserve the whole roster even when one repo fails
        record.update(
            {
                "inspection_status": "ERROR",
                "error": str(exc),
                "state": {
                    "state_status": "UNKNOWN",
                    "declared_principal_state": None,
                    "effective_principal_state": "DISCOVERED",
                    "prerequisite_errors": [],
                    "disposition_errors": [],
                    "state_valid": False,
                    "next_failing_gate": machine["stage_gates"][machine["principal_states"][1]],
                    "next_action_class": "RETRY_INSPECTION",
                },
            }
        )
    return record


def summarize(records: list[dict[str, Any]]) -> dict[str, Any]:
    status = Counter(record["inspection_status"] for record in records)
    state_status = Counter(record["state"]["state_status"] for record in records)
    effective = Counter(record["state"]["effective_principal_state"] for record in records)
    next_gates = Counter(record["state"].get("next_failing_gate") or "NONE" for record in records)
    actions = Counter(record["state"]["next_action_class"] for record in records)
    valid = sum(1 for record in records if record["state"].get("state_valid") is True)
    return {
        "repositories": len(records),
        "inspection_status": dict(sorted(status.items())),
        "state_status": dict(sorted(state_status.items())),
        "state_valid": valid,
        "state_invalid_or_missing": len(records) - valid,
        "effective_principal_states": dict(sorted(effective.items())),
        "next_failing_gates": dict(sorted(next_gates.items())),
        "next_action_classes": dict(sorted(actions.items())),
    }


def build_registry(catalog_path: Path, token: str | None) -> dict[str, Any]:
    roster = load_roster(catalog_path)
    monolith_sha, machine, machine_blob, policy, policy_blob = fetch_monolith_authority(token)
    records = [inspect_repository(item, machine, policy, token) for item in roster]
    records.sort(key=lambda row: (row["company"], row["repository"]))
    return {
        "schema": "glaciereq.excellence-live-registry.v1",
        "generated_at": utc_now(),
        "scope": {
            "source_catalog": str(catalog_path.relative_to(ROOT)),
            "source_catalog_blob_sha": "11801654336e25e9b451255a1475000cdc62015b",
            "roster_rule": "updates[].added only",
            "expected_repositories": 37,
            "job_application_source_sha": os.environ.get("GITHUB_SHA"),
        },
        "authority": {
            "repository": MONOLITH,
            "head_sha": monolith_sha,
            "state_machine_path": "catalog/repo_excellence_state_machine.json",
            "state_machine_blob_sha": machine_blob,
            "disposition_policy_path": "catalog/repo_excellence_disposition_policy.json",
            "disposition_policy_blob_sha": policy_blob,
            "state_machine_version": machine.get("version"),
            "disposition_policy_version": policy.get("version"),
        },
        "summary": summarize(records),
        "repositories": records,
    }


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--catalog", type=Path, default=DEFAULT_CATALOG)
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT)
    args = parser.parse_args()
    token = os.environ.get("GH_TOKEN") or os.environ.get("GITHUB_TOKEN")
    registry = build_registry(args.catalog, token)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(registry, indent=2, sort_keys=False) + "\n", encoding="utf-8")
    summary = registry["summary"]
    print(
        "excellence-registry: "
        f"repos={summary['repositories']} "
        f"valid={summary['state_valid']} "
        f"needs_work={summary['state_invalid_or_missing']} "
        f"monolith={registry['authority']['head_sha']}"
    )
    return 0 if summary["inspection_status"].get("ERROR", 0) == 0 else 2


if __name__ == "__main__":
    raise SystemExit(main())

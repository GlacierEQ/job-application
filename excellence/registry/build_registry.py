#!/usr/bin/env python3
"""Build the live company-repository excellence registry.

The roster is sourced from the existing multi-repo catalog, but the registry is an
engineering control artifact outside the site projection. Live repository state is
read from GitHub at exact heads. The non-secret Repository Excellence contract is
read from public AKOS, which records the exact private Monolith source authority it
projects. This keeps public census execution credential-minimal without weakening
provenance or copying private runtime material.

This script is read-only with respect to the inspected repositories.
"""

from __future__ import annotations

import argparse
import base64
import json
import os
import time
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
PUBLIC_AUTHORITY_REPO = "GlacierEQ/AKOS"
PUBLIC_CONTRACT_PATH = "governance/glaciereq.repo-excellence-public-contract.v1.json"
STATE_PATH = "machine/excellence-state.json"
TARGET_CONTRACT_PATH = "machine/target-contract.json"
TARGET_CONTRACT_SCHEMA = "glaciereq.repo-target-contract.v1"


def utc_now() -> str:
    return (
        datetime.now(timezone.utc)
        .replace(microsecond=0)
        .isoformat()
        .replace("+00:00", "Z")
    )


def api_get(url: str, token: str | None = None) -> Any:
    headers = {
        "Accept": "application/vnd.github+json",
        "User-Agent": "GlacierEQ-excellence-registry/1.0",
        "X-GitHub-Api-Version": "2022-11-28",
    }
    if token:
        headers["Authorization"] = f"Bearer {token}"
    request = urllib.request.Request(url, headers=headers)
    for attempt in range(3):
        try:
            with urllib.request.urlopen(request, timeout=30) as response:
                return json.load(response)
        except urllib.error.HTTPError as exc:
            body = exc.read().decode("utf-8", errors="replace")[:400]
            retryable = exc.code in {429, 500, 502, 503, 504}
            if not retryable or attempt == 2:
                raise RuntimeError(f"GitHub API {exc.code} for {url}: {body}") from exc
        except urllib.error.URLError as exc:
            if attempt == 2:
                raise RuntimeError(
                    f"GitHub transport failure for {url}: {exc.reason}"
                ) from exc
        time.sleep(0.25 * (2**attempt))
    raise AssertionError("unreachable GitHub request retry state")


def decode_content(payload: dict[str, Any]) -> str:
    if payload.get("encoding") != "base64":
        raise ValueError(
            f"unexpected GitHub content encoding: {payload.get('encoding')!r}"
        )
    return base64.b64decode(payload["content"]).decode("utf-8")


def fetch_json_file(
    repo: str, path: str, ref: str, token: str | None
) -> tuple[dict[str, Any], str]:
    encoded = urllib.parse.quote(path, safe="/")
    payload = api_get(
        f"{API}/repos/{repo}/contents/{encoded}?ref={urllib.parse.quote(ref, safe='')}",
        token,
    )
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
        raise ValueError(
            f"catalog declares {expected} created repos but updates enumerate {len(roster)}"
        )
    names = [item["repository"] for item in roster]
    if len(names) != len(set(names)):
        raise ValueError("duplicate repository in excellence roster")
    return roster


def fetch_public_authority(token: str | None) -> tuple[str, str, dict[str, Any]]:
    branch = api_get(f"{API}/repos/{PUBLIC_AUTHORITY_REPO}/branches/main", token)
    public_sha = branch["commit"]["sha"]
    contract, contract_blob = fetch_json_file(
        PUBLIC_AUTHORITY_REPO, PUBLIC_CONTRACT_PATH, public_sha, token
    )
    if contract.get("schema") != "glaciereq.repo-excellence-public-contract.v1":
        raise ValueError("unexpected Repo Excellence public-contract schema")
    if contract.get("source_authority", {}).get("repository") != "GlacierEQ/monolith":
        raise ValueError("public contract lost private Monolith source authority")
    return public_sha, contract_blob, contract


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


def target_contract_required(
    state: dict[str, Any] | None, machine: dict[str, Any]
) -> bool:
    if state is None:
        return False
    states = machine["principal_states"]
    declared = state.get("principal_state")
    if declared not in states or "TARGET_CONTRACTED" not in states:
        return False
    return states.index(declared) >= states.index("TARGET_CONTRACTED")


def analyze_target_contract(
    target: dict[str, Any] | None,
    repository: str,
    *,
    required: bool,
    load_error: str | None = None,
) -> dict[str, Any]:
    errors: list[str] = []
    if load_error is not None:
        errors.append(f"target contract unreadable: {load_error}")
        status = "INVALID"
    elif target is None:
        status = "MISSING"
        if required:
            errors.append("required target contract missing")
    else:
        status = "PRESENT"
        if target.get("schema") != TARGET_CONTRACT_SCHEMA:
            errors.append(
                f"unexpected target contract schema: {target.get('schema')!r}"
            )
        identity = target.get("identity")
        if not isinstance(identity, dict):
            errors.append("target contract identity must be an object")
        elif identity.get("repository_id") != repository:
            errors.append(
                "target contract repository identity mismatch: "
                f"{identity.get('repository_id')!r} != {repository!r}"
            )
        if errors:
            status = "INVALID"
    return {
        "status": status,
        "required": required,
        "valid": not errors,
        "errors": errors,
    }


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
            "target_contract_errors": [],
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

        reason_needs_equivalence = reason in set(
            policy.get("equivalence_required_reason_codes", [])
        )
        action_needs_equivalence = state.get("novelty_action") in set(
            policy.get("equivalence_required_actions", [])
        )
        if reason_needs_equivalence or action_needs_equivalence:
            for field in policy.get("equivalence_fields", []):
                if evidence.get(field) is not True:
                    disposition_errors.append(f"{field} must be true")
            successor = evidence.get("successor_repository")
            if not isinstance(successor, str) or not successor.strip():
                disposition_errors.append("successor_repository required")

    valid = not errors and not disposition_errors
    if not valid and action not in {"INITIALIZE_STATE", "REPAIR_STATE"}:
        action = "REPAIR_STATE"

    return {
        "state_status": "PRESENT",
        "declared_principal_state": declared,
        "effective_principal_state": effective,
        "prerequisite_errors": errors,
        "disposition_errors": disposition_errors,
        "target_contract_errors": [],
        "state_valid": valid,
        "next_failing_gate": next_gate,
        "next_action_class": action,
    }


def apply_target_contract_gate(
    analysis: dict[str, Any],
    target_analysis: dict[str, Any],
    machine: dict[str, Any],
) -> dict[str, Any]:
    updated = dict(analysis)
    contract_errors = list(target_analysis.get("errors") or [])
    updated["target_contract_errors"] = contract_errors
    if not contract_errors:
        return updated

    updated["state_valid"] = False
    updated["next_failing_gate"] = "TARGET_CONTRACT_FROZEN"
    updated["next_action_class"] = "REPAIR_STATE"
    prerequisites = list(updated.get("prerequisite_errors") or [])
    prerequisites.extend(
        f"TARGET_CONTRACT_FROZEN: {error}" for error in contract_errors
    )
    updated["prerequisite_errors"] = prerequisites

    states = machine["principal_states"]
    effective = updated.get("effective_principal_state")
    if (
        effective in states
        and "TARGET_CONTRACTED" in states
        and states.index(effective) >= states.index("TARGET_CONTRACTED")
    ):
        updated["effective_principal_state"] = "PROBLEM_VERIFIED"
    return updated


def observe_tree(tree: list[dict[str, Any]]) -> dict[str, Any]:
    blobs = [item for item in tree if item.get("type") == "blob"]
    paths = {item["path"] for item in blobs}
    source = [
        item
        for item in blobs
        if item["path"].startswith(("src/", "go/", "server/", "lib/"))
        and not item["path"].endswith(
            ("_test.go", ".test.js", ".test.ts", ".spec.js", ".spec.ts")
        )
    ]
    tests = [
        item
        for item in blobs
        if item["path"].startswith("tests/")
        or item["path"].endswith(
            ("_test.go", ".test.js", ".test.ts", ".spec.js", ".spec.ts")
        )
    ]
    workflows = [
        item for item in blobs if item["path"].startswith(".github/workflows/")
    ]
    machine_files = [item for item in blobs if item["path"].startswith("machine/")]
    return {
        "files_total": len(blobs),
        "source_files": len(source),
        "source_bytes": sum(int(item.get("size") or 0) for item in source),
        "test_files": len(tests),
        "test_bytes": sum(int(item.get("size") or 0) for item in tests),
        "workflow_files": len(workflows),
        "machine_files": len(machine_files),
        "has_readme": "README.md" in paths,
        "has_issue_contract": "ISSUE_CONTRACT.md" in paths,
        "has_quality_contract": "QUALITY.md" in paths,
        "has_excellence_state": STATE_PATH in paths,
        "has_target_contract": TARGET_CONTRACT_PATH in paths,
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
            f"{API}/repos/{repo}/branches/{urllib.parse.quote(default_branch, safe='')}",
            token,
        )
        head_sha = branch["commit"]["sha"]
        tree_sha = branch["commit"]["commit"]["tree"]["sha"]
        tree_payload = api_get(
            f"{API}/repos/{repo}/git/trees/{tree_sha}?recursive=1", token
        )
        observed = observe_tree(tree_payload.get("tree", []))

        state = None
        state_blob = None
        if observed["has_excellence_state"]:
            state, state_blob = fetch_json_file(repo, STATE_PATH, head_sha, token)
        analysis = analyze_state(state, machine, policy)

        target = None
        target_blob = None
        target_load_error = None
        if observed["has_target_contract"]:
            try:
                target, target_blob = fetch_json_file(
                    repo, TARGET_CONTRACT_PATH, head_sha, token
                )
            except (UnicodeDecodeError, ValueError) as exc:
                target_load_error = str(exc)
        target_analysis = analyze_target_contract(
            target,
            repo,
            required=target_contract_required(state, machine),
            load_error=target_load_error,
        )
        analysis = apply_target_contract_gate(analysis, target_analysis, machine)

        record.update(
            {
                "default_branch": default_branch,
                "head_sha": head_sha,
                "tree_sha": tree_sha,
                "tree_truncated": bool(tree_payload.get("truncated")),
                "observed": observed,
                "state_blob_sha": state_blob,
                "target_contract_blob_sha": target_blob,
                "target_contract": target_analysis,
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
                    "target_contract_errors": [],
                    "state_valid": False,
                    "next_failing_gate": machine["stage_gates"][
                        machine["principal_states"][1]
                    ],
                    "next_action_class": "RETRY_INSPECTION",
                },
            }
        )
    return record


def summarize(records: list[dict[str, Any]]) -> dict[str, Any]:
    status = Counter(record["inspection_status"] for record in records)
    state_status = Counter(record["state"]["state_status"] for record in records)
    effective = Counter(
        record["state"]["effective_principal_state"] for record in records
    )
    next_gates = Counter(
        record["state"].get("next_failing_gate") or "NONE" for record in records
    )
    actions = Counter(record["state"]["next_action_class"] for record in records)
    target_status = Counter(
        record.get("target_contract", {}).get("status", "UNKNOWN") for record in records
    )
    valid = sum(1 for record in records if record["state"].get("state_valid") is True)
    target_invalid = sum(
        1
        for record in records
        if record.get("target_contract", {}).get("valid") is False
    )
    return {
        "repositories": len(records),
        "inspection_status": dict(sorted(status.items())),
        "state_status": dict(sorted(state_status.items())),
        "state_valid": valid,
        "state_invalid_or_missing": len(records) - valid,
        "effective_principal_states": dict(sorted(effective.items())),
        "next_failing_gates": dict(sorted(next_gates.items())),
        "next_action_classes": dict(sorted(actions.items())),
        "target_contract_status": dict(sorted(target_status.items())),
        "target_contract_invalid": target_invalid,
    }


def build_registry(catalog_path: Path, token: str | None) -> dict[str, Any]:
    roster = load_roster(catalog_path)
    public_sha, contract_blob, contract = fetch_public_authority(token)
    machine = contract["state_machine"]
    policy = contract["disposition_policy"]
    records = [inspect_repository(item, machine, policy, token) for item in roster]
    records.sort(key=lambda row: (row["company"], row["repository"]))
    source = contract["source_authority"]
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
            "public_projection_repository": PUBLIC_AUTHORITY_REPO,
            "public_projection_head_sha": public_sha,
            "public_contract_path": PUBLIC_CONTRACT_PATH,
            "public_contract_blob_sha": contract_blob,
            "source_repository": source["repository"],
            "source_head_sha": source["head_sha"],
            "state_machine_path": source["state_machine_path"],
            "state_machine_version": source["state_machine_version"],
            "disposition_policy_path": source["disposition_policy_path"],
            "disposition_policy_blob_sha": source.get("disposition_policy_blob_sha"),
            "disposition_policy_version": source["disposition_policy_version"],
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
    args.output.write_text(
        json.dumps(registry, indent=2, sort_keys=False) + "\n", encoding="utf-8"
    )
    summary = registry["summary"]
    print(
        "excellence-registry: "
        f"repos={summary['repositories']} "
        f"valid={summary['state_valid']} "
        f"needs_work={summary['state_invalid_or_missing']} "
        f"target_contract_invalid={summary['target_contract_invalid']} "
        f"public_authority={registry['authority']['public_projection_head_sha']} "
        f"monolith_source={registry['authority']['source_head_sha']}"
    )
    return 0 if summary["inspection_status"].get("ERROR", 0) == 0 else 2


if __name__ == "__main__":
    raise SystemExit(main())

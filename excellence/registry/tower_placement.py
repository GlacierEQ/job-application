#!/usr/bin/env python3
"""Exact-revision Tower placement authority for material repository evolution.

Tower decides technology placement; Repo Excellence decides scheduling and state.
A placement receipt is prospective: existing EVOLVING state remains valid, but the
next material evolution is not executable until its exact cursor has a valid Tower
placement decision bound to one immutable Tower authority revision.
"""

from __future__ import annotations

import urllib.parse
from typing import Any

import build_registry

TOWER_REPO = "GlacierEQ/the-tower-of-babel"
TOWER_AUTHORITY_COMMIT = "fab6abe811ea20d60d4a7fa9c2063093aac24475"
CONTRACT_PATH = "governance/evolution-placement-contract.v1.json"
REGISTRY_PATH = "registry/tower.yml"
CATALOG_PATH = "generated/smithery.registry.json"
QUALITY_PATH = "QUALITY_CONTRACT.md"
PLACEMENT_PATH = "machine/tower-placement.json"
PLACEMENT_SCHEMA = "glaciereq.tower-placement.v1"
CONTRACT_SCHEMA = "glaciereq.tower-evolution-placement-contract.v1"
EXPECTED_BLOBS = {
    CONTRACT_PATH: "c009635ba4d126f9d23855367ea0d93ab7a9741d",
    REGISTRY_PATH: "f43c2a434aa7d4ad5441a0fdbe8245cc07ed6fdf",
    CATALOG_PATH: "9290f0fe88a4c4c1126005468c12aa6a62203cdd",
    QUALITY_PATH: "952c6d4dcd06bc832ff0d015923f88876ed404a2",
}


def _fetch_text_file(
    repo: str, path: str, ref: str, token: str | None
) -> tuple[str, str]:
    encoded = urllib.parse.quote(path, safe="/")
    payload = build_registry.api_get(
        f"{build_registry.API}/repos/{repo}/contents/{encoded}?ref={urllib.parse.quote(ref, safe='')}",
        token,
    )
    return build_registry.decode_content(payload), payload["sha"]


def _require_blob(path: str, observed: str) -> None:
    expected = EXPECTED_BLOBS[path]
    if observed != expected:
        raise ValueError(
            f"Tower authority blob drift for {path}: expected {expected}, got {observed}"
        )


def fetch_tower_authority(token: str | None) -> dict[str, Any]:
    """Load the exact canonical Tower placement authority, never floating main."""
    commit_sha = TOWER_AUTHORITY_COMMIT

    contract, contract_blob_sha = build_registry.fetch_json_file(
        TOWER_REPO, CONTRACT_PATH, commit_sha, token
    )
    _require_blob(CONTRACT_PATH, contract_blob_sha)

    registry, registry_blob_sha = build_registry.fetch_json_file(
        TOWER_REPO, REGISTRY_PATH, commit_sha, token
    )
    _require_blob(REGISTRY_PATH, registry_blob_sha)

    catalog, catalog_blob_sha = build_registry.fetch_json_file(
        TOWER_REPO, CATALOG_PATH, commit_sha, token
    )
    _require_blob(CATALOG_PATH, catalog_blob_sha)

    quality_text, quality_blob_sha = _fetch_text_file(
        TOWER_REPO, QUALITY_PATH, commit_sha, token
    )
    _require_blob(QUALITY_PATH, quality_blob_sha)

    if contract.get("schema") != CONTRACT_SCHEMA:
        raise ValueError("unexpected Tower evolution-placement contract schema")
    authority = contract.get("authority")
    if not isinstance(authority, dict) or authority.get("repository") != TOWER_REPO:
        raise ValueError("Tower placement contract lost Tower source authority")
    if authority.get("registry") != REGISTRY_PATH:
        raise ValueError("Tower placement contract lost canonical registry authority")
    if authority.get("technology_catalog") != CATALOG_PATH:
        raise ValueError("Tower placement contract lost generated technology catalog authority")
    if authority.get("quality_contract") != QUALITY_PATH:
        raise ValueError("Tower placement contract lost canonical quality authority")

    integration = contract.get("integration")
    if not isinstance(integration, dict):
        raise ValueError("Tower placement contract integration must be an object")
    if integration.get("consumer") != "GlacierEQ/job-application":
        raise ValueError("Tower placement contract lost job-application consumer identity")
    if integration.get("placement_receipt_path") != PLACEMENT_PATH:
        raise ValueError("Tower placement receipt path drift")
    if not integration.get("placement_required_before_material_evolution"):
        raise ValueError("Tower placement contract does not govern material evolution")
    if integration.get("retroactively_invalidates_existing_excellence_state") is not False:
        raise ValueError("Tower placement may not rewrite existing excellence history")

    if registry.get("tower_id") != "glaciereq.tower-of-babel.v1":
        raise ValueError("unexpected canonical Tower registry identity")
    if catalog.get("source") != REGISTRY_PATH:
        raise ValueError("Tower technology catalog is not bound to canonical registry")
    if "Polyglot quality semantics" not in quality_text:
        raise ValueError("Tower quality contract lost polyglot proof semantics")
    if "Structural presence is not compiler proof" not in quality_text:
        raise ValueError("Tower quality contract lost proof-ceiling semantics")

    capabilities = catalog.get("capabilities")
    if not isinstance(capabilities, list):
        raise ValueError("Tower technology catalog capabilities must be a list")
    technology_ids = sorted(
        item.split(":", 1)[1].casefold()
        for item in capabilities
        if isinstance(item, str)
        and item.startswith("technology:")
        and len(item) > len("technology:")
    )
    if not technology_ids:
        raise ValueError("Tower generated technology catalog is empty")

    return {
        "repository": TOWER_REPO,
        "commit_sha": commit_sha,
        "contract_path": CONTRACT_PATH,
        "contract_blob_sha": contract_blob_sha,
        "registry_path": REGISTRY_PATH,
        "registry_blob_sha": registry_blob_sha,
        "technology_catalog_path": CATALOG_PATH,
        "technology_catalog_blob_sha": catalog_blob_sha,
        "quality_contract_path": QUALITY_PATH,
        "quality_contract_blob_sha": quality_blob_sha,
        "contract": contract,
        "technology_ids": technology_ids,
    }


def fetch_placement(
    repository: str, ref: str, token: str | None
) -> tuple[dict[str, Any] | None, str | None]:
    try:
        return build_registry.fetch_json_file(repository, PLACEMENT_PATH, ref, token)
    except RuntimeError as exc:
        if "GitHub API 404" in str(exc):
            return None, None
        raise


def _substantive(value: Any, minimum: int = 8) -> bool:
    return isinstance(value, str) and len(value.strip()) >= minimum


def _technology_known(value: Any, authority: dict[str, Any]) -> bool:
    if not isinstance(value, str) or not value.strip():
        return False
    return value.casefold().strip() in set(authority["technology_ids"])


def analyze_placement(
    placement: dict[str, Any] | None,
    repository: str,
    evolution_cursor: str,
    authority: dict[str, Any],
) -> dict[str, Any]:
    errors: list[str] = []
    if placement is None:
        return {
            "status": "MISSING",
            "valid": False,
            "errors": ["Tower placement receipt missing for current evolution cursor"],
            "decision": None,
        }

    contract = authority["contract"]
    allowed_decisions = set(contract.get("decisions", []))
    allowed_tiers = set(contract.get("proof_tiers", []))
    required_fields = set(contract.get("required_receipt_fields", []))
    boundary_fields = set(contract.get("boundary_required_fields", []))

    if placement.get("schema") != PLACEMENT_SCHEMA:
        errors.append(f"unexpected Tower placement schema: {placement.get('schema')!r}")
    missing = sorted(required_fields - set(placement))
    if missing:
        errors.append("Tower placement missing fields: " + ", ".join(missing))
    if placement.get("repository") != repository:
        errors.append("Tower placement repository identity mismatch")
    if placement.get("evolution_cursor") != evolution_cursor:
        errors.append("Tower placement does not bind the current evolution cursor")

    bound = placement.get("tower_authority")
    if not isinstance(bound, dict):
        errors.append("tower_authority must be an object")
    else:
        expected = public_authority(authority)
        for key, value in expected.items():
            if bound.get(key) != value:
                errors.append(f"Tower placement authority mismatch: {key}")

    decision = placement.get("decision")
    if decision not in allowed_decisions:
        errors.append(f"Tower placement decision is not governed: {decision!r}")

    languages = placement.get("current_languages")
    if not isinstance(languages, list) or not languages or not all(
        isinstance(item, str) and item.strip() for item in languages
    ):
        errors.append("current_languages must be a non-empty string list")

    boundaries = placement.get("boundaries")
    if not isinstance(boundaries, list) or not boundaries:
        errors.append("Tower placement requires at least one architectural boundary")
        boundaries = []
    for index, boundary in enumerate(boundaries):
        label = f"boundaries[{index}]"
        if not isinstance(boundary, dict):
            errors.append(f"{label} must be an object")
            continue
        missing_boundary = sorted(boundary_fields - set(boundary))
        if missing_boundary:
            errors.append(f"{label} missing fields: " + ", ".join(missing_boundary))
            continue
        boundary_decision = boundary.get("decision")
        if boundary_decision not in allowed_decisions:
            errors.append(f"{label}.decision is not governed")
        incumbent = boundary.get("incumbent_technology")
        candidate = boundary.get("candidate_technology")
        if not _technology_known(incumbent, authority):
            errors.append(f"{label}.incumbent_technology is not in Tower registry")
        if not _technology_known(candidate, authority):
            errors.append(f"{label}.candidate_technology is not in Tower registry")
        if boundary_decision in {"ADD", "SPLIT", "EXPERIMENT"} and (
            isinstance(incumbent, str)
            and isinstance(candidate, str)
            and incumbent.casefold() == candidate.casefold()
        ):
            errors.append(f"{label} requires a distinct candidate technology")
        for field in (
            "responsibility",
            "activation_condition",
            "why_existing_boundary_is_insufficient",
            "interface_contract",
        ):
            if not _substantive(boundary.get(field), 12):
                errors.append(f"{label}.{field} must be substantive")
        if boundary.get("proof_tier") not in allowed_tiers:
            errors.append(f"{label}.proof_tier is not governed")
        parity_required = boundary.get("parity_required")
        if not isinstance(parity_required, bool):
            errors.append(f"{label}.parity_required must be boolean")
        elif parity_required and not _substantive(boundary.get("parity_contract"), 12):
            errors.append(f"{label}.parity_contract required for semantic overlap")

    if not _substantive(placement.get("diversity_value"), 20):
        errors.append("diversity_value must explain architectural value")
    nonclaims = placement.get("nonclaims")
    if not isinstance(nonclaims, list) or not nonclaims or not all(
        isinstance(item, str) and item.strip() for item in nonclaims
    ):
        errors.append("nonclaims must be a non-empty string list")

    return {
        "status": "VALID" if not errors else "INVALID",
        "valid": not errors,
        "errors": errors,
        "decision": decision,
    }


def public_authority(authority: dict[str, Any]) -> dict[str, Any]:
    return {
        key: authority[key]
        for key in (
            "repository",
            "commit_sha",
            "contract_path",
            "contract_blob_sha",
            "registry_path",
            "registry_blob_sha",
            "technology_catalog_path",
            "technology_catalog_blob_sha",
            "quality_contract_path",
            "quality_contract_blob_sha",
        )
    }

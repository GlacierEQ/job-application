"""Exact-revision Tower placement analysis for material repository evolution.

Tower is an engineering reference for technology and boundary placement. Repo
Excellence owns scheduling, and neither Tower nor a placement receipt may replace,
block, or narrow an Operator-directed material evolution cursor.

The historical Tower contract is still loaded at an exact revision for reproducible
analysis. Its former `placement_required_before_material_evolution` setting is
historical input only; this consumer does not grant it execution authority.
"""

from __future__ import annotations

import json
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
PLACEMENT_IS_ADVISORY = True
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
            f"Tower reference blob drift for {path}: expected {expected}, got {observed}"
        )


def fetch_tower_authority(token: str | None) -> dict[str, Any]:
    """Load the exact historical Tower placement reference for reproducible analysis."""
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

    _quality_text, quality_blob_sha = _fetch_text_file(
        TOWER_REPO, QUALITY_PATH, commit_sha, token
    )
    _require_blob(QUALITY_PATH, quality_blob_sha)

    if contract.get("schema") != CONTRACT_SCHEMA:
        raise ValueError("unexpected Tower evolution-placement contract schema")
    authority = contract.get("authority")
    if not isinstance(authority, dict) or authority.get("repository") != TOWER_REPO:
        raise ValueError("Tower placement contract lost Tower source identity")
    if authority.get("registry") != REGISTRY_PATH:
        raise ValueError("Tower placement contract lost registry reference")
    if authority.get("technology_catalog") != CATALOG_PATH:
        raise ValueError(
            "Tower placement contract lost generated technology catalog reference"
        )
    if authority.get("quality_contract") != QUALITY_PATH:
        raise ValueError("Tower placement contract lost quality reference")

    integration = contract.get("integration")
    if not isinstance(integration, dict):
        raise TypeError("Tower placement contract integration must be an object")
    if integration.get("consumer") != "GlacierEQ/job-application":
        raise ValueError(
            "Tower placement contract lost job-application consumer identity"
        )
    if integration.get("placement_receipt_path") != PLACEMENT_PATH:
        raise ValueError("Tower placement receipt path drift")
    # Deliberately do not enforce the historical
    # placement_required_before_material_evolution flag. Placement is advisory.
    if (
        integration.get("retroactively_invalidates_existing_excellence_state")
        is not False
    ):
        raise ValueError("Tower placement may not rewrite existing excellence history")

    if registry.get("tower_id") != "glaciereq.tower-of-babel.v1":
        raise ValueError("unexpected Tower registry identity")
    if catalog.get("source") != REGISTRY_PATH:
        raise ValueError("Tower technology catalog is not bound to its registry")

    capabilities = catalog.get("capabilities")
    if not isinstance(capabilities, list):
        raise TypeError("Tower technology catalog capabilities must be a list")
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
) -> tuple[Any | None, str | None]:
    try:
        return build_registry.fetch_json_file(repository, PLACEMENT_PATH, ref, token)
    except json.JSONDecodeError:
        return [], None
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
    placement: Any,
    repository: str,
    evolution_cursor: str,
    authority: dict[str, Any],
) -> dict[str, Any]:
    """Analyze placement quality without deciding whether evolution may execute."""
    errors: list[str] = []
    if placement is None:
        return {
            "status": "MISSING",
            "valid": False,
            "errors": ["Tower placement receipt missing for current evolution cursor"],
            "decision": None,
        }
    if not isinstance(placement, dict):
        return {
            "status": "INVALID",
            "valid": False,
            "errors": ["Tower placement receipt must be an object"],
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
                errors.append(f"Tower placement reference mismatch: {key}")

    decision = placement.get("decision")
    if decision not in allowed_decisions:
        errors.append(
            f"Tower placement decision is outside the reference contract: {decision!r}"
        )

    languages = placement.get("current_languages")
    if (
        not isinstance(languages, list)
        or not languages
        or not all(isinstance(item, str) and item.strip() for item in languages)
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
            errors.append(f"{label}.decision is outside the reference contract")
        incumbent = boundary.get("incumbent_technology")
        candidate = boundary.get("candidate_technology")
        if not _technology_known(incumbent, authority):
            errors.append(f"{label}.incumbent_technology is not in Tower registry")
        if not _technology_known(candidate, authority):
            errors.append(f"{label}.candidate_technology is not in Tower registry")
        if boundary_decision in {"ADD", "SPLIT", "EXPERIMENT"} and (
            isinstance(incumbent, str)
            and isinstance(candidate, str)
            and incumbent.strip().casefold() == candidate.strip().casefold()
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
            errors.append(f"{label}.proof_tier is outside the reference contract")
        parity_required = boundary.get("parity_required")
        if not isinstance(parity_required, bool):
            errors.append(f"{label}.parity_required must be boolean")
        elif parity_required and not _substantive(boundary.get("parity_contract"), 12):
            errors.append(f"{label}.parity_contract required for semantic overlap")

    if not _substantive(placement.get("diversity_value"), 20):
        errors.append("diversity_value must explain architectural value")
    nonclaims = placement.get("nonclaims")
    if (
        not isinstance(nonclaims, list)
        or not nonclaims
        or not all(isinstance(item, str) and item.strip() for item in nonclaims)
    ):
        errors.append("nonclaims must be a non-empty string list")

    return {
        "status": "VALID" if not errors else "INVALID",
        "valid": not errors,
        "errors": errors,
        "decision": decision,
        "blocking": False,
    }


def public_authority(authority: dict[str, Any]) -> dict[str, Any]:
    """Compatibility projection of the exact Tower reference identity."""
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

from __future__ import annotations

import importlib.util
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
REGISTRY_DIR = ROOT / "excellence" / "registry"
if str(REGISTRY_DIR) not in sys.path:
    sys.path.insert(0, str(REGISTRY_DIR))

import tower_placement

QUEUE_PATH = REGISTRY_DIR / "build_priority_queue.py"
spec = importlib.util.spec_from_file_location("tower_queue_under_test", QUEUE_PATH)
queue_module = importlib.util.module_from_spec(spec)
assert spec.loader is not None
spec.loader.exec_module(queue_module)


def authority():
    return {
        "repository": "GlacierEQ/the-tower-of-babel",
        "commit_sha": "a" * 40,
        "contract_path": "governance/evolution-placement-contract.v1.json",
        "contract_blob_sha": "contract-blob",
        "registry_path": "registry/tower.yml",
        "registry_blob_sha": "registry-blob",
        "technology_catalog_path": "generated/smithery.registry.json",
        "technology_catalog_blob_sha": "catalog-blob",
        "quality_contract_path": "QUALITY_CONTRACT.md",
        "quality_contract_blob_sha": "quality-blob",
        "technology_ids": ["python", "go", "rust"],
        "contract": {
            "decisions": ["KEEP", "ADD", "SPLIT", "EXPERIMENT"],
            "proof_tiers": ["A", "B", "C"],
            "required_receipt_fields": [
                "schema",
                "repository",
                "evolution_cursor",
                "tower_authority",
                "decision",
                "current_languages",
                "boundaries",
                "diversity_value",
                "nonclaims",
            ],
            "boundary_required_fields": [
                "responsibility",
                "decision",
                "incumbent_technology",
                "candidate_technology",
                "activation_condition",
                "why_existing_boundary_is_insufficient",
                "interface_contract",
                "proof_tier",
                "parity_required",
                "parity_contract",
            ],
        },
    }


def placement(*, cursor="next:material_work", decision="ADD", candidate="go"):
    auth = authority()
    return {
        "schema": "glaciereq.tower-placement.v1",
        "repository": "GlacierEQ/example",
        "evolution_cursor": cursor,
        "tower_authority": {
            "repository": auth["repository"],
            "commit_sha": auth["commit_sha"],
            "contract_path": auth["contract_path"],
            "contract_blob_sha": auth["contract_blob_sha"],
            "registry_path": auth["registry_path"],
            "registry_blob_sha": auth["registry_blob_sha"],
            "technology_catalog_path": auth["technology_catalog_path"],
            "technology_catalog_blob_sha": auth["technology_catalog_blob_sha"],
            "quality_contract_path": auth["quality_contract_path"],
            "quality_contract_blob_sha": auth["quality_contract_blob_sha"],
        },
        "decision": decision,
        "current_languages": ["python"],
        "boundaries": [
            {
                "responsibility": "concurrent bounded execution worker",
                "decision": decision,
                "incumbent_technology": "python",
                "candidate_technology": candidate,
                "activation_condition": "activate when concurrent worker semantics become material",
                "why_existing_boundary_is_insufficient": "the incumbent does not own the new concurrency boundary",
                "interface_contract": "stable JSON request and deterministic receipt parity",
                "proof_tier": "B",
                "parity_required": True,
                "parity_contract": "shared fixtures must produce equivalent decisions and receipts",
            }
        ],
        "diversity_value": "Go owns the bounded concurrent worker rather than duplicating Python for display.",
        "nonclaims": ["language count is not treated as engineering maturity"],
    }


def repo_record():
    return {
        "company": "example",
        "repository": "GlacierEQ/example",
        "head_sha": "head123",
        "inspection_status": "OK",
        "observed": {},
        "state": {
            "next_action_class": "EVOLVE",
            "next_failing_gate": None,
            "declared_principal_state": "EVOLVING",
            "effective_principal_state": "EVOLVING",
            "prerequisite_errors": [],
            "disposition_errors": [],
        },
    }


def registry():
    return {
        "generated_at": "2026-08-12T00:00:00Z",
        "authority": {"source": "test"},
        "repositories": [repo_record()],
    }


def fetch_state(repo, path, ref, token):
    return {
        "principal_state": "EVOLVING",
        "evolution_cursor": "next:material_work",
    }, "state-blob"


def test_valid_addition_requires_known_runtime_boundary_and_parity():
    result = tower_placement.analyze_placement(
        placement(), "GlacierEQ/example", "next:material_work", authority()
    )
    assert result == {
        "status": "VALID",
        "valid": True,
        "errors": [],
        "decision": "ADD",
    }


def test_missing_receipt_is_a_prospective_gate_not_state_corruption():
    result = tower_placement.analyze_placement(
        None, "GlacierEQ/example", "next:material_work", authority()
    )
    assert result["status"] == "MISSING"
    assert result["valid"] is False
    assert "missing" in result["errors"][0].lower()


def test_cosmetic_or_unknown_language_addition_fails_closed():
    bad = placement(candidate="madeuplang")
    bad["diversity_value"] = "add another language"
    result = tower_placement.analyze_placement(
        bad, "GlacierEQ/example", "next:material_work", authority()
    )
    assert result["valid"] is False
    assert any("not in Tower registry" in error for error in result["errors"])
    assert any("diversity_value" in error for error in result["errors"])


def test_semantic_overlap_cannot_drop_parity_contract():
    bad = placement()
    bad["boundaries"][0]["parity_contract"] = "none"
    result = tower_placement.analyze_placement(
        bad, "GlacierEQ/example", "next:material_work", authority()
    )
    assert result["valid"] is False
    assert any("parity_contract" in error for error in result["errors"])


def test_stale_cursor_or_stale_tower_semantic_authority_fails_closed():
    stale = placement(cursor="next:old_work")
    stale["tower_authority"]["technology_catalog_blob_sha"] = "old-catalog"
    result = tower_placement.analyze_placement(
        stale, "GlacierEQ/example", "next:material_work", authority()
    )
    assert result["valid"] is False
    assert any("current evolution cursor" in error for error in result["errors"])
    assert any("technology_catalog_blob_sha" in error for error in result["errors"])


def test_queue_routes_missing_placement_to_tower_before_evolution():
    out = queue_module.build_queue(
        registry(),
        fetch_state=fetch_state,
        fetch_tower_authority=lambda token: authority(),
        fetch_placement=lambda repo, ref, token: (None, None),
    )
    group = out["queue"][0]
    assert group["action"] == "TOWER_PLACE"
    assert group["gate"] == "TOWER_PLACEMENT"
    assert group["selection_policy"] == "least_successful_evolutions_first_then_repository"
    row = group["repositories"][0]
    assert row["evolution_cursor"] == "next:material_work"
    assert row["tower_placement_status"] == "MISSING"
    assert row["tower_placement_valid"] is False


def test_queue_allows_evolution_only_after_exact_valid_tower_receipt():
    out = queue_module.build_queue(
        registry(),
        fetch_state=fetch_state,
        fetch_tower_authority=lambda token: authority(),
        fetch_placement=lambda repo, ref, token: (placement(), "placement-blob"),
    )
    group = out["queue"][0]
    assert group["action"] == "EVOLVE"
    assert group["gate"] == "EVOLUTION_CURSOR"
    row = group["repositories"][0]
    assert row["tower_placement_decision"] == "ADD"
    assert row["tower_placement_blob_sha"] == "placement-blob"

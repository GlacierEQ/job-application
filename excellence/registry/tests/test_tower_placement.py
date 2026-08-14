from __future__ import annotations

import sys
import unittest
from pathlib import Path
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[3]
REGISTRY_DIR = ROOT / "excellence" / "registry"
if str(REGISTRY_DIR) not in sys.path:
    sys.path.insert(0, str(REGISTRY_DIR))

import tower_placement


def authority():
    return {
        "repository": tower_placement.TOWER_REPO,
        "commit_sha": tower_placement.TOWER_AUTHORITY_COMMIT,
        "contract_path": tower_placement.CONTRACT_PATH,
        "contract_blob_sha": tower_placement.EXPECTED_BLOBS[
            tower_placement.CONTRACT_PATH
        ],
        "registry_path": tower_placement.REGISTRY_PATH,
        "registry_blob_sha": tower_placement.EXPECTED_BLOBS[
            tower_placement.REGISTRY_PATH
        ],
        "technology_catalog_path": tower_placement.CATALOG_PATH,
        "technology_catalog_blob_sha": tower_placement.EXPECTED_BLOBS[
            tower_placement.CATALOG_PATH
        ],
        "quality_contract_path": tower_placement.QUALITY_PATH,
        "quality_contract_blob_sha": tower_placement.EXPECTED_BLOBS[
            tower_placement.QUALITY_PATH
        ],
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
        "schema": tower_placement.PLACEMENT_SCHEMA,
        "repository": "GlacierEQ/example",
        "evolution_cursor": cursor,
        "tower_authority": tower_placement.public_authority(auth),
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


class TowerPlacementTests(unittest.TestCase):
    def test_canonical_tower_pin_and_blob_contract_are_exact(self):
        self.assertEqual(
            tower_placement.TOWER_AUTHORITY_COMMIT,
            "fab6abe811ea20d60d4a7fa9c2063093aac24475",
        )
        self.assertEqual(
            tower_placement.EXPECTED_BLOBS,
            {
                "governance/evolution-placement-contract.v1.json": "c009635ba4d126f9d23855367ea0d93ab7a9741d",
                "registry/tower.yml": "f43c2a434aa7d4ad5441a0fdbe8245cc07ed6fdf",
                "generated/smithery.registry.json": "9290f0fe88a4c4c1126005468c12aa6a62203cdd",
                "QUALITY_CONTRACT.md": "952c6d4dcd06bc832ff0d015923f88876ed404a2",
            },
        )

    def test_fetch_authority_uses_only_exact_pinned_revision(self):
        calls = []
        contract = {
            "schema": tower_placement.CONTRACT_SCHEMA,
            "authority": {
                "repository": tower_placement.TOWER_REPO,
                "registry": tower_placement.REGISTRY_PATH,
                "technology_catalog": tower_placement.CATALOG_PATH,
                "quality_contract": tower_placement.QUALITY_PATH,
            },
            "integration": {
                "consumer": "GlacierEQ/job-application",
                "placement_receipt_path": tower_placement.PLACEMENT_PATH,
                "placement_required_before_material_evolution": True,
                "retroactively_invalidates_existing_excellence_state": False,
            },
        }
        registry = {"tower_id": "glaciereq.tower-of-babel.v1"}
        catalog = {
            "source": tower_placement.REGISTRY_PATH,
            "capabilities": ["technology:python", "technology:go", "technology:rust"],
        }

        def fake_json(repo, path, ref, token):
            calls.append((repo, path, ref))
            payloads = {
                tower_placement.CONTRACT_PATH: contract,
                tower_placement.REGISTRY_PATH: registry,
                tower_placement.CATALOG_PATH: catalog,
            }
            return payloads[path], tower_placement.EXPECTED_BLOBS[path]

        def fake_text(repo, path, ref, token):
            calls.append((repo, path, ref))
            return (
                "Polyglot quality semantics\nStructural presence is not compiler proof, and compiler proof is not production proof.",
                tower_placement.EXPECTED_BLOBS[path],
            )

        with (
            patch.object(
                tower_placement.build_registry, "fetch_json_file", side_effect=fake_json
            ),
            patch.object(tower_placement, "_fetch_text_file", side_effect=fake_text),
        ):
            observed = tower_placement.fetch_tower_authority("token")

        self.assertEqual(observed["commit_sha"], tower_placement.TOWER_AUTHORITY_COMMIT)
        self.assertEqual(observed["technology_ids"], ["go", "python", "rust"])
        self.assertEqual(len(calls), 4)
        for repo, _path, ref in calls:
            self.assertEqual(repo, tower_placement.TOWER_REPO)
            self.assertEqual(ref, tower_placement.TOWER_AUTHORITY_COMMIT)

    def test_authority_blob_drift_fails_closed(self):
        contract = {
            "schema": tower_placement.CONTRACT_SCHEMA,
            "authority": {
                "repository": tower_placement.TOWER_REPO,
                "registry": tower_placement.REGISTRY_PATH,
                "technology_catalog": tower_placement.CATALOG_PATH,
                "quality_contract": tower_placement.QUALITY_PATH,
            },
            "integration": {
                "consumer": "GlacierEQ/job-application",
                "placement_receipt_path": tower_placement.PLACEMENT_PATH,
                "placement_required_before_material_evolution": True,
                "retroactively_invalidates_existing_excellence_state": False,
            },
        }

        def fake_json(repo, path, ref, token):
            if path == tower_placement.CONTRACT_PATH:
                return contract, "0" * 40
            raise AssertionError("blob drift should fail on first authority artifact")

        with (
            patch.object(
                tower_placement.build_registry, "fetch_json_file", side_effect=fake_json
            ),
            self.assertRaisesRegex(ValueError, "authority blob drift"),
        ):
            tower_placement.fetch_tower_authority(None)

    def test_valid_addition_requires_known_runtime_boundary_and_parity(self):
        result = tower_placement.analyze_placement(
            placement(), "GlacierEQ/example", "next:material_work", authority()
        )
        self.assertEqual(
            result,
            {"status": "VALID", "valid": True, "errors": [], "decision": "ADD"},
        )

    def test_wrong_tower_commit_is_rejected_even_when_shape_is_valid(self):
        stale = placement()
        stale["tower_authority"]["commit_sha"] = "b" * 40
        result = tower_placement.analyze_placement(
            stale, "GlacierEQ/example", "next:material_work", authority()
        )
        self.assertFalse(result["valid"])
        self.assertIn(
            "Tower placement authority mismatch: commit_sha", result["errors"]
        )

    def test_stale_cursor_and_stale_catalog_authority_fail_closed(self):
        stale = placement(cursor="next:old_work")
        stale["tower_authority"]["technology_catalog_blob_sha"] = "old-catalog"
        result = tower_placement.analyze_placement(
            stale, "GlacierEQ/example", "next:material_work", authority()
        )
        self.assertFalse(result["valid"])
        self.assertTrue(
            any("current evolution cursor" in error for error in result["errors"])
        )
        self.assertTrue(
            any("technology_catalog_blob_sha" in error for error in result["errors"])
        )

    def test_unknown_runtime_or_missing_parity_fails_closed(self):
        bad = placement(candidate="madeuplang")
        bad["boundaries"][0]["parity_contract"] = "none"
        result = tower_placement.analyze_placement(
            bad, "GlacierEQ/example", "next:material_work", authority()
        )
        self.assertFalse(result["valid"])
        self.assertTrue(
            any("not in Tower registry" in error for error in result["errors"])
        )
        self.assertTrue(any("parity_contract" in error for error in result["errors"]))

    def test_missing_receipt_is_prospective_gate_not_state_corruption(self):
        result = tower_placement.analyze_placement(
            None, "GlacierEQ/example", "next:material_work", authority()
        )
        self.assertEqual(result["status"], "MISSING")
        self.assertFalse(result["valid"])
        self.assertIn("missing", result["errors"][0].lower())


if __name__ == "__main__":
    unittest.main()

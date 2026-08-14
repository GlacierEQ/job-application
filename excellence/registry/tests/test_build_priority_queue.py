import importlib.util
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
MODULE_PATH = ROOT / "excellence" / "registry" / "build_priority_queue.py"
spec = importlib.util.spec_from_file_location("build_priority_queue", MODULE_PATH)
build_priority_queue = importlib.util.module_from_spec(spec)
assert spec.loader is not None
spec.loader.exec_module(build_priority_queue)


def fake_authority():
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


def valid_placement(repository, cursor):
    authority = fake_authority()
    return {
        "schema": "glaciereq.tower-placement.v1",
        "repository": repository,
        "evolution_cursor": cursor,
        "tower_authority": build_priority_queue.tower_placement.public_authority(
            authority
        ),
        "decision": "KEEP",
        "current_languages": ["python"],
        "boundaries": [
            {
                "responsibility": "preserve the current deterministic execution boundary",
                "decision": "KEEP",
                "incumbent_technology": "python",
                "candidate_technology": "python",
                "activation_condition": "keep while the current responsibility and proof surface remain stable",
                "why_existing_boundary_is_insufficient": "it is not insufficient; adding another runtime would duplicate the same responsibility",
                "interface_contract": "retain the existing typed request and deterministic receipt interface",
                "proof_tier": "B",
                "parity_required": False,
                "parity_contract": "not applicable because the incumbent boundary remains authoritative",
            }
        ],
        "diversity_value": "Preserving Python avoids decorative runtime duplication while keeping the proven responsibility explicit.",
        "nonclaims": ["language count is not treated as engineering maturity"],
    }


def repo_record(
    repository="GlacierEQ/example",
    *,
    action="EVOLVE",
    gate=None,
    head="abc123",
):
    return {
        "company": repository.split("/", 1)[1].split("-", 1)[0],
        "repository": repository,
        "head_sha": head,
        "inspection_status": "OK",
        "observed": {"source_files": 1, "test_files": 1},
        "state": {
            "next_action_class": action,
            "next_failing_gate": gate,
            "declared_principal_state": "EVOLVING"
            if action == "EVOLVE"
            else "PROMOTED",
            "effective_principal_state": "EVOLVING"
            if action == "EVOLVE"
            else "PROMOTED",
            "prerequisite_errors": [],
            "disposition_errors": [],
        },
    }


def registry(*records):
    return {
        "schema": "glaciereq.excellence-live-registry.v1",
        "generated_at": "2026-08-11T00:00:00Z",
        "authority": {"source": "test"},
        "repositories": list(records),
    }


def governed_build(registry_data, **kwargs):
    fetch_tower_authority = kwargs.pop(
        "fetch_tower_authority", lambda token: fake_authority()
    )
    fetch_placement = kwargs.pop(
        "fetch_placement",
        lambda repository, ref, token: (
            valid_placement(repository, "next:material_work"),
            "placement-blob",
        ),
    )
    return build_priority_queue.build_queue(
        registry_data,
        fetch_tower_authority=fetch_tower_authority,
        fetch_placement=fetch_placement,
        **kwargs,
    )


class PriorityQueueTests(unittest.TestCase):
    def test_evolving_repo_uses_exact_head_cursor(self):
        calls = []

        def fetch_state(repo, path, ref, token):
            calls.append((repo, path, ref, token))
            return {
                "principal_state": "EVOLVING",
                "evolution_cursor": "next:material_work",
            }, "blob123"

        out = governed_build(
            registry(repo_record()), token="test-token", fetch_state=fetch_state
        )
        self.assertEqual(
            calls,
            [
                (
                    "GlacierEQ/example",
                    "machine/excellence-state.json",
                    "abc123",
                    "test-token",
                )
            ],
        )
        group = out["queue"][0]
        self.assertEqual(group["action"], "EVOLVE")
        self.assertEqual(group["gate"], "EVOLUTION_CURSOR")
        self.assertEqual(
            group["selection_policy"],
            "least_successful_evolutions_first_then_repository",
        )
        row = group["repositories"][0]
        self.assertEqual(row["evolution_cursor"], "next:material_work")
        self.assertEqual(row["next_material_action"], "material_work")
        self.assertEqual(row["evolution_state_blob_sha"], "blob123")
        self.assertEqual(row["evolution_generation"], 0)
        self.assertIsNone(row["last_consumed_cursor"])
        self.assertEqual(row["tower_placement_status"], "VALID")
        self.assertEqual(row["tower_placement_decision"], "KEEP")
        self.assertEqual(out["schema"], "glaciereq.excellence-priority-queue.v2")
        self.assertEqual(out["tower_authority"]["commit_sha"], "a" * 40)

    def test_least_evolved_repository_rotates_to_front(self):
        states = {
            "GlacierEQ/alpha": {
                "principal_state": "EVOLVING",
                "evolution_cursor": "next:alpha_second_pass",
                "evolution_history": [
                    {
                        "consumed_cursor": "next:alpha_first_pass",
                        "result": "PASS",
                        "receipt": "machine/evolution-receipts/alpha.json",
                    }
                ],
            },
            "GlacierEQ/beta": {
                "principal_state": "EVOLVING",
                "evolution_cursor": "next:beta_first_pass",
            },
        }

        def fetch_state(repo, path, ref, token):
            return states[repo], f"blob-{repo.rsplit('/', 1)[1]}"

        def fetch_placement(repo, ref, token):
            return valid_placement(
                repo, states[repo]["evolution_cursor"]
            ), f"placement-{repo}"

        out = governed_build(
            registry(
                repo_record("GlacierEQ/alpha", head="alpha-head"),
                repo_record("GlacierEQ/beta", head="beta-head"),
            ),
            fetch_state=fetch_state,
            fetch_placement=fetch_placement,
        )
        rows = out["queue"][0]["repositories"]
        self.assertEqual(
            [row["repository"] for row in rows],
            ["GlacierEQ/beta", "GlacierEQ/alpha"],
        )
        self.assertEqual(rows[0]["evolution_generation"], 0)
        self.assertEqual(rows[1]["evolution_generation"], 1)
        self.assertEqual(rows[1]["last_consumed_cursor"], "next:alpha_first_pass")
        self.assertEqual(
            rows[1]["last_evolution_receipt"],
            "machine/evolution-receipts/alpha.json",
        )

    def test_only_successful_consumptions_advance_fairness_generation(self):
        def fetch_state(repo, path, ref, token):
            return {
                "principal_state": "EVOLVING",
                "evolution_cursor": "next:material_work",
                "evolution_history": [
                    {"consumed_cursor": "next:failed_attempt", "result": "FAIL"}
                ],
            }, "blob"

        out = governed_build(registry(repo_record()), fetch_state=fetch_state)
        self.assertEqual(out["queue"][0]["repositories"][0]["evolution_generation"], 0)

    def test_malformed_successful_evolution_history_fails_closed(self):
        def fetch_state(repo, path, ref, token):
            return {
                "principal_state": "EVOLVING",
                "evolution_cursor": "next:material_work",
                "evolution_history": [{"result": "PASS"}],
            }, "blob"

        with self.assertRaisesRegex(ValueError, r"must bind a next:\* consumed_cursor"):
            governed_build(registry(repo_record()), fetch_state=fetch_state)

    def test_evolving_repo_without_material_cursor_fails_closed(self):
        def fetch_state(repo, path, ref, token):
            return {"principal_state": "EVOLVING", "evolution_cursor": ""}, "blob"

        with self.assertRaisesRegex(ValueError, "lacks evolution_cursor"):
            governed_build(registry(repo_record()), fetch_state=fetch_state)

    def test_queue_rejects_state_drift_at_exact_head(self):
        def fetch_state(repo, path, ref, token):
            return {
                "principal_state": "PROMOTED",
                "evolution_cursor": "next:material_work",
            }, "blob"

        with self.assertRaisesRegex(
            ValueError, "state changed during queue derivation"
        ):
            governed_build(registry(repo_record()), fetch_state=fetch_state)

    def test_missing_placement_routes_repo_to_tower_before_evolution(self):
        def fetch_state(repo, path, ref, token):
            return {
                "principal_state": "EVOLVING",
                "evolution_cursor": "next:material_work",
            }, "state-blob"

        out = governed_build(
            registry(repo_record()),
            fetch_state=fetch_state,
            fetch_placement=lambda repo, ref, token: (None, None),
        )
        group = out["queue"][0]
        self.assertEqual(group["action"], "TOWER_PLACE")
        self.assertEqual(group["gate"], "TOWER_PLACEMENT")
        self.assertEqual(
            group["selection_policy"],
            "least_successful_evolutions_first_then_repository",
        )
        row = group["repositories"][0]
        self.assertEqual(row["evolution_cursor"], "next:material_work")
        self.assertEqual(row["evolution_generation"], 0)
        self.assertEqual(row["tower_placement_status"], "MISSING")
        self.assertFalse(row["tower_placement_valid"])
        self.assertIsNone(row["tower_placement_decision"])
        self.assertTrue(row["tower_placement_errors"])

    def test_non_evolving_gate_does_not_fetch_state_or_tower(self):
        def fail_fetch(*args, **kwargs):
            raise AssertionError(
                "non-EVOLVING record should not fetch execution authority"
            )

        out = build_priority_queue.build_queue(
            registry(
                repo_record(
                    action="ADVANCE_GATE",
                    gate="CANONICAL_POSITION_RESOLVED",
                )
            ),
            fetch_state=fail_fetch,
            fetch_tower_authority=fail_fetch,
            fetch_placement=fail_fetch,
        )
        group = out["queue"][0]
        self.assertEqual(group["action"], "ADVANCE_GATE")
        self.assertEqual(group["gate"], "CANONICAL_POSITION_RESOLVED")
        self.assertEqual(group["selection_policy"], "repository")
        row = group["repositories"][0]
        self.assertIsNone(row["evolution_cursor"])
        self.assertIsNone(row["next_material_action"])
        self.assertIsNone(row["evolution_generation"])
        self.assertIsNone(row["tower_placement_status"])
        self.assertIsNone(out["tower_authority"])


if __name__ == "__main__":
    unittest.main()

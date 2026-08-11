import importlib.util
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
MODULE_PATH = ROOT / "excellence" / "registry" / "build_registry.py"
spec = importlib.util.spec_from_file_location("build_registry", MODULE_PATH)
build_registry = importlib.util.module_from_spec(spec)
assert spec.loader is not None
spec.loader.exec_module(build_registry)

MACHINE = {
    "principal_states": [
        "DISCOVERED",
        "IDENTITY_RESOLVED",
        "PROBLEM_VERIFIED",
        "TARGET_CONTRACTED",
        "SEEDED",
        "VERTICAL_SLICE",
        "IMPLEMENTED",
        "TESTED",
        "ADVERSARIAL_VERIFIED",
        "OPERABLE",
        "PROOF_REPRODUCED",
        "PROMOTED",
        "CANONICAL",
        "EVOLVING",
    ],
    "side_exits": [
        "BLOCKED",
        "EXPERIMENT",
        "REFERENCE",
        "SUPERSEDED",
        "RETIREMENT_READY",
        "QUARANTINE",
    ],
    "stage_gates": {
        "DISCOVERED": None,
        "IDENTITY_RESOLVED": "IDENTITY_RESOLVED",
        "PROBLEM_VERIFIED": "PROBLEM_VERIFIED",
        "TARGET_CONTRACTED": "TARGET_CONTRACT_FROZEN",
        "SEEDED": "DONOR_PLAN_RESOLVED",
        "VERTICAL_SLICE": "VERTICAL_SLICE_ALIVE",
        "IMPLEMENTED": "CENTRAL_MECHANISM_PRESENT",
        "TESTED": "DETERMINISTIC_PROOF_GREEN",
        "ADVERSARIAL_VERIFIED": "ADVERSARIAL_SURVIVAL",
        "OPERABLE": "OPERABLE_AND_OBSERVABLE",
        "PROOF_REPRODUCED": "PROOF_RECEIPT_BOUND",
        "PROMOTED": "AUTHORITY_BOUND",
        "CANONICAL": "CANONICAL_POSITION_RESOLVED",
        "EVOLVING": "EVOLUTION_CURSOR_DEFINED",
    },
}
POLICY = {
    "protected_side_exits": ["SUPERSEDED", "RETIREMENT_READY"],
    "protected_novelty_actions": ["DONOR_ONLY", "SUPERSEDE", "RETIRE"],
    "forbidden_reason_codes": ["SMALL_REPO", "PRESENTATION_SIMPLIFICATION"],
    "allowed_reason_codes": [
        "VERIFIED_EQUIVALENT_SUCCESSOR",
        "EXPLICIT_OPERATOR_RETIREMENT",
    ],
    "required_true_fields": [
        "unique_value_assessed",
        "unique_value_preserved",
        "lineage_preserved",
        "presentation_independent",
        "size_or_loc_not_dispositive",
    ],
}
REPOSITORY = "GlacierEQ/example-repo"


def state_at(principal):
    idx = MACHINE["principal_states"].index(principal)
    gates = {}
    for stage in MACHINE["principal_states"][1 : idx + 1]:
        gates[MACHINE["stage_gates"][stage]] = {"status": "PASS"}
    return {"principal_state": principal, "gates": gates, "history": []}


def valid_target(repository=REPOSITORY):
    return {
        "schema": "glaciereq.repo-target-contract.v1",
        "identity": {"repository_id": repository, "family": "elite-estate"},
        "current": {"state": "EVOLVING"},
    }


class RegistryTests(unittest.TestCase):
    def test_roster_is_exact_37_added_repositories(self):
        roster = build_registry.load_roster(
            ROOT / "site-v15" / "data" / "excellence-multi-repo-catalog.json"
        )
        self.assertEqual(len(roster), 37)
        self.assertEqual(len({row["repository"] for row in roster}), 37)
        self.assertIn(
            "GlacierEQ/waymo-uncertainty-lane-graph",
            {row["repository"] for row in roster},
        )
        self.assertNotIn(
            "GlacierEQ/openai-reasoning-kv-sentinel",
            {row["repository"] for row in roster},
        )

    def test_missing_state_starts_at_identity_gate(self):
        result = build_registry.analyze_state(None, MACHINE, POLICY)
        self.assertEqual(result["effective_principal_state"], "DISCOVERED")
        self.assertEqual(result["next_failing_gate"], "IDENTITY_RESOLVED")
        self.assertEqual(result["next_action_class"], "INITIALIZE_STATE")

    def test_promoted_state_cannot_outrun_target_contract(self):
        state = state_at("PROMOTED")
        state["gates"]["TARGET_CONTRACT_FROZEN"] = {"status": "PENDING"}
        result = build_registry.analyze_state(state, MACHINE, POLICY)
        self.assertFalse(result["state_valid"])
        self.assertEqual(result["effective_principal_state"], "PROBLEM_VERIFIED")
        self.assertEqual(result["next_failing_gate"], "TARGET_CONTRACT_FROZEN")
        self.assertEqual(result["next_action_class"], "REPAIR_STATE")

    def test_valid_promoted_state_points_to_canonical_position(self):
        result = build_registry.analyze_state(state_at("PROMOTED"), MACHINE, POLICY)
        self.assertTrue(result["state_valid"])
        self.assertEqual(result["effective_principal_state"], "PROMOTED")
        self.assertEqual(result["next_failing_gate"], "CANONICAL_POSITION_RESOLVED")
        self.assertEqual(result["next_action_class"], "ADVANCE_GATE")

    def test_evolving_state_has_evolution_action(self):
        result = build_registry.analyze_state(state_at("EVOLVING"), MACHINE, POLICY)
        self.assertTrue(result["state_valid"])
        self.assertIsNone(result["next_failing_gate"])
        self.assertEqual(result["next_action_class"], "EVOLVE")

    def test_target_contract_required_from_target_contracted_onward(self):
        self.assertFalse(
            build_registry.target_contract_required(
                state_at("PROBLEM_VERIFIED"), MACHINE
            )
        )
        self.assertTrue(
            build_registry.target_contract_required(
                state_at("TARGET_CONTRACTED"), MACHINE
            )
        )
        self.assertTrue(
            build_registry.target_contract_required(state_at("EVOLVING"), MACHINE)
        )

    def test_valid_target_contract_preserves_evolving_state(self):
        state = state_at("EVOLVING")
        target = build_registry.analyze_target_contract(
            valid_target(), REPOSITORY, required=True
        )
        analysis = build_registry.apply_target_contract_gate(
            build_registry.analyze_state(state, MACHINE, POLICY), target, MACHINE
        )
        self.assertTrue(target["valid"])
        self.assertEqual(target["status"], "PRESENT")
        self.assertTrue(analysis["state_valid"])
        self.assertEqual(analysis["effective_principal_state"], "EVOLVING")
        self.assertEqual(analysis["next_action_class"], "EVOLVE")

    def test_missing_required_target_contract_forces_repair(self):
        state = state_at("EVOLVING")
        target = build_registry.analyze_target_contract(None, REPOSITORY, required=True)
        analysis = build_registry.apply_target_contract_gate(
            build_registry.analyze_state(state, MACHINE, POLICY), target, MACHINE
        )
        self.assertFalse(target["valid"])
        self.assertEqual(target["status"], "MISSING")
        self.assertFalse(analysis["state_valid"])
        self.assertEqual(analysis["effective_principal_state"], "PROBLEM_VERIFIED")
        self.assertEqual(analysis["next_failing_gate"], "TARGET_CONTRACT_FROZEN")
        self.assertEqual(analysis["next_action_class"], "REPAIR_STATE")

    def test_unparseable_target_contract_forces_repair(self):
        target = build_registry.analyze_target_contract(
            None,
            REPOSITORY,
            required=True,
            load_error="JSONDecodeError: conflict marker at line 2",
        )
        analysis = build_registry.apply_target_contract_gate(
            build_registry.analyze_state(state_at("EVOLVING"), MACHINE, POLICY),
            target,
            MACHINE,
        )
        self.assertEqual(target["status"], "INVALID")
        self.assertFalse(target["valid"])
        self.assertIn("unreadable", target["errors"][0])
        self.assertFalse(analysis["state_valid"])
        self.assertEqual(analysis["next_failing_gate"], "TARGET_CONTRACT_FROZEN")

    def test_wrong_target_contract_schema_forces_repair(self):
        contract = valid_target()
        contract["schema"] = "glaciereq.wrong.v1"
        target = build_registry.analyze_target_contract(
            contract, REPOSITORY, required=True
        )
        self.assertFalse(target["valid"])
        self.assertEqual(target["status"], "INVALID")
        self.assertIn("unexpected target contract schema", target["errors"][0])

    def test_target_contract_repository_identity_must_match_exact_repo(self):
        target = build_registry.analyze_target_contract(
            valid_target("GlacierEQ/other-repo"), REPOSITORY, required=True
        )
        self.assertFalse(target["valid"])
        self.assertEqual(target["status"], "INVALID")
        self.assertTrue(
            any("repository identity mismatch" in error for error in target["errors"])
        )

    def test_present_invalid_contract_is_rejected_even_before_target_gate(self):
        contract = valid_target()
        contract["identity"] = None
        target = build_registry.analyze_target_contract(
            contract, REPOSITORY, required=False
        )
        self.assertFalse(target["valid"])
        self.assertEqual(target["status"], "INVALID")

    def test_protected_disposition_rejects_presentation_reason(self):
        state = {
            "principal_state": "RETIREMENT_READY",
            "gates": {},
            "history": [],
            "disposition_evidence": {
                "reason_code": "PRESENTATION_SIMPLIFICATION",
                "unique_value_assessed": True,
                "unique_value_preserved": True,
                "lineage_preserved": True,
                "presentation_independent": True,
                "size_or_loc_not_dispositive": True,
                "evidence_refs": ["receipt://x"],
            },
        }
        result = build_registry.analyze_state(state, MACHINE, POLICY)
        self.assertFalse(result["state_valid"])
        self.assertIn("forbidden disposition reason", result["disposition_errors"][0])

    def test_tree_observation_separates_source_tests_and_machine(self):
        tree = [
            {"type": "blob", "path": "README.md", "size": 10},
            {"type": "blob", "path": "ISSUE_CONTRACT.md", "size": 10},
            {"type": "blob", "path": "src/core.py", "size": 100},
            {"type": "blob", "path": "tests/test_core.py", "size": 50},
            {"type": "blob", "path": ".github/workflows/tests.yml", "size": 20},
            {"type": "blob", "path": "machine/excellence-state.json", "size": 30},
            {"type": "blob", "path": "machine/target-contract.json", "size": 40},
        ]
        observed = build_registry.observe_tree(tree)
        self.assertEqual(observed["source_files"], 1)
        self.assertEqual(observed["test_files"], 1)
        self.assertEqual(observed["workflow_files"], 1)
        self.assertTrue(observed["has_excellence_state"])
        self.assertTrue(observed["has_target_contract"])


if __name__ == "__main__":
    unittest.main()

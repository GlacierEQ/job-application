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


def state_at(principal):
    idx = MACHINE["principal_states"].index(principal)
    gates = {}
    for stage in MACHINE["principal_states"][1 : idx + 1]:
        gates[MACHINE["stage_gates"][stage]] = {"status": "PASS"}
    return {"principal_state": principal, "gates": gates, "history": []}


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
        ]
        observed = build_registry.observe_tree(tree)
        self.assertEqual(observed["source_files"], 1)
        self.assertEqual(observed["test_files"], 1)
        self.assertEqual(observed["workflow_files"], 1)
        self.assertTrue(observed["has_excellence_state"])


if __name__ == "__main__":
    unittest.main()

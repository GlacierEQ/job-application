import importlib.util
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
MODULE_PATH = ROOT / "excellence" / "registry" / "build_priority_queue.py"
spec = importlib.util.spec_from_file_location("build_priority_queue", MODULE_PATH)
build_priority_queue = importlib.util.module_from_spec(spec)
assert spec.loader is not None
spec.loader.exec_module(build_priority_queue)


def registry_record(
    *, action="EVOLVE", gate=None, head="abc123", repository="GlacierEQ/example"
):
    return {
        "schema": "glaciereq.excellence-live-registry.v1",
        "generated_at": "2026-08-11T00:00:00Z",
        "authority": {"source": "test"},
        "repositories": [
            {
                "company": "example",
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
        ],
    }


class PriorityQueueTests(unittest.TestCase):
    def test_evolving_repo_uses_exact_head_cursor(self):
        calls = []

        def fetch_state(repo, path, ref, token):
            calls.append((repo, path, ref, token))
            return {
                "principal_state": "EVOLVING",
                "evolution_cursor": "next:exercise_pair_integration",
            }, "blob123"

        out = build_priority_queue.build_queue(
            registry_record(), token="test-token", fetch_state=fetch_state
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
        row = group["repositories"][0]
        self.assertEqual(row["evolution_cursor"], "next:exercise_pair_integration")
        self.assertEqual(row["next_material_action"], "exercise_pair_integration")
        self.assertEqual(row["evolution_state_blob_sha"], "blob123")

    def test_evolving_repo_without_material_cursor_fails_closed(self):
        def fetch_state(repo, path, ref, token):
            return {"principal_state": "EVOLVING", "evolution_cursor": ""}, "blob"

        with self.assertRaisesRegex(ValueError, "lacks evolution_cursor"):
            build_priority_queue.build_queue(registry_record(), fetch_state=fetch_state)

    def test_queue_rejects_state_drift_at_exact_head(self):
        def fetch_state(repo, path, ref, token):
            return {
                "principal_state": "PROMOTED",
                "evolution_cursor": "next:should_not_be_used",
            }, "blob"

        with self.assertRaisesRegex(
            ValueError, "state changed during queue derivation"
        ):
            build_priority_queue.build_queue(registry_record(), fetch_state=fetch_state)

    def test_non_evolving_gate_does_not_fetch_state_again(self):
        def fail_fetch(*args, **kwargs):
            raise AssertionError("non-EVOLVING record should not refetch state")

        out = build_priority_queue.build_queue(
            registry_record(
                action="ADVANCE_GATE",
                gate="CANONICAL_POSITION_RESOLVED",
            ),
            fetch_state=fail_fetch,
        )
        group = out["queue"][0]
        self.assertEqual(group["action"], "ADVANCE_GATE")
        self.assertEqual(group["gate"], "CANONICAL_POSITION_RESOLVED")
        row = group["repositories"][0]
        self.assertIsNone(row["evolution_cursor"])
        self.assertIsNone(row["next_material_action"])


if __name__ == "__main__":
    unittest.main()

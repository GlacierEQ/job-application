# MACHINE INTEGRATION — GEQ.MAA/1

## Discover

Machine contract:

- `glaciereq/mission_assurance/v1/contract.proto`
- `machine/remedy.json`
- `proof/proof_manifest.json`

Executable reference:

- `src/mission_assurance/core.py`

## Connect

The reference package is library-first:

```python
from mission_assurance import EvidenceRef, MissionAssuranceGateway, Policy
```

Create a policy, then call `MissionAssuranceGateway.assess(...)` for an in-process JSON-object mapping or `MissionAssuranceGateway.assess_canonical_json(...)` at the protobuf/RPC boundary.

## Authenticate

**Not implemented in v0.1.0.** The caller identity boundary is an explicit aspiration gap.

A production adapter should supply authenticated workload identity before an action reaches the gateway. Content-bound evidence references are provenance, not caller authentication.

## Call — library object boundary

```python
snapshot = Path("evidence.json").read_bytes()
receipt = gateway.assess(
    action_id="stable-id",
    action="agent.integration.assess",
    payload={"component": "agentic-ai-integration"},
    evidence=[
        EvidenceRef(
            source_identity="https://public.example/evidence",
            source_ref="sha256:<digest-of-snapshot>",
            snapshot_content=snapshot,
        )
    ],
    current_metric=1.02,
    baseline_metric=1.0,
    executor=my_executor,
)
```

The mapping is normalized through strict canonical JSON before both hashing and execution. This removes differences such as integer-vs-string mapping keys at the executor boundary.

## Call — protobuf / RPC boundary

`AgentAction.canonical_payload_json` is a **string**, not arbitrary serialized bytes. It must already be the exact canonical JSON form accepted by the Python reference: sorted keys, compact separators, finite JSON numbers, and an object root.

```python
receipt = gateway.assess_canonical_json(
    action_id=request.action_id,
    action=request.action,
    canonical_payload_json=request.canonical_payload_json,
    evidence=decoded_evidence,
    current_metric=request.current_metric,
    baseline_metric=request.baseline_metric,
    executor=my_executor,
)
```

The adapter rejects valid-but-noncanonical JSON rather than silently giving different clients different request hashes. Both metric fields must be finite.

For `sha256:` evidence, `snapshot_content` is mandatory and the gateway hashes those exact bytes and compares them to the reference. `commit:` evidence must syntactically bind the named commit in `source_identity`.

## Verify

A consumer should verify:

1. `schema == glaciereq.mission-assurance-receipt.v1`;
2. `request_hash`, `policy_hash`, and `evidence_digest` are present;
3. `receipt_id` equals SHA-256 of the canonical receipt body without `receipt_id`;
4. decision is acceptable for the caller's policy;
5. evidence snapshots actually hash to their declared `sha256:` references;
6. the immutable Git commit used as the release/proof authority is independently pinned;
7. any outcome is independently bound to `outcome_hash`.

Run the project proof gate:

```bash
PYTHONPATH=src python scripts/verify_proof.py
```

The verifier uses a fixed governed-file set and fixed reproduced receipt ID. Helix promotion then provides the external immutable Git-commit anchor for the complete artifact set.

## Concurrency boundary

v0.1.0 serializes assessment under a re-entrant lock so duplicate `action_id` calls cannot race the executor within one process. This is **single-process exactly-once execution protection**, not distributed exactly-once semantics. Durable multi-instance state remains a Mesh aspiration.

## Extend

Adapters should be added around the deterministic core, not by weakening it:

- durable distributed idempotency store;
- workload-identity authorization;
- tamper-evident receipt store;
- telemetry/model-monitoring input;
- sandboxed executor;
- generated protobuf bindings;
- signed release attestations.

Each adapter should introduce its own failure-mode test and proof receipt before the public claim ceiling is raised.

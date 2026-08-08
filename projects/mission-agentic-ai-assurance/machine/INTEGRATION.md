# MACHINE INTEGRATION — GEQ.MAA/1

## Discover

Machine contract:

- `machine/contract.proto`
- `machine/remedy.json`
- `proof/proof_manifest.json`

Executable reference:

- `src/mission_assurance/core.py`

## Connect

The reference package is library-first:

```python
from mission_assurance import EvidenceRef, MissionAssuranceGateway, Policy
```

Create a policy, then call `MissionAssuranceGateway.assess(...)`.

## Authenticate

**Not implemented in v0.1.0.** The caller identity boundary is an explicit aspiration gap.

A production adapter should supply authenticated workload identity before an action reaches the gateway. Do not interpret immutable evidence references as caller authentication.

## Call

```python
receipt = gateway.assess(
    action_id="stable-id",
    action="agent.integration.assess",
    payload={"component": "agentic-ai-integration"},
    evidence=[EvidenceRef(
        source_identity="https://public.example/evidence",
        source_ref="sha256:<64-hex>",
    )],
    current_metric=1.02,
    baseline_metric=1.0,
    executor=my_executor,
)
```

## Verify

A consumer should verify:

1. `schema == glaciereq.mission-assurance-receipt.v1`;
2. `request_hash`, `policy_hash`, and `evidence_digest` are present;
3. `receipt_id` equals SHA-256 of the canonical receipt body without `receipt_id`;
4. decision is acceptable for the caller's policy;
5. immutable evidence references resolve to the intended pinned records;
6. any outcome is independently bound to `outcome_hash`.

Run the project proof gate:

```bash
PYTHONPATH=src python scripts/verify_proof.py
```

## Extend

Adapters should be added around the deterministic core, not by weakening it:

- durable idempotency store;
- workload-identity authorization;
- tamper-evident receipt store;
- telemetry/model-monitoring input;
- sandboxed executor;
- generated protobuf bindings;
- signed release attestations.

Each adapter should introduce its own failure-mode test and proof receipt before the public claim ceiling is raised.

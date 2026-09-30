# Agent Coordinator — Four-Surface Proof Projection

## Authority

- Canonical repository: `GlacierEQ/anthropic-agent-coordinator`
- Canonical branch: `master`
- Verification state: `VERIFIED_AT_TEST_EVIDENCE`
- Verified executable commit: `87438f57bdfd2cb380730cf51140611963d7c95b`
- Receipt: `receipts/wave-1-test-verification-2026-07-31.json`
- Verified runtime: Python 3.13.5
- Verified tests: 62 collected, 62 executed, 62 passed, 0 failures, 0 errors, 0 skips
- Evidence ceiling: `TEST`; no deployment, provider execution, hosted cross-version matrix, production-scale, fairness, latency, or reliability claim

This projection does not replace repository-native proof. It compresses one verified canonical system into four audience-specific views while preserving the same facts and limits.

## Recruiter surface

### Deterministic multi-agent scheduling under real constraints

Built a verified specialist-task coordinator that schedules dependent work only when prerequisites are complete and the full task estimate fits both a shared global token budget and aggregate role capacity.

What it demonstrates:

- deterministic dependency-aware orchestration;
- explicit ownership and scheduling waves;
- global and per-role resource ceilings;
- full-funding semantics instead of partial-work completion inflation;
- visible deferrals with machine-readable reasons;
- fail-fast rejection of malformed graphs and resource inputs;
- reproducible TEST evidence at an immutable executable commit.

**Defensible claim:** Built and verified a deterministic multi-agent scheduling system that preserves dependency integrity, shared-budget conservation, aggregate role limits, stable priority, and explicit non-completion states across 62 passing repository-native tests.

**Do not claim:** agent execution, provider calls, distributed execution, production deployment, utilization-optimal packing, inferred token estimates, or hosted cross-version proof.

## Master surface

### Problem

Agent orchestration becomes misleading when partial funding is treated as completion, prerequisites unlock before upstream work is actually complete, or deferred work disappears inside aggregate summaries.

### Mechanism

The coordinator accepts ordered task declarations with explicit role, token estimate, and dependency edges. It validates identity, dependency integrity, acyclicity, ordering, positive resource values, and supported roles before scheduling.

A task is assigned only when all of these hold:

1. every dependency exists;
2. the graph is acyclic;
3. every prerequisite was fully assigned in an earlier scheduling wave;
4. the complete task estimate fits the remaining global budget;
5. the complete task estimate fits remaining aggregate role capacity.

The system intentionally excludes partial execution. Supporting partial work would require checkpoint, continuation, retry, and evidence semantics rather than silently overloading `complete`.

### Failure and refusal semantics

Structured deferral reasons:

- `global_budget`
- `role_capacity`
- `dependency_not_completed`

Fail-fast conditions include duplicate IDs, unknown dependencies, cycles, malformed dependency collections, unsupported roles, and zero/negative/fractional/string/boolean resource values.

### Verified correctness properties

- unique task identity;
- referential integrity;
- acyclic dependency graph;
- ordered dependencies;
- positive resource constraints;
- immutable default capacities;
- full-funding completion semantics;
- aggregate role limits;
- global budget conservation;
- dependency safety;
- stable declaration-order priority;
- explicit non-completion records.

### Evidence behavior

The repository builds `glaciereq.agent-coordinator.test-receipt.v1` receipts from one bounded JUnit byte snapshot. The verifier rejects unsafe encodings, DTD/entity declarations, malformed or contradictory counts, failed tests, zero-test runs, and all-skipped runs. Counts and SHA-256 derive from the same snapshot, and receipt replacement is atomic.

### Architectural ceiling

This is a deterministic scheduler and evidence-bearing planning component, not a distributed executor, general solver, fairness optimizer, retry engine, checkpoint manager, or production orchestration service.

## Machine surface

```yaml
schema: glaciereq.proof-surface.v1
system_id: agent_coordinator
source:
  repository: GlacierEQ/anthropic-agent-coordinator
  branch: master
  verified_commit: 87438f57bdfd2cb380730cf51140611963d7c95b
  receipt: receipts/wave-1-test-verification-2026-07-31.json
status:
  state: VERIFIED
  evidence_level: TEST
  runtime: Python 3.13.5
  tests:
    collected: 62
    executed: 62
    passed: 62
    failures: 0
    errors: 0
    skipped: 0
verified_capabilities:
  - deterministic_dependency_aware_scheduling
  - full_funding_assignment_semantics
  - global_token_budget_conservation
  - aggregate_role_capacity_enforcement
  - stable_priority
  - explicit_structured_deferral
  - graph_and_resource_validation
  - sha256_bound_junit_evidence
inputs:
  - ordered_task_graph
  - positive_global_token_budget
  - optional_positive_role_capacity_overrides
  - stable_priority_policy
outputs:
  - deterministic_assignment_waves
  - structured_deferrals
  - blocking_dependencies
  - global_and_role_resource_accounting
blocked_scope:
  - hosted_python_3_11_3_12_3_13_matrix_execution
  - external_agent_execution
  - provider_calls
  - irreversible_external_actions
  - partial_task_continuation_without_checkpoint_contract
unverified_scope:
  - production_scale
  - distributed_execution
  - fairness
  - latency
  - reliability
  - deployment
claim_ceiling: verified_deterministic_scheduler_at_test_evidence
```

## Mesh surface

```text
Agent Coordinator
  TYPE: canonical verified system
  EVIDENCE: TEST @ 87438f57...
  PROVES:
    -> dependency-aware orchestration
    -> full-funding completion semantics
    -> shared budget conservation
    -> aggregate role capacity
    -> stable priority
    -> structured deferral
    -> fail-fast graph/resource validation
    -> bounded receipt generation

  REPRESENTED_BY -> Job-App Helix
    boundary: portfolio representation does not replace repository-native proof

  GOVERNED_BY -> AKOS
    boundary: authority/evidence/closure semantics are conceptual governance support;
              no runtime integration is claimed by this projection

  VERIFIED_BY -> repository-native tests + JUnit receipt
    62 executed / 62 passed / 0 failed / 0 errors / 0 skipped

  DOES_NOT_PROVE:
    -> external agent execution
    -> provider calls
    -> distributed runtime
    -> production deployment
    -> cross-version hosted verification
    -> scale, latency, fairness, reliability
```

## Projection rule

All four surfaces must preserve the same identity, verified commit, evidence level, test counts, blocked scope, and non-claims. Presentation depth may change; factual authority may not.

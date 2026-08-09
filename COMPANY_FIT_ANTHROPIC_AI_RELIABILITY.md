# Company Fit Projection — Anthropic AI Reliability

**Status:** EVIDENCE-BOUNDED COMPANY FIT — MULTI-DONOR  
**Company:** Anthropic  
**Target role:** Staff Software Engineer, AI Reliability / adjacent Agent Infrastructure and Applied AI roles  
**Company-study basis refreshed:** 2026-08-08  
**Portfolio proof refreshed:** 2026-08-09  
**Control-plane base:** `GlacierEQ/job-application@c55817c85799037f83a1d358ffeb85fd5b6f3353`  
**Truth boundary:** Independent GlacierEQ analysis; no Anthropic affiliation, endorsement, employment, proprietary access, provider execution, production deployment, Anthropic-scale reliability, or claim that GlacierEQ systems reproduce Anthropic internals.

## Current external bottleneck

Anthropic's current company-study record identifies **Staff Software Engineer, AI Reliability** as a target role and bounds the engineering pressure around long-running agents that must preserve useful state, recover cleanly across failures/context boundaries, expose failure rather than silently erase it, and operate under deterministic safeguards and bounded authority.

This cycle does not refresh the external research layer. It strengthens the internal proof mapping against the already-canonical company study.

**Bounded bottleneck statement:** Anthropic needs agent infrastructure that can make long-running, increasingly autonomous work **resumable, resource-bounded, failure-visible, provenance-aware, and controllable**. This projection addresses deterministic orchestration plus replay/idempotency/provenance control. It does not claim Anthropic runtime integration, production reliability, sandboxing, or model-safety research.

## Canonical company-study state advanced

The prior projection had one verified donor lane and explicitly deferred importing other continuity systems until an independent multi-repository capability cluster reconciled its proof ceilings.

That gate is now closed for the recovery/provenance evidence lane. The canonical portfolio contains `portfolio-proof/CAPABILITY_CLUSTER__IDEMPOTENT_RECOVERY_AND_PROVENANCE__2026-08-08.md` at status `BEHAVIOR_TESTED_MULTI_REPO_PATTERN`, with exact-revision behavioral receipts for Sigma Glue and ECHO plus a separately bounded AKOS equivalence proof. Runtime-recovery alignment remains open.

This materially strengthens the Anthropic fit from a single deterministic-scheduler donor to two complementary proof families:

1. deterministic dependency/resource governance from `anthropic-agent-coordinator`;
2. stable identity, idempotency/replay boundaries, provenance/integrity verification, and durable reconciliation evidence across independent canonical repositories.

No repository count is converted into an accomplishment count. The second family is treated as one repeated capability pattern.

## Strongest verified overlap

### 1. Deterministic dependency-aware orchestration — VERIFIED AT PINNED TEST EVIDENCE

Canonical donor: `GlacierEQ/anthropic-agent-coordinator`  
Verified executable commit: `87438f57bdfd2cb380730cf51140611963d7c95b`  
Receipt: `receipts/wave-1-test-verification-2026-07-31.json`  
Verified result: **62 collected / 62 executed / 62 passed / 0 failures / 0 errors / 0 skips**

Verified mechanisms:

- dependency-aware deterministic scheduling;
- prerequisite completion before downstream assignment;
- shared global token-budget conservation;
- aggregate per-role capacity enforcement;
- full-funding semantics rather than partial-completion inflation;
- stable declaration-order priority;
- explicit structured deferrals;
- fail-fast graph and resource validation;
- SHA-256-bound positive-count JUnit receipt behavior.

**Fit:** this covers the deterministic control plane around probabilistic workers: admission, ordering, resource governance, explicit non-completion, and machine-verifiable evidence.

### 2. Idempotent recovery + provenance-bound state — SIGMA GLUE + ECHO BEHAVIOR-TESTED; AKOS EQUIVALENCE-BOUNDED

Canonical proof object: `portfolio-proof/CAPABILITY_CLUSTER__IDEMPOTENT_RECOVERY_AND_PROVENANCE__2026-08-08.md`  
Status: `BEHAVIOR_TESTED_MULTI_REPO_PATTERN`

Repeated pattern:

**stable identity → bounded/idempotent execution → provenance/integrity verification → durable reconciliation evidence**

Independent canonical evidence:

- **Sigma Glue** — revision `4a1ca8e5c88a62e8a94a43213b2c509af6afcea3`; durable idempotency subject binds key, plan fingerprint, provider identity, and operation; mismatched key reuse fails closed; completion persists receipt/reconciliation summaries. Exact-revision `verify` workflow run `31279895318`, job `93159400700`, completed successfully with repository-native `npm test`.
- **ECHO** — revision `d87276166041d655452abd4e992a755565f9201c`; stable external identity, caller-supplied idempotency keys, integrity recomputation/quarantine, fail-closed unsupported capabilities, and chained attempt receipts. Exact-revision `ECHO CI` run `31139090677`, job `92744931046`, completed successfully across compile, correctness lint, dependency audit, behavioral tests, and CLI verification.
- **AKOS** — revision `d9aeb424f4d99da6026719e1e58793f6a89efd86`; deterministic identity/idempotency, immutable source-pointer promotion boundaries, deterministic evidence-manifest roots, and fingerprint-only secret quarantine, bounded by the canonical AKOS tree-equivalence receipt. AKOS production/provider behavior is not inferred from this cluster.

**Fit:** long-running agent infrastructure must distinguish first execution from retry/replay, preserve stable task identity, reject contradictory reuse, maintain provenance across state changes, and leave durable evidence for reconciliation. Sigma Glue and ECHO behavior-test that control pattern; AKOS contributes only bounded canonical-tree-equivalence evidence. This does not establish runtime-recovery behavior across the cluster.

### 3. Evidence-bearing failure semantics — VERIFIED ACROSS BOTH PROOF FAMILIES

The scheduler does not silently convert constrained work into success; invalid graphs/resources fail closed and unfunded work remains structured deferral. The recovery/provenance cluster similarly rejects mismatched idempotency reuse or integrity violations and preserves durable evidence boundaries.

**Fit:** the combined proof is stronger than either donor alone because it covers both **before execution** (admission/dependencies/resources) and **around repeated execution** (identity/replay/integrity/reconciliation).

## Partial overlap — do not inflate

### Long-horizon continuity

The combined proof now covers deterministic orchestration plus durable identity/recovery/provenance patterns. It still does **not** prove a complete multi-session agent-memory runtime, autonomous checkpoint planner, or Anthropic-equivalent resume engine.

### Agent safety / containment

Resource ceilings, fail-closed behavior, integrity quarantine, and authority boundaries are relevant controls, but they do not prove sandboxing, capability security, model safety, policy enforcement, or production blast-radius containment.

### Runtime reliability

The recovery/provenance cluster is behavior-tested at Sigma Glue and ECHO, with AKOS limited to equivalence-bounded implementation evidence; it is not runtime-recovery proven. Promotion beyond that ceiling requires exact-revision restart/replay/readback receipts for each promoted runtime assertion.

## Recruiter surface

> I build deterministic control layers around agentic work: dependency-safe scheduling, explicit resource ceilings, stable identities for retries, idempotent execution boundaries, integrity/provenance checks, visible failures, and durable receipts. The scheduler proof is pinned to 62/62 passing repository-native tests; Sigma Glue and ECHO behavior-test the recovery pattern, while AKOS contributes bounded equivalence evidence. That maps directly to AI reliability work around long-running agents without claiming Anthropic-scale deployment, runtime recovery, or production reliability.

## Master surface

**Anthropic pressure**  
Long-running agents accumulate state and errors, need reliable continuation, and require deterministic safeguards as autonomy and access expand.

**Verified GlacierEQ mechanisms**  
One proof family governs dependency graphs, complete-task funding, resource ceilings, and explicit deferral. A second independent family binds stable identity to idempotent/replay-safe execution, provenance/integrity checks, and durable reconciliation evidence, with behavior testing in Sigma Glue and ECHO and equivalence-bounded AKOS support.

**Combined leverage hypothesis**  
The strongest fit is the reliability envelope around probabilistic workers: validate work before admission, bound resources during execution, make retries semantically stable, expose contradictory or incomplete states, and leave machine-verifiable evidence after execution.

**Unproven boundary**  
Anthropic runtime integration, production SLOs, model safety/alignment research, sandboxing, large-scale distributed semantics, runtime-recovery proof, and a full persistent multi-session agent runtime remain outside the claim.

## Machine surface

```yaml
schema: glaciereq.company-fit-proof.v2
company: Anthropic
role_signal:
  title: Staff Software Engineer, AI Reliability
  company_study_date: 2026-08-08
company_problem:
  bounded_statement: >-
    Long-running autonomous agents need resumable state, deterministic safeguards,
    failure visibility, stable retry semantics, provenance, and bounded authority/resource
    behavior as task duration and access expand.
proof_families:
  - id: deterministic_agent_coordination
    repository: GlacierEQ/anthropic-agent-coordinator
    verified_executable_commit: 87438f57bdfd2cb380730cf51140611963d7c95b
    receipt: receipts/wave-1-test-verification-2026-07-31.json
    evidence_level: TEST
    tests:
      executed: 62
      passed: 62
      failures: 0
      errors: 0
      skipped: 0
    mechanisms:
      - dependency_aware_scheduling
      - complete_task_funding_semantics
      - global_resource_budget_conservation
      - aggregate_role_capacity_enforcement
      - explicit_structured_deferral
      - fail_fast_graph_and_resource_validation
  - id: idempotent_recovery_and_provenance
    canonical_proof: portfolio-proof/CAPABILITY_CLUSTER__IDEMPOTENT_RECOVERY_AND_PROVENANCE__2026-08-08.md
    status: BEHAVIOR_TESTED_MULTI_REPO_PATTERN
    independent_sources:
      - repository: GlacierEQ/sigma-glue
        revision: 4a1ca8e5c88a62e8a94a43213b2c509af6afcea3
        workflow_run_id: 31279895318
        conclusion: success
      - repository: GlacierEQ/ECHO
        revision: d87276166041d655452abd4e992a755565f9201c
        workflow_run_id: 31139090677
        workflow: ECHO CI
        conclusion: success
      - repository: GlacierEQ/AKOS
        revision: d9aeb424f4d99da6026719e1e58793f6a89efd86
        proof_kind: canonical_tree_equivalence_plus_implementation_scope
    evidence_boundary:
      behavior_tested:
        - GlacierEQ/sigma-glue
        - GlacierEQ/ECHO
      equivalence_bounded:
        - GlacierEQ/AKOS
      runtime_recovery_proven: false
    mechanisms:
      - stable_identity
      - idempotency_or_replay_boundary
      - provenance_or_integrity_boundary
      - durable_receipt_or_manifest_boundary
combined_claim_ceiling: BEHAVIOR_TESTED_RELIABILITY_CONTROL_ALIGNMENT
nonclaims:
  - anthropic_affiliation_or_endorsement
  - anthropic_runtime_integration
  - production_deployment
  - production_reliability_or_slos
  - runtime_recovery_alignment
  - anthropic_scale
  - exactly_once_distributed_semantics
  - complete_multi_session_agent_memory_runtime
  - model_safety_or_alignment_research
  - sandbox_or_blast_radius_containment
```

## Mesh / remaining gates

```text
Anthropic AI Reliability fit
  COMPANY STUDY -> bounded 2026-08-08

  PROOF FAMILY A -> deterministic coordination
    TEST @ 87438f57...
    62 executed / 62 passed

  PROOF FAMILY B -> idempotent recovery + provenance
    Sigma Glue @ 4a1ca8e5... -> exact-revision verify success (behavior-tested)
    ECHO @ d8727616... -> exact-revision ECHO CI success (behavior-tested)
    AKOS @ d9aeb424... -> canonical equivalence-bounded implementation proof

  COMBINED CEILING:
    BEHAVIOR_TESTED_RELIABILITY_CONTROL_ALIGNMENT

  CLOSED GATE:
    recovery/provenance evidence reconciled across independent canonical sources

  OPEN GATE:
    runtime-recovery alignment remains unproven

  DOES NOT PROVE:
    Anthropic runtime integration
    production deployment/reliability/scale
    runtime recovery
    exactly-once distributed semantics
    complete multi-session agent memory
    model safety/alignment
    sandboxing/containment

  NEXT GATE:
    bind one exact-revision restart/replay/readback scenario to the recovery cluster;
    only then consider promoting the company-fit surface from behavior-tested
    control alignment toward runtime-recovery alignment.
```

## Canonical source pointers

- `GlacierEQ/job-application:site-v15/companies/anthropic/record.json`
- `GlacierEQ/job-application:PROOF_SURFACES_AGENT_COORDINATOR.md`
- `GlacierEQ/job-application:portfolio-proof/CAPABILITY_CLUSTER__IDEMPOTENT_RECOVERY_AND_PROVENANCE__2026-08-08.md`
- `GlacierEQ/anthropic-agent-coordinator:receipts/wave-1-test-verification-2026-07-31.json`

## Promotion decision

**PROMOTE the Anthropic fit surface to `BEHAVIOR_TESTED_RELIABILITY_CONTROL_ALIGNMENT`.**

The prior projection's **recovery/provenance evidence gate** is now materially closed by exact-revision behavior testing in Sigma Glue and ECHO plus bounded AKOS canonical-tree-equivalence evidence. The **runtime-recovery alignment gate remains open** and requires an exact-revision restart/replay/readback receipt before any runtime-recovery promotion. The current claim remains bounded to reliability-control alignment and does not imply Anthropic affiliation, runtime equivalence, deployment, or production reliability.
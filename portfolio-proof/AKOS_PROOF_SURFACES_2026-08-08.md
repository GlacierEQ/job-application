# AKOS Proof Surfaces — 2026-08-08

## Evidence contract

System: `GlacierEQ/AKOS`

Current source head inspected: `0df3c3c26feec0dfb1cbc5eadf937d255b5f28ce`

Repository-local test anchor: `5b960219635fcd95a9a98a2d7c1bfc5d19111c84`

Promotion receipt: `receipts/2026-08-02_psysoc-x_v0.1.0_promotion.json`

Claim ceiling: `TEST_VERIFIED_REPOSITORY_LOCAL_SCOPE_AT_PINNED_REVISION`

The current source head is newer than the pinned promotion revision. Architecture and source-contract claims below may use the current head. Test counts and verification claims are limited to the pinned tested revision and are not silently projected onto newer untested commits.

## Recruiter surface

**AKOS — governance and operational cognition for complex AI systems**

AKOS turns identity, authority, provenance, execution, verification, persistence, and completion into explicit system contracts rather than informal agent behavior. It separates planning from execution, execution from verification, and verification from durable completion, with fail-closed authority boundaries and receipt-backed state transitions.

At its pinned repository-local verification revision, AKOS passed 118/118 full tests on Python 3.11, 3.12, and 3.13, plus 10/10 focused Forge tests and 4/4 PSYSOC-X calibration cases. That evidence supports repository-local behavior only; it does not establish production deployment, provider connectivity, or external-scale reliability.

**Why it matters:** the system demonstrates an ability to build the control layer around probabilistic software—making actions reviewable, resumable, bounded, and evidence-backed.

## Master surface

### Architectural contribution

AKOS separates six planes that are often collapsed in agent systems:

1. **Canonical source** — authoritative objects and records.
2. **Execution plane** — components capable of changing target state.
3. **Control plane** — policy governing authority and confirmation.
4. **Receipt plane** — evidence that an action occurred and was validated.
5. **Projection plane** — human and machine views that do not replace source truth.
6. **Specialization plane** — reversible packages that shape behavior without mutating base evidence.

The current source head extends that model with canonical JSON schemas for evidence, systems, capabilities, mechanisms, repositories, and lineage. These contracts connect implementation evidence to canonical systems and lineage without equating raw repository count with independent accomplishment count.

### Defensible mechanisms

- deterministic execute / confirm / block authority decisions;
- evidence classes and maturity transitions;
- receipt-backed completion semantics;
- exact blocker reporting instead of subjective completion percentages;
- atomic verification receipts;
- canonical identity and provenance contracts;
- bounded adaptation and unhealthy-signal backoff;
- reversible specialization through manifest-driven Infinity Stones;
- fail-closed workflow policy with read-only, secretless verification boundaries;
- canonical schema graph connecting evidence → system → capability → mechanism → repository → lineage.

### Tradeoffs and boundaries

AKOS intentionally prioritizes explicit state, provenance, and authority over frictionless autonomous mutation. This adds contract and receipt overhead, but reduces ambiguity about whether an action was planned, executed, verified, persisted, or merely described.

Current source changes after the pinned test revision are not promoted to fresh test-verified status by this artifact. They remain source-contract evidence until a matching current-head verification receipt exists.

## Machine surface

```yaml
proof_object:
  id: akos-governance-operational-cognition
  system: GlacierEQ/AKOS
  current_source_head: 0df3c3c26feec0dfb1cbc5eadf937d255b5f28ce
  tested_revision: 5b960219635fcd95a9a98a2d7c1bfc5d19111c84
  source_evidence:
    - README.md
    - operational_cognition/execution_authority.py
    - operational_cognition/engine.py
    - operational_cognition/maturity.py
    - infinity_stones/
    - scripts/verify_repository.py
    - receipts/2026-08-02_psysoc-x_v0.1.0_promotion.json
    - schemas/evidence.schema.json
    - schemas/system.schema.json
    - schemas/capability.schema.json
    - schemas/mechanism.schema.json
    - schemas/repository.schema.json
    - schemas/lineage.schema.json
  verified_at_test_anchor:
    python_matrix: ["3.11", "3.12", "3.13"]
    full_tests_per_interpreter: 118
    focused_forge_tests_per_interpreter: 10
    calibration_cases: 4
    calibration_cases_passed: 4
    workflow_runs:
      infinity_stone_forge: 30749869999
      akos_verification: 30749869991
      akos_integrity_gate: 30749870031
  evidence_level: TEST
  claim_ceiling: TEST_VERIFIED_REPOSITORY_LOCAL_SCOPE_AT_PINNED_REVISION
  nonclaims:
    - production deployment
    - provider-side connectivity
    - external-scale performance or reliability
    - clinical or diagnostic validity
    - hidden-trait prediction
    - fresh test verification of commits after the pinned revision
```

## Mesh surface

### Promoted now

- Governance / operational-cognition system is a portfolio-grade proof object.
- Repository-local test evidence is pinned to an exact revision and exact workflow receipts.
- Current architecture evidence includes the newer canonical estate-intelligence schemas.
- Recruiter language is bounded to system behavior and engineering value rather than repository volume.

### Explicit gaps

- Current head `0df3c3c2…` is newer than the pinned test anchor `5b960219…`.
- No production deployment claim is admitted by this proof object.
- No external provider connectivity or scale claim is admitted.
- New estate-intelligence schemas are source-observed here, not freshly runtime-verified here.

### Next promotion gate

Run repository-native verification against the current AKOS canonical head and persist a matching current-head receipt. If that passes, raise the proof object from split `current-source + pinned-test` evidence to `CURRENT_HEAD_TEST_VERIFIED_REPOSITORY_BEHAVIOR` without changing the production/deployment nonclaims.

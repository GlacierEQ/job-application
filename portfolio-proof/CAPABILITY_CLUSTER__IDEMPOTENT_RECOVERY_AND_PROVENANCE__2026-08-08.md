# Capability Cluster — Idempotent Recovery + Provenance-Bound State

Status: `BEHAVIOR_TESTED_MULTI_REPO_PATTERN`

This proof object records a repeated engineering pattern across independent canonical repositories. It does **not** treat repository count as accomplishment count and does **not** imply deployment, production scale, external adoption, or measured performance.

## Recruiter surface

Builds failure-aware systems around stable identity, idempotent execution, provenance, integrity checks, and durable receipts so retries and repeated ingestion can be handled without silently changing the meaning of an operation. This pattern is now backed by exact-revision repository-native behavioral verification in Sigma Glue and ECHO, with AKOS separately bound through its canonical tree-equivalence proof.

## Master surface

The repeated pattern is **identity before mutation, durable state around execution, and evidence after execution**:

1. bind work to a stable subject or identity;
2. reject mismatched reuse or unsupported authority;
3. persist enough state to distinguish first execution from replay/retry;
4. verify integrity/provenance rather than trusting mutable content;
5. preserve receipts or manifest roots so later reconciliation has an auditable boundary.

### Independent repository evidence

#### Sigma Glue

Canonical source revision: `4a1ca8e5c88a62e8a94a43213b2c509af6afcea3`

Direct source: `src/persistence/idempotency-ledger.mjs`

Observed mechanism:
- idempotency subject binds `idempotencyKey`, `planFingerprint`, stable provider identity, and operation;
- first claim uses exclusive file creation (`flag: 'wx'`);
- key reuse with a different subject fails with `IDEMPOTENCY_KEY_REUSE_WITH_DIFFERENT_PAYLOAD`;
- completion persists bounded receipt/reconciliation summaries;
- completion replaces the durable record through temporary-file + rename.

Exact-revision executable verification:
- workflow run `31279895318` (`verify`), head SHA `4a1ca8e5c88a62e8a94a43213b2c509af6afcea3`, conclusion `success`;
- job `93159400700` (`core`) completed successfully;
- repository-native `npm test` step completed successfully.

Additional same-revision live-proof evidence:
- workflow run `31279895312` (`github-provider-live-proof`) completed successfully on the same head SHA.

Evidence ceiling: exact-revision repository-native behavioral verification plus direct canonical source inspection. No throughput, production deployment, distributed-consensus, or generalized exactly-once claim follows from this receipt.

#### ECHO

Canonical source revision: `d87276166041d655452abd4e992a755565f9201c`

Direct source: `docs/P0_HARDENING.md`

Observed governed invariants:
- conversation identity derives from `(source, external_id)` rather than mutable content;
- re-ingestion updates canonical state when content changes;
- integrity verification recomputes hashes and quarantines mismatches;
- jobs require caller-provided idempotency keys;
- unsupported capabilities fail closed;
- receipts chain attempts through `previous_hash`;
- privileged routes require an AKOS authority envelope.

Exact-revision executable verification:
- workflow run `31139090677` (`ECHO CI`), head SHA `d87276166041d655452abd4e992a755565f9201c`, conclusion `success`;
- job `92744931046` (`test`) completed successfully;
- compile, correctness lint, dependency audit, behavioral tests, and CLI verify steps all completed successfully.

A separate same-revision `AI Autonomous Deploy` workflow run `31139090678` also completed successfully, but this proof object does **not** elevate that workflow name into a production-deployment claim.

Evidence ceiling: exact-revision repository-native CI behavior verification plus governed hardening contract/source documentation. No production-operation or scale claim is promoted here.

#### AKOS

Canonical source revision: `d9aeb424f4d99da6026719e1e58793f6a89efd86`

Direct source: `runtime/CHANGELOG.md`

Observed implemented scope recorded by the runtime changelog:
- deterministic SHA-256 identity and idempotency keys;
- immutable source-pointer requirements for repository and primary-record promotion;
- deterministic evidence-manifest roots;
- atomic contradiction-edge generation;
- secret-pattern detection with fingerprint-only quarantine output.

The same changelog explicitly marks live provider writes and production deployment as not included. AKOS verification is therefore taken from the separate canonical AKOS proof/equivalence receipt, not inferred from this changelog.

Evidence ceiling: implementation-scope corroboration plus the separately maintained AKOS proof receipt; no production/provider/scale claim.

## Machine surface

```yaml
proof_object: capability_cluster/idempotent_recovery_and_provenance/v2
status: BEHAVIOR_TESTED_MULTI_REPO_PATTERN
pattern:
  stable_identity: true
  idempotency_or_replay_boundary: true
  provenance_or_integrity_boundary: true
  durable_receipt_or_manifest_boundary: true
independent_sources:
  - repository: GlacierEQ/sigma-glue
    revision: 4a1ca8e5c88a62e8a94a43213b2c509af6afcea3
    evidence: src/persistence/idempotency-ledger.mjs
    proof_kind: direct_source_plus_exact_revision_ci
    executable_receipts:
      - workflow_run_id: 31279895318
        workflow: verify
        job_id: 93159400700
        job: core
        step: npm_test
        conclusion: success
      - workflow_run_id: 31279895312
        workflow: github-provider-live-proof
        conclusion: success
  - repository: GlacierEQ/ECHO
    revision: d87276166041d655452abd4e992a755565f9201c
    evidence: docs/P0_HARDENING.md
    proof_kind: governed_contract_source_plus_exact_revision_ci
    executable_receipts:
      - workflow_run_id: 31139090677
        workflow: ECHO CI
        job_id: 92744931046
        job: test
        verified_steps:
          - compile
          - correctness_lint
          - dependency_audit
          - behavioral_tests
          - cli_verify
        conclusion: success
  - repository: GlacierEQ/AKOS
    revision: d9aeb424f4d99da6026719e1e58793f6a89efd86
    evidence:
      - runtime/CHANGELOG.md
      - portfolio-proof/AKOS_PROOF_SURFACES_2026-08-08.md
      - portfolio-proof/receipts/AKOS_CURRENT_HEAD_TREE_EQUIVALENCE_2026-08-08.json
    verified_pr_revision: c507436e2523f668ae4a1e8e142f59e200f07a90
    verified_tree_sha: 2c82cf61b4f50a8391187f0e6c7b0bc8439f240b
    proof_kind: implementation_scope_plus_tree_equivalence_receipt
promotion_gate:
  target_status: RUNTIME_PROVEN_MULTI_REPO_PATTERN
  required_evidence:
    - multiple_restart_or_replay_scenarios_with_persisted_receipts
    - current_runtime_readback_where_the_claim_requires_runtime_state
    - exact_revision_binding_for_each_promoted_runtime_assertion
  rule: runtime claims remain excluded until every promoted assertion has an exact receipt
nonclaims:
  - production_deployment
  - production_reliability
  - exactly_once_distributed_semantics
  - generalized_live_provider_recovery
  - scale_or_latency_numbers
  - external_adoption
  - measured_throughput
  - distributed_consensus
  - company_affiliation
  - hardware_behavior
```

## Mesh surface

### Proven now

- The same engineering pattern occurs in at least three independently named canonical repositories at pinned revisions.
- Sigma Glue directly implements durable idempotency and reconciliation mechanisms and has successful exact-revision repository-native test verification at `4a1ca8e5...`.
- ECHO's governed hardening contract defines stable external identity, idempotency, integrity recomputation/quarantine, fail-closed capability handling, and chained receipts, with successful exact-revision CI behavioral verification at `d8727616...`.
- AKOS independently records deterministic identity/idempotency and provenance/manifest mechanisms, with its current canonical tree bounded by a separate verified equivalence receipt.

### Retired prior state

`SOURCE_VERIFIED_MULTI_REPO_PATTERN` is superseded for this proof object because the previously named Sigma Glue and ECHO executable promotion gates now have matching exact-revision successful receipts.

### Not promoted by this object

- production reliability;
- generalized exactly-once distributed semantics;
- generalized successful live-provider recovery;
- scale or latency numbers;
- external-company use or affiliation.

### Next promotion gate

Promote beyond `BEHAVIOR_TESTED_MULTI_REPO_PATTERN` only when runtime-specific claims are bound to exact revisions and durable restart/replay/readback receipts. Workflow names or generic green CI are insufficient for production/runtime claims.

# Capability Cluster — Idempotent Recovery + Provenance-Bound State

Status: `SOURCE_VERIFIED_MULTI_REPO_PATTERN`

This proof object records a repeated engineering pattern across independent canonical repositories. It does **not** treat repository count as accomplishment count and does **not** imply deployment, production scale, external adoption, or measured performance.

## Recruiter surface

Builds failure-aware systems around stable identity, idempotent execution, provenance, integrity checks, and durable receipts so retries and repeated ingestion can be handled without silently changing the meaning of an operation.

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

Evidence ceiling: direct canonical source inspection. No throughput, production deployment, distributed-consensus, or external-provider success claim follows from this receipt.

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

Evidence ceiling: canonical hardening contract/source documentation at the pinned revision. This cluster does not independently promote ECHO deployment or production-operation claims.

#### AKOS

Canonical source revision: `d9aeb424f4d99da6026719e1e58793f6a89efd86`

Direct source: `runtime/CHANGELOG.md`

Observed implemented scope recorded by the runtime changelog:
- deterministic SHA-256 identity and idempotency keys;
- immutable source-pointer requirements for repository and primary-record promotion;
- deterministic evidence-manifest roots;
- atomic contradiction-edge generation;
- secret-pattern detection with fingerprint-only quarantine output.

The same changelog explicitly marks live provider writes and production deployment as not included and labels its own validation status `pending_ci_and_review`. AKOS verification must therefore be taken from the separate canonical AKOS proof/equivalence receipt, not inferred from this changelog.

Evidence ceiling: implementation-scope corroboration plus the separately maintained AKOS proof receipt; no production/provider/scale claim.

## Machine surface

```yaml
proof_object: capability_cluster/idempotent_recovery_and_provenance/v1
status: SOURCE_VERIFIED_MULTI_REPO_PATTERN
pattern:
  stable_identity: true
  idempotency_or_replay_boundary: true
  provenance_or_integrity_boundary: true
  durable_receipt_or_manifest_boundary: true
independent_sources:
  - repository: GlacierEQ/sigma-glue
    revision: 4a1ca8e5c88a62e8a94a43213b2c509af6afcea3
    evidence: src/persistence/idempotency-ledger.mjs
    proof_kind: direct_source
  - repository: GlacierEQ/ECHO
    revision: d87276166041d655452abd4e992a755565f9201c
    evidence: docs/P0_HARDENING.md
    proof_kind: governed_contract_source
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
  target_status: BEHAVIOR_TESTED_MULTI_REPO_PATTERN
  required_receipts:
    - repository: GlacierEQ/sigma-glue
      revision: 4a1ca8e5c88a62e8a94a43213b2c509af6afcea3
      scope: idempotency_and_reconciliation_path
      receipt: repository_native_executable_verification_receipt
      expected_result: success
    - repository: GlacierEQ/ECHO
      revision: d87276166041d655452abd4e992a755565f9201c
      scope: relevant_p0_hardening_tests
      receipt: repository_native_executable_test_receipt
      expected_result: success
  rule: all_required_receipts_must_match_exact_revision_and_expected_result
nonclaims:
  - production_deployment
  - production_reliability
  - exactly_once_distributed_semantics
  - successful_live_provider_recovery
  - scale_or_latency_numbers
  - external_adoption
  - measured_throughput
  - distributed_consensus
  - company_affiliation
  - hardware_behavior
```

## Mesh surface

### Proven now

- The pattern occurs in at least three independently named repositories at pinned canonical revisions.
- Sigma Glue directly implements a durable idempotency ledger with subject mismatch protection and completion receipts.
- ECHO's governed hardening contract explicitly requires stable external identity, idempotency keys, integrity recomputation/quarantine, fail-closed capability handling, and chained receipts.
- AKOS records deterministic identity/idempotency and provenance/manifest mechanisms while explicitly preserving a no-production/no-live-provider boundary.

### Not promoted by this object

- production reliability;
- exactly-once distributed semantics;
- successful live provider recovery;
- scale or latency numbers;
- external-company use or affiliation.

### Next promotion gate

Bind the exact-revision repository-native executable verification receipt for Sigma Glue `4a1ca8e5c88a62e8a94a43213b2c509af6afcea3` covering the idempotency/reconciliation path and the exact-revision repository-native executable test receipt for ECHO `d87276166041d655452abd4e992a755565f9201c` covering the relevant P0 hardening tests. Promotion requires each named receipt to resolve to its pinned revision with an explicit `success` result; otherwise this object remains `SOURCE_VERIFIED_MULTI_REPO_PATTERN` without expanding its deployment ceiling.

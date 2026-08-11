# AKOS Proof Surfaces — superseded current-head claim, 2026-08-10

## Evidence contract

System: `GlacierEQ/AKOS`

Current canonical head: `079956542500fcfcdf161e88ed81c73e770de49d`

Current excellence state: `DISCOVERED`

Current proof status: `proof_ok=false`, `operable_ok=false`

Current blocker: `TESTS_FAIL`

Historical verified canonical-tree evidence preserved from 2026-08-08:

- historical canonical source head: `d9aeb424f4d99da6026719e1e58793f6a89efd86`
- verified PR revision: `c507436e2523f668ae4a1e8e142f59e200f07a90`
- shared verified tree: `2c82cf61b4f50a8391187f0e6c7b0bc8439f240b`
- successful AKOS Integrity Gate run: `31294595571`
- successful AKOS Verification run: `31294595577`
- prior equivalence receipt: `portfolio-proof/receipts/AKOS_CURRENT_HEAD_TREE_EQUIVALENCE_2026-08-08.json`

Current claim ceiling: `HISTORICAL_REVISION_BOUND_VERIFIED_AKOS_ARCHITECTURE__CURRENT_HEAD_DISCOVERED`

The 2026-08-08 tree-equivalence proof remains valid for the exact historical tree that earned it. It is no longer authority for the changed current AKOS head. The repository's current machine state explicitly records `DISCOVERED`, `proof_ok=false`, `operable_ok=false`, and demotion from `PROMOTED` with blocker `TESTS_FAIL`.

## Recruiter surface

**AKOS — governance architecture for bounded, evidence-backed AI execution**

AKOS demonstrates a control-plane architecture that makes identity, authority, provenance, execution, verification, persistence, and completion explicit system contracts rather than informal agent behavior. A historical AKOS tree was verified through repository integrity and verification workflows; that proof remains pinned to the exact revision/tree that earned it.

The current AKOS head has changed and is not presented as verified. Its repository-native excellence state is presently `DISCOVERED` with `TESTS_FAIL`, so current-head testing, operability, deployment, or promotion are not claimed.

**Why it matters:** the durable accomplishment is the architecture and the demonstrated historical verification discipline, including the system's willingness to demote changed code instead of inheriting stale proof.

## Master surface

### Architectural contribution

The historically verified AKOS architecture separates six planes that are often collapsed in agent systems:

1. **Canonical source** — authoritative objects and records.
2. **Execution plane** — components capable of changing target state.
3. **Control plane** — policy governing authority and confirmation.
4. **Receipt plane** — evidence that an action occurred and was validated.
5. **Projection plane** — human and machine views that do not replace source truth.
6. **Specialization plane** — reversible packages that shape behavior without mutating base evidence.

Historically verified mechanisms included deterministic execute/confirm/block decisions, evidence maturity transitions, receipt-backed completion semantics, canonical identity/provenance contracts, bounded adaptation, fail-closed workflow policy, and a schema graph connecting evidence → system → capability → mechanism → repository → lineage.

### Verification boundary

On 2026-08-08, historical AKOS main `d9aeb424…` and verified PR revision `c507436…` shared Git tree `2c82cf61…`. AKOS Integrity Gate run `31294595571` and AKOS Verification run `31294595577` succeeded on the verified revision. That remains defensible historical evidence for that exact tree.

Current AKOS head `079956542500fcfcdf161e88ed81c73e770de49d` is governed by `machine/excellence-state.json`, which records:

- `principal_state = DISCOVERED`
- `proof_ok = false`
- `operable_ok = false`
- demotion from `PROMOTED`
- blocker `TESTS_FAIL`

Therefore the previous phrase **"current canonical AKOS tree is ... equivalent to the revision that passed"** is retired as a current-state claim.

## Machine surface

```yaml
proof_object:
  id: akos-governance-operational-cognition
  system: GlacierEQ/AKOS
  current:
    head: 079956542500fcfcdf161e88ed81c73e770de49d
    principal_state: DISCOVERED
    proof_ok: false
    operable_ok: false
    blocker: TESTS_FAIL
    authority: machine/excellence-state.json
  historical_verified_evidence:
    canonical_source_head: d9aeb424f4d99da6026719e1e58793f6a89efd86
    verified_pr_revision: c507436e2523f668ae4a1e8e142f59e200f07a90
    canonical_tree_sha: 2c82cf61b4f50a8391187f0e6c7b0bc8439f240b
    verified_pr_tree_sha: 2c82cf61b4f50a8391187f0e6c7b0bc8439f240b
    tree_equivalent: true
    equivalence_receipt: portfolio-proof/receipts/AKOS_CURRENT_HEAD_TREE_EQUIVALENCE_2026-08-08.json
    verification:
      akos_integrity_gate:
        run_id: 31294595571
        conclusion: success
      akos_verification:
        run_id: 31294595577
        conclusion: success
  evidence_level: HISTORICAL_TEST
  claim_ceiling: HISTORICAL_REVISION_BOUND_VERIFIED_AKOS_ARCHITECTURE__CURRENT_HEAD_DISCOVERED
  nonclaims:
    - current-head verification
    - current-head operability
    - production deployment
    - provider-side connectivity
    - external-scale performance or reliability
    - historical verification projected onto changed code
```

## Mesh surface

### Preserved

- The 2026-08-08 exact-tree verification remains valid historical proof.
- AKOS remains a portfolio-grade architecture example for governance, provenance, bounded authority, and receipt-backed execution.
- Exact historical workflow identifiers and tree identity remain available for audit.

### Retired / superseded

- Retired: `CURRENT_CANONICAL_TREE_EQUIVALENT_TO_VERIFIED_PR_TREE` as a present-tense/current-head claim.
- Retired: any implication that the historical workflow success proves current head `0799565425…`.
- Superseded by: revision-bound historical proof plus repository-native current state `DISCOVERED / TESTS_FAIL`.

### Current gaps

- Current-head deterministic proof is not green.
- Current-head operability is not established.
- No production deployment or provider-scale claim is admitted.

### Next promotion gate

Repair the current `TESTS_FAIL` blocker, execute fresh verification against the exact current revision that contains the repair, persist a commit-bound receipt, and only then raise the current-head claim ceiling.

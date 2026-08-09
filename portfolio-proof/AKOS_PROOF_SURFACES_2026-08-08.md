# AKOS Proof Surfaces — 2026-08-08

## Evidence contract

System: `GlacierEQ/AKOS`

Canonical source head: `d9aeb424f4d99da6026719e1e58793f6a89efd86`

Verified PR revision: `c507436e2523f668ae4a1e8e142f59e200f07a90`

Canonical tree SHA: `2c82cf61b4f50a8391187f0e6c7b0bc8439f240b`

Verified PR tree SHA: `2c82cf61b4f50a8391187f0e6c7b0bc8439f240b`

Equivalence receipt: `portfolio-proof/receipts/AKOS_CURRENT_HEAD_TREE_EQUIVALENCE_2026-08-08.json`

Claim ceiling: `CURRENT_CANONICAL_TREE_EQUIVALENT_TO_VERIFIED_PR_TREE`

The canonical AKOS main commit and the verified PR #23 revision resolve to the same Git tree. AKOS Integrity Gate and AKOS Verification succeeded on the verified revision. This supports current-canonical-tree verification for the scope exercised by those workflows. It does not project older historical test counts or unrelated runtime/deployment behavior onto current main.

## Recruiter surface

**AKOS — governance and operational cognition for complex AI systems**

AKOS turns identity, authority, provenance, execution, verification, persistence, and completion into explicit system contracts rather than informal agent behavior. It separates planning from execution, execution from verification, and verification from durable completion, with fail-closed authority boundaries and receipt-backed state transitions.

The current canonical AKOS tree is byte-for-byte Git-tree equivalent to the revision that passed the repository's AKOS Integrity Gate and AKOS Verification workflows. That evidence supports the behavior exercised by those verification workflows; it does not establish production deployment, provider connectivity, external-scale reliability, or behavior outside the verified scope.

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

The current canonical tree includes JSON schemas for evidence, systems, capabilities, mechanisms, repositories, and lineage. These contracts connect implementation evidence to canonical systems and lineage without equating raw repository count with independent accomplishment count.

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

### Verification boundary

The current canonical head `d9aeb424…` and verified PR revision `c507436…` share tree `2c82cf61…`. AKOS Integrity Gate run `31294595571` and AKOS Verification run `31294595577` concluded successfully on that verified revision. The canonical readback of `tests/test_canonical_estate_schemas.py` has blob SHA `dba9c874…`, matching the verified PR tree.

Tree equivalence lets this proof retire the obsolete split-source/current-versus-tested pointer for the verified PR #23 scope. It does **not** justify copying historical 118-test counts onto this newer verification event, nor does it establish production or provider behavior.

## Machine surface

```yaml
proof_object:
  id: akos-governance-operational-cognition
  system: GlacierEQ/AKOS
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
    canonical_schema_test:
      path: tests/test_canonical_estate_schemas.py
      blob_sha: dba9c874e26f26e7045a19dec95ab2c6e2e99e5e
      matches_verified_pr_blob: true
  evidence_level: TEST
  claim_ceiling: CURRENT_CANONICAL_TREE_EQUIVALENT_TO_VERIFIED_PR_TREE
  nonclaims:
    - production deployment
    - provider-side connectivity
    - external-scale performance or reliability
    - historical test counts projected onto the current verification event
    - behavior outside the workflows and tree proven here
```

## Mesh surface

### Promoted now

- AKOS remains a portfolio-grade governance / operational-cognition proof object.
- The stale `0df3c3… current source + 5b9602… pinned test` split is superseded.
- Current canonical AKOS is tied to successful repository verification through exact Git-tree equivalence.
- Canonical schema-test content is read back at the same blob proven in the verified PR tree.
- Recruiter language remains bounded to verified engineering behavior rather than repository volume.

### Explicit gaps

- No production deployment claim is admitted.
- No external provider connectivity or scale claim is admitted.
- Historical test-count receipts are not silently projected onto the newer PR #23 verification event.
- Verification claims remain limited to behavior exercised by AKOS Integrity Gate and AKOS Verification on the tree proven equivalent to current canonical main.

### Next promotion gate

Persist a repository-native verification receipt directly attached to the current canonical AKOS commit if a stronger commit-bound proof ceiling is needed. Until then, exact Git-tree equivalence is the controlling current-canonical verification boundary.

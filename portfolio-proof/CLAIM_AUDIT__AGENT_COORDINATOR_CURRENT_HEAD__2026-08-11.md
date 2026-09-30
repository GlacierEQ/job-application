# Claim Audit — Agent Coordinator Current-Head Drift

## Decision

The recruiter/master resume surfaces currently name `0f2ca5199e67664a87ffef3f874d5836984dbbdb` as the Agent Coordinator current default-branch head. Direct canonical estate work has since advanced `GlacierEQ/anthropic-agent-coordinator` to `7d15bfaec0040e7a55d4b435abcf0fe9e7b19cb1`, with an open bounded README-integrity repair candidate after conflict-marker discovery.

Therefore the resume's literal current-head identifier is stale and must not be presented as current repository state.

## Evidence preserved

- Historical exact executable proof remains pinned to `87438f57bdfd2cb380730cf51140611963d7c95b`.
- That revision retains the governed `62 collected / 62 executed / 62 passed / 0 failed / 0 errors / 0 skipped` receipt.
- The historical proof does not transfer to later repository heads.
- Later canonical `7d15bfaec0040e7a55d4b435abcf0fe9e7b19cb1` hardened CI authority by pinning the reusable verification workflow to immutable donor SHA `a6085dae73bb80e91b845fd4a0d2f73a9c6b985a`, but that source change is not itself current-head executed test proof.
- Current-head documentation integrity was separately found defective and is under bounded repair; that state must not be collapsed into either `TESTS_FAIL` or `VERIFIED` without an exact-SHA executed receipt.

## Corrected recruiter claim

**Agent Coordinator:** deterministic dependency, capacity, priority, and shared-budget scheduling has an immutable historical **62/62 Python test receipt** at executable commit `87438f57bdfd2cb380730cf51140611963d7c95b`. The repository has changed since that verified revision; current-head documentation/integrity and exact-head verification remain separately gated. The historical result is not represented as current-head verification, deployment, or production reliability.

## Machine receipt

```yaml
schema: glaciereq.portfolio.claim-audit.v1
claim_id: agent-coordinator-resume-current-head
surface: RESUME.md
status: NARROW_AND_CORRECT
stale_literal:
  claimed_current_head: 0f2ca5199e67664a87ffef3f874d5836984dbbdb
canonical_head_observed_in_controlling_estate_work: 7d15bfaec0040e7a55d4b435abcf0fe9e7b19cb1
historical_verified_revision:
  sha: 87438f57bdfd2cb380730cf51140611963d7c95b
  tests:
    collected: 62
    executed: 62
    passed: 62
    failed: 0
    errors: 0
    skipped: 0
current_head_evidence:
  source_change: immutable_shared_workflow_pin
  workflow_donor_sha: a6085dae73bb80e91b845fd4a0d2f73a9c6b985a
  executed_current_head_test_proof: NOT_ESTABLISHED_BY_THIS_RECEIPT
  documentation_integrity: REPAIR_IN_PROGRESS
forbidden_inferences:
  - historical_62_test_receipt_is_current_head_proof
  - current_head_tests_failed_without_executed_receipt
  - current_head_verified_without_executed_receipt
  - production_deployment
  - production_reliability
  - anthropic_affiliation
claim_ceiling: HISTORICAL_EXACT_62_TEST_PROOF_WITH_CURRENT_HEAD_CHANGED_AND_SEPARATELY_GATED
```

## Next cursor

Update recruiter/ATS Agent Coordinator text to remove the stale `0f2ca519...` current-head assertion and replace it with the corrected bounded wording above. Promote any later current-head test claim only from an exact-SHA executed receipt.
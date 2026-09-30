# Capability Cluster — Evidence-Carrying Execution v2

## Canonical claim

**Evidence-Carrying Execution**: bind operation identity and authority before execution, carry typed/hash evidence through the operation, and refuse to promote completion when the resulting receipt or terminal verification does not match the bound execution context.

Claim ceiling: `THREE_INDEPENDENT_IMPLEMENTATIONS_WITH_ONE_CURRENT_HEAD_EXECUTED_CI_ANCHOR`.

This remains **one repeated engineering capability**, not three accomplishments and not a repository-count claim.

## What materially changed from v1

The prior cluster established the pattern from two independent current source contracts: `public-actions-runner-host` and `the-tower-of-babel`. v2 adds `AKOS` as a third independent implementation and, critically, upgrades the evidence mix with an exact-current-head executed CI anchor.

The result is stronger than adding another repository name: the cluster now spans **source-contract proof plus executed exact-head behavioral proof**.

## Recruiter surface

Built independent systems where an automated action is not trusted merely because a command returned success. Execution is tied to caller/input/authority identity, that identity is carried into telemetry or receipts, and terminal promotion is rejected when the resulting evidence does not match the bound operation. The pattern appears independently in governed CI, polyglot execution governance, and delegated computer-kernel control.

## Master surface

The repeated mechanism has four stable parts:

1. **Bind identity before execution** — establish the repository/workflow/actor, mission input, or delegated caller/task/trace context before authority is accepted.
2. **Attenuate authority** — restrict execution to the bound operation rather than granting ambient authority.
3. **Carry evidence through execution** — preserve hashes, typed identity, or receipt state through the execution path.
4. **Fail closed at promotion** — do not call the operation complete when receipt publication, receipt hash, caller/executor identity, or terminal verification fails.

### Independent donor A — `GlacierEQ/public-actions-runner-host`

Exact source revision: `597c188b2734d750fcfbdde9e7374afe74dc9b45`.

Evidence class: `current_source_contract`.

Bounded mechanism:

- immutable repository/workflow/actor identity checks before token minting and checkout;
- strict metadata-only job envelopes and rejection of unauthorized or ambiguous inputs;
- short-lived one-repository tokens with minimum permissions;
- duplicate-job replay guard before workload checkout;
- immutable private receipts binding payload SHA-256, workflow run/attempt, runner commit, execution repository, actor, source repository, and source ref;
- successful workload execution without successful receipt publication remains a blocked release state.

Not claimed: live OIDC activation, production operation.

### Independent donor B — `GlacierEQ/the-tower-of-babel`

Exact source revision: `f7e132c9717eda574f3bb5f643b2f983309f319f`.

Evidence class: `current_source_contract_flagship_path`.

Bounded mechanism:

- validated operator mission ingress with an input hash;
- registry-bound authority that fails closed on invalid or non-bound plans;
- typed execution telemetry carrying an evidence hash;
- constrained persisted mission/event records;
- receipt sequence monotonicity;
- deterministic tamper-evident Tower Receipt;
- unavailable toolchain stages remain explicit blockers instead of being promoted as executed.

Not claimed: execution of unavailable stages, production deployment.

### Independent donor C — `GlacierEQ/AKOS`

Exact canonical revision: `eac3cab001306225b99da41c37370528331966dd`.

Evidence class: `current_canonical_head_executed_multi_version_ci_plus_direct_implementation`.

Direct implementation anchors at the exact head:

- delegated caller identity is preserved through the computer-kernel client;
- terminal verification checks task/trace context, delegated caller, executor identity, completion state, verification result, and receipt hash;
- caller mismatch, executor mismatch, incomplete execution, failed verification, receipt-hash mismatch, and failed/cancelled terminal state are rejection conditions.

Exact-head executed proof:

- GitHub Actions workflow run `31466410490` completed successfully across Python `3.11`, `3.12`, and `3.13`;
- Python 3.12 receipt is bound to `eac3cab001306225b99da41c37370528331966dd` and reports `VERIFIED`;
- `200` tests collected, `199` passed, `1` skipped, `0` failures, `0` errors, pytest exit code `0`;
- artifact `9091679985`, SHA-256 `9bcdea24684dc1b02d5e47539f6b3bb50d6018791fdf4cf2a65a027509586805`;
- `160` broader preexisting Ruff findings remain explicitly recorded as quality debt rather than being misrepresented as repository-wide lint cleanliness.

Not claimed: production deployment, production traffic/scale, third-party adoption, repository-wide zero lint debt.

## Why this is distinct from adjacent clusters

- **Fail-Closed Execution Envelopes** focuses on whether execution is allowed, bounded, or rejected.
- **Conservative State Promotion** focuses on preserving uncertainty or incompleteness in semantic state.
- **Evidence-Carrying Execution** focuses specifically on carrying exact execution identity/evidence through the operation so terminal claims can be audited against what actually ran.

The clusters can compose, but they are not synonyms.

## Machine surface

```yaml
schema: glaciereq.portfolio.capability-cluster.v2
capability_id: evidence-carrying-execution
supersedes: portfolio-proof/CAPABILITY_CLUSTER__EVIDENCE_CARRYING_EXECUTION__2026-08-11.md
claim_ceiling: THREE_INDEPENDENT_IMPLEMENTATIONS_WITH_ONE_CURRENT_HEAD_EXECUTED_CI_ANCHOR
accomplishment_count: 1
pattern:
  pre_execution:
    - bind_operation_identity
    - bind_input_or_delegated_caller_context
    - fail_closed_on_identity_or_contract_mismatch
  authority:
    - minimum_required_scope
    - operation_bound_execution
  evidence:
    - carry_hash_or_typed_identity_through_execution
    - persist_receipt_or_terminal_verification_state
  promotion:
    - reject_receipt_publication_failure
    - reject_receipt_hash_mismatch
    - reject_caller_or_executor_mismatch
    - reject_unverified_or_failed_terminal_state
donors:
  - repo: GlacierEQ/public-actions-runner-host
    revision: 597c188b2734d750fcfbdde9e7374afe74dc9b45
    evidence_class: current_source_contract
  - repo: GlacierEQ/the-tower-of-babel
    revision: f7e132c9717eda574f3bb5f643b2f983309f319f
    evidence_class: current_source_contract_flagship_path
  - repo: GlacierEQ/AKOS
    revision: eac3cab001306225b99da41c37370528331966dd
    evidence_class: current_canonical_head_executed_multi_version_ci_plus_direct_implementation
    verification:
      workflow_run: 31466410490
      python: ["3.11", "3.12", "3.13"]
      python_3_12:
        conclusion: VERIFIED
        collected: 200
        passed: 199
        skipped: 1
        failures: 0
        errors: 0
        artifact_id: 9091679985
        artifact_sha256: 9bcdea24684dc1b02d5e47539f6b3bb50d6018791fdf4cf2a65a027509586805
      explicit_quality_debt:
        ruff_findings: 160
forbidden_inferences:
  - repositories_are_integrated
  - repository_count_equals_accomplishment_count
  - production_deployment
  - production_scale_or_slo
  - employer_or_target_company_affiliation
  - live_oidc_path_is_operationally_complete
  - unavailable_tower_stages_executed
  - repository_wide_lint_cleanliness
```

## Mesh surface

### Proven now

- Three independent canonical engineering systems instantiate the same traceable-execution invariant without being counted as three accomplishments.
- Two donors establish the pattern at current source-contract level.
- AKOS adds current-canonical-head, actually executed multi-version CI evidence and a revision-bound test receipt.
- The shared capability is stronger than isolated claims about hashing, telemetry, OIDC, receipts, or identity checks because it covers the end-to-end trust transition from bound operation to terminal evidence.

### Not promoted

- No claim that the three repositories are integrated.
- No production deployment or production-scale claim.
- No live OIDC operational-completion claim without the repository-required real-run receipt.
- No unavailable Tower stage is represented as executed.
- AKOS CI does not certify either other donor.
- No employer, target-company, or proprietary-system affiliation.

## Receipt manifest

```json
{
  "schema": "glaciereq.portfolio-proof.receipt.v2",
  "artifact": "portfolio-proof/CAPABILITY_CLUSTER__EVIDENCE_CARRYING_EXECUTION__2026-08-12_V2.md",
  "supersedes": "portfolio-proof/CAPABILITY_CLUSTER__EVIDENCE_CARRYING_EXECUTION__2026-08-11.md",
  "capability_id": "evidence-carrying-execution",
  "claim_ceiling": "THREE_INDEPENDENT_IMPLEMENTATIONS_WITH_ONE_CURRENT_HEAD_EXECUTED_CI_ANCHOR",
  "accomplishment_count": 1,
  "donors": [
    {
      "repo": "GlacierEQ/public-actions-runner-host",
      "revision": "597c188b2734d750fcfbdde9e7374afe74dc9b45",
      "evidence_class": "current_source_contract"
    },
    {
      "repo": "GlacierEQ/the-tower-of-babel",
      "revision": "f7e132c9717eda574f3bb5f643b2f983309f319f",
      "evidence_class": "current_source_contract_flagship_path"
    },
    {
      "repo": "GlacierEQ/AKOS",
      "revision": "eac3cab001306225b99da41c37370528331966dd",
      "evidence_class": "current_canonical_head_executed_multi_version_ci_plus_direct_implementation",
      "workflow_run": 31466410490,
      "python_3_12_receipt": {
        "collected": 200,
        "passed": 199,
        "skipped": 1,
        "failures": 0,
        "errors": 0,
        "artifact_id": 9091679985,
        "artifact_sha256": "9bcdea24684dc1b02d5e47539f6b3bb50d6018791fdf4cf2a65a027509586805"
      }
    }
  ],
  "next_cursor": "After job-application exact-head CI for this artifact, retire the v1 cluster from active portfolio navigation and project v2 only where a role/company bottleneck specifically requires traceable delegated execution or audit-grade automation provenance."
}
```

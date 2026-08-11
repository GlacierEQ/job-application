# AKOS — Delegated Kernel Caller Proof Surfaces

## Canonical claim

AKOS implements a fail-closed delegated computer-kernel client that preserves caller identity through invocation and verifies that terminal receipt evidence is bound to the expected task, trace, caller, and receipt hash before promoting the result as verified.

Claim ceiling: `CURRENT_HEAD_SOURCE_AND_ADVERSARIAL_TEST_IMPLEMENTATION_NOT_CI_OR_DEPLOYMENT`.

Exact canonical source head observed: `GlacierEQ/AKOS@eac3cab001306225b99da41c37370528331966dd`.

## Recruiter surface

Built a delegated execution boundary where a successful remote task is not enough: the client requires explicit caller identity and verifies the returned receipt against the expected task, trace, caller, and content hash before treating the operation as verified. Added tests for delegated-caller preservation and receipt tampering.

## Master surface

At exact head `eac3cab001306225b99da41c37370528331966dd`, merged PR #27 changes `operational_cognition/computer_kernel_client.py` so `invoke_and_verify()` rejects missing caller identity and passes the expected caller into receipt verification. The verified result carries caller identity alongside task ID, trace ID, receipt SHA-256, and source SHA.

The same merge extends `tests/test_computer_kernel_client.py` with explicit coverage that:

- an explicitly delegated caller (`GlacierEQ/pro-code`) is accepted when the receipt matches;
- delegated caller identity is preserved through invoke → terminal task readback → receipt readback → verification;
- the existing tampering rejection path remains part of the test surface.

This is source/test implementation evidence at the current canonical head. The connected GitHub workflow query returned no pull-request-triggered workflow runs for this exact merge SHA, so this object does **not** claim current-head CI execution or deployment.

## Machine surface

```yaml
schema: glaciereq.portfolio.system-proof.v1
system: GlacierEQ/AKOS
revision: eac3cab001306225b99da41c37370528331966dd
claim_ceiling: CURRENT_HEAD_SOURCE_AND_ADVERSARIAL_TEST_IMPLEMENTATION_NOT_CI_OR_DEPLOYMENT
mechanism:
  ingress:
    - require_nonempty_caller_identity
    - submit_bound_invocation_envelope
  terminal_verification:
    - read_terminal_task_state
    - read_receipt
    - verify_expected_task_id
    - verify_expected_trace_id
    - verify_expected_caller
    - verify_receipt_sha256
  evidence_output:
    - caller
    - task_id
    - trace_id
    - receipt_sha256
    - source_sha
test_surface:
  - explicit_delegated_caller_acceptance
  - delegated_caller_preservation_through_invoke_and_verify
  - receipt_tampering_rejection
current_head_ci_observed: false
forbidden_inferences:
  - production_deployment
  - current_head_ci_pass
  - external_scale
  - exactly_once_execution
  - universal_kernel_authority
```

## Mesh surface

### Proven now

AKOS contributes a concrete delegated-execution trust boundary to the portfolio: caller identity is part of the evidence contract, not incidental metadata, and verification occurs after terminal receipt readback rather than from submission success alone.

This strengthens the broader Evidence-Carrying Execution mesh without counting AKOS as proof of production operation. It adds a distinct mechanism: **delegated caller identity must survive into receipt verification before result promotion**.

### Not promoted

- No current-head CI pass is claimed; no qualifying workflow run was returned for the exact merge SHA.
- No production deployment, external traffic, scale, or third-party adoption is claimed.
- No claim that AKOS itself executes the delegated workload; the proof is the caller-side invocation and receipt-verification boundary.

## Durable receipt

```json
{
  "schema": "glaciereq.portfolio-proof.receipt.v1",
  "artifact": "portfolio-proof/AKOS__DELEGATED_KERNEL_CALLER_PROOF_SURFACES__2026-08-11.md",
  "repo": "GlacierEQ/AKOS",
  "revision": "eac3cab001306225b99da41c37370528331966dd",
  "merge": "PR #27",
  "source_anchors": [
    "operational_cognition/computer_kernel_client.py",
    "tests/test_computer_kernel_client.py"
  ],
  "claim_ceiling": "CURRENT_HEAD_SOURCE_AND_ADVERSARIAL_TEST_IMPLEMENTATION_NOT_CI_OR_DEPLOYMENT",
  "workflow_observation": "no pull-request-triggered workflow runs returned for exact merge SHA",
  "next_cursor": "Obtain an exact-SHA executed test or CI receipt for AKOS current head; only then promote from implemented-and-tested-in-source to executed verification."
}
```

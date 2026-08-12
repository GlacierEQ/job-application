# OpenAI Agent Infrastructure — AKOS Delegated-Identity Fit Delta

## Purpose

Strengthen the existing `COMPANY_FIT_OPENAI_AGENT_INFRASTRUCTURE.md` projection with one newly bounded capability contribution from canonical `GlacierEQ/AKOS`, without widening any scale, deployment, or CI claim.

## External role fact

OpenAI's `Software Engineer, Agent Infrastructure` role remains live as of 2026-08-11. The role describes infrastructure for agent execution used in training and production, an in-house orchestration platform intended to scale beyond conventional Kubernetes, FastAPI/gRPC interfaces, Terraform, and extremely large compute environments.

Official role source:
https://openai.com/careers/software-engineer-agent-infrastructure-san-francisco/

This artifact uses that public role only to define the company bottleneck. It does not imply affiliation or experience at OpenAI scale.

## New bounded fit contribution

### Delegated execution identity preservation — STRONG CURRENT-SOURCE CONTRACT

Canonical donor:

- `GlacierEQ/AKOS@eac3cab001306225b99da41c37370528331966dd`
- merged mechanism: PR #27, `verify delegated computer-kernel callers`
- controlling portfolio proof: `portfolio-proof/AKOS__DELEGATED_KERNEL_CALLER_PROOF_SURFACES__2026-08-11.md`

At this exact canonical head, AKOS implements a caller-side delegated-execution boundary where task submission success is insufficient for promotion. The client requires explicit caller identity and verifies terminal evidence against the expected task ID, trace ID, delegated caller, executor/result state, and receipt SHA-256 before treating the result as verified.

Current source/adversarial test surface preserves and tests delegated caller identity across invoke -> terminal task readback -> receipt readback -> verification, including receipt-tampering rejection.

### Why this maps to Agent Infrastructure

OpenAI's Agent Infrastructure problem is not only workload launch. A production agent platform must preserve the identity and authority context under which delegated work was initiated and must distinguish a provider/task success signal from a trustworthy completion result.

AKOS therefore adds a specific fit mechanism to the existing GlacierEQ control-plane projection:

`delegated caller identity -> bounded invocation -> terminal receipt readback -> caller/task/trace/hash verification -> result promotion or refusal`

This complements the already documented portfolio patterns for fail-closed admission, resource constraints, replay/idempotency, provider mutation reconciliation, and evidence-carrying execution. It is a distinct mechanism rather than another repository-count claim: **delegated caller identity survives into terminal evidence verification before completion is trusted**.

## Evidence ceiling

Claim ceiling:

`OPENAI_AGENT_INFRA_ALIGNMENT_WITH_AKOS_DELEGATED_IDENTITY_CURRENT_SOURCE_AND_ADVERSARIAL_TEST_IMPLEMENTATION_NOT_CURRENT_HEAD_CI_OR_DEPLOYMENT`

Allowed claims:

- AKOS current canonical source contains delegated-caller verification logic.
- The current source tree contains adversarial tests for delegated caller preservation and receipt tampering.
- The mechanism is architecturally relevant to trusted delegated agent execution.

Forbidden inferences:

- no current-head AKOS CI pass;
- no AKOS deployment or production traffic;
- no OpenAI integration or adoption;
- no exactly-once distributed execution claim;
- no hyperscale, million-fold scaling, cluster-runtime, or Terraform equivalence;
- no inference from repository count.

## Recruiter-safe insertion

> Added a delegated-execution trust boundary in AKOS where remote task success is not enough: caller identity must survive invocation and match terminal receipt evidence, alongside task/trace identity and receipt integrity, before the result is promoted as verified. This maps directly to the correctness side of agent infrastructure while remaining separate from unproven hyperscale cluster and production-runtime experience.

## Machine delta

```json
{
  "schema": "glaciereq.portfolio.company-fit-delta.v1",
  "company": "OpenAI",
  "role": "Software Engineer, Agent Infrastructure",
  "parent_projection": "COMPANY_FIT_OPENAI_AGENT_INFRASTRUCTURE.md",
  "external_role_observed_live": "2026-08-11",
  "capability": "delegated_execution_identity_preservation",
  "fit": "STRONG_CURRENT_SOURCE_CONTRACT",
  "evidence": {
    "repo": "GlacierEQ/AKOS",
    "revision": "eac3cab001306225b99da41c37370528331966dd",
    "merge": "PR #27",
    "proof_surface": "portfolio-proof/AKOS__DELEGATED_KERNEL_CALLER_PROOF_SURFACES__2026-08-11.md",
    "source_anchors": [
      "operational_cognition/computer_kernel_client.py",
      "tests/test_computer_kernel_client.py"
    ]
  },
  "claim_ceiling": "OPENAI_AGENT_INFRA_ALIGNMENT_WITH_AKOS_DELEGATED_IDENTITY_CURRENT_SOURCE_AND_ADVERSARIAL_TEST_IMPLEMENTATION_NOT_CURRENT_HEAD_CI_OR_DEPLOYMENT",
  "forbidden_inferences": [
    "openai_affiliation",
    "openai_integration",
    "current_head_akos_ci_pass",
    "production_deployment",
    "hyperscale_equivalence",
    "exactly_once_execution"
  ],
  "next_cursor": "Obtain exact-SHA executed AKOS verification for eac3cab001306225b99da41c37370528331966dd, then fold this delta into the canonical OpenAI company-fit projection without widening scale claims."
}
```

## Portfolio-state delta

The OpenAI Agent Infrastructure fit is now stronger on **trusted delegated execution semantics** while its scale ceiling remains unchanged. This artifact should be merged into the canonical company-fit surface only after normal control-plane review/readback; no existing scale or deployment gap is retired by this delta.

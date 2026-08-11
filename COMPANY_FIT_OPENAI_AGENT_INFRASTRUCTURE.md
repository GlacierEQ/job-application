# Company Fit Projection — OpenAI Agent Infrastructure

## Status

**Projection class:** EVIDENCE-BOUNDED COMPANY FIT  
**Company:** OpenAI  
**Target role:** Software Engineer, Agent Infrastructure  
**External role refreshed:** 2026-08-11  
**Proof binding refreshed:** 2026-08-11  
**Truth boundary:** This is an independent GlacierEQ fit analysis based on current public OpenAI role material and current GlacierEQ repository evidence. It does not imply affiliation, endorsement, proprietary access, employment, production deployment at OpenAI scale, or demonstrated million-fold scaling experience.

## Current external bottleneck

OpenAI's current Agent Infrastructure role describes an in-house orchestration platform intended to scale beyond conventional Kubernetes, agent execution environments used for both training and production, FastAPI/gRPC interfaces, infrastructure for research experiments, and rapid scaling toward extremely large compute environments. The live role was re-verified on 2026-08-11.

Official role source:
https://openai.com/careers/software-engineer-agent-infrastructure-san-francisco/

The role's infrastructure boundary includes not only launching agent workloads, but deciding what may execute, under which identity/resource/authority context, how long-running work is observed and recovered, and when an execution result is trustworthy enough to promote as complete.

Canonical Helix company-study record already identified the same operating pressure: reliable orchestration, sandboxing, scheduling, state recovery, observability, and bounded execution for long-running model-driven workloads.

Helix record:
`site-v15/data/helix-root.json`

## Strongest verified overlap

### 1. Evidence-carrying delegated execution — STRONG / CURRENT SOURCE CONTRACT

The canonical capability cluster `portfolio-proof/CAPABILITY_CLUSTER__EVIDENCE_CARRYING_EXECUTION__2026-08-11.md` establishes a repeated engineering pattern across two independent systems:

`bind operation identity/input -> attenuate authority -> carry exact evidence through execution -> refuse completion promotion without receipt closure`

Independent donors:

- `GlacierEQ/public-actions-runner-host@597c188b2734d750fcfbdde9e7374afe74dc9b45` — immutable repository/workflow/actor identity, strict metadata-only job envelopes, one-repository short-lived tokens, replay guard, and immutable receipts binding payload SHA-256 plus execution context; successful workload execution without successful receipt publication remains blocked.
- `GlacierEQ/the-tower-of-babel@f7e132c9717eda574f3bb5f643b2f983309f319f` — mission input hashing, registry-bound authority, typed telemetry carrying evidence hashes, constrained persisted state, explicit receipt monotonicity, and deterministic tamper-evident receipt closure while unavailable stages remain explicit blockers.

**Fit:** directly relevant to agent infrastructure where delegated model/tool execution must retain trustworthy identity, input, authority, and outcome provenance across asynchronous or long-running workflows. It strengthens the portfolio fit beyond generic orchestration: the control plane can make completion claims auditable rather than equating task launch/provider success with trusted completion.

**Ceiling:** current source-contract / flagship-path evidence only. No claim of OpenAI integration, production-scale operation, live OIDC completion, unavailable Tower-stage execution, or hyperscale throughput.

### 2. Fail-closed execution envelopes — STRONG

The canonical cross-repository proof establishes the repeated control sequence:

`identity/intent -> precondition validation -> bounded authority/resources -> deterministic execution or refusal -> canonical reconciliation -> durable evidence`

Primary proof artifact:
`portfolio-proof/CAPABILITY_CLUSTER__FAIL_CLOSED_EXECUTION_ENVELOPES__2026-08-09.md`

Independent evidence boundaries include:

- `GlacierEQ/anthropic-agent-coordinator@87438f57bdfd2cb380730cf51140611963d7c95b` — dependency-aware scheduling, global token-budget conservation, aggregate role-capacity enforcement, structured deferral, fail-fast graph/resource validation, and 62/62 repository-native tests at the pinned executable revision;
- `GlacierEQ/sigma-glue@4a1ca8e5c88a62e8a94a43213b2c509af6afcea3` plus `GlacierEQ/ECHO@d87276166041d655452abd4e992a755565f9201c` — stable identity, idempotency/replay boundaries, provenance/integrity checks, fail-closed unsupported capability handling, and durable reconciliation state under exact-revision behavioral verification;
- `GlacierEQ/apex-github-worker@1a5331a0203e1273c1045589ea66f5bcf1080b55` — exact patch/check preconditions, expected-head guarding, bounded real-GitHub-provider mutation, canonical post-mutation readback, 26/26 Merge Authority proof tests, 38/38 proof-host gateway tests, and replay suppression where the reproduced second attempt returned `DUPLICATE_ALREADY_COMPLETED` without another mutation.

**Fit:** directly relevant to admission, resource constraints, stale-state refusal, mutation authority, completion reconciliation, and explainable failure behavior around autonomous agent execution.

**Ceiling:** this proves a repeated evidence-bound control pattern across independent systems. It does not prove OpenAI-scale infrastructure, generalized exactly-once distributed semantics, production reliability, or external adoption.

### 3. Deterministic orchestration and state-aware coordination — STRONG / BOUNDED

The pinned coordinator evidence makes this overlap concrete rather than repository-count based: dependency order, capacity, priority, global budgets, refusal/deferral states, and explicit completion are behavior-tested at a specific executable revision.

Relevant systems:

- `GlacierEQ/anthropic-agent-coordinator@87438f57bdfd2cb380730cf51140611963d7c95b`
- `GlacierEQ/mastermind`
- `GlacierEQ/job-app-helix`

**Fit:** relevant to scheduler/control-plane reasoning and long-running agent workflows.  
**Ceiling:** this evidence does not establish OpenAI-scale cluster orchestration, globally distributed scheduler performance, or million-fold workload scaling.

### 4. Evidence, recovery, and failure semantics — STRONG

Sigma Glue/ECHO and the broader portfolio control plane separate operation identity, admissibility, execution, reconciliation, and promotion state rather than treating an attempted action as proof of completion. Unsupported promotion fails closed, and durable evidence remains available for later reconciliation.

The Evidence-Carrying Execution cluster now adds a stronger provenance boundary: exact operation identity/input and authority are carried into the receipt rather than reconstructed after the fact.

**Fit:** useful for agent infrastructure where retries, stale state, recovery, observability, provenance, and completion correctness matter as much as launching work.

## Partial overlap

### API/control-plane interfaces — PARTIAL

Current GlacierEQ work includes FastAPI, REST, JSON-RPC, MCP, JSON Schema, and machine-facing control contracts. This supports interface-design relevance.

**Gap:** this projection does not claim current production-scale gRPC service ownership or OpenAI-scale API throughput.

### Infrastructure automation — PARTIAL

The portfolio contains deployment, GitHub Actions, Docker, Vercel, cloud automation, and infrastructure-governance work.

**Gap:** the current proof set used here does not establish deep Terraform ownership at hyperscale.

## Material gaps that must remain explicit

The current role asks for experience that this proof cycle does **not** establish:

- large-scale ML training infrastructure ownership;
- extreme cluster-scale performance optimization;
- deep virtualization/container runtime expertise such as Firecracker, gVisor, Kata, or Sysbox;
- Terraform at large production scale;
- demonstrated 1,000,000x scaling of a production system;
- direct operation of infrastructure serving hundreds of millions of users.

These are application gaps, not claims to infer from repository volume.

## Recruiter-safe projection

> Built independent agent and automation systems around two recurring control-plane patterns: fail closed before invalid work executes, and carry exact identity/input/authority context into durable completion evidence. That maps strongly to the correctness and provenance side of OpenAI Agent Infrastructure—especially long-running delegated execution—while large-scale ML cluster operations, virtualization depth, and hyperscale performance remain explicit experience gaps.

## Master projection

The strongest transfer is **trusted control-plane execution under autonomous delegation**, not cluster-size equivalence. The evidence spans deterministic resource/graph admission, idempotent recovery/provenance, guarded real-provider mutation, and evidence-carrying execution receipts. Across those domains, the same architecture appears: stale or invalid work is refused before action, admissible work is bounded by explicit constraints, operation identity and input are retained through execution, and provider/task success is not treated as final until canonical state or durable evidence reconciles the outcome.

For OpenAI Agent Infrastructure, that pattern is most relevant at the boundary between model-driven workloads and the systems that decide what may run, under what resource and authority envelope, how retries/stale state are handled, and when completion is trusted. The projection should therefore lead with reliability semantics, execution provenance, and bounded authority, then explicitly distinguish those strengths from unproven hyperscale infrastructure experience.

## Machine projection

```json
{
  "projection_id": "COMPANY-FIT-OPENAI-AGENT-INFRA-2026-08-11",
  "company": "OpenAI",
  "role": "Software Engineer, Agent Infrastructure",
  "external_role_refreshed": "2026-08-11",
  "proof_binding_refreshed": "2026-08-11",
  "fit": {
    "evidence_carrying_delegated_execution": "STRONG_CURRENT_SOURCE_CONTRACT",
    "fail_closed_execution_envelopes": "STRONG",
    "deterministic_orchestration": "STRONG_BOUNDED",
    "evidence_recovery_failure_semantics": "STRONG",
    "api_control_plane_interfaces": "PARTIAL",
    "infrastructure_automation": "PARTIAL"
  },
  "bound_evidence": [
    "public-actions-runner-host@597c188b2734d750fcfbdde9e7374afe74dc9b45:current_source_contract",
    "the-tower-of-babel@f7e132c9717eda574f3bb5f643b2f983309f319f:current_source_contract_flagship_path",
    "anthropic-agent-coordinator@87438f57bdfd2cb380730cf51140611963d7c95b:62/62",
    "sigma-glue@4a1ca8e5c88a62e8a94a43213b2c509af6afcea3",
    "ECHO@d87276166041d655452abd4e992a755565f9201c",
    "apex-github-worker@1a5331a0203e1273c1045589ea66f5bcf1080b55:26/26+38/38+real_provider_readback+replay_suppression"
  ],
  "explicit_gaps": [
    "large_scale_ml_training_infrastructure",
    "hyperscale_cluster_performance",
    "deep_virtualization_runtime_expertise",
    "terraform_at_large_production_scale",
    "million_fold_scaling_evidence",
    "hundreds_of_millions_user_scale_operations"
  ],
  "primary_capability_proofs": [
    "portfolio-proof/CAPABILITY_CLUSTER__EVIDENCE_CARRYING_EXECUTION__2026-08-11.md",
    "portfolio-proof/CAPABILITY_CLUSTER__FAIL_CLOSED_EXECUTION_ENVELOPES__2026-08-09.md"
  ],
  "historical_company_study": "site-v15/data/helix-root.json",
  "claim_ceiling": "TRUSTED_CONTROL_PLANE_EXECUTION_ALIGNMENT_NOT_SCALE_EQUIVALENCE"
}
```

## Mesh / next proof gate

- Preserve OpenAI company-study inference separately from official role facts.
- Do not turn API/tool exposure into production-scale ownership.
- Do not infer infrastructure scale from repository count.
- Do not promote live OIDC completion for `public-actions-runner-host` without its required real-run receipt.
- Do not claim unavailable Tower toolchain stages executed.
- Current projection is pinned to exact source-contract evidence for execution provenance and exact executable evidence for the strongest orchestration/recovery/mutation claims.
- Strongest next widening gate: independently verify a canonical container/runtime or Terraform implementation at an exact revision before upgrading either infrastructure-depth dimension.

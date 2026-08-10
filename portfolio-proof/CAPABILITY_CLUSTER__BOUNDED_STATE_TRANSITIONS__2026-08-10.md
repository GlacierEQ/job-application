# Capability Cluster — Bounded State Transitions Under Explicit Failure Semantics

Status: `BEHAVIOR_TESTED_MULTI_REPO_PATTERN`

This proof object extracts one repeated engineering pattern from independent canonical systems: **state changes are admitted only after explicit constraints are evaluated, and non-admission remains visible rather than being silently converted into success.** Repository count is not accomplishment count; the claim is the repeated mechanism.

## Recruiter surface

Builds agentic control systems that make unsafe, unfunded, dependency-blocked, or evidence-invalid transitions explicit before they become actions or claims. Across independent systems, the pattern appears as deterministic scheduling with structured deferral, tool-policy review with `ALLOW` / `CONFIRM` / `DENY`, and evidence governance that refuses to turn infrastructure failure into performance evidence.

## Master surface

The common architecture is a bounded transition function:

`proposed state -> validate prerequisites/authority/resources/evidence -> admit | defer | confirm | deny | invalidate -> emit machine-readable reason`

Three independently named canonical systems instantiate different seams of that architecture:

1. **Work admission — `anthropic-agent-coordinator`**: dependency readiness, stable priority, global token budget, aggregate role capacity, full-funding admission, structured deferral, and fail-closed malformed-graph/resource validation.
2. **Risky-action admission — `anthropic-safety-monitor`**: parsed proposed calls receive explicit `ALLOW`, `CONFIRM`, or `DENY` dispositions; configured destructive/high-risk operations cannot silently pass the review boundary.
3. **Evidence/claim admission — `job-app-helix` worker science**: infrastructure-invalid attempts cannot become performance-valid; provider failure remains `PROVIDER_BLOCKED`; causal worker-value promotion requires matched ablation evidence.

The engineering pattern is therefore broader than “multi-agent orchestration.” It is **bounded state transition under explicit failure semantics** across execution planning, risky-action review, and evidence promotion.

## Exact evidence bindings

### GlacierEQ/anthropic-agent-coordinator

- canonical revision: `ac977563cfd59deb8e87177f53082184f6468aa8`
- inspected path: `src/anthropic_agent_coordinator/coordinator.py`
- inspected blob: `795c8fcd94ec4e4ed65d1c3a4f8254281eaa9f8f`
- pinned Helix receipt: `status/wave-1-anthropic-agent-coordinator-2026-07-31.json`
- bounded executable evidence: Python 3.13.5 candidate, **62 collected / 62 executed / 62 passed / 0 failures / 0 errors / 0 skips**
- nonclaims: agent execution, provider calls, distributed execution, production scale, deployment

### GlacierEQ/anthropic-safety-monitor

- canonical revision: `a5c21172e32ce6054994402c38d86f7ef94bc56b`
- inspected path: `src/anthropic_safety_monitor/policy.py`
- inspected blob: `f8f7fce09216b565141a05c115587f1a0334be22`
- pinned Helix receipt: `status/wave-1-anthropic-safety-monitor-2026-07-31.json`
- bounded executable evidence: Python 3.11 / 3.12 / 3.13, **51 tests per version / 153 executions / 0 failures / 0 errors / 0 skips**
- nonclaims: tool execution, complete semantic safety, automatic approval, production detection coverage, sandboxing, deployment

### GlacierEQ/job-app-helix

- canonical evidence lineage: Anthropic worker-science bridge and `src/job_app_helix/worker_science.py`
- verified governance behavior: infrastructure-invalid attempts remain invalid; quality remains observational absent causal evidence; provider failure projects as `PROVIDER_BLOCKED`; marginal system value/outcome leverage require a valid matched ablation
- current Anthropic second-depth authority after separate canonical promotion: `8345955b67f163c3215b23195a267b6021a5be5e`, stage `CODE_INSPECTED`
- nonclaims: causal worker value without ablation, provider reliability, production behavior

## Machine surface

```yaml
proof_object: capability_cluster/bounded_state_transitions/v1
status: BEHAVIOR_TESTED_MULTI_REPO_PATTERN
pattern:
  proposed_transition_is_explicit: true
  admission_constraints_are_explicit: true
  non_admission_is_machine_visible: true
  failure_is_not_silently_promoted_to_success: true
independent_sources:
  - repository: GlacierEQ/anthropic-agent-coordinator
    revision: ac977563cfd59deb8e87177f53082184f6468aa8
    seam: work_admission
    outcomes: [assign, defer, reject_invalid]
    tests: {executed: 62, passed: 62, failures: 0, errors: 0, skipped: 0}
  - repository: GlacierEQ/anthropic-safety-monitor
    revision: a5c21172e32ce6054994402c38d86f7ef94bc56b
    seam: risky_action_admission
    outcomes: [ALLOW, CONFIRM, DENY]
    tests:
      versions: ["3.11", "3.12", "3.13"]
      per_version: 51
      executed: 153
      failures: 0
      errors: 0
      skipped: 0
  - repository: GlacierEQ/job-app-helix
    revision: 8345955b67f163c3215b23195a267b6021a5be5e
    seam: evidence_and_claim_admission
    outcomes: [performance_valid, infrastructure_invalid, PROVIDER_BLOCKED, ablation_required]
claim_ceiling: behavior_tested_repeated_control_pattern
nonclaims:
  - production_deployment
  - production_scale
  - complete_semantic_safety
  - distributed_execution
  - provider_reliability
  - causal_worker_value_without_ablation
  - company_affiliation
```

## Mesh surface

### Proven now

- Independent systems repeat the same control principle at three different transition seams.
- Coordinator evidence proves bounded work admission and explicit deferral within its tested scope.
- Safety-monitor evidence proves bounded policy disposition within its tested scope.
- Helix worker science independently applies fail-closed admission to experimental evidence and claim promotion.

### Explicitly retired framing

Do not describe this family merely as “multi-agent orchestration.” That phrase hides the stronger repeated mechanism and can imply execution that the coordinator does not perform. The preferred capability language is **bounded state transitions under explicit failure semantics**.

### Promotion gate

Promote beyond `BEHAVIOR_TESTED_MULTI_REPO_PATTERN` only when a cross-system runtime scenario demonstrates the same transition contract through actual execution/recovery with exact receipts. Do not infer production/runtime proof from repository-local tests.

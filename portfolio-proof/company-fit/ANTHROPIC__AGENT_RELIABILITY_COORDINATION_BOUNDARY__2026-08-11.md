# Anthropic — Agent Reliability / Coordination Proof Boundary

## Purpose

Advance the existing Anthropic company lens by binding one company-specific reliability remedy to direct repository evidence without inheriting proof across revisions or treating a company-themed repository as evidence by name.

## Company-study bottleneck

The existing canonical Anthropic company-study surface records the inferred bottleneck as increasing useful autonomy while retaining honest uncertainty, safety boundaries, and measurable behavior. Its stated brick wall is preventing higher-capability agents from becoming opaque, unsafe, reward-hacking, or operationally unreliable in open-ended environments.

This is a GlacierEQ inference from the recorded public-source snapshot, not an Anthropic-confirmed internal condition.

## Defensible mechanism

Repository: `GlacierEQ/anthropic-agent-coordinator`

Historical proved revision: `87438f57bdfd2cb380730cf51140611963d7c95b`

At that exact revision, the repository's governed TEST receipt records 62 collected / 62 executed / 62 passed / 0 failures / 0 errors / 0 skips under Python 3.13.5. The bounded mechanism is deterministic dependency-aware scheduling under shared global and aggregate per-role budgets, with explicit deferral instead of fabricated completion.

Reliability properties supported by that historical exact-revision proof include:

- prerequisites must be fully assigned before downstream work can become completed;
- assignments require full task funding rather than silently treating partial funding as completion;
- global and per-role resource limits are conserved across assignments;
- malformed dependencies, cycles, duplicate IDs, unsupported roles, and invalid resource values fail closed;
- deferred work remains explicit with structured reasons and blocking dependencies;
- JUnit evidence is reconciled and SHA-256-bound before promotion.

## Anthropic fit

This mechanism maps to the company-study reliability problem at a narrow but consequential layer: **agent coordination should expose incomplete work and resource/dependency blockers instead of converting partial progress into trusted completion state.**

Recruiter-safe claim:

> Built and exact-revision tested a deterministic agent coordinator that refuses partial-funding-as-completion, preserves dependency blocking, enforces aggregate resource limits, and emits explicit deferral state. The pattern is relevant to reliable agent infrastructure because downstream work cannot silently inherit completion from unfinished prerequisites.

## Current-head integrity boundary

Current canonical repository head observed for this cycle:

`GlacierEQ/anthropic-agent-coordinator@7d15bfaec0040e7a55d4b435abcf0fe9e7b19cb1`

That head contains the later CI supply-chain hardening that pins the reusable verification workflow to immutable donor revision `a6085dae73bb80e91b845fd4a0d2f73a9c6b985a`.

However, the current canonical README visibly contains unresolved Git conflict markers (`<<<<<<<`, `=======`, `>>>>>>>`). Therefore this artifact does **not** promote the current head as documentation-clean or as inheriting the historical 62-test receipt. Current-head executed verification is separately required.

## Claim ceiling

`ANTHROPIC_AGENT_RELIABILITY_ALIGNMENT_WITH_HISTORICAL_EXACT_REVISION_COORDINATOR_TEST_PROOF__CURRENT_HEAD_DOC_INTEGRITY_AND_EXECUTED_PROOF_UNRESOLVED`

Allowed:

- historical exact revision `87438f57...` has a governed 62/62 TEST receipt;
- that proved revision implements deterministic dependency/resource coordination and explicit deferral semantics;
- those mechanisms are relevant to reliable agent coordination;
- current head `7d15bfa...` pins its reusable CI donor by immutable SHA.

Not allowed:

- current-head test-pass inheritance from `87438f57...`;
- current-head documentation-integrity claim;
- Anthropic affiliation, adoption, integration, or internal use;
- production deployment, traffic, scale, latency, or reliability claims;
- agent execution/provider-call claims from the scheduler;
- semantic AI safety, reward-hacking prevention, or model-behavior guarantees from scheduling mechanics alone;
- treating `anthropic-agent-coordinator` or `anthropic-safety-monitor` names as independent accomplishment proof.

## Machine receipt

```json
{
  "schema": "glaciereq.portfolio.company-fit-delta.v1",
  "company": "Anthropic",
  "target_problem": "agent_reliability_and_honest_completion_state",
  "problem_source": "site-v15/companies/anthropic/index.html",
  "problem_status": "GLACIEREQ_INFERENCE_FROM_RECORDED_PUBLIC_SOURCE_SNAPSHOT",
  "capability": "deterministic_dependency_and_resource_bounded_agent_coordination",
  "evidence": {
    "repository": "GlacierEQ/anthropic-agent-coordinator",
    "historical_proved_revision": "87438f57bdfd2cb380730cf51140611963d7c95b",
    "historical_test_result": {
      "python": "3.13.5",
      "collected": 62,
      "executed": 62,
      "passed": 62,
      "failures": 0,
      "errors": 0,
      "skipped": 0
    },
    "current_canonical_head": "7d15bfaec0040e7a55d4b435abcf0fe9e7b19cb1",
    "current_head_ci_pin": "GlacierEQ/public-actions-runner-host/.github/workflows/reusable-quick-ci.yml@a6085dae73bb80e91b845fd4a0d2f73a9c6b985a",
    "current_head_documentation_integrity": "FAILED_UNRESOLVED_GIT_CONFLICT_MARKERS",
    "current_head_executed_test_proof": "NOT_ESTABLISHED_BY_THIS_ARTIFACT"
  },
  "claim_ceiling": "ANTHROPIC_AGENT_RELIABILITY_ALIGNMENT_WITH_HISTORICAL_EXACT_REVISION_COORDINATOR_TEST_PROOF__CURRENT_HEAD_DOC_INTEGRITY_AND_EXECUTED_PROOF_UNRESOLVED",
  "next_cursor": "Repair the unresolved README conflict markers on a fresh anthropic-agent-coordinator master branch, preserve the canonical verified contract, then obtain an executed exact-SHA verification receipt before promoting current-head proof or the Anthropic company lens beyond this ceiling."
}
```

## Portfolio-state delta

The Anthropic company lens now has one bounded remedy tied to exact repository evidence instead of repository naming or broad safety language. At the same time, the current-head documentation defect is explicitly quarantined so historical test proof cannot silently promote a changed canonical revision.
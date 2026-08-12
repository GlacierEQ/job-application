# Anthropic — Agent Reliability / Coordination Proof Boundary

## Purpose

Advance the existing Anthropic company lens by binding one company-specific reliability remedy to two independently implemented control mechanisms: deterministic coordination state and pre-execution tool authority. Proof remains revision-bound; repository names are not treated as evidence.

## Company-study bottleneck

The canonical Helix company-study record identifies Anthropic's recruiter thesis as deterministic coordination, fail-closed safety, human escalation, and honest limitations. Its second-depth record already contains a verified public-role/problem receipt for Staff Software Engineer, AI Reliability and explicitly sets the next gate as binding a company-specific reliability remedy to the inspected coordinator and safety-monitor mechanisms.

The broader bottleneck—raising useful autonomy while preserving measurable, non-fabricated completion state and bounded execution authority—is a GlacierEQ inference from recorded public evidence, not an Anthropic-confirmed internal condition.

## Mechanism A — honest coordination state

Repository: `GlacierEQ/anthropic-agent-coordinator`

Historical proved revision: `87438f57bdfd2cb380730cf51140611963d7c95b`

At that exact revision, the governed TEST receipt records 62 collected / 62 executed / 62 passed / 0 failures / 0 errors / 0 skips under Python 3.13.5.

Supported properties:

- prerequisites must be fully assigned before downstream work can become completed;
- assignments require full task funding rather than silently treating partial funding as completion;
- global and per-role resource limits are conserved across assignments;
- malformed dependencies, cycles, duplicate IDs, unsupported roles, and invalid resource values fail closed;
- deferred work remains explicit with structured reasons and blocking dependencies;
- JUnit evidence is reconciled and SHA-256-bound before promotion.

## Mechanism B — bounded tool authority before execution

Repository: `GlacierEQ/anthropic-safety-monitor`

Direct inspected implementation revision: `a5c21172e32ce6054994402c38d86f7ef94bc56b`

Direct inspection of `src/anthropic_safety_monitor/policy.py` establishes a deterministic `ALLOW / CONFIRM / DENY` policy surface for proposed tool calls. The implementation validates input structure, parses shell/tool segments, strips execution wrappers, detects critical destructive operations, requires explicit human confirmation for bounded high-risk classes, and fails closed on malformed arguments it cannot safely parse.

Concrete implemented boundaries include:

- deny filesystem-format commands, raw-device overwrite, fork-bomb patterns, and recursive forced deletion of critical roots;
- require human confirmation for recursive deletion, force-push, `kubectl delete`, `terraform destroy`, host shutdown/reboot, database `DROP TABLE`, and dynamic shell expansion;
- preserve structured rule IDs, severity, decision, reason, and `requires_human_confirmation` in the review result;
- batch review promotes the strongest decision rather than averaging away a deny/confirm result.

This implementation is **not** evidence of semantic model safety, harmlessness, production deployment, or comprehensive command-security coverage. No exact-head executed safety-monitor test receipt is claimed here.

Current canonical safety-monitor head observed: `6af397feea78829f494d61e98388bd4f9d90bcbe`. The inspected implementation identity above remains the evidence anchor used by the existing Helix record; this artifact does not transfer execution proof to the changed current head.

## Anthropic fit

Together, the two mechanisms address complementary reliability failure modes:

1. **state integrity:** incomplete or blocked agent work must remain incomplete or deferred rather than being promoted to completion;
2. **authority integrity:** proposed tool actions must cross an explicit allow/confirm/deny boundary before dangerous operations can be treated as ordinary execution.

Recruiter-safe claim:

> Built reliability controls at two agent-infrastructure boundaries: an exact-revision tested coordinator that preserves dependency/resource blockers instead of manufacturing completion, and an independently inspected tool-call policy engine that deterministically escalates or denies destructive operations before execution. The combined pattern is relevant to reliable agent infrastructure because both completion state and execution authority remain explicit and fail-closed.

## Current-head integrity boundaries

### Agent Coordinator

Current canonical head: `GlacierEQ/anthropic-agent-coordinator@7d15bfaec0040e7a55d4b435abcf0fe9e7b19cb1`.

That head pins the reusable CI workflow to immutable donor revision `a6085dae73bb80e91b845fd4a0d2f73a9c6b985a`, but it does not inherit the historical 62/62 proof. Its canonical README currently contains unresolved Git conflict markers; a separate repair PR exists but is not canonical until merged and exact-SHA verified.

### Safety Monitor

Current canonical head: `GlacierEQ/anthropic-safety-monitor@6af397feea78829f494d61e98388bd4f9d90bcbe`.

No PR-triggered workflow run was found for that exact current head during this proof cycle. Therefore the safety-monitor contribution is classified as **direct inspected implementation evidence**, not current-head executed proof.

## Claim ceiling

`ANTHROPIC_AI_RELIABILITY_ALIGNMENT_WITH_HISTORICAL_COORDINATOR_EXECUTED_PROOF_PLUS_DIRECT_SAFETY_POLICY_IMPLEMENTATION__CURRENT_HEAD_PROOF_NOT_INHERITED`

Allowed:

- coordinator revision `87438f57...` has a governed 62/62 TEST receipt;
- that exact revision implements deterministic dependency/resource coordination and explicit deferral semantics;
- safety-monitor revision `a5c21172...` directly implements deterministic allow/confirm/deny tool-call authority boundaries and human-escalation rules;
- the two mechanisms are complementary reliability controls relevant to agent infrastructure;
- current coordinator and safety-monitor heads are separately identified and not silently certified by older evidence.

Not allowed:

- current-head coordinator test-pass inheritance from `87438f57...`;
- current-head safety-monitor test-pass or runtime claims;
- Anthropic affiliation, adoption, integration, or internal use;
- production deployment, traffic, scale, latency, or reliability-SLA claims;
- semantic AI safety, reward-hacking prevention, alignment guarantees, or model-behavior guarantees;
- comprehensive shell/command security coverage beyond implemented policy rules;
- treating Anthropic-themed repository names as independent accomplishment proof.

## Machine receipt

```json
{
  "schema": "glaciereq.portfolio.company-fit-delta.v2",
  "company": "Anthropic",
  "target_problem": "agent_reliability_state_integrity_and_bounded_execution_authority",
  "problem_source": "site-v15/data/helix-root.json::anthropic.second_depth",
  "problem_status": "VERIFIED_ROLE_AND_PROBLEM_RECORD_WITH_GLACIEREQ_REMEDY_INFERENCE",
  "role_evidence_state": "VERIFIED_IN_CANONICAL_HELIX_RECORD",
  "mechanisms": [
    {
      "repository": "GlacierEQ/anthropic-agent-coordinator",
      "evidence_class": "HISTORICAL_EXACT_REVISION_EXECUTED_TEST_PROOF",
      "proved_revision": "87438f57bdfd2cb380730cf51140611963d7c95b",
      "test_result": {
        "python": "3.13.5",
        "collected": 62,
        "executed": 62,
        "passed": 62,
        "failures": 0,
        "errors": 0,
        "skipped": 0
      },
      "current_canonical_head": "7d15bfaec0040e7a55d4b435abcf0fe9e7b19cb1",
      "current_head_executed_proof": "NOT_INHERITED"
    },
    {
      "repository": "GlacierEQ/anthropic-safety-monitor",
      "evidence_class": "DIRECT_INSPECTED_IMPLEMENTATION",
      "inspected_revision": "a5c21172e32ce6054994402c38d86f7ef94bc56b",
      "implementation_path": "src/anthropic_safety_monitor/policy.py",
      "implemented_boundary": "DETERMINISTIC_ALLOW_CONFIRM_DENY_WITH_HUMAN_ESCALATION_AND_CRITICAL_OPERATION_DENIAL",
      "current_canonical_head": "6af397feea78829f494d61e98388bd4f9d90bcbe",
      "current_head_executed_proof": "NOT_ESTABLISHED"
    }
  ],
  "claim_ceiling": "ANTHROPIC_AI_RELIABILITY_ALIGNMENT_WITH_HISTORICAL_COORDINATOR_EXECUTED_PROOF_PLUS_DIRECT_SAFETY_POLICY_IMPLEMENTATION__CURRENT_HEAD_PROOF_NOT_INHERITED",
  "next_cursor": "Finish and exact-SHA verify the coordinator README repair; independently obtain an exact-current-head safety-monitor verification receipt; then promote the Anthropic second-depth record from inspected alignment to reproduced two-boundary reliability proof without widening semantic-safety or deployment claims."
}
```

## Portfolio-state delta

The Anthropic company-fit object now closes the canonical Helix next-gate shape at the implementation level: one bounded reliability remedy is explicitly composed from the already-inspected coordinator and safety-monitor mechanisms. Evidence classes remain asymmetric and revision-bound, so stronger company-fit specificity is gained without inflating either current-head proof or semantic-safety claims.

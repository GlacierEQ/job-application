# Résumé — AI Safety / Reliability Engineer

**Casey Del Carpio Barton** | glacier.equilibrium@gmail.com | Honolulu, HI (Mainland PT/ET sync · burst travel ~25%)
GitHub: [GlacierEQ](https://github.com/GlacierEQ) | Portfolio: [casey-barton-glaciereq.vercel.app](https://casey-barton-glaciereq.vercel.app/) | LinkedIn: [caseybartonai](https://www.linkedin.com/in/caseybartonai)

## Positioning

I build provenance, policy-bound tools, deterministic replay, evidence states, and fail-closed controls for agentic systems. My work makes refusal and failure explicit, guards concurrent replays, binds decisions to inspectable receipts, and draws explicit ceilings on what local proof establishes.

## Three Flagship Systems (proof-linked)

| System | Role Proof | Evidence |
|---|---|---|
| **Constitutional Tool Transcript** | AI Safety / Provenance | Deterministic transcript model: every tool call bound to policy hash and red-lines. Replay reproduces allow/refuse bit-identically. 26/26 Python tests, passing Node suite, clean Ruff. No company affiliation claimed. [GitHub ↗](https://github.com/GlacierEQ/anthropic-constitutional-tool-transcript) |
| **Mission Agentic AI Assurance** | Guardrails / Evals / Reliability | Content-bound provenance, deterministic receipts, thread-safe idempotency, finite-metric drift gating, policy decisions, circuit breaking. 17/17 acceptance tests reproduced across Python 3.11–3.13 (0 failures). [GitHub ↗](https://github.com/GlacierEQ/job-application/tree/main/projects/mission-agentic-ai-assurance) |
| **APEX Control Plane — Fail-Closed Boundaries** | Agent Safety / Reliability | Idempotency keys, circuit breakers, dead-letter capture, audit receipts, continuity boot, execution-state integrity, adversarial regression. 617 tracked files. [GitHub ↗](https://github.com/GlacierEQ/apex-control-plane) |

## Core Competencies

**Provenance & Deterministic Replay** — Constitutional Transcript: policy-bound tool calls, replay required for bit-identical allow/refuse. APEX: immutable SHA-256 envelopes, receipt ledgers.

**Evidence States & Fail-Closed Controls** — met/unmet/unknown tri-state. Missing evidence is unknown, never a defect verdict. Remote-only repos cannot be promoted. No lifecycle authority (retire/archive/merge = Operator-only).

**Guardrails & Evaluation** — Mission Assurance: content-bound snapshots, drift gating (finite metrics only), thread-safe idempotency, circuit breaking. 17/17 reproduced acceptance tests.

**Reliability Engineering** — Tasklet: bounded concurrency, deadlines, payload admission, idempotency, duplicate suppression, terminal outcomes, suspend/resume. Sigma Glue: provider readback, restart-readable recovery, deterministic replay guards.

**Operational Ownership** — Tests, CI, exact-head reasoning, integrity manifests, regression cases, fail-closed promotion. Maps to production reliability, observability, ownership.

## Selected Technical Depth

- **Constitutional Tool Transcript** — Independent safety/provenance implementation. Deterministic transcript model. Every tool call bound to policy hash and red-lines. Replay required to reproduce decisions bit-identically. Explicitly claims no company affiliation, production deployment, cryptographic signatures, or tool-result verification.

- **Mission Agentic AI Assurance** — Reference implementation iterated past happy-path success. Review exposed concurrency, non-finite metric, canonicalization, evidence-binding, and post-side-effect failure problems; defects repaired before proof promotion. PROOF_BOUND claim with explicit ceiling: no deployment, adoption, affiliation, employment, endorsement, contract, clearance, proprietary access, distributed exactly-once semantics, production-scale distributed assurance, aerospace/defense certification, or classified-system validation.

- **APEX Control Plane** — 14-state machine, 12-condition excellent_predicate. Immutable transport envelopes, idempotency keys, fact/inference/proposal distinction, connector retries, circuit breakers, dead-letter capture, audit receipts, continuity boot, execution-state integrity, adversarial regression. 617 files, SQL schemas, CI workflows.

- **Job-App Helix Excellence Contract** — repo_excellence_state_machine.json (14 states). 12 gates evaluated per repo as met/unmet/unknown — never collapsed. State = furthest pipeline state evidence supports. Queue: named flagship → whole → non-fork → readiness. No lifecycle authority.

## Target Roles

**Primary:** AI Safety Engineer, Agent Reliability Engineer, AI Governance Engineer, LLM Systems Engineer
**Strong Fit:** Staff AI Safety Engineer, Applied AI Reliability Engineer, Agent Infrastructure Engineer
**Evidence Alignment:** Anthropic Staff+ (Claude Managed Agents — durable sessions, harnesses, memory, orchestration, recovery, API design), OpenAI Agent Infrastructure, Scale Frontier Agents (guardrails, observability, retries, fallback, evaluation, tracing)

## What I Don't Claim

No employment, affiliation, endorsement, deployment, or proprietary access. The constitutional transcript README explicitly preserves this boundary; the same discipline governs the entire portfolio. Local test, generated receipt, or queued workflow ≠ proof of external provider outcome.

---

*Version: AI Safety / Reliability — tailored for safety, governance, reliability, guardrails, provenance roles. See also: Agent Runtime / Platform version, Forward-Deployed / Applied AI version.*
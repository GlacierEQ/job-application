# Proof Packet — Anthropic Claude Managed Agents

**Role:** Staff+ Software Engineer, Claude Managed Agents  
**Company:** Anthropic  
**Posting:** https://www.anthropic.com/careers/jobs/5395767008  
**Alignment:** Strong conceptual match — durable sessions, stateful long-running systems, sandbox orchestration, tools, memory, permissions, error recovery, evals, multi-agent orchestration, observability, APIs that outlast implementations.

---

## One-Line Positioning

I build the infrastructure around agentic systems: persistent state, context and memory routing, tool execution, orchestration, retries, failure recovery, provenance, regression evaluation, and operator-facing APIs — with explicit safety boundaries, policy-bound tools, and deterministic replay.

---

## Three Proof Systems (source-linked)

| System | What It Proves for This Role | Link |
|---|---|---|
| **Constitutional Tool Transcript — Deterministic Replay** | Policy-bound tool calls, replay reproduces allow/refuse bit-identically. Maps to "tools, permissions, error recovery, evals, observability, APIs that outlast implementations." | [GitHub ↗](https://github.com/GlacierEQ/anthropic-constitutional-tool-transcript) — 26/26 tests, passing Node, clean Ruff |
| **AI Personalization Kernel — Memory-to-Policy Binding** | Typed memory, context-first routing, policy scoring, corrections, replay, drift detection. Maps to "memory, permissions, evals, observability." | [GitHub ↗](https://github.com/GlacierEQ/Ai-Personalization_Kernel) — 94/94 matrix, boot receipts |
| **Mission Agentic AI Assurance — Guardrails & Evals** | Content-bound provenance, deterministic receipts, thread-safe idempotency, finite-metric drift gating, policy decisions, circuit breaking. Maps to "evals, guardrails, multi-agent orchestration, observability." | [GitHub ↗](https://github.com/GlacierEQ/job-application/tree/main/projects/mission-agentic-ai-assurance) — 17/17 tests, REPRODUCED |

---

## Role-Specific Evidence Mapping

| Anthropic Requirement | My System | Evidence |
|---|---|---|
| Durable sessions | ECHO | SQLite/WAL, deterministic identity, receipts |
| Stateful long-running systems | APEX | 14-state machine, mission lifecycle, receipt ledgers |
| Sandbox orchestration | APEX connectors / Tasklet | Bounded execution, circuit breakers, dead-letter |
| Tools | Constitutional Transcript / APEX | Policy-bound calls, retries, authorization |
| Memory | AI Personalization Kernel | Typed memory, context-first routing, drift detection |
| Permissions | Constitutional Transcript | Policy hash binding, red-lines, deterministic replay |
| Error recovery | Sigma Glue / Tasklet | Provider readback, bounded retries, replay guards |
| Evals | Mission Assurance / Helix | 17/17 reproduced, 961 recorded tests, AgentProof gates |
| Multi-agent orchestration | Agent Coordinator / APEX | Ownership, capacity, priority, shared-token budgets |
| Observability | ECHO / APEX | Operator endpoints, receipt ledgers, search/export |
| APIs that outlast implementations | All systems | Machine-readable contracts, versioned receipts, exact-head reasoning |

---

## What I Don't Claim

No employment, affiliation, endorsement, deployment, or proprietary access to Anthropic. The constitutional transcript README explicitly preserves this boundary; the same discipline governs the entire portfolio. This is an **independent safety/provenance implementation**, not Anthropic work.

---

## Delivery

- **Portfolio:** https://casey-barton-glaciereq.vercel.app/
- **Résume (AI Safety):** [RESUME_AI_SAFETY.md](RESUME_AI_SAFETY.md)
- **Case Study:** [CASE_STUDY_DEPENDABLE_AGENT.md](CASE_STUDY_DEPENDABLE_AGENT.md)
- **Architecture Walkthrough:** [ARCHITECTURE_WALKTHROUGH.md](ARCHITECTURE_WALKTHROUGH.md)

---

*Submitted: 2026-11-23*  
*Contact: glacier.equilibrium@gmail.com*
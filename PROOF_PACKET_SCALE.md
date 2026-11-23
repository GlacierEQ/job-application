# Proof Packet — Scale Frontier Agents Engineer

**Role:** Frontier Agents Engineer / Forward Deployed Engineering  
**Company:** Scale AI  
**Posting:** https://scale.com/careers/4694861005  
**Alignment:** Explicit 4+ years SE experience match; production agent architectures combining LLMs, retrieval, memory, tools, enterprise data, orchestration, observability, retries, fallback, evaluation, tracing, guardrails, direct customer architecture.

---

## One-Line Positioning

I build the operating layer around agentic systems: persistent state, context and memory routing, tool execution, orchestration, retries, recovery, provenance, and evidence-bound verification — making AI systems inspectable, recoverable, and dependable in real workflows.

---

## Three Proof Systems (source-linked)

| System | What It Proves for This Role | Link |
|---|---|---|
| **ECHO — Persistent Agent Continuity** | Durable state, idempotent execution, bounded retries, receipts, operator console. Maps to "persistent agent state, asynchronous execution, orchestration, progress reporting, tools, reliability, recovery." | [GitHub ↗](https://github.com/GlacierEQ/ECHO) — REPRODUCED, 48/48 tests |
| **AI Personalization Kernel — Memory-to-Policy Binding** | Typed memory, context-first routing, policy scoring, corrections, replay, drift detection. Maps to "retrieval, memory, tools, enterprise data, evaluation." | [GitHub ↗](https://github.com/GlacierEQ/Ai-Personalization_Kernel) — 94/94 matrix tests |
| **APEX Control Plane — Receipt-Bound Orchestration** | Dispatch, connectors, recovery, state transitions, receipts, fail-closed boundaries, adversarial regression. Maps to "orchestration, observability, retries, fallback, evaluation, tracing, guardrails." | [GitHub ↗](https://github.com/GlacierEQ/apex-control-plane) — 617 files, 14-state machine |

---

## Role-Specific Evidence Mapping

| Scale Requirement | My System | Evidence |
|---|---|---|
| Persistent agent state | ECHO | SQLite/WAL, deterministic identity, SHA-256 receipts |
| Asynchronous execution | Tasklet / Sigma Glue | Bounded concurrency, deadlines, suspend/resume, 140/140 tests |
| Orchestration | APEX | Dispatch, capacity, priority, ownership, 14-state machine |
| Tools / connectors | APEX connectors | Retries, circuit breakers, dead-letter, provider readback |
| Enterprise data integration | AI Personalization Kernel | Supabase write-through, provenance, 162K indexed rows |
| Observability / tracing | APEX + ECHO | Receipt ledgers, operator endpoints, search/export |
| Retries / fallback | Tasklet / Sigma Glue | Exponential backoff, provider readback, replay guards |
| Evaluation / guardrails | Mission Agentic AI Assurance | 17/17 acceptance tests, drift gating, circuit breaking |
| Direct customer architecture | Job-App Helix / Sigma Glue | 166 company dossiers, forward-deployed capabilities, live site |

---

## What I Don't Claim

No employment, affiliation, endorsement, deployment, or proprietary access to Scale AI or any named organization. The constitutional transcript README explicitly preserves this boundary; the same discipline governs the entire portfolio.

---

## Delivery

- **Portfolio:** https://casey-barton-glaciereq.vercel.app/
- **Résume (Forward-Deployed):** [RESUME_FORWARD_DEPLOYED.md](RESUME_FORWARD_DEPLOYED.md)
- **Case Study:** [CASE_STUDY_DEPENDABLE_AGENT.md](CASE_STUDY_DEPENDABLE_AGENT.md)
- **Architecture Walkthrough:** [ARCHITECTURE_WALKTHROUGH.md](ARCHITECTURE_WALKTHROUGH.md)

---

*Submitted: 2026-11-23*  
*Contact: glacier.equilibrium@gmail.com*
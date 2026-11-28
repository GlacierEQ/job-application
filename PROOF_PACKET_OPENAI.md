# Proof Packet — OpenAI Agent Runtime

**Role:** Software Engineer, Product Infrastructure — Agent Runtime  
**Company:** OpenAI  
**Posting:** https://openai.com/careers/software-engineer-product-infrastructure-agent-runtime-san-francisco/  
**Base Range:** $266,000–$445,000 + equity  
**Alignment:** Cleanest high-upside keyword match — persistent agent state, asynchronous execution, orchestration, progress reporting, tools, reliability, recovery, APIs, reusable runtime primitives.

---

## One-Line Positioning

I build the infrastructure around agentic systems: persistent state, context and memory routing, tool execution, orchestration, retries, failure recovery, provenance, regression evaluation, and operator-facing APIs — designed to make AI systems inspectable, recoverable, and dependable in real workflows.

---

## Three Proof Systems (source-linked)

| System | What It Proves for This Role | Link |
|---|---|---|
| **ECHO — Persistent Agent Continuity** | Persistent agent state, asynchronous execution, idempotent jobs, bounded retries, receipts, operator-facing API. Direct match to "persistent agent state, asynchronous execution, orchestration, progress reporting, tools, reliability, recovery, APIs." | [GitHub ↗](https://github.com/GlacierEQ/ECHO) — REPRODUCED, 48/48 tests |
| **APEX Control Plane — Receipt-Bound Orchestration** | Dispatch, connectors, recovery, state transitions, receipts, fail-closed external-action boundaries, reusable runtime primitives. Maps to "orchestration, progress reporting, tools, reliability, recovery, reusable runtime primitives." | [GitHub ↗](https://github.com/GlacierEQ/apex-control-plane) — 617 files, 14-state machine |
| **Tasklet Micro Agent Engine — Bounded Execution** | Bounded concurrency, synchronous/async handlers, deadlines, payload admission, idempotency, duplicate suppression, terminal outcomes, suspend/resume. Maps to "asynchronous execution, tools, reliability, recovery, APIs." | [GitHub ↗](https://github.com/GlacierEQ/tasklet-micro-agent-engine) — benchmark: 5K iter, 0.346ms p95 |

---

## Role-Specific Evidence Mapping

| OpenAI Requirement | My System | Evidence |
|---|---|---|
| Persistent agent state | ECHO | SQLite/WAL, deterministic identity, SHA-256 receipts |
| Asynchronous execution | Tasklet | Bounded concurrency, deadlines, suspend/resume |
| Orchestration | APEX | Dispatch, capacity, priority, ownership, 14 states |
| Progress reporting | ECHO / APEX | Operator endpoints, receipt ledgers, search/export |
| Tools | APEX connectors / Sigma Glue | Retries, circuit breakers, provider readback |
| Reliability | All systems | Tests, CI, exact-head reasoning, integrity manifests |
| Recovery | ECHO / Sigma Glue | Bounded retries, provider readback, replay guards |
| APIs | ECHO / APEX | FastAPI, operator endpoints, machine-readable contracts |
| Reusable runtime primitives | Tasklet / APEX | Bounded execution, dispatch, connectors, state machine |

---

## What I Don't Claim

No employment, affiliation, endorsement, deployment, or proprietary access to OpenAI. Capability tracks are public requirement analyses converted to inspected code, implemented remedies, reproduced proof, and defensible application language.

---

## Delivery

- **Portfolio:** https://casey-barton-glaciereq.vercel.app/
- **Résume (Agent Runtime):** [RESUME_AGENT_RUNTIME.md](RESUME_AGENT_RUNTIME.md)
- **Case Study:** [CASE_STUDY_DEPENDABLE_AGENT.md](CASE_STUDY_DEPENDABLE_AGENT.md)
- **Architecture Walkthrough:** [ARCHITECTURE_WALKTHROUGH.md](ARCHITECTURE_WALKTHROUGH.md)

---

*Submitted: 2026-11-23*  
*Contact: glacier.equilibrium@gmail.com*
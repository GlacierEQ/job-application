# 20-Minute Architecture Walkthrough
**Dependable Agentic Systems: From Model Call to Verified Outcome**

*Prepared for technical interview / architecture review*

---

## Overview (2 min)

**Thesis:** The model call is the easy part. The hard problem — and the engineering value — is everything that happens **after**: tool execution, state persistence, failure recovery, provenance, and verifiable evidence.

This walkthrough covers the architecture of three systems that solve this:
1. **ECHO** — Persistent agent continuity service
2. **APEX Control Plane** — Receipt-bound orchestration with fail-closed boundaries
3. **AI Personalization Kernel** — Memory-to-policy binding with drift detection

Each system is open-source, independently verifiable, and maps to current Agent Runtime, Managed Agents, Frontier Agents, and Applied AI Platform role requirements.

---

## 1. Durable State and Continuity — ECHO (4 min)

### Problem
Agents restart, networks partition, responses drop. Without durable continuity, every restart is a fresh start with lost context and risk of duplicate side effects.

### Architecture
```
┌─────────────────────────────────────────────────────────────┐
│                      ECHO Service                           │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │   HTTP API  │  │  Job Queue  │  │   SQLite WAL DB     │  │
│  │  (FastAPI)  │──▶│ (in-memory) │──▶│  jobs, receipts,    │  │
│  └─────────────┘  └─────────────┘  │  idempotency_keys   │  │
│                                    └─────────────────────┘  │
│                                    ▲                         │
│                                    │ SHA-256 integrity      │
│                                    ▼                         │
│                          ┌─────────────────────┐             │
│                          │  Operator Endpoints │             │
│                          │  health, search,    │             │
│                          │  export, execute    │             │
│                          └─────────────────────┘             │
└─────────────────────────────────────────────────────────────┘
```

### Key Decisions
- **SQLite/WAL** — single file, no network, inspectable, shippable
- **Content-addressed IDs** — `SHA256(input + policy_version)` makes idempotency structural
- **Receipts as sealed envelopes** — input, output, policy hash, timestamps, integrity hash
- **Bounded retries + dead-letter** — 3 attempts, exponential backoff, permanent failures captured

### Verification
```bash
python3 -m pytest -q  # 48/48 passing: idempotency, receipts, search/export
```
REPRODUCED proof state — every claim backed by re-runnable test.

---

## 2. Idempotent Asynchronous Work — Sigma Glue & Tasklet (3 min)

### Problem
External APIs apply mutations and drop responses. Blind retries duplicate writes. Concurrency without idempotency corrupts state.

### Sigma Glue Architecture (Node 22)
- **Provider-aware state readback** — after every write, read ground truth
- **Restart-readable recovery trails** — every step logs enough to resume
- **Deterministic replay guards** — idempotency keys block concurrent replays

### Recorded Canary Result
```
2 writes, 5 reads → deliberately lost success response → 
recovery read ground truth → blocked replay before third write
140/140 tests passing
```

### Tasklet Micro Agent Engine (Bounded Execution Primitive)
- Bounded concurrency, synchronous/async handlers
- Deadlines, payload admission, idempotency, duplicate suppression
- Terminal outcomes, suspend/resume, local integrity evidence
- Benchmark: 5,000 iterations, 0.346ms p95 registration latency

### The Pattern
```
Tool Call → Provider Write → Response Lost?
    ├─ YES: Read provider state → if completed, return receipt; if failed, retry
    ├─ NO:  Seal receipt → store → return
    └─ CONCURRENT: Idempotency key blocks second execution
```

---

## 3. Tool and Connector Boundaries — APEX Control Plane (4 min)

### Problem
Agent tool calls are unbounded: no authorization, no retries, no circuit breakers, no audit trail, no distinction between "I tried" and "it happened."

### Architecture
```
┌────────────────────────────────────────────────────────────┐
│                    APEX Control Plane                      │
│  ┌─────────────┐ ┌─────────────┐ ┌──────────────────────┐  │
│  │  Dispatch   │ │ Connectors  │ │    Recovery &        │  │
│  │  (capacity, │ │ (retries,   │ │    Receipt Ledger    │  │
│  │  priority,  │ │  circuit    │ │  (SHA-256 envelopes, │  │
│  │  ownership) │ │  breakers)  │ │   dead-letter, audit)│  │
│  └─────────────┘ └─────────────┘ └──────────────────────┘  │
│         ▲                ▲                    ▲             │
│         └────────────────┴────────────────────┘             │
│                    State Machine                             │
│         14 states, 12-condition excellent_predicate          │
└────────────────────────────────────────────────────────────┘
```

### Fail-Closed Boundaries (The Key Insight)
Every external action goes through **three gates**:

1. **Authorization Gate** — who may act, on what, with which inputs, limits, refusal states
2. **Execution Gate** — idempotency keys, circuit breakers, deadlines, retries
3. **Verification Gate** — receipt sealing, integrity hash, policy hash binding, dead-letter capture

**No external action is "verified" by a local test alone.** The receipt proves *what was attempted*; the provider readback proves *what happened*. The gap between them is where bugs live.

### Excellence Contract
- 14 states: DISCOVERED → IDENTITY_RESOLVED → ... → PROMOTED
- 12 gates evaluated per repo as **met / unmet / unknown** — never collapsed
- `unknown` = checkout/proof task needing evidence, never a defect verdict
- Remote-only repos cannot be promoted
- No lifecycle authority (retire/archive/merge = Operator-only)

---

## 4. Failure, Retry, Timeout, Recovery Semantics (3 min)

### The Recovery Taxonomy
| Failure Type | Detection | Recovery | Receipt |
|---|---|---|---|
| Transient network | Timeout / 5xx | Exponential backoff (3×) | `attempted` |
| Provider dropped response | Readback mismatch | Read ground truth → decide | `completed` or `failed` |
| Permanent error | 4xx / validation | No retry, dead-letter | `failed` |
| Policy violation | Drift gate | Block, alert, audit | `refused` |
| Concurrent replay | Idempotency key hit | Block second execution | `duplicate_blocked` |

### The Receipt Protocol
```
Receipt = {
  receipt_id: SHA256,
  job_id: content_addressed,
  input: {...},
  output: {...} | {error: ...},
  policy_hash: SHA256(policy_version),
  status: completed | failed | refused | duplicate_blocked,
  started_at: ISO8601,
  completed_at: ISO8601,
  integrity_hash: SHA256(canonical_receipt)
}
```
**Verification:** `recompute(receipt) == receipt.integrity_hash` → tamper-evident.

---

## 5. Evidence and Regression Gates (2 min)

### The Evidence Tri-State
Every gate evaluates to one of three states:
- **met** — local proof exists (tests pass, receipt verifies, readback confirms)
- **unmet** — local proof exists but fails (test fails, receipt mismatch, readback contradicts)
- **unknown** — no local proof yet (not checked out, not tested, remote metadata only)

**Critical:** `unknown` is a **task**, not a verdict. It means "go get evidence," not "this is broken."

### Regression Protection (AgentProof-style)
- **AP001** — Deleted tests fail the gate
- **AP002** — New skips/xfails fail the gate (scans added lines in test files)
- **AP003** — Focused test narrowing (`.only`, `.skip`) fails
- **AP004** — Weakened assertions fail
- **AP005** — Coverage exclusion fails
- **AP006** — Snapshot overwrite fails
- **AP007** — CI job removal/narrowing fails

These are **stable rule IDs with severity**, not a boolean "tests pass."

---

## 6. What Remains Unverified — And How to Close the Gap (2 min)

### Honest Boundaries (What We Don't Claim)
| System | Unverified / Open Gates | Gap Closure Path |
|---|---|---|
| **ECHO** | No multi-process coordination, no auth, no production deployment | Deploy behind API gateway, add OAuth2, run chaos tests |
| **APEX** | `persistent_production_host_verified = false` (infrastructure, not code) | Provision shell/git/network host in sandbox |
| **AI Personalization** | Company fit = 0.0 (template fields bracketed) | Not a code gap — explicit non-claim |
| **Constitutional Transcript** | No tool-result verification, no crypto signatures | Add HSM-backed signing, integrate with provider audit logs |

### Production Hardening Roadmap
1. **Multi-process ECHO** — external queue (Redis/RabbitMQ) + multiple ECHO workers
2. **Auth/Z** — mTLS between components, OAuth2 for operator endpoints
3. **Observability** — OpenTelemetry traces, structured logs, metrics endpoint
4. **Chaos Testing** — inject network partitions, clock skew, provider failures
5. **Provider Audit Integration** — readback from Anthropic/OpenAI/GitHub audit APIs
6. **Policy Versioning** — signed policy bundles, automated drift detection in CI

---

## Summary: The Operating Layer

| Layer | System | What It Solves |
|---|---|---|
| **Continuity** | ECHO | State survives restarts, receipts are tamper-evident, retries are safe |
| **Execution** | Tasklet / Sigma Glue | Bounded concurrency, idempotency, provider readback, replay guards |
| **Orchestration** | APEX Control Plane | Dispatch, connectors, recovery, receipts, fail-closed boundaries |
| **Memory** | AI Personalization Kernel | Typed memory, context-first routing, policy scoring, drift detection |
| **Safety** | Constitutional Transcript | Policy-bound tools, deterministic replay, explicit ceilings |

### The Sentence
> I build the infrastructure around agentic systems: persistent state, context and memory routing, tool execution, orchestration, retries, failure recovery, provenance, regression evaluation, and operator-facing APIs. My work is designed to make AI systems inspectable, recoverable, and dependable in real workflows.

### Three Proof Links
- **ECHO:** https://github.com/GlacierEQ/ECHO (REPRODUCED, 48/48 tests)
- **AI Personalization Kernel:** https://github.com/GlacierEQ/Ai-Personalization_Kernel (94/94 matrix)
- **APEX Control Plane:** https://github.com/GlacierEQ/apex-control-plane (617 files, 14-state machine)

---

## Q&A Anticipation

**Q: "How does this scale?"**
A: ECHO is single-process by design; scale via multiple instances behind a queue. APEX dispatch is stateless; connectors are independent. The continuity layer is the bottleneck — and it's intentionally simple.

**Q: "What about distributed exactly-once?"**
A: Not claimed. ECHO provides *at-least-once with idempotency*; exactly-once requires provider cooperation (two-phase commit or idempotency keys the provider honors). The receipt protocol makes the boundary explicit.

**Q: "How do you handle policy changes?"**
A: Policy hash in every receipt. On replay, mismatch = drift detected. CI gate rejects policy changes without receipt regeneration. AgentProof-style integrity rules catch weakened tests.

**Q: "Why not LangGraph / LangChain / AutoGen?"**
A: Those are model-calling frameworks. I build the *operating layer around them*: state, receipts, recovery, provenance. They compose — APEX connectors can call LangGraph agents and wrap their outputs in receipts.

**Q: "What's the biggest technical risk?"**
A: The gap between "local test passes" and "external provider outcome confirmed." That's why the receipt protocol separates *attempted* from *verified*, and why readback is mandatory before retry.

---

*Walkthrough time: ~20 minutes. Slides available on request. Source code and CI runs are public.*
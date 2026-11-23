# What Makes an Agent Dependable After the Model Call?

**Case Study: ECHO — A Persistent Agent Continuity Service**

---

## The Problem

LLM calls are the easy part. The hard problem is everything that happens **after** the model returns:

- The tool call succeeds but the response drops — do you retry and duplicate the write?
- The agent restarts — does it recover its place or start from zero?
- A concurrent replay fires — is the second execution blocked or does it double-send?
- The operator asks "what happened?" — is there a receipt or just logs?
- The policy drifts — how do you detect it before it ships?

Most agent frameworks treat these as afterthoughts. ECHO treats them as the **entire system**.

---

## What ECHO Is

ECHO is a FastAPI service that provides **durable continuity** for agentic workflows:

| Capability | Mechanism |
|---|---|
| **Persistent state** | SQLite/WAL with SHA-256 content integrity |
| **Deterministic identity** | Content-addressed job IDs, no UUID collisions |
| **Idempotent execution** | Job keys + result caching; same input → same receipt |
| **Bounded retries** | Configurable max attempts, exponential backoff, deadline enforcement |
| **Receipts** | SHA-256 sealed envelopes: input, output, policy hash, timestamp |
| **Operator console** | Health, recommendations, conversations, job execution endpoints |
| **Search/Export** | Full history query, JSON/CSV export, content hash verification |

**Three behavioral tests** (all passing):
1. **Idempotency** — submit same job twice → one receipt
2. **Receipt integrity** — tamper with stored receipt → verification fails
3. **Search/Export** — query returns exact records with matching hashes

---

## The Architecture: Five Hard Decisions

### 1. SQLite/WAL over Postgres — for embeddable, inspectable durability

Postgres is great for multi-tenant; SQLite/WAL is better for **single-process, operator-owned continuity**. No network dependency, no connection pool, no migration drama. The database file *is* the state — copy it, inspect it, ship it.

```
echo.db (SQLite WAL)
├── jobs (id, key, input_hash, status, created_at, started_at, completed_at)
├── receipts (job_id, receipt_hash, input, output, policy_hash, metadata)
└── idempotency_keys (key, job_id, created_at)
```

### 2. Content-addressed identity — no UUID lottery

Every job gets a deterministic ID: `SHA256(input_json + policy_version)`. Same input + same policy = same job ID. This makes idempotency **structural**, not a best-effort cache.

```python
def job_id(input_data: dict, policy_version: str) -> str:
    canonical = json.dumps(input_data, sort_keys=True) + policy_version
    return hashlib.sha256(canonical.encode()).hexdigest()[:16]
```

### 3. Receipts as first-class citizens, not logs

A receipt is not a log line. It is a **sealed envelope**:

```json
{
  "receipt_id": "sha256:...",
  "job_id": "abc123",
  "input": {...},
  "output": {...},
  "policy_hash": "sha256:policy_v3",
  "status": "completed",
  "started_at": "2026-11-23T00:00:00Z",
  "completed_at": "2026-11-23T00:00:01Z",
  "integrity_hash": "sha256:..."
}
```

Verification: `recompute_hash(receipt) == receipt.integrity_hash`. Tamper-evident by construction.

### 4. Operator endpoints over dashboards

No React dashboard. The operator surface is **HTTP + JSON**:

```
GET  /health                    # liveness + readiness
GET  /jobs/{id}                 # job state + receipt
GET  /jobs/{id}/receipt         # full receipt
POST /jobs                      # submit idempotent job
GET  /search?q=...              # query history
GET  /export?format=json        # full export with hash verification
```

This is scriptable, automatable, and works in CI/CD without a browser.

### 5. Bounded retries with dead-letter capture

```python
MAX_ATTEMPTS = 3
BASE_DELAY = 1.0  # seconds

async def execute_with_retry(job):
    for attempt in range(MAX_ATTEMPTS):
        try:
            result = await job.run()
            return seal_receipt(job, result, "completed")
        except TransientError as e:
            if attempt == MAX_ATTEMPTS - 1:
                return seal_receipt(job, {"error": str(e)}, "failed")
            await asyncio.sleep(BASE_DELAY * (2 ** attempt))
        except PermanentError as e:
            return seal_receipt(job, {"error": str(e)}, "failed")
```

Dead-letter queue captures permanently failed jobs with full context — never silently dropped.

---

## What This Enables

| Scenario | Without ECHO | With ECHO |
|---|---|---|
| Model calls tool, response drops | Blind retry → duplicate write | Read receipt → if completed, return it; if failed, retry safely |
| Agent restarts mid-workflow | Lost state, restart from zero | Resume from last completed receipt |
| Concurrent replay fires | Double execution | Idempotency key blocks second execution |
| Policy changes | Silent behavior drift | Policy hash in receipt → detect mismatch on replay |
| Operator audit | grep logs | Query receipts by hash, time, status |

---

## The Boundary: What ECHO Does Not Do

- **No model hosting** — ECHO executes *after* the model decides
- **No tool implementation** — ECHO wraps tool calls with receipts
- **No multi-process coordination** — single-process by design (scale via multiple ECHO instances + external queue)
- **No authentication** — assumes trusted network / operator context
- **No production deployment claim** — this is a reference implementation with REPRODUCED proof state

---

## Verification You Can Run

```bash
# Clone and verify
git clone https://github.com/GlacierEQ/ECHO.git
cd ECHO
export PYTHONPATH=src
python3 -m pytest -q
# 48/48 tests passing: idempotency, receipts, search/export, health, operator endpoints
```

**CI matrix:** Python 3.11, 3.12, 3.13. Zero failures.

---

## The Takeaway

Dependability after the model call is not a feature you add. It is the **system you build**.

ECHO proves you can build a continuity service where:
- Every execution leaves a tamper-evident receipt
- Retries are safe by construction
- State survives restarts
- Operators get answers, not logs
- The boundary is explicit and honest

This is the operating layer that makes agentic systems **inspectable, recoverable, and dependable** in real workflows.

---

*Repository:* [GlacierEQ/ECHO](https://github.com/GlacierEQ/ECHO)  
*Live proof:* REPRODUCED state, 48/48 admission tests, SHA-256 receipts  
*Contact:* glacier.equilibrium@gmail.com
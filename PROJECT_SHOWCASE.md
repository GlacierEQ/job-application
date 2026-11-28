# Project Showcase — Historical Draft (Superseded by `SHOWCASE.md`)

> [!IMPORTANT]
> **RETIRED HISTORICAL DRAFT (JUNE 2026) — SUPERSEDED BY [`SHOWCASE.md`](SHOWCASE.md)**
> This manual showcase draft has been retired. Unsupported aggregate line/repository counts, unverified deploy-time reduction claims, and "production-grade" labels on independent simulations have been removed. Use [`SHOWCASE.md`](SHOWCASE.md) (deterministically generated from `portfolio_manifest.json`) and [`RESUME.md`](RESUME.md) as the authoritative portfolio showcase.

## 1. Independent Colossus-Class Infrastructure Simulations

**Public Exhibits**: [`GlacierEQ/xai-colossus-energy`](https://github.com/GlacierEQ/xai-colossus-energy), [`GlacierEQ/xai-colossus-cooling`](https://github.com/GlacierEQ/xai-colossus-cooling), [`GlacierEQ/xai-colossus-security`](https://github.com/GlacierEQ/xai-colossus-security)

**Problem Explored**: Large-scale AI compute clusters face tightly coupled power, thermal, and security constraints where component faults must be isolated deterministically.

**Independent Software Modeling**:
| Domain | Modeling Focus | Boundary |
|--------|----------------|----------|
| Power (`xai-colossus-energy`) | Rust power demand, PUE overhead, reserve headroom, and priority-ordered simulated load shedding with Python parity checks | Software simulation only; not deployed facility hardware |
| Thermal (`xai-colossus-cooling`) | Zone-level thermal telemetry, threshold escalation, and cooling control-loop simulation | Independent engineering exhibit; no xAI affiliation |
| Security (`xai-colossus-security`) | Zone access events and hash-chained audit log simulation | Reference simulation only |

---

## 2. Deterministic Agent Coordination & Safety Policy

**Public Exhibits**: [`GlacierEQ/anthropic-agent-coordinator`](https://github.com/GlacierEQ/anthropic-agent-coordinator), [`GlacierEQ/anthropic-safety-monitor`](https://github.com/GlacierEQ/anthropic-safety-monitor)

**Problem Explored**: Multi-agent workflows require explicit dependency ordering, capacity limits, and pre-execution tool-policy gates before actions run.

**Verified Mechanisms**:
- Dependency-aware DAG scheduling, per-role capacity, token budget accounting, and explicit blocked/deferred states (`anthropic-agent-coordinator`, 95/95 local Python tests at pinned head `bcdaa89b8a76bd1c1690c7a46458af0be0a49e95`).
- Deterministic `ALLOW` / `CONFIRM` / `DENY` tool-action dispositions (`anthropic-safety-monitor`, 51 tests × 3 Python versions = 153 executions at documented promotion).
- Independent GlacierEQ work; no Anthropic affiliation or production deployment is claimed.

---

## 3. AKOS, ECHO & Job Application Helix

**Public Exhibits**: [`GlacierEQ/AKOS`](https://github.com/GlacierEQ/AKOS), [`GlacierEQ/job-app-helix`](https://github.com/GlacierEQ/job-app-helix), [`GlacierEQ/the-tower-of-babel`](https://github.com/GlacierEQ/the-tower-of-babel)

**Problem Explored**: Keeping identity, authority, continuity, polyglot interfaces, and public claims synchronized with executable verification receipts.

**Verified Mechanisms**:
- **ECHO**: Transactional job leases, stale-worker recovery, and privacy-boundary regression tests (125/125 tests in GitHub Actions run `33342434203` at head `b6b004f601a0e20b4fd4264b8262dc4ac9498245`).
- **Job Application Helix**: Commit-pinned portfolio control plane governing public projection admission and second-depth evidence stages.
- **The Tower of Babel**: 42 governed technology floors and 84 exhibits with explicit interface contracts and proof gates.

---

_For the live manifest-generated showcase, open [`SHOWCASE.md`](SHOWCASE.md)._

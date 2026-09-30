# Claudification — GlacierEQ System Map

**Target:** Anthropic — Staff Software Engineer, GTM AI Engineering (Claudification)  
**Observed:** 2026-09-21  
**Purpose:** expose the existing GlacierEQ layers that compose into the GTM-agent operating pattern described by the role, without inflating implementation evidence into employer deployment or revenue claims.

## Core thesis

Claudification is not a fresh portfolio demo assembled around one job posting. It is a role-specific composition of systems that already exist across the GlacierEQ estate.

The estate already separates and implements the major concerns the role calls for:

```text
signal / account / workflow context
        ↓
sales workflow skill + context recovery
        ↓
agent plan / dependency coordination
        ↓
governed tool or MCP proposal
        ↓
policy review: ALLOW / CONFIRM / DENY
        ↓
human authority boundary
        ↓
bounded external-action transaction
        ↓
provider receipt / readback / durable state
        ↓
eval / regression / telemetry
        ↓
reusable skill, pattern, or shared platform capability
```

The application should present that composition first, then let reviewers drill into the underlying repositories.

## Provider-verified runtime proof

On 2026-09-21, the role-specific composition was executed as a live provider-backed sandbox motion rather than left as an architecture-only claim.

**Motion:** `d82a1c55-26dd-44c5-b4af-07522811d594`  
**Provider:** Supabase Postgres · project `kjebemdgvjvuutzvhbtp`  
**Provider receipt SHA-256:** `e1a4579496fbf47c0465e84f59d20c96d1966c6b0a475fae8f8f0058cb870eca`  
**Final state:** `VERIFIED` · eval gate `SHIP_DEMO`

The durable provider event sequence was:

```text
CONTEXT_RECOVERED
→ TOOL_PLAN_BOUND
→ ACTION_PROPOSED
→ HUMAN_GATE_REQUIRED
→ HUMAN_APPROVE
→ BOUNDED_PROVIDER_ACTION_EXECUTED
→ PROVIDER_READBACK_REQUESTED
→ PROVIDER_READBACK_VERIFIED
→ EVAL_COMPLETED
```

Provider readback matched the motion ID and provider reference, the receipt hash was present, and the behavior evaluation recorded `provider_execution_observed=true` and `readback_id_matches=true`.

**Boundary:** this is a real end-to-end execution proof of the governed motion architecture, but the provider mutation was deliberately confined to the dedicated Supabase sandbox receipt ledger. It did **not** send email, mutate a CRM, contact a seller/customer, or establish revenue/ROI impact. It is not an Anthropic production deployment claim.

The evidence receipt is preserved in Job-App Helix as `evidence/5390966008-claudification-end-to-end-runtime-receipt-2026-09-21.json`.

## Layer map

| GTM / agent-system layer | Existing GlacierEQ surface | Concrete implementation evidence | Evidence state / boundary |
|---|---|---|---|
| Sales workflow router | `GlacierEQ/monolith` → `skills/mega-sales/SKILL.md` | 38-submodule sales bundle covering meeting prep, call follow-up, account prioritization/signals, deal strategy, business cases, competitive briefs, forecasts, customer evidence, rep coaching, company research, CRM context, and enrichment | Source-inspected implementation contract; does not establish Anthropic-internal use |
| Shared GTM skill platform | `GlacierEQ/mega-skills` | Executable skill families for sales, account signals, prioritization, deal strategy, forecast review, meeting prep, rep coaching, company/contact enrichment, lead research, email sequences, HubSpot, Salesforce, evals, and related workflows; many include scripts and tests | Implemented capability estate; individual runtime/test claims require their own receipts |
| Lead / account discovery | `mega-skills/skills/lead-research-assistant`, `enrich-company-and-contact-data`, `analyze-account-signals`, `prioritize-accounts` | ICP/lead discovery, enrichment, signal analysis, account prioritization and handoff | Implemented workflow layer; do not confuse candidate/company research with real customer discovery |
| Deal / pipeline motion | `mega-skills/skills/plan-deal-strategy`, `review-forecast` | Deal map, buying committee, procurement risk, actions, forecast posture, Commit/Upside, pipeline/deal-risk review | CRM-backed when an authoritative CRM source is connected; otherwise bounded to supplied data |
| Outbound composition | `mega-skills/skills/email-sequence`; `operator-administration/administration/responsibilities/email_outbound.json` | Sequence construction plus source-bound, stale-checked, quality-reviewed, idempotent outbound governance | Autonomous scheduled sends explicitly disabled in Operator Administration; external sends stay governed |
| Human control / approval gate | `GlacierEQ/anthropic-safety-monitor` | Deterministic proposed-tool review → ALLOW / CONFIRM / DENY, stable reason/rule, explicit confirmation requirement; canonical promotion records 153 matrix executions | VERIFIED repository-native TEST evidence at the documented canonical promotion; does not execute tools |
| Agent planning / orchestration | `GlacierEQ/anthropic-agent-coordinator` | Dependency-aware scheduling, budgets, role capacity, explicit deferrals, assignment-bound tool proposal handoff, plan SHA binding | Historical exact-revision 62/62 proof; current head must not inherit that proof automatically |
| MCP / governed tools | `GlacierEQ/glaciereq-mcp-stack` | Registration separated from execution authority, allow-list routing, mutation gate, fail-closed dispatch; credential-gated stdio packages for GitHub, Asana, Confluence, Supabase, Neo4j | Local router verified; external package deployment remains credential/deployment bounded |
| External-action transaction | `GlacierEQ/apex-control-plane` → `db/migrations/20260903091623_continuity_outbound_transaction_v3.sql` | Context packet → preflight → idempotency → approved action → executing state → receipt/readback semantics | Implemented generic outbound transaction infrastructure; not a claim of Anthropic CRM operation |
| Continuity / state / observability | `GlacierEQ/apex-control-plane` | retries, circuit breakers, dead-letter capture, immutable receipts, provider readback, explicit execution-state promotion, continuity recovery | Repository-local mechanisms; external provider state requires provider-native receipts |
| Agent evals | `mega-skills/skills/agent-evaluation`, `mega-agent-evaluation`; `anthropic-safety-monitor`; `mega-pipeline-production` | behavioral contracts, adversarial/regression evaluation, production-trace replay guidance, multi-dimensional metrics, release gates | Strong evaluation architecture; no unsupported claim of Anthropic production traffic |
| Shared engineering / inner-source behavior | `mega-skills`, `mega-pipeline-production`, `job-app-helix`, `monolith` | reusable skills, pipeline contracts, verification gates, evidence promotion, common workflow conventions | Existing shared platform behavior across the estate |
| Application / evidence control plane | `GlacierEQ/job-app-helix`, `GlacierEQ/job-application` | role → requirement → implementation → verification → receipt → public projection | Working portfolio/evidence pipeline, not employer GTM infrastructure |

## Role-specific motion

The cleanest demo narrative is one motion across the composition:

```text
1. SIGNAL
   account / lead / workflow evidence enters a bounded sales workflow

2. CONTEXT
   sales skill resolves the authoritative sources and working state

3. PLAN
   agent coordinator orders work and preserves blocked/deferred states

4. PROPOSE
   the agent emits a bounded tool / MCP action proposal

5. REVIEW
   policy layer returns ALLOW / CONFIRM / DENY

6. HUMAN GATE
   external mutation remains under explicit human authority

7. TRANSACT
   approved outbound action receives idempotency, preflight, execution state

8. READ BACK
   provider receipt / returned state is inspected before promotion

9. EVALUATE
   behavior, tool use, regressions, latency/cost/business metrics can be evaluated at the correct layer

10. REUSE
    successful behavior is retained as a skill, contract, pipeline stage, or shared platform primitive
```

This is the operating pattern to show in the Anthropic application. The proof is the composition plus the inspectable component implementations—not a claim that the estate has already operated Anthropic's sales organization.

## Exact GTM capability inventory already present

The existing `mega-skills` estate contains dedicated surfaces for:

- Sales routing and focused sales workflows
- Lead research and prospect discovery
- Company/contact enrichment
- Account-signal analysis
- Account prioritization
- Deal strategy
- Forecast and pipeline-risk review
- Meeting preparation
- Meeting transcript analysis
- Rep call feedback and trend review
- Competitive briefs
- Customer evidence / quote finding
- Email sequences and email systems
- Salesforce workflows
- HubSpot integration patterns
- Agent evaluation and regression
- Analytics, experimentation, and KPI-related capabilities

The role-specific Claudification surface should compose these rather than rebuilding them.

## Truth and claim boundaries

### Source-backed claims

- GlacierEQ has implemented sales/GTM workflow skills and reusable orchestration surfaces.
- GlacierEQ has an explicit human-control layer for proposed tool actions.
- GlacierEQ has governed MCP/tool routing.
- GlacierEQ has deterministic coordination and structured deferral logic.
- GlacierEQ has external-action transaction, receipt, readback, recovery, and state-promotion mechanisms.
- GlacierEQ has agent-evaluation and production-gating patterns.
- GlacierEQ has a shared capability estate rather than isolated one-off demos.

### Do not claim without new native evidence

- Anthropic employment, affiliation, endorsement, proprietary access, or internal deployment.
- Prior ownership or operation of Anthropic seller / RevOps production workflows.
- Unsupervised autonomous sending; current Operator Administration explicitly preserves outbound governance.
- Production revenue lift, pipeline attribution, or ROI numbers that have not been measured from an authoritative revenue source.
- Production Claude Agent SDK deployment without a native implementation and receipt.
- That every skill test currently passes merely because scripts/tests exist.
- Real customer discovery where the current Anthropic work packet remains `BLOCKED_ON_RETRIEVAL`.

## Application framing

The strongest concise framing is:

> I did not start with this job posting and invent a set of matching demos. I already operate an interconnected AI engineering estate with a sales workflow layer, reusable GTM skills, agent coordination, governed MCP/tool access, explicit human approval boundaries, durable outbound transactions, evaluation/regression machinery, provider receipts, and shared execution standards. Claudification is the role-specific composition of those existing layers around the GTM motion Anthropic describes.

## Reviewer path

1. Start with the role page: `/roles/anthropic-gtm-ai-engineering/`
2. Inspect this system map.
3. Inspect `mega-sales` and the GTM skill family.
4. Inspect Safety Monitor for human authority.
5. Inspect Agent Coordinator for orchestration.
6. Inspect MCP Stack for governed tools.
7. Inspect APEX for state, outbound transaction, receipts, recovery.
8. Inspect eval / pipeline gates.
9. Only then expand into the broader estate.

The point is not repository count. The point is that the layers were independently useful, were designed around explicit interfaces and authority boundaries, and now compose naturally into the exact class of GTM agent system this role asks an engineer to build and operate.

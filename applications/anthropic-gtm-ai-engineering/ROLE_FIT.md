# Anthropic — Staff Software Engineer, GTM AI Engineering (Claudification)

**Target observed:** 2026-09-21  
**Official posting:** https://job-boards.greenhouse.io/anthropic/jobs/5390966008  
**Location:** Remote-Friendly (Travel-Required) | San Francisco, CA | Seattle, WA  
**Listed annual salary:** $320,000–$405,000 USD

## Positioning

Do not manufacture a new identity around this opening and do not present GlacierEQ as a pile of disconnected repositories.

The stronger, source-backed case is that the estate already contains the major layers this role asks one engineer to compose: sales/GTM workflow skills, agent coordination, governed MCP/tool access, explicit human approval boundaries, outbound transaction semantics, evaluation/regression machinery, provider receipts/readback, continuity/recovery, and shared capability conventions.

**Role-specific system map:** [CLAUDIFICATION_SYSTEM_MAP.md](CLAUDIFICATION_SYSTEM_MAP.md)

The application narrative is therefore:

> I did not start with this job posting and invent a set of matching demos. I already operate an interconnected AI engineering estate with a sales workflow layer, reusable GTM skills, agent coordination, governed MCP/tool access, explicit human approval boundaries, durable outbound transactions, evaluation/regression machinery, provider receipts, and shared execution standards. Claudification is the role-specific composition of those existing layers around the GTM motion Anthropic describes.

That claim is materially stronger than “I have built similar systems,” while remaining precise about what has and has not been run inside a revenue organization.

## The composition

```text
signal / account / workflow context
        ↓
sales workflow + context recovery
        ↓
agent plan / dependency coordination
        ↓
governed tool / MCP proposal
        ↓
policy review: ALLOW / CONFIRM / DENY
        ↓
human authority boundary
        ↓
bounded outbound transaction
        ↓
provider receipt / readback / durable state
        ↓
eval / regression / telemetry
        ↓
reusable skill / pipeline / shared capability
```

The important point is not that each box exists independently. The interfaces and authority boundaries make them composable.

## Requirement → existing evidence crosswalk

| Anthropic need | Existing GlacierEQ proof | Evidence boundary |
|---|---|---|
| End-to-end inbound / outbound / pipeline motions | `monolith/skills/mega-sales`; `mega-skills` sales family; Agent Coordinator; APEX execution surfaces | Existing sales workflow, orchestration, and bounded-action layers. Do not claim Anthropic GTM production operation. |
| Seller / human control, approvals, handoffs, escalation | `anthropic-safety-monitor`; Salesforce workflow contract; Operator Administration outbound governance | Safety Monitor has verified ALLOW / CONFIRM / DENY policy behavior. Operator Administration explicitly keeps autonomous scheduled sends disabled. |
| Lead/account signal handling | `lead-research-assistant`, `enrich-company-and-contact-data`, `analyze-account-signals`, `prioritize-accounts` | Implemented GTM skill surfaces; source authority depends on connected CRM/intelligence data. |
| Deal / pipeline management | `plan-deal-strategy`, `review-forecast` | Deal, buying-committee, procurement-risk, Commit/Upside, forecast and pipeline-risk workflows. CRM claims require authoritative CRM data. |
| Agent evals and regression discipline | `agent-evaluation`, `mega-agent-evaluation`, Safety Monitor, Mega Pipeline, Job-App Helix | Behavioral/regression architecture plus deterministic verified safety tests. No claim of Anthropic production eval traffic. |
| Tool/model observability and operational receipts | `apex-control-plane` | Connector retries, circuit breakers, dead-letter capture, receipts, state promotion, continuity and provider readback. |
| MCP servers and governed tool access | `glaciereq-mcp-stack` | Verified local allow-list router; implemented credential-gated GitHub/Asana/Confluence/Supabase/Neo4j stdio MCP packages. |
| Bounded outbound execution | APEX `continuity_outbound_transaction_v3.sql` + Operator Administration email outbound responsibility | Context packet, preflight, idempotency, state transitions and receipts are implemented. Not proof of Anthropic CRM traffic. |
| Agent skills and reusable patterns | `mega-skills`, `mega-pipeline-production`, `monolith/skills/mega-sales` | Shared skill and pipeline contracts rather than one-off prompts. |
| Shared engineering conventions / inner-source platform | Monolith, Mega-Skills, Mega Pipeline, Job-App Helix | Common capability contracts, validation, evidence promotion and reusable workflow conventions across the estate. |
| Transcript / conversation analysis | `meeting-insights-analyzer`, `get-rep-call-feedback`, related sales skills | Implemented transcript-grounded analysis patterns; live data coverage depends on connected source. |
| Real workflow integration under ambiguity | APEX, Operator Administration, connector estate, portfolio/job workflow | Demonstrates live cross-system operator workflows. Direct seller/RevOps ownership is not claimed. |
| Python / TypeScript / SQL / systems integration | Public estate and machine-readable portfolio | Broad implementation evidence; individual claims remain source-bound. |
| Claude ecosystem | Anthropic-targeted repositories plus Claude Code reference/use surfaces | Do not claim production Claude Agent SDK deployment without native proof. |

## GTM capability already present

The estate already contains dedicated capabilities for:

- sales workflow routing;
- lead and prospect research;
- company/contact enrichment;
- account-signal analysis and prioritization;
- deal strategy;
- forecast / pipeline-risk review;
- meeting preparation;
- meeting transcript analysis;
- rep call feedback and trend review;
- competitive briefs;
- customer evidence;
- email sequences and email systems;
- Salesforce workflows;
- HubSpot integration patterns;
- analytics / experimentation / KPI patterns;
- agent evaluation and regression.

These should be composed into the role-specific system. They should not be rebuilt merely to make the application look job-specific.

## Strongest proof spine

1. **Mega-Sales + GTM skill family** — the missing top-level framing: existing sales workflows across accounts, deals, forecasts, meetings, CRM context, research, enrichment, outreach preparation and coaching.
2. **Anthropic Safety Monitor** — deterministic proposed-tool review with explicit human confirmation and 153 verified Python-matrix executions at the documented canonical promotion.
3. **Anthropic Agent Coordinator** — dependency-aware multi-agent scheduling, budget/capacity constraints, structured deferrals, and assignment-bound tool proposal handoff. Historical exact-revision proof: 62/62.
4. **GlacierEQ MCP Stack** — registration separated from execution authority, mutation gates, fail-closed dispatch, and credential-gated MCP packages.
5. **APEX Control Plane** — state integrity, outbound preflight/idempotency, connector failure handling, provider receipts, continuity, auditability and readback.
6. **Operator Administration** — explicit responsibility/authority model around outbound actions; autonomous scheduled sends remain disabled until governed.
7. **Agent Evaluation + Mega Pipeline** — behavior/regression patterns, production-trace evaluation guidance, telemetry and release gates.
8. **Job-App Helix / public portfolio** — claim → behavior → implementation → verification → receipt → promotion as a working evidence pipeline.

## Truth boundary

Do **not** claim:

- Anthropic affiliation, employment, endorsement, proprietary access, or internal deployment.
- Prior ownership of Anthropic seller or RevOps production workflows.
- Unsupervised autonomous sending; current Operator Administration preserves explicit outbound governance.
- Production revenue or pipeline attribution that has not been measured from an authoritative source.
- Real customer discovery for the Anthropic target while the dedicated customer-discovery packet remains `BLOCKED_ON_RETRIEVAL`.
- Eight years of pure software-engineering tenure if the source record does not establish it.
- Production Claude Agent SDK deployment without a native implementation/receipt.
- That every GTM skill's test suite currently passes merely because executable scripts/tests are present.

Do claim, where source-backed:

- a real existing sales/GTM capability layer;
- forward-deployed/applied-AI problem decomposition;
- agent orchestration and structured non-completion;
- human-in-the-loop tool-use governance;
- MCP/tool infrastructure and mutation control;
- eval and regression discipline;
- idempotent outbound/action infrastructure;
- provider receipts/readback, recovery and execution-state integrity;
- cross-system integration;
- reusable shared skills, pipelines and capability contracts.

## Application emphasis

The differentiator is not repository count. It is that independently useful layers now compose into one role-shaped operating system:

**GTM workflow → context → agent plan → tools → policy → human gate → bounded action → receipt/readback → eval → reusable platform capability**

That is the system Anthropic should see first.

The broader engineering pattern remains:

**messy real workflow → context recovery → bounded authority → implementation → evaluation → receipt/readback → repair → reusable capability**

For this application, however, show the GTM composition before explaining the general pattern.

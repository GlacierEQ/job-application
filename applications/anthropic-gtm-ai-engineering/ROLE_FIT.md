# Anthropic — Staff Software Engineer, GTM AI Engineering (Claudification)

**Target observed:** 2026-09-21  
**Official posting:** https://job-boards.greenhouse.io/anthropic/jobs/5390966008  
**Location:** Remote-Friendly (Travel-Required) | San Francisco, CA | Seattle, WA  
**Listed annual salary:** $320,000–$405,000 USD

## Positioning

The application should not manufacture a new identity around this opening. The strongest case is that Casey Barton has already built much of the operating pattern the role describes: autonomous agent coordination, explicit human-control boundaries, evaluation and regression machinery, tool/MCP infrastructure, execution receipts, shared capability standards, and ambiguity-to-working-system delivery.

The application narrative is therefore:

> I have already been building the class of systems this role asks for. The job-specific work is to make the evidence legible, map it to GTM, and be precise about what has and has not yet been operated inside a revenue organization.

## Requirement → existing evidence crosswalk

| Anthropic need | Existing GlacierEQ proof | Evidence boundary |
|---|---|---|
| End-to-end autonomous agent motions | `anthropic-agent-coordinator` + APEX execution/control surfaces | Deterministic coordination and execution architecture; no claim these systems ran Anthropic GTM. |
| Human oversight, approvals, handoffs, escalation | `anthropic-safety-monitor` | Verified ALLOW / CONFIRM / DENY policy boundary; 153 matrix executions at documented promotion. |
| Agent evals and regression discipline | `anthropic-safety-monitor`, Job-App Helix evidence promotion, portfolio verification gates | Strong deterministic evaluation evidence; no claim of Anthropic production eval traffic. |
| Tool/model observability and operational receipts | `apex-control-plane` | Connector retries, circuit breakers, dead-letter capture, receipts, state promotion and readback. |
| MCP servers and governed tool access | `glaciereq-mcp-stack` | Verified local allow-list router; implemented credential-gated GitHub/Asana/Confluence/Supabase/Neo4j stdio MCP packages. |
| Agent skills and reusable patterns | `mega-skills`, `mega-pipeline-production` | Reusable capability contracts and architect→manager→worker execution pattern; not Anthropic internal infrastructure. |
| Shared engineering conventions | Job-App Helix, Mega-Skills, Mega Pipeline, Tower of Babel | Public standards, evidence contracts, review/verification rules across a large multi-repo estate. |
| Real workflow integration under ambiguity | APEX control plane, computer-user, portfolio/job workflow, connector estate | Demonstrates live operator workflows and cross-system integration; direct seller/RevOps ownership is not claimed. |
| Python / TypeScript / SQL / systems integration | Public estate and machine-readable portfolio | Broad implementation evidence; individual claims remain source-bound. |
| Claude ecosystem | Anthropic-targeted repositories plus Claude Code reference/use surfaces | Do not claim production Claude Agent SDK deployment unless a native receipt is added. |

## Strongest proof spine

1. **Anthropic Safety Monitor** — deterministic tool-call review with explicit human confirmation and 153 verified Python-matrix executions.
2. **Anthropic Agent Coordinator** — dependency-aware multi-agent scheduling with budget/capacity constraints and structured deferrals.
3. **GlacierEQ MCP Stack** — explicit registration vs execution authority, mutation gates, fail-closed dispatch, and credential-gated MCP packages.
4. **APEX Control Plane** — state integrity, connector failure handling, provider receipts, continuity, auditability, and mission-outcome verification.
5. **Job-App Helix / public portfolio** — claim→behavior→implementation→verification→receipt→promotion as a working evidence pipeline.
6. **Mega-Skills + Mega Pipeline** — reusable implementation patterns that convert strong architecture into repeatable manager/worker execution.

## Truth boundary

Do **not** claim:
- Anthropic affiliation, employment, endorsement, or proprietary access.
- Prior ownership of Anthropic seller or RevOps workflows.
- Production revenue attribution that has not been measured.
- Eight years of pure software-engineering tenure if the source record does not establish it.
- Production Claude Agent SDK deployment without a native implementation/receipt.

Do claim, where source-backed:
- forward-deployed/applied-AI style problem decomposition;
- agent orchestration and tool-use governance;
- MCP/tool infrastructure;
- eval and verification discipline;
- cross-system integration;
- observable, receipt-bound execution;
- building reusable patterns from one-off operational problems.

## Application emphasis

The most credible differentiator is not repository count. It is the repeated engineering pattern:

**messy real workflow → context recovery → bounded authority → agent/tool implementation → evaluation → receipt/readback → repair → reusable capability**

That is the pattern the role is asking to apply to GTM.

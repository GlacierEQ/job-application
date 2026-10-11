# Supabase AI Platform Engineer — Application Answers

**Role:** AI Platform Engineer  
**Company:** Supabase  
**Job URL:** https://jobs.ashbyhq.com/supabase/3b5d54ca-741b-45ac-bd3f-31605a0d3541  
**Prepared:** 2026-10-10 HST

## Admin

- **Name:** Casey Del Carpio Barton
- **Email:** glacier.equilibrium@gmail.com
- **Passport Country:** United States
- **Country of Residence:** United States
- **Over 18:** Yes
- **GitHub:** https://github.com/GlacierEQ
- **LinkedIn:** https://www.linkedin.com/in/caseybartonai
- **Twitter / X:** leave blank unless a verified current profile is recovered
- **Where did you hear about this vacancy?:** Supabase careers / direct role research

## Async / remote environment

I have spent the last several years doing high-autonomy work from Honolulu, where written state and asynchronous handoffs are not optional—they are how the work stays coherent.

The practices that work best for me are to externalize context and make completion inspectable. I use explicit task/state models, source-linked decisions, machine-readable receipts, Git history, provider readback, and clear handoff notes so another person can recover what happened without a meeting or relying on memory. For agent systems I apply the same discipline: proposed, executed, verified, committed, deployed, and observed-in-operation are different states, and the system should make those differences visible.

I also treat interruption as a limited budget. A useful automated system should bundle information, provide value before asking for attention, and escalate only when the human actually has a decision to make.

The hardest async failure mode I have encountered is context drift: a later worker or model can reconstruct the problem instead of continuing from verified state. My response has been architectural rather than procedural—persist provenance, corrections, continuation cursors, idempotency keys, and provider receipts so the next worker can resume rather than rediscover.

## Open source contributions

Most of my open-source work is published under the GlacierEQ GitHub organization rather than as drive-by contributions to unrelated projects.

A few relevant public examples:

- **APEX Control Plane** — https://github.com/GlacierEQ/apex-control-plane  
  Explicit authority, execution-state transitions, provider-receipt validation, retry/circuit-breaker/dead-letter behavior, continuity, and mission-outcome verification.

- **GlacierEQ MCP Stack** — https://github.com/GlacierEQ/glaciereq-mcp-stack  
  Policy-gated tool dispatch and credential-gated MCP server packages, including Supabase, with registration separated from execution authority.

- **Anthropic Agent Coordinator** — https://github.com/GlacierEQ/anthropic-agent-coordinator  
  Deterministic dependency-aware scheduling, capacity limits, structured deferrals, assignment-bound tool proposals, and exact-revision test receipts.

- **Job-App Helix** — https://github.com/GlacierEQ/job-app-helix  
  A portfolio/evidence compiler that preserves repository-native proof, revision identity, claim ceilings, and role-specific projections.

My broader pattern is to publish the mechanism and its proof boundary together: source, tests, receipts, and explicit non-claims. I care more about making a system falsifiable and reproducible than making a README sound impressive.

## Truth / interview notes

- U.S. citizen; no current or future employment visa sponsorship required for a U.S. role.
- Honolulu-based; strongly prefers remote work.
- Do not claim prior Supabase employment, internal access, or customer adoption.
- Do not claim GCP/warehouse depth beyond actual experience; strongest current platform depth is Supabase/Postgres, provider APIs, Vercel, GitHub, and agent/control-plane architecture.
- Strongest role-fit story: execution layer + durable state + human gates + evals + MCP + provider receipts + recursive generator architecture + inversion/root-cause debugging.

# LinkedIn Live Audit — 2026-09-19

## Scope

Live public LinkedIn surface + GlacierEQ recruiter/control-plane sources. This audit records observed state and drift; it does not mutate the LinkedIn account.

## Live public surface observed

- Public profile URL: `https://www.linkedin.com/in/caseybartonai`
- Public location: Honolulu, Hawaii, United States.
- Public current-position label rendered by LinkedIn: `Classified State & Federal R&D`.
- Education rendered: University of Hawaiʻi at Mānoa.
- About begins: `I design and build the control layer that makes capable AI systems usable under real…`
- Recent public activity emphasizes provenance, source-bounded evidence, revision identity, permission-aware tool actions, fail-closed behavior, and controlled capability.
- Public project cards observed include:
  - Thermal-Control Testbed — Telemetry, Thresholds & Recovery
  - Autonomy Simulation Toolkit — Deterministic Mode, Estimation & Control
  - Aspen Grove — Governed Memory & Evidence Infrastructure
  - Job-App Helix — Evidence-Bound AI Hiring Control Plane
  - Pro-Code — Governed Local Engineering Operator

## Canonical-source drift

Three materially different current-position narratives coexist:

1. **Live LinkedIn:** `Classified State & Federal R&D`.
2. **job-application/LINKEDIN_PROFILE_FINAL.md:** `Applied AI Engineer | Founder, GlacierEQ`, January 2025–Present.
3. **mega-skills/missions/anthropic-applied-ai/LINKEDIN_PROFILE_SOURCE.md:** `Forward-Deployed AI Architect`, Independent Research & Development, 2023–Present.

The bridge currently declares `LINKEDIN_PROFILE_FINAL.md` as the recruiter-facing source, but the live public profile does not match it.

## URL drift

The live custom URL is `linkedin.com/in/caseybartonai`.

Stale old URL `linkedin.com/in/casey-barton-8a1264320` remains in at least:

- `mega-skills/missions/anthropic-applied-ai/LINKEDIN_PROFILE_SOURCE.md`
- `casey-ai-engineering-signal/client/src/pages/Home.tsx`

## High-risk stale artifact

`job-application/LINKEDIN_PROFILE.md` remains present and contains legacy claims that should not control any public projection:

- `Senior AI Infrastructure Engineer | Built Colossus-Scale Systems | 1,052 GitHub Repos`
- `I build infrastructure that scales to 200,000+ GPUs.`
- claims of complete Colossus infrastructure blueprints, gigawatt-scale power, Memphis WWTP / $80M facility design, and related production-scale implications.

This file conflicts with the current evidence-bound guardrails in `LINKEDIN_PROFILE_FINAL.md`.

## Public-positioning conflict with current Operator doctrine

Recent LinkedIn language still foregrounds the old governance/gate mental model:

- `permission-aware`
- `fail closed when authority, dependency, or evidence is insufficient`
- `controlled capability`
- Job-App Helix description: `fail-closed promotion rules`
- Pro-Code description: dispatch as a `governed action`

That language is not inherently false, but it conflicts with the current estate correction that capability and completion are the driving objective, while verification, provenance, testing, receipts, and safety are supporting mechanisms rather than generalized permission gates.

Recommended future public framing:

`CAPABILITY → EXECUTE TOWARD MISSION → VERIFY → REPAIR/ADAPT → COMPLETE → RECEIPT`

Security/provider/legal constraints remain local constraints; they should not be presented as the defining identity of the engineering system.

## Project-link inconsistencies visible on public profile

The current public crawl associates:

- `Autonomy Simulation Toolkit` with a public-repository link that appears to resolve to `GlacierEQ/anthropic-agent-coordinator`, which does not match the project title.
- `Aspen Grove — Governed Memory & Evidence Infrastructure` with public implementation links to `GlacierEQ/pro-code` and `GlacierEQ/xai-colossus-cooling`, rather than an Aspen-Grove-named source.

These may be intentional evidence references, but they should be checked because a recruiter can reasonably expect title ↔ repository correspondence.

## Current strengths

- Live profile now has a clean custom URL.
- Public content uses explicit independence/non-affiliation boundaries.
- Recent posts use concrete, source-scoped metrics rather than raw repository counts.
- Project descriptions distinguish simulation / public proof / private state.
- Job-App Helix and Pro-Code provide concrete recruiter-facing proof surfaces.

## Acquisition gaps

Not observable from the public surface in this audit:

- exact headline text if LinkedIn is suppressing it from the public crawler;
- full historical Experience titles/descriptions (crawler currently renders several entries as `-`);
- Featured ordering;
- Skills ordering and endorsements;
- Open to Work titles, locations, visibility;
- recruiter-only settings;
- contact-info visibility;
- saved searches / alerts;
- profile analytics / search appearances;
- recommendations;
- private messages / recruiter activity;
- certifications not exposed publicly.

These remain `UNASSESSED`, not absent.

## Priority repair order

### P0 — Truth / source integrity
- choose one current-position source of truth;
- supersede the other two rather than allowing silent divergence;
- quarantine or explicitly mark `LINKEDIN_PROFILE.md` as legacy/non-controlling;
- update old LinkedIn URLs everywhere.

### P1 — Public thesis
Shift the profile from **governance-first** to **capability + completion first**, keeping provenance, verification, idempotency, authority, and recovery as engineering mechanisms.

### P2 — Project integrity
Check every public project title, repository link, date, metric, and independence statement against current repository truth.

### P3 — Private LinkedIn controls
Acquire a logged-in profile export / settings readback before claiming Open-to-Work, recruiter settings, analytics, or private activity state.

## Audit state

`PUBLIC_SURFACE_VERIFIED + REPO_SOURCE_DRIFT_CONFIRMED + PRIVATE_SETTINGS_UNASSESSED`

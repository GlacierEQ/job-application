# Stealth Demo Model
**Controlled Disclosure Strategy for the Application Process**

This document defines the three-layer disclosure model: what to show publicly, what to hold for interviews, and what stays private. The goal is to create a compelling public signal without revealing everything upfront — preserving leverage and intrigue for the interview and offer stages.

---

## The Three Layers

```
┌─────────────────────────────────────────────────────────┐
│  LAYER 3 — PRIVATE                                      │
│  Unreleased designs, internal architecture notes,       │
│  salary floor/ceiling, reference contacts, negotiation  │
│  strategy. Never shared proactively.                    │
├─────────────────────────────────────────────────────────┤
│  LAYER 2 — INTERVIEW / DEMO                             │
│  Deeper architecture walk-throughs, live system demos,  │
│  M2A protocol source code review, Aspen memory design,  │
│  unreleased proof-of-concepts. Shared in interviews     │
│  and controlled technical reviews only.                 │
├─────────────────────────────────────────────────────────┤
│  LAYER 1 — PUBLIC                                       │
│  Polished portfolio, technical summaries, selected      │
│  repos (cleaned and documented), application docs.      │
│  Always available. Designed to intrigue.                │
└─────────────────────────────────────────────────────────┘
```

---

## Layer 1 — Public (Always Visible)

This is what any recruiter, engineer, or hiring manager sees when they follow a link.

**What's here:**
- This repository (`GlacierEQ/job-application`) — the full application hub
- The six Colossus infrastructure repos — public, documented, with readable READMEs
- The `apex-stack` repo — M2A protocol overview, architecture diagrams, public documentation
- `XAI_COLOSSUS_AUDIT.md` — the domain audit demonstrating mastery
- All four company application packets in `docs/applications/`

**Goal:** Create enough signal to earn a conversation. Not so much that there's nothing left to show.

**Design principle:** The public layer should make someone say *"this person clearly knows what they're doing — I want to see more."*

---

## Layer 2 — Interview / Demo (Controlled Sharing)

This is what comes out in technical screens, architecture reviews, and advanced conversations.

**What's here:**
- Live walkthrough of the M2A routing system (screen share, not a video)
- Aspen memory architecture deep dive — the semantic indexing design, the persistence model, the retrieval API
- Colossus thermal and power simulation running live — demonstrating fault injection and recovery
- The connector mesh in operation — showing real integrations across Supabase, Vercel, GitHub, n8n
- Unreleased proof-of-concepts not yet in public repos

**When to activate:** After initial contact has been made and there's genuine interest. Do not volunteer Layer 2 materials in cold outreach.

**How to transition:** *"I have a live demo of the M2A routing system I'd like to walk you through. Do you have 30 minutes for a screen share?"*

---

## Layer 3 — Private (Never Shared Proactively)

**What's here:**
- Internal architecture notes that reveal future direction before an offer is made
- Reference contact details and relationship context
- Salary floor, ceiling, and negotiation strategy (`SALARY_NEGOTIATION.md`)
- Competing offer status and timeline
- Personal financial constraints and decision timeline

**Rule:** Layer 3 stays private until there is a written offer in hand. Some of it (reference contacts, salary floor) stays private until after the first verbal offer.

---

## Disclosure Triggers

| Stage | Trigger | Action |
|---|---|---|
| Cold outreach | None — you initiated | Share Layer 1 link only |
| Response received | They expressed interest | Offer Layer 2 demo (30 min screen share) |
| Technical screen | Scheduled | Prepare Layer 2 walkthrough |
| Architecture review | Requested | Full Layer 2 + selected deep dives |
| Reference check | Requested | Activate Layer 3 (reference contacts only) |
| Verbal offer | Received | Activate Layer 3 (negotiation strategy) |

---

## Repo Cleanliness Standards

Before sending any Layer 1 repo link, verify:

- [ ] README is complete, professional, and starts with what the repo does (not "WIP")
- [ ] No `.env` files, API keys, or credentials anywhere in the commit history
- [ ] No TODO comments in prominent locations (top of files, READMEs)
- [ ] All major files have at least a brief comment block explaining their purpose
- [ ] Commit history tells a coherent story (no "asdf" or "test test test" commits in recent history)
- [ ] The repo description on GitHub is set and accurate
- [ ] Topics/tags are set so the repo appears in relevant searches

For repos that fail this check, either clean them up or do not include them in Layer 1.

---

## The Intrigue Principle

The best portfolio creates forward momentum. After seeing Layer 1, the reviewer should want to see Layer 2. After seeing Layer 2, they should want to make an offer to see what gets built in Layer 3.

This means Layer 1 must be genuinely impressive but visibly incomplete — there should always be a "what else?" moment that only a conversation can resolve.

**Current Layer 1 intrigue hooks:**
- The M2A protocol is documented but the source code depth is only visible on review
- The Aspen memory architecture is described but not yet fully public
- The Colossus audit identifies gaps — a conversation about solutions to those gaps is the natural next step
- The six domain repos exist but the control plane that ties them together (apex-stack) is the most interesting piece and requires a demo to fully appreciate

# Outreach Packet Index
**GlacierEQ/job-application — Execution Reference**

This document defines the exact outreach packet composition for each target company, the send sequence, and the channel strategy. Use this as the operational playbook when initiating contact.

---

## Packet Anatomy

Every outreach packet has five layers, customized per company:

```
[1] INTRO MESSAGE       — 3-4 sentence direct outreach (not a cover letter)
[2] RESUME              — RESUME_STRATEGIC.md (not RESUME.md — strategic variant always)
[3] TECHNICAL BRIEF     — TECHNICAL_BRIEF.md (trimmed to company-relevant sections)
[4] COMPANY PACKET      — docs/applications/<company>_*.md (the tailored proof doc)
[5] PROOF REPOS         — Selected GitHub repos (not all — just the relevant ones)
```

Never send all 24+ docs. Send the 4-5 pieces that speak directly to this company's problems.

---

## Company-Specific Packets

### xAI

**Primary angle:** Colossus-class AI infrastructure, M2A protocol, control plane engineering

**Send in this order:**
| # | Document | Purpose |
|---|---|---|
| 1 | Intro message (see template below) | Door opener |
| 2 | `RESUME_STRATEGIC.md` | Credentials |
| 3 | `docs/applications/xai_statement_of_exceptional_work.md` | The proof |
| 4 | `XAI_COLOSSUS_AUDIT.md` | Domain mastery |
| 5 | `TECHNICAL_DEEP_DIVE_COOLING.md` or `POWER.md` | Technical depth (choose 1) |

**Repos to link:** `xai-colossus-cooling`, `xai-colossus-energy`, `apex-stack`, `colossus-gateway`

**Channel:** Direct to engineering team member (not careers page). Target: infrastructure leads, ML systems engineers, or someone who has tweeted/posted about Colossus.

**xAI Intro Message Template:**
```
I'm a systems architect who has spent the past two years building a 
Colossus-inspired AI infrastructure stack — cooling, power, security, 
deployment, and a multi-agent control plane. The work is live on GitHub. 
I'd like to show you what I built and talk about joining the team that 
is building the real thing.

[github.com/GlacierEQ/job-application]
```

---

### SpaceX / Starlink

**Primary angle:** Mission-critical control planes, telemetry pipelines, deployment automation

**Send in this order:**
| # | Document | Purpose |
|---|---|---|
| 1 | Intro message | Door opener |
| 2 | `RESUME_STRATEGIC.md` | Credentials |
| 3 | `docs/applications/spacex_proof_of_work.md` | The proof |
| 4 | `TECHNICAL_BRIEF.md` | Technical overview |
| 5 | `ENGINEERING_VERIFIED.md` | Reliability discipline |

**Repos to link:** `apex-stack`, `colossus-gateway`, `xai-colossus-build`

**Channel:** LinkedIn direct to ground software or flight software engineers. SpaceX careers page as parallel track.

**SpaceX Intro Message Template:**
```
I'm a distributed systems architect with a production-grade control 
plane and telemetry pipeline stack. I build systems where audit 
trails and graceful degradation are non-negotiable first principles — 
the same discipline that matters at SpaceX scale. The work is live 
and verifiable.

[github.com/GlacierEQ/job-application]
```

---

### NVIDIA

**Primary angle:** AI factory infrastructure, NIM microservices, platform orchestration

**Send in this order:**
| # | Document | Purpose |
|---|---|---|
| 1 | Intro message | Door opener |
| 2 | `RESUME_STRATEGIC.md` | Credentials |
| 3 | `docs/applications/nvidia_ai_infra_pitch.md` | The proof |
| 4 | `PROJECT_SHOWCASE.md` | Breadth of work |
| 5 | `SKILLS_MATRIX.md` | Technical depth map |

**Repos to link:** `apex-stack`, `xai-colossus-cooling`, `xai-colossus-energy`

**Channel:** LinkedIn direct to Developer Relations, Platform Engineering, or AI Infrastructure teams. NVIDIA careers portal as parallel track.

**NVIDIA Intro Message Template:**
```
I build AI infrastructure orchestration systems — routing, registry 
validation, audit persistence, and connector mesh. I've been studying 
the NIM microservices model and the DGX AI factory architecture closely. 
I want to build the control plane software that sits on top of your 
hardware. Here's what I've built so far.

[github.com/GlacierEQ/job-application]
```

---

### Anthropic

**Primary angle:** Agent memory infrastructure, audit trails, reliable tool use

**Send in this order:**
| # | Document | Purpose |
|---|---|---|
| 1 | Intro message | Door opener |
| 2 | `RESUME_STRATEGIC.md` | Credentials |
| 3 | `docs/applications/anthropic_reliable_agents_pitch.md` | The proof |
| 4 | `TECHNICAL_BRIEF.md` | Technical overview |
| 5 | `ENGINEERING_VERIFIED.md` | Reliability discipline |

**Repos to link:** `apex-stack` (M2A + Aspen memory), `colossus-gateway`

**Channel:** Anthropic careers page (they have a structured process — respect it). Parallel: LinkedIn to Research Engineers or Trust & Safety Infrastructure team.

**Anthropic Intro Message Template:**
```
I build the infrastructure layer that makes AI agents reliable — 
persistent memory, auditable routing, structured decision trails, 
and graceful degradation. I've been thinking carefully about the 
engineering problems underneath the model layer, and I believe 
reliable agent infrastructure is the most important unsolved problem 
in applied AI right now. Here's what I've built.

[github.com/GlacierEQ/job-application]
```

---

## Send Sequence

```
Week 1:  xAI (highest priority)
Week 2:  SpaceX
Week 3:  NVIDIA
Week 4:  Anthropic
```

Do not batch-send. Each company deserves a focused, deliberate outreach moment.

---

## Follow-Up Cadence

| Day | Action |
|---|---|
| Day 0 | Send intro + packet |
| Day 5 | Brief follow-up: "Wanted to make sure this landed." |
| Day 14 | Final follow-up: reference a specific recent development at the company |
| Day 21 | Move to passive track (quarterly check-in) |

See `FOLLOW_UP_TEMPLATES.md` for full message templates.

---

## Tracking

Use `JOB_SEARCH_STRATEGY.md` for status tracking. Each company should have:
- Date of first outreach
- Channel used
- Contact name (if known)
- Response status
- Next action + due date

# Application Packet Index and Send Plan

## Purpose

This is the operating map for the job application repo. It answers four questions:

1. What are we sending?
2. Who are we sending it to?
3. Which repos support the pitch?
4. What stays protected until the conversation is real?

## Primary repo

Application command center:

- `GlacierEQ/job-application`

This repo should contain polished application materials, not raw private work.

## Core packet set

### Public first-touch packet
Send first.

- `README.md`
- `PROJECT_SHOWCASE.md`
- `TECHNICAL_BRIEF.md`
- `docs/applications/01_XAI_STATEMENT_OF_EXCEPTIONAL_WORK.md`
- `docs/applications/02_SPACEX_STARLINK_PROOF_OF_WORK.md`
- `docs/applications/03_NVIDIA_AI_INFRASTRUCTURE_PITCH.md`
- `docs/applications/04_ANTHROPIC_RELIABLE_AGENTS_PITCH.md`

### Technical follow-up packet
Send after interest is shown.

- architecture map
- repo shortlist
- short Loom/video or screen-share walkthrough
- CI/deployment proof
- connector mesh control map

### Protected deep-dive packet
Only send after a real conversation.

- private repo invite
- protected Vercel preview
- time-limited demo link if available
- code walkthrough by call

## Repository selection matrix

### Universal core repos
Use these across most companies:

- `GlacierEQ/job-application` — application command center
- `GlacierEQ/apex-stack` — Supabase, Supermemory, Notion, Vercel, GitHub connector mesh
- `GlacierEQ/colossus-gateway` — deployment/runtime gateway proof
- `GlacierEQ/xai-colossus-cooling` — AI infrastructure cooling proof

### xAI-specific repos

- `GlacierEQ/xai-colossus-cooling`
- `GlacierEQ/xai-colossus-energy`
- `GlacierEQ/xai-colossus-security`
- `GlacierEQ/xai-colossus-servers`
- `GlacierEQ/xai-colossus-microcode`
- `GlacierEQ/xai-colossus-waterplant`
- `GlacierEQ/apex-stack`

### SpaceX / Starlink-specific repos

- `GlacierEQ/colossus-gateway`
- `GlacierEQ/apex-stack`
- `GlacierEQ/xai-colossus-energy`
- `GlacierEQ/xai-colossus-cooling`
- `GlacierEQ/xai-colossus-servers`

### NVIDIA-specific repos

- `GlacierEQ/apex-stack`
- `GlacierEQ/colossus-gateway`
- `GlacierEQ/xai-colossus-cooling`
- `GlacierEQ/xai-colossus-energy`
- `GlacierEQ/xai-colossus-microcode`

### Anthropic-specific repos

- `GlacierEQ/apex-stack`
- `GlacierEQ/job-application`
- Aspen Grove / M2A docs
- Supermemory integration docs
- connector mesh docs

## Who to send to

Do not lock named contacts until current-role verification is done.

### Best recipient classes

1. Hiring manager for the exact role.
2. Infrastructure engineering manager.
3. Technical recruiter for AI infrastructure or platform roles.
4. Principal/staff engineer in the relevant area.
5. Founder/exec only when the message is extremely short and proof-of-work is exceptional.

### xAI
Target role families:

- AI infrastructure
- ML infrastructure
- network engineering
- data center systems
- reliability and observability
- exceptional software engineering

### SpaceX / Starlink
Target role families:

- Starlink infrastructure
- mission operations software
- telemetry systems
- reliability engineering
- manufacturing/vehicle support software

### NVIDIA
Target role families:

- AI infrastructure solutions architecture
- HPC support engineering
- DGX / AI factory engineering
- networking for GPU clusters
- platform engineering

### Anthropic
Target role families:

- infrastructure engineering
- product/platform engineering
- developer tools
- reliability tooling
- safety-oriented agent systems

## Protected sharing model

There is no perfect way to show code while making copying impossible. The practical strategy is progressive disclosure.

### First touch
Share:

- public docs
- public repo links
- one-page technical story

Do not share:

- private repos
- sensitive implementation details
- secrets
- raw private records

### Second touch
Share:

- selected screenshots
- short demo
- architecture diagram
- sanitized implementation excerpts

### Serious conversation
Share:

- protected Vercel preview
- time-limited access where available
- private repo invite only if needed
- live walkthrough rather than downloadable archive

## Default send bundle by company

### xAI
Send:

- xAI statement
- project showcase
- Colossus cooling/energy/security repos
- APEX connector mesh summary

### SpaceX / Starlink
Send:

- SpaceX proof-of-work
- colossus-gateway
- APEX deployment/control-plane story
- telemetry/mission-critical framing

### NVIDIA
Send:

- NVIDIA infrastructure pitch
- AI factory / HPC / GPU operations framing
- APEX connector mesh and Colossus infrastructure repos

### Anthropic
Send:

- Anthropic reliable agents pitch
- APEX/Supermemory/Notion/GitHub control-plane docs
- M2A framed as auditable routing, not swarm language

## Next build items

1. Generate a polished PDF/office packet from these docs.
2. Create a protected demo plan for Vercel.
3. Add a target tracker with outreach status.
4. Add a role-specific resume variant for each company.
5. Add a short demo script for each target.
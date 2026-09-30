# Application Repo Strategy

## Purpose

This repo is the application command center. It should organize what gets sent to each company, which proof-of-work repos support the application, what the pitch is, and what should stay protected.

## Current repo decision

Primary application repository:

- `GlacierEQ/job-application`

Status observed:

- visibility: public
- default branch: `main`
- purpose already stated as AI Infrastructure Engineer portfolio and outreach materials

Because this repo is public, it should contain polished, non-sensitive application materials only. Do not place secrets, unreleased private implementation details, legal-case-specific raw records, or anything that would be damaging if copied.

## Recommended sharing architecture

### Public layer
Use for general credibility.

Examples:

- concise README
- public technical brief
- non-sensitive project showcase
- company-specific application summaries
- public repo links

### Private layer
Use for deeper proof-of-work.

Examples:

- private repos
- internal architecture docs
- deeper implementation details
- unreleased diagrams
- sensitive operational notes

### Time-limited demo layer
Use for serious conversations after contact.

Best option:

- protected Vercel preview deployment
- private GitHub repo access only if necessary
- temporary share link where available
- screen-share walkthrough when possible

Important limitation:

There is no perfect way to show code to someone and make it impossible to copy. The practical model is to avoid exposing the most sensitive material until trust exists. Share polished summaries first, then progressively reveal detail.

## Recommended policy

1. Do not give broad repo access in the first message.
2. Send the public application packet first.
3. Offer a short walkthrough.
4. Use Vercel protected previews for demos.
5. Use private repo invite only after a real conversation.
6. Keep the strongest proprietary patterns described at architecture level unless needed.

## Application packet hierarchy

### Packet A — Public first-touch packet
- README or short portfolio page
- one-page company-specific statement
- 3 to 5 proof-of-work repos
- concise technical brief

### Packet B — Technical follow-up packet
- architecture diagram
- selected repo walkthrough
- deployment or CI proof
- connector mesh sequence

### Packet C — Protected deep-dive packet
- private demo
- protected Vercel preview
- detailed implementation notes
- code walkthrough by call

## What this repo should contain

- target company matrix
- repo selection by company
- company-specific statement drafts
- outreach templates
- follow-up cadence
- protected sharing plan
- links to public and private proof-of-work candidates

## What this repo should not contain

- secrets
- access tokens
- private keys
- raw legal documents
- private third-party data
- unsupported claims
- sensitive proprietary implementation details that should remain private

## Immediate build plan

1. Create company-specific application docs.
2. Create repo selection matrix.
3. Create outreach packet index.
4. Add stealth sharing plan.
5. Update README with the application packet map.

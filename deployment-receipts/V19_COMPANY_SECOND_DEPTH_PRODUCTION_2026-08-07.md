# V19 COMPANY SECOND DEPTH — PRODUCTION RECEIPT

**Release:** V19 Company Second Depth  
**Canonical website:** `https://casey-barton-glaciereq.vercel.app/`  
**Canonical verifier:** `https://casey-barton-glaciereq.vercel.app/__v19_verify`  
**Source repository:** `GlacierEQ/job-application`  
**Pinned website source commit:** `150487be1d3cf88dd5886117e88125a4739faef3`  
**Pinned Job App Helix commit:** `556786e96ca49507125c77a62cb17904d645e134`  
**Helix second-depth promotion:** PR `#56`  
**Website second-depth consumer:** PR `#28`  
**Production bridge:** PR `#29`  
**State:** `PRODUCTION_READY_VERIFIED`

## What V19 establishes

V19 separates two facts that must never be conflated:

1. **Repository evidence state** — whether a company lens currently has recruiter-admitted public GlacierEQ repositories.
2. **Company second-depth state** — how far a company-specific claim has progressed through pinned public evidence and reproducible proof.

A company can therefore be `Repository-rich`, `Seeded`, or `Scaffold` while independently remaining `MAPPED_ONLY`. Repository presence, a company name, a target-role label, or an architectural aspiration is not sufficient to advance the second-depth state.

## Canonical upstream authority

`GlacierEQ/job-app-helix` remains the company and portfolio authority. Its promoted V19 authority commit is:

`556786e96ca49507125c77a62cb17904d645e134`

That authority contains 49 governed company tracks and `manifests/company_second_depth.json` with the monotonic progression:

1. `MAPPED_ONLY`
2. `ROLE_VERIFIED`
3. `PROBLEM_BOUNDED`
4. `CODE_INSPECTED`
5. `REMEDY_BOUNDED`
6. `IMPLEMENTED`
7. `PROOF_REPRODUCED`
8. `CLAIM_PROMOTED`

Each later stage retains every earlier prerequisite. The public claim ceiling advances only with the stage and may not be promoted downstream by the website.

## Public evidence-reference contract

A second-depth evidence reference is admitted only when it is a public-safe record containing exactly:

- `id`
- `kind`
- `source_identity`
- `source_ref`
- `visibility`
- `verification_state`

The source identity must be publicly addressable. `source_ref` must be immutable as either `commit:<40-lowercase-hex>` or `sha256:<64-lowercase-hex>`. Public-stage evidence must be public and verified; proof artifacts must be `REPRODUCED`. Malformed, private, unpinned, weakly verified, or premature proof/claim records fail closed.

## Website source promotion

PR #28 projected the Helix second-depth authority into the current Company Atlas without copying authority downstream. The public projection binds the second-depth source into the same source-digest and receipt graph as the rest of the Helix public projection.

The production bridge is intentionally pinned to website source commit:

`150487be1d3cf88dd5886117e88125a4739faef3`

The bridge separately pins the Helix authority commit above. A later documentation or receipt commit does not change either production source pin.

## Production bridge contract

PR #29 upgraded the commit-pinned, read-only Vercel bridge to V19. The bridge:

- compiles the 49 company tracks from the pinned Helix dossiers;
- consumes and validates the pinned `company_second_depth` authority;
- keeps recruiter-repository admission separate from second-depth progression;
- server-renders `/atlas/`, `/companies/`, `/companies/<slug>/`, `/atlas/<slug>/`, company `record.json`, and `/data/company-atlas.json`;
- carries second-depth stage, ordinal, claim ceiling, blockers, next gate, and public-safe evidence references into company machine records;
- extends `GEQ.CI/1` with `DEPTH`, `BLOCKER`, and `NEXT` while retaining the v1 record identity;
- renders the governed promotion sequence inside Mesh `ASPIRATION & EVOLUTION`;
- augments sitemap and `llms.txt` from the same pinned company projection;
- preserves `script-src 'none'`, `style-src 'self'`, no inline styles, no client JavaScript, and no trackers;
- fails closed when Helix projection data is invalid or unavailable.

## Review defects closed before production

The production candidate was not promoted immediately after its first green preview. Review surfaced three substantive defects, all of which were repaired and regression-tested before the final preview and production deployment:

1. **Mesh parity:** `applicable_flagships` existed in the machine record but were not rendered as company-page Mesh relationships. The bridge now renders them as `TRANSFERABLE_CAPABILITY` edges.
2. **Projection dependency scope:** arbitrary nested `/companies/*` or `/atlas/*` paths could unnecessarily force a Helix projection load. Projection loading is now restricted to recognized route shapes only.
3. **Source-bridge outage behavior:** upstream source-fetch failures could escape as uncontrolled server errors. They now return a controlled HTTP `502`, `Cache-Control: no-store`, `Retry-After: 60`, and a bounded source-unavailable message.

## Preview verification

The first V19 preview proved the 49-route topology and verifier contract, but it was superseded after the review defects above were identified.

A corrected V19 preview was then deployed from the exact repaired two-file bridge candidate. The corrected preview returned HTTP 200 / `PASS` from `__v19_verify` before production promotion.

There were no production-only source edits. Production was deployed from the same corrected bridge bytes that passed the final preview.

## Canonical production verification

The canonical production verifier returned HTTP 200 with:

- schema: `glaciereq.v19-production-verification.v1`
- status: `PASS`
- source commit: `150487be1d3cf88dd5886117e88125a4739faef3`
- Helix source commit: `556786e96ca49507125c77a62cb17904d645e134`
- release: `V19 Company Second Depth`
- company routes: `49`
- public recruiter-admitted repository memberships: `59`
- projection error: `null`
- facts invariant: `true`
- client scripts: `0`
- trackers: `0`

Every pinned static integrity check in the V19 verifier returned `ok: true`, including the 49th constellation-position contract in `assets/helix-atlas.css`.

## Current topology

The canonical 49 company lenses resolve as:

- `8` Repository-rich
- `15` Seeded
- `26` Scaffold

The current second-depth topology is intentionally more conservative:

- `49` `MAPPED_ONLY`
- `0` `ROLE_VERIFIED`
- `0` `PROBLEM_BOUNDED`
- `0` `CODE_INSPECTED`
- `0` `REMEDY_BOUNDED`
- `0` `IMPLEMENTED`
- `0` `PROOF_REPRODUCED`
- `0` `CLAIM_PROMOTED`

That is not an unfinished-state bug. It is the new truth boundary working as intended: company-specific claims do not advance merely because portfolio evidence or architectural fit exists.

## Lockheed Martin boundary

Lockheed Martin is now an upstream-governed company lens rather than a downstream prototype-only name.

Canonical public state:

- route: `/companies/lockheed-martin/`
- repository evidence: `Scaffold`
- direct recruiter-admitted repositories: `0`
- second-depth stage: `MAPPED_ONLY`
- public claim ceiling: `company_alignment_only`

The route explicitly does **not** claim Lockheed Martin affiliation, endorsement, employment, proprietary access, contract relationship, security clearance, adoption, production deployment, or measured company impact. Its next gate is to verify a current public role/team, preserve that source, bound one externally supportable problem, and only then inspect genuinely relevant GlacierEQ implementation paths.

## Public route verification

Canonical production returned `200 OK` for the principal V19 surfaces, including:

- `/atlas/`
- `/companies/`
- `/companies/lockheed-martin/`
- `/companies/openai/record.json`
- `/sitemap.xml`
- `/llms.txt`

The discovery surfaces expose the governed Company Atlas and include the Lockheed Martin route under the same canonical company topology.

## Security and publication boundary

V19 preserves the stronger browser/runtime contract rather than weakening it to obtain richer interactivity:

- `script-src 'none'`
- `style-src 'self'`
- zero inline styles
- zero client JavaScript
- zero trackers
- same-origin public delivery
- fail-closed Helix projection
- immutable website and Helix source pins
- controlled source-outage response

The constellation remains an atmospheric/intelligence surface built from semantic links and CSS. Accessibility and searchability do not depend on pointer precision or client scripting.

## Truth boundary

V19 proves a governed public company topology and a mechanism for advancing company-specific claims. It does not prove current employment opportunities, company adoption, affiliation, endorsement, proprietary knowledge, customer outcomes, clearance, contracts, production use, or measured business impact.

Repository evidence does not automatically prove authorship, originality, runtime correctness, company relevance, or second-depth progress. A second-depth promotion requires the cumulative evidence declared by the upstream stage contract.

## Next promotion wave

The priority wave is:

1. Lockheed Martin
2. OpenAI
3. Anthropic
4. NVIDIA
5. SpaceX
6. xAI
7. Microsoft
8. Notion

The next valid action is **not** to change their stages. It is to acquire and pin current public role evidence, then advance one stage only where the upstream evidence contract is actually satisfied.

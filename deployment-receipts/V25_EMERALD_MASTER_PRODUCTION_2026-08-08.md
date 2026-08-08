# V25 EMERALD MASTER — PRODUCTION RECEIPT

**Date:** 2026-08-08  
**State:** `PRODUCTION_VERIFIED`  
**Canonical route:** `https://casey-barton-glaciereq.vercel.app/master/`

## Source promotion

- Pull request: `GlacierEQ/job-application#50`
- Product merge commit: `8dd6cc752ccb188087017ccd9afd9f524499507c`
- Product files changed:
  - `deployment/vercel-source-bridge/api/compiler-proxy.js`
  - `deployment/vercel-source-bridge/compiler-proxy.test.js`
- V25 deployment-bundle workflow: `31275470493`
- V25 deployment artifact ID: `9026863272`
- Canonical two-file V25 `api/index.js` SHA-256: `c66d565d19f777babdb4664376eec0854f65772ce554d0b089f334e1a59e1574`
- Canonical V25 factory-bundle SHA-256: `69ba5c9df5cb19c4f4d0868e9e9aa69d6853790cde1acad998b52c988d915efc`
- Runtime module count: `8`

## Visual repair

The later complete-design layer had flattened technical surfaces, including removing the Master-card shadow treatment. V25 restores the technical-page emerald energy without reverting the newer architecture.

Production now serves `/assets/site.emerald-motion.css` on `/master/` with:

- emerald radial glow behind the technical hero
- layered emerald/green-black Master-card surfaces
- stronger emerald borders and ambient card depth
- slow diagonal `emerald-master-sheen` across Master cards
- staggered sheen timing
- subtle title glow
- `emerald-terminal-breathe` ambient terminal motion
- emerald evidence-table, tree, branch, and callout accents
- hover lift only on hover-capable pointer devices
- reduced glow on small screens
- `prefers-reduced-motion: reduce` disables animation
- print output removes motion/shadows

Algerian display typography remains active and separate from the body/interface typography stack.

## Verification before merge

PR #50 reached a clean two-file product delta after temporary synthesis helpers were removed.

The exact PR head passed:

- focused compiler-proxy tests, including emerald injection and idempotency
- full `npm test` presentation regression suite
- V25 deterministic deployment-bundle build
- generated deployment Lambda syntax validation
- `git diff --check`
- normal CI
- V25 Deployment Bundle
- V15 Final Hiring Release
- Application Compiler Overlay
- V21 Complete Web Release

No unresolved inline review threads remained before merge.

## Deployment transport

The canonical V25 build artifact is a self-contained two-file bundle. The available Vercel connector could not ingest the 173 KB generated Lambda as a mounted file, and an attempted payload-splitting transport exceeded the Hobby-plan serverless-function-count limit.

Production therefore uses a bounded two-file transport bootstrap with the following explicit truth boundary:

- source is pinned to exact product commit `8dd6cc752ccb188087017ccd9afd9f524499507c`
- exactly eight V25 bridge source modules are fetched from immutable raw-GitHub URLs on cold bootstrap
- every source SHA-256 is verified before materialization
- every canonical factory SHA-256 is independently reconstructed and verified
- the ordered canonical factory bundle is reconstructed and must equal `69ba5c9df5cb19c4f4d0868e9e9aa69d6853790cde1acad998b52c988d915efc`
- mismatch fails closed before release-router execution
- no client JavaScript is introduced
- bootstrap network fetch is required on a cold instance; this is deliberately reported as `true` rather than hidden

This transport is an operational packaging boundary, not a change to the V25 application/compiler source.

## Preview

Preview deployment: `dpl_F8qrgmzEdMLkAWhcZwLYfzWzsTuw`

Observed:

- deployment: `READY`
- alias error: `null`
- `/__v25_transport_verify`: HTTP `200`, `PASS`
- source commit: `8dd6cc752ccb188087017ccd9afd9f524499507c`
- source SHA verification: `true`
- factory SHA verification: `true`
- canonical factory-bundle verification: `true`
- module count: `8`
- client script added: `false`

Preview application endpoints were behind Vercel preview protection, so canonical public production was used for the final end-to-end readback after the transport integrity gate passed.

## Production

Production deployment: `dpl_HUpfsrjziiQoFPfFQw7jmwTG15sd`

Observed deployment state:

- state: `READY`
- target: `production`
- region: `iad1`
- alias error: `null`
- canonical alias attached: `casey-barton-glaciereq.vercel.app`

### Transport verifier

`/__v25_transport_verify`

- HTTP `200`
- status `PASS`
- exact source commit `8dd6cc752ccb188087017ccd9afd9f524499507c`
- module count `8`
- source SHA verification `true`
- factory SHA verification `true`
- canonical factory-bundle verification `true`
- bootstrap network fetch required `true`
- client script added `false`

### V25 application verifier

`/__v25_verify`

- HTTP `200`
- schema `glaciereq.v25-application-compiler-verification.v1`
- status `PASS`
- release `V25-APPLICATION-COMPILER`
- inherited V24 status `PASS`
- company count `49`
- selected verifier company `openai`
- depth `senior_engineer`
- pressure source backed `true`
- script free `true`
- inline style free `true`
- compiler navigation `true`
- machine projection `true`
- client scripts `0`
- errors `[]`

### V24 typography verifier

`/__v24_verify`

- HTTP `200`
- status `PASS`
- Algerian declared `true`
- proprietary font binary bundled `false`
- inherited V23 truth verifier `PASS`
- historical proof authorities modified `false`

### Master route

`/master/`

- HTTP `200`
- `/assets/site.algerian.css` present
- `/assets/site.emerald-motion.css` present
- V25 Compiler navigation present
- strict CSP retained: `script-src 'none'`, `connect-src 'none'`
- no client script added

### Emerald presentation resource

`/assets/site.emerald-motion.css`

- HTTP `200`
- emerald `rgba(73,255,177,...)` hero field present
- `.master-card::before` present
- `@keyframes emerald-master-sheen` present
- `@keyframes emerald-terminal-breathe` present
- `@media(prefers-reduced-motion:reduce)` present
- mobile-specific reduced glow present
- print-safe flattening present

### Public-site regression readback

`/` returned HTTP `200` under the V25 release router with the existing recruiter content and strict CSP intact.

### Runtime observation

Production runtime logs were queried for `error` and `fatal` events over the checked 30-minute window for deployment `dpl_HUpfsrjziiQoFPfFQw7jmwTG15sd`.

Observed: no matching logs in the checked window.

## Completion statement

The emerald Master repair completed:

`REGRESSION IDENTIFIED → ROOT CAUSE LOCATED → ADDITIVE CSS-ONLY REPAIR → FOCUSED TEST → FULL REGRESSION TEST → V25 BUNDLE TEST → PR REVIEW → MERGE → PREVIEW INTEGRITY GATE → PRODUCTION → V25/V24 VERIFIERS → MASTER HTML/CSS READBACK → RUNTIME CHECK → RECEIPT`

No manual user deployment, secret handoff, local CLI step, client JavaScript, CSP weakening, or typography rollback was required.

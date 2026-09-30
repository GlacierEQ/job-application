# V27 ALGERIAN MONUMENT — PRODUCTION RECEIPT

**Production date (HST):** 2026-08-10  
**Canonical site:** `https://casey-barton-glaciereq.vercel.app/`  
**State:** `PRODUCTION_VERIFIED`

## Presentation authority

- V27 merge commit: `086f1591b6cbe828c3f9acf5add1aa828fb32707`
- Current GitHub main at production check: `b421edb581ca4f1098d8d09a5e36d682efca8b1e`
- `b421edb...` is a direct child of the V27 merge and changes only `RESUME_ATS.md`; it does not modify any of the ten bundled runtime modules or V27 font/presentation assets.
- V27 release: `V27-ALGERIAN-MONUMENT`
- V26 remains independently verifiable and its legacy CSS/font assets remain routable for cached clients.

## Font authority

- Font family source: `Fontsource Ewert 5.3.0 · OFL-1.1`
- Same-origin browser path: `/assets/title-monument.woff2`
- WOFF2 bytes: `13728`
- Exact WOFF2 SHA-256: `2a98066e14efc2176ee1ba818ea565e77409b81a9a909e1b53b286307a2e70fb`
- Scope: `h1`, `.brand strong`
- Secondary headings remain governed by the V24 Algerian/Copperplate layer.
- Body, controls, machine text, proof metadata, and code typography are unchanged.

## Visual treatment

The V27 title tier adds a more monumental carved display treatment:

- stronger Algerian-like engraved silhouette through Ewert
- wider architectural title tracking
- subtle light text stroke
- layered dark relief
- restrained emerald depth/glow
- mobile-specific tracking/stroke reduction
- print fallback
- reduced-motion simplification

The Master emerald presentation remains layered after title typography.

## Security / truth boundary

Preserved:

- `script-src 'none'`
- `connect-src 'none'`
- `font-src 'self'`
- zero client scripts added by V27
- no external browser font origin
- no résumé fact, company claim, proof authority, Helix evidence, legal/private material, auth, or credential semantics changed by V27

## Native promotion gates

PR `#133` was merged only after the final head passed all seven normal workflow families:

1. CI
2. Portfolio truth gate
3. V15 Final Hiring Release
4. V21 Complete Web Release
5. Algerian Production Overlay
6. Application Compiler Overlay
7. V25 Deployment Bundle

Review findings were implemented before merge, including:

- preserved V26 asset compatibility
- effective-production bundle count advanced to 10 modules
- V27 script-delta verification
- exact `.brand strong` selector reporting
- adversarial V26→V27 non-stacking test
- active removal of the prior V26 trueface stylesheet from transformed live HTML

## Exact deployment artifact

Post-merge V25 bundle workflow run: `31459712686`  
Artifact ID: `9089339689`

Artifact manifest:

- source commit: `086f1591b6cbe828c3f9acf5add1aa828fb32707`
- module count: `10`
- factory bundle bytes: `202730`
- factory bundle SHA-256: `c78668a65bbc759b5e18d7ffd7aa1c736b8db22371ee48c28292e464f6df3539`
- canonical `api/index.js` bytes: `209356`
- canonical `api/index.js` SHA-256: `387fb5058286f10f73cf5cc287f7e83d633d68ce96bb6c9d75966d646af16068`
- runtime string evaluation: `false`
- inner bootstrap network fetch: `false`
- every factory hash verified before execution: `true`

## Immutable carrier

Because the Vercel deployment action only accepted inline literal file data and would not consume mounted artifact paths, the exact compressed canonical bundle was stored on a dedicated immutable release-carrier branch and loaded fail-closed.

Carrier branch: `release/v27-artifact-carrier-20260810`  
Pinned carrier commit: `fc96e72b730f8d9d3c295d405d306d57c19c09fa`

Carrier contract:

- 8 individually SHA-256-verified base64 chunks
- reconstructed gzip bytes: `50679`
- gzip SHA-256: `d8c2a1db7e2825909d9518b3e941d3bc7d1f17d78671b9a0eecd1b991b4f78ca`
- decompressed bytes: `209356`
- decompressed SHA-256: `387fb5058286f10f73cf5cc287f7e83d633d68ce96bb6c9d75966d646af16068`
- runtime string evaluation required by carrier: `false`
- carrier fails closed on any chunk, gzip, or inner-artifact mismatch

The dedicated carrier branch is an active production dependency and must not be retired while this deployment uses the pinned carrier commit.

## Preview

Preview deployment: `dpl_EVwKFic8uWs1bu7u3JkvLz6vEhik`

Observed:

- state: `READY`
- carrier verifier: HTTP `200` / `PASS`
- carrier source commit: `086f1591b6cbe828c3f9acf5add1aa828fb32707`
- carrier commit: `fc96e72b730f8d9d3c295d405d306d57c19c09fa`
- exact inner artifact SHA verified before runtime load

Vercel preview SSO intercepted nested application verifier reads; production public verification below is the decisive end-to-end check.

## Production

Production deployment: `dpl_CxCGmvhW4j1FGCrJrwrbpLY9FKr3`

Observed deployment state:

- `READY`
- target: `production`
- region: `iad1`
- canonical alias attached: `casey-barton-glaciereq.vercel.app`
- alias error: `null`

### Carrier verifier

`/__carrier_verify`

- HTTP `200`
- status `PASS`
- chunk count `8`
- gzip SHA matched
- inner bundle SHA matched
- runtime string evaluation `false`
- client scripts added `0`

### Deterministic bundle verifier

`/__v25_bundle_verify`

- HTTP `200`
- status `PASS`
- source commit `086f1591b6cbe828c3f9acf5add1aa828fb32707`
- factory bundle SHA `c78668a65bbc759b5e18d7ffd7aa1c736b8db22371ee48c28292e464f6df3539`
- module count `10`
- runtime string evaluation `false`
- bootstrap network fetch required by inner bundle `false`
- every factory hash verified before execution `true`

### V27 verifier

`/__v27_verify`

- HTTP `200`
- status `PASS`
- inherited V26 `PASS`
- font source `Fontsource Ewert 5.3.0 · OFL-1.1`
- font SHA `2a98066e14efc2176ee1ba818ea565e77409b81a9a909e1b53b286307a2e70fb`
- WOFF2 signature `true`
- homepage stylesheet count `1`
- Algerian base precedes V27 Monument `true`
- old V26 trueface stylesheet absent from transformed homepage `true`
- client scripts added `0`
- errors `[]`

### Master readback

`/master/`

- HTTP `200`
- loads `/assets/site.algerian.css`
- then `/assets/site.title-monument.css`
- then `/assets/site.emerald-motion.css`
- strict CSP remains `script-src 'none'; connect-src 'none'; font-src 'self'`
- production headers identify `fontsource-ewert-5.3.0` and `V27-ALGERIAN-MONUMENT`

### CSS readback

`/assets/site.title-monument.css`

- HTTP `200`
- contains same-origin `@font-face`
- contains `Glacier Algerian Monument`
- contains title-only `:where(h1,.brand strong)` scope
- contains carved stroke / dark relief / emerald depth treatment

### Font readback

`/assets/title-monument.woff2`

- HTTP `200`
- `Content-Type: font/woff2`
- bytes `13728`
- header begins `wOF2`
- response header SHA-256 matches `2a98066e14efc2176ee1ba818ea565e77409b81a9a909e1b53b286307a2e70fb`
- immutable cache policy present

## Runtime observation

Production runtime logs were queried for `error` and `fatal` events for deployment `dpl_CxCGmvhW4j1FGCrJrwrbpLY9FKr3` over the checked 20-minute window.

Observed: no matching error/fatal logs.

This is a checked-window observation, not a guarantee of future runtime behavior.

## Completion

`FRESHEN → DESIGN V27 → PIN FONT BYTES → TEST → REVIEW → REPAIR → 7 GREEN GATES → MERGE → BUILD EXACT ARTIFACT → INTEGRITY-CARRIER PREVIEW → CARRIER PASS → IDENTICAL PRODUCTION PROMOTION → PUBLIC BUNDLE PASS → V27 PASS → MASTER/CSS/FONT READBACK → RUNTIME CHECK → RECEIPT`

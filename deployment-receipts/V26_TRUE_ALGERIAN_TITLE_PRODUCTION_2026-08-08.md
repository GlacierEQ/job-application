# V26 TRUE ALGERIAN-STYLE TITLE — PRODUCTION RECEIPT

**Release:** `V26-TRUE-ALGERIAN-TITLE`  
**Production date:** 2026-08-08  
**Canonical website:** `https://casey-barton-glaciereq.vercel.app/`  
**State:** `PRODUCTION_VERIFIED`

## Promotion chain

| Layer | Immutable identity |
| --- | --- |
| V26 source merge | `GlacierEQ/job-application@6ce5f580ebad748bee10bb7918929c56080111db` |
| Pull request | `GlacierEQ/job-application#54` |
| Deployment bundle run | `31280223547` |
| Canonical deployment artifact | `v25-deployment-6ce5f580ebad748bee10bb7918929c56080111db` |
| Artifact digest | `sha256:cc3ad767a8b9ad143a594080cd8825f60871dbf6779fda098042f424e49604f3` |
| Production deployment | `dpl_AWfJumGevKZAQRUur7kjb7iE1H4g` |

## Typography architecture

V24 remains the general display-heading layer. V26 adds a real webfont only for true page titles and the primary brand title:

- `h1`
- `.brand strong`

Secondary headings (`h2`–`h6`), body text, controls, code, proof metadata, ATS surfaces, and machine-readable surfaces retain their prior typography hierarchy.

The V26 display face is **Rye 5.3.0** from Fontsource, identified in the runtime as `Fontsource Rye 5.3.0 · OFL-1.1`. It is used as an Algerian-style title face; it is not represented as the proprietary Microsoft Algerian font.

## Font delivery and integrity

Browser-facing font URL:

`/assets/title-algerian.woff2`

Browser origin: `self`

Observed production font properties:

- content type: `font/woff2`
- byte length: `41416`
- WOFF2 signature: `wOF2`
- pinned SHA-256: `00de26ff9e435fb8f9e3ad15877f9deb4b70f3945ae0abcf7f0ed278d593014b`
- cache policy: `public, max-age=31536000, immutable`

The V26 server presentation layer fetches the version-pinned source, bounds the response size, requires the WOFF2 signature, and rejects any byte stream whose SHA-256 does not equal the pinned digest. The browser receives the verified font only from the GlacierEQ origin.

## Deterministic application transport

The canonical post-merge deployment bundle contains **9 runtime modules** and was generated from source commit `6ce5f580ebad748bee10bb7918929c56080111db`.

Canonical factory bundle SHA-256:

`3e99a192cb1b1e3de7af0d4b5c62d7a2e5d3032766e0e5b45b0ae92675ccfb8b`

Production uses the previously established fail-closed two-file transport because the connector cannot reliably submit the full generated Lambda inline. The transport:

1. reads only immutable source paths from the exact merge commit;
2. verifies all 9 source SHA-256 values;
3. constructs and verifies all 9 factory SHA-256 values;
4. verifies the aggregate canonical factory-bundle SHA-256;
5. only then evaluates the server-side factories and invokes the canonical release router.

No client script is added by this transport.

## Verification endpoints

### Transport verifier

`/__v26_transport_verify`

Observed production state:

- HTTP `200`
- schema `glaciereq.v26-transport-verification.v1`
- status `PASS`
- release `V26-TRUE-ALGERIAN-TITLE`
- source commit `6ce5f580ebad748bee10bb7918929c56080111db`
- module count `9`
- source hashes verified `true`
- factory hashes verified `true`
- factory bundle verified `true`
- client script added `false`

### V26 application verifier

`/__v26_verify`

Observed production state:

- HTTP `200`
- schema `glaciereq.v26-title-font-verification.v1`
- status `PASS`
- inherited V25 status `PASS`
- font source `Fontsource Rye 5.3.0 · OFL-1.1`
- font SHA-256 `00de26ff9e435fb8f9e3ad15877f9deb4b70f3945ae0abcf7f0ed278d593014b`
- font bytes `41416`
- WOFF2 signature `true`
- homepage title stylesheet count `1`
- V24 Algerian layer precedes V26 title layer `true`
- homepage script-free `true`
- title scope `[h1, brand strong]`
- browser font origin `self`
- client scripts added `0`
- errors `[]`

## Public-page readback

### `/master/`

Observed:

- HTTP `200`
- `/assets/site.algerian.css` present
- `/assets/site.title-font.css` present immediately after the general Algerian layer
- `/assets/site.emerald-motion.css` preserved
- V26 release header present

### `/`

Observed:

- HTTP `200`
- `/assets/site.algerian.css` present
- `/assets/site.title-font.css` present after it
- V26 release header present

Both checked pages retained this CSP:

`default-src 'self'; script-src 'none'; style-src 'self'; img-src 'self' data:; connect-src 'none'; font-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'; form-action 'self' mailto:; upgrade-insecure-requests`

Therefore the title upgrade did not widen the client execution, connection, or font-origin boundaries.

## Runtime observation

Production runtime logs for deployment `dpl_AWfJumGevKZAQRUur7kjb7iE1H4g` were queried for `error` and `fatal` events over the checked 30-minute window.

Observed result: `No logs found for the specified criteria.`

This is a checked-window observation, not a guarantee about future runtime behavior.

## Truth boundary

This release changes title presentation only. It does not modify résumé facts, company evidence, Helix proof authorities, claim receipts, application-stage truth, authentication, or deployment permissions.

## Completion statement

`TITLE DESIGN → REAL WEBFONT → BYTE PIN → TEST → ADVERSARIAL REVIEW → 9-MODULE BUNDLE → PREVIEW TRANSPORT PASS → PRODUCTION → V26 PASS → PUBLIC PAGE READBACK → RUNTIME CHECK → RECEIPT`

No user-side font installation, local CLI step, secret handoff, `.env` file, or browser-side external font request was required.

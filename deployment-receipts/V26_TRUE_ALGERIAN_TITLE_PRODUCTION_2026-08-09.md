# V26 TRUE ALGERIAN TITLE — PRODUCTION RECEIPT

**Release:** V26 True Algerian Title  
**Production date:** 2026-08-09 HST  
**Canonical website:** `https://casey-barton-glaciereq.vercel.app/`  
**State:** `PRODUCTION_VERIFIED`

## Source authority

- Merge commit: `GlacierEQ/job-application@6ce5f580ebad748bee10bb7918929c56080111db`
- Pull request: `GlacierEQ/job-application#54`
- Runtime modules: `9`
- Title layer module SHA-256: `1d35b4749b46d4cd6581ef62b682ba6076df6816579e404ad09fe8c8ee422829`

## Font authority

- Face: `Rye`
- Source: `Fontsource Rye 5.3.0`
- License: `OFL-1.1`
- Browser delivery: same-origin `/assets/title-algerian.woff2`
- Exact WOFF2 SHA-256: `00de26ff9e435fb8f9e3ad15877f9deb4b70f3945ae0abcf7f0ed278d593014b`
- Exact observed bytes: `41416`
- Signature: `wOF2`

The browser is not permitted to retrieve the font directly from a third-party origin. The V26 server layer retrieves the pinned source, validates the exact digest and WOFF2 signature, and serves the bytes from the GlacierEQ origin. Existing CSP remains `font-src 'self'`, `script-src 'none'`, and `connect-src 'none'`.

## Presentation boundary

V26 owns only the true title tier:

- `h1`
- `.brand strong`

V24 remains the secondary Algerian/Copperplate heading system. Body text, controls, code, proof metadata, machine surfaces, and secondary heading hierarchy are unchanged.

## Review and gates

Before merge, the exact clean PR head completed successfully:

- CI
- V25 Deployment Bundle
- Portfolio truth gate
- V15 Final Hiring Release
- Application Compiler Overlay
- Algerian Production Overlay
- V21 Complete Web Release

Review findings were repaired before merge:

1. V26 verifier now fails closed when either typography stylesheet is missing rather than relying on `indexOf(-1)` ordering behavior.
2. The deterministic deployment bundle contract was advanced from eight modules to nine modules and its regression tests were updated.
3. The exact Rye WOFF2 bytes were pinned by SHA-256 rather than trusting only the package/version URL.

## Main deployment artifact

GitHub Actions run `31280223547` generated artifact:

- name: `v25-deployment-6ce5f580ebad748bee10bb7918929c56080111db`
- artifact id: `9028192241`
- archive digest: `sha256:cc3ad767a8b9ad143a594080cd8825f60871dbf6779fda098042f424e49604f3`
- module count: `9`
- factory bundle SHA-256: `3e99a192cb1b1e3de7af0d4b5c62d7a2e5d3032766e0e5b45b0ae92675ccfb8b`

The connector could not ingest mounted artifact files directly and rejected a path-only deployment call because its deployment contract requires inline `data` strings. To avoid repeating the previously observed oversized-inline-payload truncation failure, promotion used a compact commit-pinned bootstrap instead of reserializing the 184 KB bundled Lambda.

The bootstrap:

- pins source commit `6ce5f580ebad748bee10bb7918929c56080111db`
- fetches only the nine immutable runtime modules
- verifies every module against the SHA-256 values from the green main deployment manifest
- writes them into isolated `/tmp` runtime storage
- loads the exact release router only after all nine hashes pass
- fails closed with HTTP 502 if any fetch/hash/materialization step fails

## Preview

Deployment: `dpl_2knqCq4XKzpQ961Jz9NLrHjQ7VCu`  
State: `READY`  
Region: `iad1`

`/__v26_verify` returned HTTP `200` / `PASS` and reported:

- release: `V26-TRUE-ALGERIAN-TITLE`
- inherited V25: `PASS`
- font SHA-256: `00de26ff9e435fb8f9e3ad15877f9deb4b70f3945ae0abcf7f0ed278d593014b`
- font bytes: `41416`
- WOFF2 signature: `true`
- title stylesheet count: `1`
- V24 Algerian stylesheet precedes V26 title layer: `true`
- script-free: `true`
- browser font origin: `self`

## Production

Deployment: `dpl_hwuSZStrfTBRc95HZH1PL9Pbd5m2`  
State: `READY`  
Target: `production`  
Region: `iad1`  
Alias error: `null`  
Canonical alias attached: `casey-barton-glaciereq.vercel.app`

Canonical `https://casey-barton-glaciereq.vercel.app/__v26_verify` returned HTTP `200` / `PASS` with the same V26 font identity and inherited V25 PASS state.

Canonical `/master/` returned HTTP `200` and contains, in order:

1. `/assets/site.algerian.css`
2. `/assets/site.title-font.css`
3. `/assets/site.emerald-motion.css`

Canonical `/assets/site.title-font.css` returned HTTP `200` and declares the same-origin WOFF2 face `Glacier Algerian Title`, applying it only to `h1` and `.brand strong` with Algerian/Copperplate fallbacks.

Production CSP remains:

`default-src 'self'; script-src 'none'; style-src 'self'; img-src 'self' data:; connect-src 'none'; font-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'; form-action 'self' mailto:; upgrade-insecure-requests`

## Runtime observation

Production runtime `error` and `fatal` logs were queried for deployment `dpl_hwuSZStrfTBRc95HZH1PL9Pbd5m2` over the checked 30-minute window.

Observed result: `No logs found for the specified criteria.`

This is a checked-window observation, not a guarantee about future runtime behavior.

## Completion statement

V26 completed the operational chain:

`TITLE REQUIREMENT → REAL OPEN-LICENSED FACE → SAME-ORIGIN DELIVERY → BYTE PIN → REVIEW → FULL GATES → MERGE → MAIN ARTIFACT → PREVIEW PASS → PRODUCTION PROMOTION → CANONICAL READBACK → RUNTIME CHECK → RECEIPT`

No user-side CLI, environment-file, token, font installation, or manual deployment action was required.

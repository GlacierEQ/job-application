# V21 COMPLETE WEB DESIGN — CANDIDATE RECEIPT

**State:** `CANDIDATE_UNTIL_PREVIEW_AND_PRODUCTION_VERIFICATION`

## Source authority

- Branch: `design/complete-web-experience-20260808`
- Frozen complete-web content authority: `c18f593a2eda274ea4deeb01ae95d92bdf80838d`
- Historical V21 website source verified by the canonical V21 verifier: `c5701dedc834359c78399b4370a8147501784d19`
- V21 proof authority: `GlacierEQ/job-app-helix@83549cda4af3714304f202d0f4d35b29d28da9f7`
- Current Helix main observed during build: `4d0d8ddc8ce6f6af73d016819d9da55406ecaa3e` — newer projection/estate machinery; it does not replace the immutable V21 proof checkpoint in this release.
- Mission Agentic AI Assurance implementation: `GlacierEQ/job-application@4328fa7078e6e4125f895768142c6af0c5ec1234`
- Reproduced receipt: `b7a3e3cba968e19bb91ed8f6881b69e37efc97d7e8414be0aca431dff501123f`

## Design synthesis

The release upgrades the existing `site-v15` physical surface rather than creating another version directory.

- Recruiter surface rebuilt around the newest reproduced proof.
- Shared `site.complete.css` presentation layer and `site.interaction.css` hit-testing hardening are distributed without client JavaScript or remote runtime dependencies.
- Build-time design distributor applies both layers idempotently to every generated HTML route.
- Responsive, reduced-motion, focus-visible, print, mobile, and pointer-interaction contracts are explicit.
- Existing Recruiter / Master / Machine / Mesh architecture is preserved.
- Atlas, Companies, Résumé, and technical surfaces remain part of one public fact system.
- `data/current-proof.json` provides a bounded machine-readable V21 proof entry.
- `llms.txt` points machine consumers to current proof before historical portfolio facts.
- The canonical Atlas now has one renderer owner; the older competing constellation renderer remains source/provenance, not the canonical route writer.

## Production bridge strategy

The hardened V21 `proxy.js` remains untouched and retains ownership of the historical V21 verifier and dynamic company projection.

The complete-web release uses two narrow layers:

1. `design-proxy.js`
   - never mutates process-wide `global.fetch`;
   - serves static web bytes directly from frozen complete-web authority `c18f593...`;
   - delegates dynamic Atlas/company routes to the untouched V21 proxy;
   - injects complete + interaction styles exactly once where needed;
   - preserves the script-free CSP;
   - exposes only `__design_verify` as the new complete-web verifier.

2. `release-router.js`
   - routes `__v21_verify` directly to the original V21 proxy;
   - routes every other public request through the complete-web design proxy.

The two verification identities are intentionally separate:

- `__v21_verify` → `glaciereq.v21-production-verification.v1`, historical V21 source + proof topology.
- `__design_verify` → `glaciereq.complete-web-production-verification.v3`, which requires the canonical V21 verifier to PASS and independently verifies the frozen complete-web surface, current proof, generated company routes, 404, and sitemap.

A first preview correctly failed the canonical verifier because an earlier wrapper globally rewrote fetch state. That preview is superseded. The architecture was repaired rather than waiving the verifier.

## Verified native release surface before final preview

The unified V21 web gate has previously demonstrated the intended full release topology:

- 105 immutable static HTML files;
- 49 company tracks;
- 100 generated company/Atlas HTML routes;
- 98 generated machine-record routes;
- 404 contract;
- sitemap and machine discovery;
- zero client scripts;
- zero inline styles;
- strict CSP.

These observations must be reproduced on the final exact head before promotion.

## Truth boundaries

This design release does not change the evidence ceiling. It does not claim company adoption, affiliation, employment, endorsement, contract, proprietary access, clearance, production-scale distributed assurance, distributed exactly-once semantics, aerospace/defense certification, or classified-system validation.

## Promotion gates still required

- all seven native repository workflow families green on one exact head;
- generated-site validators green;
- automated PR review with substantive findings resolved;
- replacement Vercel preview READY;
- representative Recruiter / Master / Machine / Mesh / Résumé / Atlas / Lockheed routes checked;
- canonical `__v21_verify` HTTP 200 / PASS;
- complete-web `__design_verify` HTTP 200 / PASS;
- production deployment READY using the same reviewed release artifact;
- canonical alias confirms complete-web source header, strict CSP, proof-first homepage, and current-proof route;
- post-deploy runtime-error sweep.

Do not call this production-complete until those gates pass.

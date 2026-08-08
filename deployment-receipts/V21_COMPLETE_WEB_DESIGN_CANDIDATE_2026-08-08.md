# V21 COMPLETE WEB DESIGN — CANDIDATE RECEIPT

**State:** `CANDIDATE_UNTIL_PREVIEW_AND_PRODUCTION_VERIFICATION`

## Source authority

- Branch: `design/complete-web-experience-20260808`
- Frozen web-content authority: `b531968963269b01dd627a9bfe211b61274beec0`
- Existing V21 evidence authority: `GlacierEQ/job-app-helix@83549cda4af3714304f202d0f4d35b29d28da9f7`
- Mission Agentic AI Assurance implementation: `GlacierEQ/job-application@4328fa7078e6e4125f895768142c6af0c5ec1234`
- Reproduced receipt: `b7a3e3cba968e19bb91ed8f6881b69e37efc97d7e8414be0aca431dff501123f`

## Design synthesis

The release upgrades the existing V21 site rather than creating a parallel version directory.

- Recruiter surface rebuilt around the newest reproduced proof.
- Shared `site.complete.css` design layer added without client JavaScript or remote runtime dependencies.
- Build-time design distributor applies the shared layer to every generated HTML route.
- Responsive, reduced-motion, focus-visible, print, and mobile contracts are explicit.
- Existing Recruiter / Master / Machine / Mesh architecture is preserved.
- Atlas, Companies, Résumé, and technical surfaces remain part of one public fact system.
- `data/current-proof.json` provides a bounded machine-readable V21 proof entry.
- `llms.txt` now points machine consumers to current proof before historical portfolio facts.

## Production bridge strategy

The hardened V21 bridge is preserved. A narrow `design-proxy.js` wrapper:

1. rewrites only the pinned website-source root from the previous materialized source to the frozen complete-web source;
2. leaves the pinned Helix authority unchanged;
3. injects `/assets/site.complete.css` exactly once into HTML responses;
4. overrides source/release headers to the new immutable web source;
5. replaces the old static-byte verifier with a complete-web verifier using canonical Git blob framing plus SHA-256 reporting;
6. preserves strict script-free CSP.

The existing large V21 proxy is not refactored for novelty.

## Truth boundaries

This design release does not change the evidence ceiling. It does not claim company adoption, affiliation, proprietary access, clearance, production-scale distributed assurance, certification, or classified-system validation.

## Promotion gates still required

- native repository tests
- generated-site validators
- automated PR review with substantive findings resolved
- Vercel preview READY
- representative route checks
- `__v21_verify` / `__design_verify` PASS
- production deployment READY
- canonical alias confirms new source header and proof-first homepage

Do not call this production-complete until those gates pass.

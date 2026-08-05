# V15 Final Hiring Release — Production Receipt

**Release date:** 2026-08-04 (Pacific/Honolulu)  
**Canonical URL:** `https://casey-barton-glaciereq.vercel.app/`  
**Canonical repository:** `GlacierEQ/job-application`  
**Source commit:** `9971548f05c9668cb491805fa15a9548763a1a6c`  
**Production deployment:** `dpl_FARFEsmkpnxDFdaLS8FvHf1LicVG`  
**Deployment state:** `READY`  
**Production verifier:** `https://casey-barton-glaciereq.vercel.app/__v15_verify`  
**Release state:** `PRODUCTION_VERIFIED`

## Delivered hiring system

V15 is one PSYSOC-X-calibrated hiring product built from a single factual graph:

| Route | Layer | Production response | Governing profile |
|---|---|---:|---|
| `/` | Recruiter / hiring-manager experience | `200 OK` | `recruiter` |
| `/resume/` | Final human résumé | `200 OK` | `recruiter` |
| `/master/` | Technical due diligence | `200 OK` | `master` |
| `/mesh/` | Systems, repository, evidence, and company hierarchy | `200 OK` | `mesh` |
| `/machine/` | Machine-readable contract orientation | `200 OK` | `machine` |

The canonical alias serves the merged V15 headline:

> I turn ambitious AI ideas into bounded operating systems.

The old Frontier-Laws opening is no longer the production root.

## Production mechanism

The canonical Vercel project was manually deployed rather than Git-connected. To prevent a copied payload from drifting away from GitHub, production uses a read-only, commit-pinned source bridge:

```text
canonical Vercel alias
        │
        ▼
Vercel source bridge
        │  pinned commit: 9971548…
        ▼
GlacierEQ/job-application/site-v15
```

The bridge:

- accepts only normalized paths and rejects traversal;
- maps extensionless routes to their committed `index.html` files;
- serves HTML, CSS, JSON, SVG, XML, text, and the résumé PDF with explicit content types;
- applies CSP, framing, permissions, referrer, and content-type protections;
- emits `X-V15-Source-Commit` on every response;
- performs read-only source retrieval and no repository mutation;
- exposes a deterministic public-safe production verification endpoint.

Persisted implementation:

- `deployment/vercel-source-bridge/api/proxy.js`
- `deployment/vercel-source-bridge/vercel.json`

## Exact-head source validation

Pull-request head `07d3d33aaf75dd1d780c24af39a00b998f87da76` passed:

- `V15 Final Hiring Release` run `30977936141`;
- existing repository `CI` run `30977936450`;
- V15 validation artifact `8918985486`;
- artifact digest `sha256:2f8cd63b7a93022e8126f24a1c82623893b37b91da26c53db10382d4618264ea`.

The PR was squash-merged at `9971548f05c9668cb491805fa15a9548763a1a6c`.

## Production verification result

`/__v15_verify` returned:

- schema: `glaciereq.v15-production-verification.v1`;
- status: **PASS**;
- source commit: `9971548f05c9668cb491805fa15a9548763a1a6c`;
- facts invariant: `true`;
- 16 of 16 critical source artifacts fetched successfully;
- 16 of 16 SHA-256 values matched the committed-source allowlist.

### Verified production artifacts

| Artifact | Status | Bytes | SHA-256 |
|---|---:|---:|---|
| Recruiter homepage | 200 | 14,876 | `910ae7c7dc749fa792c495fb7c7e08c82a9d150ad28dd5ea2adc72e697a70478` |
| Résumé page | 200 | 8,078 | `2d2c3c462b68683c3d9ddffd287f37b8e703eb058a33e36ce39393012e7a3225` |
| Master page | 200 | 10,714 | `7a846f60f92635ee0ecae088acbf340e3963b732a19f8362be44621b8a74971e` |
| Mesh page | 200 | 12,640 | `6e5781c69e5c119c0030fdc20f2901ec0514fd31d9ef19def7733303b79e7c94` |
| Machine page | 200 | 6,265 | `898c398ac3ca7cd8516f67b8ebf68941d7174437be061a4a916339667d51d8f8` |
| Canonical portfolio JSON | 200 | 11,710 | `d212ea17b5b3c479735efefe40ec78382d0913535768924c39e21da1f12b8d86` |
| Company-family JSON | 200 | 8,641 | `889295fdf234ee35dfe2a6cdd5f685f5ab4f60d9f5f4e023917405e494140f86` |
| PSYSOC-X profile JSON | 200 | 1,891 | `e8f27290acc0740d1109e9d4ae433f4f61bea03fcd46ee895671e462672f75a7` |
| Final résumé PDF | 200 | 10,274 | `e4d189910b324555f63e8d4214d9f47be582c3e501fdb87136f712db443fad88` |
| Shared visual CSS | 200 | 17,161 | `2737211f8aea4c978a02f46c82f738203385301e8d446d2814206875701896ad` |
| Social card | 200 | 3,200 | `d785e31db1e5207b6361e2491a7ca6ff2a421fe3b6e86dd1b1d858cd98eeb67e` |
| Favicon | 200 | 514 | `6b5a01683c105a1b1240ed3444f811036d17dd146a2a2e801a2821f792b2fe8c` |
| Sitemap | 200 | 592 | `cd8c33d8fd75be84235e9009a299fcce955947f9218b10a5f0f78b36105ea400` |
| Robots contract | 200 | 86 | `3a4d91def310706fef59d6224ca266e48e95d8e3aaa9731edc693cc5914454c3` |
| LLM orientation | 200 | 543 | `e6ecd1a83b20f03e869bda927cdc4212044c429d49d43b3a77932c3a74c6289a` |
| 404 surface | 200 at source-verification path | 681 | `105398ac802698554f46d58af7551940501c87bc9f95dc6bcf4b27a58d2ea651` |

## PSYSOC-X production state

Four explicit profiles are deployed:

- recruiter;
- master;
- machine;
- mesh.

The release validator and production contract preserve these invariants across all four:

- factual IDs;
- evidence states;
- test counts;
- artifact identifiers;
- uncertainty and blockers;
- known limits;
- dignity and authority boundaries;
- non-affiliation language.

The profiles alter presentation depth, terminology, order, and explanation—not the facts.

## Résumé production state

The release includes:

- canonical Markdown résumé;
- ATS-focused text résumé;
- recruiter-calibrated HTML résumé;
- downloadable two-page PDF;
- browser-print styling;
- exact PDF signature and SHA verification.

Primary positioning:

> Applied AI Systems Architect and Agent Infrastructure Engineer who converts ambitious, ambiguous ideas into bounded operating systems with explicit authority, deterministic evidence, controlled failure behavior, and inspectable completion receipts.

## Current evidence carried into production

- Receipt Router tests: **69**;
- bounded technical-source tests: **166**;
- separate Energy memory tests: **19**;
- external actions during verified routing: **0**;
- ranked flagships: **10**;
- company families: **27**;
- public-safe estate: **200 unique repositories / 203 memberships**;
- Microcode state: `REVIEWED_EXECUTION_BLOCKED`, not test-verified.

## Security and delivery state

Production responses include:

- `script-src 'none'`;
- `connect-src 'none'` for the browser client;
- same-origin styles and assets;
- `frame-ancestors 'none'`;
- `X-Frame-Options: DENY`;
- strict referrer policy;
- disabled camera, microphone, geolocation, and payment permissions;
- source-commit attestation header.

The browser-facing product remains static and script-free. The Vercel delivery bridge performs read-only server-side retrieval of immutable public Git source because the canonical project is not Git-connected.

## Remaining non-claims

This receipt does not establish:

- customer adoption or hiring outcomes;
- company affiliation, employment, endorsement, or proprietary access;
- production operation of the company-aligned technical exhibits;
- hardware, grid, datacenter, laboratory, or firmware actuation;
- formal people-management experience;
- browser-lab performance scores or independent accessibility certification.

It does establish that the finalized V15 source, canonical résumé, four audience layers, machine contracts, company mesh, production route content, security headers, and 16 critical artifacts are deployed and exact-source verified.

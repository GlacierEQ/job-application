# V17 Proxy WHATWG Runtime Repair — Verification Receipt

**Repository:** `GlacierEQ/job-application`  
**Canonical implementation:** `deployment/vercel-source-bridge/api/proxy.js`  
**Repair PR:** `#20`  
**Repair PR head:** `2314d4271d1bc654384fe877d2092f1e6b488da0`  
**Canonical repair commit:** `ec77b9aebce9f78df5878cf527a9ca323c83c345`  
**Vercel project:** `prj_5i9v2K5MyET7Yi7JwN2PCIj1AGZ1`  
**Runtime:** Node.js 24.x  
**Observed through:** `2026-08-07T17:19:02Z`

## Finding and trace

The historical `/api/proxy` Lambda was traced to the repository-owned read-only source bridge at `deployment/vercel-source-bridge/api/proxy.js` and its route contract in `deployment/vercel-source-bridge/vercel.json`.

The application source did not directly call legacy `url.parse()`. It consumed Vercel's `req.query` helper on the Node 24 function path. The bounded repair removes that dependency and parses `req.url` directly with the WHATWG `URL` API from `node:url`.

The repair preserves:

- root-path behavior;
- percent-decoding before path validation;
- traversal rejection;
- repeated `path` parameter joining semantics;
- the existing immutable V17 source pin and artifact hashes;
- response headers, content types, caching, and attachment behavior.

## Source validation

PR #20 exact head `2314d4271d1bc654384fe877d2092f1e6b488da0` passed:

- CI run `31201234206` — **PASS**;
- V15 Final Hiring Release run `31201233019` — **PASS**;
- V15 validation job `92941447229` — **PASS**;
- `Validate WHATWG source-bridge request parsing` — **PASS**;
- site validation, résumé signature validation, immutable receipt generation, and artifact upload — **PASS**.

PR #20 was squash-merged with an expected-head guard as `ec77b9aebce9f78df5878cf527a9ca323c83c345`.

Post-merge `main` passed:

- V15 Final Hiring Release run `31201315368` — **PASS**;
- CI run `31201316041`, job `92941711781` — **PASS**.

Canonical source read-back from `main` confirms `const { URL } = require('node:url')`, `new URL(...)`, and removal of `req.query` from the bridge request path.

## Deployment verification

The repaired two-file bridge was deployed as an isolated preview in the existing Vercel project so the current production site would not be rolled backward to the older V17 source snapshot.

- deployment: `dpl_3ErrsTR8bZwKhXborHPZwj2fTtmE`;
- deployment type: `LAMBDAS`;
- target: preview / non-production;
- region: `iad1`;
- state: **READY**;
- runtime inventory: one Node.js Lambda;
- build input: two deployment files;
- build result: **PASS**.

The deployed catch-all route invoked the canonical `/api/proxy` Lambda through `GET /__v17_verify` and returned HTTP `200` with:

- schema `glaciereq.v17-production-verification.v1`;
- status **PASS**;
- immutable source commit `ef0cc0394463181ee6999d06f1c8bc5a6c3ab657`;
- all 22 required V17 source artifacts available with exact expected SHA-256 values.

Deployment-scoped runtime read-back recorded:

`17:18:14 GET /__v17_verify 200 [info/serverless]`

A deployment-scoped search for `DEP0169` after the invocation returned **no matching runtime logs**.

## Production boundary

The current canonical production deployment is **not** the historical source-bridge Lambda. Production had already advanced to the newer static/Helix projection deployment before this repair:

- current production deployment: `dpl_5jKjvW6DHpsduNgxDNRvjQykHPEk`;
- production state: **READY**;
- canonical domain: `casey-barton-glaciereq.vercel.app`;
- current root build contract renders `site-v15` from the Helix projection pipeline;
- the canonical production domain read-back after preview verification still returned the newer static site behavior rather than the V17 verifier.

Therefore the repaired historical bridge was **not promoted over current production**. Doing so would reintroduce the older V17 source pin and overwrite newer Helix/public-portal state merely to test a retired delivery mechanism.

The preview deployment may receive a non-canonical project/branch alias as normal Vercel preview behavior. The canonical production domain remains on the production deployment.

## Closure state

**SOURCE-BRIDGE PARSER REGRESSION: CLOSED**

Closure means:

1. the canonical bridge implementation no longer depends on `req.query` or legacy URL parsing behavior;
2. the exact change passed repository validation on PR head and post-merge `main`;
3. the exact repaired bridge was deployed to Node 24 as a Lambda;
4. the deployed Lambda executed its full verification route successfully;
5. no `DEP0169` warning was emitted in deployment-scoped runtime logs after invocation;
6. current production was independently read back and was not rolled back or replaced.

This receipt does **not** claim that `/api/proxy` is an active route in the current static/Helix production architecture. It proves the retained compatibility bridge is repaired and runtime-verified if it is used again.
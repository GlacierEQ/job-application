# V18 COMPANY ATLAS PRODUCTION RECEIPT

**Release:** V18 Company Atlas  
**Canonical website:** `https://casey-barton-glaciereq.vercel.app/`  
**Production verifier:** `https://casey-barton-glaciereq.vercel.app/__v18_verify`  
**Source repository:** `GlacierEQ/job-application`  
**Pinned website source commit:** `c15e9f5da3c8cc1ab05b028a7d4068ebecd6940e`  
**Pinned Job App Helix commit:** `3fb2b75c2a0823587a33af38d7724ea12e83eb85`  
**Atlas implementation PR:** `#24`  
**Atlas implementation merge commit:** `75b3f51f72b40fb5bbd0721a8c0e8d44ea9c6511`  
**State:** `PRODUCTION_READY_VERIFIED`

## Source implementation

PR #24 promoted the script-free Company Atlas renderer, constellation CSS, company-route generator, sitemap/LLM linker, validation gate, and Helix workflow integration into `main`.

The production delivery path remains the commit-pinned, read-only Vercel source bridge. V18 extends that bridge without relaxing its locked browser contract:

- `script-src 'none'`
- `style-src 'self'`
- no client-side JavaScript
- no inline styles
- no trackers
- fail-closed company projection
- pinned public website source
- separately pinned Job App Helix authority

The V18 bridge compiles only recruiter-admitted public repository records from Job App Helix and server-renders the Company Atlas and company intelligence routes.

## Preview verification

First preview deployment:

- deployment: `dpl_78XrGQEM3yVVraCKEeeULagaQq3Y`
- result: verifier correctly failed on one stale expected homepage hash
- projection itself compiled 48 company routes with no projection error
- all other pinned checks passed

The expected homepage identity was corrected to the exact current pinned source hash rather than weakening the verifier.

Validated preview deployment:

- deployment: `dpl_4i1oHc4UDBKVgzkUnuKVWCApkgEG`
- state: `READY`
- alias error: none
- region: `iad1`
- `__v18_verify`: HTTP 200 / `PASS`
- company routes: `48`
- projection error: `null`
- facts invariant: `true`
- client scripts: `0`
- trackers: `0`

No deployment source changed between the green preview and production promotion.

## Production promotion

Production deployment:

- deployment: `dpl_HmNc96XJcsuTzbckNidL5o6nBXc8`
- target: `production`
- state: `READY`
- canonical alias: `casey-barton-glaciereq.vercel.app`
- alias error: none
- region: `iad1`

The canonical production verifier returned HTTP 200 with:

- schema: `glaciereq.v18-production-verification.v1`
- status: `PASS`
- source commit: `c15e9f5da3c8cc1ab05b028a7d4068ebecd6940e`
- Helix source commit: `3fb2b75c2a0823587a33af38d7724ea12e83eb85`
- release: `V18 Company Atlas`
- company routes: `48`
- projection error: `null`
- facts invariant: `true`
- scripts: `0`
- trackers: `0`

Every pinned source/hash check in the V18 verifier returned `ok: true`, including the Company Atlas stylesheet presence check.

## Public route verification

Canonical production returned `200 OK` for:

- `/atlas/`
- `/companies/anthropic/`
- `/companies/openai/record.json`
- `/sitemap.xml`

The Atlas publicly reports the current Helix-governed topology:

- 48 company lenses
- 59 direct recruiter-admitted public repository memberships
- 8 Repository-rich company lenses
- 15 Seeded company lenses
- 25 Scaffold company lenses

The sitemap includes `/atlas/` and all 48 company routes.

## Four-depth company contract

Every company route is rendered through the same four-layer contract:

1. **Recruiter** — concise operating-environment relevance and current public evidence.
2. **Master** — innovation frame, architecture context, second-depth gate, and explicit aspiration.
3. **Machine** — compact `GEQ.CI/1` wire representation plus `record.json`.
4. **Mesh** — typed repository relationships plus `ASPIRATION & EVOLUTION` promotion checklist.

The Mesh explicitly treats gaps as engineering/evidence work queues. It does not convert aspiration into evidence.

## Truth boundary

V18 does not claim company affiliation, endorsement, employment, proprietary access, production adoption, measured company impact, or live-role fit merely from a company name or repository mapping.

Only public recruiter-admitted repository records are projected. Private candidates, private references, quarantined records, L0 records, and upstream/non-admitted repository rows are not emitted as company proof.

The prototype described some company nodes that are not yet part of canonical Job App Helix. Those nodes were not hard-coded into production. They remain an upstream Helix admission/evidence task so the public site continues to derive from one governed authority instead of drifting into a second company registry.

## Next second-depth gate

The next promotion layer is code-proven, current-role-specific intelligence:

`current role → team problem → official company evidence → relevant repository → inspected implementation → reproducible proof → bounded application claim → application/interview artifact`

Where the present repository does not yet support the useful aspiration, the default engineering posture is to close the highest-value implementation/proof gap and retest before reducing the aspiration.

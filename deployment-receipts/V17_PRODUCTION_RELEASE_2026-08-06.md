# V17 PRODUCTION RELEASE RECEIPT

**Release:** V16 Signal Architecture + V17 Resume Intelligence  
**Canonical website:** `https://casey-barton-glaciereq.vercel.app/`  
**Production verifier:** `https://casey-barton-glaciereq.vercel.app/__v17_verify`  
**Source repository:** `GlacierEQ/job-application`  
**Canonical source commit:** `ef0cc0394463181ee6999d06f1c8bc5a6c3ab657`  
**Pull request:** `#16`  
**State:** `PRODUCTION_READY_VERIFIED`

## Source promotion

Pull request #16 merged the exact validated release into `main` as commit `ef0cc0394463181ee6999d06f1c8bc5a6c3ab657`.

All four merge-commit workflows completed successfully:

- V16 Signal Architecture: run `31085396922`
- V15 Final Hiring Release: run `31085397145`
- V17 Resume Intelligence: run `31085396867`
- CI: run `31085397490`

## Deployment promotion

- Verified preview deployment: `dpl_CGvHBJDzrbdcsJbgcAsMVwE8VPMC`
- Preview URL: `https://casey-barton-glaciereq-i2g88op9v-caseys-projects-d714883e.vercel.app`
- Preview state: `READY`
- Current production deployment: `dpl_6vDjRWBgST8mzx8YZ1JpvKTnmMwL`
- Production deployment URL: `https://casey-barton-glaciereq-36w3axefn-caseys-projects-d714883e.vercel.app`
- Canonical alias: `https://casey-barton-glaciereq.vercel.app`
- Production state: `READY`
- Vercel region: `iad1`
- Alias error: none

The preview and production deployments used the identical two-file, commit-pinned, read-only source bridge. No source changed between preview verification and production promotion.

## Public verification

The canonical production verifier returned:

- HTTP status: `200`
- schema: `glaciereq.v17-production-verification.v1`
- status: `PASS`
- source commit: `ef0cc0394463181ee6999d06f1c8bc5a6c3ab657`
- facts invariant: `true`
- client scripts: `0`
- trackers: `0`
- critical files: `22/22` available with exact expected SHA-256 values

Canonical audience routes returned `200 OK`:

- `/` — recruiter and hiring-manager presentation
- `/resume/` — PSYSOC-X V17 human resume intelligence
- `/master/` — technical due diligence
- `/mesh/` — typed system, company, evidence, and provenance relationships
- `/machine/` — fail-closed public machine contracts

Resume and machine interfaces verified:

- `/downloads/Casey_Barton_Resume.pdf`
- `/downloads/Casey_Barton_Resume.docx`
- `/resume/ats.txt`
- `/data/resume.json`
- `/data/resume-artifacts.json`

## Exact resume artifacts

| Artifact | Bytes | SHA-256 |
|---|---:|---|
| `Casey_Barton_Resume.pdf` | 90,911 | `c46b4c3c31bea8405c28322e9f81be4ffd36c7faec9154acfd8da16a647cd1e3` |
| `Casey_Barton_Resume.docx` | 42,831 | `aa022ca8c40d59624e6e7e3ef88fb439f6d21c7adcb997a0b11cd50b05827d0e` |
| `resume/ats.txt` | 7,578 | `5d16695f186c5bb5762deefe77b2bcbf66ef9e730560b0c7a190a6d497f87c34` |
| `data/resume.json` | 9,309 | `61a3fd77256af69ca36a774dad2d72f0f859a5d415d14423c21e0a2016c579b7` |
| `data/resume-artifacts.json` | 737 | `78675a7b2ec849b30918f867e837fe64fc83a6bfe6ec53f88b4ae7070790680c` |

The PDF source returned a valid PDF artifact with the exact 90,911-byte identity. The DOCX source returned the exact 42,831-byte Office artifact. Both are delivered with attachment disposition and the canonical source-commit header.

## Runtime headers

Canonical production responses expose:

- `X-GlacierEQ-Source-Commit: ef0cc0394463181ee6999d06f1c8bc5a6c3ab657`
- `X-PSYSOCX-Release: V16-V17`
- strict same-origin Content Security Policy with `script-src 'none'`
- HSTS
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- restrictive Permissions Policy
- same-origin opener policy

## PSYSOC-X resume calibration

The release separates presentation from truth:

- the human resume emphasizes role clarity, engineering judgment, cross-domain systems discipline, progressive disclosure, and visible evidence state;
- ATS text provides a linear, normalized, keyword-rich representation without layout dependence;
- machine JSON provides identity, experience, skills, projects, proof totals, source classes, and explicit limits;
- recruiter, master, machine, and mesh layers preserve identity, dates, factual IDs, test counts, artifact identities, blockers, uncertainty, dignity, authority boundaries, and non-affiliation language.

The resume integrates the verified cross-domain foundation of scientific measurement, residential systems inspection, field operations, and compressed-gas safety without converting historical records into unsupported current credentials.

## External report treatment

The external diagnostic report was treated as adversarial input rather than authority. Useful cross-domain synthesis was retained. Unsupported or unverified claims were excluded, including:

- a master's-level AWS program;
- enterprise-grade or customer-production outcomes;
- formal executive or people-management history;
- direct JEFS or state-court filing API integration;
- Greenhouse or Workday MCP access;
- guaranteed sub-100 ms performance;
- current certification status without confirmation;
- company affiliation, proprietary access, hardware operation, or production use inferred from repository names.

## Final boundary

This receipt proves source promotion, deterministic artifact identity, preview verification, production deployment, alias promotion, route availability, public source attestation, and hash verification. It does not claim hiring outcomes, customer adoption, company affiliation, proprietary access, hardware validation, third-party production use, formal people management, current certification status, or measured business impact.

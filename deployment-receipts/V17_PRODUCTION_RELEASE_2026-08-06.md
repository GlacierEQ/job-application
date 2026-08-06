# V17 Production Release Receipt

**Release:** V16 Signal Architecture + V17 Resume Intelligence  
**Canonical production URL:** `https://casey-barton-glaciereq.vercel.app/`  
**Production verifier:** `https://casey-barton-glaciereq.vercel.app/__v17_verify`  
**Canonical source commit:** `ef0cc0394463181ee6999d06f1c8bc5a6c3ab657`  
**Production bridge commit:** `e9589172e5c5a87c83c9e934ac3550f61619d18a`  
**Vercel deployment:** `dpl_4tCjs7Ybst1q5apentKFmRue7U9Q`  
**Deployment state:** `READY`  
**Production verification:** `PASS`

## Promotion result

PR #16 was squash-merged only after all four required exact-head gates passed on source head `5562743083182ec253984e03f11cdaa3765b5dae`:

- baseline repository CI: run `31085290112`;
- V15 factual-invariance validation: run `31085288835`;
- V16 signal-architecture validation: run `31085288230`;
- V17 résumé-intelligence validation: run `31085287993`.

The merged source was then pinned behind the production Vercel source bridge. The canonical alias was promoted to deployment `dpl_4tCjs7Ybst1q5apentKFmRue7U9Q` only after the deployment reached `READY`.

## Production route contract

The production alias returned `200 OK` for each canonical audience surface:

- `/` — recruiter and hiring-manager presentation;
- `/resume/` — PSYSOC-X V17 human résumé intelligence;
- `/master/` — technical due diligence;
- `/mesh/` — typed system, company, evidence, and provenance relationships;
- `/machine/` — fail-closed public machine contracts.

The production bridge also delivers these exact résumé interfaces:

- `/downloads/Casey_Barton_Resume.pdf`;
- `/downloads/Casey_Barton_Resume.docx`;
- `/resume/ats.txt`;
- `/data/resume.json`.

## Exact résumé artifacts

| Artifact | Bytes | SHA-256 |
|---|---:|---|
| `Casey_Barton_Resume.pdf` | 90,911 | `c46b4c3c31bea8405c28322e9f81be4ffd36c7faec9154acfd8da16a647cd1e3` |
| `Casey_Barton_Resume.docx` | 42,831 | `aa022ca8c40d59624e6e7e3ef88fb439f6d21c7adcb997a0b11cd50b05827d0e` |
| `resume/ats.txt` | 6,708 | `5d16695f186c5bb5762deefe77b2bcbf66ef9e730560b0c7a190a6d497f87c34` |
| `data/resume.json` | 6,847 | `61a3fd77256af69ca36a774dad2d72f0f859a5d415d14423c21e0a2016c579b7` |
| `data/resume-artifacts.json` | 737 | `78675a7b2ec849b30918f867e837fe64fc83a6bfe6ec53f88b4ae7070790680c` |

The public PDF returned `Content-Type: application/pdf`, a valid `%PDF-` signature, 90,911 bytes, and the canonical source-commit header. The DOCX returned `Content-Type: application/vnd.openxmlformats-officedocument.wordprocessingml.document`, a valid ZIP/Office signature, 42,831 bytes, and the same canonical source-commit header.

## Production verifier

`/__v17_verify` checked 22 critical source files against the SHA-256 map embedded in the production bridge. The verifier returned:

- `status: PASS`;
- `source_commit: ef0cc0394463181ee6999d06f1c8bc5a6c3ab657`;
- `facts_invariant: true`;
- `scripts: 0`;
- `trackers: 0`;
- PSYSOC-X profiles: recruiter, master, machine, and mesh;
- all required files available with matching committed-source hashes.

Every public response includes:

- `X-GlacierEQ-Source-Commit: ef0cc0394463181ee6999d06f1c8bc5a6c3ab657`;
- `X-PSYSOCX-Release: V16-V17`;
- a same-origin content-security policy with `script-src 'none'`, `connect-src 'none'`, and `frame-ancestors 'none'`.

## PSYSOC-X résumé calibration

The release separates presentation from truth:

- the human résumé emphasizes outcome, engineering judgment, cross-domain systems discipline, and evidence state;
- ATS text provides a linear keyword-rich representation without layout dependence;
- machine JSON provides identity, work, skills, projects, proof totals, source classes, and explicit limits;
- recruiter, master, machine, and mesh layers preserve factual IDs, test counts, artifact identities, blockers, uncertainty, dignity, and authority boundaries.

The résumé now integrates the verified cross-domain foundation of scientific measurement, residential systems inspection, field operations, and compressed-gas safety without converting historical records into unsupported current credentials.

## Excluded report claims

The external diagnostic report was treated as an adversarial input, not authority. The release deliberately excludes unsupported or unverified claims including:

- a master's-level AWS program;
- enterprise-grade or customer-production outcomes;
- formal executive or people-management history;
- direct JEFS or state-court filing API integration;
- Greenhouse or Workday MCP access;
- guaranteed sub-100 ms performance;
- current certification status without confirmation;
- company affiliation, proprietary access, hardware operation, or production deployment inferred from repository names.

## Final boundary

Independent GlacierEQ work and bounded technical exhibits. Test counts apply only to the stated repository and scope. Review, generation, execution, deployment, and authority remain distinct states. No company affiliation, proprietary access, production use, customer impact, formal people-management experience, current certification status, or physical hardware validation is claimed without direct evidence.

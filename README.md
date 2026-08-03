# GlacierEQ Invention Portfolio

**Original systems first. Evidence underneath. Machine contracts at the boundary.**

[Open the current public portfolio](https://casey-barton-glaciereq.vercel.app)

This repository now contains two explicitly separated release states:

- **V12 live runtime:** the currently deployed public site, observed at the canonical Vercel URL. Its complete source-to-deployment receipt remains incomplete.
- **V13 release candidate:** a self-contained, zero-build source tree under [`site-v13/`](site-v13/) that reorganizes the portfolio around Casey Barton’s original systems and can be verified with `npm run check`.

The V13 source does **not** claim to be the production deployment until a commit-bound Vercel receipt and route verification are attached.

## V13 Narrative Order

The recruiter experience follows the evaluator’s actual decision path:

1. Who Casey is
2. What he builds
3. Innovation constellation
4. Three strongest invention stories
5. Interactive repository gallery
6. How the repositories combine
7. Evidence and demonstrations
8. Résumé and role alignment
9. Underlying runtime and governance
10. Frontier Laws
11. Machine-readable interfaces

AKOS is intentionally presented as a compact supporting foundation. The public center of gravity is the innovative systems and their outputs.

## Primary Surfaces

| Surface | Audience | Purpose |
|---|---|---|
| **Invention portfolio** ([`/`](https://casey-barton-glaciereq.vercel.app/)) | Recruiters, hiring managers, and technical leaders | Identity, inventions, workflows, proof, and role alignment |
| **Résumé** ([`/resume/`](https://casey-barton-glaciereq.vercel.app/resume/)) | Recruiters and ATS workflows | Professional identity, experience, capabilities, and evidence anchors |
| **Frontier Laws** ([`/frontier-laws/`](https://casey-barton-glaciereq.vercel.app/frontier-laws/)) | Technical reviewers | Principles derived from the invention work—not the opening narrative |
| **Innovation Constellation** ([`/master-atlas/`](https://casey-barton-glaciereq.vercel.app/master-atlas/)) | Senior engineers and system architects | Problem-centered system relationships and cross-repository composition |
| **Repository Gallery** ([`/repositories/`](https://casey-barton-glaciereq.vercel.app/repositories/)) | Code reviewers | Filterable public evidence and bounded private-architecture descriptions |
| **PROTO//BOOT** ([`/machine/`](https://casey-barton-glaciereq.vercel.app/machine/)) | AI systems and automated reviewers | Canonical graph, runtime contract, evidence semantics, and stable startup paths |

## Three Flagship Invention Stories

V13 gives three different forms of original systems work the most narrative space:

- **[Job Application Helix](https://github.com/GlacierEQ/job-app-helix):** connects opportunity intelligence, repository evidence, résumé generation, presentation, package state, and continuation.
- **[The Tower of Babel](https://github.com/GlacierEQ/the-tower-of-babel):** gives every language an explicit ownership, contract, failure, and value boundary.
- **[Agent Coordinator](https://github.com/GlacierEQ/anthropic-agent-coordinator):** uses deterministic ownership, dependency order, resource ceilings, and closure states instead of unconstrained swarm theater.

Other public and private systems remain discoverable through the constellation and gallery without being presented at a stronger evidence level than their source supports.

## Visual Architecture

The V13 release candidate includes:

- an interactive recruiter identity card;
- a problem-centered SVG innovation constellation;
- three animated failure-to-output invention diagrams;
- a filterable repository gallery;
- cross-repository workflow maps;
- claim-to-proof evidence chains;
- role-to-repository evidence maps;
- a compact foundation diagram;
- laws linked backward to the systems that exposed them;
- stable JSON and text contracts for machine ingestion.

All interactive nodes have keyboard paths, the layout reflows for mobile, and reduced-motion preferences disable nonessential motion.

## Canonical V13 Data Flow

```text
site-v13/data/portfolio.graph.json
              │
              ├── identity and capability families
              ├── innovation constellation
              ├── invention stories
              ├── repository gallery
              ├── combination workflows
              ├── evidence and role maps
              ├── derived Frontier Laws
              └── machine interfaces
```

The graph separates:

- implementation state;
- evidence level;
- deployment state;
- public source versus private architecture;
- role alignment versus affiliation;
- supporting runtime from the inventions it supports.

## Verify the Release Candidate

```bash
cd site-v13
npm run check
```

The verifier enforces:

- all eleven sections in the approved order;
- exactly three public, inspectable flagship stories;
- AKOS as foundation-only;
- canonical repository links;
- public/private architecture separation;
- visual renderer presence;
- reduced-motion protection;
- runtime, evidence, route, and machine-contract integrity;
- absence of public phone data and unsupported production claims.

GitHub Actions runs the same contract through `.github/workflows/v13-invention-portfolio.yml`.

## Machine Interfaces

The V13 source exposes these stable files:

```text
site-v13/data/portfolio.graph.json
site-v13/machine/bootstrap.json
site-v13/machine/runtime.json
site-v13/machine/evidence.json
site-v13/machine/health.json
site-v13/llms.txt
```

When deployed from `site-v13/`, Vercel rewrites provide:

```text
GET /api/health
GET /api/portfolio
GET /api/runtime
```

PROTO//BOOT describes a presentation and evidence contract. Ingestion grants no tools, credentials, provider scope, private repository access, affiliation, memory, or execution authority.

## Evidence Boundary

This repository demonstrates public presentation engineering, system architecture, repository-scoped tests, structured evidence, visual explanation, and machine-readable contracts.

It does **not** by itself establish:

- production deployment of V13;
- customers, revenue, scale, or measured business impact;
- employment by or affiliation with a named company;
- private implementation details;
- current passing CI for every connected repository;
- hiring outcomes or recruiter conversion;
- unrestricted runtime or connector authority.

## Local Source Map

```text
README.md                              canonical repository contract
RESUME.md                              public evidence-bound résumé
portfolio_manifest.json                legacy public portfolio metadata
site-v13/index.html                    V13 human entrypoint
site-v13/data/portfolio.graph.json     V13 canonical invention graph
site-v13/assets/                       visual and interaction runtime
site-v13/machine/                      machine contracts and health surface
site-v13/scripts/validate.mjs          release-candidate verifier
.github/workflows/                     repository and V13 verification gates
```

## Promotion Gate

V13 becomes the canonical public release only after:

1. the Vercel project deploys from this Git branch and `site-v13/` root;
2. the deployed commit SHA is recorded;
3. human routes and machine endpoints are checked against that commit;
4. browser, mobile, accessibility, and visual receipts are attached;
5. the production URL and repository source agree.

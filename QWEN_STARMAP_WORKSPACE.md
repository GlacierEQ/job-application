# Qwen Starmap Workspace

## Purpose

This branch is an isolated collaboration lane for improving the public GlacierEQ company starmap / Atlas presentation without changing canonical proof authorities, production truth semantics, secrets, or deployment controls.

## Branch

Work only on:

`agent/qwen-starmap`

Do not write directly to `main`.

## Primary editable surface

Qwen may inspect the whole public repository, but intended write scope is limited to the starmap presentation and its direct validators:

- `scripts/render-helix-atlas.mjs`
- `scripts/validate-helix-atlas.mjs`
- `site-v15/assets/helix-atlas.css`
- `site-v15/assets/company-constellation.css`
- generated Atlas presentation under `site-v15/atlas/` only when generation is deterministic and source-owned
- narrowly necessary starmap documentation/tests

Prefer editing the renderer/CSS source rather than hand-editing generated company pages.

## Read-only authorities

Treat these as read-only unless Casey explicitly promotes a separate change after review:

- `deployment/vercel-source-bridge/**`
- `deployment-receipts/**`
- `site-v15/data/**`
- proof/claim/receipt authorities
- résumé facts and machine contracts
- V21/V22/V23/V24 verifier identities
- GitHub Actions permission/authentication paths
- any secret, credential, token, key, vault, OIDC, Keymaster, or deployment configuration

## Design objective

Improve the starmap as a human-first navigation and information-exchange surface while preserving the four-layer presentation contract:

1. **Recruiter / Regular People** — what it is, why it matters, current demonstrated value, company relevance.
2. **Master** — architecture, design choices, tradeoffs, failure domains, security/reliability model, technical boundaries.
3. **Machine** — exact repository/commit/files/symbols/schemas/tests/receipts/hashes/reproducibility/evidence state.
4. **Mesh** — current state, aspiration, evolution checklist, dependencies, freshness, and next promotion conditions.

Ordinary unfinished maturity work belongs under **Aspiration & Evolution / Mesh Evolution Checklist**, not as the headline of recruiter-facing surfaces. Any missing condition that would make an upper-layer claim false must narrow that claim at the layer where it appears.

## Starmap UX goals

- make the company constellation immediately legible on desktop and mobile
- preserve keyboard/text-directory fallback
- preserve script-free operation unless a separately reviewed architecture explicitly changes that invariant
- distinguish repository-evidence richness from second-depth proof stage
- make promoted stars visibly meaningful without making mapped-only stars look defective
- keep company alignment visibly independent; never imply affiliation, employment, proprietary access, endorsement, contract, clearance, or deployment
- improve labels, grouping, spatial hierarchy, focus states, tap targets, and information scent
- prefer fewer clearer signals over ornamental complexity
- keep the starmap consistent with the premium dark/mint/cyan/violet design system and V24 display typography

## Validation

Before proposing a PR, run the repository-native gates applicable to the changed surface, including at minimum:

```bash
node scripts/render-helix-atlas.mjs
node scripts/validate-helix-atlas.mjs
npm test
```

If the repository's current scripts differ, inspect `package.json` and use the canonical current commands rather than inventing replacements.

## Delivery contract

Qwen should leave:

1. exact changed files
2. before/after design rationale
3. validation output
4. any remaining visual/UX uncertainty
5. explicit truth-boundary statement
6. no direct production deployment

Open or prepare a pull request from `agent/qwen-starmap` to `main`; production promotion remains a separate reviewed step.

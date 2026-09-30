# Qwen Starmap Workspace

## Purpose

This branch is an isolated collaboration lane for improving the public GlacierEQ company starmap / Atlas presentation without changing source proof state, production truth semantics, secrets, or deployment controls.

## Branch

Current refresh branch:

`apex/starmap-refresh-20260816`

Do not write directly to `main`.

## Primary editable surface

Qwen may inspect the whole public repository, but intended write scope is limited to the starmap presentation and its direct validators:

- `scripts/render-helix-starmap.mjs`
- `scripts/validate-helix-starmap.mjs`
- `scripts/starmap-lenses.json`
- `site-v15/assets/helix-starmap.css`
- generated starmap presentation under `site-v15/atlas/starmap/` only when generation is deterministic and source-owned
- narrowly necessary starmap documentation/tests

Prefer editing renderer/CSS/config source rather than hand-editing generated pages.

## Protected source surfaces

Treat these as read-only in this focused lane unless Casey explicitly directs a separate change:

- `deployment/vercel-source-bridge/**`
- `deployment-receipts/**`
- `site-v15/data/**`
- proof/claim/receipt source records
- résumé facts and machine contracts
- V21/V22/V23/V24/V25 verifier identities
- GitHub Actions permission/authentication paths outside this starmap workflow
- any secret, credential, token, key, vault, OIDC, Keymaster, or deployment configuration

These surfaces establish implementation or proof state only. They do not acquire authority over Casey's intended architecture or scope.

## Design objective

Improve the starmap as a human-first navigation and information-exchange surface while preserving the four-layer presentation contract:

1. **Recruiter / Regular People** — what it is, why it matters, current demonstrated value, company relevance.
2. **Master** — architecture, design choices, tradeoffs, failure domains, security/reliability model, technical boundaries.
3. **Machine** — exact repository/commit/files/symbols/schemas/tests/receipts/hashes/reproducibility/evidence state.
4. **Mesh** — current state, aspiration, evolution checklist, dependencies, freshness, and next advancement conditions.

Incomplete proof narrows only the claim that depends on that proof. It does not erase the intended product target or working capability.

## Starmap UX goals

- make the company constellation immediately legible on desktop and mobile
- preserve keyboard/text-directory fallback
- preserve script-free operation unless a separately reviewed architecture explicitly changes that invariant
- distinguish repository-evidence richness from second-depth proof stage
- make advanced stars visibly meaningful without making mapped-only stars look defective
- keep company alignment visibly independent; never imply affiliation, employment, proprietary access, endorsement, contract, clearance, or deployment
- improve labels, grouping, spatial hierarchy, focus states, tap targets, and information scent
- keep meaningful complexity when it communicates useful structure rather than collapsing the map merely for simplicity
- keep the starmap consistent with the premium dark/mint/cyan/violet design system and V24/V25 display surfaces

## Validation

Before merge, run the repository-native gates applicable to the changed surface, including at minimum:

```bash
node scripts/render-helix-atlas.mjs
node scripts/render-helix-starmap.mjs
node scripts/validate-helix-starmap.mjs
node scripts/validate-helix-atlas.mjs
npm test
```

Use the current repository-native commands observed in source. Do not revive superseded generation steps simply because an older branch used them.

## Delivery contract

The refresh must leave:

1. exact changed files
2. before/after design rationale
3. current-head validation output
4. any remaining visual/UX uncertainty
5. explicit truth-boundary statement
6. preservation of the prior starmap capability
7. no direct production deployment until current-head proof passes

Pull request `#172` carries this refresh from `apex/starmap-refresh-20260816` to `main`. Production promotion remains downstream of current-head verification, not downstream of a stale historical green run.

# GitHub Merge Authority Graph — Public Proof Surface

This package is a **public-safe proof projection** of an independently built GlacierEQ capability whose implementation remains private.

## Signal

The capability governs repository mutations as a transaction instead of treating “API call returned” as completion:

`intent → exact patch identity → required checks → bounded approval → expected-head guard → provider mutation → bounded readback reconciliation → canonical receipt → replay suppression`

The public proof does **not** publish the private source. It binds the inspected implementation by repository identity, canonical/exercised source SHAs, exact source paths, Git blob hashes, tests, disposable provider executions, canonical receipts, and explicit nonclaims.

## Current proof

- Capability: `merge_authority_graph`
- Private owning repository: `GlacierEQ/apex-github-worker`
- Canonical Apex head after reproduced-proof promotion: `f791c85a81768e72446619b39b5312ef1c768a02`
- Canonical implementation source actually reproduced against GitHub: `1a5331a0203e1273c1045589ea66f5bcf1080b55`
- Exact implementation blobs:
  - `merge-authority/merge-authority.mjs` → `b1e30e9caa593d094de64b934b6b8ef762570b6f`
  - `merge-authority/github-provider.mjs` → `e6e8587931efbf1f6fc0e7e52093c95c0ae70373`
- Exact Merge Authority proof suite: **26 passed, 0 failed**
- Proof-host gateway suite: **38 passed, 0 failed**
- Real provider target: `GlacierEQ/public-actions-runner-host`
- Disposable target branch: `operability/merge-authority-v4`
- GitHub provider mutation: `1ec5b60e46c1e5e706838d6291ac6523fdc18a5a`
- Canonical provider readback: same SHA
- Replay result: `DUPLICATE_ALREADY_COMPLETED`, with no second mutation
- Authority: short-lived repository-scoped GitHub App installation token; token not persisted and revoked after use
- Target repository `main` remained unchanged.

## Public boundary

This package proves an **independent GlacierEQ implementation and reproduction**. It does not claim GitHub adoption, deployment inside GitHub, employment, endorsement, proprietary GitHub access, production scale, or production reliability.

Private implementation bytes, credentials, tokens, and GitHub App private-key material are intentionally absent. Public readers can verify the disclosed hashes and the public disposable-provider receipts without receiving the private implementation.

## Evidence map

- `evidence/github-role-5611.json` — current official GitHub role context captured for company fit.
- `evidence/github-problem.json` — bounded public operating problem and official-source trail.
- `machine/implementation-inspection.json` — private-source identity and hash-only inspection boundary.
- `machine/remedy-contract.json` — reusable engineering invariant and mechanism contract.
- `proof/implementation-receipt.json` — implementation/runtime gate receipt.
- `proof/canonical-reproduction.json` — fresh canonical-source real-provider reproduction.
- `proof/claim-receipt.json` — exact allowed and prohibited public claim boundary.

# Capability Cluster — Boundary-Preserving Projection

**Status:** candidate proof object  
**Date:** 2026-08-12  
**Control-plane base:** `GlacierEQ/job-application@1207230d190693073a9ee32d301bc1a4eb548ffd`

## Capability

**Boundary-preserving projection** means moving useful state, capability, or evidence across a public/control-plane boundary without allowing the projection to silently widen authority, leak excluded material, or promote stale evidence.

This is one repeated engineering capability, not multiple accomplishments created by counting repositories.

## Independent implementation evidence

### 1. ECHO — public/private capability admission boundary

**Repository:** `GlacierEQ/ECHO`  
**Exact canonical head:** `6acdb3be1739f1659f3cec9f4b7d39d5799cd476`  
**Current-head execution:** GitHub Actions `ECHO CI` run `31340641961` — `success`.

The exact canonical commit removes a direct sensitive-domain repository from the public mesh and requires private/domain systems to contribute only separately admitted, sanitized transferable capabilities. Native regression tests reject public README leakage of case-specific identifiers and require the sanitized-capability boundary text.

Evidence class: **CURRENT_HEAD_EXECUTED_AND_SOURCE_INSPECTED**.

### 2. Job App Helix — source-bound promotion boundary

**Repository:** `GlacierEQ/job-app-helix`  
**Exact canonical head:** `86c3630d51b231c1637dc9e8b138b28eaf70ba68`  
**Exact-head control-plane status:** `buildkite/job-app-helix = success`.

The canonical revision replaces legacy scaffold/promotion interpretation with a source-bound implementation-surface audit. It explicitly marks the historical `47 / 47 PROMOTED` Wave C label as non-current promotion truth and requires dedicated implementation, exact-head deterministic/adversarial proof, source-bound `machine/implementation-proof.json`, and current authority/projection gates before strict `BUILT_RIGHT` promotion.

Evidence class: **CURRENT_HEAD_CONTROL_PLANE_VERIFIED_AND_SOURCE_INSPECTED**.

## Shared mechanism

Across both independent repositories, the repeated mechanism is:

1. identify the source authority and the boundary being crossed;
2. exclude material that is not admitted to cross that boundary;
3. require an explicit admission/proof contract for what may cross;
4. preserve exact source identity instead of inheriting stale proof;
5. fail closed when authority, provenance, privacy, or current proof is insufficient;
6. project only the narrower admitted representation.

ECHO applies this to **private/domain capability → public engineering mesh**. Job App Helix applies it to **repository/scaffold state → portfolio promotion state**.

## Consequential value

This pattern prevents two common failures in agentic and evidence-bearing systems:

- a useful source accidentally becoming an unrestricted public or execution authority;
- an old green label surviving after the implementation/proof contract changes.

The reusable capability is therefore not generic access control and not generic data transformation. It is **projection with preserved authority ceilings and proof boundaries**.

## Claim ceiling

`TWO_INDEPENDENT_CURRENT_CANONICAL_IMPLEMENTATIONS_OF_BOUNDARY_PRESERVING_PROJECTION_WITH_EXACT_HEAD_CONTROL_PLANE_OR_CI_EVIDENCE`

## Authorized claims

- implemented boundary-preserving projection in multiple independent GlacierEQ systems;
- public/private capability admission is regression-tested in ECHO at its exact canonical head;
- Job App Helix currently rejects legacy promotion labels as present implementation truth and binds promotion to source-level proof gates;
- the same engineering pattern appears in different domains: public capability projection and portfolio evidence promotion.

## Forbidden inferences

This proof does **not** establish:

- production scale or external adoption;
- third-party employment, affiliation, endorsement, or proprietary access;
- that every GlacierEQ repository uses this pattern;
- that ECHO's separately named `AI Autonomous Deploy` workflow proves production deployment;
- that historical proof transfers to future source revisions;
- that a sanitized projection grants mutation authority over its source;
- that Helix's current P0 company innovations are all implemented or promoted.

## Reusable capability extracted

**Boundary-Preserving Projection Contract**

```text
SOURCE AUTHORITY
    ↓ exact identity
ADMISSION / PROOF GATE
    ↓ reject excluded, stale, or unauthorised state
NARROW PROJECTION
    ↓ preserve provenance + authority ceiling
CONSUMER SURFACE
```

A future reusable implementation should expose at minimum:

- source identity/revision;
- boundary type;
- admission rule IDs;
- excluded classes;
- proof state;
- projection digest;
- authority ceiling;
- explicit nonclaims;
- next verification cursor.

## Next cursor

Convert this cluster into recruiter/master/machine/mesh surfaces only after this exact `job-application` proof-object revision passes repository-native control-plane CI. Do not widen the claim to deployment, production use, or estate-wide coverage.
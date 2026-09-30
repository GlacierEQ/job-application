# GitHub Merge Authority Graph — Recruiter / Master / Machine / Mesh

**Proof ceiling:** independently built, real-provider reproduced proof. This surface does not claim GitHub adoption, deployment inside GitHub, employment, endorsement, production scale, or production reliability.

## Recruiter

Built a guarded repository-mutation control plane that treats a merge as a transaction rather than assuming an API success response means the work is complete. The system binds intent to exact patch identity, checks required gates, protects the expected branch head, performs the provider mutation, reads canonical state back, writes a receipt, and suppresses duplicate replay.

The public proof records a real disposable GitHub-provider reproduction where the provider mutation and canonical readback resolved to the same SHA and replay returned `DUPLICATE_ALREADY_COMPLETED` without a second mutation.

## Master

The engineering pattern is a fail-closed mutation transaction:

`intent → exact patch identity → required checks → bounded approval → expected-head guard → provider mutation → bounded readback reconciliation → canonical receipt → replay suppression`

This closes several reliability gaps that ordinary API wrappers leave open:

- **stale-state mutation:** expected-head guarding binds the action to the state that was actually reviewed;
- **ambiguous completion:** provider success is not final until canonical readback reconciles the resulting state;
- **duplicate execution:** durable completion identity allows replay to terminate without a second mutation;
- **weak provenance:** exact source paths, Git blob identities, exercised revisions, provider receipts, and claim boundaries are retained as evidence;
- **credential sprawl:** the reproduced provider path used a short-lived repository-scoped GitHub App installation token that was not persisted and was revoked after use.

The capability is useful as a reusable control primitive for CI finishers, deployment promotion, repository automation, agentic code maintenance, and any workflow where a remote mutation must be attributable, bounded, reconciled, and replay-safe.

## Machine

```yaml
capability: merge_authority_graph
private_owner: GlacierEQ/apex-github-worker
public_projection: GlacierEQ/job-application/projects/github-merge-authority-proof
canonical_owner_head_after_proof_promotion: f791c85a81768e72446619b39b5312ef1c768a02
exercised_implementation_revision: 1a5331a0203e1273c1045589ea66f5bcf1080b55
implementation_blobs:
  merge-authority/merge-authority.mjs: b1e30e9caa593d094de64b934b6b8ef762570b6f
  merge-authority/github-provider.mjs: e6e8587931efbf1f6fc0e7e52093c95c0ae70373
proof_suite:
  passed: 26
  failed: 0
proof_host_gateway_suite:
  passed: 38
  failed: 0
provider_reproduction:
  target_repository: GlacierEQ/public-actions-runner-host
  disposable_branch: operability/merge-authority-v4
  mutation_sha: 1ec5b60e46c1e5e706838d6291ac6523fdc18a5a
  canonical_readback_sha: 1ec5b60e46c1e5e706838d6291ac6523fdc18a5a
  replay_result: DUPLICATE_ALREADY_COMPLETED
  second_mutation: false
  target_main_changed: false
authority:
  type: repository_scoped_github_app_installation_token
  persisted: false
  revoked_after_use: true
claim_ceiling:
  independent_implementation: true
  real_provider_reproduction: true
  github_adoption: false
  deployed_inside_github: false
  production_scale: false
  production_reliability: false
```

Controlling public evidence lives under `projects/github-merge-authority-proof/`, including implementation inspection, remedy/target contracts, canonical reproduction, implementation receipt, claim receipt, and public projection readback.

## Mesh

### Proven

- Exact implementation identity is bound without publishing private source bytes.
- Merge Authority proof suite: 26 passed / 0 failed.
- Proof-host gateway suite: 38 passed / 0 failed.
- A disposable real-provider mutation was reconciled against canonical GitHub readback.
- Replay was suppressed with `DUPLICATE_ALREADY_COMPLETED` and no second mutation.
- Target repository `main` remained unchanged.
- The reproduced authority path used short-lived repository-scoped credentials that were not persisted and were revoked after use.

### Explicitly not proven

- GitHub adoption or internal GitHub deployment.
- Production scale, production reliability, or broad exactly-once guarantees.
- Safety of arbitrary mutations outside the bounded contract and provider path reproduced by the evidence package.

### Next promotion gate

Reproduce the same transaction contract across a second independent mutation provider or materially different repository operation, preserving expected-head identity, canonical readback, durable completion receipt, and replay suppression. Until that exists, describe the capability as a real-provider reproduced repository-mutation control plane, not a generalized distributed transaction system.

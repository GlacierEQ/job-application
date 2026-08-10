# Capability Cluster — Pre-Dispatch Authority Envelopes

## Recruiter surface

I build mutation systems that do not let an agent or workflow turn intent directly into side effects. A separate authority envelope is checked first: who is acting, what operation is requested, what scope is allowed, and whether the request is still valid. Invalid or over-broad actions fail closed before dispatch.

This pattern appears independently in three GlacierEQ systems spanning tool calls, CRM mutations, and deployment promotion. The cross-domain claim is the repeated engineering pattern—not a claim that these repositories form one integrated platform.

## Master surface

### Pattern

**Pre-dispatch authority envelope** = a deterministic authorization boundary inserted between proposed intent and irreversible or state-changing execution.

The common mechanism is:

1. represent authority separately from requested work;
2. bind authority to explicit identity and operation scope;
3. validate request shape and scope before dispatch;
4. reject mismatch, replay, unsupported transitions, or missing authority rather than degrading open;
5. preserve decision evidence sufficient to explain why a mutation was admitted or refused.

### Independent implementations

#### 1. Tool dispatch — `GlacierEQ/openai-tool-authority-matrix`

Pinned head: `e8b95ee5821d2438665930466dc6a9600ac703c2`

- default-deny tool × role authorization;
- required schema arguments checked before dispatch;
- explicit request IDs and one-shot synchronized reservation close replay/concurrency seams;
- current excellence state is `EVOLVING` with proof, operability, adversarial, authority, and projection-truth gates recorded PASS.

This repository is the strongest verified donor in the cluster.

#### 2. CRM mutation — `GlacierEQ/salesforce-crm-action-authority`

Pinned head: `0d1f49586def424fdf3cb234deba86006bb4c183`

- actor, workflow/subject, object, action, field, time, nonce, and irreversible-send scope are separated into an external grant;
- no grant means no mutation;
- replayed, expired, future-dated, wrong-scope, or unsupported requests are refused;
- reversible mutations emit reverse-operation receipts;
- external sends are disabled by default unless explicitly authorized.

Current truth boundary: `IMPLEMENTED`; current-head deterministic/adversarial/operate/proof gates remain pending. The cluster therefore uses this donor as implementation-inspected evidence, not as promoted proof.

#### 3. Deployment promotion — `GlacierEQ/vercel-deploy-preview-authority`

Pinned head: `296c173c5887a939c6cb99c1e7f670f1b5911c1d`

- promotion authority is scoped to project, subject, source deployment, and explicit environment transition;
- preview → production is refused; production must be staged;
- grants can expire or be revoked;
- identity and transition mismatches are refused;
- decision receipts bind transition, deployment, authority, and reasons.

Current truth boundary: `IMPLEMENTED`; fresh current-head CI and source-bound proof are still pending. It is a deterministic reference model using synthetic deployment identities and does not call Vercel APIs.

## Machine surface

```text
cluster_id = pre_dispatch_authority_envelopes
independence = 3 separate repositories / 3 different mutation domains / no fork-or-backup counting
common_invariant = proposed_intent != execution_authority
admission = explicit_identity_scope && explicit_operation_scope && request_validity
failure_semantics = fail_closed_before_dispatch
anti_replay = required where donor implements request identity / nonce semantics
receipts = decision or reversal evidence where donor implements it
integration_exercised = false
claim_ceiling = IMPLEMENTATION_INSPECTED_CROSS_DOMAIN_PATTERN
```

### Exact evidence bindings

| Repository | Revision | Evidence blobs | Current state used here |
|---|---|---|---|
| `GlacierEQ/openai-tool-authority-matrix` | `e8b95ee5821d2438665930466dc6a9600ac703c2` | `README.md@6676f1a486dc19de336ae4413e9624b6872f7deb`; `machine/excellence-state.json@8efc4c43da888933b7691d0dc33ed25adbdddd99` | `EVOLVING`, current gates record proof/operability/adversarial/authority PASS |
| `GlacierEQ/salesforce-crm-action-authority` | `0d1f49586def424fdf3cb234deba86006bb4c183` | `README.md@0934b6af4088ccde2e00486320cdc44b3a05b235`; `machine/excellence-state.json@0ea55bca7dcf53617d6f3f8d16e543d686da7f31` | `IMPLEMENTED`, fresh current-head proof pending |
| `GlacierEQ/vercel-deploy-preview-authority` | `296c173c5887a939c6cb99c1e7f670f1b5911c1d` | `README.md@0f306816517558c99b9017caf18b8ce3da690e8e`; `machine/excellence-state.json@9f4a6431d55964b6c675b098ef014d8fcc161aae` | `IMPLEMENTED`, fresh current-head CI/proof pending |

## Mesh surface

### What is proven enough to say now

- The same authority-before-dispatch design recurs independently across tool, CRM, and deployment mutation systems.
- Each donor separates requested work from the authority required to perform it.
- Each donor contains fail-closed scope or transition checks before mutation.
- The OpenAI-lens donor has the strongest current proof state; the Salesforce- and Vercel-lens donors are current implementations with deliberately withheld promotion.

### Explicit nonclaims

- no OpenAI, Salesforce, or Vercel affiliation, adoption, endorsement, proprietary access, or production deployment;
- no claim that the three repositories are integrated;
- no claim that all three donors share identical expiry, revocation, replay, receipt, or cryptographic semantics;
- no provider-scale reliability or production-impact claim;
- no counting of three repositories as three accomplishments: the portfolio object is one repeated capability pattern supported by independent implementations.

### Next promotion gate

Generate fresh current-head behavioral/adversarial/operate proof for the Salesforce and Vercel donors, then reassess whether the cluster can move from `IMPLEMENTATION_INSPECTED_CROSS_DOMAIN_PATTERN` to a fully current multi-donor verified pattern without widening any donor-specific claim.
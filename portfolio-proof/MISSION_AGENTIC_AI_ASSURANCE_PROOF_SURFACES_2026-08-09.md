# Mission Agentic AI Assurance — Portfolio Proof Surfaces

Status: `REFERENCE_IMPLEMENTATION / REPRODUCIBLE_PROOF`
Canonical source revision: `64544b39def73d188bb2cb6dc67ecef2cfa0991c`

This proof object projects the existing `projects/mission-agentic-ai-assurance/` system into the portfolio control plane without raising its evidence ceiling.

## Recruiter

Built a compact agent-assurance control plane that makes automated actions inspectable and fail-closed: actions are policy-gated, bound to hashed evidence, checked for bounded drift, protected against conflicting single-process replay, circuit-breaker guarded, and emitted with deterministic receipts. The implementation is designed to demonstrate how agentic workflows can preserve traceability and explicit failure semantics rather than treating successful execution as the only state that matters.

Defensible ceiling: a reproducibly testable reference implementation, not a production or certified mission system.

## Master

The system composes six reliability mechanisms around an agent action boundary:

1. content-bound provenance — preserved evidence bytes are checked against immutable SHA-256 identities;
2. policy gating — execution is preceded by an explicit allow/deny decision with reason codes;
3. bounded drift gating — finite observed metrics can block action when policy tolerance is exceeded;
4. replay protection — action identity is idempotent within one process and conflicting replays fail closed;
5. circuit breaking — repeated execution failures move the control plane into a blocked state;
6. deterministic receipts — policy, evidence, drift, reason and outcome identities are retained for reproduction and audit.

The design separates proof from aspiration. It does not convert local deterministic behavior into distributed exactly-once semantics, and it does not convert a public company/role lens into affiliation or adoption.

## Machine

Canonical governed proof manifest:
`projects/mission-agentic-ai-assurance/proof/proof_manifest.json`

Pinned facts from that manifest at the canonical source revision:

- schema: `glaciereq.mission-assurance-proof-manifest.v1`
- test count: `17`
- credentials required: `false`
- external model required: `false`
- network required: `false`
- reproduced receipt id: `b7a3e3cba968e19bb91ed8f6881b69e37efc97d7e8414be0aca431dff501123f`
- governed implementation: `src/mission_assurance/core.py`
- governed behavioral tests: `tests/test_assurance.py`
- governed verifier: `scripts/verify_proof.py`
- integration contract: `glaciereq/mission_assurance/v1/contract.proto`
- machine adapter boundary: `machine/INTEGRATION.md`

Reproduction commands declared by the source surface:

```text
PYTHONPATH=src python -m unittest discover -s tests -v
PYTHONPATH=src python scripts/demo.py
PYTHONPATH=src python scripts/verify_proof.py
```

Evidence ceiling note: the governed manifest records a 17-test proof set and deterministic reproduction contract. This portfolio projection does not independently claim a fresh execution of those commands during this compiler cycle.

## Mesh

### Proven now

- evidence-hash binding
- deterministic decision/receipt surface
- policy and bounded-drift gates
- single-process replay conflict protection
- concurrent duplicate protection as represented by the reference implementation/test surface
- circuit-breaker behavior
- fixed proof manifest and reproducible receipt contract
- recruiter/master/machine/mesh source architecture already present in the project

### Explicit nonclaims

- Lockheed Martin affiliation, employment, endorsement, contract, clearance, access, adoption or deployment
- production deployment or measured production impact
- distributed exactly-once semantics
- production-scale distributed state
- aerospace/defense/safety-critical/classified certification
- replacement for formal safety, cybersecurity, model-risk or systems-engineering processes

### Next promotion gate

Promote beyond `REFERENCE_IMPLEMENTATION / REPRODUCIBLE_PROOF` only after a pinned current-revision execution receipt demonstrates the repository-native test + demo + verifier chain and, for any runtime/distributed claim, a separately evidenced multi-process or distributed failure/replay scenario. Do not infer either promotion from the existence of CI/configuration alone.

## Claim text

> Built a reproducibly testable agent-assurance reference control plane combining content-bound provenance, policy and bounded-drift gates, deterministic receipts, single-process replay protection, concurrent duplicate protection, and circuit breaking, with explicit fail-closed boundaries and a fixed proof manifest.

This supersedes using the longer project README as the primary portfolio-facing proof object; the project README remains the canonical implementation introduction and this file is the bounded portfolio projection.
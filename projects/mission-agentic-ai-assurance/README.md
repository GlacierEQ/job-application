# Mission Agentic AI Assurance

**Independent GlacierEQ reference implementation for evidence-bound agentic AI operations in mission-critical environments.**

This project turns a public engineering need into a small, reproducible control plane: every agent action is policy-gated, bound to immutable evidence, drift-checked, idempotent, circuit-breaker protected, and emitted with a deterministic receipt.

## Recruiter layer

### What it demonstrates

- **Traceability:** every evaluated action binds to immutable public evidence references and deterministic hashes.
- **Reliability:** action IDs are idempotent; conflicting replays fail closed; repeated execution failures open a circuit breaker.
- **Explainability:** allow/deny/failure receipts preserve reason codes, policy identity, evidence identity, drift, and outcome identity.
- **Monitoring:** a bounded drift gate blocks actions when observed metrics move beyond policy.
- **Testability:** the reference implementation is standard-library-only and deterministic.
- **CI/CD discipline:** tests, proof-manifest verification, and exact demo receipt reproduction run in CI.

### Public Lockheed Martin lens

The first public lens is derived only from the already-preserved Lockheed Martin Space role and AI/ML material in Job App Helix. It addresses the **publicly supportable** problem of integrating agentic AI/ML across disparate mission software while preserving traceability, reliability, explainability, monitoring, testability, and CI/CD discipline.

It does **not** claim Lockheed Martin uses this project, has reviewed it, has any relationship with GlacierEQ, or has the internal architecture inferred here.

### Five-minute proof

```bash
PYTHONPATH=src python -m unittest discover -s tests -v
PYTHONPATH=src python scripts/demo.py
PYTHONPATH=src python scripts/verify_proof.py
```

The demo output must exactly match [`proof/reproduced_receipt.json`](proof/reproduced_receipt.json).

## Four-layer navigation

1. **Recruiter:** this README — value, relevance, and demonstrated behavior.
2. **Master:** [`MASTER.md`](MASTER.md) — innovation, architecture, failure domains, gap ledger, and acceptance contract.
3. **Machine:** [`machine/contract.proto`](machine/contract.proto) + [`machine/remedy.json`](machine/remedy.json) — compact integration and remedy contracts.
4. **Mesh:** [`MESH.yaml`](MESH.yaml) — upstream/downstream relationships, aspiration, evolution queue, and promotion boundaries.

## Maximum defensible claim

> Built and reproducibly tested an independent mission-agent assurance gateway that combines immutable provenance, deterministic receipts, idempotency, drift gating, policy decisions, and circuit breaking into a compact reference control plane aligned to publicly stated mission-AI integration concerns.

## Explicitly not claimed

- Lockheed Martin affiliation, employment, endorsement, contract, clearance, access, adoption, deployment, or measured impact.
- Production-scale distributed operation.
- Certification for aerospace, defense, safety-critical, or classified workloads.
- Replacement for formal safety, cybersecurity, model-risk, or systems-engineering processes.

## Status

`REFERENCE_IMPLEMENTATION / REPRODUCIBLE_PROOF`

The aspiration is higher than the current implementation; the remaining path is tracked in the Mesh rather than hidden or used to weaken what is already proven.

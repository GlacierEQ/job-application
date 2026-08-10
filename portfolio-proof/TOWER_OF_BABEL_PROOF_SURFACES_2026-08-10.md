# Tower of Babel Proof Surfaces — 2026-08-10

## Evidence contract

System: `GlacierEQ/the-tower-of-babel`
Canonical head observed: `60625dc7dde95a69212c201ba8d79c991b88c39b`
Evidence class: current source-contract / flagship-path evidence.
Claim ceiling: `IMPLEMENTED_BOUNDED_CROSS_LANGUAGE_MISSION_PIPELINE`.

The flagship contract defines a typed mission path across Protobuf, ProtoJSON, TypeScript, Python, Rust, Go, SQL, WebAssembly, Lean 4, and a deterministic Tower Receipt. The runner executes every available stage and records exact toolchain blockers for unavailable floors. This surface therefore describes implemented architecture and bounded execution semantics; it does not claim that every language/toolchain stage executed successfully on the current head, production deployment, hosted-scale performance, or external-provider integration.

## Recruiter surface

**Tower of Babel — bounded cross-language mission execution**

Built a typed mission pipeline that carries one operator request across language boundaries without discarding authority, provenance, state constraints, or receipt semantics. The path validates and hashes ingress, separates planning from authority, emits evidence-bound telemetry, constrains persisted state, limits tool capability, and seals a deterministic receipt. Unavailable toolchain stages are blockers to record, not successes to imply.

**Why it matters:** polyglot systems usually fail at boundaries. This design makes those boundaries explicit and keeps execution authority narrower than planning intent.

## Master surface

The architecture assigns one responsibility to each boundary rather than treating language diversity as the accomplishment:

- Protobuf defines shared mission/plan/decision/event contracts.
- ProtoJSON carries typed payloads between TypeScript and Python/Rust.
- TypeScript validates operator ingress and binds the input hash.
- Python performs planning through the Tower-to-Megamind adapter.
- Rust is the fail-closed authority gate: plans must be nonempty and registry-bound.
- Go emits typed execution telemetry with an evidence hash.
- SQL persists constrained mission and event state.
- WebAssembly demonstrates a capability-limited tool boundary.
- Lean 4 defines receipt-sequence monotonicity as an invariant target.
- Tower Receipt seals the deterministic tamper-evident execution record.

The important engineering pattern is **authority-preserving translation**: crossing languages may transform representation, but must not silently broaden what the mission is allowed to do.

### Verification boundary

Current repository evidence establishes the flagship source contract and runner behavior that attempts every available stage while recording unavailable toolchain blockers. No fresh current-head claim is made that all listed toolchains executed. A complete runtime promotion requires a current-head receipt showing the exercised stages and blockers.

## Machine surface

```yaml
proof_object:
  id: tower-of-babel-bounded-cross-language-mission-pipeline
  system: GlacierEQ/the-tower-of-babel
  canonical_head: 60625dc7dde95a69212c201ba8d79c991b88c39b
  evidence_class: current_source_contract_and_flagship_path
  accomplishment_count: 1
  boundaries:
    contract: protobuf
    bridge: protojson
    ingress: typescript
    planning: python
    authority: rust
    telemetry: go
    state: sql
    sandbox: wasm
    invariant: lean4
    verification: tower_receipt
  invariants:
    - typed_cross_language_payloads
    - ingress_input_hash_binding
    - planning_separated_from_execution_authority
    - fail_closed_registry_bound_authority
    - evidence_hash_telemetry
    - constrained_persistent_state
    - capability_limited_tool_boundary
    - deterministic_receipt_path
    - unavailable_toolchains_recorded_as_blockers
  claim_ceiling: IMPLEMENTED_BOUNDED_CROSS_LANGUAGE_MISSION_PIPELINE
  nonclaims:
    - all_toolchains_executed_on_current_head
    - production_deployment
    - hosted_scale_performance
    - external_provider_integration
    - language_count_as_accomplishment_count
```

## Mesh surface

```text
OPERATOR MISSION
      |
      v
Protobuf contract -> ProtoJSON bridge
      |
      v
TypeScript ingress [validate + input hash]
      |
      v
Python planning
      |
      v
Rust authority gate [nonempty + registry-bound; fail closed]
      |
      v
Go telemetry [typed event + evidence hash]
      |
      v
SQL constrained state
      |
      +--> WASM capability boundary
      +--> Lean receipt-sequence invariant
      |
      v
Tower Receipt [deterministic evidence]

Unavailable floor -> explicit blocker, never implicit PASS
```

## Supersession decision

**RETIRED:** describing Tower of Babel primarily as a many-language showcase.

**CURRENT DEFENSIBLE WORDING:**

> **Tower of Babel implements a typed, authority-preserving cross-language mission pipeline: hashed ingress, separate planning and fail-closed execution authority, evidence-bound telemetry, constrained state, capability-limited tooling, and deterministic receipts. Its runner records unavailable toolchains as blockers rather than widening proof.**

This wording turns language breadth into an engineering-boundary proof while keeping runtime and deployment claims below the evidence ceiling.

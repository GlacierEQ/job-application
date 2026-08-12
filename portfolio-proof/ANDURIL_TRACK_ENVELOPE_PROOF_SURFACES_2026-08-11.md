# Track Envelope Compiler — Four-Surface Proof Projection

## Authority

- Repository: `GlacierEQ/anduril-track-envelope-compiler`
- Canonical branch: `main`
- Current canonical head observed: `46f0061f27070e5bcfbfcfe77d5b06b0e014c31f`
- Exact executed evolution candidate: `fb8e460e3b76b9d0453e702dfd2bd167368dd6a5`
- Verification workflow: `31461547751`
- Executed lanes: Python unittest = PASS; Clang C11 native = PASS
- Evolution receipt: `machine/evolution-receipts/2026-08-11-temporal-covariance-fusion.json`
- Evidence rule: execution proof is revision-bound to `fb8e460e…`; later canonical packaging at `46f0061f…` does not inherit a new executed-current-head claim.

## Recruiter surface

### Uncertainty-preserving multi-sensor state fusion

Built and adversarially verified a track-envelope compiler that combines time-decayed sensor evidence without turning missing knowledge into false certainty. The verified evolution expands spatial bounds from covariance, prevents repeated observations from one sensor from masquerading as independent corroboration, fuses distinct sensor support while retaining explicit residual unknown mass, rejects invalid covariance/non-finite evidence, and preserves deterministic Python envelope identity across evidence ordering.

**Defensible claim:** Implemented and verified an uncertainty-preserving multi-sensor fusion mechanism in Python and native C that decays stale evidence, expands bounds from covariance, resists same-sensor confidence inflation, preserves residual unknown mass, and fails closed on malformed uncertainty inputs. Python additionally proves order-invariant envelope fingerprinting.

**Do not claim:** authenticated sensor identity, provenance-attested covariance, operational targeting deployment, Anduril adoption/affiliation, production scale, or current-head execution for `46f0061f…`.

## Master surface

### Problem

Fusion systems can become misleading when stale observations retain full authority, repeated evidence from one source is counted as independent corroboration, covariance is ignored, or unresolved uncertainty disappears from the result.

### Mechanism

The verified evolution implements:

1. temporal decay of per-sensor evidence support;
2. covariance-aware spatial expansion;
3. sensor-level support aggregation rather than observation-count confidence inflation;
4. multi-sensor fusion with explicit residual unknown mass;
5. order-invariant Python envelope fingerprinting;
6. validation that rejects non-PSD covariance and non-finite evidence;
7. preservation of the legacy C API alongside a zero-allocation v2 native path.

### Adversarial properties proved

- stale evidence loses support;
- same-sensor multiplicity does not manufacture independent confidence;
- distinct sensor support can accumulate while unresolved mass remains visible;
- covariance expands the envelope rather than being silently discarded;
- malformed uncertainty fails closed;
- evidence order does not change the Python identity/fingerprint.

### Authority ceiling

Sensor identifiers are caller-supplied labels, not authenticated identities. Distinct labels are treated as independent under this reference rule. Covariance is caller-supplied and not provenance-attested. The proof establishes implementation behavior at the executed candidate revision, not production deployment, operational use, production scale, or Anduril adoption/affiliation. The later canonical head does not inherit execution proof.

## Machine surface

```yaml
schema: glaciereq.proof-surface.v1
system_id: anduril_track_envelope_compiler
source:
  repository: GlacierEQ/anduril-track-envelope-compiler
  branch: main
  current_canonical_head: 46f0061f27070e5bcfbfcfe77d5b06b0e014c31f
  executed_candidate: fb8e460e3b76b9d0453e702dfd2bd167368dd6a5
  workflow_run: 31461547751
  receipt: machine/evolution-receipts/2026-08-11-temporal-covariance-fusion.json
status:
  executed_candidate: VERIFIED
  current_head_execution: NOT_ESTABLISHED_BY_THIS_RECEIPT
  python_unittest: PASS
  clang_c11_native: PASS
verified_capabilities:
  - temporal_evidence_decay
  - covariance_expanded_bounds
  - same_sensor_multiplicity_resistance
  - multi_sensor_support_fusion
  - explicit_residual_unknown_mass
  - malformed_uncertainty_fail_closed
  - order_invariant_python_fingerprint
  - zero_allocation_native_v2_path
boundaries:
  - unauthenticated_sensor_labels
  - caller_supplied_unattested_covariance
  - no_anduril_affiliation_or_adoption
  - no_production_tracking_or_targeting_deployment
  - no_production_scale_claim
  - no_current_head_execution_inheritance
claim_ceiling: EXECUTED_EVOLUTION_CANDIDATE_PYTHON_AND_NATIVE_C_WITH_ADVERSARIAL_UNCERTAINTY_SEMANTICS
```

## Mesh surface

```text
Track Envelope Compiler
  TYPE: canonical specialist system
  CURRENT_CANONICAL_HEAD: 46f0061f...
  EXECUTED_PROOF_SUBJECT: fb8e460e...
  VERIFIED_BY: workflow 31461547751
    -> Python unittest: PASS
    -> Clang C11 native: PASS

  PROVES:
    -> temporal evidence decay
    -> covariance-aware bound growth
    -> same-sensor multiplicity resistance
    -> distinct-sensor support fusion
    -> explicit residual unknown mass
    -> fail-closed malformed uncertainty
    -> deterministic/order-invariant Python fingerprinting
    -> native zero-allocation v2 path

  REPRESENTED_BY -> Job-Application control plane
    boundary: portfolio projection cannot widen repository-native evidence

  CONNECTS_TO -> Conservative State Promotion capability pattern
    reason: unresolved uncertainty remains explicit rather than being promoted into false certainty

  DOES_NOT_PROVE:
    -> authenticated sensor identity
    -> provenance-attested covariance
    -> provider integration
    -> Anduril affiliation or adoption
    -> production deployment
    -> production scale
    -> operational targeting use
    -> current-head execution at 46f0061f...
```

## Projection invariant

Recruiter, master, machine, and mesh surfaces must preserve the same executed proof subject (`fb8e460e…`), workflow (`31461547751`), verified mechanisms, and authority limits: no authenticated sensor identity, no provenance-attested covariance, no Anduril affiliation/adoption, no production tracking/targeting deployment, no production-scale claim, and no current-head execution inheritance. The current canonical head may be named for repository identity, but its later documentation/receipt-packaging commits may not inherit execution proof without a separate exact-SHA run.

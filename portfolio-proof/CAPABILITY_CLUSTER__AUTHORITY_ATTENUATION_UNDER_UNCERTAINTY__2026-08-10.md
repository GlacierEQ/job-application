# Capability Cluster — Authority Attenuation Under Uncertainty

Status: CANONICAL_BOUNDED_PATTERN
Date: 2026-08-10
Accomplishment count: 1
Independent supporting repositories: 3

## Recruiter surface

I design control systems so uncertainty reduces authority instead of silently expanding it. Across independent reference implementations, degraded replica state narrows operations, actuator permission is short-lived and bound to an exact decision/input, and command authority expires rather than allowing stale actions to execute.

## Master surface

The repeated engineering pattern is **authority attenuation under uncertainty**: when freshness, consensus, decision identity, input identity, or time validity weakens, the system either narrows the permitted operation or refuses it.

Three independent implementations demonstrate distinct forms of the pattern:

1. `GlacierEQ/qdrant-collection-quorum-guard` — write admission requires declared healthy quorum; degraded reads are separately opt-in and bounded by maximum staleness. A degraded read never inherits write authority. Decisions emit deterministic digests/receipts.
2. `GlacierEQ/lockheed-dual-key-actuator-fence` — policy authority and side-effect execution authority are separated. Short-lived MAC-bound grants are tied to the exact policy decision fingerprint and input digest; expiry, decision drift, input drift, invalid grants, and replay fail closed.
3. `GlacierEQ/nasa-command-authority-half-life` — telecommand authority is explicitly time-limited so stale commands cannot execute after TTL. The repository states this is simulation-only.

These are not counted as three accomplishments. They are independent evidence for one reusable design capability: **authority should monotonically narrow as assurance decays**.

## Machine surface

```yaml
capability: authority_attenuation_under_uncertainty
claim_state: CANONICAL_BOUNDED_PATTERN
accomplishment_count: 1
supporting_repositories:
  - repository: GlacierEQ/qdrant-collection-quorum-guard
    evidence_revision: 9f9130c0377cd9eaea83fe4ce6ebc0ea0e194076
    evidence_path: src/collection_quorum_guard.py
    mechanism:
      - declared read/write quorum
      - bounded degraded-read staleness
      - no degraded-write inheritance
      - deterministic decision digest
  - repository: GlacierEQ/lockheed-dual-key-actuator-fence
    evidence_revision: f4dd076995e073ed8b6e57f12c85935c2592747b
    evidence_path: machine/canonical-position.json
    mechanism:
      - policy/execution authority separation
      - short-lived decision-bound grant
      - input/decision drift refusal
      - replay refusal
      - tamper-evident execution audit
  - repository: GlacierEQ/nasa-command-authority-half-life
    evidence_revision: 5b6c8a158e0477def60c61210faffc1210d3698a
    evidence_path: README.md
    mechanism:
      - TTL-bound command authority
      - stale-command refusal after expiry
claim_ceiling: INDEPENDENT_REFERENCE_IMPLEMENTATIONS_OF_AUTHORITY_ATTENUATION
integration_exercised: false
production_deployment_claimed: false
company_affiliation_claimed: false
```

## Mesh surface

### Proven now
- Independent implementations encode authority reduction/refusal when quorum, freshness, binding, replay, or time-validity constraints fail.
- The Qdrant guard distinguishes bounded degraded reads from write authority.
- The dual-key fence separates policy decision from side-effect execution and records explicit nonclaims, including no production actuator-control deployment and no exercised integration with related repositories.
- The command-authority project explicitly labels itself simulation-only.

### Not claimed
- No integration among the three repositories.
- No production deployment or external business impact.
- No Qdrant, Lockheed Martin, or NASA affiliation, endorsement, proprietary access, or internal-architecture knowledge.
- No repository-count inflation: three independent repositories support one capability pattern.
- No assertion that every mechanism has equivalent maturity or proof depth.

### Exact next cursor

Promote this cluster into a role/company projection only where the target bottleneck genuinely rewards bounded authority, freshness-sensitive control, replay resistance, or fail-closed distributed operations. Preserve the current claim ceiling unless current execution evidence independently raises it.

## Evidence receipt

- Qdrant evidence: `src/collection_quorum_guard.py` at revision `9f9130c0377cd9eaea83fe4ce6ebc0ea0e194076`; source states writes require declared quorum and degraded reads are explicit/staleness-bounded.
- Lockheed evidence: `machine/canonical-position.json` at revision `f4dd076995e073ed8b6e57f12c85935c2592747b`; canonical position is `RESOLVED` and enumerates dual-control mechanisms plus nonclaims.
- NASA evidence: `README.md` at revision `5b6c8a158e0477def60c61210faffc1210d3698a`; states telecommand tokens expire and labels the implementation simulation-only.

Supersedes weaker portfolio framing that describes these mechanisms merely as separate quorum, token, or TTL features without identifying their common safety invariant.

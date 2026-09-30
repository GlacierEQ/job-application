# Donor Independence Exclusion — Provenance Scaffolds — 2026-08-11

## Decision

`GlacierEQ/adobe-creative-provenance-gate` and `GlacierEQ/hugging-face-model-card-provenance-seal` MUST NOT be counted as two independent capability donors for a cross-repository provenance, bounded-authority, or receipt-backed-execution claim.

## Exact source evidence

- `GlacierEQ/adobe-creative-provenance-gate@f9bb49fd58c7fb9822da004689aa272161e511cf`
  - `src/creative_provenance_gate.py`
  - source labels itself `SCAFFOLD STUB`
  - central mechanism labels itself a stub
  - missing grant is explicitly only a soft signal
  - receipt metrics explicitly carry `scaffold: True`
- `GlacierEQ/hugging-face-model-card-provenance-seal@5fae0885ab537c23dc66bda8ac0ef4429c7ad75b`
  - `src/model_card_provenance_seal.py`
  - source labels itself `SCAFFOLD STUB`
  - central mechanism labels itself a stub
  - missing grant is explicitly only a soft signal
  - receipt metrics explicitly carry `scaffold: True`

## Independence finding

The two source files implement the same scaffold shape with domain/name substitutions: SHA-256 digest helper, ALLOW/REFUSE enum, request envelope with `subject_id`, `payload`, `budget`, `grant_id`, and `not_after`, receipt envelope with decision/reasons/digest/metrics, the same missing-subject and non-positive-budget refusal edges, and the same scaffold-allow path.

That repeated template is useful as lineage evidence for a reusable scaffold, but it is not evidence of two independently engineered implementations of the underlying capability.

## Portfolio-state delta

Retire any present or future proof construction that treats these two repositories as independent builds or uses their repository count to strengthen an accomplishment count.

They may be cited only as:

1. two domain projections of one shared scaffold lineage, or
2. individually bounded scaffold/reference examples.

They may NOT satisfy a `multiple independent repositories` gate together.

## Claim ceiling

`SHARED_SCAFFOLD_LINEAGE_NOT_INDEPENDENT_CAPABILITY_DONORS`

## Nonclaims

- no production deployment
- no current runtime verification inferred
- no independent-build count of two
- no Adobe or Hugging Face affiliation
- no mature provenance/authority implementation inferred from placeholder fields

## Exact next cursor

For a future provenance capability cluster, require at least two donors whose current exact revisions contain materially distinct non-scaffold mechanisms and whose lineage does not collapse to this template before promoting cross-repository independence.

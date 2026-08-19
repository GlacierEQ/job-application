# APEX_BLUEPRINT_V1

lane: JOB_RESTORE
verified_executable_capability_delta: YES

## Current source
- owning_repo: GlacierEQ/job-application
- source_branch: main
- source_sha_before_cycle: 7378faf0e202bea415ee9661ea89760cfa99c8e7
- selected_pr: #208
- exact_proven_head: 8381130d3fac0de4b8db475e389e7dd5cea607d2
- exact_head_merge_sha: 8abc5819ed3ee1d1bd695a4ad3234d83cf28fd8d
- production_runtime: tools/build_applicant_decision_packet.py
- production_runtime_blob: f22258526c4b4f7a25c13a15753b829f5dec4910
- production_test_blob: 1e949e8d79a45e21008551cf41eb771a8d62da2c
- post_merge_readback: PASS

## Donor / composition lineage
- maintained CandidateProfile/live xAI composition: PR #204
- live evidence-bound review: PR #205
- explicit evidence-review confirmation bridge: PR #206
- exact live Greenhouse field/opening binding repair: PR #207
- review builder source blob: 453da292a32566436d4956bba81f841eabcbec4e
- confirmation runtime source blob: 6bbe35b020062d520a5c8afd2e16ecf59d0f8661
- prior main source: 7378faf0e202bea415ee9661ea89760cfa99c8e7

## Selected priority
- tier: P1
- priority: turn the live evidence-bound xAI/Greenhouse preparation into one precise applicant-controlled decision packet so the operator can review the exact current field, evidence, proposed text, and confirmation identity without manual artifact shuffling.
- operator_value: reduces the highest-value human/application bottleneck while preserving explicit applicant authority and the existing exact live-field/opening binding.

## Higher candidates / pivots
- P1 BLOCKED: final ready_for_human_submission=true still depends on explicit applicant-controlled decisions; no answer or confirmation was inferred.
- PRIOR BLUEPRINT STALE: CandidateProfile composition, live xAI evidence review, explicit confirmation, and exact live-field binding were already merged through PRs #204-#207 and were not repeated.
- PRIVATE job-app composition was not selected because its hosted execution surface has historically been unreliable; the public job-application lane exposed a higher-leverage executable P1 with working target-native proof.

## Mechanisms compared
1. Keep the existing preparation -> review -> confirmation multi-file handoff: rejected because it leaves needless operator friction at the live application decision boundary.
2. Auto-promote generated/reviewed prose: rejected because it would invert applicant authority and convert machine review into applicant intent.
3. Selected nonlinear composition: reuse the existing live evidence review and exact confirmation bridge, then add one human-centered decision packet that preserves exact application/opening/field identity, reviewed evidence, a deterministic receipt, and an explicitly unconfirmed confirmation template.

## Implemented executable delta
- Added tools/build_applicant_decision_packet.py.
- Composes the current live preparation contract through the existing provenance-diverse build_review runtime.
- Re-verifies the embedded review receipt before exposing a decision.
- Carries exact application_id, opening_id, provider field_name, label, proposed text, evidence rows, evidence classes, and source hashes into one decision surface.
- Emits an exact glaciereq.evidence-review-confirmation.v1 template prefilled with the reviewed text but confirmed=false.
- Explicitly records that applicant confirmation/text remain human-controlled, machine confirmation inference is forbidden, and no external submission is performed.
- Edited or rejected prose requires a fresh evidence review rather than silently escaping the review boundary.
- Produces deterministic packet SHA-256 receipts and fsync + atomic output replacement.
- Supports direct CLI execution from tools/ as well as module import.
- Existing tools/confirm_evidence_bound_review.py consumes the human-confirmed template without a new adapter, preserving exact live field/opening identity through the semantic Greenhouse bridge.

## Preserved gains
- Maintained production CandidateProfile from PR #204 remains the source-bound live profile path.
- Evidence-bound live xAI review from PR #205 remains the drafting/evidence authority.
- Explicit applicant confirmation from PR #206 remains mandatory.
- Exact field_name/opening_id guards from PR #207 remain mandatory.
- Existing Greenhouse semantic binding, ambiguity refusal, option normalization, provider field exclusions, receipt hashing, and external-submission gate remain intact.
- No applicant-controlled answer was inferred, no confirmation was fabricated, and no external application/recruiter message was sent.

## Tests / runtime proof
- Initial head b197faf62b473e381b5d13d51d50c8d48f9e6297: committed 5-test adversarial suite passed on Python 3.11/3.12/3.13, but the direct CLI exposed a sibling-package import defect; strict CI independently exposed Ruff formatter drift.
- Refinement added direct-script import recovery and applied the repository's exact strict formatting without weakening behavior.
- exact_proven_head: 8381130d3fac0de4b8db475e389e7dd5cea607d2
- Applicant Decision Packet Proof run 32304646625: PASS.
- Python 3.11 job 96234648177: PASS compile + 5 adversarial composition tests + direct CLI decision-packet execution.
- Python 3.12 job 96234648466: PASS same full path.
- Python 3.13 job 96234648424: PASS same full path.
- strict repository CI run 32304647098: PASS.
- Portfolio Truth Gate run 32304646650: PASS.
- APEX Estate Non-Regression run 32304647084: PASS.
- exact-head squash merge: 8abc5819ed3ee1d1bd695a4ad3234d83cf28fd8d.
- post-merge runtime readback: PASS, blob f22258526c4b4f7a25c13a15753b829f5dec4910.
- post-merge test readback: PASS, blob 1e949e8d79a45e21008551cf41eb771a8d62da2c.

## Exact continuation targets
- tools/build_applicant_decision_packet.py: build_decision_packet, _verify_review_receipt, _verified_evidence, _atomic_write_json, main
- scripts/build_evidence_bound_application_review.py: build_review, select_diverse_evidence
- tools/confirm_evidence_bound_review.py: build_semantic_answer_source, _verify_review, _verify_confirmation
- .github/workflows/helix-live-xai-evidence-review.yml: current real live-review execution surface
- .github/workflows/applicant-decision-packet-proof.yml: focused target-native proof

## Top 3 remaining priorities
1. P1: feed the real current live xAI evidence-review preparation into the decision-packet runtime and, when the operator supplies explicit confirmations, produce the actual ready_for_human_submission=true review package without external submission.
2. P1: generalize the decision packet beyond the exceptional-work singleton to every unresolved applicant-controlled live Greenhouse field, preserving per-field exact identity, explicit confirmation, and mandatory re-review for edited generated prose.
3. P2: execute the highest live-verified STILL_STRANDED/CURRENTLY_MISSING job-ecosystem recovery candidate in its owning repository with exact donor lineage and target-native executable proof.

## Next sequence
1. Obtain the current live xAI preparation artifact from the existing evidence-review workflow rather than recreating provider state manually.
2. Run build_applicant_decision_packet.py against that exact preparation and surface only unresolved human decisions.
3. Bind only explicit operator confirmations through confirm_evidence_bound_review.py; preserve exact field/opening identity and review receipt.
4. Re-run the live semantic Greenhouse preparation and require ready_for_human_submission=true only when every applicant-controlled decision is explicitly bound.
5. Keep external submission behind the existing human submission gate.

## Merge / deploy gate
- PR #208 merged only at exact tested head 8381130d3fac0de4b8db475e389e7dd5cea607d2.
- Focused runtime proof passed on Python 3.11/3.12/3.13 before merge.
- Strict repository CI, portfolio truth, and estate non-regression passed on the exact head.
- Post-merge runtime and tests were read back from main.
- No external job submission occurred.

## Rollback
Revert merge 8abc5819ed3ee1d1bd695a4ad3234d83cf28fd8d to remove the applicant decision packet runtime/tests/workflow while preserving PRs #204-#207 and the prior live xAI/Greenhouse application path.

## No-loss invariants
- Operator/applicant intent remains authoritative for confirmation and accepted applicant-controlled text.
- Never infer confirmed=true.
- Never promote edited review prose without a new evidence-bound review.
- Never allow opening_id or field_name drift between review, confirmation, semantic binding, and live provider state.
- Never weaken CandidateProfile/evidence provenance to accelerate completion.
- Preserve existing live xAI review, semantic-answer, exact-field binding, human submission gate, and external-receipt boundaries.
- No completion claim without executable proof, exact-head merge, and post-merge readback.

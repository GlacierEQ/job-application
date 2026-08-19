# APEX_BLUEPRINT_V1

lane: JOB_RESTORE
verified_executable_capability_delta: YES

## Current source
- owning_repo: GlacierEQ/job-application
- source_branch: main
- source_sha_before_cycle: 190ca6687ef354c75c1d5baacc27177af68d6e4e
- selected_pr: #209
- exact_proven_head: d5f1a5d6ce61c723d65dfc8de07ab19d4007ea98
- exact_head_merge_sha: 85c8175c652507c5e4295b7dfe41c8fed5506ac9
- production_runtime: tools/build_applicant_decision_inventory.py
- production_runtime_blob: c41a8ced429d708612b1920e4c2a6372086c510d
- post_merge_readback: PASS

## Donor / composition lineage
- maintained CandidateProfile/live xAI composition: PR #204
- live evidence-bound review: PR #205
- explicit evidence-review confirmation bridge: PR #206
- exact live Greenhouse field/opening binding: PR #207
- single reviewed-field applicant decision packet: PR #208
- immediate donor merge: 8abc5819ed3ee1d1bd695a4ad3234d83cf28fd8d

## Selected priority
- tier: P1
- priority: generalize the applicant decision surface from the exceptional-work singleton to every live applicant-controlled Greenhouse prompt without inventing unresolved values.

## Mechanisms compared
1. Preserve the singleton packet only: rejected because other live prompts remain hidden residual state.
2. Generate generic evidence prose for every field: rejected because evidence suitable for exceptional-work does not establish applicant intent for arbitrary prompts.
3. Selected nonlinear composition: retain the proven evidence-bound decision for the reviewed exceptional-work field and enumerate every other exact live provider field as APPLICANT_INPUT_REQUIRED with no proposed value or synthetic confirmation.

## Implemented executable delta
- Added tools/build_applicant_decision_inventory.py.
- Enumerates the complete ordered live prompt set while preserving application_id, opening_id, exact provider field_name, and label.
- Reuses PR #208's evidence-bound reviewed decision unchanged for the exceptional-work field.
- Marks all other prompts APPLICANT_INPUT_REQUIRED with proposed_text=null, confirmation_template=null, and no fabricated evidence.
- Rejects duplicate live field identities and reviewed/live identity drift.
- Produces deterministic SHA-256 inventory receipts and atomic output replacement.
- Supports direct CLI execution.
- Added tests/test_applicant_decision_inventory.py and target-native proof on Python 3.11/3.12/3.13.

## Preserved gains / no-loss invariants
- PRs #204-#208 remain intact and composed rather than replaced.
- Applicant controls every unresolved value and every confirmation.
- No unreviewed value is inferred.
- No reviewed edit bypasses a fresh evidence review.
- No opening_id or field_name drift is accepted.
- No external application submission occurs.

## Tests / runtime proof
- Initial head dcc5271a81460c864145cef3c53859fb72e7b079: focused runtime tests passed on Python 3.11/3.12/3.13, while strict CI correctly exposed Ruff formatter drift.
- Refined exact head: d5f1a5d6ce61c723d65dfc8de07ab19d4007ea98.
- Applicant Decision Inventory Proof run 32306500376: PASS.
- Python 3.11 job 96240296770: PASS compile + adversarial inventory/packet tests + direct CLI.
- Python 3.12 job 96240296585: PASS same path.
- Python 3.13 job 96240296911: PASS same path.
- strict repository CI run 32306500857: PASS.
- Portfolio truth gate run 32306500334: PASS.
- APEX Estate Non-Regression run 32306500846: PASS.
- exact-head squash merge: 85c8175c652507c5e4295b7dfe41c8fed5506ac9.
- post-merge runtime readback: PASS, blob c41a8ced429d708612b1920e4c2a6372086c510d.

## Blocked higher candidate
- P1 ready_for_human_submission=true remains dependent on explicit applicant-controlled values for unresolved fields; this cycle did not infer those values.

## Top 3 remaining priorities
1. P1: add a reviewed direct-input binding path for applicant-supplied values on non-generated live fields, with exact application/opening/field identity and deterministic receipts, so the inventory can compile to a complete human-submission package after explicit input.
2. P1: feed the real current live xAI preparation artifact through build_applicant_decision_inventory.py and expose only the current unresolved decisions in the live workflow artifact set.
3. P2: recover the highest live-verified STILL_STRANDED/CURRENTLY_MISSING job-ecosystem capability in its owning repository with donor lineage and target-native proof.

## Next sequence
1. Introduce an explicit applicant-value artifact schema for APPLICANT_INPUT_REQUIRED fields.
2. Verify each value against application_id, opening_id, and exact provider field_name; reject stale or duplicate bindings.
3. Compose reviewed generated answers and explicit direct-input answers into the existing semantic Greenhouse bridge.
4. Require every live applicant-controlled field resolved before ready_for_human_submission=true.
5. Preserve the existing external human-submission gate.

## Merge / deploy gate
- PR #209 merged only at exact tested head d5f1a5d6ce61c723d65dfc8de07ab19d4007ea98.
- Focused Python 3.11/3.12/3.13 proof, strict CI, portfolio truth, and estate non-regression passed before merge.
- Post-merge production runtime was read back from merge SHA 85c8175c652507c5e4295b7dfe41c8fed5506ac9.

## Rollback
Revert merge 85c8175c652507c5e4295b7dfe41c8fed5506ac9 to remove the multi-field inventory runtime/tests/workflow while preserving PRs #204-#208.

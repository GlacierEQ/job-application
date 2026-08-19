# APEX_BLUEPRINT_V1

lane: JOB_RESTORE
verified_executable_capability_delta: YES

## Current source
- owning_repo: GlacierEQ/job-application
- source_branch: main
- source_sha_before_cycle: db5d1d285a2d97e6f9bc8b0751232c838296d7f3
- exact_proven_head: b984612e4022e982f49ece8713b8483bfad51a2e
- exact_head_merge_sha: 1475a7527c1fd856f335c0523d90fbf76f89bfdf
- selected_pr: #211
- production_runtime: tools/compose_applicant_submission_package.py
- production_runtime_blob: 347df6d2a84af427f8499e2fdfe719126ea9a61b
- production_test_blob: e98b9e92f3d3647b4cc27e5b0ce079c182fddb1c
- post_merge_readback: PASS

## Donor / composition lineage
- maintained CandidateProfile/live xAI composition: PR #204
- evidence-bound live application review: PR #205
- explicit evidence-review confirmation: PR #206
- exact Greenhouse field/opening binding: PR #207
- applicant decision packet: PR #208
- complete live decision inventory: PR #209
- direct applicant-input binding runtime on main before cycle: db5d1d285a2d97e6f9bc8b0751232c838296d7f3

## Selected priority
- tier: P1
- priority: compose explicit applicant direct inputs and explicitly confirmed evidence-reviewed generated answers into one complete live-field semantic source that can truthfully become ready_for_human_submission=true without external submission.

## Mechanisms compared
1. Keep direct-input and confirmed-review semantic sources separate: rejected because no artifact proves complete live-field resolution.
2. Let either source fill missing fields heuristically: rejected because it could infer applicant intent or cross authority boundaries.
3. Selected nonlinear composition: verify both source receipts and exact application/opening/provider identities, require complete state-specific coverage, preserve live field order, and emit one bridge-consumable package only after every live applicant field is explicitly resolved.

## Implemented executable delta
- Added tools/compose_applicant_submission_package.py.
- Verifies deterministic receipts for inventory, direct-input binding, and confirmed-review semantic source.
- Requires exact application_id/opening_id identity across all three artifacts.
- Requires direct binding to reference the exact decision-inventory receipt.
- Requires exact set coverage for every APPLICANT_INPUT_REQUIRED and APPLICANT_CONFIRMATION_REQUIRED field; partial, duplicate, extra, stale, or unknown coverage fails closed.
- Requires the confirmed evidence-review receipt and accepted generated text to match the reviewed decision exactly; edited text requires a new evidence review.
- Preserves decision-inventory provider field order in the final semantic answers.
- Emits READY_FOR_HUMAN_SUBMISSION and ready_for_human_submission=true only after complete explicit resolution.
- Output is directly consumable by tools/greenhouse_semantic_answer_bridge.py.
- No external submission is performed; the human submission gate remains explicit.
- Added seven adversarial composition tests including direct Greenhouse bridge consumption.
- Added Python 3.11/3.12/3.13 target-native proof workflow and widened it across the complete authority lineage.
- Repaired formatter drift in the new runtime/tests and the immediately preceding direct-input test before final proof.

## Preserved gains / no-loss invariants
- CandidateProfile, live xAI review, confirmation, decision packet, inventory, direct-input binding, and Greenhouse bridge remain composed rather than replaced.
- Applicant controls every direct value and every generated-answer confirmation.
- No value or confirmation is inferred.
- Edited evidence-reviewed prose cannot enter the package without a new review.
- No opening_id or provider field_name drift is accepted.
- No external submission occurs in this runtime.

## Tests / runtime proof
- Initial proof head 5d67f73adcbaeebffd313728adf0f6a979c04dad: dedicated executable proof PASS and estate non-regression PASS; strict CI exposed formatter-only drift.
- Formatter repair landed on main through commits 33526a928b205610d7b9fa152e92211fd7a1957f, 6b33eaf76b91a9790c1d45024b13d6feeec914e1, and 310d6a0279c5eff1d511b8b9e9a2231d7b35deff.
- Final exact proof head: b984612e4022e982f49ece8713b8483bfad51a2e.
- Applicant Submission Package Proof run 32310455363: PASS.
- Python 3.11 job 96252188962: PASS compile + full authority-lineage adversarial tests + direct CLI.
- Python 3.12 job 96252188992: PASS same path.
- Python 3.13 job 96252188798: PASS same path.
- strict CI run 32310455861: PASS.
- APEX Estate Non-Regression run 32310455901: PASS.
- exact-head squash merge: 1475a7527c1fd856f335c0523d90fbf76f89bfdf.

## Blocked higher candidates
- none observed above this P1 in the live queue.

## Top 3 remaining priorities
1. P1: feed the real current live xAI preparation, direct applicant-input artifact, and explicit review confirmation through the complete composer and Greenhouse bridge to produce the current real human-submission package artifact.
2. P1: generalize confirmed generated-answer coverage beyond the current evidence-reviewed singleton when additional fields have independently reviewed generated answers, preserving per-field review receipts and explicit applicant confirmation.
3. P2: recover the highest live-verified STILL_STRANDED/CURRENTLY_MISSING job-ecosystem capability from Git history, stale PRs, or donor repositories with target-native executable proof.

## Exact continuation targets
- tools/compose_applicant_submission_package.py: compose_submission_package, _verify_receipt, _answer_map, _decision_inventory
- tools/bind_applicant_direct_inputs.py: bind_direct_inputs
- tools/confirm_evidence_bound_review.py: build_semantic_answer_source
- tools/greenhouse_semantic_answer_bridge.py: compile_answer_source
- tests/test_compose_applicant_submission_package.py
- .github/workflows/applicant-submission-package-proof.yml

## Next sequence
1. Obtain the current live xAI preparation artifact from the existing live workflow surface.
2. Build the current decision inventory and bind only explicit applicant direct inputs.
3. Promote only an explicit applicant confirmation of the exact evidence-reviewed generated text.
4. Compose the three exact-bound artifacts and require complete field coverage.
5. Pass the resulting package through the Greenhouse semantic bridge and preserve the external human submission gate.

## Merge / deploy gate
- Exact proof head b984612e4022e982f49ece8713b8483bfad51a2e passed dedicated Python 3.11/3.12/3.13 proof, strict CI, and estate non-regression before merge.
- PR #211 merged only with expected_head_sha pinned to b984612e4022e982f49ece8713b8483bfad51a2e.
- No external job submission occurred.

## Rollback
Revert merge 1475a7527c1fd856f335c0523d90fbf76f89bfdf and the preceding composer/runtime commits if removal is required; preserve PRs #204-#210 and the prior application path.

## No-loss invariants
- Never infer applicant values or confirmation.
- Never promote edited reviewed prose without a fresh evidence review.
- Never accept stale inventory, opening_id, application_id, or field_name identity.
- Never report ready_for_human_submission=true unless every live applicant-controlled field has an explicit authorized resolution.
- Preserve the human-controlled external submission gate.

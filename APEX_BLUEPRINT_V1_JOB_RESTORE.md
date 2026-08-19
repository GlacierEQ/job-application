# APEX_BLUEPRINT_V1

lane: JOB_RESTORE
verified_executable_capability_delta: YES

## Current source
- owning_repo: GlacierEQ/job-application
- executable_source_sha_before_handoff: 9c91b76ba90c033cdfffb609de191e972587b502
- primary_runtime_blob: 1b80bc8d67ca43f2fe6d5a4c7627c94d4def0e04
- source_file: tools/greenhouse_semantic_answer_bridge.py
- tests_file: tests/test_greenhouse_semantic_answer_bridge.py
- proof_workflow: .github/workflows/greenhouse-semantic-answer-bridge-proof.yml

## Donor / continuation lineage
- GlacierEQ/job-app-helix exact runtime: 725e785453ab01350d7b273c94ddb4dac70501af
- Greenhouse preparation contract donor: src/job_app_helix/greenhouse_application_preparation.py
- prior production xAI final-review head before this cycle: 0dd25b167f4196a8abe9fbd08e214caf961478f1
- prior live application workflow merge: d09d5beb4d67ee4e3810c006e7bca5d1461b8fcc

## Selected priority
- tier: P1
- priority: Remove opaque Greenhouse field-ID brittleness from applicant-confirmed answers so one stable applicant answer source can survive provider question-ID changes while still binding only to the current live form.

## Higher candidate blocked
- A complete xAI `ready_for_human_submission=true` package remains higher-value, but nine live applicant-controlled values were not available as explicit confirmed source values in this execution context. They were not inferred or fabricated.

## Displaced capability / bottleneck
The existing Helix preparation runtime already accepts exact `field_name` applicant answers, but live Greenhouse custom-question names are opaque and can change between postings. Persisting raw provider field IDs therefore makes reusable applicant-confirmed answers brittle and risks binding a value to a stale form identity.

## Implemented delta
`greenhouse_semantic_answer_bridge.py` compiles stable semantic applicant intents into the exact current Greenhouse field names. It:
- matches against current live label + field identity with regex and optional field-type constraints;
- requires exactly one live match per semantic key and fails closed on zero/multiple matches;
- refuses hidden and file-upload provider fields;
- normalizes select answers against the current provider options;
- preserves applicant provenance plus hashes of both the live field bundle and semantic source;
- emits direct `--applicant-answer-source` input for `job-app-helix-greenhouse-prepare`;
- emits deterministic bindings and a receipt hash.

## Mechanisms compared
1. Persist raw Greenhouse field names: lowest implementation cost, rejected because opaque IDs drift.
2. Hard-code xAI-specific question IDs/labels in the workflow: stronger short-term coupling, rejected because it creates employer-specific brittle logic.
3. Nonlinear composition selected: stable semantic answer intents + current live form discovery + exact one-to-one runtime binding + provider option normalization. This preserves applicant intent while provider identity stays live-bound.

## Preserved gains
- Existing xAI live target discovery, CandidateProfile compilation, Greenhouse preparation, resume attachment hashing, and finalization remain untouched.
- Human submission/review gate remains intact.
- No applicant value is inferred.
- Provider hidden/file fields cannot be overridden by this bridge.
- Exact Helix runtime remains pinned by the live production workflow.

## Tests / runtime proof
- PR #200 executable implementation merged: 6ef4d21a3ee1741f76daccbd6c1fc2cda8f7a375.
- Initial dedicated proof run 32219125584: PASS on Python 3.11 / 3.12 / 3.13.
- Repository-wide strict CI exposed two style defects after the first merge; refinement was isolated and fixed without weakening behavior.
- PR #201 refinement exact head: 01e60ed6806150168112efe53b15ce879cfb3c25.
- Dedicated proof run 32219368627: PASS on Python 3.11 / 3.12 / 3.13.
- Repository-wide CI run 32219368871: PASS, including Ruff check, Ruff format check, compileall, and pytest.
- Refinement merge: 9c91b76ba90c033cdfffb609de191e972587b502.
- Post-merge readback confirmed runtime blob 1b80bc8d67ca43f2fe6d5a4c7627c94d4def0e04 on main.

## Exact target functions
- `compile_answer_source`
- `_live_fields`
- `_semantic_answers`
- `_matches`
- `_normalize_option`

## Next sequence
1. Bind explicit confirmed applicant values to stable semantic keys for the nine unresolved xAI fields.
2. Compile those semantic values against the current live `GREENHOUSE_APPLICATION_FIELDS.json`.
3. Re-run `job-app-helix-greenhouse-prepare` using the compiled answer source.
4. Re-run finalization and require `ready_for_human_submission=true` without external submission.
5. Preserve resulting hashes and the final human-review package.

## Top 3 remaining priorities
1. P1: produce the real xAI `ready_for_human_submission=true` package from explicit applicant-confirmed values using this bridge; do not submit externally.
2. P2: execute the first real stranded repository-family restoration through the manifestless exact-SHA federated restoration stack and prove recovered native behavior.
3. P2: generalize semantic applicant-answer binding across additional attributable ATS providers while preserving provider-native option and field identity checks.

## Merge / deploy gate
- Executable gate passed: dedicated 3-version proof + repository-wide strict CI + exact-head PR merge + main readback.
- No external job submission occurred.

## Rollback
Revert merge `9c91b76ba90c033cdfffb609de191e972587b502` and predecessor implementation merge `6ef4d21a3ee1741f76daccbd6c1fc2cda8f7a375` if the semantic bridge must be removed. Existing pinned Helix live xAI workflow remains independently operable.

## No-loss invariants
- Never infer applicant-controlled answers.
- Never bind semantic answers when live matching is ambiguous.
- Never override hidden or file-upload provider fields through semantic text answers.
- Never bypass current live option validation.
- Preserve provenance and source hashes for each compiled answer set.
- Preserve current application-ready/final-review workflow and human submission gate.

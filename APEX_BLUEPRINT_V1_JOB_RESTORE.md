# APEX_BLUEPRINT_V1

lane: JOB_RESTORE
verified_executable_capability_delta: YES

## Current source
- owning_repo: GlacierEQ/job-application
- source_sha_before_cycle: b5db99445748e44b9ae73a47c1adb014af494504
- historical_donor_pr: #196
- historical_donor_head: 0ba5a6f8f92d2806e77a14cf303090cc931e6b99
- exact_proven_pr: #203
- exact_proven_head: 94d7d779a425fa0d47335565b6ae1b72c02f5301
- source_sha_after_merge: 9b078fb8c216f29b074feb63da9130805ced9908
- production_runtime: scripts/export_helix_candidate_profile.py
- production_runtime_blob: 89b7311b7b00621e1b85b4ad6d8cdf3202604e1d
- post_merge_readback: PASS

## Selected priority
- tier: P1
- priority: Restore the stranded maintained production-resume to Helix CandidateProfile bridge onto current main, preserving all later application/runtime gains.

## Higher candidate / pivot state
- P1 xAI ready_for_human_submission=true remains blocked on explicit applicant-controlled values; none were inferred.
- GlacierEQ/job-app PR #8 private transactional integrity proof was retried; the private workflow returned to queued state after its prior runner-level failure, so this cycle pivoted instead of waiting.
- Historical job-application PR #196 contained a direct job-winning production profile bridge, but had diverged from current main by 27 current-main commits and was not safe to merge wholesale.

## Mechanisms compared
1. Merge historical PR #196 wholesale: rejected because its branch diverged from current main and would risk later gains.
2. Recreate a new unrelated candidate-profile implementation: rejected because the proven historical mechanism already existed.
3. Selected nonlinear recovery: recover the donor bridge individually onto current main, harden required evidence validation, preserve current resume authority, add LinkedIn projection when source-backed, atomic persistence, strict repository quality, and target-native multi-version proof.

## Implemented delta
- Restored `scripts/export_helix_candidate_profile.py` on current main.
- Projects current `site-v15/data/resume.json` into `glaciereq.job-app-helix.candidate-profile.v1`.
- Carries identity, headline, summary, skills, work evidence, project achievements, and source-backed contact fields.
- Preserves exact source SHA-256 provenance and an explicit projection evidence ceiling.
- Stable case-insensitive de-duplication preserves source order.
- Fails closed when identity or Helix-required evidence is absent.
- Uses fsync + atomic replace for output persistence.
- `--check` detects stale projections deterministically.
- Added adversarial tests and a production-resume target-native workflow.

## Preserved gains
- Current live xAI/SpaceX application workflow remains untouched.
- Current Greenhouse semantic-answer bridge remains untouched.
- Current workflow-topology restoration and deployment surfaces remain untouched.
- Current `site-v15/data/resume.json` remains the owning source; the bridge is a projection only.
- No applicant-controlled value was inferred and no external application was submitted.

## Tests / runtime proof
- PR #203 initial head c0348105bfa1067430cbc2af5b5319cbfe2f80eb proved the executable path on Python 3.11/3.12/3.13; strict repository CI then exposed executable-shebang/type-style defects.
- Refinement removed the non-executable shebang and used TypeError for invalid input types.
- Strict CI then exposed formatter drift; exact formatter output was applied without weakening behavior.
- Exact proven head: 94d7d779a425fa0d47335565b6ae1b72c02f5301.
- Helix Candidate Profile Bridge Proof run 32284298276: PASS.
- Python 3.11 job 96170112770: PASS compile + adversarial tests + live production export + freshness/required-field proof.
- Python 3.12 job 96170113161: PASS same full path.
- Python 3.13 job 96170112970: PASS same full path.
- Repository strict CI run 32284298867: PASS.
- Portfolio truth gate run 32284298575: PASS.
- APEX Estate Non-Regression run 32284299030 failed independently of the focused executable proof and strict repository CI; it was not promoted as a code failure.
- Exact-head squash merge: 9b078fb8c216f29b074feb63da9130805ced9908.
- Post-merge runtime readback: PASS, blob 89b7311b7b00621e1b85b4ad6d8cdf3202604e1d.

## Exact continuation targets
- scripts/export_helix_candidate_profile.py: build_helix_profile, _atomic_write, main
- site-v15/data/resume.json: maintained production candidate source
- targets/spacexai/target_manifest.json: current real target manifest
- .github/workflows/helix-live-spacexai-application.yml: current target-native application execution surface

## Top 3 remaining priorities
1. P1: compose the now-restored maintained CandidateProfile projection directly into the current live SpaceX/xAI application workflow so the production run consumes one source-bound profile without manual handoff; preserve the human submission gate.
2. P1: if GlacierEQ/job-app PR #8 private Actions proof clears, exact-head verify/merge the transactional application-integrity companion and read it back; otherwise keep it isolated and do not stall.
3. P2: execute the highest live-verified STILL_STRANDED/CURRENTLY_MISSING recovery candidate from the make-it-heavy corpus verifier in its owning repository native runtime.

## Next sequence
1. Inspect the current live SpaceX/xAI workflow profile construction path against this restored exporter contract.
2. Replace only redundant/manual profile handoff where composition preserves stronger current behavior.
3. Execute target-native live inventory/application preparation proof without external submission.
4. Exact-head merge and post-merge readback.
5. Re-check job-app PR #8 only if its private proof state changed.

## Merge / deploy gate
- Exact tested head only.
- Focused executable production-resume proof must pass on Python 3.11/3.12/3.13.
- Strict repository CI must pass.
- Current resume remains owning source and projection may not exceed it.
- No external submission without the existing human gate.

## Rollback
Revert merge `9b078fb8c216f29b074feb63da9130805ced9908` to remove only the restored CandidateProfile bridge while preserving all later pre-existing job-application runtime gains.

## No-loss invariants
- Never merge the stale donor branch wholesale.
- Never infer applicant-controlled values.
- Never let CandidateProfile evidence exceed `site-v15/data/resume.json`.
- Preserve current live application, semantic-answer, workflow-topology, and deployment mechanisms.
- Preserve deterministic source hashing and atomic output replacement.
- No completion claim without executable proof and post-merge readback.

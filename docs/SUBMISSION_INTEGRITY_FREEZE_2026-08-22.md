# Submission Integrity Freeze — 2026-08-22 HST

Status: **ACTIVE / FAIL-CLOSED**

## Incident

The SpaceXAI Greenhouse workflow can build a rich upstream application state and packet tree, then narrow the provider-facing attachment surface to exactly one file (`RESUME_ATS.md`). The prior workflow asserted that one attachment was expected while separately deriving `ready_for_human_submission` from unresolved form fields.

That is not sufficient proof that the intended application package survived the handoff.

## Controlling distinction

The following states are separate and must never be collapsed:

1. `APPLICATION_READY` — upstream application materials and evidence are assembled.
2. `PROVIDER_FIELDS_RESOLVED` — required provider form fields have answers.
3. `PROVIDER_ARTIFACT_SET_VERIFIED` — the intended externally submitted artifact set is explicitly declared, hashed, and matched to what the provider will accept.
4. `SUBMITTED_VERIFIED` — an external receipt/readback proves the accepted artifact identities and binds them to the intended artifact-set digest.

`APPLICATION_READY != PROVIDER_ARTIFACT_SET_VERIFIED != SUBMITTED_VERIFIED`.

## Immediate law

- A one-file provider attachment set may not inherit the richness or completeness of the upstream application packet.
- `ready_for_human_submission` from provider field resolution is not authority to claim provider submission readiness.
- HTTP success, local finalization, artifact upload to GitHub Actions, or an opaque provider/application reference are not submission proof.
- Destination limitations are explicit blockers. They are never permission to silently discard application artifacts.
- The workflow may continue to collect live provider schema, compile form answers, hash the resume attachment, and emit diagnostics while the freeze is active.
- No external submission is performed by this workflow while the freeze is active.

## Unfreeze requirements

Before any provider path may claim submission readiness or submission:

1. Declare the intended external artifact set before handoff.
2. Hash every intended artifact and compute one canonical artifact-set digest.
3. Resolve the provider's actual attachment/file-field capacity.
4. Map every intended artifact to an accepted provider field or explicitly record why it cannot be submitted.
5. Fail closed when any intended artifact is omitted, transformed, merged, or replaced without an explicit reviewed rule.
6. Verify the external accepted artifact identities after handoff, where the provider exposes such evidence.
7. Bind the external receipt/reference to the exact artifact-set digest.

## ECHO disposition

ECHO is **not causal on this submission path**. The provider collapse is visible directly in the job-application Greenhouse workflow and the Helix application adapter/state transition path. Removing ECHO would not repair these boundaries.

## Provenance

The concrete provider narrowing was present in `.github/workflows/helix-live-spacexai-application.yml`, where the attachment source contained one `RESUME_ATS.md` entry and the prior integrity step asserted `len(attachments) == 1`.

The related Helix submission-state defect originated in Job-App Helix PR #171, where a single JSON request body could receive HTTP success and `SUBMITTED`, and an opaque external reference could independently promote lifecycle state.

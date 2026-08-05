# V17 Resume Integration Trigger

**Repository:** `GlacierEQ/job-application`  
**Release branch:** `release/v16-signal-architecture`  
**V17 merge commit:** `0ba50fe653fd235ec6d1698ecd7cd21e35e243c7`  
**Generator Ruff cure commit:** `a06453e7ba32ea46fb500336ada0ce1b0e2e5e2b`  
**Finalizer formatting commit:** `2ca05d2bdeb2fb60d9eda6a173747be4f7eddec3`  
**State at creation:** `FULL_EXACT_HEAD_CI_TRIGGERED`

V17 Resume Intelligence is integrated into the V16 website release branch. The source-hygiene cures:

- corrected import ordering in `.github/scripts/v17_compact_and_finalize.py`;
- removed two unused imports from `site-v15/scripts/generate-resume-v17.py`;
- formatted both generator helpers with Ruff `0.16.1`;
- formatted `.github/scripts/v17_finalize_artifacts.py` under the repository-wide Ruff contract;
- reran the V16 and V17 deterministic validators successfully before the first cure commit;
- removed the temporary one-shot workflow after use.

The validated PDF, DOCX, ATS, JSON, HTML, and CSS artifacts were not regenerated or modified by the lint and formatting cures. Their committed identities remain governed by `site-v15/data/resume-artifacts.json` and the V17 exact-head validator.

This connector-authored receipt exists to trigger the repository's complete pull-request CI stack on the integrated, fully formatted release branch. It does not claim that those new runs passed until GitHub records their conclusions.

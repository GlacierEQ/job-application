'use strict';

// GENERATED from config/workflow-verification-sources.json. Do not hand-edit.
const REGISTRY = {
  "GlacierEQ/AKOS": {
    "workflow_names": [
      "APEX Estate Non-Regression"
    ],
    "workflow_paths": [
      ".github/workflows/apex-estate-non-regression.yml"
    ],
    "branch_policy": "default_or_pull_request"
  },
  "GlacierEQ/job-app-helix": {
    "workflow_names": [
      "CI",
      "Helix Candidate Profile Proof"
    ],
    "workflow_paths": [
      ".github/workflows/ci.yml",
      ".github/workflows/candidate-profile-compiler-proof.yml"
    ],
    "branch_policy": "default_or_pull_request"
  },
  "GlacierEQ/job-application": {
    "workflow_names": [
      "CI",
      "APEX Recruiter Proof Brief",
      "APEX Estate Non-Regression",
      "Portfolio truth gate"
    ],
    "workflow_paths": [
      ".github/workflows/ci.yml",
      ".github/workflows/apex-recruiter-proof-brief.yml",
      ".github/workflows/apex-estate-non-regression.yml",
      ".github/workflows/portfolio-verify.yml"
    ],
    "branch_policy": "default_or_pull_request"
  },
  "GlacierEQ/pro-code": {
    "workflow_names": [
      "Pro-Code native verification"
    ],
    "workflow_paths": [
      ".github/workflows/ci.yml"
    ],
    "branch_policy": "default_or_pull_request"
  },
  "GlacierEQ/Pro-DOCTOR-STRANGE": {
    "workflow_names": [
      "verify",
      "Verification",
      "CI"
    ],
    "workflow_paths": null,
    "branch_policy": "default_or_pull_request"
  },
  "GlacierEQ/sigma-glue": {
    "workflow_names": [
      "verify"
    ],
    "workflow_paths": [
      ".github/workflows/ci.yml"
    ],
    "branch_policy": "default_or_pull_request"
  },
  "GlacierEQ/the-tower-of-babel": {
    "workflow_names": [
      "Tower Verification"
    ],
    "workflow_paths": [
      ".github/workflows/tower.yml"
    ],
    "branch_policy": "default_or_pull_request"
  },
  "GlacierEQ/xai-colossus-2": {
    "workflow_names": [
      "CI"
    ],
    "workflow_paths": [
      ".github/workflows/ci.yml"
    ],
    "branch_policy": "default_or_pull_request"
  }
};

function deepFreeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) deepFreeze(child);
  return Object.freeze(value);
}

module.exports = deepFreeze(REGISTRY);

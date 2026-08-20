import assert from 'node:assert/strict';
import test from 'node:test';

import {
  LiveRecruiterGapAnalysisError,
  analyzeRecruiterGaps,
} from '../tools/live-recruiter-gap-analysis.mjs';

function matrix() {
  const freshSha = 'a'.repeat(40);
  const staleSha = 'b'.repeat(40);
  return {
    schema: 'glaciereq.live-recruiter-role-matrix.v1',
    as_of: '2026-08-21T00:00:00.000Z',
    receipt_sha256: 'c'.repeat(64),
    freshness_receipt_sha256: 'd'.repeat(64),
    verification_passes: 1,
    coverage: { verified_systems: 3, unverified_systems: 1 },
    roles: {
      recruiter: [
        {
          flow_id: 'application-flow',
          name: 'Application flow',
          score: 10,
          proof_points: [
            {
              system_id: 'job-application',
              repository: 'https://github.com/GlacierEQ/job-application',
              role_weight: 8,
              freshness_weight: 1,
              freshness_state: 'fresh',
              age_days: 1,
              commit_sha: freshSha,
              verified_at: '2026-08-20T00:00:00.000Z',
              verification_workflow: 'CI',
              verification_run_id: 100,
            },
            {
              system_id: 'helix',
              repository: 'https://github.com/GlacierEQ/helix',
              role_weight: 7,
              freshness_weight: 0.2,
              freshness_state: 'stale',
              age_days: 500,
              commit_sha: staleSha,
              verified_at: '2025-04-08T00:00:00.000Z',
              verification_workflow: 'Helix Proof',
              verification_run_id: 90,
            },
            {
              system_id: 'receipt-router',
              repository: 'https://github.com/GlacierEQ/portfolio-receipt-router',
              role_weight: 5,
              freshness_weight: 0,
              freshness_state: 'unverified',
              age_days: null,
              commit_sha: null,
              verified_at: null,
              verification_workflow: null,
              verification_run_id: null,
            },
          ],
        },
      ],
      'engineering-lead': [
        {
          flow_id: 'runtime-flow',
          name: 'Runtime flow',
          score: 8,
          proof_points: [
            {
              system_id: 'pro-code-runtime',
              repository: 'https://github.com/GlacierEQ/pro-code',
              role_weight: 8,
              freshness_weight: 0.85,
              freshness_state: 'aging',
              age_days: 60,
              commit_sha: freshSha,
              verified_at: '2026-06-22T00:00:00.000Z',
              verification_workflow: 'Pro Code Proof',
              verification_run_id: 80,
            },
          ],
        },
      ],
      'systems-architect': [
        {
          flow_id: 'architecture-flow',
          name: 'Architecture flow',
          score: 9,
          proof_points: [
            {
              system_id: 'akos',
              repository: 'https://github.com/GlacierEQ/AKOS',
              role_weight: 8,
              freshness_weight: 1,
              freshness_state: 'fresh',
              age_days: 2,
              commit_sha: freshSha,
              verified_at: '2026-08-19T00:00:00.000Z',
              verification_workflow: 'AKOS Proof',
              verification_run_id: 70,
            },
          ],
        },
      ],
    },
  };
}

test('high-value missing and stale evidence become explicit recruiter score recovery targets', () => {
  const result = analyzeRecruiterGaps(matrix());
  assert.equal(result.schema, 'glaciereq.live-recruiter-gap-analysis.v1');
  assert.match(result.receipt_sha256, /^[a-f0-9]{64}$/);
  assert.equal(result.roles.recruiter.opportunity_count, 2);
  assert.equal(result.roles.recruiter.top_opportunities[0].system_id, 'helix');
  assert.equal(result.roles.recruiter.top_opportunities[0].recoverable_score, 5.6);
  assert.equal(result.roles.recruiter.top_opportunities[1].system_id, 'receipt-router');
  assert.equal(result.roles.recruiter.top_opportunities[1].recoverable_score, 5);
  assert.equal(result.roles['engineering-lead'].top_opportunities[0].recoverable_score, 1.2);
  assert.equal(result.roles['systems-architect'].opportunity_count, 0);
});

test('fresh proof never creates decorative work', () => {
  const input = matrix();
  input.roles.recruiter[0].proof_points = input.roles.recruiter[0].proof_points.slice(0, 1);
  const result = analyzeRecruiterGaps(input);
  assert.equal(result.roles.recruiter.opportunity_count, 0);
  assert.equal(result.roles.recruiter.total_recoverable_score, 0);
});

test('duplicate systems across flows are deduplicated at their strongest recoverable score', () => {
  const input = matrix();
  input.roles.recruiter.push({
    flow_id: 'second-flow',
    name: 'Second flow',
    score: 9,
    proof_points: [{
      ...input.roles.recruiter[0].proof_points[1],
      freshness_weight: 0.4,
      freshness_state: 'stale',
      age_days: 300,
    }],
  });
  const result = analyzeRecruiterGaps(input);
  const helix = result.roles.recruiter.top_opportunities.filter((entry) => entry.system_id === 'helix');
  assert.equal(helix.length, 1);
  assert.equal(helix[0].recoverable_score, 5.6);
});

test('analysis is deterministic for an exact role matrix', () => {
  const first = analyzeRecruiterGaps(matrix());
  const second = analyzeRecruiterGaps(matrix());
  assert.deepEqual(first, second);
});

test('invalid matrix identity fails closed', () => {
  const input = matrix();
  input.receipt_sha256 = 'bad';
  assert.throws(
    () => analyzeRecruiterGaps(input),
    (error) => error instanceof LiveRecruiterGapAnalysisError && /gap_matrix_receipt/.test(error.message),
  );
});

test('invalid commit identity is rejected before prioritization', () => {
  const input = matrix();
  input.roles.recruiter[0].proof_points[1].commit_sha = 'abc123';
  assert.throws(() => analyzeRecruiterGaps(input), /gap_commit_sha:recruiter:helix/);
});

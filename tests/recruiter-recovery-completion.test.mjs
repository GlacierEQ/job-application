import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import test from 'node:test';

import {
  RecruiterRecoveryCompletionError,
  buildRecoveryCompletion,
} from '../tools/recruiter-recovery-completion.mjs';

function stableStringify(value) {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

function signed(payload) {
  return {
    ...payload,
    receipt_sha256: crypto.createHash('sha256').update(stableStringify(payload)).digest('hex'),
  };
}

function opportunity(systemId, recoverableScore, freshnessWeight, overrides = {}) {
  return {
    role: 'recruiter',
    flow_id: 'opportunity-to-evidence-package',
    flow_name: 'Opportunity to evidence package',
    system_id: systemId,
    repository: `https://github.com/GlacierEQ/${systemId}`,
    role_weight: 8,
    freshness_weight: freshnessWeight,
    freshness_state: freshnessWeight >= 1 ? 'fresh' : freshnessWeight >= 0.65 ? 'aging' : 'stale',
    age_days: freshnessWeight >= 1 ? 1 : 220,
    current_commit_sha: 'a'.repeat(40),
    verified_at: '2026-08-01T00:00:00Z',
    verification_workflow: 'Proof',
    verification_run_id: 123,
    recoverable_score: recoverableScore,
    action: 'refresh exact verification evidence on the owning repository',
    ...overrides,
  };
}

function snapshot(asOf, opportunities) {
  const core = {
    schema: 'glaciereq.live-recruiter-gap-analysis.v1',
    release: 'fixture',
    source_matrix_schema: 'glaciereq.public-recruiter-role-matrix.v1',
    as_of: asOf,
    matrix_receipt_sha256: 'b'.repeat(64),
    freshness_receipt_sha256: 'c'.repeat(64),
    coverage: { verified_systems: 4, unverified_systems: 0 },
    policy: 'fixture',
    roles: {
      recruiter: {
        current_top_flow: 'opportunity-to-evidence-package',
        current_top_score: 20,
        total_recoverable_score: opportunities.reduce((sum, item) => sum + item.recoverable_score, 0),
        opportunity_count: opportunities.length,
        top_opportunities: opportunities,
      },
    },
    global_top_opportunities: opportunities,
  };
  return signed(core);
}

test('tracks resolved, improved, open, regressed, and newly introduced recovery work', () => {
  const baseline = snapshot('2026-08-20T00:00:00Z', [
    opportunity('resolved-system', 6, 0.25),
    opportunity('improved-system', 4, 0.5),
    opportunity('open-system', 2, 0.75),
    opportunity('regressed-system', 1, 0.875),
  ]);
  const current = snapshot('2026-08-21T00:00:00Z', [
    opportunity('improved-system', 1, 0.875, { current_commit_sha: 'd'.repeat(40), verified_at: '2026-08-20T18:00:00Z' }),
    opportunity('open-system', 2, 0.75),
    opportunity('regressed-system', 3, 0.625),
    opportunity('new-system', 5, 0.375),
  ]);

  const result = buildRecoveryCompletion(baseline, current);
  assert.equal(result.summary.resolved_count, 1);
  assert.equal(result.summary.improved_count, 1);
  assert.equal(result.summary.open_count, 1);
  assert.equal(result.summary.regressed_count, 1);
  assert.equal(result.summary.new_count, 1);
  assert.equal(result.summary.recovered_score, 9);
  assert.equal(result.summary.remaining_recoverable_score, 11);
  assert.equal(result.resolved[0].system_id, 'resolved-system');
  assert.equal(result.improved[0].system_id, 'improved-system');
  assert.equal(result.improved[0].recovered_score, 3);
  assert.equal(result.regressed[0].lost_score, 2);
  assert.equal(result.new_opportunities[0].system_id, 'new-system');
});

test('is deterministic and emits a stable receipt', () => {
  const baseline = snapshot('2026-08-20T00:00:00Z', [opportunity('alpha', 4, 0.5)]);
  const current = snapshot('2026-08-21T00:00:00Z', [opportunity('alpha', 2, 0.75)]);
  const first = buildRecoveryCompletion(baseline, current);
  const second = buildRecoveryCompletion(baseline, current);
  assert.deepEqual(first, second);
  assert.match(first.receipt_sha256, /^[a-f0-9]{64}$/);
});

test('rejects tampered snapshots instead of manufacturing completion', () => {
  const baseline = snapshot('2026-08-20T00:00:00Z', [opportunity('alpha', 4, 0.5)]);
  const current = snapshot('2026-08-21T00:00:00Z', []);
  baseline.roles.recruiter.top_opportunities[0].recoverable_score = 99;
  assert.throws(
    () => buildRecoveryCompletion(baseline, current),
    (error) => error instanceof RecruiterRecoveryCompletionError && error.message === 'baseline_receipt_mismatch',
  );
});

test('rejects non-forward snapshots', () => {
  const baseline = snapshot('2026-08-21T00:00:00Z', []);
  const current = snapshot('2026-08-21T00:00:00Z', []);
  assert.throws(
    () => buildRecoveryCompletion(baseline, current),
    (error) => error instanceof RecruiterRecoveryCompletionError && error.message === 'completion_current_not_newer',
  );
});

test('rejects duplicate role/system opportunities that could double-count recovery', () => {
  const duplicate = opportunity('alpha', 4, 0.5);
  const baseline = snapshot('2026-08-20T00:00:00Z', [duplicate, { ...duplicate }]);
  const current = snapshot('2026-08-21T00:00:00Z', []);
  assert.throws(
    () => buildRecoveryCompletion(baseline, current),
    /baseline_duplicate:recruiter:alpha/,
  );
});

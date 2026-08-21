import assert from 'node:assert/strict';
import test from 'node:test';

import {
  RecruiterActionPacketError,
  buildRecruiterActionPacket,
} from '../tools/recruiter-action-packet.mjs';

function proofPoint(systemId, roleWeight, freshnessWeight, overrides = {}) {
  return {
    system_id: systemId,
    repository: `https://github.com/GlacierEQ/${systemId}`,
    contribution: `${systemId} contribution`,
    role_weight: roleWeight,
    freshness_weight: freshnessWeight,
    freshness_state: freshnessWeight === 1 ? 'fresh' : freshnessWeight === 0 ? 'unverified' : 'stale',
    age_days: freshnessWeight === 1 ? 2 : freshnessWeight === 0 ? null : 240,
    commit_sha: freshnessWeight === 0 ? null : 'a'.repeat(40),
    verified_at: freshnessWeight === 0 ? null : '2026-08-19T00:00:00Z',
    verification_workflow: freshnessWeight === 0 ? null : 'proof workflow',
    verification_run_id: freshnessWeight === 0 ? null : 12345,
    ...overrides,
  };
}

function flow(id, score, points) {
  return {
    flow_id: id,
    name: `${id} name`,
    intent: `${id} intent`,
    score,
    proof_points: points,
  };
}

function matrix() {
  return {
    schema: 'glaciereq.live-recruiter-role-matrix.v1',
    as_of: '2026-08-20T21:45:00Z',
    freshness_receipt_sha256: 'b'.repeat(64),
    verification_passes: 1,
    coverage: { verified_systems: 3, unverified_systems: 1 },
    roles: {
      recruiter: [
        flow('application-flow', 14, [
          proofPoint('job-application', 8, 0.25),
          proofPoint('helix', 7, 1),
        ]),
      ],
      'engineering-lead': [
        flow('runtime-flow', 13, [
          proofPoint('pro-code', 8, 0),
          proofPoint('job-application', 2, 0.25),
        ]),
      ],
      'systems-architect': [
        flow('architecture-flow', 18, [
          proofPoint('akos', 8, 1),
          proofPoint('pro-code', 5, 0),
        ]),
      ],
    },
    receipt_sha256: 'c'.repeat(64),
  };
}

test('action packet binds current role fit to highest-value evidence recovery work', () => {
  const packet = buildRecruiterActionPacket(matrix(), 'recruiter');

  assert.equal(packet.schema, 'glaciereq.recruiter-action-packet.v1');
  assert.equal(packet.role, 'recruiter');
  assert.equal(packet.status, 'RECOVERY_ACTION_AVAILABLE');
  assert.equal(packet.current_fit.top_flow, 'application-flow');
  assert.equal(packet.current_fit.top_score, 14);
  assert.equal(packet.recovery.opportunity_count, 1);
  assert.equal(packet.recovery.actions[0].system_id, 'job-application');
  assert.equal(packet.recovery.actions[0].recoverable_score, 6);
  assert.equal(packet.reviewer_routes.full_proof, '/recruiter-proof/?role=recruiter');
  assert.equal(packet.reviewer_routes.role_recovery, '/recruiter-gap-analysis/?role=recruiter');
  assert.match(packet.receipt_sha256, /^[a-f0-9]{64}$/);
});

test('role selection cannot leak recovery work from another hiring lens', () => {
  const packet = buildRecruiterActionPacket(matrix(), 'engineering-lead');

  assert.equal(packet.current_fit.top_flow, 'runtime-flow');
  assert.deepEqual(
    packet.recovery.actions.map((entry) => entry.system_id),
    ['pro-code', 'job-application'],
  );
  assert.equal(packet.recovery.actions[0].recoverable_score, 8);
  assert.equal(packet.recovery.actions[1].recoverable_score, 1.5);
  assert.equal(packet.reviewer_routes.full_proof, '/recruiter-proof/?role=engineering-lead');
});

test('maxActions bounds the packet without changing total recovery accounting', () => {
  const packet = buildRecruiterActionPacket(matrix(), 'engineering-lead', { maxActions: 1 });

  assert.equal(packet.recovery.opportunity_count, 2);
  assert.equal(packet.recovery.selected_action_count, 1);
  assert.equal(packet.recovery.total_recoverable_score, 9.5);
  assert.deepEqual(packet.recovery.actions.map((entry) => entry.system_id), ['pro-code']);
});

test('fully fresh role emits PROOF_CURRENT instead of decorative recovery work', () => {
  const value = matrix();
  value.roles.recruiter[0].proof_points = [
    proofPoint('job-application', 8, 1),
    proofPoint('helix', 7, 1),
  ];
  const packet = buildRecruiterActionPacket(value, 'recruiter');

  assert.equal(packet.status, 'PROOF_CURRENT');
  assert.equal(packet.recovery.total_recoverable_score, 0);
  assert.equal(packet.recovery.opportunity_count, 0);
  assert.deepEqual(packet.recovery.actions, []);
});

test('action packet is deterministic for the same exact matrix and role', () => {
  const first = buildRecruiterActionPacket(matrix(), 'systems-architect');
  const second = buildRecruiterActionPacket(matrix(), 'systems-architect');
  assert.deepEqual(first, second);
});

test('invalid roles, receipts, and action bounds fail closed', () => {
  assert.throws(
    () => buildRecruiterActionPacket(matrix(), 'ceo'),
    (error) => error instanceof RecruiterActionPacketError && /action_packet_role:ceo/.test(error.message),
  );

  const badReceipt = matrix();
  badReceipt.receipt_sha256 = 'broken';
  assert.throws(
    () => buildRecruiterActionPacket(badReceipt, 'recruiter'),
    /action_packet_matrix_receipt/,
  );

  assert.throws(
    () => buildRecruiterActionPacket(matrix(), 'recruiter', { maxActions: 0 }),
    /action_packet_max_actions/,
  );
});

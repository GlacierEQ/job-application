const assert = require('node:assert/strict');
const test = require('node:test');

const recruiterProxy = require('./api/workflow-recruiter-proxy.js');
const matrixRuntime = require('./api/recruiter-role-matrix.js');

function topology() {
  const systems = {
    'job-application': { id: 'job-application', repo: 'https://github.com/GlacierEQ/job-application', evidence: 'application proof', limit: 'current application boundary' },
    helix: { id: 'helix', repo: 'https://github.com/GlacierEQ/helix', evidence: 'candidate intelligence proof', limit: 'current candidate boundary' },
    akos: { id: 'akos', repo: 'https://github.com/GlacierEQ/AKOS', evidence: 'orchestration proof', limit: 'current orchestration boundary' },
    'pro-code-runtime': { id: 'pro-code-runtime', repo: 'https://github.com/GlacierEQ/pro-code', evidence: 'runtime proof', limit: 'current runtime boundary' },
  };
  return {
    schema: 'glaciereq.workflow-topology.v1',
    receipt_sha256: 'a'.repeat(64),
    flows: [
      {
        id: 'application-flow',
        name: 'Application flow',
        intent: 'application relevance',
        steps: [
          { transition: 'candidate selection', system: systems.helix },
          { transition: 'application compilation', system: systems['job-application'] },
        ],
      },
      {
        id: 'architecture-flow',
        name: 'Architecture flow',
        intent: 'architecture relevance',
        steps: [
          { transition: 'orchestrate', system: systems.akos },
          { transition: 'execute runtime', system: systems['pro-code-runtime'] },
        ],
      },
    ],
  };
}

function freshness() {
  return {
    schema: 'glaciereq.public-evidence-freshness.v2',
    as_of: '2026-08-20T15:30:00.000Z',
    topology_receipt_sha256: 'a'.repeat(64),
    receipt_sha256: 'b'.repeat(64),
    entries: [
      { id: 'job-application', freshness_weight: 1, state: 'fresh', age_days: 1 },
      { id: 'helix', freshness_weight: 1, state: 'fresh', age_days: 1 },
      { id: 'akos', freshness_weight: 1, state: 'fresh', age_days: 1 },
      { id: 'pro-code-runtime', freshness_weight: 1, state: 'fresh', age_days: 1 },
    ],
    missing_systems: [],
  };
}

test('one shared freshness graph produces all public role rankings', () => {
  const topo = topology();
  const proof = freshness();
  const matrix = matrixRuntime.buildRoleMatrix(topo, proof);

  assert.equal(matrix.schema, 'glaciereq.public-recruiter-role-matrix.v1');
  assert.equal(matrix.verification_passes, 1);
  assert.deepEqual(matrix.roles, ['recruiter', 'engineering-lead', 'systems-architect']);
  assert.equal(matrix.freshness_receipt_sha256, proof.receipt_sha256);
  assert.match(matrix.receipt_sha256, /^[a-f0-9]{64}$/);

  for (const role of matrix.roles) {
    const direct = recruiterProxy.rankFlows(topo, role, proof);
    assert.deepEqual(matrix.rankings[role].briefs, direct);
    assert.equal(matrix.rankings[role].top_flow, direct[0].flow_id);
  }

  assert.equal(matrix.rankings.recruiter.top_flow, 'application-flow');
  assert.equal(matrix.rankings['systems-architect'].top_flow, 'architecture-flow');
});

test('matrix output is deterministic for one exact verification graph', () => {
  const first = matrixRuntime.buildRoleMatrix(topology(), freshness());
  const second = matrixRuntime.buildRoleMatrix(topology(), freshness());
  assert.deepEqual(first, second);
});

test('matrix rejects freshness from a different topology', () => {
  const proof = freshness();
  proof.topology_receipt_sha256 = 'c'.repeat(64);
  assert.throws(
    () => matrixRuntime.buildRoleMatrix(topology(), proof),
    /role_matrix_topology_receipt_mismatch/,
  );
});

test('matrix rejects malformed freshness receipts before ranking', () => {
  const proof = freshness();
  proof.receipt_sha256 = 'not-a-receipt';
  assert.throws(
    () => matrixRuntime.buildRoleMatrix(topology(), proof),
    /role_matrix_freshness_receipt/,
  );
});

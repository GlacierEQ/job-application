const assert = require('node:assert/strict');
const test = require('node:test');

const gapRuntime = require('./api/recruiter-gap-analysis.js');
const matrixRuntime = require('./api/recruiter-role-matrix.js');
const recruiterProxy = require('./api/workflow-recruiter-proxy.js');
const workflowTopologyProxy = require('./api/workflow-topology-proxy.js');

function topology() {
  const systems = {
    'job-application': {
      id: 'job-application',
      repo: 'https://github.com/GlacierEQ/job-application',
      evidence: 'application proof',
      limit: 'current application boundary',
    },
    helix: {
      id: 'helix',
      repo: 'https://github.com/GlacierEQ/helix',
      evidence: 'candidate intelligence proof',
      limit: 'current candidate boundary',
    },
    akos: {
      id: 'akos',
      repo: 'https://github.com/GlacierEQ/AKOS',
      evidence: 'orchestration proof',
      limit: 'current orchestration boundary',
    },
    'pro-code-runtime': {
      id: 'pro-code-runtime',
      repo: 'https://github.com/GlacierEQ/pro-code',
      evidence: 'runtime proof',
      limit: 'current runtime boundary',
    },
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
    as_of: '2026-08-20T20:00:00.000Z',
    topology_receipt_sha256: 'a'.repeat(64),
    receipt_sha256: 'b'.repeat(64),
    entries: [
      {
        id: 'job-application',
        freshness_weight: 0.2,
        state: 'stale',
        age_days: 500,
        commit_sha: '1'.repeat(40),
        verified_at: '2025-04-07T20:00:00.000Z',
        verification_workflow: 'Job Application Proof',
        verification_run_id: 101,
      },
      {
        id: 'helix',
        freshness_weight: 1,
        state: 'fresh',
        age_days: 1,
        commit_sha: '2'.repeat(40),
        verified_at: '2026-08-19T20:00:00.000Z',
        verification_workflow: 'Helix Proof',
        verification_run_id: 102,
      },
      {
        id: 'akos',
        freshness_weight: 0.65,
        state: 'aging',
        age_days: 120,
        commit_sha: '3'.repeat(40),
        verified_at: '2026-04-22T20:00:00.000Z',
        verification_workflow: 'AKOS Proof',
        verification_run_id: 103,
      },
    ],
    missing_systems: [
      {
        id: 'pro-code-runtime',
        repository: 'GlacierEQ/pro-code',
        reason: 'registered_verification_run_not_found',
      },
    ],
  };
}

function response() {
  const headers = new Map();
  return {
    statusCode: 200,
    body: Buffer.alloc(0),
    setHeader(name, value) { headers.set(String(name).toLowerCase(), value); },
    getHeader(name) { return headers.get(String(name).toLowerCase()); },
    end(chunk = '') { this.body = Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk)); },
  };
}

test('public role matrix becomes deterministic recruiter score-recovery priorities', () => {
  const matrix = matrixRuntime.buildRoleMatrix(topology(), freshness());
  const analysis = gapRuntime.analyzeRecruiterGaps(matrix);

  assert.equal(analysis.schema, 'glaciereq.live-recruiter-gap-analysis.v1');
  assert.equal(analysis.release, 'V32-RECRUITER-GAP-RUNTIME');
  assert.equal(analysis.source_matrix_schema, 'glaciereq.public-recruiter-role-matrix.v1');
  assert.equal(analysis.matrix_receipt_sha256, matrix.receipt_sha256);
  assert.equal(analysis.freshness_receipt_sha256, matrix.freshness_receipt_sha256);
  assert.match(analysis.receipt_sha256, /^[a-f0-9]{64}$/);

  const recruiter = analysis.roles.recruiter.top_opportunities;
  assert.equal(recruiter[0].system_id, 'job-application');
  assert.equal(recruiter[0].recoverable_score, 6.4);
  assert.equal(recruiter.some((entry) => entry.system_id === 'helix'), false);

  const engineering = analysis.roles['engineering-lead'].top_opportunities;
  const missingRuntime = engineering.find((entry) => entry.system_id === 'pro-code-runtime');
  assert.ok(missingRuntime);
  assert.equal(missingRuntime.freshness_weight, 0);
  assert.equal(missingRuntime.recoverable_score, 8);
  assert.equal(missingRuntime.action, 'establish exact successful verification identity');
});

test('shared analyzer is deterministic and rejects tampered matrix receipts', () => {
  const matrix = matrixRuntime.buildRoleMatrix(topology(), freshness());
  const first = gapRuntime.analyzeRecruiterGaps(matrix);
  const second = gapRuntime.analyzeRecruiterGaps(matrix);
  assert.deepEqual(first, second);

  const tampered = structuredClone(matrix);
  tampered.rankings.recruiter.briefs[0].score += 100;
  assert.throws(
    () => gapRuntime.analyzeRecruiterGaps(tampered),
    /gap_matrix_receipt_mismatch/,
  );
});

test('fresh proof produces no decorative refresh work', () => {
  const proof = freshness();
  proof.entries = proof.entries.map((entry) => ({
    ...entry,
    freshness_weight: 1,
    state: 'fresh',
    age_days: 1,
  }));
  proof.missing_systems = [];
  const matrix = matrixRuntime.buildRoleMatrix(topology(), proof);
  const analysis = gapRuntime.analyzeRecruiterGaps(matrix);
  for (const role of matrix.roles) {
    assert.equal(analysis.roles[role].opportunity_count, 0);
  }
});

test('public handler uses one topology and one freshness pass for all role gaps', async (t) => {
  const originalLoadTopology = workflowTopologyProxy.loadTopology;
  const originalLoadFreshness = recruiterProxy.loadLiveFreshness;
  let topologyLoads = 0;
  let freshnessLoads = 0;
  workflowTopologyProxy.loadTopology = async () => {
    topologyLoads += 1;
    return topology();
  };
  recruiterProxy.loadLiveFreshness = async (topo) => {
    freshnessLoads += 1;
    assert.equal(topo.receipt_sha256, 'a'.repeat(64));
    return freshness();
  };
  t.after(() => {
    workflowTopologyProxy.loadTopology = originalLoadTopology;
    recruiterProxy.loadLiveFreshness = originalLoadFreshness;
  });

  const res = response();
  await gapRuntime({ url: '/api/recruiter-gap-analysis' }, res);
  assert.equal(res.statusCode, 200);
  assert.match(res.getHeader('content-type'), /application\/json/);
  assert.equal(res.getHeader('cache-control'), 'public, max-age=0, s-maxage=300, must-revalidate');
  const payload = JSON.parse(res.body.toString('utf8'));
  assert.equal(payload.schema, 'glaciereq.live-recruiter-gap-analysis.v1');
  assert.equal(topologyLoads, 1);
  assert.equal(freshnessLoads, 1);
  assert.ok(payload.global_top_opportunities.length > 0);
});

test('public handler fails closed and does not cache unverifiable evidence', async (t) => {
  const originalLoadTopology = workflowTopologyProxy.loadTopology;
  workflowTopologyProxy.loadTopology = async () => {
    throw new Error('topology unavailable');
  };
  t.after(() => {
    workflowTopologyProxy.loadTopology = originalLoadTopology;
  });

  const res = response();
  await gapRuntime({ url: '/api/recruiter-gap-analysis' }, res);
  assert.equal(res.statusCode, 503);
  assert.equal(res.getHeader('cache-control'), 'no-store');
  const payload = JSON.parse(res.body.toString('utf8'));
  assert.equal(payload.status, 'FAIL_CLOSED');
});

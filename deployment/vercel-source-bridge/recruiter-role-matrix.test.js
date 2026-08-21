const assert = require('node:assert/strict');
const test = require('node:test');

const recruiterProxy = require('./api/workflow-recruiter-proxy.js');
const workflowTopologyProxy = require('./api/workflow-topology-proxy.js');
const matrixRuntime = require('./api/recruiter-role-matrix.js');
const releaseRouter = require('./api/release-router.js');

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

test('sealed release-router matrix stays byte-for-byte semantic parity with standalone runtime', () => {
  const topo = topology();
  const proof = freshness();
  assert.deepEqual(
    releaseRouter.buildRoleMatrix(topo, proof),
    matrixRuntime.buildRoleMatrix(topo, proof),
  );
});

test('matrix output is deterministic for one exact verification graph', () => {
  const first = matrixRuntime.buildRoleMatrix(topology(), freshness());
  const second = matrixRuntime.buildRoleMatrix(topology(), freshness());
  assert.deepEqual(first, second);
  assert.deepEqual(
    releaseRouter.buildRoleMatrix(topology(), freshness()),
    releaseRouter.buildRoleMatrix(topology(), freshness()),
  );
});

test('sealed catch-all router serves the public role matrix from one shared freshness pass', async (t) => {
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
  await releaseRouter({ url: '/api/index?path=data/recruiter-role-matrix.json' }, res);
  assert.equal(res.statusCode, 200);
  assert.match(res.getHeader('content-type'), /application\/json/);
  assert.equal(res.getHeader('cache-control'), 'public, max-age=0, s-maxage=300, must-revalidate');
  const matrix = JSON.parse(res.body.toString('utf8'));
  assert.equal(matrix.schema, 'glaciereq.public-recruiter-role-matrix.v1');
  assert.equal(matrix.verification_passes, 1);
  assert.equal(topologyLoads, 1);
  assert.equal(freshnessLoads, 1);
  assert.deepEqual(matrix, matrixRuntime.buildRoleMatrix(topology(), freshness()));
});

test('sealed catch-all router renders the role matrix as a recruiter-facing HTML comparison', async (t) => {
  const originalLoadTopology = workflowTopologyProxy.loadTopology;
  const originalLoadFreshness = recruiterProxy.loadLiveFreshness;
  let topologyLoads = 0;
  let freshnessLoads = 0;
  workflowTopologyProxy.loadTopology = async () => {
    topologyLoads += 1;
    return topology();
  };
  recruiterProxy.loadLiveFreshness = async () => {
    freshnessLoads += 1;
    return freshness();
  };
  t.after(() => {
    workflowTopologyProxy.loadTopology = originalLoadTopology;
    recruiterProxy.loadLiveFreshness = originalLoadFreshness;
  });

  const res = response();
  await releaseRouter({ url: '/api/index?path=recruiter-role-matrix' }, res);
  assert.equal(res.statusCode, 200);
  assert.match(res.getHeader('content-type'), /text\/html/);
  assert.match(res.getHeader('content-security-policy'), /script-src 'none'/);
  assert.match(res.getHeader('content-security-policy'), /style-src 'self'/);
  const html = res.body.toString('utf8');
  assert.match(html, /ONE VERIFIED GRAPH · THREE HIRING LENSES/);
  assert.match(html, /data-role="recruiter"/);
  assert.match(html, /data-role="engineering-lead"/);
  assert.match(html, /data-role="systems-architect"/);
  assert.match(html, /\/data\/recruiter-role-matrix\.json/);
  assert.match(html, /\/recruiter-proof\/\?role=recruiter/);
  assert.match(html, /\/assets\/site\.workflows\.css/);
  assert.doesNotMatch(html, /<script\b/i);
  assert.doesNotMatch(html, /<style\b/i);
  assert.doesNotMatch(html, /\sstyle\s*=/i);
  assert.equal(topologyLoads, 1);
  assert.equal(freshnessLoads, 1);
});

test('role-matrix HTML escapes proof text and keeps roles distinct', () => {
  const topo = topology();
  topo.flows[0].name = '<img src=x onerror=alert(1)>';
  const matrix = releaseRouter.buildRoleMatrix(topo, freshness());
  const html = releaseRouter.renderRoleMatrixHtml(matrix);
  assert.doesNotMatch(html, /<img src=x onerror=/);
  assert.match(html, /&lt;img src=x onerror=alert\(1\)&gt;/);
  assert.equal((html.match(/matrix-role/g) || []).length, 3);
});

test('sealed role-matrix route fails closed when freshness identity is invalid', async (t) => {
  const originalLoadTopology = workflowTopologyProxy.loadTopology;
  const originalLoadFreshness = recruiterProxy.loadLiveFreshness;
  workflowTopologyProxy.loadTopology = async () => topology();
  recruiterProxy.loadLiveFreshness = async () => {
    const proof = freshness();
    proof.topology_receipt_sha256 = 'c'.repeat(64);
    return proof;
  };
  t.after(() => {
    workflowTopologyProxy.loadTopology = originalLoadTopology;
    recruiterProxy.loadLiveFreshness = originalLoadFreshness;
  });

  const res = response();
  await releaseRouter({ url: '/api/index?path=data/recruiter-role-matrix.json' }, res);
  assert.equal(res.statusCode, 503);
  assert.equal(res.getHeader('cache-control'), 'no-store');
  const payload = JSON.parse(res.body.toString('utf8'));
  assert.equal(payload.status, 'FAIL_CLOSED');
  assert.equal(payload.error, 'role_matrix_topology_receipt_mismatch');
});

test('sealed HTML matrix route fails closed without caching invalid evidence', async (t) => {
  const originalLoadTopology = workflowTopologyProxy.loadTopology;
  const originalLoadFreshness = recruiterProxy.loadLiveFreshness;
  workflowTopologyProxy.loadTopology = async () => topology();
  recruiterProxy.loadLiveFreshness = async () => {
    throw new Error('<unsafe freshness failure>');
  };
  t.after(() => {
    workflowTopologyProxy.loadTopology = originalLoadTopology;
    recruiterProxy.loadLiveFreshness = originalLoadFreshness;
  });

  const res = response();
  await releaseRouter({ url: '/api/index?path=recruiter-role-matrix' }, res);
  assert.equal(res.statusCode, 503);
  assert.equal(res.getHeader('cache-control'), 'no-store');
  const html = res.body.toString('utf8');
  assert.match(html, /Recruiter role matrix unavailable/);
  assert.match(html, /&lt;unsafe freshness failure&gt;/);
  assert.doesNotMatch(html, /<unsafe freshness failure>/);
});

test('matrix rejects freshness from a different topology', () => {
  const proof = freshness();
  proof.topology_receipt_sha256 = 'c'.repeat(64);
  assert.throws(
    () => matrixRuntime.buildRoleMatrix(topology(), proof),
    /role_matrix_topology_receipt_mismatch/,
  );
  assert.throws(
    () => releaseRouter.buildRoleMatrix(topology(), proof),
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
  assert.throws(
    () => releaseRouter.buildRoleMatrix(topology(), proof),
    /role_matrix_freshness_receipt/,
  );
});

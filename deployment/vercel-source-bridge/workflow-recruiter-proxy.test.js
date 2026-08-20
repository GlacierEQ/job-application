const assert = require('node:assert/strict');
const test = require('node:test');
const topologyProxy = require('./api/workflow-topology-proxy.js');
require('./api/workflow-topology-loader-patch.js');
const recruiterProxy = require('./api/workflow-recruiter-proxy.js');

const REPOSITORIES = {
  helix: 'https://github.com/GlacierEQ/job-app-helix',
  'receipt-router': 'https://github.com/GlacierEQ/xai-colossus-2',
  'job-application': 'https://github.com/GlacierEQ/job-application',
  akos: 'https://github.com/GlacierEQ/AKOS',
  'sigma-glue': 'https://github.com/GlacierEQ/sigma-glue',
  'doctor-strange': 'https://github.com/GlacierEQ/Pro-DOCTOR-STRANGE',
  'tower-of-babel': 'https://github.com/GlacierEQ/the-tower-of-babel',
  'pro-code-runtime': 'https://github.com/GlacierEQ/pro-code',
};

const portfolio = {
  schema: 'glaciereq.hiring-portfolio.v1',
  release: { evidence_policy: 'claims-do-not-exceed-owning-repository-receipts' },
  flagships: [
    ['helix', 'Job Application Helix', 'PROMOTED', 'L5'],
    ['receipt-router', 'Portfolio Receipt Router', 'TEST_VERIFIED', 'LEGACY_DEMO'],
    ['job-application', 'Job Application Portal', 'PROMOTED', 'L4'],
    ['akos', 'AKOS Authority Runtime', 'PROMOTED', 'L5'],
    ['sigma-glue', 'Sigma Glue Orchestration', 'PROMOTED', 'L4'],
    ['doctor-strange', 'Doctor Strange Convergence', 'PROMOTED', 'L4'],
    ['tower-of-babel', 'Tower of Babel', 'REFERENCE_ONLY', 'L4'],
    ['pro-code-runtime', 'Pro-Code Runtime', 'REFERENCE_ONLY', 'L4'],
  ].map(([id, name, state, level]) => ({
    id,
    name,
    repo: REPOSITORIES[id],
    state,
    summary: `${name} summary`,
    evidence: `${name} evidence`,
    limit: `${name} ceiling`,
    level,
  })),
};

function apiResponse(payload, status = 200) {
  const bytes = Buffer.from(JSON.stringify(payload));
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: { get(name) { return String(name).toLowerCase() === 'content-length' ? String(bytes.length) : null; } },
    async arrayBuffer() { return bytes; },
  };
}

function run({ id, name, sha, updatedAt, conclusion = 'success', status = 'completed' }) {
  return {
    id,
    name,
    head_sha: sha,
    updated_at: updatedAt,
    conclusion,
    status,
    html_url: `https://github.com/GlacierEQ/repo/actions/runs/${id}`,
  };
}

function fetcherByRepository(runMap, failures = new Set()) {
  return async (url) => {
    const match = /\/repos\/(GlacierEQ\/[^/]+)\/actions\/runs/.exec(String(url));
    assert.ok(match, `unexpected GitHub URL: ${url}`);
    const repository = match[1];
    if (failures.has(repository)) return apiResponse({ message: 'Not Found' }, 404);
    return apiResponse({ workflow_runs: runMap[repository] || [] });
  };
}

function response() {
  const headers = new Map();
  return {
    statusCode: 200,
    body: null,
    setHeader(name, value) { headers.set(String(name).toLowerCase(), value); },
    getHeader(name) { return headers.get(String(name).toLowerCase()); },
    end(chunk = '') { this.body = Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk)); },
  };
}

const AS_OF = new Date('2026-08-20T12:00:00Z');
const SHAS = {
  fresh: 'a'.repeat(40),
  fresh2: 'b'.repeat(40),
  stale: 'c'.repeat(40),
  aging: 'd'.repeat(40),
};

function liveRuns() {
  return {
    'GlacierEQ/job-app-helix': [
      run({ id: 12, name: 'Experimental Proof', sha: SHAS.fresh2, updatedAt: '2026-08-20T11:50:00Z' }),
      run({ id: 11, name: 'Helix Candidate Profile Proof', sha: SHAS.fresh, updatedAt: '2026-08-19T11:00:00Z' }),
    ],
    'GlacierEQ/xai-colossus-2': [run({ id: 21, name: 'CI', sha: SHAS.fresh2, updatedAt: '2026-08-19T10:00:00Z' })],
    'GlacierEQ/job-application': [run({ id: 31, name: 'APEX Recruiter Proof Brief', sha: SHAS.fresh, updatedAt: '2025-07-01T10:00:00Z' })],
    'GlacierEQ/AKOS': [run({ id: 41, name: 'APEX Estate Non-Regression', sha: SHAS.fresh2, updatedAt: '2026-08-19T09:00:00Z' })],
    'GlacierEQ/sigma-glue': [run({ id: 51, name: 'verify', sha: SHAS.fresh, updatedAt: '2026-08-19T08:00:00Z' })],
    'GlacierEQ/Pro-DOCTOR-STRANGE': [run({ id: 61, name: 'CI', sha: SHAS.fresh2, updatedAt: '2026-08-19T07:00:00Z' })],
    'GlacierEQ/the-tower-of-babel': [run({ id: 71, name: 'Tower Verification', sha: SHAS.fresh, updatedAt: '2026-08-19T06:00:00Z' })],
    'GlacierEQ/pro-code': [run({ id: 81, name: 'Pro-Code native verification', sha: SHAS.fresh2, updatedAt: '2026-08-19T05:00:00Z' })],
  };
}

test('registered verification source cannot be displaced by newer unapproved proof run', () => {
  const selected = recruiterProxy.selectVerificationRun(liveRuns()['GlacierEQ/job-app-helix'], 'GlacierEQ/job-app-helix');
  assert.equal(selected.id, 11);
  assert.equal(selected.name, 'Helix Candidate Profile Proof');
});

test('live freshness derivation preserves exact verification lineage and isolates unavailable proof', async () => {
  const topology = topologyProxy.buildTopology(portfolio);
  const freshness = await recruiterProxy.deriveFreshness(topology, {
    asOf: AS_OF,
    fetchImpl: fetcherByRepository(liveRuns(), new Set(['GlacierEQ/Pro-DOCTOR-STRANGE'])),
  });
  assert.equal(freshness.schema, 'glaciereq.public-evidence-freshness.v1');
  assert.match(freshness.receipt_sha256, /^[a-f0-9]{64}$/);
  const helix = freshness.entries.find((entry) => entry.id === 'helix');
  assert.equal(helix.verification_workflow, 'Helix Candidate Profile Proof');
  assert.equal(helix.commit_sha, SHAS.fresh);
  assert.equal(helix.freshness_weight, 1);
  const doctor = freshness.missing_systems.find((entry) => entry.id === 'doctor-strange');
  assert.match(doctor.reason, /^repository_verification_unavailable:/);
  assert.ok(!freshness.entries.some((entry) => entry.id === 'doctor-strange'));
});

test('stale application evidence loses recruiter ranking while fresh architecture proof retains leverage', async () => {
  const topology = topologyProxy.buildTopology(portfolio);
  const proof = await recruiterProxy.buildPublicRecruiterProof(topology, 'recruiter', {
    asOf: AS_OF,
    fetchImpl: fetcherByRepository(liveRuns()),
  });
  assert.equal(proof.schema, 'glaciereq.public-recruiter-proof.v1');
  assert.match(proof.receipt_sha256, /^[a-f0-9]{64}$/);
  assert.notEqual(proof.briefs[0].flow_id, 'opportunity-to-evidence-package');
  const applicationFlow = proof.briefs.find((brief) => brief.flow_id === 'opportunity-to-evidence-package');
  assert.ok(applicationFlow.score < applicationFlow.static_role_score + applicationFlow.breadth_bonus);
  const appPoint = applicationFlow.proof_points.find((point) => point.system_id === 'job-application');
  assert.equal(appPoint.freshness_state, 'stale');
  assert.equal(appPoint.freshness_weight, 0.2);
});

test('role selection produces distinct deterministic ranking from one proof graph', async () => {
  const topology = topologyProxy.buildTopology(portfolio);
  const options = { asOf: AS_OF, fetchImpl: fetcherByRepository(liveRuns()) };
  const recruiter = await recruiterProxy.buildPublicRecruiterProof(topology, 'recruiter', options);
  const architect = await recruiterProxy.buildPublicRecruiterProof(topology, 'systems-architect', options);
  const recruiterAgain = await recruiterProxy.buildPublicRecruiterProof(topology, 'recruiter', options);
  assert.notEqual(recruiter.briefs[0].flow_id, architect.briefs[0].flow_id);
  assert.equal(recruiter.receipt_sha256, recruiterAgain.receipt_sha256);
  assert.equal(recruiter.freshness_receipt_sha256, recruiterAgain.freshness_receipt_sha256);
});

test('rendered recruiter proof is script-free, role-addressable, machine-linked, and escapes evidence', async () => {
  const hostile = structuredClone(portfolio);
  hostile.flagships.find((system) => system.id === 'helix').evidence = '<script>alert(1)</script> & proof';
  const topology = topologyProxy.buildTopology(hostile);
  const proof = await recruiterProxy.buildPublicRecruiterProof(topology, 'engineering-lead', {
    asOf: AS_OF,
    fetchImpl: fetcherByRepository(liveRuns()),
  });
  const html = recruiterProxy.renderHtml(proof);
  assert.doesNotMatch(html, /<script\b/i);
  assert.match(html, /&lt;script&gt;alert\(1\)&lt;\/script&gt; &amp; proof/);
  assert.match(html, /role=engineering-lead/);
  assert.match(html, /data\/recruiter-proof\.json\?role=engineering-lead/);
  assert.match(html, /Freshness-adjusted score:/);
});

test('invalid public role fails closed with explicit 400', async () => {
  const res = response();
  await recruiterProxy({ url: '/data/recruiter-proof.json?role=chief-wizard' }, res);
  assert.equal(res.statusCode, 400);
  const payload = JSON.parse(res.body.toString('utf8'));
  assert.equal(payload.status, 'INVALID_ROLE');
  assert.ok(payload.allowed_roles.includes('recruiter'));
});

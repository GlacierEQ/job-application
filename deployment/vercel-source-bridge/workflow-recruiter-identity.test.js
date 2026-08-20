const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
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
  flagships: Object.entries(REPOSITORIES).map(([id, repo]) => ({
    id,
    name: id,
    repo,
    state: 'PROMOTED',
    summary: `${id} summary`,
    evidence: `${id} evidence`,
    limit: `${id} ceiling`,
    level: 'L4',
  })),
};

const SHA = 'a'.repeat(40);
const AS_OF = new Date('2026-08-20T12:00:00Z');

function apiResponse(payload, status = 200) {
  const bytes = Buffer.from(JSON.stringify(payload));
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: { get: () => String(bytes.length) },
    async arrayBuffer() { return bytes; },
  };
}

function sourceFor(repository) {
  return recruiterProxy.constants.VERIFICATION_SOURCES[repository];
}

function runFor(repository, overrides = {}) {
  const source = sourceFor(repository);
  return {
    id: overrides.id || 101,
    name: overrides.name || source.workflow_names[0],
    path: overrides.path || source.workflow_paths?.[0] || '.github/workflows/legacy.yml',
    head_branch: overrides.head_branch || 'main',
    event: overrides.event || 'push',
    head_sha: overrides.head_sha || SHA,
    updated_at: overrides.updated_at || '2026-08-19T12:00:00Z',
    status: overrides.status || 'completed',
    conclusion: overrides.conclusion || 'success',
    html_url: 'https://github.com/GlacierEQ/example/actions/runs/101',
  };
}

function identityFetcher(overrides = {}) {
  const runs = new Map();
  for (const repository of Object.keys(recruiterProxy.constants.VERIFICATION_SOURCES)) {
    runs.set(repository, runFor(repository, overrides[repository] || {}));
  }
  return async (url) => {
    const value = String(url);
    const exact = /\/repos\/(GlacierEQ\/[^/]+)\/actions\/runs\/(\d+)$/.exec(value);
    if (exact) return apiResponse(runs.get(exact[1]));
    const list = /\/repos\/(GlacierEQ\/[^/]+)\/actions\/runs\?/.exec(value);
    if (list) return apiResponse({ workflow_runs: [runs.get(list[1])] });
    const metadata = /\/repos\/(GlacierEQ\/[^/]+)$/.exec(value);
    if (metadata) return apiResponse({ default_branch: 'main' });
    throw new Error(`unexpected_url:${url}`);
  };
}

test('public runtime registry projection remains identical to source registry', () => {
  const registryPath = path.resolve(__dirname, '../../config/workflow-verification-sources.json');
  const source = JSON.parse(fs.readFileSync(registryPath, 'utf8'));
  const runtime = recruiterProxy.constants.VERIFICATION_SOURCES;
  const normalized = Object.fromEntries(Object.entries(runtime).map(([repository, entry]) => [repository, {
    workflow_names: [...entry.workflow_names],
    ...(entry.workflow_paths === null ? {} : { workflow_paths: [...entry.workflow_paths] }),
    branch_policy: entry.branch_policy,
  }]));
  assert.deepEqual(normalized, source.repositories);
});

test('newer same-name run from an unregistered workflow path cannot displace approved proof', () => {
  const repository = 'GlacierEQ/job-app-helix';
  const approved = runFor(repository, { id: 10, updated_at: '2026-08-19T10:00:00Z' });
  const impostor = runFor(repository, {
    id: 11,
    path: '.github/workflows/experimental.yml',
    updated_at: '2026-08-20T11:00:00Z',
  });
  const selected = recruiterProxy.selectVerificationRun(
    { workflow_runs: [impostor, approved] },
    repository,
    'main',
  );
  assert.equal(selected.id, 10);
  assert.equal(selected.path, '.github/workflows/ci.yml');
});

test('non-default push branch cannot earn freshness under default_or_pull_request policy', () => {
  const repository = 'GlacierEQ/job-application';
  const run = runFor(repository, { head_branch: 'feature/untrusted', event: 'push' });
  const selected = recruiterProxy.selectVerificationRun(
    { workflow_runs: [run] },
    repository,
    'main',
  );
  assert.equal(selected, null);
});

test('pull request run may earn freshness when exact path identity is registered', () => {
  const repository = 'GlacierEQ/job-application';
  const run = runFor(repository, { head_branch: 'feature/proof', event: 'pull_request' });
  const selected = recruiterProxy.selectVerificationRun(
    { workflow_runs: [run] },
    repository,
    'main',
  );
  assert.equal(selected.id, run.id);
});

test('exact-run readback tampering removes the system from recruiter freshness', async () => {
  const topology = topologyProxy.buildTopology(portfolio);
  const base = identityFetcher();
  const fetchImpl = async (url) => {
    const response = await base(url);
    const exactHelix = /GlacierEQ\/job-app-helix\/actions\/runs\/101$/.test(String(url));
    if (!exactHelix) return response;
    const tampered = runFor('GlacierEQ/job-app-helix', { path: '.github/workflows/experimental.yml' });
    return apiResponse(tampered);
  };
  const freshness = await recruiterProxy.deriveFreshness(topology, { asOf: AS_OF, fetchImpl });
  assert.ok(!freshness.entries.some((entry) => entry.id === 'helix'));
  const missing = freshness.missing_systems.find((entry) => entry.id === 'helix');
  assert.match(missing.reason, /recruiter_exact_run_path_mismatch/);
});

test('identity-bound freshness propagates workflow path branch event and run id into recruiter proof', async () => {
  const topology = topologyProxy.buildTopology(portfolio);
  const proof = await recruiterProxy.buildPublicRecruiterProof(topology, 'recruiter', {
    asOf: AS_OF,
    fetchImpl: identityFetcher(),
  });
  assert.equal(proof.schema, 'glaciereq.public-recruiter-proof.v2');
  const point = proof.briefs.flatMap((brief) => brief.proof_points).find((entry) => entry.system_id === 'helix');
  assert.equal(point.verification_workflow_path, '.github/workflows/ci.yml');
  assert.equal(point.verification_branch, 'main');
  assert.equal(point.verification_event, 'push');
  assert.equal(point.verification_run_id, 101);
  assert.match(proof.receipt_sha256, /^[a-f0-9]{64}$/);
});

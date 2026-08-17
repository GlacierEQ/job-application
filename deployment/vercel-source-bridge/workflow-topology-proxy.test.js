const assert = require('node:assert/strict');
const test = require('node:test');
const proxy = require('./api/workflow-topology-proxy.js');

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
  ].map(([id, name, state, level]) => ({ id, name, repo: `https://github.com/GlacierEQ/${id}`, state, summary: `${name} summary`, evidence: `${name} evidence`, limit: `${name} ceiling`, level })),
};

function req(url) { return { url }; }
function response() {
  const headers = new Map();
  return { statusCode: 200, body: null, setHeader(name, value) { headers.set(String(name).toLowerCase(), value); }, getHeader(name) { return headers.get(String(name).toLowerCase()); }, end(chunk = '') { this.body = Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk)); } };
}

test('recovered topology binds historical composition to current proof-bearing systems', () => {
  const topology = proxy.buildTopology(portfolio);
  assert.equal(topology.schema, 'glaciereq.workflow-topology.v1');
  assert.equal(topology.flows.length, 4);
  assert.ok(topology.edges.length >= 8);
  assert.match(topology.receipt_sha256, /^[a-f0-9]{64}$/);
  assert.equal(topology.restoration_lineage.donor_commit, proxy.constants.DONOR_COMMIT);
  assert.equal(topology.restoration_lineage.contraction_commit, proxy.constants.CONTRACTION_COMMIT);
  assert.ok(topology.flows.every((flow) => flow.steps.every((step) => step.system.evidence && step.system.limit)));
});

test('topology receipt is deterministic under irrelevant flagship order', () => {
  const forward = proxy.buildTopology(portfolio);
  const reversed = proxy.buildTopology({ ...portfolio, flagships: [...portfolio.flagships].reverse() });
  assert.equal(forward.receipt_sha256, reversed.receipt_sha256);
});

test('missing required modern system fails closed instead of preserving stale donor fiction', () => {
  const broken = { ...portfolio, flagships: portfolio.flagships.filter((system) => system.id !== 'sigma-glue') };
  assert.throws(() => proxy.buildTopology(broken), /workflow_required_systems_missing:sigma-glue/);
});

test('server-side selectors filter by flow, system, and proof state', () => {
  const topology = proxy.buildTopology(portfolio);
  assert.deepEqual(proxy.selectFlows(req('/workflows/?flow=intent-to-reversible-execution'), topology).flows.map((flow) => flow.id), ['intent-to-reversible-execution']);
  assert.deepEqual(proxy.selectFlows(req('/workflows/?system=tower-of-babel'), topology).flows.map((flow) => flow.id), ['architecture-to-operational-runtime']);
  assert.equal(proxy.selectFlows(req('/workflows/?state=REFERENCE_ONLY'), topology).flows.length, 1);
});

test('unknown selectors are explicit and never silently broaden the result set', () => {
  const topology = proxy.buildTopology(portfolio);
  const selected = proxy.selectFlows(req('/workflows/?system=made-up-system'), topology);
  assert.equal(selected.flows.length, 0);
  assert.deepEqual(selected.invalid, ['system:made-up-system']);
});

test('rendered public topology is script-free and escapes proof content', () => {
  const hostile = structuredClone(portfolio);
  hostile.flagships[0].summary = '<script>alert(1)</script> & evidence';
  const topology = proxy.buildTopology(hostile);
  const html = proxy.renderHtml(topology, { flows: topology.flows, invalid: [] });
  assert.doesNotMatch(html, /<script\b/i);
  assert.match(html, /&lt;script&gt;alert\(1\)&lt;\/script&gt; &amp; evidence/);
  assert.match(html, /RESTORATION RECEIPT/);
  assert.match(html, /workflow-topology\.json/);
});

test('handler serves machine topology and verification from bounded current source', async (t) => {
  const originalFetch = global.fetch;
  global.fetch = async () => ({ ok: true, status: 200, headers: new Map([['content-length', String(Buffer.byteLength(JSON.stringify(portfolio)))]]), arrayBuffer: async () => Buffer.from(JSON.stringify(portfolio)) });
  t.after(() => { global.fetch = originalFetch; });
  const machine = response();
  await proxy({ url: '/data/workflow-topology.json' }, machine);
  assert.equal(machine.statusCode, 200);
  assert.equal(JSON.parse(machine.body.toString('utf8')).flows.length, 4);
  const verify = response();
  await proxy({ url: '/__workflow_topology_verify' }, verify);
  assert.equal(verify.statusCode, 200);
  const receipt = JSON.parse(verify.body.toString('utf8'));
  assert.equal(receipt.status, 'PASS');
  assert.equal(receipt.public_contract.scripts, 0);
  assert.equal(receipt.public_contract.machine_json, true);
});

const assert = require('node:assert/strict');
const test = require('node:test');
const releaseRouter = require('./api/release-router.js');

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
    repo: `https://github.com/GlacierEQ/${id}`,
    state,
    summary: `${name} summary`,
    evidence: `${name} evidence`,
    limit: `${name} ceiling`,
    level,
  })),
};

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

async function routed(path) {
  const res = response();
  await releaseRouter({ url: `/api/release-router?path=${encodeURIComponent(path)}` }, res);
  return res;
}

test('current release router composes every workflow-topology public surface', async (t) => {
  const originalFetch = global.fetch;
  const encoded = Buffer.from(JSON.stringify(portfolio));
  global.fetch = async () => ({
    ok: true,
    status: 200,
    headers: new Map([['content-length', String(encoded.length)]]),
    arrayBuffer: async () => encoded,
  });
  t.after(() => { global.fetch = originalFetch; });

  const html = await routed('workflows');
  assert.equal(html.statusCode, 200);
  assert.match(html.getHeader('content-type'), /text\/html/);
  assert.match(html.body.toString('utf8'), /See how the systems actually work together\./);
  assert.match(html.body.toString('utf8'), /RESTORATION RECEIPT/);

  const machine = await routed('data/workflow-topology.json');
  assert.equal(machine.statusCode, 200);
  assert.match(machine.getHeader('content-type'), /application\/json/);
  const topology = JSON.parse(machine.body.toString('utf8'));
  assert.equal(topology.schema, 'glaciereq.workflow-topology.v1');
  assert.equal(topology.flows.length, 4);
  assert.match(topology.receipt_sha256, /^[a-f0-9]{64}$/);

  const css = await routed('assets/site.workflows.css');
  assert.equal(css.statusCode, 200);
  assert.match(css.getHeader('content-type'), /text\/css/);
  assert.match(css.body.toString('utf8'), /\.workflow-grid/);

  const verify = await routed('__workflow_topology_verify');
  assert.equal(verify.statusCode, 200);
  const receipt = JSON.parse(verify.body.toString('utf8'));
  assert.equal(receipt.status, 'PASS');
  assert.equal(receipt.public_contract.machine_json, true);
  assert.equal(receipt.public_contract.scripts, 0);
});

test('Vercel catch-all path semantics preserve topology selectors through the release router', async () => {
  const res = response();
  await releaseRouter({
    url: '/api/release-router?path=workflows&system=tower-of-babel',
  }, res);
  assert.equal(res.statusCode, 200);
  const html = res.body.toString('utf8');
  assert.match(html, /id="architecture-to-operational-runtime"/);
  assert.doesNotMatch(html, /id="intent-to-reversible-execution"/);
  assert.equal((html.match(/class="workflow-card"/g) || []).length, 1);
  assert.match(html, /name="robots" content="noindex,follow"/);
});

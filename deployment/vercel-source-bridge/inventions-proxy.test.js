const assert = require('node:assert/strict');
const test = require('node:test');

const inventions = require('./api/inventions-proxy.js');

function portfolioFixture() {
  const ids = [...new Set([
    ...inventions.constants.LENSES.flatMap((lens) => lens.systemIds),
    ...inventions.constants.WORKFLOW_BLUEPRINTS.flatMap((workflow) => workflow.systemIds),
  ])];
  return {
    schema: 'glaciereq.hiring-portfolio.v1',
    release: { evidence_policy: 'claims-do-not-exceed-owning-repository-receipts' },
    person: {
      roles: [
        'Forward-Deployed AI Architect',
        'Principal Agentic Systems Architect',
        'Principal AI Platform / Automation Architect',
        'Staff / Principal Applied AI Engineer',
      ],
    },
    flagships: ids.map((id, index) => ({
      id,
      rank: index + 1,
      name: id.replaceAll('-', ' '),
      repo: `https://github.com/GlacierEQ/${id}`,
      state: 'TEST_VERIFIED',
      summary: `summary ${id}`,
      mechanism: [`mechanism ${id}`],
      evidence: `evidence ${id}`,
      limit: `limit ${id}`,
      level: 'L4',
    })),
  };
}

function req(url) {
  return { url };
}

test('buildMap restores and surpasses V13 evidence-routing mechanisms deterministically', () => {
  const first = inventions.buildMap(portfolioFixture());
  const second = inventions.buildMap(portfolioFixture());
  assert.equal(first.schema, 'glaciereq.invention-evidence-map.v3');
  assert.equal(first.lenses.length, 5);
  assert.equal(first.role_routes.length, 4);
  assert.equal(first.workflows.length, 4);
  assert.ok(first.proof_chains.length >= 8);
  assert.equal(first.receipt_sha256, second.receipt_sha256);
  assert.equal(first.restoration_lineage.donor_commit, inventions.constants.DONOR_COMMIT);
  assert.equal(first.restoration_lineage.contraction_commit, inventions.constants.CONTRACTION_COMMIT);
  assert.ok(first.restoration_lineage.recovered_mechanisms.includes('filterable repository gallery'));
  assert.ok(first.restoration_lineage.recovered_mechanisms.includes('claim-to-proof evidence chain'));
  assert.ok(first.restoration_lineage.surpassed_mechanisms.includes('differentiated role-to-problem routing'));
});

test('role routing is differentiated instead of cloning the complete estate for every role', () => {
  const map = inventions.buildMap(portfolioFixture());
  const forward = map.role_routes.find((route) => route.role === 'Forward-Deployed AI Architect');
  const agentic = map.role_routes.find((route) => route.role === 'Principal Agentic Systems Architect');
  assert.equal(forward.differentiated, true);
  assert.equal(agentic.differentiated, true);
  assert.deepEqual(forward.lenses.map(({ id }) => id), [
    'application-intelligence',
    'agent-assurance',
    'human-machine',
  ]);
  assert.deepEqual(agentic.lenses.map(({ id }) => id), [
    'agent-assurance',
    'evidence-verification',
    'architecture-federation',
  ]);
  assert.notDeepEqual(
    forward.systems.map(({ id }) => id),
    agentic.systems.map(({ id }) => id),
  );
});

test('claim-to-proof chains bind claim, owner, evidence, ceiling, and deterministic receipt', () => {
  const map = inventions.buildMap(portfolioFixture());
  const akos = map.proof_chains.find((chain) => chain.id === 'akos');
  assert.equal(akos.claim, 'summary akos');
  assert.equal(akos.repository, 'https://github.com/GlacierEQ/akos');
  assert.equal(akos.evidence, 'evidence akos');
  assert.equal(akos.proof_ceiling, 'limit akos');
  assert.match(akos.receipt_sha256, /^[a-f0-9]{64}$/);
});

test('cross-repository workflows preserve ordered contributions and evidence ceilings', () => {
  const map = inventions.buildMap(portfolioFixture());
  const workflow = map.workflows.find((item) => item.id === 'bounded-agent-execution');
  assert.deepEqual(workflow.steps.map(({ system }) => system.id), [
    'akos',
    'sigma-glue',
    'doctor-strange',
  ]);
  assert.deepEqual(workflow.steps.map(({ order }) => order), [1, 2, 3]);
  assert.ok(workflow.steps.every((step) => step.evidence && step.proof_ceiling));
});

test('runtime refuses missing or non-GlacierEQ evidence providers', () => {
  const missing = portfolioFixture();
  missing.flagships = missing.flagships.filter((item) => item.id !== 'akos');
  assert.throws(() => inventions.buildMap(missing), /missing_systems:akos/);

  const foreign = portfolioFixture();
  foreign.flagships[0].repo = 'https://example.com/theater';
  assert.throws(() => inventions.buildMap(foreign), /repo_not_public_glaciereq/);
});

test('HTML keeps later security gains while exposing role, workflow, and proof routes', () => {
  const map = inventions.buildMap(portfolioFixture());
  const selected = inventions.selection(req('/inventions/?lens=agent-assurance'), map);
  const html = inventions.renderHtml(map, selected);
  assert.match(html, /Dependable agent operations/);
  assert.doesNotMatch(html, /Application intelligence<\/h2>/);
  assert.match(html, /\?lens=architecture-federation/);
  assert.match(html, /\?workflow=bounded-agent-execution/);
  assert.match(html, /CLAIM → PROOF → CEILING/);
  assert.match(html, /Map receipt/);
  assert.doesNotMatch(html, /<script\b/i);
  assert.match(html, /noindex,follow/);
  assert.match(html, /rel="canonical" href="https:\/\/casey-barton-glaciereq\.vercel\.app\/inventions\/"/);
});

test('role and workflow filters are exact and unknown filters fail visibly', () => {
  const map = inventions.buildMap(portfolioFixture());

  const role = inventions.selection(req('/inventions/?role=Forward-Deployed%20AI%20Architect'), map);
  assert.equal(role.roleRoute.role, 'Forward-Deployed AI Architect');
  assert.equal(role.roleRoute.lenses.length, 3);

  const workflow = inventions.selection(req('/inventions/?workflow=bounded-agent-execution'), map);
  assert.equal(workflow.workflow.id, 'bounded-agent-execution');

  const unknown = inventions.selection(req('/inventions/?workflow=imaginary-capability'), map);
  assert.equal(unknown.workflowRequested, true);
  assert.equal(unknown.workflow, null);
  const html = inventions.renderHtml(map, unknown);
  assert.match(html, /No matching evidence route/);
});

test('route ownership stays narrow and does not hijack existing surfaces', () => {
  for (const path of ['inventions', 'inventions/index.html', 'data/invention-map.json', 'assets/site.inventions.css', '__inventions_verify']) {
    assert.equal(inventions.handles(path), true, path);
  }
  for (const path of ['', 'resume', 'master', 'machine', 'atlas', 'companies/openai']) {
    assert.equal(inventions.handles(path), false, path);
  }
});

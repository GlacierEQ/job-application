const assert = require('node:assert/strict');
const test = require('node:test');

const inventions = require('./api/inventions-proxy.js');

function portfolioFixture() {
  const ids = [...new Set(inventions.constants.LENSES.flatMap((lens) => lens.systemIds))];
  return {
    schema: 'glaciereq.hiring-portfolio.v1',
    release: { evidence_policy: 'claims-do-not-exceed-owning-repository-receipts' },
    person: { roles: ['Forward-Deployed AI Architect', 'Principal Agentic Systems Architect'] },
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

test('buildMap restores all problem lenses with deterministic lineage receipt', () => {
  const first = inventions.buildMap(portfolioFixture());
  const second = inventions.buildMap(portfolioFixture());
  assert.equal(first.schema, 'glaciereq.invention-evidence-map.v2');
  assert.equal(first.lenses.length, 5);
  assert.equal(first.role_routes.length, 2);
  assert.equal(first.receipt_sha256, second.receipt_sha256);
  assert.equal(first.restoration_lineage.donor_commit, inventions.constants.DONOR_COMMIT);
  assert.equal(first.restoration_lineage.contraction_commit, inventions.constants.CONTRACTION_COMMIT);
  assert.ok(first.restoration_lineage.recovered_mechanisms.includes('filterable repository gallery'));
  assert.ok(first.restoration_lineage.recovered_mechanisms.includes('claim-to-proof evidence chain'));
});

test('runtime refuses missing or non-GlacierEQ evidence providers', () => {
  const missing = portfolioFixture();
  missing.flagships = missing.flagships.filter((item) => item.id !== 'akos');
  assert.throws(() => inventions.buildMap(missing), /missing_systems:akos/);

  const foreign = portfolioFixture();
  foreign.flagships[0].repo = 'https://example.com/theater';
  assert.throws(() => inventions.buildMap(foreign), /repo_not_public_glaciereq/);
});

test('HTML keeps later security gains while restoring server-routed filtering', () => {
  const map = inventions.buildMap(portfolioFixture());
  const selected = inventions.selection(req('/inventions/?lens=agent-assurance'), map);
  const html = inventions.renderHtml(map, selected);
  assert.match(html, /Dependable agent operations/);
  assert.doesNotMatch(html, /Application intelligence<\/h2>/);
  assert.match(html, /\?lens=architecture-federation/);
  assert.match(html, /Map receipt/);
  assert.doesNotMatch(html, /<script\b/i);
  assert.match(html, /noindex,follow/);
  assert.match(html, /rel="canonical" href="https:\/\/casey-barton-glaciereq\.vercel\.app\/inventions\/"/);
});

test('role routing is exact and unknown filters fail visibly rather than widening claims', () => {
  const map = inventions.buildMap(portfolioFixture());
  const role = inventions.selection(req('/inventions/?role=Forward-Deployed%20AI%20Architect'), map);
  assert.equal(role.roleRoute.role, 'Forward-Deployed AI Architect');

  const unknown = inventions.selection(req('/inventions/?lens=imaginary-capability'), map);
  assert.equal(unknown.lensRequested, true);
  assert.equal(unknown.lens, null);
  const html = inventions.renderHtml(map, unknown);
  assert.match(html, /No matching evidence route/);
});

test('route ownership is narrow and does not hijack existing surfaces', () => {
  for (const path of ['inventions', 'inventions/index.html', 'data/invention-map.json', 'assets/site.inventions.css', '__inventions_verify']) {
    assert.equal(inventions.handles(path), true, path);
  }
  for (const path of ['', 'resume', 'master', 'machine', 'atlas', 'companies/openai']) {
    assert.equal(inventions.handles(path), false, path);
  }
});

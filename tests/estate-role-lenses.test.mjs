import assert from 'node:assert/strict';
import test from 'node:test';

import { compileRoleLenses, injectRoleLenses, renderRoleLenses, scoreRepository } from '../scripts/render-estate-role-lenses.mjs';

function record(overrides = {}) {
  const name = overrides.name ?? 'agent-platform-runtime';
  return {
    repository: `GlacierEQ/${name}`,
    name,
    url: `https://github.com/GlacierEQ/${name}`,
    description: 'Agent platform automation and reliable workflow runtime',
    language: 'Python',
    default_branch: 'main',
    archived: false,
    fork: false,
    size_kb: 100,
    pushed_at: '2026-08-17T00:00:00Z',
    updated_at: '2026-08-17T00:00:00Z',
    family_id: 'agents-orchestration',
    family: 'Agents, Swarms & Orchestration',
    current_portfolio: false,
    ...overrides,
  };
}

function estate(records) {
  return {
    schema: 'glaciereq.public-estate-explorer.v1',
    portal_source: 'test-sha',
    public_discovered_count: records.length,
    receipt_sha256: 'a'.repeat(64),
    records,
  };
}

test('role lenses produce four deterministic recruiter evidence lanes', () => {
  const rows = [
    record({ name: 'job-application', family_id: 'job-career', family: 'Job Application & Career Intelligence', current_portfolio: true }),
    record({ name: 'agent-coordinator', current_portfolio: true }),
    record({ name: 'gpu-inference-platform', family_id: 'models-inference', family: 'Models, Inference & AI Runtime' }),
    record({ name: 'cloud-control-plane', family_id: 'infrastructure', family: 'Infrastructure, Cloud & Reliability' }),
  ];
  const first = compileRoleLenses(estate(rows), { limit: 3 });
  const second = compileRoleLenses(estate(rows), { limit: 3 });
  assert.equal(first.lenses.length, 4);
  assert.deepEqual(first.lenses, second.lenses);
  assert.equal(first.policy.semantics, 'CAPABILITY_OVERLAP_NOT_HIRING_PREDICTION');
  assert.ok(first.lenses.every((lens) => lens.repositories.length > 0));
});

test('current portfolio and active native evidence wins ties without deleting lineage', () => {
  const lens = {
    family_weights: { 'agents-orchestration': 8 },
    terms: ['agent'],
  };
  const base = scoreRepository(record({ name: 'agent-base' }), lens);
  const portfolio = scoreRepository(record({ name: 'agent-portfolio', current_portfolio: true }), lens);
  const archivedFork = scoreRepository(record({ name: 'agent-old', archived: true, fork: true }), lens);
  assert.ok(portfolio.evidence_score > base.evidence_score);
  assert.ok(base.evidence_score > archivedFork.evidence_score);

  const payload = compileRoleLenses(estate([
    record({ name: 'agent-base' }),
    record({ name: 'agent-portfolio', current_portfolio: true }),
    record({ name: 'agent-old', archived: true, fork: true }),
  ]), { limit: 3 });
  const agentLens = payload.lenses.find((row) => row.id === 'principal-agentic-systems-architect');
  assert.equal(agentLens.repositories.length, 3);
  assert.ok(agentLens.repositories.some((row) => row.archived && row.fork));
});

test('rendered role lenses expose transparent scoring and no private identities', () => {
  const payload = compileRoleLenses(estate([
    record({ name: 'agent-platform', current_portfolio: true }),
    record({ name: 'inference-runtime', family_id: 'models-inference', family: 'Models, Inference & AI Runtime' }),
  ]));
  const html = renderRoleLenses(payload);
  assert.match(html, /ROLE-DRIVEN ESTATE INTELLIGENCE/);
  assert.match(html, /CAPABILITY_OVERLAP_NOT_HIRING_PREDICTION|do not predict hiring outcomes/i);
  assert.match(html, /evidence score/);
  assert.equal(html.includes('PRIVATE_REPOSITORY_IDENTITY_WITHHELD'), false);
});

test('injection is idempotent and leaves full estate section intact', () => {
  const payload = compileRoleLenses(estate([record()]));
  const rendered = renderRoleLenses(payload);
  const source = '<main><section class="section"><div class="shell"><div class="section-head"><div><p class="eyebrow">CAPABILITY FAMILIES</p><h2>All</h2></div></div></div></section></main>';
  const once = injectRoleLenses(source, rendered);
  const twice = injectRoleLenses(once, rendered);
  assert.equal(once, twice);
  assert.equal((twice.match(/ESTATE_ROLE_LENSES_START/g) ?? []).length, 1);
  assert.match(twice, /CAPABILITY FAMILIES/);
});

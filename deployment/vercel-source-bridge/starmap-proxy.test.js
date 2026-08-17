const assert = require('node:assert/strict');
const test = require('node:test');

const runtime = require('./api/starmap-proxy.js');

function projection(count = 4) {
  const stages = runtime.STAGE_IDS.map((id, ordinal) => ({
    id,
    ordinal,
    public_claim_ceiling: `ceiling_${ordinal}`,
  }));
  const companies = Array.from({ length: count }, (_, index) => {
    const ordinal = index % stages.length;
    return {
      company_id: `company_${String(index).padStart(3, '0')}`,
      display_name: `Company ${String(index).padStart(3, '0')}`,
      applicable_flagships: index % 3 === 0 ? ['helix', 'akos'] : index % 3 === 1 ? ['akos'] : [],
      non_affiliation: `Independent company ${index} lens; no affiliation implied.`,
      second_depth: {
        ordinal,
        stage: stages[ordinal].id,
        claim_ceiling: `claim_${ordinal}`,
        blockers: ordinal === 7 ? [] : [`gate_${ordinal}`],
        next_gate: `advance_${ordinal}`,
      },
    };
  });
  return {
    schema: 'glaciereq.company-atlas-projection.v2',
    source_commit: 'a'.repeat(40),
    companies,
    second_depth: {
      schema: 'glaciereq.company-second-depth.v1',
      stage_order: stages,
    },
  };
}

test('buildMap scales beyond the historical 49-company ceiling deterministically', () => {
  const first = runtime.buildMap(projection(166));
  const second = runtime.buildMap(projection(166));
  assert.equal(first.companies.length, 166);
  assert.equal(first.receipt_sha256, second.receipt_sha256);
  assert.equal(first.receipt_sha256.length, 64);
  assert.deepEqual(first.donor_ids, ['akos', 'helix']);
  assert.equal(Object.values(first.stage_counts).reduce((sum, value) => sum + value, 0), 166);
  assert.match(first.restoration_lineage.surpassed_ceiling, /full pinned Helix projection/);
});

test('layout is deterministic, bounded, and covers every company exactly once', () => {
  const map = runtime.buildMap(projection(166));
  const first = runtime.companyLayout(map.companies);
  const second = runtime.companyLayout(map.companies);
  assert.equal(first.positions.size, 166);
  assert.equal(first.positions.size, new Set(first.positions.keys()).size);
  assert.deepEqual([...first.positions], [...second.positions]);
  for (const [x, y] of first.positions.values()) {
    assert.ok(Number.isFinite(x) && Number.isFinite(y));
    assert.ok(x > 0 && x < 1100);
    assert.ok(y > 0 && y < 780);
  }
});

test('server-side selectors fail closed instead of broadening evidence', () => {
  const map = runtime.buildMap(projection(12));
  const validStage = runtime.selection({ url: '/atlas/starmap/?stage=ROLE_VERIFIED' }, map);
  assert.equal(validStage.valid, true);
  assert.ok(validStage.companies.length > 0);
  assert.ok(validStage.companies.every((company) => company.stage === 'ROLE_VERIFIED'));

  const invalidStage = runtime.selection({ url: '/atlas/starmap/?stage=NOT_A_STAGE' }, map);
  assert.equal(invalidStage.valid, false);
  assert.deepEqual(invalidStage.companies, []);

  const invalidCompany = runtime.selection({ url: '/atlas/starmap/?company=missing_company' }, map);
  assert.equal(invalidCompany.valid, false);
  assert.deepEqual(invalidCompany.companies, []);
});

test('rendered runtime preserves script-free proof, donor, machine, and company routes', () => {
  const map = runtime.buildMap(projection(24));
  const selected = runtime.selection({ url: '/atlas/starmap/' }, map);
  const html = runtime.renderHtml(map, selected);
  assert.doesNotMatch(html, /<script(?:\s|>)/i);
  assert.match(html, /V30-PROOF-STARMAP-RUNTIME/);
  assert.match(html, /\/data\/proof-starmap\.json/);
  assert.match(html, /\/companies\/company-000\//);
  assert.match(html, /class="donor-edge"/);
  assert.match(html, /CLAIM PROMOTED/);
  assert.match(html, /server-rendered and fail closed/i);
});

test('runtime route ownership is narrow and CSS stays self-contained', () => {
  assert.equal(runtime.handles('atlas/starmap'), true);
  assert.equal(runtime.handles('atlas/starmap/index.html'), true);
  assert.equal(runtime.handles('data/proof-starmap.json'), true);
  assert.equal(runtime.handles('assets/helix-starmap-runtime.css'), true);
  assert.equal(runtime.handles('__starmap_verify'), true);
  assert.equal(runtime.handles('atlas'), false);
  assert.equal(runtime.handles('inventions'), false);
  assert.match(runtime.CSS, /\.proof-constellation/);
  assert.match(runtime.CSS, /@media\(max-width:700px\)/);
});

test('invalid stage contracts and duplicate companies are rejected', () => {
  const wrongStage = projection(2);
  wrongStage.second_depth.stage_order[1].id = 'WRONG';
  assert.throws(() => runtime.buildMap(wrongStage), /starmap_stage_contract_drift/);

  const duplicate = projection(2);
  duplicate.companies[1].company_id = duplicate.companies[0].company_id;
  assert.throws(() => runtime.buildMap(duplicate), /starmap_duplicate_company/);
});

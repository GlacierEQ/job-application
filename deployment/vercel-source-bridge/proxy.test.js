const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const bridge = require('./api/proxy');

const proxySource = fs.readFileSync(path.join(__dirname, 'api', 'proxy.js'), 'utf8');

test('request path is parsed with WHATWG URL semantics', () => {
  assert.equal(
    bridge.requestPath({ url: '/api/proxy?path=resume%2Fats.txt' }),
    'resume/ats.txt',
  );
});

test('repeated path parameters preserve the previous array-join contract', () => {
  assert.equal(
    bridge.requestPath({ url: '/api/proxy?path=resume&path=index.html' }),
    'resume/index.html',
  );
});

test('missing path remains the root-route contract', () => {
  assert.equal(bridge.requestPath({ url: '/api/proxy' }), '');
  assert.equal(bridge.normalize(''), 'index.html');
});

test('percent-encoded traversal is decoded then rejected', () => {
  const raw = bridge.requestPath({ url: '/api/proxy?path=..%2Fsecret' });
  assert.equal(raw, '../secret');
  assert.equal(bridge.normalize(raw), null);
});

test('bridge source does not depend on legacy URL parsing or req.query', () => {
  assert.match(proxySource, /new URL\(/);
  assert.doesNotMatch(proxySource, /\burl\.parse\s*\(/);
  assert.doesNotMatch(proxySource, /req\.query/);
});

test('V18 projection admits only recruiter-safe public repositories', () => {
  const index = {
    schema: 'glaciereq.company-dossiers-index.v2',
    repository_record_columns: [
      'repository',
      'skill_innovation_level',
      'promotion_state',
      'visibility',
      'inventory_scope',
      'provenance_state',
    ],
    repository_record_legacy_aliases: { promotion_state: {} },
    truth_boundary: {
      public_recruiter_admission_states: ['PROMOTED', 'REFERENCE_ONLY'],
    },
    required_company_tracks: ['anthropic'],
  };

  const shards = [{
    companies: [{
      company_id: 'anthropic',
      display_name: 'Anthropic',
      track_state: 'MAPPED',
      target_roles: ['Agent Infrastructure Engineer'],
      recruiter_thesis: 'Deterministic coordination and fail-closed safety.',
      gap_or_next_gate: 'Inspect exact code paths.',
      non_affiliation: 'Independent work; no affiliation is claimed.',
      repositories: [
        ['GlacierEQ/anthropic-agent-coordinator', 'L4', 'PROMOTED', 'public', 'HELIX_ADMITTED', 'ORIGINAL_CANDIDATE'],
        ['GlacierEQ/private-candidate', 'L4', 'PROMOTED', 'private', 'ESTATE_DISCOVERED_NOT_HELIX_ADMITTED', 'ORIGINAL_CANDIDATE'],
        ['GlacierEQ/quarantined', 'L0', 'PROMOTED', 'public', 'HELIX_ADMITTED', 'ORIGINAL_CANDIDATE'],
      ],
    }],
  }];

  const projection = bridge.compileProjection(index, shards);
  assert.equal(projection.company_count, 1);
  assert.equal(projection.companies[0].repositories.length, 1);
  assert.equal(
    projection.companies[0].repositories[0].repository,
    'GlacierEQ/anthropic-agent-coordinator',
  );
});

test('V18 Atlas and company page preserve four-depth no-script contract', () => {
  const projection = {
    companies: [{
      company_id: 'anthropic',
      display_name: 'Anthropic',
      track_state: 'MAPPED',
      target_roles: ['Agent Infrastructure Engineer'],
      recruiter_thesis: 'Deterministic coordination and fail-closed safety.',
      gap_or_next_gate: 'Inspect exact code paths.',
      non_affiliation: 'Independent work; no affiliation is claimed.',
      repositories: [{
        repository: 'GlacierEQ/anthropic-agent-coordinator',
        level: 'L4',
        promotion_state: 'PROMOTED',
        provenance_state: 'ORIGINAL_CANDIDATE',
      }],
      applicable_flagships: [],
    }],
  };

  const atlas = bridge.renderAtlas(projection);
  const company = bridge.renderCompany(projection.companies[0]);

  assert.match(atlas, /CONSTELLATION MODE/);
  assert.match(atlas, /POWER-MAP MODE/);
  assert.match(company, /01 · RECRUITER/);
  assert.match(company, /02 · MASTER/);
  assert.match(company, /03 · MACHINE/);
  assert.match(company, /04 · MESH/);
  assert.match(company, /ASPIRATION &amp; EVOLUTION/);
  assert.doesNotMatch(atlas, /<script(?:\s|>)/i);
  assert.doesNotMatch(company, /<script(?:\s|>)/i);
});

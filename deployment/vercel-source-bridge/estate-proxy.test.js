const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const estate = require('./api/estate-proxy.js');
const estateSource = fs.readFileSync(path.join(__dirname, 'api', 'estate-proxy.js'), 'utf8');
const routerSource = fs.readFileSync(path.join(__dirname, 'api', 'release-router.js'), 'utf8');

const sampleManifest = {
  freshness_state: 'HISTORICAL_SOURCE_SNAPSHOT_REQUIRES_REFRESH_BEFORE_LIVE_APPLICATION',
  inference_boundary:
    'Observed source material remains separate from GlacierEQ engineering inference.',
  research_as_of: '2026-08-05',
};

const sampleRecord = {
  company_id: 'openai',
  display_name: 'OpenAI',
  observed_current_pressure: 'Long-running isolated agent execution is expanding.',
  inferred_bottleneck: 'Reliable orchestration and recovery.',
  inferred_brick_wall: 'Scale without shared-fate failure or unverifiable completion.',
  application_move: 'Lead with evidence-bound agent execution.',
  next_deep_dive: 'Refresh the current role evidence before applying.',
  leverage: {
    mechanism: 'Deterministic receipts and bounded execution.',
    expected_impact: 'Reduce false completion and debugging ambiguity.',
  },
  official_sources: [
    {
      observed_signal: 'Agent infrastructure and isolated workloads.',
      publisher: 'OpenAI',
      source_sha256: 'a'.repeat(64),
      title: 'Official careers source',
      url: 'https://openai.com/careers/',
    },
  ],
  target_roles: ['Agent Infrastructure Engineer'],
};

test('pins V22 estate authority without changing V21 proof authority', () => {
  assert.equal(
    estate.constants.ESTATE_HELIX_COMMIT,
    'f1234df9101dec2934e46a7935569e68a0eb23c5',
  );
  assert.equal(
    estate.constants.EXTERNAL_SHA256,
    '2d93f4e0c736426dcf6904be6d0139075a48c78f3051278becf05703ee67f654',
  );
  assert.equal(estate.constants.EXPECTED_RECORDS, 47);
  assert.equal(estate.constants.RELEASE, 'V22-ESTATE-INTELLIGENCE-COMPLETE-WEB');
});

test('company route normalization is bounded to governed static company pages', () => {
  assert.equal(estate.companyIdForPath('companies/openai/index.html'), 'openai');
  assert.equal(
    estate.companyIdForPath('companies/google-deepmind/index.html'),
    'google_deepmind',
  );
  assert.equal(estate.companyIdForPath('atlas/openai/index.html'), null);
  assert.equal(estate.companyIdForPath('../companies/openai/index.html'), null);
});

test('normalization omits GlacierEQ repository identity suggestions', () => {
  const raw = {
    ...sampleRecord,
    leverage: {
      ...sampleRecord.leverage,
      glaciereq_systems: ['private-system-name'],
    },
  };
  const record = estate.normalizeRecord(raw, sampleManifest);
  assert.equal(record.company_id, 'openai');
  assert.equal(record.glaciereq_systems, undefined);
  assert.equal(record.repository, undefined);
  assert.equal(record.repositories, undefined);
  assert.equal(record.freshness_state, sampleManifest.freshness_state);
});

test('company intelligence injection is script-free, style-free, and exactly-once', () => {
  const record = estate.normalizeRecord(sampleRecord, sampleManifest);
  const block = estate.companyBlock(record);
  const page = '<!doctype html><html><head></head><body><main><h1>OpenAI</h1></main></body></html>';
  const once = estate.replaceOrInsert(page, block);
  const twice = estate.replaceOrInsert(once, block);
  assert.equal((twice.match(/ESTATE_INTELLIGENCE_START/g) || []).length, 1);
  assert.match(twice, /Observed current pressure/);
  assert.match(twice, /GlacierEQ bottleneck inference/);
  assert.match(twice, /REQUIRES_REFRESH_BEFORE_LIVE_APPLICATION/);
  assert.doesNotMatch(twice, /<script\b/i);
  assert.doesNotMatch(twice, /\sstyle\s*=\s*/i);
});

test('V23 routing preserves historical verifiers and bounds new default traffic', () => {
  assert.doesNotMatch(estateSource, /global\.fetch\s*=/);
  assert.match(estateSource, /rawPath === '__v22_verify'/);
  assert.match(routerSource, /rawPath === '__v21_verify'/);
  assert.match(routerSource, /return proxy\(req, res\)/);
  assert.match(routerSource, /rawPath === '__design_verify'/);
  assert.match(routerSource, /return designProxy\(req, res\)/);
  assert.match(routerSource, /rawPath === '__v22_verify'/);
  assert.match(routerSource, /return estateProxy\(req, res\)/);
  assert.match(routerSource, /truth-runtime\.js/);
  assert.match(routerSource, /return truthRuntime\(req, res\)/);
});

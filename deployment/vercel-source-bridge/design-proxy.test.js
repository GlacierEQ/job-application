const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const design = require('./api/design-proxy.js');
const designSource = fs.readFileSync(path.join(__dirname, 'api', 'design-proxy.js'), 'utf8');
const releaseRouterSource = fs.readFileSync(path.join(__dirname, 'api', 'release-router.js'), 'utf8');
const reconciliation = JSON.parse(fs.readFileSync(
  path.join(__dirname, '..', '..', 'site-v15', 'data', 'company-cardinality-reconciliation.json'),
  'utf8',
));

test('pins the complete web source and reconciled V21 Helix authority', () => {
  assert.equal(design.constants.WEB_SOURCE_COMMIT, '95a91fd9b51c77babf51b3bed7c156acfd9d06f7');
  assert.match(design.constants.HELIX_COMMIT, /^[a-f0-9]{40}$/);
  assert.equal(design.constants.HELIX_COMMIT, reconciliation.authoritative_helix_commit);
  assert.equal(reconciliation.status, 'PASS');
  assert.equal(design.constants.RELEASE, 'V21-FIRST-STAR-COMPLETE-WEB');
});

test('injects complete and interaction stylesheets exactly once', () => {
  const source = Buffer.from('<!doctype html><html><head><link rel="stylesheet" href="/assets/site.css"></head><body><h1>x</h1></body></html>');
  const once = design.designHtml(source).toString('utf8');
  const twice = design.designHtml(Buffer.from(once)).toString('utf8');
  assert.equal((once.match(/site\.complete\.css/g) || []).length, 1);
  assert.equal((once.match(/site\.interaction\.css/g) || []).length, 1);
  assert.equal(twice, once);
});

test('does not mutate non-HTML fragments without a head', () => {
  const source = Buffer.from('{"ok":true}');
  assert.equal(design.designHtml(source).toString('utf8'), source.toString('utf8'));
});

test('design bridge cannot mutate process-wide fetch state', () => {
  assert.doesNotMatch(designSource, /global\.fetch\s*=/);
  assert.doesNotMatch(designSource, /sourceRewrite\s*\(/);
  assert.match(designSource, /if \(rawPath === '__v21_verify'\) return proxy\(req, res\)/);
  assert.match(designSource, /verifyCanonicalV21/);
});

test('release router preserves the original canonical V21 verifier', () => {
  assert.match(releaseRouterSource, /rawPath === '__v21_verify'/);
  assert.match(releaseRouterSource, /return proxy\(req, res\)/);
  assert.match(releaseRouterSource, /return designProxy\(req, res\)/);
});

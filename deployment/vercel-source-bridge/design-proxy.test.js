const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const design = require('./api/design-proxy.js');
const designSource = fs.readFileSync(path.join(__dirname, 'api', 'design-proxy.js'), 'utf8');
const releaseRouterSource = fs.readFileSync(path.join(__dirname, 'api', 'release-router.js'), 'utf8');

test('pins the complete web source and V21 Helix proof authority', () => {
  assert.equal(design.constants.WEB_SOURCE_COMMIT, '261a3fb38d1236f15a50ce0a95d565cc9940bda9');
  assert.equal(design.constants.HELIX_COMMIT, '8345955b67f163c3215b23195a267b6021a5be5e');
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

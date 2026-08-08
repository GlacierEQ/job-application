const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const typography = require('./api/typography-proxy.js');
const releaseRouterSource = fs.readFileSync(
  path.join(__dirname, 'api', 'release-router.js'),
  'utf8',
);

test('pins the reviewed Algerian presentation source and exact CSS blob', () => {
  assert.equal(
    typography.constants.TYPOGRAPHY_SOURCE_COMMIT,
    '955e2ce0a030bef2863d6137ae1f567975b8d0a1',
  );
  assert.equal(
    typography.constants.TYPOGRAPHY_CSS_BLOB,
    '5b5e603017d990e94f3e6cba5aa06402cbb24c5b',
  );
  assert.equal(typography.constants.RELEASE, 'V23-ALGERIAN-DISPLAY');
});

test('injects Algerian typography after the interaction layer exactly once', () => {
  const source = Buffer.from(
    '<!doctype html><html><head>'
      + '<link rel="stylesheet" href="/assets/site.complete.css">'
      + '<link rel="stylesheet" href="/assets/site.interaction.css">'
      + '</head><body><h1>x</h1></body></html>',
  );
  const once = typography.injectTypography(source).toString('utf8');
  const twice = typography.injectTypography(Buffer.from(once)).toString('utf8');
  assert.equal((once.match(/site\.algerian\.css/g) || []).length, 1);
  assert.ok(
    once.indexOf('site.interaction.css') < once.indexOf('site.algerian.css'),
    'Algerian layer must follow the interaction layer',
  );
  assert.equal(twice, once);
});

test('rejects duplicate Algerian links rather than hiding release drift', () => {
  const duplicate = Buffer.from(
    '<html><head>'
      + '<link rel="stylesheet" href="/assets/site.algerian.css">'
      + '<link rel="stylesheet" href="/assets/site.algerian.css">'
      + '</head><body><h1>x</h1></body></html>',
  );
  assert.throws(() => typography.injectTypography(duplicate), /duplicate_algerian_stylesheet/);
});

test('release router preserves historical verifiers and routes current traffic through typography', () => {
  assert.match(releaseRouterSource, /rawPath === '__v21_verify'/);
  assert.match(releaseRouterSource, /rawPath === '__design_verify'/);
  assert.match(releaseRouterSource, /rawPath === '__v22_verify'/);
  assert.match(releaseRouterSource, /return typographyProxy\(req, res\)/);
});

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
    'b4a1d9ccd8749b29129a09881d0bd183337b1a41',
  );
  assert.equal(
    typography.constants.TYPOGRAPHY_CSS_BLOB,
    'f9b29ee4b2fd3b82a30c1e10c23102f35fc62467',
  );
  assert.equal(typography.constants.RELEASE, 'V24-ALGERIAN-DISPLAY');
});

test('strengthens Algerian fallback for Apple surfaces without bundling a font binary', async () => {
  const css = (await typography.loadTypographyCss()).toString('utf8');
  assert.match(css, /"Algerian","Copperplate","Copperplate Gothic Bold"/);
  assert.match(css, /-webkit-text-stroke:/);
  assert.match(css, /text-shadow:/);
  assert.match(css, /font-weight:700/);
  assert.doesNotMatch(css, /@font-face\b/i);
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

test('release router preserves V21 through V23 verifier history before V24', () => {
  assert.match(releaseRouterSource, /rawPath === '__v21_verify'/);
  assert.match(releaseRouterSource, /rawPath === '__design_verify'/);
  assert.match(releaseRouterSource, /rawPath === '__v22_verify'/);
  assert.match(releaseRouterSource, /rawPath === '__v23_verify'/);
  assert.match(releaseRouterSource, /return truthRuntime\(req, res\)/);
  assert.match(releaseRouterSource, /return typographyProxy\(req, res\)/);
});

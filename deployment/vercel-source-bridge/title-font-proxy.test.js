const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const titleFont = require('./api/title-font-proxy.js');
const releaseRouterSource = fs.readFileSync(
  path.join(__dirname, 'api', 'release-router.js'),
  'utf8',
);

test('pins the OFL Rye title source and keeps browser font loading same-origin', () => {
  assert.equal(titleFont.constants.RELEASE, 'V26-TRUE-ALGERIAN-TITLE');
  assert.equal(titleFont.constants.FONT_SOURCE, 'Fontsource Rye 5.3.0 · OFL-1.1');
  assert.equal(
    titleFont.constants.FONT_URL,
    'https://cdn.jsdelivr.net/fontsource/fonts/rye@5.3.0/latin-400-normal.woff2',
  );
  assert.equal(titleFont.constants.FONT_PATH, 'assets/title-algerian.woff2');
  assert.equal(titleFont.constants.EXPECTED_FONT_SHA256, '00de26ff9e435fb8f9e3ad15877f9deb4b70f3945ae0abcf7f0ed278d593014b');
  assert.match(titleFont.TITLE_FONT_CSS, /font-family: "Glacier Algerian Title"/);
  assert.match(titleFont.TITLE_FONT_CSS, /url\("\/assets\/title-algerian\.woff2"\)/);
  assert.doesNotMatch(titleFont.TITLE_FONT_CSS, /https?:\/\//);
});

test('limits trueface to page titles and brand title while preserving secondary heading hierarchy', () => {
  assert.match(titleFont.TITLE_FONT_CSS, /:where\(h1,\.brand strong\)/);
  assert.doesNotMatch(titleFont.TITLE_FONT_CSS, /:where\(h1,h2,h3,h4,h5,h6/);
  assert.doesNotMatch(titleFont.TITLE_FONT_CSS, /body\s*\{/);
});

test('injects V26 after Algerian exactly once', () => {
  const source = Buffer.from(
    '<!doctype html><html><head>'
      + '<link rel="stylesheet" href="/assets/site.complete.css">'
      + '<link rel="stylesheet" href="/assets/site.algerian.css">'
      + '</head><body><h1>Title</h1></body></html>',
  );
  const once = titleFont.injectTitleFont(source).toString('utf8');
  const twice = titleFont.injectTitleFont(Buffer.from(once)).toString('utf8');
  assert.equal((once.match(/site\.title-font\.css/g) || []).length, 1);
  assert.ok(
    once.indexOf('site.algerian.css') < once.indexOf('site.title-font.css'),
    'true title face must override the general Algerian presentation layer',
  );
  assert.equal(twice, once);
});

test('release router preserves historical verifiers and promotes V26 as presentation owner', () => {
  for (const marker of ['__v21_verify', '__design_verify', '__v22_verify', '__v23_verify', '__v24_verify', '__v25_verify', '__v26_verify']) {
    assert.match(releaseRouterSource, new RegExp(marker));
  }
  assert.match(releaseRouterSource, /return titleFontProxy\(req, res\)/);
});

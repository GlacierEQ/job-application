const assert = require('node:assert/strict');
const test = require('node:test');
const monument = require('./api/monument-title-proxy.js');
const releaseRouter = require('./api/release-router.js');

function capture(handler, req) {
  return new Promise((resolve, reject) => {
    const headers = new Map();
    let settled = false;
    const res = {
      statusCode: 200,
      setHeader(name, value) { headers.set(String(name).toLowerCase(), value); },
      getHeader(name) { return headers.get(String(name).toLowerCase()); },
      end(chunk = '') {
        if (settled) return;
        settled = true;
        resolve({ status: this.statusCode, headers, body: Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk)) });
      },
    };
    Promise.resolve(handler(req, res)).then(() => {
      if (!settled) reject(new Error('capture_did_not_end'));
    }).catch(reject);
  });
}

test('V27 points at exact-version Ewert and same-origin browser asset', () => {
  const { constants, MONUMENT_CSS } = monument;
  assert.equal(constants.RELEASE, 'V27-ALGERIAN-MONUMENT');
  assert.equal(constants.FONT_SOURCE, 'Fontsource Ewert 5.3.0 · OFL-1.1');
  assert.equal(constants.FONT_URL, 'https://cdn.jsdelivr.net/fontsource/fonts/ewert@5.3.0/latin-400-normal.woff2');
  assert.equal(constants.FONT_PATH, 'assets/title-monument.woff2');
  assert.match(MONUMENT_CSS, /url\("\/assets\/title-monument\.woff2"\)/);
  assert.match(MONUMENT_CSS, /Glacier Algerian Monument/);
});

test('V27 is materially more monumental while keeping secondary headings under V24', () => {
  const css = monument.MONUMENT_CSS;
  assert.match(css, /:where\(h1,\.brand strong\)/);
  assert.match(css, /-webkit-text-stroke:/);
  assert.match(css, /0 24px 64px rgba\(0,168,112/);
  assert.match(css, /h2,h3,h4,h5,h6\s*\{/);
  assert.doesNotMatch(css, /:where\(h1,h2,h3,h4,h5,h6/);
  assert.doesNotMatch(css, /font-family:[^}]*Glacier Algerian Monument[^}]*h2/s);
});

test('V27 injection replaces V26 presentation ownership rather than stacking trueface fonts', () => {
  const source = Buffer.from('<html><head><link rel="stylesheet" href="/assets/site.algerian.css"></head><body><h1>Hello</h1></body></html>');
  const first = monument.injectMonument(source).toString('utf8');
  const second = monument.injectMonument(Buffer.from(first)).toString('utf8');
  assert.equal((first.match(/site\.title-monument\.css/g) || []).length, 1);
  assert.equal((second.match(/site\.title-monument\.css/g) || []).length, 1);
  assert.equal(first.includes('site.title-font.css'), false);
  assert.ok(first.indexOf('site.algerian.css') < first.indexOf('site.title-monument.css'));
});

test('release router preserves V26 verifier and promotes V27 as default title owner', async () => {
  const v26 = await capture(releaseRouter, { url: '/?path=__v26_verify' });
  assert.notEqual(v26.status, 404);
  const source = require('node:fs').readFileSync(require.resolve('./api/release-router.js'), 'utf8');
  assert.match(source, /__v26_verify/);
  assert.match(source, /__v27_verify/);
  assert.match(source, /return monumentTitleProxy\(req, res\);/);
});

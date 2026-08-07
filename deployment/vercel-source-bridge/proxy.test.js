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

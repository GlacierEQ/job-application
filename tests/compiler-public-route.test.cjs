const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const { compilerRewriteUrl } = require('../api/compiler.js');

test('compiler function maps public route selector query to existing source-backed runtime', () => {
  const url = compilerRewriteUrl('/api/compiler?__view=html&company=nvidia&depth=senior_engineer');
  const parsed = new URL(url, 'https://glaciereq.invalid');
  assert.equal(parsed.searchParams.get('path'), 'compiler/index.html');
  assert.equal(parsed.searchParams.get('company'), 'nvidia');
  assert.equal(parsed.searchParams.get('depth'), 'senior_engineer');
  assert.equal(parsed.searchParams.has('__view'), false);
});

test('compiler generated JSON and stylesheet routes use narrow, declared views', () => {
  for (const [view, expected] of Object.entries({
    json: 'data/application-compiler.json',
    css: 'assets/application-compiler.css',
    motion: 'assets/site.emerald-motion.css',
  })) {
    const parsed = new URL(compilerRewriteUrl('/api/compiler?__view=' + view), 'https://glaciereq.invalid');
    assert.equal(parsed.searchParams.get('path'), expected);
  }
  assert.equal(compilerRewriteUrl('/api/compiler?__view=unrecognized'), null);
});

test('Vercel sends only explicitly declared compiler routes to the new function', () => {
  const cfg = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'vercel.json'), 'utf8'));
  const map = new Map((cfg.rewrites || []).map(entry => [entry.source, entry.destination]));
  for (const [source, view] of [
    ['/compiler/', 'html'], ['/compiler', 'html'],
    ['/data/application-compiler.json', 'json'],
    ['/assets/application-compiler.css', 'css'],
    ['/assets/site.emerald-motion.css', 'motion'],
  ]) {
    assert.equal(map.get(source), '/api/compiler?__view=' + view);
  }
  assert.equal(map.has('/companies/:slug/'), false);
  assert.equal(map.has('/atlas/:slug/'), false);
  assert.equal(map.has('/(.*)'), false);
});

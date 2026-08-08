const assert = require('node:assert/strict');
const test = require('node:test');

const design = require('./api/design-proxy.js');

test('pins the V21 complete web source and Helix authority', () => {
  assert.equal(design.constants.WEB_SOURCE_COMMIT, '908b2ae135ec81225aafa882c9ff79b0564b23af');
  assert.equal(design.constants.HELIX_COMMIT, '83549cda4af3714304f202d0f4d35b29d28da9f7');
  assert.equal(design.constants.RELEASE, 'V21-FIRST-STAR-COMPLETE-WEB');
});

test('injects the complete stylesheet exactly once', () => {
  const source = Buffer.from('<!doctype html><html><head><link rel="stylesheet" href="/assets/site.css"></head><body><h1>x</h1></body></html>');
  const once = design.designHtml(source).toString('utf8');
  const twice = design.designHtml(Buffer.from(once)).toString('utf8');
  assert.match(once, /site\.complete\.css/);
  assert.equal((once.match(/site\.complete\.css/g) || []).length, 1);
  assert.equal(twice, once);
});

test('does not mutate non-HTML fragments without a head', () => {
  const source = Buffer.from('{"ok":true}');
  assert.equal(design.designHtml(source).toString('utf8'), source.toString('utf8'));
});

test('git blob hashing matches canonical Git framing', () => {
  const body = Buffer.from('hello\n');
  assert.equal(design.gitBlobSha(body), 'ce013625030ba8dba906f756967f9e9ca394464a');
});

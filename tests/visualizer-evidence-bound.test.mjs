import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const html = await readFile(new URL('../site-v15/visualizer/index.html', import.meta.url), 'utf8');

test('visualizer is explicitly evidence-bound rather than simulated live telemetry', () => {
  assert.match(html, /EVIDENCE-BOUND ARCHITECTURE EXPLORER/);
  assert.match(html, /not live operational telemetry/);
  assert.match(html, /NO SYNTHETIC HEALTH/);
  assert.doesNotMatch(html, /LIVE TELEMETRY MATRIX/i);
  assert.doesNotMatch(html, /Real-Time Execution Log/i);
  assert.doesNotMatch(html, /100% OPERATIONAL/i);
  assert.doesNotMatch(html, /Math\.random\s*\(/);
  assert.doesNotMatch(html, /setInterval\s*\(/);
});

test('visualizer never projects credential state or synthetic runtime health', () => {
  assert.doesNotMatch(html, /GITHUB_MASTER_TOKEN/i);
  assert.doesNotMatch(html, /token\s+active/i);
  assert.doesNotMatch(html, /5000\s+rem/i);
  assert.doesNotMatch(html, /ONLINE\s+200/i);
  assert.doesNotMatch(html, /0\.12ms/i);
});

test('every architecture node carries a repository evidence route and claim boundary', () => {
  const nodeRecords = [...html.matchAll(/\{id:'[^']+'.*?url:'([^']+)'\}/g)];
  assert.equal(nodeRecords.length, 7);
  for (const [, url] of nodeRecords) {
    assert.match(url, /^https:\/\/github\.com\/GlacierEQ(?:\/|$)/);
  }
  assert.equal((html.match(/state:'SOURCE OBSERVED'/g) ?? []).length, 7);
  assert.equal((html.match(/boundary:'/g) ?? []).length, 7);
});

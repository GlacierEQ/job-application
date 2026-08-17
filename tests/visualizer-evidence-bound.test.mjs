import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const html = await readFile(new URL('../site-v15/visualizer/index.html', import.meta.url), 'utf8');
const css = await readFile(new URL('../site-v15/assets/site.visualizer.css', import.meta.url), 'utf8');

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

test('visualizer stays inside the production script-free boundary', () => {
  assert.doesNotMatch(html, /<script\b/i);
  assert.doesNotMatch(html, /\sstyle\s*=\s*/i);
  assert.match(html, /href="\/assets\/site\.complete\.css"/);
  assert.match(html, /href="\/assets\/site\.visualizer\.css"/);
  assert.match(css, /\.architecture-node:hover/);
  assert.match(css, /\.system-card:target/);
});

test('visualizer never projects credential state or synthetic runtime health', () => {
  assert.doesNotMatch(html, /GITHUB_MASTER_TOKEN/i);
  assert.doesNotMatch(html, /token\s+active/i);
  assert.doesNotMatch(html, /5000\s+rem/i);
  assert.doesNotMatch(html, /ONLINE\s+200/i);
  assert.doesNotMatch(html, /0\.12ms/i);
});

test('every architecture family carries a source-observed evidence card', () => {
  assert.equal((html.match(/data-system-node=/g) ?? []).length, 7);
  assert.equal((html.match(/<b>SOURCE OBSERVED<\/b>/g) ?? []).length, 7);
  assert.equal((html.match(/https:\/\/github\.com\/GlacierEQ/g) ?? []).length >= 7, true);
  for (const id of ['helix', 'application', 'akos', 'echo', 'babel', 'procode', 'estate']) {
    assert.match(html, new RegExp(`href="#system-${id}"`));
    assert.match(html, new RegExp(`id="system-${id}"`));
  }
});

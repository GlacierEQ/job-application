import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

import { buildLibraryModel, renderLibrary } from '../scripts/render-capability-library.mjs';

const portfolio = JSON.parse(fs.readFileSync(new URL('../site-v15/data/portfolio.json', import.meta.url), 'utf8'));

test('library preserves every recruiter-safe capability card', () => {
  const model = buildLibraryModel(portfolio);
  assert.equal(model.capability_count, portfolio.flagships.length);
  assert.equal(model.systems.length, portfolio.flagships.length);
  assert.ok(model.capability_count >= 16, 'restored portfolio depth unexpectedly collapsed');
});

test('recovered donor capabilities remain discoverable', () => {
  const model = buildLibraryModel(portfolio);
  const ids = new Set(model.systems.map((system) => system.id));
  for (const required of ['microcode', 'security', 'servers', 'energy', 'nanosphere']) {
    assert.ok(ids.has(required), `missing recovered capability: ${required}`);
  }
  assert.ok(model.recovered_capability_count >= 5);
});

test('withheld private identities never become links', () => {
  const model = buildLibraryModel(portfolio);
  for (const system of model.systems.filter((row) => row.repository_identity_withheld)) {
    assert.equal(system.repository, null);
  }
  const html = renderLibrary(model);
  assert.ok(!html.includes('PRIVATE_REPOSITORY_IDENTITY_WITHHELD" target='));
  assert.ok(html.includes('Repository identity withheld'));
});

test('library emits machine-readable and human discovery contracts', () => {
  const model = buildLibraryModel(portfolio);
  const html = renderLibrary(model);
  assert.equal(model.schema, 'glaciereq.recruiter-capability-library.v1');
  assert.match(html, /The capability library is back\./);
  assert.match(html, /\/data\/capability-library\.json/);
  assert.match(html, /\/inventions\//);
  assert.match(html, /\/visualizer\//);
});

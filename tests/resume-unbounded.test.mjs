import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = relative => readFileSync(path.join(root, relative), 'utf8');

test('legacy PDF generator cannot force pagination or a two-page break', () => {
  const generator = read('site-v15/scripts/generate-resume-v17.py');
  assert.doesNotMatch(generator, /WD_BREAK\.PAGE|add_break\(WD_BREAK\.PAGE\)/);
  assert.doesNotMatch(generator, /^# Page 2\s*$/m);
});

test('current hiring contract has no résumé page ceiling', () => {
  const readme = read('README.md');
  const current = readme.split('## Résumé Intelligence')[1]?.split('\n## ')[0];
  assert.ok(current, 'current résumé contract not found');
  assert.match(current, /no artificial page-count limit/i);
  assert.match(current, /no fixed page ceiling/i);
  assert.doesNotMatch(current, /two-page recruiter\/hiring-manager PDF/);
});

test('presentation contract prohibits fixed page ceilings and loss of source facts', () => {
  const contract = read('docs/UNBOUNDED_PUBLIC_SURFACE.md');
  assert.match(contract, /no fixed page count/i);
  assert.match(contract, /cannot erase qualified source facts/i);
});

test('all canonical employers survive in résumé generator', () => {
  const canonical = JSON.parse(read('site-v15/data/resume.json'));
  const generator = read('site-v15/scripts/generate-resume-v17.py');
  for (const entry of canonical.work) {
    assert.ok(generator.includes(entry.name), 'missing employer in generator: ' + entry.name);
  }
});

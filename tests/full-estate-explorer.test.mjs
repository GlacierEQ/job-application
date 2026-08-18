import assert from 'node:assert/strict';
import test from 'node:test';

import { classifyRepository, compilePublicEstate } from '../scripts/render-full-estate-explorer.mjs';

function repo(overrides = {}) {
  const name = overrides.name ?? 'sample-system';
  return {
    id: overrides.id ?? Math.floor(Math.random() * 1_000_000),
    name,
    full_name: `GlacierEQ/${name}`,
    html_url: `https://github.com/GlacierEQ/${name}`,
    description: '',
    language: 'Python',
    default_branch: 'main',
    archived: false,
    fork: false,
    private: false,
    visibility: 'public',
    size: 10,
    pushed_at: '2026-08-17T00:00:00Z',
    updated_at: '2026-08-17T00:00:00Z',
    topics: [],
    ...overrides,
  };
}

test('classifies restored capability families without making classification an exclusion gate', () => {
  assert.equal(classifyRepository(repo({ name: 'job-app-helix' })).id, 'job-career');
  assert.equal(classifyRepository(repo({ name: 'openai-tool-authority-matrix' })).id, 'company-engineering');
  assert.equal(classifyRepository(repo({ name: 'APEX-HIGH-COUNCIL' })).id, 'apex-control');
  assert.equal(classifyRepository(repo({ name: 'legalAI' })).id, 'legal-intelligence');
  assert.equal(classifyRepository(repo({ name: 'constellation-memory-engine' })).id, 'memory-context');
});

test('keeps active, archived, and fork lineage instead of curating them away', () => {
  const source = [
    repo({ id: 1, name: 'job-application' }),
    repo({ id: 2, name: 'old-but-valuable', archived: true }),
    repo({ id: 3, name: 'upstream-study', fork: true }),
  ];
  const portfolio = { flagships: [{ repo: 'https://github.com/GlacierEQ/job-application' }] };
  const result = compilePublicEstate(source, portfolio);
  assert.equal(result.records.length, 3);
  assert.equal(result.records.filter((row) => row.archived).length, 1);
  assert.equal(result.records.filter((row) => row.fork).length, 1);
  assert.equal(result.records.find((row) => row.name === 'job-application').current_portfolio, true);
  assert.equal(result.families.reduce((sum, family) => sum + family.count, 0), 3);
});

test('deduplicates repeated API rows without losing unique repositories', () => {
  const repeated = repo({ id: 11, name: 'same-repo' });
  const result = compilePublicEstate([repeated, { ...repeated }, repo({ id: 12, name: 'other-repo' })]);
  assert.deepEqual(result.records.map((row) => row.name).sort(), ['other-repo', 'same-repo']);
});

test('never emits private repository identities into the public estate output', () => {
  const result = compilePublicEstate([
    repo({ id: 20, name: 'public-system' }),
    repo({ id: 21, name: 'private-system', private: true, visibility: 'private' }),
  ]);
  assert.deepEqual(result.records.map((row) => row.name), ['public-system']);
  assert.equal(JSON.stringify(result).includes('private-system'), false);
});

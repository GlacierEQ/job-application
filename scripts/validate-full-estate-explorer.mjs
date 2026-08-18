#!/usr/bin/env node

import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SITE = path.join(ROOT, 'site-v15');

function assert(condition, message) {
  if (!condition) throw new Error(`Full estate explorer validation failed: ${message}`);
}

const [payload, html] = await Promise.all([
  readFile(path.join(SITE, 'data', 'public-estate.json'), 'utf8').then(JSON.parse),
  readFile(path.join(SITE, 'estate', 'index.html'), 'utf8'),
]);

assert(payload.schema === 'glaciereq.public-estate-explorer.v1', 'schema drift');
assert(payload.owner === 'GlacierEQ', 'owner drift');
assert(Array.isArray(payload.records) && payload.records.length === payload.public_discovered_count, 'record count mismatch');
assert(payload.public_discovered_count >= 100, 'public discovery is suspiciously small');
assert(Array.isArray(payload.families) && payload.families.length >= 8, 'family classification collapsed');
assert(payload.scope?.estate?.repository_count >= payload.public_discovered_count, 'public count exceeds full estate snapshot');
assert(payload.scope?.job_rollout_projection?.repository_count === 67, '67-repository rollout projection contract drift');
assert(payload.scope?.job_rollout_projection?.is_full_estate_inventory === false, 'rollout projection mislabeled as full estate');
assert(payload.scope?.invariants?.full_estate_discovery_precedes_rollout_admission === true, 'full-estate-first invariant missing');
assert(payload.scope?.invariants?.private_repository_names_must_not_be_emitted_to_public_artifacts === true, 'private identity boundary missing');
assert(payload.restoration_lineage?.donor_commit === '901fe77d2c6015feb1650133b751efff8aa0d24c', 'V13 donor lineage drift');
assert(payload.restoration_lineage?.contraction_commit === '61042c4018db90589715fe1c7f6a2c58879ac2b2', 'contraction lineage drift');

const seen = new Set();
for (const record of payload.records) {
  assert(typeof record.repository === 'string' && record.repository.startsWith('GlacierEQ/'), `invalid repository identity ${record.repository}`);
  assert(typeof record.url === 'string' && record.url.startsWith('https://github.com/GlacierEQ/'), `invalid public URL ${record.url}`);
  assert(!seen.has(record.repository.toLowerCase()), `duplicate repository ${record.repository}`);
  seen.add(record.repository.toLowerCase());
  assert(record.visibility !== 'private', `private visibility leaked for ${record.repository}`);
  assert(typeof record.family_id === 'string' && record.family_id.length > 0, `family missing for ${record.repository}`);
}

const familyTotal = payload.families.reduce((sum, family) => sum + family.count, 0);
assert(familyTotal === payload.public_discovered_count, 'family counts do not cover the full public estate');
assert(payload.archived_public_discovered_count === payload.records.filter((row) => row.archived).length, 'archive count mismatch');
assert(payload.fork_public_discovered_count === payload.records.filter((row) => row.fork).length, 'fork count mismatch');
assert(payload.archived_public_discovered_count > 0, 'archived lineage was erased from public estate');

for (const required of [
  'The library is the substrate. The recruiter view is only a projection.',
  'zero curation deletion',
  '/estate/',
  '901fe77d2c6015feb1650133b751efff8aa0d24c',
  '61042c4018db90589715fe1c7f6a2c58879ac2b2',
  'Inventory proves presence and lineage only',
]) {
  assert(html.includes(required), `page missing required restoration marker: ${required}`);
}

assert(!html.includes('<script'), 'estate explorer must remain script-free under current CSP');
assert(!html.includes('PRIVATE_REPOSITORY_IDENTITY_WITHHELD/'), 'withheld identity was turned into a URL');
assert(!html.includes('visibility="private"'), 'private visibility leaked into page');

console.log(JSON.stringify({
  status: 'PASS',
  schema: payload.schema,
  public_repositories: payload.public_discovered_count,
  families: payload.families.length,
  archived_preserved: payload.archived_public_discovered_count,
  forks_preserved: payload.fork_public_discovered_count,
  current_portfolio_public: payload.current_portfolio_public_count,
  rollout_projection_is_full_estate: payload.scope.job_rollout_projection.is_full_estate_inventory,
  donor: payload.restoration_lineage.donor_commit,
  contraction: payload.restoration_lineage.contraction_commit,
}, null, 2));

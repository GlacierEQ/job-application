#!/usr/bin/env node

import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SITE = path.join(ROOT, 'site-v15');

function fail(message) {
  throw new Error(`Estate role-lens validation failed: ${message}`);
}

const [payload, estate, html] = await Promise.all([
  readFile(path.join(SITE, 'data', 'estate-role-lenses.json'), 'utf8').then(JSON.parse),
  readFile(path.join(SITE, 'data', 'public-estate.json'), 'utf8').then(JSON.parse),
  readFile(path.join(SITE, 'estate', 'index.html'), 'utf8'),
]);

if (payload?.schema !== 'glaciereq.estate-role-lenses.v1') fail('unexpected schema');
if (payload?.policy?.semantics !== 'CAPABILITY_OVERLAP_NOT_HIRING_PREDICTION') fail('role-fit boundary missing');
if (payload?.source?.receipt_sha256 !== estate?.receipt_sha256) fail('public-estate receipt binding mismatch');
if (!Array.isArray(payload.lenses) || payload.lenses.length !== 4) fail('four current target-role lenses required');
if (new Set(payload.lenses.map((lens) => lens.id)).size !== payload.lenses.length) fail('duplicate role-lens identity');

const publicRepositories = new Set((estate.records ?? []).map((row) => row.repository));
let rows = 0;
for (const lens of payload.lenses) {
  if (!Array.isArray(lens.repositories) || lens.repositories.length === 0) fail(`${lens.id}: no surfaced repositories`);
  for (const [index, repository] of lens.repositories.entries()) {
    rows += 1;
    if (repository.rank !== index + 1) fail(`${lens.id}: unstable rank sequence`);
    if (!publicRepositories.has(repository.repository)) fail(`${lens.id}: repository absent from public estate`);
    if (!repository.url?.startsWith('https://github.com/GlacierEQ/')) fail(`${lens.id}: foreign/non-public URL`);
    if (!Number.isFinite(repository.evidence_score)) fail(`${lens.id}: evidence score missing`);
  }
}

if ((html.match(/ESTATE_ROLE_LENSES_START/g) ?? []).length !== 1) fail('role-lens start marker cardinality');
if ((html.match(/ESTATE_ROLE_LENSES_END/g) ?? []).length !== 1) fail('role-lens end marker cardinality');
for (const lens of payload.lenses) {
  if (!html.includes(lens.title)) fail(`${lens.id}: rendered role title missing`);
}
if (!html.includes('CAPABILITY FAMILIES')) fail('full estate family surface was displaced');
if (html.includes('PRIVATE_REPOSITORY_IDENTITY_WITHHELD')) fail('private repository identity sentinel leaked');

console.log(JSON.stringify({
  status: 'PASS',
  schema: payload.schema,
  roles: payload.lenses.length,
  role_repository_rows: rows,
  unique_repositories: new Set(payload.lenses.flatMap((lens) => lens.repositories.map((row) => row.repository))).size,
  public_estate_repositories: estate.records.length,
  source_receipt_sha256: estate.receipt_sha256,
  receipt_sha256: payload.receipt_sha256,
}, null, 2));

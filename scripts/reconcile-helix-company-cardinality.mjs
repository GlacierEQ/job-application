#!/usr/bin/env node

import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SNAPSHOT = path.join(ROOT, 'site-v15/data/helix-root.json');
const RECEIPT = path.join(ROOT, 'site-v15/data/company-cardinality-reconciliation.json');

const CARDINALITY_CONSUMERS = [
  'scripts/validate-helix-projection.mjs',
  'scripts/link-helix-atlas.mjs',
  'scripts/validate-helix-atlas.mjs',
  'site-v15/scripts/validate.mjs',
  'deployment/vercel-source-bridge/api/proxy.js',
  'deployment/vercel-source-bridge/api/design-proxy.js',
  'deployment/vercel-source-bridge/api/compiler-proxy.js',
  'deployment/vercel-source-bridge/api/typography-proxy.js',
  'deployment/vercel-source-bridge/proxy.test.js',
  'deployment/vercel-source-bridge/design-proxy.test.js',
  'deployment/vercel-source-bridge/typography-proxy.test.js',
];

const CONTEXT = /(compan(?:y|ies)|track|atlas|portfolio|helix)/i;

function sha256(text) {
  return createHash('sha256').update(text).digest('hex');
}

const snapshotText = await readFile(SNAPSHOT, 'utf8');
const snapshot = JSON.parse(snapshotText);
const companyCount = Array.isArray(snapshot.companies) ? snapshot.companies.length : 0;
if (!Number.isInteger(companyCount) || companyCount < 1) {
  throw new Error('Helix snapshot does not expose a non-empty company projection');
}

const patched = [];
for (const relative of CARDINALITY_CONSUMERS) {
  const target = path.join(ROOT, relative);
  let source;
  try {
    source = await readFile(target, 'utf8');
  } catch (error) {
    if (error?.code === 'ENOENT') continue;
    throw error;
  }

  let replacements = 0;
  const next = source
    .split('\n')
    .map(line => {
      if (!line.includes('49') || !CONTEXT.test(line)) return line;
      const changed = line.replace(/\b49\b/g, String(companyCount));
      if (changed !== line) replacements += (line.match(/\b49\b/g) ?? []).length;
      return changed;
    })
    .join('\n');

  if (replacements > 0) {
    await writeFile(target, next, 'utf8');
    patched.push({
      path: relative,
      replacements,
      before_sha256: sha256(source),
      after_sha256: sha256(next),
    });
  }
}

if (companyCount !== 49 && patched.length === 0) {
  throw new Error(`Helix company count is ${companyCount}, but no stale 49-track consumer was reconciled`);
}

const receipt = {
  schema: 'glaciereq.public-company-cardinality-reconciliation.v1',
  status: 'PASS',
  source: 'site-v15/data/helix-root.json',
  source_sha256: sha256(snapshotText),
  authoritative_company_tracks: companyCount,
  legacy_cardinality: 49,
  patched_consumers: patched,
  invariant: 'Downstream public consumers must validate the freshly synced Helix company projection rather than a historical fixed track count.',
};
await writeFile(RECEIPT, `${JSON.stringify(receipt, null, 2)}\n`, 'utf8');

console.log(JSON.stringify({
  status: 'PASS',
  authoritative_company_tracks: companyCount,
  patched_consumers: patched.length,
  replacements: patched.reduce((sum, row) => sum + row.replacements, 0),
}));

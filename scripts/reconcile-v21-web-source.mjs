#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const AUTHORITY_PATH = path.join(ROOT, 'site-v15', 'data', 'web-source-authority.json');
const RECEIPT_PATH = path.join(ROOT, 'site-v15', 'data', 'web-source-reconciliation.json');
const SHA40 = /^[a-f0-9]{40}$/;

const TARGETS = [
  {
    path: 'deployment/vercel-source-bridge/api/proxy.js',
    pattern: /const SOURCE_COMMIT = '[a-f0-9]{40}';/,
    replacement: (sha) => `const SOURCE_COMMIT = '${sha}';`,
  },
  {
    path: 'deployment/vercel-source-bridge/api/design-proxy.js',
    pattern: /const WEB_SOURCE_COMMIT = '[a-f0-9]{40}';/,
    replacement: (sha) => `const WEB_SOURCE_COMMIT = '${sha}';`,
  },
  {
    path: 'deployment/vercel-source-bridge/proxy.test.js',
    pattern: /assert\.equal\(proxy\.constants\.SOURCE_COMMIT, '[a-f0-9]{40}'\);/,
    replacement: (sha) => `assert.equal(proxy.constants.SOURCE_COMMIT, '${sha}');`,
  },
  {
    path: 'deployment/vercel-source-bridge/design-proxy.test.js',
    pattern: /assert\.equal\(designProxy\.constants\.WEB_SOURCE_COMMIT, '[a-f0-9]{40}'\);/,
    replacement: (sha) => `assert.equal(designProxy.constants.WEB_SOURCE_COMMIT, '${sha}');`,
  },
];

function fail(message) {
  throw new Error(`Web-source reconciliation failed: ${message}`);
}

function readJson(file, label) {
  try {
    const value = JSON.parse(fs.readFileSync(file, 'utf8'));
    if (!value || typeof value !== 'object' || Array.isArray(value)) fail(`${label} must be an object`);
    return value;
  } catch (error) {
    if (error instanceof Error && error.message.startsWith('Web-source reconciliation failed:')) throw error;
    fail(`${label}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

function replaceExactlyOnce(file, pattern, replacement) {
  const absolute = path.join(ROOT, file);
  const text = fs.readFileSync(absolute, 'utf8');
  const matches = text.match(new RegExp(pattern.source, 'g')) ?? [];
  if (matches.length !== 1) fail(`${file}: expected exactly one authority pin, found ${matches.length}`);
  const next = text.replace(pattern, replacement);
  fs.writeFileSync(absolute, next);
  return text === next ? 'already_current' : 'updated';
}

const authority = readJson(AUTHORITY_PATH, 'web-source authority');
if (authority.schema !== 'glaciereq.web-source-authority.v1') fail('unexpected authority schema');
if (authority.authority !== 'GlacierEQ/job-application') fail('unexpected authority repository');
if (authority.materialized_surface !== 'site-v15') fail('unexpected materialized surface');
if (!SHA40.test(authority.source_commit ?? '')) fail('source_commit must be an immutable 40-hex commit');

const sourceCommit = authority.source_commit;
const results = {};
for (const target of TARGETS) {
  results[target.path] = replaceExactlyOnce(target.path, target.pattern, target.replacement(sourceCommit));
}

for (const target of TARGETS.slice(0, 2)) {
  const text = fs.readFileSync(path.join(ROOT, target.path), 'utf8');
  if (!text.includes(`'${sourceCommit}'`)) fail(`${target.path}: reconciled source commit missing`);
}

const receipt = {
  schema: 'glaciereq.web-source-reconciliation.v1',
  status: 'PASS',
  authority: authority.authority,
  source_commit: sourceCommit,
  materialized_surface: authority.materialized_surface,
  targets: results,
};
fs.writeFileSync(RECEIPT_PATH, `${JSON.stringify(receipt, null, 2)}\n`);
console.log(JSON.stringify(receipt));

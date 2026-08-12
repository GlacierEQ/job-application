#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const masterPath = path.join(ROOT, 'site-v15', 'master', 'index.html');
const html = fs.readFileSync(masterPath, 'utf8');

const required = [
  'SYSTEMS ATLAS V23',
  'The owning system keeps the proof.',
  'Current heads do not inherit historical test receipts.',
  'Source presence does not become behavior.',
  'Provider success does not become verified completion.',
  'Presentation cannot widen evidence.',
  '200 collected, 199 passed, 1 skipped',
  '48/48',
  '40 governed technology floors',
  '80 easy + advanced exhibits',
  'dated semantic convergence only',
];

const missing = required.filter(token => !html.includes(token));
if (missing.length) {
  throw new Error(`master evidence policy/proof drift: ${missing.join(' | ')}`);
}

const forbidden = [
  'Current heads inherit historical test receipts',
  'Source presence proves behavior',
  'Provider success proves verified completion',
];
for (const token of forbidden) {
  if (html.includes(token)) throw new Error(`master contains forbidden proof widening: ${token}`);
}

const result = {
  schema: 'glaciereq.master-evidence-policy-validation.v1',
  status: 'PASS',
  route: '/master/',
  policy: 'owning_system_retains_proof_authority',
  required_claims_verified: required.length,
  forbidden_claims_present: 0,
};
process.stdout.write(`${JSON.stringify(result)}\n`);

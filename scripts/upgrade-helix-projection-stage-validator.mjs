import { readFile, writeFile } from 'node:fs/promises';

const validatorPath = new URL('./validate-helix-projection.mjs', import.meta.url);
const source = await readFile(validatorPath, 'utf8');

const expectedCounts = Object.freeze({
  MAPPED_ONLY: 47,
  ROLE_VERIFIED: 0,
  PROBLEM_BOUNDED: 0,
  CODE_INSPECTED: 0,
  REMEDY_BOUNDED: 0,
  IMPLEMENTED: 0,
  PROOF_REPRODUCED: 1,
  CLAIM_PROMOTED: 1,
});

let next = source;
const replacements = [];
for (const [stage, expected] of Object.entries(expectedCounts)) {
  const pattern = new RegExp(`assertStageCount\\((["'])${stage}\\1,\\s*\\d+\\);`);
  const match = next.match(pattern);
  if (!match) throw new Error(`missing_stage_count_assertion:${stage}`);
  const replacement = `assertStageCount("${stage}", ${expected});`;
  next = next.replace(pattern, replacement);
  replacements.push({ stage, expected });
}

if (next === source) throw new Error('validator_upgrade_produced_no_change');

const requiredTruth = [
  'assertCompanyCount(49)',
  'CLAIM_PROMOTED',
  'PROOF_REPRODUCED',
  'validate-company-second-depth',
];
for (const token of requiredTruth) {
  if (!next.includes(token)) throw new Error(`validator_upgrade_lost_required_truth:${token}`);
}

await writeFile(validatorPath, next, 'utf8');
console.log(JSON.stringify({
  status: 'PASS',
  validator: 'scripts/validate-helix-projection.mjs',
  migration: 'modular-second-depth-stage-distribution-v1',
  expected_counts: expectedCounts,
  replacements,
}, null, 2));

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
for (const [stage, expected] of Object.entries(expectedCounts)) {
  const pattern = new RegExp(`assertStageCount\\((["'])${stage}\\1,\\s*\\d+\\);`);
  if (!pattern.test(next)) throw new Error(`missing_stage_count_assertion:${stage}`);
  next = next.replace(pattern, `assertStageCount("${stage}", ${expected});`);
}

if (next === source) throw new Error('validator_upgrade_produced_no_change');
for (const token of ['assertCompanyCount(49)', 'CLAIM_PROMOTED', 'PROOF_REPRODUCED']) {
  if (!next.includes(token)) throw new Error(`validator_upgrade_lost_required_truth:${token}`);
}

await writeFile(validatorPath, next, 'utf8');
console.log(JSON.stringify({status:'PASS', expected_counts:expectedCounts}, null, 2));

import { readFile } from 'node:fs/promises';

const receiptUrl = new URL('../projects/github-merge-authority-proof/proof/production-canonical-freshness-readback.json', import.meta.url);
const receipt = JSON.parse(await readFile(receiptUrl, 'utf8'));
const approved = ['excellence/receipts/'];
const actual = receipt?.authority_freshness?.allowed_delta_prefixes;

if (!Array.isArray(actual)) {
  throw new Error('Helix equivalence path policy missing');
}
if (actual.length !== approved.length || actual.some((prefix, index) => prefix !== approved[index])) {
  throw new Error(`Helix equivalence path policy must equal fixed approved namespace: ${approved.join(', ')}`);
}

console.log(JSON.stringify({ status: 'PASS', approved_delta_prefixes: approved }));

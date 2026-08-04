import { readFile } from 'node:fs/promises';

const root = new URL('../', import.meta.url);
const readJson = async path => JSON.parse(await readFile(new URL(path, root), 'utf8'));
const readText = path => readFile(new URL(path, root), 'utf8');
const assert = (condition, message) => { if (!condition) throw new Error(message); };

const [flagships, suites, page] = await Promise.all([
  readJson('data/flagship-registry.json'),
  readJson('data/company-suites.json'),
  readText('depth/index.html')
]);

assert(flagships.schema === 'glaciereq.flagship-registry.v1', 'Unexpected flagship schema');
assert(suites.schema === 'glaciereq.company-suites.v1', 'Unexpected company-suite schema');
assert(flagships.flagships.length >= 10, 'Portfolio depth must expose at least ten flagship-class systems');
assert(suites.suites.length >= 7, 'Portfolio depth must expose at least seven company suites');

const flagshipIds = new Set(flagships.flagships.map(item => item.id));
for (const required of ['job-app-helix', 'echo', 'akos', 'tower-of-babel', 'agent-coordinator', 'resume-shapeshifter', 'sigma-glue', 'pro-code', 'mega-pdf', 'tasklet']) {
  assert(flagshipIds.has(required), `Missing flagship: ${required}`);
}

const suiteById = new Map(suites.suites.map(item => [item.id, item]));
for (const required of ['anthropic', 'spacex', 'xai', 'nvidia', 'apple', 'tasklet', 'openai']) {
  assert(suiteById.has(required), `Missing company suite: ${required}`);
}

assert(suiteById.get('spacex').repositories.length === 12, 'SpaceX suite must contain exactly twelve admitted public repositories');
assert(suiteById.get('xai').historical.length === 4, 'xAI alpha/omega variants must be classified as four historical release lines');
assert(suiteById.get('openai').reference_only.length >= 5, 'OpenAI suite must keep upstream SDK/framework mirrors out of authorship evidence');
assert(suiteById.get('apple').private_references.includes('apple-mcp'), 'Apple MCP private-reference boundary is missing');

for (const item of flagships.flagships) {
  assert(item.name && item.tier && item.state && item.role && item.next_gate, `Incomplete flagship record: ${item.id}`);
}
for (const suite of suites.suites) {
  assert(suite.name && suite.flagship && suite.story && suite.state && suite.next_gate, `Incomplete suite record: ${suite.id}`);
  assert(Array.isArray(suite.repositories) && suite.repositories.length > 0, `Suite has no admitted repositories: ${suite.id}`);
}

for (const required of ['/data/flagship-registry.json', '/data/company-suites.json', 'Crown Jewels', 'company suites']) {
  assert(page.includes(required), `Depth page is not wired to ${required}`);
}

console.log(JSON.stringify({
  status: 'PASS',
  flagship_count: flagships.flagships.length,
  suite_count: suites.suites.length,
  spacex_repository_count: suiteById.get('spacex').repositories.length,
  xai_historical_release_lines: suiteById.get('xai').historical.length
}, null, 2));

import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const here = path.dirname(fileURLToPath(import.meta.url));
const repo = path.resolve(here, '../..');
const assert = (condition, message) => { if (!condition) throw new Error(message); };
const read = filePath => readFile(path.join(repo, filePath), 'utf8');
const sha256 = data => createHash('sha256').update(data).digest('hex');
const stylesheetPattern = href => new RegExp(`<link\\b[^>]*\\bhref\\s*=\\s*["']${href.replaceAll('/', '\\/')}["'][^>]*>`, 'i');

const paths = {
  html: 'site-v15/resume/index.html',
  ats: 'site-v15/resume/ats.txt',
  json: 'site-v15/data/resume.json',
  llms: 'site-v15/llms.txt',
  canonical: 'RESUME.md',
};

const [html, ats, jsonText, llms, canonical] = await Promise.all([
  read(paths.html), read(paths.ats), read(paths.json), read(paths.llms), read(paths.canonical),
]);
const resume = JSON.parse(jsonText);
const htmlFold = html.toLowerCase();

assert((html.match(/<h1\b/g) || []).length === 1, 'resume must contain exactly one h1');
assert(!/<script\b/i.test(html), 'resume must remain script-free');
assert(!/\sstyle\s*=\s*/i.test(html), 'resume must not contain inline styles');
assert(!/<table\b/i.test(html), 'resume DOM must remain table-free for scraper-safe linear reading order');
for (const href of ['/assets/site.css', '/assets/site.systems.css', '/assets/resume.v17.css', '/assets/resume.final.css']) {
  assert(stylesheetPattern(href).test(html), `missing stylesheet ${href}`);
}
for (const href of ['/resume/ats.txt', '/data/resume.json']) {
  assert(html.includes(href), `missing canonical resume surface ${href}`);
}
assert(html.includes('itemscope') && html.includes('https://schema.org/Person'), 'schema.org Person microdata missing');
assert(html.includes('rel="alternate" type="application/json"') && html.includes('rel="alternate" type="text/plain"'), 'machine alternates missing');
for (const signal of ['systems atlas resume', 'evidence-carrying execution', 'fail-closed execution envelopes', 'bounded state transitions', 'idempotent recovery', 'truth-preserving public projections', 'reversible verified change', 'biological systems', '199/200', '48/48', '62/62']) {
  assert(htmlFold.includes(signal), `V23 human signal missing: ${signal}`);
}
assert(!html.includes('148/148') && !html.includes('148 of 148'), 'stale Helix test-count framing remains in HTML');

assert(ats.length > 10000, 'V23 ATS text too short');
for (const heading of ['SYSTEMS ATLAS MASTER', 'PROFESSIONAL SUMMARY', 'FRONTIER ENGINEERING SIGNAL', 'CURRENT PROOF SIGNAL', 'PROFESSIONAL EXPERIENCE', 'SELECTED SYSTEMS AND ARCHITECTURE', 'BIOLOGICAL SYSTEMS -> ENGINEERED SYSTEMS', 'EDUCATION AND SYSTEMS LINEAGE', 'ARCHITECTURE CHRONOLOGY - TIMESTAMPED, BOUNDED', 'EVIDENCE BOUNDARY']) {
  assert(ats.includes(heading), `ATS heading missing: ${heading}`);
}
for (const exact of ['200 collected, 199 passed, 1 skipped', '48/48 tests', '40 technology floors', '62/62 Agent Coordinator tests']) {
  assert(ats.includes(exact), `ATS current proof missing: ${exact}`);
}
assert(!ats.includes('148/148') && !ats.includes('148 of 148'), 'stale Helix test-count framing remains in ATS');

assert(resume.meta.schema === 'glaciereq.resume-intelligence.v23', 'machine schema must be V23');
assert(resume.meta.version === '23.0.0-resource-grounded', 'machine version drift');
assert(resume.meta.profile === 'SYSTEMS_ATLAS_FOUR_LAYER', 'machine profile drift');
assert(resume.meta.facts_invariant === true, 'facts invariant missing');
assert(JSON.stringify(resume.meta.presentation_layers) === JSON.stringify(['HUMAN', 'MASTER', 'MACHINE', 'MESH']), 'four-layer projection order drift');
assert(resume.basics.name === 'Casey Del Carpio Barton', 'identity drift');
assert(resume.basics.label === 'Applied AI Systems Architect | Forward-Deployed AI Engineer | Agent Infrastructure Engineer', 'role label drift');
assert(resume.work.length >= 3, 'cross-domain work history incomplete');
assert(resume.x_capability_clusters.length === 6, 'V23 must expose six capability clusters');
assert(resume.x_systems_lineage.mappings.length >= 8, 'systems-lineage mappings incomplete');
assert(resume.projects.some(project => project.name === 'AKOS' && project.keywords.includes('current_head:eac3cab001306225b99da41c37370528331966dd')), 'AKOS current-head binding missing');
assert(resume.projects.some(project => project.name === 'ECHO' && project.keywords.includes('current_head:6acdb3be1739f1659f3cec9f4b7d39d5799cd476')), 'ECHO current-head binding missing');
assert(resume.projects.some(project => project.name === 'The Tower of Babel' && project.keywords.includes('technology_floors:40')), 'Tower proof summary missing');
assert(resume.x_chronology.classification === 'DATED_SEMANTIC_CONVERGENCE_ONLY', 'chronology classification drift');
assert(resume.x_chronology.nonclaims.includes('causation'), 'chronology non-causation boundary missing');
assert(resume.x_evidence.limits.some(limit => limit.includes('Repository count is not accomplishment count')), 'repository-count boundary missing');

for (const exact of ['Systems Atlas Master', 'Evidence-carrying execution', 'Biological Systems → Engineered Systems', 'eac3cab001306225b99da41c37370528331966dd']) {
  assert(canonical.includes(exact), `canonical RESUME.md missing: ${exact}`);
}
for (const route of ['/resume/', '/resume/ats.txt', '/data/resume.json', '/master/', '/mesh/', '/machine/']) {
  assert(llms.includes(route), `llms route missing ${route}`);
}
assert(llms.includes('Systems Atlas V23'), 'llms V23 declaration missing');

const combined = `${html}\n${ats}\n${jsonText}\n${canonical}`.toLowerCase();
const banned = [
  "master's-level program", 'enterprise-grade ai architectures', 'proven track record of executive leadership',
  'direct state court filing api', 'greenhouse mcp server', 'workday mcp server', 'sub-100ms response',
  'train-of-thought specialization', 'chief executive officer & lead building systems inspector', '148/148', '148 of 148'
];
for (const phrase of banned) assert(!combined.includes(phrase), `unsupported or stale phrase present: ${phrase}`);

const result = {
  schema: 'glaciereq.resume-intelligence-validation.v23', status: 'PASS',
  profile: resume.meta.profile, facts_invariant: true,
  presentation_layers: resume.meta.presentation_layers,
  canonical_machine_surfaces: ['/resume/ats.txt', '/data/resume.json'],
  human_surfaces: ['/resume/', '/master/', '/mesh/'],
  scraper_contract: { linear_dom: true, html_tables: 0, scripts: 0 },
  capability_clusters: resume.x_capability_clusters.map(cluster => ({ id: cluster.id, status: cluster.status })),
  files: {
    [paths.html]: { bytes: Buffer.byteLength(html), sha256: sha256(Buffer.from(html)) },
    [paths.ats]: { bytes: Buffer.byteLength(ats), sha256: sha256(Buffer.from(ats)) },
    [paths.json]: { bytes: Buffer.byteLength(jsonText), sha256: sha256(Buffer.from(jsonText)) },
    [paths.canonical]: { bytes: Buffer.byteLength(canonical), sha256: sha256(Buffer.from(canonical)) },
  },
};
console.log(JSON.stringify(result, null, 2));

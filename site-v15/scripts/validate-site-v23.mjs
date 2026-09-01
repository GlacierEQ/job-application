import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const here = path.dirname(fileURLToPath(import.meta.url));
const repo = path.resolve(here, '../..');
const read = filePath => readFile(path.join(repo, filePath), 'utf8');
const assert = (condition, message) => { if (!condition) throw new Error(message); };

const [root, resume, master, mesh, machine, css, cssSystems, cssComplete, vercelText, portfolioText, companiesText, profilesText, resumeJsonText] = await Promise.all([
  read('site-v15/index.html'), read('site-v15/resume/index.html'), read('site-v15/master/index.html'),
  read('site-v15/mesh/index.html'), read('site-v15/machine/index.html'), read('site-v15/assets/site.css'),
  read('site-v15/assets/site.systems.css'), read('site-v15/assets/site.complete.css'), read('site-v15/vercel.json'),
  read('site-v15/data/portfolio.json'), read('site-v15/data/company-families.json'),
  read('site-v15/data/psysoc-x-profiles.json'), read('site-v15/data/resume.json'),
]);

const vercel = JSON.parse(vercelText);
const portfolio = JSON.parse(portfolioText);
const companies = JSON.parse(companiesText);
const profiles = JSON.parse(profilesText);
const resumeJson = JSON.parse(resumeJsonText);
const pages = { root, resume, master, mesh, machine };
const cssActive = `${css}\n${cssSystems}\n${cssComplete}`;

for (const [name, html] of Object.entries(pages)) {
  assert(!/<script\b/i.test(html), `${name} must remain script-free`);
  assert(!/\sstyle\s*=\s*/i.test(html), `${name} must not use inline styles`);
  assert((html.match(/<h1\b/g) || []).length === 1, `${name} must contain exactly one h1`);
}
assert(!/<table\b/i.test(resume), 'resume must remain table-free for linear scraper order');
assert(resume.includes('/resume/ats.txt') && resume.includes('/data/resume.json'), 'V23 machine resume routes missing');
assert(resume.includes('/downloads/Casey_Barton_Resume.pdf') && resume.includes('/downloads/Casey_Barton_Resume.docx'), 'legacy binary routes must remain reachable while retained');
assert(resume.includes('Legacy generated PDF') && resume.includes('Legacy generated DOCX'), 'legacy binaries must be visibly noncanonical');

for (const token of [
  'SYSTEMS ATLAS RESUME', '01 / HUMAN', '02 / MASTER', '03 / MACHINE', '04 / MESH',
  'Evidence-carrying execution', 'Fail-closed execution envelopes', 'Bounded state transitions',
  'Idempotent recovery', 'Truth-preserving public projections', 'Reversible verified change',
  '199/200', '48/48', '40 / 80', '62/62', 'BIOLOGICAL SYSTEMS',
]) assert(resume.includes(token), `V23 resume token missing: ${token}`);
assert(!resume.includes('148/148') && !resume.includes('148 of 148'), 'retired Helix 148/148 framing remains in resume');

for (const token of [
  'REPEATED ENGINEERING PATTERNS', 'SYSTEMS LINEAGE', 'AKOS + ECHO', 'Colossal Agent',
  'Spiral Engine / Double Helix', 'TOWER OF BABEL', 'Pillars &amp; Pistons',
  '200 collected, 199 passed, 1 skipped', '48/48', 'dated semantic convergence',
]) assert(master.includes(token), `V23 master token missing: ${token}`);

assert(resumeJson.meta.schema === 'glaciereq.resume-intelligence.v23', 'resume JSON schema drift');
assert(resumeJson.meta.profile === 'SYSTEMS_ATLAS_FOUR_LAYER', 'resume JSON profile drift');
assert(resumeJson.meta.facts_invariant === true, 'resume facts invariant missing');
assert(JSON.stringify(resumeJson.meta.presentation_layers) === JSON.stringify(['HUMAN', 'MASTER', 'MACHINE', 'MESH']), 'resume four-layer order drift');
assert(resumeJson.x_capability_clusters?.length === 6, 'six capability clusters required');
assert(resumeJson.x_systems_lineage?.mappings?.length >= 8, 'systems lineage mappings incomplete');
assert(resumeJson.x_chronology?.classification === 'DATED_SEMANTIC_CONVERGENCE_ONLY', 'chronology boundary drift');
assert(resumeJson.x_chronology?.nonclaims?.includes('causation'), 'chronology causation nonclaim missing');

assert(portfolio.person?.name === 'Casey Del Carpio Barton', 'portfolio person drift');
assert(portfolio.proof?.receipt_router_tests === 69, 'historical router proof drift');
assert(portfolio.proof?.bounded_source_tests === 166, 'historical bounded-source proof drift');
assert(portfolio.proof?.energy_memory_tests === 19, 'historical memory proof drift');
assert(portfolio.proof?.external_actions === 0, 'historical router external-action drift');
assert(portfolio.flagships?.length >= 7, 'portfolio flagship set incomplete');
assert(new Set(portfolio.flagships.map(item => item.id)).size === portfolio.flagships.length, 'flagship IDs must be unique');
assert(portfolio.flagships.every(item => item.limit && item.evidence && item.repo), 'each flagship needs evidence, limit, and source');
assert(portfolio.flagships.some(item => item.id === 'helix'), 'Helix flagship required');

assert(companies.schema === 'glaciereq.public-company-mesh.v15', 'company schema drift');
assert(Array.isArray(companies.families) && companies.families.length > 0, 'company families missing');
assert(profiles.schema === 'glaciereq.psysoc-x.presentation-profiles.v15', 'presentation profile schema drift');
assert(Object.keys(profiles.profiles).sort().join(',') === 'machine,master,mesh,recruiter', 'four presentation profiles required');
for (const [profile, route] of [['recruiter', '/'], ['master', '/master/'], ['machine', '/machine/'], ['mesh', '/mesh/']]) {
  assert(profiles.profiles[profile].route === route, `${profile} route drift`);
}

assert(profiles.dynamic_adjustment?.governing_function === 'Fixed principles. Adaptive expression.', 'PSYSOC-X governing function drift');
assert(profiles.dynamic_adjustment?.presentation_truth_states?.join(',') === 'demonstrated,verified,designed_for,aspirational,unknown', 'PSYSOC-X presentation truth states drift');
assert(profiles.dynamic_adjustment?.aspiration_policy?.includes('label it'), 'PSYSOC-X aspiration labeling policy missing');
assert(profiles.dynamic_adjustment?.humanization_policy?.includes('Add life'), 'PSYSOC-X humanization policy missing');
assert(profiles.profiles.recruiter.tone.includes('human') && profiles.profiles.recruiter.tone.includes('aspirational'), 'recruiter calibration lost human/aspirational balance');
assert(profiles.profiles.recruiter.humor.startsWith('contextual-light'), 'recruiter humor must remain impact-aware, not globally disabled');
assert(root.includes('capability that holds up in the real world'), 'recruiter hero lost PSYSOC-X human hook');
assert(root.includes('I do not start from trust. I start from behavior'), 'recruiter operating philosophy drift');

const csp = vercel.headers?.[0]?.headers?.find(item => item.key === 'Content-Security-Policy')?.value ?? '';
assert(csp.includes("script-src 'none'") && csp.includes("style-src 'self'") && csp.includes("connect-src 'none'") && csp.includes("frame-ancestors 'none'"), 'CSP incomplete');
for (const token of ['@media print', ':focus-visible', '.terminal']) {
  assert(cssActive.includes(token), `active CSS contract missing ${token}`);
}
assert((cssActive.match(/{/g) || []).length === (cssActive.match(/}/g) || []).length, 'active CSS brace mismatch');

const result = {
  schema: 'glaciereq.site-signal-validation.v23', status: 'PASS',
  routes: ['/', '/hire/', '/resume/', '/master/', '/mesh/', '/machine/', '/atlas/', '/companies/'],
  profiles: Object.keys(profiles.profiles).sort(), facts_invariant: true,
  proof: {
    current_resume_schema: resumeJson.meta.schema,
    capability_clusters: resumeJson.x_capability_clusters.length,
    systems_lineage_mappings: resumeJson.x_systems_lineage.mappings.length,
    historical_portfolio_router_tests: portfolio.proof.receipt_router_tests,
    historical_bounded_source_tests: portfolio.proof.bounded_source_tests,
    historical_energy_memory_tests: portfolio.proof.energy_memory_tests,
  },
  flagships: portfolio.flagships.map(item => item.id),
  company_families: companies.families.length,
  repositories: companies.totals?.unique_repositories ?? null,
  scripts: 0, inline_styles: 0, visual_contracts: true, csp: true,
  resume: {
    schema: resumeJson.meta.schema, profile: resumeJson.meta.profile,
    layers: resumeJson.meta.presentation_layers, html_tables: 0, legacy_binaries_noncanonical: true,
  },
};
console.log(JSON.stringify(result, null, 2));

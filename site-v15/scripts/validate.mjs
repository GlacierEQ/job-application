import { readFile, access, stat } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const root = new URL('../', import.meta.url);
const read = path => readFile(new URL(path, root), 'utf8');
const bytes = path => readFile(new URL(path, root));
const assert = (condition, message) => { if (!condition) throw new Error(message); };
const exists = async path => { await access(fileURLToPath(new URL(path, root))); };

const paths = {
  recruiter: 'index.html', master: 'master/index.html', mesh: 'mesh/index.html', machine: 'machine/index.html', resume: 'resume/index.html',
  css: 'assets/site.css', portfolio: 'data/portfolio.json', companies: 'data/company-families.json', profiles: 'data/psysoc-x-profiles.json',
  vercel: 'vercel.json', sitemap: 'sitemap.xml', robots: 'robots.txt', llms: 'llms.txt', pdf: 'downloads/Casey_Barton_Resume.pdf',
  social: 'assets/social-card.svg', favicon: 'assets/favicon.svg'
};
for (const path of Object.values(paths)) await exists(path);

const [recruiter, master, mesh, machine, resume, css, portfolioText, companiesText, profilesText, vercelText, sitemap, robots, llms] = await Promise.all([
  read(paths.recruiter), read(paths.master), read(paths.mesh), read(paths.machine), read(paths.resume), read(paths.css),
  read(paths.portfolio), read(paths.companies), read(paths.profiles), read(paths.vercel), read(paths.sitemap), read(paths.robots), read(paths.llms)
]);
const portfolio = JSON.parse(portfolioText);
const companies = JSON.parse(companiesText);
const profiles = JSON.parse(profilesText);
const vercel = JSON.parse(vercelText);
const htmlPages = { recruiter, master, mesh, machine, resume };

for (const [name, html] of Object.entries(htmlPages)) {
  assert((html.match(/<h1\b/g) || []).length === 1, `${name} must contain exactly one h1`);
  assert(!html.includes('<script'), `${name} must remain script-free`);
  assert(!html.includes('javascript:'), `${name} cannot use javascript URLs`);
  assert(!html.includes('style='), `${name} cannot use inline style attributes under the CSP`);
  assert(html.includes('href="/assets/site.css"'), `${name} must use the shared stylesheet`);
  assert(html.includes('Casey Barton') || html.includes('Casey Del Carpio Barton'), `${name} must preserve identity`);
}

assert(portfolio.schema === 'glaciereq.hiring-portfolio.v15', 'portfolio schema drift');
assert(portfolio.person.name === 'Casey Del Carpio Barton', 'canonical name drift');
assert(portfolio.person.roles.length === 3, 'role count drift');
assert(portfolio.proof.receipt_router_tests === 69, 'router count drift');
assert(portfolio.proof.bounded_source_tests === 166, 'source count drift');
assert(portfolio.proof.energy_memory_tests === 19, 'memory count drift');
assert(portfolio.proof.external_actions === 0, 'external-action count drift');
assert(portfolio.proof.receipt_router_artifact === 8910423397, 'router artifact drift');
assert(portfolio.flagships.length === 10, 'flagship hierarchy must contain ten systems');
assert(new Set(portfolio.flagships.map(item => item.id)).size === 10, 'flagship IDs must be unique');
assert(portfolio.flagships.map(item => item.rank).join(',') === '1,2,3,4,5,6,7,8,9,10', 'flagship ranks must be exact');
assert(portfolio.flagships[0].id === 'receipt-router', 'Receipt Router must be first');
assert(portfolio.flagships[1].id === 'microcode', 'Microcode must be the primary pending flagship');
assert(portfolio.flagships[1].state === 'REVIEWED_EXECUTION_BLOCKED', 'Microcode cannot be promoted');
assert(portfolio.flagships.every(item => item.limit && item.evidence && item.repo), 'each flagship needs evidence, limit, and source');

for (const token of ['69/69', '166', '19', '>0<', 'Portfolio Receipt Router', 'Microcode Governance']) assert(recruiter.includes(token), `recruiter missing ${token}`);
assert(recruiter.indexOf('Portfolio Receipt Router') < recruiter.indexOf('Microcode Governance'), 'executed flagship must precede pending flagship');
assert(!recruiter.includes('I build the systems that <em>do not exist yet.</em>'), 'stale V14 headline returned');
assert(!recruiter.includes('Frontier Laws'), 'Frontier Laws cannot lead recruiter');
assert(!recruiter.includes('Infinity Stones'), 'Infinity Stone metaphor cannot lead recruiter');
for (const required of ['/master/', '/mesh/', '/machine/', '/resume/']) assert(recruiter.includes(`href="${required}"`), `recruiter route missing ${required}`);
for (const token of ['69 of 69 tests passed', '166', '19 memory tests', 'zero external queries and actions', 'REVIEWED']) assert(master.toLowerCase().includes(token.toLowerCase()), `master evidence missing ${token}`);
assert(master.includes('Router tests remain router tests'), 'master must separate owning evidence');
assert(machine.includes('/data/portfolio.json') && machine.includes('/data/company-families.json') && machine.includes('/data/psysoc-x-profiles.json'), 'machine entrypoints incomplete');
assert(resume.includes('/downloads/Casey_Barton_Resume.pdf') && resume.includes('RESUME_ATS.md'), 'resume downloads missing');
assert(resume.includes('69/69 tests') && resume.includes('166 source tests') && resume.includes('148/148 recorded repository tests'), 'resume proof drift');

assert(companies.schema === 'glaciereq.public-company-mesh.v15', 'company schema drift');
assert(companies.families.length === 27, 'all 27 company families must be discoverable');
assert(companies.totals.families === 27, 'company family total drift');
assert(companies.totals.unique_repositories === 200, 'company repository total drift');
assert(companies.totals.memberships === 203, 'company membership total drift');
assert(companies.totals.unprocessed === 78, 'unprocessed total drift');
assert(companies.totals.reference_or_upstream === 34, 'reference total drift');
assert(companies.families.some(item => item.name === 'xAI / Colossus' && item.memberships === 62), 'xAI family missing');
assert(companies.families.some(item => item.name === 'OpenAI / Codex' && item.memberships === 22), 'OpenAI family missing');
assert(companies.families.some(item => item.name === 'SpaceX' && item.memberships === 15), 'SpaceX family missing');
assert(mesh.includes('27 families · 200 currently identified repositories'), 'mesh totals missing');
for (const family of companies.families) assert(mesh.includes(`<h3>${family.name}</h3>`), `mesh missing family ${family.name}`);

assert(profiles.schema === 'glaciereq.psysoc-x.presentation-profiles.v15', 'PSYSOC-X schema drift');
assert(Object.keys(profiles.profiles).sort().join(',') === 'machine,master,mesh,recruiter', 'four PSYSOC-X profiles required');
assert(profiles.invariants.includes('test_counts') && profiles.invariants.includes('authority_boundaries'), 'PSYSOC-X invariants incomplete');
assert(Object.values(profiles.safety).every(value => value === false), 'PSYSOC-X safety exclusions must remain false');
for (const [profile, route] of [['recruiter','/'],['master','/master/'],['machine','/machine/'],['mesh','/mesh/']]) assert(profiles.profiles[profile].route === route, `${profile} route drift`);

const csp = vercel.headers?.[0]?.headers?.find(item => item.key === 'Content-Security-Policy')?.value ?? '';
assert(csp.includes("script-src 'none'"), 'CSP must prohibit scripts');
assert(csp.includes("style-src 'self'"), 'CSP must allow only same-origin styles');
assert(csp.includes("connect-src 'none'"), 'CSP must prohibit runtime connections');
assert(csp.includes("frame-ancestors 'none'"), 'CSP must prohibit framing');
assert(css.includes('@media(max-width:680px)'), 'mobile contract missing');
assert(css.includes('@media(prefers-reduced-motion:reduce)'), 'reduced-motion contract missing');
assert(css.includes('@media print'), 'print resume contract missing');
assert(css.includes('.constellation') && css.includes('.tree-branches') && css.includes('.company-grid'), 'visual hierarchy contracts missing');
for (const route of ['/', '/resume/', '/master/', '/mesh/', '/machine/']) assert(sitemap.includes(`https://casey-barton-glaciereq.vercel.app${route}`), `sitemap missing ${route}`);
assert(robots.includes('Sitemap: https://casey-barton-glaciereq.vercel.app/sitemap.xml'), 'robots sitemap missing');
assert(llms.includes('/data/portfolio.json') && llms.includes('/data/psysoc-x-profiles.json'), 'LLM orientation incomplete');

const pdf = await bytes(paths.pdf);
const ats = await readFile(new URL('../../RESUME_ATS.md', import.meta.url), 'utf8');
assert(pdf.subarray(0,4).toString() === '%PDF', 'resume PDF signature invalid');
assert(ats.includes('CASEY DEL CARPIO BARTON'), 'ATS resume identity missing');
assert((await stat(fileURLToPath(new URL(paths.pdf, root)))).size > 8000, 'resume PDF unexpectedly small');
assert(Buffer.byteLength(ats, 'utf8') > 3000, 'ATS resume unexpectedly small');

console.log(JSON.stringify({status:'PASS',release:portfolio.release.name,routes:['/','/resume/','/master/','/mesh/','/machine/'],psysoc_x_profiles:Object.keys(profiles.profiles),factual_invariants:profiles.invariants,proof:portfolio.proof,flagships:portfolio.flagships.length,company_families:companies.families.length,public_safe_repositories:companies.totals.unique_repositories,scripts:0,inline_styles:0,resume_downloads:['PDF','ATS text'],csp:'locked'}, null, 2));

import { access, readFile, stat } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';

const root = new URL('../', import.meta.url);
const read = filePath => readFile(new URL(filePath, root), 'utf8');
const bytes = filePath => readFile(new URL(filePath, root));
const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};
const exists = async filePath => access(fileURLToPath(new URL(filePath, root)));
const stylesheetPattern = href => new RegExp(`<link\\b[^>]*\\bhref\\s*=\\s*["']${href.replaceAll('/', '\\/')}["'][^>]*>`, 'i');

const paths = {
  recruiter: 'index.html',
  resume: 'resume/index.html',
  master: 'master/index.html',
  mesh: 'mesh/index.html',
  machine: 'machine/index.html',
  notFound: '404.html',
  css: 'assets/site.css',
  cssSystems: 'assets/site.systems.css',
  portfolio: 'data/portfolio.json',
  companies: 'data/company-families.json',
  profiles: 'data/psysoc-x-profiles.json',
  resumeArtifacts: 'data/resume-artifacts.json',
  ats: 'resume/ats.txt',
  vercel: 'vercel.json',
  pdf: 'downloads/Casey_Barton_Resume.pdf',
  social: 'assets/social-card.svg',
  favicon: 'assets/favicon.svg',
  sitemap: 'sitemap.xml',
  robots: 'robots.txt',
  llms: 'llms.txt',
};

for (const filePath of Object.values(paths)) await exists(filePath);

const [
  recruiter,
  resume,
  master,
  mesh,
  machine,
  notFound,
  cssBase,
  cssSystems,
  portfolioText,
  companiesText,
  profilesText,
  resumeArtifactsText,
  ats,
  vercelText,
  sitemap,
  robots,
  llms,
] = await Promise.all([
  read(paths.recruiter),
  read(paths.resume),
  read(paths.master),
  read(paths.mesh),
  read(paths.machine),
  read(paths.notFound),
  read(paths.css),
  read(paths.cssSystems),
  read(paths.portfolio),
  read(paths.companies),
  read(paths.profiles),
  read(paths.resumeArtifacts),
  read(paths.ats),
  read(paths.vercel),
  read(paths.sitemap),
  read(paths.robots),
  read(paths.llms),
]);

const css = `${cssBase}\n${cssSystems}`;
const portfolio = JSON.parse(portfolioText);
const companies = JSON.parse(companiesText);
const profiles = JSON.parse(profilesText);
const resumeArtifacts = JSON.parse(resumeArtifactsText);
const vercel = JSON.parse(vercelText);
const pages = { recruiter, resume, master, mesh, machine, notFound };

for (const [name, html] of Object.entries(pages)) {
  assert((html.match(/<h1\b/g) || []).length === 1, `${name} must contain one h1`);
  assert(!/<script\b/i.test(html), `${name} must remain script-free`);
  assert(!/javascript:/i.test(html), `${name} cannot use javascript URLs`);
  assert(!/\sstyle\s*=\s*/i.test(html), `${name} cannot use inline style attributes`);
  assert(stylesheetPattern('/assets/site.css').test(html), `${name} must use base CSS`);
  assert(stylesheetPattern('/assets/site.systems.css').test(html), `${name} must use systems CSS`);
  assert(html.includes('Casey Barton') || html.includes('Casey Del Carpio Barton'), `${name} identity missing`);
  assert(/<\/body>\s*<\/html>\s*$/i.test(html), `${name} must close body and html`);
}
assert(/<\/footer>\s*<\/body>\s*<\/html>\s*$/i.test(recruiter), 'recruiter footer must close cleanly');
assert(!recruiter.includes('&#250493;'), 'recruiter contains corrupted footer text');

assert(portfolio.schema === 'glaciereq.hiring-portfolio.v15', 'portfolio schema drift');
assert(portfolio.person.name === 'Casey Del Carpio Barton', 'name drift');
assert(portfolio.proof.receipt_router_tests === 69, 'router count drift');
assert(portfolio.proof.bounded_source_tests === 166, 'source count drift');
assert(portfolio.proof.energy_memory_tests === 19, 'memory count drift');
assert(portfolio.proof.external_actions === 0, 'external action drift');
assert(portfolio.proof.receipt_router_artifact === 8910423397, 'artifact drift');
assert(portfolio.flagships.length === 10, 'ten flagships required');
assert(new Set(portfolio.flagships.map(item => item.id)).size === 10, 'flagship IDs must be unique');
assert(portfolio.flagships.map(item => item.rank).join(',') === '1,2,3,4,5,6,7,8,9,10', 'flagship ranks must be exact');
assert(portfolio.flagships.every(item => item.limit && item.evidence && item.repo), 'each flagship needs evidence, limit, and source');
assert(portfolio.flagships[0].id === 'receipt-router', 'router must rank first');
assert(portfolio.flagships[1].id === 'microcode' && portfolio.flagships[1].state === 'REVIEWED_EXECUTION_BLOCKED', 'Microcode boundary drift');

for (const token of ['69/69', '166', '19', '>0<', 'Portfolio Receipt Router', 'Microcode Governance', 'I make powerful AI <em>dependable enough to use.</em>']) {
  assert(recruiter.includes(token), `recruiter missing ${token}`);
}
assert(recruiter.includes('cockpit') && recruiter.includes('bento') && recruiter.includes('pipeline'), 'cutting-edge visual hierarchy missing');
assert(recruiter.indexOf('Portfolio Receipt Router') < recruiter.indexOf('Microcode Governance'), 'verified work must precede pending work');
for (const route of ['/master/', '/mesh/', '/machine/', '/resume/']) {
  assert(new RegExp(`href\\s*=\\s*["']${route.replaceAll('/', '\\/')}["']`, 'i').test(recruiter), `route missing ${route}`);
}

assert(resume.includes('/downloads/Casey_Barton_Resume.pdf'), 'resume PDF link missing');
assert(resume.includes('/resume/ats.txt') || resume.includes('RESUME_ATS.md'), 'resume ATS link missing');
const legacyResumeProof = resume.includes('166 source tests');
const v17ResumeProof = resume.includes('166 + 19') && resume.includes('source + memory tests');
assert(resume.includes('69/69') && (legacyResumeProof || v17ResumeProof) && resume.includes('148/148'), 'resume proof drift');
assert(master.toLowerCase().includes('69 of 69 tests passed') && master.includes('166') && master.includes('19 memory tests'), 'master evidence incomplete');
assert(master.includes('Owning repositories retain evidence authority') || master.includes('Proof stays with the owning system'), 'master evidence policy missing');
assert(machine.includes('/data/portfolio.json') && machine.includes('/data/company-families.json') && machine.includes('/data/psysoc-x-profiles.json'), 'machine links incomplete');

assert(companies.schema === 'glaciereq.public-company-mesh.v15', 'company schema drift');
assert(companies.families.length === 27 && companies.totals.families === 27 && companies.totals.unique_repositories === 200 && companies.totals.memberships === 203 && companies.totals.unprocessed === 78 && companies.totals.reference_or_upstream === 34, 'company totals drift');
assert(mesh.includes(`${companies.totals.families} families &#183; ${companies.totals.unique_repositories} currently identified repositories &#183; ${companies.totals.memberships} typed memberships`), 'mesh totals missing');
for (const family of companies.families) assert(mesh.includes(`<h3>${family.name}</h3>`), `mesh missing ${family.name}`);

assert(profiles.schema === 'glaciereq.psysoc-x.presentation-profiles.v15', 'profile schema drift');
assert(Object.keys(profiles.profiles).sort().join(',') === 'machine,master,mesh,recruiter', 'four profiles required');
for (const [profile, route] of [['recruiter', '/'], ['master', '/master/'], ['machine', '/machine/'], ['mesh', '/mesh/']]) {
  assert(profiles.profiles[profile].route === route, `${profile} route drift`);
}
assert(profiles.invariants.includes('test_counts') && profiles.invariants.includes('authority_boundaries'), 'invariants incomplete');
assert(Object.values(profiles.safety).every(value => value === false), 'safety exclusions must remain false');

const csp = vercel.headers?.[0]?.headers?.find(item => item.key === 'Content-Security-Policy')?.value ?? '';
assert(csp.includes("script-src 'none'") && csp.includes("style-src 'self'") && csp.includes("connect-src 'none'") && csp.includes("frame-ancestors 'none'"), 'CSP incomplete');

// These selectors and media rules are intentional release contracts for the V16 visual language.
for (const token of ['.cockpit', '.radar', '.bento', '.terminal', '@keyframes spin', '@media(prefers-reduced-motion:reduce)', '@media print']) {
  assert(css.includes(token), `CSS contract missing ${token}`);
}
for (const selector of ['.bento-card p', '.master-card p', '.branch p']) {
  assert(cssSystems.includes(selector), `print contrast selector missing ${selector}`);
}

for (const route of ['/', '/resume/', '/master/', '/mesh/', '/machine/']) {
  assert(sitemap.includes(`https://casey-barton-glaciereq.vercel.app${route}`), `sitemap missing ${route}`);
}
assert(robots.includes('Sitemap: https://casey-barton-glaciereq.vercel.app/sitemap.xml'), 'robots missing sitemap');
assert(llms.includes('/data/portfolio.json') && llms.includes('/data/psysoc-x-profiles.json'), 'LLM orientation incomplete');

assert(resumeArtifacts.schema === 'glaciereq.resume-artifacts.v17', 'resume artifact manifest schema drift');
const pdf = await bytes(paths.pdf);
assert(pdf.subarray(0, 4).toString() === '%PDF', 'PDF signature invalid');
assert((await stat(fileURLToPath(new URL(paths.pdf, root)))).size > 8000, 'PDF too small');
const pdfHash = createHash('sha256').update(pdf).digest('hex');
assert(resumeArtifacts.artifacts.pdf.path === paths.pdf.replace('downloads/', 'downloads/'), 'PDF manifest path drift');
assert(resumeArtifacts.artifacts.pdf.bytes === pdf.length, 'PDF manifest byte drift');
assert(resumeArtifacts.artifacts.pdf.sha256 === pdfHash, 'PDF manifest hash drift');

assert(ats.includes('CASEY DEL CARPIO BARTON'), 'ATS resume identity missing');
assert(Buffer.byteLength(ats, 'utf8') > 3000, 'ATS resume unexpectedly small');

console.log(JSON.stringify({
  status: 'PASS',
  release: 'V16 Signal Architecture',
  routes: ['/', '/resume/', '/master/', '/mesh/', '/machine/'],
  profiles: Object.keys(profiles.profiles),
  facts_invariant: true,
  proof: portfolio.proof,
  flagships: 10,
  company_families: 27,
  repositories: 200,
  scripts: 0,
  inline_styles: 0,
  visual_contracts: ['cockpit', 'radar', 'bento', 'terminal', 'CSS motion', 'reduced motion', 'print'],
  csp: 'locked',
  resume_pdf_sha256: pdfHash,
}, null, 2));

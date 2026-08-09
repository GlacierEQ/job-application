import { access, readFile, readdir, stat } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

await import('../../scripts/apply-complete-web-design.mjs');

const root = new URL('../', import.meta.url);
const rootPath = fileURLToPath(root);
const read = filePath => readFile(new URL(filePath, root), 'utf8');
const bytes = filePath => readFile(new URL(filePath, root));
const assert = (condition, message) => { if (!condition) throw new Error(message); };
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
  cssComplete: 'assets/site.complete.css',
  portfolio: 'data/portfolio.json',
  currentProof: 'data/current-proof.json',
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
  recruiter, resume, master, mesh, machine, notFound,
  cssBase, cssSystems, cssComplete,
  portfolioText, currentProofText, companiesText, profilesText, resumeArtifactsText,
  ats, vercelText, sitemap, robots, llms,
] = await Promise.all([
  read(paths.recruiter), read(paths.resume), read(paths.master), read(paths.mesh), read(paths.machine), read(paths.notFound),
  read(paths.css), read(paths.cssSystems), read(paths.cssComplete),
  read(paths.portfolio), read(paths.currentProof), read(paths.companies), read(paths.profiles), read(paths.resumeArtifacts),
  read(paths.ats), read(paths.vercel), read(paths.sitemap), read(paths.robots), read(paths.llms),
]);

const css = `${cssBase}\n${cssSystems}\n${cssComplete}`;
const portfolio = JSON.parse(portfolioText);
const currentProof = JSON.parse(currentProofText);
const companies = JSON.parse(companiesText);
const profiles = JSON.parse(profilesText);
const resumeArtifacts = JSON.parse(resumeArtifactsText);
const vercel = JSON.parse(vercelText);
const pages = { recruiter, resume, master, mesh, machine, notFound };

async function discoverHtml(directory) {
  const out = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (entry.name === 'node_modules') continue;
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) out.push(...await discoverHtml(target));
    else if (entry.isFile() && entry.name.endsWith('.html')) out.push(target);
  }
  return out.sort();
}

for (const [name, html] of Object.entries(pages)) {
  assert((html.match(/<h1\b/g) || []).length === 1, `${name} must contain one h1`);
  assert(!/<script\b/i.test(html), `${name} must remain script-free`);
  assert(!/javascript:/i.test(html), `${name} cannot use javascript URLs`);
  assert(!/\sstyle\s*=\s*/i.test(html), `${name} cannot use inline style attributes`);
  assert(stylesheetPattern('/assets/site.css').test(html), `${name} must use base CSS`);
  assert(stylesheetPattern('/assets/site.systems.css').test(html), `${name} must use systems CSS`);
  assert(stylesheetPattern('/assets/site.complete.css').test(html), `${name} must use complete design CSS`);
  assert(html.includes('Casey Barton') || html.includes('Casey Del Carpio Barton'), `${name} identity missing`);
  assert(/<\/body>\s*<\/html>\s*$/i.test(html), `${name} must close body and html`);
}

const htmlFiles = await discoverHtml(rootPath);
assert(htmlFiles.length >= 100, `complete surface unexpectedly small: ${htmlFiles.length} HTML files`);
for (const file of htmlFiles) {
  const relative = path.relative(rootPath, file).replaceAll(path.sep, '/');
  const html = await readFile(file, 'utf8');
  assert(!/<script\b/i.test(html), `${relative} must remain script-free`);
  assert(!/\sstyle\s*=\s*/i.test(html), `${relative} cannot use inline style attributes`);
  assert(stylesheetPattern('/assets/site.complete.css').test(html), `${relative} missing complete design CSS`);
}

assert(/<\/footer>\s*<\/body>\s*<\/html>\s*$/i.test(recruiter), 'recruiter footer must close cleanly');
assert(!recruiter.includes('&#250493;'), 'recruiter contains corrupted footer text');
for (const token of [
  'OPEN-WORLD ENGINEERING ESTATE',
  'Mission Agentic AI Assurance',
  'REPRODUCED',
  'PROOF_BOUND',
  'CLAIM_PROMOTED',
  '69/69',
  '148 recorded tests at its bound proof authority',
  '62/62',
  'I make powerful AI <em>dependable enough to use.</em>',
  'The estate is the product. Views are projections of it.',
  'No subsystem metric is used here as a proxy for the scale of the engineering estate.',
]) assert(recruiter.includes(token), `recruiter missing ${token}`);
assert(!recruiter.includes('17/17'), 'anti-distortion invariant violated: local 17-test suite cannot become a recruiter-level identity metric');
assert(recruiter.includes('17 acceptance tests in this suite'), 'local Mission Assurance suite boundary missing');
assert(recruiter.includes('17 acceptance tests in this local suite'), 'system-level Mission Assurance suite boundary missing');
assert(recruiter.includes('cockpit') && recruiter.includes('bento') && recruiter.includes('pipeline'), 'cutting-edge visual hierarchy missing');
for (const route of ['/master/', '/mesh/', '/machine/', '/resume/', '/companies/', '/atlas/']) {
  assert(new RegExp(`href\\s*=\\s*["']${route.replaceAll('/', '\\/')}["']`, 'i').test(recruiter), `route missing ${route}`);
}

assert(currentProof.schema === 'glaciereq.current-proof.v1', 'current-proof schema drift');
assert(currentProof.release === 'V21 First Star Completion', 'current-proof release drift');
assert(currentProof.current_star.id === 'mission-agentic-ai-assurance', 'current star drift');
assert(currentProof.current_star.implementation.commit === '4328fa7078e6e4125f895768142c6af0c5ec1234', 'implementation authority drift');
assert(currentProof.current_star.implementation.acceptance_tests === 17, 'acceptance-test count drift');
assert(currentProof.current_star.proof.verification_state === 'REPRODUCED', 'proof state drift');
assert(currentProof.current_star.proof.receipt_id === 'b7a3e3cba968e19bb91ed8f6881b69e37efc97d7e8414be0aca431dff501123f', 'proof receipt drift');
assert(currentProof.current_star.company_projection.stage === 'CLAIM_PROMOTED', 'company promotion drift');
assert(currentProof.current_star.company_projection.claim_ceiling === 'proof_bound_company_specific', 'claim ceiling drift');
assert(currentProof.current_star.company_projection.helix_commit === '83549cda4af3714304f202d0f4d35b29d28da9f7', 'Helix authority drift');
assert(currentProof.current_star.prohibited_claims.length >= 7, 'truth boundary incomplete');
assert(currentProof.current_star.allowed_claim.includes('independent mission-agent assurance gateway'), 'allowed claim drift');

assert(portfolio.schema === 'glaciereq.hiring-portfolio.v15', 'portfolio schema drift');
assert(portfolio.person.name === 'Casey Del Carpio Barton', 'name drift');
assert(portfolio.proof.receipt_router_tests === 69, 'router count drift');
assert(portfolio.proof.bounded_source_tests === 166, 'source count drift');
assert(portfolio.proof.energy_memory_tests === 19, 'memory count drift');
assert(portfolio.proof.external_actions === 0, 'external action drift');
assert(portfolio.proof.receipt_router_artifact === 8910423397, 'artifact drift');
assert(portfolio.flagships.length === 10, 'ten historical flagship entries required');
assert(new Set(portfolio.flagships.map(item => item.id)).size === 10, 'flagship IDs must be unique');
assert(portfolio.flagships.every(item => item.limit && item.evidence && item.repo), 'each flagship needs evidence, limit, and source');

assert(resume.includes('/downloads/Casey_Barton_Resume.pdf'), 'resume PDF link missing');
assert(resume.includes('/resume/ats.txt') || resume.includes('RESUME_ATS.md'), 'resume ATS link missing');
const legacyResumeProof = resume.includes('166 source tests');
const v17ResumeProof = resume.includes('166 + 19') && resume.includes('source + memory tests');
const helixCurrentBoundary = resume.includes('>67<') && resume.includes('PARTIALLY VERIFIED') && resume.includes('admitted public proof');
assert(resume.includes('69/69') && (legacyResumeProof || v17ResumeProof) && helixCurrentBoundary && resume.includes('62/62'), 'resume proof drift');
assert(!resume.includes('148/148') && !resume.includes('148 of 148'), 'resume contains retired Helix test-count framing');
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

for (const token of ['.cockpit', '.radar', '.bento', '.terminal', '@keyframes spin', '@media(prefers-reduced-motion:reduce)', '@media print', '.hero-v21', '.hero-proof-rail', '.layer-deck', ':focus-visible']) {
  assert(css.includes(token), `CSS contract missing ${token}`);
}
for (const selector of ['.bento-card p', '.master-card p', '.branch p']) {
  assert(cssSystems.includes(selector), `print contrast selector missing ${selector}`);
}

for (const route of ['/', '/resume/', '/master/', '/mesh/', '/machine/']) {
  assert(sitemap.includes(`https://casey-barton-glaciereq.vercel.app${route}`), `sitemap missing ${route}`);
}
assert(robots.includes('Sitemap: https://casey-barton-glaciereq.vercel.app/sitemap.xml'), 'robots missing sitemap');
assert(llms.includes('/data/portfolio.json') && llms.includes('/data/psysoc-x-profiles.json') && llms.includes('/data/current-proof.json'), 'LLM orientation incomplete');

assert(resumeArtifacts.schema === 'glaciereq.resume-artifacts.v17', 'resume artifact manifest schema drift');
const pdf = await bytes(paths.pdf);
assert(pdf.subarray(0, 4).toString() === '%PDF', 'PDF signature invalid');
assert((await stat(fileURLToPath(new URL(paths.pdf, root)))).size > 8000, 'PDF too small');
const pdfHash = createHash('sha256').update(pdf).digest('hex');
assert(resumeArtifacts.artifacts.pdf.path === paths.pdf, 'PDF manifest path drift');
assert(resumeArtifacts.artifacts.pdf.bytes === pdf.length, 'PDF manifest byte drift');
assert(resumeArtifacts.artifacts.pdf.sha256 === pdfHash, 'PDF manifest hash drift');
assert(ats.includes('CASEY DEL CARPIO BARTON'), 'ATS resume identity missing');
assert(Buffer.byteLength(ats, 'utf8') > 3000, 'ATS resume unexpectedly small');

const legacyRoutes = ['/', '/resume/', '/master/', '/mesh/', '/machine/'];
const visualContracts = [
  'cockpit',
  'radar',
  'bento',
  'terminal',
  'CSS motion',
  'reduced motion',
  'print',
  'open-world estate rail',
  'focus-visible',
  'complete responsive layer',
];

console.log(JSON.stringify({
  status: 'PASS',
  release: 'Open-World Engineering Estate Presentation',
  routes: legacyRoutes,
  html_routes_verified: htmlFiles.length,
  current_star: currentProof.current_star.id,
  current_proof: currentProof.current_star.proof.verification_state,
  claim_stage: currentProof.current_star.company_projection.stage,
  profiles: Object.keys(profiles.profiles),
  facts_invariant: true,
  anti_distortion_invariant: true,
  proof: portfolio.proof,
  legacy_proof: portfolio.proof,
  flagships: portfolio.flagships.length,
  company_families: companies.totals.families,
  repositories: companies.totals.unique_repositories,
  scripts: 0,
  inline_styles: 0,
  visual_contracts: visualContracts,
  csp: 'locked',
  complete_design: true,
  resume_pdf_sha256: pdfHash,
}, null, 2));
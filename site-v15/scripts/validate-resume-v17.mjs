import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const here = path.dirname(fileURLToPath(import.meta.url));
const repo = path.resolve(here, '../..');
const assert = (condition, message) => { if (!condition) throw new Error(message); };
const read = filePath => readFile(path.join(repo, filePath), 'utf8');
const bytes = filePath => readFile(path.join(repo, filePath));
const sha256 = data => createHash('sha256').update(data).digest('hex');
const stylesheetPattern = href => new RegExp(`<link\\b[^>]*\\bhref\\s*=\\s*["']${href.replaceAll('/', '\\/')}["'][^>]*>`, 'i');

const paths = {
  html: 'site-v15/resume/index.html',
  css: 'site-v15/assets/resume.v17.css',
  finalCss: 'site-v15/assets/resume.final.css',
  ats: 'site-v15/resume/ats.txt',
  atsMd: 'RESUME_ATS.md',
  json: 'site-v15/data/resume.json',
  manifest: 'site-v15/data/resume-artifacts.json',
  pdf: 'site-v15/downloads/Casey_Barton_Resume.pdf',
  docx: 'site-v15/downloads/Casey_Barton_Resume.docx',
  llms: 'site-v15/llms.txt',
};

const [html, css, finalCss, ats, atsMd, jsonText, manifestText, llms, pdf, docx] = await Promise.all([
  read(paths.html), read(paths.css), read(paths.finalCss), read(paths.ats), read(paths.atsMd), read(paths.json), read(paths.manifest), read(paths.llms), bytes(paths.pdf), bytes(paths.docx),
]);
const resume = JSON.parse(jsonText);
const manifest = JSON.parse(manifestText);

assert((html.match(/<h1\b/g) || []).length === 1, 'resume must contain exactly one h1');
assert(!/<script\b/i.test(html), 'resume must remain script-free');
assert(!/\sstyle\s*=\s*/i.test(html), 'resume must not contain inline styles');
for (const href of ['/assets/site.css', '/assets/site.systems.css', '/assets/resume.v17.css', '/assets/resume.final.css']) {
  assert(stylesheetPattern(href).test(html), `missing stylesheet ${href}`);
}
for (const href of ['/downloads/Casey_Barton_Resume.pdf', '/downloads/Casey_Barton_Resume.docx', '/resume/ats.txt', '/data/resume.json']) {
  assert(html.includes(href), `missing resume surface ${href}`);
}
assert(html.includes('itemscope') && html.includes('https://schema.org/Person'), 'schema.org Person microdata missing');
assert(html.includes('rel="alternate" type="application/json"') && html.includes('rel="alternate" type="text/plain"'), 'machine alternates missing');
for (const exact of ['69/69', '166 + 19', '>67<', '62/62', 'PARTIALLY VERIFIED']) {
  assert(html.includes(exact), `exact final signal missing: ${exact}`);
}
assert(!html.includes('148/148') && !html.includes('148 of 148'), 'stale Helix test-count framing remains in HTML');
assert(finalCss.includes('@page') && finalCss.includes('.60in .70in'), 'print-safe page margins missing');
assert(css.includes('@media print') && css.includes('@media(max-width:700px)'), 'responsive or print contract missing');
assert(css.includes('.resume-v17-machine') && css.includes('.resume-impact-grid') && css.includes('.resume-domain-grid'), 'V17 visual system incomplete');
assert((css.match(/{/g) || []).length === (css.match(/}/g) || []).length, 'CSS brace mismatch');
assert((finalCss.match(/{/g) || []).length === (finalCss.match(/}/g) || []).length, 'final CSS brace mismatch');

assert(ats.length > 7000, 'ATS text too short');
for (const heading of ['PROFESSIONAL SUMMARY', 'SELECTED EXECUTION PROOF', 'CORE COMPETENCIES', 'PROFESSIONAL EXPERIENCE', 'EARLIER TECHNICAL EXPERIENCE', 'EDUCATION', 'EVIDENCE BOUNDARY']) {
  assert(ats.includes(heading), `ATS heading missing: ${heading}`);
}
assert(ats.includes('69 of 69 tests') && ats.includes('67-repository admitted public proof boundary') && ats.includes('62 of 62'), 'ATS proof model drift');
assert(ats.includes('PARTIALLY_VERIFIED'), 'ATS Helix evidence state missing');
assert(!ats.includes('148 of 148') && !ats.includes('148/148'), 'stale Helix test-count framing remains in ATS');
assert(atsMd.includes('# CASEY DEL CARPIO BARTON') && atsMd.includes('## Professional Summary'), 'ATS markdown identity missing');

assert(resume.meta.schema === 'glaciereq.resume-intelligence.v17' && resume.meta.profile === 'PSYSOC-X_MACHINE' && resume.meta.facts_invariant === true, 'machine profile drift');
assert(resume.meta.layout_policy === 'print-safe-letter-margins', 'machine layout policy missing');
assert(resume.basics.name === 'Casey Del Carpio Barton' && resume.basics.label.includes('Applied AI Systems Architect'), 'identity drift');
assert(resume.work.length >= 3, 'cross-domain work history incomplete');
assert(resume.projects.some(project => project.name === 'Portfolio Receipt Router' && project.keywords.includes('69/69')), 'router project evidence missing');
assert(resume.projects.some(project => project.name === 'Job Application Helix' && project.keywords.includes('PARTIALLY_VERIFIED') && project.keywords.includes('admitted_public_repositories:67')), 'Helix boundary/state missing');
const proof = resume.x_evidence.proof;
assert(proof.receipt_router_tests === 69 && proof.bounded_source_tests === 166 && proof.energy_memory_tests === 19 && proof.helix_admitted_public_repositories === 67 && proof.helix_state === 'PARTIALLY_VERIFIED' && proof.coordinator_tests === 62 && proof.external_actions === 0 && proof.receipt_router_artifact === 8910423397, 'machine proof totals/state drift');
assert(resume.x_evidence.limits.some(limit => limit.includes('Repository count is not accomplishment count')), 'repository-count boundary missing');
assert(resume.x_evidence.limits.length >= 4, 'machine limits incomplete');

const combined = `${html}\n${ats}\n${atsMd}\n${jsonText}`.toLowerCase();
const banned = ["master's-level program", 'masters-level program', 'enterprise-grade ai architectures', 'proven track record of executive leadership', 'direct state court filing api', 'greenhouse mcp server', 'workday mcp server', 'sub-100ms response', 'train-of-thought specialization', 'deep learning models', 'chief executive officer & lead building systems inspector', '148/148', '148 of 148'];
for (const phrase of banned) assert(!combined.includes(phrase), `unsupported or stale phrase present: ${phrase}`);

assert(manifest.schema === 'glaciereq.resume-artifacts.v17', 'artifact manifest schema drift');
assert(manifest.builder === 'site-v15/scripts/build-resume-v17-deterministic.py', 'deterministic builder identity drift');
assert(manifest.source_generator === 'site-v15/scripts/generate-resume-v17.py', 'source generator identity drift');
const pdfEntry = manifest.artifacts.pdf;
const docxEntry = manifest.artifacts.docx;
assert(pdfEntry.path === 'downloads/Casey_Barton_Resume.pdf', 'PDF manifest path drift');
assert(docxEntry.path === 'downloads/Casey_Barton_Resume.docx', 'DOCX manifest path drift');
assert(pdf.subarray(0, 5).toString('ascii') === '%PDF-' && pdf.length > 8000, 'resume PDF invalid');
assert(docx.subarray(0, 2).toString('ascii') === 'PK' && docx.length > 30000, 'resume DOCX invalid');
assert(pdfEntry.bytes === pdf.length && pdfEntry.sha256 === sha256(pdf), 'resume PDF manifest identity drift');
assert(docxEntry.bytes === docx.length && docxEntry.sha256 === sha256(docx), 'resume DOCX manifest identity drift');

for (const route of ['/data/resume.json', '/resume/ats.txt', '/downloads/Casey_Barton_Resume.pdf', '/downloads/Casey_Barton_Resume.docx']) {
  assert(llms.includes(route), `llms route missing ${route}`);
}

const result = {
  schema: 'glaciereq.resume-intelligence-validation.v17',
  status: 'PASS',
  profile: resume.meta.profile,
  facts_invariant: true,
  layout_policy: resume.meta.layout_policy,
  deterministic_builder: manifest.builder,
  human_surfaces: ['/resume/', '/downloads/Casey_Barton_Resume.pdf', '/downloads/Casey_Barton_Resume.docx'],
  machine_surfaces: ['/resume/ats.txt', '/data/resume.json'],
  proof,
  files: {
    [paths.html]: { bytes: Buffer.byteLength(html), sha256: sha256(Buffer.from(html)) },
    [paths.finalCss]: { bytes: Buffer.byteLength(finalCss), sha256: sha256(Buffer.from(finalCss)) },
    [paths.ats]: { bytes: Buffer.byteLength(ats), sha256: sha256(Buffer.from(ats)) },
    [paths.json]: { bytes: Buffer.byteLength(jsonText), sha256: sha256(Buffer.from(jsonText)) },
    [paths.manifest]: { bytes: Buffer.byteLength(manifestText), sha256: sha256(Buffer.from(manifestText)) },
    [paths.pdf]: { bytes: pdf.length, sha256: sha256(pdf) },
    [paths.docx]: { bytes: docx.length, sha256: sha256(docx) },
  },
  excluded_report_claims: banned,
};
console.log(JSON.stringify(result, null, 2));

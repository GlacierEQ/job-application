import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const here = path.dirname(fileURLToPath(import.meta.url));
const repo = path.resolve(here, '../..');
const assert = (condition, message) => { if (!condition) throw new Error(message); };
const read = p => readFile(path.join(repo, p), 'utf8');
const bytes = p => readFile(path.join(repo, p));
const sha256 = data => createHash('sha256').update(data).digest('hex');

const paths = {
  html: 'site-v15/resume/index.html', css: 'site-v15/assets/resume.v17.css', ats: 'site-v15/resume/ats.txt', atsMd: 'RESUME_ATS.md', json: 'site-v15/data/resume.json', pdf: 'site-v15/downloads/Casey_Barton_Resume.pdf', docx: 'site-v15/downloads/Casey_Barton_Resume.docx', llms: 'site-v15/llms.txt'
};
const [html, css, ats, atsMd, jsonText, llms, pdf, docx] = await Promise.all([read(paths.html), read(paths.css), read(paths.ats), read(paths.atsMd), read(paths.json), read(paths.llms), bytes(paths.pdf), bytes(paths.docx)]);
const resume = JSON.parse(jsonText);

assert((html.match(/<h1\b/g) || []).length === 1, 'resume must contain exactly one h1');
assert(!/<script\b/i.test(html), 'resume must remain script-free');
assert(!/\sstyle\s*=\s*/i.test(html), 'resume must not contain inline styles');
for (const href of ['/assets/site.css','/assets/site.systems.css','/assets/resume.v17.css']) assert(html.includes(`href="${href}"`), `missing stylesheet ${href}`);
for (const href of ['/downloads/Casey_Barton_Resume.pdf','/downloads/Casey_Barton_Resume.docx','/resume/ats.txt','/data/resume.json']) assert(html.includes(href), `missing resume surface ${href}`);
assert(html.includes('itemscope') && html.includes('https://schema.org/Person'), 'schema.org Person microdata missing');
assert(html.includes('rel="alternate" type="application/json"') && html.includes('rel="alternate" type="text/plain"'), 'machine alternates missing');
for (const exact of ['69/69','166 + 19','148/148','REVIEWED_EXECUTION_BLOCKED','PSYSOC-X V17']) assert(html.includes(exact) || jsonText.includes(exact), `exact signal missing: ${exact}`);
assert(html.indexOf('Portfolio Receipt Router') < html.indexOf('Microcode Governance'), 'verified flagship must precede blocked candidate');
assert(html.includes('current status should be confirmed'), 'historical certification boundary missing');
assert(css.includes('@media print') && css.includes('@media(max-width:700px)'), 'responsive or print contract missing');
assert(css.includes('.resume-v17-machine') && css.includes('.resume-impact-grid') && css.includes('.resume-domain-grid'), 'V17 visual system incomplete');
assert((css.match(/{/g) || []).length === (css.match(/}/g) || []).length, 'CSS brace mismatch');
assert(ats.length > 5000, 'ATS text too short');
for (const heading of ['PROFESSIONAL SUMMARY','SELECTED EXECUTION PROOF','CORE COMPETENCIES','PROFESSIONAL EXPERIENCE','EARLIER TECHNICAL EXPERIENCE','EDUCATION','EVIDENCE BOUNDARY']) assert(ats.includes(heading), `ATS heading missing: ${heading}`);
assert(ats.includes('69 of 69 tests') && ats.includes('148 of 148') && ats.includes('62 of 62'), 'ATS proof counts drift');
assert(ats.includes('REVIEWED_EXECUTION_BLOCKED'), 'ATS blocked state missing');
assert(atsMd.includes('# CASEY DEL CARPIO BARTON') && atsMd.includes('## Professional Summary'), 'ATS markdown identity missing');
assert(resume.meta.schema === 'glaciereq.resume-intelligence.v17' && resume.meta.profile === 'PSYSOC-X_MACHINE' && resume.meta.facts_invariant === true, 'machine profile drift');
assert(resume.basics.name === 'Casey Del Carpio Barton' && resume.basics.label.includes('Applied AI Systems Architect'), 'identity drift');
assert(resume.work.length >= 3, 'cross-domain work history incomplete');
assert(resume.projects.some(p => p.name === 'Portfolio Receipt Router' && p.keywords.includes('69/69')), 'router project evidence missing');
assert(resume.projects.some(p => p.name === 'Microcode Governance' && p.keywords.includes('REVIEWED_EXECUTION_BLOCKED')), 'microcode boundary missing');
const proof = resume.x_evidence.proof;
assert(proof.receipt_router_tests === 69 && proof.bounded_source_tests === 166 && proof.energy_memory_tests === 19 && proof.helix_tests === 148 && proof.coordinator_tests === 62 && proof.external_actions === 0 && proof.receipt_router_artifact === 8910423397, 'machine proof totals drift');
assert(resume.x_evidence.limits.length >= 3, 'machine limits incomplete');
const combined = `${html}\n${ats}\n${atsMd}\n${jsonText}`.toLowerCase();
const banned = ["master's-level program",'masters-level program','enterprise-grade ai architectures','proven track record of executive leadership','direct state court filing api','greenhouse mcp server','workday mcp server','sub-100ms response','train-of-thought specialization','deep learning models','chief executive officer & lead building systems inspector'];
for (const phrase of banned) assert(!combined.includes(phrase), `unsupported prestige phrase present: ${phrase}`);
assert(pdf.subarray(0,5).toString('ascii') === '%PDF-' && pdf.length > 50000, 'resume PDF invalid');
assert(sha256(pdf) === '7ed445caf8ea73392868fdf29ca150476c8ef89ca6c622bb136aa143ca405bab', 'resume PDF SHA drift');
assert(docx.subarray(0,2).toString('ascii') === 'PK' && docx.length > 30000, 'resume DOCX invalid');
assert(sha256(docx) === 'e88a77e588fbcf98425adac8e4920837794c67985edee9d764d536049b5f79da', 'resume DOCX SHA drift');
for (const route of ['/data/resume.json','/resume/ats.txt','/downloads/Casey_Barton_Resume.pdf','/downloads/Casey_Barton_Resume.docx']) assert(llms.includes(route), `llms route missing ${route}`);
const result = {schema:'glaciereq.resume-intelligence-validation.v17',status:'PASS',profile:resume.meta.profile,facts_invariant:true,human_surfaces:['/resume/','/downloads/Casey_Barton_Resume.pdf','/downloads/Casey_Barton_Resume.docx'],machine_surfaces:['/resume/ats.txt','/data/resume.json'],proof,files:{[paths.html]:{bytes:Buffer.byteLength(html),sha256:sha256(Buffer.from(html))},[paths.css]:{bytes:Buffer.byteLength(css),sha256:sha256(Buffer.from(css))},[paths.ats]:{bytes:Buffer.byteLength(ats),sha256:sha256(Buffer.from(ats))},[paths.json]:{bytes:Buffer.byteLength(jsonText),sha256:sha256(Buffer.from(jsonText))},[paths.pdf]:{bytes:pdf.length,sha256:sha256(pdf)},[paths.docx]:{bytes:docx.length,sha256:sha256(docx)}},excluded_report_claims:banned};
console.log(JSON.stringify(result,null,2));

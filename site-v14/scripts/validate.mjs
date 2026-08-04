import { readFile } from 'node:fs/promises';

const root = new URL('../', import.meta.url);
const read = path => readFile(new URL(path, root), 'utf8');
const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

const [html, css, vercelText] = await Promise.all([
  read('index.html'),
  read('assets/site.css'),
  read('vercel.json')
]);
const vercel = JSON.parse(vercelText);

assert((html.match(/<h1\b/g) || []).length === 1, 'Homepage must contain exactly one h1');
assert(html.includes('I build the systems that <em>do not exist yet.</em>'), 'Canonical headline changed');
assert(html.includes('https://casey-barton-glaciereq.vercel.app/'), 'Canonical production URL is missing');
assert(!html.includes('<style'), 'Inline style blocks are not allowed');
assert(!html.includes('<script'), 'The static homepage must remain script-free');
assert(html.includes('href="/assets/site.css"'), 'External stylesheet is not wired');

for (const id of ['inventions', 'depth', 'companies', 'proof', 'roles']) {
  assert(html.includes(`id="${id}"`), `Missing required section: ${id}`);
}
for (const metric of ['67', '10', '7', '12']) {
  assert(html.includes(`<b>${metric}</b>`), `Missing first-viewport metric: ${metric}`);
}
for (const system of ['Job Application Helix', 'Tower of Babel', 'Agent Coordinator', 'ECHO', 'Sigma Glue', 'Pro-Code', 'MEGA-PDF', 'AKOS', 'Tasklet']) {
  assert(html.includes(system), `Missing system: ${system}`);
}
for (const company of ['Anthropic', 'SpaceX', 'xAI / Colossus', 'NVIDIA', 'Apple', 'Tasklet', 'OpenAI / Codex']) {
  assert(html.includes(`<h3>${company}</h3>`), `Missing company suite: ${company}`);
}

const moduleList = html.match(/<div class="module-list">([\s\S]*?)<\/div>/)?.[1] ?? '';
assert((moduleList.match(/<span>/g) || []).length === 12, 'SpaceX suite must list exactly twelve modules');
assert(html.includes('47 pass / 10 fail'), 'Tower repair status is missing');
assert(html.includes('148/148 recorded tests'), 'Helix receipt is missing');
assert(html.includes('62/62 recorded tests'), 'Agent Coordinator receipt is missing');
assert(!html.includes('href="/depth'), 'Do not split portfolio depth into another site route');
assert(html.includes('portfolio_repositories.json'), 'Full governed inventory link is missing');
assert(html.includes('portfolio_candidate_reconciliation_2026-08-03.json'), 'Promotion registry link is missing');
assert(html.includes('RESUME.md'), 'Direct résumé link is missing');

assert(css.includes('--mint:#75ffd1'), 'Canonical mint identity changed');
assert(css.includes('--violet:#b8a1ff'), 'Canonical violet identity changed');
assert(css.includes('--amber:#ffd08a'), 'Canonical amber identity changed');
assert(css.includes('@media(max-width:680px)'), 'Mobile layout contract is missing');
assert(css.includes('@media(prefers-reduced-motion:reduce)'), 'Reduced-motion contract is missing');

const csp = vercel.headers?.[0]?.headers?.find(item => item.key === 'Content-Security-Policy')?.value ?? '';
assert(csp.includes("script-src 'none'"), 'CSP must prohibit scripts');
assert(csp.includes("style-src 'self'"), 'CSP must permit only same-origin styles');
assert(csp.includes("frame-ancestors 'none'"), 'CSP must prohibit framing');

console.log(JSON.stringify({
  status: 'PASS',
  canonical_site: 'casey-barton-glaciereq.vercel.app',
  headline_count: 1,
  portfolio_metrics: { governed_repositories: 67, flagship_class_systems: 10, company_suites: 7, spacex_modules: 12 },
  sections: ['inventions', 'depth', 'companies', 'proof', 'roles'],
  scripts: 0,
  csp: 'locked'
}, null, 2));

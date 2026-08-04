import { readFile } from 'node:fs/promises';

const root = new URL('../', import.meta.url);
const read = path => readFile(new URL(path, root), 'utf8');
const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

const [html, css, mapHtml, mapCss, vercelText] = await Promise.all([
  read('index.html'),
  read('assets/site.css'),
  read('system-map/index.html'),
  read('assets/system-map.css'),
  read('vercel.json')
]);
const vercel = JSON.parse(vercelText);

assert((html.match(/<h1\b/g) || []).length === 1, 'Homepage must contain exactly one h1');
assert(html.includes('I build the systems that <em>do not exist yet.</em>'), 'Canonical headline changed');
assert(html.includes('https://casey-barton-glaciereq.vercel.app/'), 'Canonical production URL is missing');
assert(!html.includes('<style'), 'Inline style blocks are not allowed');
assert(!html.includes('<script'), 'The static homepage must remain script-free');
assert(html.includes('href="/assets/site.css"'), 'External stylesheet is not wired');
assert((html.match(/href="\/system-map\/"/g) || []).length >= 4, 'Homepage must expose the hierarchy in navigation, hero, depth, and closing surfaces');

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

assert((html.match(/<strong>How:<\/strong>/g) || []).length >= 14, 'Major cards must include concise How explanations');
assert((html.match(/<dt>HOW IT WORKS<\/dt>/g) || []).length === 3, 'Each headline invention must explain how it works');
assert(html.includes('inventories governed repositories'), 'Helix mechanism is missing');
assert(html.includes('converts a task graph into assignments'), 'Agent Coordinator mechanism is missing');
assert(html.includes('fingerprints conversations and files'), 'ECHO mechanism is missing');
assert(html.includes('wraps each connected system in a capability contract'), 'Sigma Glue mechanism is missing');

const moduleList = html.match(/<div class="module-list">([\s\S]*?)<\/div>/)?.[1] ?? '';
assert((moduleList.match(/<span>/g) || []).length === 12, 'SpaceX suite must list exactly twelve modules');
assert(html.includes('47 pass / 10 fail'), 'Tower repair status is missing');
assert(html.includes('148/148 recorded tests'), 'Helix receipt is missing');
assert(html.includes('62/62 recorded tests'), 'Agent Coordinator receipt is missing');
assert(!html.includes('href="/depth'), 'Do not split portfolio depth into a stale route');
assert(html.includes('portfolio_repositories.json'), 'Full governed inventory link is missing');
assert(html.includes('portfolio_candidate_reconciliation_2026-08-03.json'), 'Promotion registry link is missing');
assert(html.includes('RESUME.md'), 'Direct résumé link is missing');

assert((mapHtml.match(/<h1\b/g) || []).length === 1, 'System map must contain exactly one h1');
assert(mapHtml.includes('The portfolio as an actual hierarchy.'), 'System map hierarchy headline is missing');
assert(mapHtml.includes('<svg class="orbit-map"'), 'System constellation visual aid is missing');
assert((mapHtml.match(/class="system-node"/g) || []).length === 10, 'System map must contain exactly ten system branches');
assert((mapHtml.match(/<details /g) || []).length === 10, 'Every system branch must be expandable');
assert((mapHtml.match(/<section class="child innovation">/g) || []).length === 10, 'Every system must expose its innovation');
assert((mapHtml.match(/<section class="child repositories">/g) || []).length === 10, 'Every system must expose its repository branch');
assert((mapHtml.match(/<section class="child bottleneck">/g) || []).length === 10, 'Every system must expose its bottleneck');
assert((mapHtml.match(/<section class="child gate">/g) || []).length === 10, 'Every system must expose its promotion gate');
for (const id of ['cj-helix', 'cj-akos', 'cj-tower', 'cj-agent', 'cj-resume', 'candidate-echo', 'emerging-sigma', 'emerging-procode', 'supporting-megapdf', 'exhibit-tasklet']) {
  assert(mapHtml.includes(`id="${id}"`), `Missing hierarchy node: ${id}`);
}
for (const repo of ['job-app-helix', 'job-application', 'JOB-RESUME-BUILDER-', 'AKOS', 'sigma-glue', 'the-tower-of-babel', 'pro-code', 'anthropic-agent-coordinator', 'anthropic-safety-monitor', 'ECHO', 'tasklet-micro-agent-engine']) {
  assert(mapHtml.includes(`GlacierEQ/${repo}`), `Missing repository link or reference: ${repo}`);
}
assert(mapHtml.includes('upstream reference only; explicitly excluded'), 'Reference-only authorship boundary is missing');
assert((mapHtml.match(/class="repo-chips"/g) || []).length === 1, 'SpaceX repository branch must be grouped once');
assert((mapHtml.match(/https:\/\/github.com\/GlacierEQ\/spacex-/g) || []).length === 12, 'System map must link all twelve SpaceX repositories');
assert(!mapHtml.includes('<script'), 'System map must remain script-free');
assert(mapHtml.includes('href="/assets/system-map.css"'), 'System map stylesheet is not wired');

assert(css.includes('--mint:#75ffd1'), 'Canonical mint identity changed');
assert(css.includes('--violet:#b8a1ff'), 'Canonical violet identity changed');
assert(css.includes('--amber:#ffd08a'), 'Canonical amber identity changed');
assert(css.includes('@media(max-width:680px)'), 'Homepage mobile layout contract is missing');
assert(css.includes('@media(prefers-reduced-motion:reduce)'), 'Reduced-motion contract is missing');
assert(mapCss.includes('.orbit-map'), 'System map visual styling is missing');
assert(mapCss.includes('.node-children'), 'Hierarchy child-branch styling is missing');
assert(mapCss.includes('@media(max-width:700px)'), 'System map mobile layout is missing');

const csp = vercel.headers?.[0]?.headers?.find(item => item.key === 'Content-Security-Policy')?.value ?? '';
assert(csp.includes("script-src 'none'"), 'CSP must prohibit scripts');
assert(csp.includes("style-src 'self'"), 'CSP must permit only same-origin styles');
assert(csp.includes("frame-ancestors 'none'"), 'CSP must prohibit framing');

console.log(JSON.stringify({
  status: 'PASS',
  canonical_site: 'casey-barton-glaciereq.vercel.app',
  hierarchy_route: '/system-map/',
  hierarchy_systems: 10,
  crown_jewels: 5,
  company_suites: 7,
  spacex_repository_links: 12,
  branch_fields: ['innovation', 'repositories', 'bottleneck', 'promotion_gate'],
  homepage_hierarchy_links: (html.match(/href="\/system-map\/"/g) || []).length,
  scripts: 0,
  csp: 'locked'
}, null, 2));

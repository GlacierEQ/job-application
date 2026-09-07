import { access, readFile, readdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';

const root = new URL('../', import.meta.url);
const read = file => readFile(new URL(file, root), 'utf8');
const exists = file => access(new URL(file, root));
const assert = (condition, message) => { if (!condition) throw new Error(message); };

const [dataText, lockText, home, sitemap, llms] = await Promise.all([
  read('data/mega-skills.json'), read('data/mega-skills-source-lock.json'), read('index.html'), read('sitemap.xml'), read('llms.txt'),
]);
const data = JSON.parse(dataText); const lock = JSON.parse(lockText);
const digest = createHash('sha256').update(dataText).digest('hex');

assert(data.schema === 'glaciereq.public-mega-skills.v2', 'Mega-Skills public schema drift');
assert(data.source.commit === lock.source_commit, 'Mega-Skills source commit drift');
assert(data.source.graph_sha256 === lock.source_graph_sha256, 'Mega-Skills graph hash drift');
assert(digest === lock.root_manifest_sha256, 'Mega-Skills root manifest hash drift');
assert(data.counts.atomic_skills === 709 && data.counts.compound_skills === 33 && data.counts.mega_skills === 29, 'Mega-Skills canonical count drift');
assert(data.counts.unresolved_owned_references === 0 && data.counts.compound_cycles === 0, 'Mega-Skills graph must be resolved and acyclic');
assert(data.mega_skills.length === 29 && new Set(data.mega_skills.map(x => x.id)).size === 29, 'Mega-Skills must expose 29 unique apexes');
assert(home.includes('href="/mega-skills/"'), 'portfolio home must link Mega-Skills');
const sitemapMegaRoutes = new Set(
  [...sitemap.matchAll(/<loc>https:\/\/casey-barton-glaciereq\.vercel\.app(\/mega-skills\/[^<]*)<\/loc>/g)].map((match) => match[1]),
);
const expectedMegaRoutes = new Set(['/mega-skills/', ...data.mega_skills.map((mega) => mega.route)]);
assert(sitemap.includes('https://casey-barton-glaciereq.vercel.app/mega-skills/'), 'root sitemap missing Mega-Skills');
assert(sitemapMegaRoutes.size === expectedMegaRoutes.size, 'Mega-Skills sitemap route count drift');
for (const route of expectedMegaRoutes) {
  assert(sitemapMegaRoutes.has(route), `Mega-Skills sitemap missing manifest route: ${route}`);
}
for (const route of sitemapMegaRoutes) {
  assert(expectedMegaRoutes.has(route), `Mega-Skills sitemap contains undeclared route: ${route}`);
}
assert(llms.includes('/mega-skills/') && llms.includes('/data/mega-skills.json'), 'LLM orientation missing Mega-Skills');
await exists('assets/mega-skills.css');

let details = 0;
for (const mega of data.mega_skills) {
  assert(mega.route === `/mega-skills/${mega.id}/`, `route contract drift: ${mega.id}`);
  const path = `mega-skills/${mega.id}/index.html`;
  await exists(path);
  const page = await read(path);
  assert((page.match(/<h1\b/g) || []).length === 1, `${mega.id}: page must contain one h1`);
  assert(!/<script\b/i.test(page), `${mega.id}: page must remain script-free`);
  assert(!/\sstyle\s*=\s*/i.test(page), `${mega.id}: no inline style attributes`);
  assert(page.includes(`rel="canonical" href="https://casey-barton-glaciereq.vercel.app/mega-skills/${mega.id}/"`), `${mega.id}: canonical URL drift`);
  assert(page.includes(`<code>${mega.id}</code>`), `${mega.id}: exact Skill ID missing`);
  assert(page.includes('Claim boundary'), `${mega.id}: claim boundary missing`);
  assert(page.includes('Mission artifact:'), `${mega.id}: mission artifact missing`);
  assert(page.includes('local_validation'), `${mega.id}: Atomic validation contract missing`);
  details += (page.match(/<details\b/g) || []).length;
}
assert(details >= 29, 'each Mega route must expose expandable Skill branches');
console.log(JSON.stringify({status:'PASS',schema:data.schema,source_commit:data.source.commit,manifest_sha256:digest,mega_routes:data.mega_skills.length,details,counts:data.counts}));

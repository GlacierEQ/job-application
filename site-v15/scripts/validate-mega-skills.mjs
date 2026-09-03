import { readFile } from 'node:fs/promises';

const root = new URL('../', import.meta.url);
const read = file => readFile(new URL(file, root), 'utf8');
const assert = (condition, message) => { if (!condition) throw new Error(message); };

const [page, dataText, home, sitemap, llms] = await Promise.all([
  read('mega-skills/index.html'),
  read('data/mega-skills.json'),
  read('index.html'),
  read('sitemap.xml'),
  read('llms.txt'),
]);
const data = JSON.parse(dataText);

assert((page.match(/<h1\b/g) || []).length === 1, 'Mega-Skills page must contain one h1');
assert(!/<script\b/i.test(page), 'Mega-Skills page must remain script-free');
assert(!/\sstyle\s*=\s*/i.test(page), 'Mega-Skills page cannot use inline style attributes');
for (const href of ['/assets/site.css','/assets/site.systems.css','/assets/site.complete.css','/assets/site.interaction.css','/assets/site.algerian.css']) {
  assert(page.includes(`href="${href}"`), `Mega-Skills page missing stylesheet ${href}`);
}
for (const token of [
  'A Mega Skill is a <em>pyramid of real Skills.</em>',
  'EVERY NODE IS A SKILL',
  '709', '33', '29', '123',
  'APEX Capability Foundry',
  'APEX Autonomous Software Engineering',
  'APEX Vercel Web Foundry',
  'Far Away Party',
  '/data/mega-skills.json',
]) assert(page.includes(token), `Mega-Skills page missing ${token}`);

assert(data.schema === 'glaciereq.public-mega-skills.v1', 'Mega-Skills data schema drift');
assert(data.counts.atomic_skills === 709, 'atomic Skill count drift');
assert(data.counts.compound_skills === 33, 'compound Skill count drift');
assert(data.counts.mega_skills === 29, 'Mega Skill count drift');
assert(data.counts.internal_compound_to_atomic_references === 123, 'compound→atomic reference count drift');
assert(data.mega_skills.length === 29, 'Mega apex registry drift');
assert(new Set(data.mega_skills.map(item => item.id)).size === 29, 'Mega apex IDs must be unique');
assert(data.examples.length === 4 && data.examples.every(item => item.required.length > 0), 'Mega examples must resolve real compound children');
assert(home.includes('href="/mega-skills/"'), 'portfolio home must link Mega-Skills');
assert(sitemap.includes('https://casey-barton-glaciereq.vercel.app/mega-skills/'), 'sitemap missing Mega-Skills route');
assert(llms.includes('/mega-skills/') && llms.includes('/data/mega-skills.json'), 'LLM orientation missing Mega-Skills');

console.log(JSON.stringify({status:'PASS',route:'/mega-skills/',counts:data.counts,mega_skills:data.mega_skills.length,examples:data.examples.map(x=>x.id),scripts:0,inline_styles:0}, null, 2));

#!/usr/bin/env node
// Make sitemap.xml list every canonical, indexable HTML route that ships in site-v15.
// - adds indexable index.html routes that are missing (e.g. evidence-gallery detail pages)
// - drops entries for noindex pages (e.g. /atlas/<slug>/ redirect stubs) and routes with no page
// - leaves the /mega-skills/ set alone: validate-mega-skills.mjs requires it to equal the manifest
// Usage: node scripts/complete-sitemap.mjs [--check]
import { readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const SITE = path.resolve('site-v15');
const ORIGIN = 'https://casey-barton-glaciereq.vercel.app';
const check = process.argv.includes('--check');
const SKIP_DIRS = new Set(['assets', 'scripts', 'data', 'downloads', 'node_modules']);

async function walk(dir, out = []) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (dir === SITE && SKIP_DIRS.has(entry.name)) continue;
      await walk(path.join(dir, entry.name), out);
    } else if (entry.name === 'index.html') {
      out.push(path.join(dir, entry.name));
    }
  }
  return out;
}

const noindex = /<meta[^>]+name=["']robots["'][^>]+noindex/i;
const routes = new Map();
for (const file of await walk(SITE)) {
  const rel = path.relative(SITE, path.dirname(file)).split(path.sep).join('/');
  const route = rel === '' ? '/' : `/${rel}/`;
  routes.set(route, !noindex.test(await readFile(file, 'utf8')));
}

const sitemapPath = path.join(SITE, 'sitemap.xml');
const source = await readFile(sitemapPath, 'utf8');
const entry = /\s*<url><loc>https:\/\/casey-barton-glaciereq\.vercel\.app([^<]*)<\/loc>(?:<priority>[^<]+<\/priority>)?<\/url>/g;
const listed = new Set();
const removed = [];
let next = source.replace(entry, (match, route) => {
  const isMega = route.startsWith('/mega-skills/');
  if (!isMega && routes.get(route) !== true) { removed.push(route); return ''; }
  if (listed.has(route)) { removed.push(route); return ''; }
  listed.add(route);
  return match;
});

const added = [...routes]
  .filter(([route, indexable]) => indexable && !listed.has(route) && !route.startsWith('/mega-skills/'))
  .map(([route]) => route)
  .sort();
if (added.length) {
  const closing = next.lastIndexOf('</urlset>');
  if (closing < 0) throw new Error('sitemap.xml has no closing urlset element');
  next = `${next.slice(0, closing).trimEnd()}\n${added.map((r) => `  <url><loc>${ORIGIN}${r}</loc></url>`).join('\n')}\n${next.slice(closing)}`;
}

const total = (next.match(/<loc>/g) || []).length;
const report = { status: 'PASS', mode: check ? 'check' : 'write', urls: total, added: added.length, removed: removed.length };
if (check) {
  if (added.length || removed.length) {
    console.error(JSON.stringify({ ...report, status: 'FAIL', added_routes: added, removed_routes: removed }));
    process.exit(1);
  }
} else if (next !== source) {
  await writeFile(sitemapPath, next.endsWith('\n') ? next : `${next}\n`, 'utf8');
}
console.log(JSON.stringify(report));

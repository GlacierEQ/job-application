#!/usr/bin/env node

import { access, readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const THIS_FILE = fileURLToPath(import.meta.url);
const ROOT = path.resolve(path.dirname(THIS_FILE), '..');
const SITE = path.join(ROOT, 'site-v15');
const CSS_PATH = path.join(SITE, 'assets', 'site.algerian.css');
const LINK_RE = /<link\s+rel=["']stylesheet["']\s+href=["']\/assets\/site\.algerian\.css["']\s*>/gi;

async function htmlFiles(directory) {
  const out = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (entry.name === 'node_modules') continue;
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) out.push(...await htmlFiles(target));
    else if (entry.isFile() && entry.name.endsWith('.html')) out.push(target);
  }
  return out.sort();
}

await access(CSS_PATH);
const css = await readFile(CSS_PATH, 'utf8');
const requiredCss = [
  '--font-display:',
  '"Algerian"',
  ':where(h1,h2,h3,h4,h5,h6,.brand strong,.brand small,.mark)',
  'h1{',
  'h2{',
  'h3{',
  '.hero-v21 h1{',
  '@media(max-width:640px)',
];
for (const token of requiredCss) {
  if (!css.includes(token)) throw new Error(`Algerian display contract missing ${token}`);
}
if (/@font-face\b/i.test(css)) {
  throw new Error('Algerian display layer must not bundle or declare a proprietary font binary');
}

const files = await htmlFiles(SITE);
if (files.length < 100) throw new Error(`unexpectedly small HTML surface: ${files.length}`);

for (const file of files) {
  const html = await readFile(file, 'utf8');
  const matches = html.match(LINK_RE) ?? [];
  LINK_RE.lastIndex = 0;
  if (matches.length !== 1) {
    const relative = path.relative(ROOT, file).replaceAll(path.sep, '/');
    throw new Error(`${relative}: expected exactly one Algerian display stylesheet, found ${matches.length}`);
  }
}

console.log(JSON.stringify({
  status: 'PASS',
  display_font: 'Algerian',
  fallback_policy: 'local-system-stack-only',
  bundled_font_files: 0,
  html_routes_verified: files.length,
  title_scope: ['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'brand', 'mark'],
}, null, 2));

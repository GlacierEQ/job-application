#!/usr/bin/env node

import { readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const THIS_FILE = fileURLToPath(import.meta.url);
const ROOT = path.resolve(path.dirname(THIS_FILE), '..');
const SITE = path.join(ROOT, 'site-v15');
const COMPLETE = '<link rel="stylesheet" href="/assets/site.complete.css">';
const SYSTEMS = /<link\s+rel=["']stylesheet["']\s+href=["']\/assets\/site\.systems\.css["']\s*>/i;
const COMPLETE_PATTERN = /<link\s+rel=["']stylesheet["']\s+href=["']\/assets\/site\.complete\.css["']\s*>/gi;

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

function inject(html, relative) {
  const matches = [...html.matchAll(COMPLETE_PATTERN)];
  if (matches.length > 1) throw new Error(`${relative}: duplicate complete-design stylesheet`);
  if (matches.length === 1) return { html, changed: false };
  if (!SYSTEMS.test(html)) throw new Error(`${relative}: site.systems.css anchor missing`);
  const next = html.replace(SYSTEMS, match => `${match}\n  ${COMPLETE}`);
  if (next === html) throw new Error(`${relative}: complete-design injection failed`);
  return { html: next, changed: true };
}

const files = await htmlFiles(SITE);
let changed = 0;
for (const file of files) {
  const relative = path.relative(ROOT, file).replaceAll(path.sep, '/');
  const source = await readFile(file, 'utf8');
  const result = inject(source, relative);
  if (result.changed) {
    await writeFile(file, result.html, 'utf8');
    changed += 1;
  }
}

if (!files.length) throw new Error('no HTML files discovered');
const result = { status: 'PASS', html_files: files.length, injected: changed, stylesheet: '/assets/site.complete.css' };
const invokedDirectly = process.argv[1] && path.resolve(process.argv[1]) === path.resolve(THIS_FILE);
if (invokedDirectly) console.log(JSON.stringify(result));

export { result };

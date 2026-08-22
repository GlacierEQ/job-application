#!/usr/bin/env node

import { readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const THIS_FILE = fileURLToPath(import.meta.url);
const ROOT = path.resolve(path.dirname(THIS_FILE), '..');
const SITE = path.join(ROOT, 'site-v15');
const SYSTEMS_LINK = '<link rel="stylesheet" href="/assets/site.systems.css">';
const COMPLETE = '<link rel="stylesheet" href="/assets/site.complete.css">';
const INTERACTION = '<link rel="stylesheet" href="/assets/site.interaction.css">';
const ALGERIAN = '<link rel="stylesheet" href="/assets/site.algerian.css">';
const SYSTEMS = /<link\s+rel=["']stylesheet["']\s+href=["']\/assets\/site\.systems\.css(?:\?[^"']*)?["']\s*>/i;
const COMPLETE_PATTERN = /<link\s+rel=["']stylesheet["']\s+href=["']\/assets\/site\.complete\.css(?:\?[^"']*)?["']\s*>/gi;
const INTERACTION_PATTERN = /<link\s+rel=["']stylesheet["']\s+href=["']\/assets\/site\.interaction\.css(?:\?[^"']*)?["']\s*>/gi;
const ALGERIAN_PATTERN = /<link\s+rel=["']stylesheet["']\s+href=["']\/assets\/site\.algerian\.css(?:\?[^"']*)?["']\s*>/gi;

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

function isMetaRefreshRedirect(html) {
  const metaTags = html.match(/<meta\b[^>]*>/gi) ?? [];
  return metaTags.some(tag => (
    /\bhttp-equiv\s*=\s*["']refresh["']/i.test(tag)
    && /\bcontent\s*=\s*["'][^"']*\burl\s*=/i.test(tag)
  ));
}

function inject(html, relative) {
  const completeMatches = [...html.matchAll(COMPLETE_PATTERN)];
  const interactionMatches = [...html.matchAll(INTERACTION_PATTERN)];
  const algerianMatches = [...html.matchAll(ALGERIAN_PATTERN)];
  if (completeMatches.length > 1) throw new Error(`${relative}: duplicate complete-design stylesheet`);
  if (interactionMatches.length > 1) throw new Error(`${relative}: duplicate interaction stylesheet`);
  if (algerianMatches.length > 1) throw new Error(`${relative}: duplicate Algerian display stylesheet`);

  const hasSystems = SYSTEMS.test(html);
  if (
    hasSystems
    && completeMatches.length === 1
    && interactionMatches.length === 1
    && algerianMatches.length === 1
  ) return { html, changed: false };

  if (!hasSystems) {
    if (!isMetaRefreshRedirect(html)) throw new Error(`${relative}: site.systems.css anchor missing`);
    if (!/<\/head>/i.test(html)) throw new Error(`${relative}: redirect head closing tag missing`);

    const missingLinks = [SYSTEMS_LINK];
    if (completeMatches.length === 0) missingLinks.push(COMPLETE);
    if (interactionMatches.length === 0) missingLinks.push(INTERACTION);
    if (algerianMatches.length === 0) missingLinks.push(ALGERIAN);

    const injectedLinks = missingLinks.map(link => `  ${link}`).join('\n');
    const next = html.replace(/<\/head>/i, `${injectedLinks}\n</head>`);
    if (next === html) throw new Error(`${relative}: redirect design injection failed`);
    return { html: next, changed: true };
  }

  let next = html;
  if (completeMatches.length === 0) next = next.replace(SYSTEMS, match => `${match}\n  ${COMPLETE}`);
  if (interactionMatches.length === 0) {
    if (!COMPLETE_PATTERN.test(next)) throw new Error(`${relative}: complete-design anchor missing`);
    COMPLETE_PATTERN.lastIndex = 0;
    next = next.replace(COMPLETE_PATTERN, match => `${match}\n  ${INTERACTION}`);
  }
  if (algerianMatches.length === 0) {
    if (!INTERACTION_PATTERN.test(next)) throw new Error(`${relative}: interaction-design anchor missing`);
    INTERACTION_PATTERN.lastIndex = 0;
    next = next.replace(INTERACTION_PATTERN, match => `${match}\n  ${ALGERIAN}`);
  }
  COMPLETE_PATTERN.lastIndex = 0;
  INTERACTION_PATTERN.lastIndex = 0;
  ALGERIAN_PATTERN.lastIndex = 0;
  if (next === html) throw new Error(`${relative}: design injection failed`);
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
const result = {
  status: 'PASS',
  html_files: files.length,
  injected: changed,
  stylesheets: [
    '/assets/site.complete.css',
    '/assets/site.interaction.css',
    '/assets/site.algerian.css',
  ],
};
const invokedDirectly = process.argv[1] && path.resolve(process.argv[1]) === path.resolve(THIS_FILE);
if (invokedDirectly) console.log(JSON.stringify(result));

export { result };
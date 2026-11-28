#!/usr/bin/env node

import { readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const THIS_FILE = fileURLToPath(import.meta.url);
const ROOT = path.resolve(path.dirname(THIS_FILE), '..');
const SITE = path.join(ROOT, 'site-v15');
const SYSTEMS_LINK = '<link rel="stylesheet" href="/assets/site.systems.css">';
const COMPLETE = '<link rel="stylesheet" href="/assets/site.complete.css">';
const INTERACTION = '<link rel="stylesheet" href="/assets/site.interaction.css">';
const ALGERIAN = '<link rel="stylesheet" href="/assets/site.algerian.css">';
const SYSTEMS = /<link\s+rel=["']stylesheet["']\s+href=["']\/assets\/site\.systems\.css["']\s*>/i;
const COMPLETE_PATTERN = /<link\s+rel=["']stylesheet["']\s+href=["']\/assets\/site\.complete\.css["']\s*>/gi;
const INTERACTION_PATTERN = /<link\s+rel=["']stylesheet["']\s+href=["']\/assets\/site\.interaction\.css["']\s*>/gi;
const ALGERIAN_PATTERN = /<link\s+rel=["']stylesheet["']\s+href=["']\/assets\/site\.algerian\.css["']\s*>/gi;

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

export function injectDesignHtml(html, relative) {
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

export async function runCompleteWebDesign({ siteDir = SITE, rootDir = ROOT, check = false } = {}) {
  const files = await htmlFiles(siteDir);
  if (!files.length) throw new Error('no HTML files discovered');

  const driftedFiles = [];
  let changed = 0;
  for (const file of files) {
    const relative = path.relative(rootDir, file).replaceAll(path.sep, '/');
    const source = await readFile(file, 'utf8');
    const injected = injectDesignHtml(source, relative);
    if (injected.changed) {
      changed += 1;
      if (check) {
        driftedFiles.push(relative);
      } else {
        await writeFile(file, injected.html, 'utf8');
      }
    }
  }

  const summary = {
    status: check && driftedFiles.length > 0 ? 'FAIL' : 'PASS',
    mode: check ? 'check' : 'write',
    html_files: files.length,
    ...(check ? { drifted: driftedFiles.length, drifted_files: driftedFiles } : { injected: changed }),
    stylesheets: [
      '/assets/site.complete.css',
      '/assets/site.interaction.css',
      '/assets/site.algerian.css',
    ],
  };

  if (check && driftedFiles.length > 0) {
    const error = new Error(`complete web design drift in ${driftedFiles.length} file(s): ${driftedFiles.join(', ')}`);
    error.summary = summary;
    throw error;
  }
  return summary;
}

const invokedDirectly = process.argv[1] && path.resolve(process.argv[1]) === path.resolve(THIS_FILE);
if (invokedDirectly) {
  const check = process.argv.includes('--check');
  const siteArgIndex = process.argv.indexOf('--site');
  const siteDir = siteArgIndex >= 0 && process.argv[siteArgIndex + 1]
    ? path.resolve(process.argv[siteArgIndex + 1])
    : SITE;
  const rootDir = siteDir === SITE ? ROOT : path.dirname(siteDir);

  runCompleteWebDesign({ siteDir, rootDir, check })
    .then(summary => {
      console.log(JSON.stringify(summary));
    })
    .catch(error => {
      if (error?.summary) {
        console.error(JSON.stringify(error.summary, null, 2));
      } else {
        console.error(error instanceof Error ? error.message : String(error));
      }
      process.exitCode = 1;
    });
}

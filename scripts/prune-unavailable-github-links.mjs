#!/usr/bin/env node
// Removes or unlinks references to GlacierEQ repositories that an anonymous
// reader cannot open (see unavailable-github-repositories.mjs), so every
// github.com/GlacierEQ link on the public site resolves.
//   - repository ledger / relationship rows that only name such a repository: dropped
//   - call-to-action links (buttons, "Source ↗", "Open candidate →"): dropped
//   - inline mentions inside prose: kept as plain text
//   - cards left with nothing but a heading: dropped
//   - plain-text resumes: "Source:" lines say the repository is private
import { readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { UNAVAILABLE_GITHUB_REPOSITORIES } from './unavailable-github-repositories.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SITE = path.join(ROOT, 'site-v15');
const CHECK = process.argv.includes('--check');

const names = UNAVAILABLE_GITHUB_REPOSITORIES.map((n) => n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
const DEAD_URL = `https?://github\\.com/GlacierEQ/(?:${names})(?=[/"'#?\\s<)]|$)[^"'\\s<)]*`;
const DEAD_HREF = new RegExp(`href=(["'])${DEAD_URL}\\1`, 'i');
const DEAD_ANY = new RegExp(DEAD_URL, 'i');
const NOT = (tag) => `(?:(?!<${tag}\\b|</${tag}>)[\\s\\S])*?`;

const text = (html) => html.replace(/<[^>]+>/g, ' ').replace(/&[#\w]+;/g, ' ').replace(/\s+/g, ' ').trim();

function isCta(attrs, inner) {
  if (/class=["'][^"']*\b(button|source-link)\b/i.test(attrs)) return true;
  const t = inner.replace(/<[^>]+>/g, '').trim();
  return /(→|↗|&#8594;|&#8599;|&rarr;)\s*$/.test(t) || /^(Open|Inspect|View|See|Source)\b/i.test(t);
}

function pruneHtml(html) {
  let out = html;
  // 1. list rows that exist only to name the repository
  const li = new RegExp(`<li\\b[^>]*>${NOT('li')}</li>`, 'gi');
  out = out.replace(li, (row) => {
    if (!DEAD_HREF.test(row)) return row;
    const anchors = row.match(/<a\b[\s\S]*?<\/a>/gi) || [];
    const rest = text(anchors.reduce((acc, a) => acc.replace(a, ' '), row));
    const nameOnly = /<small>\s*GlacierEQ\//i.test(row) || rest.length <= 40;
    return nameOnly ? '' : row;
  });
  // 2. anchors: drop calls to action, unlink inline mentions
  out = out.replace(/<a\b([^>]*)>([\s\S]*?)<\/a>/gi, (a, attrs, inner) => {
    if (!DEAD_HREF.test(`${attrs} `)) return a;
    return isCta(attrs, inner) ? '' : inner;
  });
  // 3. tidy containers emptied by the removals
  let prev;
  do {
    prev = out;
    out = out.replace(/<p\b[^>]*>\s*<\/p>/gi, '');
    out = out.replace(/<div class=["'](?:actions|evidence-actions)["'][^>]*>\s*<\/div>/gi, '');
    out = out.replace(new RegExp(`<article\\b[^>]*class=["'][^"']*\\bcard\\b[^>]*>${NOT('article')}</article>`, 'gi'), (card) => {
      const body = card
        .replace(/^<article\b[^>]*>|<\/article>$/gi, '')
        .replace(/<p\b[^>]*class=["'][^"']*\beyebrow\b[^>]*>[\s\S]*?<\/p>/gi, '')
        .replace(/<h[1-6]\b[^>]*>[\s\S]*?<\/h[1-6]>/gi, '');
      return text(body) === '' && !/<(a|img|svg|ul|ol|table|code|pre)\b/i.test(body) ? '' : card;
    });
  } while (out !== prev);
  return out;
}

function pruneText(body) {
  return body.replace(new RegExp(`^(\\s*-?\\s*Source:\\s*)${DEAD_URL}\\s*$`, 'gim'), '$1private repository, available on request');
}

async function* walk(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) yield* walk(full);
    else yield full;
  }
}

const changed = [];
const remaining = [];
for await (const file of walk(SITE)) {
  const ext = path.extname(file);
  if (ext !== '.html' && ext !== '.txt') continue;
  const before = await readFile(file, 'utf8');
  const after = ext === '.html' ? pruneHtml(before) : pruneText(before);
  const rel = path.relative(ROOT, file);
  if (after !== before) {
    changed.push(rel);
    if (!CHECK) await writeFile(file, after, 'utf8');
  }
  const finalText = CHECK ? before : after;
  if (ext === '.html' ? DEAD_HREF.test(finalText) : DEAD_ANY.test(finalText)) remaining.push(rel);
}

if (CHECK && (changed.length || remaining.length)) {
  console.error(JSON.stringify({ status: 'FAIL', unpruned: changed, dead_links: remaining }, null, 2));
  process.exit(1);
}
if (remaining.length) {
  console.error(JSON.stringify({ status: 'FAIL', dead_links: remaining }, null, 2));
  process.exit(1);
}
console.log(JSON.stringify({ status: 'PASS', mode: CHECK ? 'check' : 'write', pruned_files: changed.length }));

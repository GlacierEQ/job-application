#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const SITE = path.join(ROOT, 'site-v15');
const PORTFOLIO_PATH = path.join(SITE, 'data', 'portfolio.json');
const OUTPUT_DIR = path.join(SITE, 'library');
const OUTPUT_HTML = path.join(OUTPUT_DIR, 'index.html');
const OUTPUT_JSON = path.join(SITE, 'data', 'capability-library.json');
const WITHHELD = 'PRIVATE_REPOSITORY_IDENTITY_WITHHELD';

function fail(message) {
  throw new Error(`Capability library render failed: ${message}`);
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function normalizeRepo(repo) {
  if (repo === WITHHELD) return null;
  if (typeof repo !== 'string' || !repo) return null;
  if (!repo.startsWith('https://github.com/GlacierEQ/')) return null;
  return repo;
}

function normalizedSystem(row) {
  if (!row || typeof row !== 'object') fail('flagship_row_invalid');
  const id = String(row.system_id ?? row.id ?? '').trim();
  const name = String(row.name ?? '').trim();
  if (!id || !name) fail('flagship_identity_missing');
  const repository = normalizeRepo(row.repo);
  const privateIdentityWithheld = row.repo === WITHHELD || row.identity_disclosure?.state === 'WITHHELD';
  if (privateIdentityWithheld && repository) fail(`private_identity_leaked:${id}`);
  return {
    id,
    name,
    rank: Number(row.rank) || 9999,
    level: String(row.level ?? 'UNRANKED'),
    state: String(row.state ?? 'UNKNOWN'),
    label: String(row.label ?? ''),
    summary: String(row.summary ?? ''),
    evidence: String(row.evidence ?? ''),
    limit: String(row.limit ?? ''),
    mechanisms: Array.isArray(row.mechanism) ? row.mechanism.map(String) : [],
    repository,
    repository_identity_withheld: privateIdentityWithheld,
    recovered_from: row.merged_from ? String(row.merged_from) : null,
  };
}

export function buildLibraryModel(portfolio) {
  if (!portfolio || typeof portfolio !== 'object' || !Array.isArray(portfolio.flagships)) {
    fail('portfolio_flagships_missing');
  }
  const systems = portfolio.flagships.map(normalizedSystem).sort((a, b) => a.rank - b.rank || a.name.localeCompare(b.name));
  const ids = systems.map((system) => system.id);
  if (new Set(ids).size !== ids.length) fail('duplicate_system_identity');
  const groups = new Map();
  for (const system of systems) {
    const key = system.level;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(system);
  }
  const publicRepositoryCount = systems.filter((system) => system.repository).length;
  const withheldCapabilityCount = systems.filter((system) => system.repository_identity_withheld).length;
  const recoveredCount = systems.filter((system) => system.recovered_from).length;
  return {
    schema: 'glaciereq.recruiter-capability-library.v1',
    generated_from: 'site-v15/data/portfolio.json',
    capability_count: systems.length,
    public_repository_count: publicRepositoryCount,
    withheld_capability_count: withheldCapabilityCount,
    recovered_capability_count: recoveredCount,
    systems,
    groups: [...groups.entries()].map(([level, members]) => ({ level, count: members.length, members })),
    boundary: 'This is the recruiter-safe capability library, not the complete GlacierEQ owner estate. Private repository identities remain withheld while their supported capability cards remain visible.',
  };
}

function card(system) {
  const repo = system.repository
    ? `<a class="library-repo" href="${escapeHtml(system.repository)}" target="_blank" rel="noopener">Inspect repository</a>`
    : `<span class="library-repo withheld">Repository identity withheld</span>`;
  const mechanisms = system.mechanisms.length
    ? `<ul>${system.mechanisms.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul>`
    : '';
  const recovered = system.recovered_from
    ? `<span class="library-chip recovered">Recovered capability</span>`
    : '';
  return `<article class="library-card" id="capability-${escapeHtml(system.id)}">
    <div class="library-card-head"><span class="library-rank">${escapeHtml(system.rank)}</span><div><p class="eyebrow">${escapeHtml(system.level)} · ${escapeHtml(system.state)}</p><h2>${escapeHtml(system.name)}</h2></div></div>
    <p class="library-summary">${escapeHtml(system.summary)}</p>
    <div class="library-chips"><span class="library-chip">${escapeHtml(system.label || 'Capability')}</span>${recovered}</div>
    ${mechanisms}
    <details><summary>Evidence and boundary</summary><p><strong>Evidence:</strong> ${escapeHtml(system.evidence)}</p><p><strong>Boundary:</strong> ${escapeHtml(system.limit)}</p></details>
    <div class="library-actions">${repo}<a href="/inventions/#${escapeHtml(system.id)}">View capability map</a></div>
  </article>`;
}

export function renderLibrary(model) {
  const sections = model.groups.map((group) => `<section class="library-level"><div class="library-level-title"><p class="eyebrow">${escapeHtml(group.level)}</p><h2>${group.count} capability${group.count === 1 ? '' : 'ies'}</h2></div><div class="library-grid">${group.members.map(card).join('')}</div></section>`).join('');
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
  <meta name="description" content="Recruiter-safe GlacierEQ capability library: restored systems, current proof, public repositories, and privacy-preserving capability cards.">
  <title>Capability Library · Casey Barton</title>
  <link rel="canonical" href="https://casey-barton-glaciereq.vercel.app/library/">
  <link rel="stylesheet" href="/assets/site.css">
  <link rel="stylesheet" href="/assets/site.systems.css">
  <link rel="stylesheet" href="/assets/site.complete.css">
  <link rel="stylesheet" href="/assets/site.interaction.css">
  <link rel="stylesheet" href="/assets/site.algerian.css">
  <link rel="stylesheet" href="/assets/site.repositories.css">
  <link rel="alternate" type="application/json" href="/data/capability-library.json" title="Machine-readable capability library">
</head>
<body>
<a class="skip" href="#main">Skip to content</a>
<header class="site-header"><div class="shell nav"><a class="brand" href="/"><span class="mark">CB</span><span><strong>CASEY BARTON</strong><small>CAPABILITY LIBRARY</small></span></a><nav class="links" aria-label="Library navigation"><a href="/">Home</a><a href="/inventions/">Inventions</a><a href="/visualizer/">Visualizer</a><a href="/atlas/">Company Atlas</a><a href="/resume/">Résumé</a></nav></div></header>
<main id="main">
<section class="library-hero"><div class="shell"><p class="eyebrow">RECOVERED DEPTH · CURRENT EVIDENCE</p><h1>The capability library is back.</h1><p class="lead">Browse the current recruiter-safe system inventory without collapsing the estate into a handful of flagship cards. Historical capability is preserved when useful, later gains stay intact, and private repository identities remain private.</p><div class="library-stats"><div><b>${model.capability_count}</b><span>capability cards</span></div><div><b>${model.public_repository_count}</b><span>public repository links</span></div><div><b>${model.recovered_capability_count}</b><span>explicitly recovered capabilities</span></div><div><b>${model.withheld_capability_count}</b><span>private identities withheld</span></div></div><p class="library-boundary">${escapeHtml(model.boundary)}</p></div></section>
<section class="section"><div class="shell">${sections}</div></section>
</main>
<footer><div class="shell"><p>GlacierEQ capability library · source-bound recruiter surface.</p></div></footer>
</body>
</html>`;
}

export function writeLibrary({ portfolioPath = PORTFOLIO_PATH, htmlPath = OUTPUT_HTML, jsonPath = OUTPUT_JSON } = {}) {
  const portfolio = JSON.parse(fs.readFileSync(portfolioPath, 'utf8'));
  const model = buildLibraryModel(portfolio);
  const html = renderLibrary(model);
  fs.mkdirSync(path.dirname(htmlPath), { recursive: true });
  fs.writeFileSync(htmlPath, html, 'utf8');
  fs.writeFileSync(jsonPath, `${JSON.stringify(model, null, 2)}\n`, 'utf8');
  return model;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const model = writeLibrary();
  console.log(JSON.stringify({ schema: model.schema, capability_count: model.capability_count, public_repository_count: model.public_repository_count, withheld_capability_count: model.withheld_capability_count, recovered_capability_count: model.recovered_capability_count }, null, 2));
}

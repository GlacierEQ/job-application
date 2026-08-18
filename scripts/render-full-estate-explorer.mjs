#!/usr/bin/env node

import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SITE = path.join(ROOT, 'site-v15');
const OWNER = 'GlacierEQ';
const API = `https://api.github.com/users/${OWNER}/repos`;
const PER_PAGE = 100;
const MAX_PAGES = 20;
const RETRYABLE = new Set([408, 409, 425, 429, 500, 502, 503, 504]);
const DONOR_SHA = '901fe77d2c6015feb1650133b751efff8aa0d24c';
const CONTRACTION_SHA = '61042c4018db90589715fe1c7f6a2c58879ac2b2';

const FAMILY_RULES = [
  ['job-career', 'Job Application & Career Intelligence', ['job-app', 'job_application', 'job-application', 'resume', 'recruiter', 'career', 'application']],
  ['company-engineering', 'Company-Specific Engineering', ['openai-', 'anthropic-', 'xai-', 'spacex-', 'palantir-', 'anduril-', 'lockheed-', 'waymo-', 'snowflake-', 'databricks-', 'cloudflare-', 'groq-', 'nasa-', 'nvidia-']],
  ['apex-control', 'APEX Control Planes & Automation', ['apex', 'omega', 'sovereign', 'control-plane', 'control_plane', 'command-center', 'high-council']],
  ['agents-orchestration', 'Agents, Swarms & Orchestration', ['agent', 'swarm', 'crew', 'autogen', 'mesh', 'orchestrat', 'coordinator', 'multi-agent', 'multiagent', 'botpress']],
  ['memory-context', 'Memory, Retrieval & Knowledge', ['memory', 'retriev', 'rag', 'vector', 'context', 'knowledge', 'graph', 'wisebase', 'echo']],
  ['documents-evidence', 'Documents, Files & Evidence', ['pdf', 'document', 'docum', 'evidence', 'ocr', 'file', 'receipt', 'transcod', 'artifact']],
  ['legal-intelligence', 'Legal Intelligence & Court Systems', ['legal', 'court', 'law', 'juris', 'citation', 'docket', 'case', 'recap', 'bankruptcy', 'reporter']],
  ['models-inference', 'Models, Inference & AI Runtime', ['llm', 'gpt', 'llama', 'ollama', 'deepseek', 'qwen', 'model', 'inference', 'embedding', 'transformer', 'hugging']],
  ['developer-tooling', 'Developer Tools, Code & MCP', ['codex', 'code', 'compiler', 'terminal', 'cli', 'sdk', 'api', 'mcp', 'developer', 'devtool', 'vscode', 'jupyter']],
  ['infrastructure', 'Infrastructure, Cloud & Reliability', ['cloud', 'aws', 'vercel', 'docker', 'kubernetes', 'gpu', 'rack', 'cooling', 'network', 'sre', 'server', 'infra', 'colossus']],
  ['media-vision-voice', 'Vision, Voice & Media', ['vision', 'photo', 'image', 'video', 'voice', 'audio', 'whisper', 'speech', 'media']],
];

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stable(value[key])]));
  }
  return value;
}

function stableJson(value) {
  return `${JSON.stringify(stable(value), null, 2)}\n`;
}

function sha256(text) {
  return createHash('sha256').update(text).digest('hex');
}

export function classifyRepository(repository) {
  const text = [repository.name, repository.description, repository.language, ...(repository.topics ?? [])]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
  for (const [id, label, terms] of FAMILY_RULES) {
    if (terms.some((term) => text.includes(term))) return { id, label };
  }
  return { id: 'research-experiments', label: 'Research, Experiments & General Systems' };
}

function normalizePortfolioRepository(value) {
  if (typeof value !== 'string' || !value || value === 'PRIVATE_REPOSITORY_IDENTITY_WITHHELD') return null;
  if (value.startsWith('https://github.com/')) {
    const parts = new URL(value).pathname.split('/').filter(Boolean);
    if (parts.length >= 2 && parts[0].toLowerCase() === OWNER.toLowerCase()) return `${parts[0]}/${parts[1]}`;
    return null;
  }
  if (value.startsWith(`${OWNER}/`)) return value.split('/').slice(0, 2).join('/');
  return null;
}

function extractPortfolioRepositories(portfolio) {
  const repositories = new Set();
  for (const row of Array.isArray(portfolio?.flagships) ? portfolio.flagships : []) {
    for (const candidate of [row.repo, row.repository, row.url]) {
      const normalized = normalizePortfolioRepository(candidate);
      if (normalized) repositories.add(normalized.toLowerCase());
    }
  }
  return repositories;
}

function normalizePublicRepository(repo, portfolioRepositories) {
  if (!repo || typeof repo !== 'object') throw new Error('public estate fetch returned a non-object repository row');
  const fullName = String(repo.full_name ?? '');
  if (!fullName.startsWith(`${OWNER}/`)) throw new Error(`foreign repository identity returned: ${fullName}`);
  if (repo.private === true || repo.visibility === 'private') return null;
  const family = classifyRepository(repo);
  return {
    repository: fullName,
    name: String(repo.name ?? fullName.slice(OWNER.length + 1)),
    url: String(repo.html_url ?? `https://github.com/${fullName}`),
    description: typeof repo.description === 'string' ? repo.description : '',
    language: typeof repo.language === 'string' ? repo.language : '',
    default_branch: typeof repo.default_branch === 'string' ? repo.default_branch : '',
    archived: repo.archived === true,
    fork: repo.fork === true,
    size_kb: Number.isFinite(Number(repo.size)) ? Number(repo.size) : 0,
    pushed_at: typeof repo.pushed_at === 'string' ? repo.pushed_at : '',
    updated_at: typeof repo.updated_at === 'string' ? repo.updated_at : '',
    family_id: family.id,
    family: family.label,
    current_portfolio: portfolioRepositories.has(fullName.toLowerCase()),
  };
}

export function compilePublicEstate(rawRepositories, portfolio = {}) {
  if (!Array.isArray(rawRepositories)) throw new TypeError('rawRepositories must be an array');
  const portfolioRepositories = extractPortfolioRepositories(portfolio);
  const records = [];
  const seen = new Set();
  for (const raw of rawRepositories) {
    const record = normalizePublicRepository(raw, portfolioRepositories);
    if (!record) continue;
    const key = record.repository.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    records.push(record);
  }
  records.sort((left, right) => {
    if (left.current_portfolio !== right.current_portfolio) return left.current_portfolio ? -1 : 1;
    if (left.archived !== right.archived) return left.archived ? 1 : -1;
    if (left.fork !== right.fork) return left.fork ? 1 : -1;
    return left.repository.localeCompare(right.repository);
  });
  const families = new Map();
  for (const record of records) {
    const family = families.get(record.family_id) ?? { id: record.family_id, label: record.family, count: 0, portfolio_count: 0, archived_count: 0, fork_count: 0 };
    family.count += 1;
    if (record.current_portfolio) family.portfolio_count += 1;
    if (record.archived) family.archived_count += 1;
    if (record.fork) family.fork_count += 1;
    families.set(record.family_id, family);
  }
  return {
    records,
    families: [...families.values()].sort((a, b) => b.portfolio_count - a.portfolio_count || b.count - a.count || a.label.localeCompare(b.label)),
  };
}

async function fetchPage(page, fetchImpl = globalThis.fetch) {
  const url = new URL(API);
  url.searchParams.set('type', 'owner');
  url.searchParams.set('sort', 'full_name');
  url.searchParams.set('direction', 'asc');
  url.searchParams.set('per_page', String(PER_PAGE));
  url.searchParams.set('page', String(page));
  const headers = {
    Accept: 'application/vnd.github+json',
    'User-Agent': 'GlacierEQ-job-application-estate-explorer',
    'X-GitHub-Api-Version': '2022-11-28',
  };
  if (process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  let lastError;
  for (let attempt = 1; attempt <= 4; attempt += 1) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 20_000);
    try {
      const response = await fetchImpl(url, { headers, signal: controller.signal });
      if (response.ok) {
        const payload = await response.json();
        if (!Array.isArray(payload)) throw new Error(`GitHub repository page ${page} was not an array`);
        return payload;
      }
      const retryable = RETRYABLE.has(response.status) || response.status === 403;
      lastError = new Error(`GitHub public repository page ${page} returned ${response.status}`);
      if (!retryable || attempt === 4) break;
      const wait = Math.min(8_000, 600 * 2 ** (attempt - 1));
      await sleep(wait);
    } catch (error) {
      lastError = error;
      if (attempt === 4) break;
      await sleep(Math.min(8_000, 600 * 2 ** (attempt - 1)));
    } finally {
      clearTimeout(timer);
    }
  }
  throw lastError ?? new Error(`GitHub public repository page ${page} failed`);
}

export async function fetchPublicRepositories(fetchImpl = globalThis.fetch) {
  const repositories = [];
  for (let page = 1; page <= MAX_PAGES; page += 1) {
    const rows = await fetchPage(page, fetchImpl);
    repositories.push(...rows);
    if (rows.length < PER_PAGE) return repositories;
  }
  throw new Error(`public repository pagination exceeded ${MAX_PAGES} pages`);
}

function card(record) {
  const tags = [
    record.current_portfolio ? '<span class="estate-tag portfolio">current portfolio</span>' : '',
    record.archived ? '<span class="estate-tag archive">archived · preserved</span>' : '<span class="estate-tag active">active</span>',
    record.fork ? '<span class="estate-tag fork">fork / upstream lineage</span>' : '<span class="estate-tag">native owner repo</span>',
  ].filter(Boolean).join('');
  const description = record.description || 'Public repository identity retained in the estate explorer; inspect source before inferring capability.';
  return `<article class="estate-repo"><h3><a href="${escapeHtml(record.url)}" target="_blank" rel="noopener">${escapeHtml(record.name)}</a></h3><p>${escapeHtml(description)}</p><div class="estate-tags">${tags}</div><div class="estate-meta"><span>${escapeHtml(record.language || 'language n/a')}</span><span>${escapeHtml(record.default_branch || 'branch n/a')}</span><span>${record.size_kb.toLocaleString('en-US')} KB</span></div></article>`;
}

function renderPage(payload) {
  const scope = payload.scope;
  const familyIndex = payload.families.map((family) => `<a href="#family-${escapeHtml(family.id)}"><span>${escapeHtml(family.label)}</span><b>${family.count}</b></a>`).join('');
  const familySections = payload.families.map((family, index) => {
    const records = payload.records.filter((record) => record.family_id === family.id);
    return `<details class="estate-family" id="family-${escapeHtml(family.id)}"${index < 3 ? ' open' : ''}><summary><h2>${escapeHtml(family.label)}</h2><span>${family.count} public repos · ${family.portfolio_count} current portfolio · ${family.archived_count} archived · ${family.fork_count} forks</span></summary><div class="estate-family-grid">${records.map(card).join('')}</div></details>`;
  }).join('');
  const discovered = payload.public_discovered_count.toLocaleString('en-US');
  const total = scope.estate.repository_count.toLocaleString('en-US');
  const privateCount = scope.estate.private_repository_count.toLocaleString('en-US');
  const outside = scope.job_rollout_projection.outside_projection_repository_count.toLocaleString('en-US');
  const coverage = (scope.job_rollout_projection.estate_coverage_ratio * 100).toFixed(1);
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
  <meta name="theme-color" content="#03070a">
  <meta name="description" content="Full GlacierEQ estate explorer: public repository identities organized by capability family, with private capability preserved as aggregate scope rather than erased.">
  <meta name="robots" content="index,follow,max-image-preview:large">
  <link rel="canonical" href="https://casey-barton-glaciereq.vercel.app/estate/">
  <title>GlacierEQ Estate Explorer · Casey Barton</title>
  <link rel="icon" href="/assets/favicon.svg" type="image/svg+xml">
  <link rel="stylesheet" href="/assets/site.css">
  <link rel="stylesheet" href="/assets/site.complete.css">
  <link rel="stylesheet" href="/assets/site.estate.css">
</head>
<body>
<a class="skip" href="#main">Skip to content</a>
<header class="site-header"><div class="shell nav"><a class="brand" href="/" aria-label="Casey Barton portfolio home"><span class="mark">CB</span><span><strong>CASEY BARTON</strong><small>FORWARD-DEPLOYED AI ARCHITECT</small></span></a><nav class="links" aria-label="Primary navigation"><a href="/#proof">Proof</a><a href="/#systems">Systems</a><a href="/visualizer/">Visualizer</a><a href="/inventions/">Inventions</a><a href="/estate/" aria-current="page">Estate</a><a href="/atlas/">Company Atlas</a><a href="/resume/">Résumé</a><a href="/master/">Technical</a></nav><a class="nav-cta" href="mailto:glacier.equilibrium@gmail.com">Start a conversation</a></div></header>
<main id="main">
<section class="estate-hero"><div class="shell"><p class="estate-kicker">RECOVERED ESTATE DEPTH · FULL DISCOVERY BEFORE CURATION</p><h1>The library is the substrate. The recruiter view is only a projection.</h1><p class="lead">This surface restores the V13 repository-gallery idea on the current architecture without resurrecting the obsolete site. Every public GlacierEQ repository discovered from GitHub remains visible here, including archived and fork lineage. Private identities stay private, but private capability is not treated as nonexistent.</p><div class="estate-metrics"><div class="estate-metric"><b>${total}</b><span>owner-estate repositories in the bound Helix census snapshot</span></div><div class="estate-metric"><b>${discovered}</b><span>public repository identities discovered for this build</span></div><div class="estate-metric"><b>${privateCount}</b><span>private repositories preserved as aggregate scope, identities withheld</span></div><div class="estate-metric"><b>${outside}</b><span>repositories outside the 67-repo job rollout projection</span></div></div><div class="estate-boundary"><article><strong>67 repositories is ${coverage}% of the observed estate.</strong><p>Rollout membership is routing, not existence. Systems outside that projection remain recoverable capability, evidence, lineage, and composition candidates.</p></article><article><strong>No originality theater.</strong><p>Inventory proves presence and lineage only. Forks are labeled. Archived work stays visible. Capability claims still require repository-level inspection and proof.</p></article></div></div></section>
<section class="section"><div class="shell"><div class="section-head"><div><p class="eyebrow">CAPABILITY FAMILIES</p><h2>${payload.families.length} organized families · ${discovered} public identities · zero curation deletion.</h2></div><p>Classification is a discovery aid, not an authority gate. A repository can be reclassified without being removed from the estate.</p></div><div class="estate-index">${familyIndex}</div>${familySections}<div class="estate-note"><strong>Restoration lineage.</strong> The historical V13 repository gallery and portfolio graph lived at donor <code>${DONOR_SHA}</code>. Commit <code>${CONTRACTION_SHA}</code> removed that site tree. This implementation restores the mechanism on the current V21–V26 surface while retaining later runtime, proof, Atlas, Starmap, invention-map, visualizer, and privacy gains.</div><p class="estate-source">Public list source: GitHub owner repository API for ${OWNER}, build fetch ${escapeHtml(payload.fetched_at)} · portal source ${escapeHtml(payload.portal_source)} · scope authority ${escapeHtml(scope.source.repository)}@${escapeHtml(scope.source.commit)}:${escapeHtml(scope.source.path)} · public-estate receipt sha256:${escapeHtml(payload.receipt_sha256)}</p></div></section>
</main>
<footer class="site-footer"><div class="shell footer-grid"><div><strong>CASEY BARTON · GLACIEREQ</strong><p>Honolulu, Hawaiʻi · systems architecture · agent infrastructure · evidence-bound engineering</p></div><div><a href="/">Home</a> · <a href="/inventions/">Inventions</a> · <a href="/atlas/">Company Atlas</a> · <a href="/master/">Technical</a></div></div></footer>
</body>
</html>\n`;
}

async function main() {
  const [scope, portfolio, rawRepositories] = await Promise.all([
    readFile(path.join(SITE, 'data', 'estate-scope.json'), 'utf8').then(JSON.parse),
    readFile(path.join(SITE, 'data', 'portfolio.json'), 'utf8').then(JSON.parse),
    fetchPublicRepositories(),
  ]);
  if (scope?.owner !== OWNER || scope?.job_rollout_projection?.is_full_estate_inventory !== false) {
    throw new Error('estate scope contract is not bound to the full-estate / rollout-projection distinction');
  }
  const compiled = compilePublicEstate(rawRepositories, portfolio);
  if (compiled.records.length < 100) throw new Error(`public estate discovery suspiciously small: ${compiled.records.length}`);
  const payload = {
    schema: 'glaciereq.public-estate-explorer.v1',
    owner: OWNER,
    fetched_at: new Date().toISOString(),
    portal_source: process.env.VERCEL_GIT_COMMIT_SHA || process.env.GITHUB_SHA || 'SOURCE_WORKTREE',
    public_discovered_count: compiled.records.length,
    archived_public_discovered_count: compiled.records.filter((row) => row.archived).length,
    fork_public_discovered_count: compiled.records.filter((row) => row.fork).length,
    current_portfolio_public_count: compiled.records.filter((row) => row.current_portfolio).length,
    restoration_lineage: {
      donor_commit: DONOR_SHA,
      contraction_commit: CONTRACTION_SHA,
      recovered_mechanisms: ['repository_gallery', 'capability_family_index', 'full_estate_depth'],
      preserved_later_gains: ['helix_projection', 'company_atlas', 'starmap', 'invention_evidence_map', 'visualizer', 'private_identity_redaction'],
    },
    scope,
    families: compiled.families,
    records: compiled.records,
  };
  const unsigned = stableJson(payload);
  payload.receipt_sha256 = sha256(unsigned);
  const json = stableJson(payload);
  const html = renderPage(payload);
  await mkdir(path.join(SITE, 'estate'), { recursive: true });
  await writeFile(path.join(SITE, 'data', 'public-estate.json'), json, 'utf8');
  await writeFile(path.join(SITE, 'estate', 'index.html'), html, 'utf8');
  console.log(JSON.stringify({
    status: 'PASS',
    schema: payload.schema,
    public_repositories: payload.public_discovered_count,
    families: payload.families.length,
    archived: payload.archived_public_discovered_count,
    forks: payload.fork_public_discovered_count,
    current_portfolio_public: payload.current_portfolio_public_count,
    estate_total_snapshot: scope.estate.repository_count,
    rollout_projection: scope.job_rollout_projection.repository_count,
    receipt_sha256: payload.receipt_sha256,
  }, null, 2));
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.stack : error);
    process.exitCode = 1;
  });
}

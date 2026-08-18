const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { URL } = require('node:url');

const RELEASE = 'V31-FULL-ESTATE-LIVE-BRIDGE';
const SOURCE_COMMIT = '8e31e61bcaf96640fac5743061dab9840e6b5920';
const OWNER = 'GlacierEQ';
const RAW_SITE_ROOT = `https://raw.githubusercontent.com/${OWNER}/job-application/${SOURCE_COMMIT}/site-v15/`;
const RAW_RUNTIME_ROOT = `https://raw.githubusercontent.com/${OWNER}/job-application/${SOURCE_COMMIT}/deployment/vercel-source-bridge/api/`;
const GITHUB_REPOS = `https://api.github.com/users/${OWNER}/repos`;
const RUNTIME_DIR = path.join('/tmp', `glaciereq-v31-${SOURCE_COMMIT}`);
const RUNTIME_MODULES = [
  'compiler-proxy.js',
  'design-proxy.js',
  'estate-proxy.js',
  'inventions-proxy.js',
  'monument-title-proxy.js',
  'proxy.js',
  'release-router.js',
  'starmap-proxy.js',
  'systems-atlas-proxy.js',
  'title-font-proxy.js',
  'truth-proxy.js',
  'truth-runtime.js',
  'typography-proxy.js',
];
const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.pdf': 'application/pdf',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.proto': 'text/plain; charset=utf-8',
};
const RETRYABLE = new Set([408, 409, 425, 429, 500, 502, 503, 504]);
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

let runtimePromise = null;
let estateCache = null;
let estateCacheAt = 0;
const staticCache = new Map();

function sleep(ms) { return new Promise((resolve) => setTimeout(resolve, ms)); }
function esc(value) {
  return String(value ?? '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#39;');
}
function sha256(value) { return crypto.createHash('sha256').update(value).digest('hex'); }
function normalize(input) {
  const raw = Array.isArray(input) ? input.join('/') : String(input || '');
  const clean = raw.replace(/^\/+|\/+$/g, '');
  if (!clean) return 'index.html';
  if (clean.includes('..') || clean.includes('\\')) return null;
  const last = clean.split('/').pop() || '';
  return last.includes('.') ? clean : `${clean}/index.html`;
}
function requestPath(req) {
  const parsed = new URL(String(req?.url || '/'), 'https://glaciereq.invalid');
  const explicit = parsed.searchParams.getAll('path');
  return explicit.length ? explicit.join('/') : parsed.pathname;
}
function securityHeaders(res) {
  res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'none'; style-src 'self'; img-src 'self' data:; connect-src 'none'; font-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'; form-action 'self' mailto:; upgrade-insecure-requests");
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=()');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  res.setHeader('X-GlacierEQ-Source-Commit', SOURCE_COMMIT);
  res.setHeader('X-PSYSOCX-Release', RELEASE);
}
async function fetchWithRetry(url, { accept = '*/*', timeout = 12000 } = {}) {
  let last;
  for (let attempt = 1; attempt <= 4; attempt += 1) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);
    try {
      const response = await fetch(url, {
        headers: { Accept: accept, 'User-Agent': 'GlacierEQ-V31-live-bridge' },
        signal: controller.signal,
      });
      if (response.ok || response.status === 404) return response;
      last = new Error(`${url} returned ${response.status}`);
      if (!RETRYABLE.has(response.status) && response.status !== 403) break;
    } catch (error) {
      last = error;
    } finally {
      clearTimeout(timer);
    }
    if (attempt < 4) await sleep(Math.min(5000, 400 * 2 ** (attempt - 1)));
  }
  throw last || new Error(`${url} failed`);
}
async function fetchExactStatic(filePath) {
  if (staticCache.has(filePath)) return staticCache.get(filePath);
  const extension = path.extname(filePath).toLowerCase();
  if (!TYPES[extension]) return null;
  const response = await fetchWithRetry(`${RAW_SITE_ROOT}${filePath}`);
  if (response.status === 404) return null;
  const body = Buffer.from(await response.arrayBuffer());
  const record = { body, contentType: TYPES[extension], etag: sha256(body) };
  if (body.length <= 512 * 1024) staticCache.set(filePath, record);
  return record;
}
function classify(repo) {
  const text = [repo.name, repo.description, repo.language, ...(repo.topics || [])].filter(Boolean).join(' ').toLowerCase();
  for (const [id, label, terms] of FAMILY_RULES) if (terms.some((term) => text.includes(term))) return { id, label };
  return { id: 'research-experiments', label: 'Research, Experiments & General Systems' };
}
async function fetchPublicEstate() {
  if (estateCache && Date.now() - estateCacheAt < 10 * 60 * 1000) return estateCache;
  const records = [];
  for (let page = 1; page <= 20; page += 1) {
    const url = new URL(GITHUB_REPOS);
    url.searchParams.set('type', 'owner');
    url.searchParams.set('sort', 'full_name');
    url.searchParams.set('direction', 'asc');
    url.searchParams.set('per_page', '100');
    url.searchParams.set('page', String(page));
    const response = await fetchWithRetry(url, { accept: 'application/vnd.github+json' });
    const rows = await response.json();
    if (!Array.isArray(rows)) throw new Error('GitHub owner repository page was not an array');
    for (const repo of rows) {
      if (!repo || repo.private === true || repo.visibility === 'private' || !String(repo.full_name || '').startsWith(`${OWNER}/`)) continue;
      const family = classify(repo);
      records.push({
        repository: repo.full_name,
        name: repo.name,
        url: repo.html_url,
        description: repo.description || '',
        language: repo.language || '',
        default_branch: repo.default_branch || '',
        archived: repo.archived === true,
        fork: repo.fork === true,
        pushed_at: repo.pushed_at || '',
        family_id: family.id,
        family: family.label,
      });
    }
    if (rows.length < 100) break;
  }
  const unique = [...new Map(records.map((row) => [row.repository.toLowerCase(), row])).values()];
  if (unique.length < 100) throw new Error(`public estate discovery suspiciously small: ${unique.length}`);
  unique.sort((a, b) => Number(a.archived) - Number(b.archived) || Number(a.fork) - Number(b.fork) || a.repository.localeCompare(b.repository));
  const families = new Map();
  for (const row of unique) {
    const family = families.get(row.family_id) || { id: row.family_id, label: row.family, count: 0, archived_count: 0, fork_count: 0 };
    family.count += 1;
    if (row.archived) family.archived_count += 1;
    if (row.fork) family.fork_count += 1;
    families.set(row.family_id, family);
  }
  const payload = {
    schema: 'glaciereq.public-estate-explorer.v1',
    owner: OWNER,
    fetched_at: new Date().toISOString(),
    portal_source: SOURCE_COMMIT,
    public_discovered_count: unique.length,
    archived_public_discovered_count: unique.filter((row) => row.archived).length,
    fork_public_discovered_count: unique.filter((row) => row.fork).length,
    scope: {
      estate: { repository_count: 1183, public_repository_count: 672, private_repository_count: 511, archived_repository_count: 68, archived_public_repository_count: 40, archived_private_repository_count: 28 },
      job_rollout_projection: { repository_count: 67, workspace_child_count: 66, outside_projection_repository_count: 1116, estate_coverage_ratio: 0.0566356720202874, is_full_estate_inventory: false },
      invariants: { full_estate_discovery_precedes_rollout_admission: true, all_owned_repositories_are_relevance_analysis_candidates: true, private_visibility_is_metadata_not_exclusion: true, archived_state_is_metadata_not_exclusion: true, fork_state_is_metadata_not_exclusion: true, rollout_membership_is_not_evidence_admissibility: true, private_repository_names_must_not_be_emitted_to_public_artifacts: true },
    },
    restoration_lineage: { donor_commit: '901fe77d2c6015feb1650133b751efff8aa0d24c', contraction_commit: '61042c4018db90589715fe1c7f6a2c58879ac2b2' },
    families: [...families.values()].sort((a, b) => b.count - a.count || a.label.localeCompare(b.label)),
    records: unique,
  };
  payload.receipt_sha256 = sha256(Buffer.from(JSON.stringify(payload)));
  estateCache = payload;
  estateCacheAt = Date.now();
  return payload;
}
function estateHtml(payload) {
  const familyIndex = payload.families.map((family) => `<a href="#family-${esc(family.id)}"><span>${esc(family.label)}</span><b>${family.count}</b></a>`).join('');
  const sections = payload.families.map((family, index) => {
    const rows = payload.records.filter((row) => row.family_id === family.id);
    const cards = rows.map((row) => `<article class="estate-repo"><h3><a href="${esc(row.url)}" target="_blank" rel="noopener">${esc(row.name)}</a></h3><p>${esc(row.description || 'Public repository identity retained for estate discovery; inspect source before inferring capability.')}</p><div class="estate-tags"><span class="estate-tag ${row.archived ? 'archive' : 'active'}">${row.archived ? 'archived · preserved' : 'active'}</span>${row.fork ? '<span class="estate-tag fork">fork / upstream lineage</span>' : '<span class="estate-tag">native owner repo</span>'}</div><div class="estate-meta"><span>${esc(row.language || 'language n/a')}</span><span>${esc(row.default_branch || 'branch n/a')}</span></div></article>`).join('');
    return `<details class="estate-family" id="family-${esc(family.id)}"${index < 3 ? ' open' : ''}><summary><h2>${esc(family.label)}</h2><span>${family.count} public repos · ${family.archived_count} archived · ${family.fork_count} forks</span></summary><div class="estate-family-grid">${cards}</div></details>`;
  }).join('');
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><meta name="theme-color" content="#03070a"><meta name="description" content="Full GlacierEQ estate explorer: public repository identities organized by capability family, with private capability preserved as aggregate scope rather than erased."><meta name="robots" content="index,follow,max-image-preview:large"><link rel="canonical" href="https://casey-barton-glaciereq.vercel.app/estate/"><title>GlacierEQ Estate Explorer · Casey Barton</title><link rel="icon" href="/assets/favicon.svg" type="image/svg+xml"><link rel="stylesheet" href="/assets/site.css"><link rel="stylesheet" href="/assets/site.systems.css"><link rel="stylesheet" href="/assets/site.complete.css"><link rel="stylesheet" href="/assets/site.estate.css"></head><body><a class="skip" href="#main">Skip to content</a><header class="site-header"><div class="shell nav"><a class="brand" href="/"><span class="mark">CB</span><span><strong>CASEY BARTON</strong><small>FORWARD-DEPLOYED AI ARCHITECT</small></span></a><nav class="links" aria-label="Primary navigation"><a href="/#proof">Proof</a><a href="/#systems">Systems</a><a href="/visualizer/">Visualizer</a><a href="/inventions/">Inventions</a><a href="/estate/" aria-current="page">Estate</a><a href="/atlas/">Company Atlas</a><a href="/resume/">Résumé</a><a href="/master/">Technical</a></nav><a class="nav-cta" href="mailto:glacier.equilibrium@gmail.com">Start a conversation</a></div></header><main id="main"><section class="estate-hero"><div class="shell"><p class="estate-kicker">RECOVERED ESTATE DEPTH · FULL DISCOVERY BEFORE CURATION</p><h1>The library is the substrate. The recruiter view is only a projection.</h1><p class="lead">Every public GlacierEQ repository discovered from GitHub remains visible here, including archived and fork lineage. Private identities stay private, but private capability is not treated as nonexistent.</p><div class="estate-metrics"><div class="estate-metric"><b>1,183</b><span>owner-estate repositories in the bound Helix census</span></div><div class="estate-metric"><b>${payload.public_discovered_count.toLocaleString('en-US')}</b><span>public identities discovered live</span></div><div class="estate-metric"><b>511</b><span>private repositories preserved as aggregate scope</span></div><div class="estate-metric"><b>1,116</b><span>outside the 67-repo rollout projection</span></div></div><div class="estate-boundary"><article><strong>67 repositories is 5.7% of the bound estate.</strong><p>Rollout membership is routing, not existence. Systems outside that projection remain recovery, evidence, lineage, and composition candidates.</p></article><article><strong>Inventory is not authorship theater.</strong><p>Forks are labeled. Archived work stays visible. Capability claims still require repository-level inspection and proof.</p></article></div></div></section><section class="section"><div class="shell"><div class="section-head"><div><p class="eyebrow">CAPABILITY FAMILIES</p><h2>${payload.families.length} organized families · ${payload.public_discovered_count} public identities · zero curation deletion.</h2></div><p>Classification is a discovery aid, not an authority gate.</p></div><div class="estate-index">${familyIndex}</div>${sections}<div class="estate-note"><strong>Restoration lineage.</strong> V13 carried a repository gallery and portfolio graph at donor <code>901fe77d2c6015feb1650133b751efff8aa0d24c</code>. Commit <code>61042c4018db90589715fe1c7f6a2c58879ac2b2</code> removed that tree. This restores the mechanism on the current architecture while preserving later runtime, Atlas, Starmap, invention-map, visualizer, and privacy gains.</div><p class="estate-source">Source commit ${SOURCE_COMMIT} · public inventory fetched ${esc(payload.fetched_at)} · receipt sha256:${esc(payload.receipt_sha256)}</p></div></section></main></body></html>`;
}
async function ensureRuntime() {
  if (runtimePromise) return runtimePromise;
  runtimePromise = (async () => {
    const apiDir = path.join(RUNTIME_DIR, 'api');
    fs.mkdirSync(apiDir, { recursive: true });
    for (const name of RUNTIME_MODULES) {
      const target = path.join(apiDir, name);
      if (fs.existsSync(target) && fs.statSync(target).size > 0) continue;
      const response = await fetchWithRetry(`${RAW_RUNTIME_ROOT}${name}`, { accept: 'text/javascript' });
      if (!response.ok) throw new Error(`runtime module ${name} unavailable: ${response.status}`);
      const source = await response.text();
      if (!source.length) throw new Error(`runtime module ${name} was empty`);
      fs.writeFileSync(target, source, 'utf8');
    }
    const releaseRouter = path.join(apiDir, 'release-router.js');
    delete require.cache[require.resolve(releaseRouter)];
    const handler = require(releaseRouter);
    if (typeof handler !== 'function') throw new Error('current release router is not executable');
    return handler;
  })().catch((error) => {
    runtimePromise = null;
    throw error;
  });
  return runtimePromise;
}
function serveBuffer(res, body, contentType, cacheControl = 'public, max-age=0, must-revalidate') {
  securityHeaders(res);
  res.statusCode = 200;
  res.setHeader('Content-Type', contentType);
  res.setHeader('Cache-Control', cacheControl);
  res.setHeader('ETag', `"sha256-${sha256(body)}"`);
  res.setHeader('Content-Length', String(body.length));
  res.end(body);
}
async function verifyBridge() {
  const [estate, home, runtime] = await Promise.all([fetchPublicEstate(), fetchExactStatic('index.html'), ensureRuntime()]);
  const errors = [];
  if (!home?.body.toString('utf8').includes('href="/estate/"')) errors.push('current_home_estate_navigation');
  if (estate.public_discovered_count < 100) errors.push('public_estate_count');
  if (estate.records.some((row) => !String(row.url).startsWith(`https://github.com/${OWNER}/`))) errors.push('public_identity_boundary');
  if (estate.scope.job_rollout_projection.is_full_estate_inventory !== false) errors.push('projection_boundary');
  if (typeof runtime !== 'function') errors.push('runtime_loader');
  return {
    schema: 'glaciereq.v31-live-bridge-verification.v1',
    status: errors.length ? 'FAIL' : 'PASS',
    release: RELEASE,
    source_commit: SOURCE_COMMIT,
    public_repositories: estate.public_discovered_count,
    estate_total_snapshot: 1183,
    private_repositories_withheld: 511,
    rollout_projection: 67,
    outside_rollout_projection: 1116,
    capability_families: estate.families.length,
    archived_public_preserved: estate.archived_public_discovered_count,
    forks_preserved: estate.fork_public_discovered_count,
    current_home_estate_navigation: !errors.includes('current_home_estate_navigation'),
    current_release_router_loaded: typeof runtime === 'function',
    errors,
  };
}

module.exports = async function v31LiveBridge(req, res) {
  const raw = requestPath(req).replace(/^\/+|\/+$/g, '');
  try {
    if (raw === '__v31_verify') {
      const payload = await verifyBridge();
      const body = Buffer.from(`${JSON.stringify(payload, null, 2)}\n`);
      securityHeaders(res);
      res.statusCode = payload.status === 'PASS' ? 200 : 503;
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.setHeader('Cache-Control', 'no-store');
      res.setHeader('Content-Length', String(body.length));
      res.end(body);
      return;
    }
    const filePath = normalize(raw);
    if (!filePath) {
      res.statusCode = 400;
      res.end('Bad Request');
      return;
    }
    if (filePath === 'estate/index.html') {
      const payload = await fetchPublicEstate();
      serveBuffer(res, Buffer.from(estateHtml(payload)), 'text/html; charset=utf-8');
      return;
    }
    if (filePath === 'data/public-estate.json') {
      const payload = await fetchPublicEstate();
      serveBuffer(res, Buffer.from(`${JSON.stringify(payload, null, 2)}\n`), 'application/json; charset=utf-8', 'public, max-age=300, s-maxage=600');
      return;
    }
    const staticFile = await fetchExactStatic(filePath);
    if (staticFile) {
      serveBuffer(res, staticFile.body, staticFile.contentType, filePath.endsWith('.css') ? 'public, max-age=3600, s-maxage=86400' : undefined);
      return;
    }
    const runtime = await ensureRuntime();
    await runtime(req, res);
  } catch (error) {
    console.error('V31 live bridge failure', error);
    const body = Buffer.from('Current recruiter surface temporarily unavailable.');
    securityHeaders(res);
    res.statusCode = 503;
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('Content-Length', String(body.length));
    res.end(body);
  }
};

module.exports.constants = { RELEASE, SOURCE_COMMIT, RUNTIME_MODULES };
module.exports.fetchPublicEstate = fetchPublicEstate;
module.exports.normalize = normalize;
module.exports.verifyBridge = verifyBridge;

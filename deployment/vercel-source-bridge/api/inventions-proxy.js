const crypto = require('node:crypto');
const { URL } = require('node:url');

const PORTFOLIO_COMMIT = 'e870a5153bb38d533540e44c888759a8cd3b7169';
const DONOR_COMMIT = '901fe77d2c6015feb1650133b751efff8aa0d24c';
const CONTRACTION_COMMIT = '61042c4018db90589715fe1c7f6a2c58879ac2b2';
const RELEASE = 'V28-INVENTION-EVIDENCE-RUNTIME';
const VERIFY_SCHEMA = 'glaciereq.v28-invention-evidence-runtime-verification.v1';
const MAP_SCHEMA = 'glaciereq.invention-evidence-map.v2';
const PORTFOLIO_URL = `https://raw.githubusercontent.com/GlacierEQ/job-application/${PORTFOLIO_COMMIT}/site-v15/data/portfolio.json`;
const CSS_URL = `https://raw.githubusercontent.com/GlacierEQ/job-application/${PORTFOLIO_COMMIT}/site-v15/assets/site.inventions.css`;
const FETCH_TIMEOUT_MS = 12_000;
const MAX_BYTES = 1024 * 1024;

const LENSES = Object.freeze([
  Object.freeze({ id: 'application-intelligence', title: 'Application intelligence', question: 'How do scattered role, repository, proof, and follow-up state become one usable hiring system?', systemIds: ['helix', 'job-application', 'receipt-router'] }),
  Object.freeze({ id: 'agent-assurance', title: 'Dependable agent operations', question: 'How can capable agents act without collapsing authority, replay safety, recovery, and evidence?', systemIds: ['akos', 'sigma-glue', 'doctor-strange'] }),
  Object.freeze({ id: 'evidence-verification', title: 'Evidence and verification', question: 'How do technical claims stay inspectable without confusing source presence with reproduced proof?', systemIds: ['receipt-router', 'doctor-strange', 'job-application'] }),
  Object.freeze({ id: 'architecture-federation', title: 'Architecture and federation', question: 'How do independent systems compose without erasing ownership, boundaries, or failure semantics?', systemIds: ['tower-of-babel', 'pro-code-runtime', 'sigma-glue'] }),
  Object.freeze({ id: 'human-machine', title: 'Human and machine review surfaces', question: 'How can recruiters, engineers, and machines inspect different depths of one factual system without truth drift?', systemIds: ['job-application', 'helix', 'akos'] }),
]);

let portfolioPromise = null;
let cssPromise = null;

function stableStringify(value) {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function esc(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function requireValue(condition, message) {
  if (!condition) throw new Error(message);
}

async function fetchBounded(url, label) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      headers: { 'user-agent': `GlacierEQ-${RELEASE}/1.0` },
      signal: controller.signal,
      redirect: 'error',
    });
    requireValue(response.ok, `${label}_http_${response.status}`);
    const declared = Number(response.headers.get('content-length') || 0);
    requireValue(!declared || declared <= MAX_BYTES, `${label}_declared_too_large`);
    const body = Buffer.from(await response.arrayBuffer());
    requireValue(body.length > 0 && body.length <= MAX_BYTES, `${label}_body_size`);
    return body;
  } catch (error) {
    if (error?.name === 'AbortError') throw new Error(`${label}_fetch_timeout`);
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

function normalizeSystem(system) {
  requireValue(system && typeof system === 'object', 'flagship_invalid');
  for (const field of ['id', 'name', 'repo', 'state', 'summary', 'evidence', 'limit', 'level']) {
    requireValue(typeof system[field] === 'string' && system[field], `flagship_${field}_missing`);
  }
  requireValue(system.repo.startsWith('https://github.com/GlacierEQ/'), 'flagship_repo_not_public_glaciereq');
  return {
    id: system.id,
    rank: system.rank,
    name: system.name,
    repo: system.repo,
    state: system.state,
    summary: system.summary,
    mechanism: Array.isArray(system.mechanism) ? system.mechanism.filter((item) => typeof item === 'string' && item) : [],
    evidence: system.evidence,
    limit: system.limit,
    level: system.level,
  };
}

function buildMap(portfolio) {
  requireValue(portfolio?.schema === 'glaciereq.hiring-portfolio.v1', 'portfolio_schema_mismatch');
  requireValue(Array.isArray(portfolio.flagships), 'portfolio_flagships_missing');
  requireValue(Array.isArray(portfolio?.person?.roles) && portfolio.person.roles.length > 0, 'portfolio_roles_missing');
  requireValue(typeof portfolio?.release?.evidence_policy === 'string' && portfolio.release.evidence_policy, 'portfolio_evidence_policy_missing');

  const systems = new Map(portfolio.flagships.map((entry) => {
    const system = normalizeSystem(entry);
    return [system.id, system];
  }));
  const missing = LENSES.flatMap((lens) => lens.systemIds).filter((id) => !systems.has(id));
  requireValue(missing.length === 0, `invention_runtime_missing_systems:${[...new Set(missing)].join(',')}`);

  const lenses = LENSES.map((lens) => ({
    id: lens.id,
    title: lens.title,
    question: lens.question,
    systems: lens.systemIds.map((id) => systems.get(id)),
  }));
  const roleRoutes = portfolio.person.roles.map((role) => ({
    role,
    lenses: lenses.map((lens) => ({
      id: lens.id,
      title: lens.title,
      systems: lens.systems.map(({ id, name, repo, state, level }) => ({ id, name, repo, state, level })),
    })),
  }));
  const core = {
    schema: MAP_SCHEMA,
    release: RELEASE,
    source: {
      repository: 'GlacierEQ/job-application',
      portfolio_commit: PORTFOLIO_COMMIT,
      portfolio_path: 'site-v15/data/portfolio.json',
      evidence_policy: portfolio.release.evidence_policy,
    },
    restoration_lineage: {
      donor_commit: DONOR_COMMIT,
      contraction_commit: CONTRACTION_COMMIT,
      recovered_mechanisms: [
        'problem-centered invention discovery',
        'filterable repository gallery',
        'cross-system review combinations',
        'claim-to-proof evidence chain',
        'role-to-repository evidence map',
      ],
      preserved_later_gains: [
        'script-free public CSP',
        'Helix-bound evidence policy',
        'V21+ proof surfaces',
        'V25+ deployment and release routing',
      ],
    },
    lenses,
    role_routes: roleRoutes,
  };
  return { ...core, receipt_sha256: sha256(stableStringify(core)) };
}

async function loadMap() {
  if (!portfolioPromise) {
    portfolioPromise = fetchBounded(PORTFOLIO_URL, 'portfolio')
      .then((body) => buildMap(JSON.parse(body.toString('utf8'))))
      .catch((error) => {
        portfolioPromise = null;
        throw error;
      });
  }
  return portfolioPromise;
}

async function loadCss() {
  if (!cssPromise) {
    cssPromise = fetchBounded(CSS_URL, 'inventions_css').catch((error) => {
      cssPromise = null;
      throw error;
    });
  }
  return cssPromise;
}

function requestUrl(req) {
  return new URL(String(req?.url || '/'), 'https://glaciereq.invalid');
}

function requestPath(req) {
  const parsed = requestUrl(req);
  const values = parsed.searchParams.getAll('path');
  const raw = values.length ? values.join('/') : parsed.pathname;
  return String(raw).replace(/^\/+|\/+$/g, '');
}

function handles(rawPath) {
  const path = String(rawPath || '').replace(/^\/+|\/+$/g, '');
  return path === 'inventions'
    || path === 'inventions/index.html'
    || path === 'data/invention-map.json'
    || path === 'assets/site.inventions.css'
    || path === '__inventions_verify';
}

function selection(req, map) {
  const url = requestUrl(req);
  const lensId = url.searchParams.get('lens') || '';
  const role = url.searchParams.get('role') || '';
  const lens = lensId ? map.lenses.find((item) => item.id === lensId) : null;
  const roleRoute = role ? map.role_routes.find((item) => item.role === role) : null;
  return {
    lens: lensId && !lens ? null : lens,
    lensRequested: Boolean(lensId),
    roleRoute: role && !roleRoute ? null : roleRoute,
    roleRequested: Boolean(role),
  };
}

function systemCard(system) {
  const mechanisms = system.mechanism.length
    ? `<ul>${system.mechanism.map((item) => `<li>${esc(item)}</li>`).join('')}</ul>`
    : '';
  return `<article class="invention-card"><div class="invention-card-head"><span>${esc(system.state)}</span><code>${esc(system.level)}</code></div><h3>${esc(system.name)}</h3><p>${esc(system.summary)}</p>${mechanisms}<dl><div><dt>Evidence</dt><dd>${esc(system.evidence)}</dd></div><div><dt>Current ceiling</dt><dd>${esc(system.limit)}</dd></div></dl><a href="${esc(system.repo)}" target="_blank" rel="noopener">Inspect repository →</a></article>`;
}

function lensSection(lens, index) {
  return `<section id="${esc(lens.id)}" class="invention-lens"><div class="lens-heading"><span>${String(index + 1).padStart(2, '0')}</span><div><p>PROBLEM LENS</p><h2>${esc(lens.title)}</h2><strong>${esc(lens.question)}</strong></div></div><div class="invention-grid">${lens.systems.map(systemCard).join('')}</div></section>`;
}

function renderHtml(map, selected) {
  const lenses = selected.lensRequested ? (selected.lens ? [selected.lens] : []) : map.lenses;
  const roleRoutes = selected.roleRequested ? (selected.roleRoute ? [selected.roleRoute] : []) : map.role_routes;
  const lensLinks = map.lenses.map((lens) => `<a href="/inventions/?lens=${encodeURIComponent(lens.id)}">${esc(lens.title)}</a>`).join('');
  const roleRows = roleRoutes.map((route) => `<article class="role-route"><h3>${esc(route.role)}</h3><div>${route.lenses.map((lens) => `<p><b>${esc(lens.title)}</b> ${lens.systems.map((system) => `<a href="${esc(system.repo)}">${esc(system.name)}</a>`).join(' · ')}</p>`).join('')}</div></article>`).join('');
  const empty = lenses.length === 0 || roleRoutes.length === 0;
  const canonical = 'https://casey-barton-glaciereq.vercel.app/inventions/';
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><meta name="theme-color" content="#03070a"><meta name="description" content="Problem-centered map of GlacierEQ inventions, repositories, evidence, and proof ceilings."><meta name="robots" content="${selected.lensRequested || selected.roleRequested ? 'noindex,follow' : 'index,follow'}"><link rel="canonical" href="${canonical}"><title>Casey Barton · Invention Evidence Map</title><link rel="stylesheet" href="/assets/site.css"><link rel="stylesheet" href="/assets/site.systems.css"><link rel="stylesheet" href="/assets/site.complete.css"><link rel="stylesheet" href="/assets/site.interaction.css"><link rel="stylesheet" href="/assets/site.algerian.css"><link rel="stylesheet" href="/assets/site.inventions.css"><link rel="alternate" type="application/json" href="/data/invention-map.json" title="Machine-readable invention evidence map"></head><body><a class="skip" href="#main">Skip to invention map</a><header class="site-header"><div class="shell nav"><a class="brand" href="/"><span class="mark">CB</span><span><strong>CASEY BARTON</strong><small>INVENTION EVIDENCE MAP</small></span></a><nav class="links" aria-label="Problem lenses">${lensLinks}</nav><a class="nav-cta" href="/">Portfolio home</a></div></header><main id="main" class="invention-main"><section class="invention-hero"><div class="shell"><p class="eyebrow">RECOVERED + COMPOSED · PROBLEM-CENTERED REVIEW</p><h1>Start with the problem. Follow the mechanism to its proof.</h1><p class="lead">Historical invention-discovery mechanisms are composed into the modern proof-bound surface without restoring the obsolete client runtime. Filters are server-routed, shareable, script-free, and evidence ceilings remain visible.</p><div class="invention-receipt"><span>Evidence policy</span><b>${esc(map.source.evidence_policy)}</b><span>Map receipt</span><code>${map.receipt_sha256.slice(0, 16)}</code></div></div></section><div class="shell">${empty ? '<section class="invention-lens"><h2>No matching evidence route.</h2><p>Remove the filter or choose a listed problem lens / exact role.</p></section>' : lenses.map(lensSection).join('')}</div><section class="role-map"><div class="shell"><div class="section-head"><div><p class="eyebrow">ROLE → PROBLEM → REPOSITORY</p><h2>One estate, routed by the decision being made.</h2></div><p>Use <code>?lens=</code> for problem filtering and <code>?role=</code> for exact role routing. No client script or hidden application state is required.</p></div><div class="role-route-grid">${roleRows}</div></div></section><section class="lineage"><div class="shell"><p class="eyebrow">RESTORATION LINEAGE</p><h2>Recovered mechanism, not reverted website.</h2><p>Donor <code>${DONOR_COMMIT.slice(0, 12)}</code> → contraction <code>${CONTRACTION_COMMIT.slice(0, 12)}</code>. Later proof, CSP, Helix authority, and deployment gains remain intact.</p><a class="button primary" href="/machine/">Inspect machine surface</a></div></section></main></body></html>`;
}

function securityHeaders(res) {
  res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'none'; style-src 'self'; img-src 'self' data:; connect-src 'none'; font-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'; form-action 'self' mailto:; upgrade-insecure-requests");
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=()');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  res.setHeader('X-GlacierEQ-Invention-Source', PORTFOLIO_COMMIT);
  res.setHeader('X-PSYSOCX-Release', RELEASE);
}

function send(res, status, type, body, cacheControl = 'public, max-age=0, must-revalidate') {
  const bytes = Buffer.isBuffer(body) ? body : Buffer.from(String(body));
  securityHeaders(res);
  res.statusCode = status;
  res.setHeader('Content-Type', type);
  res.setHeader('Cache-Control', cacheControl);
  res.setHeader('Content-Length', String(bytes.length));
  res.end(bytes);
}

async function verify(res) {
  try {
    const map = await loadMap();
    const css = await loadCss();
    const html = renderHtml(map, { lens: null, lensRequested: false, roleRoute: null, roleRequested: false });
    requireValue(!/<script\b/i.test(html), 'invention_html_script_forbidden');
    requireValue(map.lenses.length === LENSES.length, 'invention_lens_count_mismatch');
    requireValue(map.role_routes.length > 0, 'invention_role_routes_empty');
    requireValue(css.includes('.invention-grid'), 'invention_css_contract_missing');
    return send(res, 200, 'application/json; charset=utf-8', JSON.stringify({
      schema: VERIFY_SCHEMA,
      status: 'PASS',
      release: RELEASE,
      source_commit: PORTFOLIO_COMMIT,
      donor_commit: DONOR_COMMIT,
      contraction_commit: CONTRACTION_COMMIT,
      map_receipt_sha256: map.receipt_sha256,
      problem_lenses: map.lenses.length,
      role_routes: map.role_routes.length,
      script_free: true,
      server_filtering: true,
      errors: [],
    }, null, 2), 'no-store');
  } catch (error) {
    return send(res, 503, 'application/json; charset=utf-8', JSON.stringify({
      schema: VERIFY_SCHEMA,
      status: 'FAIL',
      release: RELEASE,
      source_commit: PORTFOLIO_COMMIT,
      errors: [error instanceof Error ? error.message : String(error)],
    }, null, 2), 'no-store');
  }
}

module.exports = async function inventionsProxy(req, res) {
  const path = requestPath(req);
  if (path === '__inventions_verify') return verify(res);
  if (!handles(path)) return send(res, 404, 'text/plain; charset=utf-8', 'Not found', 'no-store');
  try {
    if (path === 'assets/site.inventions.css') {
      return send(res, 200, 'text/css; charset=utf-8', await loadCss(), 'public, max-age=0, s-maxage=900, must-revalidate');
    }
    const map = await loadMap();
    if (path === 'data/invention-map.json') {
      return send(res, 200, 'application/json; charset=utf-8', `${JSON.stringify(map, null, 2)}\n`);
    }
    return send(res, 200, 'text/html; charset=utf-8', renderHtml(map, selection(req, map)));
  } catch (error) {
    return send(res, 503, 'application/json; charset=utf-8', JSON.stringify({
      schema: 'glaciereq.v28-invention-evidence-runtime-error.v1',
      status: 'FAIL_CLOSED',
      release: RELEASE,
      source_commit: PORTFOLIO_COMMIT,
      path,
      error: error instanceof Error ? error.message : String(error),
    }, null, 2), 'no-store');
  }
};

module.exports.constants = { PORTFOLIO_COMMIT, DONOR_COMMIT, CONTRACTION_COMMIT, RELEASE, VERIFY_SCHEMA, MAP_SCHEMA, LENSES };
module.exports.buildMap = buildMap;
module.exports.handles = handles;
module.exports.renderHtml = renderHtml;
module.exports.selection = selection;

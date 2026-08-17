const crypto = require('node:crypto');
const { URL } = require('node:url');

const PORTFOLIO_COMMIT = 'b4ed2a05182e1e055ed4e9d59e59a0aab21097ad';
const DONOR_COMMIT = '901fe77d2c6015feb1650133b751efff8aa0d24c';
const CONTRACTION_COMMIT = '61042c4018db90589715fe1c7f6a2c58879ac2b2';
const RELEASE = 'V29-INVENTION-PROOF-ROUTING';
const VERIFY_SCHEMA = 'glaciereq.v29-invention-proof-routing-verification.v1';
const MAP_SCHEMA = 'glaciereq.invention-evidence-map.v3';
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

const ROLE_BLUEPRINTS = Object.freeze({
  'Forward-Deployed AI Architect': Object.freeze({
    why: 'Maps field ambiguity into bounded operating systems, then carries the path through proof and a usable human-facing handoff.',
    lensIds: ['application-intelligence', 'agent-assurance', 'human-machine'],
    systemIds: ['helix', 'job-application', 'akos', 'sigma-glue'],
  }),
  'Principal Agentic Systems Architect': Object.freeze({
    why: 'Emphasizes authority, replay safety, convergence, evidence, and composition across cooperating agent runtimes.',
    lensIds: ['agent-assurance', 'evidence-verification', 'architecture-federation'],
    systemIds: ['akos', 'sigma-glue', 'doctor-strange', 'receipt-router'],
  }),
  'Principal AI Platform / Automation Architect': Object.freeze({
    why: 'Emphasizes platform boundaries, reversible orchestration, federation, deployment surfaces, and operator-facing automation.',
    lensIds: ['architecture-federation', 'application-intelligence', 'human-machine'],
    systemIds: ['helix', 'sigma-glue', 'tower-of-babel', 'pro-code-runtime', 'job-application'],
  }),
  'Staff / Principal Applied AI Engineer': Object.freeze({
    why: 'Emphasizes implemented mechanisms, behavioral proof, evidence convergence, and practical agent reliability.',
    lensIds: ['evidence-verification', 'agent-assurance', 'application-intelligence'],
    systemIds: ['receipt-router', 'doctor-strange', 'akos', 'helix'],
  }),
});

const WORKFLOW_BLUEPRINTS = Object.freeze([
  Object.freeze({
    id: 'application-to-proof',
    title: 'Role signal → proof-bound application',
    intent: 'Turn role evidence into a truthful application surface without losing repository provenance.',
    systemIds: ['helix', 'job-application', 'receipt-router'],
  }),
  Object.freeze({
    id: 'bounded-agent-execution',
    title: 'Authority → reversible action → convergence',
    intent: 'Move an agent action from permission through reversible execution and independent-reader convergence.',
    systemIds: ['akos', 'sigma-glue', 'doctor-strange'],
  }),
  Object.freeze({
    id: 'claim-to-evidence',
    title: 'Claim → evidence → review surface',
    intent: 'Route a technical claim through behavioral evidence and expose the current proof ceiling to reviewers.',
    systemIds: ['receipt-router', 'doctor-strange', 'job-application'],
  }),
  Object.freeze({
    id: 'federated-runtime',
    title: 'Architecture boundary → runtime → orchestration',
    intent: 'Compose polyglot architecture with concrete runtime surfaces and reversible orchestration.',
    systemIds: ['tower-of-babel', 'pro-code-runtime', 'sigma-glue'],
  }),
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
    rank: Number.isFinite(system.rank) ? system.rank : null,
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

function compactSystem(system) {
  const { id, name, repo, state, level } = system;
  return { id, name, repo, state, level };
}

function buildRoleRoute(role, lenses, systems) {
  const blueprint = ROLE_BLUEPRINTS[role];
  if (!blueprint) {
    return {
      role,
      why: 'Current portfolio role with conservative routing to the complete problem map until a differentiated blueprint is defined.',
      lenses: lenses.map((lens) => ({
        id: lens.id,
        title: lens.title,
        systems: lens.systems.map(compactSystem),
      })),
      systems: [...systems.values()].sort((a, b) => (a.rank ?? 999) - (b.rank ?? 999)).slice(0, 5).map(compactSystem),
      differentiated: false,
    };
  }

  const lensById = new Map(lenses.map((lens) => [lens.id, lens]));
  const selectedLenses = blueprint.lensIds.map((id) => {
    const lens = lensById.get(id);
    requireValue(lens, `role_blueprint_missing_lens:${role}:${id}`);
    const preferred = lens.systems.filter((system) => blueprint.systemIds.includes(system.id));
    return {
      id: lens.id,
      title: lens.title,
      systems: (preferred.length ? preferred : lens.systems).map(compactSystem),
    };
  });

  const selectedSystems = blueprint.systemIds.map((id) => {
    const system = systems.get(id);
    requireValue(system, `role_blueprint_missing_system:${role}:${id}`);
    return compactSystem(system);
  });

  return {
    role,
    why: blueprint.why,
    lenses: selectedLenses,
    systems: selectedSystems,
    differentiated: true,
  };
}

function buildProofChains(lenses) {
  const unique = new Map();
  for (const lens of lenses) {
    for (const system of lens.systems) unique.set(system.id, system);
  }
  return [...unique.values()]
    .sort((a, b) => (a.rank ?? 999) - (b.rank ?? 999) || a.id.localeCompare(b.id))
    .map((system) => ({
      id: system.id,
      claim: system.summary,
      repository: system.repo,
      evidence_state: system.state,
      evidence: system.evidence,
      proof_ceiling: system.limit,
      level: system.level,
      receipt_sha256: sha256(stableStringify({
        id: system.id,
        claim: system.summary,
        repository: system.repo,
        evidence_state: system.state,
        evidence: system.evidence,
        proof_ceiling: system.limit,
        level: system.level,
      })),
    }));
}

function buildWorkflows(systems) {
  return WORKFLOW_BLUEPRINTS.map((workflow) => ({
    id: workflow.id,
    title: workflow.title,
    intent: workflow.intent,
    steps: workflow.systemIds.map((id, index) => {
      const system = systems.get(id);
      requireValue(system, `workflow_missing_system:${workflow.id}:${id}`);
      return {
        order: index + 1,
        system: compactSystem(system),
        contribution: system.summary,
        evidence: system.evidence,
        proof_ceiling: system.limit,
      };
    }),
  }));
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
  const requiredIds = [
    ...LENSES.flatMap((lens) => lens.systemIds),
    ...WORKFLOW_BLUEPRINTS.flatMap((workflow) => workflow.systemIds),
  ];
  const missing = requiredIds.filter((id) => !systems.has(id));
  requireValue(missing.length === 0, `invention_runtime_missing_systems:${[...new Set(missing)].join(',')}`);

  const lenses = LENSES.map((lens) => ({
    id: lens.id,
    title: lens.title,
    question: lens.question,
    systems: lens.systemIds.map((id) => systems.get(id)),
  }));
  const roleRoutes = portfolio.person.roles.map((role) => buildRoleRoute(role, lenses, systems));
  const proofChains = buildProofChains(lenses);
  const workflows = buildWorkflows(systems);

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
      surpassed_mechanisms: [
        'differentiated role-to-problem routing',
        'machine-traversable claim-to-proof chains',
        'cross-repository workflow paths with per-step evidence ceilings',
      ],
      preserved_later_gains: [
        'script-free public CSP',
        'Helix-bound evidence policy',
        'V21+ proof surfaces',
        'V25+ deployment and release routing',
        'V28 server-side shareable filtering',
      ],
    },
    lenses,
    role_routes: roleRoutes,
    proof_chains: proofChains,
    workflows,
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
  const workflowId = url.searchParams.get('workflow') || '';
  const lens = lensId ? map.lenses.find((item) => item.id === lensId) : null;
  const roleRoute = role ? map.role_routes.find((item) => item.role === role) : null;
  const workflow = workflowId ? map.workflows.find((item) => item.id === workflowId) : null;
  return {
    lens: lensId && !lens ? null : lens,
    lensRequested: Boolean(lensId),
    roleRoute: role && !roleRoute ? null : roleRoute,
    roleRequested: Boolean(role),
    workflow: workflowId && !workflow ? null : workflow,
    workflowRequested: Boolean(workflowId),
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

function roleCard(route) {
  return `<article class="role-route"><h3>${esc(route.role)}</h3><p>${esc(route.why)}</p><div>${route.lenses.map((lens) => `<p><b>${esc(lens.title)}</b> ${lens.systems.map((system) => `<a href="${esc(system.repo)}">${esc(system.name)}</a>`).join(' · ')}</p>`).join('')}</div><p><strong>Priority systems:</strong> ${route.systems.map((system) => `<a href="${esc(system.repo)}">${esc(system.name)}</a>`).join(' · ')}</p></article>`;
}

function workflowCard(workflow) {
  return `<article class="role-route"><h3>${esc(workflow.title)}</h3><p>${esc(workflow.intent)}</p><ol>${workflow.steps.map((step) => `<li><a href="${esc(step.system.repo)}">${esc(step.system.name)}</a><br><span>${esc(step.contribution)}</span><br><small>Evidence: ${esc(step.evidence)} · Ceiling: ${esc(step.proof_ceiling)}</small></li>`).join('')}</ol></article>`;
}

function proofCard(chain) {
  return `<article class="invention-card"><div class="invention-card-head"><span>${esc(chain.evidence_state)}</span><code>${esc(chain.level)}</code></div><h3>${esc(chain.id)}</h3><dl><div><dt>Claim</dt><dd>${esc(chain.claim)}</dd></div><div><dt>Evidence</dt><dd>${esc(chain.evidence)}</dd></div><div><dt>Proof ceiling</dt><dd>${esc(chain.proof_ceiling)}</dd></div></dl><a href="${esc(chain.repository)}" target="_blank" rel="noopener">Inspect owning repository →</a><p><code>${chain.receipt_sha256.slice(0, 16)}</code></p></article>`;
}

function renderHtml(map, selected) {
  const lenses = selected.lensRequested ? (selected.lens ? [selected.lens] : []) : map.lenses;
  const roleRoutes = selected.roleRequested ? (selected.roleRoute ? [selected.roleRoute] : []) : map.role_routes;
  const workflows = selected.workflowRequested ? (selected.workflow ? [selected.workflow] : []) : map.workflows;
  const hasInvalidFilter = (selected.lensRequested && !selected.lens)
    || (selected.roleRequested && !selected.roleRoute)
    || (selected.workflowRequested && !selected.workflow);
  const lensLinks = map.lenses.map((lens) => `<a href="/inventions/?lens=${encodeURIComponent(lens.id)}">${esc(lens.title)}</a>`).join('');
  const workflowLinks = map.workflows.map((workflow) => `<a href="/inventions/?workflow=${encodeURIComponent(workflow.id)}">${esc(workflow.title)}</a>`).join('');
  const canonical = 'https://casey-barton-glaciereq.vercel.app/inventions/';
  const filtered = selected.lensRequested || selected.roleRequested || selected.workflowRequested;

  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><meta name="theme-color" content="#03070a"><meta name="description" content="Problem-centered map of GlacierEQ inventions, repositories, evidence, workflows, and proof ceilings."><meta name="robots" content="${filtered ? 'noindex,follow' : 'index,follow'}"><link rel="canonical" href="${canonical}"><title>Casey Barton · Invention Evidence Map</title><link rel="stylesheet" href="/assets/site.css"><link rel="stylesheet" href="/assets/site.systems.css"><link rel="stylesheet" href="/assets/site.complete.css"><link rel="stylesheet" href="/assets/site.interaction.css"><link rel="stylesheet" href="/assets/site.algerian.css"><link rel="stylesheet" href="/assets/site.inventions.css"><link rel="alternate" type="application/json" href="/data/invention-map.json" title="Machine-readable invention evidence map"></head><body><a class="skip" href="#main">Skip to invention map</a><header class="site-header"><div class="shell nav"><a class="brand" href="/"><span class="mark">CB</span><span><strong>CASEY BARTON</strong><small>INVENTION EVIDENCE MAP</small></span></a><nav class="links" aria-label="Problem lenses">${lensLinks}</nav><a class="nav-cta" href="/">Portfolio home</a></div></header><main id="main" class="invention-main"><section class="invention-hero"><div class="shell"><p class="eyebrow">RECOVERED + SURPASSED · PROBLEM → SYSTEM → PROOF</p><h1>Start with the problem. Follow the mechanism all the way to its ceiling.</h1><p class="lead">The recovered invention constellation now routes differentiated roles, cross-repository workflows, and machine-traversable claim-to-proof chains while preserving the script-free public boundary.</p><div class="invention-receipt"><span>Evidence policy</span><b>${esc(map.source.evidence_policy)}</b><span>Map receipt</span><code>${map.receipt_sha256.slice(0, 16)}</code></div></div></section>${hasInvalidFilter ? '<div class="shell"><section class="invention-lens"><h2>No matching evidence route.</h2><p>Remove the filter or choose a listed problem lens, exact role, or workflow.</p></section></div>' : `<div class="shell">${lenses.map(lensSection).join('')}</div><section class="role-map"><div class="shell"><div class="section-head"><div><p class="eyebrow">ROLE → PROBLEM → REPOSITORY</p><h2>Different decisions get different evidence routes.</h2></div><p>Role routing is intentionally differentiated rather than repeating the entire estate for every title.</p></div><div class="role-route-grid">${roleRoutes.map(roleCard).join('')}</div></div></section><section class="role-map"><div class="shell"><div class="section-head"><div><p class="eyebrow">CROSS-REPOSITORY WORKFLOWS</p><h2>See how the systems compose.</h2></div><p>${workflowLinks}</p></div><div class="role-route-grid">${workflows.map(workflowCard).join('')}</div></div></section><section class="invention-lens"><div class="shell"><div class="section-head"><div><p class="eyebrow">CLAIM → PROOF → CEILING</p><h2>Every public system carries its evidence boundary.</h2></div><p>Each chain is independently receipt-bound inside the map so a reviewer can traverse claim, owning repository, evidence state, and current ceiling.</p></div><div class="invention-grid">${map.proof_chains.map(proofCard).join('')}</div></div></section>`}<section class="lineage"><div class="shell"><p class="eyebrow">RESTORATION LINEAGE</p><h2>Recovered mechanism, not reverted website.</h2><p>Donor <code>${DONOR_COMMIT.slice(0, 12)}</code> → contraction <code>${CONTRACTION_COMMIT.slice(0, 12)}</code>. V29 surpasses the donor with differentiated role routing, machine-readable proof chains, and evidence-bounded cross-repository workflows.</p><a class="button primary" href="/machine/">Inspect machine surface</a></div></section></main></body></html>`;
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
    const html = renderHtml(map, {
      lens: null, lensRequested: false,
      roleRoute: null, roleRequested: false,
      workflow: null, workflowRequested: false,
    });
    const differentiated = map.role_routes.filter((route) => route.differentiated);
    const signatures = new Set(differentiated.map((route) => route.lenses.map((lens) => lens.id).join('|')));
    requireValue(!/<script\b/i.test(html), 'invention_html_script_forbidden');
    requireValue(map.lenses.length === LENSES.length, 'invention_lens_count_mismatch');
    requireValue(map.role_routes.length > 0, 'invention_role_routes_empty');
    requireValue(map.proof_chains.length >= 8, 'invention_proof_chains_incomplete');
    requireValue(map.workflows.length === WORKFLOW_BLUEPRINTS.length, 'invention_workflow_count_mismatch');
    requireValue(differentiated.length >= 2 && signatures.size >= 2, 'invention_role_routes_not_differentiated');
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
      differentiated_role_routes: differentiated.length,
      proof_chains: map.proof_chains.length,
      workflows: map.workflows.length,
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
      schema: 'glaciereq.v29-invention-proof-routing-error.v1',
      status: 'FAIL_CLOSED',
      release: RELEASE,
      source_commit: PORTFOLIO_COMMIT,
      path,
      error: error instanceof Error ? error.message : String(error),
    }, null, 2), 'no-store');
  }
};

module.exports.constants = {
  PORTFOLIO_COMMIT,
  DONOR_COMMIT,
  CONTRACTION_COMMIT,
  RELEASE,
  VERIFY_SCHEMA,
  MAP_SCHEMA,
  LENSES,
  ROLE_BLUEPRINTS,
  WORKFLOW_BLUEPRINTS,
};
module.exports.buildMap = buildMap;
module.exports.handles = handles;
module.exports.renderHtml = renderHtml;
module.exports.selection = selection;

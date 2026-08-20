const crypto = require('node:crypto');
const { URL } = require('node:url');

const PORTFOLIO_COMMIT = 'e870a5153bb38d533540e44c888759a8cd3b7169';
const DONOR_COMMIT = '901fe77d2c6015feb1650133b751efff8aa0d24c';
const CONTRACTION_COMMIT = '61042c4018db90589715fe1c7f6a2c58879ac2b2';
const RELEASE = 'V29-WORKFLOW-TOPOLOGY-RUNTIME';
const SCHEMA = 'glaciereq.workflow-topology.v1';
const VERIFY_SCHEMA = 'glaciereq.v29-workflow-topology-runtime-verification.v1';
const PORTFOLIO_URL = `https://raw.githubusercontent.com/GlacierEQ/job-application/${PORTFOLIO_COMMIT}/site-v15/data/portfolio.json`;
const FETCH_TIMEOUT_MS = 12_000;
const MAX_BYTES = 1024 * 1024;

// WHY: V13 had useful combination flows, but their system IDs and proof statements aged.
// We recover the composition grammar, then bind every node to the modern evidence graph.
const FLOW_BLUEPRINTS = Object.freeze([
  Object.freeze({
    id: 'opportunity-to-evidence-package',
    name: 'Opportunity → evidence-bound application package',
    intent: 'Turn role opportunity into a reviewable package without separating claims from owning evidence.',
    systemIds: ['helix', 'receipt-router', 'job-application'],
    transitions: ['select and route verified evidence', 'reconcile claim/proof state', 'compile recruiter and machine surfaces'],
  }),
  Object.freeze({
    id: 'intent-to-reversible-execution',
    name: 'Intent → reversible execution → independently inspectable closure',
    intent: 'Move from operator intent to action while keeping authority, replay safety, recovery, and verification distinct.',
    systemIds: ['akos', 'sigma-glue', 'doctor-strange'],
    transitions: ['bind authority and execution state', 'execute approval-bound reversible orchestration', 'converge independent evidence without fake consensus'],
  }),
  Object.freeze({
    id: 'architecture-to-operational-runtime',
    name: 'Architecture boundary → polyglot runtime → hiring-system integration',
    intent: 'Show how language-boundary architecture becomes runnable infrastructure and then composes into an applied system.',
    systemIds: ['tower-of-babel', 'pro-code-runtime', 'helix'],
    transitions: ['define earned language boundaries', 'implement the polyglot runtime plane', 'consume the runtime pattern in application intelligence'],
  }),
  Object.freeze({
    id: 'evidence-to-human-machine-review',
    name: 'Evidence → bounded verification → human and machine review',
    intent: 'Keep source evidence, verification state, and presentation depth connected without truth drift.',
    systemIds: ['receipt-router', 'doctor-strange', 'job-application'],
    transitions: ['classify and route evidence', 'cross-check independent-reader convergence', 'render one factual graph at multiple review depths'],
  }),
]);

const CSS = `
.workflow-main{padding-bottom:6rem}.workflow-hero{padding:5rem 0 3rem}.workflow-hero h1{max-width:1000px;font-size:clamp(2.6rem,7vw,6.4rem);line-height:.92}.workflow-hero .lead{max-width:850px}.workflow-filter{display:flex;gap:.7rem;flex-wrap:wrap;margin:2rem 0}.workflow-filter a{border:1px solid var(--line);padding:.65rem .85rem;text-decoration:none}.workflow-grid{display:grid;gap:1.2rem}.workflow-card{border:1px solid var(--line);background:var(--panel);padding:1.4rem}.workflow-card h2{margin:.2rem 0 .6rem}.workflow-intent{max-width:900px}.workflow-chain{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:.8rem;margin:1.2rem 0}.workflow-node{border:1px solid var(--line);padding:1rem;position:relative}.workflow-node code{font-size:.72rem}.workflow-node a{font-weight:800}.workflow-edge{font-size:.82rem;color:var(--muted);margin:.6rem 0 0}.workflow-proof{display:grid;gap:.35rem;margin-top:.8rem;font-size:.86rem}.workflow-proof span{display:block}.workflow-receipt{margin-top:2.5rem;border-top:1px solid var(--line);padding-top:1.2rem}.workflow-empty{border:1px solid var(--line);padding:2rem}.workflow-state{display:inline-block;font-size:.72rem;letter-spacing:.08em}.workflow-machine{margin-top:2rem}@media(max-width:760px){.workflow-hero{padding-top:3rem}.workflow-chain{grid-template-columns:1fr}}
`;

let topologyPromise = null;

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

async function fetchPortfolio() {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const response = await fetch(PORTFOLIO_URL, {
      headers: { 'user-agent': `GlacierEQ-${RELEASE}/1.0` },
      signal: controller.signal,
      redirect: 'error',
    });
    requireValue(response.ok, `workflow_portfolio_http_${response.status}`);
    const declared = Number(response.headers.get('content-length') || 0);
    requireValue(!declared || declared <= MAX_BYTES, 'workflow_portfolio_declared_too_large');
    const body = Buffer.from(await response.arrayBuffer());
    requireValue(body.length > 0 && body.length <= MAX_BYTES, 'workflow_portfolio_body_size');
    return JSON.parse(body.toString('utf8'));
  } catch (error) {
    if (error?.name === 'AbortError') throw new Error('workflow_portfolio_fetch_timeout');
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

function normalizeSystem(system) {
  for (const field of ['id', 'name', 'repo', 'state', 'summary', 'evidence', 'limit', 'level']) {
    requireValue(typeof system?.[field] === 'string' && system[field], `workflow_system_${field}_missing:${system?.id || 'unknown'}`);
  }
  requireValue(system.repo.startsWith('https://github.com/GlacierEQ/'), `workflow_repo_boundary:${system.id}`);
  return { id: system.id, name: system.name, repo: system.repo, state: system.state, summary: system.summary, evidence: system.evidence, limit: system.limit, level: system.level };
}

function buildTopology(portfolio) {
  requireValue(portfolio?.schema === 'glaciereq.hiring-portfolio.v1', 'workflow_portfolio_schema');
  requireValue(Array.isArray(portfolio.flagships) && portfolio.flagships.length > 0, 'workflow_flagships_missing');
  requireValue(typeof portfolio?.release?.evidence_policy === 'string', 'workflow_evidence_policy_missing');
  const systems = new Map(portfolio.flagships.map((entry) => { const system = normalizeSystem(entry); return [system.id, system]; }));
  const requiredIds = [...new Set(FLOW_BLUEPRINTS.flatMap((flow) => flow.systemIds))];
  const missing = requiredIds.filter((id) => !systems.has(id));
  requireValue(missing.length === 0, `workflow_required_systems_missing:${missing.join(',')}`);
  const flows = FLOW_BLUEPRINTS.map((blueprint) => ({
    id: blueprint.id, name: blueprint.name, intent: blueprint.intent,
    steps: blueprint.systemIds.map((id, index) => ({ ordinal: index + 1, transition: blueprint.transitions[index], system: systems.get(id) })),
  }));
  const edges = flows.flatMap((flow) => flow.steps.slice(0, -1).map((step, index) => ({ flow_id: flow.id, from: step.system.id, to: flow.steps[index + 1].system.id, transition: flow.steps[index + 1].transition })));
  const core = {
    schema: SCHEMA, release: RELEASE,
    source: { repository: 'GlacierEQ/job-application', portfolio_commit: PORTFOLIO_COMMIT, portfolio_path: 'site-v15/data/portfolio.json', evidence_policy: portfolio.release.evidence_policy },
    restoration_lineage: {
      donor_commit: DONOR_COMMIT, donor_path: 'site-v13/data/portfolio.graph.json#combination_flows', contraction_commit: CONTRACTION_COMMIT,
      recovered_mechanism: 'cross-repository combination flow topology',
      composition_upgrade: 'historical flow grammar rebound to current flagship proof state with deterministic machine edges and server-side filters',
      preserved_later_gains: ['script-free CSP', 'V23 systems atlas', 'V25 application compiler', 'V28 invention evidence runtime', 'Starmap runtime', 'evidence-bound visualizer'],
    },
    flows, edges,
  };
  return { ...core, receipt_sha256: sha256(stableStringify(core)) };
}

async function loadTopology() {
  if (!topologyPromise) topologyPromise = fetchPortfolio().then(buildTopology).catch((error) => { topologyPromise = null; throw error; });
  return topologyPromise;
}
function requestUrl(req) { return new URL(String(req?.url || '/'), 'https://glaciereq.invalid'); }
function requestPath(req) { const parsed = requestUrl(req); const values = parsed.searchParams.getAll('path'); const raw = values.length ? values.join('/') : parsed.pathname; return String(raw).replace(/^\/+|\/+$/g, ''); }
function handles(rawPath) {
  const path = String(rawPath || '').replace(/^\/+|\/+$/g, '');
  return path === 'workflows' || path === 'workflows/index.html' || path === 'data/workflow-topology.json' || path === 'assets/site.workflows.css' || path === '__workflow_topology_verify';
}
function selectFlows(req, topology) {
  const url = requestUrl(req); const flowId = url.searchParams.get('flow') || ''; const systemId = url.searchParams.get('system') || ''; const state = url.searchParams.get('state') || '';
  const knownStates = new Set(topology.flows.flatMap((flow) => flow.steps.map((step) => step.system.state))); const invalid = [];
  if (flowId && !topology.flows.some((flow) => flow.id === flowId)) invalid.push(`flow:${flowId}`);
  if (systemId && !topology.flows.some((flow) => flow.steps.some((step) => step.system.id === systemId))) invalid.push(`system:${systemId}`);
  if (state && !knownStates.has(state)) invalid.push(`state:${state}`);
  if (invalid.length) return { flows: [], invalid };
  return { flows: topology.flows.filter((flow) => (!flowId || flow.id === flowId) && (!systemId || flow.steps.some((step) => step.system.id === systemId)) && (!state || flow.steps.some((step) => step.system.state === state))), invalid: [] };
}
function renderNode(step) {
  const s = step.system;
  return `<article class="workflow-node"><span class="workflow-state">${esc(s.state)} · ${esc(s.level)}</span><h3>${esc(step.ordinal)}. ${esc(s.name)}</h3><p>${esc(s.summary)}</p><p class="workflow-edge"><b>Contribution:</b> ${esc(step.transition)}</p><div class="workflow-proof"><span><b>Evidence:</b> ${esc(s.evidence)}</span><span><b>Current ceiling:</b> ${esc(s.limit)}</span></div><a href="${esc(s.repo)}" target="_blank" rel="noopener">Inspect owning repository →</a></article>`;
}
function renderHtml(topology, selection) {
  const canonical = 'https://casey-barton-glaciereq.vercel.app/workflows/';
  const filtered = selection.flows.length !== topology.flows.length || selection.invalid.length > 0;
  const systemIds = [...new Set(topology.flows.flatMap((flow) => flow.steps.map((step) => step.system.id)))];
  const flowLinks = topology.flows.map((flow) => `<a href="/workflows/?flow=${encodeURIComponent(flow.id)}">${esc(flow.name)}</a>`).join('');
  const systemLinks = systemIds.map((id) => `<a href="/workflows/?system=${encodeURIComponent(id)}">${esc(id)}</a>`).join('');
  const cards = selection.flows.map((flow) => `<section class="workflow-card" id="${esc(flow.id)}"><p class="eyebrow">COMPOSED WORKFLOW</p><h2>${esc(flow.name)}</h2><p class="workflow-intent">${esc(flow.intent)}</p><div class="workflow-chain">${flow.steps.map(renderNode).join('')}</div></section>`).join('');
  const empty = selection.invalid.length ? `<section class="workflow-empty"><h2>Unknown topology selector.</h2><p>${esc(selection.invalid.join(', '))}</p><p>Use a listed flow, system, or proof state.</p></section>` : '<section class="workflow-empty"><h2>No workflow matches.</h2><p>Remove one or more filters.</p></section>';
  const hiringLinks = '<a href="/recruiter-role-matrix/">Compare role fit</a><a href="/recruiter-proof/?role=recruiter">Recruiter proof</a><a href="/inventions/">Invention map</a>';
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><meta name="description" content="Proof-bound cross-repository workflow topology across the GlacierEQ job ecosystem."><meta name="robots" content="${filtered ? 'noindex,follow' : 'index,follow'}"><link rel="canonical" href="${canonical}"><title>Casey Barton · Workflow Topology</title><link rel="stylesheet" href="/assets/site.css"><link rel="stylesheet" href="/assets/site.systems.css"><link rel="stylesheet" href="/assets/site.complete.css"><link rel="stylesheet" href="/assets/site.interaction.css"><link rel="stylesheet" href="/assets/site.algerian.css"><link rel="stylesheet" href="/assets/site.workflows.css"><link rel="alternate" type="application/json" href="/data/workflow-topology.json" title="Machine-readable workflow topology"></head><body><a class="skip" href="#main">Skip to workflow topology</a><header class="site-header"><div class="shell nav"><a class="brand" href="/"><span class="mark">CB</span><span><strong>CASEY BARTON</strong><small>WORKFLOW TOPOLOGY</small></span></a><nav class="links" aria-label="Workflow filters">${flowLinks}</nav><a class="nav-cta" href="/recruiter-role-matrix/">Role matrix</a></div></header><main id="main" class="workflow-main"><section class="workflow-hero"><div class="shell"><p class="eyebrow">RECOVERED + REBOUND · CROSS-REPOSITORY COMPOSITION</p><h1>See how the systems actually work together.</h1><p class="lead">The historical combination-flow mechanism is rebound to the current proof graph. Every node carries its owning repository, evidence state, current ceiling, and exact contribution to the flow.</p><div class="workflow-filter" aria-label="Hiring proof shortcuts">${hiringLinks}</div><div class="workflow-filter" aria-label="System filters">${systemLinks}</div></div></section><div class="shell workflow-grid">${cards || empty}<section class="workflow-receipt"><p class="eyebrow">RESTORATION RECEIPT</p><p>Donor <code>${DONOR_COMMIT.slice(0, 12)}</code> → contraction <code>${CONTRACTION_COMMIT.slice(0, 12)}</code> → current proof source <code>${PORTFOLIO_COMMIT.slice(0, 12)}</code>.</p><p>Topology receipt <code>${topology.receipt_sha256}</code></p><p class="workflow-machine"><a href="/data/workflow-topology.json">Inspect machine-readable topology →</a></p></section></div></main></body></html>`;
}
function securityHeaders(res) {
  res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'none'; style-src 'self'; img-src 'self' data:; connect-src 'none'; font-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'; form-action 'self' mailto:; upgrade-insecure-requests");
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin'); res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=()'); res.setHeader('X-Content-Type-Options', 'nosniff'); res.setHeader('X-Frame-Options', 'DENY'); res.setHeader('Cross-Origin-Opener-Policy', 'same-origin'); res.setHeader('X-GlacierEQ-Workflow-Source', PORTFOLIO_COMMIT); res.setHeader('X-PSYSOCX-Release', RELEASE);
}
function send(res, status, type, body, cache = 'public, max-age=0, must-revalidate') { const bytes = Buffer.isBuffer(body) ? body : Buffer.from(String(body)); securityHeaders(res); res.statusCode = status; res.setHeader('Content-Type', type); res.setHeader('Cache-Control', cache); res.setHeader('Content-Length', String(bytes.length)); res.end(bytes); }
async function verify(res) {
  try {
    const topology = await loadTopology(); const allIds = new Set(topology.flows.flatMap((flow) => flow.steps.map((step) => step.system.id)));
    requireValue(topology.flows.length === FLOW_BLUEPRINTS.length, 'workflow_verify_flow_count'); requireValue(topology.edges.length >= 8, 'workflow_verify_edge_count'); requireValue(allIds.size >= 7, 'workflow_verify_system_diversity'); requireValue(/^[a-f0-9]{64}$/.test(topology.receipt_sha256), 'workflow_verify_receipt');
    send(res, 200, 'application/json; charset=utf-8', JSON.stringify({ schema: VERIFY_SCHEMA, status: 'PASS', release: RELEASE, portfolio_commit: PORTFOLIO_COMMIT, donor_commit: DONOR_COMMIT, contraction_commit: CONTRACTION_COMMIT, flow_count: topology.flows.length, edge_count: topology.edges.length, system_count: allIds.size, receipt_sha256: topology.receipt_sha256, public_contract: { scripts: 0, inline_styles: 0, machine_json: true, server_filters: true, recruiter_role_matrix_entry: true } }, null, 2), 'no-store');
  } catch (error) { send(res, 503, 'application/json; charset=utf-8', JSON.stringify({ schema: VERIFY_SCHEMA, status: 'FAIL', release: RELEASE, error: error instanceof Error ? error.message : String(error) }, null, 2), 'no-store'); }
}
module.exports = async function workflowTopologyProxy(req, res) {
  const path = requestPath(req);
  if (path === '__workflow_topology_verify') return verify(res);
  if (path === 'assets/site.workflows.css') return send(res, 200, 'text/css; charset=utf-8', CSS);
  if (path === 'data/workflow-topology.json') { try { const topology = await loadTopology(); return send(res, 200, 'application/json; charset=utf-8', JSON.stringify(topology, null, 2)); } catch (error) { return send(res, 503, 'application/json; charset=utf-8', JSON.stringify({ schema: SCHEMA, status: 'FAIL_CLOSED', error: error instanceof Error ? error.message : String(error) }, null, 2), 'no-store'); } }
  if (path === 'workflows' || path === 'workflows/index.html') { try { const topology = await loadTopology(); return send(res, 200, 'text/html; charset=utf-8', renderHtml(topology, selectFlows(req, topology))); } catch (error) { return send(res, 503, 'application/json; charset=utf-8', JSON.stringify({ schema: SCHEMA, status: 'FAIL_CLOSED', error: error instanceof Error ? error.message : String(error) }, null, 2), 'no-store'); } }
  res.statusCode = 404; res.end('Not found');
};
module.exports.handles = handles;
module.exports.constants = { PORTFOLIO_COMMIT, DONOR_COMMIT, CONTRACTION_COMMIT, RELEASE, SCHEMA, VERIFY_SCHEMA, FLOW_BLUEPRINTS };
module.exports.buildTopology = buildTopology;
module.exports.selectFlows = selectFlows;
module.exports.renderHtml = renderHtml;

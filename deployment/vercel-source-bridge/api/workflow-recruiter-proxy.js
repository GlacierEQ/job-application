const crypto = require('node:crypto');
const { URL } = require('node:url');
const workflowTopologyProxy = require('./workflow-topology-proxy.js');

const RELEASE = 'V30-RECRUITER-PROOF-RUNTIME';
const SCHEMA = 'glaciereq.public-recruiter-proof.v1';
const VERIFY_SCHEMA = 'glaciereq.v30-recruiter-proof-runtime-verification.v1';
const GITHUB_API = 'https://api.github.com';
const FETCH_TIMEOUT_MS = 10_000;
const MAX_BYTES = 2 * 1024 * 1024;
const ROLE_WEIGHTS = Object.freeze({
  recruiter: Object.freeze({ 'job-application': 8, helix: 7, 'receipt-router': 5, 'doctor-strange': 2, 'pro-code-runtime': 2 }),
  'engineering-lead': Object.freeze({ 'pro-code-runtime': 8, 'tower-of-babel': 7, helix: 5, akos: 4, 'doctor-strange': 3 }),
  'systems-architect': Object.freeze({ akos: 8, 'sigma-glue': 8, 'doctor-strange': 7, 'tower-of-babel': 6, 'pro-code-runtime': 5, 'receipt-router': 4 }),
});
const VERIFICATION_SOURCES = Object.freeze({
  'GlacierEQ/AKOS': Object.freeze(['APEX Estate Non-Regression']),
  'GlacierEQ/Pro-DOCTOR-STRANGE': Object.freeze(['verify', 'Verification', 'CI']),
  'GlacierEQ/job-app-helix': Object.freeze(['CI', 'Helix Candidate Profile Proof']),
  'GlacierEQ/job-application': Object.freeze(['CI', 'APEX Recruiter Proof Brief', 'APEX Estate Non-Regression', 'Portfolio truth gate']),
  'GlacierEQ/pro-code': Object.freeze(['Pro-Code native verification']),
  'GlacierEQ/sigma-glue': Object.freeze(['verify']),
  'GlacierEQ/the-tower-of-babel': Object.freeze(['Tower Verification']),
  'GlacierEQ/xai-colossus-2': Object.freeze(['CI']),
});

function stableStringify(value) {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}
function sha256(value) { return crypto.createHash('sha256').update(value).digest('hex'); }
function receipt(value) { return sha256(stableStringify(value)); }
function esc(value) {
  return String(value ?? '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#39;');
}
function requireValue(condition, message) { if (!condition) throw new Error(message); }
function requestUrl(req) { return new URL(String(req?.url || '/'), 'https://glaciereq.invalid'); }
function requestPath(req) {
  const parsed = requestUrl(req); const values = parsed.searchParams.getAll('path'); const raw = values.length ? values.join('/') : parsed.pathname;
  return String(raw).replace(/^\/+|\/+$/g, '');
}
function handles(rawPath) {
  const path = String(rawPath || '').replace(/^\/+|\/+$/g, '');
  return path === 'recruiter-proof' || path === 'recruiter-proof/index.html' || path === 'data/recruiter-proof.json' || path === '__recruiter_proof_verify';
}
function repositoryName(repoUrl) {
  const prefix = 'https://github.com/';
  requireValue(typeof repoUrl === 'string' && repoUrl.startsWith(prefix), `recruiter_repo_boundary:${repoUrl}`);
  const repository = repoUrl.slice(prefix.length).replace(/\/$/, '');
  requireValue(/^GlacierEQ\/[A-Za-z0-9_.-]+$/.test(repository), `recruiter_repo_invalid:${repository}`);
  return repository;
}
function freshnessWeight(ageDays) {
  requireValue(Number.isInteger(ageDays) && ageDays >= 0, 'recruiter_invalid_age');
  if (ageDays <= 30) return 1;
  if (ageDays <= 90) return 0.85;
  if (ageDays <= 180) return 0.65;
  if (ageDays <= 365) return 0.4;
  return 0.2;
}
function freshnessState(weight) { return weight === 1 ? 'fresh' : weight >= 0.65 ? 'aging' : 'stale'; }

async function fetchJson(url, fetchImpl = fetch) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const response = await fetchImpl(url, {
      headers: { accept: 'application/vnd.github+json', 'user-agent': `GlacierEQ-${RELEASE}/1.0`, 'x-github-api-version': '2022-11-28' },
      signal: controller.signal,
      redirect: 'error',
    });
    requireValue(response.ok, `recruiter_github_http_${response.status}:${url}`);
    const declared = Number(response.headers?.get?.('content-length') || 0);
    requireValue(!declared || declared <= MAX_BYTES, 'recruiter_github_declared_too_large');
    const bytes = Buffer.from(await response.arrayBuffer());
    requireValue(bytes.length > 0 && bytes.length <= MAX_BYTES, 'recruiter_github_body_size');
    return JSON.parse(bytes.toString('utf8'));
  } catch (error) {
    if (error?.name === 'AbortError') throw new Error('recruiter_github_fetch_timeout');
    throw error;
  } finally { clearTimeout(timer); }
}

function selectVerificationRun(payload, repository) {
  const allowed = VERIFICATION_SOURCES[repository];
  if (!allowed) return null;
  const runs = Array.isArray(payload?.workflow_runs) ? payload.workflow_runs : [];
  const candidates = runs.filter((run) => (
    run?.status === 'completed'
    && run?.conclusion === 'success'
    && allowed.includes(run?.name)
    && typeof run?.head_sha === 'string'
    && /^[a-f0-9]{40}$/.test(run.head_sha)
    && typeof run?.updated_at === 'string'
    && !Number.isNaN(Date.parse(run.updated_at))
  ));
  candidates.sort((a, b) => Date.parse(b.updated_at) - Date.parse(a.updated_at) || Number(b.id || 0) - Number(a.id || 0));
  return candidates[0] || null;
}

async function deriveFreshness(topology, { asOf = new Date(), fetchImpl = fetch } = {}) {
  requireValue(topology?.schema === 'glaciereq.workflow-topology.v1', 'recruiter_topology_schema');
  requireValue(asOf instanceof Date && !Number.isNaN(asOf.getTime()), 'recruiter_invalid_as_of');
  const systems = new Map();
  for (const flow of topology.flows || []) {
    for (const step of flow.steps || []) systems.set(step.system.id, step.system);
  }
  requireValue(systems.size > 0, 'recruiter_topology_systems_missing');
  const entries = [];
  const missing = [];
  const cache = new Map();
  for (const [systemId, system] of [...systems.entries()].sort(([a], [b]) => a.localeCompare(b))) {
    const repository = repositoryName(system.repo);
    if (!VERIFICATION_SOURCES[repository]) {
      missing.push({ id: systemId, repository, reason: 'verification_source_not_registered' });
      continue;
    }
    let payload = cache.get(repository);
    if (!payload) {
      try {
        payload = await fetchJson(`${GITHUB_API}/repos/${repository}/actions/runs?per_page=50`, fetchImpl);
        cache.set(repository, payload);
      } catch (error) {
        missing.push({ id: systemId, repository, reason: `repository_verification_unavailable:${error instanceof Error ? error.message : String(error)}` });
        continue;
      }
    }
    const run = selectVerificationRun(payload, repository);
    if (!run) {
      missing.push({ id: systemId, repository, reason: 'registered_verification_run_not_found' });
      continue;
    }
    const verifiedAt = new Date(run.updated_at);
    const ageDays = Math.floor((asOf.getTime() - verifiedAt.getTime()) / 86400000);
    if (ageDays < 0) {
      missing.push({ id: systemId, repository, reason: 'verification_timestamp_in_future' });
      continue;
    }
    const weight = freshnessWeight(ageDays);
    entries.push({
      id: systemId,
      repository,
      commit_sha: run.head_sha,
      verified_at: verifiedAt.toISOString(),
      age_days: ageDays,
      freshness_weight: weight,
      state: freshnessState(weight),
      verification_workflow: run.name,
      verification_run_id: run.id,
      verification_url: run.html_url,
    });
  }
  const core = {
    schema: 'glaciereq.public-evidence-freshness.v1',
    as_of: asOf.toISOString(),
    topology_receipt_sha256: topology.receipt_sha256,
    verification_source_policy: 'explicit registered workflow names only; missing or unavailable proof receives zero ranking credit',
    entries,
    missing_systems: missing,
  };
  return { ...core, receipt_sha256: receipt(core) };
}

function rankFlows(topology, role, freshness) {
  const weights = ROLE_WEIGHTS[role];
  requireValue(weights, `recruiter_unknown_role:${role}`);
  const freshnessById = new Map(freshness.entries.map((entry) => [entry.id, entry]));
  const ranked = topology.flows.map((flow) => {
    let staticRoleScore = 0;
    let freshnessAdjustedRoleScore = 0;
    const proofWeights = [];
    const proofPoints = flow.steps.map((step) => {
      const systemId = step.system.id;
      const roleWeight = weights[systemId] || 0;
      const evidence = freshnessById.get(systemId);
      const weight = evidence ? evidence.freshness_weight : 0;
      const weightedContribution = Math.round(roleWeight * weight * 1e6) / 1e6;
      staticRoleScore += roleWeight;
      freshnessAdjustedRoleScore += weightedContribution;
      proofWeights.push(weight);
      return {
        system_id: systemId,
        contribution: step.transition || '',
        evidence: step.system.evidence,
        current_ceiling: step.system.limit,
        repository: step.system.repo,
        role_weight: roleWeight,
        freshness_weight: weight,
        freshness_state: evidence?.state || 'unverified',
        age_days: evidence?.age_days ?? null,
        commit_sha: evidence?.commit_sha ?? null,
        verified_at: evidence?.verified_at ?? null,
        verification_workflow: evidence?.verification_workflow ?? null,
        verification_url: evidence?.verification_url ?? null,
        weighted_contribution: weightedContribution,
      };
    });
    const breadthBonus = Math.min(new Set(flow.steps.map((step) => step.system.id)).size, 4);
    const breadthFactor = proofWeights.length ? proofWeights.reduce((sum, value) => sum + value, 0) / proofWeights.length : 0;
    const adjustedBreadth = Math.round(breadthBonus * breadthFactor * 1e6) / 1e6;
    const score = Math.round((freshnessAdjustedRoleScore + adjustedBreadth) * 1e6) / 1e6;
    return {
      flow_id: flow.id,
      name: flow.name,
      intent: flow.intent || '',
      score,
      static_role_score: staticRoleScore,
      freshness_adjusted_role_score: Math.round(freshnessAdjustedRoleScore * 1e6) / 1e6,
      breadth_bonus: breadthBonus,
      freshness_adjusted_breadth_bonus: adjustedBreadth,
      proof_points: proofPoints,
    };
  });
  ranked.sort((a, b) => b.score - a.score || a.flow_id.localeCompare(b.flow_id));
  return ranked;
}

async function buildPublicRecruiterProof(topology, role, options = {}) {
  requireValue(ROLE_WEIGHTS[role], `recruiter_unknown_role:${role}`);
  const freshness = await deriveFreshness(topology, options);
  const ranked = rankFlows(topology, role, freshness);
  const core = {
    schema: SCHEMA,
    release: RELEASE,
    role,
    topology_receipt_sha256: topology.receipt_sha256,
    freshness_receipt_sha256: freshness.receipt_sha256,
    ranking_policy: {
      role_weights: ROLE_WEIGHTS[role],
      freshness: 'role contribution multiplied by registered live verification freshness; missing proof scores zero',
      breadth_bonus: 'min(unique_system_count, 4) scaled by mean freshness across the full proof chain',
      tie_breaker: 'flow_id ascending',
    },
    coverage: { verified_systems: freshness.entries.length, unverified_systems: freshness.missing_systems.length },
    missing_systems: freshness.missing_systems,
    briefs: ranked,
  };
  return { ...core, receipt_sha256: receipt(core) };
}

function securityHeaders(res) {
  res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'none'; style-src 'self'; img-src 'self' data:; connect-src 'none'; font-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'; form-action 'self' mailto:; upgrade-insecure-requests");
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=()');
  res.setHeader('X-Content-Type-Options', 'nosniff'); res.setHeader('X-Frame-Options', 'DENY'); res.setHeader('Cross-Origin-Opener-Policy', 'same-origin'); res.setHeader('X-PSYSOCX-Release', RELEASE);
}
function send(res, status, type, body, cache = 'public, max-age=0, s-maxage=300, must-revalidate') {
  const bytes = Buffer.from(String(body)); securityHeaders(res); res.statusCode = status; res.setHeader('Content-Type', type); res.setHeader('Cache-Control', cache); res.setHeader('Content-Length', String(bytes.length)); res.end(bytes);
}
function renderHtml(proof) {
  const roleLinks = Object.keys(ROLE_WEIGHTS).map((role) => `<a href="/recruiter-proof/?role=${encodeURIComponent(role)}">${esc(role)}</a>`).join(' · ');
  const cards = proof.briefs.map((brief, index) => `<section class="workflow-card"><p class="eyebrow">#${index + 1} · ${esc(proof.role)}</p><h2>${esc(brief.name)}</h2><p>${esc(brief.intent)}</p><p><b>Freshness-adjusted score:</b> ${esc(brief.score)} <span>· static ${esc(brief.static_role_score)}</span></p><div class="workflow-chain">${brief.proof_points.map((point) => `<article class="workflow-node"><h3>${esc(point.system_id)}</h3><p><b>Contribution:</b> ${esc(point.contribution)}</p><p><b>Evidence:</b> ${esc(point.evidence)}</p><p><b>Freshness:</b> ${esc(point.freshness_state)}${point.age_days === null ? '' : ` · ${esc(point.age_days)} days`}</p><p><b>Current ceiling:</b> ${esc(point.current_ceiling)}</p><a href="${esc(point.repository)}" target="_blank" rel="noopener">Inspect source →</a></article>`).join('')}</div></section>`).join('');
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,follow"><link rel="canonical" href="https://casey-barton-glaciereq.vercel.app/recruiter-proof/"><title>Casey Barton · Recruiter Proof</title><link rel="stylesheet" href="/assets/site.css"><link rel="stylesheet" href="/assets/site.systems.css"><link rel="stylesheet" href="/assets/site.workflows.css"></head><body><main class="workflow-main"><section class="workflow-hero"><div class="shell"><p class="eyebrow">LIVE REGISTERED VERIFICATION · ROLE-SELECTED PROOF</p><h1>Recruiter proof, ranked by relevance and verification freshness.</h1><p>${roleLinks}</p><p>Verified systems: ${esc(proof.coverage.verified_systems)} · Unverified systems: ${esc(proof.coverage.unverified_systems)}</p></div></section><div class="shell workflow-grid">${cards}<section class="workflow-receipt"><p>Recruiter proof receipt <code>${esc(proof.receipt_sha256)}</code></p><p><a href="/data/recruiter-proof.json?role=${encodeURIComponent(proof.role)}">Machine-readable recruiter proof →</a></p></section></div></main></body></html>`;
}

async function verify(res) {
  try {
    const topology = await workflowTopologyProxy.loadTopology();
    const proof = await buildPublicRecruiterProof(topology, 'recruiter');
    requireValue(proof.briefs.length > 0, 'recruiter_verify_briefs');
    requireValue(proof.coverage.verified_systems > 0, 'recruiter_verify_coverage');
    requireValue(/^[a-f0-9]{64}$/.test(proof.receipt_sha256), 'recruiter_verify_receipt');
    send(res, 200, 'application/json; charset=utf-8', JSON.stringify({ schema: VERIFY_SCHEMA, status: 'PASS', release: RELEASE, role: proof.role, verified_systems: proof.coverage.verified_systems, unverified_systems: proof.coverage.unverified_systems, top_flow: proof.briefs[0].flow_id, top_score: proof.briefs[0].score, topology_receipt_sha256: proof.topology_receipt_sha256, freshness_receipt_sha256: proof.freshness_receipt_sha256, recruiter_proof_receipt_sha256: proof.receipt_sha256 }, null, 2), 'no-store');
  } catch (error) {
    send(res, 503, 'application/json; charset=utf-8', JSON.stringify({ schema: VERIFY_SCHEMA, status: 'FAIL', release: RELEASE, error: error instanceof Error ? error.message : String(error) }, null, 2), 'no-store');
  }
}

module.exports = async function workflowRecruiterProxy(req, res) {
  const path = requestPath(req);
  if (path === '__recruiter_proof_verify') return verify(res);
  if (!handles(path)) { res.statusCode = 404; return res.end('Not found'); }
  const role = requestUrl(req).searchParams.get('role') || 'recruiter';
  if (!ROLE_WEIGHTS[role]) return send(res, 400, 'application/json; charset=utf-8', JSON.stringify({ schema: SCHEMA, status: 'INVALID_ROLE', role, allowed_roles: Object.keys(ROLE_WEIGHTS) }), 'no-store');
  try {
    const topology = await workflowTopologyProxy.loadTopology();
    const proof = await buildPublicRecruiterProof(topology, role);
    if (path === 'data/recruiter-proof.json') return send(res, 200, 'application/json; charset=utf-8', JSON.stringify(proof, null, 2));
    return send(res, 200, 'text/html; charset=utf-8', renderHtml(proof));
  } catch (error) {
    return send(res, 503, 'application/json; charset=utf-8', JSON.stringify({ schema: SCHEMA, status: 'FAIL_CLOSED', role, error: error instanceof Error ? error.message : String(error) }, null, 2), 'no-store');
  }
};
module.exports.handles = handles;
module.exports.constants = { RELEASE, SCHEMA, VERIFY_SCHEMA, ROLE_WEIGHTS, VERIFICATION_SOURCES };
module.exports.freshnessWeight = freshnessWeight;
module.exports.selectVerificationRun = selectVerificationRun;
module.exports.deriveFreshness = deriveFreshness;
module.exports.rankFlows = rankFlows;
module.exports.buildPublicRecruiterProof = buildPublicRecruiterProof;
module.exports.renderHtml = renderHtml;

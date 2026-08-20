const { URL } = require('node:url');
const gapRuntime = require('./recruiter-gap-analysis.js');

const RELEASE = 'V34-ROLE-TARGETED-RECRUITER-RECOVERY';
const PUBLIC_ORIGIN = 'https://casey-barton-glaciereq.vercel.app';
const ROLES = Object.freeze(['recruiter', 'engineering-lead', 'systems-architect']);

class RecruiterGapPageError extends Error {
  constructor(message, statusCode = 400) {
    super(message);
    this.statusCode = statusCode;
  }
}

function esc(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function requestRole(req) {
  const parsed = new URL(String(req?.url || '/'), 'https://glaciereq.invalid');
  const roles = parsed.searchParams.getAll('role').filter(Boolean);
  if (roles.length > 1) throw new RecruiterGapPageError('recruiter_gap_multiple_roles');
  const role = roles[0] || null;
  if (role && !ROLES.includes(role)) {
    throw new RecruiterGapPageError(`recruiter_gap_unknown_role:${role}`);
  }
  return role;
}

function renderOpportunity(entry, index) {
  return `<article class="workflow-node recruiter-gap-opportunity">
    <p class="eyebrow">PRIORITY ${index + 1} · ${esc(entry.role)}</p>
    <h3>${esc(entry.system_id)}</h3>
    <p><strong>Recoverable score:</strong> ${esc(entry.recoverable_score)} · <strong>Role weight:</strong> ${esc(entry.role_weight)} · <strong>Freshness:</strong> ${esc(entry.freshness_state)}</p>
    <p>${esc(entry.action)}</p>
    <div class="workflow-proof">
      <span><b>Flow:</b> ${esc(entry.flow_name)} (${esc(entry.flow_id)})</span>
      <span><b>Repository:</b> ${esc(entry.repository)}</span>
      <span><b>Verified:</b> ${esc(entry.verified_at || 'not established')}</span>
      <span><b>Current commit:</b> ${esc(entry.current_commit_sha || 'unverified')}</span>
    </div>
  </article>`;
}

function renderRoleSummary(role, summary, selectedRole) {
  const top = summary.top_opportunities[0];
  const recoveryLink = selectedRole === role
    ? '<a href="/recruiter-gap-analysis/">Compare all recovery priorities</a>'
    : `<a href="/recruiter-gap-analysis/?role=${encodeURIComponent(role)}">Prioritize evidence recovery for this role</a>`;
  return `<section class="workflow-card recruiter-gap-role" data-role="${esc(role)}">
    <p class="eyebrow">${esc(role.replaceAll('-', ' '))}</p>
    <h2>${esc(summary.current_top_flow)}</h2>
    <p><strong>Current top score:</strong> ${esc(summary.current_top_score)} · <strong>Recoverable:</strong> ${esc(summary.total_recoverable_score)}</p>
    <p>${top ? `Highest-value recovery: <b>${esc(top.system_id)}</b> (+${esc(top.recoverable_score)})` : 'All ranked proof is fully fresh for this role.'}</p>
    <p><a href="/recruiter-proof/?role=${encodeURIComponent(role)}">Inspect full proof for this role</a> · ${recoveryLink}</p>
  </section>`;
}

function selectRoleAnalysis(analysis, role) {
  if (!role) {
    return {
      roleEntries: Object.entries(analysis.roles),
      opportunities: analysis.global_top_opportunities,
    };
  }
  const summary = analysis.roles?.[role];
  if (!summary) throw new RecruiterGapPageError(`recruiter_gap_role_missing:${role}`, 503);
  return {
    roleEntries: [[role, summary]],
    opportunities: summary.top_opportunities,
  };
}

function renderGapAnalysisHtml(analysis, { role = null } = {}) {
  if (role && !ROLES.includes(role)) {
    throw new RecruiterGapPageError(`recruiter_gap_unknown_role:${role}`);
  }
  const selected = selectRoleAnalysis(analysis, role);
  const roleCards = selected.roleEntries
    .map(([entryRole, summary]) => renderRoleSummary(entryRole, summary, role))
    .join('');
  const opportunities = selected.opportunities
    .slice(0, 8)
    .map(renderOpportunity)
    .join('');
  const empty = '<section class="workflow-card"><h2>No evidence recovery required.</h2><p>The verified recruiter graph is fully fresh across the selected role surface.</p></section>';
  const canonical = role
    ? `${PUBLIC_ORIGIN}/recruiter-gap-analysis/?role=${encodeURIComponent(role)}`
    : `${PUBLIC_ORIGIN}/recruiter-gap-analysis/`;
  const robots = role ? 'noindex,follow' : 'index,follow';
  const eyebrow = role
    ? `ROLE-TARGETED RECOVERY · ${role.replaceAll('-', ' ').toUpperCase()}`
    : 'VERIFIED EVIDENCE RECOVERY · RECRUITER SCORE LEVERAGE';
  const heading = role
    ? `Refresh the proof that changes ${role.replaceAll('-', ' ')} signal most.`
    : 'Refresh the proof that changes hiring signal most.';
  const lead = role
    ? 'The verified role matrix is narrowed to one hiring lens, so every recovery action below directly restores score for that role.'
    : 'The same one-pass recruiter matrix now turns stale or missing proof into ordered evidence-recovery work. Fresh proof creates no work.';

  return `<!doctype html><html lang="en"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="description" content="Verified recruiter evidence recovery priorities ranked by recoverable hiring score.">
<meta name="robots" content="${robots}"><link rel="canonical" href="${canonical}">
<title>Casey Barton · Recruiter Evidence Recovery</title>
<link rel="stylesheet" href="/assets/site.css"><link rel="stylesheet" href="/assets/site.systems.css"><link rel="stylesheet" href="/assets/site.complete.css"><link rel="stylesheet" href="/assets/site.workflows.css">
<link rel="alternate" type="application/json" href="/data/recruiter-gap-analysis.json" title="Machine-readable recruiter evidence recovery priorities">
</head><body><main class="workflow-main"><header class="workflow-hero"><div class="shell"><p class="eyebrow">${esc(eyebrow)}</p><h1>${esc(heading)}</h1><p class="lead">${esc(lead)}</p><p><a href="/recruiter-role-matrix/">Compare role fit</a> · <a href="/data/recruiter-gap-analysis.json">Machine priorities</a>${role ? ' · <a href="/recruiter-gap-analysis/">All recovery priorities</a>' : ''}</p></div></header><div class="shell workflow-grid">${roleCards}<section class="workflow-receipt"><p class="eyebrow">${role ? `${esc(role.replaceAll('-', ' ').toUpperCase())} RECOVERY QUEUE` : 'GLOBAL RECOVERY QUEUE'}</p>${opportunities || empty}<p><strong>As of:</strong> ${esc(analysis.as_of)}</p><p><strong>Analysis receipt:</strong> <code>${esc(analysis.receipt_sha256)}</code></p><p><strong>Matrix receipt:</strong> <code>${esc(analysis.matrix_receipt_sha256)}</code></p></section></div></main></body></html>`;
}

function sendHtml(res, status, html, cacheControl) {
  const body = Buffer.from(html);
  res.statusCode = status;
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', cacheControl);
  res.setHeader('Content-Length', String(body.length));
  res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'none'; style-src 'self'; img-src 'self' data:; connect-src 'none'; font-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'; form-action 'self' mailto:; upgrade-insecure-requests");
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('X-PSYSOCX-Release', RELEASE);
  res.end(body);
}

async function serveGapAnalysisPage(req, res) {
  try {
    const role = requestRole(req);
    const analysis = await gapRuntime.buildPublicGapAnalysis();
    return sendHtml(
      res,
      200,
      renderGapAnalysisHtml(analysis, { role }),
      'public, max-age=0, s-maxage=300, must-revalidate',
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const status = error instanceof RecruiterGapPageError ? error.statusCode : 503;
    return sendHtml(
      res,
      status,
      `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="robots" content="noindex,nofollow"><title>Recruiter recovery priorities unavailable</title></head><body><main><h1>Recruiter recovery priorities unavailable</h1><p>${esc(message)}</p></main></body></html>`,
      'no-store',
    );
  }
}

module.exports = serveGapAnalysisPage;
module.exports.RELEASE = RELEASE;
module.exports.ROLES = ROLES;
module.exports.RecruiterGapPageError = RecruiterGapPageError;
module.exports.requestRole = requestRole;
module.exports.selectRoleAnalysis = selectRoleAnalysis;
module.exports.renderGapAnalysisHtml = renderGapAnalysisHtml;
module.exports.serveGapAnalysisPage = serveGapAnalysisPage;

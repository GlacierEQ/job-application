const { URL } = require('node:url');
const actionRuntime = require('./recruiter-action-runtime.js');

const RELEASE = 'V35-PUBLIC-RECRUITER-ACTION-PACKET';
const PUBLIC_ORIGIN = 'https://casey-barton-glaciereq.vercel.app';

class RecruiterActionPageError extends Error {
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
  if (roles.length !== 1) {
    throw new RecruiterActionPageError(
      roles.length === 0 ? 'recruiter_action_role_required' : 'recruiter_action_multiple_roles',
    );
  }
  const role = roles[0];
  if (!actionRuntime.SUPPORTED_ROLES.includes(role)) {
    throw new RecruiterActionPageError(`recruiter_action_unknown_role:${role}`);
  }
  return role;
}

function requestMaxActions(req) {
  const parsed = new URL(String(req?.url || '/'), 'https://glaciereq.invalid');
  const values = parsed.searchParams.getAll('max_actions').filter(Boolean);
  if (values.length > 1) throw new RecruiterActionPageError('recruiter_action_multiple_max_actions');
  if (!values.length) return 3;
  const parsedValue = Number(values[0]);
  if (!Number.isInteger(parsedValue) || parsedValue < 1 || parsedValue > 10) {
    throw new RecruiterActionPageError('recruiter_action_invalid_max_actions');
  }
  return parsedValue;
}

function renderProofPoint(point) {
  return `<li><strong>${esc(point.system_id)}</strong> · ${esc(point.freshness_state)} · weight ${esc(point.freshness_weight)}<br><span>${esc(point.contribution || 'verified contribution')}</span><br><code>${esc(point.commit_sha || 'verification identity not established')}</code></li>`;
}

function renderAction(action) {
  return `<article class="workflow-node recruiter-action-item">
    <p class="eyebrow">PRIORITY ${esc(action.priority)}</p>
    <h3>${esc(action.system_id)}</h3>
    <p><strong>Recoverable score:</strong> +${esc(action.recoverable_score)} · <strong>Freshness:</strong> ${esc(action.freshness_state)}</p>
    <p>${esc(action.action)}</p>
    <div class="workflow-proof">
      <span><b>Flow:</b> ${esc(action.flow_id)}</span>
      <span><b>Repository:</b> ${esc(action.repository)}</span>
      <span><b>Verified:</b> ${esc(action.verified_at || 'not established')}</span>
      <span><b>Current commit:</b> ${esc(action.current_commit_sha || 'unverified')}</span>
    </div>
  </article>`;
}

function renderActionPacketHtml(packet) {
  const roleLabel = packet.role.replaceAll('-', ' ');
  const proof = packet.current_fit.proof_points.map(renderProofPoint).join('');
  const actions = packet.recovery.actions.map(renderAction).join('');
  const recovery = actions || '<section class="workflow-card"><h2>Proof is current.</h2><p>No recruiter-score recovery work is required for this role.</p></section>';
  const canonical = `${PUBLIC_ORIGIN}/recruiter-action/?role=${encodeURIComponent(packet.role)}`;

  return `<!doctype html><html lang="en"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="description" content="Role-specific recruiter action packet binding current fit, proof state, and highest-value evidence recovery work.">
<meta name="robots" content="noindex,follow"><link rel="canonical" href="${canonical}">
<title>Casey Barton · ${esc(roleLabel)} Action Packet</title>
<link rel="stylesheet" href="/assets/site.css"><link rel="stylesheet" href="/assets/site.systems.css"><link rel="stylesheet" href="/assets/site.complete.css"><link rel="stylesheet" href="/assets/site.workflows.css">
<link rel="alternate" type="application/json" href="${esc(packet.reviewer_routes.machine_action_packet)}" title="Machine-readable recruiter action packet">
</head><body><main class="workflow-main"><header class="workflow-hero"><div class="shell"><p class="eyebrow">ROLE FIT → PROOF → ACTION</p><h1>${esc(roleLabel)} reviewer action packet.</h1><p class="lead">One verified role matrix binds the current leading fit to the exact evidence work that can recover the most hiring signal.</p><p><a href="${esc(packet.reviewer_routes.full_proof)}">Full proof</a> · <a href="${esc(packet.reviewer_routes.role_recovery)}">Recovery queue</a> · <a href="${esc(packet.reviewer_routes.role_matrix)}">Role matrix</a></p></div></header><div class="shell workflow-grid"><section class="workflow-card"><p class="eyebrow">CURRENT FIT</p><h2>${esc(packet.current_fit.top_flow_name)}</h2><p><strong>Score:</strong> ${esc(packet.current_fit.top_score)} · <strong>Status:</strong> ${esc(packet.status)}</p><ul>${proof}</ul></section><section class="workflow-receipt"><p class="eyebrow">HIGHEST-VALUE RECOVERY ACTIONS</p><p><strong>Total recoverable score:</strong> ${esc(packet.recovery.total_recoverable_score)} · <strong>Opportunities:</strong> ${esc(packet.recovery.opportunity_count)}</p>${recovery}<p><strong>As of:</strong> ${esc(packet.as_of)}</p><p><strong>Packet receipt:</strong> <code>${esc(packet.receipt_sha256)}</code></p><p><strong>Matrix receipt:</strong> <code>${esc(packet.matrix_receipt_sha256)}</code></p></section></div></main></body></html>`;
}

function commonHeaders(res, cacheControl) {
  res.setHeader('Cache-Control', cacheControl);
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('X-PSYSOCX-Release', RELEASE);
}

function sendJson(res, status, payload, cacheControl) {
  const body = Buffer.from(`${JSON.stringify(payload, null, 2)}\n`);
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  commonHeaders(res, cacheControl);
  res.setHeader('Content-Length', String(body.length));
  res.end(body);
}

function sendHtml(res, status, html, cacheControl) {
  const body = Buffer.from(html);
  res.statusCode = status;
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'none'; style-src 'self'; img-src 'self' data:; connect-src 'none'; font-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'; form-action 'self' mailto:; upgrade-insecure-requests");
  commonHeaders(res, cacheControl);
  res.setHeader('Content-Length', String(body.length));
  res.end(body);
}

async function recruiterActionPage(req, res) {
  const pathName = new URL(String(req?.url || '/'), 'https://glaciereq.invalid').pathname;
  const machine = pathName === '/data/recruiter-action-packet.json';
  try {
    const role = requestRole(req);
    const maxActions = requestMaxActions(req);
    const packet = await actionRuntime.buildPublicRecruiterActionPacket(role, { maxActions });
    if (machine) {
      return sendJson(res, 200, packet, 'public, max-age=0, s-maxage=300, must-revalidate');
    }
    return sendHtml(
      res,
      200,
      renderActionPacketHtml(packet),
      'public, max-age=0, s-maxage=300, must-revalidate',
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const status = error instanceof RecruiterActionPageError ? error.statusCode : 503;
    if (machine) {
      return sendJson(res, status, { schema: actionRuntime.SCHEMA, release: RELEASE, status: 'FAIL_CLOSED', error: message }, 'no-store');
    }
    return sendHtml(
      res,
      status,
      `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="robots" content="noindex,nofollow"><title>Recruiter action packet unavailable</title></head><body><main><h1>Recruiter action packet unavailable</h1><p>${esc(message)}</p></main></body></html>`,
      'no-store',
    );
  }
}

module.exports = recruiterActionPage;
module.exports.RELEASE = RELEASE;
module.exports.RecruiterActionPageError = RecruiterActionPageError;
module.exports.requestRole = requestRole;
module.exports.requestMaxActions = requestMaxActions;
module.exports.renderActionPacketHtml = renderActionPacketHtml;

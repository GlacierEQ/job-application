const { URL } = require('node:url');
const actionRuntime = require('./recruiter-action-runtime.js');

const RELEASE = 'V36-RECRUITER-REVIEW-HUB';
const PUBLIC_ORIGIN = 'https://casey-barton-glaciereq.vercel.app';

class RecruiterReviewPageError extends Error {}

function esc(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function parseMaxActions(req) {
  const url = new URL(String(req?.url || '/recruiter-review/'), 'https://glaciereq.invalid');
  const values = url.searchParams.getAll('max_actions');
  if (values.length > 1) throw new RecruiterReviewPageError('multiple_max_actions');
  if (!values.length) return 3;
  if (!/^\d+$/.test(values[0])) throw new RecruiterReviewPageError('invalid_max_actions');
  const value = Number(values[0]);
  if (!Number.isInteger(value) || value < 1 || value > 10) {
    throw new RecruiterReviewPageError('invalid_max_actions');
  }
  return value;
}

function roleLabel(role) {
  return role.replaceAll('-', ' ');
}

function renderProofPoint(point) {
  const freshness = `${point.freshness_state || 'unverified'} · weight ${Number(point.freshness_weight || 0).toFixed(2)}`;
  const age = point.age_days === null || point.age_days === undefined ? 'age unavailable' : `${point.age_days} days old`;
  return `<li><strong>${esc(point.system_id)}</strong> · ${esc(freshness)} · ${esc(age)}<br><span>${esc(point.contribution || '')}</span></li>`;
}

function renderAction(action) {
  return `<li><strong>#${esc(action.priority)} ${esc(action.system_id)}</strong> · recoverable +${esc(action.recoverable_score)}<br><span>${esc(action.action)}</span></li>`;
}

function renderRoleCard(packet) {
  const proof = packet.current_fit.proof_points.length
    ? `<ul>${packet.current_fit.proof_points.map(renderProofPoint).join('')}</ul>`
    : '<p>No verified proof points surfaced for the leading flow.</p>';
  const actions = packet.recovery.actions.length
    ? `<ol>${packet.recovery.actions.map(renderAction).join('')}</ol>`
    : '<p>Current proof has no recoverable freshness gap for this role.</p>';
  return `<section class="workflow-card recruiter-review-role" data-role="${esc(packet.role)}">
    <p class="eyebrow">${esc(roleLabel(packet.role))}</p>
    <h2>${esc(packet.current_fit.top_flow_name)}</h2>
    <p><strong>Current score:</strong> ${esc(packet.current_fit.top_score)} · <strong>Recoverable:</strong> +${esc(packet.recovery.total_recoverable_score)} · <strong>Status:</strong> ${esc(packet.status)}</p>
    <h3>Leading proof</h3>${proof}
    <h3>Highest-value recovery actions</h3>${actions}
    <p><a href="${esc(packet.reviewer_routes.full_proof)}">Full proof</a> · <a href="${esc(packet.reviewer_routes.role_recovery)}">Recovery queue</a> · <a href="${esc(packet.reviewer_routes.action_packet)}">Focused action packet</a></p>
    <p><small>Packet receipt <code>${esc(packet.receipt_sha256)}</code></small></p>
  </section>`;
}

function renderReviewHtml(matrix) {
  if (matrix?.schema !== actionRuntime.ACTION_MATRIX_SCHEMA) {
    throw new RecruiterReviewPageError('review_matrix_schema');
  }
  const cards = matrix.roles.map((role) => {
    const packet = matrix.packets?.[role];
    if (!packet) throw new RecruiterReviewPageError(`review_packet_missing:${role}`);
    return renderRoleCard(packet);
  }).join('');
  return `<!doctype html><html lang="en"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="description" content="Compare role fit, exact proof state, and highest-value evidence recovery actions across three hiring lenses from one verified evidence snapshot.">
<meta name="robots" content="index,follow"><link rel="canonical" href="${PUBLIC_ORIGIN}/recruiter-review/">
<title>Casey Barton · Recruiter Review Hub</title>
<link rel="stylesheet" href="/assets/site.css"><link rel="stylesheet" href="/assets/site.systems.css"><link rel="stylesheet" href="/assets/site.complete.css"><link rel="stylesheet" href="/assets/site.workflows.css">
</head><body><main class="workflow-main"><header class="workflow-hero"><div class="shell">
<p class="eyebrow">ROLE FIT → PROOF → RECOVERY → ACTION</p><h1>Review the strongest hiring signal from one exact evidence pass.</h1>
<p class="lead">Recruiter, engineering lead, and systems architect views share the same role matrix and freshness snapshot, so fit, proof age, recoverable score, and next evidence actions stay comparable instead of drifting across separate requests.</p>
</div></header><div class="shell workflow-grid">${cards}<section class="workflow-receipt">
<p><strong>As of:</strong> ${esc(matrix.as_of)}</p><p><strong>Verification passes:</strong> ${esc(matrix.verification_passes)}</p>
<p><strong>Matrix receipt:</strong> <code>${esc(matrix.matrix_receipt_sha256)}</code></p><p><strong>Freshness receipt:</strong> <code>${esc(matrix.freshness_receipt_sha256)}</code></p>
<p><strong>Review receipt:</strong> <code>${esc(matrix.receipt_sha256)}</code></p>
<p><a href="/recruiter-role-matrix/">Role matrix</a> · <a href="/recruiter-gap-analysis/">Global recovery queue</a></p>
</section></div></main></body></html>`;
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

module.exports = async function recruiterReviewPage(req, res) {
  try {
    const maxActions = parseMaxActions(req);
    const matrix = await actionRuntime.buildPublicRecruiterActionMatrix({ maxActions });
    return sendHtml(
      res,
      200,
      renderReviewHtml(matrix),
      'public, max-age=0, s-maxage=300, must-revalidate',
    );
  } catch (error) {
    const status = error instanceof RecruiterReviewPageError ? 400 : 503;
    const message = error instanceof Error ? error.message : String(error);
    return sendHtml(
      res,
      status,
      `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="robots" content="noindex,nofollow"><title>Recruiter review unavailable</title></head><body><main><h1>Recruiter review unavailable</h1><p>${esc(message)}</p></main></body></html>`,
      'no-store',
    );
  }
};

module.exports.RELEASE = RELEASE;
module.exports.RecruiterReviewPageError = RecruiterReviewPageError;
module.exports.parseMaxActions = parseMaxActions;
module.exports.renderReviewHtml = renderReviewHtml;

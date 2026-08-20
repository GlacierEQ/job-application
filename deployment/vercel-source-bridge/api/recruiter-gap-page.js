const gapRuntime = require('./recruiter-gap-analysis.js');

const RELEASE = 'V33-RECRUITER-GAP-PAGE';
const PUBLIC_ORIGIN = 'https://casey-barton-glaciereq.vercel.app';

function esc(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
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

function renderRoleSummary(role, summary) {
  const top = summary.top_opportunities[0];
  return `<section class="workflow-card recruiter-gap-role" data-role="${esc(role)}">
    <p class="eyebrow">${esc(role.replaceAll('-', ' '))}</p>
    <h2>${esc(summary.current_top_flow)}</h2>
    <p><strong>Current top score:</strong> ${esc(summary.current_top_score)} · <strong>Recoverable:</strong> ${esc(summary.total_recoverable_score)}</p>
    <p>${top ? `Highest-value recovery: <b>${esc(top.system_id)}</b> (+${esc(top.recoverable_score)})` : 'All ranked proof is fully fresh for this role.'}</p>
    <p><a href="/recruiter-proof/?role=${encodeURIComponent(role)}">Inspect full proof for this role</a></p>
  </section>`;
}

function renderGapAnalysisHtml(analysis) {
  const roleCards = Object.entries(analysis.roles)
    .map(([role, summary]) => renderRoleSummary(role, summary))
    .join('');
  const opportunities = analysis.global_top_opportunities
    .slice(0, 8)
    .map(renderOpportunity)
    .join('');
  const empty = '<section class="workflow-card"><h2>No evidence recovery required.</h2><p>The verified recruiter graph is fully fresh across the ranked role surfaces.</p></section>';

  return `<!doctype html><html lang="en"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="description" content="Verified recruiter evidence recovery priorities ranked by recoverable hiring score.">
<meta name="robots" content="index,follow"><link rel="canonical" href="${PUBLIC_ORIGIN}/recruiter-gap-analysis/">
<title>Casey Barton · Recruiter Evidence Recovery</title>
<link rel="stylesheet" href="/assets/site.css"><link rel="stylesheet" href="/assets/site.systems.css"><link rel="stylesheet" href="/assets/site.complete.css"><link rel="stylesheet" href="/assets/site.workflows.css">
<link rel="alternate" type="application/json" href="/data/recruiter-gap-analysis.json" title="Machine-readable recruiter evidence recovery priorities">
</head><body><main class="workflow-main"><header class="workflow-hero"><div class="shell"><p class="eyebrow">VERIFIED EVIDENCE RECOVERY · RECRUITER SCORE LEVERAGE</p><h1>Refresh the proof that changes hiring signal most.</h1><p class="lead">The same one-pass recruiter matrix now turns stale or missing proof into ordered evidence-recovery work. Fresh proof creates no work.</p><p><a href="/recruiter-role-matrix/">Compare role fit</a> · <a href="/data/recruiter-gap-analysis.json">Machine priorities</a></p></div></header><div class="shell workflow-grid">${roleCards}<section class="workflow-receipt"><p class="eyebrow">GLOBAL RECOVERY QUEUE</p>${opportunities || empty}<p><strong>As of:</strong> ${esc(analysis.as_of)}</p><p><strong>Analysis receipt:</strong> <code>${esc(analysis.receipt_sha256)}</code></p><p><strong>Matrix receipt:</strong> <code>${esc(analysis.matrix_receipt_sha256)}</code></p></section></div></main></body></html>`;
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
    const analysis = await gapRuntime.buildPublicGapAnalysis();
    return sendHtml(
      res,
      200,
      renderGapAnalysisHtml(analysis),
      'public, max-age=0, s-maxage=300, must-revalidate',
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return sendHtml(
      res,
      503,
      `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="robots" content="noindex,nofollow"><title>Recruiter recovery priorities unavailable</title></head><body><main><h1>Recruiter recovery priorities unavailable</h1><p>${esc(message)}</p></main></body></html>`,
      'no-store',
    );
  }
}

module.exports = serveGapAnalysisPage;
module.exports.RELEASE = RELEASE;
module.exports.renderGapAnalysisHtml = renderGapAnalysisHtml;
module.exports.serveGapAnalysisPage = serveGapAnalysisPage;

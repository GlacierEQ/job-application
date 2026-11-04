'use strict';

// Public, read-only evidence verification. Never accepts arbitrary repositories, URLs or tokens.
// A GitHub receipt proves only its precisely stated observation, not customer adoption.
const CLAIMS = Object.freeze({
  'public-action': {
    label: 'Governed APEX public action',
    kind: 'workflow',
    repository: 'GlacierEQ/public-actions-runner-host',
    runId: 31280194602,
    sha: 'e012d913c4646816d25de831ff642cedb9290a9d',
    verifiedMeaning: 'GitHub Actions completed successfully at the pinned commit',
    boundary: 'One governed execution path. Not proof that every workload, route or customer deployment succeeded.'
  },
  'provider-recovery': {
    label: 'Provider-aware execution recovery',
    kind: 'commit',
    repository: 'GlacierEQ/sigma-glue',
    sha: '4a1ca8e5c88a62e8a94a43213b2c509af6afcea3',
    verifiedMeaning: 'The exact provider-recovery source commit exists on GitHub',
    boundary: 'Source existence is not a live production, throughput or customer-outcome measurement.'
  },
  'dispatch-fencing': {
    label: 'At-most-once dispatch fencing',
    kind: 'commit',
    repository: 'GlacierEQ/sigma-glue',
    sha: '80f6ca8f3fb7dd54cbbe261f867ca1d9bd22a99b',
    verifiedMeaning: 'The exact dispatch-hardening source commit exists on GitHub',
    boundary: 'Source existence does not independently prove the test count or operational SLOs.'
  }
});

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[char]));
}

function receiptUrl(claim) {
  const root = 'https://api.github.com/repos/' + claim.repository;
  return claim.kind === 'workflow'
    ? root + '/actions/runs/' + claim.runId
    : root + '/commits/' + claim.sha;
}
function browserUrl(claim) {
  const root = 'https://github.com/' + claim.repository;
  return claim.kind === 'workflow'
    ? root + '/actions/runs/' + claim.runId
    : root + '/commit/' + claim.sha;
}

async function inspectClaim(id, fetchImpl = globalThis.fetch) {
  if (!Object.prototype.hasOwnProperty.call(CLAIMS, id)) {
    return { status: 'INVALID', title: 'Unknown proof', detail: 'Choose a listed proof.', observed_at: new Date().toISOString() };
  }
  const claim = CLAIMS[id];
  const observed_at = new Date().toISOString();
  const report = {
    schema: 'glaciereq.public-proof-inspector.v1',
    claim_id: id,
    title: claim.label,
    source: browserUrl(claim),
    expected_commit: claim.sha,
    observation: claim.verifiedMeaning,
    boundary: claim.boundary,
    observed_at,
    status: 'UNAVAILABLE'
  };
  try {
    const response = await fetchImpl(receiptUrl(claim), {
      headers: { Accept: 'application/vnd.github+json', 'User-Agent': 'GlacierEQ-Public-Proof-Inspector' },
      signal: AbortSignal.timeout(7000)
    });
    report.http_status = response.status;
    if (!response.ok) {
      report.detail = 'Source unavailable or rate-limited. This is not a finding of failure.';
      return report;
    }
    const data = await response.json();
    if (!data || typeof data !== 'object') {
      report.detail = 'Provider returned an unreadable response.';
      return report;
    }
    if (claim.kind === 'workflow') {
      report.observed_commit = typeof data.head_sha === 'string' ? data.head_sha : null;
      report.workflow_status = data.status || null;
      report.workflow_conclusion = data.conclusion || null;
      report.status = data.status === 'completed' && data.conclusion === 'success' && data.head_sha === claim.sha
        ? 'MATCH' : 'NOT_MATCHED';
      report.detail = report.status === 'MATCH'
        ? 'Recorded workflow run matches the expected completed successful run and source commit.'
        : 'Run status, conclusion or commit differs from the recorded source. Inspect the linked provider record.';
    } else {
      report.observed_commit = typeof data.sha === 'string' ? data.sha : null;
      report.status = data.sha === claim.sha ? 'MATCH' : 'NOT_MATCHED';
      report.detail = report.status === 'MATCH'
        ? 'Exact source commit returned from GitHub.'
        : 'Source response did not match the expected commit.';
    }
    return report;
  } catch (_) {
    report.detail = 'Provider request timed out or failed. No success or failure is inferred.';
    return report;
  }
}

function render(report, selected) {
  const options = Object.keys(CLAIMS).map(id =>
    '<option value="' + escapeHtml(id) + '"' + (id === selected ? ' selected' : '') + '>' +
    escapeHtml(CLAIMS[id].label) + '</option>'
  ).join('');
  const badge = report.status === 'MATCH' ? 'MATCHED RECEIPT' :
    report.status === 'NOT_MATCHED' ? 'CHECK DID NOT MATCH' :
    report.status === 'INVALID' ? 'INVALID SELECTION' : 'NOT VERIFIED THIS RUN';
  const status = report.status === 'MATCH' ? 'match' : report.status === 'NOT_MATCHED' ? 'warn' : 'neutral';
  const source = report.source ? '<p><a class="button secondary" target="_blank" rel="noopener noreferrer" href="' +
    escapeHtml(report.source) + '">Open source evidence</a></p>' : '';
  return [
    '<!doctype html><html lang="en"><head><meta charset="utf-8">',
    '<meta name="viewport" content="width=device-width,initial-scale=1">',
    '<meta name="robots" content="noindex,follow">',
    '<title>Proof inspection result | GlacierEQ</title>',
    '<link rel="stylesheet" href="/assets/site.css">',
    '<link rel="stylesheet" href="/assets/site.complete.css">',
    '<link rel="stylesheet" href="/assets/proof-lab.css"></head>',
    '<body><a class="skip" href="#main">Skip to content</a>',
    '<header class="site-header"><div class="shell nav"><a class="brand" href="/"><span class="mark">CB</span><span><strong>CASEY BARTON</strong><small>GLACIEREQ · LIVE EVIDENCE</small></span></a><a class="nav-cta" href="/proof-lab/">Proof lab home</a></div></header>',
    '<main class="shell proof-lab" id="main"><p class="eyebrow">LIVE THIRD-PARTY SOURCE CHECK</p>',
    '<h1>What does the provider actually confirm?</h1>',
    '<p class="lead">This result is based on an on-demand, read-only GitHub API response, not on a marketing claim.</p>',
    '<section class="proof-panel proof-' + status + '" aria-live="polite"><span class="proof-chip">' + badge + '</span>',
    '<h2>' + escapeHtml(report.title) + '</h2><p>' + escapeHtml(report.detail || '') + '</p>',
    '<dl><dt>Expected observation</dt><dd>' + escapeHtml(report.observation || 'None') + '</dd>',
    '<dt>Evidence boundary</dt><dd>' + escapeHtml(report.boundary || 'No claim verified') + '</dd>',
    '<dt>Checked (UTC)</dt><dd>' + escapeHtml(report.observed_at || '') + '</dd>',
    '<dt>Expected commit</dt><dd><code>' + escapeHtml(report.expected_commit || 'Not applicable') + '</code></dd>',
    '<dt>Observed commit</dt><dd><code>' + escapeHtml(report.observed_commit || 'Unavailable') + '</code></dd>',
    '</dl>' + source + '</section>',
    '<section class="proof-panel"><h2>Inspect another proof</h2><form method="get" action="/api/verify-proof">',
    '<label for="claim">Proof record</label><select id="claim" name="claim">' + options + '</select>',
    '<button class="button primary" type="submit">Verify against GitHub</button></form>',
    '<p><a href="/proof-lab/">How this system works</a> · <a href="/master/">Technical background</a></p></section>',
    '</main><footer class="shell proof-footer">Read-only provider inspection. No tracking cookies or personal information requested.</footer>',
    '</body></html>'
  ].join('\n');
}

async function handler(req, res) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'no-referrer');
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    res.statusCode = 405;
    return res.end('Method not allowed');
  }
  const selected = typeof req.query?.claim === 'string' ? req.query.claim : '';
  const json = req.query?.format === 'json';
  const report = await inspectClaim(selected);
  res.statusCode = report.status === 'INVALID' ? 400 : 200;
  res.setHeader('Cache-Control', report.status === 'MATCH' ? 'public, max-age=0, s-maxage=90' : 'no-store');
  res.setHeader('Content-Type', json ? 'application/json; charset=utf-8' : 'text/html; charset=utf-8');
  return res.end(json ? JSON.stringify(report) : render(report, selected));
}

module.exports = handler;
module.exports.inspectClaim = inspectClaim;
module.exports.CLAIMS = CLAIMS;
module.exports.render = render;

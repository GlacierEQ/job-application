const assert = require('node:assert/strict');
const test = require('node:test');

const gapRuntime = require('./api/recruiter-gap-analysis.js');
const gapPage = require('./api/recruiter-gap-page.js');

function analysis() {
  return {
    schema: 'glaciereq.live-recruiter-gap-analysis.v1',
    release: 'V32-RECRUITER-GAP-RUNTIME',
    as_of: '2026-08-20T20:00:00.000Z',
    matrix_receipt_sha256: 'a'.repeat(64),
    freshness_receipt_sha256: 'b'.repeat(64),
    receipt_sha256: 'c'.repeat(64),
    coverage: { verified_systems: 3, unverified_systems: 1 },
    roles: {
      recruiter: {
        current_top_flow: 'application-flow',
        current_top_score: 12,
        total_recoverable_score: 6.4,
        opportunity_count: 1,
        top_opportunities: [{ system_id: 'job-application', recoverable_score: 6.4 }],
      },
      'engineering-lead': {
        current_top_flow: 'architecture-flow',
        current_top_score: 14,
        total_recoverable_score: 8,
        opportunity_count: 1,
        top_opportunities: [{ system_id: 'pro-code-runtime', recoverable_score: 8 }],
      },
      'systems-architect': {
        current_top_flow: 'architecture-flow',
        current_top_score: 16,
        total_recoverable_score: 2.8,
        opportunity_count: 1,
        top_opportunities: [{ system_id: 'akos', recoverable_score: 2.8 }],
      },
    },
    global_top_opportunities: [
      {
        role: 'engineering-lead',
        flow_id: 'architecture-flow',
        flow_name: '<unsafe architecture>',
        system_id: 'pro-code-runtime',
        repository: 'https://github.com/GlacierEQ/pro-code',
        role_weight: 8,
        freshness_weight: 0,
        freshness_state: 'unverified',
        recoverable_score: 8,
        action: 'establish exact successful verification identity',
        verified_at: null,
        current_commit_sha: null,
      },
      {
        role: 'recruiter',
        flow_id: 'application-flow',
        flow_name: 'Application flow',
        system_id: 'job-application',
        repository: 'https://github.com/GlacierEQ/job-application',
        role_weight: 8,
        freshness_weight: 0.2,
        freshness_state: 'stale',
        recoverable_score: 6.4,
        action: 'refresh exact verification evidence on the owning repository',
        verified_at: '2025-04-07T20:00:00.000Z',
        current_commit_sha: '1'.repeat(40),
      },
    ],
  };
}

function response() {
  const headers = new Map();
  return {
    statusCode: 200,
    body: Buffer.alloc(0),
    setHeader(name, value) { headers.set(String(name).toLowerCase(), value); },
    getHeader(name) { return headers.get(String(name).toLowerCase()); },
    end(chunk = '') { this.body = Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk)); },
  };
}

test('human gap page renders role leverage and ordered evidence recovery without scripts', () => {
  const html = gapPage.renderGapAnalysisHtml(analysis());
  assert.match(html, /Refresh the proof that changes hiring signal most/);
  assert.match(html, /data-role="recruiter"/);
  assert.match(html, /data-role="engineering-lead"/);
  assert.match(html, /pro-code-runtime/);
  assert.match(html, /Recoverable score:<\/strong> 8/);
  assert.match(html, /\/data\/recruiter-gap-analysis\.json/);
  assert.match(html, /\/recruiter-role-matrix\//);
  assert.doesNotMatch(html, /<script\b/i);
  assert.doesNotMatch(html, /<unsafe architecture>/);
  assert.match(html, /&lt;unsafe architecture&gt;/);
});

test('human gap page reuses the shared one-pass public analyzer and returns hardened HTML', async (t) => {
  const original = gapRuntime.buildPublicGapAnalysis;
  let calls = 0;
  gapRuntime.buildPublicGapAnalysis = async () => {
    calls += 1;
    return analysis();
  };
  t.after(() => { gapRuntime.buildPublicGapAnalysis = original; });

  const res = response();
  await gapPage({ url: '/recruiter-gap-analysis/' }, res);
  assert.equal(res.statusCode, 200);
  assert.equal(calls, 1);
  assert.match(res.getHeader('content-type'), /text\/html/);
  assert.equal(res.getHeader('cache-control'), 'public, max-age=0, s-maxage=300, must-revalidate');
  assert.match(res.getHeader('content-security-policy'), /script-src 'none'/);
  assert.match(res.getHeader('content-security-policy'), /style-src 'self'/);
});

test('human gap page fails closed without caching unverifiable evidence', async (t) => {
  const original = gapRuntime.buildPublicGapAnalysis;
  gapRuntime.buildPublicGapAnalysis = async () => { throw new Error('<verification unavailable>'); };
  t.after(() => { gapRuntime.buildPublicGapAnalysis = original; });

  const res = response();
  await gapPage({ url: '/recruiter-gap-analysis/' }, res);
  assert.equal(res.statusCode, 503);
  assert.equal(res.getHeader('cache-control'), 'no-store');
  const html = res.body.toString('utf8');
  assert.match(html, /Recruiter recovery priorities unavailable/);
  assert.match(html, /&lt;verification unavailable&gt;/);
  assert.doesNotMatch(html, /<verification unavailable>/);
});

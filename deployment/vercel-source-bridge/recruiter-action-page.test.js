const assert = require('node:assert/strict');
const test = require('node:test');

const actionRuntime = require('./api/recruiter-action-runtime.js');
const page = require('./api/recruiter-action-page.js');

function packet(role = 'recruiter') {
  return {
    schema: actionRuntime.SCHEMA,
    role,
    status: 'RECOVERY_ACTION_AVAILABLE',
    as_of: '2026-08-20T22:00:00Z',
    matrix_receipt_sha256: 'a'.repeat(64),
    freshness_receipt_sha256: 'b'.repeat(64),
    gap_analysis_receipt_sha256: 'c'.repeat(64),
    current_fit: {
      top_flow: 'application-flow',
      top_flow_name: 'Opportunity → evidence-bound application package',
      top_score: 14,
      proof_points: [{
        system_id: 'job-application',
        repository: 'https://github.com/GlacierEQ/job-application',
        contribution: '<strong>verified</strong>',
        freshness_state: 'stale',
        freshness_weight: 0.25,
        age_days: 240,
        commit_sha: 'd'.repeat(40),
        verified_at: '2026-01-01T00:00:00Z',
      }],
    },
    recovery: {
      total_recoverable_score: 6,
      opportunity_count: 1,
      selected_action_count: 1,
      actions: [{
        priority: 1,
        system_id: 'job-application',
        flow_id: 'application-flow',
        repository: 'https://github.com/GlacierEQ/job-application',
        recoverable_score: 6,
        freshness_state: 'stale',
        freshness_weight: 0.25,
        age_days: 240,
        current_commit_sha: 'd'.repeat(40),
        verified_at: '2026-01-01T00:00:00Z',
        action: 'refresh exact verification evidence on the owning repository',
      }],
    },
    reviewer_routes: {
      role_matrix: '/recruiter-role-matrix/',
      full_proof: `/recruiter-proof/?role=${role}`,
      role_recovery: `/recruiter-gap-analysis/?role=${role}`,
      action_packet: `/recruiter-action/?role=${role}`,
      machine_action_packet: `/data/recruiter-action-packet.json?role=${role}`,
      machine_recovery: '/data/recruiter-gap-analysis.json',
    },
    receipt_sha256: 'e'.repeat(64),
  };
}

function capture() {
  const headers = new Map();
  return {
    statusCode: 0,
    body: '',
    setHeader(name, value) { headers.set(String(name).toLowerCase(), String(value)); },
    getHeader(name) { return headers.get(String(name).toLowerCase()); },
    end(value = '') { this.body = Buffer.isBuffer(value) ? value.toString('utf8') : String(value); },
  };
}

test('role-targeted page renders one action packet without script execution', () => {
  const html = page.renderActionPacketHtml(packet());
  assert.match(html, /ROLE FIT → PROOF → ACTION/);
  assert.match(html, /Recoverable score:<\/strong> \+6/);
  assert.match(html, /recruiter-action-packet\.json\?role=recruiter/);
  assert.doesNotMatch(html, /<script\b/i);
  assert.match(html, /&lt;strong&gt;verified&lt;\/strong&gt;/);
});

test('request selectors fail closed on missing, duplicate, unknown role, and invalid bounds', () => {
  assert.throws(() => page.requestRole({ url: '/recruiter-action/' }), /role_required/);
  assert.throws(() => page.requestRole({ url: '/recruiter-action/?role=recruiter&role=engineering-lead' }), /multiple_roles/);
  assert.throws(() => page.requestRole({ url: '/recruiter-action/?role=wizard' }), /unknown_role/);
  assert.equal(page.requestRole({ url: '/recruiter-action/?role=systems-architect' }), 'systems-architect');
  assert.equal(page.requestMaxActions({ url: '/recruiter-action/?role=recruiter' }), 3);
  assert.equal(page.requestMaxActions({ url: '/recruiter-action/?role=recruiter&max_actions=7' }), 7);
  assert.throws(() => page.requestMaxActions({ url: '/recruiter-action/?role=recruiter&max_actions=0' }), /invalid_max_actions/);
});

test('public handler serves synchronized HTML and machine JSON from one packet builder', async () => {
  const original = actionRuntime.buildPublicRecruiterActionPacket;
  const calls = [];
  actionRuntime.buildPublicRecruiterActionPacket = async (role, options) => {
    calls.push({ role, options });
    return packet(role);
  };
  try {
    const htmlRes = capture();
    await page({ url: '/recruiter-action/?role=engineering-lead&max_actions=2' }, htmlRes);
    assert.equal(htmlRes.statusCode, 200);
    assert.match(htmlRes.getHeader('content-type'), /^text\/html/);
    assert.match(htmlRes.getHeader('content-security-policy'), /script-src 'none'/);
    assert.match(htmlRes.body, /engineering lead reviewer action packet/i);

    const jsonRes = capture();
    await page({ url: '/data/recruiter-action-packet.json?role=engineering-lead&max_actions=2' }, jsonRes);
    assert.equal(jsonRes.statusCode, 200);
    assert.match(jsonRes.getHeader('content-type'), /^application\/json/);
    const decoded = JSON.parse(jsonRes.body);
    assert.equal(decoded.role, 'engineering-lead');
    assert.equal(decoded.receipt_sha256, 'e'.repeat(64));
    assert.deepEqual(calls, [
      { role: 'engineering-lead', options: { maxActions: 2 } },
      { role: 'engineering-lead', options: { maxActions: 2 } },
    ]);
  } finally {
    actionRuntime.buildPublicRecruiterActionPacket = original;
  }
});

test('public handler returns no-store fail-closed response for invalid role', async () => {
  const res = capture();
  await page({ url: '/data/recruiter-action-packet.json?role=wizard' }, res);
  assert.equal(res.statusCode, 400);
  assert.equal(res.getHeader('cache-control'), 'no-store');
  assert.equal(JSON.parse(res.body).status, 'FAIL_CLOSED');
});

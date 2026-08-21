const assert = require('node:assert/strict');
const test = require('node:test');

const actionRuntime = require('./api/recruiter-action-runtime.js');
const page = require('./api/recruiter-review-page.js');

function packet(role, index) {
  return {
    schema: actionRuntime.SCHEMA,
    role,
    status: 'RECOVERY_ACTION_AVAILABLE',
    as_of: '2026-08-20T23:00:00Z',
    matrix_receipt_sha256: 'a'.repeat(64),
    freshness_receipt_sha256: 'b'.repeat(64),
    gap_analysis_receipt_sha256: 'c'.repeat(64),
    current_fit: {
      top_flow: `${role}-flow`,
      top_flow_name: `${role} <strong>flow</strong>`,
      top_score: 20 - index,
      proof_points: [{
        system_id: `${role}-system`,
        repository: 'https://github.com/GlacierEQ/job-application',
        contribution: '<script>alert(1)</script>',
        freshness_state: 'stale',
        freshness_weight: 0.4,
        age_days: 220,
        commit_sha: 'd'.repeat(40),
        verified_at: '2026-01-01T00:00:00Z',
      }],
    },
    recovery: {
      total_recoverable_score: 6 + index,
      opportunity_count: 1,
      selected_action_count: 1,
      actions: [{
        priority: 1,
        system_id: `${role}-system`,
        flow_id: `${role}-flow`,
        repository: 'https://github.com/GlacierEQ/job-application',
        recoverable_score: 6 + index,
        freshness_state: 'stale',
        freshness_weight: 0.4,
        age_days: 220,
        current_commit_sha: 'd'.repeat(40),
        verified_at: '2026-01-01T00:00:00Z',
        action: 'refresh exact verification evidence',
      }],
    },
    reviewer_routes: {
      role_matrix: '/recruiter-role-matrix/',
      full_proof: `/recruiter-proof/?role=${role}`,
      role_recovery: `/recruiter-gap-analysis/?role=${role}`,
      action_packet: `/recruiter-action/?role=${role}`,
      machine_action_packet: `/data/recruiter-action-packet.json?role=${role}`,
      machine_recovery: '/data/recruiter-gap-analysis.json',
      review_hub: '/recruiter-review/',
    },
    receipt_sha256: String(index + 1).repeat(64),
  };
}

function matrix() {
  const roles = [...actionRuntime.SUPPORTED_ROLES];
  return {
    schema: actionRuntime.ACTION_MATRIX_SCHEMA,
    as_of: '2026-08-20T23:00:00Z',
    source_matrix_schema: 'glaciereq.public-recruiter-role-matrix.v1',
    matrix_receipt_sha256: 'a'.repeat(64),
    freshness_receipt_sha256: 'b'.repeat(64),
    roles,
    verification_passes: 1,
    max_actions_per_role: 3,
    packets: Object.fromEntries(roles.map((role, index) => [role, packet(role, index)])),
    receipt_sha256: 'f'.repeat(64),
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

test('review hub renders all hiring lenses from one action matrix and escapes proof', () => {
  const html = page.renderReviewHtml(matrix());
  for (const role of actionRuntime.SUPPORTED_ROLES) {
    assert.match(html, new RegExp(`data-role="${role}"`));
    assert.match(html, new RegExp(`recruiter-action/\\?role=${role}`));
  }
  assert.match(html, /ROLE FIT → PROOF → RECOVERY → ACTION/);
  assert.match(html, /Verification passes:<\/strong> 1/);
  assert.match(html, /&lt;script&gt;alert\(1\)&lt;\/script&gt;/);
  assert.doesNotMatch(html, /<script\b/i);
});

test('action matrix preserves one matrix receipt and deterministic role packets', () => {
  const publicMatrix = {
    schema: 'glaciereq.public-recruiter-role-matrix.v1',
    receipt_sha256: 'a'.repeat(64),
    freshness_receipt_sha256: 'b'.repeat(64),
    as_of: '2026-08-20T23:00:00Z',
    rankings: {},
  };
  for (const [index, role] of actionRuntime.SUPPORTED_ROLES.entries()) {
    publicMatrix.rankings[role] = {
      briefs: [{
        flow_id: `${role}-flow`,
        name: `${role} flow`,
        score: 10 + index,
        proof_points: [],
      }],
    };
  }

  const gapRuntime = require('./api/recruiter-gap-analysis.js');
  const original = gapRuntime.analyzeRecruiterGaps;
  gapRuntime.analyzeRecruiterGaps = () => ({
    receipt_sha256: 'c'.repeat(64),
    roles: Object.fromEntries(actionRuntime.SUPPORTED_ROLES.map((role) => [role, {
      total_recoverable_score: 0,
      opportunity_count: 0,
      top_opportunities: [],
    }])),
  });
  try {
    const first = actionRuntime.buildRecruiterActionMatrix(publicMatrix, { maxActions: 2 });
    const second = actionRuntime.buildRecruiterActionMatrix(publicMatrix, { maxActions: 2 });
    assert.deepEqual(first, second);
    assert.equal(first.verification_passes, 1);
    assert.equal(first.matrix_receipt_sha256, publicMatrix.receipt_sha256);
    assert.deepEqual(first.roles, actionRuntime.SUPPORTED_ROLES);
    assert.equal(first.packets.recruiter.role, 'recruiter');
    assert.equal(first.packets['engineering-lead'].role, 'engineering-lead');
    assert.equal(first.packets['systems-architect'].role, 'systems-architect');
  } finally {
    gapRuntime.analyzeRecruiterGaps = original;
  }
});

test('review request accepts only one bounded action count', () => {
  assert.equal(page.parseMaxActions({ url: '/recruiter-review/' }), 3);
  assert.equal(page.parseMaxActions({ url: '/recruiter-review/?max_actions=10' }), 10);
  assert.throws(() => page.parseMaxActions({ url: '/recruiter-review/?max_actions=0' }), /invalid_max_actions/);
  assert.throws(() => page.parseMaxActions({ url: '/recruiter-review/?max_actions=x' }), /invalid_max_actions/);
  assert.throws(() => page.parseMaxActions({ url: '/recruiter-review/?max_actions=2&max_actions=3' }), /multiple_max_actions/);
});

test('handler executes one public action-matrix pass and emits hardened HTML', async () => {
  const original = actionRuntime.buildPublicRecruiterActionMatrix;
  const calls = [];
  actionRuntime.buildPublicRecruiterActionMatrix = async (options) => {
    calls.push(options);
    return matrix();
  };
  try {
    const res = capture();
    await page({ url: '/recruiter-review/?max_actions=2' }, res);
    assert.equal(res.statusCode, 200);
    assert.deepEqual(calls, [{ maxActions: 2 }]);
    assert.match(res.getHeader('content-security-policy'), /script-src 'none'/);
    assert.match(res.getHeader('cache-control'), /s-maxage=300/);
    assert.equal(res.getHeader('x-psysocx-release'), page.RELEASE);
    assert.match(res.body, /Recruiter Review Hub/);
  } finally {
    actionRuntime.buildPublicRecruiterActionMatrix = original;
  }
});

test('invalid selectors fail closed before public evidence loading', async () => {
  const original = actionRuntime.buildPublicRecruiterActionMatrix;
  let called = false;
  actionRuntime.buildPublicRecruiterActionMatrix = async () => {
    called = true;
    return matrix();
  };
  try {
    const res = capture();
    await page({ url: '/recruiter-review/?max_actions=99' }, res);
    assert.equal(res.statusCode, 400);
    assert.equal(res.getHeader('cache-control'), 'no-store');
    assert.equal(called, false);
  } finally {
    actionRuntime.buildPublicRecruiterActionMatrix = original;
  }
});

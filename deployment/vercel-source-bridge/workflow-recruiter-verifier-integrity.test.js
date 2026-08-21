const assert = require('node:assert/strict');
const test = require('node:test');

const recruiterProxy = require('./api/workflow-recruiter-proxy.js');

function creditedPoint(overrides = {}) {
  return {
    freshness_weight: 1,
    verification_run_id: 123456,
    verification_workflow: 'CI',
    verification_workflow_path: '.github/workflows/ci.yml',
    verification_branch: 'main',
    verification_event: 'push',
    ...overrides,
  };
}

function proofWith(point) {
  return {
    briefs: [
      {
        proof_points: [point],
      },
    ],
  };
}

test('complete exact workflow identity passes the public verifier predicate', () => {
  assert.equal(recruiterProxy.proofHasExactIdentity(proofWith(creditedPoint())), true);
});

test('credited proof without exact workflow path fails identity binding', () => {
  assert.equal(
    recruiterProxy.proofHasExactIdentity(
      proofWith(creditedPoint({ verification_workflow_path: null })),
    ),
    false,
  );
});

test('credited proof without verification event fails identity binding', () => {
  assert.equal(
    recruiterProxy.proofHasExactIdentity(
      proofWith(creditedPoint({ verification_event: null })),
    ),
    false,
  );
});

test('credited proof requires positive integer run id and non-empty name and branch', () => {
  assert.equal(
    recruiterProxy.proofHasExactIdentity(
      proofWith(creditedPoint({ verification_run_id: 0 })),
    ),
    false,
  );
  assert.equal(
    recruiterProxy.proofHasExactIdentity(
      proofWith(creditedPoint({ verification_workflow: '' })),
    ),
    false,
  );
  assert.equal(
    recruiterProxy.proofHasExactIdentity(
      proofWith(creditedPoint({ verification_branch: '' })),
    ),
    false,
  );
});

test('unverified zero-credit nodes do not invalidate otherwise exact credited proof', () => {
  const proof = {
    briefs: [
      {
        proof_points: [
          creditedPoint(),
          {
            freshness_weight: 0,
            verification_run_id: null,
            verification_workflow: null,
            verification_workflow_path: null,
            verification_branch: null,
            verification_event: null,
          },
        ],
      },
    ],
  };
  assert.equal(recruiterProxy.proofHasExactIdentity(proof), true);
});

test('empty or malformed proof cannot advertise identity-bound success', () => {
  assert.equal(recruiterProxy.proofHasExactIdentity(null), false);
  assert.equal(recruiterProxy.proofHasExactIdentity({ briefs: [] }), false);
  assert.equal(
    recruiterProxy.proofHasExactIdentity(
      proofWith({ freshness_weight: 0 }),
    ),
    false,
  );
});

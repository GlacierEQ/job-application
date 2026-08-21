import assert from 'node:assert/strict';
import test from 'node:test';

import {
  VERIFICATION_SOURCES,
  buildLiveRecruiterProof,
  selectRegisteredVerificationRun,
} from '../tools/live-recruiter-proof.mjs';

const AS_OF = new Date('2026-08-20T12:00:00Z');

function system(id, repository) {
  return {
    id,
    name: id,
    repo: `https://github.com/${repository}`,
    state: 'VERIFIED',
    summary: `${id} summary`,
    evidence: `${id} evidence`,
    limit: `${id} ceiling`,
    level: 'production',
  };
}

function topology() {
  return {
    schema: 'glaciereq.workflow-topology.v1',
    receipt_sha256: 'f'.repeat(64),
    flows: [
      {
        id: 'application-heavy',
        name: 'Application-heavy proof',
        intent: 'Prefer the job application system before freshness is considered.',
        steps: [{ ordinal: 1, transition: 'compile application proof', system: system('job-application', 'GlacierEQ/job-application') }],
      },
      {
        id: 'helix-fresh',
        name: 'Fresh Helix proof',
        intent: 'Use a slightly lower static role weight with fresher verification.',
        steps: [{ ordinal: 1, transition: 'compile candidate profile', system: system('helix', 'GlacierEQ/job-app-helix') }],
      },
    ],
  };
}

function response(payload, status = 200) {
  const bytes = Buffer.from(JSON.stringify(payload));
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: { get(name) { return name.toLowerCase() === 'content-length' ? String(bytes.length) : null; } },
    async arrayBuffer() { return bytes; },
  };
}

function run({ id, name, path, sha, updatedAt, branch = 'main', event = 'push' }) {
  return {
    id,
    name,
    path,
    status: 'completed',
    conclusion: 'success',
    head_branch: branch,
    event,
    head_sha: sha,
    updated_at: updatedAt,
    html_url: `https://github.com/GlacierEQ/example/actions/runs/${id}`,
  };
}

function fetchFixture({ exactShaMismatch = false, helixWrongPath = false } = {}) {
  const jobRun = run({
    id: 101,
    name: 'CI',
    path: '.github/workflows/ci.yml',
    sha: 'a'.repeat(40),
    updatedAt: '2025-01-01T00:00:00Z',
  });
  const helixRun = run({
    id: 202,
    name: 'Helix Candidate Profile Proof',
    path: helixWrongPath ? '.github/workflows/not-registered.yml' : '.github/workflows/candidate-profile-compiler-proof.yml',
    sha: 'b'.repeat(40),
    updatedAt: '2026-08-19T00:00:00Z',
  });

  return async function fetchImpl(url) {
    const value = String(url);
    if (value === 'https://api.github.com/repos/GlacierEQ/job-application') return response({ default_branch: 'main' });
    if (value === 'https://api.github.com/repos/GlacierEQ/job-app-helix') return response({ default_branch: 'main' });
    if (value === 'https://api.github.com/repos/GlacierEQ/job-application/actions/runs?per_page=50') return response({ workflow_runs: [jobRun] });
    if (value === 'https://api.github.com/repos/GlacierEQ/job-app-helix/actions/runs?per_page=50') return response({ workflow_runs: [helixRun] });
    if (value === 'https://api.github.com/repos/GlacierEQ/job-application/actions/runs/101') return response(jobRun);
    if (value === 'https://api.github.com/repos/GlacierEQ/job-app-helix/actions/runs/202') {
      return response(exactShaMismatch ? { ...helixRun, head_sha: 'c'.repeat(40) } : helixRun);
    }
    return response({ message: 'not found' }, 404);
  };
}

test('generated registry is the immutable runtime verification source', () => {
  assert.equal(Object.keys(VERIFICATION_SOURCES).length, 8);
  assert.equal(Object.isFrozen(VERIFICATION_SOURCES), true);
  assert.equal(Object.isFrozen(VERIFICATION_SOURCES['GlacierEQ/job-application']), true);
  assert.deepEqual(
    VERIFICATION_SOURCES['GlacierEQ/job-application'].workflow_paths,
    [
      '.github/workflows/ci.yml',
      '.github/workflows/apex-recruiter-proof-brief.yml',
      '.github/workflows/apex-estate-non-regression.yml',
      '.github/workflows/portfolio-verify.yml',
    ],
  );
});

test('live generated-registry freshness reverses stale static recruiter preference', async () => {
  const proof = await buildLiveRecruiterProof(topology(), 'recruiter', {
    asOf: AS_OF,
    fetchImpl: fetchFixture(),
  });
  assert.equal(proof.generated_registry, true);
  assert.equal(proof.coverage.verified_systems, 2);
  assert.equal(proof.coverage.unverified_systems, 0);
  assert.equal(proof.briefs[0].flow_id, 'helix-fresh');
  assert.equal(proof.briefs[1].flow_id, 'application-heavy');
  assert.equal(proof.briefs[0].static_role_score, 7);
  assert.equal(proof.briefs[1].static_role_score, 8);
  assert.ok(proof.briefs[0].score > proof.briefs[1].score);
  assert.match(proof.registry_receipt_sha256, /^[a-f0-9]{64}$/);
  assert.match(proof.receipt_sha256, /^[a-f0-9]{64}$/);
});

test('unregistered workflow path receives zero recruiter ranking credit', async () => {
  const proof = await buildLiveRecruiterProof(topology(), 'recruiter', {
    asOf: AS_OF,
    fetchImpl: fetchFixture({ helixWrongPath: true }),
  });
  assert.equal(proof.coverage.verified_systems, 1);
  assert.equal(proof.coverage.unverified_systems, 1);
  assert.equal(proof.missing_systems[0].id, 'helix');
  const helix = proof.briefs.find((brief) => brief.flow_id === 'helix-fresh');
  assert.equal(helix.score, 0);
});

test('exact run readback mismatch fails closed instead of crediting stale selection metadata', async () => {
  const proof = await buildLiveRecruiterProof(topology(), 'recruiter', {
    asOf: AS_OF,
    fetchImpl: fetchFixture({ exactShaMismatch: true }),
  });
  assert.equal(proof.coverage.verified_systems, 1);
  assert.equal(proof.coverage.unverified_systems, 1);
  assert.match(proof.missing_systems[0].reason, /exact_run_sha_mismatch/);
});

test('selection rejects successful workflows outside the generated exact path registry', () => {
  const payload = {
    workflow_runs: [run({
      id: 303,
      name: 'CI',
      path: '.github/workflows/unregistered.yml',
      sha: 'd'.repeat(40),
      updatedAt: '2026-08-19T00:00:00Z',
    })],
  };
  assert.equal(selectRegisteredVerificationRun(payload, 'GlacierEQ/job-application', 'main'), null);
});

test('unsupported role is rejected before any network work', async () => {
  await assert.rejects(
    () => buildLiveRecruiterProof(topology(), 'ceo', { asOf: AS_OF, fetchImpl: fetchFixture() }),
    /live_recruiter_unknown_role:ceo/,
  );
});

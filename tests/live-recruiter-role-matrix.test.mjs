import assert from 'node:assert/strict';
import test from 'node:test';

import { buildLiveRecruiterProof } from '../tools/live-recruiter-proof.mjs';
import {
  buildLiveRecruiterRoleMatrix,
  extractSharedFreshness,
} from '../tools/live-recruiter-role-matrix.mjs';

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
        intent: 'Current application proof.',
        steps: [{ ordinal: 1, transition: 'compile application proof', system: system('job-application', 'GlacierEQ/job-application') }],
      },
      {
        id: 'helix-fresh',
        name: 'Fresh Helix proof',
        intent: 'Fresh candidate-profile proof.',
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

function run({ id, name, path, sha, updatedAt }) {
  return {
    id,
    name,
    path,
    status: 'completed',
    conclusion: 'success',
    head_branch: 'main',
    event: 'push',
    head_sha: sha,
    updated_at: updatedAt,
    html_url: `https://github.com/GlacierEQ/example/actions/runs/${id}`,
  };
}

function countingFixture({ failHelix = false } = {}) {
  const calls = [];
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
    path: '.github/workflows/candidate-profile-compiler-proof.yml',
    sha: 'b'.repeat(40),
    updatedAt: '2026-08-19T00:00:00Z',
  });
  const fetchImpl = async (url) => {
    const value = String(url);
    calls.push(value);
    if (failHelix && value.includes('/repos/GlacierEQ/job-app-helix')) return response({ message: 'unavailable' }, 503);
    if (value === 'https://api.github.com/repos/GlacierEQ/job-application') return response({ default_branch: 'main' });
    if (value === 'https://api.github.com/repos/GlacierEQ/job-app-helix') return response({ default_branch: 'main' });
    if (value === 'https://api.github.com/repos/GlacierEQ/job-application/actions/runs?per_page=50') return response({ workflow_runs: [jobRun] });
    if (value === 'https://api.github.com/repos/GlacierEQ/job-app-helix/actions/runs?per_page=50') return response({ workflow_runs: [helixRun] });
    if (value === 'https://api.github.com/repos/GlacierEQ/job-application/actions/runs/101') return response(jobRun);
    if (value === 'https://api.github.com/repos/GlacierEQ/job-app-helix/actions/runs/202') return response(helixRun);
    return response({ message: 'not found' }, 404);
  };
  return { fetchImpl, calls };
}

function rankingVector(proof) {
  return proof.briefs.map((brief) => [brief.flow_id, brief.score]);
}

test('one exact verification pass produces all three recruiter role rankings', async () => {
  const fixture = countingFixture();
  const matrix = await buildLiveRecruiterRoleMatrix(topology(), {
    asOf: AS_OF,
    fetchImpl: fixture.fetchImpl,
  });

  assert.equal(matrix.schema, 'glaciereq.live-recruiter-role-matrix.v1');
  assert.equal(matrix.verification_passes, 1);
  assert.equal(matrix.roles_generated, 3);
  assert.deepEqual(Object.keys(matrix.roles).sort(), ['engineering-lead', 'recruiter', 'systems-architect']);
  assert.equal(matrix.coverage.verified_systems, 2);
  assert.equal(matrix.coverage.unverified_systems, 0);
  assert.equal(fixture.calls.length, 6, 'two repositories require metadata + run-list + exact-run once each');
  assert.match(matrix.receipt_sha256, /^[a-f0-9]{64}$/);
});

test('single-pass matrix cuts three-role verification traffic by two thirds without changing rankings', async () => {
  const matrixFixture = countingFixture();
  const matrix = await buildLiveRecruiterRoleMatrix(topology(), {
    asOf: AS_OF,
    fetchImpl: matrixFixture.fetchImpl,
  });

  const baselineFixture = countingFixture();
  for (const role of ['recruiter', 'engineering-lead', 'systems-architect']) {
    const direct = await buildLiveRecruiterProof(topology(), role, {
      asOf: AS_OF,
      fetchImpl: baselineFixture.fetchImpl,
    });
    assert.deepEqual(matrix.roles[role].map((brief) => [brief.flow_id, brief.score]), rankingVector(direct));
  }

  assert.equal(matrixFixture.calls.length, 6);
  assert.equal(baselineFixture.calls.length, 18);
  assert.equal(matrixFixture.calls.length * 3, baselineFixture.calls.length);
});

test('shared freshness extraction rejects conflicting verification identity for one system', () => {
  const seed = {
    schema: 'glaciereq.live-recruiter-proof-snapshot.v1',
    freshness_receipt_sha256: 'e'.repeat(64),
    coverage: { verified_systems: 1, unverified_systems: 0 },
    missing_systems: [],
    briefs: [
      {
        proof_points: [
          {
            system_id: 'helix', repository: 'https://github.com/GlacierEQ/job-app-helix', commit_sha: 'a'.repeat(40),
            verified_at: '2026-08-19T00:00:00.000Z', age_days: 1, freshness_weight: 1, freshness_state: 'fresh',
            verification_workflow: 'Helix Candidate Profile Proof', verification_workflow_path: '.github/workflows/candidate-profile-compiler-proof.yml',
            verification_branch: 'main', verification_event: 'push', verification_run_id: 1, verification_url: 'https://example.invalid/1',
          },
        ],
      },
      {
        proof_points: [
          {
            system_id: 'helix', repository: 'https://github.com/GlacierEQ/job-app-helix', commit_sha: 'b'.repeat(40),
            verified_at: '2026-08-19T00:00:00.000Z', age_days: 1, freshness_weight: 1, freshness_state: 'fresh',
            verification_workflow: 'Helix Candidate Profile Proof', verification_workflow_path: '.github/workflows/candidate-profile-compiler-proof.yml',
            verification_branch: 'main', verification_event: 'push', verification_run_id: 1, verification_url: 'https://example.invalid/1',
          },
        ],
      },
    ],
  };
  assert.throws(() => extractSharedFreshness(seed), /role_matrix_conflicting_verification:helix/);
});

test('repository verification failure propagates identically across every role', async () => {
  const fixture = countingFixture({ failHelix: true });
  const matrix = await buildLiveRecruiterRoleMatrix(topology(), {
    asOf: AS_OF,
    fetchImpl: fixture.fetchImpl,
  });
  assert.equal(matrix.coverage.verified_systems, 1);
  assert.equal(matrix.coverage.unverified_systems, 1);
  assert.equal(matrix.missing_systems[0].id, 'helix');
  for (const role of Object.keys(matrix.roles)) {
    const helix = matrix.roles[role].find((brief) => brief.flow_id === 'helix-fresh');
    assert.equal(helix.score, 0);
  }
});

test('matrix output is deterministic for one exact verification graph', async () => {
  const firstFixture = countingFixture();
  const secondFixture = countingFixture();
  const first = await buildLiveRecruiterRoleMatrix(topology(), { asOf: AS_OF, fetchImpl: firstFixture.fetchImpl });
  const second = await buildLiveRecruiterRoleMatrix(topology(), { asOf: AS_OF, fetchImpl: secondFixture.fetchImpl });
  assert.deepEqual(first, second);
  assert.equal(first.receipt_sha256, second.receipt_sha256);
});

import { readFile } from 'node:fs/promises';

const root = new URL('../', import.meta.url);
const read = (path) => readFile(new URL(path, root), 'utf8');
const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};
const SHA40 = /^[a-f0-9]{40}$/;
const ROLLOUT_PATH = 'manifests/portfolio_rollout.json';

async function fetchJson(repository, commit, path, label) {
  assert(SHA40.test(commit || ''), `${label}: invalid commit`);
  const response = await fetch(
    `https://raw.githubusercontent.com/${repository}/${commit}/${path}`,
    {
      headers: {
        Accept: 'application/json',
        'Cache-Control': 'no-cache',
        'User-Agent': 'GlacierEQ-rollout-equivalence/1.0',
      },
    },
  );
  const text = await response.text();
  assert(response.status === 200, `${label}: HTTP ${response.status}`);
  try {
    return JSON.parse(text);
  } catch (error) {
    throw new Error(`${label}: invalid JSON: ${error instanceof Error ? error.message : String(error)}`);
  }
}

function stableWave(wave) {
  return {
    id: wave.id,
    priority: wave.priority,
    mode: wave.mode,
    objective: wave.objective,
    target_evidence: wave.target_evidence,
    acceptance: wave.acceptance,
    repositories: wave.repositories,
  };
}

function rankEvidence(policy, evidence) {
  const order = Array.isArray(policy?.promotion_path) ? policy.promotion_path : [];
  const index = order.indexOf(evidence);
  assert(index !== -1, `unknown rollout evidence state: ${evidence}`);
  return index;
}

function rankState(state) {
  const order = ['UNVERIFIED', 'PARTIALLY_VERIFIED', 'VERIFIED'];
  const index = order.indexOf(state);
  assert(index !== -1, `unknown rollout repository state: ${state}`);
  return index;
}

function completedByRepository(progress) {
  const rows = Array.isArray(progress?.completed) ? progress.completed : [];
  const map = new Map();
  for (const row of rows) {
    assert(row && typeof row === 'object', 'completed rollout row must be an object');
    assert(typeof row.repository === 'string' && row.repository.length > 0, 'completed rollout repository missing');
    assert(!map.has(row.repository), `duplicate completed rollout repository: ${row.repository}`);
    map.set(row.repository, row);
  }
  return map;
}

function verifyWaveProgress(before, after, policy) {
  assert(JSON.stringify(stableWave(after)) === JSON.stringify(stableWave(before)), `rollout wave contract changed: ${before.id}`);
  assert(rankState(after.current_state) >= rankState(before.current_state), `rollout state regressed: ${before.id}`);
  assert(rankEvidence(policy, after.current_evidence) >= rankEvidence(policy, before.current_evidence), `rollout evidence regressed: ${before.id}`);

  const beforeProgress = before.progress || {};
  const afterProgress = after.progress || {};
  assert(Number.isInteger(beforeProgress.completed_count) && Number.isInteger(afterProgress.completed_count), `completed count missing: ${before.id}`);
  assert(Number.isInteger(beforeProgress.remaining_count) && Number.isInteger(afterProgress.remaining_count), `remaining count missing: ${before.id}`);
  assert(afterProgress.completed_count >= beforeProgress.completed_count, `completed count regressed: ${before.id}`);
  assert(afterProgress.remaining_count <= beforeProgress.remaining_count, `remaining count increased: ${before.id}`);
  assert(afterProgress.completed_count + afterProgress.remaining_count === after.repositories.length, `rollout cardinality drift: ${before.id}`);

  const beforeCompleted = completedByRepository(beforeProgress);
  const afterCompleted = completedByRepository(afterProgress);
  assert(afterCompleted.size === afterProgress.completed_count, `completed rows/count mismatch: ${before.id}`);
  for (const [repository, row] of beforeCompleted) {
    assert(afterCompleted.has(repository), `completed repository disappeared: ${before.id}:${repository}`);
    assert(JSON.stringify(afterCompleted.get(repository)) === JSON.stringify(row), `historical completion receipt changed: ${before.id}:${repository}`);
  }
  for (const repository of afterCompleted.keys()) {
    assert(after.repositories.includes(repository), `completed repository outside governed wave: ${before.id}:${repository}`);
    assert(repository.toLowerCase() !== 'github', 'GitHub company identity must not enter portfolio rollout progress');
  }
  if (afterProgress.next_repository != null) {
    assert(after.repositories.includes(afterProgress.next_repository), `next repository outside governed wave: ${before.id}`);
    assert(!afterCompleted.has(afterProgress.next_repository), `next repository is already completed: ${before.id}`);
  }
}

const freshness = JSON.parse(
  await read('projects/github-merge-authority-proof/proof/production-evolving-freshness-readback.json'),
);
const localHelix = JSON.parse(await read('site-v15/data/helix-root.json'));
const deployedCommit = freshness.production_projection?.helix_commit;
const currentCommit = localHelix.source?.root_ref;
assert(SHA40.test(deployedCommit || ''), 'deployed Helix commit invalid');
assert(SHA40.test(currentCommit || ''), 'current Helix commit invalid');

const before = await fetchJson('GlacierEQ/job-app-helix', deployedCommit, ROLLOUT_PATH, 'deployed rollout');
const after = await fetchJson('GlacierEQ/job-app-helix', currentCommit, ROLLOUT_PATH, 'current rollout');

assert(before.schema === 'glaciereq.portfolio.rollout.v1', 'deployed rollout schema drift');
assert(after.schema === before.schema, 'rollout schema changed');
assert(after.portfolio_root === before.portfolio_root, 'rollout portfolio root changed');
assert(after.inventory_manifest === before.inventory_manifest, 'rollout inventory authority changed');
assert(JSON.stringify(after.root_status) === JSON.stringify(before.root_status), 'rollout root status changed');
assert(JSON.stringify(after.policy) === JSON.stringify(before.policy), 'rollout policy changed');
assert(Array.isArray(before.waves) && Array.isArray(after.waves), 'rollout waves missing');
assert(after.waves.length === before.waves.length, 'rollout wave cardinality changed');

for (let index = 0; index < before.waves.length; index += 1) {
  assert(after.waves[index].id === before.waves[index].id, `rollout wave order changed at ${index}`);
  verifyWaveProgress(before.waves[index], after.waves[index], before.policy);
}

console.log(JSON.stringify({
  status: 'PASS',
  schema: 'glaciereq.portfolio-rollout-equivalence.v1',
  path: ROLLOUT_PATH,
  deployed_helix_commit: deployedCommit,
  current_helix_commit: currentCommit,
  waves: after.waves.map((wave) => ({
    id: wave.id,
    completed_count: wave.progress?.completed_count,
    remaining_count: wave.progress?.remaining_count,
    next_repository: wave.progress?.next_repository || null,
  })),
  projection_neutrality: {
    policy_unchanged: true,
    wave_contracts_unchanged: true,
    repository_sets_unchanged: true,
    historical_completion_rows_immutable: true,
    progress_monotonic: true,
    github_company_identity_absent_from_rollout_progress: true,
  },
}, null, 2));

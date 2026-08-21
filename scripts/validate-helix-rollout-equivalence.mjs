import { readFile } from 'node:fs/promises';

const root = new URL('../', import.meta.url);
const read = (path) => readFile(new URL(path, root), 'utf8');
const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};
const SHA40 = /^[a-f0-9]{40}$/;
const ROLLOUT_PATH = 'manifests/portfolio_rollout.json';
const V1 = 'glaciereq.portfolio.rollout.v1';
const V2 = 'glaciereq.portfolio.rollout.v2';

async function fetchJson(repository, commit, path, label) {
  assert(SHA40.test(commit || ''), `${label}: invalid commit`);
  const response = await fetch(
    `https://raw.githubusercontent.com/${repository}/${commit}/${path}`,
    {
      headers: {
        Accept: 'application/json',
        'Cache-Control': 'no-cache',
        'User-Agent': 'GlacierEQ-rollout-equivalence/2.0',
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

function normalizedRootStatus(status) {
  return {
    repository: status?.repository,
    state: status?.state,
    evidence: status?.evidence,
    source_commit: status?.source_commit || status?.canonical_commit,
  };
}

function normalizedCompletion(row) {
  return {
    repository: row?.repository,
    state: row?.state,
    evidence: row?.evidence,
    source_commit: row?.source_commit || row?.canonical_commit,
    proof: row?.proof,
  };
}

function completedByRepository(progress) {
  const rows = Array.isArray(progress?.completed) ? progress.completed : [];
  const map = new Map();
  for (const row of rows) {
    assert(row && typeof row === 'object', 'completed rollout row must be an object');
    assert(
      typeof row.repository === 'string' && row.repository.length > 0,
      'completed rollout repository missing',
    );
    assert(!map.has(row.repository), `duplicate completed rollout repository: ${row.repository}`);
    map.set(row.repository, normalizedCompletion(row));
  }
  return map;
}

function sameRepositorySet(before, after, waveId) {
  assert(Array.isArray(before) && Array.isArray(after), `rollout repositories missing: ${waveId}`);
  assert(before.length === after.length, `rollout repository cardinality changed: ${waveId}`);
  assert(
    JSON.stringify([...before].sort()) === JSON.stringify([...after].sort()),
    `rollout repository set changed: ${waveId}`,
  );
}

function verifyAcceptancePreservedOrStrengthened(before, after, waveId) {
  assert(before && after, `rollout acceptance missing: ${waveId}`);
  for (const [key, value] of Object.entries(before)) {
    assert(key in after, `rollout acceptance key removed: ${waveId}:${key}`);
    if (typeof value === 'boolean' && typeof after[key] === 'boolean') {
      assert(!(value === true && after[key] === false), `rollout acceptance weakened: ${waveId}:${key}`);
    } else {
      assert(after[key] === value, `rollout acceptance changed incompatibly: ${waveId}:${key}`);
    }
  }
}

function verifyHistoricalCompletions(beforeProgress, afterProgress, repositories, waveId) {
  const beforeCompleted = completedByRepository(beforeProgress);
  const afterCompleted = completedByRepository(afterProgress);
  assert(
    afterCompleted.size === Number(afterProgress.completed_count || 0),
    `completed rows/count mismatch: ${waveId}`,
  );
  assert(
    afterCompleted.size >= beforeCompleted.size,
    `completed repository count regressed: ${waveId}`,
  );
  for (const [repository, row] of beforeCompleted) {
    assert(afterCompleted.has(repository), `completed repository disappeared: ${waveId}:${repository}`);
    assert(
      JSON.stringify(afterCompleted.get(repository)) === JSON.stringify(row),
      `historical completion receipt changed: ${waveId}:${repository}`,
    );
  }
  for (const repository of afterCompleted.keys()) {
    assert(repositories.includes(repository), `completed repository outside governed wave: ${waveId}:${repository}`);
    assert(
      repository.toLowerCase() !== 'github',
      'GitHub company identity must not enter portfolio rollout progress',
    );
  }
}

function verifyCommonWaveSafety(before, after, beforePolicy, afterPolicy) {
  assert(after.id === before.id, `rollout wave identity changed: ${before.id}`);
  assert(after.priority === before.priority, `rollout wave priority changed: ${before.id}`);
  sameRepositorySet(before.repositories, after.repositories, before.id);
  verifyAcceptancePreservedOrStrengthened(before.acceptance, after.acceptance, before.id);
  assert(
    rankState(after.current_state) >= rankState(before.current_state),
    `rollout state regressed: ${before.id}`,
  );
  assert(
    rankEvidence(afterPolicy, after.current_evidence) >= rankEvidence(beforePolicy, before.current_evidence),
    `rollout evidence regressed: ${before.id}`,
  );
  assert(
    rankEvidence(afterPolicy, after.target_evidence) >= rankEvidence(beforePolicy, before.target_evidence),
    `rollout target evidence weakened: ${before.id}`,
  );
  assert(typeof after.objective === 'string' && after.objective.trim(), `rollout objective missing: ${before.id}`);

  const beforeProgress = before.progress || {};
  const afterProgress = after.progress || {};
  assert(Number.isInteger(beforeProgress.completed_count), `deployed completed count missing: ${before.id}`);
  assert(Number.isInteger(afterProgress.completed_count), `current completed count missing: ${before.id}`);
  assert(Number.isInteger(beforeProgress.remaining_count), `deployed remaining count missing: ${before.id}`);
  assert(Number.isInteger(afterProgress.remaining_count), `current remaining count missing: ${before.id}`);
  assert(afterProgress.completed_count >= beforeProgress.completed_count, `completed count regressed: ${before.id}`);
  assert(afterProgress.remaining_count >= 0, `remaining count invalid: ${before.id}`);
  verifyHistoricalCompletions(beforeProgress, afterProgress, after.repositories, before.id);

  if (afterProgress.next_repository != null) {
    assert(after.repositories.includes(afterProgress.next_repository), `next repository outside governed wave: ${before.id}`);
    const completed = completedByRepository(afterProgress);
    assert(!completed.has(afterProgress.next_repository), `next repository is already completed: ${before.id}`);
  }
}

function verifyPolicySuperset(beforePolicy, afterPolicy) {
  assert(beforePolicy && afterPolicy, 'rollout policy missing');
  for (const [key, value] of Object.entries(beforePolicy)) {
    assert(key in afterPolicy, `rollout policy key removed: ${key}`);
    assert(JSON.stringify(afterPolicy[key]) === JSON.stringify(value), `rollout base policy changed: ${key}`);
  }
  const requiredV2 = {
    direction: 'MAXIMUM_COHERENT_ADVANCE',
    presume_capability_value_until_inspected: true,
    inventory_cannot_authorize_retirement: true,
    similarity_cannot_establish_redundancy: true,
    retirement_requires_operator_authorization: true,
    retirement_requires_verified_capability_preservation: true,
    local_constraints_may_not_become_global_doctrine: true,
  };
  for (const [key, value] of Object.entries(requiredV2)) {
    assert(afterPolicy[key] === value, `rollout v2 APEX policy missing or weakened: ${key}`);
  }
}

function verifySameSchemaEquivalence(before, after) {
  assert(after.schema === before.schema, 'rollout schema changed');
  assert(after.portfolio_root === before.portfolio_root, 'rollout portfolio root changed');
  assert(after.inventory_manifest === before.inventory_manifest, 'rollout inventory authority changed');
  assert(
    JSON.stringify(normalizedRootStatus(after.root_status)) === JSON.stringify(normalizedRootStatus(before.root_status)),
    'rollout root status changed',
  );
  assert(JSON.stringify(after.policy) === JSON.stringify(before.policy), 'rollout policy changed');
  assert(Array.isArray(before.waves) && Array.isArray(after.waves), 'rollout waves missing');
  assert(after.waves.length === before.waves.length, 'rollout wave cardinality changed');

  for (let index = 0; index < before.waves.length; index += 1) {
    const beforeWave = before.waves[index];
    const afterWave = after.waves[index];
    verifyCommonWaveSafety(beforeWave, afterWave, before.policy, after.policy);
    assert(afterWave.mode === beforeWave.mode, `rollout wave mode changed: ${beforeWave.id}`);
    assert(afterWave.objective === beforeWave.objective, `rollout wave objective changed: ${beforeWave.id}`);
    assert(afterWave.target_evidence === beforeWave.target_evidence, `rollout wave target changed: ${beforeWave.id}`);
    assert(
      afterWave.progress.remaining_count <= beforeWave.progress.remaining_count,
      `remaining count increased without a stronger target: ${beforeWave.id}`,
    );
  }

  return {
    status: 'PASS',
    equivalence: true,
    recompile_required: false,
    reason: 'SAME_SCHEMA_SEMANTIC_EQUIVALENCE',
  };
}

function verifyV1ToV2Evolution(before, after) {
  assert(before.schema === V1 && after.schema === V2, 'unsupported rollout schema evolution');
  assert(after.portfolio_root === before.portfolio_root, 'rollout portfolio root changed');
  assert(after.inventory_manifest === before.inventory_manifest, 'rollout inventory authority changed');
  assert(
    JSON.stringify(normalizedRootStatus(after.root_status)) === JSON.stringify(normalizedRootStatus(before.root_status)),
    'rollout root status changed',
  );
  verifyPolicySuperset(before.policy, after.policy);
  assert(Array.isArray(before.waves) && Array.isArray(after.waves), 'rollout waves missing');
  assert(after.waves.length === before.waves.length, 'rollout wave cardinality changed');

  const expectedModes = new Map([
    ['VERIFY', 'EVOLVE'],
    ['CONSOLIDATE_OR_ARCHIVE', 'PRODUCTIZE'],
  ]);
  for (let index = 0; index < before.waves.length; index += 1) {
    const beforeWave = before.waves[index];
    const afterWave = after.waves[index];
    verifyCommonWaveSafety(beforeWave, afterWave, before.policy, after.policy);
    assert(
      afterWave.mode === expectedModes.get(beforeWave.mode),
      `rollout v2 mode did not strengthen as expected: ${beforeWave.id}`,
    );
  }

  return {
    status: 'RECOMPILE_REQUIRED',
    equivalence: false,
    recompile_required: true,
    reason: 'INTENTIONAL_APEX_ROLLOUT_V2_SEMANTIC_EVOLUTION',
  };
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

let decision;
if (before.schema === after.schema) {
  assert(before.schema === V1 || before.schema === V2, `unsupported rollout schema: ${before.schema}`);
  decision = verifySameSchemaEquivalence(before, after);
} else {
  decision = verifyV1ToV2Evolution(before, after);
}

console.log(JSON.stringify({
  ...decision,
  schema: 'glaciereq.portfolio-rollout-equivalence.v2',
  path: ROLLOUT_PATH,
  deployed_rollout_schema: before.schema,
  current_rollout_schema: after.schema,
  deployed_helix_commit: deployedCommit,
  current_helix_commit: currentCommit,
  waves: after.waves.map((wave) => ({
    id: wave.id,
    mode: wave.mode,
    target_evidence: wave.target_evidence,
    completed_count: wave.progress?.completed_count,
    remaining_count: wave.progress?.remaining_count,
    next_repository: wave.progress?.next_repository || null,
  })),
  preservation: {
    portfolio_root_preserved: true,
    inventory_authority_preserved: true,
    repository_sets_preserved: true,
    historical_completion_rows_preserved: true,
    evidence_not_regressed: true,
    target_evidence_not_weakened: true,
    github_company_identity_absent_from_rollout_progress: true,
  },
}, null, 2));

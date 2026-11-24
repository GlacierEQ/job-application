import { readFile } from 'node:fs/promises';

// Validate both a stable rollout and its explicitly governed v1 -> v2
// evolution. A rollout schema migration is not literal equivalence: describe
// removed wave memberships and historical receipts as verification debt.
const root = new URL('../', import.meta.url);
const read = (path) => readFile(new URL(path, root), 'utf8');
const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};
const SHA40 = /^[a-f0-9]{40}$/;
const ROLLOUT_PATH = 'manifests/portfolio_rollout.json';

async function fetchJson(repository, commit, path, label) {
  assert(SHA40.test(commit || ''), `${label}: invalid commit`);
  const response = await fetch(`https://raw.githubusercontent.com/${repository}/${commit}/${path}`, {
    headers: { Accept: 'application/json', 'Cache-Control': 'no-cache', 'User-Agent': 'GlacierEQ-rollout-equivalence/2.0' },
  });
  const text = await response.text();
  assert(response.status === 200, `${label}: HTTP ${response.status}`);
  try { return JSON.parse(text); }
  catch (error) { throw new Error(`${label}: invalid JSON: ${error instanceof Error ? error.message : String(error)}`); }
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

function stableWave(wave) {
  return {
    id: wave.id, priority: wave.priority, mode: wave.mode,
    objective: wave.objective, target_evidence: wave.target_evidence,
    acceptance: wave.acceptance, repositories: wave.repositories,
  };
}

function normalizedReceipt(row) {
  const { canonical_commit, source_commit, ...other } = row;
  return { ...other, commit: source_commit ?? canonical_commit };
}

function checkProgressIntegrity(wave, { migrated }) {
  assert(typeof wave.id === 'string' && Array.isArray(wave.repositories), 'wave contract missing');
  assert(new Set(wave.repositories).size === wave.repositories.length, `duplicate repositories: ${wave.id}`);
  const progress = wave.progress || {};
  assert(Number.isInteger(progress.completed_count) && progress.completed_count >= 0, `completed count missing: ${wave.id}`);
  assert(Number.isInteger(progress.remaining_count) && progress.remaining_count >= 0, `remaining count missing: ${wave.id}`);
  const completed = completedByRepository(progress);
  assert(completed.size === progress.completed_count, `completed rows/count mismatch: ${wave.id}`);
  for (const row of completed.values()) {
    assert(wave.repositories.includes(row.repository), `completed repository outside governed wave: ${wave.id}:${row.repository}`);
    assert(rankState(row.state) >= 1, `completed repository is unverified: ${wave.id}:${row.repository}`);
    assert(rankEvidence({ promotion_path: ['INVENTORY','DOCUMENTATION','STATIC_ANALYSIS','BUILD','TEST','INTEGRATION','DEPLOYMENT'] }, row.evidence) >= 0, `invalid evidence: ${row.repository}`);
    assert(SHA40.test(row.source_commit ?? row.canonical_commit ?? ''), `completion source commit missing: ${row.repository}`);
  }
  if (progress.next_repository != null) {
    assert(wave.repositories.includes(progress.next_repository), `next repository outside governed wave: ${wave.id}`);
    assert(!completed.has(progress.next_repository), `next repository already completed: ${wave.id}`);
  }
  // v2 counts can represent a new evidence stage for a previously completed
  // repository (Tower of Babel). Do not mislabel that as a lost repository.
  if (!migrated) assert(progress.completed_count + progress.remaining_count === wave.repositories.length, `rollout cardinality drift: ${wave.id}`);
  else assert(progress.completed_count <= wave.repositories.length && progress.remaining_count <= wave.repositories.length, `implausible migrated rollout count: ${wave.id}`);
  return completed;
}

const freshness = JSON.parse(await read('projects/github-merge-authority-proof/proof/production-evolving-freshness-readback.json'));
const localHelix = JSON.parse(await read('site-v15/data/helix-root.json'));
const deployedCommit = freshness.production_projection?.helix_commit;
const currentCommit = localHelix.source?.root_ref;
assert(SHA40.test(deployedCommit || ''), 'deployed Helix commit invalid');
assert(SHA40.test(currentCommit || ''), 'current Helix commit invalid');

const before = await fetchJson('GlacierEQ/job-app-helix', deployedCommit, ROLLOUT_PATH, 'deployed rollout');
const after = await fetchJson('GlacierEQ/job-app-helix', currentCommit, ROLLOUT_PATH, 'current rollout');
assert(before.schema === 'glaciereq.portfolio.rollout.v1' || before.schema === 'glaciereq.portfolio.rollout.v2', 'unknown deployed rollout schema');
const migrated = before.schema === 'glaciereq.portfolio.rollout.v1' && after.schema === 'glaciereq.portfolio.rollout.v2';
assert(migrated || after.schema === before.schema, 'unsupported rollout schema transition');
assert(after.portfolio_root === before.portfolio_root, 'rollout portfolio root changed');
assert(after.inventory_manifest === before.inventory_manifest, 'rollout inventory authority changed');
assert(JSON.stringify(after.policy?.promotion_path) === JSON.stringify(before.policy?.promotion_path), 'rollout evidence progression changed');
assert(after.policy?.fail_closed === true && before.policy?.fail_closed === true, 'rollout fail-closed contract regressed');
assert(Array.isArray(before.waves) && Array.isArray(after.waves), 'rollout waves missing');

if (migrated) {
  assert(after.policy?.direction === 'MAXIMUM_COHERENT_ADVANCE', 'v2 capability-evolution direction is missing');
  assert(after.policy?.retirement_requires_verified_capability_preservation === true, 'v2 capability-preservation gate missing');
  assert(after.policy?.retirement_requires_operator_authorization === true, 'v2 retirement requires operator authorization');
  assert(after.policy?.remote_ref_deletion_allowed !== true, 'v2 must not authorize remote ref deletion');
  assert(after.root_status?.source_commit === before.root_status?.canonical_commit, 'root verification receipt changed during migration');
} else {
  assert(JSON.stringify(after.policy) === JSON.stringify(before.policy), 'rollout policy changed without schema migration');
  assert(JSON.stringify(after.root_status) === JSON.stringify(before.root_status), 'rollout root status changed');
  assert(after.waves.length === before.waves.length, 'rollout wave cardinality changed');
}

const afterById = new Map(after.waves.map((wave) => [wave.id, wave]));
assert(afterById.size === after.waves.length, 'duplicate current rollout wave IDs');
const migratedWaveId = (id) => migrated && id === 'wave-4-consolidation' ? 'wave-4-capability-elevation' : id;
const historicalCompletedOutsideWave = [];
const removedWaveMemberships = [];
const admittedAdditions = [];
for (const oldWave of before.waves) {
  const wave = afterById.get(migratedWaveId(oldWave.id));
  assert(wave, `governed rollout wave disappeared: ${oldWave.id}`);
  const oldRows = checkProgressIntegrity(oldWave, { migrated: false });
  const newRows = checkProgressIntegrity(wave, { migrated });
  assert(rankState(wave.current_state) >= rankState(oldWave.current_state), `wave evidence state regressed: ${oldWave.id}`);
  assert(rankEvidence(after.policy, wave.current_evidence) >= rankEvidence(before.policy, oldWave.current_evidence), `wave evidence rank regressed: ${oldWave.id}`);
  if (!migrated) {
    assert(JSON.stringify(stableWave(wave)) === JSON.stringify(stableWave(oldWave)), `rollout wave contract changed: ${oldWave.id}`);
    assert(wave.progress.completed_count >= oldWave.progress.completed_count, `completed count regressed: ${oldWave.id}`);
    assert(wave.progress.remaining_count <= oldWave.progress.remaining_count, `remaining count increased: ${oldWave.id}`);
  }
  for (const [repository, receipt] of oldRows) {
    const current = newRows.get(repository);
    if (!current) {
      assert(migrated && !wave.repositories.includes(repository), `completed repository disappeared without migration: ${oldWave.id}:${repository}`);
      historicalCompletedOutsideWave.push({ wave: oldWave.id, repository, historical_commit: receipt.canonical_commit ?? receipt.source_commit });
    } else {
      assert(JSON.stringify(normalizedReceipt(current)) === JSON.stringify(normalizedReceipt(receipt)), `historical completion receipt changed: ${oldWave.id}:${repository}`);
    }
  }
  for (const repository of oldWave.repositories) {
    if (!wave.repositories.includes(repository)) removedWaveMemberships.push({ wave: oldWave.id, repository });
  }
  for (const repository of wave.repositories) {
    if (!oldWave.repositories.includes(repository)) admittedAdditions.push({ wave: wave.id, repository });
  }
}
for (const wave of after.waves) {
  checkProgressIntegrity(wave, { migrated });
  assert(wave.repositories.every((repository) => repository.toLowerCase() !== 'github'), 'GitHub company identity must not enter portfolio rollout progress');
}

console.log(JSON.stringify({
  status: migrated ? 'PASS_WITH_DISCLOSED_SCHEMA_MIGRATION_DEBT' : 'PASS',
  schema: 'glaciereq.portfolio-rollout-transition-validation.v2',
  path: ROLLOUT_PATH,
  deployed_helix_commit: deployedCommit,
  current_helix_commit: currentCommit,
  deployed_schema: before.schema,
  current_schema: after.schema,
  literal_equivalence: !migrated,
  migration_evidence_debt: migrated ? { removed_wave_memberships: removedWaveMemberships, historical_completed_outside_current_wave: historicalCompletedOutsideWave, added_wave_memberships: admittedAdditions } : null,
  waves: after.waves.map((wave) => ({ id: wave.id, completed_count: wave.progress?.completed_count, remaining_count: wave.progress?.remaining_count })),
  historical_completed_receipts_preserved_where_scope_overlaps: true,
  migrated_changes_are_explicitly_reported: true,
}, null, 2));

import { readFile } from 'node:fs/promises';

const root = new URL('../', import.meta.url);
const read = (path) => readFile(new URL(path, root), 'utf8');
const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};
const SHA40 = /^[a-f0-9]{40}$/;
const SHA256 = /^[a-f0-9]{64}$/;
const DEPLOYMENT_ID = /^dpl_[A-Za-z0-9]+$/;

async function fetchJson(url, label, headers = {}) {
  const response = await fetch(url, {
    headers: {
      Accept: 'application/json',
      'Cache-Control': 'no-cache',
      'User-Agent': 'GlacierEQ-evolving-production-readback/2.0',
      ...headers,
    },
  });
  const text = await response.text();
  assert(response.status === 200, `${label}: HTTP ${response.status}`);
  try {
    return { response, text, value: JSON.parse(text) };
  } catch (error) {
    throw new Error(`${label}: invalid JSON: ${error instanceof Error ? error.message : String(error)}`);
  }
}

async function fetchLive(alias, path, label, parseJson = true) {
  assert(typeof alias === 'string' && /^[a-z0-9.-]+$/.test(alias), 'canonical alias invalid');
  const url = new URL(path, `https://${alias}`);
  url.searchParams.set('__glaciereq_readback', String(Date.now()));
  const response = await fetch(url, {
    headers: {
      Accept: parseJson ? 'application/json' : 'text/html,*/*;q=0.8',
      'Cache-Control': 'no-cache',
      'User-Agent': 'GlacierEQ-evolving-production-readback/2.0',
    },
  });
  const text = await response.text();
  assert(response.status === 200, `${label}: HTTP ${response.status}`);
  if (!parseJson) return { response, text };
  try {
    return { response, text, value: JSON.parse(text) };
  } catch (error) {
    throw new Error(`${label}: invalid JSON: ${error instanceof Error ? error.message : String(error)}`);
  }
}

async function verifyHelixEquivalence(deployedCommit, currentCommit, allowedPrefixes) {
  assert(SHA40.test(deployedCommit || ''), 'deployed Helix commit invalid');
  assert(SHA40.test(currentCommit || ''), 'current Helix commit invalid');
  assert(Array.isArray(allowedPrefixes) && allowedPrefixes.length > 0, 'Helix allowed delta policy missing');
  assert(allowedPrefixes.every((prefix) => typeof prefix === 'string' && prefix.length > 0), 'Helix allowed delta policy malformed');
  if (deployedCommit === currentCommit) {
    return { status: 'EXACT_COMMIT_MATCH', changed_files: [] };
  }

  const token = process.env.GITHUB_TOKEN;
  assert(token, 'GITHUB_TOKEN required for Helix equivalence comparison');
  const response = await fetch(
    `https://api.github.com/repos/GlacierEQ/job-app-helix/compare/${deployedCommit}...${currentCommit}`,
    {
      headers: {
        Accept: 'application/vnd.github+json',
        Authorization: `Bearer ${token}`,
        'X-GitHub-Api-Version': '2022-11-28',
        'User-Agent': 'GlacierEQ-evolving-production-readback/2.0',
      },
    },
  );
  assert(response.ok, `Helix compare failed: HTTP ${response.status}`);
  const comparison = await response.json();
  assert(comparison.merge_base_commit?.sha === deployedCommit, 'deployed Helix commit is not merge base of current authority');
  assert(comparison.status === 'ahead', `unexpected Helix compare status: ${comparison.status}`);
  assert(Array.isArray(comparison.files) && comparison.files.length > 0, 'Helix compare returned no changed files');
  const changedFiles = comparison.files.map((row) => String(row.filename || ''));
  const violations = changedFiles.filter(
    (filename) => !allowedPrefixes.some((prefix) => filename.startsWith(prefix)),
  );
  assert(violations.length === 0, `projection-capable Helix drift detected: ${violations.join(', ')}`);
  return {
    status: 'AUDITED_NON_PROJECTION_DELTA',
    changed_files: changedFiles,
    ahead_by: comparison.ahead_by,
  };
}

async function verifyBuildReceipt(sourceCommit, buildReceipt) {
  const token = process.env.GITHUB_TOKEN;
  assert(token, 'GITHUB_TOKEN required for build receipt verification');
  assert(SHA40.test(sourceCommit || ''), 'production source commit invalid');
  assert(Number.isSafeInteger(buildReceipt.github_actions_run_id) && buildReceipt.github_actions_run_id > 0, 'workflow run id invalid');
  assert(Number.isSafeInteger(buildReceipt.github_actions_artifact_id) && buildReceipt.github_actions_artifact_id > 0, 'artifact id invalid');
  assert(/^sha256:[a-f0-9]{64}$/.test(buildReceipt.github_actions_artifact_digest || ''), 'artifact digest invalid');

  const headers = {
    Authorization: `Bearer ${token}`,
    'X-GitHub-Api-Version': '2022-11-28',
  };
  const run = (await fetchJson(
    `https://api.github.com/repos/GlacierEQ/job-application/actions/runs/${buildReceipt.github_actions_run_id}`,
    'V25 workflow run',
    headers,
  )).value;
  assert(run.head_sha === sourceCommit, 'V25 workflow source SHA drift');
  assert(run.conclusion === 'success', 'V25 workflow is not successful');

  const artifacts = (await fetchJson(
    `https://api.github.com/repos/GlacierEQ/job-application/actions/runs/${buildReceipt.github_actions_run_id}/artifacts`,
    'V25 artifacts',
    headers,
  )).value;
  const artifact = artifacts.artifacts?.find((item) => item.id === buildReceipt.github_actions_artifact_id);
  assert(artifact, 'V25 artifact id not present in bound workflow');
  assert(artifact.name === buildReceipt.github_actions_artifact_name, 'V25 artifact name drift');
  assert(artifact.digest === buildReceipt.github_actions_artifact_digest, 'V25 artifact digest drift');
  assert(artifact.workflow_run?.head_sha === sourceCommit, 'V25 artifact source SHA drift');
  return { run_id: run.id, artifact_id: artifact.id, artifact_digest: artifact.digest };
}

const publicReceipt = JSON.parse(await read('projects/github-merge-authority-proof/proof/public-projection-readback.json'));
assert(publicReceipt.schema === 'glaciereq.public-projection-readback.v2', 'unexpected public readback schema');
assert(publicReceipt.company === 'GitHub' && publicReceipt.capability === 'merge_authority_graph', 'public readback identity drift');

const freshnessPath = publicReceipt.current_production_freshness_readback;
assert(typeof freshnessPath === 'string' && freshnessPath.length > 0, 'current production freshness pointer missing');
const freshness = JSON.parse(await read(freshnessPath));
assert(freshness.schema === 'glaciereq.production-evolving-freshness-readback.v1', 'unexpected evolving freshness schema');
assert(freshness.status === 'PASS', 'evolving production freshness is not PASS');
assert(freshness.company === 'GitHub' && freshness.capability === 'merge_authority_graph', 'evolving freshness identity drift');

const expected = publicReceipt.expected_public_projection;
assert(expected.stage === 'CLAIM_PROMOTED', 'expected GitHub stage drift');
assert(expected.claim_ceiling === 'proof_bound_company_specific', 'expected GitHub claim ceiling drift');
assert(expected.claim_receipts === 2, 'expected GitHub claim receipt count drift');

const evolution = freshness.repository_evolution;
assert(evolution.repository_state === 'EVOLVING', 'Apex repository state is not EVOLVING');
assert(SHA40.test(evolution.canonical_anchor_head || ''), 'Apex canonical anchor invalid');
assert(SHA40.test(evolution.evolved_head || ''), 'Apex evolved head invalid');
assert(evolution.next_gate === 'NEXT_MEASURED_EVOLUTION', 'Apex next evolution gate drift');
assert(publicReceipt.projection_authority?.repository_state === 'EVOLVING', 'public projection repository state drift');
assert(publicReceipt.projection_authority?.canonical_anchor_head === evolution.canonical_anchor_head, 'public projection canonical anchor drift');
assert(publicReceipt.projection_authority?.current_evolved_head === evolution.evolved_head, 'public projection evolved head drift');

const production = freshness.production_projection;
assert(production.project === 'casey-barton-glaciereq', 'production project drift');
assert(DEPLOYMENT_ID.test(production.deployment_id || ''), 'production deployment id invalid');
assert(production.canonical_alias === 'casey-barton-glaciereq.vercel.app', 'production canonical alias drift');
assert(SHA40.test(production.source_commit || ''), 'production source commit invalid');
assert(SHA40.test(production.helix_commit || ''), 'production Helix commit invalid');
assert(publicReceipt.projection_authority?.deployed_helix_sha === production.helix_commit, 'public projection deployed Helix drift');

const localHelix = JSON.parse(await read('site-v15/data/helix-root.json'));
assert(localHelix.schema === 'glaciereq.public-portfolio-projection.v1', 'unexpected current Helix projection schema');
const currentHelixCommit = localHelix.source?.root_ref;
assert(SHA40.test(currentHelixCommit || ''), 'current Helix projection commit invalid');
const authorityEquivalence = await verifyHelixEquivalence(
  production.helix_commit,
  currentHelixCommit,
  freshness.authority_freshness?.allowed_delta_prefixes,
);

const currentGithub = localHelix.companies?.find((row) => row.company_id === 'github');
assert(currentGithub, 'GitHub missing from current Helix projection');
assert(currentGithub.second_depth?.stage === expected.stage, 'current Helix GitHub stage drift');
assert(currentGithub.second_depth?.claim_ceiling === expected.claim_ceiling, 'current Helix GitHub claim ceiling drift');
assert(currentGithub.second_depth?.evidence?.claim_receipts?.length === expected.claim_receipts, 'current Helix GitHub claim receipt count drift');

const record = JSON.parse(await read(expected.record_path));
const page = await read(expected.page_path);
assert(record.id === 'github', 'generated GitHub record identity drift');
assert(record.second_depth?.stage === expected.stage, 'generated GitHub record stage drift');
assert(record.second_depth?.claim_ceiling === expected.claim_ceiling, 'generated GitHub record claim ceiling drift');
assert(record.second_depth?.evidence?.claim_receipts?.length === expected.claim_receipts, 'generated GitHub record claim receipt count drift');
assert(/Independent GlacierEQ work/i.test(page), 'generated GitHub page independent-work boundary missing');
assert(/no GitHub affiliation/i.test(page), 'generated GitHub page no-affiliation boundary missing');
assert(/adoption/i.test(page), 'generated GitHub page no-adoption boundary missing');

const boundary = freshness.claim_boundary;
assert(boundary.company_stage === expected.stage && boundary.claim_ceiling === expected.claim_ceiling, 'claim boundary stage/ceiling drift');
assert(boundary.claim_receipts === expected.claim_receipts, 'claim boundary receipt count drift');
assert(boundary.portfolio_projection_is_production_deployed === true, 'portfolio deployment not receipted');
assert(boundary.github_capability_production_deployment_claimed === false, 'GitHub capability deployment claim must remain false');
assert(boundary.github_adoption_claimed === false, 'GitHub adoption claim must remain false');
assert(boundary.github_affiliation_claimed === false, 'GitHub affiliation claim must remain false');
assert(boundary.production_scale_reliability_claimed === false, 'production-scale reliability claim must remain false');

const buildVerification = await verifyBuildReceipt(production.source_commit, freshness.build_receipt);
const alias = production.canonical_alias;
const [liveBundle, liveV25, liveV26, liveCompiler, liveRecord, liveHtml] = await Promise.all([
  fetchLive(alias, '/__v25_bundle_verify', 'live bundle verifier'),
  fetchLive(alias, '/__v25_verify', 'live V25 verifier'),
  fetchLive(alias, '/__v26_verify', 'live V26 verifier'),
  fetchLive(alias, '/data/application-compiler.json?company=github&depth=senior_engineer', 'live GitHub compiler'),
  fetchLive(alias, '/companies/github/record.json', 'live GitHub record'),
  fetchLive(alias, '/companies/github/', 'live GitHub HTML', false),
]);

assert(liveBundle.value.status === 'PASS', 'live bundle verifier is not PASS');
assert(liveBundle.value.source_commit === production.source_commit, 'live bundle source commit drift');
assert(liveBundle.value.factory_bundle_sha256 === freshness.build_receipt.factory_bundle_sha256, 'live bundle factory digest drift');
assert(liveBundle.value.module_count === freshness.build_receipt.module_count, 'live bundle module count drift');
assert(liveBundle.value.bootstrap_network_fetch_required === false, 'live bundle requires bootstrap network fetch');
assert(liveBundle.value.runtime_string_evaluation_required === false, 'live bundle requires runtime string evaluation');
assert(liveBundle.value.every_factory_sha256_verified_before_execution === true, 'live bundle factory verification drift');

assert(liveV25.value.status === 'PASS', 'live V25 verifier is not PASS');
assert(liveV25.value.compiler_helix_commit === production.helix_commit, 'live V25 Helix authority drift');
assert(Array.isArray(liveV25.value.errors) && liveV25.value.errors.length === 0, 'live V25 verifier has errors');
assert(liveV26.value.status === 'PASS', 'live V26 verifier is not PASS');
assert(liveV26.value.inherited_v25?.status === 'PASS', 'live V26 inherited V25 state drift');
assert(Array.isArray(liveV26.value.errors) && liveV26.value.errors.length === 0, 'live V26 verifier has errors');

assert(liveCompiler.value.authority?.commit === production.helix_commit, 'live compiler Helix authority drift');
assert(liveCompiler.value.route?.company_id === 'github', 'live compiler GitHub identity drift');
assert(liveCompiler.value.company_projection?.second_depth?.stage === expected.stage, 'live compiler GitHub stage drift');
assert(liveCompiler.value.company_projection?.second_depth?.claim_ceiling === expected.claim_ceiling, 'live compiler GitHub ceiling drift');
assert(liveCompiler.value.company_projection?.second_depth?.evidence_counts?.claim_receipts === expected.claim_receipts, 'live compiler claim receipt count drift');
assert(liveCompiler.value.company_projection?.non_affiliation === boundary.public_nonclaim, 'live compiler nonclaim drift');
assert(liveCompiler.response.headers.get('x-glaciereq-compiler-helix-commit') === production.helix_commit, 'live compiler Helix header drift');

assert(liveRecord.value.id === 'github' && liveRecord.value.state === 'effective_projection', 'live GitHub record identity/state drift');
assert(liveRecord.value.second_depth?.stage === expected.stage, 'live GitHub record stage drift');
assert(liveRecord.value.second_depth?.claim_ceiling === expected.claim_ceiling, 'live GitHub record ceiling drift');
assert(liveRecord.value.second_depth?.evidence?.claim_receipts?.length === expected.claim_receipts, 'live GitHub record claim receipt count drift');
assert(liveRecord.value.source?.commit === production.helix_commit, 'live GitHub record Helix authority drift');
assert(liveRecord.value.boundary === boundary.public_nonclaim, 'live GitHub record nonclaim drift');

assert(liveHtml.text.includes(expected.stage) || /Claim Promoted/i.test(liveHtml.text), 'live GitHub HTML stage drift');
assert(liveHtml.text.includes(expected.claim_ceiling), 'live GitHub HTML claim ceiling drift');
assert(liveHtml.text.includes(boundary.public_nonclaim), 'live GitHub HTML nonclaim drift');
assert(!/<script(?:\s|>)/i.test(liveHtml.text), 'live GitHub HTML violates script-free boundary');

const gate = freshness.gate_decision;
assert(gate.repository_evolution_earned === true, 'repository evolution not earned');
assert(gate.winner_preserved_on_apex_main === true, 'evolution winner preservation missing');
assert(gate.production_build_matches_exact_source_artifact === true, 'production build/source receipt missing');
assert(gate.current_helix_projection_equivalent_under_audited_nonprojection_delta === true, 'current Helix equivalence receipt missing');
assert(gate.canonical_alias_readback_matches_deployed_authority === true, 'canonical alias readback receipt missing');
assert(gate.claim_boundary_preserved === true && gate.company_claim_unchanged === true, 'company claim boundary drift');
assert(gate.production_freshness_closed === true, 'production freshness not closed');
assert(gate.future_higher_company_claim_requires_new_evidence_gate === true, 'future higher-claim gate missing');

console.log(JSON.stringify({
  status: 'PASS',
  company: 'GitHub',
  capability: 'merge_authority_graph',
  apex_repository_state: evolution.repository_state,
  apex_canonical_anchor: evolution.canonical_anchor_head,
  apex_evolved_head: evolution.evolved_head,
  production_deployment_id: production.deployment_id,
  production_source_commit: production.source_commit,
  deployed_helix_commit: production.helix_commit,
  current_helix_commit: currentHelixCommit,
  helix_authority_equivalence: authorityEquivalence,
  stage: expected.stage,
  claim_ceiling: expected.claim_ceiling,
  claim_receipts: expected.claim_receipts,
  build_verification: buildVerification,
  live_bundle_factory_sha256: liveBundle.value.factory_bundle_sha256,
  live_bundle_module_count: liveBundle.value.module_count,
  production_freshness_closed: gate.production_freshness_closed,
}, null, 2));

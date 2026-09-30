import { createHash } from 'node:crypto';
import { access, readFile } from 'node:fs/promises';

const root = new URL('../', import.meta.url);
const read = (path) => readFile(new URL(path, root), 'utf8');
const mustExist = (path) => access(new URL(path, root));
const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

const SHA40 = /^[a-f0-9]{40}$/;
const SHA256 = /^[a-f0-9]{64}$/;
const GIT_BLOB_SHA = /^[a-f0-9]{40}$/;
const DEPLOYMENT_ID = /^dpl_[A-Za-z0-9]+$/;
const APPROVED_HELIX_NON_PROJECTION_PREFIXES = Object.freeze(['excellence/receipts/']);

const gitBlobSha = (text) => {
  const body = Buffer.from(text, 'utf8');
  return createHash('sha1').update(`blob ${body.length}\0`).update(body).digest('hex');
};

async function fetchJson(url, label, headers = {}) {
  const response = await fetch(url, {
    headers: {
      Accept: 'application/json',
      'Cache-Control': 'no-cache',
      'User-Agent': 'GlacierEQ-production-readback-gate/2.0',
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

async function fetchLive(alias, requestPath, label, parseJson = true) {
  assert(typeof alias === 'string' && /^[a-z0-9.-]+$/.test(alias), 'canonical production alias invalid');
  const url = new URL(requestPath, `https://${alias}`);
  url.searchParams.set('__glaciereq_readback', String(Date.now()));
  const response = await fetch(url, {
    headers: {
      Accept: parseJson ? 'application/json' : 'text/html,*/*;q=0.8',
      'Cache-Control': 'no-cache',
      'User-Agent': 'GlacierEQ-production-readback-gate/2.0',
    },
  });
  const text = await response.text();
  assert(response.status === 200, `${label}: canonical production HTTP ${response.status}`);
  if (!parseJson) return { response, text };
  try {
    return { response, text, value: JSON.parse(text) };
  } catch (error) {
    throw new Error(`${label}: invalid canonical JSON: ${error instanceof Error ? error.message : String(error)}`);
  }
}

async function verifyHelixAuthorityEquivalence(deployedCommit, currentCommit) {
  assert(SHA40.test(deployedCommit || ''), 'deployed Helix authority SHA invalid');
  assert(SHA40.test(currentCommit || ''), 'current Helix authority SHA invalid');
  if (deployedCommit === currentCommit) {
    return {
      status: 'EXACT_COMMIT_MATCH',
      deployed_commit: deployedCommit,
      current_commit: currentCommit,
      changed_files: [],
    };
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
        'User-Agent': 'GlacierEQ-production-readback-gate/2.0',
      },
    },
  );
  assert(response.ok, `Helix authority comparison failed: HTTP ${response.status}`);
  const comparison = await response.json();
  assert(comparison.merge_base_commit?.sha === deployedCommit, 'current Helix head is not a descendant of deployed authority');
  assert(comparison.status === 'ahead', `unexpected Helix compare status: ${comparison.status}`);
  assert(Array.isArray(comparison.files) && comparison.files.length > 0, 'Helix comparison returned no changed files');
  const violations = comparison.files.filter(
    (row) => !APPROVED_HELIX_NON_PROJECTION_PREFIXES.some((prefix) => String(row.filename || '').startsWith(prefix)),
  );
  assert(
    violations.length === 0,
    `Helix authority drift touches projection-capable paths: ${violations.map((row) => row.filename).join(', ')}`,
  );
  return {
    status: 'RECEIPT_ONLY_NON_PROJECTION_DELTA',
    deployed_commit: deployedCommit,
    current_commit: currentCommit,
    changed_files: comparison.files.map((row) => row.filename),
  };
}

const receiptPath = 'projects/github-merge-authority-proof/proof/public-projection-readback.json';
await mustExist(receiptPath);
const receipt = JSON.parse(await read(receiptPath));

assert(receipt.schema === 'glaciereq.public-projection-readback.v2', 'unexpected public readback schema');
assert(receipt.company === 'GitHub' && receipt.capability === 'merge_authority_graph', 'public readback identity drift');
assert(receipt.projection_authority?.repository_state === 'EVOLVING', 'public readback repository state drift');
assert(SHA40.test(receipt.projection_authority?.canonical_anchor_head || ''), 'canonical anchor SHA invalid');
assert(SHA40.test(receipt.projection_authority?.current_evolved_head || ''), 'evolved head SHA invalid');
assert(SHA40.test(receipt.projection_authority?.helix_sha || ''), 'effective Helix SHA invalid');
assert(receipt.historical_promotion_basis?.claim_receipt, 'historical claim receipt pointer missing');
assert(receipt.historical_promotion_basis?.production_closure_receipt, 'historical production closure pointer missing');
assert(receipt.historical_claim_promotion_readback, 'historical claim-promotion readback pointer missing');
assert(receipt.historical_canonical_freshness_readback, 'historical canonical freshness pointer missing');
assert(receipt.current_production_freshness_readback, 'current evolving production freshness pointer missing');
assert(GIT_BLOB_SHA.test(receipt.historical_promotion_basis?.claim_receipt_git_blob_sha || ''), 'historical claim Git blob SHA missing');
assert(GIT_BLOB_SHA.test(receipt.historical_promotion_basis?.production_closure_git_blob_sha || ''), 'historical production Git blob SHA missing');

const requiredPaths = [
  'projects/github-merge-authority-proof/README.md',
  'projects/github-merge-authority-proof/evidence/github-role-5611.json',
  'projects/github-merge-authority-proof/evidence/github-problem.json',
  'projects/github-merge-authority-proof/machine/implementation-inspection.json',
  'projects/github-merge-authority-proof/machine/remedy-contract.json',
  'projects/github-merge-authority-proof/proof/implementation-receipt.json',
  'projects/github-merge-authority-proof/proof/canonical-reproduction.json',
  receipt.historical_promotion_basis.claim_receipt,
  receipt.historical_promotion_basis.production_closure_receipt,
  receipt.historical_claim_promotion_readback,
  receipt.historical_canonical_freshness_readback,
  receipt.current_production_freshness_readback,
  receipt.expected_public_projection?.record_path,
  receipt.expected_public_projection?.page_path,
  'site-v15/data/helix-root.json',
  'site-v15/atlas/index.html',
];
assert(requiredPaths.every((path) => typeof path === 'string' && path.length > 0), 'public readback path contract incomplete');
for (const path of requiredPaths) await mustExist(path);

const historicalClaimText = await read(receipt.historical_promotion_basis.claim_receipt);
const historicalProductionText = await read(receipt.historical_promotion_basis.production_closure_receipt);
const historicalClaim = JSON.parse(historicalClaimText);
const historicalProduction = JSON.parse(historicalProductionText);
const historicalPromotion = JSON.parse(await read(receipt.historical_claim_promotion_readback));
const historicalCanonical = JSON.parse(await read(receipt.historical_canonical_freshness_readback));
const evolving = JSON.parse(await read(receipt.current_production_freshness_readback));
const record = JSON.parse(await read(receipt.expected_public_projection.record_path));
const page = await read(receipt.expected_public_projection.page_path);
const helix = JSON.parse(await read('site-v15/data/helix-root.json'));
const atlasPage = await read('site-v15/atlas/index.html');
const inspection = JSON.parse(await read('projects/github-merge-authority-proof/machine/implementation-inspection.json'));

const expectedStage = receipt.expected_public_projection.stage;
const expectedCeiling = receipt.expected_public_projection.claim_ceiling;
const expectedClaimReceipts = receipt.expected_public_projection.claim_receipts;
const deployedHelixCommit = receipt.projection_authority.helix_sha;
const currentHelixCommit = helix.source?.root_ref;
const canonicalAnchor = receipt.projection_authority.canonical_anchor_head;
const evolvedHead = receipt.projection_authority.current_evolved_head;

assert(expectedStage === 'CLAIM_PROMOTED', 'expected company stage drift');
assert(expectedCeiling === 'proof_bound_company_specific', 'expected company ceiling drift');
assert(expectedClaimReceipts === 2, 'expected claim receipt cardinality drift');
assert(receipt.projection_authority.helix_stage === expectedStage, 'receipt Helix stage drift');
assert(receipt.projection_authority.helix_claim_ceiling === expectedCeiling, 'receipt Helix ceiling drift');

assert(gitBlobSha(historicalClaimText) === receipt.historical_promotion_basis.claim_receipt_git_blob_sha, 'historical claim receipt content drift');
assert(gitBlobSha(historicalProductionText) === receipt.historical_promotion_basis.production_closure_git_blob_sha, 'historical production closure content drift');
assert(historicalClaim.schema === 'glaciereq.public-claim-receipt.v1', 'historical claim schema drift');
assert(historicalProduction.schema === 'glaciereq.production-projection-closure.v1', 'historical production closure schema drift');
assert(historicalPromotion.schema === 'glaciereq.production-claim-promotion-readback.v1', 'historical claim-promotion schema drift');
assert(historicalCanonical.schema === 'glaciereq.production-canonical-freshness-readback.v1', 'historical canonical freshness schema drift');

assert(evolving.schema === 'glaciereq.production-evolving-freshness-readback.v1', 'unexpected evolving freshness schema');
assert(evolving.status === 'PASS', 'evolving freshness receipt is not PASS');
assert(evolving.company === 'GitHub' && evolving.capability === 'merge_authority_graph', 'evolving freshness identity drift');
assert(evolving.repository_evolution?.canonical_anchor_head === canonicalAnchor, 'evolving canonical anchor drift');
assert(evolving.repository_evolution?.evolved_head === evolvedHead, 'evolving head drift');
assert(evolving.repository_evolution?.helix_evolving_commit === deployedHelixCommit, 'evolving Helix authority drift');
assert(evolving.repository_evolution?.repository_state === 'EVOLVING', 'evolving repository state drift');
assert(evolving.repository_evolution?.next_gate === 'NEXT_MEASURED_EVOLUTION', 'evolving next gate drift');
assert(GIT_BLOB_SHA.test(evolving.repository_evolution?.evolution_receipt_git_blob_sha || ''), 'evolution receipt blob SHA invalid');

const production = evolving.production_projection;
assert(production?.project === 'casey-barton-glaciereq', 'production project drift');
assert(DEPLOYMENT_ID.test(production?.deployment_id || ''), 'production deployment id invalid');
assert(production?.canonical_alias === 'casey-barton-glaciereq.vercel.app', 'production alias drift');
assert(SHA40.test(production?.source_commit || ''), 'production source SHA invalid');
assert(production?.helix_commit === deployedHelixCommit, 'production Helix authority drift');

const build = evolving.build_receipt;
assert(build?.status === 'PASS', 'production build receipt is not PASS');
assert(build?.manifest_schema === 'glaciereq.v25-deployment-bundle-manifest.v2', 'production build manifest schema drift');
assert(Number.isSafeInteger(build?.module_count) && build.module_count > 0, 'production module count invalid');
assert(build?.deployment_file_count === 2, 'production deployment file count drift');
assert(Number.isSafeInteger(build?.api_index_bytes) && build.api_index_bytes > 100_000, 'production api/index byte count invalid');
assert(SHA256.test(build?.api_index_sha256 || ''), 'production api/index SHA invalid');
assert(SHA256.test(build?.factory_bundle_sha256 || ''), 'production factory bundle SHA invalid');
assert(build?.self_contained_executable_modules === true, 'production bundle is not self-contained');
assert(build?.bootstrap_network_fetch_required === false, 'production bundle requires bootstrap network fetch');
assert(build?.runtime_string_evaluation_required === false, 'production bundle requires runtime string evaluation');
assert(build?.every_factory_sha256_verified_before_execution === true, 'production factory verification drift');

assert(evolving.deployment_transport?.strategy === 'PINNED_SOURCE_DETERMINISTIC_REBUILD', 'production transport strategy drift');
assert(evolving.deployment_transport?.pinned_source_commit === production.source_commit, 'transport source pin drift');
assert(evolving.deployment_transport?.pinned_helix_commit === deployedHelixCommit, 'transport Helix pin drift');
assert(evolving.deployment_transport?.runtime_network_bootstrap_added === false, 'runtime bootstrap network fetch was added');
assert(evolving.deployment_transport?.runtime_string_evaluation_added === false, 'runtime string evaluation was added');

const boundary = evolving.claim_boundary;
assert(boundary?.company_stage === expectedStage, 'evolving claim stage drift');
assert(boundary?.claim_ceiling === expectedCeiling, 'evolving claim ceiling drift');
assert(boundary?.claim_receipts === expectedClaimReceipts, 'evolving claim receipt cardinality drift');
assert(boundary?.portfolio_projection_is_production_deployed === true, 'portfolio production deployment not receipted');
assert(boundary?.github_capability_production_deployment_claimed === false, 'GitHub capability production deployment claim must remain false');
assert(boundary?.github_adoption_claimed === false, 'GitHub adoption claim must remain false');
assert(boundary?.github_affiliation_claimed === false, 'GitHub affiliation claim must remain false');
assert(boundary?.production_scale_reliability_claimed === false, 'production-scale reliability claim must remain false');
assert(/Independent GlacierEQ work/i.test(boundary?.public_nonclaim || ''), 'independent-work nonclaim missing');

assert(evolving.source_disclosure?.canonical_repository_visibility === 'private', 'Apex private-repository boundary drift');
assert(evolving.source_disclosure?.entire_private_repository_public === false, 'entire private repository cannot be public');
assert(evolving.source_disclosure?.bounded_evolution_source_slice_publicly_disclosed === true, 'bounded evolution source disclosure missing');
assert(evolving.source_disclosure?.public_repository === 'GlacierEQ/public-actions-runner-host', 'bounded source disclosure repository drift');
assert(evolving.source_disclosure?.public_pull_request === 269, 'bounded source disclosure PR drift');
assert(Array.isArray(evolving.source_disclosure?.public_files) && evolving.source_disclosure.public_files.length === 3, 'bounded source disclosure file set drift');

const gate = evolving.gate_decision;
assert(gate?.repository_evolution_earned === true, 'repository evolution not earned');
assert(gate?.winner_preserved_on_apex_main === true, 'evolution winner not preserved');
assert(gate?.production_projection_recompiled_from_evolving_helix === true, 'production projection not compiled from evolving Helix');
assert(gate?.production_build_matches_admitted_main_artifact === true, 'production build does not match admitted artifact');
assert(gate?.canonical_alias_readback_matches_evolving_authority === true, 'canonical alias readback does not match evolving authority');
assert(gate?.claim_boundary_preserved === true && gate?.company_claim_unchanged === true, 'evolution inflated company claim');
assert(gate?.production_freshness_closed === true, 'production freshness not closed');
assert(gate?.future_higher_company_claim_requires_new_evidence_gate === true, 'future higher-claim gate missing');

const publicTruthText = `${JSON.stringify(record)}\n${page}`;
assert(record.id === 'github', 'GitHub record identity drift');
assert(record.second_depth?.stage === expectedStage, 'GitHub record stage drift');
assert(record.second_depth?.claim_ceiling === expectedCeiling, 'GitHub record claim ceiling drift');
assert(Array.isArray(record.second_depth?.evidence?.claim_receipts) && record.second_depth.evidence.claim_receipts.length === expectedClaimReceipts, 'GitHub record claim receipt cardinality drift');
assert(/github/i.test(page), 'GitHub identity missing from company page');
assert(page.includes(expectedStage) || /Claim Promoted/i.test(page), 'company page stage drift');
assert(page.includes(expectedCeiling), 'company page claim ceiling drift');
assert(/Independent GlacierEQ work/i.test(publicTruthText), 'independent-work boundary missing');
assert(/no (?:GitHub )?affiliation/i.test(publicTruthText), 'no-affiliation boundary missing');
assert(/\badoption\b/i.test(publicTruthText), 'no-adoption boundary missing');
assert(/production deployment/i.test(publicTruthText), 'no-production-deployment boundary missing');
assert(inspection.visibility === 'private' && inspection.source_not_disclosed === true, 'private implementation boundary drift');

assert(helix.schema === 'glaciereq.public-portfolio-projection.v1', 'unexpected public Helix schema');
const github = Array.isArray(helix.companies) ? helix.companies.find((company) => company.company_id === 'github') : null;
assert(github, 'GitHub missing from fresh Helix projection');
assert(github.second_depth?.stage === expectedStage, 'fresh Helix GitHub stage drift');
assert(github.second_depth?.claim_ceiling === expectedCeiling, 'fresh Helix GitHub ceiling drift');
assert(Array.isArray(github.second_depth?.evidence?.claim_receipts) && github.second_depth.evidence.claim_receipts.length === expectedClaimReceipts, 'fresh Helix GitHub claim receipt cardinality drift');
assert(atlasPage.includes('/companies/github/') && (atlasPage.includes('GitHub · Claim Promoted') || atlasPage.includes('GitHub · CLAIM_PROMOTED')), 'fresh Atlas GitHub promotion route missing');

const authorityEquivalence = await verifyHelixAuthorityEquivalence(deployedHelixCommit, currentHelixCommit);

const apexUrl = `https://raw.githubusercontent.com/GlacierEQ/job-app-helix/${currentHelixCommit}/manifests/repo_excellence/apex-github-worker.json`;
const apex = (await fetchJson(apexUrl, 'Apex evolving record')).value;
assert(apex.identity?.repository === 'GlacierEQ/apex-github-worker', 'Apex repository identity drift');
assert(apex.state === 'EVOLVING', 'Apex record is not EVOLVING');
assert(apex.identity?.canonical_head === canonicalAnchor, 'Apex canonical anchor drift');
assert(apex.identity?.current_evolved_head === evolvedHead, 'Apex evolved head drift');
assert(apex.capability_id === 'merge_authority_graph', 'Apex capability drift');
assert(apex.company_evidence?.stage === expectedStage, 'Apex company stage drift');
assert(apex.company_evidence?.claim_ceiling === expectedCeiling, 'Apex company ceiling drift');
assert(apex.evolution_receipt?.status === 'PASS', 'Apex evolution receipt is not PASS');
assert(apex.evolution_receipt?.transition === 'CANONICAL -> EVOLVING', 'Apex evolution transition drift');
assert(apex.evolution_receipt?.evolved_head === evolvedHead, 'Apex evolution receipt head drift');
assert(apex.evolution?.next_gate === 'NEXT_MEASURED_EVOLUTION', 'Apex next evolution gate drift');

const alias = production.canonical_alias;
const [liveBundle, liveV25, liveV26, liveCompiler, liveRecord, liveHtml] = await Promise.all([
  fetchLive(alias, '/__v25_bundle_verify', 'live bundle verifier'),
  fetchLive(alias, '/__v25_verify', 'live V25 verifier'),
  fetchLive(alias, '/__v26_verify', 'live V26 verifier'),
  fetchLive(alias, '/data/application-compiler.json?company=github&depth=senior_engineer', 'live GitHub compiler'),
  fetchLive(alias, '/companies/github/record.json', 'live GitHub company record'),
  fetchLive(alias, '/companies/github/', 'live GitHub company HTML', false),
]);

assert(liveBundle.value.status === 'PASS', 'canonical live bundle verifier is not PASS');
assert(liveBundle.value.source_commit === production.source_commit, 'canonical live bundle source drift');
assert(liveBundle.value.module_count === build.module_count, 'canonical live bundle module count drift');
assert(liveBundle.value.factory_bundle_sha256 === build.factory_bundle_sha256, 'canonical live factory digest drift');
assert(liveBundle.value.runtime_string_evaluation_required === false, 'canonical live bundle requires runtime string evaluation');
assert(liveBundle.value.bootstrap_network_fetch_required === false, 'canonical live bundle requires bootstrap fetch');
assert(liveBundle.value.every_factory_sha256_verified_before_execution === true, 'canonical live factory verification drift');
assert(liveBundle.response.headers.get('x-glaciereq-bridge-commit') === production.source_commit, 'canonical live bridge source header drift');

assert(liveV25.value.status === 'PASS', 'canonical live V25 verifier is not PASS');
assert(liveV25.value.compiler_helix_commit === deployedHelixCommit, 'canonical live V25 Helix drift');
assert(Array.isArray(liveV25.value.errors) && liveV25.value.errors.length === 0, 'canonical live V25 errors');
assert(liveV25.response.headers.get('x-glaciereq-compiler-helix-commit') === deployedHelixCommit, 'canonical live V25 Helix header drift');

assert(liveV26.value.status === 'PASS', 'canonical live V26 verifier is not PASS');
assert(liveV26.value.inherited_v25?.status === 'PASS', 'canonical live V26 inherited V25 is not PASS');
assert(Array.isArray(liveV26.value.errors) && liveV26.value.errors.length === 0, 'canonical live V26 errors');

assert(liveCompiler.value.authority?.commit === deployedHelixCommit, 'canonical live compiler authority drift');
assert(liveCompiler.value.route?.company_id === 'github', 'canonical live compiler company identity drift');
assert(liveCompiler.value.company_projection?.second_depth?.stage === expectedStage, 'canonical live compiler stage drift');
assert(liveCompiler.value.company_projection?.second_depth?.claim_ceiling === expectedCeiling, 'canonical live compiler ceiling drift');
assert(liveCompiler.value.company_projection?.second_depth?.evidence_counts?.claim_receipts === expectedClaimReceipts, 'canonical live compiler claim receipt cardinality drift');
assert(liveCompiler.value.company_projection?.non_affiliation === boundary.public_nonclaim, 'canonical live compiler nonclaim drift');

assert(liveRecord.value.id === 'github' && liveRecord.value.state === 'effective_projection', 'canonical live company record identity/state drift');
assert(liveRecord.value.second_depth?.stage === expectedStage, 'canonical live company record stage drift');
assert(liveRecord.value.second_depth?.claim_ceiling === expectedCeiling, 'canonical live company record ceiling drift');
assert(Array.isArray(liveRecord.value.second_depth?.evidence?.claim_receipts) && liveRecord.value.second_depth.evidence.claim_receipts.length === expectedClaimReceipts, 'canonical live company record claim receipt cardinality drift');
assert(liveRecord.value.source?.commit === deployedHelixCommit, 'canonical live company record Helix source drift');
assert(liveRecord.value.boundary === boundary.public_nonclaim, 'canonical live company record nonclaim drift');

assert(liveHtml.text.includes(expectedStage) || /Claim Promoted/i.test(liveHtml.text), 'canonical live company HTML stage drift');
assert(liveHtml.text.includes(expectedCeiling), 'canonical live company HTML ceiling drift');
assert(liveHtml.text.includes(boundary.public_nonclaim), 'canonical live company HTML nonclaim drift');
assert(!/<script(?:\s|>)/i.test(liveHtml.text), 'canonical live company HTML violates script-free boundary');
assert(!/\sstyle\s*=\s*/i.test(liveHtml.text), 'canonical live company HTML violates inline-style boundary');

assert(evolving.live_readback?.bundle_verifier?.status === 'PASS', 'recorded bundle readback is not PASS');
assert(evolving.live_readback?.v25_verifier?.status === 'PASS', 'recorded V25 readback is not PASS');
assert(evolving.live_readback?.v26_verifier?.status === 'PASS', 'recorded V26 readback is not PASS');
assert(evolving.live_readback?.github_compiler_json?.stage === expectedStage, 'recorded compiler stage drift');
assert(evolving.live_readback?.github_company_record?.stage === expectedStage, 'recorded company record stage drift');
assert(evolving.live_readback?.github_company_html?.script_free === true, 'recorded company HTML script-free boundary drift');

console.log(JSON.stringify({
  status: 'PASS',
  schema: receipt.schema,
  company: 'GitHub',
  capability: 'merge_authority_graph',
  repository_state: apex.state,
  canonical_anchor_head: canonicalAnchor,
  current_evolved_head: evolvedHead,
  current_helix_sha: currentHelixCommit,
  deployed_helix_sha: deployedHelixCommit,
  helix_authority_equivalence: authorityEquivalence,
  stage: github.second_depth.stage,
  claim_ceiling: github.second_depth.claim_ceiling,
  claim_receipts: github.second_depth.evidence.claim_receipts.length,
  next_gate: apex.evolution.next_gate,
  canonical_alias: alias,
  live_bundle_source_commit: liveBundle.value.source_commit,
  live_compiler_helix_commit: liveCompiler.value.authority.commit,
  production_deployment_id: production.deployment_id,
  production_freshness_closed: gate.production_freshness_closed,
  private_source_disclosed: false,
}, null, 2));

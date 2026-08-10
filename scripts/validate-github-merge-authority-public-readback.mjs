import { createHash } from 'node:crypto';
import { access, readFile } from 'node:fs/promises';
import { brotliDecompressSync } from 'node:zlib';

const root = new URL('../', import.meta.url);
const read = (path) => readFile(new URL(path, root), 'utf8');
const mustExist = (path) => access(new URL(path, root));
const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};
const SHA40 = /^[a-f0-9]{40}$/;
const SHA256 = /^[a-f0-9]{64}$/;
const GIT_BLOB_SHA = /^[a-f0-9]{40}$/;

function gitBlobSha(text) {
  const body = Buffer.from(text, 'utf8');
  return createHash('sha1')
    .update(`blob ${body.length}\0`)
    .update(body)
    .digest('hex');
}

function sha256(value) {
  return createHash('sha256').update(value).digest('hex');
}

async function fetchJson(url, label) {
  const response = await fetch(url, {
    headers: {
      Accept: 'application/json',
      'Cache-Control': 'no-cache',
      'User-Agent': 'GlacierEQ-production-readback-gate/1.1',
    },
  });
  const text = await response.text();
  assert(response.status === 200, `${label}: HTTP ${response.status}`);
  try {
    return { response, text, value: JSON.parse(text) };
  } catch (error) {
    throw new Error(`${label}: response is not valid JSON: ${error instanceof Error ? error.message : String(error)}`);
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
      'User-Agent': 'GlacierEQ-production-readback-gate/1.1',
    },
  });
  const text = await response.text();
  assert(response.status === 200, `${label}: canonical production HTTP ${response.status}`);
  if (!parseJson) return { response, text };
  try {
    return { response, text, value: JSON.parse(text) };
  } catch (error) {
    throw new Error(`${label}: canonical production response is not valid JSON: ${error instanceof Error ? error.message : String(error)}`);
  }
}

async function verifyHelixAuthorityEquivalence(deployedCommit, currentCommit, allowedPrefixes) {
  assert(SHA40.test(deployedCommit || ''), 'deployed Helix authority SHA invalid');
  assert(SHA40.test(currentCommit || ''), 'current Helix authority SHA invalid');
  assert(
    Array.isArray(allowedPrefixes)
      && allowedPrefixes.length > 0
      && allowedPrefixes.every((prefix) => typeof prefix === 'string' && prefix.length > 0),
    'Helix authority-equivalence path policy missing',
  );

  if (deployedCommit === currentCommit) {
    return {
      status: 'EXACT_COMMIT_MATCH',
      deployed_commit: deployedCommit,
      current_commit: currentCommit,
      changed_files: [],
    };
  }

  const token = process.env.GITHUB_TOKEN;
  assert(token, 'GITHUB_TOKEN is required to verify Helix authority equivalence');
  const response = await fetch(
    `https://api.github.com/repos/GlacierEQ/job-app-helix/compare/${deployedCommit}...${currentCommit}`,
    {
      headers: {
        Accept: 'application/vnd.github+json',
        Authorization: `Bearer ${token}`,
        'X-GitHub-Api-Version': '2022-11-28',
        'User-Agent': 'GlacierEQ-production-readback-gate/1.1',
      },
    },
  );
  assert(response.ok, `Helix authority comparison failed: HTTP ${response.status}`);
  const comparison = await response.json();
  assert(
    comparison.merge_base_commit?.sha === deployedCommit,
    'current Helix head is not a descendant of deployed immutable authority',
  );
  assert(comparison.status === 'ahead', `unexpected Helix compare status: ${comparison.status}`);
  assert(Array.isArray(comparison.files) && comparison.files.length > 0, 'Helix authority comparison returned no changed files');

  const violations = comparison.files.filter(
    (row) => !allowedPrefixes.some((prefix) => String(row.filename || '').startsWith(prefix)),
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

async function verifyImmutableTransport(transport, buildReceipt) {
  assert(transport?.mode === 'build_time_immutable_github_parts', 'unexpected production transport mode');
  assert(transport?.repository === 'GlacierEQ/job-application', 'production transport repository drift');
  assert(SHA40.test(transport?.commit || ''), 'production transport commit invalid');
  assert(typeof transport?.base_path === 'string' && transport.base_path.endsWith('/'), 'production transport base path invalid');
  assert(Array.isArray(transport?.admitted_parts) && transport.admitted_parts.length >= 1, 'production transport parts missing');
  assert(transport.build_time_only === true, 'production transport must remain build-time only');
  assert(transport.runtime_bootstrap_network_fetch_required === false, 'production transport introduced runtime bootstrap fetch');

  const chunks = [];
  for (const part of transport.admitted_parts) {
    assert(typeof part?.file === 'string' && /^[a-z0-9.-]+$/i.test(part.file), `transport part file invalid: ${part?.file}`);
    assert(SHA256.test(part?.sha256 || ''), `transport part digest invalid: ${part?.file}`);
    const url = `https://raw.githubusercontent.com/${transport.repository}/${transport.commit}/${transport.base_path}${part.file}`;
    const response = await fetch(url, {
      headers: {
        'Cache-Control': 'no-cache',
        'User-Agent': 'GlacierEQ-production-readback-gate/1.1',
      },
    });
    const text = await response.text();
    assert(response.status === 200, `transport part fetch failed: ${part.file}: HTTP ${response.status}`);
    assert(sha256(text) === part.sha256, `transport part digest drift: ${part.file}`);
    chunks.push(text);
  }

  const encoded = chunks.join('');
  assert(encoded.length === transport.base64_length, 'transport base64 length drift');
  const runtime = brotliDecompressSync(Buffer.from(encoded, 'base64'));
  assert(runtime.length === transport.reconstructed_api_index_bytes, 'transport reconstructed byte length drift');
  assert(sha256(runtime) === transport.reconstructed_api_index_sha256, 'transport reconstructed runtime digest drift');
  assert(runtime.length === buildReceipt.api_index_bytes, 'transport/build api/index byte mismatch');
  assert(sha256(runtime) === buildReceipt.api_index_sha256, 'transport/build api/index digest mismatch');

  return {
    commit: transport.commit,
    admitted_parts: transport.admitted_parts.length,
    base64_length: encoded.length,
    api_index_bytes: runtime.length,
    api_index_sha256: sha256(runtime),
  };
}

const receiptPath = 'projects/github-merge-authority-proof/proof/public-projection-readback.json';
await mustExist(receiptPath);
const receipt = JSON.parse(await read(receiptPath));

assert(receipt.historical_promotion_basis?.claim_receipt, 'historical claim receipt pointer missing');
assert(receipt.historical_promotion_basis?.production_closure_receipt, 'historical production closure pointer missing');
assert(receipt.production_claim_promotion_readback, 'historical claim-promotion production readback pointer missing');
assert(receipt.production_canonical_freshness_readback, 'canonical production freshness readback pointer missing');
assert(GIT_BLOB_SHA.test(receipt.historical_promotion_basis?.claim_receipt_git_blob_sha || ''), 'historical claim receipt Git blob SHA missing');
assert(GIT_BLOB_SHA.test(receipt.historical_promotion_basis?.production_closure_git_blob_sha || ''), 'historical production closure Git blob SHA missing');

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
  receipt.production_claim_promotion_readback,
  receipt.production_canonical_freshness_readback,
  receipt.expected_public_projection?.record_path,
  receipt.expected_public_projection?.page_path,
  'site-v15/data/helix-root.json',
  'site-v15/atlas/index.html',
];
assert(requiredPaths.every((path) => typeof path === 'string' && path.length > 0), 'public readback path contract incomplete');
for (const path of requiredPaths) await mustExist(path);

const historicalClaimText = await read(receipt.historical_promotion_basis.claim_receipt);
const historicalProductionText = await read(receipt.historical_promotion_basis.production_closure_receipt);
const claimPromotionProductionText = await read(receipt.production_claim_promotion_readback);
const canonicalProductionText = await read(receipt.production_canonical_freshness_readback);
const historicalClaim = JSON.parse(historicalClaimText);
const historicalProduction = JSON.parse(historicalProductionText);
const claimPromotionProduction = JSON.parse(claimPromotionProductionText);
const canonicalProduction = JSON.parse(canonicalProductionText);
const record = JSON.parse(await read(receipt.expected_public_projection.record_path));
const page = await read(receipt.expected_public_projection.page_path);
const helix = JSON.parse(await read('site-v15/data/helix-root.json'));
const atlasPage = await read('site-v15/atlas/index.html');
const inspection = JSON.parse(await read('projects/github-merge-authority-proof/machine/implementation-inspection.json'));

const expectedStage = receipt.expected_public_projection.stage;
const expectedCeiling = receipt.expected_public_projection.claim_ceiling;
const expectedClaimReceipts = receipt.expected_public_projection.claim_receipts;
const deployedHelixCommit = receipt.projection_authority?.helix_sha;
const currentHelixCommit = helix.source?.root_ref;

assert(receipt.schema === 'glaciereq.public-projection-readback.v1', 'unexpected public readback schema');
assert(receipt.company === 'GitHub' && receipt.capability === 'merge_authority_graph', 'public readback identity drift');
assert(expectedStage === 'CLAIM_PROMOTED', 'final expected stage must be CLAIM_PROMOTED');
assert(expectedCeiling === 'proof_bound_company_specific', 'final expected claim ceiling drift');
assert(expectedClaimReceipts === 2, 'final expected claim receipt cardinality drift');
assert(SHA40.test(deployedHelixCommit || ''), 'public readback deployed Helix authority invalid');
assert(receipt.projection_authority?.helix_stage === expectedStage, 'receipt Helix stage drift');
assert(receipt.projection_authority?.helix_claim_ceiling === expectedCeiling, 'receipt Helix ceiling drift');

const recordText = JSON.stringify(record);
const publicTruthText = `${recordText}\n${page}`;
assert(record.id === 'github', 'GitHub company identity missing from record');
assert(record.second_depth?.stage === expectedStage, `record stage is not ${expectedStage}`);
assert(record.second_depth?.claim_ceiling === expectedCeiling, `record claim ceiling is not ${expectedCeiling}`);
assert(Array.isArray(record.second_depth?.evidence?.claim_receipts) && record.second_depth.evidence.claim_receipts.length === expectedClaimReceipts, 'record claim receipt cardinality drift');
assert(/github/i.test(page), 'GitHub identity missing from company page');
assert(page.includes(expectedStage) || /Claim Promoted/i.test(page), 'company page does not present CLAIM_PROMOTED');
assert(page.includes(expectedCeiling), 'company page claim ceiling drift');
assert(/Independent GlacierEQ work/i.test(publicTruthText), 'independent-work boundary missing');
assert(/no (?:GitHub )?affiliation/i.test(publicTruthText), 'no-affiliation boundary missing');
assert(/\badoption\b/i.test(publicTruthText), 'no-adoption boundary missing');
assert(/production deployment/i.test(publicTruthText), 'no-production-deployment boundary missing');

assert(helix.schema === 'glaciereq.public-portfolio-projection.v1', 'unexpected public Helix projection schema');
assert(Array.isArray(helix.companies) && helix.companies.length > 0, 'Helix company projection is empty');
const github = helix.companies.find((company) => company.company_id === 'github');
assert(github, 'GitHub is missing from the freshly compiled Helix company projection');
assert(github.second_depth?.stage === expectedStage, 'Helix GitHub stage drift');
assert(github.second_depth?.claim_ceiling === expectedCeiling, 'Helix GitHub claim ceiling drift');
assert(Array.isArray(github.second_depth?.evidence?.claim_receipts) && github.second_depth.evidence.claim_receipts.length === expectedClaimReceipts, 'Helix GitHub claim receipt cardinality drift');
assert(atlasPage.includes('/companies/github/') && (atlasPage.includes('GitHub · Claim Promoted') || atlasPage.includes('GitHub · CLAIM_PROMOTED')), 'fresh Helix Atlas does not expose the GitHub CLAIM_PROMOTED route');

assert(inspection.visibility === 'private', 'private implementation visibility boundary drift');
assert(inspection.source_not_disclosed === true, 'private source disclosure boundary drift');

assert(gitBlobSha(historicalClaimText) === receipt.historical_promotion_basis.claim_receipt_git_blob_sha, 'historical claim receipt content no longer matches admitted Git blob');
assert(gitBlobSha(historicalProductionText) === receipt.historical_promotion_basis.production_closure_git_blob_sha, 'historical production closure content no longer matches admitted Git blob');
assert(receipt.historical_promotion_basis.admitted_commit === '577f63c506c6c4df9c1751a0ff5b8fa07822e491', 'historical promotion admission commit drift');
assert(historicalClaim.schema === 'glaciereq.public-claim-receipt.v1', 'historical claim receipt schema drift');
assert(historicalClaim.company === 'GitHub' && historicalClaim.capability === 'merge_authority_graph', 'historical claim identity drift');
assert(historicalClaim.stage === 'PROOF_REPRODUCED', 'historical claim receipt stage drift');
assert(historicalClaim.claim_ceiling === 'reproducible_company_specific_proof', 'historical claim receipt ceiling drift');
assert(historicalClaim.proof_basis?.canonical_promotion_head === 'f791c85a81768e72446619b39b5312ef1c768a02', 'historical canonical promotion head drift');
assert(historicalClaim.proof_basis?.reproduced_source_sha === '1a5331a0203e1273c1045589ea66f5bcf1080b55', 'historical reproduced source drift');
assert(historicalClaim.proof_basis?.provider_mutation_sha === '1ec5b60e46c1e5e706838d6291ac6523fdc18a5a', 'historical provider mutation drift');
assert(Array.isArray(historicalClaim.prohibited_claims) && historicalClaim.prohibited_claims.length >= 5, 'historical claim nonclaims incomplete');

assert(historicalProduction.schema === 'glaciereq.production-projection-closure.v1', 'historical production closure schema drift');
assert(historicalProduction.production_projection?.deployment_id === 'dpl_5xSnF1gFFq52CCdmo4TLZnQbPcm5', 'historical production deployment identity drift');
assert(historicalProduction.production_projection?.source_commit === 'ddc745c7c7358232fc817d95972bbd4acf002a7a', 'historical production source drift');
assert(historicalProduction.production_projection?.helix_commit === '86e642b01817adad3d4e89da86a0f9a857c09cc4', 'historical production Helix authority drift');
assert(historicalProduction.gate_decision?.projection_truth_closed === true, 'historical projection truth closure drift');

// Preserve the claim-promotion production receipt as historical evidence; do not rewrite it to fake canonical freshness.
assert(claimPromotionProduction.schema === 'glaciereq.production-claim-promotion-readback.v1', 'historical claim-promotion readback schema drift');
assert(claimPromotionProduction.promotion_basis?.transition === 'PROOF_REPRODUCED -> CLAIM_PROMOTED', 'historical claim transition drift');
assert(claimPromotionProduction.production_projection?.deployment_id === 'dpl_HxKmXvuPT3jBjEHasbM4kTb1ZrTJ', 'historical claim-promotion deployment drift');
assert(claimPromotionProduction.production_projection?.helix_commit === 'b09b7925a5448b934c69e8f175f6b6747794a474', 'historical claim-promotion Helix drift');
assert(claimPromotionProduction.gate_decision?.apex_repository_state === 'PROMOTED', 'historical Apex PROMOTED receipt drift');
assert(claimPromotionProduction.gate_decision?.apex_canonical_transition_not_inferred === true, 'historical receipt must not retroactively infer Apex CANONICAL');

// Current production freshness receipt must independently close the post-canonicalization authority change.
assert(canonicalProduction.schema === 'glaciereq.production-canonical-freshness-readback.v1', 'unexpected canonical freshness schema');
assert(canonicalProduction.company === 'GitHub' && canonicalProduction.capability === 'merge_authority_graph', 'canonical freshness identity drift');
assert(canonicalProduction.canonicalization_basis?.repository === 'GlacierEQ/apex-github-worker', 'Apex canonical repository identity drift');
assert(canonicalProduction.canonicalization_basis?.canonical_head === 'f791c85a81768e72446619b39b5312ef1c768a02', 'Apex canonical implementation head drift');
assert(canonicalProduction.canonicalization_basis?.helix_canonicalization_commit === deployedHelixCommit, 'Apex canonicalization Helix commit drift');
assert(canonicalProduction.canonicalization_basis?.repository_state === 'CANONICAL', 'Apex canonical state receipt drift');
assert(canonicalProduction.canonicalization_basis?.next_principal_gate === 'EVOLVING', 'Apex next principal gate drift');
assert(canonicalProduction.canonicalization_basis?.next_principal_gate_earned === false, 'Apex EVOLVING must remain unearned');
assert(canonicalProduction.canonicalization_basis?.company_stage_unchanged === expectedStage, 'canonicalization inflated company stage');
assert(canonicalProduction.canonicalization_basis?.company_claim_ceiling_unchanged === expectedCeiling, 'canonicalization inflated company claim ceiling');

assert(canonicalProduction.production_projection?.project === 'casey-barton-glaciereq', 'canonical production project drift');
assert(canonicalProduction.production_projection?.deployment_id === 'dpl_9nNhbKeFL4Aco4UKYiDr7z2mVoMA', 'canonical production deployment identity drift');
assert(canonicalProduction.production_projection?.canonical_alias === 'casey-barton-glaciereq.vercel.app', 'canonical production alias drift');
assert(canonicalProduction.production_projection?.source_commit === 'da6a6ac0f5c2a5bd61945e1935c4fcc92bcc5b07', 'canonical production source drift');
assert(canonicalProduction.production_projection?.helix_commit === deployedHelixCommit, 'canonical production Helix authority drift');
assert(canonicalProduction.authority_freshness?.production_helix_commit === deployedHelixCommit, 'canonical freshness deployed Helix mismatch');

const authorityEquivalence = await verifyHelixAuthorityEquivalence(
  deployedHelixCommit,
  currentHelixCommit,
  canonicalProduction.authority_freshness?.allowed_delta_prefixes,
);

const buildReceipt = canonicalProduction.build_receipt;
assert(buildReceipt?.status === 'PASS', 'canonical production build receipt is not PASS');
assert(buildReceipt?.schema === 'glaciereq.v25-deployment-bundle-manifest.v2', 'canonical production build schema drift');
assert(buildReceipt?.workflow_run_id === 31411659620, 'canonical production workflow run identity drift');
assert(buildReceipt?.artifact_id === 9071806942, 'canonical production artifact identity drift');
assert(buildReceipt?.artifact_zip_sha256 === '6bd76e5ec9be8619e7efe779077abbaf4318828b82d53faa5cbddbbbb290d9d8', 'canonical production artifact digest drift');
assert(buildReceipt?.module_count === 9, 'canonical production module count drift');
assert(buildReceipt?.api_index_bytes === 197218, 'canonical production api/index byte count drift');
assert(SHA256.test(buildReceipt?.api_index_sha256 || ''), 'canonical production api/index digest invalid');
assert(SHA256.test(buildReceipt?.factory_bundle_sha256 || ''), 'canonical production factory bundle digest invalid');
assert(buildReceipt?.self_contained_executable_modules === true, 'canonical production bundle is not self-contained');
assert(buildReceipt?.bootstrap_network_fetch_required === false, 'canonical production bundle requires bootstrap network fetch');
assert(buildReceipt?.runtime_string_evaluation_required === false, 'canonical production bundle requires runtime string evaluation');
assert(buildReceipt?.every_factory_sha256_verified_before_execution === true, 'canonical production factory verification contract drift');
assert(buildReceipt?.deployment_file_count === 2, 'canonical production deployment file count drift');

const transportVerification = await verifyImmutableTransport(canonicalProduction.transport_receipt, buildReceipt);
assert(canonicalProduction.transport_receipt?.production_deployment_id === canonicalProduction.production_projection.deployment_id, 'transport/production deployment mismatch');

for (const key of ['bundle_verifier', 'v25_verifier', 'v26_verifier']) {
  assert(canonicalProduction.live_readback?.[key]?.http_status === 200, `${key} recorded HTTP readback drift`);
  assert(canonicalProduction.live_readback?.[key]?.status === 'PASS', `${key} recorded status is not PASS`);
}
for (const key of ['github_compiler_json', 'github_company_record']) {
  assert(canonicalProduction.live_readback?.[key]?.http_status === 200, `${key} recorded HTTP readback drift`);
  assert(canonicalProduction.live_readback?.[key]?.stage === expectedStage, `${key} recorded stage drift`);
  assert(canonicalProduction.live_readback?.[key]?.claim_ceiling === expectedCeiling, `${key} recorded claim ceiling drift`);
  assert(canonicalProduction.live_readback?.[key]?.claim_receipts === expectedClaimReceipts, `${key} recorded claim receipt cardinality drift`);
  assert(canonicalProduction.live_readback?.[key]?.helix_commit === deployedHelixCommit, `${key} recorded Helix authority drift`);
}
assert(canonicalProduction.live_readback?.github_company_html?.http_status === 200, 'GitHub company HTML recorded HTTP readback drift');
assert(canonicalProduction.live_readback?.github_company_html?.stage === expectedStage, 'GitHub company HTML recorded stage drift');
assert(canonicalProduction.live_readback?.github_company_html?.claim_ceiling === expectedCeiling, 'GitHub company HTML recorded claim ceiling drift');
assert(canonicalProduction.live_readback?.github_company_html?.claim_receipts_visible === expectedClaimReceipts, 'GitHub company HTML recorded claim receipt cardinality drift');

const boundary = canonicalProduction.claim_boundary;
assert(boundary?.portfolio_projection_is_production_deployed === true, 'portfolio production deployment not receipted');
assert(boundary?.github_capability_production_deployment_claimed === false, 'GitHub capability production claim must remain false');
assert(boundary?.github_adoption_claimed === false, 'GitHub adoption claim must remain false');
assert(boundary?.github_affiliation_claimed === false, 'GitHub affiliation claim must remain false');
assert(boundary?.production_scale_reliability_claimed === false, 'production-scale reliability claim must remain false');
assert(boundary?.private_implementation_source_public === false, 'private implementation source publication must remain false');
assert(boundary?.apex_canonicalization_inflates_company_claim === false, 'Apex canonicalization must not inflate the GitHub company claim');

const gate = canonicalProduction.gate_decision;
assert(gate?.effective_helix_claim_promoted === true, 'effective Helix promotion not receipted');
assert(gate?.outward_projection_compiled_from_effective_authority === true, 'outward projection is not compiled from effective authority');
assert(gate?.canonical_production_readback_matches_authority === true, 'canonical production readback mismatch');
assert(gate?.claim_receipts_present === expectedClaimReceipts, 'canonical gate claim receipt cardinality drift');
assert(gate?.claim_boundary_preserved === true, 'canonical claim boundary not preserved');
assert(gate?.production_freshness_closed_after_apex_canonicalization === true, 'post-canonicalization production freshness not closed');
assert(gate?.apex_repository_state === 'CANONICAL', 'Apex canonical gate state drift');
assert(gate?.apex_next_principal_gate === 'EVOLVING', 'Apex next gate drift');
assert(gate?.apex_evolving_earned === false, 'Apex EVOLVING must remain unearned');
assert(gate?.company_stage === expectedStage, 'canonical gate company stage drift');
assert(gate?.company_claim_ceiling === expectedCeiling, 'canonical gate company claim ceiling drift');
assert(gate?.future_higher_claim_requires_new_evidence_gate === true, 'future higher-claim gate drift');

// Verify the repository-level CANONICAL record from the exact deployed Helix authority.
const apexUrl = `https://raw.githubusercontent.com/GlacierEQ/job-app-helix/${deployedHelixCommit}/manifests/repo_excellence/apex-github-worker.json`;
const apex = (await fetchJson(apexUrl, 'Apex canonical record')).value;
assert(apex.repository === 'GlacierEQ/apex-github-worker', 'Apex canonical record repository drift');
assert(apex.current_state?.state === 'CANONICAL', 'Apex canonical record is not CANONICAL');
assert(apex.implementation?.head === canonicalProduction.canonicalization_basis.canonical_head, 'Apex canonical record implementation head drift');
assert(apex.company_evidence?.stage === expectedStage, 'Apex canonical record company stage drift');
assert(apex.company_evidence?.claim_ceiling === expectedCeiling, 'Apex canonical record company ceiling drift');
assert(apex.evolution?.next_principal_gate === 'EVOLVING', 'Apex canonical record next gate drift');
assert(apex.canonical_position_receipt?.status === 'CANONICAL_POSITION_VERIFIED', 'Apex canonical position receipt not verified');

// Independently fetch the canonical production alias. Recorded receipts alone are insufficient.
const alias = canonicalProduction.production_projection.canonical_alias;
const [liveBundle, liveV25, liveV26, liveCompiler, liveRecord, liveHtml] = await Promise.all([
  fetchLive(alias, '/__v25_bundle_verify', 'live bundle verifier'),
  fetchLive(alias, '/__v25_verify', 'live V25 verifier'),
  fetchLive(alias, '/__v26_verify', 'live V26 verifier'),
  fetchLive(alias, '/data/application-compiler.json?company=github&depth=senior_engineer', 'live GitHub compiler'),
  fetchLive(alias, '/companies/github/record.json', 'live GitHub company record'),
  fetchLive(alias, '/companies/github/', 'live GitHub company HTML', false),
]);

assert(liveBundle.value.status === 'PASS', 'canonical live bundle verifier is not PASS');
assert(liveBundle.value.source_commit === canonicalProduction.production_projection.source_commit, 'canonical live bundle source SHA drift');
assert(liveBundle.value.module_count === buildReceipt.module_count, 'canonical live bundle module count drift');
assert(liveBundle.value.factory_bundle_sha256 === buildReceipt.factory_bundle_sha256, 'canonical live factory bundle digest drift');
assert(liveBundle.value.runtime_string_evaluation_required === false, 'canonical live bundle requires runtime string evaluation');
assert(liveBundle.value.bootstrap_network_fetch_required === false, 'canonical live bundle requires bootstrap network fetch');
assert(liveBundle.value.every_factory_sha256_verified_before_execution === true, 'canonical live factory verification drift');
assert(liveBundle.response.headers.get('x-glaciereq-bridge-commit') === canonicalProduction.production_projection.source_commit, 'canonical live bridge source header drift');

assert(liveV25.value.status === 'PASS', 'canonical live V25 verifier is not PASS');
assert(liveV25.value.compiler_helix_commit === deployedHelixCommit, 'canonical live V25 Helix authority drift');
assert(liveV25.value.page?.company_count === canonicalProduction.live_readback.v25_verifier.company_count, 'canonical live V25 company count drift');
assert(Array.isArray(liveV25.value.errors) && liveV25.value.errors.length === 0, 'canonical live V25 verifier reports errors');
assert(liveV25.response.headers.get('x-glaciereq-compiler-helix-commit') === deployedHelixCommit, 'canonical live V25 Helix header drift');

assert(liveV26.value.status === 'PASS', 'canonical live V26 verifier is not PASS');
assert(liveV26.value.inherited_v25?.status === 'PASS', 'canonical live V26 inherited V25 verifier is not PASS');
assert(Array.isArray(liveV26.value.errors) && liveV26.value.errors.length === 0, 'canonical live V26 verifier reports errors');

assert(liveCompiler.value.authority?.commit === deployedHelixCommit, 'canonical live compiler authority drift');
assert(liveCompiler.value.authority?.second_depth_overrides === 'manifests/company_second_depth_overrides/index.json', 'canonical live compiler does not consume governed overrides');
assert(liveCompiler.value.route?.company_id === 'github', 'canonical live compiler company identity drift');
assert(liveCompiler.value.company_projection?.second_depth?.stage === expectedStage, 'canonical live compiler stage drift');
assert(liveCompiler.value.company_projection?.second_depth?.claim_ceiling === expectedCeiling, 'canonical live compiler claim ceiling drift');
assert(liveCompiler.value.company_projection?.second_depth?.evidence_counts?.claim_receipts === expectedClaimReceipts, 'canonical live compiler claim receipt cardinality drift');
assert(liveCompiler.value.company_projection?.non_affiliation === boundary.public_nonclaim, 'canonical live compiler nonclaim drift');
assert(liveCompiler.response.headers.get('x-glaciereq-compiler-helix-commit') === deployedHelixCommit, 'canonical live compiler Helix header drift');

assert(liveRecord.value.id === 'github', 'canonical live company record identity drift');
assert(liveRecord.value.state === 'effective_projection', 'canonical live company record state drift');
assert(liveRecord.value.second_depth?.stage === expectedStage, 'canonical live company record stage drift');
assert(liveRecord.value.second_depth?.claim_ceiling === expectedCeiling, 'canonical live company record claim ceiling drift');
assert(Array.isArray(liveRecord.value.second_depth?.evidence?.claim_receipts) && liveRecord.value.second_depth.evidence.claim_receipts.length === expectedClaimReceipts, 'canonical live company record claim receipt cardinality drift');
assert(liveRecord.value.source?.commit === deployedHelixCommit, 'canonical live company record Helix source drift');
assert(liveRecord.value.boundary === boundary.public_nonclaim, 'canonical live company record nonclaim drift');

const liveHtmlText = liveHtml.text;
assert(liveHtmlText.includes(expectedStage) || /Claim Promoted/i.test(liveHtmlText), 'canonical live company HTML stage drift');
assert(liveHtmlText.includes(expectedCeiling), 'canonical live company HTML claim ceiling drift');
assert(/claim receipts/i.test(liveHtmlText) && new RegExp(`claim receipts[\\s\\S]{0,240}>\\s*${expectedClaimReceipts}\\s*<`, 'i').test(liveHtmlText), 'canonical live company HTML claim receipt cardinality drift');
assert(liveHtmlText.includes(boundary.public_nonclaim), 'canonical live company HTML nonclaim drift');
assert(!/<script(?:\s|>)/i.test(liveHtmlText), 'canonical live company HTML violates script-free boundary');
assert(!/\sstyle\s*=\s*/i.test(liveHtmlText), 'canonical live company HTML violates inline-style boundary');

console.log(JSON.stringify({
  status: 'PASS',
  company: 'GitHub',
  capability: 'merge_authority_graph',
  current_helix_sha: currentHelixCommit,
  deployed_helix_sha: deployedHelixCommit,
  helix_authority_equivalence: authorityEquivalence,
  historical_claim_git_blob_sha: gitBlobSha(historicalClaimText),
  historical_production_git_blob_sha: gitBlobSha(historicalProductionText),
  stage: github.second_depth.stage,
  claim_ceiling: github.second_depth.claim_ceiling,
  claim_receipts: github.second_depth.evidence.claim_receipts.length,
  apex_repository_state: apex.current_state.state,
  apex_next_principal_gate: apex.evolution.next_principal_gate,
  apex_evolving_earned: false,
  transport_verification: transportVerification,
  canonical_alias: alias,
  live_bundle_source_commit: liveBundle.value.source_commit,
  live_compiler_helix_commit: liveCompiler.value.authority.commit,
  production_deployment_id: canonicalProduction.production_projection.deployment_id,
  production_source_commit: canonicalProduction.production_projection.source_commit,
  production_freshness_closed_after_apex_canonicalization: gate.production_freshness_closed_after_apex_canonicalization,
  private_source_disclosed: false,
}, null, 2));

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
const DEPLOYMENT_ID = /^dpl_[A-Za-z0-9]+$/;
const APPROVED_HELIX_NON_PROJECTION_PREFIXES = Object.freeze(['excellence/receipts/']);

const gitBlobSha = (text) => {
  const body = Buffer.from(text, 'utf8');
  return createHash('sha1').update(`blob ${body.length}\0`).update(body).digest('hex');
};
const sha256 = (value) => createHash('sha256').update(value).digest('hex');

async function fetchJson(url, label, headers = {}) {
  const response = await fetch(url, {
    headers: {
      Accept: 'application/json',
      'Cache-Control': 'no-cache',
      'User-Agent': 'GlacierEQ-production-readback-gate/1.1',
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
      'User-Agent': 'GlacierEQ-production-readback-gate/1.1',
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

async function verifyHelixAuthorityEquivalence(deployedCommit, currentCommit, allowedPrefixes) {
  assert(SHA40.test(deployedCommit || ''), 'deployed Helix authority SHA invalid');
  assert(SHA40.test(currentCommit || ''), 'current Helix authority SHA invalid');
  assert(Array.isArray(allowedPrefixes), 'Helix equivalence path policy missing');
  assert(
    allowedPrefixes.length === APPROVED_HELIX_NON_PROJECTION_PREFIXES.length
      && allowedPrefixes.every((prefix, index) => prefix === APPROVED_HELIX_NON_PROJECTION_PREFIXES[index]),
    'Helix equivalence path policy must exactly match the fixed approved non-projection namespace',
  );
  if (deployedCommit === currentCommit) {
    return { status: 'EXACT_COMMIT_MATCH', deployed_commit: deployedCommit, current_commit: currentCommit, changed_files: [] };
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
        'User-Agent': 'GlacierEQ-production-readback-gate/1.1',
      },
    },
  );
  assert(response.ok, `Helix authority comparison failed: HTTP ${response.status}`);
  const comparison = await response.json();
  assert(comparison.merge_base_commit?.sha === deployedCommit, 'current Helix head is not a descendant of deployed authority');
  assert(comparison.status === 'ahead', `unexpected Helix compare status: ${comparison.status}`);
  assert(Array.isArray(comparison.files) && comparison.files.length > 0, 'Helix comparison returned no changed files');
  const violations = comparison.files.filter(
    (row) => !allowedPrefixes.some((prefix) => String(row.filename || '').startsWith(prefix)),
  );
  assert(violations.length === 0, `Helix authority drift touches projection-capable paths: ${violations.map((row) => row.filename).join(', ')}`);
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
      headers: { 'Cache-Control': 'no-cache', 'User-Agent': 'GlacierEQ-production-readback-gate/1.1' },
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
assert(receipt.schema === 'glaciereq.public-projection-readback.v1', 'unexpected public readback schema');
assert(receipt.company === 'GitHub' && receipt.capability === 'merge_authority_graph', 'public readback identity drift');
assert(receipt.historical_promotion_basis?.claim_receipt, 'historical claim receipt pointer missing');
assert(receipt.historical_promotion_basis?.production_closure_receipt, 'historical production closure pointer missing');
assert(receipt.production_claim_promotion_readback, 'historical claim-promotion readback pointer missing');
assert(receipt.production_canonical_freshness_readback, 'canonical production freshness pointer missing');
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
const claimPromotionProduction = JSON.parse(await read(receipt.production_claim_promotion_readback));
const canonicalProduction = JSON.parse(await read(receipt.production_canonical_freshness_readback));
const historicalClaim = JSON.parse(historicalClaimText);
const historicalProduction = JSON.parse(historicalProductionText);
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
assert(expectedStage === 'CLAIM_PROMOTED', 'expected company stage drift');
assert(expectedCeiling === 'proof_bound_company_specific', 'expected company ceiling drift');
assert(expectedClaimReceipts === 2, 'expected claim receipt cardinality drift');
assert(SHA40.test(deployedHelixCommit || ''), 'deployed Helix authority invalid');
assert(receipt.projection_authority?.helix_stage === expectedStage, 'receipt Helix stage drift');
assert(receipt.projection_authority?.helix_claim_ceiling === expectedCeiling, 'receipt Helix ceiling drift');

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

assert(helix.schema === 'glaciereq.public-portfolio-projection.v1', 'unexpected public Helix schema');
const github = Array.isArray(helix.companies) ? helix.companies.find((company) => company.company_id === 'github') : null;
assert(github, 'GitHub missing from fresh Helix projection');
assert(github.second_depth?.stage === expectedStage, 'fresh Helix GitHub stage drift');
assert(github.second_depth?.claim_ceiling === expectedCeiling, 'fresh Helix GitHub ceiling drift');
assert(Array.isArray(github.second_depth?.evidence?.claim_receipts) && github.second_depth.evidence.claim_receipts.length === expectedClaimReceipts, 'fresh Helix GitHub claim receipt cardinality drift');
assert(atlasPage.includes('/companies/github/') && (atlasPage.includes('GitHub · Claim Promoted') || atlasPage.includes('GitHub · CLAIM_PROMOTED')), 'fresh Atlas GitHub promotion route missing');
assert(inspection.visibility === 'private' && inspection.source_not_disclosed === true, 'private implementation boundary drift');

assert(gitBlobSha(historicalClaimText) === receipt.historical_promotion_basis.claim_receipt_git_blob_sha, 'historical claim receipt content drift');
assert(gitBlobSha(historicalProductionText) === receipt.historical_promotion_basis.production_closure_git_blob_sha, 'historical production closure content drift');
assert(receipt.historical_promotion_basis.admitted_commit === '577f63c506c6c4df9c1751a0ff5b8fa07822e491', 'historical admission commit drift');
assert(historicalClaim.schema === 'glaciereq.public-claim-receipt.v1', 'historical claim schema drift');
assert(historicalClaim.stage === 'PROOF_REPRODUCED' && historicalClaim.claim_ceiling === 'reproducible_company_specific_proof', 'historical claim promotion input drift');
assert(historicalClaim.proof_basis?.canonical_promotion_head === 'f791c85a81768e72446619b39b5312ef1c768a02', 'historical canonical promotion head drift');
assert(historicalProduction.schema === 'glaciereq.production-projection-closure.v1', 'historical production closure schema drift');
assert(historicalProduction.production_projection?.deployment_id === 'dpl_5xSnF1gFFq52CCdmo4TLZnQbPcm5', 'historical production deployment drift');
assert(historicalProduction.gate_decision?.projection_truth_closed === true, 'historical projection truth closure drift');

assert(claimPromotionProduction.schema === 'glaciereq.production-claim-promotion-readback.v1', 'historical claim-promotion schema drift');
assert(claimPromotionProduction.promotion_basis?.transition === 'PROOF_REPRODUCED -> CLAIM_PROMOTED', 'historical claim transition drift');
assert(claimPromotionProduction.production_projection?.deployment_id === 'dpl_HxKmXvuPT3jBjEHasbM4kTb1ZrTJ', 'historical claim-promotion deployment drift');
assert(claimPromotionProduction.gate_decision?.apex_repository_state === 'PROMOTED', 'historical Apex PROMOTED receipt drift');
assert(claimPromotionProduction.gate_decision?.apex_canonical_transition_not_inferred === true, 'historical receipt must not infer Apex CANONICAL');

assert(canonicalProduction.schema === 'glaciereq.production-canonical-freshness-readback.v1', 'unexpected canonical freshness schema');
assert(canonicalProduction.company === 'GitHub' && canonicalProduction.capability === 'merge_authority_graph', 'canonical freshness identity drift');
assert(canonicalProduction.canonicalization_basis?.repository === 'GlacierEQ/apex-github-worker', 'Apex canonical repository receipt drift');
assert(canonicalProduction.canonicalization_basis?.canonical_head === 'f791c85a81768e72446619b39b5312ef1c768a02', 'Apex canonical head receipt drift');
assert(canonicalProduction.canonicalization_basis?.helix_canonicalization_commit === deployedHelixCommit, 'Apex canonicalization Helix receipt drift');
assert(canonicalProduction.canonicalization_basis?.repository_state === 'CANONICAL', 'Apex canonical state receipt drift');
assert(canonicalProduction.canonicalization_basis?.next_principal_gate === 'EVOLVING', 'Apex next principal gate receipt drift');
assert(canonicalProduction.canonicalization_basis?.next_principal_gate_earned === false, 'Apex EVOLVING must remain unearned');
assert(canonicalProduction.canonicalization_basis?.company_stage_unchanged === expectedStage, 'canonicalization inflated company stage');
assert(canonicalProduction.canonicalization_basis?.company_claim_ceiling_unchanged === expectedCeiling, 'canonicalization inflated company ceiling');

assert(canonicalProduction.production_projection?.project === 'casey-barton-glaciereq', 'canonical production project drift');
assert(DEPLOYMENT_ID.test(canonicalProduction.production_projection?.deployment_id || ''), 'canonical production deployment identity invalid');
assert(canonicalProduction.production_projection?.canonical_alias === 'casey-barton-glaciereq.vercel.app', 'canonical production alias drift');
assert(SHA40.test(canonicalProduction.production_projection?.source_commit || ''), 'canonical production source identity invalid');
assert(canonicalProduction.production_projection?.helix_commit === deployedHelixCommit, 'canonical production Helix drift');
assert(canonicalProduction.authority_freshness?.production_helix_commit === deployedHelixCommit, 'canonical freshness Helix mismatch');

const authorityEquivalence = await verifyHelixAuthorityEquivalence(
  deployedHelixCommit,
  currentHelixCommit,
  canonicalProduction.authority_freshness?.allowed_delta_prefixes,
);

const buildReceipt = canonicalProduction.build_receipt;
assert(buildReceipt?.status === 'PASS' && buildReceipt?.schema === 'glaciereq.v25-deployment-bundle-manifest.v2', 'canonical production build receipt drift');
assert(Number.isSafeInteger(buildReceipt?.workflow_run_id) && buildReceipt.workflow_run_id > 0, 'canonical production workflow identity invalid');
assert(Number.isSafeInteger(buildReceipt?.artifact_id) && buildReceipt.artifact_id > 0, 'canonical production artifact identity invalid');
assert(SHA256.test(buildReceipt?.artifact_zip_sha256 || ''), 'canonical production artifact digest invalid');
assert(Number.isSafeInteger(buildReceipt?.module_count) && buildReceipt.module_count > 0, 'canonical production module count invalid');
assert(Number.isSafeInteger(buildReceipt?.deployment_file_count) && buildReceipt.deployment_file_count > 0, 'canonical production deployment file count invalid');
assert(Number.isSafeInteger(buildReceipt?.api_index_bytes) && buildReceipt.api_index_bytes > 0 && SHA256.test(buildReceipt?.api_index_sha256 || ''), 'canonical production api/index identity invalid');
assert(SHA256.test(buildReceipt?.factory_bundle_sha256 || ''), 'canonical production factory digest invalid');
assert(buildReceipt?.self_contained_executable_modules === true, 'canonical production bundle is not self-contained');
assert(buildReceipt?.bootstrap_network_fetch_required === false, 'canonical production bundle requires bootstrap network fetch');
assert(buildReceipt?.runtime_string_evaluation_required === false, 'canonical production bundle requires runtime string evaluation');
assert(buildReceipt?.every_factory_sha256_verified_before_execution === true, 'canonical production factory verification drift');

const transportVerification = await verifyImmutableTransport(canonicalProduction.transport_receipt, buildReceipt);
assert(canonicalProduction.transport_receipt?.production_deployment_id === canonicalProduction.production_projection.deployment_id, 'transport/production deployment mismatch');

const boundary = canonicalProduction.claim_boundary;
assert(boundary?.portfolio_projection_is_production_deployed === true, 'portfolio production deployment not receipted');
assert(boundary?.github_capability_production_deployment_claimed === false, 'GitHub capability production claim must remain false');
assert(boundary?.github_adoption_claimed === false, 'GitHub adoption claim must remain false');
assert(boundary?.github_affiliation_claimed === false, 'GitHub affiliation claim must remain false');
assert(boundary?.production_scale_reliability_claimed === false, 'production-scale reliability claim must remain false');
assert(boundary?.private_implementation_source_public === false, 'private implementation source publication must remain false');
assert(boundary?.apex_canonicalization_inflates_company_claim === false, 'Apex canonicalization must not inflate company claim');

const gate = canonicalProduction.gate_decision;
assert(gate?.effective_helix_claim_promoted === true, 'effective Helix promotion not receipted');
assert(gate?.outward_projection_compiled_from_effective_authority === true, 'outward projection effective-authority flag drift');
assert(gate?.canonical_production_readback_matches_authority === true, 'canonical production readback mismatch');
assert(gate?.claim_receipts_present === expectedClaimReceipts && gate?.claim_boundary_preserved === true, 'canonical claim gate drift');
assert(gate?.production_freshness_closed_after_apex_canonicalization === true, 'post-canonicalization production freshness not closed');
assert(gate?.apex_repository_state === 'CANONICAL' && gate?.apex_next_principal_gate === 'EVOLVING', 'Apex canonical gate drift');
assert(gate?.apex_evolving_earned === false, 'Apex EVOLVING must remain unearned');
assert(gate?.company_stage === expectedStage && gate?.company_claim_ceiling === expectedCeiling, 'canonical company claim drift');
assert(gate?.future_higher_claim_requires_new_evidence_gate === true, 'future higher-claim gate drift');

const apexUrl = `https://raw.githubusercontent.com/GlacierEQ/job-app-helix/${deployedHelixCommit}/manifests/repo_excellence/apex-github-worker.json`;
const apex = (await fetchJson(apexUrl, 'Apex canonical record')).value;
assert(apex.identity?.repository === 'GlacierEQ/apex-github-worker', 'Apex canonical record repository drift');
assert(apex.state === 'CANONICAL', 'Apex canonical record is not CANONICAL');
assert(apex.identity?.canonical_head === canonicalProduction.canonicalization_basis.canonical_head, 'Apex canonical record head drift');
assert(apex.capability_id === 'merge_authority_graph', 'Apex canonical record capability drift');
assert(apex.company_evidence?.stage === expectedStage, 'Apex canonical record company stage drift');
assert(apex.company_evidence?.claim_ceiling === expectedCeiling, 'Apex canonical record company ceiling drift');
assert(apex.evolution?.next_gate === 'EVOLVING', 'Apex canonical record next gate drift');
assert(apex.canonical_position_receipt?.status === 'PASS', 'Apex canonical position receipt is not PASS');
assert(apex.canonical_position_receipt?.transition === 'PROMOTED -> CANONICAL', 'Apex canonical transition receipt drift');
assert(apex.canonical_position_receipt?.company_stage_unchanged === expectedStage, 'Apex canonical receipt inflated company stage');
assert(apex.canonical_position_receipt?.company_claim_ceiling_unchanged === expectedCeiling, 'Apex canonical receipt inflated company ceiling');

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
assert(liveBundle.value.source_commit === canonicalProduction.production_projection.source_commit, 'canonical live bundle source drift');
assert(liveBundle.value.module_count === buildReceipt.module_count, 'canonical live bundle module count drift');
assert(liveBundle.value.factory_bundle_sha256 === buildReceipt.factory_bundle_sha256, 'canonical live factory digest drift');
assert(liveBundle.value.runtime_string_evaluation_required === false, 'canonical live bundle requires runtime string evaluation');
assert(liveBundle.value.bootstrap_network_fetch_required === false, 'canonical live bundle requires bootstrap fetch');
assert(liveBundle.value.every_factory_sha256_verified_before_execution === true, 'canonical live factory verification drift');
assert(liveBundle.response.headers.get('x-glaciereq-bridge-commit') === canonicalProduction.production_projection.source_commit, 'canonical live bridge source header drift');

assert(liveV25.value.status === 'PASS', 'canonical live V25 verifier is not PASS');
assert(liveV25.value.compiler_helix_commit === deployedHelixCommit, 'canonical live V25 Helix drift');
assert(liveV25.value.page?.company_count === canonicalProduction.live_readback.v25_verifier.company_count, 'canonical live V25 company count drift');
assert(Array.isArray(liveV25.value.errors) && liveV25.value.errors.length === 0, 'canonical live V25 errors');
assert(liveV25.response.headers.get('x-glaciereq-compiler-helix-commit') === deployedHelixCommit, 'canonical live V25 Helix header drift');

assert(liveV26.value.status === 'PASS', 'canonical live V26 verifier is not PASS');
assert(liveV26.value.inherited_v25?.status === 'PASS', 'canonical live V26 inherited V25 is not PASS');
assert(Array.isArray(liveV26.value.errors) && liveV26.value.errors.length === 0, 'canonical live V26 errors');

assert(liveCompiler.value.authority?.commit === deployedHelixCommit, 'canonical live compiler authority drift');
assert(liveCompiler.value.authority?.second_depth_overrides === 'manifests/company_second_depth_overrides/index.json', 'canonical live compiler override authority drift');
assert(liveCompiler.value.route?.company_id === 'github', 'canonical live compiler company identity drift');
assert(liveCompiler.value.company_projection?.second_depth?.stage === expectedStage, 'canonical live compiler stage drift');
assert(liveCompiler.value.company_projection?.second_depth?.claim_ceiling === expectedCeiling, 'canonical live compiler ceiling drift');
assert(liveCompiler.value.company_projection?.second_depth?.evidence_counts?.claim_receipts === expectedClaimReceipts, 'canonical live compiler claim receipt cardinality drift');
assert(liveCompiler.value.company_projection?.non_affiliation === boundary.public_nonclaim, 'canonical live compiler nonclaim drift');
assert(liveCompiler.response.headers.get('x-glaciereq-compiler-helix-commit') === deployedHelixCommit, 'canonical live compiler Helix header drift');

assert(liveRecord.value.id === 'github' && liveRecord.value.state === 'effective_projection', 'canonical live company record identity/state drift');
assert(liveRecord.value.second_depth?.stage === expectedStage, 'canonical live company record stage drift');
assert(liveRecord.value.second_depth?.claim_ceiling === expectedCeiling, 'canonical live company record ceiling drift');
assert(Array.isArray(liveRecord.value.second_depth?.evidence?.claim_receipts) && liveRecord.value.second_depth.evidence.claim_receipts.length === expectedClaimReceipts, 'canonical live company record claim receipt cardinality drift');
assert(liveRecord.value.source?.commit === deployedHelixCommit, 'canonical live company record Helix source drift');
assert(liveRecord.value.boundary === boundary.public_nonclaim, 'canonical live company record nonclaim drift');

assert(liveHtml.text.includes(expectedStage) || /Claim Promoted/i.test(liveHtml.text), 'canonical live company HTML stage drift');
assert(liveHtml.text.includes(expectedCeiling), 'canonical live company HTML ceiling drift');
assert(/claim receipts/i.test(liveHtml.text) && new RegExp(`claim receipts[\\s\\S]{0,240}>\\s*${expectedClaimReceipts}\\s*<`, 'i').test(liveHtml.text), 'canonical live company HTML claim receipt cardinality drift');
assert(liveHtml.text.includes(boundary.public_nonclaim), 'canonical live company HTML nonclaim drift');
assert(!/<script(?:\s|>)/i.test(liveHtml.text), 'canonical live company HTML violates script-free boundary');
assert(!/\sstyle\s*=\s*/i.test(liveHtml.text), 'canonical live company HTML violates inline-style boundary');

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
  apex_repository_state: apex.state,
  apex_next_principal_gate: apex.evolution.next_gate,
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

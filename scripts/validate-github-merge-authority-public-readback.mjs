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

function gitBlobSha(text) {
  const body = Buffer.from(text, 'utf8');
  return createHash('sha1')
    .update(`blob ${body.length}\0`)
    .update(body)
    .digest('hex');
}

async function fetchLive(alias, requestPath, label, parseJson = true) {
  assert(typeof alias === 'string' && /^[a-z0-9.-]+$/.test(alias), 'canonical production alias invalid');
  const url = new URL(requestPath, `https://${alias}`);
  url.searchParams.set('__glaciereq_readback', String(Date.now()));
  const response = await fetch(url, {
    headers: {
      Accept: parseJson ? 'application/json' : 'text/html,*/*;q=0.8',
      'Cache-Control': 'no-cache',
      'User-Agent': 'GlacierEQ-production-readback-gate/1.0',
    },
  });
  const text = await response.text();
  assert(response.status === 200, `${label}: canonical production HTTP ${response.status}`);
  if (!parseJson) return { response, text };
  let value;
  try {
    value = JSON.parse(text);
  } catch (error) {
    throw new Error(`${label}: canonical production response is not valid JSON: ${error instanceof Error ? error.message : String(error)}`);
  }
  return { response, text, value };
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
        'User-Agent': 'GlacierEQ-production-readback-gate/1.0',
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

const receiptPath = 'projects/github-merge-authority-proof/proof/public-projection-readback.json';
await mustExist(receiptPath);
const receipt = JSON.parse(await read(receiptPath));

assert(receipt.historical_promotion_basis?.claim_receipt, 'historical claim receipt pointer missing');
assert(receipt.historical_promotion_basis?.production_closure_receipt, 'historical production closure pointer missing');
assert(receipt.production_claim_promotion_readback, 'final production readback pointer missing');
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
  receipt.expected_public_projection?.record_path,
  receipt.expected_public_projection?.page_path,
  'site-v15/data/helix-root.json',
  'site-v15/atlas/index.html',
];
assert(requiredPaths.every((path) => typeof path === 'string' && path.length > 0), 'public readback path contract incomplete');
for (const path of requiredPaths) await mustExist(path);

const historicalClaimText = await read(receipt.historical_promotion_basis.claim_receipt);
const historicalProductionText = await read(receipt.historical_promotion_basis.production_closure_receipt);
const finalProductionText = await read(receipt.production_claim_promotion_readback);
const historicalClaim = JSON.parse(historicalClaimText);
const historicalProduction = JSON.parse(historicalProductionText);
const finalProduction = JSON.parse(finalProductionText);
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

// Checked-in generated projection must agree with the current effective Helix authority.
const recordText = JSON.stringify(record);
const publicTruthText = `${recordText}\n${page}`;
assert(record.id === 'github', 'GitHub company identity missing from record');
assert(record.second_depth?.stage === expectedStage, `record stage is not ${expectedStage}`);
assert(record.second_depth?.claim_ceiling === expectedCeiling, `record claim ceiling is not ${expectedCeiling}`);
assert(
  Array.isArray(record.second_depth?.evidence?.claim_receipts)
    && record.second_depth.evidence.claim_receipts.length === expectedClaimReceipts,
  'record claim receipt cardinality drift',
);
assert(/github/i.test(page), 'GitHub identity missing from company page');
assert(page.includes(expectedStage) || /Claim Promoted/i.test(page), 'company page does not present CLAIM_PROMOTED');
assert(page.includes(expectedCeiling), 'company page claim ceiling drift');
assert(/Independent GlacierEQ work/i.test(publicTruthText), 'independent-work boundary missing');
assert(/no (?:GitHub )?affiliation/i.test(publicTruthText), 'no-affiliation boundary missing');
assert(
  /no (?:GitHub )?adoption/i.test(publicTruthText)
    || /no (?:GitHub )?affiliation[^.]*\badoption\b/i.test(publicTruthText),
  'no-adoption boundary missing or not governed by the coordinated no-claim sentence',
);
assert(
  /no (?:GitHub )?production deployment/i.test(publicTruthText)
    || /no (?:GitHub )?affiliation[^.]*\bproduction deployment\b/i.test(publicTruthText),
  'no-production-deployment boundary missing or not governed by the coordinated no-claim sentence',
);

assert(helix.schema === 'glaciereq.public-portfolio-projection.v1', 'unexpected public Helix projection schema');
assert(Array.isArray(helix.companies) && helix.companies.length > 0, 'Helix company projection is empty');
const github = helix.companies.find((company) => company.company_id === 'github');
assert(github, 'GitHub is missing from the freshly compiled Helix company projection');
assert(github.second_depth?.stage === expectedStage, 'Helix GitHub stage drift');
assert(github.second_depth?.claim_ceiling === expectedCeiling, 'Helix GitHub claim ceiling drift');
assert(
  Array.isArray(github.second_depth?.evidence?.claim_receipts)
    && github.second_depth.evidence.claim_receipts.length === expectedClaimReceipts,
  'Helix GitHub claim receipt cardinality drift',
);
assert(
  atlasPage.includes('/companies/github/')
    && (atlasPage.includes('GitHub · Claim Promoted') || atlasPage.includes('GitHub · CLAIM_PROMOTED')),
  'fresh Helix Atlas does not expose the GitHub CLAIM_PROMOTED route',
);

assert(finalProduction.production_projection?.helix_commit === deployedHelixCommit, 'production/readback Helix authority mismatch');
assert(finalProduction.authority_freshness?.production_helix_commit === deployedHelixCommit, 'authority freshness deployed Helix mismatch');
const authorityEquivalence = await verifyHelixAuthorityEquivalence(
  deployedHelixCommit,
  currentHelixCommit,
  finalProduction.authority_freshness?.allowed_delta_prefixes,
);

assert(inspection.visibility === 'private', 'private implementation visibility boundary drift');
assert(inspection.source_not_disclosed === true, 'private source disclosure boundary drift');

// Historical promotion inputs are content-addressed and exact-value bound.
assert(
  gitBlobSha(historicalClaimText) === receipt.historical_promotion_basis.claim_receipt_git_blob_sha,
  'historical claim receipt content no longer matches admitted Git blob',
);
assert(
  gitBlobSha(historicalProductionText) === receipt.historical_promotion_basis.production_closure_git_blob_sha,
  'historical production closure content no longer matches admitted Git blob',
);
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
assert(historicalProduction.company === 'GitHub' && historicalProduction.capability === 'merge_authority_graph', 'historical production closure identity drift');
assert(historicalProduction.production_projection?.deployment_id === 'dpl_5xSnF1gFFq52CCdmo4TLZnQbPcm5', 'historical production deployment identity drift');
assert(historicalProduction.production_projection?.source_commit === 'ddc745c7c7358232fc817d95972bbd4acf002a7a', 'historical production source drift');
assert(historicalProduction.production_projection?.helix_commit === '86e642b01817adad3d4e89da86a0f9a857c09cc4', 'historical production Helix authority drift');
assert(historicalProduction.live_readback?.github_compiler_json?.stage === 'PROOF_REPRODUCED', 'historical compiler stage drift');
assert(historicalProduction.live_readback?.github_company_record?.stage === 'PROOF_REPRODUCED', 'historical company-record stage drift');
assert(historicalProduction.gate_decision?.projection_truth_closed === true, 'historical projection truth closure drift');
assert(historicalProduction.gate_decision?.company_claim_promotion_requires_receipt_admission_in_helix === true, 'historical company promotion separation drift');

// Final recorded production receipt must be internally coherent.
assert(finalProduction.schema === 'glaciereq.production-claim-promotion-readback.v1', 'unexpected final production readback schema');
assert(finalProduction.company === 'GitHub' && finalProduction.capability === 'merge_authority_graph', 'final production identity drift');
assert(finalProduction.promotion_basis?.transition === 'PROOF_REPRODUCED -> CLAIM_PROMOTED', 'claim transition receipt drift');
assert(finalProduction.promotion_basis?.historical_claim_receipt_commit === receipt.historical_promotion_basis.admitted_commit, 'historical claim receipt admission mismatch');
assert(SHA40.test(finalProduction.production_projection?.source_commit || ''), 'final production source SHA invalid');
assert(finalProduction.production_projection?.helix_commit === deployedHelixCommit, 'final production Helix SHA drift');
assert(finalProduction.production_projection?.project === 'casey-barton-glaciereq', 'final production project drift');
assert(finalProduction.production_projection?.canonical_alias === 'casey-barton-glaciereq.vercel.app', 'final production alias drift');
assert(finalProduction.build_receipt?.status === 'PASS', 'final production build receipt is not PASS');
assert(finalProduction.build_receipt?.module_count === 9, 'final production bundle module count drift');
assert(SHA256.test(finalProduction.build_receipt?.api_index_sha256 || ''), 'final production api/index digest invalid');
assert(SHA256.test(finalProduction.build_receipt?.factory_bundle_sha256 || ''), 'final production factory bundle digest invalid');
assert(finalProduction.build_receipt?.self_contained_executable_modules === true, 'final production bundle is not self-contained');
assert(finalProduction.build_receipt?.bootstrap_network_fetch_required === false, 'final production bundle requires bootstrap network fetch');
assert(finalProduction.build_receipt?.runtime_string_evaluation_required === false, 'final production bundle requires runtime string evaluation');
assert(finalProduction.build_receipt?.every_factory_sha256_verified_before_execution === true, 'final production factory verification contract drift');
assert(finalProduction.build_receipt?.deployment_file_count === 2, 'final production deployment file count drift');

for (const key of ['bundle_verifier', 'v25_verifier', 'v26_verifier']) {
  assert(finalProduction.live_readback?.[key]?.http_status === 200, `${key} recorded HTTP readback drift`);
  assert(finalProduction.live_readback?.[key]?.status === 'PASS', `${key} recorded status is not PASS`);
}
for (const key of ['github_compiler_json', 'github_company_record']) {
  assert(finalProduction.live_readback?.[key]?.http_status === 200, `${key} recorded HTTP readback drift`);
  assert(finalProduction.live_readback?.[key]?.stage === expectedStage, `${key} recorded stage drift`);
  assert(finalProduction.live_readback?.[key]?.claim_ceiling === expectedCeiling, `${key} recorded claim ceiling drift`);
  assert(finalProduction.live_readback?.[key]?.claim_receipts === expectedClaimReceipts, `${key} recorded claim receipt cardinality drift`);
  assert(finalProduction.live_readback?.[key]?.helix_commit === deployedHelixCommit, `${key} recorded Helix authority drift`);
}
assert(finalProduction.live_readback?.github_company_html?.http_status === 200, 'GitHub company HTML recorded HTTP readback drift');
assert(finalProduction.live_readback?.github_company_html?.stage === expectedStage, 'GitHub company HTML recorded stage drift');
assert(finalProduction.live_readback?.github_company_html?.claim_ceiling === expectedCeiling, 'GitHub company HTML recorded claim ceiling drift');
assert(finalProduction.live_readback?.github_company_html?.claim_receipts_visible === expectedClaimReceipts, 'GitHub company HTML recorded claim receipt cardinality drift');

assert(finalProduction.claim_boundary?.portfolio_projection_is_production_deployed === true, 'portfolio production deployment not receipted');
assert(finalProduction.claim_boundary?.github_capability_production_deployment_claimed === false, 'GitHub capability production claim must remain false');
assert(finalProduction.claim_boundary?.github_adoption_claimed === false, 'GitHub adoption claim must remain false');
assert(finalProduction.claim_boundary?.github_affiliation_claimed === false, 'GitHub affiliation claim must remain false');
assert(finalProduction.claim_boundary?.production_scale_reliability_claimed === false, 'production-scale reliability claim must remain false');
assert(finalProduction.claim_boundary?.private_implementation_source_public === false, 'private implementation source publication must remain false');
assert(finalProduction.gate_decision?.effective_helix_claim_promoted === true, 'effective Helix promotion not receipted');
assert(finalProduction.gate_decision?.outward_projection_compiled_from_effective_authority === true, 'outward projection is not compiled from effective authority');
assert(finalProduction.gate_decision?.canonical_production_readback_matches_authority === true, 'final canonical production readback mismatch');
assert(finalProduction.gate_decision?.claim_receipts_present === expectedClaimReceipts, 'final gate claim receipt cardinality drift');
assert(finalProduction.gate_decision?.claim_boundary_preserved === true, 'final claim boundary not preserved');
assert(finalProduction.gate_decision?.company_claim_promotion_readback_closed === true, 'company claim promotion readback is not closed');
assert(finalProduction.gate_decision?.apex_repository_state === 'PROMOTED', 'Apex repository state receipt drift');
assert(finalProduction.gate_decision?.apex_canonical_transition_not_inferred === true, 'Apex CANONICAL transition must not be inferred');
assert(finalProduction.gate_decision?.future_higher_claim_requires_new_evidence_gate === true, 'future higher-claim gate drift');

// Independently fetch the canonical alias. Recorded receipts alone are insufficient.
const alias = finalProduction.production_projection.canonical_alias;
const [liveBundle, liveV25, liveV26, liveCompiler, liveRecord, liveHtml] = await Promise.all([
  fetchLive(alias, '/__v25_bundle_verify', 'live bundle verifier'),
  fetchLive(alias, '/__v25_verify', 'live V25 verifier'),
  fetchLive(alias, '/__v26_verify', 'live V26 verifier'),
  fetchLive(alias, '/data/application-compiler.json?company=github&depth=senior_engineer', 'live GitHub compiler'),
  fetchLive(alias, '/companies/github/record.json', 'live GitHub company record'),
  fetchLive(alias, '/companies/github/', 'live GitHub company HTML', false),
]);

assert(liveBundle.value.status === 'PASS', 'canonical live bundle verifier is not PASS');
assert(liveBundle.value.source_commit === finalProduction.production_projection.source_commit, 'canonical live bundle source SHA drift');
assert(liveBundle.value.module_count === finalProduction.build_receipt.module_count, 'canonical live bundle module count drift');
assert(liveBundle.value.factory_bundle_sha256 === finalProduction.build_receipt.factory_bundle_sha256, 'canonical live factory bundle digest drift');
assert(liveBundle.value.runtime_string_evaluation_required === false, 'canonical live bundle requires runtime string evaluation');
assert(liveBundle.value.bootstrap_network_fetch_required === false, 'canonical live bundle requires bootstrap network fetch');
assert(liveBundle.value.every_factory_sha256_verified_before_execution === true, 'canonical live factory verification drift');
assert(liveBundle.response.headers.get('x-glaciereq-bridge-commit') === finalProduction.production_projection.source_commit, 'canonical live bridge source header drift');

assert(liveV25.value.status === 'PASS', 'canonical live V25 verifier is not PASS');
assert(liveV25.value.compiler_helix_commit === deployedHelixCommit, 'canonical live V25 Helix authority drift');
assert(liveV25.value.page?.company_count === finalProduction.live_readback.v25_verifier.company_count, 'canonical live V25 company count drift');
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
assert(liveCompiler.value.company_projection?.non_affiliation === finalProduction.claim_boundary.public_nonclaim, 'canonical live compiler nonclaim drift');
assert(liveCompiler.response.headers.get('x-glaciereq-compiler-helix-commit') === deployedHelixCommit, 'canonical live compiler Helix header drift');

assert(liveRecord.value.id === 'github', 'canonical live company record identity drift');
assert(liveRecord.value.state === 'effective_projection', 'canonical live company record state drift');
assert(liveRecord.value.second_depth?.stage === expectedStage, 'canonical live company record stage drift');
assert(liveRecord.value.second_depth?.claim_ceiling === expectedCeiling, 'canonical live company record claim ceiling drift');
assert(Array.isArray(liveRecord.value.second_depth?.evidence?.claim_receipts) && liveRecord.value.second_depth.evidence.claim_receipts.length === expectedClaimReceipts, 'canonical live company record claim receipt cardinality drift');
assert(liveRecord.value.source?.commit === deployedHelixCommit, 'canonical live company record Helix source drift');
assert(liveRecord.value.boundary === finalProduction.claim_boundary.public_nonclaim, 'canonical live company record nonclaim drift');

const liveHtmlText = liveHtml.text;
assert(liveHtmlText.includes(expectedStage) || /Claim Promoted/i.test(liveHtmlText), 'canonical live company HTML stage drift');
assert(liveHtmlText.includes(expectedCeiling), 'canonical live company HTML claim ceiling drift');
assert(/claim receipts/i.test(liveHtmlText) && new RegExp(`claim receipts[\\s\\S]{0,240}>\\s*${expectedClaimReceipts}\\s*<`, 'i').test(liveHtmlText), 'canonical live company HTML claim receipt cardinality drift');
assert(liveHtmlText.includes(finalProduction.claim_boundary.public_nonclaim), 'canonical live company HTML nonclaim drift');
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
  atlas_route: '/companies/github/',
  canonical_alias: alias,
  live_bundle_source_commit: liveBundle.value.source_commit,
  live_compiler_helix_commit: liveCompiler.value.authority.commit,
  production_deployment_id: finalProduction.production_projection.deployment_id,
  production_source_commit: finalProduction.production_projection.source_commit,
  company_claim_promotion_readback_closed: finalProduction.gate_decision.company_claim_promotion_readback_closed,
  apex_repository_state: finalProduction.gate_decision.apex_repository_state,
  apex_canonical_transition_inferred: false,
  private_source_disclosed: false,
}, null, 2));

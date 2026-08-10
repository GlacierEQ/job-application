import { access, readFile } from 'node:fs/promises';

const root = new URL('../', import.meta.url);
const read = (path) => readFile(new URL(path, root), 'utf8');
const mustExist = (path) => access(new URL(path, root));
const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};
const SHA40 = /^[a-f0-9]{40}$/;
const SHA256 = /^[a-f0-9]{64}$/;

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

const receipt = JSON.parse(await read('projects/github-merge-authority-proof/proof/public-projection-readback.json'));
const historicalClaim = JSON.parse(await read(receipt.historical_promotion_basis.claim_receipt));
const historicalProduction = JSON.parse(await read(receipt.historical_promotion_basis.production_closure_receipt));
const finalProduction = JSON.parse(await read(receipt.production_claim_promotion_readback));
const record = JSON.parse(await read(receipt.expected_public_projection.record_path));
const page = await read(receipt.expected_public_projection.page_path);
const helix = JSON.parse(await read('site-v15/data/helix-root.json'));
const atlasPage = await read('site-v15/atlas/index.html');

const expectedStage = receipt.expected_public_projection.stage;
const expectedCeiling = receipt.expected_public_projection.claim_ceiling;
const expectedClaimReceipts = receipt.expected_public_projection.claim_receipts;
const deployedHelixCommit = receipt.projection_authority?.helix_sha;
const currentHelixCommit = helix.source?.root_ref;

for (const path of [
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
]) await mustExist(path);

assert(expectedStage === 'CLAIM_PROMOTED', 'final expected stage must be CLAIM_PROMOTED');
assert(expectedCeiling === 'proof_bound_company_specific', 'final expected claim ceiling drift');
assert(expectedClaimReceipts === 2, 'final expected claim receipt cardinality drift');
assert(SHA40.test(deployedHelixCommit || ''), 'public readback deployed Helix authority invalid');

const recordText = JSON.stringify(record);
const publicTruthText = `${recordText}\n${page}`;
assert(/github/i.test(recordText), 'GitHub company identity missing from record');
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
assert(receipt.projection_authority?.helix_stage === expectedStage, 'receipt Helix stage drift');
assert(receipt.projection_authority?.helix_claim_ceiling === expectedCeiling, 'receipt Helix ceiling drift');
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

const inspection = JSON.parse(await read('projects/github-merge-authority-proof/machine/implementation-inspection.json'));
assert(inspection.visibility === 'private', 'private implementation visibility boundary drift');
assert(inspection.source_not_disclosed === true, 'private source disclosure boundary drift');

// Historical inputs remain immutable pre-promotion evidence. They are intentionally
// not rewritten to masquerade as post-promotion proof.
assert(historicalClaim.schema === 'glaciereq.public-claim-receipt.v1', 'historical claim receipt schema drift');
assert(historicalClaim.stage === 'PROOF_REPRODUCED', 'historical claim receipt stage drift');
assert(historicalClaim.claim_ceiling === 'reproducible_company_specific_proof', 'historical claim receipt ceiling drift');
assert(Array.isArray(historicalClaim.prohibited_claims) && historicalClaim.prohibited_claims.length >= 5, 'historical claim nonclaims incomplete');
assert(receipt.historical_promotion_basis?.admitted_commit === '577f63c506c6c4df9c1751a0ff5b8fa07822e491', 'historical promotion admission commit drift');

assert(historicalProduction.schema === 'glaciereq.production-projection-closure.v1', 'historical production closure schema drift');
assert(historicalProduction.company === 'GitHub', 'historical production closure company drift');
assert(historicalProduction.capability === 'merge_authority_graph', 'historical production closure capability drift');
assert(SHA40.test(historicalProduction.production_projection?.source_commit || ''), 'historical production source SHA invalid');
assert(SHA40.test(historicalProduction.production_projection?.helix_commit || ''), 'historical production Helix SHA invalid');
assert(historicalProduction.live_readback?.github_compiler_json?.stage === 'PROOF_REPRODUCED', 'historical compiler stage drift');
assert(historicalProduction.live_readback?.github_company_record?.stage === 'PROOF_REPRODUCED', 'historical company-record stage drift');
assert(historicalProduction.gate_decision?.projection_truth_closed === true, 'historical projection truth closure drift');
assert(historicalProduction.gate_decision?.company_claim_promotion_requires_receipt_admission_in_helix === true, 'historical company promotion separation drift');

assert(finalProduction.schema === 'glaciereq.production-claim-promotion-readback.v1', 'unexpected final production readback schema');
assert(finalProduction.company === 'GitHub', 'final production company drift');
assert(finalProduction.capability === 'merge_authority_graph', 'final production capability drift');
assert(finalProduction.promotion_basis?.transition === 'PROOF_REPRODUCED -> CLAIM_PROMOTED', 'claim transition receipt drift');
assert(finalProduction.promotion_basis?.historical_claim_receipt_commit === receipt.historical_promotion_basis.admitted_commit, 'historical claim receipt admission mismatch');
assert(SHA40.test(finalProduction.production_projection?.source_commit || ''), 'final production source SHA invalid');
assert(SHA40.test(finalProduction.production_projection?.helix_commit || ''), 'final production Helix SHA invalid');
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
assert(finalProduction.live_readback?.bundle_verifier?.source_commit === finalProduction.production_projection.source_commit, 'bundle verifier source SHA drift');

for (const key of ['bundle_verifier', 'v25_verifier', 'v26_verifier']) {
  assert(finalProduction.live_readback?.[key]?.http_status === 200, `${key} HTTP readback drift`);
  assert(finalProduction.live_readback?.[key]?.status === 'PASS', `${key} did not read back PASS`);
}
assert(finalProduction.live_readback?.v25_verifier?.compiler_helix_commit === deployedHelixCommit, 'V25 verifier deployed Helix authority drift');
assert(finalProduction.live_readback?.v25_verifier?.company_count === helix.companies.length, 'V25 verifier company cardinality drift');
assert(Array.isArray(finalProduction.live_readback?.v25_verifier?.errors) && finalProduction.live_readback.v25_verifier.errors.length === 0, 'V25 verifier errors present');
assert(Array.isArray(finalProduction.live_readback?.v26_verifier?.errors) && finalProduction.live_readback.v26_verifier.errors.length === 0, 'V26 verifier errors present');

for (const key of ['github_compiler_json', 'github_company_record']) {
  assert(finalProduction.live_readback?.[key]?.http_status === 200, `${key} HTTP readback drift`);
  assert(finalProduction.live_readback?.[key]?.stage === expectedStage, `${key} stage drift`);
  assert(finalProduction.live_readback?.[key]?.claim_ceiling === expectedCeiling, `${key} claim ceiling drift`);
  assert(finalProduction.live_readback?.[key]?.claim_receipts === expectedClaimReceipts, `${key} claim receipt cardinality drift`);
  assert(finalProduction.live_readback?.[key]?.helix_commit === deployedHelixCommit, `${key} deployed Helix authority drift`);
}
assert(finalProduction.live_readback?.github_company_html?.http_status === 200, 'GitHub company HTML HTTP readback drift');
assert(finalProduction.live_readback?.github_company_html?.stage === expectedStage, 'GitHub company HTML stage drift');
assert(finalProduction.live_readback?.github_company_html?.claim_ceiling === expectedCeiling, 'GitHub company HTML claim ceiling drift');
assert(finalProduction.live_readback?.github_company_html?.claim_receipts_visible === expectedClaimReceipts, 'live GitHub company HTML claim receipt cardinality drift');
assert(finalProduction.live_readback?.github_company_html?.independent_work_boundary_visible === true, 'GitHub company HTML independent-work boundary missing');
assert(finalProduction.live_readback?.github_company_html?.script_free === true, 'GitHub company HTML script-free boundary drift');

assert(finalProduction.claim_boundary?.portfolio_projection_is_production_deployed === true, 'portfolio production deployment not receipted');
assert(finalProduction.claim_boundary?.github_capability_production_deployment_claimed === false, 'GitHub capability production claim must remain false');
assert(finalProduction.claim_boundary?.github_adoption_claimed === false, 'GitHub adoption claim must remain false');
assert(finalProduction.claim_boundary?.github_affiliation_claimed === false, 'GitHub affiliation claim must remain false');
assert(finalProduction.claim_boundary?.production_scale_reliability_claimed === false, 'production-scale reliability claim must remain false');
assert(finalProduction.claim_boundary?.private_implementation_source_public === false, 'private implementation source publication must remain false');
assert(finalProduction.gate_decision?.effective_helix_claim_promoted === true, 'effective Helix promotion not receipted');
assert(finalProduction.gate_decision?.canonical_production_readback_matches_authority === true, 'final canonical production readback mismatch');
assert(finalProduction.gate_decision?.claim_receipts_present === expectedClaimReceipts, 'final gate claim receipt cardinality drift');
assert(finalProduction.gate_decision?.claim_boundary_preserved === true, 'final claim boundary not preserved');
assert(finalProduction.gate_decision?.company_claim_promotion_readback_closed === true, 'company claim promotion readback is not closed');
assert(finalProduction.gate_decision?.apex_repository_state === 'PROMOTED', 'Apex repository state receipt drift');
assert(finalProduction.gate_decision?.apex_canonical_transition_not_inferred === true, 'Apex CANONICAL transition must not be inferred');
assert(finalProduction.gate_decision?.future_higher_claim_requires_new_evidence_gate === true, 'future higher-claim gate drift');

console.log(JSON.stringify({
  status: 'PASS',
  company: 'GitHub',
  capability: 'merge_authority_graph',
  current_helix_sha: currentHelixCommit,
  deployed_helix_sha: deployedHelixCommit,
  helix_authority_equivalence: authorityEquivalence,
  stage: github.second_depth.stage,
  claim_ceiling: github.second_depth.claim_ceiling,
  claim_receipts: github.second_depth.evidence.claim_receipts.length,
  atlas_route: '/companies/github/',
  production_deployment_id: finalProduction.production_projection.deployment_id,
  production_source_commit: finalProduction.production_projection.source_commit,
  company_claim_promotion_readback_closed: finalProduction.gate_decision.company_claim_promotion_readback_closed,
  apex_repository_state: finalProduction.gate_decision.apex_repository_state,
  apex_canonical_transition_inferred: false,
  private_source_disclosed: false,
}, null, 2));

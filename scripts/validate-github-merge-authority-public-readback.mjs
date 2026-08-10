import { access, readFile } from 'node:fs/promises';

const root = new URL('../', import.meta.url);
const read = (path) => readFile(new URL(path, root), 'utf8');
const mustExist = (path) => access(new URL(path, root));
const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};
const SHA40 = /^[a-f0-9]{40}$/;
const SHA256 = /^[a-f0-9]{64}$/;

const receipt = JSON.parse(await read('projects/github-merge-authority-proof/proof/public-projection-readback.json'));
const production = JSON.parse(await read(receipt.production_closure_receipt));
const record = JSON.parse(await read(receipt.expected_public_projection.record_path));
const page = await read(receipt.expected_public_projection.page_path);
const helix = JSON.parse(await read('site-v15/data/helix-root.json'));
const atlasPage = await read('site-v15/atlas/index.html');

for (const path of [
  'projects/github-merge-authority-proof/README.md',
  'projects/github-merge-authority-proof/evidence/github-role-5611.json',
  'projects/github-merge-authority-proof/evidence/github-problem.json',
  'projects/github-merge-authority-proof/machine/implementation-inspection.json',
  'projects/github-merge-authority-proof/machine/remedy-contract.json',
  'projects/github-merge-authority-proof/proof/implementation-receipt.json',
  'projects/github-merge-authority-proof/proof/canonical-reproduction.json',
  'projects/github-merge-authority-proof/proof/claim-receipt.json',
  receipt.production_closure_receipt,
]) await mustExist(path);

const recordText = JSON.stringify(record);
const publicTruthText = `${recordText}\n${page}`;
assert(/github/i.test(recordText), 'GitHub company identity missing from record');
assert(recordText.includes('PROOF_REPRODUCED'), 'record is not PROOF_REPRODUCED');
assert(
  recordText.includes('reproducible_company_specific_proof'),
  'record claim ceiling is not reproducible_company_specific_proof',
);

assert(/github/i.test(page), 'GitHub identity missing from company page');
assert(
  page.includes('PROOF_REPRODUCED') || /Proof Reproduced/i.test(page),
  'company page does not present PROOF_REPRODUCED',
);
assert(
  page.includes('reproducible_company_specific_proof'),
  'company page claim ceiling drift',
);
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
const github = helix.companies?.find((company) => company.company_id === 'github');
assert(github, 'GitHub is missing from the freshly compiled Helix company projection');
assert(github.second_depth?.stage === 'PROOF_REPRODUCED', 'Helix GitHub stage is not PROOF_REPRODUCED');
assert(
  github.second_depth?.claim_ceiling === 'reproducible_company_specific_proof',
  'Helix GitHub claim ceiling drift',
);
assert(
  receipt.projection_authority?.helix_sha === helix.source?.root_ref,
  'public readback receipt Helix authority drift',
);
assert(
  atlasPage.includes('/companies/github/')
    && (atlasPage.includes('GitHub · Proof Reproduced') || atlasPage.includes('GitHub · PROOF_REPRODUCED')),
  'fresh Helix Atlas does not expose the GitHub PROOF_REPRODUCED route',
);

const inspection = JSON.parse(await read('projects/github-merge-authority-proof/machine/implementation-inspection.json'));
assert(inspection.visibility === 'private', 'private implementation visibility boundary drift');
assert(inspection.source_not_disclosed === true, 'private source disclosure boundary drift');

const claim = JSON.parse(await read('projects/github-merge-authority-proof/proof/claim-receipt.json'));
assert(claim.stage === 'PROOF_REPRODUCED', 'claim receipt stage drift');
assert(
  claim.claim_ceiling === 'reproducible_company_specific_proof',
  'claim receipt ceiling drift',
);
assert(Array.isArray(claim.prohibited_claims) && claim.prohibited_claims.length >= 5, 'claim nonclaims incomplete');

assert(production.schema === 'glaciereq.production-projection-closure.v1', 'unexpected production closure schema');
assert(production.company === 'GitHub', 'production closure company drift');
assert(production.capability === 'merge_authority_graph', 'production closure capability drift');
assert(SHA40.test(production.production_projection?.source_commit || ''), 'production source SHA invalid');
assert(SHA40.test(production.production_projection?.helix_commit || ''), 'production Helix SHA invalid');
assert(
  production.production_projection.helix_commit === helix.source?.root_ref,
  'production closure Helix authority does not match effective projection',
);
assert(production.production_projection?.project === 'casey-barton-glaciereq', 'production project drift');
assert(production.production_projection?.canonical_alias === 'casey-barton-glaciereq.vercel.app', 'production alias drift');
assert(production.build_receipt?.status === 'PASS', 'production build receipt is not PASS');
assert(production.build_receipt?.module_count === 9, 'production bundle module count drift');
assert(SHA256.test(production.build_receipt?.api_index_sha256 || ''), 'production api/index digest invalid');
assert(SHA256.test(production.build_receipt?.factory_bundle_sha256 || ''), 'production factory bundle digest invalid');
assert(production.build_receipt?.self_contained_executable_modules === true, 'production bundle is not self-contained');
assert(production.build_receipt?.bootstrap_network_fetch_required === false, 'production bundle requires bootstrap network fetch');
assert(production.build_receipt?.runtime_string_evaluation_required === false, 'production bundle requires runtime string evaluation');
assert(production.build_receipt?.every_factory_sha256_verified_before_execution === true, 'production factory verification contract drift');
assert(production.build_receipt?.deployment_file_count === 2, 'production deployment file count drift');

for (const key of ['bundle_verifier', 'v25_verifier', 'v26_verifier']) {
  assert(production.live_readback?.[key]?.http_status === 200, `${key} HTTP readback drift`);
  assert(production.live_readback?.[key]?.status === 'PASS', `${key} did not read back PASS`);
}
for (const key of ['github_compiler_json', 'github_company_record']) {
  assert(production.live_readback?.[key]?.http_status === 200, `${key} HTTP readback drift`);
  assert(production.live_readback?.[key]?.stage === 'PROOF_REPRODUCED', `${key} stage drift`);
  assert(
    production.live_readback?.[key]?.claim_ceiling === 'reproducible_company_specific_proof',
    `${key} claim ceiling drift`,
  );
  assert(
    production.live_readback?.[key]?.helix_commit === helix.source?.root_ref,
    `${key} Helix authority drift`,
  );
}
assert(production.live_readback?.github_company_html?.http_status === 200, 'GitHub company HTML HTTP readback drift');
assert(production.live_readback?.github_company_html?.stage_visible === true, 'GitHub company HTML stage missing');
assert(production.live_readback?.github_company_html?.claim_ceiling_visible === true, 'GitHub company HTML claim ceiling missing');
assert(production.live_readback?.github_company_html?.independent_work_boundary_visible === true, 'GitHub company HTML independent-work boundary missing');
assert(production.live_readback?.github_company_html?.script_free === true, 'GitHub company HTML script-free boundary drift');
assert(production.claim_boundary?.portfolio_projection_is_production_deployed === true, 'portfolio production deployment not receipted');
assert(production.claim_boundary?.github_capability_production_deployment_claimed === false, 'GitHub capability production claim must remain false');
assert(production.claim_boundary?.github_adoption_claimed === false, 'GitHub adoption claim must remain false');
assert(production.claim_boundary?.github_affiliation_claimed === false, 'GitHub affiliation claim must remain false');
assert(production.gate_decision?.projection_truth_closed === true, 'projection truth closure is not earned');
assert(production.gate_decision?.repo_promotion_evidence_ready === true, 'repo promotion evidence is not ready');
assert(production.gate_decision?.company_claim_promotion_requires_receipt_admission_in_helix === true, 'company claim promotion separation drift');

console.log(JSON.stringify({
  status: 'PASS',
  company: 'GitHub',
  capability: 'merge_authority_graph',
  helix_sha: helix.source?.root_ref,
  stage: github.second_depth.stage,
  claim_ceiling: github.second_depth.claim_ceiling,
  atlas_route: '/companies/github/',
  production_deployment_id: production.production_projection.deployment_id,
  production_source_commit: production.production_projection.source_commit,
  projection_truth_closed: production.gate_decision.projection_truth_closed,
  private_source_disclosed: false,
  promotion_readback_ready: true,
}, null, 2));

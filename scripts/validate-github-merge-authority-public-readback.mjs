import { access, readFile } from 'node:fs/promises';

const root = new URL('../', import.meta.url);
const read = (path) => readFile(new URL(path, root), 'utf8');
const mustExist = (path) => access(new URL(path, root));
const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

const receipt = JSON.parse(await read('projects/github-merge-authority-proof/proof/public-projection-readback.json'));
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

console.log(JSON.stringify({
  status: 'PASS',
  company: 'GitHub',
  capability: 'merge_authority_graph',
  helix_sha: helix.source?.root_ref,
  stage: github.second_depth.stage,
  claim_ceiling: github.second_depth.claim_ceiling,
  atlas_route: '/companies/github/',
  private_source_disclosed: false,
  promotion_readback_ready: true,
}, null, 2));

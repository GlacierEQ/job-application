import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';

const root = new URL('../', import.meta.url);
const proofPath = 'portfolio-proof/company-fit/GOOGLE_DEEPMIND__UNCERTAINTY_AWARE_GOVERNED_EXECUTION__2026-08-12.md';
const helixCommit = '63eb32b86d49328eebe02731852cc44345374c6d';
const dossierPath = 'manifests/company_dossiers/frontier_ai.json';
const expectedDossierBlob = 'bb351bd35fa8640f03c1d03fdd21068ecd31bfcf';
const AKOS = 'eac3cab001306225b99da41c37370528331966dd';
const TRACK = 'fb8e460e3b76b9d0453e702dfd2bd167368dd6a5';
const TRACK_LATER = '46f0061f27070e5bcfbfcfe77d5b06b0e014c31f';
const CLAIM = 'GOOGLE_DEEPMIND_ML_SYSTEMS_ALIGNMENT_WITH_AKOS_EXACT_HEAD_CI_PLUS_TRACK_ENVELOPE_EXECUTED_UNCERTAINTY_SEMANTICS_NOT_GOOGLE_DEPLOYMENT';

const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

function gitBlobSha(text) {
  const body = Buffer.from(text, 'utf8');
  return createHash('sha1').update(`blob ${body.length}\0`).update(body).digest('hex');
}

async function fetchPinnedDossier() {
  const url = `https://raw.githubusercontent.com/GlacierEQ/job-app-helix/${helixCommit}/${dossierPath}`;
  const response = await fetch(url, {
    headers: {
      Accept: 'application/json',
      'Cache-Control': 'no-cache',
      'User-Agent': 'GlacierEQ-company-fit-validator/1.0',
    },
  });
  const text = await response.text();
  assert(response.status === 200, `pinned Helix dossier HTTP ${response.status}`);
  assert(gitBlobSha(text) === expectedDossierBlob, 'pinned Helix dossier blob drift');
  return JSON.parse(text);
}

const proof = await readFile(new URL(proofPath, root), 'utf8');
const dossier = await fetchPinnedDossier();
const company = dossier.companies?.find((row) => row.company_id === 'google_deepmind');

assert(dossier.schema === 'glaciereq.company-dossiers-shard.v2', 'unexpected company dossier schema');
assert(company, 'google_deepmind missing from pinned company dossier');
assert(company.track_state === 'MAPPED_NOT_RECRUITER_READY', 'Google / DeepMind company state widened');
assert(JSON.stringify(company.target_roles) === JSON.stringify(['ML Systems Engineer', 'Applied AI Engineer', 'Infrastructure Engineer']), 'Google / DeepMind target roles drift');
assert(company.recruiter_thesis === 'ML systems, TPU/mesh optimization, temporal routing, predictive handoff, and governed polyglot execution.', 'Google / DeepMind recruiter thesis drift');
assert(/no Google \/ DeepMind affiliation/i.test(company.non_affiliation), 'pinned company non-affiliation boundary missing');
assert(Array.isArray(company.repositories) && company.repositories.length === 6, 'DeepMind direct-family cardinality drift');
const publicPrototype = company.repositories.find((row) => row[0] === 'GlacierEQ/deepmind-tpu-mesh-optimizer');
assert(publicPrototype?.[1] === 'L3' && publicPrototype?.[2] === 'REFERENCE_ONLY', 'DeepMind public prototype was improperly promoted');
assert(company.repositories.filter((row) => row[3] === 'private').length === 5, 'DeepMind private-candidate boundary drift');

for (const marker of [
  'Status: `EVIDENCE_BOUND_COMPANY_FIT_PROJECTION`',
  `revision: \`${helixCommit}\``,
  `Exact verified canonical revision: \`${AKOS}\``,
  `Executed proof subject: \`${TRACK}\``,
  `later canonical head \`${TRACK_LATER}\` does **not** inherit execution proof`,
  'Python 3.12 receipt: 200 collected, 199 passed, 1 skipped, 0 failures, 0 errors',
  'Python unittest: PASS',
  'Clang C11 native: PASS',
  'malformed uncertainty fails closed',
  'No Google / DeepMind affiliation, employment, endorsement, adoption, proprietary access, TPU access, production deployment, production scale, or measured Google-system impact.',
  `claim_ceiling: ${CLAIM}`,
  `\`${CLAIM}\``,
]) {
  assert(proof.includes(marker), `company-fit proof marker missing: ${marker}`);
}

assert((proof.match(new RegExp(helixCommit, 'g')) || []).length >= 3, 'current Helix authority is not carried across human/machine/mesh surfaces');
assert(!proof.includes('authority_revision: 86c3630d51b231c1637dc9e8b138b28eaf70ba68'), 'stale Helix authority leaked into machine surface');
assert(proof.includes('direct_DeepMind_named_repositories_are_not_used_as_executable_proof_here'), 'direct-family execution boundary missing');
assert(proof.includes('current_head_execution_inherited: false'), 'Track Envelope revision inheritance boundary missing');
assert(proof.includes('google_or_deepmind_affiliation_or_adoption'), 'affiliation/adoption forbidden inference missing');
assert(proof.includes('google_cloud_or_tpu_runtime_integration'), 'TPU/runtime forbidden inference missing');
assert(proof.includes('proprietary_model_or_dataset_access'), 'proprietary access forbidden inference missing');
assert(proof.includes('production_scale_or_slo'), 'production-scale forbidden inference missing');
assert(proof.includes('next_cursor: refresh one exact live Google/DeepMind role'), 'next gate must remain role-specific evidence refresh');

console.log(JSON.stringify({
  status: 'PASS',
  schema: 'glaciereq.company-fit-validation.v1',
  company: 'google_deepmind',
  proof_path: proofPath,
  helix_authority: helixCommit,
  dossier_blob: expectedDossierBlob,
  company_state: company.track_state,
  direct_family: {
    total: company.repositories.length,
    public_reference_only: 1,
    private_candidates: 5,
  },
  evidence: {
    akos_exact_head: AKOS,
    track_envelope_executed_revision: TRACK,
    track_envelope_later_head_inherits_execution: false,
  },
  claim_ceiling: CLAIM,
}, null, 2));

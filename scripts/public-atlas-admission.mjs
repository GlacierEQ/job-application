// Public Atlas admission is independent of internal dossier retention.
const BLOCKED = /MAPPED_NOT_RECRUITER_READY|CANDIDATE_TARGET_REQUIRES_DIRECT_EVIDENCE|NO_DIRECT_EXHIBIT_VERIFIED|NOT_RECRUITER_READY/;
const PROVEN_STAGES = new Set(['CODE_INSPECTED', 'PROOF_REPRODUCED', 'CLAIM_PROMOTED']);
export function admittedAtlasCompany(company) {
  if (!company || typeof company !== 'object' || !Array.isArray(company.repositories)) return false;
  if (BLOCKED.test(String(company.track_state ?? ''))) return false;
  const stage = company.second_depth?.stage;
  return company.repositories.length >= 2 || PROVEN_STAGES.has(stage);
}

// Public Atlas admission is independent of internal dossier retention.
const BLOCKED = /MAPPED_NOT_RECRUITER_READY|CANDIDATE_TARGET_REQUIRES_DIRECT_EVIDENCE|NO_DIRECT_EXHIBIT_VERIFIED|NOT_RECRUITER_READY/;
const PROVEN_STAGES = new Set(['CODE_INSPECTED', 'PROOF_REPRODUCED', 'CLAIM_PROMOTED']);
export function admittedAtlasCompany(company) {
  if (!company || typeof company !== 'object' || Array.isArray(company) || !Array.isArray(company.repositories)) return false;
  if (BLOCKED.test(String(company.track_state ?? ''))) return false;
  const publicRepositories = company.repositories.filter((repo) => repo && typeof repo === 'object' && !Array.isArray(repo) && repo.visibility === 'public' && repo.inventory_scope === 'HELIX_ADMITTED' && typeof repo.repository === 'string' && /^GlacierEQ\/[A-Za-z0-9_.-]+$/.test(repo.repository));
  const distinctPublicRepositories = new Set(publicRepositories.map((repo) => repo.repository.toLowerCase()));
  if (distinctPublicRepositories.size === 0) return false;
  const stage = company.second_depth?.stage;
  return distinctPublicRepositories.size >= 2 || PROVEN_STAGES.has(stage);
}

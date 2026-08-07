#!/usr/bin/env node

import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(SCRIPT_DIR, "..");
const POINTER_PATH = path.join(ROOT, "portfolio-source.json");
const SHA_PATTERN = /^[a-f0-9]{40}$/;
const SHA256_REF_PATTERN = /^sha256:[a-f0-9]{64}$/;
const COMMIT_REF_PATTERN = /^commit:[a-f0-9]{40}$/;
const REPOSITORY_PATTERN = /^GlacierEQ\/[A-Za-z0-9_.-]+$/;
const COMPANY_ID_PATTERN = /^[a-z0-9_]+$/;
const EVIDENCE_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]*$/;
const LEVELS = new Set(["L0", "L1", "L2", "L3", "L4", "L5"]);

const SECOND_DEPTH_STAGES = [
  ["MAPPED_ONLY", [], "company_alignment_only"],
  ["ROLE_VERIFIED", ["role_evidence"], "verified_role_alignment"],
  [
    "PROBLEM_BOUNDED",
    ["role_evidence", "problem_evidence"],
    "externally_bounded_problem_alignment",
  ],
  [
    "CODE_INSPECTED",
    ["role_evidence", "problem_evidence", "inspected_repositories"],
    "inspected_implementation_alignment",
  ],
  [
    "REMEDY_BOUNDED",
    ["role_evidence", "problem_evidence", "inspected_repositories", "gap_queue"],
    "bounded_remedy_design",
  ],
  [
    "IMPLEMENTED",
    [
      "role_evidence",
      "problem_evidence",
      "inspected_repositories",
      "gap_queue",
      "implementation_receipts",
    ],
    "implemented_candidate_capability",
  ],
  [
    "PROOF_REPRODUCED",
    [
      "role_evidence",
      "problem_evidence",
      "inspected_repositories",
      "gap_queue",
      "implementation_receipts",
      "proof_artifacts",
    ],
    "reproducible_company_specific_proof",
  ],
  [
    "CLAIM_PROMOTED",
    [
      "role_evidence",
      "problem_evidence",
      "inspected_repositories",
      "gap_queue",
      "implementation_receipts",
      "proof_artifacts",
      "claim_receipts",
    ],
    "proof_bound_company_specific",
  ],
];

const EVIDENCE_KIND_BY_FIELD = {
  role_evidence: "role",
  problem_evidence: "problem",
  inspected_repositories: "repository_inspection",
  gap_queue: "bounded_gap",
  implementation_receipts: "implementation_receipt",
  proof_artifacts: "proof_artifact",
  claim_receipts: "claim_receipt",
};
const EVIDENCE_FIELDS = Object.keys(EVIDENCE_KIND_BY_FIELD);
const EVIDENCE_KEYS = [
  "id",
  "kind",
  "source_identity",
  "source_ref",
  "visibility",
  "verification_state",
];
const VERIFICATION_RANK = { VERIFIED: 1, REPRODUCED: 2 };

function fail(message) {
  throw new Error(`Helix projection sync failed: ${message}`);
}

function requireValue(condition, message) {
  if (!condition) fail(message);
}

function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((key) => [key, stable(value[key])]),
    );
  }
  return value;
}

function stableJson(value) {
  return `${JSON.stringify(stable(value), null, 2)}\n`;
}

function sha256(text) {
  return createHash("sha256").update(text).digest("hex");
}

function parseJson(text, label) {
  try {
    const value = JSON.parse(text);
    requireValue(
      value && typeof value === "object" && !Array.isArray(value),
      `${label} must contain an object`,
    );
    return value;
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("Helix projection sync failed:")) {
      throw error;
    }
    fail(`${label} contains invalid JSON: ${error instanceof Error ? error.message : String(error)}`);
  }
}

async function fetchText(url, accept = "application/json") {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15_000);
  const headers = {
    Accept: accept,
    "User-Agent": "GlacierEQ-job-application",
  };
  if (process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  try {
    const response = await fetch(url, { headers, signal: controller.signal });
    requireValue(response.ok, `${url} returned ${response.status}`);
    return await response.text();
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("Helix projection sync failed:")) {
      throw error;
    }
    fail(`${url}: ${error instanceof Error ? error.message : String(error)}`);
  } finally {
    clearTimeout(timer);
  }
}

function normalizeCompany(shard, rawCompany) {
  const defaults =
    shard.defaults && typeof shard.defaults === "object" && !Array.isArray(shard.defaults)
      ? shard.defaults
      : {};
  requireValue(
    rawCompany && typeof rawCompany === "object" && !Array.isArray(rawCompany),
    "company entries must be objects",
  );
  return { ...defaults, ...rawCompany };
}

function validateRepositoryIdentity(repository, label) {
  requireValue(
    typeof repository === "string" && REPOSITORY_PATTERN.test(repository),
    `${label}: invalid repository identity ${String(repository)}`,
  );
  return repository;
}

function repositoryName(repository) {
  validateRepositoryIdentity(repository, "repository");
  return repository.slice("GlacierEQ/".length);
}

function resolveOutput(relative, label) {
  requireValue(typeof relative === "string" && relative.length > 0, `${label} path is missing`);
  const output = path.resolve(ROOT, relative);
  requireValue(output.startsWith(`${ROOT}${path.sep}`), `${label} escapes repository root`);
  return output;
}

async function resolveHelixSha(authority) {
  const supplied = process.env.HELIX_ROOT_SHA?.trim().toLowerCase();
  if (supplied) {
    requireValue(
      SHA_PATTERN.test(supplied),
      "HELIX_ROOT_SHA must be a full 40-character lowercase commit SHA",
    );
    return supplied;
  }
  const commitText = await fetchText(authority.commit_api_url, "application/vnd.github+json");
  const commit = parseJson(commitText, "Helix commit response");
  const sha = String(commit.sha ?? "").toLowerCase();
  requireValue(SHA_PATTERN.test(sha), "Helix commit API did not return a full commit SHA");
  return sha;
}

function validateEvidenceReference(companyId, field, item) {
  requireValue(
    item && typeof item === "object" && !Array.isArray(item),
    `${companyId}.${field}: evidence entry must be an object`,
  );
  const keys = Object.keys(item).sort();
  requireValue(
    keys.length === EVIDENCE_KEYS.length &&
      EVIDENCE_KEYS.every((key) => keys.includes(key)),
    `${companyId}.${field}: evidence entry has unsupported or missing fields`,
  );
  for (const key of EVIDENCE_KEYS) {
    requireValue(
      typeof item[key] === "string" && item[key].length > 0,
      `${companyId}.${field}.${key} must be a non-empty string`,
    );
  }
  requireValue(
    EVIDENCE_ID_PATTERN.test(item.id),
    `${companyId}.${field}: invalid evidence id`,
  );
  requireValue(
    item.kind === EVIDENCE_KIND_BY_FIELD[field],
    `${companyId}.${field}: evidence kind mismatch`,
  );
  requireValue(
    item.source_identity.startsWith("https://") || item.source_identity.startsWith("GlacierEQ/"),
    `${companyId}.${field}: evidence source is not public-addressable`,
  );
  requireValue(
    COMMIT_REF_PATTERN.test(item.source_ref) || SHA256_REF_PATTERN.test(item.source_ref),
    `${companyId}.${field}: evidence source_ref is not immutable`,
  );
  requireValue(item.visibility === "public", `${companyId}.${field}: private evidence leaked`);
  const rank = VERIFICATION_RANK[item.verification_state] ?? 0;
  const minimum = field === "proof_artifacts" ? VERIFICATION_RANK.REPRODUCED : VERIFICATION_RANK.VERIFIED;
  requireValue(rank >= minimum, `${companyId}.${field}: evidence verification is too weak`);
  return {
    id: item.id,
    kind: item.kind,
    source_identity: item.source_identity,
    source_ref: item.source_ref,
    visibility: item.visibility,
    verification_state: item.verification_state,
  };
}

function validateSecondDepthContract(registry, companiesIndex, companyIds) {
  requireValue(
    registry?.schema === "glaciereq.company-second-depth.v1",
    "unexpected company second-depth schema",
  );
  requireValue(
    registry.authority === "GlacierEQ/job-app-helix",
    "unexpected company second-depth authority",
  );
  requireValue(
    registry.company_index === "manifests/company_dossiers.json",
    "company second-depth index pointer drift",
  );
  requireValue(
    companiesIndex.second_depth_registry === "manifests/company_second_depth.json",
    "company dossier second-depth pointer drift",
  );

  const evidenceContract = registry.evidence_reference_contract;
  requireValue(
    evidenceContract && typeof evidenceContract === "object" && !Array.isArray(evidenceContract),
    "company second-depth evidence contract is missing",
  );
  requireValue(
    Array.isArray(evidenceContract.required_fields) &&
      evidenceContract.required_fields.length === EVIDENCE_KEYS.length &&
      EVIDENCE_KEYS.every((key) => evidenceContract.required_fields.includes(key)),
    "company second-depth evidence field contract drift",
  );
  requireValue(
    evidenceContract.visibility === "public",
    "company second-depth evidence visibility must be public",
  );
  requireValue(
    JSON.stringify(evidenceContract.field_kinds) === JSON.stringify(EVIDENCE_KIND_BY_FIELD),
    "company second-depth evidence kind contract drift",
  );

  requireValue(
    Array.isArray(registry.stage_order) && registry.stage_order.length === SECOND_DEPTH_STAGES.length,
    "company second-depth stage count mismatch",
  );
  SECOND_DEPTH_STAGES.forEach(([id, minimumEvidence, ceiling], ordinal) => {
    const row = registry.stage_order[ordinal];
    requireValue(row?.id === id, `company second-depth stage ${ordinal} identity drift`);
    requireValue(row.ordinal === ordinal, `${id}: second-depth ordinal drift`);
    requireValue(
      JSON.stringify(row.minimum_evidence) === JSON.stringify(minimumEvidence),
      `${id}: second-depth minimum evidence drift`,
    );
    requireValue(row.public_claim_ceiling === ceiling, `${id}: second-depth claim ceiling drift`);
  });

  const defaults = registry.default_company_state;
  requireValue(
    defaults && typeof defaults === "object" && !Array.isArray(defaults),
    "company second-depth default state is missing",
  );
  requireValue(defaults.stage === "MAPPED_ONLY", "company second-depth default must be MAPPED_ONLY");
  const overrides = registry.company_overrides;
  requireValue(
    overrides && typeof overrides === "object" && !Array.isArray(overrides),
    "company second-depth overrides are missing",
  );
  for (const companyId of Object.keys(overrides)) {
    requireValue(companyIds.has(companyId), `second-depth override references unknown company ${companyId}`);
  }

  const stageMap = new Map(
    SECOND_DEPTH_STAGES.map(([id, minimumEvidence, ceiling], ordinal) => [
      id,
      { ordinal, minimumEvidence, ceiling },
    ]),
  );
  const resolved = new Map();
  for (const companyId of companyIds) {
    const override = overrides[companyId] ?? {};
    requireValue(
      override && typeof override === "object" && !Array.isArray(override),
      `${companyId}: second-depth override is invalid`,
    );
    const state = { ...defaults, ...override };
    const contract = stageMap.get(state.stage);
    requireValue(contract, `${companyId}: invalid second-depth stage ${String(state.stage)}`);
    requireValue(
      state.claim_ceiling === contract.ceiling,
      `${companyId}: second-depth claim ceiling exceeds stage`,
    );
    requireValue(
      Array.isArray(state.blockers) && state.blockers.every((value) => typeof value === "string" && value),
      `${companyId}: second-depth blockers are invalid`,
    );
    requireValue(
      typeof state.next_gate === "string" && state.next_gate.length > 0,
      `${companyId}: second-depth next gate is missing`,
    );

    const evidence = {};
    for (const field of EVIDENCE_FIELDS) {
      requireValue(Array.isArray(state[field]), `${companyId}.${field} must be an array`);
      evidence[field] = state[field].map((item) => validateEvidenceReference(companyId, field, item));
    }
    for (const field of contract.minimumEvidence) {
      requireValue(evidence[field].length > 0, `${companyId}: stage ${state.stage} requires ${field}`);
    }
    if (contract.ordinal < stageMap.get("PROOF_REPRODUCED").ordinal) {
      requireValue(evidence.proof_artifacts.length === 0, `${companyId}: proof precedes proof stage`);
    }
    if (contract.ordinal < stageMap.get("CLAIM_PROMOTED").ordinal) {
      requireValue(evidence.claim_receipts.length === 0, `${companyId}: claim receipt precedes claim stage`);
    }
    resolved.set(companyId, {
      stage: state.stage,
      ordinal: contract.ordinal,
      claim_ceiling: state.claim_ceiling,
      blockers: [...state.blockers],
      next_gate: state.next_gate,
      evidence,
    });
  }
  return resolved;
}

async function main() {
  const pointer = parseJson(await readFile(POINTER_PATH, "utf8"), "portfolio-source.json");
  requireValue(pointer.schema === "glaciereq.portfolio-consumer-pointer.v1", "unexpected pointer schema");
  requireValue(pointer.consumer === "GlacierEQ/job-application", "consumer identity mismatch");
  requireValue(pointer.projection_id === "public_portal", "projection identity mismatch");
  requireValue(
    pointer.public_boundary?.publish_private_records === false,
    "public pointer must forbid private records",
  );
  requireValue(
    pointer.sync?.fail_closed === true && pointer.sync?.allow_stale_fallback === false,
    "projection must fail closed without stale fallback",
  );

  const authority = pointer.authority;
  requireValue(authority?.repository === "GlacierEQ/job-app-helix", "unexpected Helix authority repository");
  requireValue(authority?.branch === "main", "public projection must consume canonical Helix main");
  requireValue(
    typeof authority?.manifest_path === "string" && authority.manifest_path.length > 0,
    "Helix manifest path is missing",
  );
  requireValue(
    authority?.raw_base_url === "https://raw.githubusercontent.com/GlacierEQ/job-app-helix",
    "unexpected Helix raw base URL",
  );
  requireValue(
    authority?.commit_api_url === "https://api.github.com/repos/GlacierEQ/job-app-helix/commits/main",
    "unexpected Helix commit API URL",
  );

  const resolvedCommit = await resolveHelixSha(authority);
  const rawBase = `${authority.raw_base_url}/${resolvedCommit}`;
  const rootText = await fetchText(`${rawBase}/${authority.manifest_path}`);
  const root = parseJson(rootText, "Helix root manifest");
  requireValue(root.schema === "glaciereq.portfolio-root-truth.v1", "unexpected Helix root schema");
  requireValue(root.authority?.repository === authority.repository, "unexpected Helix root authority");
  requireValue(root.authority?.branch === authority.branch, "Helix root branch contract mismatch");

  const projections = Array.isArray(root.projections) ? root.projections : [];
  const projection = projections.find(
    (row) => row && typeof row === "object" && row.id === pointer.projection_id,
  );
  requireValue(projection, `projection ${pointer.projection_id} is absent from Helix root`);
  requireValue(projection.repository === pointer.consumer, "Helix projection consumer mismatch");
  requireValue(projection.may_publish_private_records === false, "Helix public projection permits private records");

  const sourceRows = Array.isArray(root.sources) ? root.sources : [];
  const sourcesById = new Map();
  for (const row of sourceRows) {
    requireValue(row && typeof row === "object" && !Array.isArray(row), "Helix source rows must be objects");
    requireValue(typeof row.id === "string" && row.id.length > 0, "Helix source id is missing");
    requireValue(!sourcesById.has(row.id), `duplicate Helix source id ${row.id}`);
    requireValue(
      typeof row.path === "string" && /^(manifests|status|generated)\//.test(row.path),
      `invalid Helix source path for ${row.id}`,
    );
    sourcesById.set(row.id, row);
  }

  const requiredIds = projection.required_sources;
  requireValue(Array.isArray(requiredIds) && requiredIds.length > 0, "projection has no required sources");
  for (const sourceId of requiredIds) {
    requireValue(sourcesById.has(sourceId), `projection references unknown source ${sourceId}`);
  }
  requireValue(
    requiredIds.includes("company_second_depth"),
    "public portal projection must require company_second_depth",
  );

  const sourceTexts = new Map();
  const sourceObjects = new Map();
  async function loadSource(sourceId) {
    if (sourceObjects.has(sourceId)) return sourceObjects.get(sourceId);
    const source = sourcesById.get(sourceId);
    requireValue(source, `missing source definition ${sourceId}`);
    const text = await fetchText(`${rawBase}/${source.path}`);
    const value = parseJson(text, source.path);
    sourceTexts.set(source.path, text);
    sourceObjects.set(sourceId, value);
    return value;
  }

  await Promise.all(requiredIds.map(loadSource));
  const inventory = sourceObjects.get("inventory");
  const flagships = sourceObjects.get("flagships");
  const companiesIndex = sourceObjects.get("companies");
  const companySecondDepth = sourceObjects.get("company_second_depth");
  const languageFit = sourceObjects.get("language_fit");
  const liveEvidence = sourceObjects.get("live_evidence");
  for (const [id, value] of [
    ["inventory", inventory],
    ["flagships", flagships],
    ["companies", companiesIndex],
    ["company_second_depth", companySecondDepth],
    ["language_fit", languageFit],
    ["live_evidence", liveEvidence],
  ]) {
    requireValue(value, `required public portal source is missing: ${id}`);
  }

  requireValue(
    typeof inventory.portfolio_root === "string" && inventory.portfolio_root.length > 0,
    "Helix portfolio root is missing",
  );
  const workspace = inventory.workspace_repositories;
  requireValue(
    Array.isArray(workspace) && workspace.every((name) => typeof name === "string" && name.length > 0),
    "Helix workspace inventory is invalid",
  );
  requireValue(new Set(workspace).size === workspace.length, "Helix inventory contains duplicate identities");
  requireValue(
    Number.isInteger(inventory.total_repositories) && inventory.total_repositories > 0,
    "Helix total repository count is invalid",
  );
  const rootRepositoryCount = inventory.total_repositories - workspace.length;
  requireValue(
    rootRepositoryCount === 1,
    "Helix inventory contract requires exactly one control-plane root",
  );
  const workspaceSet = new Set(workspace);

  const columns = companiesIndex.repository_record_columns;
  requireValue(
    Array.isArray(columns) && columns.length > 0 && new Set(columns).size === columns.length,
    "company repository columns are invalid",
  );
  const requiredColumns = [
    "repository",
    "skill_innovation_level",
    "promotion_state",
    "visibility",
    "inventory_scope",
    "provenance_state",
  ];
  for (const column of requiredColumns) {
    requireValue(columns.includes(column), `company repository column is missing: ${column}`);
  }

  const enums = companiesIndex.repository_record_enums;
  requireValue(
    enums && typeof enums === "object" && !Array.isArray(enums),
    "company repository enums are missing",
  );
  const promotionStates = new Set(enums.promotion_state ?? []);
  const visibilityStates = new Set(enums.visibility ?? []);
  const inventoryScopes = new Set(enums.inventory_scope ?? []);
  const provenanceStates = new Set(enums.provenance_state ?? []);
  const aliases = companiesIndex.repository_record_legacy_aliases?.promotion_state ?? {};
  const recruiterStates = new Set(
    companiesIndex.truth_boundary?.public_recruiter_admission_states ?? [],
  );
  const pointerStates = new Set(pointer.public_boundary.allowed_promotion_states ?? []);
  requireValue(recruiterStates.size > 0, "Helix recruiter admission states are missing");
  requireValue(
    recruiterStates.size === pointerStates.size &&
      [...recruiterStates].every((state) => pointerStates.has(state)),
    "portal admission states differ from Helix recruiter contract",
  );

  const companyIds = new Set();
  const publicRepositoryIdentities = new Set();
  const companyTracks = [];
  const dossierFiles = companiesIndex.dossier_files;
  requireValue(
    Array.isArray(dossierFiles) && dossierFiles.length > 0,
    "Helix company dossier list is empty",
  );

  const normalizedCompanies = [];
  for (const shardPath of dossierFiles) {
    requireValue(
      typeof shardPath === "string" && shardPath.startsWith("manifests/company_dossiers/"),
      `invalid dossier path ${String(shardPath)}`,
    );
    const text = await fetchText(`${rawBase}/${shardPath}`);
    const shard = parseJson(text, shardPath);
    sourceTexts.set(shardPath, text);
    requireValue(Array.isArray(shard.companies), `${shardPath}: companies must be an array`);
    for (const rawCompany of shard.companies) {
      const company = normalizeCompany(shard, rawCompany);
      requireValue(
        typeof company.company_id === "string" && COMPANY_ID_PATTERN.test(company.company_id),
        `${shardPath}: company_id is invalid`,
      );
      requireValue(!companyIds.has(company.company_id), `duplicate company_id ${company.company_id}`);
      companyIds.add(company.company_id);
      normalizedCompanies.push({ company, shardPath });
    }
  }

  const requiredCompanyTracks = companiesIndex.required_company_tracks;
  requireValue(
    Array.isArray(requiredCompanyTracks) && requiredCompanyTracks.length === companyIds.size,
    "required company-track count differs from dossier records",
  );
  requireValue(
    requiredCompanyTracks.every((companyId) => companyIds.has(companyId)),
    "required company tracks are incomplete",
  );
  const secondDepthByCompany = validateSecondDepthContract(
    companySecondDepth,
    companiesIndex,
    companyIds,
  );

  for (const { company, shardPath } of normalizedCompanies) {
    requireValue(
      typeof company.display_name === "string" && company.display_name.length > 0,
      `${company.company_id}: display_name is missing`,
    );
    requireValue(
      typeof company.non_affiliation === "string" && company.non_affiliation.length > 0,
      `${company.company_id}: non_affiliation is missing`,
    );
    requireValue(
      typeof company.recruiter_thesis === "string" && company.recruiter_thesis.length > 0,
      `${company.company_id}: recruiter_thesis is missing`,
    );
    requireValue(
      typeof company.gap_or_next_gate === "string" && company.gap_or_next_gate.length > 0,
      `${company.company_id}: gap_or_next_gate is missing`,
    );
    requireValue(Array.isArray(company.repositories), `${company.company_id}: repositories must be an array`);

    const projectedRepositories = [];
    for (const tuple of company.repositories) {
      requireValue(
        Array.isArray(tuple) && tuple.length === columns.length,
        `${company.company_id}: repository tuple does not match declared columns`,
      );
      const record = Object.fromEntries(columns.map((column, index) => [column, tuple[index]]));
      const repository = validateRepositoryIdentity(record.repository, company.company_id);
      const level = record.skill_innovation_level;
      const rawPromotionState = record.promotion_state;
      const promotionState = aliases[rawPromotionState] ?? rawPromotionState;
      const visibility = record.visibility;
      const inventoryScope = record.inventory_scope;
      const provenanceState = record.provenance_state;

      requireValue(LEVELS.has(level), `${repository}: invalid skill level ${String(level)}`);
      requireValue(
        promotionStates.has(promotionState),
        `${repository}: unknown promotion state ${String(rawPromotionState)}`,
      );
      requireValue(visibilityStates.has(visibility), `${repository}: invalid visibility ${String(visibility)}`);
      requireValue(
        inventoryScopes.has(inventoryScope),
        `${repository}: invalid inventory scope ${String(inventoryScope)}`,
      );
      requireValue(
        provenanceStates.has(provenanceState),
        `${repository}: invalid provenance state ${String(provenanceState)}`,
      );
      if (inventoryScope === "HELIX_ADMITTED") {
        requireValue(
          workspaceSet.has(repositoryName(repository)),
          `${repository}: HELIX_ADMITTED identity is absent from canonical inventory`,
        );
      }
      if (visibility === "public") publicRepositoryIdentities.add(repository);

      const recruiterEligible =
        visibility === "public" && level !== "L0" && recruiterStates.has(promotionState);
      if (recruiterEligible) {
        projectedRepositories.push({
          repository,
          level,
          promotion_state: promotionState,
          visibility,
          inventory_scope: inventoryScope,
          provenance_state: provenanceState,
        });
      }
    }

    const secondDepth = secondDepthByCompany.get(company.company_id);
    requireValue(secondDepth, `${company.company_id}: second-depth state did not resolve`);
    companyTracks.push({
      company_id: company.company_id,
      display_name: company.display_name,
      track_state: company.track_state,
      target_roles: Array.isArray(company.target_roles) ? company.target_roles : [],
      recruiter_thesis: company.recruiter_thesis,
      gap_or_next_gate: company.gap_or_next_gate,
      non_affiliation: company.non_affiliation,
      repositories: projectedRepositories,
      applicable_flagships: Array.isArray(company.applicable_flagships)
        ? company.applicable_flagships
        : [],
      second_depth: secondDepth,
      source_shard: shardPath,
    });
  }

  const excludedMarkers = pointer.public_boundary.excluded_surface_markers;
  requireValue(Array.isArray(excludedMarkers), "excluded flagship surface markers are missing");
  requireValue(Array.isArray(flagships.flagships), "flagship registry is invalid");
  const seenFlagshipIds = new Set();
  const publicFlagships = [];
  for (const row of flagships.flagships) {
    requireValue(
      row && typeof row === "object" && !Array.isArray(row),
      "Helix flagship rows must be objects",
    );
    requireValue(
      typeof row.system_id === "string" && row.system_id.length > 0,
      "flagship system_id is invalid",
    );
    requireValue(!seenFlagshipIds.has(row.system_id), `duplicate flagship system_id ${row.system_id}`);
    seenFlagshipIds.add(row.system_id);
    if (row.repository === null || row.repository === undefined) continue;
    const repository = validateRepositoryIdentity(row.repository, row.system_id);
    const surface = String(row.public_surface ?? "");
    const state = String(row.state ?? "");
    const excluded = excludedMarkers.some((marker) => surface.includes(marker));
    const publicIdentity = publicRepositoryIdentities.has(repository);
    const recruiterEligible = pointerStates.has(state);
    if (excluded || !publicIdentity || !recruiterEligible) continue;
    requireValue(
      typeof row.level === "string" && LEVELS.has(row.level),
      `${row.system_id}: invalid flagship level`,
    );
    requireValue(
      typeof row.role === "string" && row.role.length > 0,
      `${row.system_id}: flagship role is missing`,
    );
    requireValue(
      typeof row.evidence === "string" && row.evidence.length > 0,
      `${row.system_id}: flagship evidence is missing`,
    );
    requireValue(
      typeof row.next_gate === "string" && row.next_gate.length > 0,
      `${row.system_id}: flagship next gate is missing`,
    );
    publicFlagships.push({
      system_id: row.system_id,
      repository,
      level: row.level,
      state,
      role: row.role,
      evidence: row.evidence,
      next_gate: row.next_gate,
      public_surface: surface,
    });
  }
  requireValue(publicFlagships.length > 0, "public flagship projection is empty");

  const liveEvidenceSource = sourcesById.get("live_evidence");
  const secondDepthSource = sourcesById.get("company_second_depth");
  requireValue(liveEvidenceSource, "missing live_evidence source definition");
  requireValue(secondDepthSource, "missing company_second_depth source definition");
  const sourceHashes = Object.fromEntries(
    [...sourceTexts.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([sourcePath, text]) => [sourcePath, sha256(text)]),
  );
  sourceHashes[authority.manifest_path] = sha256(rootText);
  const sourceDigest = sha256(stableJson(sourceHashes));

  const bundle = {
    schema: "glaciereq.public-portfolio-projection.v1",
    source: {
      authority: root.authority,
      root_version: root.version,
      root_ref: resolvedCommit,
      source_digest: sourceDigest,
      source_hashes: sourceHashes,
    },
    inventory: {
      portfolio_root: inventory.portfolio_root,
      total_repositories: inventory.total_repositories,
      workspace_repositories: workspace.length,
      root_repositories: rootRepositoryCount,
      identities_withheld_from_public_bundle: true,
    },
    flagships: publicFlagships,
    companies: companyTracks,
    company_second_depth: {
      schema: companySecondDepth.schema,
      source_path: secondDepthSource.path,
      content_sha256: sourceHashes[secondDepthSource.path],
      stage_order: companySecondDepth.stage_order.map((row) => ({
        id: row.id,
        ordinal: row.ordinal,
        public_claim_ceiling: row.public_claim_ceiling,
      })),
      priority_wave: [...companySecondDepth.priority_wave],
      boundary:
        "Second-depth state is Helix-governed. Public claim ceilings advance only when pinned public evidence satisfies every cumulative stage prerequisite.",
    },
    language_fit: languageFit,
    evidence: {
      schema: liveEvidence.schema,
      source_path: liveEvidenceSource.path,
      content_sha256: sourceHashes[liveEvidenceSource.path],
      boundary:
        "Repository-native receipts remain authoritative; this public bundle carries only source identity, not unfiltered evidence rows.",
    },
    invariants: pointer.invariants,
  };

  const outputArg = process.argv.indexOf("--output");
  const outputRelative = outputArg >= 0 ? process.argv[outputArg + 1] : pointer.sync.output;
  const output = resolveOutput(outputRelative, "projection output");
  const bundleText = stableJson(bundle);
  await mkdir(path.dirname(output), { recursive: true });
  await writeFile(output, bundleText, "utf8");

  const receiptOutput = resolveOutput(pointer.sync.receipt_output, "projection receipt output");
  const receipt = {
    schema: "glaciereq.portfolio-projection-receipt.v1",
    projection_id: pointer.projection_id,
    consumer_repository: pointer.consumer,
    consumed_source_digest: sourceDigest,
    source_commit: resolvedCommit,
    output_path: path.relative(ROOT, output).replaceAll(path.sep, "/"),
    output_sha256: sha256(bundleText),
    root_version: root.version,
    company_tracks: companyTracks.length,
    company_second_depth_source: secondDepthSource.path,
    status: "PASS",
  };
  await mkdir(path.dirname(receiptOutput), { recursive: true });
  await writeFile(receiptOutput, stableJson(receipt), "utf8");

  console.log(`Helix public projection written: ${path.relative(ROOT, output)}`);
  console.log(`Helix projection receipt written: ${path.relative(ROOT, receiptOutput)}`);
  console.log(`source_commit=${resolvedCommit} source_digest=${sourceDigest}`);
  console.log(`flagships=${bundle.flagships.length} companies=${bundle.companies.length}`);
  console.log(
    `second_depth=${bundle.companies.reduce((counts, company) => {
      counts[company.second_depth.stage] = (counts[company.second_depth.stage] ?? 0) + 1;
      return counts;
    }, {})}`,
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack : error);
  process.exitCode = 1;
});

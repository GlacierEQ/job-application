#!/usr/bin/env node

import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(SCRIPT_DIR, "..");
const POINTER_PATH = path.join(ROOT, "portfolio-source.json");
const REPOSITORY_PATTERN = /^GlacierEQ\/[A-Za-z0-9_.-]+$/;
const LEVELS = new Set(["L0", "L1", "L2", "L3", "L4", "L5"]);

function fail(message) {
  throw new Error(`Helix projection sync failed: ${message}`);
}

function requireValue(condition, message) {
  if (!condition) fail(message);
}

function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stable(value[key])]));
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
    requireValue(value && typeof value === "object" && !Array.isArray(value), `${label} must contain an object`);
    return value;
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("Helix projection sync failed:")) throw error;
    fail(`${label} contains invalid JSON: ${error instanceof Error ? error.message : String(error)}`);
  }
}

async function fetchText(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15_000);
  try {
    const response = await fetch(url, {
      headers: { Accept: "application/json", "User-Agent": "GlacierEQ-job-application" },
      signal: controller.signal,
    });
    requireValue(response.ok, `${url} returned ${response.status}`);
    return await response.text();
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("Helix projection sync failed:")) throw error;
    fail(`${url}: ${error instanceof Error ? error.message : String(error)}`);
  } finally {
    clearTimeout(timer);
  }
}

function normalizeCompany(shard, rawCompany) {
  const defaults = shard.defaults && typeof shard.defaults === "object" && !Array.isArray(shard.defaults)
    ? shard.defaults
    : {};
  requireValue(rawCompany && typeof rawCompany === "object" && !Array.isArray(rawCompany), "company entries must be objects");
  return { ...defaults, ...rawCompany };
}

function validateRepositoryIdentity(repository, label) {
  requireValue(typeof repository === "string" && REPOSITORY_PATTERN.test(repository), `${label}: invalid repository identity ${String(repository)}`);
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

async function main() {
  const pointer = parseJson(await readFile(POINTER_PATH, "utf8"), "portfolio-source.json");
  requireValue(pointer.schema === "glaciereq.portfolio-consumer-pointer.v1", "unexpected pointer schema");
  requireValue(pointer.consumer === "GlacierEQ/job-application", "consumer identity mismatch");
  requireValue(pointer.projection_id === "public_portal", "projection identity mismatch");
  requireValue(pointer.public_boundary?.publish_private_records === false, "public pointer must forbid private records");
  requireValue(pointer.sync?.fail_closed === true && pointer.sync?.allow_stale_fallback === false, "projection must fail closed without stale fallback");

  const authority = pointer.authority;
  requireValue(authority?.repository === "GlacierEQ/job-app-helix", "unexpected Helix authority repository");
  requireValue(authority?.branch === "main", "public projection must consume canonical Helix main");
  requireValue(typeof authority?.manifest_path === "string" && authority.manifest_path.length > 0, "Helix manifest path is missing");
  requireValue(authority?.raw_base_url === "https://raw.githubusercontent.com/GlacierEQ/job-app-helix", "unexpected Helix raw base URL");

  const rawBase = `${authority.raw_base_url}/${encodeURIComponent(authority.branch)}`;
  const rootText = await fetchText(`${rawBase}/${authority.manifest_path}`);
  const root = parseJson(rootText, "Helix root manifest");
  requireValue(root.schema === "glaciereq.portfolio-root-truth.v1", "unexpected Helix root schema");
  requireValue(root.authority?.repository === authority.repository, "unexpected Helix root authority");
  requireValue(root.authority?.branch === authority.branch, "Helix root branch contract mismatch");

  const projections = Array.isArray(root.projections) ? root.projections : [];
  const projection = projections.find((row) => row && typeof row === "object" && row.id === pointer.projection_id);
  requireValue(projection, `projection ${pointer.projection_id} is absent from Helix root`);
  requireValue(projection.repository === pointer.consumer, "Helix projection consumer mismatch");
  requireValue(projection.may_publish_private_records === false, "Helix public projection permits private records");

  const sourceRows = Array.isArray(root.sources) ? root.sources : [];
  const sourcesById = new Map();
  for (const row of sourceRows) {
    requireValue(row && typeof row === "object" && !Array.isArray(row), "Helix source rows must be objects");
    requireValue(typeof row.id === "string" && row.id.length > 0, "Helix source id is missing");
    requireValue(!sourcesById.has(row.id), `duplicate Helix source id ${row.id}`);
    requireValue(typeof row.path === "string" && /^(manifests|status|generated)\//.test(row.path), `invalid Helix source path for ${row.id}`);
    sourcesById.set(row.id, row);
  }

  const requiredIds = projection.required_sources;
  requireValue(Array.isArray(requiredIds) && requiredIds.length > 0, "projection has no required sources");
  for (const sourceId of requiredIds) {
    requireValue(sourcesById.has(sourceId), `projection references unknown source ${sourceId}`);
  }

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

  const inventory = await loadSource("inventory");
  const flagships = await loadSource("flagships");
  const companiesIndex = await loadSource("companies");
  const languageFit = await loadSource("language_fit");
  const liveEvidence = await loadSource("live_evidence");

  requireValue(typeof inventory.portfolio_root === "string" && inventory.portfolio_root.length > 0, "Helix portfolio root is missing");
  const workspace = inventory.workspace_repositories;
  requireValue(Array.isArray(workspace) && workspace.every((name) => typeof name === "string" && name.length > 0), "Helix workspace inventory is invalid");
  requireValue(new Set(workspace).size === workspace.length, "Helix inventory contains duplicate identities");
  requireValue(Number.isInteger(inventory.total_repositories) && inventory.total_repositories > 0, "Helix total repository count is invalid");
  const rootRepositoryCount = inventory.total_repositories - workspace.length;
  requireValue(rootRepositoryCount === 1, "Helix inventory contract requires exactly one control-plane root");
  const workspaceSet = new Set(workspace);

  const columns = companiesIndex.repository_record_columns;
  requireValue(Array.isArray(columns) && columns.length > 0 && new Set(columns).size === columns.length, "company repository columns are invalid");
  const requiredColumns = ["repository", "skill_innovation_level", "promotion_state", "visibility", "inventory_scope", "provenance_state"];
  for (const column of requiredColumns) requireValue(columns.includes(column), `company repository column is missing: ${column}`);

  const enums = companiesIndex.repository_record_enums;
  requireValue(enums && typeof enums === "object" && !Array.isArray(enums), "company repository enums are missing");
  const promotionStates = new Set(enums.promotion_state ?? []);
  const visibilityStates = new Set(enums.visibility ?? []);
  const inventoryScopes = new Set(enums.inventory_scope ?? []);
  const provenanceStates = new Set(enums.provenance_state ?? []);
  const aliases = companiesIndex.repository_record_legacy_aliases?.promotion_state ?? {};
  const recruiterStates = new Set(companiesIndex.truth_boundary?.public_recruiter_admission_states ?? []);
  const pointerStates = new Set(pointer.public_boundary.allowed_promotion_states ?? []);
  requireValue(recruiterStates.size > 0, "Helix recruiter admission states are missing");
  requireValue(recruiterStates.size === pointerStates.size && [...recruiterStates].every((state) => pointerStates.has(state)), "portal admission states differ from Helix recruiter contract");

  const companyIds = new Set();
  const publicRepositoryIdentities = new Set();
  const companyTracks = [];
  const dossierFiles = companiesIndex.dossier_files;
  requireValue(Array.isArray(dossierFiles) && dossierFiles.length > 0, "Helix company dossier list is empty");

  for (const shardPath of dossierFiles) {
    requireValue(typeof shardPath === "string" && shardPath.startsWith("manifests/company_dossiers/"), `invalid dossier path ${String(shardPath)}`);
    const text = await fetchText(`${rawBase}/${shardPath}`);
    const shard = parseJson(text, shardPath);
    sourceTexts.set(shardPath, text);
    requireValue(Array.isArray(shard.companies), `${shardPath}: companies must be an array`);

    for (const rawCompany of shard.companies) {
      const company = normalizeCompany(shard, rawCompany);
      requireValue(typeof company.company_id === "string" && company.company_id.length > 0, `${shardPath}: company_id is missing`);
      requireValue(!companyIds.has(company.company_id), `duplicate company_id ${company.company_id}`);
      companyIds.add(company.company_id);
      requireValue(typeof company.display_name === "string" && company.display_name.length > 0, `${company.company_id}: display_name is missing`);
      requireValue(typeof company.non_affiliation === "string" && company.non_affiliation.length > 0, `${company.company_id}: non_affiliation is missing`);
      requireValue(Array.isArray(company.repositories), `${company.company_id}: repositories must be an array`);

      const projectedRepositories = [];
      for (const tuple of company.repositories) {
        requireValue(Array.isArray(tuple) && tuple.length === columns.length, `${company.company_id}: repository tuple does not match declared columns`);
        const record = Object.fromEntries(columns.map((column, index) => [column, tuple[index]]));
        const repository = validateRepositoryIdentity(record.repository, company.company_id);
        const level = record.skill_innovation_level;
        const rawPromotionState = record.promotion_state;
        const promotionState = aliases[rawPromotionState] ?? rawPromotionState;
        const visibility = record.visibility;
        const inventoryScope = record.inventory_scope;
        const provenanceState = record.provenance_state;

        requireValue(LEVELS.has(level), `${repository}: invalid skill level ${String(level)}`);
        requireValue(promotionStates.has(promotionState), `${repository}: unknown promotion state ${String(rawPromotionState)}`);
        requireValue(visibilityStates.has(visibility), `${repository}: invalid visibility ${String(visibility)}`);
        requireValue(inventoryScopes.has(inventoryScope), `${repository}: invalid inventory scope ${String(inventoryScope)}`);
        requireValue(provenanceStates.has(provenanceState), `${repository}: invalid provenance state ${String(provenanceState)}`);
        if (inventoryScope === "HELIX_ADMITTED") {
          requireValue(workspaceSet.has(repositoryName(repository)), `${repository}: HELIX_ADMITTED identity is absent from canonical inventory`);
        }
        if (visibility === "public") publicRepositoryIdentities.add(repository);

        const recruiterEligible = visibility === "public" && level !== "L0" && recruiterStates.has(promotionState);
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

      companyTracks.push({
        company_id: company.company_id,
        display_name: company.display_name,
        track_state: company.track_state,
        target_roles: company.target_roles,
        recruiter_thesis: company.recruiter_thesis,
        gap_or_next_gate: company.gap_or_next_gate,
        non_affiliation: company.non_affiliation,
        repositories: projectedRepositories,
        applicable_flagships: Array.isArray(company.applicable_flagships) ? company.applicable_flagships : [],
      });
    }
  }

  const requiredCompanyTracks = companiesIndex.required_company_tracks;
  requireValue(Array.isArray(requiredCompanyTracks) && requiredCompanyTracks.length === companyIds.size, "required company-track count differs from dossier records");
  requireValue(requiredCompanyTracks.every((companyId) => companyIds.has(companyId)), "required company tracks are incomplete");

  const excludedMarkers = pointer.public_boundary.excluded_surface_markers;
  requireValue(Array.isArray(excludedMarkers), "excluded flagship surface markers are missing");
  requireValue(Array.isArray(flagships.flagships), "flagship registry is invalid");
  const seenFlagshipIds = new Set();
  const publicFlagships = [];
  for (const row of flagships.flagships) {
    requireValue(row && typeof row === "object" && !Array.isArray(row), "flagship rows must be objects");
    requireValue(typeof row.system_id === "string" && row.system_id.length > 0, "flagship system_id is invalid");
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
    requireValue(typeof row.level === "string" && LEVELS.has(row.level), `${row.system_id}: invalid flagship level`);
    requireValue(typeof row.role === "string" && row.role.length > 0, `${row.system_id}: flagship role is missing`);
    requireValue(typeof row.evidence === "string" && row.evidence.length > 0, `${row.system_id}: flagship evidence is missing`);
    requireValue(typeof row.next_gate === "string" && row.next_gate.length > 0, `${row.system_id}: flagship next gate is missing`);
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
  requireValue(liveEvidenceSource, "missing live_evidence source definition");
  const sourceHashes = Object.fromEntries(
    [...sourceTexts.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([sourcePath, text]) => [sourcePath, sha256(text)]),
  );
  sourceHashes[authority.manifest_path] = sha256(rootText);
  const sourceDigest = sha256(stableJson(sourceHashes));

  const bundle = {
    schema: "glaciereq.public-portfolio-projection.v1",
    source: {
      authority: root.authority,
      root_version: root.version,
      root_ref: authority.branch,
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
    language_fit: languageFit,
    evidence: {
      schema: liveEvidence.schema,
      source_path: liveEvidenceSource.path,
      content_sha256: sourceHashes[liveEvidenceSource.path],
      boundary: "Repository-native receipts remain authoritative; this public bundle carries only source identity, not unfiltered evidence rows.",
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
    output_path: path.relative(ROOT, output).replaceAll(path.sep, "/"),
    output_sha256: sha256(bundleText),
    root_version: root.version,
    root_ref: authority.branch,
    status: "PASS",
  };
  const receiptText = stableJson(receipt);
  await mkdir(path.dirname(receiptOutput), { recursive: true });
  await writeFile(receiptOutput, receiptText, "utf8");

  console.log(`Helix public projection written: ${path.relative(ROOT, output)}`);
  console.log(`Helix projection receipt written: ${path.relative(ROOT, receiptOutput)}`);
  console.log(`source_digest=${sourceDigest}`);
  console.log(`flagships=${bundle.flagships.length} companies=${bundle.companies.length}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack : error);
  process.exitCode = 1;
});

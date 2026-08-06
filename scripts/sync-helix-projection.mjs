#!/usr/bin/env node

import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(SCRIPT_DIR, "..");
const POINTER_PATH = path.join(ROOT, "portfolio-source.json");

function fail(message) {
  throw new Error(`Helix projection sync failed: ${message}`);
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

async function fetchText(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15_000);
  try {
    const response = await fetch(url, {
      headers: { Accept: "application/json", "User-Agent": "GlacierEQ-job-application" },
      signal: controller.signal,
    });
    if (!response.ok) fail(`${url} returned ${response.status}`);
    return await response.text();
  } catch (error) {
    fail(`${url}: ${error instanceof Error ? error.message : String(error)}`);
  } finally {
    clearTimeout(timer);
  }
}

function parseJson(text, label) {
  try {
    const value = JSON.parse(text);
    if (!value || typeof value !== "object" || Array.isArray(value)) fail(`${label} must contain an object`);
    return value;
  } catch (error) {
    fail(`${label} contains invalid JSON: ${error instanceof Error ? error.message : String(error)}`);
  }
}

function normalizeCompany(shard, rawCompany) {
  const defaults = shard.defaults && typeof shard.defaults === "object" ? shard.defaults : {};
  return { ...defaults, ...rawCompany };
}

function isPublicFlagship(flagship, excludedMarkers) {
  if (!flagship.repository || typeof flagship.repository !== "string") return false;
  const surface = String(flagship.public_surface ?? "");
  return !excludedMarkers.some((marker) => surface.includes(marker));
}

async function main() {
  const pointer = parseJson(await readFile(POINTER_PATH, "utf8"), "portfolio-source.json");
  if (pointer.schema !== "glaciereq.portfolio-consumer-pointer.v1") fail("unexpected pointer schema");
  if (pointer.consumer !== "GlacierEQ/job-application") fail("consumer identity mismatch");
  if (pointer.projection_id !== "public_portal") fail("projection identity mismatch");
  if (pointer.public_boundary?.publish_private_records !== false) fail("public pointer must forbid private records");

  const ref = process.env.HELIX_ROOT_REF || pointer.authority.branch;
  const rawBase = `https://raw.githubusercontent.com/GlacierEQ/job-app-helix/${encodeURIComponent(ref)}`;
  const rootUrl = `${rawBase}/${pointer.authority.manifest_path}`;
  const rootText = await fetchText(rootUrl);
  const root = parseJson(rootText, "Helix root manifest");
  if (root.schema !== "glaciereq.portfolio-root-truth.v1") fail("unexpected Helix root schema");
  if (root.authority?.repository !== "GlacierEQ/job-app-helix") fail("unexpected Helix authority");

  const projection = root.projections?.find((row) => row.id === pointer.projection_id);
  if (!projection) fail(`projection ${pointer.projection_id} is absent from Helix root`);
  if (projection.may_publish_private_records !== false) fail("Helix public projection permits private records");

  const sourcesById = new Map((root.sources ?? []).map((row) => [row.id, row]));
  const requiredIds = projection.required_sources ?? [];
  if (!requiredIds.length) fail("projection has no required sources");
  for (const sourceId of requiredIds) {
    if (!sourcesById.has(sourceId)) fail(`projection references unknown source ${sourceId}`);
  }

  const sourceTexts = new Map();
  const sourceObjects = new Map();
  async function loadSource(sourceId) {
    if (sourceObjects.has(sourceId)) return sourceObjects.get(sourceId);
    const source = sourcesById.get(sourceId);
    if (!source) fail(`missing source definition ${sourceId}`);
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

  const workspace = inventory.workspace_repositories;
  if (!Array.isArray(workspace) || inventory.total_repositories !== workspace.length + 1) {
    fail("Helix inventory count is inconsistent");
  }
  if (new Set(workspace).size !== workspace.length) fail("Helix inventory contains duplicate identities");

  const excludedMarkers = pointer.public_boundary.excluded_surface_markers;
  const publicFlagships = (flagships.flagships ?? [])
    .filter((row) => isPublicFlagship(row, excludedMarkers))
    .map((row) => ({
      system_id: row.system_id,
      repository: row.repository,
      level: row.level,
      state: row.state,
      role: row.role,
      evidence: row.evidence,
      next_gate: row.next_gate,
      public_surface: row.public_surface,
    }));

  const allowedPromotionStates = new Set(pointer.public_boundary.allowed_promotion_states);
  const companyTracks = [];
  for (const shardPath of companiesIndex.dossier_files ?? []) {
    const text = await fetchText(`${rawBase}/${shardPath}`);
    const shard = parseJson(text, shardPath);
    sourceTexts.set(shardPath, text);
    for (const rawCompany of shard.companies ?? []) {
      const company = normalizeCompany(shard, rawCompany);
      const repositories = (company.repositories ?? [])
        .filter((row) => Array.isArray(row) && row.length === 6)
        .filter((row) => row[3] === "public" && allowedPromotionStates.has(row[2]))
        .map(([repository, level, promotion_state, visibility, inventory_scope, provenance_state]) => ({
          repository,
          level,
          promotion_state,
          visibility,
          inventory_scope,
          provenance_state,
        }));
      companyTracks.push({
        company_id: company.company_id,
        display_name: company.display_name,
        track_state: company.track_state,
        target_roles: company.target_roles,
        recruiter_thesis: company.recruiter_thesis,
        gap_or_next_gate: company.gap_or_next_gate,
        non_affiliation: company.non_affiliation,
        repositories,
        applicable_flagships: company.applicable_flagships ?? [],
      });
    }
  }

  const privateLeak = companyTracks.some((company) => company.repositories.some((row) => row.visibility !== "public"));
  if (privateLeak) fail("private repository leaked into public company projection");

  const sourceHashes = Object.fromEntries(
    [...sourceTexts.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([sourcePath, text]) => [sourcePath, sha256(text)]),
  );
  sourceHashes[pointer.authority.manifest_path] = sha256(rootText);

  const bundle = {
    schema: "glaciereq.public-portfolio-projection.v1",
    source: {
      authority: root.authority,
      root_version: root.version,
      root_ref: ref,
      source_digest: sha256(stableJson(sourceHashes)),
      source_hashes: sourceHashes,
    },
    inventory: {
      portfolio_root: inventory.portfolio_root,
      total_repositories: inventory.total_repositories,
      workspace_repositories: workspace.length,
      identities_withheld_from_public_bundle: true,
    },
    flagships: publicFlagships,
    companies: companyTracks,
    language_fit: languageFit,
    evidence: {
      schema: liveEvidence.schema,
      source_path: sourcesById.get("live_evidence").path,
      content_sha256: sourceHashes[sourcesById.get("live_evidence").path],
      boundary: "Repository-native receipts remain authoritative; this public bundle carries only source identity, not unfiltered evidence rows.",
    },
    invariants: pointer.invariants,
  };

  const outputArg = process.argv.indexOf("--output");
  const outputRelative = outputArg >= 0 ? process.argv[outputArg + 1] : pointer.sync.output;
  if (!outputRelative) fail("output path is missing");
  const output = path.resolve(ROOT, outputRelative);
  if (!output.startsWith(ROOT + path.sep)) fail("output escapes repository root");
  await mkdir(path.dirname(output), { recursive: true });
  await writeFile(output, stableJson(bundle), "utf8");
  console.log(`Helix public projection written: ${path.relative(ROOT, output)}`);
  console.log(`source_digest=${bundle.source.source_digest}`);
  console.log(`flagships=${bundle.flagships.length} companies=${bundle.companies.length}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack : error);
  process.exitCode = 1;
});

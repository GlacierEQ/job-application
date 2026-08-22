#!/usr/bin/env node

import { readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SITE = path.join(ROOT, "site-v15");
const SNAPSHOT_PATH = path.join(SITE, "data", "helix-root.json");
const INTELLIGENCE_PATH = path.join(SITE, "data", "estate-intelligence.json");
const ATLAS_PATH = path.join(SITE, "atlas", "index.html");
const OUTPUT_SCHEMA = "glaciereq.public-estate-intelligence.v1";
const EXTERNAL_PATH =
  "manifests/application_intelligence/company_bottleneck_atlas.external.json";
const SHA40 = /^[a-f0-9]{40}$/;
const SHA64 = /^[a-f0-9]{64}$/;
const COMPANY_ID = /^[a-z0-9_]+$/;
const START = "<!-- ESTATE_INTELLIGENCE_START -->";
const END = "<!-- ESTATE_INTELLIGENCE_END -->";
const EXECUTABLE_SCRIPT = /<script\b(?![^>]*\btype\s*=\s*["']application\/ld\+json["'])/i;

function requireValue(condition, message) {
  if (!condition) throw new Error(message);
}

function parseJson(text, label) {
  try {
    const value = JSON.parse(text);
    requireValue(value && typeof value === "object" && !Array.isArray(value), `${label} must be an object`);
    return value;
  } catch (error) {
    throw new Error(`${label}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

function companySlug(companyId) {
  requireValue(COMPANY_ID.test(companyId), `invalid company id: ${companyId}`);
  return companyId.replaceAll("_", "-");
}

function markerCount(text, marker) {
  return text.split(marker).length - 1;
}

function scanForbiddenKeys(value, pathParts = []) {
  const forbidden = new Set([
    "estate_facts",
    "namespaces",
    "relationships",
    "supports",
    "total_repositories",
    "workspace_repositories",
    "repository",
    "repositories",
  ]);
  if (Array.isArray(value)) {
    value.forEach((item, index) => scanForbiddenKeys(item, [...pathParts, String(index)]));
    return;
  }
  if (!value || typeof value !== "object") return;
  for (const [key, child] of Object.entries(value)) {
    requireValue(!forbidden.has(key), `forbidden estate key leaked at ${[...pathParts, key].join(".")}`);
    scanForbiddenKeys(child, [...pathParts, key]);
  }
}

function validateSource(source, companyId) {
  requireValue(source && typeof source === "object" && !Array.isArray(source), `${companyId}: official source invalid`);
  requireValue(typeof source.url === "string" && source.url.startsWith("https://"), `${companyId}: official source URL invalid`);
  requireValue(typeof source.source_sha256 === "string" && SHA64.test(source.source_sha256), `${companyId}: official source hash invalid`);
  requireValue(typeof source.title === "string" && source.title.length > 0, `${companyId}: official source title missing`);
  requireValue(typeof source.observed_signal === "string" && source.observed_signal.length > 0, `${companyId}: official source signal missing`);
}

async function main() {
  const snapshotText = await readFile(SNAPSHOT_PATH, "utf8");
  const intelligenceText = await readFile(INTELLIGENCE_PATH, "utf8");
  const snapshot = parseJson(snapshotText, "Helix public projection");
  const intelligence = parseJson(intelligenceText, "public estate intelligence");

  requireValue(intelligence.schema === OUTPUT_SCHEMA, "unexpected public estate-intelligence schema");
  requireValue(typeof snapshot.source?.root_ref === "string" && SHA40.test(snapshot.source.root_ref), "Helix projection root_ref invalid");
  requireValue(intelligence.source?.authority_commit === snapshot.source.root_ref, "estate intelligence is not bound to Helix projection commit");
  requireValue(intelligence.source?.external_manifest_path === EXTERNAL_PATH, "external intelligence source path drifted");
  requireValue(typeof intelligence.source?.external_manifest_sha256 === "string" && SHA64.test(intelligence.source.external_manifest_sha256), "external intelligence source digest invalid");
  requireValue(
    snapshot.source?.source_hashes?.[EXTERNAL_PATH] ===
      intelligence.source.external_manifest_sha256,
    "external intelligence is not bound into Helix source digest",
  );
  requireValue(typeof intelligence.source?.research_as_of === "string" && intelligence.source.research_as_of.length > 0, "research snapshot date missing");
  requireValue(typeof intelligence.source?.freshness_state === "string" && intelligence.source.freshness_state.includes("REQUIRES_REFRESH"), "live-application freshness gate missing");
  requireValue(typeof intelligence.source?.inference_boundary === "string" && intelligence.source.inference_boundary.length > 0, "observation/inference boundary missing");

  requireValue(intelligence.policy?.private_repository_identities_excluded === true, "private repository identity exclusion is not enforced");
  requireValue(intelligence.policy?.internal_receipts_runner_local === true, "internal estate receipts are not runner-local");
  requireValue(intelligence.policy?.support_counts_as_independent_accomplishment === false, "support ancestry is being counted as accomplishment");
  requireValue(intelligence.policy?.role_fit_is_capability_overlap_not_hiring_prediction === true, "role-fit hiring-prediction boundary missing");
  requireValue(intelligence.truth_boundary?.authenticated_estate_cardinality_published === false, "authenticated estate cardinality publication must be false");
  requireValue(intelligence.truth_boundary?.legal_private_material_published === false, "legal-private publication must be false");
  requireValue(intelligence.truth_boundary?.private_repository_identities_published === false, "private repository identity publication must be false");
  requireValue(intelligence.truth_boundary?.source_snapshot_requires_refresh_for_live_application === true, "freshness truth boundary missing");

  scanForbiddenKeys(intelligence);
  requireValue(Array.isArray(intelligence.records) && intelligence.records.length === 47, "public estate intelligence must contain 47 external company records");
  const governed = new Set((snapshot.companies ?? []).map((company) => company.company_id));
  const seen = new Set();
  for (const record of intelligence.records) {
    requireValue(record && typeof record === "object" && !Array.isArray(record), "estate intelligence record invalid");
    requireValue(typeof record.company_id === "string" && COMPANY_ID.test(record.company_id), "estate intelligence company_id invalid");
    requireValue(governed.has(record.company_id), `${record.company_id}: no governed public company track`);
    requireValue(!seen.has(record.company_id), `duplicate estate intelligence record: ${record.company_id}`);
    seen.add(record.company_id);
    for (const field of [
      "display_name",
      "observed_current_pressure",
      "inferred_bottleneck",
      "inferred_brick_wall",
      "leverage_mechanism",
      "expected_impact",
      "application_move",
      "next_deep_dive",
      "inference_boundary",
      "research_as_of",
      "freshness_state",
    ]) {
      requireValue(typeof record[field] === "string" && record[field].length > 0, `${record.company_id}: missing ${field}`);
    }
    requireValue(Array.isArray(record.official_sources) && record.official_sources.length > 0, `${record.company_id}: official sources missing`);
    record.official_sources.forEach((source) => validateSource(source, record.company_id));
    requireValue(Array.isArray(record.target_roles), `${record.company_id}: target roles missing`);

    const pagePath = path.join(
      SITE,
      "companies",
      companySlug(record.company_id),
      "index.html",
    );
    const html = await readFile(pagePath, "utf8");
    requireValue(markerCount(html, START) === 1 && markerCount(html, END) === 1, `${record.company_id}: estate intelligence block is not exactly-once`);
    requireValue(html.includes('id="estate-intelligence"'), `${record.company_id}: estate intelligence section missing`);
    requireValue(html.includes("Observed current pressure"), `${record.company_id}: observed-pressure label missing`);
    requireValue(html.includes("GlacierEQ bottleneck inference"), `${record.company_id}: inference label missing`);
    requireValue(!EXECUTABLE_SCRIPT.test(html), `${record.company_id}: client script introduced`);
    requireValue(!/\sstyle\s*=\s*/i.test(html), `${record.company_id}: inline style introduced`);
  }

  for (const excluded of ["glaciereq_core"]) {
    const pagePath = path.join(SITE, "companies", companySlug(excluded), "index.html");
    const html = await readFile(pagePath, "utf8");
    requireValue(markerCount(html, START) === 0, `${excluded}: excluded external intelligence leaked`);
  }

  const atlasHtml = await readFile(ATLAS_PATH, "utf8");
  requireValue(markerCount(atlasHtml, START) === 1 && markerCount(atlasHtml, END) === 1, "Atlas estate-intelligence summary is not exactly-once");
  requireValue(atlasHtml.includes("47 source-bound company pressure dossiers"), "Atlas external-intelligence count missing");
  requireValue(!EXECUTABLE_SCRIPT.test(atlasHtml), "Atlas estate projection introduced client script");
  requireValue(!/\sstyle\s*=\s*/i.test(atlasHtml), "Atlas estate projection introduced inline style");

  requireValue(!intelligenceText.includes('"visibility": "private"'), "private visibility leaked into public estate intelligence");
  requireValue(!intelligenceText.includes("PRIVATE_CANDIDATE"), "private candidate state leaked into public estate intelligence");
  requireValue(!intelligenceText.includes("PRIVATE_EXPERIMENT"), "private experiment state leaked into public estate intelligence");

  console.log(
    `Public estate intelligence PASS: ${intelligence.records.length} companies · Helix ${intelligence.source.authority_commit}`,
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack : error);
  process.exitCode = 1;
});

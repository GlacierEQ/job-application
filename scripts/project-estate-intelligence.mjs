#!/usr/bin/env node

import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SITE = path.join(ROOT, "site-v15");
const SNAPSHOT_PATH = path.join(SITE, "data", "helix-root.json");
const OUTPUT_PATH = path.join(SITE, "data", "estate-intelligence.json");
const ATLAS_PATH = path.join(SITE, "atlas", "index.html");
const HELIX_RAW = "https://raw.githubusercontent.com/GlacierEQ/job-app-helix";
const EXTERNAL_PATH =
  "manifests/application_intelligence/company_bottleneck_atlas.external.json";
const ESTATE_COMPILER_PATH = "manifests/estate_compiler.json";
const ESTATE_PROJECTION_PATH = "manifests/estate_projection_policy.json";
const EXTERNAL_SCHEMA = "glaciereq.external-company-bottleneck-atlas.v1";
const SHARD_SCHEMA = "glaciereq.job-app-helix.company-bottleneck-atlas-shard.v1";
const OUTPUT_SCHEMA = "glaciereq.public-estate-intelligence.v1";
const SHA40 = /^[a-f0-9]{40}$/;
const SHA64 = /^[a-f0-9]{64}$/;
const COMPANY_ID = /^[a-z0-9_]+$/;
const SHARD_PATH =
  /^manifests\/application_intelligence\/atlas_shards\/[a-z0-9_]+\.json$/;
const START = "<!-- ESTATE_INTELLIGENCE_START -->";
const END = "<!-- ESTATE_INTELLIGENCE_END -->";
const MAX_BYTES = 4 * 1024 * 1024;
const FETCH_TIMEOUT_MS = 12_000;

function requireValue(condition, message) {
  if (!condition) throw new Error(message);
}

function sha256(text) {
  return createHash("sha256").update(text).digest("hex");
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

function parseJson(text, label) {
  try {
    const value = JSON.parse(text);
    requireValue(value && typeof value === "object" && !Array.isArray(value), `${label} must be an object`);
    return value;
  } catch (error) {
    throw new Error(`${label}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

async function fetchText(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      redirect: "error",
      signal: controller.signal,
      headers: { "user-agent": "GlacierEQ-Estate-Public-Projector/1.0" },
    });
    requireValue(response.ok, `HTTP ${response.status} for ${url}`);
    const declared = Number(response.headers.get("content-length") || 0);
    requireValue(declared <= MAX_BYTES, `response too large for ${url}`);
    const text = await response.text();
    requireValue(Buffer.byteLength(text) <= MAX_BYTES, `response too large for ${url}`);
    return text;
  } finally {
    clearTimeout(timer);
  }
}

function rawUrl(commit, sourcePath) {
  requireValue(SHA40.test(commit), "Helix source commit is invalid");
  requireValue(!sourcePath.includes(".."), `source path escapes Helix root: ${sourcePath}`);
  return `${HELIX_RAW}/${commit}/${sourcePath}`;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function companySlug(companyId) {
  requireValue(COMPANY_ID.test(companyId), `invalid company id: ${companyId}`);
  return companyId.replaceAll("_", "-");
}

function replaceOrInsert(html, block) {
  const expression = new RegExp(`${START}[\\s\\S]*?${END}`, "m");
  if (expression.test(html)) return html.replace(expression, block);
  requireValue(html.includes("</main>"), "generated company page has no </main> boundary");
  return html.replace("</main>", `${block}\n</main>`);
}

function validateSource(source, companyId) {
  requireValue(source && typeof source === "object" && !Array.isArray(source), `${companyId}: invalid official source`);
  requireValue(typeof source.url === "string" && source.url.startsWith("https://"), `${companyId}: invalid official source URL`);
  requireValue(typeof source.source_sha256 === "string" && SHA64.test(source.source_sha256), `${companyId}: invalid official source hash`);
  requireValue(typeof source.title === "string" && source.title.length > 0, `${companyId}: missing official source title`);
  requireValue(typeof source.observed_signal === "string" && source.observed_signal.length > 0, `${companyId}: missing official observed signal`);
  return {
    observed_signal: source.observed_signal,
    publisher: typeof source.publisher === "string" ? source.publisher : "Official source",
    source_sha256: source.source_sha256,
    title: source.title,
    url: source.url,
  };
}

function normalizeRecord(raw, manifest, companyIds) {
  requireValue(raw && typeof raw === "object" && !Array.isArray(raw), "invalid company intelligence row");
  const companyId = raw.company_id;
  requireValue(typeof companyId === "string" && COMPANY_ID.test(companyId), "company intelligence row has invalid company_id");
  requireValue(companyIds.has(companyId), `${companyId}: external intelligence has no governed company track`);
  for (const field of [
    "display_name",
    "observed_current_pressure",
    "inferred_bottleneck",
    "inferred_brick_wall",
    "application_move",
    "next_deep_dive",
  ]) {
    requireValue(typeof raw[field] === "string" && raw[field].trim(), `${companyId}: missing ${field}`);
  }
  const leverage = raw.leverage;
  requireValue(leverage && typeof leverage === "object" && !Array.isArray(leverage), `${companyId}: missing leverage`);
  requireValue(typeof leverage.mechanism === "string" && leverage.mechanism.trim(), `${companyId}: missing leverage mechanism`);
  requireValue(typeof leverage.expected_impact === "string" && leverage.expected_impact.trim(), `${companyId}: missing expected impact`);
  requireValue(Array.isArray(raw.official_sources) && raw.official_sources.length > 0, `${companyId}: missing official sources`);
  requireValue(Array.isArray(raw.target_roles), `${companyId}: target_roles must be an array`);
  requireValue(raw.target_roles.every((role) => typeof role === "string" && role), `${companyId}: invalid target role`);
  return {
    application_move: raw.application_move,
    company_id: companyId,
    display_name: raw.display_name,
    expected_impact: leverage.expected_impact,
    freshness_state: manifest.freshness_state,
    inference_boundary: manifest.inference_boundary,
    inferred_bottleneck: raw.inferred_bottleneck,
    inferred_brick_wall: raw.inferred_brick_wall,
    leverage_mechanism: leverage.mechanism,
    next_deep_dive: raw.next_deep_dive,
    observed_current_pressure: raw.observed_current_pressure,
    official_sources: raw.official_sources.map((source) => validateSource(source, companyId)),
    research_as_of: manifest.research_as_of,
    target_roles: [...raw.target_roles],
  };
}

function sourceLinks(record) {
  return record.official_sources
    .map(
      (source) => `<li><a href="${escapeHtml(source.url)}" target="_blank" rel="noopener">${escapeHtml(source.title)}</a><br><small>${escapeHtml(source.publisher)} · observed signal: ${escapeHtml(source.observed_signal)}</small></li>`,
    )
    .join("");
}

function companyBlock(record) {
  return `${START}
<section class="section company-layer estate-intelligence" id="estate-intelligence">
  <div class="shell">
    <div class="layer-heading"><span>ESTATE INTELLIGENCE · SOURCE-BOUND</span><h2>Operating pressure → engineering intervention.</h2></div>
    <p class="muted"><strong>Research snapshot:</strong> ${escapeHtml(record.research_as_of)} · ${escapeHtml(record.freshness_state)}. Observed pressure is source-backed snapshot material; bottlenecks and interventions are GlacierEQ inference.</p>
    <div class="company-two-col">
      <article class="card"><h3>Observed current pressure</h3><p>${escapeHtml(record.observed_current_pressure)}</p><h3>Official signals</h3><ul class="evolution-list">${sourceLinks(record)}</ul></article>
      <article class="card"><h3>GlacierEQ bottleneck inference</h3><p>${escapeHtml(record.inferred_bottleneck)}</p><p><strong>Brick wall:</strong> ${escapeHtml(record.inferred_brick_wall)}</p><p><strong>Inference boundary:</strong> ${escapeHtml(record.inference_boundary)}</p></article>
    </div>
    <div class="company-two-col">
      <article class="card"><h3>Intervention mechanism</h3><p>${escapeHtml(record.leverage_mechanism)}</p><p><strong>Expected impact:</strong> ${escapeHtml(record.expected_impact)}</p></article>
      <article class="card"><h3>Application move</h3><p>${escapeHtml(record.application_move)}</p><p><strong>Next deep dive:</strong> ${escapeHtml(record.next_deep_dive)}</p></article>
    </div>
  </div>
</section>
${END}`;
}

function atlasBlock(publicRecordCount, manifest) {
  return `${START}
<section class="section company-layer estate-intelligence" id="operating-intelligence">
  <div class="shell">
    <div class="layer-heading"><span>OPERATING INTELLIGENCE</span><h2>${publicRecordCount} source-bound company pressure dossiers.</h2></div>
    <div class="company-two-col">
      <article class="card"><h3>Observed ≠ inferred</h3><p>Official-source observations remain distinct from GlacierEQ bottleneck, brick-wall, leverage, and intervention hypotheses. Every company page carries that boundary.</p></article>
      <article class="card"><h3>Freshness gate</h3><p>Research snapshot ${escapeHtml(manifest.research_as_of)} · ${escapeHtml(manifest.freshness_state)}. Refresh is required before a live application claims current hiring or operating conditions.</p></article>
    </div>
  </div>
</section>
${END}`;
}

async function loadBoundPolicy(commit, sourceHashes, sourcePath, expectedSchema) {
  const expectedHash = sourceHashes[sourcePath];
  requireValue(typeof expectedHash === "string" && SHA64.test(expectedHash), `public Helix digest does not bind ${sourcePath}`);
  const text = await fetchText(rawUrl(commit, sourcePath));
  requireValue(sha256(text) === expectedHash, `${sourcePath}: source hash differs from public Helix digest`);
  const value = parseJson(text, sourcePath);
  requireValue(value.schema === expectedSchema, `${sourcePath}: unexpected schema`);
  return value;
}

async function main() {
  const snapshotText = await readFile(SNAPSHOT_PATH, "utf8");
  const snapshot = parseJson(snapshotText, "Helix public projection");
  requireValue(snapshot.schema === "glaciereq.public-portfolio-projection.v1", "unexpected public projection schema");
  const commit = snapshot.source?.root_ref;
  requireValue(typeof commit === "string" && SHA40.test(commit), "public projection lacks immutable Helix root_ref");
  const sourceHashes = snapshot.source?.source_hashes;
  requireValue(sourceHashes && typeof sourceHashes === "object" && !Array.isArray(sourceHashes), "public projection lacks source hashes");

  const compilerPolicy = await loadBoundPolicy(
    commit,
    sourceHashes,
    ESTATE_COMPILER_PATH,
    "glaciereq.estate-compiler-policy.v1",
  );
  const projectionPolicy = await loadBoundPolicy(
    commit,
    sourceHashes,
    ESTATE_PROJECTION_PATH,
    "glaciereq.estate-intelligence-projection-policy.v1",
  );
  requireValue(compilerPolicy.privacy?.public_projection_excludes_private_repository_identities === true, "estate compiler no longer guarantees private identity exclusion");
  requireValue(compilerPolicy.privacy?.internal_receipts_remain_runner_local === true, "estate compiler internal receipt boundary drifted");
  requireValue(projectionPolicy.truth_boundary?.role_fit_is_capability_overlap_not_hiring_prediction === true, "role-fit truth boundary drifted");
  requireValue(projectionPolicy.support_policy?.counts_as_independent_accomplishment === false, "support ancestry is being counted as accomplishment");

  const expectedExternalHash = sourceHashes[EXTERNAL_PATH];
  requireValue(typeof expectedExternalHash === "string" && SHA64.test(expectedExternalHash), "public Helix digest does not bind external company intelligence");
  const externalText = await fetchText(rawUrl(commit, EXTERNAL_PATH));
  requireValue(sha256(externalText) === expectedExternalHash, "external company-intelligence manifest differs from public Helix digest");
  const manifest = parseJson(externalText, EXTERNAL_PATH);
  requireValue(manifest.schema === EXTERNAL_SCHEMA, "unexpected external company-intelligence schema");
  requireValue(Number.isInteger(manifest.record_count) && manifest.record_count > 0, "external company-intelligence record_count is invalid");
  requireValue(typeof manifest.research_as_of === "string" && manifest.research_as_of, "external company-intelligence research date missing");
  requireValue(typeof manifest.freshness_state === "string" && manifest.freshness_state.includes("REQUIRES_REFRESH"), "external company intelligence must remain freshness-gated");
  requireValue(typeof manifest.inference_boundary === "string" && manifest.inference_boundary, "external company intelligence lacks inference boundary");
  requireValue(manifest.truth_boundary?.official_source_observation_separate_from_glaciereq_inference === true, "external observation/inference boundary drifted");
  requireValue(manifest.truth_boundary?.source_snapshot_requires_refresh_for_live_application === true, "external freshness gate drifted");
  requireValue(Array.isArray(manifest.shards) && manifest.shards.length > 0, "external company-intelligence shards missing");
  requireValue(Array.isArray(manifest.excluded_company_ids), "excluded company list is invalid");

  const governedCompanies = new Set(
    (snapshot.companies ?? []).map((company) => company.company_id),
  );
  requireValue(governedCompanies.size === (snapshot.companies ?? []).length, "public projection has duplicate company tracks");
  const records = new Map();

  for (const shardRef of manifest.shards) {
    requireValue(shardRef && typeof shardRef === "object" && !Array.isArray(shardRef), "invalid external shard reference");
    requireValue(typeof shardRef.path === "string" && SHARD_PATH.test(shardRef.path), `invalid external shard path: ${String(shardRef.path)}`);
    requireValue(typeof shardRef.shard_sha256 === "string" && SHA64.test(shardRef.shard_sha256), `${shardRef.path}: invalid declared shard digest`);
    const shardText = await fetchText(rawUrl(commit, shardRef.path));
    const shard = parseJson(shardText, shardRef.path);
    requireValue(shard.schema === SHARD_SCHEMA, `${shardRef.path}: unexpected shard schema`);
    requireValue(shard.shard_sha256 === shardRef.shard_sha256, `${shardRef.path}: embedded shard digest mismatch`);
    requireValue(Array.isArray(shard.records), `${shardRef.path}: records missing`);
    requireValue(shard.records.length === shardRef.record_count, `${shardRef.path}: record count mismatch`);
    for (const raw of shard.records) {
      const record = normalizeRecord(raw, manifest, governedCompanies);
      requireValue(!records.has(record.company_id), `duplicate company intelligence: ${record.company_id}`);
      records.set(record.company_id, record);
    }
  }

  requireValue(records.size === manifest.record_count, `external company-intelligence count mismatch: ${records.size} != ${manifest.record_count}`);
  for (const excluded of manifest.excluded_company_ids) {
    requireValue(typeof excluded === "string" && COMPANY_ID.test(excluded), `invalid excluded company id: ${String(excluded)}`);
    requireValue(!records.has(excluded), `excluded company intelligence leaked: ${excluded}`);
  }

  const orderedRecords = [...records.values()].sort((a, b) =>
    a.company_id.localeCompare(b.company_id),
  );
  const output = {
    schema: OUTPUT_SCHEMA,
    source: {
      authority_commit: commit,
      external_manifest_path: EXTERNAL_PATH,
      external_manifest_sha256: expectedExternalHash,
      freshness_state: manifest.freshness_state,
      inference_boundary: manifest.inference_boundary,
      research_as_of: manifest.research_as_of,
      snapshot_origin_commit: manifest.source_commit,
    },
    policy: {
      audience_caps: projectionPolicy.audience_caps,
      role_fit_is_capability_overlap_not_hiring_prediction:
        projectionPolicy.truth_boundary.role_fit_is_capability_overlap_not_hiring_prediction,
      support_counts_as_independent_accomplishment:
        projectionPolicy.support_policy.counts_as_independent_accomplishment,
      private_repository_identities_excluded:
        compilerPolicy.privacy.public_projection_excludes_private_repository_identities,
      internal_receipts_runner_local: compilerPolicy.privacy.internal_receipts_remain_runner_local,
    },
    records: orderedRecords,
    truth_boundary: {
      authenticated_estate_cardinality_published: false,
      legal_private_material_published: false,
      private_repository_identities_published: false,
      source_snapshot_requires_refresh_for_live_application: true,
    },
  };

  await mkdir(path.dirname(OUTPUT_PATH), { recursive: true });
  await writeFile(OUTPUT_PATH, stableJson(output), "utf8");

  for (const record of orderedRecords) {
    const companyPath = path.join(
      SITE,
      "companies",
      companySlug(record.company_id),
      "index.html",
    );
    const html = await readFile(companyPath, "utf8");
    await writeFile(companyPath, replaceOrInsert(html, companyBlock(record)), "utf8");
  }

  const atlasHtml = await readFile(ATLAS_PATH, "utf8");
  await writeFile(
    ATLAS_PATH,
    replaceOrInsert(atlasHtml, atlasBlock(orderedRecords.length, manifest)),
    "utf8",
  );

  console.log(
    `Public estate intelligence projected: ${orderedRecords.length} companies · Helix ${commit}`,
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack : error);
  process.exitCode = 1;
});

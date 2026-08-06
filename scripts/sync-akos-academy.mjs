#!/usr/bin/env node

import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const POINTER = path.join(ROOT, "stone-source.json");
const SHA_PATTERN = /^[a-f0-9]{40}$/;

function fail(message) {
  throw new Error(`AKOS Academy sync failed: ${message}`);
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
    const parsed = JSON.parse(text);
    requireValue(parsed && typeof parsed === "object" && !Array.isArray(parsed), `${label} must contain an object`);
    return parsed;
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("AKOS Academy sync failed:")) throw error;
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
    if (error instanceof Error && error.message.startsWith("AKOS Academy sync failed:")) throw error;
    fail(`${url}: ${error instanceof Error ? error.message : String(error)}`);
  } finally {
    clearTimeout(timer);
  }
}

function resolveOutput(relative, label) {
  requireValue(typeof relative === "string" && relative.length > 0, `${label} is missing`);
  const output = path.resolve(ROOT, relative);
  requireValue(output.startsWith(`${ROOT}${path.sep}`), `${label} escapes repository root`);
  return output;
}

async function resolveSha(authority) {
  const supplied = process.env.AKOS_ROOT_SHA?.trim().toLowerCase();
  if (supplied) {
    requireValue(SHA_PATTERN.test(supplied), "AKOS_ROOT_SHA must be a full lowercase commit SHA");
    return supplied;
  }
  const response = parseJson(
    await fetchText(authority.commit_api_url, "application/vnd.github+json"),
    "AKOS commit response",
  );
  const sha = String(response.sha ?? "").toLowerCase();
  requireValue(SHA_PATTERN.test(sha), "AKOS commit API did not return a full commit SHA");
  return sha;
}

function projectionStatus(registry, stone) {
  const stoneStatus = String(stone.status ?? "UNKNOWN");
  const evidenceLevel = String(stone.verification?.evidence_level ?? registry.evidence_level ?? "UNKNOWN");
  return {
    registry_status: registry.status,
    stone_status: stoneStatus,
    evidence_level: evidenceLevel,
    public_label:
      stoneStatus.includes("CANDIDATE") || evidenceLevel === "CANDIDATE"
        ? "CANDIDATE — NOT PROMOTED"
        : `${evidenceLevel} — ${stoneStatus}`,
  };
}

function summarizeStone(registry, stone, sourcePath, sourceSha256) {
  const identity = stone.identity;
  requireValue(identity && typeof identity === "object", `${sourcePath}: identity is missing`);
  requireValue(typeof identity.id === "string" && identity.id.length > 0, `${sourcePath}: identity.id is missing`);
  requireValue(typeof identity.name === "string" && identity.name.length > 0, `${sourcePath}: identity.name is missing`);
  requireValue(typeof identity.version === "string" && identity.version.length > 0, `${sourcePath}: identity.version is missing`);

  const purpose = stone.purpose ?? {};
  const capabilities = stone.capabilities ?? {};
  const interfaces = stone.interfaces ?? {};
  const boundaries = stone.boundaries ?? {};
  const composition = stone.composition ?? {};
  const activation = stone.activation ?? {};

  return {
    id: identity.id,
    name: identity.name,
    version: identity.version,
    domain: identity.domain,
    status: projectionStatus(registry, stone),
    core_law: activation.core_law ?? null,
    aliases: Array.isArray(activation.aliases) ? activation.aliases : [],
    owns: Array.isArray(purpose.owns) ? purpose.owns : [],
    does_not_own: Array.isArray(purpose.does_not_own) ? purpose.does_not_own : [],
    skills: Array.isArray(capabilities.skills) ? capabilities.skills : [],
    protocols: Array.isArray(capabilities.protocols) ? capabilities.protocols : [],
    outputs: Array.isArray(interfaces.outputs) ? interfaces.outputs : [],
    forbidden: Array.isArray(boundaries.forbidden) ? boundaries.forbidden : [],
    compatible_stones: Array.isArray(composition.compatible_stones) ? composition.compatible_stones : [],
    compatible_upgrades: Array.isArray(composition.compatible_upgrades) ? composition.compatible_upgrades : [],
    source: {
      path: sourcePath,
      sha256: sourceSha256,
    },
  };
}

async function main() {
  const pointer = parseJson(await readFile(POINTER, "utf8"), "stone-source.json");
  requireValue(pointer.schema === "glaciereq.stone-consumer-pointer.v1", "unexpected pointer schema");
  requireValue(pointer.consumer === "GlacierEQ/job-application", "consumer identity mismatch");
  requireValue(pointer.sync?.fail_closed === true, "Academy sync must fail closed");
  requireValue(pointer.sync?.allow_stale_fallback === false, "Academy sync must not allow stale fallback");
  requireValue(Array.isArray(pointer.projection_layers) && pointer.projection_layers.join(",") === "recruiter,master,machine,mesh", "four-layer order is invalid");

  const authority = pointer.authority;
  requireValue(authority?.repository === "GlacierEQ/AKOS", "unexpected AKOS authority repository");
  requireValue(authority?.branch === "main", "Academy must consume canonical AKOS main");
  requireValue(typeof authority.registry_path === "string", "AKOS registry path is missing");

  const resolvedCommit = await resolveSha(authority);
  const rawBase = `${authority.raw_base_url}/${resolvedCommit}`;
  const registryText = await fetchText(`${rawBase}/${authority.registry_path}`);
  const registry = parseJson(registryText, authority.registry_path);
  requireValue(registry.schema === "glaciereq.infinity-stone-registry.v1", "unexpected AKOS registry schema");
  requireValue(Array.isArray(registry.stones) && registry.stones.length > 0, "AKOS registry has no Stones");

  const sourceHashes = { [authority.registry_path]: sha256(registryText) };
  const stones = [];
  const seenIds = new Set();
  for (const entry of registry.stones) {
    requireValue(entry && typeof entry === "object", "Stone registry entries must be objects");
    requireValue(typeof entry.id === "string" && entry.id.length > 0, "Stone registry entry id is missing");
    requireValue(!seenIds.has(entry.id), `duplicate Stone id ${entry.id}`);
    seenIds.add(entry.id);
    requireValue(typeof entry.path === "string" && /^stones\/[a-z0-9-]+\/stone\.json$/.test(entry.path), `${entry.id}: invalid Stone path`);
    const text = await fetchText(`${rawBase}/${entry.path}`);
    const stone = parseJson(text, entry.path);
    requireValue(stone.schema === "glaciereq.infinity-stone.v1", `${entry.id}: unexpected Stone schema`);
    requireValue(stone.identity?.id === entry.id, `${entry.id}: registry and manifest identity differ`);
    sourceHashes[entry.path] = sha256(text);
    stones.push(summarizeStone(registry, stone, entry.path, sourceHashes[entry.path]));
  }

  const academy = {
    schema: "glaciereq.infinity-stone-academy.v1",
    source: {
      repository: authority.repository,
      commit: resolvedCommit,
      registry_path: authority.registry_path,
      registry_version: registry.version,
      registry_status: registry.status,
      evidence_level: registry.evidence_level,
      source_hashes: sourceHashes,
      source_digest: sha256(stableJson(sourceHashes)),
    },
    four_layer_contract: {
      state: "SOURCE_ARCHITECTURE_CANDIDATE_UNTIL_AKOS_FORGE_PASSES",
      layers: [
        { id: "recruiter", purpose: "Fast role fit, outcomes, boundaries, and inspectable proof paths." },
        { id: "master", purpose: "Complete architecture, mechanisms, evidence state, limits, and next gates." },
        { id: "machine", purpose: "Deterministic schema-bound data and Protocol Buffers wire contracts." },
        { id: "mesh", purpose: "Typed relationships among Stones, upgrades, skills, outputs, repositories, and evidence." }
      ],
      promotion_rule: "Rendering a layer does not promote the Stone. AKOS registry and Forge receipts control status."
    },
    prior_verified_baseline: registry.prior_verified_baseline ?? null,
    candidate_extension: registry.candidate_extension ?? null,
    stones,
    upgrades: Array.isArray(registry.upgrades) ? registry.upgrades : [],
    gauntlets: Array.isArray(registry.gauntlets) ? registry.gauntlets : [],
    planned: Array.isArray(registry.planned) ? registry.planned : [],
    truth_boundary: pointer.truth_boundary,
  };

  const output = resolveOutput(pointer.sync.output, "Academy output");
  const outputText = stableJson(academy);
  await mkdir(path.dirname(output), { recursive: true });
  await writeFile(output, outputText, "utf8");

  const receiptOutput = resolveOutput(pointer.sync.receipt_output, "Academy receipt output");
  const receipt = {
    schema: "glaciereq.infinity-stone-academy-receipt.v1",
    source_commit: resolvedCommit,
    source_digest: academy.source.source_digest,
    registry_status: registry.status,
    stone_count: stones.length,
    output_path: path.relative(ROOT, output).replaceAll(path.sep, "/"),
    output_sha256: sha256(outputText),
    status: "PASS",
  };
  await mkdir(path.dirname(receiptOutput), { recursive: true });
  await writeFile(receiptOutput, stableJson(receipt), "utf8");

  console.log(`Infinity Stone Academy written: ${path.relative(ROOT, output)}`);
  console.log(`AKOS source_commit=${resolvedCommit} stones=${stones.length} registry_status=${registry.status}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack : error);
  process.exitCode = 1;
});

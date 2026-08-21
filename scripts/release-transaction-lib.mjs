import crypto from "node:crypto";
import { readFile, readdir, stat } from "node:fs/promises";
import path from "node:path";

export const SHA_RE = /^[a-f0-9]{40}$/;
export const RELEASE_SCHEMA = "glaciereq.canonical-release-transaction.v1";
export const LIVE_SCHEMA = "glaciereq.canonical-release-readback.v1";

const CRITICAL_PUBLIC_PATHS = [
  "index.html",
  "resume/index.html",
  "master/index.html",
  "mesh/index.html",
  "machine/index.html",
  "data/helix-root.json",
  "data/helix-root.receipt.json",
];

const READBACK_PATHS = ["/", "/resume/", "/master/", "/mesh/", "/machine/"];

export function assertSha(value, label) {
  if (typeof value !== "string" || !SHA_RE.test(value)) {
    throw new Error(`${label} must be a lowercase 40-character commit SHA`);
  }
  return value;
}

export function sha256(buffer) {
  return crypto.createHash("sha256").update(buffer).digest("hex");
}

export async function sha256File(filePath) {
  return sha256(await readFile(filePath));
}

function extractConstant(source, name) {
  const expression = new RegExp(`const\\s+${name}\\s*=\\s*['\"]([a-f0-9]{40})['\"]`);
  const match = source.match(expression);
  if (!match) throw new Error(`source bridge is missing ${name}`);
  return assertSha(match[1], name);
}

export function parseBridgePins(proxySource, designSource) {
  const proxyWeb = extractConstant(proxySource, "SOURCE_COMMIT");
  const proxyHelix = extractConstant(proxySource, "HELIX_COMMIT");
  const designWeb = extractConstant(designSource, "WEB_SOURCE_COMMIT");
  const designHelix = extractConstant(designSource, "HELIX_COMMIT");
  if (proxyWeb !== designWeb) {
    throw new Error(`source bridge web pin mismatch: proxy=${proxyWeb}, design=${designWeb}`);
  }
  if (proxyHelix !== designHelix) {
    throw new Error(`source bridge Helix pin mismatch: proxy=${proxyHelix}, design=${designHelix}`);
  }
  return { web_source_commit: proxyWeb, helix_commit: proxyHelix };
}

function safeRelative(value) {
  return (
    typeof value === "string" &&
    value.length > 0 &&
    !path.isAbsolute(value) &&
    !value.includes("\\") &&
    value.split("/").every((part) => part && part !== "." && part !== "..")
  );
}

async function hashDirectory(root, relative = "") {
  const directory = path.join(root, relative);
  const entries = await readdir(directory, { withFileTypes: true });
  const rows = [];
  for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
    const child = relative ? `${relative}/${entry.name}` : entry.name;
    if (entry.isDirectory()) {
      rows.push(...(await hashDirectory(root, child)));
    } else if (entry.isFile()) {
      rows.push({
        path: child,
        bytes: (await stat(path.join(root, child))).size,
        sha256: await sha256File(path.join(root, child)),
      });
    }
  }
  return rows;
}

export function contentHash(value) {
  const normalized = JSON.stringify(value, Object.keys(value).sort());
  return sha256(Buffer.from(normalized));
}

function stableObject(value) {
  if (Array.isArray(value)) return value.map(stableObject);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((key) => [key, stableObject(value[key])]),
    );
  }
  return value;
}

export function stableDigest(value) {
  return sha256(Buffer.from(JSON.stringify(stableObject(value))));
}

async function loadJson(filePath, label) {
  let parsed;
  try {
    parsed = JSON.parse(await readFile(filePath, "utf8"));
  } catch (error) {
    throw new Error(`${label} is not valid JSON: ${error instanceof Error ? error.message : String(error)}`);
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error(`${label} must contain a JSON object`);
  }
  return parsed;
}

export async function buildReleaseCandidate({
  root,
  releaseCodeCommit,
  canonicalWebHead = null,
  canonicalHelixHead = null,
}) {
  const release_code_commit = assertSha(releaseCodeCommit, "release code commit");
  const proxyPath = path.join(root, "deployment/vercel-source-bridge/api/proxy.js");
  const designPath = path.join(root, "deployment/vercel-source-bridge/api/design-proxy.js");
  const [proxySource, designSource] = await Promise.all([
    readFile(proxyPath, "utf8"),
    readFile(designPath, "utf8"),
  ]);
  const pins = parseBridgePins(proxySource, designSource);

  const projectionReceiptPath = path.join(root, "site-v15/data/helix-root.receipt.json");
  const projectionPath = path.join(root, "site-v15/data/helix-root.json");
  const projectionReceipt = await loadJson(projectionReceiptPath, "Helix projection receipt");
  if (projectionReceipt.status !== "PASS") {
    throw new Error(`Helix projection receipt is not PASS: ${String(projectionReceipt.status)}`);
  }
  if (projectionReceipt.source_commit !== pins.helix_commit) {
    throw new Error(
      `Helix projection/source-bridge mismatch: projection=${String(projectionReceipt.source_commit)}, bridge=${pins.helix_commit}`,
    );
  }
  const projectionSha = await sha256File(projectionPath);
  if (projectionReceipt.output_sha256 !== projectionSha) {
    throw new Error(
      `Helix projection digest mismatch: receipt=${String(projectionReceipt.output_sha256)}, actual=${projectionSha}`,
    );
  }

  const critical = [];
  for (const relative of CRITICAL_PUBLIC_PATHS) {
    if (!safeRelative(relative)) throw new Error(`unsafe critical path ${relative}`);
    const absolute = path.join(root, "site-v15", relative);
    critical.push({
      path: relative,
      bytes: (await stat(absolute)).size,
      sha256: await sha256File(absolute),
    });
  }

  const bridgeFiles = await hashDirectory(path.join(root, "deployment/vercel-source-bridge"));
  const fresh = {
    web_source_matches_canonical:
      canonicalWebHead === null
        ? null
        : pins.web_source_commit === assertSha(canonicalWebHead, "canonical web head"),
    helix_matches_canonical:
      canonicalHelixHead === null
        ? null
        : pins.helix_commit === assertSha(canonicalHelixHead, "canonical Helix head"),
  };
  const canonicalFresh = Object.values(fresh).every((value) => value !== false);

  const unsigned = {
    schema: RELEASE_SCHEMA,
    status: "INTEGRITY_READY",
    release_code_commit,
    web_source_commit: pins.web_source_commit,
    helix_commit: pins.helix_commit,
    projection: {
      source_commit: projectionReceipt.source_commit,
      output_sha256: projectionSha,
      company_tracks: projectionReceipt.company_tracks ?? null,
      consumed_source_digest: projectionReceipt.consumed_source_digest ?? null,
    },
    critical_public_files: critical,
    source_bridge_files: bridgeFiles,
    freshness: {
      ...fresh,
      canonical_fresh: canonicalFresh,
    },
    boundaries: {
      deployment_not_inferred: true,
      live_readback_required_for_completion: true,
      release_code_and_web_source_are_distinct_identities: true,
      exact_helix_projection_binding_required: true,
    },
  };

  return { ...unsigned, content_hash: stableDigest(unsigned) };
}

function normalizeOrigin(value) {
  const url = new URL(value);
  if (url.protocol !== "https:") throw new Error("production URL must use HTTPS");
  url.pathname = "/";
  url.search = "";
  url.hash = "";
  return url.href.replace(/\/$/, "");
}

function header(response, name) {
  const value = response.headers.get(name);
  return typeof value === "string" ? value.trim() : "";
}

export async function verifyLiveRelease(candidate, productionUrl, fetchImpl = fetch) {
  if (!candidate || candidate.schema !== RELEASE_SCHEMA) {
    throw new Error("unsupported release candidate schema");
  }
  const origin = normalizeOrigin(productionUrl);
  const observations = [];
  for (const route of READBACK_PATHS) {
    const response = await fetchImpl(`${origin}${route}`, {
      redirect: "error",
      headers: { "user-agent": "GlacierEQ-Canonical-Release-Readback/1.0" },
    });
    const web = header(response, "x-glaciereq-source-commit");
    const helix = header(response, "x-glaciereq-helix-commit");
    observations.push({
      route,
      status: response.status,
      web_source_commit: web,
      helix_commit: helix,
      release: header(response, "x-psysocx-release") || null,
    });
  }

  const failures = [];
  for (const row of observations) {
    if (row.status < 200 || row.status >= 300) {
      failures.push(`${row.route}: HTTP ${row.status}`);
    }
    if (row.web_source_commit !== candidate.web_source_commit) {
      failures.push(
        `${row.route}: web source ${row.web_source_commit || "missing"} != ${candidate.web_source_commit}`,
      );
    }
    if (row.helix_commit !== candidate.helix_commit) {
      failures.push(
        `${row.route}: Helix source ${row.helix_commit || "missing"} != ${candidate.helix_commit}`,
      );
    }
  }

  const unsigned = {
    schema: LIVE_SCHEMA,
    candidate_content_hash: candidate.content_hash,
    production_origin: origin,
    status: failures.length ? "FAIL" : "PASS",
    observations,
    failures,
    boundaries: {
      successful_build_is_not_live_readback: true,
      all_primary_surfaces_must_share_source_identity: true,
    },
  };
  return { ...unsigned, content_hash: stableDigest(unsigned) };
}

export function assertCanonicalFresh(candidate) {
  if (!candidate?.freshness?.canonical_fresh) {
    const failures = [];
    if (candidate?.freshness?.web_source_matches_canonical === false) {
      failures.push("web source is not canonical head");
    }
    if (candidate?.freshness?.helix_matches_canonical === false) {
      failures.push("Helix source is not canonical head");
    }
    throw new Error(`release is not canonical-fresh: ${failures.join("; ") || "freshness not established"}`);
  }
}

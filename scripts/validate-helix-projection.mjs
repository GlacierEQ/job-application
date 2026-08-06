#!/usr/bin/env node

import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const POINTER = path.join(ROOT, "portfolio-source.json");
const SNAPSHOT = path.join(ROOT, "site-v15", "data", "helix-root.json");
const REPOSITORY_PATTERN = /^GlacierEQ\/[A-Za-z0-9_.-]+$/;

function assert(condition, message) {
  if (!condition) throw new Error(message);
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

function hash(text) {
  return createHash("sha256").update(text).digest("hex");
}

async function load(file, label) {
  try {
    const text = await readFile(file, "utf8");
    const value = JSON.parse(text);
    assert(value && typeof value === "object" && !Array.isArray(value), `${label} must contain an object`);
    return { text, value };
  } catch (error) {
    throw new Error(`${label}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

async function main() {
  const pointer = (await load(POINTER, "portfolio-source.json")).value;
  const { text: snapshotText, value: snapshot } = await load(SNAPSHOT, "Helix public projection");
  const receiptPath = path.resolve(ROOT, pointer.sync?.receipt_output ?? "");
  assert(receiptPath.startsWith(`${ROOT}${path.sep}`), "projection receipt path escapes repository root");
  const { value: receipt } = await load(receiptPath, "Helix projection receipt");

  assert(pointer.schema === "glaciereq.portfolio-consumer-pointer.v1", "invalid consumer pointer schema");
  assert(pointer.consumer === "GlacierEQ/job-application", "consumer identity mismatch");
  assert(pointer.projection_id === "public_portal", "projection identity mismatch");
  assert(pointer.authority?.repository === "GlacierEQ/job-app-helix", "authority repository mismatch");
  assert(pointer.authority?.branch === "main", "portal must consume canonical Helix main");
  assert(pointer.public_boundary?.publish_private_records === false, "private publication must be disabled");
  assert(pointer.sync?.fail_closed === true && pointer.sync?.allow_stale_fallback === false, "projection must fail closed without stale fallback");

  assert(snapshot.schema === "glaciereq.public-portfolio-projection.v1", "invalid projection schema");
  assert(snapshot.source?.authority?.repository === "GlacierEQ/job-app-helix", "unexpected source authority");
  assert(snapshot.source?.root_ref === pointer.authority.branch, "snapshot root ref differs from consumer pointer");
  assert(snapshot.source?.source_hashes && typeof snapshot.source.source_hashes === "object" && !Array.isArray(snapshot.source.source_hashes), "source hashes are missing");
  assert(typeof snapshot.source?.source_digest === "string" && /^[a-f0-9]{64}$/.test(snapshot.source.source_digest), "missing source digest");
  assert(hash(stableJson(snapshot.source.source_hashes)) === snapshot.source.source_digest, "source digest does not match source hashes");

  assert(Number.isInteger(snapshot.inventory?.total_repositories) && snapshot.inventory.total_repositories > 0, "portfolio total is invalid");
  assert(Number.isInteger(snapshot.inventory?.workspace_repositories) && snapshot.inventory.workspace_repositories >= 0, "workspace total is invalid");
  assert(Number.isInteger(snapshot.inventory?.root_repositories) && snapshot.inventory.root_repositories === 1, "root repository count is invalid");
  assert(snapshot.inventory.total_repositories === snapshot.inventory.workspace_repositories + snapshot.inventory.root_repositories, "portfolio inventory relationship is inconsistent");
  assert(snapshot.inventory.identities_withheld_from_public_bundle === true, "raw inventory identities must be withheld");

  assert(Array.isArray(snapshot.flagships) && snapshot.flagships.length > 0, "public flagship projection is empty");
  const flagshipIds = snapshot.flagships.map((row) => row.system_id);
  assert(new Set(flagshipIds).size === flagshipIds.length, "duplicate flagship system IDs");
  for (const flagship of snapshot.flagships) {
    assert(typeof flagship.system_id === "string" && flagship.system_id.length > 0, "flagship system_id must be a nonempty string");
    assert(typeof flagship.repository === "string" && REPOSITORY_PATTERN.test(flagship.repository), `invalid flagship repository: ${flagship.system_id}`);
    assert(pointer.public_boundary.allowed_promotion_states.includes(flagship.state), `disallowed flagship state: ${flagship.system_id}`);
    assert(typeof flagship.role === "string" && flagship.role.length > 0, `missing flagship role: ${flagship.system_id}`);
    assert(typeof flagship.evidence === "string" && flagship.evidence.length > 0, `missing flagship evidence: ${flagship.system_id}`);
    assert(typeof flagship.next_gate === "string" && flagship.next_gate.length > 0, `missing flagship next gate: ${flagship.system_id}`);
    const surface = String(flagship.public_surface ?? "");
    assert(!pointer.public_boundary.excluded_surface_markers.some((marker) => surface.includes(marker)), `excluded flagship surface leaked: ${flagship.system_id}`);
  }

  assert(Array.isArray(snapshot.companies) && snapshot.companies.length > 0, "company projection is empty");
  const companyIds = snapshot.companies.map((row) => row.company_id);
  assert(new Set(companyIds).size === companyIds.length, "duplicate company IDs");
  for (const company of snapshot.companies) {
    assert(typeof company.company_id === "string" && company.company_id.length > 0, "company_id must be a nonempty string");
    assert(typeof company.display_name === "string" && company.display_name.length > 0, `missing company display name: ${company.company_id}`);
    assert(typeof company.non_affiliation === "string" && company.non_affiliation.length > 0, `missing non-affiliation boundary: ${company.company_id}`);
    assert(Array.isArray(company.repositories), `repositories must be an array: ${company.company_id}`);
    for (const repository of company.repositories) {
      assert(repository.visibility === "public", `private repository leaked: ${repository.repository}`);
      assert(pointer.public_boundary.allowed_promotion_states.includes(repository.promotion_state), `disallowed promotion state leaked: ${repository.repository}`);
      assert(typeof repository.repository === "string" && REPOSITORY_PATTERN.test(repository.repository), `invalid repository identity: ${repository.repository}`);
      assert(repository.level !== "L0", `L0 repository leaked into recruiter projection: ${repository.repository}`);
    }
  }

  assert(snapshot.evidence?.boundary?.includes("Repository-native receipts remain authoritative"), "missing repository-native evidence boundary");
  assert(Array.isArray(snapshot.invariants) && snapshot.invariants.length >= 5, "projection invariants are incomplete");
  assert(!snapshotText.includes('"visibility": "private"'), "serialized private visibility leaked");
  assert(!snapshotText.includes("PRIVATE_CANDIDATE"), "private candidate state leaked");
  assert(!snapshotText.includes("PRIVATE_EXPERIMENT"), "private experiment state leaked");

  assert(receipt.schema === "glaciereq.portfolio-projection-receipt.v1", "invalid projection receipt schema");
  assert(receipt.status === "PASS", "projection receipt is not PASS");
  assert(receipt.projection_id === pointer.projection_id, "projection receipt identity mismatch");
  assert(receipt.consumer_repository === pointer.consumer, "projection receipt consumer mismatch");
  assert(receipt.consumed_source_digest === snapshot.source.source_digest, "projection receipt source digest mismatch");
  assert(receipt.output_sha256 === hash(snapshotText), "projection receipt output hash mismatch");
  assert(receipt.root_ref === pointer.authority.branch, "projection receipt root ref mismatch");

  console.log(JSON.stringify({
    schema: "glaciereq.public-portfolio-projection-validation.v1",
    status: "PASS",
    snapshot_sha256: hash(snapshotText),
    source_digest: snapshot.source.source_digest,
    flagships: snapshot.flagships.length,
    companies: snapshot.companies.length,
    public_repository_memberships: snapshot.companies.reduce((count, company) => count + company.repositories.length, 0),
    inventory: snapshot.inventory,
  }, null, 2));
}

main().catch((error) => {
  console.error(`Helix projection validation: FAIL: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
});

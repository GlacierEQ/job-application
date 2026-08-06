#!/usr/bin/env node

import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const POINTER = path.join(ROOT, "portfolio-source.json");
const SNAPSHOT = path.join(ROOT, "site-v15", "data", "helix-root.json");

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function hash(text) {
  return createHash("sha256").update(text).digest("hex");
}

async function load(file) {
  const text = await readFile(file, "utf8");
  return { text, value: JSON.parse(text) };
}

async function main() {
  const pointer = (await load(POINTER)).value;
  const { text: snapshotText, value: snapshot } = await load(SNAPSHOT);

  assert(pointer.schema === "glaciereq.portfolio-consumer-pointer.v1", "invalid consumer pointer schema");
  assert(pointer.consumer === "GlacierEQ/job-application", "consumer identity mismatch");
  assert(pointer.projection_id === "public_portal", "projection identity mismatch");
  assert(pointer.public_boundary.publish_private_records === false, "private publication must be disabled");

  assert(snapshot.schema === "glaciereq.public-portfolio-projection.v1", "invalid projection schema");
  assert(snapshot.source?.authority?.repository === "GlacierEQ/job-app-helix", "unexpected source authority");
  assert(typeof snapshot.source?.source_digest === "string" && snapshot.source.source_digest.length === 64, "missing source digest");
  assert(snapshot.inventory?.total_repositories === 67, "portfolio total must be 67");
  assert(snapshot.inventory?.workspace_repositories === 66, "workspace total must be 66");
  assert(snapshot.inventory?.identities_withheld_from_public_bundle === true, "raw inventory identities must be withheld");

  assert(Array.isArray(snapshot.flagships) && snapshot.flagships.length > 0, "public flagship projection is empty");
  const flagshipIds = snapshot.flagships.map((row) => row.system_id);
  assert(new Set(flagshipIds).size === flagshipIds.length, "duplicate flagship system IDs");
  for (const flagship of snapshot.flagships) {
    assert(typeof flagship.repository === "string" && flagship.repository.startsWith("GlacierEQ/"), `invalid flagship repository: ${flagship.system_id}`);
    const surface = String(flagship.public_surface ?? "");
    assert(!pointer.public_boundary.excluded_surface_markers.some((marker) => surface.includes(marker)), `excluded flagship surface leaked: ${flagship.system_id}`);
  }

  assert(Array.isArray(snapshot.companies) && snapshot.companies.length >= 49, "company projection is incomplete");
  const companyIds = snapshot.companies.map((row) => row.company_id);
  assert(new Set(companyIds).size === companyIds.length, "duplicate company IDs");
  for (const company of snapshot.companies) {
    assert(typeof company.non_affiliation === "string" && company.non_affiliation.length > 0, `missing non-affiliation boundary: ${company.company_id}`);
    assert(Array.isArray(company.repositories), `repositories must be an array: ${company.company_id}`);
    for (const repository of company.repositories) {
      assert(repository.visibility === "public", `private repository leaked: ${repository.repository}`);
      assert(pointer.public_boundary.allowed_promotion_states.includes(repository.promotion_state), `disallowed promotion state leaked: ${repository.repository}`);
      assert(typeof repository.repository === "string" && repository.repository.startsWith("GlacierEQ/"), "invalid repository identity");
    }
  }

  assert(snapshot.evidence?.boundary?.includes("Repository-native receipts remain authoritative"), "missing repository-native evidence boundary");
  assert(Array.isArray(snapshot.invariants) && snapshot.invariants.length >= 5, "projection invariants are incomplete");
  assert(!snapshotText.includes('"visibility": "private"'), "serialized private visibility leaked");
  assert(!snapshotText.includes("PRIVATE_CANDIDATE"), "private candidate state leaked");
  assert(!snapshotText.includes("PRIVATE_EXPERIMENT"), "private experiment state leaked");

  console.log(JSON.stringify({
    schema: "glaciereq.public-portfolio-projection-validation.v1",
    status: "PASS",
    snapshot_sha256: hash(snapshotText),
    source_digest: snapshot.source.source_digest,
    flagships: snapshot.flagships.length,
    companies: snapshot.companies.length,
    public_repository_memberships: snapshot.companies.reduce((count, company) => count + company.repositories.length, 0),
  }, null, 2));
}

main().catch((error) => {
  console.error(`Helix projection validation: FAIL: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
});

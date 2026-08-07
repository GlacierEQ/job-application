#!/usr/bin/env node

import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const POINTER = path.join(ROOT, "portfolio-source.json");
const SNAPSHOT = path.join(ROOT, "site-v15", "data", "helix-root.json");
const SHA40 = /^[a-f0-9]{40}$/;
const SHA64 = /^[a-f0-9]{64}$/;
const REPOSITORY_PATTERN = /^GlacierEQ\/[A-Za-z0-9_.-]+$/;
const SOURCE_REF_PATTERN = /^(?:commit:[a-f0-9]{40}|sha256:[a-f0-9]{64})$/;
const SECOND_DEPTH_STAGES = [
  "MAPPED_ONLY",
  "ROLE_VERIFIED",
  "PROBLEM_BOUNDED",
  "CODE_INSPECTED",
  "REMEDY_BOUNDED",
  "IMPLEMENTED",
  "PROOF_REPRODUCED",
  "CLAIM_PROMOTED",
];
const CLAIM_CEILINGS = [
  "company_alignment_only",
  "verified_role_alignment",
  "externally_bounded_problem_alignment",
  "inspected_implementation_alignment",
  "bounded_remedy_design",
  "implemented_candidate_capability",
  "reproducible_company_specific_proof",
  "proof_bound_company_specific",
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
const EVIDENCE_KEYS = [
  "id",
  "kind",
  "source_identity",
  "source_ref",
  "verification_state",
  "visibility",
].sort();

function assert(condition, message) {
  if (!condition) throw new Error(message);
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

function validateEvidenceReference(companyId, field, item) {
  assert(item && typeof item === "object" && !Array.isArray(item), `${companyId}.${field}: evidence must be an object`);
  assert(
    JSON.stringify(Object.keys(item).sort()) === JSON.stringify(EVIDENCE_KEYS),
    `${companyId}.${field}: evidence keys drift`,
  );
  assert(item.kind === EVIDENCE_KIND_BY_FIELD[field], `${companyId}.${field}: evidence kind mismatch`);
  assert(item.visibility === "public", `${companyId}.${field}: non-public evidence leaked`);
  assert(
    typeof item.source_identity === "string" &&
      (item.source_identity.startsWith("https://") || item.source_identity.startsWith("GlacierEQ/")),
    `${companyId}.${field}: evidence source is not public-addressable`,
  );
  assert(
    typeof item.source_ref === "string" && SOURCE_REF_PATTERN.test(item.source_ref),
    `${companyId}.${field}: evidence source is not immutable`,
  );
  assert(
    item.verification_state === "VERIFIED" || item.verification_state === "REPRODUCED",
    `${companyId}.${field}: evidence verification state is invalid`,
  );
  if (field === "proof_artifacts") {
    assert(item.verification_state === "REPRODUCED", `${companyId}: proof artifact is not reproduced`);
  }
}

function validateSecondDepth(company) {
  const secondDepth = company.second_depth;
  assert(
    secondDepth && typeof secondDepth === "object" && !Array.isArray(secondDepth),
    `${company.company_id}: second-depth state missing`,
  );
  const ordinal = SECOND_DEPTH_STAGES.indexOf(secondDepth.stage);
  assert(ordinal >= 0, `${company.company_id}: invalid second-depth stage`);
  assert(secondDepth.ordinal === ordinal, `${company.company_id}: second-depth ordinal mismatch`);
  assert(
    secondDepth.claim_ceiling === CLAIM_CEILINGS[ordinal],
    `${company.company_id}: second-depth claim ceiling mismatch`,
  );
  assert(
    Array.isArray(secondDepth.blockers) &&
      secondDepth.blockers.every((blocker) => typeof blocker === "string" && blocker),
    `${company.company_id}: second-depth blockers invalid`,
  );
  assert(
    typeof secondDepth.next_gate === "string" && secondDepth.next_gate.length > 0,
    `${company.company_id}: second-depth next gate missing`,
  );
  assert(
    secondDepth.evidence &&
      typeof secondDepth.evidence === "object" &&
      !Array.isArray(secondDepth.evidence),
    `${company.company_id}: second-depth evidence object missing`,
  );
  for (const field of Object.keys(EVIDENCE_KIND_BY_FIELD)) {
    const values = secondDepth.evidence[field];
    assert(Array.isArray(values), `${company.company_id}.${field}: evidence array missing`);
    for (const item of values) validateEvidenceReference(company.company_id, field, item);
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
  assert(
    pointer.authority?.commit_api_url === "https://api.github.com/repos/GlacierEQ/job-app-helix/commits/main",
    "commit API URL mismatch",
  );
  assert(pointer.public_boundary?.publish_private_records === false, "private publication must be disabled");
  assert(
    pointer.sync?.fail_closed === true && pointer.sync?.allow_stale_fallback === false,
    "projection must fail closed without stale fallback",
  );

  assert(snapshot.schema === "glaciereq.public-portfolio-projection.v1", "invalid projection schema");
  assert(snapshot.source?.authority?.repository === "GlacierEQ/job-app-helix", "unexpected source authority");
  assert(
    typeof snapshot.source?.root_ref === "string" && SHA40.test(snapshot.source.root_ref),
    "snapshot must be bound to an immutable Helix commit",
  );
  assert(
    snapshot.source?.source_hashes &&
      typeof snapshot.source.source_hashes === "object" &&
      !Array.isArray(snapshot.source.source_hashes),
    "source hashes are missing",
  );
  assert(
    typeof snapshot.source?.source_digest === "string" && SHA64.test(snapshot.source.source_digest),
    "missing source digest",
  );
  assert(
    hash(stableJson(snapshot.source.source_hashes)) === snapshot.source.source_digest,
    "source digest does not match source hashes",
  );

  const secondDepth = snapshot.company_second_depth;
  assert(secondDepth?.schema === "glaciereq.company-second-depth.v1", "second-depth projection schema missing");
  assert(secondDepth.source_path === "manifests/company_second_depth.json", "second-depth source path drift");
  assert(SHA64.test(secondDepth.content_sha256 ?? ""), "second-depth source hash missing");
  assert(
    snapshot.source.source_hashes[secondDepth.source_path] === secondDepth.content_sha256,
    "second-depth source hash is not bound into root digest",
  );
  assert(
    Array.isArray(secondDepth.stage_order) && secondDepth.stage_order.length === SECOND_DEPTH_STAGES.length,
    "second-depth stage projection incomplete",
  );
  secondDepth.stage_order.forEach((row, ordinal) => {
    assert(row.id === SECOND_DEPTH_STAGES[ordinal], `second-depth stage ${ordinal} identity drift`);
    assert(row.ordinal === ordinal, `${row.id}: second-depth ordinal drift`);
    assert(row.public_claim_ceiling === CLAIM_CEILINGS[ordinal], `${row.id}: second-depth ceiling drift`);
  });

  assert(
    Number.isInteger(snapshot.inventory?.total_repositories) && snapshot.inventory.total_repositories > 0,
    "portfolio total is invalid",
  );
  assert(
    Number.isInteger(snapshot.inventory?.workspace_repositories) && snapshot.inventory.workspace_repositories >= 0,
    "workspace total is invalid",
  );
  assert(
    Number.isInteger(snapshot.inventory?.root_repositories) && snapshot.inventory.root_repositories === 1,
    "root repository count is invalid",
  );
  assert(
    snapshot.inventory.total_repositories ===
      snapshot.inventory.workspace_repositories + snapshot.inventory.root_repositories,
    "portfolio inventory relationship is inconsistent",
  );
  assert(snapshot.inventory.identities_withheld_from_public_bundle === true, "raw inventory identities must be withheld");

  assert(Array.isArray(snapshot.flagships) && snapshot.flagships.length > 0, "public flagship projection is empty");
  const flagshipIds = snapshot.flagships.map((row) => row.system_id);
  assert(new Set(flagshipIds).size === flagshipIds.length, "duplicate flagship system IDs");
  for (const flagship of snapshot.flagships) {
    assert(typeof flagship.system_id === "string" && flagship.system_id.length > 0, "flagship system_id must be a nonempty string");
    assert(
      typeof flagship.repository === "string" && REPOSITORY_PATTERN.test(flagship.repository),
      `invalid flagship repository: ${flagship.system_id}`,
    );
    assert(
      pointer.public_boundary.allowed_promotion_states.includes(flagship.state),
      `disallowed flagship state: ${flagship.system_id}`,
    );
    assert(typeof flagship.role === "string" && flagship.role.length > 0, `missing flagship role: ${flagship.system_id}`);
    assert(typeof flagship.evidence === "string" && flagship.evidence.length > 0, `missing flagship evidence: ${flagship.system_id}`);
    assert(typeof flagship.next_gate === "string" && flagship.next_gate.length > 0, `missing flagship next gate: ${flagship.system_id}`);
    const surface = String(flagship.public_surface ?? "");
    assert(
      !pointer.public_boundary.excluded_surface_markers.some((marker) => surface.includes(marker)),
      `excluded flagship surface leaked: ${flagship.system_id}`,
    );
  }

  assert(Array.isArray(snapshot.companies) && snapshot.companies.length === 49, "company projection must contain 49 governed tracks");
  const companyIds = snapshot.companies.map((row) => row.company_id);
  assert(new Set(companyIds).size === companyIds.length, "duplicate company IDs");
  for (const company of snapshot.companies) {
    assert(typeof company.company_id === "string" && company.company_id.length > 0, "company_id must be a nonempty string");
    assert(typeof company.display_name === "string" && company.display_name.length > 0, `missing company display name: ${company.company_id}`);
    assert(typeof company.non_affiliation === "string" && company.non_affiliation.length > 0, `missing non-affiliation boundary: ${company.company_id}`);
    assert(Array.isArray(company.repositories), `repositories must be an array: ${company.company_id}`);
    validateSecondDepth(company);
    for (const repository of company.repositories) {
      assert(repository.visibility === "public", `private repository leaked: ${repository.repository}`);
      assert(
        pointer.public_boundary.allowed_promotion_states.includes(repository.promotion_state),
        `disallowed promotion state leaked: ${repository.repository}`,
      );
      assert(
        typeof repository.repository === "string" && REPOSITORY_PATTERN.test(repository.repository),
        `invalid repository identity: ${repository.repository}`,
      );
      assert(repository.level !== "L0", `L0 repository leaked into recruiter projection: ${repository.repository}`);
    }
  }

  const lockheed = snapshot.companies.find((company) => company.company_id === "lockheed_martin");
  assert(lockheed, "Lockheed Martin track missing from public projection");
  assert(lockheed.display_name === "Lockheed Martin", "Lockheed Martin display identity drift");
  assert(lockheed.repositories.length === 0, "Lockheed Martin cannot gain repository proof implicitly");
  assert(lockheed.second_depth.stage === "MAPPED_ONLY", "Lockheed Martin advanced without second-depth evidence");
  assert(
    lockheed.second_depth.claim_ceiling === "company_alignment_only",
    "Lockheed Martin claim ceiling exceeds mapped-only state",
  );
  assert(
    lockheed.non_affiliation.includes("no Lockheed Martin affiliation"),
    "Lockheed Martin non-affiliation boundary missing",
  );

  assert(
    snapshot.evidence?.boundary?.includes("Repository-native receipts remain authoritative"),
    "missing repository-native evidence boundary",
  );
  assert(Array.isArray(snapshot.invariants) && snapshot.invariants.length >= 6, "projection invariants are incomplete");
  assert(!snapshotText.includes('"visibility": "private"'), "serialized private visibility leaked");
  assert(!snapshotText.includes("PRIVATE_CANDIDATE"), "private candidate state leaked");
  assert(!snapshotText.includes("PRIVATE_EXPERIMENT"), "private experiment state leaked");

  assert(receipt.schema === "glaciereq.portfolio-projection-receipt.v1", "invalid projection receipt schema");
  assert(receipt.status === "PASS", "projection receipt is not PASS");
  assert(receipt.projection_id === pointer.projection_id, "projection receipt identity mismatch");
  assert(receipt.consumer_repository === pointer.consumer, "projection receipt consumer mismatch");
  assert(receipt.consumed_source_digest === snapshot.source.source_digest, "projection receipt source digest mismatch");
  assert(receipt.source_commit === snapshot.source.root_ref, "projection receipt source commit mismatch");
  assert(receipt.output_sha256 === hash(snapshotText), "projection receipt output hash mismatch");
  assert(receipt.company_tracks === 49, "projection receipt company count mismatch");
  assert(
    receipt.company_second_depth_source === "manifests/company_second_depth.json",
    "projection receipt second-depth source mismatch",
  );

  const stageCounts = Object.fromEntries(SECOND_DEPTH_STAGES.map((stage) => [stage, 0]));
  for (const company of snapshot.companies) stageCounts[company.second_depth.stage] += 1;

  console.log(
    JSON.stringify(
      {
        schema: "glaciereq.public-portfolio-projection-validation.v2",
        status: "PASS",
        snapshot_sha256: hash(snapshotText),
        source_commit: snapshot.source.root_ref,
        source_digest: snapshot.source.source_digest,
        flagships: snapshot.flagships.length,
        companies: snapshot.companies.length,
        second_depth: stageCounts,
        public_repository_memberships: snapshot.companies.reduce(
          (count, company) => count + company.repositories.length,
          0,
        ),
        inventory: snapshot.inventory,
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(`Helix projection validation: FAIL: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
});

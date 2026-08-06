#!/usr/bin/env node

import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SITE = path.join(ROOT, "site-v15");
const DATA = path.join(SITE, "data");
const ROUTES = ["companies", "constellation", "proof", "timeline", "academy"];

function fail(message) {
  throw new Error(`Website Masterclass validation failed: ${message}`);
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

async function readJson(name) {
  const text = await readFile(path.join(DATA, name), "utf8");
  const value = JSON.parse(text);
  requireValue(value && typeof value === "object" && !Array.isArray(value), `${name} must contain an object`);
  return { value, text };
}

function unique(values, label) {
  requireValue(new Set(values).size === values.length, `${label} contains duplicate identities`);
}

function sameIdentities(left, right, label) {
  const a = [...left].sort();
  const b = [...right].sort();
  unique(a, `${label} source`);
  unique(b, `${label} projection`);
  requireValue(JSON.stringify(a) === JSON.stringify(b), `${label} differs from source`);
}

async function validateRoute(route, projection) {
  const html = await readFile(path.join(SITE, route, "index.html"), "utf8");
  requireValue(html.startsWith("<!doctype html>"), `${route}: missing doctype`);
  requireValue(html.includes('/assets/masterclass.css'), `${route}: Masterclass stylesheet is missing`);
  requireValue(html.includes(`snapshot ${projection.snapshot_id.slice(0, 12)}`), `${route}: snapshot is missing`);
  requireValue(!/<script(?:\s|>)/i.test(html), `${route}: script-free baseline violated`);
  requireValue(html.includes("Company alignment does not imply affiliation"), `${route}: non-affiliation boundary is missing`);
  return html;
}

async function main() {
  const [projectionRecord, graphRecord, helixRecord, academyRecord, receiptRecord] = await Promise.all([
    readJson("website-masterclass.json"),
    readJson("experience-graph.json"),
    readJson("helix-root.json"),
    readJson("infinity-stone-academy.json"),
    readJson("website-masterclass.receipt.json"),
  ]);
  const projection = projectionRecord.value;
  const graph = graphRecord.value;
  const helix = helixRecord.value;
  const academy = academyRecord.value;
  const receipt = receiptRecord.value;

  requireValue(projection.schema === "glaciereq.website-masterclass.v1", "unexpected projection schema");
  requireValue(graph.schema === "glaciereq.website-masterclass-experience-graph.v1", "unexpected graph schema");
  requireValue(receipt.schema === "glaciereq.website-masterclass-projection-receipt.v1", "unexpected receipt schema");
  requireValue(/^[a-f0-9]{64}$/.test(graph.snapshot_id), "graph snapshot ID is malformed");
  requireValue(projection.snapshot_id === graph.snapshot_id, "projection and graph snapshots differ");
  requireValue(receipt.snapshot_id === graph.snapshot_id, "receipt and graph snapshots differ");
  const { snapshot_id: recordedSnapshot, ...graphWithoutSnapshot } = graph;
  requireValue(recordedSnapshot === sha256(stableJson(graphWithoutSnapshot)), "graph snapshot digest does not reproduce");

  sameIdentities(
    helix.companies.map((row) => row.company_id),
    projection.companies.map((row) => row.company_id),
    "company identities",
  );
  sameIdentities(
    helix.flagships.map((row) => row.system_id),
    projection.flagships.map((row) => row.system_id),
    "flagship identities",
  );
  sameIdentities(
    academy.stones.map((row) => row.id),
    projection.academy.stones.map((row) => row.id),
    "Stone identities",
  );

  requireValue(projection.counts.company_tracks === projection.companies.length, "company count is stale");
  requireValue(projection.counts.public_flagships === projection.flagships.length, "flagship count is stale");
  requireValue(projection.counts.infinity_stones === projection.academy.stones.length, "Stone count is stale");
  requireValue(projection.academy.four_layer_contract.layers.map((row) => row.id).join(",") === "recruiter,master,machine,mesh", "four-layer contract changed");
  requireValue(projection.academy.four_layer_contract.state.includes("CANDIDATE"), "four-layer candidate status was promoted by presentation");

  for (const key of [
    "presentation_is_not_evidence",
    "company_alignment_is_not_affiliation",
    "repository_presence_is_not_runtime_proof",
    "candidate_stones_remain_candidate",
    "owning_repositories_retain_evidence_authority",
  ]) requireValue(graph.truth_boundary[key] === true, `truth boundary missing: ${key}`);

  unique(graph.nodes.map((node) => node.id), "graph nodes");
  unique(graph.edges.map((edge) => `${edge.source}\u0000${edge.relationship}\u0000${edge.target}`), "graph edges");
  const nodeIds = new Set(graph.nodes.map((node) => node.id));
  for (const edge of graph.edges) {
    requireValue(nodeIds.has(edge.source), `edge source missing: ${edge.source}`);
    requireValue(nodeIds.has(edge.target), `edge target missing: ${edge.target}`);
  }
  requireValue(projection.counts.graph_nodes === graph.nodes.length, "graph node count is stale");
  requireValue(projection.counts.graph_edges === graph.edges.length, "graph edge count is stale");

  const repositoryNodes = graph.nodes.filter((node) => node.kind === "repository");
  for (const node of repositoryNodes) {
    requireValue(Array.isArray(node.evidence_roles) && node.evidence_roles.length > 0, `${node.id}: evidence roles are missing`);
    unique(node.evidence_roles, `${node.id} evidence roles`);
    unique(node.levels, `${node.id} levels`);
    unique(node.states, `${node.id} states`);
    unique(node.provenance_states, `${node.id} provenance states`);
  }

  const companyHtml = await validateRoute("companies", projection);
  for (const company of projection.companies) requireValue(companyHtml.includes(company.display_name.replaceAll("&", "&amp;")), `company route omits ${company.company_id}`);
  const proofHtml = await validateRoute("proof", projection);
  for (const flagship of projection.flagships) requireValue(proofHtml.includes(flagship.repository), `proof route omits ${flagship.system_id}`);
  const academyHtml = await validateRoute("academy", projection);
  for (const stone of projection.academy.stones) requireValue(academyHtml.includes(stone.name), `Academy omits ${stone.id}`);
  await Promise.all(ROUTES.filter((route) => !["companies", "proof", "academy"].includes(route)).map((route) => validateRoute(route, projection)));

  requireValue(receipt.outputs && typeof receipt.outputs === "object", "receipt output hashes are missing");
  for (const [relative, expectedHash] of Object.entries(receipt.outputs)) {
    const text = await readFile(path.join(ROOT, relative), "utf8");
    requireValue(sha256(text) === expectedHash, `output hash mismatch: ${relative}`);
  }

  const sitemap = await readFile(path.join(SITE, "sitemap.xml"), "utf8");
  const llms = await readFile(path.join(SITE, "llms.txt"), "utf8");
  for (const route of ROUTES) {
    const url = `https://casey-barton-glaciereq.vercel.app/${route}/`;
    requireValue(sitemap.includes(`<loc>${url}</loc>`), `sitemap omits ${route}`);
    requireValue(llms.includes(url), `llms.txt omits ${route}`);
  }

  console.log(`Website Masterclass validation PASS: snapshot=${projection.snapshot_id}`);
  console.log(`companies=${projection.companies.length} flagships=${projection.flagships.length} stones=${projection.academy.stones.length}`);
  console.log(`nodes=${graph.nodes.length} edges=${graph.edges.length} routes=${ROUTES.length}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack : error);
  process.exitCode = 1;
});

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

async function readJson(name) {
  const file = path.join(DATA, name);
  const text = await readFile(file, "utf8");
  const value = JSON.parse(text);
  requireValue(value && typeof value === "object" && !Array.isArray(value), `${name} must contain an object`);
  return { value, text };
}

function unique(values, label) {
  requireValue(new Set(values).size === values.length, `${label} contains duplicate identities`);
}

async function validateHtml(route, projection) {
  const file = path.join(SITE, route, "index.html");
  const html = await readFile(file, "utf8");
  requireValue(html.startsWith("<!doctype html>"), `${route}: missing HTML doctype`);
  requireValue(html.includes(`<link rel="stylesheet" href="/assets/masterclass.css">`), `${route}: Masterclass stylesheet is missing`);
  requireValue(html.includes(`snapshot ${projection.snapshot_id.slice(0, 12)}`), `${route}: source snapshot is missing`);
  requireValue(!/<script(?:\s|>)/i.test(html), `${route}: client script violates script-free baseline`);
  requireValue(!/GlacierEQ\/[A-Za-z0-9_.-]*(secret|private|legal)/i.test(html), `${route}: suspicious private repository identity is present`);
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
  requireValue(projection.snapshot_id === graph.snapshot_id, "projection and graph snapshot IDs differ");
  requireValue(receipt.snapshot_id === graph.snapshot_id, "receipt and graph snapshot IDs differ");
  requireValue(graph.snapshot_id === sha256(stableJson({ ...graph, snapshot_id: undefined }).replace('  "snapshot_id": null,\n', "")) || /^[a-f0-9]{64}$/.test(graph.snapshot_id), "graph snapshot ID is invalid");

  const helixCompanies = helix.companies.map((company) => company.company_id).sort();
  const projectedCompanies = projection.companies.map((company) => company.company_id).sort();
  unique(helixCompanies, "Helix company IDs");
  unique(projectedCompanies, "projected company IDs");
  requireValue(JSON.stringify(projectedCompanies) === JSON.stringify(helixCompanies), "not every Helix company survived projection");
  requireValue(projection.counts.company_tracks === helixCompanies.length, "company count differs from Helix source");

  const helixFlagships = helix.flagships.map((flagship) => flagship.system_id).sort();
  const projectedFlagships = projection.flagships.map((flagship) => flagship.system_id).sort();
  unique(helixFlagships, "Helix flagship IDs");
  unique(projectedFlagships, "projected flagship IDs");
  requireValue(JSON.stringify(projectedFlagships) === JSON.stringify(helixFlagships), "not every public Helix flagship survived projection");
  requireValue(projection.counts.public_flagships === helixFlagships.length, "flagship count differs from Helix source");

  const academyStones = academy.stones.map((stone) => stone.id).sort();
  const projectedStones = projection.academy.stones.map((stone) => stone.id).sort();
  unique(academyStones, "Academy Stone IDs");
  unique(projectedStones, "projected Stone IDs");
  requireValue(JSON.stringify(projectedStones) === JSON.stringify(academyStones), "not every Academy Stone survived projection");
  requireValue(projection.counts.infinity_stones === academyStones.length, "Stone count differs from AKOS source");
  requireValue(projection.academy.four_layer_contract.layers.map((layer) => layer.id).join(",") === "recruiter,master,machine,mesh", "four-layer order changed");
  requireValue(projection.academy.four_layer_contract.state.includes("CANDIDATE"), "candidate four-layer status was over-promoted");

  requireValue(graph.truth_boundary.presentation_is_not_evidence === true, "presentation/evidence boundary is missing");
  requireValue(graph.truth_boundary.company_alignment_is_not_affiliation === true, "company non-affiliation boundary is missing");
  requireValue(graph.truth_boundary.repository_presence_is_not_runtime_proof === true, "repository/runtime boundary is missing");
  requireValue(graph.truth_boundary.candidate_stones_remain_candidate === true, "candidate Stone boundary is missing");

  unique(graph.nodes.map((node) => node.id), "graph node IDs");
  unique(graph.edges.map((edge) => `${edge.source}\u0000${edge.relationship}\u0000${edge.target}`), "graph edges");
  const nodeIds = new Set(graph.nodes.map((node) => node.id));
  for (const edge of graph.edges) {
    requireValue(nodeIds.has(edge.source), `edge source is absent: ${edge.source}`);
    requireValue(nodeIds.has(edge.target), `edge target is absent: ${edge.target}`);
  }
  requireValue(projection.counts.graph_nodes === graph.nodes.length, "graph node count is stale");
  requireValue(projection.counts.graph_edges === graph.edges.length, "graph edge count is stale");

  const companyHtml = await validateHtml("companies", projection);
  for (const company of projection.companies) {
    requireValue(companyHtml.includes(company.display_name.replaceAll("&", "&amp;")), `company route omits ${company.company_id}`);
  }
  const proofHtml = await validateHtml("proof", projection);
  for (const flagship of projection.flagships) {
    requireValue(proofHtml.includes(flagship.repository), `proof route omits ${flagship.system_id}`);
  }
  const academyHtml = await validateHtml("academy", projection);
  for (const stone of projection.academy.stones) {
    requireValue(academyHtml.includes(stone.name), `Academy route omits ${stone.id}`);
  }
  await Promise.all(ROUTES.filter((route) => !["companies", "proof", "academy"].includes(route)).map((route) => validateHtml(route, projection)));

  const receiptOutputs = receipt.outputs;
  requireValue(receiptOutputs && typeof receiptOutputs === "object", "projection receipt has no output hashes");
  for (const [relative, expected] of Object.entries(receiptOutputs)) {
    const text = await readFile(path.join(ROOT, relative), "utf8");
    requireValue(sha256(text) === expected, `output hash mismatch: ${relative}`);
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

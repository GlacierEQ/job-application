#!/usr/bin/env node

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SITE = path.join(ROOT, "site-v15");
const DATA = path.join(SITE, "data");

function fail(message) {
  throw new Error(`Website Masterclass render failed: ${message}`);
}

function requireValue(condition, message) {
  if (!condition) fail(message);
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function repoUrl(repository) {
  requireValue(/^GlacierEQ\/[A-Za-z0-9_.-]+$/.test(repository), `invalid repository ${String(repository)}`);
  const [owner, name] = repository.split("/");
  return `https://github.com/${encodeURIComponent(owner)}/${encodeURIComponent(name)}`;
}

function statusClass(value) {
  const state = String(value ?? "");
  if (/PROMOTED|VERIFIED|PUBLIC_REPOSITORY_EVIDENCE/.test(state)) return "verified";
  if (/REFERENCE|TRANSFER|REVIEW|TEST/.test(state)) return "reviewed";
  return "blocked";
}

async function loadJson(name) {
  const file = path.join(DATA, name);
  try {
    const value = JSON.parse(await readFile(file, "utf8"));
    requireValue(value && typeof value === "object" && !Array.isArray(value), `${name} must contain an object`);
    return value;
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("Website Masterclass render failed:")) throw error;
    fail(`${name}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

function navigation(active) {
  const links = [
    ["Recruiter", "/"],
    ["Companies", "/companies/"],
    ["Constellation", "/constellation/"],
    ["Proof", "/proof/"],
    ["Timeline", "/timeline/"],
    ["Academy", "/academy/"],
    ["Master", "/master/"],
    ["Mesh", "/mesh/"],
    ["Machine", "/machine/"],
  ];
  return links
    .map(([label, href]) => `<a href="${href}"${label === active ? ' aria-current="page"' : ""}>${label}</a>`)
    .join("");
}

function page({ title, description, active, eyebrow, heading, lead, body, snapshot }) {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
  <meta name="theme-color" content="#03080b">
  <meta name="description" content="${escapeHtml(description)}">
  <meta name="robots" content="index,follow">
  <title>${escapeHtml(title)} · Casey Barton</title>
  <link rel="icon" href="/assets/favicon.svg" type="image/svg+xml">
  <link rel="stylesheet" href="/assets/site.css">
  <link rel="stylesheet" href="/assets/site.systems.css">
  <link rel="stylesheet" href="/assets/masterclass.css">
</head>
<body>
<a class="skip" href="#main">Skip to content</a>
<div class="signal-bar"><div class="shell signal-inner"><span class="signal-live">WEBSITE MASTERCLASS · EVIDENCE-BOUND PROJECTION</span><span>snapshot ${escapeHtml(snapshot.slice(0, 12))}</span></div></div>
<header class="site-header"><div class="shell nav"><a class="brand" href="/"><span class="mark">CB</span><span><strong>CASEY BARTON</strong><small>APPLIED AI SYSTEMS ARCHITECT</small></span></a><nav class="links" aria-label="Masterclass navigation">${navigation(active)}</nav><a class="nav-cta" href="mailto:glacier.equilibrium@gmail.com">Start a conversation</a></div></header>
<main id="main">
<section class="page-hero masterclass-hero"><div class="shell"><p class="eyebrow">${escapeHtml(eyebrow)}</p><h1>${heading}</h1><p class="lead">${escapeHtml(lead)}</p></div></section>
${body}
</main>
<footer class="site-footer"><div class="shell"><p><strong>Casey Barton · GlacierEQ</strong></p><p>Independent systems work. Company alignment does not imply affiliation, endorsement, employment, proprietary access, or production deployment.</p><p><a href="/data/website-masterclass.json">Website Masterclass JSON</a> · <a href="/data/experience-graph.json">Experience graph JSON</a></p></div></footer>
</body>
</html>\n`;
}

function companyCard(company) {
  const repositories = company.repositories
    .map((repository) => `<li><a href="${repoUrl(repository.repository)}" target="_blank" rel="noopener">${escapeHtml(repository.repository.split("/")[1])}</a><span>${escapeHtml(repository.level)} · ${escapeHtml(repository.promotion_state)}</span></li>`)
    .join("");
  const donors = company.applicable_flagships
    .map((item) => `<li><span>${escapeHtml(item.label)}</span><b>${item.system_id ? "linked donor" : "review mapping"}</b></li>`)
    .join("");
  return `<details class="card masterclass-company">
    <summary><span><strong>${escapeHtml(company.display_name)}</strong><small>${escapeHtml(company.track_state)}</small></span><b>${company.public_repository_count} public systems</b></summary>
    <div class="masterclass-company-body">
      <p><span class="status ${statusClass(company.presentation_state)}">${escapeHtml(company.presentation_state)}</span></p>
      <p>${escapeHtml(company.recruiter_thesis)}</p>
      <p><strong>Target roles:</strong> ${company.target_roles.length ? company.target_roles.map(escapeHtml).join(" · ") : "Role mapping pending"}</p>
      <p><strong>Next gate:</strong> ${escapeHtml(company.gap_or_next_gate)}</p>
      ${repositories ? `<h3>Public repository evidence</h3><ul class="masterclass-list">${repositories}</ul>` : ""}
      ${donors ? `<h3>Applicable personal capability donors</h3><ul class="masterclass-list">${donors}</ul>` : ""}
      <p class="atlas-boundary">${escapeHtml(company.non_affiliation)}</p>
    </div>
  </details>`;
}

function renderCompanies(projection) {
  const groups = [
    ["Public repository evidence", "PUBLIC_REPOSITORY_EVIDENCE"],
    ["Personal flagship transfer", "PERSONAL_FLAGSHIP_TRANSFER"],
    ["Discovered target · proof gap visible", "TARGET_TRACK_DISCOVERED_NO_PUBLIC_PROOF_YET"],
  ];
  const sections = groups
    .map(([label, state]) => {
      const companies = projection.companies.filter((company) => company.presentation_state === state);
      if (!companies.length) return "";
      return `<section class="section${state === "PERSONAL_FLAGSHIP_TRANSFER" ? " alt" : ""}"><div class="shell"><div class="section-head"><div><p class="eyebrow">${escapeHtml(label)}</p><h2>${companies.length} company and domain lenses</h2></div><p>Every lens remains visible. Missing direct proof is represented as a gate, not silently dropped from the presentation.</p></div><div class="masterclass-companies">${companies.map(companyCard).join("")}</div></div></section>`;
    })
    .join("");
  return page({
    title: "Company Bottleneck Atlas",
    description: "All current company and domain lenses compiled from Job App Helix, including public evidence, capability donors, and visible proof gaps.",
    active: "Companies",
    eyebrow: "COMPANY BOTTLENECK ATLAS · COMPLETE CURRENT HELIX PROJECTION",
    heading: `Different systems. Different scales. <em>One repeatable method.</em>`,
    lead: `${projection.counts.company_tracks} company and domain tracks are preserved from the canonical Helix source. None are removed merely because their direct public proof is still incomplete.`,
    body: `<section class="section tight"><div class="shell"><div class="proof-strip"><div><b>${projection.counts.company_tracks}</b><span>company tracks</span></div><div><b>${projection.counts.company_tracks_with_public_repositories}</b><span>with public repositories</span></div><div><b>${projection.counts.public_company_repository_memberships}</b><span>public memberships</span></div><div><b>${projection.counts.public_flagships}</b><span>public flagships</span></div></div></div></section>${sections}`,
    snapshot: projection.snapshot_id,
  });
}

function renderProof(projection) {
  const cards = projection.proof_trails
    .map((trail) => `<article class="card proof-card">
      <div class="atlas-card-head"><span class="status ${statusClass(trail.state)}">${escapeHtml(trail.level)} · ${escapeHtml(trail.state)}</span></div>
      <h2>${escapeHtml(trail.proof_story?.name ?? trail.system_id.replaceAll("_", " "))}</h2>
      <p>${escapeHtml(trail.role)}</p>
      ${trail.proof_story?.summary ? `<p>${escapeHtml(trail.proof_story.summary)}</p>` : ""}
      <dl class="proof-dl"><dt>Evidence</dt><dd>${escapeHtml(trail.evidence)}</dd><dt>Next gate</dt><dd>${escapeHtml(trail.next_gate)}</dd><dt>Authority</dt><dd>${escapeHtml(trail.authority)}</dd></dl>
      ${trail.proof_story?.limit ? `<p class="atlas-boundary"><strong>Limit:</strong> ${escapeHtml(trail.proof_story.limit)}</p>` : ""}
      <a class="button ghost small" href="${repoUrl(trail.repository)}" target="_blank" rel="noopener">Inspect owning repository</a>
    </article>`)
    .join("");
  return page({
    title: "Proof Trails",
    description: "Public flagship proof trails with evidence state, owning repository, explicit limits, and next promotion gates.",
    active: "Proof",
    eyebrow: "PROOF TRAILS · EVIDENCE, LIMITS, AND NEXT GATES",
    heading: `Every claim has a path. <em>Every path has a boundary.</em>`,
    lead: "The presentation does not own technical truth. Each owning repository retains its code and native receipts; Helix controls admission and current public state.",
    body: `<section class="section"><div class="shell"><div class="proof-grid">${cards}</div></div></section>`,
    snapshot: projection.snapshot_id,
  });
}

function renderTimeline(projection) {
  const records = projection.timeline
    .map((record) => `<li class="timeline-item"><time>${escapeHtml(record.date ?? "Undated source record")}</time><div><h2>${escapeHtml(record.title)}</h2><p><span class="status reviewed">${escapeHtml(record.state)}</span></p><a href="${escapeHtml(record.source_url)}" target="_blank" rel="noopener">Inspect source record</a></div></li>`)
    .join("");
  return page({
    title: "Release Timeline",
    description: "Source-backed portfolio and production release records ordered from the job-application deployment receipt directory.",
    active: "Timeline",
    eyebrow: "RELEASE TIMELINE · SOURCE RECORDS, NOT MARKETING MEMORY",
    heading: `The portfolio evolves through <em>inspectable releases.</em>`,
    lead: `${projection.counts.release_records} current deployment and release records were discovered from the repository. A record’s presence proves the source record exists; its contents control any stronger conclusion.`,
    body: `<section class="section"><div class="shell"><ol class="timeline">${records}</ol></div></section>`,
    snapshot: projection.snapshot_id,
  });
}

function renderAcademy(projection) {
  const layers = projection.academy.four_layer_contract.layers
    .map((layer, index) => `<article class="card layer-card"><span class="rank">${index + 1}</span><h2>${escapeHtml(layer.id)}</h2><p>${escapeHtml(layer.purpose)}</p></article>`)
    .join("");
  const stones = projection.academy.stones
    .map((stone) => `<details class="card stone-card"><summary><span><strong>${escapeHtml(stone.name)}</strong><small>${escapeHtml(stone.domain)}</small></span><b class="status ${statusClass(stone.status.public_label)}">${escapeHtml(stone.status.public_label)}</b></summary><div class="stone-body"><p><strong>Version:</strong> ${escapeHtml(stone.version)}</p><p><strong>Core law:</strong> ${escapeHtml(stone.core_law ?? "Not declared")}</p><h3>Owns</h3><ul>${stone.owns.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul><h3>Outputs</h3><ul>${stone.outputs.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul><h3>Forbidden</h3><ul>${stone.forbidden.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul><p class="atlas-boundary">Rendering this Stone does not promote it. AKOS registry and Forge receipts control status.</p></div></details>`)
    .join("");
  return page({
    title: "Infinity Stone Academy",
    description: "A source-bound learning and inspection surface for AKOS Infinity Stones, their four projections, capabilities, outputs, boundaries, and current status.",
    active: "Academy",
    eyebrow: "INFINITY STONE ACADEMY · GOVERNED SPECIALIZATIONS",
    heading: `One specialization. <em>Four truth-bound views.</em>`,
    lead: `${projection.counts.infinity_stones} current Stones are read from AKOS at one immutable commit. Candidate extensions remain candidate; prior verified baselines remain separate.`,
    body: `<section class="section tight"><div class="shell"><div class="layer-grid">${layers}</div><p class="atlas-boundary academy-rule">${escapeHtml(projection.academy.four_layer_contract.promotion_rule)}</p></div></section><section class="section alt"><div class="shell"><div class="section-head"><div><p class="eyebrow">STONE CATALOG</p><h2>Capabilities, outputs, and explicit refusal boundaries</h2></div><p>Open a Stone to inspect what it owns, what it emits, and what it refuses to claim.</p></div><div class="stone-list">${stones}</div></div></section>`,
    snapshot: projection.snapshot_id,
  });
}

function renderConstellation(projection, graph) {
  const nodeCounts = new Map();
  for (const node of graph.nodes) nodeCounts.set(node.kind, (nodeCounts.get(node.kind) ?? 0) + 1);
  const edgeCounts = new Map();
  for (const edge of graph.edges) edgeCounts.set(edge.relationship, (edgeCounts.get(edge.relationship) ?? 0) + 1);
  const nodeRows = [...nodeCounts.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([kind, count]) => `<tr><td>${escapeHtml(kind)}</td><td>${count}</td></tr>`).join("");
  const edgeRows = [...edgeCounts.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([relationship, count]) => `<tr><td>${escapeHtml(relationship)}</td><td>${count}</td></tr>`).join("");
  const donors = graph.edges
    .filter((edge) => edge.relationship === "capability-donor-for")
    .map((edge) => `<li><code>${escapeHtml(edge.source.replace("flagship:", ""))}</code><span>→</span><code>${escapeHtml(edge.target.replace("company:", ""))}</code></li>`)
    .join("");
  return page({
    title: "Repository Constellation",
    description: "Typed repository, company, flagship, role, skill, output, and Infinity Stone relationships from one Website Masterclass snapshot.",
    active: "Constellation",
    eyebrow: "REPOSITORY CONSTELLATION · TYPED GRAPH WITH TEXT EQUIVALENCE",
    heading: `Breadth becomes useful when <em>relationships stay explicit.</em>`,
    lead: `${graph.nodes.length} nodes and ${graph.edges.length} typed edges connect companies, repositories, personal flagships, roles, skills, outputs, and Infinity Stones without implying affiliation or verification by proximity.`,
    body: `<section class="section tight"><div class="shell"><div class="masterclass-grid"><article class="card"><h2>Node classes</h2><div class="table-wrap"><table><thead><tr><th>Kind</th><th>Count</th></tr></thead><tbody>${nodeRows}</tbody></table></div></article><article class="card"><h2>Relationship classes</h2><div class="table-wrap"><table><thead><tr><th>Relationship</th><th>Count</th></tr></thead><tbody>${edgeRows}</tbody></table></div></article></div></div></section><section class="section alt"><div class="shell"><div class="section-head"><div><p class="eyebrow">CAPABILITY-DONOR GRAPH</p><h2>Personal flagships recomposed across company environments</h2></div><p>These edges describe applicability, not company affiliation, deployment, or direct repository ownership.</p></div><ul class="donor-list">${donors || "<li>No resolved donor edges in this snapshot.</li>"}</ul><div class="actions"><a class="button primary" href="/data/experience-graph.json">Inspect complete graph JSON</a><a class="button ghost" href="/companies/">Open company atlas</a></div></div></section>`,
    snapshot: projection.snapshot_id,
  });
}

async function writePage(route, html) {
  const directory = path.join(SITE, route);
  await mkdir(directory, { recursive: true });
  await writeFile(path.join(directory, "index.html"), html, "utf8");
}

async function main() {
  const [projection, graph] = await Promise.all([
    loadJson("website-masterclass.json"),
    loadJson("experience-graph.json"),
  ]);
  requireValue(projection.schema === "glaciereq.website-masterclass.v1", "unexpected Website Masterclass schema");
  requireValue(graph.schema === "glaciereq.website-masterclass-experience-graph.v1", "unexpected experience graph schema");
  requireValue(projection.snapshot_id === graph.snapshot_id, "projection and graph snapshot IDs differ");

  await Promise.all([
    writePage("companies", renderCompanies(projection)),
    writePage("constellation", renderConstellation(projection, graph)),
    writePage("proof", renderProof(projection)),
    writePage("timeline", renderTimeline(projection)),
    writePage("academy", renderAcademy(projection)),
  ]);
  console.log(`Website Masterclass routes rendered: snapshot=${projection.snapshot_id}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack : error);
  process.exitCode = 1;
});

#!/usr/bin/env node

import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SITE = path.join(ROOT, "site-v15");
const SNAPSHOT_PATH = path.join(SITE, "data", "helix-root.json");
const SUMMARY_PATH = path.join(SITE, "data", "company-atlas-summary.json");
const ATLAS_DIR = path.join(SITE, "atlas");
const REPOSITORY_PATTERN = /^GlacierEQ\/[A-Za-z0-9_.-]+$/;
const COMPANY_INDEX_PATH = "manifests/company_dossiers.json";

const CLUSTERS = [
  ["Frontier AI", 190, -100],
  ["Cloud & Platform", 295, -84],
  ["Silicon & Compute", 400, -70],
  ["Product & Agents", 505, -54],
  ["Mission Systems", 610, -38],
  ["Industry & Field Systems", 700, -18],
];

const CLUSTER_BY_ID = new Map(Object.entries({
  openai:"Frontier AI",anthropic:"Frontier AI",google_deepmind:"Frontier AI",xai:"Frontier AI",deepseek:"Frontier AI",kimi:"Frontier AI",qwen:"Frontier AI",mistral:"Frontier AI",cohere:"Frontier AI",
  microsoft:"Cloud & Platform",aws:"Cloud & Platform",databricks:"Cloud & Platform",snowflake:"Cloud & Platform",ibm:"Cloud & Platform",oracle:"Cloud & Platform",cloudflare:"Cloud & Platform",vercel:"Cloud & Platform",hugging_face:"Cloud & Platform",coreweave:"Cloud & Platform",
  nvidia:"Silicon & Compute",apple:"Silicon & Compute",intel:"Silicon & Compute",amd:"Silicon & Compute",qualcomm:"Silicon & Compute",groq:"Silicon & Compute",cerebras:"Silicon & Compute",
  meta:"Product & Agents",notion:"Product & Agents",opera:"Product & Agents",perplexity:"Product & Agents",manus:"Product & Agents",lovable:"Product & Agents",openclaw:"Product & Agents",tasklet:"Product & Agents",scale_ai:"Product & Agents",salesforce:"Product & Agents",adobe:"Product & Agents",
  spacex:"Mission Systems",tesla:"Mission Systems",robotics:"Mission Systems",palantir:"Mission Systems",anduril:"Mission Systems",waymo:"Mission Systems",zoox:"Mission Systems",blue_origin:"Mission Systems",rocket_lab:"Mission Systems",nasa:"Mission Systems",lockheed_martin:"Mission Systems",
  buildertrend:"Industry & Field Systems",
  glaciereq_core:"Core",
}));

const INNOVATION_BY_ID = new Map(Object.entries({
  openai:"Agent Reliability & Context Integrity Plane",anthropic:"Agent Mission Control",google_deepmind:"Adaptive Intelligence Fabric",xai:"Colossus Whole-System Constraint Engine",microsoft:"Enterprise Agent Identity & Operations Plane",aws:"Trainium Workload Reliability Sentinel",spacex:"Mission State Mesh",nvidia:"GPU Reliability Control Plane",apple:"Private Edge Intelligence Runtime",meta:"Collective Reliability Sentinel",tesla:"Perception Stream Reliability Sentinel",notion:"Living Workspace Intelligence Plane",deepseek:"MLA/MoE Serving Sentinel",kimi:"Long-Context KV Transport Sentinel",qwen:"Multimodal Workload Router",opera:"Spatial Task Workspace",tasklet:"Typed Micro-Agent Engine",robotics:"Embodied Torque-Safety Sentinel",perplexity:"Source-Integrity Browser Agent Bridge",manus:"Bounded Web-Agent Runtime",lovable:"Verified Design-to-App Synthesis",openclaw:"Controlled Tool Runtime",palantir:"Ontology Change-Control Sentinel",anduril:"Mission Autonomy Assurance Mesh",scale_ai:"Agent Reliability Gauntlet",mistral:"Sovereign Agent Runtime",cohere:"Context Signal Optimizer",databricks:"Lineage-Aware Agent Control Plane",snowflake:"RBAC Agent Sentinel",ibm:"Agent Estate Control Plane",intel:"NPU Workload Orchestrator",amd:"ROCm Runtime Sentinel",qualcomm:"Edge AI Deployment Optimizer",oracle:"Agentic Transaction Guardian",salesforce:"Revenue Agent Outcome Sentinel",adobe:"Creative Workflow Provenance Plane",cloudflare:"Edge MCP Authority Gateway",vercel:"Durable Agent Runtime Receipt Layer",hugging_face:"Model Evidence Router",groq:"Inference QoS Router",cerebras:"Disaggregated Inference Planner",coreweave:"GPU Placement Orchestrator",waymo:"Autonomy Replay Sentinel",zoox:"Edge-Case Safety Guardian",blue_origin:"Reusable Mission State Engine",rocket_lab:"Responsive Mission Graph",nasa:"Autonomous Science Mission Control",buildertrend:"Construction Change-Propagation Agent",lockheed_martin:"Mission Assurance Mesh",glaciereq_core:"Capability Donor Mesh",
}));

const SHORT_LABEL = new Map(Object.entries({
  google_deepmind:"DeepMind",kimi:"Kimi",qwen:"Qwen",hugging_face:"HuggingFace",blue_origin:"Blue Origin",rocket_lab:"Rocket Lab",scale_ai:"Scale AI",lockheed_martin:"Lockheed",glaciereq_core:"GLACIEREQ",
}));

function assert(condition, message) {
  if (!condition) throw new Error(`Company constellation render failed: ${message}`);
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
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

function parseJson(text, label) {
  try {
    const value = JSON.parse(text);
    assert(value && typeof value === "object" && !Array.isArray(value), `${label} must contain an object`);
    return value;
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("Company constellation render failed:")) throw error;
    throw new Error(`Company constellation render failed: ${label}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

async function fetchText(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15_000);
  const headers = { Accept: "application/json", "User-Agent": "GlacierEQ-job-application-company-atlas" };
  if (process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  try {
    const response = await fetch(url, { headers, signal: controller.signal });
    assert(response.ok, `${url} returned ${response.status}`);
    return await response.text();
  } finally {
    clearTimeout(timer);
  }
}

function slug(companyId) {
  assert(typeof companyId === "string" && /^[a-z0-9_]+$/.test(companyId), `invalid company_id ${String(companyId)}`);
  return companyId.replaceAll("_", "-");
}

function repoUrl(repository) {
  assert(typeof repository === "string" && REPOSITORY_PATTERN.test(repository), `invalid public repository identity ${String(repository)}`);
  const [owner, name] = repository.split("/");
  return `https://github.com/${encodeURIComponent(owner)}/${encodeURIComponent(name)}`;
}

function evidenceState(company) {
  if (company.company_id === "glaciereq_core") return "core";
  if (company.repositories.some((repo) => repo.promotion_state === "PROMOTED")) return "promoted";
  if (company.repositories.length) return "reference";
  return "empty";
}

function nodeRadius(mapped) {
  if (!mapped) return 23;
  return Math.min(42, 23 + Math.log2(mapped + 1) * 4.1);
}

function labelFor(company) {
  const preferred = SHORT_LABEL.get(company.company_id);
  if (preferred) return preferred;
  const display = String(company.display_name ?? company.company_id);
  return display.length <= 16 ? display : `${display.slice(0, 14)}…`;
}

function clusterFor(companyId) {
  const cluster = CLUSTER_BY_ID.get(companyId);
  assert(cluster, `no presentation cluster is defined for ${companyId}`);
  return cluster;
}

function innovationFor(companyId) {
  const innovation = INNOVATION_BY_ID.get(companyId);
  assert(innovation, `no portfolio design target is defined for ${companyId}`);
  return innovation;
}

function constellationNode(track, index, count, radius, offsetDegrees) {
  const angle = ((offsetDegrees + (count === 1 ? 0 : index * 360 / count)) * Math.PI) / 180;
  const cx = 800 + Math.cos(angle) * radius;
  const cy = 720 + Math.sin(angle) * radius;
  const r = nodeRadius(track.repository_record_count);
  const state = evidenceState(track);
  return `<a class="constellation-node state-${state}" href="/atlas/${slug(track.company_id)}/" aria-label="Open ${escapeHtml(track.display_name)} company pocket">
    <circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="${r.toFixed(1)}"/>
    <text x="${cx.toFixed(1)}" y="${(cy - 2).toFixed(1)}">${escapeHtml(labelFor(track))}</text>
    <text class="count" x="${cx.toFixed(1)}" y="${(cy + 14).toFixed(1)}">${track.repository_record_count} / ${track.repositories.length}</text>
    <title>${escapeHtml(track.display_name)} · ${track.repository_record_count} mapped records · ${track.repositories.length} recruiter-admissible · ${state}</title>
  </a>`;
}

function constellationSvg(tracks) {
  const core = tracks.find((track) => track.company_id === "glaciereq_core");
  assert(core, "GlacierEQ Core track is missing");
  const parts = [
    '<svg class="company-constellation" viewBox="0 0 1600 1440" role="img" aria-labelledby="constellation-title constellation-desc">',
    '<title id="constellation-title">Evidence-aware AI ecosystem company constellation</title>',
    '<desc id="constellation-desc">Company and platform tracks arranged in domain rings. Node size shows mapped repository records; the second number is the recruiter-admissible subset. Every node links to a company pocket.</desc>',
  ];
  for (const [, radius] of CLUSTERS) parts.push(`<circle class="constellation-ring" cx="800" cy="720" r="${radius}"/>`);
  parts.push(`<a class="constellation-node state-core" href="/atlas/${slug(core.company_id)}/" aria-label="Open GlacierEQ Core company pocket"><circle cx="800" cy="720" r="82"/><text x="800" y="710">GLACIEREQ</text><text class="count" x="800" y="734">${core.repository_record_count} / ${core.repositories.length}</text><title>GlacierEQ Core · capability donor authority</title></a>`);
  for (const [cluster, radius, offset] of CLUSTERS) {
    const group = tracks.filter((track) => clusterFor(track.company_id) === cluster).sort((a, b) => a.display_name.localeCompare(b.display_name));
    if (!group.length) continue;
    const labelY = 720 - radius + 18;
    parts.push(`<text class="constellation-ring-label" x="800" y="${labelY}">${escapeHtml(cluster.toUpperCase())}</text>`);
    group.forEach((track, index) => parts.push(constellationNode(track, index, group.length, radius, offset)));
  }
  parts.push("</svg>");
  return parts.join("\n");
}

function repositoryList(company) {
  if (!company.repositories.length) {
    const donors = Array.isArray(company.applicable_flagships) && company.applicable_flagships.length
      ? `<p class="atlas-applicable"><strong>Applicable governed flagships:</strong> ${company.applicable_flagships.map(escapeHtml).join(" · ")}</p>`
      : "";
    return `<p>No direct recruiter-admissible company repository is present in the current public projection.</p>${donors}`;
  }
  return `<ul class="company-pocket-repos">${company.repositories.map((repo) => `<li><a href="${repoUrl(repo.repository)}" target="_blank" rel="noopener">${escapeHtml(repo.repository.replace("GlacierEQ/", ""))}</a><span>${escapeHtml(repo.level)} · ${escapeHtml(repo.promotion_state)}</span></li>`).join("")}</ul>`;
}

function statusLabel(company) {
  const state = evidenceState(company);
  if (state === "core") return "CORE DONOR AUTHORITY";
  if (state === "promoted") return "PROMOTED PUBLIC SUBSET";
  if (state === "reference") return "BOUNDED PUBLIC REFERENCE";
  return "NO DIRECT EXHIBIT VERIFIED";
}

function companyPage(company, sourceCommit) {
  const pageSlug = slug(company.company_id);
  const state = evidenceState(company);
  const innovation = innovationFor(company.company_id);
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
  <meta name="theme-color" content="#03080b">
  <meta name="description" content="Independent ${escapeHtml(company.display_name)} portfolio lens: governed evidence state, public proof, current gate, design hypothesis, implementation calibration, and impact lenses.">
  <meta name="robots" content="index,follow">
  <link rel="canonical" href="https://casey-barton-glaciereq.vercel.app/atlas/${pageSlug}/">
  <title>${escapeHtml(company.display_name)} · Company Atlas · Casey Barton</title>
  <link rel="icon" href="/assets/favicon.svg" type="image/svg+xml">
  <link rel="stylesheet" href="/assets/site.css">
  <link rel="stylesheet" href="/assets/site.systems.css">
  <link rel="stylesheet" href="/assets/helix-atlas.css">
  <link rel="stylesheet" href="/assets/company-constellation.css">
</head>
<body>
<a class="skip" href="#main">Skip to content</a>
<div class="signal-bar"><div class="shell signal-inner"><span class="signal-live">COMPANY ATLAS · ${escapeHtml(statusLabel(company))}</span><span>${company.repository_record_count} mapped records · ${company.repositories.length} recruiter-admissible</span></div></div>
<header class="site-header"><div class="shell nav"><a class="brand" href="/" aria-label="Casey Barton portfolio home"><span class="mark">CB</span><span><strong>CASEY BARTON</strong><small>APPLIED AI SYSTEMS ARCHITECT</small></span></a><nav class="links" aria-label="Primary navigation"><a href="/">Recruiter</a><a href="/resume/">Résumé</a><a href="/master/">Master</a><a href="/mesh/">Mesh</a><a aria-current="page" href="/atlas/">Atlas</a><a href="/machine/">Machine</a></nav><a class="nav-cta" href="mailto:glacier.equilibrium@gmail.com">Start a conversation</a></div></header>
<main id="main">
<section class="hero company-pocket-hero"><div class="shell"><p class="eyebrow">${escapeHtml(clusterFor(company.company_id).toUpperCase())} · INDEPENDENT COMPANY LENS</p><h1>${escapeHtml(company.display_name)}</h1><p class="lead">${escapeHtml(company.recruiter_thesis)}</p><div class="company-pocket-status"><span><b>${company.repository_record_count}</b> mapped repository records</span><span><b>${company.repositories.length}</b> recruiter-admissible repositories</span><span><b>${escapeHtml(statusLabel(company))}</b></span></div><div class="actions"><a class="button primary" href="/atlas/">Back to constellation</a><a class="button ghost" href="/mesh/">Open capability mesh</a><a class="button ghost" href="/master/">Inspect due diligence</a></div></div></section>
<section class="section"><div class="shell company-pocket-grid"><article class="card company-pocket-card"><div class="company-pocket-block"><p class="eyebrow">CURRENT EVIDENCE GAP / NEXT GATE</p><h3>What has to become stronger before the claim grows.</h3><p>${escapeHtml(company.gap_or_next_gate)}</p></div><div class="company-pocket-block design-hypothesis"><p class="eyebrow">PORTFOLIO DESIGN HYPOTHESIS</p><h3>${escapeHtml(innovation)}</h3><p>This is a proposed intervention for demonstrating role fit. It is not presented as a verified internal company problem, company roadmap, adoption claim, or proprietary architecture.</p></div><div class="company-pocket-block"><p class="eyebrow">PUBLIC PORTFOLIO EVIDENCE</p><h3>Only recruiter-admissible identities appear here.</h3>${repositoryList(company)}</div><div class="company-pocket-block"><p class="eyebrow">NON-AFFILIATION BOUNDARY</p><p class="source-boundary">${escapeHtml(company.non_affiliation)}</p></div></article><aside class="card company-pocket-card"><div class="company-pocket-block"><p class="eyebrow">REALISTIC IMPLEMENTATION CALIBRATION</p><ol class="planning-steps"><li><strong>2–3 weeks:</strong> discovery, access boundaries, baseline and acceptance criteria.</li><li><strong>4–8 weeks:</strong> bounded critical-path reference implementation and instrumentation.</li><li><strong>8–16 weeks:</strong> pilot integration, evaluation, operator feedback and technical handoff.</li><li><strong>Scale:</strong> only after measured pilot results establish the production hardening scope.</li></ol><p class="source-boundary">Planning ranges are conditional, not delivery promises; access, safety, procurement, data quality and integration depth can materially change them.</p></div><div class="company-pocket-block"><p class="eyebrow">IMPACT CALIBRATION</p><div class="calibration-grid"><div><b>People</b><p>Adoption, time-to-value, task completion, error rate and trust.</p></div><div><b>Cost</b><p>Labor, infrastructure, failure cost, utilization and cycle time.</p></div><div><b>Revenue</b><p>Throughput, conversion, retention or new capability only where a causal pathway is documented.</p></div><div><b>Risk</b><p>Safety, security, recovery, compliance, mission assurance and traceability.</p></div></div><p class="source-boundary">No quantified business impact is claimed without a company-specific baseline and observed pilot evidence.</p></div></aside></div></section>
<section class="section tight"><div class="shell callout"><p class="eyebrow">SOURCE BINDING</p><h2>This pocket is compiled from the same immutable Helix source as the public portfolio.</h2><p>Helix commit <code>${escapeHtml(sourceCommit)}</code>. Private repository identities are never emitted by this page; mapped breadth is an aggregate count only.</p><div class="actions"><a class="button primary" href="/data/company-atlas-summary.json">Inspect machine summary</a><a class="button ghost" href="/data/helix-root.json">Inspect public Helix projection</a></div></div></section>
</main>
<footer class="site-footer"><div class="shell"><p><strong>Casey Barton · GlacierEQ</strong></p><p>Independent systems work. Company alignment does not imply affiliation, endorsement, employment, proprietary access, or production deployment.</p></div></footer>
</body>
</html>\n`;
}

function mainPage(tracks, snapshot, sourceDigest) {
  const memberships = tracks.reduce((sum, track) => sum + track.repositories.length, 0);
  const mappedRecords = tracks.reduce((sum, track) => sum + track.repository_record_count, 0);
  const directory = CLUSTERS.map(([cluster]) => {
    const group = tracks.filter((track) => clusterFor(track.company_id) === cluster).sort((a, b) => a.display_name.localeCompare(b.display_name));
    if (!group.length) return "";
    return `<section class="company-directory-group"><h3>${escapeHtml(cluster)}</h3><div class="company-directory-links">${group.map((track) => `<a href="/atlas/${slug(track.company_id)}/"><strong>${escapeHtml(track.display_name)}</strong><small>${track.repository_record_count} / ${track.repositories.length}</small></a>`).join("")}</div></section>`;
  }).join("");
  const core = tracks.find((track) => track.company_id === "glaciereq_core");
  const coreLink = core ? `<a href="/atlas/${slug(core.company_id)}/"><strong>${escapeHtml(core.display_name)}</strong><small>${core.repository_record_count} / ${core.repositories.length}</small></a>` : "";
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
  <meta name="theme-color" content="#03080b">
  <meta name="description" content="Evidence-aware AI ecosystem company atlas: every star links to a governed company pocket with mapped breadth separated from recruiter-admissible proof.">
  <meta name="robots" content="index,follow">
  <link rel="canonical" href="https://casey-barton-glaciereq.vercel.app/atlas/">
  <title>AI Ecosystem Company Atlas · Casey Barton</title>
  <link rel="icon" href="/assets/favicon.svg" type="image/svg+xml">
  <link rel="stylesheet" href="/assets/site.css">
  <link rel="stylesheet" href="/assets/site.systems.css">
  <link rel="stylesheet" href="/assets/helix-atlas.css">
  <link rel="stylesheet" href="/assets/company-constellation.css">
</head>
<body>
<a class="skip" href="#main">Skip to content</a>
<div class="signal-bar"><div class="shell signal-inner"><span class="signal-live">HELIX ROOT TRUTH · EVIDENCE-AWARE CONSTELLATION</span><span>${tracks.length} governed tracks · ${mappedRecords} mapped records · ${memberships} recruiter-admissible memberships</span></div></div>
<header class="site-header"><div class="shell nav"><a class="brand" href="/" aria-label="Casey Barton portfolio home"><span class="mark">CB</span><span><strong>CASEY BARTON</strong><small>APPLIED AI SYSTEMS ARCHITECT</small></span></a><nav class="links" aria-label="Primary navigation"><a href="/">Recruiter</a><a href="/resume/">Résumé</a><a href="/master/">Master</a><a href="/mesh/">Mesh</a><a aria-current="page" href="/atlas/">Atlas</a><a href="/machine/">Machine</a></nav><a class="nav-cta" href="mailto:glacier.equilibrium@gmail.com">Start a conversation</a></div></header>
<main id="main">
<section class="hero atlas-hero"><div class="shell"><p class="eyebrow">RECRUITER · MASTER · MACHINE · MESH</p><h1>The ecosystem becomes a <em>selectable evidence map.</em></h1><p class="lead">Every star resolves to a company pocket. Node size reflects total mapped repository records; the second number is the recruiter-admissible public subset. Visual strength cannot outrun evidence strength.</p><div class="proof-strip" aria-label="Company atlas scope"><div><b>${tracks.length}</b><span>governed company/core tracks</span></div><div><b>${mappedRecords}</b><span>mapped repository records</span></div><div><b>${memberships}</b><span>recruiter-admissible memberships</span></div><div><b>0</b><span>browser JavaScript</span></div></div><div class="actions"><a class="button primary" href="#constellation">Select a company</a><a class="button secondary" href="/mesh/">Open capability mesh</a><a class="button ghost" href="/data/company-atlas-summary.json">Machine summary</a></div></div></section>
<section id="constellation" class="section constellation-intro"><div class="shell"><div class="section-head"><div><p class="eyebrow">EVIDENCE-AWARE CONSTELLATION</p><h2>One interface. Different technical dialects.</h2></div><p>The browser receives static SVG and semantic links only. No live GitHub call, no client-side graph runtime, and no hidden company evidence state.</p></div><div class="constellation-frame">${constellationSvg(tracks)}</div><div class="constellation-legend"><span class="promoted">Promoted public subset</span><span class="reference">Bounded public reference</span><span class="empty">No direct exhibit verified</span><span class="core">Core donor authority</span><small>node label: mapped records / recruiter-admissible</small></div></div></section>
<section class="section alt"><div class="shell"><div class="section-head"><div><p class="eyebrow">ACCESSIBLE DIRECTORY</p><h2>The same constellation without requiring spatial navigation.</h2></div><p>Every node remains reachable as an ordinary link for keyboards, assistive technology, crawlers, low-power devices, and print.</p></div><div class="company-directory">${directory}<section class="company-directory-group"><h3>Core</h3><div class="company-directory-links">${coreLink}</div></section></div></div></section>
<section class="section tight"><div class="shell callout"><p class="eyebrow">SOURCE AND STABILITY</p><h2>Built from one immutable Helix commit, served as static bytes.</h2><p>Aggregate mapped counts are recalculated from canonical dossiers at the exact Helix commit already consumed by the public projection. Every dossier body is hash-checked against that projection before rendering. Private repository identities never enter this atlas.</p><p class="source-boundary">Helix commit <code>${escapeHtml(snapshot.source.root_ref)}</code> · dossier aggregate digest <code>${escapeHtml(sourceDigest)}</code></p><div class="actions"><a class="button primary" href="/data/company-atlas-summary.json">Inspect company atlas summary</a><a class="button ghost" href="/data/helix-root.json">Inspect public Helix projection</a><a class="button ghost" href="/machine/">Read machine contracts</a></div></div></section>
</main>
<footer class="site-footer"><div class="shell"><p><strong>Casey Barton · GlacierEQ</strong></p><p>Independent systems work. Company alignment does not imply affiliation, endorsement, employment, proprietary access, or production deployment.</p></div></footer>
</body>
</html>\n`;
}

async function addCompanyUrlsToSitemap(tracks) {
  const sitemapPath = path.join(SITE, "sitemap.xml");
  let sitemap = await readFile(sitemapPath, "utf8");
  const closing = sitemap.lastIndexOf("</urlset>");
  assert(closing >= 0, "sitemap.xml has no closing urlset element");
  const additions = [];
  for (const track of tracks) {
    const url = `https://casey-barton-glaciereq.vercel.app/atlas/${slug(track.company_id)}/`;
    if (!sitemap.includes(url)) additions.push(`  <url><loc>${url}</loc></url>`);
  }
  if (additions.length) {
    sitemap = `${sitemap.slice(0, closing)}${additions.join("\n")}\n${sitemap.slice(closing)}`;
    await writeFile(sitemapPath, sitemap, "utf8");
  }
}

async function main() {
  const snapshotText = await readFile(SNAPSHOT_PATH, "utf8");
  const snapshot = parseJson(snapshotText, "site-v15/data/helix-root.json");
  assert(snapshot.schema === "glaciereq.public-portfolio-projection.v1", "unexpected public projection schema");
  assert(snapshot.source?.authority?.repository === "GlacierEQ/job-app-helix", "unexpected Helix source authority");
  assert(typeof snapshot.source?.root_ref === "string" && /^[a-f0-9]{40}$/.test(snapshot.source.root_ref), "public projection is not bound to an immutable Helix commit");
  assert(snapshot.source?.source_hashes && typeof snapshot.source.source_hashes === "object", "public projection source hashes are missing");
  assert(Array.isArray(snapshot.companies) && snapshot.companies.length > 0, "public company projection is empty");

  const rawBase = `https://raw.githubusercontent.com/GlacierEQ/job-app-helix/${snapshot.source.root_ref}`;
  const indexText = await fetchText(`${rawBase}/${COMPANY_INDEX_PATH}`);
  assert(sha256(indexText) === snapshot.source.source_hashes[COMPANY_INDEX_PATH], "company dossier index hash differs from the consumed public projection");
  const index = parseJson(indexText, COMPANY_INDEX_PATH);
  assert(Array.isArray(index.dossier_files) && index.dossier_files.length > 0, "company dossier list is empty");

  const mappedCounts = new Map();
  const dossierHashes = {};
  for (const shardPath of index.dossier_files) {
    assert(typeof shardPath === "string" && shardPath.startsWith("manifests/company_dossiers/"), `invalid dossier path ${String(shardPath)}`);
    const shardText = await fetchText(`${rawBase}/${shardPath}`);
    const expectedHash = snapshot.source.source_hashes[shardPath];
    assert(typeof expectedHash === "string" && /^[a-f0-9]{64}$/.test(expectedHash), `${shardPath} is absent from consumed source hashes`);
    const actualHash = sha256(shardText);
    assert(actualHash === expectedHash, `${shardPath} hash differs from the consumed public projection`);
    dossierHashes[shardPath] = actualHash;
    const shard = parseJson(shardText, shardPath);
    const defaults = shard.defaults && typeof shard.defaults === "object" && !Array.isArray(shard.defaults) ? shard.defaults : {};
    assert(Array.isArray(shard.companies), `${shardPath}: companies must be an array`);
    for (const rawCompany of shard.companies) {
      const company = { ...defaults, ...rawCompany };
      assert(typeof company.company_id === "string" && company.company_id.length > 0, `${shardPath}: missing company_id`);
      assert(!mappedCounts.has(company.company_id), `duplicate company_id ${company.company_id}`);
      assert(Array.isArray(company.repositories), `${company.company_id}: repositories must be an array`);
      mappedCounts.set(company.company_id, company.repositories.length);
    }
  }

  const publicIds = new Set(snapshot.companies.map((company) => company.company_id));
  assert(mappedCounts.size === publicIds.size, `canonical dossier count ${mappedCounts.size} differs from public projection count ${publicIds.size}`);
  for (const id of mappedCounts.keys()) assert(publicIds.has(id), `canonical dossier track ${id} is missing from public projection`);

  const tracks = snapshot.companies.map((company) => {
    assert(mappedCounts.has(company.company_id), `mapped count missing for ${company.company_id}`);
    const repositoryRecordCount = mappedCounts.get(company.company_id);
    assert(repositoryRecordCount >= company.repositories.length, `${company.company_id}: recruiter-admissible repositories exceed mapped records`);
    clusterFor(company.company_id);
    innovationFor(company.company_id);
    return { ...company, repository_record_count: repositoryRecordCount };
  });

  const dossierDigest = sha256(stableJson(dossierHashes));
  const summary = {
    schema: "glaciereq.company-atlas-public-summary.v1",
    source: {
      authority: "GlacierEQ/job-app-helix",
      source_commit: snapshot.source.root_ref,
      source_digest: snapshot.source.source_digest,
      dossier_digest: dossierDigest,
    },
    counts: {
      governed_tracks: tracks.length,
      mapped_repository_records: tracks.reduce((sum, track) => sum + track.repository_record_count, 0),
      recruiter_admissible_memberships: tracks.reduce((sum, track) => sum + track.repositories.length, 0),
    },
    tracks: tracks.map((track) => ({
      company_id: track.company_id,
      display_name: track.display_name,
      cluster: clusterFor(track.company_id),
      track_state: track.track_state,
      evidence_state: evidenceState(track),
      mapped_repository_records: track.repository_record_count,
      recruiter_admissible_repositories: track.repositories.length,
      design_hypothesis: innovationFor(track.company_id),
      design_hypothesis_basis: "PORTFOLIO_DESIGN_HYPOTHESIS_NOT_COMPANY_CLAIM",
      route: `/atlas/${slug(track.company_id)}/`,
    })),
  };

  await mkdir(path.dirname(SUMMARY_PATH), { recursive: true });
  await writeFile(SUMMARY_PATH, stableJson(summary), "utf8");
  await mkdir(ATLAS_DIR, { recursive: true });
  await writeFile(path.join(ATLAS_DIR, "index.html"), mainPage(tracks, snapshot, dossierDigest), "utf8");
  for (const company of tracks) {
    const dir = path.join(ATLAS_DIR, slug(company.company_id));
    await mkdir(dir, { recursive: true });
    await writeFile(path.join(dir, "index.html"), companyPage(company, snapshot.source.root_ref), "utf8");
  }
  await addCompanyUrlsToSitemap(tracks);

  console.log(JSON.stringify({
    schema: "glaciereq.company-constellation-render-receipt.v1",
    status: "PASS",
    source_commit: snapshot.source.root_ref,
    dossier_digest: dossierDigest,
    governed_tracks: tracks.length,
    mapped_repository_records: summary.counts.mapped_repository_records,
    recruiter_admissible_memberships: summary.counts.recruiter_admissible_memberships,
    company_pages: tracks.length,
    browser_javascript: 0,
  }, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack : error);
  process.exitCode = 1;
});

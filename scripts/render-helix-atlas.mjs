#!/usr/bin/env node

import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SNAPSHOT = path.join(ROOT, "site-v15", "data", "helix-root.json");
const SITE = path.join(ROOT, "site-v15");
const ATLAS_OUTPUT = path.join(SITE, "atlas", "index.html");
const COMPANIES_OUTPUT = path.join(SITE, "companies");
const REPOSITORY_PATTERN = /^GlacierEQ\/[A-Za-z0-9_.-]+$/;
const COMPANY_ID_PATTERN = /^[a-z0-9_]+$/;
const BASE = "https://casey-barton-glaciereq.vercel.app";

const POWER_LAYERS = [
  ["Silicon + compute", ["nvidia", "amd", "intel", "qualcomm", "groq", "cerebras", "coreweave"]],
  ["Cloud + infrastructure", ["aws", "microsoft", "google_deepmind", "oracle", "cloudflare", "vercel"]],
  ["Models + agent systems", ["openai", "anthropic", "xai", "mistral", "cohere", "deepseek", "kimi", "qwen", "meta"]],
  ["Platforms + knowledge", ["notion", "databricks", "snowflake", "salesforce", "adobe", "hugging_face", "perplexity", "lovable", "opera"]],
  ["Mission + autonomy", ["spacex", "palantir", "anduril", "lockheed_martin", "tesla", "waymo", "zoox", "blue_origin", "rocket_lab", "nasa", "robotics"]],
  ["Distribution + operators", ["apple", "scale_ai", "tasklet", "manus", "openclaw", "ibm", "glaciereq_core"]],
];

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

function repositoryParts(repository) {
  if (typeof repository !== "string" || !REPOSITORY_PATTERN.test(repository)) {
    throw new Error(`invalid repository identity: ${String(repository)}`);
  }
  const [owner, name] = repository.split("/");
  return { owner, name };
}

function repoUrl(repository) {
  const { owner, name } = repositoryParts(repository);
  return `https://github.com/${encodeURIComponent(owner)}/${encodeURIComponent(name)}`;
}

function companySlug(companyId) {
  if (typeof companyId !== "string" || !COMPANY_ID_PATTERN.test(companyId)) {
    throw new Error(`invalid company identity: ${String(companyId)}`);
  }
  return companyId.replaceAll("_", "-");
}

function companyRoute(companyId) {
  return `/companies/${companySlug(companyId)}/`;
}

function jsonLd(value) {
  return JSON.stringify(value).replaceAll("<", "\\u003c");
}

function companyPageSchema(company) {
  const route = companyRoute(company.company_id);
  const url = `${BASE}${route}`;
  const title = `${company.display_name} · GlacierEQ Company Intelligence`;
  const description = `Independent GlacierEQ technical alignment dossier for ${company.display_name}: current evidence, second-depth state, machine contract, and evolution mesh.`;
  return {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "@id": `${url}#webpage`,
    url,
    name: title,
    description,
    inLanguage: "en",
    isPartOf: {
      "@type": "WebSite",
      name: "Casey Barton · Applied AI Systems",
      url: `${BASE}/`,
    },
    about: {
      "@type": "Thing",
      name: company.display_name,
      description: company.recruiter_thesis,
    },
  };
}

function statusClass(state) {
  if (state === "PROMOTED") return "verified";
  if (state === "REFERENCE_ONLY") return "reviewed";
  return "blocked";
}

function evidenceState(company) {
  const count = company.repositories.length;
  const advanced = company.repositories.some((repo) => repo.level === "L4" || repo.level === "L5");
  if (count >= 2 || advanced) return "repository-rich";
  if (count === 1) return "seeded";
  return "scaffold";
}

function evidenceLabel(state) {
  return {
    "repository-rich": "Repository-rich",
    seeded: "Seeded",
    scaffold: "Scaffold",
  }[state];
}

function depthLabel(stage) {
  return String(stage ?? "MAPPED_ONLY")
    .toLowerCase()
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function requireSecondDepth(company) {
  const depth = company.second_depth;
  if (!depth || typeof depth !== "object" || Array.isArray(depth)) {
    throw new Error(`${company.company_id}: second-depth state is missing`);
  }
  if (!Number.isInteger(depth.ordinal) || typeof depth.stage !== "string") {
    throw new Error(`${company.company_id}: second-depth stage is invalid`);
  }
  if (typeof depth.claim_ceiling !== "string" || !depth.claim_ceiling) {
    throw new Error(`${company.company_id}: second-depth claim ceiling is missing`);
  }
  if (!Array.isArray(depth.blockers) || typeof depth.next_gate !== "string" || !depth.next_gate) {
    throw new Error(`${company.company_id}: second-depth gate state is invalid`);
  }
  if (!depth.evidence || typeof depth.evidence !== "object" || Array.isArray(depth.evidence)) {
    throw new Error(`${company.company_id}: second-depth evidence state is missing`);
  }
  return depth;
}

function flagshipCard(row, index) {
  if (typeof row.system_id !== "string" || row.system_id.length === 0) {
    throw new Error("flagship system_id must be a nonempty string");
  }
  return `<article class="card atlas-flagship">
    <div class="atlas-card-head"><span class="rank">${index + 1}</span><span class="status ${statusClass(row.state)}">${escapeHtml(row.level)} · ${escapeHtml(row.state)}</span></div>
    <h3>${escapeHtml(row.system_id.replaceAll("_", " "))}</h3>
    <p class="atlas-role">${escapeHtml(row.role)}</p>
    <p>${escapeHtml(row.evidence)}</p>
    <p class="atlas-gate"><strong>Next gate:</strong> ${escapeHtml(row.next_gate)}</p>
    <a class="button ghost small" href="${repoUrl(row.repository)}" target="_blank" rel="noopener">Inspect canonical repository</a>
  </article>`;
}

function constellationNode(company, index) {
  const state = evidenceState(company);
  const depth = requireSecondDepth(company);
  return `<a class="atlas-star star-p${index} ${state}" href="${companyRoute(company.company_id)}" aria-label="Open ${escapeHtml(company.display_name)} company intelligence" title="${escapeHtml(company.display_name)} · ${evidenceLabel(state)} · ${escapeHtml(depth.stage)}"><span class="star-core"></span><span class="star-label">${escapeHtml(company.display_name)} · ${escapeHtml(depthLabel(depth.stage))}</span></a>`;
}

/** Deterministic multi-ring positions for N stars (CSP-safe: classes only, no inline style). */
function generateStarPositionCss(count) {
  if (count < 1) return "/* no constellation stars */\n";
  const rules = [
    "/* AUTO-GENERATED by render-helix-atlas.mjs — do not edit by hand */",
    `/* ${count} governed company stars */`,
  ];
  // Ring radii (percent from center) grow outward as needed.
  const rings = [];
  let remaining = count;
  let ring = 0;
  while (remaining > 0) {
    const capacity = 12 + ring * 10;
    const take = Math.min(remaining, capacity);
    rings.push(take);
    remaining -= take;
    ring += 1;
  }
  let index = 0;
  for (let r = 0; r < rings.length; r += 1) {
    const n = rings[r];
    // Compress additional rings instead of pushing large company sets off-canvas.
    const radialStep = rings.length > 1 ? 30 / (rings.length - 1) : 0;
    const radius = 16 + r * radialStep;
    for (let i = 0; i < n; i += 1) {
      const angle = (Math.PI * 2 * i) / n - Math.PI / 2;
      const left = 50 + radius * Math.cos(angle);
      const top = 50 + radius * Math.sin(angle);
      rules.push(
        `.atlas-star.star-p${index}{left:${left.toFixed(3)}%;top:${top.toFixed(3)}%}`,
      );
      index += 1;
    }
  }
  return `${rules.join("\n")}\n`;
}

function directoryCard(company) {
  const state = evidenceState(company);
  const depth = requireSecondDepth(company);
  return `<a class="atlas-directory-item" href="${companyRoute(company.company_id)}"><span><strong>${escapeHtml(company.display_name)}</strong><small>${escapeHtml(company.track_state)} · ${escapeHtml(depth.stage)}</small></span><b class="evidence-state ${state}">${evidenceLabel(state)}</b></a>`;
}

function powerMap(companies) {
  const byId = new Map(companies.map((company) => [company.company_id, company]));
  const used = new Set();
  const layers = POWER_LAYERS.map(([label, ids]) => {
    const links = ids
      .map((id) => byId.get(id))
      .filter(Boolean)
      .map((company) => {
        used.add(company.company_id);
        return `<a href="${companyRoute(company.company_id)}">${escapeHtml(company.display_name)}</a>`;
      })
      .join("");
    return `<div class="power-layer"><strong>${escapeHtml(label)}</strong><div>${links || '<span class="muted">No current public track</span>'}</div></div>`;
  }).join("");
  const other = companies.filter((company) => !used.has(company.company_id));
  const remainder = other.length
    ? `<div class="power-layer"><strong>Other governed targets</strong><div>${other.map((company) => `<a href="${companyRoute(company.company_id)}">${escapeHtml(company.display_name)}</a>`).join("")}</div></div>`
    : "";
  return `${layers}${remainder}`;
}

function repoEvidence(repo) {
  const { name } = repositoryParts(repo.repository);
  return `<li><div><a href="${repoUrl(repo.repository)}" target="_blank" rel="noopener">${escapeHtml(name)}</a><small>${escapeHtml(repo.repository)}</small></div><span class="status ${statusClass(repo.promotion_state)}">${escapeHtml(repo.level)} · ${escapeHtml(repo.promotion_state)}</span></li>`;
}

function compactMachineRecord(company, state) {
  const depth = requireSecondDepth(company);
  return {
    schema: "glaciereq.company-intelligence.v1",
    id: company.company_id,
    route: companyRoute(company.company_id),
    state,
    track: company.track_state,
    roles: company.target_roles ?? [],
    repos: company.repositories.map((repo) => ({
      id: repo.repository,
      lvl: repo.level,
      state: repo.promotion_state,
      provenance: repo.provenance_state,
    })),
    flagships: company.applicable_flagships ?? [],
    second_depth: depth,
    gate: company.gap_or_next_gate,
    boundary: company.non_affiliation,
  };
}

function machineWire(company, state) {
  const record = compactMachineRecord(company, state);
  const repos = record.repos
    .map((repo) => `${repo.id}|${repo.lvl}|${repo.state}|${repo.provenance}`)
    .join(";") || "∅";
  const roles = record.roles.join("|") || "∅";
  const flagships = record.flagships.join("|") || "∅";
  const blockers = record.second_depth.blockers.join("|") || "∅";
  return `GEQ.CI/1 id=${record.id} state=${state} track=${record.track}\nROLE[${roles}]\nREPO[${repos}]\nFLAGSHIP[${flagships}]\nDEPTH[${record.second_depth.stage}|${record.second_depth.claim_ceiling}]\nBLOCKER[${blockers}]\nHOOK route=${record.route} json=${record.route}record.json\nNEXT ${record.second_depth.next_gate}`;
}

function depthTimeline(company, stageOrder) {
  const depth = requireSecondDepth(company);
  return stageOrder
    .map((stage) => {
      const marker = stage.ordinal < depth.ordinal ? "✓" : stage.ordinal === depth.ordinal ? "CURRENT" : "□";
      return `<li><strong>${escapeHtml(marker)}</strong> ${escapeHtml(depthLabel(stage.id))}<br><small>${escapeHtml(stage.public_claim_ceiling)}</small></li>`;
    })
    .join("");
}

function blockerList(company) {
  const depth = requireSecondDepth(company);
  return depth.blockers.length
    ? `<ul class="evolution-list">${depth.blockers.map((blocker) => `<li>${escapeHtml(blocker)}</li>`).join("")}</ul>`
    : `<p class="empty-state">No unresolved blocker is recorded at the current stage.</p>`;
}

function companyPage(company, stageOrder) {
  const state = evidenceState(company);
  const depth = requireSecondDepth(company);
  const repos = company.repositories.map(repoEvidence).join("");
  const flagships = Array.isArray(company.applicable_flagships) ? company.applicable_flagships : [];
  const roleChips = (company.target_roles ?? []).map((role) => `<span>${escapeHtml(role)}</span>`).join("");
  const meshLinks = [
    ...company.repositories.map((repo) => `<li><span>ALIGNS_WITH</span><a href="${repoUrl(repo.repository)}" target="_blank" rel="noopener">${escapeHtml(repo.repository)}</a></li>`),
    ...flagships.map((flagship) => `<li><span>TRANSFERABLE_CAPABILITY</span><a href="/atlas/#crown-jewels">${escapeHtml(flagship)}</a></li>`),
  ].join("");
  const evidenceSummary = company.repositories.length
    ? `${company.repositories.length} recruiter-admitted public ${company.repositories.length === 1 ? "repository" : "repositories"} currently map to this company lens.`
    : "No company-specific repository is currently admitted to the public recruiter surface. Transferable personal flagships may still be relevant, but they are not company adoption evidence.";

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
  <meta name="theme-color" content="#03080b">
  <meta name="description" content="Independent GlacierEQ technical alignment dossier for ${escapeHtml(company.display_name)}: current evidence, second-depth state, machine contract, and evolution mesh.">
  <meta name="robots" content="index,follow">
  <link rel="canonical" href="https://casey-barton-glaciereq.vercel.app${companyRoute(company.company_id)}">
  <title>${escapeHtml(company.display_name)} · GlacierEQ Company Intelligence</title>
  <link rel="icon" href="/assets/favicon.svg" type="image/svg+xml">
  <link rel="stylesheet" href="/assets/site.css">
  <link rel="stylesheet" href="/assets/site.systems.css">
  <link rel="stylesheet" href="/assets/helix-atlas.css">
  <script type="application/ld+json" data-company-intelligence-schema="v1">${jsonLd(companyPageSchema(company))}</script>
</head>
<body>
<a class="skip" href="#main">Skip to content</a>
<div class="signal-bar"><div class="shell signal-inner"><span class="signal-live">COMPANY INTELLIGENCE · ${escapeHtml(evidenceLabel(state).toUpperCase())}</span><span>${escapeHtml(depth.stage)} · claim ceiling ${escapeHtml(depth.claim_ceiling)}</span></div></div>
<header class="site-header"><div class="shell nav"><a class="brand" href="/" aria-label="Casey Barton portfolio home"><span class="mark">CB</span><span><strong>CASEY BARTON</strong><small>APPLIED AI SYSTEMS ARCHITECT</small></span></a><nav class="links" aria-label="Primary navigation"><a href="/">Recruiter</a><a href="/resume/">Résumé</a><a href="/master/">Master</a><a href="/mesh/">Mesh</a><a href="/atlas/">Atlas</a><a href="/machine/">Machine</a></nav><a class="nav-cta" href="mailto:glacier.equilibrium@gmail.com">Start a conversation</a></div></header>
<main id="main">
<section class="company-hero"><div class="shell company-hero-grid"><div><p class="eyebrow">INDEPENDENT COMPANY LENS · ${escapeHtml(evidenceLabel(state).toUpperCase())}</p><h1>${escapeHtml(company.display_name)}</h1><p class="lead">${escapeHtml(company.recruiter_thesis)}</p><div class="company-role-chips">${roleChips}</div></div><aside class="card company-state-card"><span class="evidence-state ${state}">${evidenceLabel(state)}</span><strong>${company.repositories.length}</strong><p>direct public evidence ${company.repositories.length === 1 ? "repository" : "repositories"}</p><small>${escapeHtml(company.track_state)}</small><p><strong>Second depth:</strong> ${escapeHtml(depthLabel(depth.stage))}</p><small>claim ceiling · ${escapeHtml(depth.claim_ceiling)}</small></aside></div></section>
<section class="section company-layer" id="recruiter"><div class="shell"><div class="layer-heading"><span>01 · RECRUITER</span><h2>What matters to this operating environment.</h2></div><div class="company-two-col"><article class="card"><h3>Alignment thesis</h3><p>${escapeHtml(company.recruiter_thesis)}</p><p>${escapeHtml(evidenceSummary)}</p></article><article class="card boundary-card"><h3>Truth boundary</h3><p>${escapeHtml(company.non_affiliation)}</p><p><strong>Current public claim ceiling:</strong> ${escapeHtml(depth.claim_ceiling)}</p></article></div></div></section>
<section class="section alt company-layer" id="master"><div class="shell"><div class="layer-heading"><span>02 · MASTER</span><h2>Innovation, architecture, and the governed second-depth gate.</h2></div><div class="company-two-col"><article class="card"><h3>Role-specific engineering frame</h3><p>The current dossier identifies the domain and public evidence subset without pretending that company-level bottlenecks have already been proven. Second depth advances only through pinned public evidence: role → externally supportable problem → inspected repository → bounded remedy → implementation receipt → reproduced proof → promoted claim.</p><h3>Current repository evidence</h3>${repos ? `<ul class="company-repo-ledger">${repos}</ul>` : `<p class="empty-state">No direct repository is recruiter-admitted yet. This is an engineering queue, not a reason to invent proof.</p>`}</article><article class="card aspiration-card"><p class="eyebrow">SECOND-DEPTH STATE</p><h3>${escapeHtml(depthLabel(depth.stage))}</h3><p><strong>Claim ceiling:</strong> ${escapeHtml(depth.claim_ceiling)}</p><h3>Blocking conditions</h3>${blockerList(company)}<p><strong>Next gate:</strong> ${escapeHtml(depth.next_gate)}</p></article></div></div></section>
<section class="section company-layer" id="machine"><div class="shell"><div class="layer-heading"><span>03 · MACHINE</span><h2>Dense integration contract.</h2></div><div class="card machine-contract"><div class="machine-contract-head"><p>Compact wire view for agents and tooling. The structured record carries the same second-depth state and public-safe evidence references.</p><a class="button ghost small" href="record.json">record.json</a></div><pre>${escapeHtml(machineWire(company, state))}</pre><p class="machine-hook">Consumer path: discover route → inspect record → follow pinned public evidence → verify native receipts/tests → respect stage prerequisites, blockers, claim ceiling, and non-affiliation boundary.</p></div></div></section>
<section class="section alt company-layer" id="mesh"><div class="shell"><div class="layer-heading"><span>04 · MESH</span><h2>One node in the larger GlacierEQ system.</h2></div><div class="company-two-col"><article class="card"><h3>Relationships</h3>${meshLinks ? `<ul class="mesh-edge-list">${meshLinks}</ul>` : `<p class="empty-state">No direct public repository edge is admitted yet.</p>`}<p><a href="/mesh/">Open the estate-wide Mesh →</a></p><h3>Current blockers</h3>${blockerList(company)}</article><article class="card evolution-card"><p class="eyebrow">ASPIRATION &amp; EVOLUTION</p><h3>Governed promotion path</h3><ol class="evolution-list">${depthTimeline(company, stageOrder)}</ol><p><strong>Current stage:</strong> ${escapeHtml(depth.stage)}</p><p><strong>Next gate:</strong> ${escapeHtml(depth.next_gate)}</p><p>The path does not advance because a company name, repository, or aspiration exists. It advances only when the upstream Helix state carries the required pinned public evidence.</p></article></div></div></section>
<section class="section tight"><div class="shell callout"><p class="eyebrow">RETURN TO THE CONSTELLATION</p><h2>Company intelligence is one projection of the same governed portfolio.</h2><div class="actions"><a class="button primary" href="/atlas/">Open Company Atlas</a><a class="button ghost" href="/machine/">Machine contracts</a><a class="button ghost" href="/mesh/">System mesh</a></div></div></section>
</main>
<footer class="site-footer"><div class="shell"><p><strong>Casey Barton · GlacierEQ</strong></p><p>${escapeHtml(company.non_affiliation)}</p></div></footer>
</body>
</html>\n`;
}

async function loadSnapshot() {
  try {
    const text = await readFile(SNAPSHOT, "utf8");
    const snapshot = JSON.parse(text);
    if (!snapshot || typeof snapshot !== "object" || Array.isArray(snapshot)) {
      throw new Error("snapshot must contain an object");
    }
    return snapshot;
  } catch (error) {
    throw new Error(`failed to load helix-root.json: ${error instanceof Error ? error.message : String(error)}`);
  }
}

async function writeCompanyRoutes(companies, stageOrder) {
  await rm(COMPANIES_OUTPUT, { recursive: true, force: true });
  for (const company of companies) {
    const slug = companySlug(company.company_id);
    const directory = path.join(COMPANIES_OUTPUT, slug);
    await mkdir(directory, { recursive: true });
    const state = evidenceState(company);
    await writeFile(path.join(directory, "index.html"), companyPage(company, stageOrder), "utf8");
    await writeFile(
      path.join(directory, "record.json"),
      stableJson(compactMachineRecord(company, state)),
      "utf8",
    );
  }
}

async function main() {
  const snapshot = await loadSnapshot();
  if (snapshot.schema !== "glaciereq.public-portfolio-projection.v1") {
    throw new Error("invalid Helix public projection schema");
  }
  if (!Array.isArray(snapshot.flagships) || !Array.isArray(snapshot.companies)) {
    throw new Error("Helix projection must contain flagship and company arrays");
  }
  const stageOrder = snapshot.company_second_depth?.stage_order;
  if (!Array.isArray(stageOrder) || stageOrder.length !== 8) {
    throw new Error("Helix projection must contain the eight-stage company second-depth contract");
  }

  const companies = [...snapshot.companies].sort((a, b) => a.display_name.localeCompare(b.display_name));
  for (const company of companies) {
    companySlug(company.company_id);
    if (!Array.isArray(company.repositories)) {
      throw new Error(`${company.company_id}: repositories must be an array`);
    }
    requireSecondDepth(company);
  }

  const publicMemberships = companies.reduce((count, company) => count + company.repositories.length, 0);
  const rich = companies.filter((company) => evidenceState(company) === "repository-rich").length;
  const seeded = companies.filter((company) => evidenceState(company) === "seeded").length;
  const scaffold = companies.filter((company) => evidenceState(company) === "scaffold").length;
  const advancedDepth = companies.filter((company) => company.second_depth.ordinal > 0).length;

  const starsCssPath = path.join(SITE, "assets", "helix-atlas.stars.css");
  await writeFile(starsCssPath, generateStarPositionCss(companies.length), "utf8");

  const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
  <meta name="theme-color" content="#03080b">
  <meta name="description" content="Interactive Company Atlas for the GlacierEQ portfolio: a script-free constellation of governed company lenses, evidence states, second-depth progression, system relationships, and real deep links.">
  <meta name="robots" content="index,follow">
  <link rel="canonical" href="https://casey-barton-glaciereq.vercel.app/atlas/">
  <title>Company Atlas · Casey Barton</title>
  <link rel="icon" href="/assets/favicon.svg" type="image/svg+xml">
  <link rel="stylesheet" href="/assets/site.css">
  <link rel="stylesheet" href="/assets/site.systems.css">
  <link rel="stylesheet" href="/assets/helix-atlas.css">
  <link rel="stylesheet" href="/assets/helix-atlas.stars.css">
</head>
<body>
<a class="skip" href="#main">Skip to content</a>
<div class="signal-bar"><div class="shell signal-inner"><span class="signal-live">HELIX ROOT TRUTH · COMPANY ATLAS</span><span>${companies.length} governed company lenses · ${advancedDepth} past mapping · zero client scripts</span></div></div>
<header class="site-header"><div class="shell nav"><a class="brand" href="/" aria-label="Casey Barton portfolio home"><span class="mark">CB</span><span><strong>CASEY BARTON</strong><small>APPLIED AI SYSTEMS ARCHITECT</small></span></a><nav class="links" aria-label="Primary navigation"><a href="/">Recruiter</a><a href="/resume/">Résumé</a><a href="/master/">Master</a><a href="/mesh/">Mesh</a><a aria-current="page" href="/atlas/">Atlas</a><a href="/machine/">Machine</a></nav><a class="nav-cta" href="mailto:glacier.equilibrium@gmail.com">Start a conversation</a></div></header>
<main id="main">
<section class="hero atlas-hero"><div class="shell"><p class="eyebrow">COMPANY INTELLIGENCE · REAL ROUTES · GOVERNED SECOND DEPTH</p><h1>Choose a star. <em>Follow the proof.</em></h1><p class="lead">The constellation is a navigation surface over the same Helix-governed portfolio graph. Every star is a real, keyboard-accessible link. Every company page now carries both repository evidence state and a separate second-depth state whose claim ceiling can advance only through pinned public evidence.</p><div class="proof-strip" aria-label="Atlas scope"><div><b>${companies.length}</b><span>governed company lenses</span></div><div><b>${publicMemberships}</b><span>direct public memberships</span></div><div><b>${rich}</b><span>repository-rich</span></div><div><b>${seeded}</b><span>seeded</span></div><div><b>${scaffold}</b><span>scaffold</span></div><div><b>${advancedDepth}</b><span>past mapped-only</span></div></div><div class="actions"><a class="button primary" href="#constellation">Enter constellation</a><a class="button secondary" href="#power-map">Open power map</a><a class="button ghost" href="/data/helix-root.json">Inspect root snapshot</a></div></div></section>
<section id="constellation" class="section constellation-section"><div class="shell"><div class="section-head"><div><p class="eyebrow">CONSTELLATION MODE</p><h2>The ecosystem as a navigable field.</h2></div><p>Stars are positioned across multi-ring orbits for dense scanning (${companies.length} live tracks). Pointer precision is optional: the directory is the complete accessibility fallback and browser find provides instant text lookup without weakening the site’s no-script CSP.</p></div><div class="constellation-layout"><div class="constellation-stage" aria-label="Company constellation">${companies.map((company, index) => constellationNode(company, index)).join("")}<div class="constellation-core" aria-hidden="true"><span>GLACIEREQ</span><b>COMPANY<br>ATLAS</b></div><div class="orbit orbit-1" aria-hidden="true"></div><div class="orbit orbit-2" aria-hidden="true"></div><div class="orbit orbit-3" aria-hidden="true"></div></div><aside class="constellation-directory"><div class="directory-head"><p class="eyebrow">DIRECTORY</p><h3>All company lenses</h3><p>${evidenceLabel("repository-rich")} = multiple/direct advanced public evidence; Seeded = one direct public evidence repo; Scaffold = no company-specific repo admitted yet. The line beneath each company separately reports its Helix track and second-depth stage.</p></div><div class="atlas-directory">${companies.map(directoryCard).join("")}</div></aside></div></div></section>
<section id="power-map" class="section alt"><div class="shell"><div class="section-head"><div><p class="eyebrow">POWER-MAP MODE</p><h2>See where each target sits in the operating stack.</h2></div><p>This is an orientation layer, not a claim that the categories are exclusive or that GlacierEQ has company access. Each name resolves to the same governed company intelligence route.</p></div><div class="power-map">${powerMap(companies)}</div></div></section>
<section id="crown-jewels" class="section"><div class="shell"><div class="section-head"><div><p class="eyebrow">CROWN JEWELS</p><h2>Systems with a governed public proof path.</h2></div><p>The company constellation does not replace native repository proof. It points back into systems whose evidence state and next promotion gate are explicit.</p></div><div class="atlas-grid">${snapshot.flagships.map(flagshipCard).join("")}</div></div></section>
<section class="section tight"><div class="shell callout"><p class="eyebrow">SECOND-DEPTH CONTRACT</p><h2>Mapping is not proof. Progress is a governed state transition.</h2><p>${escapeHtml(snapshot.company_second_depth.boundary)}</p><p>The eight stages are ${stageOrder.map((row) => escapeHtml(row.id)).join(" → ")}. A missing upstream override means MAPPED_ONLY, never completion.</p></div></section>
<section class="section tight"><div class="shell callout"><p class="eyebrow">PUBLICATION CONTRACT</p><h2>Beauty on top. Truth underneath.</h2><p>Company names identify independent target domains. The build publishes only public-safe Helix fields; no affiliation, endorsement, employment, proprietary access, contract relationship, clearance, production adoption, or unsupported business impact is implied. Company pages remain useful even at Scaffold / MAPPED_ONLY because the Mesh records the exact next gate rather than pretending the work is finished.</p><div class="actions"><a class="button primary" href="https://github.com/GlacierEQ/job-app-helix" target="_blank" rel="noopener">Inspect Job App Helix</a><a class="button ghost" href="/machine/">Read machine contracts</a><a class="button ghost" href="/mesh/">Open the Mesh</a></div></div></section>
</main>
<footer class="site-footer"><div class="shell"><p><strong>Casey Barton · GlacierEQ</strong></p><p>Independent systems work. Company alignment does not imply affiliation, endorsement, employment, proprietary access, contract relationship, clearance, or production deployment.</p></div></footer>
</body>
</html>\n`;

  await mkdir(path.dirname(ATLAS_OUTPUT), { recursive: true });
  await writeFile(ATLAS_OUTPUT, html, "utf8");
  await writeCompanyRoutes(companies, stageOrder);
  console.log(
    `Company Atlas rendered: ${path.relative(ROOT, ATLAS_OUTPUT)} + ${companies.length} company routes; ${advancedDepth} past MAPPED_ONLY`,
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack : error);
  process.exitCode = 1;
});

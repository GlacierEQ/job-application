#!/usr/bin/env node

import { mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { sourceBackedCapabilitiesForCompany } from "./recovered-forward-deployed-source-links.mjs";
import { admittedAtlasCompany } from "./public-atlas-admission.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SNAPSHOT = path.join(ROOT, "site-v15", "data", "helix-root.json");
const ESTATE_INTELLIGENCE = path.join(ROOT, "site-v15", "data", "estate-intelligence.json");
const SITE = path.join(ROOT, "site-v15");
const ATLAS_OUTPUT = path.join(SITE, "atlas", "index.html");
const COMPANIES_OUTPUT = path.join(SITE, "companies");
const REPOSITORY_PATTERN = /^GlacierEQ\/[A-Za-z0-9_.-]+$/;
const COMPANY_ID_PATTERN = /^[a-z0-9_]+$/;
const CHECK = process.argv.includes("--check");
const ESTATE_START = "<!-- ESTATE_INTELLIGENCE_START -->";
const ESTATE_END = "<!-- ESTATE_INTELLIGENCE_END -->";

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

function statusClass(state) {
  if (state === "PROMOTED") return "verified";
  if (state === "REFERENCE_ONLY") return "reviewed";
  return "blocked";
}

function evidenceState(company) {
  // Count distinct, publicly admitted repository identities, not duplicated
  // snapshot rows or internal-only inventory entries.
  const eligible = company.repositories.filter((repo) =>
    repo && repo.visibility === "public" &&
    repo.inventory_scope === "HELIX_ADMITTED" &&
    typeof repo.repository === "string" &&
    REPOSITORY_PATTERN.test(repo.repository));
  const count = new Set(eligible.map((repo) => repo.repository.toLowerCase())).size;
  const advanced = eligible.some((repo) => repo.level === "L4" || repo.level === "L5");
  if (count >= 2 || advanced) return "repository-rich";
  if (count === 1) return "seeded";
  return "scaffold";
}
function evidenceLabel(state) {
  return {
    "repository-rich": "Verified Track",
    seeded: "Active Lens",
    scaffold: "Research Queue",
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
  const publicRepoCount = new Set(company.repositories
    .filter((repo) => repo && repo.visibility === "public" &&
      repo.inventory_scope === "HELIX_ADMITTED" &&
      typeof repo.repository === "string" && REPOSITORY_PATTERN.test(repo.repository))
    .map((repo) => repo.repository.toLowerCase())).size;
  const repoSummary = publicRepoCount > 0
    ? `${publicRepoCount} public ${publicRepoCount === 1 ? "repo" : "repos"}`
    : depth.ordinal > 0
      ? "Promoted reference track"
      : "Target domain lens";
  return `<a class="atlas-directory-item" href="${companyRoute(company.company_id)}"><span><strong>${escapeHtml(company.display_name)}</strong><small>${escapeHtml(repoSummary)} · ${escapeHtml(depthLabel(depth.stage))}</small></span><b class="evidence-state ${state}">${evidenceLabel(state)}</b></a>`;
}

function renderDirectoryList(companies) {
  const active = companies.filter((company) => evidenceState(company) !== "scaffold" || company.second_depth.ordinal > 0);
  const queued = companies.filter((company) => evidenceState(company) === "scaffold" && company.second_depth.ordinal === 0);
  const rank = (company) => {
    const state = evidenceState(company);
    if (company.second_depth.ordinal > 0) return 0;
    if (state === "repository-rich") return 1;
    if (state === "seeded") return 2;
    return 3;
  };
  active.sort((a, b) => rank(a) - rank(b) || a.display_name.localeCompare(b.display_name));
  const activeHtml = active.map(directoryCard).join("");
  if (queued.length === 0) return activeHtml;
  return `${activeHtml}<details class="atlas-scaffold-drawer"><summary>Show ${queued.length} additional target domains (research queue)</summary><div class="atlas-scaffold-list">${queued.map(directoryCard).join("")}</div></details>`;
}

function companyIndexPage(companies) {
  const rich = companies.filter((company) => evidenceState(company) === "repository-rich").length;
  const seeded = companies.filter((company) => evidenceState(company) === "seeded").length;
  const scaffold = companies.filter((company) => evidenceState(company) === "scaffold").length;
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
  <meta name="theme-color" content="#03080b">
  <meta name="description" content="Company intelligence index for Casey Barton's GlacierEQ portfolio: real /companies/<slug>/ dossiers and the Atlas constellation.">
  <meta name="robots" content="index,follow">
  <link rel="canonical" href="https://casey-barton-glaciereq.vercel.app/companies/">
  <title>Company tracks · Casey Barton</title>
  <link rel="icon" href="/assets/favicon.svg" type="image/svg+xml">
  <link rel="stylesheet" href="/assets/site.css">
  <link rel="stylesheet" href="/assets/site.systems.css">
  <link rel="stylesheet" href="/assets/helix-atlas.css">
</head>
<body>
<a class="skip" href="#main">Skip to content</a>
<div class="signal-bar"><div class="shell signal-inner"><span class="signal-live">COMPANY INDEX · GOVERNED TRACKS</span><span>${companies.length} lenses · Atlas is the map</span></div></div>
<header class="site-header"><div class="shell nav"><a class="brand" href="/" aria-label="Casey Barton portfolio home"><span class="mark">CB</span><span><strong>CASEY BARTON</strong><small>APPLIED AI SYSTEMS ARCHITECT</small></span></a><nav class="links" aria-label="Primary navigation"><a href="/">Recruiter</a><a href="/hire/">Hire</a><a href="/resume/">Résumé</a><a href="/master/">Master</a><a href="/companies/" aria-current="page">Companies</a><a href="/atlas/">Atlas</a></nav><a class="nav-cta" href="mailto:glacier.equilibrium@gmail.com">Start a conversation</a></div></header>
<main id="main">
<section class="hero atlas-hero"><div class="shell"><p class="eyebrow">COMPANY INTELLIGENCE · INDEX DOOR</p><h1>Company tracks. Atlas is the map.</h1><p class="lead">Each verified track opens a four-layer technical dossier. The constellation, power map, and second-depth contract live on Atlas. Alignment reflects independent engineering analysis and carries no implied affiliation, employment, or endorsement.</p><div class="proof-strip" aria-label="Company index scope"><div><b>${companies.length}</b><span>governed company lenses</span></div><div><b>${rich}</b><span>verified tracks</span></div><div><b>${seeded}</b><span>active lenses</span></div><div><b>${scaffold}</b><span>queued targets</span></div></div><div class="actions"><a class="button primary" href="/atlas/">Open Company Atlas</a><a class="button secondary" href="/hire/">Hire door</a><a class="button ghost" href="/resume/">Résumé</a></div></div></section>
<section class="section"><div class="shell"><div class="section-head"><div><p class="eyebrow">DIRECTORY</p><h2>Verified tracks first; research queue tucked below.</h2></div><p>Verified Track = multiple or advanced public repositories. Active Lens = direct public repository. Additional target domains remain accessible inside the expandable research queue.</p></div><div class="atlas-directory">${renderDirectoryList(companies)}</div></div></section>
</main>
<footer class="site-footer"><div class="shell"><p><strong>Casey Barton · GlacierEQ</strong></p><p>Independent systems work. Company names identify target domains. They do not imply affiliation, endorsement, employment, proprietary access, contract relationship, clearance, or production deployment.</p></div></footer>
</body>
</html>\n`;
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

function bundledCapabilityEvidence(capability) {
  return `<li class="source-backed-capability"><div><a href="${escapeHtml(capability.source_url)}" target="_blank" rel="noopener">${escapeHtml(capability.name)}</a><small>${escapeHtml(capability.source_repository)} · Bundled source; standalone repository not published</small></div><span class="status reviewed">${escapeHtml(capability.evidence_state)}</span></li>`;
}

function admittedPublicRepositories(company) {
  return company.repositories.filter((repo, index, all) =>
    repo && repo.visibility === "public" &&
    repo.inventory_scope === "HELIX_ADMITTED" &&
    typeof repo.repository === "string" &&
    REPOSITORY_PATTERN.test(repo.repository) &&
    all.findIndex((candidate) => typeof candidate?.repository === "string" &&
      candidate.repository.toLowerCase() === repo.repository.toLowerCase() &&
      candidate.visibility === "public" && candidate.inventory_scope === "HELIX_ADMITTED") === index);
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
    repos: admittedPublicRepositories(company)
      .map((repo) => ({
        id: repo.repository,
        lvl: repo.level,
        state: repo.promotion_state,
        provenance: repo.provenance_state,
      })),
    flagships: company.applicable_flagships ?? [],
    bundled_capabilities: sourceBackedCapabilitiesForCompany(company.company_id),
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
  const bundledSources = record.bundled_capabilities.map((entry) => `${entry.name}|${entry.evidence_state}|${entry.source_url}`).join(";") || "∅";
  return `GEQ.CI/1 id=${record.id} state=${state} track=${record.track}\nROLE[${roles}]\nREPO[${repos}]\nBUNDLED_SOURCE[${bundledSources}]\nFLAGSHIP[${flagships}]\nDEPTH[${record.second_depth.stage}|${record.second_depth.claim_ceiling}]\nBLOCKER[${blockers}]\nHOOK route=${record.route} json=${record.route}record.json\nNEXT ${record.second_depth.next_gate}`;
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

function estateIntelligenceCompanyBlock(record) {
  if (!record) return "";
  const sourceLinks = (record.official_sources ?? [])
    .map(
      (source) => `<li><a href="${escapeHtml(source.url)}" target="_blank" rel="noopener">${escapeHtml(source.title)}</a><br><small>${escapeHtml(source.publisher)} · observed signal: ${escapeHtml(source.observed_signal)}</small></li>`,
    )
    .join("");
  return `\n${ESTATE_START}
<section class="section company-layer estate-intelligence" id="estate-intelligence">
  <div class="shell">
    <div class="layer-heading"><span>ESTATE INTELLIGENCE · SOURCE-BOUND</span><h2>Operating pressure → engineering intervention.</h2></div>
    <p class="muted"><strong>Source-bound snapshot:</strong> Independent engineering analysis separating official public signals from GlacierEQ architectural hypotheses.</p>
    <div class="company-two-col">
      <article class="card"><h3>Observed current pressure</h3><p>${escapeHtml(record.observed_current_pressure)}</p><h3>Official signals</h3><ul class="evolution-list">${sourceLinks}</ul></article>
      <article class="card"><h3>GlacierEQ bottleneck inference</h3><p>${escapeHtml(record.inferred_bottleneck)}</p><p><strong>Brick wall:</strong> ${escapeHtml(record.inferred_brick_wall)}</p><p><strong>Inference boundary:</strong> ${escapeHtml(record.inference_boundary)}</p></article>
    </div>
    <div class="company-two-col">
      <article class="card"><h3>Intervention mechanism</h3><p>${escapeHtml(record.leverage_mechanism)}</p><p><strong>Expected impact:</strong> ${escapeHtml(record.expected_impact)}</p></article>
      <article class="card"><h3>Application move</h3><p>${escapeHtml(record.application_move)}</p><p><strong>Next deep dive:</strong> ${escapeHtml(record.next_deep_dive)}</p></article>
    </div>
  </div>
</section>
${ESTATE_END}`;
}

function estateIntelligenceAtlasBlock(publicRecordCount) {
  if (publicRecordCount === null) return "";
  return `\n${ESTATE_START}
<section class="section company-layer estate-intelligence" id="operating-intelligence">
  <div class="shell">
    <div class="layer-heading"><span>OPERATING INTELLIGENCE</span><h2>${publicRecordCount} source-bound company pressure dossiers.</h2></div>
    <div class="company-two-col">
      <article class="card"><h3>Observed ≠ inferred</h3><p>Official-source observations remain distinct from GlacierEQ bottleneck, brick-wall, leverage, and intervention hypotheses. Every company page carries that boundary.</p></article>
      <article class="card"><h3>V23 Canonical Build · November 2026</h3><p>Independent engineering analysis compiled from pinned public sources. Live company conditions are refreshed at application time; alignment carries no implied affiliation or endorsement.</p></article>
    </div>
  </div>
</section>
${ESTATE_END}`;
}

async function loadEstateIntelligence(expectedCommit) {
  try {
    const text = await readFile(ESTATE_INTELLIGENCE, "utf8");
    const parsed = JSON.parse(text);
    if (
      parsed?.schema !== "glaciereq.public-estate-intelligence.v1" ||
      parsed?.source?.authority_commit !== expectedCommit ||
      !Array.isArray(parsed.records)
    ) {
      return { byCompany: new Map(), count: null };
    }
    return {
      byCompany: new Map(parsed.records.map((row) => [row.company_id, row])),
      count: parsed.records.length,
    };
  } catch (error) {
    if (error?.code === "ENOENT") return { byCompany: new Map(), count: null };
    throw error;
  }
}

function companyPage(company, stageOrder, estateRecord = null) {
  const state = evidenceState(company);
  const depth = requireSecondDepth(company);
  const publicRepos = admittedPublicRepositories(company);
  const repos = publicRepos.map(repoEvidence).join("");
  const bundledCapabilities = sourceBackedCapabilitiesForCompany(company.company_id);
  const bundledSection = bundledCapabilities.length
    ? `<section class="section company-layer" id="source-backed-capabilities"><div class="shell"><div class="layer-heading"><span>SOURCE LINEAGE · NOT STANDALONE REPOSITORIES</span><h2>Additional public implementations recovered from the Helix codebase.</h2></div><p>These are historical capability names with source code bundled inside job-app-helix, not separate GitHub repositories or verified vehicle/GPU deployments. They are preserved independently of direct repository membership and recruiter promotion.</p><ul class="company-repo-ledger">${bundledCapabilities.map(bundledCapabilityEvidence).join("")}</ul></div></section>`
    : "";
  const flagships = Array.isArray(company.applicable_flagships) ? company.applicable_flagships : [];
  const roleChips = (company.target_roles ?? []).map((role) => `<span>${escapeHtml(role)}</span>`).join("");
  const meshLinks = [
    ...publicRepos
      .map((repo) => `<li><span>ALIGNS_WITH</span><a href="${repoUrl(repo.repository)}" target="_blank" rel="noopener">${escapeHtml(repo.repository)}</a></li>`),
    ...flagships.map((flagship) => `<li><span>TRANSFERABLE_CAPABILITY</span><a href="/atlas/#crown-jewels">${escapeHtml(flagship)}</a></li>`),
  ].join("");
  const evidenceSummary = publicRepos.length
    ? `${publicRepos.length} recruiter-admitted public ${publicRepos.length === 1 ? "repository" : "repositories"} currently map to this company lens.`
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
</head>
<body>
<a class="skip" href="#main">Skip to content</a>
<div class="signal-bar"><div class="shell signal-inner"><span class="signal-live">COMPANY INTELLIGENCE · ${escapeHtml(evidenceLabel(state).toUpperCase())}</span><span>${escapeHtml(depth.stage)} · claim ceiling ${escapeHtml(depth.claim_ceiling)}</span></div></div>
<header class="site-header"><div class="shell nav"><a class="brand" href="/" aria-label="Casey Barton portfolio home"><span class="mark">CB</span><span><strong>CASEY BARTON</strong><small>APPLIED AI SYSTEMS ARCHITECT</small></span></a><nav class="links" aria-label="Primary navigation"><a href="/">Recruiter</a><a href="/hire/">Hire</a><a href="/resume/">Résumé</a><a href="/master/">Master</a><a href="/mesh/">Mesh</a><a href="/companies/">Companies</a><a href="/atlas/">Atlas</a><a href="/machine/">Machine</a></nav><a class="nav-cta" href="mailto:glacier.equilibrium@gmail.com">Start a conversation</a></div></header>
<main id="main">
<section class="company-hero"><div class="shell company-hero-grid"><div><p class="eyebrow">INDEPENDENT COMPANY LENS · ${escapeHtml(evidenceLabel(state).toUpperCase())}</p><h1>${escapeHtml(company.display_name)}</h1><p class="lead">${escapeHtml(company.recruiter_thesis)}</p><div class="company-role-chips">${roleChips}</div></div><aside class="card company-state-card"><span class="evidence-state ${state}">${evidenceLabel(state)}</span><strong>${publicRepos.length}</strong><p>direct public evidence ${publicRepos.length === 1 ? "repository" : "repositories"}</p><small>${escapeHtml(company.track_state)}</small><p><strong>Second depth:</strong> ${escapeHtml(depthLabel(depth.stage))}</p><small>claim ceiling · ${escapeHtml(depth.claim_ceiling)}</small></aside></div></section>
<section class="section company-layer" id="recruiter"><div class="shell"><div class="layer-heading"><span>01 · RECRUITER</span><h2>What matters to this operating environment.</h2></div><div class="company-two-col"><article class="card"><h3>Alignment thesis</h3><p>${escapeHtml(company.recruiter_thesis)}</p><p>${escapeHtml(evidenceSummary)}</p></article><article class="card boundary-card"><h3>Truth boundary</h3><p>${escapeHtml(company.non_affiliation)}</p><p><strong>Current public claim ceiling:</strong> ${escapeHtml(depth.claim_ceiling)}</p></article></div></div></section>
<section class="section alt company-layer" id="master"><div class="shell"><div class="layer-heading"><span>02 · MASTER</span><h2>Innovation, architecture, and the governed second-depth gate.</h2></div><div class="company-two-col"><article class="card"><h3>Role-specific engineering frame</h3><p>The current dossier identifies the domain and public evidence subset without pretending that company-level bottlenecks have already been proven. Second depth advances only through pinned public evidence: role → externally supportable problem → inspected repository → bounded remedy → implementation receipt → reproduced proof → promoted claim.</p><h3>Current repository evidence</h3>${repos ? `<ul class="company-repo-ledger">${repos}</ul>` : `<p class="empty-state">No direct repository is recruiter-admitted yet. This is an engineering queue, not a reason to invent proof.</p>`}</article><article class="card aspiration-card"><p class="eyebrow">SECOND-DEPTH STATE</p><h3>${escapeHtml(depthLabel(depth.stage))}</h3><p><strong>Claim ceiling:</strong> ${escapeHtml(depth.claim_ceiling)}</p><h3>Blocking conditions</h3>${blockerList(company)}<p><strong>Next gate:</strong> ${escapeHtml(depth.next_gate)}</p></article></div></div></section>
${bundledSection}
<section class="section company-layer" id="machine"><div class="shell"><div class="layer-heading"><span>03 · MACHINE</span><h2>Dense integration contract.</h2></div><div class="card machine-contract"><div class="machine-contract-head"><p>Compact wire view for agents and tooling. The structured record carries the same second-depth state and public-safe evidence references.</p><a class="button ghost small" href="/companies/${companySlug(company.company_id)}/record.json">record.json</a></div><pre>${escapeHtml(machineWire(company, state))}</pre><p class="machine-hook">Consumer path: discover route → inspect record → follow pinned public evidence → verify native receipts/tests → respect stage prerequisites, blockers, claim ceiling, and non-affiliation boundary.</p></div></div></section>
<section class="section alt company-layer" id="mesh"><div class="shell"><div class="layer-heading"><span>04 · MESH</span><h2>One node in the larger GlacierEQ system.</h2></div><div class="company-two-col"><article class="card"><h3>Relationships</h3>${meshLinks ? `<ul class="mesh-edge-list">${meshLinks}</ul>` : `<p class="empty-state">No direct public repository edge is admitted yet.</p>`}<p><a href="/mesh/">Open the estate-wide Mesh →</a></p><h3>Current blockers</h3>${blockerList(company)}</article><article class="card evolution-card"><p class="eyebrow">ASPIRATION &amp; EVOLUTION</p><h3>Governed promotion path</h3><ol class="evolution-list">${depthTimeline(company, stageOrder)}</ol><p><strong>Current stage:</strong> ${escapeHtml(depth.stage)}</p><p><strong>Next gate:</strong> ${escapeHtml(depth.next_gate)}</p><p>The path does not advance because a company name, repository, or aspiration exists. It advances only when the upstream Helix state carries the required pinned public evidence.</p></article></div></div></section>
<section class="section tight"><div class="shell callout"><p class="eyebrow">RETURN TO THE CONSTELLATION</p><h2>Company intelligence is one projection of the same governed portfolio.</h2><div class="actions"><a class="button primary" href="/atlas/">Open Company Atlas</a><a class="button ghost" href="/machine/">Machine contracts</a><a class="button ghost" href="/mesh/">System mesh</a></div></div></section>${estateIntelligenceCompanyBlock(estateRecord)}
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

function recordPage(company, state) {
  const record = compactMachineRecord(company, state);
  const wire = machineWire(company, state);
  const slug = companySlug(company.company_id);
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
  <meta name="theme-color" content="#03080b">
  <meta name="description" content="Machine contract record for ${escapeHtml(company.display_name)}: structured company intelligence record, second-depth state, and public evidence references.">
  <meta name="robots" content="index,follow">
  <link rel="canonical" href="https://casey-barton-glaciereq.vercel.app/companies/${slug}/record.html">
  <title>${escapeHtml(company.display_name)} · Machine Contract Record · GlacierEQ</title>
  <link rel="icon" href="/assets/favicon.svg" type="image/svg+xml">
  <link rel="stylesheet" href="/assets/site.css">
  <link rel="stylesheet" href="/assets/site.systems.css">
  <link rel="stylesheet" href="/assets/helix-atlas.css">
</head>
<body>
<a class="skip" href="#main">Skip to content</a>
<header class="site-header"><div class="shell nav"><a class="brand" href="/" aria-label="Casey Barton portfolio home"><span class="mark">CB</span><span><strong>CASEY BARTON</strong><small>APPLIED AI SYSTEMS ARCHITECT</small></span></a><nav class="links" aria-label="Primary navigation"><a href="/">Recruiter</a><a href="/hire/">Hire</a><a href="/resume/">Résumé</a><a href="/master/">Master</a><a href="/mesh/">Mesh</a><a href="/companies/">Companies</a><a href="/atlas/">Atlas</a><a href="/machine/">Machine</a></nav><a class="nav-cta" href="mailto:glacier.equilibrium@gmail.com">Start a conversation</a></div></header>
<main id="main">
<section class="section company-layer" id="machine-record">
<div class="shell">
<div class="layer-heading"><span>MACHINE CONTRACT RECORD</span><h1>${escapeHtml(company.display_name)} · Record</h1></div>
<div class="card machine-contract">
<div class="machine-contract-head"><p>Structured machine contract for this company lens. Same state as the company dossier, rendered as a browsable record page.</p><a class="button ghost small" href="record.json">record.json</a> · <a class="button ghost small" href="../">Company dossier</a></div>
<pre>${escapeHtml(wire)}</pre>
<pre class="record-json">${escapeHtml(JSON.stringify(record, null, 2))}</pre>
<p class="machine-hook">Consumer path: inspect record → follow pinned public evidence → verify native receipts/tests → respect stage prerequisites, blockers, claim ceiling, and non-affiliation boundary.</p>
</div>
</div>
</section>
</main>
<footer class="site-footer"><div class="shell"><p><strong>Casey Barton · GlacierEQ</strong></p><p>${escapeHtml(company.non_affiliation)}</p></div></footer>
</body>
</html>\n`;
}

async function writeCompanyRoutes(companies, stageOrder, estateByCompany) {
  await rm(COMPANIES_OUTPUT, { recursive: true, force: true });
  for (const company of companies) {
    const slug = companySlug(company.company_id);
    const directory = path.join(COMPANIES_OUTPUT, slug);
    await mkdir(directory, { recursive: true });
    const state = evidenceState(company);
    const estateRecord = admittedAtlasCompany(company)
      ? estateByCompany.get(company.company_id) ?? null
      : null;
    await writeFile(path.join(directory, "index.html"), companyPage(company, stageOrder, estateRecord), "utf8");
    await writeFile(
      path.join(directory, "record.json"),
      stableJson(compactMachineRecord(company, state)),
      "utf8",
    );
    await writeFile(path.join(directory, "record.html"), recordPage(company, state), "utf8");
  }
  await writeFile(path.join(COMPANIES_OUTPUT, "index.html"), companyIndexPage(companies), "utf8");
}

async function checkAtlasOutputs({
  allCompanies,
  admittedCompanies,
  stageOrder,
  estateByCompany,
  starsCssPath,
  expectedStarsCss,
  rawAtlasHtml,
}) {
  const [{ injectDesignHtml }, { activateAtlasHtml }, { pruneHtml }] = await Promise.all([
    import("./apply-complete-web-design.mjs"),
    import("./activate-atlas-runtime.mjs"),
    import("./prune-unavailable-github-links.mjs"),
  ]);

  const drifted = [];
  const checkText = async (targetPath, expectedContent) => {
    const actual = await readFile(targetPath, "utf8").catch(() => null);
    if (actual !== expectedContent) {
      drifted.push(path.relative(ROOT, targetPath).replaceAll(path.sep, "/"));
    }
  };

  await checkText(starsCssPath, expectedStarsCss);

  const expectedAtlas = pruneHtml(
    activateAtlasHtml(injectDesignHtml(rawAtlasHtml, "site-v15/atlas/index.html").html),
  );
  await checkText(ATLAS_OUTPUT, expectedAtlas);

  const expectedCompaniesIndex = pruneHtml(
    injectDesignHtml(companyIndexPage(allCompanies), "site-v15/companies/index.html").html,
  );
  await checkText(path.join(COMPANIES_OUTPUT, "index.html"), expectedCompaniesIndex);

  const expectedSlugs = new Set();
  for (const company of allCompanies) {
    const slug = companySlug(company.company_id);
    expectedSlugs.add(slug);
    const directory = path.join(COMPANIES_OUTPUT, slug);
    const state = evidenceState(company);
    const estateRecord = admittedAtlasCompany(company)
      ? estateByCompany.get(company.company_id) ?? null
      : null;

    const expectedCompanyHtml = pruneHtml(
      injectDesignHtml(
        companyPage(company, stageOrder, estateRecord),
        `site-v15/companies/${slug}/index.html`,
      ).html,
    );
    const expectedRecordHtml = pruneHtml(
      injectDesignHtml(
        recordPage(company, state),
        `site-v15/companies/${slug}/record.html`,
      ).html,
    );
    const expectedRecordJson = stableJson(compactMachineRecord(company, state));

    await checkText(path.join(directory, "index.html"), expectedCompanyHtml);
    await checkText(path.join(directory, "record.json"), expectedRecordJson);
    await checkText(path.join(directory, "record.html"), expectedRecordHtml);
  }

  const companyEntries = await readdir(COMPANIES_OUTPUT, { withFileTypes: true }).catch(() => []);
  for (const entry of companyEntries) {
    if (entry.isDirectory() && !expectedSlugs.has(entry.name)) {
      drifted.push(`site-v15/companies/${entry.name}`);
    }
  }

  const admittedSlugs = new Set(admittedCompanies.map((company) => companySlug(company.company_id)));
  const atlasEntries = await readdir(path.join(SITE, "atlas"), { withFileTypes: true }).catch(() => []);
  for (const entry of atlasEntries) {
    if (!entry.isDirectory() || admittedSlugs.has(entry.name)) continue;
    const legacyPage = await readFile(path.join(SITE, "atlas", entry.name, "index.html"), "utf8").catch(() => null);
    if (
      legacyPage &&
      legacyPage.includes('http-equiv="refresh"') &&
      legacyPage.includes(`url=/companies/${entry.name}/`)
    ) {
      drifted.push(`site-v15/atlas/${entry.name}/index.html`);
    }
  }

  if (drifted.length > 0) {
    throw new Error(`Company Atlas generated files out of sync (${drifted.length}): ${drifted.slice(0, 10).join(", ")}`);
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

  const allCompanies = snapshot.companies.sort((a, b) => a.display_name.localeCompare(b.display_name));
  const admittedCompanies = snapshot.companies.filter(admittedAtlasCompany).sort((a, b) => a.display_name.localeCompare(b.display_name));
  const companies = allCompanies;
  for (const company of companies) {
    companySlug(company.company_id);
    if (!Array.isArray(company.repositories)) {
      throw new Error(`${company.company_id}: repositories must be an array`);
    }
    requireSecondDepth(company);
  }

  const publicMemberships = companies.reduce((count, company) => {
    const identities = company.repositories
      .filter((repo) => repo && repo.visibility === "public" &&
        repo.inventory_scope === "HELIX_ADMITTED" &&
        typeof repo.repository === "string" && REPOSITORY_PATTERN.test(repo.repository))
      .map((repo) => repo.repository.toLowerCase());
    return count + new Set(identities).size;
  }, 0);
  const rich = companies.filter((company) => evidenceState(company) === "repository-rich").length;
  const seeded = companies.filter((company) => evidenceState(company) === "seeded").length;
  const scaffold = companies.filter((company) => evidenceState(company) === "scaffold").length;
  const advancedDepth = companies.filter((company) => company.second_depth.ordinal > 0).length;

  // Atlas index stats: computed from admitted companies only (governed view).
  const admittedRich = admittedCompanies.filter((company) => evidenceState(company) === "repository-rich").length;
  const admittedSeeded = admittedCompanies.filter((company) => evidenceState(company) === "seeded").length;
  const admittedScaffold = admittedCompanies.filter((company) => evidenceState(company) === "scaffold").length;
  const admittedAdvancedDepth = admittedCompanies.filter((company) => company.second_depth.ordinal > 0).length;
  const admittedPublicMemberships = admittedCompanies.reduce((count, company) => {
    const identities = company.repositories
      .filter((repo) => repo && repo.visibility === "public" &&
        repo.inventory_scope === "HELIX_ADMITTED" &&
        typeof repo.repository === "string" && REPOSITORY_PATTERN.test(repo.repository))
      .map((repo) => repo.repository.toLowerCase());
    return count + new Set(identities).size;
  }, 0);

  const estate = await loadEstateIntelligence(snapshot.source?.root_ref);
  const starsCssPath = path.join(SITE, "assets", "helix-atlas.stars.css");
  const expectedStarsCss = generateStarPositionCss(admittedCompanies.length);

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
<div class="signal-bar"><div class="shell signal-inner"><span class="signal-live">HELIX ROOT TRUTH · COMPANY ATLAS</span><span>${admittedCompanies.length} of ${allCompanies.length} governed lenses admitted · ${admittedAdvancedDepth} past mapping · zero client scripts</span></div></div>
<header class="site-header"><div class="shell nav"><a class="brand" href="/" aria-label="Casey Barton portfolio home"><span class="mark">CB</span><span><strong>CASEY BARTON</strong><small>APPLIED AI SYSTEMS ARCHITECT</small></span></a><nav class="links" aria-label="Primary navigation"><a href="/">Recruiter</a><a href="/resume/">Résumé</a><a href="/master/">Master</a><a href="/mesh/">Mesh</a><a href="/companies/">Companies</a><a aria-current="page" href="/atlas/">Atlas</a><a href="/machine/">Machine</a></nav><a class="nav-cta" href="mailto:glacier.equilibrium@gmail.com">Start a conversation</a></div></header>
<main id="main">
<section class="hero atlas-hero"><div class="shell"><p class="eyebrow">COMPANY INTELLIGENCE · V23 CANONICAL BUILD · GOVERNED PROOF</p><h1>Choose a star. <em>Follow the proof.</em></h1><p class="lead">The constellation maps recruiter-admitted technical alignment dossiers across the AI ecosystem (${admittedCompanies.length} admitted stars out of ${allCompanies.length} total target-domain dossiers). Active evidence tracks are promoted here only when backed by multiple public Helix-admitted repositories or reproduced/inspected second-depth proof; all ${allCompanies.length} dossiers remain browsable in the Company Index.</p><div class="proof-strip" aria-label="Atlas scope"><div><b>${admittedCompanies.length}</b><span>governed company lenses</span></div><div><b>${admittedPublicMemberships}</b><span>direct public repos</span></div><div><b>${admittedRich}</b><span>verified tracks</span></div><div><b>${admittedSeeded}</b><span>active lenses</span></div><div><b>${admittedAdvancedDepth}</b><span>promoted tracks</span></div></div><div class="actions"><a class="button primary" href="#constellation">Enter constellation</a><a class="button secondary" href="/companies/">Browse all ${allCompanies.length} dossiers</a><a class="button ghost" href="#power-map">Open power map</a><a class="button ghost" href="/data/helix-root.json">Inspect root snapshot</a></div></div></section>
<section id="constellation" class="section constellation-section"><div class="shell"><div class="section-head"><div><p class="eyebrow">CONSTELLATION MODE</p><h2>The ecosystem as a navigable field.</h2></div><p>Stars are positioned across multi-ring orbits for dense scanning (${admittedCompanies.length} live tracks). Pointer precision is optional: the directory is the complete accessibility fallback and browser find provides instant text lookup without weakening the site’s no-script CSP.</p></div><div class="constellation-layout"><div class="constellation-stage" aria-label="Company constellation">${admittedCompanies.map((company, index) => constellationNode(company, index)).join("")}<div class="constellation-core" aria-hidden="true"><span>GLACIEREQ</span><b>COMPANY<br>ATLAS</b></div><div class="orbit orbit-1" aria-hidden="true"></div><div class="orbit orbit-2" aria-hidden="true"></div><div class="orbit orbit-3" aria-hidden="true"></div></div><aside class="constellation-directory"><div class="directory-head"><p class="eyebrow">DIRECTORY · ADMISSION GOVERNANCE</p><h3>Verified &amp; active tracks</h3><p>${evidenceLabel("repository-rich")} = multiple or advanced public repositories; ${evidenceLabel("seeded")} = direct public repository. Atlas enforces strict recruiter-ready admission (${admittedCompanies.length} of ${allCompanies.length} lenses); the remaining ${allCompanies.length - admittedCompanies.length} target-domain dossiers and machine records are open in the <a href="/companies/">complete Company Index</a>.</p></div><div class="atlas-directory">${renderDirectoryList(admittedCompanies)}</div></aside></div></div></section>
<section id="power-map" class="section alt"><div class="shell"><div class="section-head"><div><p class="eyebrow">POWER-MAP MODE</p><h2>See where each target sits in the operating stack.</h2></div><p>This is an orientation layer, not a claim that the categories are exclusive or that GlacierEQ has company access. Each name resolves to the same governed company intelligence route.</p></div><div class="power-map">${powerMap(admittedCompanies)}</div></div></section>
<section id="crown-jewels" class="section"><div class="shell"><div class="section-head"><div><p class="eyebrow">CROWN JEWELS</p><h2>Systems with a governed public proof path.</h2></div><p>The company constellation does not replace native repository proof. It points back into systems whose evidence state and next promotion gate are explicit.</p></div><div class="atlas-grid">${snapshot.flagships.map(flagshipCard).join("")}</div></div></section>
<section class="section tight"><div class="shell callout"><p class="eyebrow">SECOND-DEPTH CONTRACT</p><h2>Mapping is not proof. Progress is a governed state transition.</h2><p>${escapeHtml(snapshot.company_second_depth.boundary)}</p><p>The eight stages are ${stageOrder.map((row) => escapeHtml(row.id)).join(" → ")}. A missing upstream override means MAPPED_ONLY, never completion.</p></div></section>
<section class="section tight"><div class="shell callout"><p class="eyebrow">PUBLICATION CONTRACT</p><h2>Beauty on top. Truth underneath.</h2><p>Company names identify independent target domains. The build publishes only public-safe Helix fields; no affiliation, endorsement, employment, proprietary access, contract relationship, clearance, production adoption, or unsupported business impact is implied.</p><div class="actions"><a class="button primary" href="https://github.com/GlacierEQ/job-app-helix" target="_blank" rel="noopener">Inspect Job App Helix</a><a class="button ghost" href="/machine/">Read machine contracts</a><a class="button ghost" href="/mesh/">Open the Mesh</a></div></div></section>${estateIntelligenceAtlasBlock(estate.count)}
</main>
<footer class="site-footer"><div class="shell"><p><strong>Casey Barton · GlacierEQ</strong></p><p>Independent systems work. Company alignment does not imply affiliation, endorsement, employment, proprietary access, contract relationship, clearance, or production deployment.</p></div></footer>
</body>
</html>\n`;

  if (CHECK) {
    await checkAtlasOutputs({
      allCompanies,
      admittedCompanies,
      stageOrder,
      estateByCompany: estate.byCompany,
      starsCssPath,
      expectedStarsCss,
      rawAtlasHtml: html,
    });
    console.log(
      `Company Atlas verified (non-writing): ${path.relative(ROOT, ATLAS_OUTPUT)} + ${allCompanies.length} company routes; ${advancedDepth} past MAPPED_ONLY`,
    );
    return;
  }

  await writeFile(starsCssPath, expectedStarsCss, "utf8");
  await mkdir(path.dirname(ATLAS_OUTPUT), { recursive: true });
  await writeFile(ATLAS_OUTPUT, html, "utf8");
  await writeCompanyRoutes(allCompanies, stageOrder, estate.byCompany);
  // Retire only generated legacy company redirects; preserve unrelated Atlas routes.
  const admittedSlugs = new Set(admittedCompanies.map((company) => companySlug(company.company_id)));
  for (const entry of await readdir(path.join(SITE, "atlas"), { withFileTypes: true })) {
    if (!entry.isDirectory() || admittedSlugs.has(entry.name)) continue;
    const directory = path.join(SITE, "atlas", entry.name);
    let legacyPage;
    try { legacyPage = await readFile(path.join(directory, "index.html"), "utf8"); }
    catch (error) { if (error?.code === "ENOENT") continue; throw error; }
    if (legacyPage.includes('http-equiv="refresh"') &&
        legacyPage.includes(`url=/companies/${entry.name}/`)) {
      await rm(directory, { recursive: true, force: true });
    }
  }
  console.log(
    `Company Atlas rendered: ${path.relative(ROOT, ATLAS_OUTPUT)} + ${allCompanies.length} company routes; ${advancedDepth} past MAPPED_ONLY`,
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack : error);
  process.exitCode = 1;
});

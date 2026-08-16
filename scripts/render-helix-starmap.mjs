#!/usr/bin/env node
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SITE = path.join(ROOT, "site-v15");
const SNAPSHOT_PATH = path.join(SITE, "data", "helix-root.json");
const LENSES_PATH = path.join(ROOT, "scripts", "starmap-lenses.json");
const OUT = path.join(SITE, "atlas", "starmap", "index.html");

const COMPANY_ID_PATTERN = /^[a-z0-9_]+$/;
const SAFE_SYSTEM_ID_PATTERN = /^[a-z0-9_]+$/;
const LENS_CLAIM_BLACKLIST = /\b(affiliat(?:e|ed|ion)|employ(?:ed|ment)|partner(?:ed|ship)?|endors(?:e|ed|ement)|customer|client|contract(?:ed)?|adopt(?:ed|ion)|deployed\s+(?:at|by|for)|production\s+use|inside\s+the\s+company)\b/i;

const POWER_LAYERS = [
  ["Silicon + compute", ["nvidia", "amd", "intel", "qualcomm", "groq", "cerebras", "coreweave"]],
  ["Cloud + infrastructure", ["aws", "microsoft", "google_deepmind", "oracle", "cloudflare", "vercel"]],
  ["Models + agent systems", ["openai", "anthropic", "xai", "mistral", "cohere", "deepseek", "kimi", "qwen", "meta"]],
  ["Platforms + knowledge", ["notion", "databricks", "snowflake", "salesforce", "adobe", "hugging_face", "perplexity", "lovable", "opera"]],
  ["Mission + autonomy", ["spacex", "palantir", "anduril", "lockheed_martin", "tesla", "waymo", "zoox", "blue_origin", "rocket_lab", "nasa", "robotics"]],
  ["Distribution + operators", ["apple", "scale_ai", "tasklet", "manus", "openclaw", "ibm", "glaciereq_core"]],
];

function assert(condition, message) {
  if (!condition) throw new Error(`Starmap render: ${message}`);
}

function esc(value) {
  return String(value ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#39;");
}

function slug(id) {
  assert(typeof id === "string" && COMPANY_ID_PATTERN.test(id), `invalid company id ${String(id)}`);
  return id.replaceAll("_", "-");
}

function systemSlug(id) {
  assert(typeof id === "string" && SAFE_SYSTEM_ID_PATTERN.test(id), `invalid system id ${String(id)}`);
  return id.replaceAll("_", "-");
}

function displayStage(stage) {
  return String(stage ?? "MAPPED_ONLY").toLowerCase().split("_").map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(" ");
}

function requireSecondDepth(company) {
  const depth = company.second_depth;
  assert(depth && typeof depth === "object" && !Array.isArray(depth), `${company.company_id}: missing second_depth`);
  assert(Number.isInteger(depth.ordinal) && depth.ordinal >= 0 && depth.ordinal <= 7, `${company.company_id}: invalid second-depth ordinal`);
  assert(typeof depth.stage === "string" && depth.stage, `${company.company_id}: invalid second-depth stage`);
  assert(typeof depth.claim_ceiling === "string" && depth.claim_ceiling, `${company.company_id}: missing claim ceiling`);
  assert(Array.isArray(depth.blockers), `${company.company_id}: blockers must be an array`);
  assert(typeof depth.next_gate === "string" && depth.next_gate, `${company.company_id}: missing next gate`);
  return depth;
}

function companyLayout(companies) {
  const byId = new Map(companies.map((company) => [company.company_id, company]));
  const positions = new Map();
  const left = 185;
  const right = 910;
  const top = 92;
  const rowGap = 92;

  POWER_LAYERS.forEach(([, ids], row) => {
    const members = ids.filter((id) => byId.has(id));
    members.forEach((id, index) => {
      const x = members.length === 1 ? (left + right) / 2 : left + index * ((right - left) / (members.length - 1));
      positions.set(id, [x, top + row * rowGap]);
    });
  });

  const overflow = companies.filter((company) => !positions.has(company.company_id)).sort((a, b) => a.display_name.localeCompare(b.display_name) || a.company_id.localeCompare(b.company_id));
  const overflowCols = Math.min(8, Math.max(1, overflow.length));
  const overflowTop = top + POWER_LAYERS.length * rowGap;
  const overflowRowGap = 64;
  overflow.forEach((company, index) => {
    const row = Math.floor(index / overflowCols);
    const col = index % overflowCols;
    const rowCount = Math.min(overflowCols, overflow.length - row * overflowCols);
    const x = rowCount === 1 ? (left + right) / 2 : left + col * ((right - left) / (rowCount - 1));
    positions.set(company.company_id, [x, overflowTop + row * overflowRowGap]);
  });

  assert(positions.size === companies.length, `layout covers ${positions.size} companies but snapshot contains ${companies.length}`);
  return { positions, overflow, overflowRows: overflow.length ? Math.ceil(overflow.length / overflowCols) : 0, overflowTop, overflowRowGap };
}

function referencedDonors(companies, flagshipById) {
  const ids = new Set();
  for (const company of companies) {
    const donors = Array.isArray(company.applicable_flagships) ? company.applicable_flagships : [];
    for (const donor of donors) {
      assert(typeof donor === "string", `${company.company_id}: invalid applicable flagship ${String(donor)}`);
      if (flagshipById.has(donor)) ids.add(donor);
    }
  }
  return [...ids].sort();
}

function donorPositions(donorIds, baseY) {
  const positions = new Map();
  if (!donorIds.length) return positions;
  const cols = Math.min(8, donorIds.length);
  const left = 160;
  const right = 920;
  const rowGap = 54;
  donorIds.forEach((id, index) => {
    const row = Math.floor(index / cols);
    const col = index % cols;
    const rowCount = Math.min(cols, donorIds.length - row * cols);
    const x = rowCount === 1 ? (left + right) / 2 : left + col * ((right - left) / (rowCount - 1));
    positions.set(id, [x, baseY + row * rowGap]);
  });
  return positions;
}

function quadraticPath([ax, ay], [bx, by]) {
  const controlX = (ax + bx) / 2;
  const controlY = Math.min(ay, by) - Math.max(26, Math.abs(bx - ax) * 0.06);
  return `M${ax.toFixed(1)} ${ay.toFixed(1)} Q ${controlX.toFixed(1)} ${controlY.toFixed(1)} ${bx.toFixed(1)} ${by.toFixed(1)}`;
}

function starMarkup(company, position) {
  const [x, y] = position;
  const depth = requireSecondDepth(company);
  const crown = depth.ordinal === 7 ? `<path class="crown" d="M${x - 8} ${y - 18} l4 -7 l4 4 l4 -4 l4 7 z"/>` : "";
  return `<a class="starmap-star star-${esc(company.company_id)} sd-${depth.ordinal}" href="#d-${esc(company.company_id)}" aria-label="${esc(company.display_name)} — ${esc(depth.stage)}"><title>${esc(company.display_name)} · ${esc(depth.stage)} · claim ceiling ${esc(depth.claim_ceiling)}</title><circle class="hit" cx="${x}" cy="${y}" r="18"/><circle class="halo halo-outer" cx="${x}" cy="${y}" r="14"/><circle class="halo halo-inner" cx="${x}" cy="${y}" r="9"/><circle class="star-core" cx="${x}" cy="${y}" r="${(3.4 + depth.ordinal * 0.58).toFixed(1)}"/>${crown}</a>`;
}

function donorMarkup(flagship, position) {
  const [x, y] = position;
  return `<a class="donor-node" href="/atlas/#crown-jewels" aria-label="Canonical donor system ${esc(flagship.system_id)}"><title>${esc(flagship.system_id)} · ${esc(flagship.level ?? "")} · ${esc(flagship.state ?? "")}</title><circle class="hit" cx="${x}" cy="${y}" r="17"/><rect class="donor-core" x="${x - 6}" y="${y - 6}" width="12" height="12" rx="3"/><text class="donor-label" x="${x}" y="${y + 24}">${esc(flagship.system_id.replaceAll("_", " "))}</text></a>`;
}

function detailMarkup(company, lenses, flagshipById) {
  const depth = requireSecondDepth(company);
  const donors = Array.isArray(company.applicable_flagships) ? company.applicable_flagships : [];
  const lens = lenses.onomastics?.[company.company_id];
  const donorText = donors.length ? donors.map((id) => { const row = flagshipById.get(id); return row ? `${id} (${row.level ?? "?"} · ${row.state ?? "?"})` : `${id} (referenced by company record; not present in public flagship projection)`; }).join(" · ") : "No canonical transferable flagship is attached to this company record.";
  return `<section id="d-${esc(company.company_id)}" class="starmap-detail"><p class="eyebrow">${esc(depth.stage)} · ${esc(depth.claim_ceiling)}</p><h3>${esc(company.display_name)}</h3>${lens ? `<p class="onomastic"><strong>ONOMASTIC LENS · INTERPRETIVE ONLY</strong>${esc(lens)}</p>` : ""}<dl class="detail-grid"><div><dt>Current stage</dt><dd>${esc(displayStage(depth.stage))}</dd></div><div><dt>Claim ceiling</dt><dd><code>${esc(depth.claim_ceiling)}</code></dd></div><div><dt>Transferable donors</dt><dd>${esc(donorText)}</dd></div><div><dt>Next gate</dt><dd>${esc(depth.next_gate)}</dd></div></dl>${depth.blockers.length ? `<p class="blockers"><strong>BLOCKERS</strong>${depth.blockers.map(esc).join(" · ")}</p>` : `<p class="blockers clear"><strong>BLOCKERS</strong>No unresolved blockers recorded at this stage.</p>`}<p class="boundary">${esc(company.non_affiliation ?? "Independent portfolio analysis; no company affiliation is implied.")}</p><div class="detail-actions"><a class="button primary small" href="/companies/${slug(company.company_id)}/">Open four-depth company route</a><a class="button ghost small" href="/atlas/">Return to Atlas</a></div></section>`;
}

function ladderMarkup(companies, stageOrder) {
  return stageOrder.map((stage, ordinal) => { const members = companies.filter((company) => requireSecondDepth(company).ordinal === ordinal); return `<div class="starmap-rung"><div><span class="rung-index">0${ordinal}</span><strong>${esc(displayStage(stage.id))}</strong><small>${esc(stage.public_claim_ceiling ?? "")}</small></div><div class="rung-members">${members.length ? members.map((company) => `<a class="rung-pill stage-${ordinal}" href="#d-${esc(company.company_id)}">${esc(company.display_name)}</a>`).join("") : '<span class="empty-rung">No company currently occupies this stage.</span>'}</div></div>`; }).join("\n");
}

async function main() {
  const snapshot = JSON.parse(await readFile(SNAPSHOT_PATH, "utf8"));
  const lenses = JSON.parse(await readFile(LENSES_PATH, "utf8"));
  assert(snapshot && typeof snapshot === "object" && !Array.isArray(snapshot), "helix-root.json must contain an object");
  assert(Array.isArray(snapshot.companies) && snapshot.companies.length > 0, "expected a non-empty live governed company snapshot");
  assert(Array.isArray(snapshot.flagships), "snapshot flagships are missing");
  assert(Array.isArray(snapshot.company_second_depth?.stage_order) && snapshot.company_second_depth.stage_order.length === 8, "expected the eight-stage second-depth contract");
  assert(lenses.schema === "glaciereq.starmap-lenses.v1" && lenses.authority === "PRESENTATION_ONLY", "starmap lens authority is invalid");
  assert(typeof lenses.boundary === "string" && lenses.boundary.includes("not evidence"), "starmap lens boundary must explicitly deny evidence authority");

  const companies = [...snapshot.companies].sort((a, b) => a.display_name.localeCompare(b.display_name));
  const companyById = new Map(companies.map((company) => [company.company_id, company]));
  assert(companyById.size === companies.length, "duplicate company ids detected");
  for (const company of companies) { slug(company.company_id); requireSecondDepth(company); }

  const flagshipById = new Map();
  for (const flagship of snapshot.flagships) { systemSlug(flagship.system_id); assert(!flagshipById.has(flagship.system_id), `duplicate flagship ${flagship.system_id}`); flagshipById.set(flagship.system_id, flagship); }
  for (const [id, text] of Object.entries(lenses.onomastics ?? {})) { assert(companyById.has(id), `lens references unknown company ${id}`); assert(typeof text === "string" && text.length > 0 && text.length <= 280, `${id}: invalid lens text`); assert(!LENS_CLAIM_BLACKLIST.test(text), `${id}: interpretive lens contains affiliation/adoption language`); }

  const layout = companyLayout(companies);
  const companyPos = layout.positions;
  const donorIds = referencedDonors(companies, flagshipById);
  const donorBaseY = layout.overflowRows ? layout.overflowTop + layout.overflowRows * layout.overflowRowGap + 54 : 666;
  const donorPos = donorPositions(donorIds, donorBaseY);
  const donorRows = donorIds.length ? Math.ceil(donorIds.length / Math.min(8, donorIds.length)) : 0;
  const svgHeight = Math.max(720, donorBaseY + Math.max(1, donorRows) * 54 + 30);

  const companyGroups = companies.map((company) => { const donors = Array.isArray(company.applicable_flagships) ? company.applicable_flagships : []; const edges = donors.filter((donor) => donorPos.has(donor)).map((donor) => `<path class="donor-edge" d="${quadraticPath(companyPos.get(company.company_id), donorPos.get(donor))}"/>`).join("\n"); return `<g class="company-linkage linkage-${esc(company.company_id)}">${edges}${starMarkup(company, companyPos.get(company.company_id))}</g>`; }).join("\n");
  const donorNodes = donorIds.map((id) => donorMarkup(flagshipById.get(id), donorPos.get(id))).join("\n");
  const details = companies.map((company) => detailMarkup(company, lenses, flagshipById)).join("\n");
  const ladder = ladderMarkup(companies, snapshot.company_second_depth.stage_order);
  const depthCounts = Array(8).fill(0); companies.forEach((company) => { depthCounts[requireSecondDepth(company).ordinal] += 1; });
  const powerLayers = POWER_LAYERS.map(([name, ids]) => [name, ids.filter((id) => companyById.has(id))]).filter(([, ids]) => ids.length);
  if (layout.overflow.length) powerLayers.push(["Live Helix expansion", layout.overflow.map((company) => company.company_id)]);

  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><meta name="theme-color" content="#03080b"><meta name="description" content="Script-free proof starmap for the GlacierEQ Company Atlas: governed company second-depth progression and canonical transferable system relationships."><meta name="robots" content="index,follow"><link rel="canonical" href="https://casey-barton-glaciereq.vercel.app/atlas/starmap/"><title>Proof Starmap · Company Atlas · Casey Barton</title><link rel="icon" href="/assets/favicon.svg" type="image/svg+xml"><link rel="stylesheet" href="/assets/site.css"><link rel="stylesheet" href="/assets/site.systems.css"><link rel="stylesheet" href="/assets/helix-atlas.css"><link rel="stylesheet" href="/assets/helix-starmap.css"></head><body>
<a class="skip" href="#main">Skip to content</a><div class="signal-bar"><div class="shell signal-inner"><span class="signal-live">HELIX ROOT TRUTH · PROOF STARMAP</span><span>${companies.length} governed company tracks · ${donorIds.length} canonical donor systems · zero client scripts</span></div></div>
<header class="site-header"><div class="shell nav"><a class="brand" href="/" aria-label="Casey Barton portfolio home"><span class="mark">CB</span><span><strong>CASEY BARTON</strong><small>APPLIED AI SYSTEMS ARCHITECT</small></span></a><nav class="links" aria-label="Primary navigation"><a href="/">Recruiter</a><a href="/resume/">Résumé</a><a href="/master/">Master</a><a href="/mesh/">Mesh</a><a aria-current="page" href="/atlas/">Atlas</a><a href="/machine/">Machine</a></nav><a class="nav-cta" href="mailto:glacier.equilibrium@gmail.com">Start a conversation</a></div></header><main id="main">
<section class="hero starmap-hero"><div class="shell"><p class="eyebrow">CONSTELLATION · PROOF PROGRESSION · CAPABILITY REUSE</p><h1>The map shows <em>how proof moves.</em></h1><p class="lead">Every company star is governed by the existing eight-stage Helix second-depth contract. Brightness follows proof progression. A gold crown means the upstream record has reached <code>CLAIM_PROMOTED</code>. Gold system edges appear only when the Helix company record already names a transferable flagship.</p><div class="proof-strip" aria-label="Proof Starmap scope"><div><b>${companies.length}</b><span>governed company tracks</span></div><div><b>${depthCounts[7]}</b><span>claim-promoted stars</span></div><div><b>${donorIds.length}</b><span>referenced canonical donors</span></div><div><b>0</b><span>browser JavaScript</span></div></div><div class="actions"><a class="button primary" href="#starmap">Open proof map</a><a class="button secondary" href="#evolution">Open evolution ladder</a><a class="button ghost" href="/atlas/">Company Atlas</a></div></div></section>
<section id="starmap" class="section starmap-section"><div class="shell"><div class="section-head"><div><p class="eyebrow">PROOF STARMAP</p><h2>Company progress and reusable systems in one field.</h2></div><p>This additive reading surface consumes the full live Helix company set. Known targets retain explicit power-layer placement; newly admitted targets receive deterministic overflow placement without changing evidence, claim ceilings, or portfolio admission.</p></div><div class="starmap-wrap"><input class="starmap-control" type="radio" name="starmap-view" id="view-constellation" checked><input class="starmap-control" type="radio" name="starmap-view" id="view-power"><input class="starmap-control" type="radio" name="starmap-view" id="view-ladder"><input class="starmap-control" type="checkbox" id="reveal-connections"><div class="starmap-control-bar" aria-label="Starmap views"><label for="view-constellation">Constellation</label><label for="view-power">Power layers</label><label for="view-ladder">Evolution ladder</label><label class="connections-label" for="reveal-connections">Reveal all donor edges</label></div><div class="starmap-stage"><div class="starmap-view starmap-view-constellation"><svg class="proof-constellation" viewBox="0 0 1100 ${svgHeight}" role="img" aria-labelledby="proof-map-title proof-map-desc"><title id="proof-map-title">Proof-encoded company starmap</title><desc id="proof-map-desc">${companies.length} governed company stars. Known targets retain six operating layers; ${layout.overflow.length} live Helix expansion targets use deterministic overflow placement. Star strength reflects Helix second-depth proof stage.</desc>${POWER_LAYERS.map(([name], row) => `<text class="band-label" x="24" y="${topLabel(row)}">${esc(name.toUpperCase())}</text><line class="band-rule" x1="155" y1="${topLabel(row) - 5}" x2="960" y2="${topLabel(row) - 5}"/>`).join("\n")}${layout.overflow.length ? `<text class="band-label" x="24" y="${layout.overflowTop + 4}">LIVE HELIX EXPANSION</text><line class="band-rule" x1="155" y1="${layout.overflowTop - 1}" x2="960" y2="${layout.overflowTop - 1}"/>` : ""}${companyGroups}${donorNodes}</svg><p class="starmap-legend"><span>dot → crown = MAPPED_ONLY → CLAIM_PROMOTED</span><span class="legend-donor">gold edge = canonical transferable flagship</span><span>focus or hover a star to isolate its donor relationships</span></p></div><div class="starmap-view starmap-view-power"><div class="power-map starmap-power-map">${powerLayers.map(([name, ids]) => `<div class="power-layer"><strong>${esc(name)}</strong><div>${ids.map((id) => `<a href="#d-${esc(id)}">${esc(companyById.get(id).display_name)}</a>`).join("")}</div></div>`).join("\n")}</div></div><div class="starmap-view starmap-view-ladder" id="evolution"><div class="starmap-ladder">${ladder}</div></div><aside class="starmap-details" aria-label="Selected company details"><div class="detail-placeholder"><p class="eyebrow">SELECT A STAR</p><p>Choose a company in any view. Deep links use <code>#d-company-id</code>.</p><p class="lens-boundary">${esc(lenses.boundary)}</p></div>${details}</aside></div></div></div></section>
<section class="section tight"><div class="shell callout"><p class="eyebrow">TRUTH BOUNDARY</p><h2>The Starmap cannot advance the underlying case.</h2><p>Proof stage, claim ceiling, blockers, next gate, company identity, and transferable donor relationships all come from the current Helix projection. The optional naming lenses are explicitly presentation-only metaphors and cannot alter evidence or promotion state.</p><div class="actions"><a class="button primary" href="/atlas/">Return to Company Atlas</a><a class="button ghost" href="/data/helix-root.json">Inspect Helix snapshot</a><a class="button ghost" href="/machine/">Machine surfaces</a></div></div></section></main><footer class="site-footer"><div class="shell"><p><strong>Casey Barton · GlacierEQ</strong></p><p>Independent portfolio intelligence. Company naming does not imply affiliation, employment, endorsement, proprietary access, adoption, or deployment.</p></div></footer></body></html>\n`;

  await mkdir(path.dirname(OUT), { recursive: true }); await writeFile(OUT, html, "utf8");
  console.log(JSON.stringify({ schema: "glaciereq.proof-starmap-render.v3", status: "RENDERED", company_stars: companies.length, explicit_power_layer_stars: companies.length - layout.overflow.length, deterministic_overflow_stars: layout.overflow.length, claim_promoted: depthCounts[7], canonical_donors: donorIds.length, donor_edges: companies.reduce((total, company) => total + (Array.isArray(company.applicable_flagships) ? company.applicable_flagships.filter((id) => flagshipById.has(id)).length : 0), 0), unresolved_donor_references: companies.reduce((total, company) => total + (Array.isArray(company.applicable_flagships) ? company.applicable_flagships.filter((id) => !flagshipById.has(id)).length : 0), 0), lens_entries: Object.keys(lenses.onomastics ?? {}).length, client_scripts: 0 }, null, 2));
}

function topLabel(row) { return 96 + row * 92; }
main().catch((error) => { console.error(error instanceof Error ? error.message : String(error)); process.exitCode = 1; });

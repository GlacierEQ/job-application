import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const PORTFOLIO_PATH = resolve(ROOT, "site-v15/data/portfolio.json");
const INVENTION_MAP_PATH = resolve(ROOT, "site-v15/data/invention-map.json");
const OUTPUT_JSON = resolve(ROOT, "site-v15/data/evidence-gallery.json");
const OUTPUT_ROOT = resolve(ROOT, "site-v15/evidence-gallery");

const DONOR_COMMIT = "901fe77d2c6015feb1650133b751efff8aa0d24c";
const CONTRACTION_COMMIT = "61042c4018db90589715fe1c7f6a2c58879ac2b2";

function stableStringify(value) {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

function digest(value) {
  return createHash("sha256").update(stableStringify(value)).digest("hex");
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function unique(values) {
  return [...new Set(values)];
}

// Recruiter-visible GitHub is anonymous HTTP. These repositories 404 without
// auth, so public HTML must not treat them as inspectable source CTAs.
const PRIVATE_GITHUB_REPOS = new Set([
  "https://github.com/GlacierEQ/AKOS",
  "https://github.com/GlacierEQ/Pro-DOCTOR-STRANGE",
]);

function isPrivateGithubCta(repo) {
  return PRIVATE_GITHUB_REPOS.has(repo);
}

function sourceControl(system) {
  if (!isPrivateGithubCta(system.repo)) {
    return `<a href="${escapeHtml(system.repo)}" target="_blank" rel="noopener">Source ↗</a>`;
  }
  if (system.id === "akos") {
    return `<a href="/master/">Pinned proof ↗</a>`;
  }
  return `<span class="source-method">private source · public method</span>`;
}

function owningControl(system) {
  if (!isPrivateGithubCta(system.repo)) {
    return `<a class="source-link" href="${escapeHtml(system.repo)}" target="_blank" rel="noopener">Inspect owning repository ↗</a>`;
  }
  if (system.id === "akos") {
    return `<a class="source-link" href="/master/">Inspect pinned proof →</a>`;
  }
  return `<span class="source-method">independent-reader convergence · private source · public method</span>`;
}

function buildReverseRoutes(inventionMap) {
  const bySystem = new Map();
  const ensure = (id) => {
    if (!bySystem.has(id)) {
      bySystem.set(id, { lenses: [], capabilities: [], workflows: [], roles: [] });
    }
    return bySystem.get(id);
  };

  for (const lens of inventionMap.lenses) {
    for (const system of lens.systems) ensure(system.id).lenses.push({ id: lens.id, title: lens.title, question: lens.question });
  }
  for (const route of inventionMap.capability_routes) {
    for (const system of route.systems) ensure(system.id).capabilities.push({ id: route.id, title: route.title, detail: route.detail });
  }
  for (const route of inventionMap.topology) {
    route.stages.forEach((system, index) => {
      ensure(system.id).workflows.push({
        id: route.id,
        title: route.title,
        outcome: route.outcome,
        stage: index + 1,
        stage_count: route.stages.length,
      });
    });
  }
  for (const role of inventionMap.role_routes) {
    for (const route of role.route) {
      for (const system of route.systems) ensure(system.id).roles.push(role.role);
    }
  }

  for (const routes of bySystem.values()) {
    routes.roles = unique(routes.roles);
  }
  return bySystem;
}

function buildGallery(portfolio, inventionMap) {
  const routesBySystem = buildReverseRoutes(inventionMap);
  const systems = portfolio.flagships.map((system) => {
    const routes = routesBySystem.get(system.id) ?? { lenses: [], capabilities: [], workflows: [], roles: [] };
    const routeKinds = [routes.lenses.length, routes.capabilities.length, routes.workflows.length, routes.roles.length].filter(Boolean).length;
    return {
      id: system.id,
      rank: system.rank,
      name: system.name,
      repo: system.repo,
      state: system.state,
      label: system.label,
      summary: system.summary,
      mechanisms: Array.isArray(system.mechanism) ? system.mechanism : [],
      evidence: system.evidence,
      current_ceiling: system.limit,
      level: system.level,
      public_surface: system.public_surface,
      routes,
      route_kinds: routeKinds,
      review_depth: routes.lenses.length + routes.capabilities.length + routes.workflows.length + routes.roles.length,
      drilldown: `/evidence-gallery/${system.id}/`,
    };
  });

  const states = unique(systems.map(({ state }) => state)).sort();
  const levels = unique(systems.map(({ level }) => level)).sort();
  const unrouted = systems.filter(({ review_depth }) => review_depth === 0).map(({ id }) => id);
  const core = {
    schema: "glaciereq.evidence-gallery.v1",
    source: {
      portfolio: "site-v15/data/portfolio.json",
      invention_map: "site-v15/data/invention-map.json",
      invention_map_receipt: inventionMap.receipt_sha256,
      evidence_policy: portfolio.release.evidence_policy,
    },
    restoration_lineage: {
      donor_commit: DONOR_COMMIT,
      contraction_commit: CONTRACTION_COMMIT,
      recovered_mechanism: "filterable repository gallery",
      modernized_as: "script-free proof-bound gallery with deterministic per-system drilldowns",
      no_loss: [
        "current flagship registry remains source of gallery membership",
        "current evidence/state/ceiling values remain source-owned",
        "script-free public CSP remains intact",
        "invention map routes remain additive rather than replaced",
      ],
    },
    coverage: {
      systems: systems.length,
      routed_systems: systems.length - unrouted.length,
      unrouted_systems: unrouted,
      states: states.length,
      levels: levels.length,
    },
    facets: {
      states,
      levels,
      capabilities: inventionMap.capability_routes.map(({ id, title }) => ({ id, title })),
      lenses: inventionMap.lenses.map(({ id, title }) => ({ id, title })),
    },
    systems,
  };
  return { ...core, receipt_sha256: digest(core) };
}

function pageHead(title, description) {
  return `<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="theme-color" content="#03070a">
<meta name="description" content="${escapeHtml(description)}">
<title>${escapeHtml(title)}</title>
<link rel="stylesheet" href="/assets/site.css">
<link rel="stylesheet" href="/assets/site.systems.css">
<link rel="stylesheet" href="/assets/site.complete.css">
<link rel="stylesheet" href="/assets/site.algerian.css">
<link rel="stylesheet" href="/assets/site.evidence-gallery.css">
</head>`;
}

function nav() {
  return `<header class="site-header"><div class="shell nav"><a class="brand" href="/"><span class="mark">CB</span><span><strong>CASEY BARTON</strong><small>EVIDENCE GALLERY</small></span></a><nav class="links" aria-label="Evidence gallery navigation"><a href="/hire/">Hire</a><a href="/inventions/">Invention map</a><a href="/evidence-gallery/">All systems</a></nav><a class="nav-cta" href="/">Portfolio home</a></div></header>`;
}

function evidenceCard(system) {
  const capabilities = system.routes.capabilities.map(({ title }) => `<span>${escapeHtml(title)}</span>`).join("");
  const lenses = system.routes.lenses.map(({ title }) => `<span>${escapeHtml(title)}</span>`).join("");
  return `<article class="evidence-card" id="system-${escapeHtml(system.id)}">
<div class="evidence-card-head"><span>#${String(system.rank).padStart(2, "0")}</span><code>${escapeHtml(system.state)} · ${escapeHtml(system.level)}</code></div>
<h2><a href="${escapeHtml(system.drilldown)}">${escapeHtml(system.name)}</a></h2>
<p>${escapeHtml(system.summary)}</p>
<div class="evidence-facts"><div><b>Evidence</b><span>${escapeHtml(system.evidence)}</span></div><div><b>Current ceiling</b><span>${escapeHtml(system.current_ceiling)}</span></div></div>
${capabilities ? `<div class="facet-row"><b>Capabilities</b>${capabilities}</div>` : ""}
${lenses ? `<div class="facet-row"><b>Problem lenses</b>${lenses}</div>` : ""}
<div class="evidence-actions"><a href="${escapeHtml(system.drilldown)}">Inspect evidence routes →</a>${sourceControl(system)}</div>
</article>`;
}

function renderIndex(gallery) {
  const stateLinks = gallery.facets.states
    .map((state) => `<a href="#state-${escapeHtml(state.toLowerCase().replaceAll(/[^a-z0-9]+/g, "-"))}">${escapeHtml(state)}</a>`)
    .join("");
  const stateSections = gallery.facets.states
    .map((state) => {
      const systems = gallery.systems.filter((system) => system.state === state);
      const id = state.toLowerCase().replaceAll(/[^a-z0-9]+/g, "-");
      return `<section class="gallery-group" id="state-${escapeHtml(id)}"><div class="gallery-group-head"><p>STATE FACET</p><h2>${escapeHtml(state)}</h2><span>${systems.length} system${systems.length === 1 ? "" : "s"}</span></div><div class="evidence-grid">${systems.map(evidenceCard).join("")}</div></section>`;
    })
    .join("");

  return `<!doctype html><html lang="en">${pageHead("Casey Barton · Evidence Gallery", "Proof-bound repository gallery connecting current systems to evidence, limits, recruiter problems, capabilities, roles, and workflows.")}<body>
<a class="skip" href="#main">Skip to evidence gallery</a>${nav()}
<main id="main" class="gallery-main"><section class="gallery-hero"><div class="shell"><p class="eyebrow">RECOVERED + SURPASSED · REPOSITORY GALLERY</p><h1>Inspect the system, the proof, and the boundary in one route.</h1><p class="lead">The earlier gallery made the estate discoverable. This version keeps that strength but binds every card to the current flagship registry and the recovered invention map, so recruiter navigation cannot silently outrun the evidence.</p><div class="gallery-metrics"><div><b>${gallery.coverage.systems}</b><span>current systems</span></div><div><b>${gallery.coverage.routed_systems}</b><span>route-connected</span></div><div><b>${gallery.facets.capabilities.length}</b><span>capability facets</span></div><div><b>${gallery.receipt_sha256.slice(0, 12)}</b><span>deterministic receipt</span></div></div><nav class="gallery-facets" aria-label="State facets"><b>Jump by state</b>${stateLinks}</nav></div></section><div class="shell">${stateSections}</div></main>
<footer class="gallery-footer"><div class="shell"><p>Evidence policy: ${escapeHtml(gallery.source.evidence_policy)}</p><code>${gallery.receipt_sha256}</code></div></footer></body></html>`;
}

function routeList(title, items, renderItem) {
  if (!items.length) return `<section class="route-panel"><h2>${escapeHtml(title)}</h2><p class="route-empty">No current route of this type is asserted.</p></section>`;
  return `<section class="route-panel"><h2>${escapeHtml(title)}</h2><div class="route-list">${items.map(renderItem).join("")}</div></section>`;
}

function renderSystem(system, gallery) {
  const mechanisms = system.mechanisms.length ? `<ul>${system.mechanisms.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>` : `<p>No additional mechanism list is asserted by the current portfolio source.</p>`;
  const lenses = routeList("Problem lenses", system.routes.lenses, (route) => `<article><b>${escapeHtml(route.title)}</b><p>${escapeHtml(route.question)}</p><a href="/inventions/#${escapeHtml(route.id)}">Open lens →</a></article>`);
  const capabilities = routeList("Capability routes", system.routes.capabilities, (route) => `<article><b>${escapeHtml(route.title)}</b><p>${escapeHtml(route.detail)}</p><a href="/inventions/#capabilities">Open capability map →</a></article>`);
  const workflows = routeList("Cross-system workflows", system.routes.workflows, (route) => `<article><b>${escapeHtml(route.title)}</b><p>Stage ${route.stage} of ${route.stage_count}. ${escapeHtml(route.outcome)}</p><a href="/inventions/#topology">Open topology →</a></article>`);
  const roles = routeList("Role relevance", system.routes.roles, (role) => `<article><b>${escapeHtml(role)}</b><p>This role traverses a problem lens that currently routes through this system.</p></article>`);

  return `<!doctype html><html lang="en">${pageHead(`${system.name} · Evidence Drilldown`, `${system.name}: current evidence, proof ceiling, recruiter routes, capability routes, and workflow position.`)}<body>
<a class="skip" href="#main">Skip to evidence</a>${nav()}
<main id="main" class="drilldown-main"><section class="drilldown-hero"><div class="shell"><a class="back-link" href="/evidence-gallery/">← All systems</a><p class="eyebrow">CURRENT SYSTEM · #${String(system.rank).padStart(2, "0")}</p><h1>${escapeHtml(system.name)}</h1><p class="lead">${escapeHtml(system.summary)}</p><div class="system-status"><span>${escapeHtml(system.state)}</span><span>${escapeHtml(system.level)}</span><span>${escapeHtml(system.public_surface)}</span></div></div></section>
<div class="shell drilldown-grid"><section class="proof-panel"><p class="eyebrow">PROOF BOUNDARY</p><h2>What is evidenced</h2><p>${escapeHtml(system.evidence)}</p><h2>Current ceiling</h2><p>${escapeHtml(system.current_ceiling)}</p><h2>Owned mechanisms</h2>${mechanisms}${owningControl(system)}</section><div class="route-stack">${lenses}${capabilities}${workflows}${roles}</div></div></main>
<footer class="gallery-footer"><div class="shell"><p>Gallery receipt ${escapeHtml(gallery.receipt_sha256.slice(0, 16))} · Invention-map receipt ${escapeHtml(gallery.source.invention_map_receipt.slice(0, 16))}</p><a href="/data/evidence-gallery.json">Machine-readable gallery</a></div></footer></body></html>`;
}

const portfolio = JSON.parse(await readFile(PORTFOLIO_PATH, "utf8"));
const inventionMap = JSON.parse(await readFile(INVENTION_MAP_PATH, "utf8"));
const gallery = buildGallery(portfolio, inventionMap);

await mkdir(OUTPUT_ROOT, { recursive: true });
await writeFile(OUTPUT_JSON, `${JSON.stringify(gallery, null, 2)}\n`, "utf8");
await writeFile(resolve(OUTPUT_ROOT, "index.html"), renderIndex(gallery), "utf8");
for (const system of gallery.systems) {
  const directory = resolve(OUTPUT_ROOT, system.id);
  await mkdir(directory, { recursive: true });
  await writeFile(resolve(directory, "index.html"), renderSystem(system, gallery), "utf8");
}

console.log(`Evidence gallery rendered: ${gallery.systems.length} systems, ${gallery.coverage.routed_systems} route-connected, receipt ${gallery.receipt_sha256}.`);

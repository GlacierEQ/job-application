import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const PORTFOLIO_PATH = resolve(ROOT, "site-v15/data/portfolio.json");
const OUTPUT_JSON = resolve(ROOT, "site-v15/data/invention-map.json");
const OUTPUT_HTML = resolve(ROOT, "site-v15/inventions/index.html");

// V13's strongest recruiter mechanic was problem-first discovery. The modern
// site keeps stricter proof boundaries, so these routes are deliberately small,
// explicit joins over the current evidence graph rather than a revived legacy UI.
const REVIEW_LENSES = [
  {
    id: "application-intelligence",
    title: "Application intelligence",
    question: "How do you turn scattered role, repository, proof, and follow-up state into one usable hiring system?",
    systemIds: ["helix", "job-application", "receipt-router"],
  },
  {
    id: "agent-assurance",
    title: "Dependable agent operations",
    question: "How do you let capable agents act without collapsing authority, replay safety, recovery, and evidence?",
    systemIds: ["akos", "sigma-glue", "doctor-strange"],
  },
  {
    id: "evidence-verification",
    title: "Evidence and verification",
    question: "How do you make technical claims inspectable without confusing source presence with reproduced proof?",
    systemIds: ["receipt-router", "doctor-strange", "job-application"],
  },
  {
    id: "architecture-federation",
    title: "Architecture and federation",
    question: "How do independent systems compose without erasing ownership, boundaries, or failure semantics?",
    systemIds: ["tower-of-babel", "pro-code-runtime", "sigma-glue"],
  },
  {
    id: "human-machine",
    title: "Human and machine review surfaces",
    question: "How do recruiters, engineers, and machines inspect different depths of one factual system without truth drift?",
    systemIds: ["job-application", "helix", "akos"],
  },
];

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

function normalizeSystem(system) {
  return {
    id: system.id,
    rank: system.rank,
    name: system.name,
    repo: system.repo,
    state: system.state,
    label: system.label,
    summary: system.summary,
    mechanism: Array.isArray(system.mechanism) ? system.mechanism : [],
    evidence: system.evidence,
    limit: system.limit,
    level: system.level,
    public_surface: system.public_surface,
  };
}

function buildMap(portfolio) {
  const systems = new Map(portfolio.flagships.map((system) => [system.id, normalizeSystem(system)]));
  const missing = REVIEW_LENSES.flatMap((lens) => lens.systemIds).filter((id) => !systems.has(id));
  if (missing.length) {
    throw new Error(`Invention map references missing current flagship ids: ${[...new Set(missing)].join(", ")}`);
  }

  const lenses = REVIEW_LENSES.map((lens) => ({
    id: lens.id,
    title: lens.title,
    question: lens.question,
    systems: lens.systemIds.map((id) => systems.get(id)),
  }));

  const roleRoutes = portfolio.person.roles.map((role) => ({
    role,
    route: lenses.map((lens) => ({
      lens_id: lens.id,
      lens_title: lens.title,
      systems: lens.systems.map(({ id, name, repo, state, level }) => ({ id, name, repo, state, level })),
    })),
  }));

  const core = {
    schema: "glaciereq.invention-evidence-map.v1",
    source: {
      portfolio: "site-v15/data/portfolio.json",
      evidence_policy: portfolio.release.evidence_policy,
      release_name: portfolio.release.name,
      production_url: portfolio.release.production_url,
    },
    restoration_lineage: {
      donor_commit: "901fe77d2c6015feb1650133b751efff8aa0d24c",
      contraction_commit: "61042c4018db90589715fe1c7f6a2c58879ac2b2",
      recovered_mechanisms: [
        "problem-centered invention discovery",
        "repository-to-evidence routing",
        "cross-system review combinations",
        "role-to-repository evidence map",
      ],
      preserved_later_gains: [
        "script-free public CSP",
        "current Helix-bound evidence policy",
        "V21+ proof surfaces",
        "V25 application compiler and later deployment stack",
      ],
    },
    lenses,
    role_routes: roleRoutes,
  };

  return { ...core, receipt_sha256: digest(core) };
}

function systemCard(system) {
  const mechanisms = system.mechanism.length
    ? `<ul>${system.mechanism.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>`
    : "";
  return `<article class="invention-card">
    <div class="invention-card-head"><span>${escapeHtml(system.state)}</span><code>${escapeHtml(system.level)}</code></div>
    <h3>${escapeHtml(system.name)}</h3>
    <p>${escapeHtml(system.summary)}</p>
    ${mechanisms}
    <dl><div><dt>Evidence</dt><dd>${escapeHtml(system.evidence)}</dd></div><div><dt>Current ceiling</dt><dd>${escapeHtml(system.limit)}</dd></div></dl>
    <a href="${escapeHtml(system.repo)}" target="_blank" rel="noopener">Inspect repository →</a>
  </article>`;
}

function renderHtml(map) {
  const lensSections = map.lenses
    .map(
      (lens, index) => `<section id="${escapeHtml(lens.id)}" class="invention-lens">
        <div class="lens-heading"><span>0${index + 1}</span><div><p>PROBLEM LENS</p><h2>${escapeHtml(lens.title)}</h2><strong>${escapeHtml(lens.question)}</strong></div></div>
        <div class="invention-grid">${lens.systems.map(systemCard).join("")}</div>
      </section>`,
    )
    .join("");

  const roleRows = map.role_routes
    .map(
      (role) => `<article class="role-route"><h3>${escapeHtml(role.role)}</h3><div>${role.route
        .map((route) => `<p><b>${escapeHtml(route.lens_title)}</b> ${route.systems.map((system) => escapeHtml(system.name)).join(" · ")}</p>`)
        .join("")}</div></article>`,
    )
    .join("");

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
  <meta name="theme-color" content="#03070a">
  <meta name="description" content="Problem-centered map of GlacierEQ inventions, repositories, evidence, and current proof ceilings.">
  <title>Casey Barton · Invention Evidence Map</title>
  <link rel="stylesheet" href="/assets/site.css">
  <link rel="stylesheet" href="/assets/site.systems.css">
  <link rel="stylesheet" href="/assets/site.complete.css">
  <link rel="stylesheet" href="/assets/site.interaction.css">
  <link rel="stylesheet" href="/assets/site.algerian.css">
  <link rel="stylesheet" href="/assets/site.inventions.css">
  <link rel="alternate" type="application/json" href="/data/invention-map.json" title="Machine-readable invention evidence map">
</head>
<body>
<a class="skip" href="#main">Skip to invention map</a>
<header class="site-header"><div class="shell nav"><a class="brand" href="/"><span class="mark">CB</span><span><strong>CASEY BARTON</strong><small>INVENTION EVIDENCE MAP</small></span></a><nav class="links" aria-label="Invention map navigation">${map.lenses.map((lens) => `<a href="#${escapeHtml(lens.id)}">${escapeHtml(lens.title)}</a>`).join("")}</nav><a class="nav-cta" href="/">Portfolio home</a></div></header>
<main id="main" class="invention-main">
<section class="invention-hero"><div class="shell"><p class="eyebrow">RECOVERED + COMPOSED · PROBLEM-CENTERED REVIEW</p><h1>Start with the problem. Follow the mechanism to its proof.</h1><p class="lead">The modern hiring surface keeps the strongest idea from the earlier invention constellation: repositories are useful only when a reviewer can see what problem they attack, how systems combine, what evidence exists, and where the current proof stops.</p><div class="invention-receipt"><span>Evidence policy</span><b>${escapeHtml(map.source.evidence_policy)}</b><span>Map receipt</span><code>${map.receipt_sha256.slice(0, 16)}</code></div></div></section>
<div class="shell">${lensSections}</div>
<section class="role-map"><div class="shell"><div class="section-head"><div><p class="eyebrow">ROLE → PROBLEM → REPOSITORY</p><h2>One estate, routed by the decision being made.</h2></div><p>This restores V13's role-to-repository evidence path without reviving its client-side runtime. Every route is generated from the current portfolio graph and deploys under the script-free public CSP.</p></div><div class="role-route-grid">${roleRows}</div></div></section>
<section class="lineage"><div class="shell"><p class="eyebrow">RESTORATION LINEAGE</p><h2>Recovered mechanism, not reverted website.</h2><p>Donor <code>${map.restoration_lineage.donor_commit.slice(0, 12)}</code> → contraction <code>${map.restoration_lineage.contraction_commit.slice(0, 12)}</code>. Preserved later gains: ${map.restoration_lineage.preserved_later_gains.map(escapeHtml).join(" · ")}.</p><a class="button primary" href="/machine/">Inspect machine surface</a></div></section>
</main>
</body>
</html>`;
}

export async function renderInventionEvidenceMap() {
  const portfolio = JSON.parse(await readFile(PORTFOLIO_PATH, "utf8"));
  const map = buildMap(portfolio);
  await mkdir(dirname(OUTPUT_HTML), { recursive: true });
  await writeFile(OUTPUT_JSON, `${JSON.stringify(map, null, 2)}\n`, "utf8");
  await writeFile(OUTPUT_HTML, `${renderHtml(map)}\n`, "utf8");
  return map;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const map = await renderInventionEvidenceMap();
  console.log(`Rendered ${map.lenses.length} problem lenses; receipt ${map.receipt_sha256}`);
}

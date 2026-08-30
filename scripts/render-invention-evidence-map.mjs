import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const PORTFOLIO_PATH = resolve(ROOT, "site-v15/data/portfolio.json");
const OUTPUT_JSON = resolve(ROOT, "site-v15/data/invention-map.json");
const OUTPUT_HTML = resolve(ROOT, "site-v15/inventions/index.html");

// V13's strongest recruiter mechanic was problem-first discovery. The modern
// site keeps stricter proof boundaries, so these routes are explicit joins over
// the current evidence graph rather than a revived legacy UI.
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

// These are review/composition routes, not claims that one repository imports or
// executes another. That distinction preserves the public evidence boundary while
// recovering V13's lost cross-repository workflow-map capability.
const REVIEW_TOPOLOGY = [
  {
    id: "role-to-package",
    title: "Role signal → application package",
    stages: ["helix", "job-application", "receipt-router"],
    outcome: "Role evidence is routed through application state into a public package whose claims remain bounded by proof.",
  },
  {
    id: "agent-to-receipt",
    title: "Agent intent → recoverable execution evidence",
    stages: ["akos", "sigma-glue", "doctor-strange"],
    outcome: "Authority, reversible execution, and independent convergence form a review path for dependable agent operations.",
  },
  {
    id: "architecture-to-runtime",
    title: "Architecture decision → implementation surface",
    stages: ["tower-of-babel", "pro-code-runtime", "sigma-glue"],
    outcome: "Polyglot architecture is connected to runnable implementation and orchestration without flattening repository ownership.",
  },
  {
    id: "proof-to-human-machine",
    title: "Proof receipt → human and machine projection",
    stages: ["receipt-router", "job-application", "helix"],
    outcome: "Bounded technical proof reaches recruiter and machine surfaces through one evidence-aware application graph.",
  },
];

const CAPABILITY_ROUTES = {
  "application-intelligence": ["helix", "job-application", "receipt-router"],
  "agent-governance": ["akos", "sigma-glue", "doctor-strange"],
  "multi-agent": ["akos", "sigma-glue", "doctor-strange"],
  "evidence-systems": ["receipt-router", "job-application", "doctor-strange"],
  polyglot: ["tower-of-babel", "pro-code-runtime", "sigma-glue"],
  "human-machine": ["job-application", "helix", "akos"],
};

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

// Recruiter-visible GitHub is anonymous HTTP. These two repositories 404 without
// auth, so public HTML must not treat them as inspectable source CTAs.
const PRIVATE_GITHUB_REPOS = new Set([
  "https://github.com/GlacierEQ/AKOS",
  "https://github.com/GlacierEQ/Pro-DOCTOR-STRANGE",
]);

// Pinned AKOS pytest receipt — same wording/SHA as /resume/ and /master/.
// Do not print the older 118/118 diligence count on this surface.
const AKOS_PINNED_HEAD = "eac3cab001306225b99da41c37370528331966dd";
const AKOS_PINNED_EVIDENCE = `Pinned head ${AKOS_PINNED_HEAD}. Python 3.12: 200 collected, 199 passed, 1 skipped, 0 failures, 0 errors.`;

function isPrivateGithubCta(repo) {
  return PRIVATE_GITHUB_REPOS.has(repo);
}

function publicEvidenceCopy(system) {
  return system.id === "akos" ? AKOS_PINNED_EVIDENCE : system.evidence;
}

function sourceControl(system, { compact = false } = {}) {
  if (!isPrivateGithubCta(system.repo)) {
    const label = compact ? "source ↗" : "Inspect repository →";
    return `<a href="${escapeHtml(system.repo)}" target="_blank" rel="noopener">${label}</a>`;
  }
  if (system.id === "akos") {
    const label = compact ? "pinned proof ↗" : "Inspect pinned proof →";
    return `<a href="/master/">${label}</a>`;
  }
  const method = compact
    ? "private source · public method"
    : "independent-reader convergence · private source · public method";
  return `<span class="source-method">${method}</span>`;
}

function capabilityItem(system) {
  const meta = `${escapeHtml(system.state)} · ${escapeHtml(system.level)}`;
  const inner = `<b>${escapeHtml(system.name)}</b><span>${meta}</span>`;
  if (!isPrivateGithubCta(system.repo)) {
    return `<li><a href="${escapeHtml(system.repo)}" target="_blank" rel="noopener">${inner}</a></li>`;
  }
  if (system.id === "akos") {
    return `<li><a href="/master/">${inner}</a></li>`;
  }
  return `<li><span class="source-method"><b>${escapeHtml(system.name)}</b><span>${meta} · private source · public method</span></span></li>`;
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

function requireSystems(systemMap, ids, context) {
  const missing = ids.filter((id) => !systemMap.has(id));
  if (missing.length) {
    throw new Error(`${context} references missing current flagship ids: ${[...new Set(missing)].join(", ")}`);
  }
  return ids.map((id) => systemMap.get(id));
}

function buildMap(portfolio) {
  const systems = new Map(portfolio.flagships.map((system) => [system.id, normalizeSystem(system)]));

  const lenses = REVIEW_LENSES.map((lens) => ({
    id: lens.id,
    title: lens.title,
    question: lens.question,
    systems: requireSystems(systems, lens.systemIds, `lens ${lens.id}`),
  }));

  const topology = REVIEW_TOPOLOGY.map((route) => ({
    id: route.id,
    title: route.title,
    outcome: route.outcome,
    relationship: "review_and_composition_route_not_runtime_dependency",
    stages: requireSystems(systems, route.stages, `topology ${route.id}`).map(({ id, name, repo, state, level, evidence, limit }) => ({
      id,
      name,
      repo,
      state,
      level,
      evidence,
      limit,
    })),
  }));

  const capabilityRoutes = portfolio.capabilities.map((capability) => {
    const ids = CAPABILITY_ROUTES[capability.id];
    if (!ids) throw new Error(`No current-system route exists for capability ${capability.id}`);
    return {
      id: capability.id,
      title: capability.title,
      detail: capability.detail,
      systems: requireSystems(systems, ids, `capability ${capability.id}`).map(({ id, name, repo, state, level }) => ({
        id,
        name,
        repo,
        state,
        level,
      })),
    };
  });

  const roleRoutes = portfolio.person.roles.map((role) => ({
    role,
    route: lenses.map((lens) => ({
      lens_id: lens.id,
      lens_title: lens.title,
      systems: lens.systems.map(({ id, name, repo, state, level }) => ({ id, name, repo, state, level })),
    })),
  }));

  const routedSystemIds = new Set([
    ...lenses.flatMap((lens) => lens.systems.map(({ id }) => id)),
    ...topology.flatMap((route) => route.stages.map(({ id }) => id)),
    ...capabilityRoutes.flatMap((route) => route.systems.map(({ id }) => id)),
  ]);

  const coverage = {
    current_flagships: portfolio.flagships.length,
    routed_flagships: routedSystemIds.size,
    route_coverage_ratio: Number((routedSystemIds.size / portfolio.flagships.length).toFixed(4)),
    problem_lenses: lenses.length,
    workflow_routes: topology.length,
    capability_routes: capabilityRoutes.length,
    role_routes: roleRoutes.length,
  };

  const core = {
    schema: "glaciereq.invention-evidence-map.v2",
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
        "cross-repository workflow topology",
        "capability-to-system proof routing",
      ],
      preserved_later_gains: [
        "script-free public CSP",
        "current Helix-bound evidence policy",
        "V21+ proof surfaces",
        "V25 application compiler and later deployment stack",
      ],
    },
    coverage,
    lenses,
    topology,
    capability_routes: capabilityRoutes,
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
    <dl><div><dt>Evidence</dt><dd>${escapeHtml(publicEvidenceCopy(system))}</dd></div><div><dt>Current ceiling</dt><dd>${escapeHtml(system.limit)}</dd></div></dl>
    ${sourceControl(system)}
  </article>`;
}

function topologyRoute(route, index) {
  const stages = route.stages
    .map(
      (stage, stageIndex) => `<div class="topology-stage">
        <span>${String(stageIndex + 1).padStart(2, "0")}</span>
        <div><b>${escapeHtml(stage.name)}</b><small>${escapeHtml(stage.state)} · ${escapeHtml(stage.level)}</small></div>
        ${sourceControl(stage, { compact: true })}
      </div>`,
    )
    .join("");
  return `<article class="topology-route">
    <div class="topology-route-head"><span>${String(index + 1).padStart(2, "0")}</span><div><p>COMPOSITION ROUTE</p><h3>${escapeHtml(route.title)}</h3></div></div>
    <div class="topology-stages">${stages}</div>
    <p class="topology-outcome">${escapeHtml(route.outcome)}</p>
    <small class="topology-boundary">Review/composition route. No runtime dependency is implied.</small>
  </article>`;
}

function capabilityRoute(route) {
  return `<article class="capability-route">
    <div><p class="eyebrow">${escapeHtml(route.id)}</p><h3>${escapeHtml(route.title)}</h3><p>${escapeHtml(route.detail)}</p></div>
    <ol>${route.systems.map(capabilityItem).join("")}</ol>
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

  const topologyRoutes = map.topology.map(topologyRoute).join("");
  const capabilityRoutes = map.capability_routes.map(capabilityRoute).join("");

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
  <meta name="description" content="Problem-centered map of GlacierEQ inventions, cross-system workflows, repositories, evidence, and current proof ceilings.">
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
<header class="site-header"><div class="shell nav"><a class="brand" href="/"><span class="mark">CB</span><span><strong>CASEY BARTON</strong><small>INVENTION EVIDENCE MAP</small></span></a><nav class="links" aria-label="Invention map navigation"><a href="#topology">Topology</a><a href="#capabilities">Capabilities</a>${map.lenses.map((lens) => `<a href="#${escapeHtml(lens.id)}">${escapeHtml(lens.title)}</a>`).join("")}<a href="/hire/">Hire</a></nav><a class="nav-cta" href="/">Portfolio home</a></div></header>
<main id="main" class="invention-main">
<section class="invention-hero"><div class="shell"><p class="eyebrow">RECOVERED + COMPOSED · PROBLEM-CENTERED REVIEW</p><h1>Start with the problem. Follow the mechanism to its proof.</h1><p class="lead">The modern hiring surface keeps the strongest idea from the earlier invention constellation: repositories are useful only when a reviewer can see what problem they attack, how systems combine, what evidence exists, and where the current proof stops.</p><div class="invention-receipt"><span>Evidence policy</span><b>${escapeHtml(map.source.evidence_policy)}</b><span>Map receipt</span><code>${map.receipt_sha256.slice(0, 16)}</code></div><div class="coverage-strip"><div><b>${map.coverage.routed_flagships}/${map.coverage.current_flagships}</b><span>current flagships routed</span></div><div><b>${map.coverage.workflow_routes}</b><span>cross-system review routes</span></div><div><b>${map.coverage.capability_routes}</b><span>capability routes</span></div><div><b>${map.coverage.problem_lenses}</b><span>problem lenses</span></div></div></div></section>
<section id="topology" class="topology-section"><div class="shell"><div class="section-head"><div><p class="eyebrow">CROSS-REPOSITORY WORKFLOW TOPOLOGY</p><h2>See how independent systems combine without pretending they are one monolith.</h2></div><p>These routes recover the old workflow-map leverage while preserving the modern evidence boundary: composition is shown explicitly, repository ownership stays visible, and no runtime coupling is invented.</p></div><div class="topology-grid">${topologyRoutes}</div></div></section>
<section id="capabilities" class="capability-section"><div class="shell"><div class="section-head"><div><p class="eyebrow">CAPABILITY → SYSTEM → PROOF</p><h2>Route from what a team needs to the systems that demonstrate it.</h2></div><p>This turns the estate back into a navigable capability graph instead of a flat repository list.</p></div><div class="capability-grid">${capabilityRoutes}</div></div></section>
<div class="shell">${lensSections}</div>
<section class="role-map"><div class="shell"><div class="section-head"><div><p class="eyebrow">ROLE → PROBLEM → REPOSITORY</p><h2>One estate, routed by the decision being made.</h2></div><p>This restores V13's role-to-repository evidence path without reviving its client-side runtime. Every route is generated from the current portfolio graph and deploys under the script-free public CSP.</p></div><div class="role-route-grid">${roleRows}</div></div></section>
<section class="lineage"><div class="shell"><p class="eyebrow">RESTORATION LINEAGE</p><h2>Recovered mechanism, not reverted website.</h2><p>Donor <code>${map.restoration_lineage.donor_commit.slice(0, 12)}</code> → contraction <code>${map.restoration_lineage.contraction_commit.slice(0, 12)}</code>. Preserved later gains: ${map.restoration_lineage.preserved_later_gains.map(escapeHtml).join(" · ")}.</p><a class="button primary" href="/machine/">Inspect machine surface</a></div></section>
</main>
<footer class="footer"><div class="shell footer-grid"><div><strong>Invention Evidence Map · Casey Barton</strong><br><span>Problem-first routes. Private source stays method-only on this public surface.</span></div><nav class="footer-links" aria-label="Footer navigation"><a href="/hire/">Hire</a><a href="/resume/">Résumé</a><a href="/master/">Master</a><a href="/">Portfolio home</a></nav></div></footer>
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
  console.log(
    `Rendered ${map.lenses.length} problem lenses, ${map.topology.length} topology routes, ` +
      `${map.capability_routes.length} capability routes; receipt ${map.receipt_sha256}`,
  );
}

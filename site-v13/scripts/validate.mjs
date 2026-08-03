import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const root = path.resolve(new URL("..", import.meta.url).pathname);
const read = (relative) => fs.readFileSync(path.join(root, relative), "utf8");
const fail = [];
const assert = (condition, message) => {
  if (!condition) fail.push(message);
};

const html = read("index.html");
const cssFiles = [
  "assets/site.css",
  "assets/site.base.css",
  "assets/site.constellation.css",
  "assets/site.gallery.css",
  "assets/site.foundation.css",
  "assets/site.responsive.css"
];
const css = cssFiles.map(read).join("\n");
const js = read("assets/site.js");
const graph = JSON.parse(read("data/portfolio.graph.json"));
const bootstrap = JSON.parse(read("machine/bootstrap.json"));
const runtime = JSON.parse(read("machine/runtime.json"));
const evidence = JSON.parse(read("machine/evidence.json"));
const vercel = JSON.parse(read("vercel.json"));

const requiredOrder = [
  "who-casey-is",
  "what-he-builds",
  "innovation-constellation",
  "invention-stories",
  "repository-gallery",
  "repository-combinations",
  "evidence-demonstrations",
  "resume-role-alignment",
  "runtime-governance",
  "frontier-laws",
  "machine-interfaces"
];

assert(graph.schema === "glaciereq.invention-portfolio.v13", "wrong graph schema");
assert(graph.version === "13.0.0-rc1", "wrong graph version");
assert(JSON.stringify(graph.site_order) === JSON.stringify(requiredOrder), "graph site order drift");

let cursor = -1;
for (const id of requiredOrder) {
  const index = html.indexOf(`id="${id}"`);
  assert(index > cursor, `section missing or out of order: ${id}`);
  cursor = index;
}

assert((html.match(/section-indexed/g) || []).length >= 11, "not all narrative sections are indexed");
assert(!html.includes("AKOS GAUNTLET"), "AKOS gauntlet metaphor must not return");
assert(!html.includes("Crown Jewels"), "Crown Jewels language must not return");
assert(!/Frontier Laws · Casey Barton<\/title>/.test(html), "homepage title still centers Frontier Laws");
assert(html.indexOf('id="runtime-governance"') > html.indexOf('id="resume-role-alignment"'), "runtime appears before role alignment");
assert(html.indexOf('id="frontier-laws"') > html.indexOf('id="runtime-governance"'), "laws appear before foundation");
assert(html.includes("The foundation supports the inventions"), "AKOS foundation boundary missing");

const systems = new Map(graph.systems.map((system) => [system.id, system]));
assert(systems.size >= 10, "insufficient curated system set");
assert(graph.systems.filter((system) => system.featured).length === 3, "exactly three invention stories required");
assert(graph.systems.filter((system) => system.featured).every((system) => system.public && system.url), "featured stories must be public and inspectable");
assert(systems.get("akos")?.foundation_only === true, "AKOS must remain foundation-only");
assert(!systems.get("akos")?.featured, "AKOS must not be a featured story");
assert(systems.get("job-app-helix")?.featured, "Job-App Helix must be featured");
assert(systems.get("tower-of-babel")?.featured, "Tower of Babel must be featured");
assert(systems.get("agent-coordinator")?.featured, "Agent Coordinator must be featured");

for (const family of graph.capability_families) {
  for (const id of family.systems) assert(systems.has(id), `capability family references missing system: ${id}`);
}
for (const flow of graph.combination_flows) {
  for (const step of flow.steps) assert(systems.has(step.system), `flow references missing system: ${step.system}`);
}
for (const role of graph.roles) {
  for (const id of [...role.primary, ...role.supporting]) assert(systems.has(id), `role references missing system: ${id}`);
}
for (const law of graph.frontier_laws) {
  for (const id of law.derived_from) assert(systems.has(id), `law references missing system: ${id}`);
}

assert(graph.systems.filter((system) => !system.public).every((system) => !system.url && system.evidence_level === "private-architecture"), "private architecture must not expose repository URLs");
assert(graph.systems.filter((system) => system.public).every((system) => system.url?.startsWith("https://github.com/GlacierEQ/")), "public systems require canonical GlacierEQ URLs");
assert(!/\b\d{3}[-.) ]?\d{3}[-. ]?\d{4}\b/.test(html + read("README.md")), "public source contains a phone number");
assert(!html.includes("AWS Cloud Institute master"), "unsupported degree language detected");
assert(!html.includes("production-grade"), "unsupported production-grade language detected");

assert(js.includes('fetch("/data/portfolio.graph.json")'), "site does not load canonical graph");
assert(js.includes("renderConstellation"), "constellation renderer missing");
assert(js.includes("renderStory"), "story renderer missing");
assert(js.includes("renderGallery"), "gallery renderer missing");
assert(js.includes("renderEvidenceClaim"), "evidence renderer missing");
assert(css.includes(".constellation-node"), "constellation visual styles missing");
assert(css.includes(".story-node"), "story diagram styles missing");
assert(css.includes(".foundation-runtime"), "foundation visual styles missing");
assert(css.includes("prefers-reduced-motion"), "reduced-motion protection missing");

assert(bootstrap.graph === "/data/portfolio.graph.json", "bootstrap graph path drift");
assert(runtime.human_routes.machine === "/#machine-interfaces", "runtime route contract drift");
assert(evidence.separate_axes.includes("deployment_state"), "deployment evidence axis missing");
assert(vercel.rewrites.some((route) => route.source === "/api/portfolio"), "portfolio API rewrite missing");

for (const file of [
  "index.html",
  ...cssFiles,
  "assets/site.js",
  "assets/favicon.svg",
  "assets/og-card.svg",
  "data/portfolio.graph.json",
  "machine/bootstrap.json",
  "machine/runtime.json",
  "machine/evidence.json",
  "machine/health.json",
  "machine/index.html",
  "resume/index.html",
  "frontier-laws/index.html",
  "master-atlas/index.html",
  "repositories/index.html",
  "llms.txt",
  "robots.txt",
  "sitemap.xml",
  "vercel.json"
]) {
  assert(fs.existsSync(path.join(root, file)), `missing release file: ${file}`);
}

if (fail.length) {
  console.error(JSON.stringify({ status: "FAILED", errors: fail }, null, 2));
  process.exit(1);
}

const releaseFiles = fs.readdirSync(root, { recursive: true })
  .filter((entry) => fs.statSync(path.join(root, entry)).isFile())
  .sort();
const digest = crypto.createHash("sha256");
for (const relative of releaseFiles) {
  digest.update(relative);
  digest.update(fs.readFileSync(path.join(root, relative)));
}
console.log(JSON.stringify({
  status: "V13_CONTRACTS_VERIFIED",
  version: graph.version,
  narrative_sections: requiredOrder.length,
  systems: graph.systems.length,
  featured_stories: graph.systems.filter((system) => system.featured).map((system) => system.id),
  akos_role: "foundation_only",
  stylesheets: cssFiles.length,
  files: releaseFiles.length,
  release_digest: digest.digest("hex")
}, null, 2));

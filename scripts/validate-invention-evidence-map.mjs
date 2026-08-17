import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const ROOT = process.cwd();
const map = JSON.parse(await readFile(resolve(ROOT, "site-v15/data/invention-map.json"), "utf8"));
const html = await readFile(resolve(ROOT, "site-v15/inventions/index.html"), "utf8");
const portfolio = JSON.parse(await readFile(resolve(ROOT, "site-v15/data/portfolio.json"), "utf8"));

const fail = (message) => {
  throw new Error(`Invention evidence map validation failed: ${message}`);
};

if (map.schema !== "glaciereq.invention-evidence-map.v2") fail("unexpected schema");
if (!/^[a-f0-9]{64}$/.test(map.receipt_sha256)) fail("missing deterministic receipt");
if (map.lenses.length < 5) fail("problem-centered discovery contracted below five lenses");
if (map.topology.length < 4) fail("cross-repository workflow topology contracted below four routes");
if (map.capability_routes.length !== portfolio.capabilities.length) fail("capability routing is incomplete");
if (!map.role_routes.length) fail("role-to-repository routing missing");
if (/<script\b/i.test(html)) fail("public invention map violates script-free CSP");
if (!html.includes(map.receipt_sha256.slice(0, 16))) fail("human surface is not bound to map receipt");
if (!html.includes("CROSS-REPOSITORY WORKFLOW TOPOLOGY")) fail("human topology surface missing");
if (!html.includes("CAPABILITY → SYSTEM → PROOF")) fail("human capability route surface missing");

const currentIds = new Set(portfolio.flagships.map(({ id }) => id));
const routedIds = new Set();
for (const lens of map.lenses) {
  if (!lens.question || lens.systems.length < 3) fail(`lens ${lens.id} lacks a useful problem route`);
  for (const system of lens.systems) {
    routedIds.add(system.id);
    if (!currentIds.has(system.id)) fail(`lens ${lens.id} references stale system ${system.id}`);
    if (!system.repo || !system.evidence || !system.limit || !system.state) {
      fail(`system ${system.id} lacks repo/evidence/limit/state boundary`);
    }
  }
}

for (const route of map.topology) {
  if (route.relationship !== "review_and_composition_route_not_runtime_dependency") {
    fail(`topology ${route.id} lost its non-runtime boundary`);
  }
  if (!route.outcome || route.stages.length < 3) fail(`topology ${route.id} lacks a useful composition path`);
  const seen = new Set();
  for (const stage of route.stages) {
    if (seen.has(stage.id)) fail(`topology ${route.id} repeats system ${stage.id}`);
    seen.add(stage.id);
    routedIds.add(stage.id);
    if (!currentIds.has(stage.id)) fail(`topology ${route.id} references stale system ${stage.id}`);
    if (!stage.repo || !stage.evidence || !stage.limit || !stage.state || !stage.level) {
      fail(`topology stage ${stage.id} lacks a proof boundary`);
    }
  }
}

const portfolioCapabilityIds = new Set(portfolio.capabilities.map(({ id }) => id));
const routedCapabilityIds = new Set();
for (const route of map.capability_routes) {
  routedCapabilityIds.add(route.id);
  if (!portfolioCapabilityIds.has(route.id)) fail(`invented capability route ${route.id}`);
  if (!route.detail || route.systems.length < 3) fail(`capability ${route.id} lacks a useful system route`);
  for (const system of route.systems) {
    routedIds.add(system.id);
    if (!currentIds.has(system.id)) fail(`capability ${route.id} references stale system ${system.id}`);
    if (!system.repo || !system.state || !system.level) fail(`capability system ${system.id} lacks current source/state`);
  }
}
if (routedCapabilityIds.size !== portfolioCapabilityIds.size) fail("not every current capability is routed");

for (const role of map.role_routes) {
  if (!portfolio.person.roles.includes(role.role)) fail(`invented role route: ${role.role}`);
  if (role.route.length !== map.lenses.length) fail(`role ${role.role} does not traverse every lens`);
}

for (const mustRoute of ["helix", "job-application", "akos", "sigma-glue", "doctor-strange"]) {
  if (!routedIds.has(mustRoute)) fail(`high-leverage system ${mustRoute} is unreachable`);
}

if (map.coverage.current_flagships !== portfolio.flagships.length) fail("coverage denominator drifted from current portfolio");
if (map.coverage.routed_flagships !== routedIds.size) fail("coverage numerator does not match routed systems");
if (map.coverage.route_coverage_ratio <= 0 || map.coverage.route_coverage_ratio > 1) fail("invalid route coverage ratio");
if (map.coverage.workflow_routes !== map.topology.length) fail("workflow coverage summary drifted");
if (map.coverage.capability_routes !== map.capability_routes.length) fail("capability coverage summary drifted");

if (map.restoration_lineage.donor_commit !== "901fe77d2c6015feb1650133b751efff8aa0d24c") {
  fail("donor lineage drifted");
}
if (map.restoration_lineage.contraction_commit !== "61042c4018db90589715fe1c7f6a2c58879ac2b2") {
  fail("contraction lineage drifted");
}
for (const mechanism of ["cross-repository workflow topology", "capability-to-system proof routing"]) {
  if (!map.restoration_lineage.recovered_mechanisms.includes(mechanism)) fail(`restoration lineage omitted ${mechanism}`);
}

console.log(
  `Invention evidence map valid: ${map.lenses.length} lenses, ${map.topology.length} topology routes, ` +
    `${map.capability_routes.length} capability routes, ${routedIds.size}/${portfolio.flagships.length} current systems routed.`,
);

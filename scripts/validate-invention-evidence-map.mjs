import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const ROOT = process.cwd();
const map = JSON.parse(await readFile(resolve(ROOT, "site-v15/data/invention-map.json"), "utf8"));
const html = await readFile(resolve(ROOT, "site-v15/inventions/index.html"), "utf8");
const portfolio = JSON.parse(await readFile(resolve(ROOT, "site-v15/data/portfolio.json"), "utf8"));

const fail = (message) => {
  throw new Error(`Invention evidence map validation failed: ${message}`);
};

if (map.schema !== "glaciereq.invention-evidence-map.v1") fail("unexpected schema");
if (!/^[a-f0-9]{64}$/.test(map.receipt_sha256)) fail("missing deterministic receipt");
if (map.lenses.length < 5) fail("problem-centered discovery contracted below five lenses");
if (!map.role_routes.length) fail("role-to-repository routing missing");
if (/<script\b/i.test(html)) fail("public invention map violates script-free CSP");
if (!html.includes(map.receipt_sha256.slice(0, 16))) fail("human surface is not bound to map receipt");

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

for (const role of map.role_routes) {
  if (!portfolio.person.roles.includes(role.role)) fail(`invented role route: ${role.role}`);
  if (role.route.length !== map.lenses.length) fail(`role ${role.role} does not traverse every lens`);
}

for (const mustRoute of ["helix", "job-application", "akos", "sigma-glue", "doctor-strange"]) {
  if (!routedIds.has(mustRoute)) fail(`high-leverage system ${mustRoute} is unreachable`);
}

if (map.restoration_lineage.donor_commit !== "901fe77d2c6015feb1650133b751efff8aa0d24c") {
  fail("donor lineage drifted");
}
if (map.restoration_lineage.contraction_commit !== "61042c4018db90589715fe1c7f6a2c58879ac2b2") {
  fail("contraction lineage drifted");
}

console.log(`Invention evidence map valid: ${map.lenses.length} lenses, ${routedIds.size} systems, ${map.role_routes.length} role routes.`);

import { access, readFile } from "node:fs/promises";
import { resolve } from "node:path";

const ROOT = process.cwd();
const gallery = JSON.parse(await readFile(resolve(ROOT, "site-v15/data/evidence-gallery.json"), "utf8"));
const inventionMap = JSON.parse(await readFile(resolve(ROOT, "site-v15/data/invention-map.json"), "utf8"));
const portfolio = JSON.parse(await readFile(resolve(ROOT, "site-v15/data/portfolio.json"), "utf8"));
const indexHtml = await readFile(resolve(ROOT, "site-v15/evidence-gallery/index.html"), "utf8");

const fail = (message) => {
  throw new Error(`Evidence gallery validation failed: ${message}`);
};

if (gallery.schema !== "glaciereq.evidence-gallery.v1") fail("unexpected schema");
if (!/^[a-f0-9]{64}$/.test(gallery.receipt_sha256)) fail("missing deterministic receipt");
if (gallery.source.invention_map_receipt !== inventionMap.receipt_sha256) fail("gallery is not bound to current invention map");
if (gallery.source.evidence_policy !== portfolio.release.evidence_policy) fail("evidence policy drifted from current portfolio");
if (gallery.systems.length !== portfolio.flagships.length) fail("gallery does not include every current flagship");
if (gallery.coverage.systems !== portfolio.flagships.length) fail("coverage denominator drifted");
if (/<script\b/i.test(indexHtml)) fail("gallery index violates script-free CSP");
if (!indexHtml.includes(gallery.receipt_sha256.slice(0, 12))) fail("human index is not bound to gallery receipt");
if (!indexHtml.includes("RECOVERED + SURPASSED · REPOSITORY GALLERY")) fail("restored recruiter gallery surface missing");

const portfolioById = new Map(portfolio.flagships.map((system) => [system.id, system]));
const galleryIds = new Set();
for (const system of gallery.systems) {
  if (galleryIds.has(system.id)) fail(`duplicate system ${system.id}`);
  galleryIds.add(system.id);
  const source = portfolioById.get(system.id);
  if (!source) fail(`stale or invented system ${system.id}`);
  for (const field of ["name", "repo", "state", "evidence", "level", "public_surface"]) {
    const galleryField = field === "evidence" ? system.evidence : system[field];
    if (galleryField !== source[field]) fail(`${system.id} ${field} diverged from current portfolio`);
  }
  if (system.current_ceiling !== source.limit) fail(`${system.id} ceiling diverged from current portfolio`);
  if (system.drilldown !== `/evidence-gallery/${system.id}/`) fail(`${system.id} has unstable drilldown path`);
  if (!Number.isInteger(system.review_depth) || system.review_depth < 0) fail(`${system.id} has invalid review depth`);

  const drilldownPath = resolve(ROOT, `site-v15/evidence-gallery/${system.id}/index.html`);
  await access(drilldownPath);
  const html = await readFile(drilldownPath, "utf8");
  if (/<script\b/i.test(html)) fail(`${system.id} drilldown violates script-free CSP`);
  if (!html.includes(source.name) || !html.includes(source.evidence) || !html.includes(source.limit)) {
    fail(`${system.id} drilldown lost current proof boundary`);
  }
  if (!html.includes(source.repo)) fail(`${system.id} drilldown lost owning repository link`);
  if (!html.includes(gallery.receipt_sha256.slice(0, 16))) fail(`${system.id} drilldown is not bound to gallery receipt`);
}

for (const source of portfolio.flagships) {
  if (!galleryIds.has(source.id)) fail(`current flagship ${source.id} is unreachable from gallery`);
}

const routed = gallery.systems.filter(({ review_depth }) => review_depth > 0).length;
if (gallery.coverage.routed_systems !== routed) fail("routed-system coverage does not match route graph");
const expectedUnrouted = gallery.systems.filter(({ review_depth }) => review_depth === 0).map(({ id }) => id);
if (JSON.stringify(gallery.coverage.unrouted_systems) !== JSON.stringify(expectedUnrouted)) fail("unrouted-system receipt drifted");

if (gallery.restoration_lineage.donor_commit !== "901fe77d2c6015feb1650133b751efff8aa0d24c") fail("donor lineage drifted");
if (gallery.restoration_lineage.contraction_commit !== "61042c4018db90589715fe1c7f6a2c58879ac2b2") fail("contraction lineage drifted");
if (gallery.restoration_lineage.recovered_mechanism !== "filterable repository gallery") fail("historical mechanism lineage missing");

const stateSet = new Set(portfolio.flagships.map(({ state }) => state));
if (gallery.facets.states.length !== stateSet.size) fail("state facets are incomplete");
const levelSet = new Set(portfolio.flagships.map(({ level }) => level));
if (gallery.facets.levels.length !== levelSet.size) fail("level facets are incomplete");
if (gallery.facets.capabilities.length !== inventionMap.capability_routes.length) fail("capability facets drifted from invention map");
if (gallery.facets.lenses.length !== inventionMap.lenses.length) fail("problem-lens facets drifted from invention map");

console.log(
  `Evidence gallery valid: ${gallery.systems.length}/${portfolio.flagships.length} systems, ` +
    `${routed} route-connected, ${gallery.facets.states.length} state facets, receipt ${gallery.receipt_sha256}.`,
);

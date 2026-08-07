#!/usr/bin/env node

import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SITE = path.join(ROOT, "site-v15");
const ATLAS = path.join(SITE, "atlas");

function assert(condition, message) {
  if (!condition) throw new Error(`Company constellation validation failed: ${message}`);
}

async function loadJson(file, label) {
  try {
    const text = await readFile(file, "utf8");
    return { text, value: JSON.parse(text) };
  } catch (error) {
    throw new Error(`Company constellation validation failed: ${label}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

function slug(companyId) {
  assert(typeof companyId === "string" && /^[a-z0-9_]+$/.test(companyId), `invalid company_id ${String(companyId)}`);
  return companyId.replaceAll("_", "-");
}

async function main() {
  const { value: snapshot } = await loadJson(path.join(SITE, "data", "helix-root.json"), "Helix public projection");
  const { text: summaryText, value: summary } = await loadJson(path.join(SITE, "data", "company-atlas-summary.json"), "company atlas summary");
  const atlas = await readFile(path.join(ATLAS, "index.html"), "utf8");
  const sitemap = await readFile(path.join(SITE, "sitemap.xml"), "utf8");

  assert(snapshot.schema === "glaciereq.public-portfolio-projection.v1", "unexpected Helix projection schema");
  assert(summary.schema === "glaciereq.company-atlas-public-summary.v1", "unexpected atlas summary schema");
  assert(summary.source?.authority === "GlacierEQ/job-app-helix", "unexpected atlas summary authority");
  assert(summary.source?.source_commit === snapshot.source?.root_ref, "atlas summary source commit differs from public projection");
  assert(summary.source?.source_digest === snapshot.source?.source_digest, "atlas summary source digest differs from public projection");
  assert(typeof summary.source?.dossier_digest === "string" && /^[a-f0-9]{64}$/.test(summary.source.dossier_digest), "atlas dossier digest is missing");
  assert(Array.isArray(summary.tracks), "atlas summary tracks must be an array");
  assert(summary.counts?.governed_tracks === snapshot.companies.length, "governed-track count differs from Helix projection");
  assert(summary.tracks.length === snapshot.companies.length, "summary track count differs from Helix projection");

  const snapshotById = new Map(snapshot.companies.map((company) => [company.company_id, company]));
  const ids = summary.tracks.map((track) => track.company_id);
  assert(new Set(ids).size === ids.length, "duplicate company IDs in atlas summary");
  const mappedTotal = summary.tracks.reduce((sum, track) => sum + track.mapped_repository_records, 0);
  const admittedTotal = summary.tracks.reduce((sum, track) => sum + track.recruiter_admissible_repositories, 0);
  assert(mappedTotal === summary.counts.mapped_repository_records, "mapped repository-record total is inconsistent");
  assert(admittedTotal === summary.counts.recruiter_admissible_memberships, "recruiter-admissible total is inconsistent");

  assert(atlas.includes("EVIDENCE-AWARE CONSTELLATION"), "atlas does not contain the constellation contract");
  assert(atlas.includes("Visual strength cannot outrun evidence strength"), "atlas truth-language is missing");
  assert(!/<script\b/i.test(atlas), "atlas index contains browser JavaScript");
  const nodeCount = (atlas.match(/class="constellation-node state-/g) ?? []).length;
  assert(nodeCount === summary.tracks.length, `constellation node count ${nodeCount} differs from tracks ${summary.tracks.length}`);

  let companyPages = 0;
  for (const track of summary.tracks) {
    const company = snapshotById.get(track.company_id);
    assert(company, `summary contains unknown company ${track.company_id}`);
    assert(Number.isInteger(track.mapped_repository_records) && track.mapped_repository_records >= 0, `${track.company_id}: invalid mapped count`);
    assert(Number.isInteger(track.recruiter_admissible_repositories) && track.recruiter_admissible_repositories >= 0, `${track.company_id}: invalid recruiter count`);
    assert(track.recruiter_admissible_repositories === company.repositories.length, `${track.company_id}: recruiter count differs from public projection`);
    assert(track.mapped_repository_records >= track.recruiter_admissible_repositories, `${track.company_id}: recruiter count exceeds mapped count`);
    assert(typeof track.cluster === "string" && track.cluster.length > 0, `${track.company_id}: presentation cluster is missing`);
    assert(typeof track.design_hypothesis === "string" && track.design_hypothesis.length > 0, `${track.company_id}: design hypothesis is missing`);
    assert(track.design_hypothesis_basis === "PORTFOLIO_DESIGN_HYPOTHESIS_NOT_COMPANY_CLAIM", `${track.company_id}: design-hypothesis boundary drifted`);
    const expectedRoute = `/atlas/${slug(track.company_id)}/`;
    assert(track.route === expectedRoute, `${track.company_id}: route drifted`);
    if (company.track_state === "NO_DIRECT_EXHIBIT_VERIFIED") {
      assert(track.mapped_repository_records === 0, `${track.company_id}: zero-exhibit track has mapped records`);
      assert(track.recruiter_admissible_repositories === 0, `${track.company_id}: zero-exhibit track has public repositories`);
      assert(track.evidence_state === "empty", `${track.company_id}: zero-exhibit track has non-empty evidence state`);
    }

    const pagePath = path.join(ATLAS, slug(track.company_id), "index.html");
    const page = await readFile(pagePath, "utf8");
    companyPages += 1;
    assert(page.includes(company.display_name.replaceAll("&", "&amp;")) || page.includes(company.display_name), `${track.company_id}: company page does not identify its company`);
    assert(page.includes(snapshot.source.root_ref), `${track.company_id}: immutable source commit is missing`);
    assert(page.includes("PORTFOLIO DESIGN HYPOTHESIS"), `${track.company_id}: hypothesis label is missing`);
    assert(page.includes("not presented as a verified internal company problem"), `${track.company_id}: hypothesis boundary is missing`);
    assert(page.includes("No quantified business impact is claimed"), `${track.company_id}: impact boundary is missing`);
    assert(!/<script\b/i.test(page), `${track.company_id}: company page contains browser JavaScript`);
    assert(!/javascript\s*:/i.test(page), `${track.company_id}: unsafe javascript URL`);
    assert(!page.includes("PRIVATE_CANDIDATE") && !page.includes("PRIVATE_EXPERIMENT"), `${track.company_id}: private state leaked into company page`);
    const canonical = `https://casey-barton-glaciereq.vercel.app${expectedRoute}`;
    assert(sitemap.includes(canonical), `${track.company_id}: company route missing from sitemap`);
    assert(atlas.includes(`href="${expectedRoute}"`), `${track.company_id}: company route missing from constellation/directory`);
  }

  assert(!summaryText.includes("PRIVATE_CANDIDATE") && !summaryText.includes("PRIVATE_EXPERIMENT"), "private state leaked into atlas summary");
  assert(!summaryText.includes('"visibility"'), "repository visibility metadata leaked into aggregate atlas summary");

  const dirs = (await readdir(ATLAS, { withFileTypes: true })).filter((entry) => entry.isDirectory()).map((entry) => entry.name);
  for (const dir of dirs) {
    assert(summary.tracks.some((track) => slug(track.company_id) === dir), `stale company directory ${dir}`);
  }

  console.log(JSON.stringify({
    schema: "glaciereq.company-constellation-validation.v1",
    status: "PASS",
    source_commit: summary.source.source_commit,
    dossier_digest: summary.source.dossier_digest,
    governed_tracks: summary.tracks.length,
    company_pages: companyPages,
    constellation_nodes: nodeCount,
    mapped_repository_records: mappedTotal,
    recruiter_admissible_memberships: admittedTotal,
    browser_javascript: 0,
  }, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack : error);
  process.exitCode = 1;
});

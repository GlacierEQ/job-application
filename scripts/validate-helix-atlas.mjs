#!/usr/bin/env node

import { access, readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SITE = path.join(ROOT, "site-v15");
const COMPANY_ID_PATTERN = /^[a-z0-9_]+$/;

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function companySlug(companyId) {
  assert(typeof companyId === "string" && COMPANY_ID_PATTERN.test(companyId), `invalid company id ${String(companyId)}`);
  return companyId.replaceAll("_", "-");
}

async function htmlFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const target = path.join(directory, entry.name);
    assert(!entry.isSymbolicLink(), `symbolic link found in site tree: ${path.relative(ROOT, target)}`);
    if (entry.isDirectory()) files.push(...await htmlFiles(target));
    else if (entry.isFile() && entry.name.endsWith(".html")) files.push(target);
  }
  return files;
}

async function parseJsonFile(file, label) {
  try {
    const text = await readFile(file, "utf8");
    return { text, value: JSON.parse(text) };
  } catch (error) {
    throw new Error(`${label}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

async function main() {
  const atlas = await readFile(path.join(SITE, "atlas", "index.html"), "utf8");
  const { value: snapshot } = await parseJsonFile(path.join(SITE, "data", "helix-root.json"), "Helix snapshot");

  assert(atlas.includes("Choose a star."), "Company Atlas hero is missing");
  assert(atlas.includes("CONSTELLATION MODE"), "Constellation mode is missing");
  assert(atlas.includes("POWER-MAP MODE"), "Power-map mode is missing");
  assert(atlas.includes("CROWN JEWELS"), "Atlas Crown Jewels section is missing");
  assert(!/<script(?:\s|>)/i.test(atlas), "Company Atlas added client script despite zero-script contract");
  assert(!/\sstyle\s*=\s*/i.test(atlas), "Company Atlas cannot use inline style under locked CSP");
  assert((atlas.match(/class="atlas-star /g) ?? []).length === snapshot.companies.length, "constellation star count differs from company snapshot");
  assert((atlas.match(/class="atlas-directory-item"/g) ?? []).length === snapshot.companies.length, "directory count differs from company snapshot");
  assert((atlas.match(/class="card atlas-flagship"/g) ?? []).length === snapshot.flagships.length, "Atlas flagship count differs from snapshot");
  assert(!atlas.includes("PRIVATE_CANDIDATE"), "private candidate leaked into Atlas");
  assert(!atlas.includes('visibility": "private"'), "private visibility leaked into Atlas");

  const companiesDir = path.join(SITE, "companies");
  const entries = await readdir(companiesDir, { withFileTypes: true });
  const companyDirectories = entries.filter((entry) => entry.isDirectory());
  assert(companyDirectories.length === snapshot.companies.length, "generated company route count differs from snapshot");

  for (const company of snapshot.companies) {
    const slug = companySlug(company.company_id);
    const directory = path.join(companiesDir, slug);
    await access(path.join(directory, "index.html"));
    await access(path.join(directory, "record.json"));
    const page = await readFile(path.join(directory, "index.html"), "utf8");
    const { value: record } = await parseJsonFile(path.join(directory, "record.json"), `${company.company_id} machine record`);
    assert(page.includes("01 · RECRUITER"), `${company.company_id}: recruiter layer missing`);
    assert(page.includes("02 · MASTER"), `${company.company_id}: master layer missing`);
    assert(page.includes("03 · MACHINE"), `${company.company_id}: machine layer missing`);
    assert(page.includes("04 · MESH"), `${company.company_id}: mesh layer missing`);
    assert(page.includes("ASPIRATION &amp; EVOLUTION"), `${company.company_id}: aspiration/evolution mesh section missing`);
    assert(page.includes(company.non_affiliation), `${company.company_id}: non-affiliation boundary missing`);
    assert(!/<script(?:\s|>)/i.test(page), `${company.company_id}: company page added client script`);
    assert(!/\sstyle\s*=\s*/i.test(page), `${company.company_id}: company page cannot use inline style under locked CSP`);
    assert(!page.includes("PRIVATE_CANDIDATE"), `${company.company_id}: private candidate leaked into page`);
    assert(record.schema === "glaciereq.company-intelligence.v1", `${company.company_id}: machine record schema mismatch`);
    assert(record.id === company.company_id, `${company.company_id}: machine record identity mismatch`);
    assert(record.route === `/companies/${slug}/`, `${company.company_id}: machine route mismatch`);
    assert(Array.isArray(record.repos) && record.repos.length === company.repositories.length, `${company.company_id}: machine repository count mismatch`);
  }

  const linked = [];
  for (const file of await htmlFiles(SITE)) {
    const text = await readFile(file, "utf8");
    const navStart = text.indexOf('<nav class="links"');
    if (navStart >= 0) {
      const navEnd = text.indexOf("</nav>", navStart);
      assert(navEnd >= 0, `primary navigation is not closed: ${path.relative(ROOT, file)}`);
      const nav = text.slice(navStart, navEnd);
      assert(nav.includes('href="/atlas/"'), `Atlas missing from navigation: ${path.relative(ROOT, file)}`);
      linked.push(path.relative(ROOT, file));
    }
    assert(!/javascript\s*:/i.test(text), `unsafe javascript URL: ${path.relative(ROOT, file)}`);
  }
  assert(linked.length >= snapshot.companies.length + 5, "Atlas was not linked across all primary surfaces and company routes");

  const css = await readFile(path.join(SITE, "assets", "helix-atlas.css"), "utf8");
  assert(css.includes("@media(max-width:700px)"), "Atlas mobile contract is missing");
  assert(css.includes("overflow-wrap:anywhere"), "Atlas long-identity containment is missing");
  assert(css.includes("prefers-reduced-motion"), "Atlas reduced-motion contract is missing");

  const sitemap = await readFile(path.join(SITE, "sitemap.xml"), "utf8");
  const llms = await readFile(path.join(SITE, "llms.txt"), "utf8");
  assert(sitemap.includes("/atlas/"), "Atlas missing from sitemap");
  assert(llms.includes("Company Atlas"), "Company Atlas missing from llms.txt");
  for (const company of snapshot.companies) {
    assert(sitemap.includes(`/companies/${companySlug(company.company_id)}/`), `${company.company_id}: company route missing from sitemap`);
  }

  console.log(JSON.stringify({
    schema: "glaciereq.company-atlas-validation.v2",
    status: "PASS",
    flagships: snapshot.flagships.length,
    company_routes: snapshot.companies.length,
    constellation_stars: snapshot.companies.length,
    linked_html_surfaces: linked.length,
    client_scripts: 0,
  }, null, 2));
}

main().catch((error) => {
  console.error(`Company Atlas validation: FAIL: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
});

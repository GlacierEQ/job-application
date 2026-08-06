#!/usr/bin/env node

import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SITE = path.join(ROOT, "site-v15");

function assert(condition, message) {
  if (!condition) throw new Error(message);
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

  assert(atlas.includes("The portfolio stays current from"), "Atlas hero is missing");
  assert(atlas.includes("CROWN JEWELS"), "Atlas Crown Jewels section is missing");
  assert(atlas.includes("COMPANY LENSES"), "Atlas company section is missing");
  assert(atlas.includes("build time, then served statically"), "Atlas stability boundary is missing");
  assert((atlas.match(/class="card atlas-flagship"/g) ?? []).length === snapshot.flagships.length, "Atlas flagship count differs from snapshot");

  const activeCompanies = snapshot.companies.filter((company) => company.repositories.length || company.applicable_flagships?.length);
  assert((atlas.match(/class="card atlas-company"/g) ?? []).length === activeCompanies.length, "Atlas company count differs from snapshot");
  assert(!atlas.includes("PRIVATE_CANDIDATE"), "private candidate leaked into Atlas");
  assert(!atlas.includes('visibility": "private"'), "private visibility leaked into Atlas");

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
  assert(linked.length >= 5, "Atlas was not linked across all primary surfaces");

  const css = await readFile(path.join(SITE, "assets", "helix-atlas.css"), "utf8");
  assert(css.includes("@media(max-width:700px)"), "Atlas mobile contract is missing");
  assert(css.includes("overflow-wrap:anywhere"), "Atlas long-repository containment is missing");

  const sitemap = await readFile(path.join(SITE, "sitemap.xml"), "utf8");
  const llms = await readFile(path.join(SITE, "llms.txt"), "utf8");
  assert(sitemap.includes("/atlas/"), "Atlas missing from sitemap");
  assert(llms.includes("Systems Atlas"), "Atlas missing from llms.txt");

  console.log(JSON.stringify({
    schema: "glaciereq.helix-atlas-validation.v1",
    status: "PASS",
    flagships: snapshot.flagships.length,
    active_company_lenses: activeCompanies.length,
    linked_html_surfaces: linked.length,
  }, null, 2));
}

main().catch((error) => {
  console.error(`Helix Atlas validation: FAIL: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
});

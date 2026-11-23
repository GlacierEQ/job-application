#!/usr/bin/env node

import { access, readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { sourceBackedCapabilitiesForCompany } from "./recovered-forward-deployed-source-links.mjs";
import { admittedAtlasCompany } from "./public-atlas-admission.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SITE = path.join(ROOT, "site-v15");
const COMPANY_ID_PATTERN = /^[a-z0-9_]+$/;
const SECOND_DEPTH_STAGES = [
  "MAPPED_ONLY",
  "ROLE_VERIFIED",
  "PROBLEM_BOUNDED",
  "CODE_INSPECTED",
  "REMEDY_BOUNDED",
  "IMPLEMENTED",
  "PROOF_REPRODUCED",
  "CLAIM_PROMOTED",
];

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function companySlug(companyId) {
  assert(
    typeof companyId === "string" && COMPANY_ID_PATTERN.test(companyId),
    `invalid company id ${String(companyId)}`,
  );
  return companyId.replaceAll("_", "-");
}

async function htmlFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const target = path.join(directory, entry.name);
    assert(!entry.isSymbolicLink(), `symbolic link found in site tree: ${path.relative(ROOT, target)}`);
    if (entry.isDirectory()) files.push(...(await htmlFiles(target)));
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

function validateMachineDepth(company, record) {
  assert(record.second_depth, `${company.company_id}: machine second-depth state missing`);
  assert(
    record.second_depth.stage === company.second_depth.stage,
    `${company.company_id}: machine second-depth stage drift`,
  );
  assert(
    record.second_depth.ordinal === company.second_depth.ordinal,
    `${company.company_id}: machine second-depth ordinal drift`,
  );
  assert(
    record.second_depth.claim_ceiling === company.second_depth.claim_ceiling,
    `${company.company_id}: machine claim ceiling drift`,
  );
  assert(
    JSON.stringify(record.second_depth.blockers) === JSON.stringify(company.second_depth.blockers),
    `${company.company_id}: machine blockers drift`,
  );
  assert(
    record.second_depth.next_gate === company.second_depth.next_gate,
    `${company.company_id}: machine next gate drift`,
  );
}

async function main() {
  const atlas = await readFile(path.join(SITE, "atlas", "index.html"), "utf8");
  const { value: snapshot } = await parseJsonFile(
    path.join(SITE, "data", "helix-root.json"),
    "Helix snapshot",
  );
  const { value: receipt } = await parseJsonFile(
    path.join(SITE, "data", "helix-root.receipt.json"),
    "Helix projection receipt",
  );

  assert(
    Array.isArray(snapshot.companies) && snapshot.companies.length > 0,
    "Company Atlas must render at least one admitted company",
  );
  assert(
    snapshot.companies.length === receipt.company_tracks,
    "Company Atlas company count must match helix projection receipt",
  );
  const admittedCompanies = snapshot.companies.filter(admittedAtlasCompany);
  assert(admittedCompanies.length > 0, "Atlas must have admitted companies");
  // Match the actual generated proof-strip field, not an unrelated number in
  // CSS, a link, or another section of stale Atlas HTML.
  assert(
    atlas.includes(`<b>${admittedCompanies.length}</b><span>governed company lenses</span>`),
    "atlas index governed company count differs from admitted snapshot",
  );
  assert(
    Array.isArray(snapshot.company_second_depth?.stage_order) &&
      snapshot.company_second_depth.stage_order.length === SECOND_DEPTH_STAGES.length,
    "second-depth stage contract missing from snapshot",
  );
  snapshot.company_second_depth.stage_order.forEach((row, ordinal) => {
    assert(row.id === SECOND_DEPTH_STAGES[ordinal], `second-depth stage ${ordinal} drift`);
  });

  assert(atlas.includes("Choose a star."), "Company Atlas hero is missing");
  assert(atlas.includes("CONSTELLATION MODE"), "Constellation mode is missing");
  assert(atlas.includes("POWER-MAP MODE"), "Power-map mode is missing");
  assert(atlas.includes("CROWN JEWELS"), "Atlas Crown Jewels section is missing");
  assert(atlas.includes("SECOND-DEPTH CONTRACT"), "Atlas second-depth contract is missing");
  assert(admittedCompanies.every(admittedAtlasCompany), "Atlas contains an unadmitted company");
  assert(new Set(admittedCompanies.map((company) => company.company_id)).size === admittedCompanies.length, "Atlas contains duplicate company ids");
  assert(!/<script(?:\s|>)/i.test(atlas), "Company Atlas added client script despite zero-script contract");
  assert(!/\sstyle\s*=\s*/i.test(atlas), "Company Atlas cannot use inline style under locked CSP");
  assert(
    (atlas.match(/class="atlas-star /g) ?? []).length === admittedCompanies.length,
    "constellation star count differs from company snapshot",
  );
  assert(
    (atlas.match(/class="atlas-directory-item"/g) ?? []).length === admittedCompanies.length,
    "directory count differs from company snapshot",
  );
  // A correct aggregate count can still hide duplicated links and missing
  // company destinations. Require one star and one directory link per ID.
  for (const company of admittedCompanies) {
    const route = `/companies/${companySlug(company.company_id)}/`;
    // The same route legitimately appears in power-map and other links;
    // isolate the anchor tags for each navigational surface instead.
    const anchors = [...atlas.matchAll(/<a\b[^>]*>/g)].map((match) => match[0]);
    const stars = anchors.filter((anchor) => anchor.includes('class="atlas-star ') && anchor.includes(`href="${route}"`));
    const directory = anchors.filter((anchor) => anchor.includes('class="atlas-directory-item"') && anchor.includes(`href="${route}"`));
    assert(stars.length === 1, `${company.company_id}: Atlas star route missing or duplicated`);
    assert(directory.length === 1, `${company.company_id}: Atlas directory route missing or duplicated`);
  }
  assert(
    (atlas.match(/class="card atlas-flagship"/g) ?? []).length === snapshot.flagships.length,
    "Atlas flagship count differs from snapshot",
  );
  assert(!atlas.includes("PRIVATE_CANDIDATE"), "private candidate leaked into Atlas");
  assert(!atlas.includes('visibility": "private"'), "private visibility leaked into Atlas");

  const css = await readFile(path.join(SITE, "assets", "helix-atlas.css"), "utf8");
  const starsCss = await readFile(path.join(SITE, "assets", "helix-atlas.stars.css"), "utf8");
  const lastStar = admittedCompanies.length - 1;
  assert(
    starsCss.includes(`.atlas-star.star-p${lastStar}{`),
    `constellation position star-p${lastStar} missing for live company count`,
  );
  assert(
    starsCss.includes(`.atlas-star.star-p0{`),
    "constellation position star-p0 missing",
  );
  assert(atlas.includes("helix-atlas.stars.css"), "atlas must load generated star positions stylesheet");

  const companiesDir = path.join(SITE, "companies");
  const entries = await readdir(companiesDir, { withFileTypes: true });
  const companyDirectories = entries.filter((entry) => entry.isDirectory());
  assert(
    companyDirectories.length === admittedCompanies.length,
    "generated company route count differs from snapshot",
  );
  const expectedCompanySlugs = new Set(admittedCompanies.map((company) => companySlug(company.company_id)));
  assert(
    companyDirectories.every((entry) => expectedCompanySlugs.has(entry.name)),
    "generated company routes contain an unadmitted directory",
  );
  assert(
    expectedCompanySlugs.size === admittedCompanies.length,
    "multiple admitted company ids map to the same public route",
  );
  const companiesIndex = await readFile(path.join(companiesDir, "index.html"), "utf8");
  assert((companiesIndex.match(/<h1\b/g) ?? []).length === 1, "companies index must contain one h1");
  assert(!/<script\b/i.test(companiesIndex), "companies index must remain script-free");
  assert(!/\sstyle\s*=\s*/i.test(companiesIndex), "companies index cannot use inline style attributes");
  assert(companiesIndex.includes('href="/atlas/"'), "companies index must door to Atlas");
  assert(companiesIndex.includes('href="/hire/"'), "companies index must link Hire");
  assert(companiesIndex.includes('href="/companies/"'), "companies index must self-identify");

  for (const company of admittedCompanies) {
    const slug = companySlug(company.company_id);
    const directory = path.join(companiesDir, slug);
    await access(path.join(directory, "index.html"));
    await access(path.join(directory, "record.json"));
    const page = await readFile(path.join(directory, "index.html"), "utf8");
    const { value: record } = await parseJsonFile(
      path.join(directory, "record.json"),
      `${company.company_id} machine record`,
    );

    assert(page.includes("01 · RECRUITER"), `${company.company_id}: recruiter layer missing`);
    assert(page.includes("02 · MASTER"), `${company.company_id}: master layer missing`);
    assert(page.includes("03 · MACHINE"), `${company.company_id}: machine layer missing`);
    assert(page.includes("04 · MESH"), `${company.company_id}: mesh layer missing`);
    assert(
      page.includes("ASPIRATION &amp; EVOLUTION"),
      `${company.company_id}: aspiration/evolution mesh section missing`,
    );
    assert(page.includes("SECOND-DEPTH STATE"), `${company.company_id}: second-depth Master state missing`);
    assert(page.includes(company.second_depth.stage), `${company.company_id}: second-depth stage missing from page`);
    assert(
      page.includes(company.second_depth.claim_ceiling),
      `${company.company_id}: claim ceiling missing from page`,
    );
    assert(page.includes(company.second_depth.next_gate), `${company.company_id}: second-depth next gate missing`);
    for (const blocker of company.second_depth.blockers) {
      assert(page.includes(blocker), `${company.company_id}: second-depth blocker missing: ${blocker}`);
    }
    assert(page.includes(company.non_affiliation), `${company.company_id}: non-affiliation boundary missing`);
    assert(!/<script(?:\s|>)/i.test(page), `${company.company_id}: company page added client script`);
    assert(
      !/\sstyle\s*=\s*/i.test(page),
      `${company.company_id}: company page cannot use inline style under locked CSP`,
    );
    assert(!page.includes("PRIVATE_CANDIDATE"), `${company.company_id}: private candidate leaked into page`);
    assert(record.schema === "glaciereq.company-intelligence.v1", `${company.company_id}: machine record schema mismatch`);
    assert(record.id === company.company_id, `${company.company_id}: machine record identity mismatch`);
    assert(record.route === `/companies/${slug}/`, `${company.company_id}: machine route mismatch`);
    const expectedPublicRepos = company.repositories.filter((repo, index, all) =>
      repo && repo.visibility === "public" &&
      repo.inventory_scope === "HELIX_ADMITTED" &&
      typeof repo.repository === "string" &&
      /^GlacierEQ\/[A-Za-z0-9_.-]+$/.test(repo.repository) &&
      all.findIndex((candidate) => typeof candidate?.repository === "string" &&
        candidate.repository.toLowerCase() === repo.repository.toLowerCase() &&
        candidate.visibility === "public" && candidate.inventory_scope === "HELIX_ADMITTED") === index);
    assert(
      Array.isArray(record.repos) &&
        record.repos.length === expectedPublicRepos.length &&
        record.repos.every((repo, index) => {
          const expected = expectedPublicRepos[index];
          return repo && repo.id === expected.repository &&
            repo.lvl === expected.level &&
            repo.state === expected.promotion_state &&
            repo.provenance === expected.provenance_state;
        }),
      `${company.company_id}: machine repository evidence mismatch`,
    );
    // Machine-record checks alone cannot detect a private repository link
    // accidentally rendered into the public HTML dossier.
    const admittedIds = new Set(expectedPublicRepos.map((repo) => repo.repository.toLowerCase()));
    for (const repo of company.repositories) {
      if (typeof repo?.repository !== "string" ||
          !/^GlacierEQ\/[A-Za-z0-9_.-]+$/.test(repo.repository) ||
          admittedIds.has(repo.repository.toLowerCase())) continue;
      const [owner, name] = repo.repository.split("/");
      const forbiddenUrl = `https://github.com/${encodeURIComponent(owner)}/${encodeURIComponent(name)}`;
      assert(!page.toLowerCase().includes(forbiddenUrl.toLowerCase()),
        `${company.company_id}: unadmitted repository link leaked into public dossier`);
    }
    const expectedBundled = sourceBackedCapabilitiesForCompany(company.company_id);
    assert(
      Array.isArray(record.bundled_capabilities) &&
        record.bundled_capabilities.length === expectedBundled.length &&
        record.bundled_capabilities.every((row, i) =>
          JSON.stringify(Object.entries(row).sort()) === JSON.stringify(Object.entries(expectedBundled[i]).sort())),
      `${company.company_id}: source-backed capability lineage missing or drifted`,
    );
    assert(
      (page.match(/class="source-backed-capability"/g) ?? []).length === expectedBundled.length,
      `${company.company_id}: source-backed capability cards were lost during rendering`,
    );
    if (expectedBundled.length) {
      assert(page.includes('id="source-backed-capabilities"'), `${company.company_id}: bundled source section missing`);
      for (const capability of expectedBundled) {
        assert(page.includes(capability.name) && page.includes(capability.source_url), `${company.company_id}: bundled evidence not publicly inspectable: ${capability.name}`);
        assert(!record.repos.some((repo) => repo.id === `GlacierEQ/${capability.name}`), `${company.company_id}: fictional standalone repository admitted`);
      }
    }
    validateMachineDepth(company, record);
  }

  const linked = [];
  for (const file of await htmlFiles(SITE)) {
    const text = await readFile(file, "utf8");
    const navStart = text.indexOf('<nav class="links"');
    if (navStart >= 0 && path.resolve(file) !== path.join(SITE, "index.html")) {
      const navEnd = text.indexOf("</nav>", navStart);
      assert(navEnd >= 0, `primary navigation is not closed: ${path.relative(ROOT, file)}`);
      const nav = text.slice(navStart, navEnd);
      assert(nav.includes('href="/atlas/"'), `Atlas missing from navigation: ${path.relative(ROOT, file)}`);
      linked.push(path.relative(ROOT, file));
    }
    assert(!/javascript\s*:/i.test(text), `unsafe javascript URL: ${path.relative(ROOT, file)}`);
  }
  assert(
    linked.length >= admittedCompanies.length + 5,
    "Atlas was not linked across all primary surfaces and company routes",
  );

  assert(css.includes("@media(max-width:700px)"), "Atlas mobile contract is missing");
  assert(css.includes("overflow-wrap:anywhere"), "Atlas long-identity containment is missing");
  assert(css.includes("prefers-reduced-motion"), "Atlas reduced-motion contract is missing");

  const sitemap = await readFile(path.join(SITE, "sitemap.xml"), "utf8");
  const llms = await readFile(path.join(SITE, "llms.txt"), "utf8");
  assert(sitemap.includes("/atlas/"), "Atlas missing from sitemap");
  assert(
    sitemap.includes("https://casey-barton-glaciereq.vercel.app/companies/</loc>"),
    "sitemap missing /companies/ index",
  );
  assert(
    (await access(path.join(SITE, "atlas", "starmap", "index.html")).then(() => true, () => false)) || !sitemap.includes("/atlas/starmap/"),
    "sitemap must not list missing /atlas/starmap/",
  );
  assert(llms.includes("Company Atlas"), "Company Atlas missing from llms.txt");
  for (const company of admittedCompanies) {
    assert(
      sitemap.includes(`/companies/${companySlug(company.company_id)}/`),
      `${company.company_id}: company route missing from sitemap`,
    );
  }
  const admittedCompanyRoutes = new Set(
    admittedCompanies.map((company) => `/companies/${companySlug(company.company_id)}/`),
  );
  const publishedCompanyRoutes = [...sitemap.matchAll(/<loc>[^<]*?(\/companies\/[^<]*?)<\/loc>/g)]
    .map((match) => match[1]);
  assert(
    publishedCompanyRoutes.every((route) => admittedCompanyRoutes.has(route) || route === "/companies/"),
    "sitemap contains an unadmitted company route",
  );
  assert(
    new Set(publishedCompanyRoutes).size === publishedCompanyRoutes.length,
    "sitemap contains duplicate company routes",
  );

  const depthCounts = Object.fromEntries(SECOND_DEPTH_STAGES.map((stage) => [stage, 0]));
  for (const company of admittedCompanies) depthCounts[company.second_depth.stage] += 1;
  const promotedCompanies = admittedCompanies.filter(
    (company) => company.second_depth.stage === "CLAIM_PROMOTED",
  );
  assert(
    promotedCompanies.every((company) => company.second_depth.evidence.claim_receipts.length > 0),
    "every CLAIM_PROMOTED Atlas company must retain public claim receipts",
  );
  assert(promotedCompanies.every(admittedAtlasCompany), "unadmitted promoted company in public Atlas");
  const depthSum = Object.values(depthCounts).reduce((a, b) => a + b, 0);
  assert(
    depthSum === admittedCompanies.length,
    "second-depth stage counts must cover all company tracks",
  );

  console.log(
    JSON.stringify(
      {
        schema: "glaciereq.company-atlas-validation.v3",
        status: "PASS",
        flagships: snapshot.flagships.length,
        company_routes: admittedCompanies.length,
        constellation_stars: admittedCompanies.length,
        claim_promoted_companies: promotedCompanies.length,
        second_depth: depthCounts,
        linked_html_surfaces: linked.length,
        client_scripts: 0,
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(`Company Atlas validation: FAIL: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
});

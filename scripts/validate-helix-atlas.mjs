#!/usr/bin/env node

import { access, readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

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
    snapshot.companies.length >= 49,
    "Company Atlas must render all governed company tracks (floor 49)",
  );
  assert(
    snapshot.companies.length === receipt.company_tracks,
    "Company Atlas company count must match helix projection receipt",
  );
  assert(
    atlas.includes(`${snapshot.companies.length} governed`) ||
      atlas.includes(String(snapshot.companies.length)),
    "atlas index must surface live governed track count",
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
  assert(atlas.includes("Lockheed Martin"), "Lockheed Martin is missing from Atlas");
  assert(!/<script(?:\s|>)/i.test(atlas), "Company Atlas added client script despite zero-script contract");
  assert(!/\sstyle\s*=\s*/i.test(atlas), "Company Atlas cannot use inline style under locked CSP");
  assert(
    (atlas.match(/class="atlas-star /g) ?? []).length === snapshot.companies.length,
    "constellation star count differs from company snapshot",
  );
  assert(
    (atlas.match(/class="atlas-directory-item"/g) ?? []).length === snapshot.companies.length,
    "directory count differs from company snapshot",
  );
  assert(
    (atlas.match(/class="card atlas-flagship"/g) ?? []).length === snapshot.flagships.length,
    "Atlas flagship count differs from snapshot",
  );
  assert(!atlas.includes("PRIVATE_CANDIDATE"), "private candidate leaked into Atlas");
  assert(!atlas.includes('visibility": "private"'), "private visibility leaked into Atlas");

  const css = await readFile(path.join(SITE, "assets", "helix-atlas.css"), "utf8");
  const starsCss = await readFile(path.join(SITE, "assets", "helix-atlas.stars.css"), "utf8");
  const lastStar = snapshot.companies.length - 1;
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
    companyDirectories.length === snapshot.companies.length,
    "generated company route count differs from snapshot",
  );

  for (const company of snapshot.companies) {
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
    assert(
      Array.isArray(record.repos) && record.repos.length === company.repositories.length,
      `${company.company_id}: machine repository count mismatch`,
    );
    validateMachineDepth(company, record);
  }

  const lockheed = snapshot.companies.find((company) => company.company_id === "lockheed_martin");
  assert(lockheed, "Lockheed Martin track is absent from generated snapshot");
  assert(lockheed.repositories.length === 0, "Lockheed Martin route gained unsupported repository proof");
  assert(lockheed.second_depth.stage === "CLAIM_PROMOTED", "Lockheed Martin second-depth stage drift");
  assert(
    lockheed.second_depth.claim_ceiling === "proof_bound_company_specific",
    "Lockheed Martin claim ceiling does not match promoted stage",
  );
  assert(lockheed.second_depth.ordinal === 7, "Lockheed Martin second-depth ordinal drift");
  assert(lockheed.second_depth.evidence.role_evidence.length === 1, "Lockheed Martin role evidence missing");
  assert(lockheed.second_depth.evidence.problem_evidence.length === 1, "Lockheed Martin problem evidence missing");
  assert(
    lockheed.second_depth.evidence.inspected_repositories.length === 4,
    "Lockheed Martin inspected-path evidence is incomplete",
  );
  assert(lockheed.second_depth.evidence.gap_queue.length === 1, "Lockheed Martin bounded remedy evidence missing");
  assert(lockheed.second_depth.evidence.implementation_receipts.length === 1, "Lockheed Martin implementation receipt missing");
  assert(lockheed.second_depth.evidence.proof_artifacts.length === 1, "Lockheed Martin reproduced proof missing");
  assert(lockheed.second_depth.evidence.proof_artifacts[0].verification_state === "REPRODUCED", "Lockheed Martin proof is not reproduced");
  assert(lockheed.second_depth.evidence.claim_receipts.length === 1, "Lockheed Martin claim receipt missing");
  const lockheedPage = await readFile(
    path.join(companiesDir, "lockheed-martin", "index.html"),
    "utf8",
  );
  assert(lockheedPage.includes("Lockheed Martin"), "Lockheed Martin route identity missing");
  assert(lockheedPage.includes("CLAIM_PROMOTED"), "Lockheed Martin promoted state missing");
  assert(
    lockheedPage.includes("proof_bound_company_specific"),
    "Lockheed Martin proof-bound claim ceiling missing",
  );
  assert(
    lockheedPage.includes("no Lockheed Martin affiliation"),
    "Lockheed Martin non-affiliation boundary missing",
  );
  assert(
    lockheedPage.includes("No company-specific repository is currently admitted"),
    "Lockheed Martin route does not expose zero-repository boundary",
  );

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
  assert(
    linked.length >= snapshot.companies.length + 5,
    "Atlas was not linked across all primary surfaces and company routes",
  );

  assert(css.includes("@media(max-width:700px)"), "Atlas mobile contract is missing");
  assert(css.includes("overflow-wrap:anywhere"), "Atlas long-identity containment is missing");
  assert(css.includes("prefers-reduced-motion"), "Atlas reduced-motion contract is missing");

  const sitemap = await readFile(path.join(SITE, "sitemap.xml"), "utf8");
  const llms = await readFile(path.join(SITE, "llms.txt"), "utf8");
  assert(sitemap.includes("/atlas/"), "Atlas missing from sitemap");
  assert(llms.includes("Company Atlas"), "Company Atlas missing from llms.txt");
  for (const company of snapshot.companies) {
    assert(
      sitemap.includes(`/companies/${companySlug(company.company_id)}/`),
      `${company.company_id}: company route missing from sitemap`,
    );
  }
  assert(sitemap.includes("/companies/lockheed-martin/"), "Lockheed Martin missing from sitemap");

  const depthCounts = Object.fromEntries(SECOND_DEPTH_STAGES.map((stage) => [stage, 0]));
  for (const company of snapshot.companies) depthCounts[company.second_depth.stage] += 1;
  assert(depthCounts.CLAIM_PROMOTED === 1, "claim-promoted company count drift");
  assert(
    (depthCounts.MAPPED_ONLY || 0) + (depthCounts.CLAIM_PROMOTED || 0) ===
      snapshot.companies.length,
    "second-depth stage counts must cover all company tracks",
  );

  console.log(
    JSON.stringify(
      {
        schema: "glaciereq.company-atlas-validation.v3",
        status: "PASS",
        flagships: snapshot.flagships.length,
        company_routes: snapshot.companies.length,
        constellation_stars: snapshot.companies.length,
        second_depth: depthCounts,
        lockheed_martin: {
          route: "/companies/lockheed-martin/",
          repositories: lockheed.repositories.length,
          stage: lockheed.second_depth.stage,
          claim_ceiling: lockheed.second_depth.claim_ceiling,
        },
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

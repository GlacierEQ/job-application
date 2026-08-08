#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SITE = path.join(ROOT, "site-v15");
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
const CLAIM_BLACKLIST = /\b(affiliat(?:e|ed|ion)|employ(?:ed|ment)|partner(?:ed|ship)?|endors(?:e|ed|ement)|customer|client|contract(?:ed)?|adopt(?:ed|ion)|deployed\s+(?:at|by|for)|production\s+use|inside\s+the\s+company)\b/i;

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function main() {
  const page = await readFile(path.join(SITE, "atlas", "starmap", "index.html"), "utf8");
  const css = await readFile(path.join(SITE, "assets", "helix-starmap.css"), "utf8");
  const snapshot = JSON.parse(await readFile(path.join(SITE, "data", "helix-root.json"), "utf8"));
  const lenses = JSON.parse(await readFile(path.join(ROOT, "scripts", "starmap-lenses.json"), "utf8"));

  assert(Array.isArray(snapshot.companies) && snapshot.companies.length === 49, "Proof Starmap must consume all 49 governed company tracks");
  assert(Array.isArray(snapshot.flagships), "Proof Starmap snapshot is missing flagships");
  assert(Array.isArray(snapshot.company_second_depth?.stage_order), "Proof Starmap snapshot is missing second-depth contract");
  snapshot.company_second_depth.stage_order.forEach((row, ordinal) => {
    assert(row.id === SECOND_DEPTH_STAGES[ordinal], `second-depth stage ${ordinal} drift`);
  });

  assert(lenses.schema === "glaciereq.starmap-lenses.v1", "lens schema mismatch");
  assert(lenses.authority === "PRESENTATION_ONLY", "lenses must remain presentation-only");
  assert(typeof lenses.boundary === "string" && lenses.boundary.includes("not evidence"), "lens boundary must deny evidence authority");
  const governed = new Set(snapshot.companies.map((company) => company.company_id));
  for (const [id, text] of Object.entries(lenses.onomastics ?? {})) {
    assert(governed.has(id), `lens references unknown company ${id}`);
    assert(typeof text === "string" && text.length > 0 && text.length <= 280, `${id}: invalid lens length`);
    assert(!CLAIM_BLACKLIST.test(text), `${id}: lens contains affiliation/adoption language`);
  }

  assert(!/<script(?:\s|>)/i.test(page), "Proof Starmap added client script under locked CSP");
  assert(!/\sstyle\s*=\s*/i.test(page), "Proof Starmap used inline style under locked CSP");
  assert(page.includes('href="/assets/site.css"'), "Proof Starmap did not inherit current site design system");
  assert(page.includes('href="/assets/site.systems.css"'), "Proof Starmap did not inherit systems design layer");
  assert(page.includes('href="/assets/helix-atlas.css"'), "Proof Starmap did not inherit current Atlas layer");
  assert(page.includes('href="/assets/helix-starmap.css"'), "Proof Starmap stylesheet missing");
  assert(page.includes('href="/atlas/"'), "Proof Starmap has no Atlas return path");
  assert(page.includes('href="/data/helix-root.json"'), "Proof Starmap has no root snapshot inspection path");

  const starMatches = [...page.matchAll(/class="starmap-star star-([a-z0-9_]+) sd-([0-7])"/g)];
  assert(starMatches.length === snapshot.companies.length, "star count differs from governed snapshot");
  for (const [, id, ordinal] of starMatches) {
    const company = snapshot.companies.find((row) => row.company_id === id);
    assert(company, `unknown company star ${id}`);
    assert(Number(ordinal) === company.second_depth.ordinal, `${id}: visual proof state differs from Helix ordinal`);
  }

  const promoted = snapshot.companies.filter((company) => company.second_depth.ordinal === 7);
  const crowns = (page.match(/class="crown"/g) ?? []).length;
  assert(crowns === promoted.length, "gold crown count differs from CLAIM_PROMOTED count");

  const detailTargets = [...page.matchAll(/<section id="d-([a-z0-9_]+)" class="starmap-detail">/g)].map((match) => match[1]);
  assert(detailTargets.length === snapshot.companies.length, "detail panel count differs from governed company count");
  assert(new Set(detailTargets).size === detailTargets.length, "duplicate detail target ids found");
  for (const company of snapshot.companies) {
    assert(detailTargets.includes(company.company_id), `${company.company_id}: detail target missing`);
    assert(page.includes(`/companies/${company.company_id.replaceAll("_", "-")}/`), `${company.company_id}: full company route missing`);
    assert(page.includes(company.second_depth.stage), `${company.company_id}: stage absent from rendered Starmap`);
    assert(page.includes(company.second_depth.claim_ceiling), `${company.company_id}: claim ceiling absent from rendered Starmap`);
    assert(page.includes(company.second_depth.next_gate), `${company.company_id}: next gate absent from rendered Starmap`);
    assert(page.includes(company.non_affiliation), `${company.company_id}: non-affiliation boundary absent from rendered Starmap`);
  }

  const flagshipById = new Map(snapshot.flagships.map((flagship) => [flagship.system_id, flagship]));
  const expectedDonorEdges = [];
  const referencedDonors = new Set();
  for (const company of snapshot.companies) {
    const donors = Array.isArray(company.applicable_flagships) ? company.applicable_flagships : [];
    for (const donor of donors) {
      assert(flagshipById.has(donor), `${company.company_id}: unknown canonical donor ${donor}`);
      expectedDonorEdges.push([company.company_id, donor]);
      referencedDonors.add(donor);
    }
  }
  const renderedEdges = (page.match(/class="donor-edge"/g) ?? []).length;
  const renderedDonors = (page.match(/class="donor-node"/g) ?? []).length;
  assert(renderedEdges === expectedDonorEdges.length, `donor edge count drift: expected ${expectedDonorEdges.length}, rendered ${renderedEdges}`);
  assert(renderedDonors === referencedDonors.size, `canonical donor node count drift: expected ${referencedDonors.size}, rendered ${renderedDonors}`);

  assert(page.includes('id="reveal-connections"'), "connection reveal control missing");
  assert(css.includes("#reveal-connections:checked~.starmap-control-bar+.starmap-stage"), "connection reveal selector is not wired to the stage sibling");
  assert(css.includes(".company-linkage:hover .donor-edge") && css.includes(".company-linkage:focus-within .donor-edge"), "per-company hover/focus donor trace is missing");
  assert(css.includes("@media(max-width:700px)"), "Starmap mobile contract missing");
  assert(css.includes("prefers-reduced-motion"), "Starmap reduced-motion contract missing");
  assert(css.includes("overflow-wrap:anywhere"), "Starmap long-identity containment missing");

  const stageCounts = Object.fromEntries(SECOND_DEPTH_STAGES.map((stage) => [stage, 0]));
  for (const company of snapshot.companies) stageCounts[company.second_depth.stage] += 1;

  console.log(JSON.stringify({
    schema: "glaciereq.proof-starmap-validation.v2",
    status: "PASS",
    company_stars: starMatches.length,
    canonical_donors: referencedDonors.size,
    donor_edges: expectedDonorEdges.length,
    claim_promoted_crowns: crowns,
    stage_counts: stageCounts,
    lens_entries: Object.keys(lenses.onomastics ?? {}).length,
    client_scripts: 0,
  }, null, 2));
}

main().catch((error) => {
  console.error(`Proof Starmap validation: FAIL: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
});

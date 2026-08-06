#!/usr/bin/env node

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SNAPSHOT = path.join(ROOT, "site-v15", "data", "helix-root.json");
const OUTPUT = path.join(ROOT, "site-v15", "atlas", "index.html");

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function repoUrl(repository) {
  return `https://github.com/${encodeURI(repository)}`;
}

function statusClass(state) {
  if (state === "PROMOTED") return "verified";
  if (state === "REFERENCE_ONLY") return "reviewed";
  return "blocked";
}

function flagshipCard(row, index) {
  return `<article class="card atlas-flagship">
    <div class="atlas-card-head"><span class="rank">${index + 1}</span><span class="status ${statusClass(row.state)}">${escapeHtml(row.level)} · ${escapeHtml(row.state)}</span></div>
    <h3>${escapeHtml(row.system_id.replaceAll("_", " "))}</h3>
    <p class="atlas-role">${escapeHtml(row.role)}</p>
    <p>${escapeHtml(row.evidence)}</p>
    <p class="atlas-gate"><strong>Next gate:</strong> ${escapeHtml(row.next_gate)}</p>
    <a class="button ghost small" href="${repoUrl(row.repository)}" target="_blank" rel="noopener">Inspect canonical repository</a>
  </article>`;
}

function companyBlock(company) {
  const repos = company.repositories
    .map((repo) => `<li><a href="${repoUrl(repo.repository)}" target="_blank" rel="noopener">${escapeHtml(repo.repository.split("/")[1])}</a><span>${escapeHtml(repo.level)} · ${escapeHtml(repo.promotion_state)}</span></li>`)
    .join("");
  const fallback = company.applicable_flagships?.length
    ? `<p class="atlas-applicable"><strong>Applicable personal flagships:</strong> ${company.applicable_flagships.map(escapeHtml).join(" · ")}</p>`
    : "";
  return `<details class="card atlas-company" ${company.repositories.length ? "" : "data-empty"}>
    <summary><span><strong>${escapeHtml(company.display_name)}</strong><small>${escapeHtml(company.track_state)}</small></span><b>${company.repositories.length} public systems</b></summary>
    <div class="atlas-company-body">
      <p>${escapeHtml(company.recruiter_thesis)}</p>
      <p><strong>Next gate:</strong> ${escapeHtml(company.gap_or_next_gate)}</p>
      ${repos ? `<ul class="atlas-repos">${repos}</ul>` : fallback}
      <p class="atlas-boundary">${escapeHtml(company.non_affiliation)}</p>
    </div>
  </details>`;
}

async function main() {
  const snapshot = JSON.parse(await readFile(SNAPSHOT, "utf8"));
  if (snapshot.schema !== "glaciereq.public-portfolio-projection.v1") {
    throw new Error("invalid Helix public projection schema");
  }
  const activeCompanies = snapshot.companies.filter((company) => company.repositories.length || company.applicable_flagships?.length);
  const publicMemberships = snapshot.companies.reduce((count, company) => count + company.repositories.length, 0);
  const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
  <meta name="theme-color" content="#03080b">
  <meta name="description" content="The live GlacierEQ Systems Atlas: Crown Jewels, company-aligned systems, evidence states, and promotion gates compiled from Job App Helix.">
  <meta name="robots" content="index,follow">
  <link rel="canonical" href="https://casey-barton-glaciereq.vercel.app/atlas/">
  <title>Systems Atlas · Casey Barton</title>
  <link rel="icon" href="/assets/favicon.svg" type="image/svg+xml">
  <link rel="stylesheet" href="/assets/site.css">
  <link rel="stylesheet" href="/assets/site.systems.css">
  <link rel="stylesheet" href="/assets/helix-atlas.css">
</head>
<body>
<a class="skip" href="#main">Skip to content</a>
<div class="signal-bar"><div class="shell signal-inner"><span class="signal-live">HELIX ROOT TRUTH · BUILD-VERIFIED PROJECTION</span><span>${snapshot.inventory.total_repositories} governed repositories · ${snapshot.flagships.length} public Crown Jewels · ${activeCompanies.length} active company lenses</span></div></div>
<header class="site-header"><div class="shell nav"><a class="brand" href="/" aria-label="Casey Barton portfolio home"><span class="mark">CB</span><span><strong>CASEY BARTON</strong><small>APPLIED AI SYSTEMS ARCHITECT</small></span></a><nav class="links" aria-label="Primary navigation"><a href="/">Recruiter</a><a href="/resume/">Résumé</a><a href="/master/">Master</a><a href="/mesh/">Mesh</a><a aria-current="page" href="/atlas/">Atlas</a><a href="/machine/">Machine</a></nav><a class="nav-cta" href="mailto:glacier.equilibrium@gmail.com">Start a conversation</a></div></header>
<main id="main">
<section class="hero atlas-hero"><div class="shell"><p class="eyebrow">ONE GOVERNED SOURCE · MANY HUMAN AND MACHINE PROJECTIONS</p><h1>The portfolio stays current from <em>one root truth.</em></h1><p class="lead">Job App Helix owns portfolio admission, evidence state, Crown Jewel hierarchy, company alignment, and promotion gates. Every repository retains authority over its own code and native receipts. This Atlas compiles only the public-safe result.</p><div class="proof-strip" aria-label="Atlas scope"><div><b>${snapshot.inventory.total_repositories}</b><span>governed repositories</span></div><div><b>${snapshot.inventory.workspace_repositories}</b><span>workspace children</span></div><div><b>${snapshot.flagships.length}</b><span>public Crown Jewels</span></div><div><b>${publicMemberships}</b><span>public company memberships</span></div></div><div class="actions"><a class="button primary" href="#crown-jewels">Explore Crown Jewels</a><a class="button secondary" href="#company-lenses">Open company lenses</a><a class="button ghost" href="/data/helix-root.json">Inspect machine snapshot</a></div></div></section>
<section id="crown-jewels" class="section"><div class="shell"><div class="section-head"><div><p class="eyebrow">CROWN JEWELS</p><h2>Systems with a governed public proof path.</h2></div><p>Each card carries its present evidence state and next promotion gate. Blocked work stays blocked; strong work is not flattened into the same wall of links.</p></div><div class="atlas-grid">${snapshot.flagships.map(flagshipCard).join("")}</div></div></section>
<section id="company-lenses" class="section alt"><div class="shell"><div class="section-head"><div><p class="eyebrow">COMPANY LENSES</p><h2>The same capabilities, recomposed for different operating environments.</h2></div><p>These are independent alignment dossiers—not affiliation claims. Open a company to see only its public, governed systems and explicit next gates.</p></div><div class="atlas-companies">${activeCompanies.map(companyBlock).join("")}</div></div></section>
<section class="section tight"><div class="shell callout"><p class="eyebrow">SOURCE AND STABILITY</p><h2>This page is generated at build time, then served statically.</h2><p>The build fails when Helix is unreachable, a required source disappears, inventory counts drift, a private record leaks, or a projection violates its authority boundary. Browser rendering never depends on a live GitHub request.</p><div class="actions"><a class="button primary" href="https://github.com/GlacierEQ/job-app-helix" target="_blank" rel="noopener">Inspect Job App Helix</a><a class="button ghost" href="/machine/">Read machine contracts</a></div></div></section>
</main>
<footer class="site-footer"><div class="shell"><p><strong>Casey Barton · GlacierEQ</strong></p><p>Independent systems work. Company alignment does not imply affiliation, endorsement, employment, proprietary access, or production deployment.</p></div></footer>
</body>
</html>\n`;
  await mkdir(path.dirname(OUTPUT), { recursive: true });
  await writeFile(OUTPUT, html, "utf8");
  console.log(`Helix Systems Atlas rendered: ${path.relative(ROOT, OUTPUT)}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack : error);
  process.exitCode = 1;
});

#!/usr/bin/env node

import { existsSync } from "node:fs";
import { readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { admittedAtlasCompany } from "./public-atlas-admission.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SITE = path.join(ROOT, "site-v15");
const SNAPSHOT = path.join(SITE, "data", "helix-root.json");
const COMPANY_ID_PATTERN = /^[a-z0-9_]+$/;
const CHECK = process.argv.includes("--check");

function companySlug(companyId) {
  if (typeof companyId !== "string" || !COMPANY_ID_PATTERN.test(companyId)) {
    throw new Error(`invalid company identity: ${String(companyId)}`);
  }
  return companyId.replaceAll("_", "-");
}

async function htmlFiles(directory) {
  let entries;
  try {
    entries = await readdir(directory, { withFileTypes: true });
  } catch (error) {
    throw new Error(
      `cannot read ${path.relative(ROOT, directory)}: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
  const files = [];
  for (const entry of entries) {
    const target = path.join(directory, entry.name);
    if (entry.isSymbolicLink()) {
      throw new Error(
        `symbolic links are not allowed in the generated site tree: ${path.relative(ROOT, target)}`,
      );
    }
    if (entry.isDirectory()) files.push(...(await htmlFiles(target)));
    else if (entry.isFile() && entry.name.endsWith(".html")) files.push(target);
  }
  return files;
}

async function patchHtml(file, { check, drifted }) {
  if (path.resolve(file) === path.join(SITE, "index.html")) return false;
  let text = await readFile(file, "utf8");
  const navStart = text.indexOf('<nav class="links"');
  if (navStart < 0) return false;
  const navEnd = text.indexOf("</nav>", navStart);
  if (navEnd < 0) {
    throw new Error(`cannot locate primary navigation close in ${path.relative(ROOT, file)}`);
  }
  const nav = text.slice(navStart, navEnd);
  if (nav.includes('href="/atlas/"')) return false;
  text = `${text.slice(0, navEnd)}<a href="/atlas/">Atlas</a>${text.slice(navEnd)}`;
  if (check) {
    drifted.push(path.relative(ROOT, file).replaceAll(path.sep, "/"));
  } else {
    await writeFile(file, text, "utf8");
  }
  return true;
}

async function patchTextFile(relative, linePrefix, replacement, { check, drifted }) {
  const file = path.join(SITE, relative);
  const text = await readFile(file, "utf8");
  const lines = text.split("\n").filter((line) => !line.startsWith(linePrefix));
  while (lines.length && lines.at(-1) === "") lines.pop();
  lines.push(replacement, "");
  const next = lines.join("\n");
  if (next === text) return;
  if (check) {
    drifted.push(path.relative(ROOT, file).replaceAll(path.sep, "/"));
  } else {
    await writeFile(file, next, "utf8");
  }
}

async function updateSitemap(companyIds, { check, drifted }) {
  const sitemap = path.join(SITE, "sitemap.xml");
  const source = await readFile(sitemap, "utf8");
  if (!source.includes("</urlset>")) throw new Error("sitemap.xml has no closing urlset element");

  const expectedCompanyUrls = new Set(
    companyIds.map(
      (id) => `https://casey-barton-glaciereq.vercel.app/companies/${companySlug(id)}/`,
    ),
  );
  const starmapExists = existsSync(path.join(SITE, "atlas", "starmap", "index.html"));

  const wanted = [
    "https://casey-barton-glaciereq.vercel.app/atlas/",
    "https://casey-barton-glaciereq.vercel.app/companies/",
    "https://casey-barton-glaciereq.vercel.app/inventions/",
    "https://casey-barton-glaciereq.vercel.app/evidence-gallery/",
    "https://casey-barton-glaciereq.vercel.app/visualizer/",
    ...expectedCompanyUrls,
  ];
  if (starmapExists) {
    wanted.splice(1, 0, "https://casey-barton-glaciereq.vercel.app/atlas/starmap/");
  }

  let text = source;
  // Remove only stale/duplicate /companies/<slug>/ entries so existing order stays stable.
  const seenCompanyUrls = new Set();
  text = text.replace(
    /\s*<url><loc>(https:\/\/casey-barton-glaciereq\.vercel\.app\/companies\/[^\/<]+\/)<\/loc>(?:<priority>[^<]+<\/priority>)?<\/url>/g,
    (match, url) => {
      if (!expectedCompanyUrls.has(url) || seenCompanyUrls.has(url)) return "";
      seenCompanyUrls.add(url);
      return match;
    },
  );
  if (!starmapExists) {
    text = text.replace(
      /\s*<url><loc>https:\/\/casey-barton-glaciereq\.vercel\.app\/atlas\/starmap\/<\/loc>(?:<priority>[^<]+<\/priority>)?<\/url>/g,
      "",
    );
  }

  const insertion = wanted
    .filter((url) => !text.includes(`<loc>${url}</loc>`))
    .map((url) => `  <url><loc>${url}</loc></url>`)
    .join("\n");
  const closing = text.lastIndexOf("</urlset>");
  if (insertion) {
    text = `${text.slice(0, closing).trimEnd()}\n${insertion}\n${text.slice(closing)}`;
  }
  const normalized = text.endsWith("\n") ? text : `${text}\n`;
  if (normalized === source) return;
  if (check) {
    drifted.push(path.relative(ROOT, sitemap).replaceAll(path.sep, "/"));
  } else {
    await writeFile(sitemap, normalized, "utf8");
  }
}

async function main() {
  const snapshot = JSON.parse(await readFile(SNAPSHOT, "utf8"));
  if (!Array.isArray(snapshot.companies)) {
    throw new Error("Helix snapshot companies are missing");
  }
  if (snapshot.companies.length === 0) {
    throw new Error("public Helix snapshot must contain at least one admitted company");
  }
  if (snapshot.company_second_depth?.schema !== "glaciereq.company-second-depth.v1") {
    throw new Error("Helix snapshot second-depth contract is missing");
  }
  const admittedIds = snapshot.companies.filter(admittedAtlasCompany).map((company) => company.company_id);
  const companyIds = snapshot.companies.map((company) => company.company_id);
  if (new Set(companyIds).size !== companyIds.length) {
    throw new Error("duplicate company ids in Helix snapshot");
  }
  if (admittedIds.length === 0) {
    throw new Error("public Helix snapshot has no admitted Atlas companies");
  }

  const drifted = [];
  let htmlPatched = 0;
  for (const file of await htmlFiles(SITE)) {
    if (await patchHtml(file, { check: CHECK, drifted })) htmlPatched += 1;
  }
  await patchTextFile(
    "llms.txt",
    "- Company Atlas:",
    "- Company Atlas: https://casey-barton-glaciereq.vercel.app/atlas/ (admitted evidence-backed company routes under /companies/<slug>/; Recruiter + Master + Machine + Mesh depth; Helix-governed second-depth stage, claim ceiling, blockers, next gate, and pinned public evidence)",
    { check: CHECK, drifted },
  );
  await updateSitemap(companyIds, { check: CHECK, drifted });

  if (CHECK && drifted.length > 0) {
    console.error(JSON.stringify({ status: "FAIL", mode: "check", drifted_files: drifted }, null, 2));
    process.exitCode = 1;
    return;
  }

  console.log(
    `Company Atlas ${CHECK ? "link check PASS" : `linked across ${htmlPatched} existing HTML surfaces`}; ${companyIds.length} company routes indexed`,
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack : error);
  process.exitCode = 1;
});

#!/usr/bin/env node

import { readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SITE = path.join(ROOT, "site-v15");
const SNAPSHOT = path.join(SITE, "data", "helix-root.json");
const COMPANY_ID_PATTERN = /^[a-z0-9_]+$/;

function companySlug(companyId) {
  if (typeof companyId !== "string" || !COMPANY_ID_PATTERN.test(companyId)) throw new Error(`invalid company identity: ${String(companyId)}`);
  return companyId.replaceAll("_", "-");
}

async function htmlFiles(directory) {
  let entries;
  try {
    entries = await readdir(directory, { withFileTypes: true });
  } catch (error) {
    throw new Error(`cannot read ${path.relative(ROOT, directory)}: ${error instanceof Error ? error.message : String(error)}`);
  }
  const files = [];
  for (const entry of entries) {
    const target = path.join(directory, entry.name);
    if (entry.isSymbolicLink()) throw new Error(`symbolic links are not allowed in the generated site tree: ${path.relative(ROOT, target)}`);
    if (entry.isDirectory()) files.push(...await htmlFiles(target));
    else if (entry.isFile() && entry.name.endsWith(".html")) files.push(target);
  }
  return files;
}

async function patchHtml(file) {
  let text = await readFile(file, "utf8");
  const navStart = text.indexOf('<nav class="links"');
  if (navStart < 0) return false;
  const navEnd = text.indexOf("</nav>", navStart);
  if (navEnd < 0) throw new Error(`cannot locate primary navigation close in ${path.relative(ROOT, file)}`);
  const nav = text.slice(navStart, navEnd);
  if (nav.includes('href="/atlas/"')) return false;
  text = `${text.slice(0, navEnd)}<a href="/atlas/">Atlas</a>${text.slice(navEnd)}`;
  await writeFile(file, text, "utf8");
  return true;
}

async function patchTextFile(relative, line) {
  const file = path.join(SITE, relative);
  let text = await readFile(file, "utf8");
  if (text.includes(line)) return false;
  if (!text.endsWith("\n")) text += "\n";
  text += `${line}\n`;
  await writeFile(file, text, "utf8");
  return true;
}

async function updateSitemap(companyIds) {
  const sitemap = path.join(SITE, "sitemap.xml");
  let text = await readFile(sitemap, "utf8");
  if (!text.includes("</urlset>")) throw new Error("sitemap.xml has no closing urlset element");

  text = text.replace(/\s*<url><loc>https:\/\/casey-barton-glaciereq\.vercel\.app\/companies\/[^<]+<\/loc>(?:<priority>[^<]+<\/priority>)?<\/url>/g, "");
  const wanted = [
    "https://casey-barton-glaciereq.vercel.app/atlas/",
    ...companyIds.map((id) => `https://casey-barton-glaciereq.vercel.app/companies/${companySlug(id)}/`),
  ];
  const insertion = wanted.filter((url) => !text.includes(`<loc>${url}</loc>`)).map((url) => `  <url><loc>${url}</loc></url>`).join("\n");
  const closing = text.lastIndexOf("</urlset>");
  if (insertion) text = `${text.slice(0, closing).trimEnd()}\n${insertion}\n${text.slice(closing)}`;
  await writeFile(sitemap, text.endsWith("\n") ? text : `${text}\n`, "utf8");
}

async function main() {
  const snapshot = JSON.parse(await readFile(SNAPSHOT, "utf8"));
  if (!Array.isArray(snapshot.companies)) throw new Error("Helix snapshot companies are missing");
  const companyIds = snapshot.companies.map((company) => company.company_id);
  if (new Set(companyIds).size !== companyIds.length) throw new Error("duplicate company ids in Helix snapshot");

  let htmlPatched = 0;
  for (const file of await htmlFiles(SITE)) {
    if (await patchHtml(file)) htmlPatched += 1;
  }
  await patchTextFile("llms.txt", "- Company Atlas: https://casey-barton-glaciereq.vercel.app/atlas/ (real company routes under /companies/<slug>/; Recruiter + Master + Machine + Mesh depth)");
  await updateSitemap(companyIds);
  console.log(`Company Atlas linked across ${htmlPatched} existing HTML surfaces; ${companyIds.length} company routes indexed`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack : error);
  process.exitCode = 1;
});

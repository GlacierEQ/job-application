#!/usr/bin/env node

import { readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SITE = path.join(ROOT, "site-v15");
const COMPANIES_URL = "https://casey-barton-glaciereq.vercel.app/companies/";

async function htmlFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const target = path.join(directory, entry.name);
    if (entry.isSymbolicLink()) throw new Error(`symbolic link found in generated site tree: ${path.relative(ROOT, target)}`);
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
  if (nav.includes('href="/companies/"')) return false;
  const atlasLink = nav.lastIndexOf('<a href="/atlas/">Atlas</a>');
  if (atlasLink >= 0) {
    const insertAt = navStart + atlasLink;
    text = `${text.slice(0, insertAt)}<a href="/companies/">Companies</a>${text.slice(insertAt)}`;
  } else {
    text = `${text.slice(0, navEnd)}<a href="/companies/">Companies</a>${text.slice(navEnd)}`;
  }
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

async function main() {
  let htmlPatched = 0;
  for (const file of await htmlFiles(SITE)) {
    if (await patchHtml(file)) htmlPatched += 1;
  }
  await patchTextFile("llms.txt", `- Company Constellation: ${COMPANIES_URL}`);

  const sitemapPath = path.join(SITE, "sitemap.xml");
  let sitemap = await readFile(sitemapPath, "utf8");
  if (!sitemap.includes(COMPANIES_URL)) {
    const closing = sitemap.lastIndexOf("</urlset>");
    if (closing < 0) throw new Error("sitemap.xml has no closing urlset element");
    sitemap = `${sitemap.slice(0, closing)}  <url><loc>${COMPANIES_URL}</loc></url>\n${sitemap.slice(closing)}`;
    await writeFile(sitemapPath, sitemap, "utf8");
  }

  console.log(`Company constellation linked across ${htmlPatched} HTML surfaces`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack : error);
  process.exitCode = 1;
});

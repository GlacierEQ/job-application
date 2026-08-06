#!/usr/bin/env node

import { readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SITE = path.join(ROOT, "site-v15");

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
    if (entry.isSymbolicLink()) {
      throw new Error(`symbolic links are not allowed in the generated site tree: ${path.relative(ROOT, target)}`);
    }
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

async function main() {
  let htmlPatched = 0;
  for (const file of await htmlFiles(SITE)) {
    if (await patchHtml(file)) htmlPatched += 1;
  }
  await patchTextFile("llms.txt", "- Systems Atlas: https://casey-barton-glaciereq.vercel.app/atlas/");

  const sitemap = path.join(SITE, "sitemap.xml");
  let sitemapText = await readFile(sitemap, "utf8");
  const atlasUrl = "https://casey-barton-glaciereq.vercel.app/atlas/";
  if (!sitemapText.includes(atlasUrl)) {
    const closing = sitemapText.lastIndexOf("</urlset>");
    if (closing < 0) throw new Error("sitemap.xml has no closing urlset element");
    sitemapText = `${sitemapText.slice(0, closing)}  <url><loc>${atlasUrl}</loc></url>\n${sitemapText.slice(closing)}`;
    await writeFile(sitemap, sitemapText, "utf8");
  }
  console.log(`Helix Atlas linked across ${htmlPatched} existing HTML surfaces`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack : error);
  process.exitCode = 1;
});

#!/usr/bin/env node

import { readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SITE = path.join(ROOT, "site-v15");
const ROUTES = [
  ["Companies", "/companies/"],
  ["Constellation", "/constellation/"],
  ["Proof", "/proof/"],
  ["Timeline", "/timeline/"],
  ["Academy", "/academy/"],
];

async function htmlFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const target = path.join(directory, entry.name);
    if (entry.isSymbolicLink()) throw new Error(`symbolic link is not allowed: ${path.relative(ROOT, target)}`);
    if (entry.isDirectory()) files.push(...await htmlFiles(target));
    else if (entry.isFile() && entry.name.endsWith(".html")) files.push(target);
  }
  return files;
}

async function addMasterclassLink(file) {
  let text = await readFile(file, "utf8");
  const navStart = text.indexOf('<nav class="links"');
  if (navStart < 0 || text.includes('href="/constellation/"')) return false;
  const navEnd = text.indexOf("</nav>", navStart);
  if (navEnd < 0) throw new Error(`navigation close missing: ${path.relative(ROOT, file)}`);
  text = `${text.slice(0, navEnd)}<a href="/constellation/">Masterclass</a>${text.slice(navEnd)}`;
  await writeFile(file, text, "utf8");
  return true;
}

async function updateSitemap() {
  const file = path.join(SITE, "sitemap.xml");
  let text = await readFile(file, "utf8");
  const closing = text.lastIndexOf("</urlset>");
  if (closing < 0) throw new Error("sitemap.xml has no closing urlset element");
  const additions = ROUTES
    .map(([, route]) => `https://casey-barton-glaciereq.vercel.app${route}`)
    .filter((url) => !text.includes(`<loc>${url}</loc>`))
    .map((url) => `  <url><loc>${url}</loc></url>\n`)
    .join("");
  if (additions) {
    text = `${text.slice(0, closing)}${additions}${text.slice(closing)}`;
    await writeFile(file, text, "utf8");
  }
}

async function updateLlms() {
  const file = path.join(SITE, "llms.txt");
  let text = await readFile(file, "utf8");
  const additions = ROUTES
    .map(([label, route]) => `- ${label}: https://casey-barton-glaciereq.vercel.app${route}`)
    .filter((line) => !text.includes(line));
  if (!additions.length) return;
  if (!text.endsWith("\n")) text += "\n";
  text += `${additions.join("\n")}\n`;
  await writeFile(file, text, "utf8");
}

async function main() {
  let patched = 0;
  for (const file of await htmlFiles(SITE)) {
    if (await addMasterclassLink(file)) patched += 1;
  }
  await Promise.all([updateSitemap(), updateLlms()]);
  console.log(`Website Masterclass linked across ${patched} existing HTML surfaces`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack : error);
  process.exitCode = 1;
});

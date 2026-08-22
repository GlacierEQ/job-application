#!/usr/bin/env node

import { readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SITE = path.join(ROOT, "site-v15");
const ATLAS_URL = "https://casey-barton-glaciereq.vercel.app/atlas/";

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
  if (nav.includes('href="/companies/"')) {
    text = text.replace('<a href="/companies/">Companies</a>', '<a href="/atlas/">Company Atlas</a>');
    await writeFile(file, text, "utf8");
    return true;
  }
  if (nav.includes('href="/atlas/"')) return false;
  text = `${text.slice(0, navEnd)}<a href="/atlas/">Company Atlas</a>${text.slice(navEnd)}`;
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
  await patchTextFile("llms.txt", `- Company Atlas: ${ATLAS_URL}`);

  console.log(`Company constellation linked across ${htmlPatched} HTML surfaces`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack : error);
  process.exitCode = 1;
});

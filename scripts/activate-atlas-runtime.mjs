#!/usr/bin/env node

import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const THIS_FILE = fileURLToPath(import.meta.url);
const ROOT = path.resolve(path.dirname(THIS_FILE), "..");
const DEFAULT_ATLAS = path.join(ROOT, "site-v15", "atlas", "index.html");
const FILTER_STATES = ["repository-rich", "seeded", "scaffold"];

function stylesheetAnchor(html) {
  for (const href of ["/assets/helix-atlas.stars.css", "/assets/helix-atlas.css"]) {
    const anchor = `<link rel="stylesheet" href="${href}">`;
    if (html.includes(anchor)) return anchor;
  }
  throw new Error("Atlas stylesheet anchor missing; renderer contract changed");
}

export function activateAtlasHtml(input) {
  let html = String(input);

  if (!html.includes('class="atlas-directory"')) {
    throw new Error("Atlas directory anchor missing; refusing partial activation");
  }
  const presentStates = FILTER_STATES.filter((state) => html.includes(`class="evidence-state ${state}"`));
  if (presentStates.length === 0) throw new Error("Atlas has no admitted evidence states");
  if (/<script\b/i.test(html)) {
    throw new Error("Atlas must remain script-free before interaction activation");
  }

  if (!html.includes('/assets/atlas-runtime.css')) {
    const anchor = stylesheetAnchor(html);
    html = html.replace(anchor, `${anchor}\n  <link rel="stylesheet" href="/assets/atlas-runtime.css">`);
  }

  if (!html.includes('class="atlas-filters"')) {
    const controls = `<fieldset class="atlas-filters" aria-label="Filter company lenses by evidence depth">
<legend>Evidence depth</legend>
<label class="atlas-filter-option"><input type="radio" name="atlas-evidence" value="all" checked>All company lenses</label>
${presentStates.map((state) => `<label class="atlas-filter-option"><input type="radio" name="atlas-evidence" value="${state}">${state === 'repository-rich' ? 'Repository-rich' : state === 'seeded' ? 'Seeded' : 'Scaffold'}</label>`).join('\n')}
<p class="atlas-filter-note">Filter by evidence depth without JavaScript. Browser Find remains available for company, stage, and state lookup.</p>
</fieldset>`;
    html = html.replace('<div class="atlas-directory">', `${controls}<div class="atlas-directory" aria-live="polite">`);
  }

  html = html
    .replace(/ · zero client scripts<\/span>/, ' · script-free evidence filters</span>')
    .replace(
      "Pointer precision is optional: the directory is the complete accessibility fallback and browser find provides instant text lookup without weakening the site’s no-script CSP.",
      "Pointer precision is optional: the complete directory supports first-class evidence-depth filtering without client script, while browser Find remains available for instant text lookup.",
    );

  if (/<script\b/i.test(html)) {
    throw new Error("Atlas interaction activation introduced a client script");
  }
  return html;
}

export async function activateAtlasFile(filePath = DEFAULT_ATLAS, { check = false } = {}) {
  const before = await readFile(filePath, "utf8");
  const after = activateAtlasHtml(before);
  const changed = before !== after;
  if (check) {
    if (changed) {
      throw new Error(`Atlas evidence filtering out of sync: ${path.relative(ROOT, filePath)}`);
    }
    return { changed: false, path: filePath, mode: "check" };
  }
  if (changed) {
    await writeFile(filePath, after, "utf8");
  }
  return { changed, path: filePath, mode: "write" };
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(THIS_FILE)) {
  const check = process.argv.includes("--check");
  const fileIndex = process.argv.indexOf("--file");
  const targetFile = fileIndex >= 0 && process.argv[fileIndex + 1]
    ? path.resolve(process.argv[fileIndex + 1])
    : DEFAULT_ATLAS;

  activateAtlasFile(targetFile, { check })
    .then(({ changed, path: target, mode }) => {
      if (mode === "check") {
        console.log(`Atlas evidence filtering verified: ${path.relative(ROOT, target)}`);
      } else {
        console.log(`Atlas evidence filtering ${changed ? "activated" : "already active"}: ${path.relative(ROOT, target)}`);
      }
    })
    .catch((error) => {
      console.error(error instanceof Error ? error.stack : error);
      process.exitCode = 1;
    });
}

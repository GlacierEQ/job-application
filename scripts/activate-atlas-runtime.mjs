#!/usr/bin/env node

import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const ATLAS = path.join(ROOT, "site-v15", "atlas", "index.html");

export function activateAtlasHtml(input) {
  let html = String(input);

  if (!html.includes('class="atlas-directory"')) {
    throw new Error("atlas directory anchor missing");
  }

  if (!html.includes('/assets/atlas-runtime.css')) {
    html = html.replace(
      '<link rel="stylesheet" href="/assets/helix-atlas.stars.css">',
      '<link rel="stylesheet" href="/assets/helix-atlas.stars.css">\n  <link rel="stylesheet" href="/assets/atlas-runtime.css">',
    );
  }

  if (!html.includes('class="atlas-filters"')) {
    const controls = `<fieldset class="atlas-filters" aria-label="Filter company lenses by evidence depth">
<legend>Evidence depth</legend>
<label class="atlas-filter-option"><input type="radio" name="atlas-evidence" value="all" checked>All company lenses</label>
<label class="atlas-filter-option"><input type="radio" name="atlas-evidence" value="repository-rich">Repository-rich</label>
<label class="atlas-filter-option"><input type="radio" name="atlas-evidence" value="seeded">Seeded</label>
<label class="atlas-filter-option"><input type="radio" name="atlas-evidence" value="scaffold">Scaffold</label>
<p class="atlas-filter-note">Evidence filtering works without JavaScript. Use browser Find for instant name, stage, or state lookup.</p>
</fieldset>`;
    html = html.replace('<div class="atlas-directory">', `${controls}<div class="atlas-directory">`);
  }

  html = html
    .replace(' · zero client scripts</span>', ' · script-free evidence filters</span>')
    .replace(
      'Pointer precision is optional: the directory is the complete accessibility fallback and browser find provides instant text lookup without weakening the site’s no-script CSP.',
      'Pointer precision is optional: the complete directory now supports first-class evidence-state filtering with no client script, while browser Find remains available for instant text lookup.',
    );

  if (/<script\b/i.test(html)) {
    throw new Error("atlas interaction must remain script-free");
  }

  return html;
}

export async function activateAtlasFile(filePath = ATLAS) {
  const before = await readFile(filePath, "utf8");
  const after = activateAtlasHtml(before);
  await writeFile(filePath, after, "utf8");
  return { changed: before !== after, path: filePath };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  activateAtlasFile()
    .then(({ changed, path: target }) => {
      console.log(`Atlas interaction ${changed ? "activated" : "already active"}: ${path.relative(ROOT, target)}`);
    })
    .catch((error) => {
      console.error(error instanceof Error ? error.stack : error);
      process.exitCode = 1;
    });
}

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

  if (!html.includes('data-atlas-search')) {
    const controls = `<div class="atlas-controls" role="search" aria-label="Filter company lenses">
<label class="atlas-control"><span>Search companies, stages, or states</span><input data-atlas-search type="search" autocomplete="off" placeholder="Search Adobe, code inspected, promoted…"></label>
<label class="atlas-control"><span>Evidence depth</span><select data-atlas-evidence><option value="all">All evidence states</option><option value="repository-rich">Repository-rich</option><option value="seeded">Seeded</option><option value="scaffold">Scaffold</option></select></label>
<p class="atlas-result-count" data-atlas-result-count aria-live="polite">All company lenses visible</p>
</div>`;
    html = html.replace('<div class="atlas-directory">', `${controls}<div class="atlas-directory">`);
  }

  html = html
    .replace(' · zero client scripts</span>', ' · local client search</span>')
    .replace(
      'Pointer precision is optional: the directory is the complete accessibility fallback and browser find provides instant text lookup without weakening the site’s no-script CSP.',
      'Pointer precision is optional: the directory remains the complete accessibility fallback, while a small self-hosted search layer adds instant company and evidence filtering without third-party code.',
    );

  if (!html.includes('/assets/atlas-runtime.js')) {
    html = html.replace(
      '</body>',
      '<script type="module" src="/assets/atlas-runtime.js"></script>\n</body>',
    );
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
      console.log(`Atlas runtime ${changed ? "activated" : "already active"}: ${path.relative(ROOT, target)}`);
    })
    .catch((error) => {
      console.error(error instanceof Error ? error.stack : error);
      process.exitCode = 1;
    });
}

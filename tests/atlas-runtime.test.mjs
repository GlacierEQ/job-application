import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { activateAtlasHtml } from "../scripts/activate-atlas-runtime.mjs";

const interactionCss = await readFile(new URL("../site-v15/assets/atlas-runtime.css", import.meta.url), "utf8");

test("atlas activation is deterministic, accessible, and script-free", () => {
  const fixture = `<!doctype html><html><head><link rel="stylesheet" href="/assets/helix-atlas.stars.css"></head><body><span>76 governed company lenses · 2 past mapping · zero client scripts</span><p>Pointer precision is optional: the directory is the complete accessibility fallback and browser find provides instant text lookup without weakening the site’s no-script CSP.</p><div class="atlas-directory"><a class="atlas-directory-item"><b class="evidence-state seeded">Seeded</b></a></div></body></html>`;
  const once = activateAtlasHtml(fixture);
  const twice = activateAtlasHtml(once);

  assert.equal(once, twice);
  assert.match(once, /class="atlas-filters"/);
  assert.match(once, /aria-label="Filter company lenses by evidence depth"/);
  assert.match(once, /value="repository-rich"/);
  assert.match(once, /value="seeded"/);
  assert.match(once, /value="scaffold"/);
  assert.match(once, /atlas-runtime\.css/);
  assert.doesNotMatch(once, /<script\b/i);
  assert.doesNotMatch(once, /zero client scripts/);
});

test("CSS implements all evidence-state filters against real atlas badge classes", () => {
  for (const state of ["repository-rich", "seeded", "scaffold"]) {
    assert.match(interactionCss, new RegExp(`input\\[value=\\"${state}\\"\\]`));
    assert.match(interactionCss, new RegExp(`evidence-state\\.${state}`));
  }
  assert.match(interactionCss, /:has\(/);
});

test("activation fails closed when the renderer contract disappears", () => {
  assert.throws(() => activateAtlasHtml("<html><body></body></html>"), /atlas directory anchor missing/);
});

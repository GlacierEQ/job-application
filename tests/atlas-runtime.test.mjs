import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { activateAtlasHtml } from "../scripts/activate-atlas-runtime.mjs";

const interactionCss = await readFile(new URL("../site-v15/assets/atlas-runtime.css", import.meta.url), "utf8");

function fixture() {
  return `<!doctype html><html><head><link rel="stylesheet" href="/assets/helix-atlas.stars.css"></head><body><span>76 governed company lenses · 2 past mapping · zero client scripts</span><p>Pointer precision is optional: the directory is the complete accessibility fallback and browser find provides instant text lookup without weakening the site’s no-script CSP.</p><div class="atlas-directory"><a class="atlas-directory-item"><b class="evidence-state repository-rich">Repository-rich</b></a><a class="atlas-directory-item"><b class="evidence-state seeded">Seeded</b></a><a class="atlas-directory-item"><b class="evidence-state scaffold">Scaffold</b></a></div></body></html>`;
}

test("activation is deterministic, accessible, and script-free", () => {
  const once = activateAtlasHtml(fixture());
  const twice = activateAtlasHtml(once);
  assert.equal(once, twice);
  assert.match(once, /class="atlas-filters"/);
  assert.match(once, /aria-label="Filter company lenses by evidence depth"/);
  assert.match(once, /aria-live="polite"/);
  assert.match(once, /atlas-runtime\.css/);
  assert.doesNotMatch(once, /<script\b/i);
  assert.doesNotMatch(once, /zero client scripts/);
});

test("all evidence-state filters bind to the real directory badge contract", () => {
  for (const state of ["repository-rich", "seeded", "scaffold"]) {
    assert.match(interactionCss, new RegExp(`input\\[value=\\"${state}\\"\\]`));
    assert.match(interactionCss, new RegExp(`evidence-state\\.${state}`));
  }
  assert.match(interactionCss, /:has\(/);
  assert.match(interactionCss, /focus-within/);
});

test("activation fails closed if any evidence cohort disappears", () => {
  const incomplete = fixture().replace('<a class="atlas-directory-item"><b class="evidence-state scaffold">Scaffold</b></a>', "");
  assert.throws(() => activateAtlasHtml(incomplete), /evidence state 'scaffold' missing/);
});

test("activation refuses renderer-contract drift and preexisting client scripts", () => {
  assert.throws(() => activateAtlasHtml("<html><body></body></html>"), /Atlas directory anchor missing/);
  assert.throws(() => activateAtlasHtml(`${fixture()}<script>boom()</script>`), /must remain script-free/);
});

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";

import { activateAtlasHtml } from "../scripts/activate-atlas-runtime.mjs";

const runtimeSource = await readFile(new URL("../site-v15/assets/atlas-runtime.js", import.meta.url), "utf8");

function loadRuntime() {
  const context = vm.createContext({ console });
  context.globalThis = context;
  vm.runInContext(runtimeSource, context, { filename: "atlas-runtime.js" });
  return context.AtlasRuntime;
}

test("production atlas runtime matches search text and evidence state", () => {
  const runtime = loadRuntime();
  assert.equal(runtime.matchesAtlasItem({ query: "adobe", evidence: "all", text: "Adobe · Code Inspected", evidenceState: "seeded" }), true);
  assert.equal(runtime.matchesAtlasItem({ query: "anthropic", evidence: "all", text: "Adobe · Code Inspected", evidenceState: "seeded" }), false);
  assert.equal(runtime.matchesAtlasItem({ query: "", evidence: "repository-rich", text: "Anthropic", evidenceState: "repository-rich" }), true);
  assert.equal(runtime.matchesAtlasItem({ query: "", evidence: "repository-rich", text: "Adobe", evidenceState: "seeded" }), false);
});

test("atlas runtime safely declines when the enhancement controls are absent", () => {
  const runtime = loadRuntime();
  const documentStub = { querySelector: () => null };
  assert.equal(runtime.initAtlasRuntime(documentStub), false);
});

test("atlas activation is deterministic and progressive", () => {
  const fixture = `<!doctype html><html><head><link rel="stylesheet" href="/assets/helix-atlas.stars.css"></head><body><span>76 governed company lenses · 2 past mapping · zero client scripts</span><p>Pointer precision is optional: the directory is the complete accessibility fallback and browser find provides instant text lookup without weakening the site’s no-script CSP.</p><div class="atlas-directory"><a class="atlas-directory-item"><b class="evidence-state seeded">Seeded</b></a></div></body></html>`;
  const once = activateAtlasHtml(fixture);
  const twice = activateAtlasHtml(once);

  assert.equal(once, twice);
  assert.match(once, /data-atlas-search/);
  assert.match(once, /data-atlas-evidence/);
  assert.match(once, /atlas-runtime\.css/);
  assert.match(once, /<script src="\/assets\/atlas-runtime\.js" defer><\/script>/);
  assert.doesNotMatch(once, /zero client scripts/);
});

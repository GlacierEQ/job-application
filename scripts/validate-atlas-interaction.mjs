#!/usr/bin/env node

import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const atlas = await readFile(path.join(ROOT, "site-v15", "atlas", "index.html"), "utf8");
const css = await readFile(path.join(ROOT, "site-v15", "assets", "atlas-runtime.css"), "utf8");

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

assert(!/<script\b/i.test(atlas), "final Atlas must remain script-free");
assert(atlas.includes('/assets/atlas-runtime.css'), "final Atlas missing interaction stylesheet");
assert(atlas.includes('class="atlas-filters"'), "final Atlas missing evidence filters");
assert(atlas.includes('value="all" checked'), "final Atlas missing all-state default");
for (const state of ["repository-rich", "seeded", "scaffold"]) {
  assert(atlas.includes(`value="${state}"`), `final Atlas missing ${state} control`);
  assert(css.includes(`evidence-state.${state}`), `interaction CSS missing ${state} selector`);
}
assert(atlas.includes('Use browser Find for instant name, stage, or state lookup.'), "text-search fallback missing");
assert(css.includes(':has('), "interaction CSS must bind filter state to directory evidence badges");

console.log(JSON.stringify({
  status: "PASS",
  surface: "company-atlas",
  interaction: "script-free-evidence-filtering",
  filters: ["all", "repository-rich", "seeded", "scaffold"],
  native_text_search: true,
  client_scripts: 0,
}, null, 2));

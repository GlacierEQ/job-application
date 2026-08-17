#!/usr/bin/env node

import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const atlas = await readFile(path.join(ROOT, "site-v15", "atlas", "index.html"), "utf8");
const css = await readFile(path.join(ROOT, "site-v15", "assets", "atlas-runtime.css"), "utf8");

function requireContract(condition, message) {
  if (!condition) throw new Error(message);
}

requireContract(!/<script\b/i.test(atlas), "final Atlas must remain script-free");
requireContract(atlas.includes('/assets/atlas-runtime.css'), "final Atlas missing interaction stylesheet");
requireContract(atlas.includes('class="atlas-filters"'), "final Atlas missing evidence filters");
requireContract(atlas.includes('value="all" checked'), "final Atlas missing all-state default");
requireContract(atlas.includes('aria-live="polite"'), "final Atlas directory missing live-region semantics");

const counts = {};
for (const state of ["repository-rich", "seeded", "scaffold"]) {
  const badges = atlas.match(new RegExp(`class="evidence-state ${state}"`, "g")) ?? [];
  counts[state] = badges.length;
  requireContract(counts[state] > 0, `final Atlas has no ${state} entries`);
  requireContract(atlas.includes(`value="${state}"`), `final Atlas missing ${state} control`);
  requireContract(css.includes(`evidence-state.${state}`), `interaction CSS missing ${state} selector`);
}
requireContract(css.includes(":has("), "interaction CSS must bind controls to directory evidence badges");
requireContract(css.includes("focus-within"), "interaction CSS missing keyboard focus treatment");

const directoryItems = atlas.match(/class="atlas-directory-item"/g)?.length ?? 0;
const classified = Object.values(counts).reduce((sum, count) => sum + count, 0);
requireContract(directoryItems === classified, `directory classification mismatch: ${directoryItems} items vs ${classified} evidence badges`);

console.log(JSON.stringify({
  status: "PASS",
  surface: "company-atlas",
  interaction: "script-free-evidence-filtering",
  directory_items: directoryItems,
  cohorts: counts,
  client_scripts: 0,
  native_text_search: true,
}, null, 2));

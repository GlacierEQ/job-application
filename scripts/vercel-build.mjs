import { spawnSync } from 'node:child_process';

const node = process.execPath;
const steps = [
  ['scripts/sync-helix-projection-effective.mjs'],
  ['scripts/reconcile-helix-company-cardinality.mjs'],
  ['scripts/validate-helix-projection.mjs'],
  ['scripts/render-helix-atlas.mjs'],
  ['scripts/link-helix-atlas.mjs'],
  ['scripts/project-estate-intelligence.mjs'],
  ['scripts/render-full-estate-explorer.mjs'],
  ['scripts/normalize-full-estate-design.mjs'],
  ['scripts/validate-full-estate-explorer.mjs'],
  ['scripts/render-estate-role-lenses.mjs'],
  ['scripts/validate-estate-role-lenses.mjs'],
  ['scripts/apply-complete-web-design.mjs'],
  ['scripts/compress-recruiter-surface.mjs'],
  ['scripts/compress-recruiter-surface.mjs', '--check'],
  ['scripts/render-invention-evidence-map.mjs'],
  ['scripts/validate-invention-evidence-map.mjs'],
  ['scripts/render-evidence-gallery.mjs'],
  ['scripts/validate-evidence-gallery.mjs'],
  ['scripts/validate-algerian-display.mjs'],
  ['--test', 'deployment/vercel-source-bridge/typography-proxy.test.js'],
  ['scripts/validate-estate-intelligence.mjs'],
  ['scripts/validate-helix-atlas.mjs'],
  ['scripts/harden-public-proof-surface.mjs'],
  ['scripts/validate-public-proof-surface.mjs'],
  ['scripts/normalize-full-estate-design.mjs', '--check'],
  ['scripts/validate-estate-role-lenses.mjs'],
  ['site-v15/scripts/validate.mjs'],
];

for (const args of steps) {
  console.log(`\n> ${node} ${args.join(' ')}`);
  const result = spawnSync(node, args, { stdio: 'inherit' });
  if (result.status !== 0) process.exit(result.status ?? 1);
}

#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import process from 'node:process';

const steps = [
  ['scripts/validate-vercel-route-boundaries.mjs'],
  ['scripts/sync-helix-projection-effective.mjs'],
  ['scripts/reconcile-helix-company-cardinality.mjs'],
  ['scripts/validate-helix-projection.mjs'],
  ['scripts/render-helix-atlas.mjs'],
  ['scripts/link-helix-atlas.mjs'],
  ['scripts/project-estate-intelligence.mjs'],
  ['scripts/apply-complete-web-design.mjs'],
  ['scripts/compress-recruiter-surface.mjs'],
  ['scripts/compress-recruiter-surface.mjs', '--check'],
  ['scripts/render-invention-evidence-map.mjs'],
  ['scripts/validate-invention-evidence-map.mjs'],
  ['scripts/render-evidence-gallery.mjs'],
  ['scripts/validate-evidence-gallery.mjs'],
  ['scripts/link-helix-atlas.mjs'],
  ['scripts/validate-algerian-display.mjs'],
  ['--test', 'deployment/vercel-source-bridge/typography-proxy.test.js'],
  ['scripts/validate-estate-intelligence.mjs'],
  ['scripts/validate-helix-atlas.mjs'],
  ['scripts/harden-public-proof-surface.mjs'],
  ['scripts/validate-public-proof-surface.mjs'],
  ['site-v15/scripts/validate.mjs'],
];

for (const args of steps) {
  const result = spawnSync(process.execPath, args, { stdio: 'inherit' });
  if (result.status !== 0) process.exit(result.status ?? 1);
}

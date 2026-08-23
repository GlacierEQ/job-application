#!/usr/bin/env bash
# build.sh — Vercel build pipeline for GlacierEQ Hiring System
# Checked-in source is the release input; build steps may generate declared artifacts but may not rewrite source to satisfy prior presentation or authority targets.
set -euo pipefail

echo "=== Phase 1: Route & Projection Validation ==="
node scripts/validate-vercel-route-boundaries.mjs
node scripts/sync-helix-projection-effective.mjs
node scripts/validate-helix-projection.mjs

echo "=== Phase 2: Atlas & Estate Rendering ==="
node scripts/render-helix-atlas.mjs
node scripts/link-helix-atlas.mjs
node scripts/project-estate-intelligence.mjs
node scripts/render-full-estate-explorer.mjs
node scripts/validate-full-estate-explorer.mjs
node scripts/render-estate-role-lenses.mjs
node scripts/validate-estate-role-lenses.mjs

echo "=== Phase 3: Evidence & Invention Maps ==="
node scripts/render-invention-evidence-map.mjs
node scripts/validate-invention-evidence-map.mjs
node scripts/render-evidence-gallery.mjs
node scripts/validate-evidence-gallery.mjs

echo "=== Phase 4: Display & Typography Verification ==="
node scripts/validate-algerian-display.mjs
node --test deployment/vercel-source-bridge/typography-proxy.test.js

echo "=== Phase 5: Intelligence & Proof Validation ==="
node scripts/validate-estate-intelligence.mjs
node scripts/validate-helix-atlas.mjs
node scripts/validate-public-proof-surface.mjs

echo "=== Phase 6: Final Invariant Gates ==="
node scripts/validate-estate-role-lenses.mjs
node site-v15/scripts/validate.mjs

echo "=== BUILD COMPLETE ==="

#!/usr/bin/env bash
# build.sh — Vercel build pipeline for GlacierEQ Hiring System
# Each step is explicit and individually debuggable.
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
node scripts/normalize-full-estate-design.mjs
node scripts/validate-full-estate-explorer.mjs
node scripts/render-estate-role-lenses.mjs
node scripts/validate-estate-role-lenses.mjs

echo "=== Phase 3: Design & Compression ==="
node scripts/apply-complete-web-design.mjs
node scripts/compress-recruiter-surface.mjs
node scripts/compress-recruiter-surface.mjs --check

echo "=== Phase 4: Evidence & Invention Maps ==="
node scripts/render-invention-evidence-map.mjs
node scripts/validate-invention-evidence-map.mjs
node scripts/render-evidence-gallery.mjs
node scripts/validate-evidence-gallery.mjs

echo "=== Phase 5: Display & Typography Verification ==="
node scripts/validate-algerian-display.mjs
node --test deployment/vercel-source-bridge/typography-proxy.test.js

echo "=== Phase 6: Intelligence & Proof Hardening ==="
node scripts/validate-estate-intelligence.mjs
node scripts/validate-helix-atlas.mjs
node scripts/harden-public-proof-surface.mjs
node scripts/validate-public-proof-surface.mjs

echo "=== Phase 7: Final Invariant Gates ==="
node scripts/normalize-full-estate-design.mjs --check
node scripts/validate-estate-role-lenses.mjs
node site-v15/scripts/validate.mjs

echo "=== BUILD COMPLETE ==="

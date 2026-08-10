#!/usr/bin/env node

import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SNAPSHOT = path.join(ROOT, 'site-v15/data/helix-root.json');
const ATLAS_CSS = path.join(ROOT, 'site-v15/assets/helix-atlas.css');
const RECEIPT = path.join(ROOT, 'site-v15/data/company-cardinality-reconciliation.json');

const CARDINALITY_CONSUMERS = [
  'scripts/validate-helix-projection.mjs',
  'scripts/render-helix-atlas.mjs',
  'scripts/link-helix-atlas.mjs',
  'scripts/validate-helix-atlas.mjs',
  'site-v15/scripts/validate.mjs',
  'deployment/vercel-source-bridge/api/proxy.js',
  'deployment/vercel-source-bridge/api/design-proxy.js',
  'deployment/vercel-source-bridge/api/compiler-proxy.js',
  'deployment/vercel-source-bridge/api/typography-proxy.js',
  'deployment/vercel-source-bridge/proxy.test.js',
  'deployment/vercel-source-bridge/design-proxy.test.js',
  'deployment/vercel-source-bridge/compiler-proxy.test.js',
  'deployment/vercel-source-bridge/typography-proxy.test.js',
];

const STANDARD_RUNTIME_HELIX_PIN_CONSUMERS = [
  'deployment/vercel-source-bridge/api/proxy.js',
  'deployment/vercel-source-bridge/api/design-proxy.js',
];
const COMPILER_RUNTIME_HELIX_PIN = 'deployment/vercel-source-bridge/api/compiler-proxy.js';
const COMPILER_TEST_HELIX_PIN = 'deployment/vercel-source-bridge/compiler-proxy.test.js';
const RUNTIME_HELIX_PIN_CONSUMERS = [
  ...STANDARD_RUNTIME_HELIX_PIN_CONSUMERS,
  COMPILER_RUNTIME_HELIX_PIN,
];

const CONTEXT = /(compan(?:y|ies)|track|atlas|portfolio|helix)/i;
const VISUAL_CAPACITY_CONTEXT = /(constellation|company positions|capacity guard|star-p)/i;
const SECOND_DEPTH_STAGES = [
  'MAPPED_ONLY',
  'ROLE_VERIFIED',
  'PROBLEM_BOUNDED',
  'CODE_INSPECTED',
  'REMEDY_BOUNDED',
  'IMPLEMENTED',
  'PROOF_REPRODUCED',
  'CLAIM_PROMOTED',
];

function sha256(text) {
  return createHash('sha256').update(text).digest('hex');
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function ringPositions(startIndex, count, radius, offsetDegrees) {
  if (count <= 0) return [];
  return Array.from({ length: count }, (_, offset) => {
    const index = startIndex + offset;
    const angle = (offsetDegrees + (360 * offset) / count) * Math.PI / 180;
    const left = 50 + radius * Math.cos(angle);
    const top = 50 + radius * Math.sin(angle);
    return `.atlas-star.star-p${index}{left:${left.toFixed(3)}%;top:${top.toFixed(3)}%}`;
  });
}

function constellationRings(count) {
  const rings = [];
  let remaining = count;
  let ordinal = 0;
  while (remaining > 0) {
    const capacity = 12 + ordinal * 8;
    const assigned = Math.min(remaining, capacity);
    rings.push(assigned);
    remaining -= assigned;
    ordinal += 1;
  }
  return rings;
}

function constellationPositionCss(count) {
  const rings = constellationRings(count);
  const innerRadius = 16;
  const outerRadius = 47;
  let startIndex = 0;
  const rows = [];
  for (let index = 0; index < rings.length; index += 1) {
    const ringCount = rings[index];
    const radius = rings.length === 1
      ? 31
      : innerRadius + ((outerRadius - innerRadius) * index) / (rings.length - 1);
    const offset = -90 + (index % 2 === 0 ? 0 : 180 / ringCount);
    rows.push(...ringPositions(startIndex, ringCount, radius, offset));
    startIndex += ringCount;
  }
  return { css: rows.join(''), ringCount: rings.length, rings };
}

function updateStandardRuntimePin(source, relative, helixCommit) {
  const pinPattern = /const HELIX_COMMIT = '[a-f0-9]{40}';/;
  if (!pinPattern.test(source)) throw new Error(`${relative}: immutable HELIX_COMMIT pin missing`);
  const desired = `const HELIX_COMMIT = '${helixCommit}';`;
  if (source.includes(desired)) return { source, changed: false };
  return { source: source.replace(pinPattern, desired), changed: true };
}

function updateCompilerRuntimePin(source, helixCommit) {
  const pinPattern = /const COMPILER_HELIX_COMMIT = '[a-f0-9]{40}';/;
  if (!pinPattern.test(source)) throw new Error('compiler-proxy.js: immutable COMPILER_HELIX_COMMIT pin missing');
  const desired = `const COMPILER_HELIX_COMMIT = '${helixCommit}';`;
  let next = source.includes(desired) ? source : source.replace(pinPattern, desired);
  const countPattern = /(data\.projection\.company_count\s*!==\s*)\d+/;
  if (!countPattern.test(next)) throw new Error('compiler-proxy.js: V25 company-count verifier missing');
  next = next.replace(countPattern, `$1${companyCount}`);
  return { source: next, changed: next !== source };
}

function updateCompilerTestPin(source, helixCommit) {
  const anchor = 'compiler.constants.COMPILER_HELIX_COMMIT';
  const anchorIndex = source.indexOf(anchor);
  if (anchorIndex < 0) throw new Error('compiler-proxy.test.js: compiler authority assertion missing');
  const prefix = source.slice(0, anchorIndex);
  const suffix = source.slice(anchorIndex);
  const pinPattern = /'[a-f0-9]{40}'/;
  if (!pinPattern.test(suffix)) throw new Error('compiler-proxy.test.js: immutable compiler authority pin missing');
  const nextSuffix = suffix.replace(pinPattern, `'${helixCommit}'`);
  return { source: `${prefix}${nextSuffix}`, changed: nextSuffix !== suffix };
}

function scaleAtlasRenderer(source) {
  let next = source;
  const guardPattern = /\n  if \(companies\.length > \d+\) \{\n    throw new Error\("constellation supports at most \d+ governed company positions"\);\n  \}\n/;
  if (guardPattern.test(next)) next = next.replace(guardPattern, '\n');
  const radiusPattern = /const radius = 21 \+ r \* 12; \/\/ 21%, 33%, 45%, 57%, \.\.\./;
  if (!radiusPattern.test(next)) {
    throw new Error('render-helix-atlas.mjs: scalable constellation radius anchor missing');
  }
  next = next.replace(
    radiusPattern,
    'const radius = rings.length === 1 ? 31 : 16 + (31 * r) / (rings.length - 1);',
  );
  return { source: next, changed: next !== source };
}

const snapshotText = await readFile(SNAPSHOT, 'utf8');
const snapshot = JSON.parse(snapshotText);
const companyCount = Array.isArray(snapshot.companies) ? snapshot.companies.length : 0;
const helixCommit = String(snapshot?.source?.root_ref ?? '');
if (!Number.isInteger(companyCount) || companyCount < 1) {
  throw new Error('Helix snapshot does not expose a non-empty company projection');
}
if (!/^[a-f0-9]{40}$/.test(helixCommit)) {
  throw new Error(`Helix snapshot root_ref is not an immutable commit: ${helixCommit || 'missing'}`);
}

const stageCounts = Object.fromEntries(SECOND_DEPTH_STAGES.map(stage => [stage, 0]));
for (const company of snapshot.companies) {
  const stage = company?.second_depth?.stage;
  if (!(stage in stageCounts)) throw new Error(`Unexpected Helix second-depth stage: ${String(stage)}`);
  stageCounts[stage] += 1;
}
if (Object.values(stageCounts).reduce((sum, count) => sum + count, 0) !== companyCount) {
  throw new Error('Second-depth stage distribution does not reconcile to company cardinality');
}

const patched = [];
for (const relative of CARDINALITY_CONSUMERS) {
  const target = path.join(ROOT, relative);
  let source;
  try {
    source = await readFile(target, 'utf8');
  } catch (error) {
    if (error?.code === 'ENOENT') continue;
    throw error;
  }

  let replacements = 0;
  let runtimeHelixPinUpdated = false;
  let historicalProofBoundaryUpdated = false;
  let next = source
    .split('\n')
    .map(line => {
      let changed = line;

      if (changed.includes('49') && CONTEXT.test(changed)) {
        const occurrences = changed.match(/\b49\b/g)?.length ?? 0;
        changed = changed.replace(/\b49\b/g, String(companyCount));
        replacements += occurrences;
      }

      const rendererCapacityGuard = /companies\.length\s*>\s*64/.test(changed);
      if (changed.includes('64') && (VISUAL_CAPACITY_CONTEXT.test(changed) || rendererCapacityGuard)) {
        const occurrences = changed.match(/\b64\b/g)?.length ?? 0;
        changed = changed.replace(/\b64\b/g, String(companyCount));
        replacements += occurrences;
      }

      if (changed.includes('.star-p63') && /capacity guard/i.test(changed)) {
        changed = changed.replaceAll('.star-p63', `.star-p${companyCount - 1}`);
        replacements += 1;
      }

      for (const [stage, expected] of Object.entries(stageCounts)) {
        if (!changed.includes(stage)) continue;
        const escaped = escapeRegExp(stage);
        const patterns = [
          new RegExp(`(stageCounts\\.${escaped}\\s*===\\s*)\\d+`, 'g'),
          new RegExp(`(depthCounts\\.${escaped}\\s*===\\s*)\\d+`, 'g'),
          new RegExp(`(stageCounts\\[['\"]${escaped}['\"]\\]\\s*===\\s*)\\d+`, 'g'),
          new RegExp(`(assertStageCount\\(\\s*['\"]${escaped}['\"]\\s*,\\s*)\\d+`, 'g'),
        ];
        for (const pattern of patterns) {
          changed = changed.replace(pattern, (match, prefix) => {
            replacements += 1;
            return `${prefix}${expected}`;
          });
        }
      }

      return changed;
    })
    .join('\n');

  if (relative === 'scripts/render-helix-atlas.mjs') {
    const result = scaleAtlasRenderer(next);
    if (result.changed) {
      next = result.source;
      replacements += 2;
    }
  }

  if (STANDARD_RUNTIME_HELIX_PIN_CONSUMERS.includes(relative)) {
    const result = updateStandardRuntimePin(next, relative, helixCommit);
    if (result.changed) {
      next = result.source;
      replacements += 1;
      runtimeHelixPinUpdated = true;
    }
  }

  if (relative === COMPILER_RUNTIME_HELIX_PIN) {
    const result = updateCompilerRuntimePin(next, helixCommit);
    if (result.changed) {
      next = result.source;
      replacements += 1;
      runtimeHelixPinUpdated = true;
    }
  }

  if (relative === COMPILER_TEST_HELIX_PIN) {
    const result = updateCompilerTestPin(next, helixCommit);
    if (result.changed) {
      next = result.source;
      replacements += 1;
    }
  }

  if (relative === 'deployment/vercel-source-bridge/api/design-proxy.js') {
    const historicalCoupling = "&& star?.company_projection?.helix_commit === HELIX_COMMIT;";
    const historicalBoundary = "&& /^[a-f0-9]{40}$/.test(String(star?.company_projection?.helix_commit || ''));";
    if (next.includes(historicalCoupling)) {
      next = next.replace(historicalCoupling, historicalBoundary);
      replacements += 1;
      historicalProofBoundaryUpdated = true;
    } else if (!next.includes(historicalBoundary)) {
      throw new Error(`${relative}: current-proof Helix boundary is neither legacy nor reconciled`);
    }
  }

  if (next !== source) {
    await writeFile(target, next, 'utf8');
    patched.push({
      path: relative,
      replacements,
      runtime_helix_pin_updated: runtimeHelixPinUpdated,
      historical_proof_boundary_updated: historicalProofBoundaryUpdated,
      before_sha256: sha256(source),
      after_sha256: sha256(next),
    });
  }
}

const cssSource = await readFile(ATLAS_CSS, 'utf8');
const positionPattern = /\.atlas-star\.star-p\d+\{[^}]*\}/g;
const cssWithoutPositions = cssSource.replace(positionPattern, '').trimEnd();
const constellation = constellationPositionCss(companyCount);
const cssNext = `${cssWithoutPositions}\n${constellation.css}\n`;
await writeFile(ATLAS_CSS, cssNext, 'utf8');

if (companyCount !== 49 && patched.length === 0) {
  throw new Error(`Helix company count is ${companyCount}, but no stale cardinality consumer was reconciled`);
}
if (!cssNext.includes(`.atlas-star.star-p${companyCount - 1}{`)) {
  throw new Error('Generated constellation CSS does not cover the authoritative company count');
}

for (const relative of STANDARD_RUNTIME_HELIX_PIN_CONSUMERS) {
  const runtimeSource = await readFile(path.join(ROOT, relative), 'utf8');
  if (!runtimeSource.includes(`const HELIX_COMMIT = '${helixCommit}';`)) {
    throw new Error(`${relative}: runtime Helix authority does not match fresh projection`);
  }
}
const compilerRuntimeSource = await readFile(path.join(ROOT, COMPILER_RUNTIME_HELIX_PIN), 'utf8');
if (!compilerRuntimeSource.includes(`const COMPILER_HELIX_COMMIT = '${helixCommit}';`)) {
  throw new Error('compiler-proxy.js: compiler Helix authority does not match fresh projection');
}
if (!compilerRuntimeSource.includes(`data.projection.company_count !== ${companyCount}`)) {
  throw new Error('compiler-proxy.js: compiler company-count verifier does not match fresh projection');
}
const compilerTestSource = await readFile(path.join(ROOT, COMPILER_TEST_HELIX_PIN), 'utf8');
if (!compilerTestSource.includes(`'${helixCommit}'`)) {
  throw new Error('compiler-proxy.test.js: compiler authority test does not match fresh projection');
}
const rendererSource = await readFile(path.join(ROOT, 'scripts/render-helix-atlas.mjs'), 'utf8');
if (/companies\.length > \d+/.test(rendererSource)) {
  throw new Error('render-helix-atlas.mjs: historical constellation ceiling remains');
}
if (!rendererSource.includes('16 + (31 * r) / (rings.length - 1)')) {
  throw new Error('render-helix-atlas.mjs: bounded scalable ring radius missing');
}

const designSource = await readFile(path.join(ROOT, 'deployment/vercel-source-bridge/api/design-proxy.js'), 'utf8');
if (!designSource.includes("/^[a-f0-9]{40}$/.test(String(star?.company_projection?.helix_commit || ''))")) {
  throw new Error('Historical current-proof receipt is still coupled to the live Helix projection authority');
}

const receipt = {
  schema: 'glaciereq.public-company-cardinality-reconciliation.v8',
  status: 'PASS',
  source: 'site-v15/data/helix-root.json',
  source_sha256: sha256(snapshotText),
  authoritative_helix_commit: helixCommit,
  authoritative_company_tracks: companyCount,
  authoritative_second_depth_stage_counts: stageCounts,
  legacy_cardinality: 49,
  legacy_constellation_capacity: 64,
  generated_constellation_positions: companyCount,
  generated_constellation_rings: constellation.ringCount,
  generated_constellation_ring_population: constellation.rings,
  constellation_css_sha256: sha256(cssNext),
  runtime_helix_pin_consumers: RUNTIME_HELIX_PIN_CONSUMERS,
  compiler_authority_test_consumer: COMPILER_TEST_HELIX_PIN,
  patched_consumers: patched,
  invariants: [
    'Downstream public consumers validate the freshly synced Helix company projection rather than a historical fixed track count.',
    'Second-depth stage-count assertions follow the freshly synced public projection and may not preserve obsolete historical distributions.',
    'Both static constellation generators scale deterministic concentric rings to the governed company count instead of failing at historical presentation ceilings.',
    'Every governed company receives exactly one deterministic CSS position without inline style or client-side JavaScript.',
    'V21, design, and V25 compiler runtime bridges are reconciled to the same immutable Helix commit before release packaging.',
    'The V25 compiler count verifier is reconciled to the freshly synced authority rather than a historical numeric literal.',
    'The blob-pinned current-proof receipt preserves its historical Helix identity and is not required to equal the current runtime Helix projection commit.',
  ],
};
await writeFile(RECEIPT, `${JSON.stringify(receipt, null, 2)}\n`, 'utf8');

console.log(JSON.stringify({
  status: 'PASS',
  authoritative_helix_commit: helixCommit,
  authoritative_company_tracks: companyCount,
  second_depth: stageCounts,
  generated_constellation_positions: companyCount,
  generated_constellation_rings: constellation.ringCount,
  runtime_helix_pin_consumers: RUNTIME_HELIX_PIN_CONSUMERS.length,
  historical_proof_boundary: 'BLOB_PINNED_IDENTITY_SEPARATE_FROM_LIVE_PROJECTION',
  patched_consumers: patched.length,
  replacements: patched.reduce((sum, row) => sum + row.replacements, 0),
}));

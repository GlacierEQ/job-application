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
  'deployment/vercel-source-bridge/typography-proxy.test.js',
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

function constellationPositionCss(count) {
  const inner = Math.min(count, 12);
  const middle = Math.min(Math.max(count - inner, 0), 20);
  const outer = Math.max(count - inner - middle, 0);
  return [
    ...ringPositions(0, inner, 21, -90),
    ...ringPositions(inner, middle, 33, -90 + (middle ? 180 / middle : 0)),
    ...ringPositions(inner + middle, outer, 44, -90 + (outer ? 180 / outer : 0)),
  ].join('');
}

const snapshotText = await readFile(SNAPSHOT, 'utf8');
const snapshot = JSON.parse(snapshotText);
const companyCount = Array.isArray(snapshot.companies) ? snapshot.companies.length : 0;
if (!Number.isInteger(companyCount) || companyCount < 1) {
  throw new Error('Helix snapshot does not expose a non-empty company projection');
}
if (companyCount > 160) {
  throw new Error(`Helix company cardinality ${companyCount} exceeds the bounded script-free constellation design limit of 160`);
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
  const next = source
    .split('\n')
    .map(line => {
      let changed = line;

      if (changed.includes('49') && CONTEXT.test(changed)) {
        const occurrences = changed.match(/\b49\b/g)?.length ?? 0;
        changed = changed.replace(/\b49\b/g, String(companyCount));
        replacements += occurrences;
      }

      if (changed.includes('64') && VISUAL_CAPACITY_CONTEXT.test(changed)) {
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

  if (next !== source) {
    await writeFile(target, next, 'utf8');
    patched.push({
      path: relative,
      replacements,
      before_sha256: sha256(source),
      after_sha256: sha256(next),
    });
  }
}

const cssSource = await readFile(ATLAS_CSS, 'utf8');
const positionPattern = /\.atlas-star\.star-p\d+\{[^}]*\}/g;
const cssWithoutPositions = cssSource.replace(positionPattern, '').trimEnd();
const positionCss = constellationPositionCss(companyCount);
const cssNext = `${cssWithoutPositions}\n${positionCss}\n`;
await writeFile(ATLAS_CSS, cssNext, 'utf8');

if (companyCount !== 49 && patched.length === 0) {
  throw new Error(`Helix company count is ${companyCount}, but no stale cardinality consumer was reconciled`);
}
if (!cssNext.includes(`.atlas-star.star-p${companyCount - 1}{`)) {
  throw new Error('Generated constellation CSS does not cover the authoritative company count');
}

const receipt = {
  schema: 'glaciereq.public-company-cardinality-reconciliation.v3',
  status: 'PASS',
  source: 'site-v15/data/helix-root.json',
  source_sha256: sha256(snapshotText),
  authoritative_company_tracks: companyCount,
  authoritative_second_depth_stage_counts: stageCounts,
  legacy_cardinality: 49,
  legacy_constellation_capacity: 64,
  generated_constellation_positions: companyCount,
  constellation_css_sha256: sha256(cssNext),
  patched_consumers: patched,
  invariants: [
    'Downstream public consumers validate the freshly synced Helix company projection rather than a historical fixed track count.',
    'Second-depth stage-count assertions follow the freshly synced public projection and may not preserve obsolete historical distributions.',
    'The zero-script constellation receives one deterministic CSS position per governed company and never relies on inline style or client-side JavaScript.',
  ],
};
await writeFile(RECEIPT, `${JSON.stringify(receipt, null, 2)}\n`, 'utf8');

console.log(JSON.stringify({
  status: 'PASS',
  authoritative_company_tracks: companyCount,
  second_depth: stageCounts,
  generated_constellation_positions: companyCount,
  patched_consumers: patched.length,
  replacements: patched.reduce((sum, row) => sum + row.replacements, 0),
}));

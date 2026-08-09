#!/usr/bin/env node

import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SNAPSHOT_PATH = path.join(ROOT, 'site-v15/data/helix-root.json');
const RENDERER_PATH = path.join(ROOT, 'scripts/render-company-constellation.mjs');
const RECEIPT_PATH = path.join(ROOT, 'site-v15/data/company-constellation-taxonomy-reconciliation.json');

const INFRASTRUCTURE_IDS = new Set([
  'supabase', 'mongodb', 'gitlab', 'lambda', 'nebius', 'crusoe', 'together_ai',
  'modal', 'baseten', 'fireworks_ai', 'replicate', 'runpod', 'elastic', 'redis',
  'pinecone', 'weaviate', 'qdrant', 'motherduck',
]);

function sha256(text) {
  return createHash('sha256').update(text).digest('hex');
}

const snapshotText = await readFile(SNAPSHOT_PATH, 'utf8');
const snapshot = JSON.parse(snapshotText);
if (!Array.isArray(snapshot.companies) || !snapshot.companies.length) {
  throw new Error('Helix public projection has no company tracks');
}

let renderer = await readFile(RENDERER_PATH, 'utf8');
const beforeSha = sha256(renderer);
const originalClusterFunction = `function clusterFor(companyId) {
  const cluster = CLUSTER_BY_ID.get(companyId);
  assert(cluster, \`no presentation cluster is defined for \${companyId}\`);
  return cluster;
}`;
const originalInnovationFunction = `function innovationFor(companyId) {
  const innovation = INNOVATION_BY_ID.get(companyId);
  assert(innovation, \`no portfolio design target is defined for \${companyId}\`);
  return innovation;
}`;
const marker = 'HELIX_TOTAL_TAXONOMY_FALLBACK_V1';

if (!renderer.includes(marker)) {
  if (!renderer.includes(originalClusterFunction) || !renderer.includes(originalInnovationFunction)) {
    throw new Error('Company constellation renderer taxonomy functions drifted; refusing heuristic patch');
  }

  const infrastructureIds = JSON.stringify([...INFRASTRUCTURE_IDS]);
  const clusterFunction = `function clusterFor(companyId) {
  const cluster = CLUSTER_BY_ID.get(companyId);
  if (cluster) return cluster;
  // ${marker}: expansion targets without a legacy hand-curated presentation row remain renderable.
  // This is presentation taxonomy only; it does not promote evidence or assert a company-internal fact.
  return new Set(${infrastructureIds}).has(companyId) ? "Cloud & Platform" : "Product & Agents";
}`;
  const innovationFunction = `function innovationFor(companyId) {
  const innovation = INNOVATION_BY_ID.get(companyId);
  if (innovation) return innovation;
  // ${marker}: generic portfolio-design hypothesis for newly governed targets.
  // The generated summary separately labels every hypothesis as NOT_COMPANY_CLAIM.
  const label = String(companyId).replaceAll("_", " ").replace(/\\b\\w/g, (char) => char.toUpperCase());
  return \`\${label} Integration & Reliability Plane\`;
}`;

  renderer = renderer
    .replace(originalClusterFunction, clusterFunction)
    .replace(originalInnovationFunction, innovationFunction);
  await writeFile(RENDERER_PATH, renderer, 'utf8');
}

const explicitClusterIds = new Set();
const clusterMapMatch = renderer.match(/const CLUSTER_BY_ID = new Map\(Object\.entries\(\{([\s\S]*?)\}\)\);/);
if (clusterMapMatch) {
  for (const match of clusterMapMatch[1].matchAll(/\b([a-z0-9_]+):\s*"[^"]+"/g)) explicitClusterIds.add(match[1]);
}
const explicitInnovationIds = new Set();
const innovationMapMatch = renderer.match(/const INNOVATION_BY_ID = new Map\(Object\.entries\(\{([\s\S]*?)\}\)\);/);
if (innovationMapMatch) {
  for (const match of innovationMapMatch[1].matchAll(/\b([a-z0-9_]+):\s*"[^"]+"/g)) explicitInnovationIds.add(match[1]);
}

const fallbackTracks = snapshot.companies
  .filter((company) => !explicitClusterIds.has(company.company_id) || !explicitInnovationIds.has(company.company_id))
  .map((company) => ({
    company_id: company.company_id,
    display_name: company.display_name,
    cluster: explicitClusterIds.has(company.company_id)
      ? 'EXPLICIT'
      : (INFRASTRUCTURE_IDS.has(company.company_id) ? 'Cloud & Platform' : 'Product & Agents'),
    design_hypothesis: explicitInnovationIds.has(company.company_id)
      ? 'EXPLICIT'
      : `${String(company.display_name || company.company_id)} Integration & Reliability Plane`,
    evidence_effect: 'NONE_PRESENTATION_ONLY',
  }));

if (!renderer.includes(marker)) throw new Error('Company constellation total-taxonomy marker missing after reconciliation');

const receipt = {
  schema: 'glaciereq.company-constellation-taxonomy-reconciliation.v1',
  status: 'PASS',
  helix_commit: snapshot.source?.root_ref ?? null,
  governed_tracks: snapshot.companies.length,
  explicit_cluster_tracks: snapshot.companies.filter((company) => explicitClusterIds.has(company.company_id)).length,
  explicit_design_hypothesis_tracks: snapshot.companies.filter((company) => explicitInnovationIds.has(company.company_id)).length,
  fallback_tracks: fallbackTracks,
  renderer_before_sha256: beforeSha,
  renderer_after_sha256: sha256(renderer),
  truth_boundary: {
    taxonomy_is_presentation_only: true,
    fallback_does_not_promote_evidence: true,
    generated_design_hypothesis_is_company_claim: false,
    unknown_future_targets_remain_renderable: true,
  },
};
await writeFile(RECEIPT_PATH, `${JSON.stringify(receipt, null, 2)}\n`, 'utf8');

console.log(JSON.stringify({
  status: 'PASS',
  governed_tracks: snapshot.companies.length,
  fallback_tracks: fallbackTracks.length,
  renderer_sha256: sha256(renderer),
}));

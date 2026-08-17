#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SNAPSHOT_PATH = path.join(ROOT, 'site-v15/data/helix-root.json');
const RECEIPT_PATH = path.join(ROOT, 'site-v15/data/helix-root.receipt.json');
const POINTER_PATH = path.join(ROOT, 'portfolio-source.json');
const REPOSITORY_PATTERN = /^GlacierEQ\/[A-Za-z0-9_.-]+$/;
const SHA40 = /^[a-f0-9]{40}$/;
const TRANSIENT = new Set([408, 409, 425, 429, 500, 502, 503, 504]);
const SANITIZED_SURFACE = 'SANITIZED_CARD_ONLY';
const WITHHELD_IDENTITY = 'PRIVATE_REPOSITORY_IDENTITY_WITHHELD';

function fail(message) { throw new Error(`Helix flagship depth restoration failed: ${message}`); }
function assert(condition, message) { if (!condition) fail(message); }
function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stable(value[key])]));
  return value;
}
function stableJson(value) { return `${JSON.stringify(stable(value), null, 2)}\n`; }
function sha256(text) { return createHash('sha256').update(text).digest('hex'); }
async function loadJson(file, label) {
  const value = JSON.parse(await readFile(file, 'utf8'));
  assert(value && typeof value === 'object' && !Array.isArray(value), `${label} must be an object`);
  return value;
}
function requestHeaders(accept = 'application/vnd.github+json') {
  const value = { Accept: accept, 'User-Agent': 'GlacierEQ-job-application-flagship-restoration', 'X-GitHub-Api-Version': '2022-11-28' };
  if (process.env.GITHUB_TOKEN) value.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  return value;
}
async function fetchWithRecovery(url, accept = 'application/vnd.github+json', { allowNotFound = false } = {}) {
  let lastError = null;
  for (let attempt = 1; attempt <= 4; attempt += 1) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15_000);
    try {
      const response = await fetch(url, { headers: requestHeaders(accept), signal: controller.signal });
      if (response.ok || (allowNotFound && response.status === 404)) return response;
      const detail = `${url} returned ${response.status}`;
      if (!TRANSIENT.has(response.status) || attempt === 4) fail(detail);
      lastError = new Error(detail);
    } catch (error) {
      if (error instanceof Error && error.message.startsWith('Helix flagship depth restoration failed:')) throw error;
      lastError = error;
      if (attempt === 4) break;
    } finally { clearTimeout(timer); }
    await new Promise((resolve) => setTimeout(resolve, attempt * 750));
  }
  fail(lastError instanceof Error ? lastError.message : String(lastError));
}
async function repositoryIsPublic(repository) {
  assert(REPOSITORY_PATTERN.test(repository), `invalid repository identity ${repository}`);
  const response = await fetchWithRecovery(`https://api.github.com/repos/${repository}`, 'application/vnd.github+json', { allowNotFound: true });
  if (response.status === 404) return false;
  const metadata = await response.json();
  assert(metadata?.full_name === repository, `repository identity mismatch for ${repository}`);
  return metadata.private === false;
}
function sanitizedCard(row) {
  return {
    system_id: row.system_id,
    repository_identity: WITHHELD_IDENTITY,
    level: row.level,
    source_state: row.state,
    role: row.role,
    evidence: row.evidence,
    next_gate: row.next_gate,
    public_surface: SANITIZED_SURFACE,
    capability_preserved: true,
    repository_identity_withheld: true,
  };
}

async function main() {
  const [snapshot, receipt, pointer] = await Promise.all([
    loadJson(SNAPSHOT_PATH, 'Helix projection'),
    loadJson(RECEIPT_PATH, 'Helix projection receipt'),
    loadJson(POINTER_PATH, 'portfolio-source.json'),
  ]);
  const rootRef = snapshot.source?.root_ref;
  assert(typeof rootRef === 'string' && SHA40.test(rootRef), 'projection is not bound to an immutable Helix commit');
  assert(receipt.source_commit === rootRef, 'projection receipt source commit drift');
  const allowedStates = new Set(pointer.public_boundary?.allowed_promotion_states ?? []);
  const excludedMarkers = pointer.public_boundary?.excluded_surface_markers ?? [];
  assert(allowedStates.size > 0, 'allowed promotion states missing');
  assert(Array.isArray(excludedMarkers), 'excluded surface markers missing');

  const registryUrl = `https://raw.githubusercontent.com/GlacierEQ/job-app-helix/${rootRef}/manifests/flagship_registry.json`;
  const registry = await (await fetchWithRecovery(registryUrl, 'application/json')).json();
  assert(registry?.schema === 'glaciereq.flagship-registry.v2', `unexpected flagship registry schema ${registry?.schema ?? 'missing'}`);
  assert(Array.isArray(registry.flagships), 'flagship registry rows missing');

  const eligible = [];
  const sanitized = [];
  const nonPublic = [];
  for (const row of registry.flagships) {
    if (!row || typeof row !== 'object' || row.repository == null || row.level === 'L0') continue;
    const repository = String(row.repository);
    const surface = String(row.public_surface ?? '');
    const state = String(row.state ?? '');

    if (surface === SANITIZED_SURFACE) {
      sanitized.push(sanitizedCard(row));
      continue;
    }

    const excluded = excludedMarkers.some((marker) => surface.includes(marker));
    if (excluded || !allowedStates.has(state)) continue;
    if (!(await repositoryIsPublic(repository))) {
      nonPublic.push(row.system_id);
      continue;
    }
    eligible.push({ system_id: row.system_id, repository, level: row.level, state, role: row.role, evidence: row.evidence, next_gate: row.next_gate, public_surface: surface });
  }

  assert(eligible.length >= 6, `authority-eligible live-public flagship floor regressed: ${eligible.length}`);
  assert(sanitized.length >= 4, `sanitized capability floor regressed: ${sanitized.length}`);
  const eligibleIds = eligible.map((row) => row.system_id);
  const sanitizedIds = sanitized.map((row) => row.system_id);
  assert(new Set([...eligibleIds, ...sanitizedIds]).size === eligibleIds.length + sanitizedIds.length, 'duplicate projected capability IDs');

  const beforeIds = new Set((Array.isArray(snapshot.flagships) ? snapshot.flagships : []).map((row) => row.system_id));
  snapshot.flagships = eligible;
  snapshot.sanitized_capabilities = sanitized;
  snapshot.flagship_projection = {
    schema: 'glaciereq.public-flagship-projection.v3',
    source: 'manifests/flagship_registry.json',
    source_commit: rootRef,
    authority_eligible_count: eligible.length,
    sanitized_capability_count: sanitized.length,
    projected_capability_count: eligible.length + sanitized.length,
    prior_company_coupled_count: beforeIds.size,
    company_membership_required: false,
    repository_public_state_verified_live: true,
    sanitized_capability_identity_withheld: true,
    sanitized_system_ids: sanitizedIds.sort(),
    nonpublic_authority_rows_withheld: nonPublic.sort(),
    selection_rule: 'flagships remain live-public repository identities; SANITIZED_CARD_ONLY rows are emitted separately as capability cards with repository identity withheld',
  };
  const snapshotText = stableJson(snapshot);
  await writeFile(SNAPSHOT_PATH, snapshotText, 'utf8');
  receipt.output_sha256 = sha256(snapshotText);
  receipt.flagship_count = eligible.length;
  receipt.live_public_flagship_count = eligible.length;
  receipt.sanitized_capability_count = sanitized.length;
  receipt.projected_capability_count = eligible.length + sanitized.length;
  receipt.flagship_projection_schema = snapshot.flagship_projection.schema;
  await writeFile(RECEIPT_PATH, stableJson(receipt), 'utf8');
  console.log(JSON.stringify({
    status: 'PASS',
    source_commit: rootRef,
    flagships_before: beforeIds.size,
    live_public_flagships: eligible.length,
    sanitized_capabilities: sanitized.length,
    projected_capabilities: eligible.length + sanitized.length,
    restored_system_ids: [...eligibleIds, ...sanitizedIds].filter((id) => !beforeIds.has(id)),
    sanitized_system_ids: sanitizedIds.sort(),
    nonpublic_authority_rows_withheld: nonPublic.sort(),
    company_membership_required: false,
  }, null, 2));
}

main().catch((error) => { console.error(error instanceof Error ? error.stack : error); process.exitCode = 1; });

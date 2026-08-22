#!/usr/bin/env node
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const snapshot = JSON.parse(await readFile(path.join(ROOT, 'site-v15/data/helix-root.json'), 'utf8'));
const receipt = JSON.parse(await readFile(path.join(ROOT, 'site-v15/data/helix-root.receipt.json'), 'utf8'));
const requiredPublic = new Set(['job_app_helix', 'tower_of_babel', 'sigma_glue', 'pro_code_runtime', 'job_application']);
const requiredSanitized = new Set(['pro_code_doctrine', 'monolith', 'mega_pdf', 'fileboss']);
const publicRows = Array.isArray(snapshot.flagships) ? snapshot.flagships : [];
const sanitizedRows = Array.isArray(snapshot.sanitized_capabilities) ? snapshot.sanitized_capabilities : [];
const publicIds = new Set(publicRows.map((row) => row.system_id));
const sanitizedIds = new Set(sanitizedRows.map((row) => row.system_id));
const missingPublic = [...requiredPublic].filter((id) => !publicIds.has(id));
const missingSanitized = [...requiredSanitized].filter((id) => !sanitizedIds.has(id));

if (snapshot.flagship_projection?.schema !== 'glaciereq.public-flagship-projection.v3') throw new Error('flagship projection v3 metadata missing');
if (snapshot.flagship_projection.company_membership_required !== false) throw new Error('company membership still gates flagship projection');
if (snapshot.flagship_projection.repository_public_state_verified_live !== true) throw new Error('live public repository verification missing');
if (snapshot.flagship_projection.sanitized_capability_identity_withheld !== true) throw new Error('sanitized capability privacy invariant missing');
if (publicRows.length < 5) throw new Error(`live-public flagship depth regressed: ${publicRows.length}`);
if (sanitizedRows.length < 4) throw new Error(`sanitized capability depth regressed: ${sanitizedRows.length}`);
if (missingPublic.length) throw new Error(`required live-public flagship systems missing: ${missingPublic.join(',')}`);
if (missingSanitized.length) throw new Error(`required sanitized capability systems missing: ${missingSanitized.join(',')}`);
if (!Array.isArray(snapshot.flagship_projection.nonpublic_authority_rows_withheld)) throw new Error('nonpublic authority-row withholding receipt missing');
for (const systemId of ['akos', 'doctor_strange']) {
  if (!snapshot.flagship_projection.nonpublic_authority_rows_withheld.includes(systemId)) {
    throw new Error(`private ${systemId} identity was not withheld from public projection`);
  }
}

for (const id of requiredSanitized) {
  const row = sanitizedRows.find((candidate) => candidate.system_id === id);
  if (!row) throw new Error(`sanitized row missing: ${id}`);
  if ('repository' in row) throw new Error(`${id}: private repository identity leaked through repository field`);
  if (row.repository_identity !== 'PRIVATE_REPOSITORY_IDENTITY_WITHHELD') throw new Error(`${id}: withheld identity marker missing`);
  if (row.repository_identity_withheld !== true || row.capability_preserved !== true) throw new Error(`${id}: capability/privacy invariant incomplete`);
  if (row.public_surface !== 'SANITIZED_CARD_ONLY') throw new Error(`${id}: sanitized public surface drift`);
  if (typeof row.role !== 'string' || !row.role) throw new Error(`${id}: role was erased`);
  if (typeof row.evidence !== 'string' || !row.evidence) throw new Error(`${id}: evidence was erased`);
  if (typeof row.next_gate !== 'string' || !row.next_gate) throw new Error(`${id}: next gate was erased`);
}

if (receipt.flagship_count !== publicRows.length) throw new Error('flagship receipt count drift');
if (receipt.live_public_flagship_count !== snapshot.flagship_projection.authority_eligible_count) throw new Error('live-public receipt count drift');
if (receipt.sanitized_capability_count !== sanitizedRows.length) throw new Error('sanitized capability receipt count drift');
if (receipt.projected_capability_count !== publicRows.length + sanitizedRows.length) throw new Error('projected capability count drift');
if (receipt.flagship_projection_schema !== snapshot.flagship_projection.schema) throw new Error('flagship receipt schema drift');

console.log(JSON.stringify({
  status: 'PASS',
  live_public_flagships: publicRows.length,
  sanitized_capabilities: sanitizedRows.length,
  projected_capabilities: publicRows.length + sanitizedRows.length,
  required_public_systems: [...requiredPublic],
  required_sanitized_systems: [...requiredSanitized],
  withheld_nonpublic: snapshot.flagship_projection.nonpublic_authority_rows_withheld,
  company_membership_required: false,
}, null, 2));

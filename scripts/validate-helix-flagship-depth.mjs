#!/usr/bin/env node
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const snapshot = JSON.parse(await readFile(path.join(ROOT, 'site-v15/data/helix-root.json'), 'utf8'));
const receipt = JSON.parse(await readFile(path.join(ROOT, 'site-v15/data/helix-root.receipt.json'), 'utf8'));
const requiredPublic = new Set(['job_app_helix', 'akos', 'tower_of_babel', 'sigma_glue', 'pro_code_runtime', 'job_application']);
const requiredSanitized = new Set(['pro_code_doctrine', 'monolith', 'mega_pdf', 'fileboss']);
const rows = Array.isArray(snapshot.flagships) ? snapshot.flagships : [];
const ids = new Set(rows.map((row) => row.system_id));
const missingPublic = [...requiredPublic].filter((id) => !ids.has(id));
const missingSanitized = [...requiredSanitized].filter((id) => !ids.has(id));

if (snapshot.flagship_projection?.schema !== 'glaciereq.public-flagship-projection.v3') throw new Error('flagship projection v3 metadata missing');
if (snapshot.flagship_projection.company_membership_required !== false) throw new Error('company membership still gates flagship projection');
if (snapshot.flagship_projection.repository_public_state_verified_live !== true) throw new Error('live public repository verification missing');
if (snapshot.flagship_projection.sanitized_capability_identity_withheld !== true) throw new Error('sanitized capability privacy invariant missing');
if (rows.length < 10) throw new Error(`combined flagship depth regressed: ${rows.length}`);
if (missingPublic.length) throw new Error(`required live-public flagship systems missing: ${missingPublic.join(',')}`);
if (missingSanitized.length) throw new Error(`required sanitized capability systems missing: ${missingSanitized.join(',')}`);
if (!Array.isArray(snapshot.flagship_projection.nonpublic_authority_rows_withheld)) throw new Error('nonpublic authority-row withholding receipt missing');
if (!snapshot.flagship_projection.nonpublic_authority_rows_withheld.includes('doctor_strange')) throw new Error('private Doctor Strange identity was not withheld from public projection');

for (const id of requiredSanitized) {
  const row = rows.find((candidate) => candidate.system_id === id);
  if (!row) throw new Error(`sanitized row missing: ${id}`);
  if (row.repository !== null) throw new Error(`${id}: private repository identity leaked through repository field`);
  if (row.repository_identity !== 'PRIVATE_REPOSITORY_IDENTITY_WITHHELD') throw new Error(`${id}: withheld identity marker missing`);
  if (row.repository_identity_withheld !== true || row.capability_preserved !== true) throw new Error(`${id}: capability/privacy invariant incomplete`);
  if (row.public_surface !== 'SANITIZED_CARD_ONLY') throw new Error(`${id}: sanitized public surface drift`);
  if (typeof row.role !== 'string' || !row.role) throw new Error(`${id}: role was erased`);
  if (typeof row.evidence !== 'string' || !row.evidence) throw new Error(`${id}: evidence was erased`);
  if (typeof row.next_gate !== 'string' || !row.next_gate) throw new Error(`${id}: next gate was erased`);
}

if (receipt.flagship_count !== rows.length) throw new Error('flagship receipt count drift');
if (receipt.live_public_flagship_count !== snapshot.flagship_projection.authority_eligible_count) throw new Error('live-public receipt count drift');
if (receipt.sanitized_capability_count !== requiredSanitized.size) throw new Error('sanitized capability receipt count drift');
if (receipt.flagship_projection_schema !== snapshot.flagship_projection.schema) throw new Error('flagship receipt schema drift');

console.log(JSON.stringify({
  status: 'PASS',
  flagships: rows.length,
  live_public: snapshot.flagship_projection.authority_eligible_count,
  sanitized_capabilities: snapshot.flagship_projection.sanitized_capability_count,
  required_public_systems: [...requiredPublic],
  required_sanitized_systems: [...requiredSanitized],
  withheld_nonpublic: snapshot.flagship_projection.nonpublic_authority_rows_withheld,
  company_membership_required: false,
}, null, 2));

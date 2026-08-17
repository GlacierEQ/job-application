#!/usr/bin/env node
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const snapshot = JSON.parse(await readFile(path.join(ROOT, 'site-v15/data/helix-root.json'), 'utf8'));
const receipt = JSON.parse(await readFile(path.join(ROOT, 'site-v15/data/helix-root.receipt.json'), 'utf8'));
const required = new Set(['job_app_helix', 'akos', 'tower_of_babel', 'sigma_glue', 'pro_code_runtime', 'job_application']);
const ids = new Set((snapshot.flagships ?? []).map((row) => row.system_id));
const missing = [...required].filter((id) => !ids.has(id));
if (snapshot.flagship_projection?.schema !== 'glaciereq.public-flagship-projection.v2') throw new Error('flagship projection v2 metadata missing');
if (snapshot.flagship_projection.company_membership_required !== false) throw new Error('company membership still gates flagship projection');
if (snapshot.flagship_projection.repository_public_state_verified_live !== true) throw new Error('live public repository verification missing');
if ((snapshot.flagships ?? []).length < 6) throw new Error(`live-public flagship depth regressed: ${(snapshot.flagships ?? []).length}`);
if (missing.length) throw new Error(`required live-public flagship systems missing: ${missing.join(',')}`);
if (!Array.isArray(snapshot.flagship_projection.nonpublic_authority_rows_withheld)) throw new Error('nonpublic authority-row withholding receipt missing');
if (!snapshot.flagship_projection.nonpublic_authority_rows_withheld.includes('doctor_strange')) throw new Error('private Doctor Strange identity was not withheld from public projection');
if (receipt.flagship_count !== snapshot.flagships.length) throw new Error('flagship receipt count drift');
if (receipt.flagship_projection_schema !== snapshot.flagship_projection.schema) throw new Error('flagship receipt schema drift');
console.log(JSON.stringify({ status: 'PASS', flagships: snapshot.flagships.length, required_systems: [...required], withheld_nonpublic: snapshot.flagship_projection.nonpublic_authority_rows_withheld, company_membership_required: false }, null, 2));

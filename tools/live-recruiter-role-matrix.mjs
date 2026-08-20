#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

import { buildLiveRecruiterProof } from './live-recruiter-proof.mjs';

const require = createRequire(import.meta.url);
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const topologyRuntime = require('../deployment/vercel-source-bridge/api/workflow-topology-proxy.js');
const recruiterRuntime = require('../deployment/vercel-source-bridge/api/workflow-recruiter-proxy.js');

const SCHEMA = 'glaciereq.live-recruiter-role-matrix.v1';
const ROLES = Object.freeze(['recruiter', 'engineering-lead', 'systems-architect']);
const COMMIT_RE = /^[a-f0-9]{40}$/;

export class LiveRecruiterRoleMatrixError extends Error {}

function requireValue(condition, message) {
  if (!condition) throw new LiveRecruiterRoleMatrixError(message);
}

function stableStringify(value) {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

function receipt(value) {
  return crypto.createHash('sha256').update(stableStringify(value)).digest('hex');
}

function verifiedEntryFromPoint(point) {
  if (!COMMIT_RE.test(point?.commit_sha || '')) return null;
  requireValue(typeof point.system_id === 'string' && point.system_id, 'role_matrix_system_id_missing');
  requireValue(typeof point.repository === 'string' && point.repository.startsWith('https://github.com/GlacierEQ/'), `role_matrix_repository_boundary:${point.repository}`);
  requireValue(typeof point.verified_at === 'string' && !Number.isNaN(Date.parse(point.verified_at)), `role_matrix_verified_at_invalid:${point.system_id}`);
  requireValue(Number.isInteger(point.age_days) && point.age_days >= 0, `role_matrix_age_invalid:${point.system_id}`);
  requireValue(typeof point.freshness_weight === 'number' && point.freshness_weight > 0 && point.freshness_weight <= 1, `role_matrix_weight_invalid:${point.system_id}`);
  return {
    id: point.system_id,
    repository: point.repository.slice('https://github.com/'.length).replace(/\/$/, ''),
    commit_sha: point.commit_sha,
    verified_at: point.verified_at,
    age_days: point.age_days,
    freshness_weight: point.freshness_weight,
    state: point.freshness_state,
    verification_workflow: point.verification_workflow,
    verification_workflow_path: point.verification_workflow_path,
    verification_branch: point.verification_branch,
    verification_event: point.verification_event,
    verification_run_id: point.verification_run_id,
    verification_url: point.verification_url,
  };
}

export function extractSharedFreshness(seedProof) {
  requireValue(seedProof?.schema === 'glaciereq.live-recruiter-proof-snapshot.v1', 'role_matrix_seed_schema');
  requireValue(typeof seedProof.freshness_receipt_sha256 === 'string' && /^[a-f0-9]{64}$/.test(seedProof.freshness_receipt_sha256), 'role_matrix_freshness_receipt_invalid');
  const entries = new Map();
  for (const brief of seedProof.briefs || []) {
    for (const point of brief.proof_points || []) {
      const candidate = verifiedEntryFromPoint(point);
      if (!candidate) continue;
      const previous = entries.get(candidate.id);
      if (previous) {
        requireValue(stableStringify(previous) === stableStringify(candidate), `role_matrix_conflicting_verification:${candidate.id}`);
      } else {
        entries.set(candidate.id, candidate);
      }
    }
  }
  const ordered = [...entries.values()].sort((left, right) => left.id.localeCompare(right.id));
  requireValue(ordered.length === seedProof.coverage?.verified_systems, 'role_matrix_verified_coverage_mismatch');
  const missing = Array.isArray(seedProof.missing_systems) ? seedProof.missing_systems.map((entry) => ({ ...entry })) : [];
  requireValue(missing.length === seedProof.coverage?.unverified_systems, 'role_matrix_unverified_coverage_mismatch');
  return Object.freeze({
    schema: 'glaciereq.live-evidence-freshness.v1',
    receipt_sha256: seedProof.freshness_receipt_sha256,
    entries: Object.freeze(ordered.map((entry) => Object.freeze(entry))),
    missing_systems: Object.freeze(missing.map((entry) => Object.freeze(entry))),
  });
}

export async function buildLiveRecruiterRoleMatrix(topology, {
  asOf = new Date(),
  fetchImpl = fetch,
} = {}) {
  requireValue(topology?.schema === 'glaciereq.workflow-topology.v1', 'role_matrix_topology_schema');
  requireValue(asOf instanceof Date && !Number.isNaN(asOf.getTime()), 'role_matrix_invalid_as_of');

  // WHY: verification is role-independent. Pay the GitHub identity cost once, then rank every role from that exact graph.
  const seedProof = await buildLiveRecruiterProof(topology, 'recruiter', { asOf, fetchImpl });
  const freshness = extractSharedFreshness(seedProof);
  const roles = {};
  for (const role of ROLES) {
    roles[role] = recruiterRuntime.rankFlows(topology, role, freshness);
  }

  const core = {
    schema: SCHEMA,
    as_of: asOf.toISOString(),
    topology_receipt_sha256: topology.receipt_sha256 || null,
    registry_receipt_sha256: seedProof.registry_receipt_sha256,
    freshness_receipt_sha256: seedProof.freshness_receipt_sha256,
    verification_passes: 1,
    roles_generated: ROLES.length,
    coverage: seedProof.coverage,
    missing_systems: seedProof.missing_systems,
    roles,
    efficiency_policy: 'verify exact repository/run identity once, then derive all role rankings from the same freshness graph',
  };
  return { ...core, receipt_sha256: receipt(core) };
}

function parseArgs(argv) {
  const args = { output: null, topology: null, asOf: new Date() };
  for (let index = 2; index < argv.length; index += 1) {
    const arg = argv[index];
    const value = argv[index + 1];
    if (arg === '--output') {
      requireValue(value, 'role_matrix_output_requires_value');
      args.output = path.resolve(value);
      index += 1;
    } else if (arg === '--topology') {
      requireValue(value, 'role_matrix_topology_requires_value');
      args.topology = path.resolve(value);
      index += 1;
    } else if (arg === '--as-of') {
      requireValue(value, 'role_matrix_as_of_requires_value');
      args.asOf = new Date(value);
      requireValue(!Number.isNaN(args.asOf.getTime()), 'role_matrix_invalid_as_of');
      index += 1;
    } else {
      throw new LiveRecruiterRoleMatrixError(`role_matrix_unknown_argument:${arg}`);
    }
  }
  return args;
}

function writeAtomicJson(target, payload) {
  fs.mkdirSync(path.dirname(target), { recursive: true });
  const temporary = `${target}.${process.pid}.tmp`;
  fs.writeFileSync(temporary, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
  fs.renameSync(temporary, target);
}

export async function main(argv = process.argv) {
  const args = parseArgs(argv);
  const topology = args.topology
    ? JSON.parse(fs.readFileSync(args.topology, 'utf8'))
    : await topologyRuntime.loadTopology();
  const matrix = await buildLiveRecruiterRoleMatrix(topology, { asOf: args.asOf });
  if (args.output) writeAtomicJson(args.output, matrix);
  process.stdout.write(`${JSON.stringify(matrix, null, 2)}\n`);
  return matrix;
}

export { ROLES };

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    process.stderr.write(`${error instanceof Error ? error.stack || error.message : String(error)}\n`);
    process.exitCode = 1;
  });
}

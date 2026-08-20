#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

import { buildLiveRecruiterRoleMatrix } from './live-recruiter-role-matrix.mjs';

const SCHEMA = 'glaciereq.live-recruiter-gap-analysis.v1';
const COMMIT_RE = /^[a-f0-9]{40}$/;

export class LiveRecruiterGapAnalysisError extends Error {}

function requireValue(condition, message) {
  if (!condition) throw new LiveRecruiterGapAnalysisError(message);
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

function round(value) {
  return Math.round(value * 1e6) / 1e6;
}

function validateMatrix(matrix) {
  requireValue(matrix?.schema === 'glaciereq.live-recruiter-role-matrix.v1', 'gap_matrix_schema');
  requireValue(typeof matrix.receipt_sha256 === 'string' && /^[a-f0-9]{64}$/.test(matrix.receipt_sha256), 'gap_matrix_receipt');
  requireValue(typeof matrix.freshness_receipt_sha256 === 'string' && /^[a-f0-9]{64}$/.test(matrix.freshness_receipt_sha256), 'gap_freshness_receipt');
  requireValue(matrix.verification_passes === 1, 'gap_matrix_verification_passes');
  requireValue(matrix.roles && typeof matrix.roles === 'object', 'gap_matrix_roles');
}

function pointOpportunity(role, flow, point) {
  const roleWeight = Number(point?.role_weight || 0);
  const freshnessWeight = Number(point?.freshness_weight || 0);
  requireValue(Number.isFinite(roleWeight) && roleWeight >= 0, `gap_role_weight:${role}:${point?.system_id || 'unknown'}`);
  requireValue(Number.isFinite(freshnessWeight) && freshnessWeight >= 0 && freshnessWeight <= 1, `gap_freshness_weight:${role}:${point?.system_id || 'unknown'}`);

  const recoverableScore = round(roleWeight * (1 - freshnessWeight));
  if (recoverableScore <= 0) return null;

  const commitSha = point?.commit_sha ?? null;
  if (commitSha !== null) requireValue(COMMIT_RE.test(commitSha), `gap_commit_sha:${role}:${point?.system_id || 'unknown'}`);
  const verifiedAt = point?.verified_at ?? null;
  if (verifiedAt !== null) requireValue(!Number.isNaN(Date.parse(verifiedAt)), `gap_verified_at:${role}:${point?.system_id || 'unknown'}`);

  return {
    role,
    flow_id: flow.flow_id,
    flow_name: flow.name,
    system_id: point.system_id,
    repository: point.repository,
    role_weight: roleWeight,
    freshness_weight: freshnessWeight,
    freshness_state: point.freshness_state || 'unverified',
    age_days: point.age_days ?? null,
    current_commit_sha: commitSha,
    verified_at: verifiedAt,
    verification_workflow: point.verification_workflow ?? null,
    verification_run_id: point.verification_run_id ?? null,
    recoverable_score: recoverableScore,
    action: freshnessWeight === 0
      ? 'establish exact successful verification identity'
      : 'refresh exact verification evidence on the owning repository',
  };
}

export function analyzeRecruiterGaps(matrix) {
  validateMatrix(matrix);
  const byRole = {};

  for (const [role, flows] of Object.entries(matrix.roles)) {
    requireValue(Array.isArray(flows) && flows.length > 0, `gap_role_flows:${role}`);
    const opportunities = [];
    const seen = new Map();

    for (const flow of flows) {
      requireValue(typeof flow?.flow_id === 'string' && flow.flow_id, `gap_flow_id:${role}`);
      for (const point of flow.proof_points || []) {
        const candidate = pointOpportunity(role, flow, point);
        if (!candidate) continue;
        const previous = seen.get(candidate.system_id);
        if (!previous || candidate.recoverable_score > previous.recoverable_score) {
          seen.set(candidate.system_id, candidate);
        }
      }
    }

    opportunities.push(...seen.values());
    opportunities.sort((left, right) =>
      right.recoverable_score - left.recoverable_score
      || right.role_weight - left.role_weight
      || left.system_id.localeCompare(right.system_id));

    const currentTop = flows[0];
    const totalRecoverableScore = round(opportunities.reduce((sum, entry) => sum + entry.recoverable_score, 0));
    byRole[role] = {
      current_top_flow: currentTop.flow_id,
      current_top_score: currentTop.score,
      total_recoverable_score: totalRecoverableScore,
      opportunity_count: opportunities.length,
      top_opportunities: opportunities,
    };
  }

  const all = Object.values(byRole).flatMap((entry) => entry.top_opportunities);
  all.sort((left, right) =>
    right.recoverable_score - left.recoverable_score
    || right.role_weight - left.role_weight
    || left.role.localeCompare(right.role)
    || left.system_id.localeCompare(right.system_id));

  const core = {
    schema: SCHEMA,
    as_of: matrix.as_of,
    matrix_receipt_sha256: matrix.receipt_sha256,
    freshness_receipt_sha256: matrix.freshness_receipt_sha256,
    coverage: matrix.coverage,
    policy: 'rank only evidence gaps that can recover recruiter score; exact missing verification scores as zero freshness and stale proof exposes its recoverable role contribution',
    roles: byRole,
    global_top_opportunities: all,
  };
  return { ...core, receipt_sha256: receipt(core) };
}

function parseArgs(argv) {
  const args = { matrix: null, output: null, topology: null, asOf: new Date() };
  for (let index = 2; index < argv.length; index += 1) {
    const arg = argv[index];
    const value = argv[index + 1];
    if (arg === '--matrix') {
      requireValue(value, 'gap_matrix_requires_value');
      args.matrix = path.resolve(value);
      index += 1;
    } else if (arg === '--output') {
      requireValue(value, 'gap_output_requires_value');
      args.output = path.resolve(value);
      index += 1;
    } else if (arg === '--topology') {
      requireValue(value, 'gap_topology_requires_value');
      args.topology = path.resolve(value);
      index += 1;
    } else if (arg === '--as-of') {
      requireValue(value, 'gap_as_of_requires_value');
      args.asOf = new Date(value);
      requireValue(!Number.isNaN(args.asOf.getTime()), 'gap_invalid_as_of');
      index += 1;
    } else {
      throw new LiveRecruiterGapAnalysisError(`gap_unknown_argument:${arg}`);
    }
  }
  requireValue(!(args.matrix && args.topology), 'gap_matrix_and_topology_are_mutually_exclusive');
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
  let matrix;
  if (args.matrix) {
    matrix = JSON.parse(fs.readFileSync(args.matrix, 'utf8'));
  } else {
    const topology = args.topology
      ? JSON.parse(fs.readFileSync(args.topology, 'utf8'))
      : null;
    requireValue(topology, 'gap_live_mode_requires_topology_or_matrix');
    matrix = await buildLiveRecruiterRoleMatrix(topology, { asOf: args.asOf });
  }
  const result = analyzeRecruiterGaps(matrix);
  if (args.output) writeAtomicJson(args.output, result);
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  return result;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    process.stderr.write(`${error instanceof Error ? error.stack || error.message : String(error)}\n`);
    process.exitCode = 1;
  });
}

#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

import gapRuntime from '../deployment/vercel-source-bridge/api/recruiter-gap-analysis.js';

const { analyzeRecruiterGaps } = gapRuntime;

const SCHEMA = 'glaciereq.recruiter-action-packet.v1';
const LIVE_MATRIX_SCHEMA = 'glaciereq.live-recruiter-role-matrix.v1';
const PUBLIC_MATRIX_SCHEMA = 'glaciereq.public-recruiter-role-matrix.v1';
const SUPPORTED_ROLES = Object.freeze(['recruiter', 'engineering-lead', 'systems-architect']);
const SHA256 = /^[a-f0-9]{64}$/;

export class RecruiterActionPacketError extends Error {}

function requireValue(condition, message) {
  if (!condition) throw new RecruiterActionPacketError(message);
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

function roleFlows(matrix, role) {
  if (matrix.schema === LIVE_MATRIX_SCHEMA) {
    const flows = matrix.roles?.[role];
    requireValue(Array.isArray(flows) && flows.length > 0, `action_packet_role_missing:${role}`);
    return flows;
  }
  if (matrix.schema === PUBLIC_MATRIX_SCHEMA) {
    const flows = matrix.rankings?.[role]?.briefs;
    requireValue(Array.isArray(flows) && flows.length > 0, `action_packet_role_missing:${role}`);
    return flows;
  }
  throw new RecruiterActionPacketError('action_packet_matrix_schema');
}

function summarizeProof(flow) {
  const points = Array.isArray(flow.proof_points) ? flow.proof_points : [];
  return points.slice(0, 5).map((point) => ({
    system_id: point.system_id,
    repository: point.repository,
    contribution: point.contribution || '',
    freshness_state: point.freshness_state || 'unverified',
    freshness_weight: Number(point.freshness_weight || 0),
    age_days: point.age_days ?? null,
    commit_sha: point.commit_sha ?? null,
    verified_at: point.verified_at ?? null,
  }));
}

export function buildRecruiterActionPacket(matrix, role, { maxActions = 3 } = {}) {
  requireValue(matrix && typeof matrix === 'object' && !Array.isArray(matrix), 'action_packet_matrix_object');
  requireValue(SUPPORTED_ROLES.includes(role), `action_packet_role:${role}`);
  requireValue(Number.isInteger(maxActions) && maxActions >= 1 && maxActions <= 10, 'action_packet_max_actions');
  requireValue(SHA256.test(matrix.receipt_sha256 || ''), 'action_packet_matrix_receipt');
  requireValue(SHA256.test(matrix.freshness_receipt_sha256 || ''), 'action_packet_freshness_receipt');

  const flows = roleFlows(matrix, role);
  const gap = analyzeRecruiterGaps(matrix);
  const roleGap = gap.roles?.[role];
  requireValue(roleGap && typeof roleGap === 'object', `action_packet_gap_role_missing:${role}`);

  const leader = flows[0];
  requireValue(typeof leader?.flow_id === 'string' && leader.flow_id, `action_packet_top_flow:${role}`);
  requireValue(Number.isFinite(Number(leader.score)), `action_packet_top_score:${role}`);

  const actions = roleGap.top_opportunities.slice(0, maxActions).map((opportunity, index) => ({
    priority: index + 1,
    system_id: opportunity.system_id,
    flow_id: opportunity.flow_id,
    repository: opportunity.repository,
    recoverable_score: opportunity.recoverable_score,
    freshness_state: opportunity.freshness_state,
    freshness_weight: opportunity.freshness_weight,
    age_days: opportunity.age_days,
    current_commit_sha: opportunity.current_commit_sha,
    verified_at: opportunity.verified_at,
    action: opportunity.action,
  }));

  const core = {
    schema: SCHEMA,
    role,
    status: actions.length > 0 ? 'RECOVERY_ACTION_AVAILABLE' : 'PROOF_CURRENT',
    as_of: matrix.as_of,
    source_matrix_schema: matrix.schema,
    matrix_receipt_sha256: matrix.receipt_sha256,
    freshness_receipt_sha256: matrix.freshness_receipt_sha256,
    gap_analysis_receipt_sha256: gap.receipt_sha256,
    current_fit: {
      top_flow: leader.flow_id,
      top_flow_name: leader.name,
      top_score: Number(leader.score),
      proof_points: summarizeProof(leader),
    },
    recovery: {
      total_recoverable_score: roleGap.total_recoverable_score,
      opportunity_count: roleGap.opportunity_count,
      selected_action_count: actions.length,
      actions,
    },
    reviewer_routes: {
      role_matrix: '/recruiter-role-matrix/',
      full_proof: `/recruiter-proof/?role=${encodeURIComponent(role)}`,
      role_recovery: `/recruiter-gap-analysis/?role=${encodeURIComponent(role)}`,
      machine_recovery: '/data/recruiter-gap-analysis.json',
    },
    policy: 'bind current role fit and exact recoverable evidence work into one deterministic reviewer action packet without inventing applicant or proof state',
  };
  return { ...core, receipt_sha256: receipt(core) };
}

function parseArgs(argv) {
  const args = { matrix: null, role: null, maxActions: 3, output: null };
  for (let index = 2; index < argv.length; index += 1) {
    const arg = argv[index];
    const value = argv[index + 1];
    if (arg === '--matrix') {
      requireValue(value, 'action_packet_matrix_requires_value');
      args.matrix = path.resolve(value);
      index += 1;
    } else if (arg === '--role') {
      requireValue(value, 'action_packet_role_requires_value');
      args.role = value;
      index += 1;
    } else if (arg === '--max-actions') {
      requireValue(value, 'action_packet_max_actions_requires_value');
      args.maxActions = Number(value);
      index += 1;
    } else if (arg === '--output') {
      requireValue(value, 'action_packet_output_requires_value');
      args.output = path.resolve(value);
      index += 1;
    } else {
      throw new RecruiterActionPacketError(`action_packet_unknown_argument:${arg}`);
    }
  }
  requireValue(args.matrix, 'action_packet_matrix_required');
  requireValue(args.role, 'action_packet_role_required');
  return args;
}

function loadJson(target) {
  requireValue(fs.existsSync(target), 'action_packet_matrix_not_found');
  try {
    return JSON.parse(fs.readFileSync(target, 'utf8'));
  } catch (error) {
    throw new RecruiterActionPacketError(
      `action_packet_matrix_invalid_json:${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

function writeAtomicJson(target, payload) {
  fs.mkdirSync(path.dirname(target), { recursive: true });
  const temporary = `${target}.${process.pid}.tmp`;
  try {
    fs.writeFileSync(temporary, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
    fs.renameSync(temporary, target);
  } finally {
    if (fs.existsSync(temporary)) fs.unlinkSync(temporary);
  }
}

export function main(argv = process.argv) {
  const args = parseArgs(argv);
  const packet = buildRecruiterActionPacket(loadJson(args.matrix), args.role, {
    maxActions: args.maxActions,
  });
  if (args.output) writeAtomicJson(args.output, packet);
  process.stdout.write(`${JSON.stringify(packet, null, 2)}\n`);
  return packet;
}

export { SCHEMA, SUPPORTED_ROLES };

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    main();
  } catch (error) {
    process.stderr.write(`${error instanceof Error ? error.stack || error.message : String(error)}\n`);
    process.exitCode = 1;
  }
}

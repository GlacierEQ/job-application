#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

export const INPUT_SCHEMA = 'glaciereq.live-recruiter-gap-analysis.v1';
export const OUTPUT_SCHEMA = 'glaciereq.recruiter-recovery-completion.v1';
const SHA256 = /^[a-f0-9]{64}$/;

export class RecruiterRecoveryCompletionError extends Error {}

function requireValue(condition, message) {
  if (!condition) throw new RecruiterRecoveryCompletionError(message);
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

function verifyReceipt(payload, label) {
  requireValue(payload && typeof payload === 'object' && !Array.isArray(payload), `${label}_object`);
  requireValue(payload.schema === INPUT_SCHEMA, `${label}_schema`);
  requireValue(SHA256.test(payload.receipt_sha256 || ''), `${label}_receipt`);
  const unsigned = { ...payload };
  delete unsigned.receipt_sha256;
  requireValue(receipt(unsigned) === payload.receipt_sha256, `${label}_receipt_mismatch`);
  const parsed = Date.parse(payload.as_of);
  requireValue(!Number.isNaN(parsed), `${label}_as_of`);
  requireValue(/[zZ]$|[+-]\d\d:\d\d$/.test(payload.as_of), `${label}_as_of_timezone`);
  requireValue(payload.roles && typeof payload.roles === 'object' && !Array.isArray(payload.roles), `${label}_roles`);
  return parsed;
}

function key(role, opportunity) {
  requireValue(typeof role === 'string' && role.length > 0, 'completion_role');
  requireValue(typeof opportunity?.system_id === 'string' && opportunity.system_id.length > 0, `completion_system:${role}`);
  return `${role}\u0000${opportunity.system_id}`;
}

function normalizeOpportunity(role, opportunity) {
  const recoverable = Number(opportunity.recoverable_score);
  requireValue(Number.isFinite(recoverable) && recoverable >= 0, `completion_recoverable:${role}:${opportunity.system_id}`);
  return {
    role,
    system_id: opportunity.system_id,
    repository: opportunity.repository,
    flow_id: opportunity.flow_id,
    recoverable_score: recoverable,
    freshness_weight: Number(opportunity.freshness_weight ?? 0),
    freshness_state: opportunity.freshness_state ?? 'unverified',
    current_commit_sha: opportunity.current_commit_sha ?? null,
    verified_at: opportunity.verified_at ?? null,
    action: opportunity.action ?? null,
  };
}

function flatten(snapshot, label) {
  const map = new Map();
  for (const [role, summary] of Object.entries(snapshot.roles)) {
    requireValue(Array.isArray(summary?.top_opportunities), `${label}_opportunities:${role}`);
    for (const opportunity of summary.top_opportunities) {
      const normalized = normalizeOpportunity(role, opportunity);
      const identity = key(role, normalized);
      requireValue(!map.has(identity), `${label}_duplicate:${role}:${normalized.system_id}`);
      map.set(identity, normalized);
    }
  }
  return map;
}

function rounded(value) {
  return Math.round(value * 1e6) / 1e6;
}

export function buildRecoveryCompletion(baseline, current) {
  const baselineTime = verifyReceipt(baseline, 'baseline');
  const currentTime = verifyReceipt(current, 'current');
  requireValue(currentTime > baselineTime, 'completion_current_not_newer');

  const before = flatten(baseline, 'baseline');
  const after = flatten(current, 'current');
  const resolved = [];
  const improved = [];
  const open = [];
  const regressed = [];
  const introduced = [];

  for (const [identity, previous] of before) {
    const next = after.get(identity);
    if (!next) {
      resolved.push({
        ...previous,
        previous_recoverable_score: previous.recoverable_score,
        current_recoverable_score: 0,
        recovered_score: previous.recoverable_score,
        state: 'RESOLVED',
      });
      continue;
    }

    const delta = rounded(previous.recoverable_score - next.recoverable_score);
    const entry = {
      role: previous.role,
      system_id: previous.system_id,
      repository: next.repository ?? previous.repository,
      flow_id: next.flow_id ?? previous.flow_id,
      previous_recoverable_score: previous.recoverable_score,
      current_recoverable_score: next.recoverable_score,
      recovered_score: Math.max(delta, 0),
      previous_freshness_weight: previous.freshness_weight,
      current_freshness_weight: next.freshness_weight,
      current_freshness_state: next.freshness_state,
      current_commit_sha: next.current_commit_sha,
      verified_at: next.verified_at,
      action: next.action,
    };

    if (delta > 0) improved.push({ ...entry, state: 'IMPROVED' });
    else if (delta < 0) regressed.push({ ...entry, state: 'REGRESSED', lost_score: Math.abs(delta) });
    else open.push({ ...entry, state: 'OPEN' });
  }

  for (const [identity, next] of after) {
    if (before.has(identity)) continue;
    introduced.push({
      ...next,
      previous_recoverable_score: 0,
      current_recoverable_score: next.recoverable_score,
      recovered_score: 0,
      state: 'NEW',
    });
  }

  const sortByImpact = (left, right) =>
    (right.recovered_score ?? 0) - (left.recovered_score ?? 0)
    || right.current_recoverable_score - left.current_recoverable_score
    || left.role.localeCompare(right.role)
    || left.system_id.localeCompare(right.system_id);
  resolved.sort(sortByImpact);
  improved.sort(sortByImpact);
  open.sort(sortByImpact);
  regressed.sort((left, right) => right.lost_score - left.lost_score || left.role.localeCompare(right.role) || left.system_id.localeCompare(right.system_id));
  introduced.sort((left, right) => right.current_recoverable_score - left.current_recoverable_score || left.role.localeCompare(right.role) || left.system_id.localeCompare(right.system_id));

  const recoveredScore = rounded(
    resolved.reduce((sum, entry) => sum + entry.recovered_score, 0)
      + improved.reduce((sum, entry) => sum + entry.recovered_score, 0),
  );
  const remainingScore = rounded(
    [...after.values()].reduce((sum, entry) => sum + entry.recoverable_score, 0),
  );

  const core = {
    schema: OUTPUT_SCHEMA,
    baseline_as_of: baseline.as_of,
    current_as_of: current.as_of,
    baseline_receipt_sha256: baseline.receipt_sha256,
    current_receipt_sha256: current.receipt_sha256,
    policy: 'compare exact receipt-verified recruiter gap snapshots; disappearing opportunities are resolved, smaller recoverable scores are improved, larger scores regress, and newly appearing gaps are new work',
    summary: {
      resolved_count: resolved.length,
      improved_count: improved.length,
      open_count: open.length,
      regressed_count: regressed.length,
      new_count: introduced.length,
      recovered_score: recoveredScore,
      remaining_recoverable_score: remainingScore,
    },
    resolved,
    improved,
    open,
    regressed,
    new_opportunities: introduced,
  };
  return { ...core, receipt_sha256: receipt(core) };
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function atomicWrite(file, payload) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const temporary = `${file}.${process.pid}.tmp`;
  fs.writeFileSync(temporary, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
  fs.renameSync(temporary, file);
}

function parseArgs(argv) {
  const result = {};
  for (let index = 0; index < argv.length; index += 2) {
    const name = argv[index];
    const value = argv[index + 1];
    requireValue(name?.startsWith('--') && value, 'completion_cli_arguments');
    result[name.slice(2)] = value;
  }
  requireValue(result.baseline && result.current, 'completion_cli_requires_baseline_and_current');
  return result;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  try {
    const args = parseArgs(process.argv.slice(2));
    const output = buildRecoveryCompletion(readJson(args.baseline), readJson(args.current));
    if (args.output) atomicWrite(args.output, output);
    process.stdout.write(`${JSON.stringify(output, null, 2)}\n`);
  } catch (error) {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 2;
  }
}

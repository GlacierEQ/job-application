#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const topologyRuntime = require('../deployment/vercel-source-bridge/api/workflow-topology-proxy.js');
const recruiterRuntime = require('../deployment/vercel-source-bridge/api/workflow-recruiter-proxy.js');
const VERIFICATION_SOURCES = require('../deployment/vercel-source-bridge/api/workflow-verification-sources.generated.js');

const SCHEMA = 'glaciereq.live-recruiter-proof-snapshot.v1';
const GITHUB_API = 'https://api.github.com';
const FETCH_TIMEOUT_MS = 10_000;
const MAX_BYTES = 2 * 1024 * 1024;
const FETCH_CONCURRENCY = 4;
const COMMIT_RE = /^[a-f0-9]{40}$/;
const ROLES = Object.freeze(['recruiter', 'engineering-lead', 'systems-architect']);

export class LiveRecruiterProofError extends Error {}

function requireValue(condition, message) {
  if (!condition) throw new LiveRecruiterProofError(message);
}

function stableStringify(value) {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function receipt(value) {
  return sha256(Buffer.from(stableStringify(value)));
}

function repositoryName(repoUrl) {
  const prefix = 'https://github.com/';
  requireValue(typeof repoUrl === 'string' && repoUrl.startsWith(prefix), `live_recruiter_repo_boundary:${repoUrl}`);
  const repository = repoUrl.slice(prefix.length).replace(/\/$/, '');
  requireValue(/^GlacierEQ\/[A-Za-z0-9_.-]+$/.test(repository), `live_recruiter_repo_invalid:${repository}`);
  return repository;
}

function freshnessWeight(ageDays) {
  requireValue(Number.isInteger(ageDays) && ageDays >= 0, 'live_recruiter_invalid_age');
  if (ageDays <= 30) return 1;
  if (ageDays <= 90) return 0.85;
  if (ageDays <= 180) return 0.65;
  if (ageDays <= 365) return 0.4;
  return 0.2;
}

function freshnessState(weight) {
  return weight === 1 ? 'fresh' : weight >= 0.65 ? 'aging' : 'stale';
}

function githubHeaders() {
  const headers = {
    accept: 'application/vnd.github+json',
    'user-agent': 'GlacierEQ-LiveRecruiterProof/1.0',
    'x-github-api-version': '2022-11-28',
  };
  if (process.env.GITHUB_TOKEN) headers.authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  return headers;
}

async function fetchJson(url, fetchImpl = fetch) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const response = await fetchImpl(url, {
      headers: githubHeaders(),
      signal: controller.signal,
      redirect: 'error',
    });
    requireValue(response?.ok === true, `live_recruiter_github_http_${response?.status ?? 'unknown'}:${url}`);
    const declared = Number(response.headers?.get?.('content-length') || 0);
    requireValue(!declared || declared <= MAX_BYTES, 'live_recruiter_github_declared_too_large');
    const bytes = Buffer.from(await response.arrayBuffer());
    requireValue(bytes.length > 0 && bytes.length <= MAX_BYTES, 'live_recruiter_github_body_size');
    return JSON.parse(bytes.toString('utf8'));
  } catch (error) {
    if (error?.name === 'AbortError') throw new LiveRecruiterProofError('live_recruiter_github_fetch_timeout');
    if (error instanceof LiveRecruiterProofError) throw error;
    throw new LiveRecruiterProofError(`live_recruiter_github_fetch_failed:${error instanceof Error ? error.message : String(error)}`);
  } finally {
    clearTimeout(timer);
  }
}

async function mapConcurrent(items, limit, mapper) {
  requireValue(Number.isInteger(limit) && limit > 0, 'live_recruiter_invalid_concurrency');
  const results = new Array(items.length);
  let cursor = 0;
  async function worker() {
    while (true) {
      const index = cursor;
      cursor += 1;
      if (index >= items.length) return;
      results[index] = await mapper(items[index], index);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, () => worker()));
  return results;
}

function runMatchesBranchPolicy(run, source, defaultBranch) {
  const branch = typeof run?.head_branch === 'string' ? run.head_branch : '';
  const event = typeof run?.event === 'string' ? run.event : '';
  if (!branch || !defaultBranch) return false;
  if (source.branch_policy === 'default_only') return branch === defaultBranch;
  if (source.branch_policy === 'default_or_pull_request') {
    return branch === defaultBranch || event === 'pull_request';
  }
  return false;
}

export function selectRegisteredVerificationRun(payload, repository, defaultBranch) {
  const source = VERIFICATION_SOURCES[repository];
  if (!source) return null;
  const runs = Array.isArray(payload?.workflow_runs) ? payload.workflow_runs : [];
  const candidates = runs.filter((run) => {
    const pathBound = source.workflow_paths === null
      || (typeof run?.path === 'string' && source.workflow_paths.includes(run.path));
    return run?.status === 'completed'
      && run?.conclusion === 'success'
      && source.workflow_names.includes(run?.name)
      && pathBound
      && runMatchesBranchPolicy(run, source, defaultBranch)
      && COMMIT_RE.test(run?.head_sha || '')
      && typeof run?.updated_at === 'string'
      && !Number.isNaN(Date.parse(run.updated_at));
  });
  candidates.sort((left, right) => Date.parse(right.updated_at) - Date.parse(left.updated_at)
    || Number(right.id || 0) - Number(left.id || 0));
  return candidates[0] || null;
}

export function verifyExactRunIdentity(run, selected, repository, defaultBranch) {
  const source = VERIFICATION_SOURCES[repository];
  requireValue(source, `live_recruiter_source_not_registered:${repository}`);
  requireValue(Number.isInteger(run?.id) && run.id > 0 && run.id === selected?.id, 'live_recruiter_exact_run_id_mismatch');
  requireValue(run.status === 'completed' && run.conclusion === 'success', 'live_recruiter_exact_run_not_success');
  requireValue(run.name === selected.name && source.workflow_names.includes(run.name), 'live_recruiter_exact_run_name_mismatch');
  requireValue(run.head_sha === selected.head_sha && COMMIT_RE.test(run.head_sha), 'live_recruiter_exact_run_sha_mismatch');
  requireValue(run.updated_at === selected.updated_at && !Number.isNaN(Date.parse(run.updated_at)), 'live_recruiter_exact_run_timestamp_mismatch');
  requireValue(runMatchesBranchPolicy(run, source, defaultBranch), 'live_recruiter_exact_run_branch_policy');
  if (source.workflow_paths !== null) {
    requireValue(typeof run.path === 'string' && source.workflow_paths.includes(run.path), 'live_recruiter_exact_run_path_mismatch');
  }
  return Object.freeze({
    id: run.id,
    name: run.name,
    path: run.path || null,
    head_branch: run.head_branch,
    event: run.event,
    head_sha: run.head_sha,
    updated_at: run.updated_at,
    html_url: run.html_url || null,
  });
}

function uniqueSystems(topology) {
  requireValue(topology?.schema === 'glaciereq.workflow-topology.v1', 'live_recruiter_topology_schema');
  const systems = new Map();
  for (const flow of topology.flows || []) {
    for (const step of flow.steps || []) {
      requireValue(step?.system?.id, 'live_recruiter_topology_system_id_missing');
      systems.set(step.system.id, step.system);
    }
  }
  requireValue(systems.size > 0, 'live_recruiter_topology_systems_missing');
  return [...systems.entries()].sort(([left], [right]) => left.localeCompare(right));
}

async function resolveRepositoryVerification(repository, { fetchImpl }) {
  const source = VERIFICATION_SOURCES[repository];
  if (!source) return { error: 'verification_source_not_registered' };
  try {
    const [metadata, runs] = await Promise.all([
      fetchJson(`${GITHUB_API}/repos/${repository}`, fetchImpl),
      fetchJson(`${GITHUB_API}/repos/${repository}/actions/runs?per_page=50`, fetchImpl),
    ]);
    const defaultBranch = typeof metadata?.default_branch === 'string' ? metadata.default_branch : '';
    requireValue(defaultBranch, `live_recruiter_default_branch_missing:${repository}`);
    const selected = selectRegisteredVerificationRun(runs, repository, defaultBranch);
    if (!selected) return { error: 'registered_verification_run_not_found' };
    requireValue(Number.isInteger(selected.id) && selected.id > 0, 'live_recruiter_selected_run_id_missing');
    const exact = await fetchJson(`${GITHUB_API}/repos/${repository}/actions/runs/${selected.id}`, fetchImpl);
    return {
      default_branch: defaultBranch,
      source,
      run: verifyExactRunIdentity(exact, selected, repository, defaultBranch),
    };
  } catch (error) {
    return { error: `repository_verification_unavailable:${error instanceof Error ? error.message : String(error)}` };
  }
}

export async function buildLiveRecruiterProof(topology, role, {
  asOf = new Date(),
  fetchImpl = fetch,
} = {}) {
  requireValue(ROLES.includes(role), `live_recruiter_unknown_role:${role}`);
  requireValue(asOf instanceof Date && !Number.isNaN(asOf.getTime()), 'live_recruiter_invalid_as_of');

  const systems = uniqueSystems(topology);
  const repositories = [...new Set(systems.map(([, system]) => repositoryName(system.repo)))].sort();
  const repositoryState = new Map();

  await mapConcurrent(repositories, FETCH_CONCURRENCY, async (repository) => {
    repositoryState.set(repository, await resolveRepositoryVerification(repository, { fetchImpl }));
  });

  const entries = [];
  const missingSystems = [];
  for (const [systemId, system] of systems) {
    const repository = repositoryName(system.repo);
    const state = repositoryState.get(repository);
    if (!state || state.error) {
      missingSystems.push({
        id: systemId,
        repository,
        reason: state?.error || 'repository_verification_state_missing',
      });
      continue;
    }
    const verifiedAt = new Date(state.run.updated_at);
    const ageDays = Math.floor((asOf.getTime() - verifiedAt.getTime()) / 86_400_000);
    if (ageDays < 0) {
      missingSystems.push({ id: systemId, repository, reason: 'verification_timestamp_in_future' });
      continue;
    }
    const weight = freshnessWeight(ageDays);
    entries.push({
      id: systemId,
      repository,
      commit_sha: state.run.head_sha,
      verified_at: verifiedAt.toISOString(),
      age_days: ageDays,
      freshness_weight: weight,
      state: freshnessState(weight),
      verification_workflow: state.run.name,
      verification_workflow_path: state.run.path,
      verification_branch: state.run.head_branch,
      verification_event: state.run.event,
      verification_run_id: state.run.id,
      verification_url: state.run.html_url,
      default_branch: state.default_branch,
    });
  }

  const freshnessCore = {
    schema: 'glaciereq.live-evidence-freshness.v1',
    as_of: asOf.toISOString(),
    topology_receipt_sha256: topology.receipt_sha256 || null,
    registry_receipt_sha256: receipt(VERIFICATION_SOURCES),
    verification_source_policy: 'generated registry + registered workflow name/path + branch policy + exact run readback; unavailable proof receives zero ranking credit',
    entries,
    missing_systems: missingSystems,
  };
  const freshness = { ...freshnessCore, receipt_sha256: receipt(freshnessCore) };
  const ranked = recruiterRuntime.rankFlows(topology, role, freshness);
  const core = {
    schema: SCHEMA,
    role,
    generated_registry: true,
    registry_receipt_sha256: freshness.registry_receipt_sha256,
    topology_receipt_sha256: topology.receipt_sha256 || null,
    freshness_receipt_sha256: freshness.receipt_sha256,
    verification_source_count: Object.keys(VERIFICATION_SOURCES).length,
    coverage: {
      verified_systems: entries.length,
      unverified_systems: missingSystems.length,
    },
    missing_systems: missingSystems,
    briefs: ranked,
  };
  return { ...core, receipt_sha256: receipt(core) };
}

function parseArgs(argv) {
  const args = { role: 'recruiter', output: null, topology: null, asOf: new Date() };
  for (let index = 2; index < argv.length; index += 1) {
    const arg = argv[index];
    const value = argv[index + 1];
    if (arg === '--role') { requireValue(value, 'live_recruiter_role_requires_value'); args.role = value; index += 1; }
    else if (arg === '--output') { requireValue(value, 'live_recruiter_output_requires_value'); args.output = path.resolve(value); index += 1; }
    else if (arg === '--topology') { requireValue(value, 'live_recruiter_topology_requires_value'); args.topology = path.resolve(value); index += 1; }
    else if (arg === '--as-of') {
      requireValue(value, 'live_recruiter_as_of_requires_value');
      args.asOf = new Date(value);
      requireValue(!Number.isNaN(args.asOf.getTime()), 'live_recruiter_invalid_as_of');
      index += 1;
    } else throw new LiveRecruiterProofError(`live_recruiter_unknown_argument:${arg}`);
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
  const proof = await buildLiveRecruiterProof(topology, args.role, { asOf: args.asOf });
  if (args.output) writeAtomicJson(args.output, proof);
  process.stdout.write(`${JSON.stringify(proof, null, 2)}\n`);
  return proof;
}

export { VERIFICATION_SOURCES };

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    process.stderr.write(`${error instanceof Error ? error.stack || error.message : String(error)}\n`);
    process.exitCode = 1;
  });
}

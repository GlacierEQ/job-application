#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DEFAULT_INPUT = path.join(ROOT, 'config', 'workflow-verification-sources.json');
const DEFAULT_OUTPUT = path.join(
  ROOT,
  'deployment',
  'vercel-source-bridge',
  'api',
  'workflow-verification-sources.generated.js',
);
const SCHEMA = 'glaciereq.verification-source-registry.v1';
const BRANCH_POLICIES = new Set(['default_only', 'default_or_pull_request']);
const WORKFLOW_PATH = /^\.github\/workflows\/[A-Za-z0-9_.-]+\.ya?ml$/;
const REPOSITORY = /^GlacierEQ\/[A-Za-z0-9_.-]+$/;

function fail(message) {
  throw new Error(`verification_registry:${message}`);
}

function uniqueStrings(value, field, { allowNull = false } = {}) {
  if (allowNull && value == null) return null;
  if (!Array.isArray(value) || value.length === 0) fail(`${field}_must_be_nonempty_array`);
  const normalized = value.map((entry) => {
    if (typeof entry !== 'string' || !entry.trim()) fail(`${field}_contains_invalid_string`);
    return entry.trim();
  });
  if (new Set(normalized).size !== normalized.length) fail(`${field}_contains_duplicate`);
  return normalized;
}

function normalizeRegistry(payload) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) fail('payload_must_be_object');
  if (payload.schema !== SCHEMA) fail(`unsupported_schema:${String(payload.schema)}`);
  if (!payload.repositories || typeof payload.repositories !== 'object' || Array.isArray(payload.repositories)) {
    fail('repositories_must_be_object');
  }

  const repositories = {};
  const names = Object.keys(payload.repositories).sort((a, b) => a.localeCompare(b));
  if (names.length === 0) fail('repositories_must_not_be_empty');

  for (const repository of names) {
    if (!REPOSITORY.test(repository)) fail(`invalid_repository:${repository}`);
    const source = payload.repositories[repository];
    if (!source || typeof source !== 'object' || Array.isArray(source)) {
      fail(`source_must_be_object:${repository}`);
    }
    const workflowNames = uniqueStrings(source.workflow_names, `${repository}.workflow_names`);
    const workflowPaths = uniqueStrings(source.workflow_paths, `${repository}.workflow_paths`, { allowNull: true });
    if (workflowPaths) {
      for (const workflowPath of workflowPaths) {
        if (!WORKFLOW_PATH.test(workflowPath)) fail(`invalid_workflow_path:${repository}:${workflowPath}`);
      }
    }
    if (!BRANCH_POLICIES.has(source.branch_policy)) {
      fail(`invalid_branch_policy:${repository}:${String(source.branch_policy)}`);
    }
    repositories[repository] = {
      workflow_names: workflowNames,
      workflow_paths: workflowPaths,
      branch_policy: source.branch_policy,
    };
  }
  return repositories;
}

function renderModule(repositories) {
  const serialized = JSON.stringify(repositories, null, 2);
  return `'use strict';\n\n// GENERATED from config/workflow-verification-sources.json. Do not hand-edit.\nconst REGISTRY = ${serialized};\n\nfunction deepFreeze(value) {\n  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;\n  for (const child of Object.values(value)) deepFreeze(child);\n  return Object.freeze(value);\n}\n\nmodule.exports = deepFreeze(REGISTRY);\n`;
}

function parseArgs(argv) {
  const args = { input: DEFAULT_INPUT, output: DEFAULT_OUTPUT, check: false };
  for (let index = 2; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--check') {
      args.check = true;
    } else if (arg === '--input' || arg === '--output') {
      const value = argv[index + 1];
      if (!value || value.startsWith('--')) fail(`${arg}_requires_value`);
      args[arg.slice(2)] = path.resolve(value);
      index += 1;
    } else {
      fail(`unknown_argument:${arg}`);
    }
  }
  return args;
}

function writeAtomic(output, source) {
  fs.mkdirSync(path.dirname(output), { recursive: true });
  const temporary = `${output}.tmp-${process.pid}`;
  try {
    fs.writeFileSync(temporary, source, 'utf8');
    fs.renameSync(temporary, output);
  } finally {
    if (fs.existsSync(temporary)) fs.unlinkSync(temporary);
  }
}

function main() {
  const args = parseArgs(process.argv);
  const payload = JSON.parse(fs.readFileSync(args.input, 'utf8'));
  const repositories = normalizeRegistry(payload);
  const source = renderModule(repositories);

  if (args.check) {
    if (!fs.existsSync(args.output)) fail(`generated_output_missing:${args.output}`);
    const existing = fs.readFileSync(args.output, 'utf8');
    if (existing !== source) fail('generated_output_stale');
  } else {
    writeAtomic(args.output, source);
  }

  process.stdout.write(`${JSON.stringify({\n    schema: 'glaciereq.verification-registry-generation.v1',\n    status: 'PASS',\n    repository_count: Object.keys(repositories).length,\n    output: path.relative(ROOT, args.output),\n    mode: args.check ? 'check' : 'write',\n  })}\n`);
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}

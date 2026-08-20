import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { spawnSync } from 'node:child_process';
import test from 'node:test';

const ROOT = path.resolve(import.meta.dirname, '..', '..');
const GENERATOR = path.join(ROOT, 'scripts', 'generate-workflow-verification-registry.mjs');
const CONFIG = path.join(ROOT, 'config', 'workflow-verification-sources.json');
const GENERATED = path.join(import.meta.dirname, 'api', 'workflow-verification-sources.generated.js');
const require = createRequire(import.meta.url);

function run(args) {
  return spawnSync(process.execPath, [GENERATOR, ...args], {
    cwd: ROOT,
    encoding: 'utf8',
  });
}

function tempConfig(mutator) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'verification-registry-'));
  const payload = JSON.parse(fs.readFileSync(CONFIG, 'utf8'));
  mutator(payload);
  const config = path.join(root, 'registry.json');
  fs.writeFileSync(config, `${JSON.stringify(payload, null, 2)}\n`);
  return { root, config };
}

test('checked-in deployable registry is exactly generated from the source registry', () => {
  const result = run(['--check']);
  assert.equal(result.status, 0, result.stderr || result.stdout);
  const receipt = JSON.parse(result.stdout);
  assert.equal(receipt.status, 'PASS');
  assert.equal(receipt.mode, 'check');
  assert.equal(receipt.repository_count, 8);
});

test('generated registry is deeply immutable and preserves exact identity policy', () => {
  delete require.cache[require.resolve(GENERATED)];
  const registry = require(GENERATED);
  assert.equal(Object.isFrozen(registry), true);
  assert.equal(Object.isFrozen(registry['GlacierEQ/job-application']), true);
  assert.equal(Object.isFrozen(registry['GlacierEQ/job-application'].workflow_names), true);
  assert.deepEqual(
    registry['GlacierEQ/job-application'].workflow_paths,
    [
      '.github/workflows/ci.yml',
      '.github/workflows/apex-recruiter-proof-brief.yml',
      '.github/workflows/apex-estate-non-regression.yml',
      '.github/workflows/portfolio-verify.yml',
    ],
  );
  assert.equal(
    registry['GlacierEQ/job-application'].branch_policy,
    'default_or_pull_request',
  );
});

test('write mode deterministically reproduces the checked-in generated module', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'verification-registry-output-'));
  const output = path.join(root, 'generated.js');
  const first = run(['--output', output]);
  assert.equal(first.status, 0, first.stderr || first.stdout);
  const firstBytes = fs.readFileSync(output);
  const second = run(['--output', output]);
  assert.equal(second.status, 0, second.stderr || second.stdout);
  assert.deepEqual(fs.readFileSync(output), firstBytes);
  assert.deepEqual(firstBytes, fs.readFileSync(GENERATED));
});

test('generator rejects duplicate workflow identity instead of silently normalizing it', () => {
  const { root, config } = tempConfig((payload) => {
    payload.repositories['GlacierEQ/job-application'].workflow_names.push('CI');
  });
  const result = run(['--input', config, '--output', path.join(root, 'generated.js')]);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /workflow_names_contains_duplicate/);
});

test('generator rejects workflow paths outside GitHub Actions workflow namespace', () => {
  const { root, config } = tempConfig((payload) => {
    payload.repositories['GlacierEQ/job-application'].workflow_paths = ['scripts/ci.yml'];
  });
  const result = run(['--input', config, '--output', path.join(root, 'generated.js')]);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /invalid_workflow_path/);
});

test('generator rejects unknown branch policy', () => {
  const { root, config } = tempConfig((payload) => {
    payload.repositories['GlacierEQ/job-application'].branch_policy = 'any_branch';
  });
  const result = run(['--input', config, '--output', path.join(root, 'generated.js')]);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /invalid_branch_policy/);
});

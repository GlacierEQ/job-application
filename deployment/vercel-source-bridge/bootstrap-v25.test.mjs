import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { spawnSync } from 'node:child_process';
import test from 'node:test';

const ROOT = path.resolve(import.meta.dirname, '..', '..');
const BUILDER = path.join(ROOT, 'scripts', 'build-v25-deployment-bundle.mjs');
const SOURCE_COMMIT = 'a'.repeat(40);
const EXPECTED_MODULE_COUNT = 9;
const require = createRequire(import.meta.url);

function runBuilder(args) {
  return spawnSync(process.execPath, [BUILDER, ...args], {
    cwd: ROOT,
    encoding: 'utf8',
  });
}

function build(outputDir) {
  const result = runBuilder([
    '--source-commit', SOURCE_COMMIT,
    '--output-dir', outputDir,
  ]);
  assert.equal(result.status, 0, result.stderr || result.stdout);
  return JSON.parse(
    fs.readFileSync(path.join(outputDir, 'deployment-manifest.json'), 'utf8'),
  );
}

test('V25 bundle is deterministic for identical source authority', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'v25-bundle-determinism-'));
  const firstDir = path.join(root, 'first');
  const secondDir = path.join(root, 'second');
  const first = build(firstDir);
  const second = build(secondDir);

  assert.deepEqual(first, second);
  assert.equal(first.schema, 'glaciereq.v25-deployment-bundle-manifest.v2');
  assert.equal(first.source_commit, SOURCE_COMMIT);
  assert.equal(first.module_count, EXPECTED_MODULE_COUNT);
  assert.equal(first.deployment_files.length, 2);
  assert.equal(first.invariants.self_contained_executable_modules, true);
  assert.equal(first.invariants.bootstrap_network_fetch_required, false);
  assert.equal(first.invariants.runtime_string_evaluation_required, false);
  assert.equal(first.invariants.factory_bundle_verified_before_module_execution, true);
  assert.equal(first.invariants.every_factory_sha256_verified_before_execution, true);
  assert.equal(first.invariants.verification_cached_per_instance, true);
  assert.equal(first.verification_endpoint, '/__v25_bundle_verify');
});

test('generated bootstrap verifies precompiled factories without runtime string evaluation', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'v25-bundle-verify-'));
  build(root);
  const bootstrapPath = path.join(root, 'api', 'index.js');
  const source = fs.readFileSync(bootstrapPath, 'utf8');
  const bootstrap = require(bootstrapPath);
  const first = bootstrap.verifyBundle();
  const second = bootstrap.verifyBundle();

  assert.equal(typeof bootstrap, 'function');
  assert.equal(first.status, 'PASS');
  assert.equal(first.release, 'V25-APPLICATION-COMPILER');
  assert.equal(first.source_commit, SOURCE_COMMIT);
  assert.equal(first.module_count, EXPECTED_MODULE_COUNT);
  assert.equal(first.entry, 'api/release-router.js');
  assert.equal(first.bootstrap_network_fetch_required, false);
  assert.equal(first.runtime_string_evaluation_required, false);
  assert.equal(first.every_factory_sha256_verified_before_execution, true);
  assert.equal(first.verification_cached_per_instance, true);
  assert.equal(Object.isFrozen(first), true);
  assert.strictEqual(second, first);
  assert.equal(source.includes('new Function('), false);
  assert.equal(source.includes('eval('), false);
  assert.equal(source.includes("require('node:vm')"), false);
});

test('generated two-file routing targets the bundled Lambda catch-all', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'v25-bundle-routing-'));
  const manifest = build(root);
  const routing = JSON.parse(fs.readFileSync(path.join(root, 'vercel.json'), 'utf8'));

  assert.deepEqual(routing, {
    version: 2,
    routes: [{ src: '/(.*)', dest: '/api/index?path=$1' }],
  });
  assert.deepEqual(
    manifest.deployment_files.map((row) => row.path),
    ['api/index.js', 'vercel.json'],
  );
  assert.ok(fs.statSync(path.join(root, 'api', 'index.js')).size > 100_000);
  assert.ok(fs.statSync(path.join(root, 'vercel.json')).size < 200);
});

test('builder rejects flags that omit required values', () => {
  for (const flag of ['--source-commit', '--output-dir']) {
    const result = runBuilder([flag]);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, new RegExp(`${flag}_requires_value`));
  }
});
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
const require = createRequire(import.meta.url);

function build(outputDir) {
  const result = spawnSync(
    process.execPath,
    [BUILDER, '--source-commit', SOURCE_COMMIT, '--output-dir', outputDir],
    { cwd: ROOT, encoding: 'utf8' },
  );
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
  assert.equal(first.schema, 'glaciereq.v25-deployment-bundle-manifest.v1');
  assert.equal(first.source_commit, SOURCE_COMMIT);
  assert.equal(first.module_count, 8);
  assert.equal(first.deployment_files.length, 2);
  assert.equal(first.invariants.self_contained_executable_modules, true);
  assert.equal(first.invariants.bootstrap_network_fetch_required, false);
  assert.equal(first.invariants.bundle_verified_before_compile, true);
  assert.equal(first.invariants.every_module_sha256_verified_before_execution, true);
  assert.equal(first.verification_endpoint, '/__v25_bundle_verify');
});

test('generated bootstrap verifies and compiles every embedded module without network', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'v25-bundle-verify-'));
  build(root);
  const bootstrapPath = path.join(root, 'api', 'index.js');
  const bootstrap = require(bootstrapPath);
  const result = bootstrap.verifyBundle();

  assert.equal(typeof bootstrap, 'function');
  assert.equal(result.status, 'PASS');
  assert.equal(result.release, 'V25-APPLICATION-COMPILER');
  assert.equal(result.source_commit, SOURCE_COMMIT);
  assert.equal(result.module_count, 8);
  assert.equal(result.entry, 'api/release-router.js');
  assert.equal(result.bootstrap_network_fetch_required, false);
  assert.equal(result.every_module_sha256_verified_before_execution, true);
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
  assert.ok(fs.statSync(path.join(root, 'api', 'index.js')).size > 10_000);
  assert.ok(fs.statSync(path.join(root, 'vercel.json')).size < 200);
});

import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '../..');
const BUILD = path.join(
  ROOT,
  'deployment/releases/v27-helix-9fffd696-bootstrap/build.js',
);
const TRANSPORT = path.join(ROOT, 'deployment/transport/v27-9fffd696');
const EXPECTED_API_SHA256 =
  '387fb5058286f10f73cf5cc287f7e83d633d68ce96bb6c9d75966d646af16068';
const EXPECTED_HELIX =
  '9fffd69665c6f1b6c1d62bf88795762469422752';

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function runBuild(transportDir) {
  const cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'glaciereq-v27-bootstrap-'));
  const result = spawnSync(process.execPath, [BUILD], {
    cwd,
    encoding: 'utf8',
    env: { ...process.env, TRANSPORT_DIR: transportDir },
  });
  return { cwd, result };
}

test('V27 transport reconstructs the exact verified Lambda', () => {
  const { cwd, result } = runBuild(TRANSPORT);
  assert.equal(result.status, 0, result.stderr);
  const output = path.join(cwd, 'api/index.js');
  assert.equal(fs.statSync(output).size, 209356);
  assert.equal(sha256(fs.readFileSync(output)), EXPECTED_API_SHA256);
  const receipt = JSON.parse(result.stdout.trim());
  assert.equal(receipt.status, 'PASS');
  assert.equal(receipt.helix_commit, EXPECTED_HELIX);
  assert.equal(receipt.presentation_generation, 'V27-MONUMENTAL-ALGERIAN');
  assert.equal(receipt.runtime_bootstrap_network_fetch_required, false);
});

test('V27 transport fails closed when a part is corrupted', () => {
  const fixture = fs.mkdtempSync(path.join(os.tmpdir(), 'glaciereq-v27-corrupt-'));
  fs.cpSync(TRANSPORT, fixture, { recursive: true });
  fs.appendFileSync(path.join(fixture, 'part-04.b64'), 'X');
  const { cwd, result } = runBuild(fixture);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /part length mismatch|part SHA-256 mismatch/);
  assert.equal(fs.existsSync(path.join(cwd, 'api/index.js')), false);
});

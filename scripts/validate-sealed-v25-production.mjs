#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const RECEIPT_PATH = path.join(ROOT, 'deployment-receipts', 'V23_SYSTEMS_ATLAS_PRODUCTION_2026-08-12.json');
const ARTIFACT_ROOT = path.join(ROOT, 'artifacts', 'v25-deployment');
const MANIFEST_PATH = path.join(ARTIFACT_ROOT, 'deployment-manifest.json');

function sha256(bytes) {
  return crypto.createHash('sha256').update(bytes).digest('hex');
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function fail(code, detail = null) {
  const error = new Error(detail ? `${code}:${detail}` : code);
  error.code = code;
  throw error;
}

function main() {
  if (!fs.existsSync(RECEIPT_PATH)) fail('sealed_production_receipt_missing');
  if (!fs.existsSync(MANIFEST_PATH)) fail('tracked_production_manifest_missing');

  const receipt = readJson(RECEIPT_PATH);
  const manifest = readJson(MANIFEST_PATH);
  const runtime = receipt.runtime_bundle;
  if (!runtime || typeof runtime !== 'object') fail('runtime_bundle_receipt_missing');

  const exact = [
    ['source_commit', manifest.source_commit, runtime.source_commit],
    ['module_count', manifest.module_count, runtime.module_count],
    ['factory_bundle_sha256', manifest.factory_bundle?.sha256, runtime.factory_bundle_sha256],
    ['verification_endpoint', manifest.verification_endpoint, runtime.verification_endpoint],
  ];
  for (const [name, observed, expected] of exact) {
    if (observed !== expected) fail('sealed_artifact_receipt_mismatch', `${name}:${observed}!=${expected}`);
  }

  const deploymentFiles = manifest.deployment_files;
  if (!Array.isArray(deploymentFiles) || deploymentFiles.length !== 2) {
    fail('sealed_artifact_file_contract_invalid');
  }

  const verifiedFiles = [];
  for (const entry of deploymentFiles) {
    const file = path.join(ARTIFACT_ROOT, entry.path);
    if (!fs.existsSync(file)) fail('sealed_artifact_file_missing', entry.path);
    const bytes = fs.readFileSync(file);
    const digest = sha256(bytes);
    if (bytes.length !== entry.bytes) fail('sealed_artifact_byte_count_mismatch', entry.path);
    if (digest !== entry.sha256) fail('sealed_artifact_sha256_mismatch', entry.path);
    verifiedFiles.push({ path: entry.path, bytes: bytes.length, sha256: digest });
  }

  const runtimeEntry = deploymentFiles.find((entry) => entry.path === 'api/index.js');
  if (!runtimeEntry) fail('sealed_runtime_entry_missing');
  if (runtimeEntry.bytes !== runtime.runtime_bytes) {
    fail('sealed_runtime_byte_count_receipt_mismatch', `${runtimeEntry.bytes}!=${runtime.runtime_bytes}`);
  }

  const result = {
    schema: 'glaciereq.sealed-production-artifact-validation.v1',
    status: 'PASS',
    deployment_id: receipt.vercel?.deployment_id ?? null,
    source_commit: manifest.source_commit,
    module_count: manifest.module_count,
    factory_bundle_sha256: manifest.factory_bundle.sha256,
    verification_endpoint: manifest.verification_endpoint,
    verified_files: verifiedFiles,
  };
  process.stdout.write(`${JSON.stringify(result)}\n`);
}

main();

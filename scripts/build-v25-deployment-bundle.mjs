#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const MODULES = [
  'deployment/vercel-source-bridge/api/proxy.js',
  'deployment/vercel-source-bridge/api/design-proxy.js',
  'deployment/vercel-source-bridge/api/estate-proxy.js',
  'deployment/vercel-source-bridge/api/truth-proxy.js',
  'deployment/vercel-source-bridge/api/truth-runtime.js',
  'deployment/vercel-source-bridge/api/typography-proxy.js',
  'deployment/vercel-source-bridge/api/compiler-proxy.js',
  'deployment/vercel-source-bridge/api/title-font-proxy.js',
  'deployment/vercel-source-bridge/api/monument-title-proxy.js',
  'deployment/vercel-source-bridge/api/systems-atlas-proxy.js',
  'deployment/vercel-source-bridge/api/release-router.js',
];
const ENTRY = 'deployment/vercel-source-bridge/api/release-router.js';
const RUNTIME_ENTRY = 'api/release-router.js';
const MANIFEST_SCHEMA = 'glaciereq.v25-deployment-bundle-manifest.v2';
const DEPLOY_FILE = 'api/index.js';
const ROUTING_FILE = 'vercel.json';
const COMMIT_RE = /^[a-f0-9]{40}$/;

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function requireFlagValue(argv, index, flag) {
  if (index + 1 >= argv.length || String(argv[index + 1]).startsWith('--')) {
    throw new Error(`${flag}_requires_value`);
  }
  return argv[index + 1];
}

function parseArgs(argv) {
  const result = {
    outputDir: path.join(ROOT, 'artifacts', 'v25-deployment'),
    sourceCommit: process.env.GITHUB_SHA || '',
  };
  for (let index = 2; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--output-dir') {
      result.outputDir = path.resolve(requireFlagValue(argv, index, '--output-dir'));
      index += 1;
    } else if (arg === '--source-commit') {
      result.sourceCommit = requireFlagValue(argv, index, '--source-commit');
      index += 1;
    } else {
      throw new Error(`unknown_argument:${arg}`);
    }
  }
  if (!COMMIT_RE.test(result.sourceCommit)) {
    throw new Error('source_commit_must_be_full_lowercase_sha');
  }
  return result;
}

function runtimeId(relative) {
  return relative.replace('deployment/vercel-source-bridge/', '');
}

function factorySource(source) {
  return `function(exports, require, module, __filename, __dirname) {\n${source}\n}`;
}

function readModules() {
  const modules = {};
  const moduleHashes = {};
  const factories = {};
  const factoryHashes = {};
  for (const relative of MODULES) {
    const absolute = path.join(ROOT, relative);
    if (!fs.existsSync(absolute)) throw new Error(`missing_module:${relative}`);
    const source = fs.readFileSync(absolute, 'utf8');
    const id = runtimeId(relative);
    const factory = factorySource(source);
    modules[id] = source;
    moduleHashes[id] = sha256(Buffer.from(source));
    factories[id] = factory;
    factoryHashes[id] = sha256(Buffer.from(factory));
  }
  if (!modules[RUNTIME_ENTRY]) throw new Error('entry_module_missing');
  if (!modules['api/compiler-proxy.js'].includes('V25-APPLICATION-COMPILER')) {
    throw new Error('v25_compiler_release_marker_missing');
  }
  if (!modules['api/systems-atlas-proxy.js'].includes('V23-SYSTEMS-ATLAS-RESOURCE-GROUNDED')) {
    throw new Error('systems_atlas_release_marker_missing');
  }
  return { modules, moduleHashes, factories, factoryHashes };
}

function orderedObject(value) {
  return Object.fromEntries(
    Object.entries(value).sort(([left], [right]) => left.localeCompare(right)),
  );
}

function factoryBundleBytes(factories) {
  const chunks = [];
  for (const [id, source] of Object.entries(orderedObject(factories))) {
    chunks.push(`${id}\0${source}\0`);
  }
  return Buffer.from(chunks.join(''));
}

function factoryObjectSource(factories) {
  return Object.entries(orderedObject(factories))
    .map(([id, source]) => `${JSON.stringify(id)}:${source}`)
    .join(',\n');
}

function bootstrapSource({ sourceCommit, factories, factoryHashes, factoryBundleSha256 }) {
  const factoryObject = factoryObjectSource(factories);
  const expectedHashes = JSON.stringify(orderedObject(factoryHashes));
  return `const crypto = require('node:crypto');
const path = require('node:path');
const { URL } = require('node:url');

const RELEASE = 'V25-APPLICATION-COMPILER';
const SOURCE_COMMIT = '${sourceCommit}';
const ENTRY = '${RUNTIME_ENTRY}';
const EXPECTED_FACTORY_BUNDLE_SHA256 = '${factoryBundleSha256}';
const BUNDLE_VERIFY_SCHEMA = 'glaciereq.v25-bundled-release-verification.v2';
const EXPECTED_FACTORY_SHA256 = Object.freeze(${expectedHashes});
const FACTORIES = Object.freeze({
${factoryObject}
});
let handlerPromise = null;
let verifiedFactoryIds = null;
let runtimeHandler = null;
let bundleVerification = null;

function sha256(value) { return crypto.createHash('sha256').update(value).digest('hex'); }
function resolveRelative(fromId, request) {
  let resolved = path.posix.normalize(path.posix.join(path.posix.dirname(fromId), request));
  if (!resolved.endsWith('.js')) resolved += '.js';
  if (!resolved.startsWith('api/') || !Object.hasOwn(FACTORIES, resolved)) throw new Error('v25_bundle_module_not_found');
  return resolved;
}
function verifyFactories() {
  if (verifiedFactoryIds) return verifiedFactoryIds;
  const ids = Object.keys(FACTORIES).sort();
  if (ids.length !== ${MODULES.length}) throw new Error('v25_bundle_module_count_mismatch');
  const chunks = [];
  for (const id of ids) {
    const source = Function.prototype.toString.call(FACTORIES[id]);
    const digest = sha256(Buffer.from(source));
    if (digest !== EXPECTED_FACTORY_SHA256[id]) throw new Error('v25_factory_sha256_mismatch');
    chunks.push(id + '\\0' + source + '\\0');
  }
  if (sha256(Buffer.from(chunks.join(''))) !== EXPECTED_FACTORY_BUNDLE_SHA256) throw new Error('v25_factory_bundle_sha256_mismatch');
  verifiedFactoryIds = Object.freeze(ids.slice());
  return verifiedFactoryIds;
}
function createModuleLoader() {
  const cache = new Map();
  function load(id) {
    if (cache.has(id)) return cache.get(id).exports;
    const factory = FACTORIES[id];
    if (typeof factory !== 'function') throw new Error('v25_bundle_module_missing');
    const module = { exports: {} };
    cache.set(id, module);
    const localRequire = (request) => {
      if (!String(request).startsWith('.')) return require(request);
      return load(resolveRelative(id, request));
    };
    factory(module.exports, localRequire, module, id, path.posix.dirname(id));
    return module.exports;
  }
  return load;
}
function getVerifiedRuntimeHandler() {
  verifyFactories();
  if (runtimeHandler) return runtimeHandler;
  const load = createModuleLoader();
  const handler = load(ENTRY);
  if (typeof handler !== 'function') throw new Error('v25_bundle_entry_not_handler');
  runtimeHandler = handler;
  return runtimeHandler;
}
function verifyBundle() {
  if (bundleVerification) return bundleVerification;
  const ids = verifyFactories();
  getVerifiedRuntimeHandler();
  bundleVerification = Object.freeze({
    schema: BUNDLE_VERIFY_SCHEMA,
    status: 'PASS', release: RELEASE, source_commit: SOURCE_COMMIT,
    factory_bundle_sha256: EXPECTED_FACTORY_BUNDLE_SHA256,
    module_count: ids.length, entry: ENTRY,
    runtime_string_evaluation_required: false,
    bootstrap_network_fetch_required: false,
    every_factory_sha256_verified_before_execution: true,
    verification_cached_per_instance: true,
  });
  return bundleVerification;
}
function requestPath(req) {
  const parsed = new URL(String(req?.url || '/'), 'https://glaciereq.invalid');
  const values = parsed.searchParams.getAll('path');
  if (values.length) return values.join('/').replace(/^\\/+|\\/+$/g, '');
  return parsed.pathname.replace(/^\\/+|\\/+$/g, '');
}
function serveBundleVerify(res) {
  let payload;
  try { payload = verifyBundle(); } catch (error) {
    payload = { schema: BUNDLE_VERIFY_SCHEMA, status: 'FAIL', release: RELEASE, source_commit: SOURCE_COMMIT, errors: [error instanceof Error ? error.message : 'v25_bundle_verification_failed'] };
  }
  const body = Buffer.from(JSON.stringify(payload, null, 2));
  res.statusCode = payload.status === 'PASS' ? 200 : 503;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-PSYSOCX-Release', RELEASE);
  res.setHeader('X-GlacierEQ-Bridge-Commit', SOURCE_COMMIT);
  res.setHeader('Content-Length', String(body.length));
  res.end(body);
}
async function getHandler() {
  if (!handlerPromise) {
    handlerPromise = Promise.resolve().then(getVerifiedRuntimeHandler).catch((error) => { handlerPromise = null; runtimeHandler = null; throw error; });
  }
  return handlerPromise;
}
module.exports = async function handler(req, res) {
  if (requestPath(req) === '__v25_bundle_verify') return serveBundleVerify(res);
  try { const runtime = await getHandler(); return runtime(req, res); }
  catch (error) {
    const body = Buffer.from(JSON.stringify({ schema: 'glaciereq.v25-bundled-runtime-error.v1', status: 'FAIL_CLOSED', source_commit: SOURCE_COMMIT, error: error instanceof Error ? error.message : 'v25_bundled_runtime_failed' }, null, 2));
    res.statusCode = 503; res.setHeader('Content-Type', 'application/json; charset=utf-8'); res.setHeader('Cache-Control', 'no-store'); res.setHeader('X-Content-Type-Options', 'nosniff'); res.setHeader('X-PSYSOCX-Release', RELEASE); res.setHeader('X-GlacierEQ-Bridge-Commit', SOURCE_COMMIT); res.setHeader('Content-Length', String(body.length)); res.end(body);
  }
};
`;
}

function routingConfig() {
  return JSON.stringify({ version: 2, builds: [{ src: DEPLOY_FILE, use: '@vercel/node' }], routes: [{ src: '/(.*)', dest: '/api/index?path=$1' }] }, null, 2) + '\n';
}

function main() {
  const { outputDir, sourceCommit } = parseArgs(process.argv);
  const { modules, moduleHashes, factories, factoryHashes } = readModules();
  const factoryBundle = factoryBundleBytes(factories);
  const factoryBundleSha256 = sha256(factoryBundle);
  const runtime = bootstrapSource({ sourceCommit, factories, factoryHashes, factoryBundleSha256 });
  fs.rmSync(outputDir, { recursive: true, force: true });
  fs.mkdirSync(path.join(outputDir, 'api'), { recursive: true });
  fs.writeFileSync(path.join(outputDir, DEPLOY_FILE), runtime);
  fs.writeFileSync(path.join(outputDir, ROUTING_FILE), routingConfig());
  const deploymentFiles = [DEPLOY_FILE, ROUTING_FILE].map((relative) => {
    const body = fs.readFileSync(path.join(outputDir, relative));
    return { path: relative, bytes: body.length, sha256: sha256(body) };
  });
  const manifest = {
    schema: MANIFEST_SCHEMA, release: 'V25-APPLICATION-COMPILER', source_commit: sourceCommit,
    entry: ENTRY, runtime_entry: RUNTIME_ENTRY, module_count: MODULES.length,
    module_sha256: orderedObject(moduleHashes), factory_sha256: orderedObject(factoryHashes),
    factory_bundle: { bytes: factoryBundle.length, sha256: factoryBundleSha256 }, deployment_files: deploymentFiles,
    verification_endpoint: '/__v25_bundle_verify',
    invariants: { self_contained_executable_modules: true, bootstrap_network_fetch_required: false, runtime_string_evaluation_required: false, factory_bundle_verified_before_module_execution: true, every_factory_sha256_verified_before_execution: true, verification_cached_per_instance: true, expected_deployment_file_count: 2 },
  };
  fs.writeFileSync(path.join(outputDir, 'deployment-manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
  process.stdout.write(JSON.stringify(manifest, null, 2) + '\n');
}

main();

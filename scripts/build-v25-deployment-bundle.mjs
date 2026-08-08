#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import zlib from 'node:zlib';
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
  'deployment/vercel-source-bridge/api/release-router.js',
];
const ENTRY = 'deployment/vercel-source-bridge/api/release-router.js';
const BUNDLE_SCHEMA = 'glaciereq.v25-self-contained-module-bundle.v1';
const MANIFEST_SCHEMA = 'glaciereq.v25-deployment-bundle-manifest.v1';
const DEPLOY_FILE = 'api/index.js';
const ROUTING_FILE = 'vercel.json';
const COMMIT_RE = /^[a-f0-9]{40}$/;

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function parseArgs(argv) {
  const result = {
    outputDir: path.join(ROOT, 'artifacts', 'v25-deployment'),
    sourceCommit: process.env.GITHUB_SHA || '',
  };
  for (let index = 2; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--output-dir') {
      result.outputDir = path.resolve(argv[++index]);
    } else if (arg === '--source-commit') {
      result.sourceCommit = argv[++index];
    } else {
      throw new Error(`unknown_argument:${arg}`);
    }
  }
  if (!COMMIT_RE.test(result.sourceCommit)) {
    throw new Error('source_commit_must_be_full_lowercase_sha');
  }
  return result;
}

function readModules() {
  const modules = {};
  const moduleHashes = {};
  for (const relative of MODULES) {
    const absolute = path.join(ROOT, relative);
    if (!fs.existsSync(absolute)) throw new Error(`missing_module:${relative}`);
    const source = fs.readFileSync(absolute, 'utf8');
    const key = relative.replace('deployment/vercel-source-bridge/', '');
    modules[key] = source;
    moduleHashes[key] = sha256(Buffer.from(source));
  }
  if (!modules['api/release-router.js']) throw new Error('entry_module_missing');
  if (!modules['api/compiler-proxy.js'].includes('V25-APPLICATION-COMPILER')) {
    throw new Error('v25_compiler_release_marker_missing');
  }
  return { modules, moduleHashes };
}

function stableBundle(sourceCommit, modules, moduleHashes) {
  const orderedModules = Object.fromEntries(
    Object.entries(modules).sort(([left], [right]) => left.localeCompare(right)),
  );
  const orderedHashes = Object.fromEntries(
    Object.entries(moduleHashes).sort(([left], [right]) => left.localeCompare(right)),
  );
  const payload = {
    schema: BUNDLE_SCHEMA,
    source_commit: sourceCommit,
    entry: 'api/release-router.js',
    module_sha256: orderedHashes,
    modules: orderedModules,
  };
  return Buffer.from(`${JSON.stringify(payload)}\n`);
}

function bootstrapSource({ sourceCommit, bundleSha256, bundleGzipBase64 }) {
  return `const crypto = require('node:crypto');
const path = require('node:path');
const zlib = require('node:zlib');

const RELEASE = 'V25-APPLICATION-COMPILER';
const SOURCE_COMMIT = '${sourceCommit}';
const EXPECTED_BUNDLE_SHA256 = '${bundleSha256}';
const BUNDLED_MODULES_GZIP_BASE64 = '${bundleGzipBase64}';
let handlerPromise = null;

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function resolveRelative(fromId, request, modules) {
  let resolved = path.posix.normalize(path.posix.join(path.posix.dirname(fromId), request));
  if (!resolved.endsWith('.js')) resolved += '.js';
  if (!resolved.startsWith('api/') || !Object.hasOwn(modules, resolved)) {
    throw new Error('v25_bundle_module_not_found');
  }
  return resolved;
}

function loadBundle() {
  const compressed = Buffer.from(BUNDLED_MODULES_GZIP_BASE64, 'base64');
  const bytes = zlib.gunzipSync(compressed);
  if (sha256(bytes) !== EXPECTED_BUNDLE_SHA256) {
    throw new Error('v25_bundle_sha256_mismatch');
  }
  const bundle = JSON.parse(bytes.toString('utf8'));
  if (bundle.schema !== '${BUNDLE_SCHEMA}' || bundle.source_commit !== SOURCE_COMMIT) {
    throw new Error('v25_bundle_authority_mismatch');
  }
  if (bundle.entry !== 'api/release-router.js' || !bundle.modules || !bundle.module_sha256) {
    throw new Error('v25_bundle_structure_invalid');
  }
  for (const [id, source] of Object.entries(bundle.modules)) {
    if (typeof source !== 'string' || sha256(Buffer.from(source)) !== bundle.module_sha256[id]) {
      throw new Error('v25_bundle_module_sha256_mismatch');
    }
  }
  return bundle;
}

function compileBundle(bundle) {
  const cache = new Map();
  function load(id) {
    if (cache.has(id)) return cache.get(id).exports;
    const source = bundle.modules[id];
    if (typeof source !== 'string') throw new Error('v25_bundle_module_missing');
    const module = { exports: {} };
    cache.set(id, module);
    const localRequire = (request) => {
      if (!String(request).startsWith('.')) return require(request);
      return load(resolveRelative(id, request, bundle.modules));
    };
    const factory = new Function('exports', 'require', 'module', '__filename', '__dirname', source);
    factory(module.exports, localRequire, module, id, path.posix.dirname(id));
    return module.exports;
  }
  const handler = load(bundle.entry);
  if (typeof handler !== 'function') throw new Error('v25_bundle_entry_not_handler');
  return handler;
}

async function getHandler() {
  if (!handlerPromise) {
    handlerPromise = Promise.resolve().then(() => compileBundle(loadBundle())).catch((error) => {
      handlerPromise = null;
      throw error;
    });
  }
  return handlerPromise;
}

module.exports = async function v25BundledRelease(req, res) {
  try {
    const handler = await getHandler();
    return handler(req, res);
  } catch (error) {
    console.error('V25 bundled release failed', error);
    const body = Buffer.from('Recruiter presentation temporarily unavailable.');
    res.statusCode = 502;
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-PSYSOCX-Release', RELEASE);
    res.setHeader('X-GlacierEQ-Bridge-Commit', SOURCE_COMMIT);
    res.setHeader('Content-Length', String(body.length));
    res.end(body);
  }
};

module.exports.constants = {
  EXPECTED_BUNDLE_SHA256,
  RELEASE,
  SOURCE_COMMIT,
};
`;
}

function routingSource() {
  return `${JSON.stringify({
    version: 2,
    routes: [{ src: '/(.*)', dest: '/api/index?path=$1' }],
  })}\n`;
}

function writeAtomic(filePath, bytes) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const temporary = `${filePath}.tmp-${process.pid}`;
  fs.writeFileSync(temporary, bytes);
  fs.renameSync(temporary, filePath);
}

function main() {
  const { outputDir, sourceCommit } = parseArgs(process.argv);
  const { modules, moduleHashes } = readModules();
  const bundle = stableBundle(sourceCommit, modules, moduleHashes);
  const bundleSha256 = sha256(bundle);
  const compressed = zlib.gzipSync(bundle, { level: 9, mtime: 0 });
  const bootstrap = Buffer.from(bootstrapSource({
    sourceCommit,
    bundleSha256,
    bundleGzipBase64: compressed.toString('base64'),
  }));
  const routing = Buffer.from(routingSource());

  const deployPath = path.join(outputDir, DEPLOY_FILE);
  const routePath = path.join(outputDir, ROUTING_FILE);
  writeAtomic(deployPath, bootstrap);
  writeAtomic(routePath, routing);

  const manifest = {
    schema: MANIFEST_SCHEMA,
    release: 'V25-APPLICATION-COMPILER',
    source_commit: sourceCommit,
    entry: ENTRY,
    module_count: Object.keys(modules).length,
    module_sha256: moduleHashes,
    bundle: {
      uncompressed_bytes: bundle.length,
      uncompressed_sha256: bundleSha256,
      gzip_bytes: compressed.length,
      gzip_sha256: sha256(compressed),
    },
    deployment_files: [
      {
        path: DEPLOY_FILE,
        bytes: bootstrap.length,
        sha256: sha256(bootstrap),
      },
      {
        path: ROUTING_FILE,
        bytes: routing.length,
        sha256: sha256(routing),
      },
    ],
    invariants: {
      self_contained_executable_modules: true,
      bootstrap_network_fetch_required: false,
      bundle_verified_before_compile: true,
      every_module_sha256_verified_before_execution: true,
      expected_deployment_file_count: 2,
    },
  };
  writeAtomic(
    path.join(outputDir, 'deployment-manifest.json'),
    Buffer.from(`${JSON.stringify(manifest, null, 2)}\n`),
  );
  process.stdout.write(`${JSON.stringify(manifest, null, 2)}\n`);
}

main();

#!/usr/bin/env node

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SITE = path.join(ROOT, 'site-v15');
const COMMIT_RE = /^[a-f0-9]{40}$/;
const RELEASE = 'V31-FULL-ESTATE-RESTORATION';
const SCHEMA = 'glaciereq.v31-deployment-bundle-manifest.v1';

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function requireValue(condition, message) {
  if (!condition) throw new Error(message);
}

function parseArgs(argv) {
  const out = {
    sourceCommit: '',
    v25Dir: path.join(ROOT, 'artifacts', 'v25-deployment'),
    outputDir: path.join(ROOT, 'artifacts', 'v31-deployment'),
  };
  for (let index = 2; index < argv.length; index += 1) {
    const flag = argv[index];
    const value = argv[index + 1];
    requireValue(value && !value.startsWith('--'), `${flag}_requires_value`);
    if (flag === '--source-commit') out.sourceCommit = value;
    else if (flag === '--v25-dir') out.v25Dir = path.resolve(value);
    else if (flag === '--output-dir') out.outputDir = path.resolve(value);
    else throw new Error(`unknown_argument:${flag}`);
    index += 1;
  }
  requireValue(COMMIT_RE.test(out.sourceCommit), 'source_commit_must_be_full_lowercase_sha');
  return out;
}

function readBytes(relative) {
  const absolute = path.join(SITE, relative);
  requireValue(fs.existsSync(absolute), `missing_site_file:${relative}`);
  return fs.readFileSync(absolute);
}

function addEstateToSitemap(bytes) {
  const marker = 'https://casey-barton-glaciereq.vercel.app/estate/';
  let xml = bytes.toString('utf8');
  if (xml.includes(marker)) return Buffer.from(xml);
  requireValue(xml.includes('</urlset>'), 'sitemap_close_missing');
  xml = xml.replace(
    '</urlset>',
    `  <url><loc>${marker}</loc><priority>0.8</priority></url>\n</urlset>`,
  );
  return Buffer.from(xml);
}

function loadStaticFiles() {
  const files = new Map([
    ['index.html', ['text/html; charset=utf-8', readBytes('index.html')]],
    ['estate/index.html', ['text/html; charset=utf-8', readBytes('estate/index.html')]],
    ['data/public-estate.json', ['application/json; charset=utf-8', readBytes('data/public-estate.json')]],
    ['assets/site.estate.css', ['text/css; charset=utf-8', readBytes('assets/site.estate.css')]],
    ['sitemap.xml', ['application/xml; charset=utf-8', addEstateToSitemap(readBytes('sitemap.xml'))]],
  ]);
  const root = files.get('index.html')[1].toString('utf8');
  const estate = files.get('estate/index.html')[1].toString('utf8');
  const payload = JSON.parse(files.get('data/public-estate.json')[1].toString('utf8'));
  requireValue(root.includes('href="/estate/"'), 'current_home_missing_estate_navigation');
  requireValue(estate.includes('The library is the substrate. The recruiter view is only a projection.'), 'estate_restoration_marker_missing');
  requireValue(payload.schema === 'glaciereq.public-estate-explorer.v1', 'estate_schema_drift');
  requireValue(payload.public_discovered_count === payload.records?.length, 'estate_record_count_mismatch');
  requireValue(payload.public_discovered_count >= 100, 'estate_public_discovery_suspiciously_small');
  requireValue(payload.scope?.estate?.repository_count === 1183, 'estate_bound_scope_drift');
  requireValue(payload.scope?.job_rollout_projection?.repository_count === 67, 'estate_rollout_projection_drift');
  requireValue(payload.scope?.job_rollout_projection?.is_full_estate_inventory === false, 'rollout_mislabeled_as_estate');
  requireValue(!payload.records.some((row) => String(row.url || '').includes('PRIVATE_REPOSITORY_IDENTITY_WITHHELD')), 'private_identity_placeholder_url');
  return { files, payload };
}

function literalStatic(files) {
  return Object.fromEntries(
    [...files.entries()].map(([filePath, [contentType, body]]) => [
      filePath,
      {
        content_type: contentType,
        sha256: sha256(body),
        base64: body.toString('base64'),
      },
    ]),
  );
}

function wrapperSource({ sourceCommit, v25Source, staticFiles, estatePayload, v25Sha256 }) {
  const staticLiteral = JSON.stringify(staticFiles);
  return `const crypto = require('node:crypto');
const path = require('node:path');
const { URL } = require('node:url');

const RELEASE = '${RELEASE}';
const SOURCE_COMMIT = '${sourceCommit}';
const INNER_V25_SHA256 = '${v25Sha256}';
const STATIC = Object.freeze(${staticLiteral});
const EXECUTABLE_SCRIPT = /<script\\b(?![^>]*\\btype\\s*=\\s*["']application\\/ld\\+json["'])/i;
let decoded = null;
let innerHandler = null;

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function v25Factory(exports, require, module, __filename, __dirname) {
${v25Source}
}

function loadInnerV25() {
  if (innerHandler) return innerHandler;
  const module = { exports: {} };
  v25Factory(module.exports, require, module, 'api/v25-inner.js', 'api');
  if (typeof module.exports !== 'function') throw new Error('v31_inner_v25_handler_missing');
  innerHandler = module.exports;
  return innerHandler;
}

function normalize(input) {
  const raw = Array.isArray(input) ? input.join('/') : String(input || '');
  const clean = raw.replace(/^\\/+|\\/+$/g, '');
  if (!clean) return 'index.html';
  if (clean.includes('..') || clean.includes('\\\\')) return null;
  const last = clean.split('/').pop() || '';
  return last.includes('.') ? clean : clean + '/index.html';
}

function requestPath(req) {
  const parsed = new URL(String(req?.url || '/'), 'https://glaciereq.invalid');
  const values = parsed.searchParams.getAll('path');
  if (values.length) return values.join('/');
  return parsed.pathname;
}

function securityHeaders(res) {
  res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'none'; style-src 'self'; img-src 'self' data:; connect-src 'none'; font-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'; form-action 'self' mailto:; upgrade-insecure-requests");
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=()');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  res.setHeader('X-GlacierEQ-Source-Commit', SOURCE_COMMIT);
  res.setHeader('X-GlacierEQ-Estate-Snapshot-SHA256', STATIC['data/public-estate.json'].sha256);
  res.setHeader('X-PSYSOCX-Release', RELEASE);
}

function decodeStatic() {
  if (decoded) return decoded;
  const result = new Map();
  for (const [filePath, record] of Object.entries(STATIC)) {
    const body = Buffer.from(record.base64, 'base64');
    if (sha256(body) !== record.sha256) throw new Error('v31_static_sha256_mismatch:' + filePath);
    result.set(filePath, { body, contentType: record.content_type, sha256: record.sha256 });
  }
  decoded = result;
  return decoded;
}

function verify() {
  const files = decodeStatic();
  const estate = JSON.parse(files.get('data/public-estate.json').body.toString('utf8'));
  const home = files.get('index.html').body.toString('utf8');
  const estateHtml = files.get('estate/index.html').body.toString('utf8');
  const sitemap = files.get('sitemap.xml').body.toString('utf8');
  const errors = [];
  if (estate.schema !== 'glaciereq.public-estate-explorer.v1') errors.push('estate_schema');
  if (estate.public_discovered_count !== ${estatePayload.public_discovered_count}) errors.push('estate_public_count');
  if (estate.records?.length !== estate.public_discovered_count) errors.push('estate_records');
  if (estate.scope?.estate?.repository_count !== 1183) errors.push('estate_total');
  if (estate.scope?.job_rollout_projection?.repository_count !== 67) errors.push('rollout_projection');
  if (estate.scope?.job_rollout_projection?.is_full_estate_inventory !== false) errors.push('rollout_boundary');
  if (!home.includes('href="/estate/"')) errors.push('home_estate_navigation');
  if (!estateHtml.includes('The library is the substrate. The recruiter view is only a projection.')) errors.push('restoration_marker');
  if (!sitemap.includes('https://casey-barton-glaciereq.vercel.app/estate/')) errors.push('sitemap_estate_route');
  if (EXECUTABLE_SCRIPT.test(estateHtml)) errors.push('estate_script_boundary');
  if (estate.records?.some((row) => !String(row.url || '').startsWith('https://github.com/GlacierEQ/'))) errors.push('estate_public_identity_boundary');
  if (typeof loadInnerV25() !== 'function') errors.push('inner_v25_handler');
  return {
    schema: 'glaciereq.v31-full-estate-production-verification.v1',
    status: errors.length ? 'FAIL' : 'PASS',
    release: RELEASE,
    source_commit: SOURCE_COMMIT,
    inner_v25_sha256: INNER_V25_SHA256,
    public_repositories: estate.public_discovered_count,
    estate_total: estate.scope?.estate?.repository_count ?? null,
    private_repositories_withheld: estate.scope?.estate?.private_repository_count ?? null,
    rollout_projection: estate.scope?.job_rollout_projection?.repository_count ?? null,
    outside_rollout_projection: estate.scope?.job_rollout_projection?.outside_projection_repository_count ?? null,
    capability_families: estate.families?.length ?? null,
    archived_public_preserved: estate.archived_public_discovered_count ?? null,
    forks_preserved: estate.fork_public_discovered_count ?? null,
    private_repository_identities_published: false,
    home_estate_navigation: home.includes('href="/estate/"'),
    sitemap_estate_route: sitemap.includes('https://casey-barton-glaciereq.vercel.app/estate/'),
    errors,
  };
}

function serveVerify(res) {
  let payload;
  try { payload = verify(); }
  catch (error) {
    payload = {
      schema: 'glaciereq.v31-full-estate-production-verification.v1',
      status: 'FAIL',
      release: RELEASE,
      source_commit: SOURCE_COMMIT,
      errors: [error instanceof Error ? error.message : 'v31_verification_failed'],
    };
  }
  const body = Buffer.from(JSON.stringify(payload, null, 2) + '\\n');
  securityHeaders(res);
  res.statusCode = payload.status === 'PASS' ? 200 : 503;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Content-Length', String(body.length));
  res.end(body);
}

function serveStatic(filePath, res) {
  const file = decodeStatic().get(filePath);
  if (!file) return false;
  securityHeaders(res);
  res.statusCode = 200;
  res.setHeader('Content-Type', file.contentType);
  res.setHeader('Cache-Control', filePath.endsWith('.css') ? 'public, max-age=3600, s-maxage=86400' : 'public, max-age=0, must-revalidate');
  res.setHeader('ETag', '"sha256-' + file.sha256 + '"');
  res.setHeader('Content-Length', String(file.body.length));
  res.end(file.body);
  return true;
}

module.exports = async function v31FullEstateRelease(req, res) {
  const rawPath = requestPath(req).replace(/^\\/+|\\/+$/g, '');
  if (rawPath === '__v31_verify') return serveVerify(res);
  const filePath = normalize(rawPath);
  if (filePath && serveStatic(filePath, res)) return;
  return loadInnerV25()(req, res);
};

module.exports.verify = verify;
module.exports.constants = { INNER_V25_SHA256, RELEASE, SOURCE_COMMIT };
`;
}

function routingSource() {
  return `${JSON.stringify({ version: 2, routes: [{ src: '/(.*)', dest: '/api/index?path=$1' }] })}\n`;
}

function writeAtomic(filePath, bytes) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const temporary = `${filePath}.tmp-${process.pid}`;
  fs.writeFileSync(temporary, bytes);
  fs.renameSync(temporary, filePath);
}

function main() {
  const { sourceCommit, v25Dir, outputDir } = parseArgs(process.argv);
  const v25Path = path.join(v25Dir, 'api', 'index.js');
  const v25ManifestPath = path.join(v25Dir, 'deployment-manifest.json');
  requireValue(fs.existsSync(v25Path), 'v25_inner_bundle_missing');
  requireValue(fs.existsSync(v25ManifestPath), 'v25_inner_manifest_missing');
  const v25Source = fs.readFileSync(v25Path, 'utf8');
  const v25Manifest = JSON.parse(fs.readFileSync(v25ManifestPath, 'utf8'));
  requireValue(v25Manifest.schema === 'glaciereq.v25-deployment-bundle-manifest.v2', 'v25_inner_schema');
  requireValue(v25Manifest.invariants?.self_contained_executable_modules === true, 'v25_inner_not_self_contained');
  requireValue(!/\beval\s*\(|new\s+Function\s*\(/.test(v25Source), 'v25_inner_runtime_string_eval');

  const { files, payload } = loadStaticFiles();
  const staticFiles = literalStatic(files);
  const wrapper = Buffer.from(wrapperSource({
    sourceCommit,
    v25Source,
    staticFiles,
    estatePayload: payload,
    v25Sha256: sha256(Buffer.from(v25Source)),
  }));
  const routing = Buffer.from(routingSource());
  requireValue(!/\beval\s*\(|new\s+Function\s*\(/.test(wrapper.toString('utf8')), 'v31_runtime_string_eval');

  writeAtomic(path.join(outputDir, 'api', 'index.js'), wrapper);
  writeAtomic(path.join(outputDir, 'vercel.json'), routing);

  const manifest = {
    schema: SCHEMA,
    release: RELEASE,
    source_commit: sourceCommit,
    inner_v25: {
      source_commit: v25Manifest.source_commit,
      sha256: sha256(Buffer.from(v25Source)),
      manifest_schema: v25Manifest.schema,
    },
    estate_snapshot: {
      schema: payload.schema,
      sha256: staticFiles['data/public-estate.json'].sha256,
      public_repositories: payload.public_discovered_count,
      estate_total: payload.scope.estate.repository_count,
      private_repositories_withheld: payload.scope.estate.private_repository_count,
      rollout_projection: payload.scope.job_rollout_projection.repository_count,
      outside_rollout_projection: payload.scope.job_rollout_projection.outside_projection_repository_count,
      capability_families: payload.families.length,
      archived_public_preserved: payload.archived_public_discovered_count,
      forks_preserved: payload.fork_public_discovered_count,
    },
    static_files: Object.fromEntries(Object.entries(staticFiles).map(([filePath, row]) => [filePath, { bytes: Buffer.from(row.base64, 'base64').length, sha256: row.sha256, content_type: row.content_type }])),
    deployment_files: [
      { path: 'api/index.js', bytes: wrapper.length, sha256: sha256(wrapper) },
      { path: 'vercel.json', bytes: routing.length, sha256: sha256(routing) },
    ],
    verification_endpoint: '/__v31_verify',
    invariants: {
      full_estate_discovery_precedes_rollout_projection: true,
      archived_and_fork_lineage_preserved: true,
      private_repository_identities_withheld: true,
      home_links_to_estate: true,
      estate_in_sitemap: true,
      v25_runtime_preserved_as_inner_handler: true,
      runtime_string_evaluation_required: false,
      deployment_file_count: 2,
    },
  };
  writeAtomic(path.join(outputDir, 'deployment-manifest.json'), Buffer.from(`${JSON.stringify(manifest, null, 2)}\n`));
  process.stdout.write(`${JSON.stringify(manifest, null, 2)}\n`);
}

main();

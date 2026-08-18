const crypto = require('node:crypto');
const proxy = require('./proxy.js');

const RELEASE = 'V31-FULL-ESTATE-RESTORATION';
const SOURCE_COMMIT = '__ESTATE_SOURCE_COMMIT__';
const ESTATE_HTML_BASE64 = '__ESTATE_HTML_BASE64__';
const ESTATE_JSON_BASE64 = '__ESTATE_JSON_BASE64__';
const ESTATE_CSS_BASE64 = '__ESTATE_CSS_BASE64__';
const SNAPSHOT_SHA256 = '__ESTATE_SNAPSHOT_SHA256__';
const ROUTES = new Map([
  ['estate/index.html', ['text/html; charset=utf-8', ESTATE_HTML_BASE64]],
  ['data/public-estate.json', ['application/json; charset=utf-8', ESTATE_JSON_BASE64]],
  ['assets/site.estate.css', ['text/css; charset=utf-8', ESTATE_CSS_BASE64]],
]);

let decoded = null;

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function materialize() {
  if (decoded) return decoded;
  const next = new Map();
  for (const [filePath, [contentType, encoded]] of ROUTES) {
    if (!encoded || encoded.startsWith('__ESTATE_')) {
      throw new Error(`estate_bundle_placeholder_unresolved:${filePath}`);
    }
    next.set(filePath, {
      body: Buffer.from(encoded, 'base64'),
      contentType,
    });
  }
  const json = next.get('data/public-estate.json')?.body;
  if (!json || sha256(json) !== SNAPSHOT_SHA256) {
    throw new Error('estate_snapshot_sha256_mismatch');
  }
  decoded = next;
  return decoded;
}

function securityHeaders(res) {
  res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'none'; style-src 'self'; img-src 'self' data:; connect-src 'none'; font-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'; form-action 'self' mailto:; upgrade-insecure-requests");
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=()');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  res.setHeader('X-GlacierEQ-Source-Commit', SOURCE_COMMIT);
  res.setHeader('X-GlacierEQ-Estate-Snapshot-SHA256', SNAPSHOT_SHA256);
  res.setHeader('X-PSYSOCX-Release', RELEASE);
}

function routePath(req) {
  const rawPath = proxy.requestPath(req);
  return proxy.normalize(rawPath);
}

function handles(rawPath) {
  const normalized = proxy.normalize(rawPath);
  return normalized ? ROUTES.has(normalized) : false;
}

function verification() {
  const files = materialize();
  const html = files.get('estate/index.html').body.toString('utf8');
  const data = JSON.parse(files.get('data/public-estate.json').body.toString('utf8'));
  const css = files.get('assets/site.estate.css').body;
  const errors = [];
  if (data.schema !== 'glaciereq.public-estate-explorer.v1') errors.push('estate_schema');
  if (!Number.isInteger(data.public_discovered_count) || data.public_discovered_count < 100) errors.push('estate_public_count');
  if (data.scope?.estate?.repository_count !== 1183) errors.push('estate_total_scope');
  if (data.scope?.job_rollout_projection?.repository_count !== 67) errors.push('estate_rollout_projection');
  if (data.scope?.job_rollout_projection?.is_full_estate_inventory !== false) errors.push('estate_projection_boundary');
  if (!Array.isArray(data.records) || data.records.length !== data.public_discovered_count) errors.push('estate_records');
  if (!Array.isArray(data.families) || data.families.reduce((sum, family) => sum + family.count, 0) !== data.public_discovered_count) errors.push('estate_family_coverage');
  if (data.records?.some((row) => row.visibility === 'private' || !String(row.url || '').startsWith('https://github.com/GlacierEQ/'))) errors.push('estate_private_identity_boundary');
  if (!html.includes('The library is the substrate. The recruiter view is only a projection.')) errors.push('estate_restoration_marker');
  if (!html.includes('/assets/site.estate.css')) errors.push('estate_css_link');
  if (/<script\b/i.test(html)) errors.push('estate_script_boundary');
  if (!css.length) errors.push('estate_css_empty');
  return {
    schema: 'glaciereq.v31-full-estate-production-verification.v1',
    status: errors.length ? 'FAIL' : 'PASS',
    release: RELEASE,
    source_commit: SOURCE_COMMIT,
    snapshot_sha256: SNAPSHOT_SHA256,
    public_repositories: data.public_discovered_count,
    estate_total: data.scope?.estate?.repository_count ?? null,
    rollout_projection: data.scope?.job_rollout_projection?.repository_count ?? null,
    archived_public: data.archived_public_discovered_count,
    fork_public: data.fork_public_discovered_count,
    capability_families: data.families?.length ?? null,
    private_repository_identities_published: false,
    errors,
  };
}

function serveVerification(res) {
  let payload;
  try {
    payload = verification();
  } catch (error) {
    payload = {
      schema: 'glaciereq.v31-full-estate-production-verification.v1',
      status: 'FAIL',
      release: RELEASE,
      source_commit: SOURCE_COMMIT,
      errors: [error instanceof Error ? error.message : 'estate_verification_failed'],
    };
  }
  const body = Buffer.from(`${JSON.stringify(payload, null, 2)}\n`);
  securityHeaders(res);
  res.statusCode = payload.status === 'PASS' ? 200 : 503;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Content-Length', String(body.length));
  res.end(body);
}

module.exports = async function fullEstateProxy(req, res) {
  const rawPath = proxy.requestPath(req);
  if (rawPath === '__v31_verify') return serveVerification(res);
  const filePath = routePath(req);
  if (!filePath || !ROUTES.has(filePath)) {
    res.statusCode = 404;
    res.end('Not Found');
    return;
  }
  try {
    const file = materialize().get(filePath);
    securityHeaders(res);
    res.statusCode = 200;
    res.setHeader('Content-Type', file.contentType);
    res.setHeader('Cache-Control', filePath.endsWith('.css') ? 'public, max-age=3600, s-maxage=86400' : 'public, max-age=0, must-revalidate');
    res.setHeader('ETag', `"sha256-${sha256(file.body)}"`);
    res.setHeader('Content-Length', String(file.body.length));
    res.end(file.body);
  } catch (error) {
    console.error('Full estate route failed', error);
    const body = Buffer.from('Estate explorer temporarily unavailable.');
    securityHeaders(res);
    res.statusCode = 503;
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('Content-Length', String(body.length));
    res.end(body);
  }
};

module.exports.constants = { RELEASE, ROUTES, SNAPSHOT_SHA256, SOURCE_COMMIT };
module.exports.handles = handles;
module.exports.verification = verification;

const { URL } = require('node:url');
const proxy = require('./proxy.js');

const SOURCE_COMMIT = '__BUILD_SOURCE_COMMIT__';
const RELEASE = 'V23-SYSTEMS-ATLAS-RESOURCE-GROUNDED';
const VERIFY_SCHEMA = 'glaciereq.v23-systems-atlas-runtime-verification.v1';
const FETCH_TIMEOUT_MS = 12_000;
const MAX_BYTES = 4 * 1024 * 1024;
const COMMIT_RE = /^[a-f0-9]{40}$/;

const PATHS = Object.freeze({
  'resume/index.html': { type: 'text/html; charset=utf-8', markers: ['SYSTEMS ATLAS RESUME', 'Evidence-carrying execution', 'BIOLOGICAL SYSTEMS', '199/200'] },
  'master/index.html': { type: 'text/html; charset=utf-8', markers: ['REPEATED ENGINEERING PATTERNS', 'SYSTEMS LINEAGE', 'TOWER OF BABEL', '200 collected, 199 passed, 1 skipped'] },
  'resume/ats.txt': { type: 'text/plain; charset=utf-8', markers: ['SYSTEMS ATLAS MASTER', 'FRONTIER ENGINEERING SIGNAL', '200 collected, 199 passed, 1 skipped', 'ARCHITECTURE CHRONOLOGY - TIMESTAMPED, BOUNDED'] },
  'data/resume.json': { type: 'application/json; charset=utf-8', json: true },
  'llms.txt': { type: 'text/plain; charset=utf-8', markers: ['Systems Atlas V23', 'evidence-carrying execution', 'systems-lineage summary'] },
  'assets/site.css': { type: 'text/css; charset=utf-8' },
  'assets/site.systems.css': { type: 'text/css; charset=utf-8' },
  'assets/site.complete.css': { type: 'text/css; charset=utf-8' },
  'assets/site.interaction.css': { type: 'text/css; charset=utf-8' },
  'assets/site.algerian.css': { type: 'text/css; charset=utf-8' },
  'assets/resume.v17.css': { type: 'text/css; charset=utf-8' },
  'assets/resume.final.css': { type: 'text/css; charset=utf-8' },
});

let cache = new Map();

function requireValue(condition, message) {
  if (!condition) throw new Error(message);
}

function normalizeRequest(req) {
  const raw = proxy.requestPath(req);
  if (raw === '__systems_atlas_verify') return raw;
  return proxy.normalize(raw);
}

function handles(value) {
  const raw = String(value || '').replace(/^\/+|\/+$/g, '');
  if (raw === '__systems_atlas_verify') return true;
  const normalized = proxy.normalize(raw);
  return Boolean(normalized && Object.hasOwn(PATHS, normalized));
}

function rawUrl(filePath) {
  requireValue(COMMIT_RE.test(SOURCE_COMMIT), 'systems_atlas_source_commit_not_bound');
  requireValue(Object.hasOwn(PATHS, filePath), `systems_atlas_path_not_allowed:${filePath}`);
  return `https://raw.githubusercontent.com/GlacierEQ/job-application/${SOURCE_COMMIT}/site-v15/${filePath}`;
}

async function fetchBounded(filePath) {
  if (cache.has(filePath)) return cache.get(filePath);
  const promise = (async () => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    try {
      const response = await fetch(rawUrl(filePath), {
        headers: { 'user-agent': 'GlacierEQ-Systems-Atlas-V23/1.0' },
        signal: controller.signal,
        redirect: 'error',
      });
      requireValue(response.ok, `systems_atlas_http_${response.status}:${filePath}`);
      const declared = Number(response.headers.get('content-length') || 0);
      requireValue(!declared || declared <= MAX_BYTES, `systems_atlas_declared_too_large:${filePath}`);
      const body = Buffer.from(await response.arrayBuffer());
      requireValue(body.length > 0 && body.length <= MAX_BYTES, `systems_atlas_body_size:${filePath}`);
      validate(filePath, body);
      return body;
    } catch (error) {
      if (error?.name === 'AbortError') throw new Error(`systems_atlas_fetch_timeout:${filePath}`);
      throw error;
    } finally {
      clearTimeout(timer);
    }
  })().catch((error) => {
    cache.delete(filePath);
    throw error;
  });
  cache.set(filePath, promise);
  return promise;
}

function validate(filePath, body) {
  const contract = PATHS[filePath];
  requireValue(contract, `systems_atlas_contract_missing:${filePath}`);
  const text = body.toString('utf8');
  for (const marker of contract.markers || []) {
    requireValue(text.toLowerCase().includes(marker.toLowerCase()), `systems_atlas_marker_missing:${filePath}:${marker}`);
  }
  if (contract.json) {
    const value = JSON.parse(text);
    requireValue(value?.meta?.schema === 'glaciereq.resume-intelligence.v23', 'systems_atlas_resume_schema');
    requireValue(value?.meta?.version === '23.0.0-resource-grounded', 'systems_atlas_resume_version');
    requireValue(value?.meta?.profile === 'SYSTEMS_ATLAS_FOUR_LAYER', 'systems_atlas_resume_profile');
    requireValue(value?.meta?.facts_invariant === true, 'systems_atlas_resume_invariant');
    requireValue(Array.isArray(value?.x_capability_clusters) && value.x_capability_clusters.length === 6, 'systems_atlas_capability_clusters');
    requireValue(Array.isArray(value?.x_systems_lineage?.mappings) && value.x_systems_lineage.mappings.length >= 8, 'systems_atlas_lineage_mappings');
    requireValue(value?.x_chronology?.classification === 'DATED_SEMANTIC_CONVERGENCE_ONLY', 'systems_atlas_chronology_boundary');
  }
  if (filePath.endsWith('.html')) {
    requireValue(!/<script\b/i.test(text), `systems_atlas_script_forbidden:${filePath}`);
    requireValue(!/\sstyle\s*=\s*/i.test(text), `systems_atlas_inline_style_forbidden:${filePath}`);
    if (filePath === 'resume/index.html') requireValue(!/<table\b/i.test(text), 'systems_atlas_resume_table_forbidden');
  }
}

function securityHeaders(res) {
  res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'none'; style-src 'self'; img-src 'self' data:; connect-src 'none'; font-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'; form-action 'self' mailto:; upgrade-insecure-requests");
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=()');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  res.setHeader('X-GlacierEQ-Source-Commit', SOURCE_COMMIT);
  res.setHeader('X-PSYSOCX-Resume-Release', RELEASE);
}

async function serve(filePath, res) {
  try {
    const body = await fetchBounded(filePath);
    securityHeaders(res);
    res.statusCode = 200;
    res.setHeader('Content-Type', PATHS[filePath].type);
    res.setHeader('Cache-Control', filePath.endsWith('.css') ? 'public, max-age=0, s-maxage=900, must-revalidate' : 'public, max-age=0, must-revalidate');
    res.setHeader('Content-Length', String(body.length));
    res.end(body);
  } catch (error) {
    const body = Buffer.from(JSON.stringify({
      schema: 'glaciereq.v23-systems-atlas-runtime-error.v1',
      status: 'FAIL_CLOSED',
      source_commit: SOURCE_COMMIT,
      path: filePath,
      error: error instanceof Error ? error.message : String(error),
    }, null, 2));
    securityHeaders(res);
    res.statusCode = 503;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('Content-Length', String(body.length));
    res.end(body);
  }
}

async function verify(res) {
  const errors = [];
  const checks = {};
  for (const filePath of ['resume/index.html', 'master/index.html', 'resume/ats.txt', 'data/resume.json', 'llms.txt']) {
    try {
      const body = await fetchBounded(filePath);
      checks[filePath] = { status: 'PASS', bytes: body.length };
    } catch (error) {
      checks[filePath] = { status: 'FAIL', error: error instanceof Error ? error.message : String(error) };
      errors.push(filePath);
    }
  }
  const payload = Buffer.from(JSON.stringify({
    schema: VERIFY_SCHEMA,
    status: errors.length ? 'FAIL' : 'PASS',
    release: RELEASE,
    source_commit: SOURCE_COMMIT,
    canonical_surfaces: Object.keys(PATHS),
    checks,
    scraper_contract: { resume_tables: 0, scripts: 0, inline_styles: 0 },
    errors,
  }, null, 2));
  securityHeaders(res);
  res.statusCode = errors.length ? 503 : 200;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Content-Length', String(payload.length));
  res.end(payload);
}

module.exports = async function systemsAtlasProxy(req, res) {
  const filePath = normalizeRequest(req);
  if (filePath === '__systems_atlas_verify') return verify(res);
  if (!filePath || !Object.hasOwn(PATHS, filePath)) {
    res.statusCode = 404;
    res.end('Not found');
    return;
  }
  return serve(filePath, res);
};

module.exports.handles = handles;
module.exports.constants = { SOURCE_COMMIT, RELEASE, VERIFY_SCHEMA, PATHS };
module.exports.validate = validate;

const crypto = require('node:crypto');
const { URL } = require('node:url');
const proxy = require('./proxy.js');

const WEB_SOURCE_COMMIT = 'c18f593a2eda274ea4deeb01ae95d92bdf80838d';
const HELIX_COMMIT = '83549cda4af3714304f202d0f4d35b29d28da9f7';
const WEB_RAW_ROOT = `https://raw.githubusercontent.com/GlacierEQ/job-application/${WEB_SOURCE_COMMIT}/site-v15/`;
const GITHUB_TREE_ROOT = `https://api.github.com/repos/GlacierEQ/job-application/git/trees/${WEB_SOURCE_COMMIT}`;
const COMPLETE_LINK = '<link rel="stylesheet" href="/assets/site.complete.css">';
const INTERACTION_LINK = '<link rel="stylesheet" href="/assets/site.interaction.css">';
const RELEASE = 'V21-FIRST-STAR-COMPLETE-WEB';
const EXPECTED_STATIC_HTML = 105;
const MAX_BYTES = 4 * 1024 * 1024;
const FETCH_TIMEOUT_MS = 12_000;

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.pdf': 'application/pdf',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
};

const REQUIRED_GIT_BLOBS = {
  'index.html': '4d927fb3bb0fa15debaf0c8554c0965bbcc994fd',
  'resume/index.html': '854b82f7ec491937ba27fadd749f69e9bb0532d4',
  'master/index.html': '36fc08c8b3915cc94323f3ee9aa9df5c91da56bd',
  'mesh/index.html': 'fa2406d1c0d4d198f69b1e94544e6c2c306611be',
  'machine/index.html': 'c24123649c301dd88b7d8116f916af508e46ff32',
  'assets/site.css': '27dbe7b99cd44f9c3c1f22c9d6870a2e02468fc0',
  'assets/site.systems.css': 'd2c7dc6f3e74a68b97e45bc166fec02b42517456',
  'assets/site.complete.css': 'd98c701e09f712e3558ea0bb5f48dd713e8c294b',
  'assets/site.interaction.css': '65fbd9c4bf7818cec997631f4cabde44e5123401',
  'data/current-proof.json': 'b05d5f88a10490df3bfbc0be4536c458b24bd332',
  'downloads/Casey_Barton_Resume.pdf': '90f03d4c2d4c7a2660c8396cd4291d0e78ca0f4a',
  'downloads/Casey_Barton_Resume.docx': '42d9e518b0a82a51b8c48de77dbbb28ffe6871c1',
};

let treePromise = null;

function gitBlobSha(body) {
  const header = Buffer.from(`blob ${body.length}\0`, 'utf8');
  return crypto.createHash('sha1').update(header).update(body).digest('hex');
}

function extension(filePath) {
  const match = filePath.match(/(\.[a-z0-9]+)$/i);
  return match ? match[1].toLowerCase() : '';
}

function securityHeaders(res) {
  res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'none'; style-src 'self'; img-src 'self' data:; connect-src 'none'; font-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'; form-action 'self' mailto:; upgrade-insecure-requests");
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=()');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  res.setHeader('X-GlacierEQ-Source-Commit', WEB_SOURCE_COMMIT);
  res.setHeader('X-GlacierEQ-Helix-Commit', HELIX_COMMIT);
  res.setHeader('X-PSYSOCX-Release', RELEASE);
}

function designHtml(body) {
  const buffer = Buffer.isBuffer(body) ? body : Buffer.from(body || '');
  let text = buffer.toString('utf8');
  if (!/<\/head>/i.test(text)) return buffer;
  if ((text.match(/\/assets\/site\.complete\.css/g) || []).length === 0) {
    text = text.replace(/<\/head>/i, `  ${COMPLETE_LINK}\n</head>`);
  }
  if ((text.match(/\/assets\/site\.interaction\.css/g) || []).length === 0) {
    text = text.replace(COMPLETE_LINK, `${COMPLETE_LINK}\n  ${INTERACTION_LINK}`);
  }
  return Buffer.from(text);
}

async function boundedBytes(url, maxBytes = MAX_BYTES) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      headers: { 'user-agent': 'GlacierEQ-Complete-Web/3.0' },
      signal: controller.signal,
      redirect: 'error',
    });
    const declared = Number(response.headers.get('content-length') || 0);
    if (declared > maxBytes) throw new Error('response_too_large');
    const body = Buffer.from(await response.arrayBuffer());
    if (body.length > maxBytes) throw new Error('response_too_large');
    return { response, body };
  } catch (error) {
    if (error?.name === 'AbortError') throw new Error('fetch_timeout');
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

async function webSource(filePath) {
  const resolved = new URL(filePath, WEB_RAW_ROOT);
  if (!resolved.href.startsWith(WEB_RAW_ROOT)) throw new Error('web_source_escape');
  return boundedBytes(resolved.href);
}

function captureProxy(rawPath) {
  return new Promise((resolve, reject) => {
    const headers = new Map();
    let settled = false;
    const res = {
      statusCode: 200,
      setHeader(name, value) { headers.set(String(name).toLowerCase(), value); },
      getHeader(name) { return headers.get(String(name).toLowerCase()); },
      end(chunk = '') {
        if (settled) return;
        settled = true;
        resolve({
          status: this.statusCode,
          headers,
          body: Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk)),
        });
      },
    };
    Promise.resolve(proxy({ url: `/?path=${encodeURIComponent(rawPath)}` }, res))
      .then(() => { if (!settled) reject(new Error(`proxy_route_did_not_end:${rawPath}`)); })
      .catch(reject);
  });
}

function verifyHtml(body, label) {
  const designed = designHtml(body);
  const text = designed.toString('utf8');
  if ((text.match(/<h1\b/gi) || []).length !== 1) throw new Error(`${label}:h1`);
  if (/<script\b/i.test(text)) throw new Error(`${label}:script`);
  if (/\sstyle\s*=\s*/i.test(text)) throw new Error(`${label}:inline_style`);
  if ((text.match(/\/assets\/site\.complete\.css/g) || []).length !== 1) throw new Error(`${label}:complete_css`);
  if ((text.match(/\/assets\/site\.interaction\.css/g) || []).length !== 1) throw new Error(`${label}:interaction_css`);
  if (!/<\/body>\s*<\/html>\s*$/i.test(text)) throw new Error(`${label}:unclosed_html`);
  return designed;
}

async function loadTree() {
  if (!treePromise) {
    treePromise = (async () => {
      const root = await boundedBytes(GITHUB_TREE_ROOT, 512 * 1024);
      if (!root.response.ok) throw new Error(`tree_http_${root.response.status}`);
      const rootJson = JSON.parse(root.body.toString('utf8'));
      const site = rootJson.tree?.find((entry) => entry.path === 'site-v15' && entry.type === 'tree');
      if (!site?.url) throw new Error('site_tree_missing');
      const recursive = new URL(site.url);
      recursive.searchParams.set('recursive', '1');
      const child = await boundedBytes(recursive.href);
      if (!child.response.ok) throw new Error(`site_tree_http_${child.response.status}`);
      const tree = JSON.parse(child.body.toString('utf8'));
      if (tree.truncated || !Array.isArray(tree.tree)) throw new Error('site_tree_incomplete');
      return tree.tree;
    })().catch((error) => { treePromise = null; throw error; });
  }
  return treePromise;
}

async function verifyStaticSurface() {
  const tree = await loadTree();
  const blobs = new Map(tree.filter((entry) => entry.type === 'blob').map((entry) => [entry.path, entry.sha]));
  const htmlFiles = tree.filter((entry) => entry.type === 'blob' && entry.path.endsWith('.html')).length;
  const mismatches = [];
  for (const [filePath, expected] of Object.entries(REQUIRED_GIT_BLOBS)) {
    const actual = blobs.get(filePath) || null;
    if (actual !== expected) mismatches.push({ path: filePath, actual, expected });
  }
  const missing = ['404.html', 'sitemap.xml', 'robots.txt', 'llms.txt'].filter((filePath) => !blobs.has(filePath));
  return {
    ok: htmlFiles === EXPECTED_STATIC_HTML && !mismatches.length && !missing.length,
    immutable_commit: WEB_SOURCE_COMMIT,
    html_files: htmlFiles,
    expected_html_files: EXPECTED_STATIC_HTML,
    total_files: blobs.size,
    mismatches,
    missing,
  };
}

async function verifyGeneratedSurface() {
  const projectionResponse = await captureProxy('data/company-atlas.json');
  if (projectionResponse.status !== 200) throw new Error('company_projection_route_failed');
  const projection = JSON.parse(projectionResponse.body.toString('utf8'));
  if (projection.company_count !== 49 || !Array.isArray(projection.companies)) throw new Error('company_projection_topology_drift');
  let htmlRoutes = 0;
  let recordRoutes = 0;
  for (const route of ['atlas/index.html', 'companies/index.html']) {
    const response = await captureProxy(route);
    if (response.status !== 200) throw new Error(`${route}:status_${response.status}`);
    verifyHtml(response.body, route);
    htmlRoutes += 1;
  }
  for (const company of projection.companies) {
    const slug = String(company.company_id).replaceAll('_', '-');
    for (const namespace of ['companies', 'atlas']) {
      const pagePath = `${namespace}/${slug}/index.html`;
      const page = await captureProxy(pagePath);
      if (page.status !== 200) throw new Error(`${pagePath}:status_${page.status}`);
      verifyHtml(page.body, pagePath);
      htmlRoutes += 1;
      const recordPath = `${namespace}/${slug}/record.json`;
      const record = await captureProxy(recordPath);
      if (record.status !== 200) throw new Error(`${recordPath}:status_${record.status}`);
      const parsed = JSON.parse(record.body.toString('utf8'));
      if (parsed.id !== company.company_id || parsed.source?.commit !== HELIX_COMMIT) throw new Error(`${recordPath}:identity_drift`);
      recordRoutes += 1;
    }
  }
  const fallback = await captureProxy('definitely-not-a-real-route/index.html');
  if (fallback.status !== 404) throw new Error('404_status_drift');
  verifyHtml(fallback.body, '404-fallback');
  const sitemap = await captureProxy('sitemap.xml');
  if (sitemap.status !== 200 || !sitemap.body.toString('utf8').includes('/companies/lockheed-martin/')) throw new Error('sitemap_drift');
  return {
    ok: true,
    company_tracks: projection.company_count,
    html_routes: htmlRoutes,
    record_routes: recordRoutes,
    aliases_per_company: 2,
    fallback_404: 'PASS',
    sitemap: 'PASS',
  };
}

async function verifyCanonicalV21() {
  const response = await captureProxy('__v21_verify');
  let payload = null;
  try { payload = JSON.parse(response.body.toString('utf8')); } catch {}
  return {
    ok: response.status === 200 && payload?.status === 'PASS' && payload?.schema === 'glaciereq.v21-production-verification.v1',
    status_code: response.status,
    schema: payload?.schema || null,
    status: payload?.status || null,
    source_commit: payload?.source_commit || null,
    helix_source_commit: payload?.helix_source_commit || null,
    company_routes: payload?.company_routes ?? null,
  };
}

async function verifyCurrentProof() {
  const result = await webSource('data/current-proof.json');
  if (!result.response.ok) return { ok: false };
  const proof = JSON.parse(result.body.toString('utf8'));
  const star = proof?.current_star;
  const ok = proof?.schema === 'glaciereq.current-proof.v1'
    && proof?.release === 'V21 First Star Completion'
    && star?.id === 'mission-agentic-ai-assurance'
    && star?.implementation?.commit === '4328fa7078e6e4125f895768142c6af0c5ec1234'
    && star?.implementation?.acceptance_tests === 17
    && star?.proof?.verification_state === 'REPRODUCED'
    && star?.proof?.receipt_id === 'b7a3e3cba968e19bb91ed8f6881b69e37efc97d7e8414be0aca431dff501123f'
    && star?.company_projection?.stage === 'CLAIM_PROMOTED'
    && star?.company_projection?.claim_ceiling === 'proof_bound_company_specific'
    && star?.company_projection?.helix_commit === HELIX_COMMIT;
  return { ok, proof };
}

async function verifyDesignRelease(res) {
  const errors = [];
  let canonical = null;
  let staticSurface = null;
  let generatedSurface = null;
  let current = null;
  try {
    [canonical, staticSurface, generatedSurface, current] = await Promise.all([
      verifyCanonicalV21(),
      verifyStaticSurface(),
      verifyGeneratedSurface(),
      verifyCurrentProof(),
    ]);
    if (!canonical.ok) errors.push('canonical_v21_failed');
    if (!staticSurface.ok) errors.push('static_surface_failed');
    if (!generatedSurface.ok) errors.push('generated_surface_failed');
    if (!current.ok) errors.push('current_proof_failed');
    for (const route of ['index.html', 'resume/index.html', 'master/index.html', 'mesh/index.html', 'machine/index.html']) {
      const source = await webSource(route);
      if (!source.response.ok) throw new Error(`${route}:source_${source.response.status}`);
      verifyHtml(source.body, route);
    }
  } catch (error) {
    errors.push(error instanceof Error ? error.message : 'design_verification_failed');
  }
  const pass = errors.length === 0;
  const payload = Buffer.from(JSON.stringify({
    schema: 'glaciereq.complete-web-production-verification.v3',
    status: pass ? 'PASS' : 'FAIL',
    release: RELEASE,
    source_commit: WEB_SOURCE_COMMIT,
    v21_proof_authority: HELIX_COMMIT,
    canonical_v21: canonical,
    static_surface: staticSurface,
    generated_surface: generatedSurface,
    current_star: current?.proof?.current_star?.id || null,
    proof_state: current?.proof?.current_star?.proof?.verification_state || null,
    company_stage: current?.proof?.current_star?.company_projection?.stage || null,
    errors,
    client_scripts: 0,
  }, null, 2));
  securityHeaders(res);
  res.statusCode = pass ? 200 : 503;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Content-Length', String(payload.length));
  res.end(payload);
}

function delegateDesigned(req, res) {
  const originalSetHeader = res.setHeader.bind(res);
  const originalEnd = res.end.bind(res);
  res.setHeader = (name, value) => {
    const lower = String(name).toLowerCase();
    if (lower === 'x-glaciereq-source-commit') value = WEB_SOURCE_COMMIT;
    if (lower === 'x-psysocx-release') value = RELEASE;
    return originalSetHeader(name, value);
  };
  res.end = (body, ...args) => {
    const type = String(res.getHeader('Content-Type') || '');
    let output = Buffer.isBuffer(body) ? body : Buffer.from(body || '');
    if (type.startsWith('text/html')) output = designHtml(output);
    originalSetHeader('X-GlacierEQ-Source-Commit', WEB_SOURCE_COMMIT);
    originalSetHeader('X-GlacierEQ-Helix-Commit', HELIX_COMMIT);
    originalSetHeader('X-PSYSOCX-Release', RELEASE);
    originalSetHeader('Content-Length', String(output.length));
    return originalEnd(output, ...args);
  };
  return proxy(req, res);
}

async function serveWebSource(filePath, res) {
  let upstream = await webSource(filePath);
  let status = upstream.response.status;
  if (!upstream.response.ok) {
    upstream = await webSource('404.html');
    status = 404;
  }
  let body = upstream.body;
  if (extension(filePath) === '.html' || status === 404) body = designHtml(body);
  securityHeaders(res);
  res.statusCode = status;
  res.setHeader('Content-Type', TYPES[extension(status === 404 ? '404.html' : filePath)] || 'application/octet-stream');
  res.setHeader('Cache-Control', filePath.startsWith('data/') || filePath.endsWith('.json') ? 'public, max-age=0, s-maxage=300, must-revalidate' : 'public, max-age=0, s-maxage=900, must-revalidate');
  if (filePath.startsWith('downloads/')) res.setHeader('Content-Disposition', `attachment; filename="${filePath.split('/').pop()}"`);
  res.setHeader('Content-Length', String(body.length));
  res.end(body);
}

module.exports = async function designProxy(req, res) {
  const rawPath = proxy.requestPath(req);
  if (rawPath === '__v21_verify') return proxy(req, res);
  if (rawPath === '__design_verify') return verifyDesignRelease(res);
  const filePath = proxy.normalize(rawPath);
  if (!filePath) {
    securityHeaders(res);
    res.statusCode = 400;
    res.end('Invalid path');
    return;
  }
  if (proxy.needsProjection(filePath) && filePath !== 'llms.txt') return delegateDesigned(req, res);
  return serveWebSource(filePath, res);
};

module.exports.constants = { WEB_SOURCE_COMMIT, HELIX_COMMIT, RELEASE, EXPECTED_STATIC_HTML };
module.exports.gitBlobSha = gitBlobSha;
module.exports.designHtml = designHtml;
module.exports.boundedBytes = boundedBytes;
module.exports.verifyStaticSurface = verifyStaticSurface;
module.exports.verifyGeneratedSurface = verifyGeneratedSurface;
module.exports.verifyCanonicalV21 = verifyCanonicalV21;

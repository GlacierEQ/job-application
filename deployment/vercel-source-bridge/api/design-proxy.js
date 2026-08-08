const crypto = require('crypto');
const { URL } = require('node:url');

const WEB_SOURCE_COMMIT = 'c18f593a2eda274ea4deeb01ae95d92bdf80838d';
const LEGACY_SOURCE_COMMIT = 'c5701dedc834359c78399b4370a8147501784d19';
const HELIX_COMMIT = '83549cda4af3714304f202d0f4d35b29d28da9f7';
const LEGACY_RAW_ROOT = `https://raw.githubusercontent.com/GlacierEQ/job-application/${LEGACY_SOURCE_COMMIT}/site-v15/`;
const WEB_RAW_ROOT = `https://raw.githubusercontent.com/GlacierEQ/job-application/${WEB_SOURCE_COMMIT}/site-v15/`;
const GITHUB_TREE_ROOT = `https://api.github.com/repos/GlacierEQ/job-application/git/trees/${WEB_SOURCE_COMMIT}`;
const COMPLETE_LINK = '<link rel="stylesheet" href="/assets/site.complete.css">';
const INTERACTION_LINK = '<link rel="stylesheet" href="/assets/site.interaction.css">';
const RELEASE = 'V21-FIRST-STAR-COMPLETE-WEB';
const EXPECTED_STATIC_HTML = 105;
const MAX_JSON_BYTES = 4 * 1024 * 1024;
const MAX_DYNAMIC_HTML_BYTES = 768 * 1024;
const FETCH_TIMEOUT_MS = 12_000;

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

const nativeFetch = global.fetch.bind(global);
let surfaceTreePromise = null;

function sourceRewrite(input) {
  const value = typeof input === 'string' || input instanceof URL ? String(input) : input?.url;
  if (!value || !value.startsWith(LEGACY_RAW_ROOT)) return null;
  return `${WEB_RAW_ROOT}${value.slice(LEGACY_RAW_ROOT.length)}`;
}

global.fetch = async (input, init) => {
  const rewritten = sourceRewrite(input);
  if (!rewritten) return nativeFetch(input, init);
  if (typeof Request !== 'undefined' && input instanceof Request) {
    return nativeFetch(new Request(rewritten, input), init);
  }
  return nativeFetch(rewritten, init);
};

const proxy = require('./proxy.js');

function gitBlobSha(body) {
  const header = Buffer.from(`blob ${body.length}\0`, 'utf8');
  return crypto.createHash('sha1').update(Buffer.concat([header, body])).digest('hex');
}

function designHtml(body) {
  const buffer = Buffer.isBuffer(body) ? body : Buffer.from(body || '');
  let text = buffer.toString('utf8');
  if (!/<\/head>/i.test(text)) return buffer;

  const completeCount = (text.match(/\/assets\/site\.complete\.css/g) || []).length;
  const interactionCount = (text.match(/\/assets\/site\.interaction\.css/g) || []).length;
  if (completeCount > 1 || interactionCount > 1) return buffer;

  if (completeCount === 0) {
    text = text.replace(/<\/head>/i, `  ${COMPLETE_LINK}\n</head>`);
  }
  if (interactionCount === 0) {
    text = text.replace(COMPLETE_LINK, `${COMPLETE_LINK}\n  ${INTERACTION_LINK}`);
  }
  return Buffer.from(text);
}

async function boundedBytes(url, maxBytes = MAX_JSON_BYTES) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const response = await nativeFetch(url, {
      headers: {
        accept: 'application/vnd.github+json, application/json;q=0.9, */*;q=0.1',
        'user-agent': 'GlacierEQ-Complete-Web-Verifier/2.0',
      },
      signal: controller.signal,
      redirect: 'error',
    });
    const declared = Number(response.headers.get('content-length') || 0);
    if (declared > maxBytes) throw new Error('verification_response_too_large');
    if (!response.body) {
      const body = Buffer.from(await response.arrayBuffer());
      if (body.length > maxBytes) throw new Error('verification_response_too_large');
      return { response, body };
    }
    const reader = response.body.getReader();
    const chunks = [];
    let length = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      length += value.byteLength;
      if (length > maxBytes) {
        await reader.cancel();
        throw new Error('verification_response_too_large');
      }
      chunks.push(Buffer.from(value));
    }
    return { response, body: Buffer.concat(chunks, length) };
  } catch (error) {
    if (error?.name === 'AbortError') throw new Error('verification_fetch_timeout');
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

async function boundedJson(url, maxBytes = MAX_JSON_BYTES) {
  const { response, body } = await boundedBytes(url, maxBytes);
  if (!response.ok) throw new Error(`verification_http_${response.status}`);
  try {
    return JSON.parse(body.toString('utf8'));
  } catch {
    throw new Error('verification_invalid_json');
  }
}

async function loadStaticSurfaceTree() {
  if (!surfaceTreePromise) {
    surfaceTreePromise = (async () => {
      const root = await boundedJson(GITHUB_TREE_ROOT, 512 * 1024);
      const site = Array.isArray(root.tree)
        ? root.tree.find((entry) => entry.path === 'site-v15' && entry.type === 'tree')
        : null;
      if (!site?.url) throw new Error('site_v15_tree_missing');
      const recursive = new URL(site.url);
      recursive.searchParams.set('recursive', '1');
      const tree = await boundedJson(recursive.href, MAX_JSON_BYTES);
      if (tree.truncated === true || !Array.isArray(tree.tree)) throw new Error('site_v15_tree_incomplete');
      return tree.tree;
    })().catch((error) => {
      surfaceTreePromise = null;
      throw error;
    });
  }
  return surfaceTreePromise;
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
        const body = Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk));
        resolve({ status: this.statusCode, headers, body });
      },
    };
    Promise.resolve(proxy({ url: `/?path=${encodeURIComponent(rawPath)}` }, res))
      .then(() => {
        if (!settled) reject(new Error(`proxy_route_did_not_end:${rawPath}`));
      })
      .catch(reject);
  });
}

function verifyHtmlBuffer(body, label) {
  const designed = designHtml(body);
  if (designed.length > MAX_DYNAMIC_HTML_BYTES) throw new Error(`${label}:html_too_large`);
  const text = designed.toString('utf8');
  if ((text.match(/<h1\b/gi) || []).length !== 1) throw new Error(`${label}:h1_contract`);
  if (/<script\b/i.test(text)) throw new Error(`${label}:script_detected`);
  if (/\sstyle\s*=\s*/i.test(text)) throw new Error(`${label}:inline_style_detected`);
  if ((text.match(/\/assets\/site\.complete\.css/g) || []).length !== 1) throw new Error(`${label}:complete_design_contract`);
  if ((text.match(/\/assets\/site\.interaction\.css/g) || []).length !== 1) throw new Error(`${label}:interaction_contract`);
  if (!/<\/body>\s*<\/html>\s*$/i.test(text)) throw new Error(`${label}:html_not_closed`);
  return designed.length;
}

async function verifyStaticSurface() {
  const tree = await loadStaticSurfaceTree();
  const blobs = new Map(tree.filter((entry) => entry.type === 'blob').map((entry) => [entry.path, entry.sha]));
  const html = tree.filter((entry) => entry.type === 'blob' && entry.path.endsWith('.html'));
  const mismatches = [];
  for (const [filePath, expected] of Object.entries(REQUIRED_GIT_BLOBS)) {
    const actual = blobs.get(filePath) || null;
    if (actual !== expected) mismatches.push({ path: filePath, actual, expected });
  }
  const requiredDiscovery = ['404.html', 'sitemap.xml', 'robots.txt', 'llms.txt'];
  const missing = requiredDiscovery.filter((filePath) => !blobs.has(filePath));
  const ok = html.length === EXPECTED_STATIC_HTML && !mismatches.length && !missing.length;
  return {
    ok,
    immutable_commit: WEB_SOURCE_COMMIT,
    html_files: html.length,
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
    verifyHtmlBuffer(response.body, route);
    htmlRoutes += 1;
  }

  for (const company of projection.companies) {
    const slug = String(company.company_id).replaceAll('_', '-');
    for (const namespace of ['companies', 'atlas']) {
      const pagePath = `${namespace}/${slug}/index.html`;
      const page = await captureProxy(pagePath);
      if (page.status !== 200) throw new Error(`${pagePath}:status_${page.status}`);
      verifyHtmlBuffer(page.body, pagePath);
      htmlRoutes += 1;

      const recordPath = `${namespace}/${slug}/record.json`;
      const record = await captureProxy(recordPath);
      if (record.status !== 200) throw new Error(`${recordPath}:status_${record.status}`);
      const parsed = JSON.parse(record.body.toString('utf8'));
      if (parsed.id !== company.company_id || parsed.source?.commit !== HELIX_COMMIT) {
        throw new Error(`${recordPath}:identity_drift`);
      }
      recordRoutes += 1;
    }
  }

  const notFound = await captureProxy('definitely-not-a-real-route/index.html');
  if (notFound.status !== 404) throw new Error('404_status_drift');
  verifyHtmlBuffer(notFound.body, '404-fallback');

  const sitemap = await captureProxy('sitemap.xml');
  const sitemapText = sitemap.body.toString('utf8');
  if (sitemap.status !== 200 || !sitemapText.includes('/atlas/') || !sitemapText.includes('/companies/lockheed-martin/')) {
    throw new Error('sitemap_projection_drift');
  }

  const llms = await captureProxy('llms.txt');
  const llmsText = llms.body.toString('utf8');
  if (llms.status !== 200 || !llmsText.includes('/data/current-proof.json') || !llmsText.includes('/atlas/')) {
    throw new Error('llms_projection_drift');
  }

  return {
    ok: true,
    company_tracks: projection.company_count,
    html_routes: htmlRoutes,
    record_routes: recordRoutes,
    aliases_per_company: 2,
    fallback_404: 'PASS',
    sitemap: 'PASS',
    llms: 'PASS',
  };
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

async function verifyWebRelease(res) {
  let staticSurface = null;
  let generatedSurface = null;
  let proof = null;
  const errors = [];

  try {
    [staticSurface, generatedSurface] = await Promise.all([
      verifyStaticSurface(),
      verifyGeneratedSurface(),
    ]);
    if (!staticSurface.ok) errors.push('static_surface_failed');
  } catch (error) {
    errors.push(error instanceof Error ? error.message : 'surface_verification_failed');
  }

  try {
    const { response, body } = await boundedBytes(`${WEB_RAW_ROOT}data/current-proof.json`, 128 * 1024);
    if (!response.ok) throw new Error(`current_proof_http_${response.status}`);
    proof = JSON.parse(body.toString('utf8'));
    const star = proof?.current_star;
    const proofOk = proof?.schema === 'glaciereq.current-proof.v1'
      && proof?.release === 'V21 First Star Completion'
      && star?.id === 'mission-agentic-ai-assurance'
      && star?.implementation?.commit === '4328fa7078e6e4125f895768142c6af0c5ec1234'
      && star?.implementation?.acceptance_tests === 17
      && star?.proof?.verification_state === 'REPRODUCED'
      && star?.proof?.receipt_id === 'b7a3e3cba968e19bb91ed8f6881b69e37efc97d7e8414be0aca431dff501123f'
      && star?.company_projection?.stage === 'CLAIM_PROMOTED'
      && star?.company_projection?.claim_ceiling === 'proof_bound_company_specific'
      && star?.company_projection?.helix_commit === HELIX_COMMIT;
    if (!proofOk) errors.push('current_proof_contract_failed');
  } catch (error) {
    errors.push(error instanceof Error ? error.message : 'current_proof_verification_failed');
  }

  const pass = errors.length === 0 && staticSurface?.ok === true && generatedSurface?.ok === true;
  const payload = Buffer.from(JSON.stringify({
    schema: 'glaciereq.complete-web-production-verification.v2',
    status: pass ? 'PASS' : 'FAIL',
    release: RELEASE,
    source_repository: 'GlacierEQ/job-application',
    source_commit: WEB_SOURCE_COMMIT,
    helix_repository: 'GlacierEQ/job-app-helix',
    helix_commit: HELIX_COMMIT,
    complete_design: true,
    client_scripts: 0,
    static_surface: staticSurface,
    generated_surface: generatedSurface,
    current_star: proof?.current_star?.id || null,
    proof_state: proof?.current_star?.proof?.verification_state || null,
    company_stage: proof?.current_star?.company_projection?.stage || null,
    claim_ceiling: proof?.current_star?.company_projection?.claim_ceiling || null,
    errors,
  }, null, 2));

  securityHeaders(res);
  res.statusCode = pass ? 200 : 503;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Content-Length', String(payload.length));
  res.end(payload);
}

module.exports = async (req, res) => {
  const rawPath = proxy.requestPath(req);
  if (rawPath === '__v21_verify') return proxy(req, res);
  if (rawPath === '__design_verify') {
    await verifyWebRelease(res);
    return;
  }

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

  await proxy(req, res);
};

module.exports.constants = { WEB_SOURCE_COMMIT, HELIX_COMMIT, RELEASE, EXPECTED_STATIC_HTML };
module.exports.gitBlobSha = gitBlobSha;
module.exports.designHtml = designHtml;
module.exports.boundedBytes = boundedBytes;
module.exports.verifyStaticSurface = verifyStaticSurface;
module.exports.verifyGeneratedSurface = verifyGeneratedSurface;

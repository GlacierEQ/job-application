const crypto = require('node:crypto');
const proxy = require('./proxy.js');
const truthRuntime = require('./truth-runtime.js');

const TYPOGRAPHY_SOURCE_COMMIT = 'b4a1d9ccd8749b29129a09881d0bd183337b1a41';
const TYPOGRAPHY_CSS_PATH = 'site-v15/assets/site.algerian.css';
const TYPOGRAPHY_CSS_BLOB = 'f9b29ee4b2fd3b82a30c1e10c23102f35fc62467';
const TYPOGRAPHY_RAW_URL = `https://raw.githubusercontent.com/GlacierEQ/job-application/${TYPOGRAPHY_SOURCE_COMMIT}/${TYPOGRAPHY_CSS_PATH}`;
const TYPOGRAPHY_LINK = '<link rel="stylesheet" href="/assets/site.algerian.css">';
const RELEASE = 'V24-ALGERIAN-DISPLAY';
const VERIFY_SCHEMA = 'glaciereq.v24-algerian-display-verification.v1';
const FETCH_TIMEOUT_MS = 12_000;
const MAX_CSS_BYTES = 64 * 1024;

let cssPromise = null;

function gitBlobSha(body) {
  const bytes = Buffer.isBuffer(body) ? body : Buffer.from(body || '');
  const header = Buffer.from(`blob ${bytes.length}\0`, 'utf8');
  return crypto.createHash('sha1').update(header).update(bytes).digest('hex');
}

async function loadTypographyCss() {
  if (!cssPromise) {
    cssPromise = (async () => {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
      try {
        const response = await fetch(TYPOGRAPHY_RAW_URL, {
          headers: { 'user-agent': 'GlacierEQ-Algerian-Display/1.0' },
          signal: controller.signal,
          redirect: 'error',
        });
        if (!response.ok) throw new Error(`typography_css_http_${response.status}`);
        const declared = Number(response.headers.get('content-length') || 0);
        if (declared > MAX_CSS_BYTES) throw new Error('typography_css_too_large');
        const body = Buffer.from(await response.arrayBuffer());
        if (body.length > MAX_CSS_BYTES) throw new Error('typography_css_too_large');
        if (gitBlobSha(body) !== TYPOGRAPHY_CSS_BLOB) throw new Error('typography_css_blob_mismatch');
        const text = body.toString('utf8');
        if (!text.includes('"Algerian"')) throw new Error('algerian_font_contract_missing');
        if (/@font-face\b/i.test(text)) throw new Error('bundled_font_face_forbidden');
        return body;
      } catch (error) {
        if (error?.name === 'AbortError') throw new Error('typography_css_fetch_timeout');
        throw error;
      } finally {
        clearTimeout(timer);
      }
    })().catch((error) => {
      cssPromise = null;
      throw error;
    });
  }
  return cssPromise;
}

function captureTruth(req) {
  return new Promise((resolve, reject) => {
    const headers = new Map();
    let settled = false;
    const res = {
      statusCode: 200,
      setHeader(name, value) {
        headers.set(String(name).toLowerCase(), value);
      },
      getHeader(name) {
        return headers.get(String(name).toLowerCase());
      },
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
    Promise.resolve(truthRuntime(req, res))
      .then(() => {
        if (!settled) reject(new Error('truth_runtime_did_not_end'));
      })
      .catch(reject);
  });
}

function injectTypography(body) {
  const bytes = Buffer.isBuffer(body) ? body : Buffer.from(body || '');
  let text = bytes.toString('utf8');
  if (!/<\/head>/i.test(text)) return bytes;
  const matches = text.match(/\/assets\/site\.algerian\.css/g) || [];
  if (matches.length > 1) throw new Error('duplicate_algerian_stylesheet');
  if (matches.length === 1) return bytes;
  const interaction = '<link rel="stylesheet" href="/assets/site.interaction.css">';
  if (text.includes(interaction)) {
    text = text.replace(interaction, `${interaction}\n  ${TYPOGRAPHY_LINK}`);
  } else {
    text = text.replace(/<\/head>/i, `  ${TYPOGRAPHY_LINK}\n</head>`);
  }
  return Buffer.from(text);
}

function applyReleaseHeaders(res) {
  res.setHeader('X-GlacierEQ-Typography-Source-Commit', TYPOGRAPHY_SOURCE_COMMIT);
  res.setHeader('X-PSYSOCX-Release', RELEASE);
}

function replayHeaders(headers, res) {
  for (const [name, value] of headers) {
    if (name === 'content-length' || name === 'x-psysocx-release') continue;
    res.setHeader(name, value);
  }
  applyReleaseHeaders(res);
}

async function serveTypographyCss(res) {
  const body = await loadTypographyCss();
  applyReleaseHeaders(res);
  res.statusCode = 200;
  res.setHeader('Content-Type', 'text/css; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=900, must-revalidate');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Content-Length', String(body.length));
  res.end(body);
}

async function verifyTypography(res) {
  const errors = [];
  let v23 = null;
  let css = null;
  let homepage = null;
  try {
    const [v23Response, cssBody, homeResponse] = await Promise.all([
      captureTruth({ url: '/?path=__v23_verify' }),
      loadTypographyCss(),
      captureTruth({ url: '/?path=index.html' }),
    ]);
    try { v23 = JSON.parse(v23Response.body.toString('utf8')); } catch {}
    if (
      v23Response.status !== 200
      || v23?.status !== 'PASS'
      || v23?.schema !== 'glaciereq.v23-truth-sync-verification.v1'
    ) {
      errors.push('v23_truth_verifier_failed');
    }
    const cssText = cssBody.toString('utf8');
    css = {
      blob_sha: gitBlobSha(cssBody),
      bytes: cssBody.length,
      algerian_declared: cssText.includes('"Algerian"'),
      copperplate_fallback: cssText.includes('"Copperplate"'),
      engraved_depth: cssText.includes('-webkit-text-stroke') && cssText.includes('text-shadow'),
      bundled_font_face: /@font-face\b/i.test(cssText),
    };
    const designed = injectTypography(homeResponse.body).toString('utf8');
    homepage = {
      status: homeResponse.status,
      stylesheet_count: (designed.match(/\/assets\/site\.algerian\.css/g) || []).length,
      script_free: !/<script\b/i.test(designed),
      current_truth_marker_present: designed.includes('67') && designed.includes('PARTIALLY_VERIFIED'),
    };
    if (
      homepage.status !== 200
      || homepage.stylesheet_count !== 1
      || !homepage.script_free
      || !homepage.current_truth_marker_present
      || !css.copperplate_fallback
      || !css.engraved_depth
    ) {
      errors.push('homepage_typography_contract_failed');
    }
  } catch (error) {
    errors.push(error instanceof Error ? error.message : 'typography_verification_failed');
  }

  const pass = errors.length === 0;
  const payload = Buffer.from(JSON.stringify({
    schema: VERIFY_SCHEMA,
    status: pass ? 'PASS' : 'FAIL',
    release: RELEASE,
    typography_source_commit: TYPOGRAPHY_SOURCE_COMMIT,
    typography_css_blob: TYPOGRAPHY_CSS_BLOB,
    inherited_v23: v23 ? { schema: v23.schema, status: v23.status } : null,
    css,
    homepage,
    truth_boundary: {
      presentation_only: true,
      proprietary_font_binary_bundled: false,
      historical_proof_authorities_modified: false,
      v23_truth_sync_preserved: true,
    },
    errors,
  }, null, 2));
  applyReleaseHeaders(res);
  res.statusCode = pass ? 200 : 503;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Content-Length', String(payload.length));
  res.end(payload);
}

module.exports = async function typographyProxy(req, res) {
  const rawPath = proxy.requestPath(req);
  if (rawPath === '__v24_verify') return verifyTypography(res);
  const filePath = proxy.normalize(rawPath);
  if (!filePath) return truthRuntime(req, res);
  if (filePath === 'assets/site.algerian.css') return serveTypographyCss(res);

  const captured = await captureTruth(req);
  replayHeaders(captured.headers, res);
  res.statusCode = captured.status;
  let body = captured.body;
  const type = String(captured.headers.get('content-type') || '');
  if (type.startsWith('text/html')) body = injectTypography(body);
  res.setHeader('Content-Length', String(body.length));
  res.end(body);
};

module.exports.constants = {
  TYPOGRAPHY_SOURCE_COMMIT,
  TYPOGRAPHY_CSS_PATH,
  TYPOGRAPHY_CSS_BLOB,
  TYPOGRAPHY_LINK,
  RELEASE,
  VERIFY_SCHEMA,
};
module.exports.gitBlobSha = gitBlobSha;
module.exports.injectTypography = injectTypography;
module.exports.loadTypographyCss = loadTypographyCss;

const crypto = require('node:crypto');
const compilerProxy = require('./compiler-proxy.js');
const proxy = require('./proxy.js');

const RELEASE = 'V26-TRUE-ALGERIAN-TITLE';
const VERIFY_SCHEMA = 'glaciereq.v26-title-font-verification.v1';
const FONT_SOURCE = 'Fontsource Rye 5.3.0 · OFL-1.1';
const FONT_URL = 'https://cdn.jsdelivr.net/fontsource/fonts/rye@5.3.0/latin-400-normal.woff2';
const FONT_PATH = 'assets/title-algerian.woff2';
const CSS_PATH = 'assets/site.title-font.css';
const CSS_LINK = '<link rel="stylesheet" href="/assets/site.title-font.css">';
const FETCH_TIMEOUT_MS = 10_000;
const MAX_FONT_BYTES = 128 * 1024;

let fontPromise = null;

const TITLE_FONT_CSS = `
@font-face {
  font-family: "Glacier Algerian Title";
  font-style: normal;
  font-display: swap;
  font-weight: 400;
  src: url("/assets/title-algerian.woff2") format("woff2");
  unicode-range: U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD;
}

:where(h1,.brand strong) {
  font-family: "Glacier Algerian Title", "Algerian", "Copperplate", "Copperplate Gothic Bold", serif;
  font-weight: 400;
  font-synthesis: none;
  letter-spacing: .014em;
  -webkit-text-stroke: 0;
  text-rendering: geometricPrecision;
  text-shadow:
    0 1px 0 rgba(231,255,244,.14),
    0 3px 0 rgba(0,0,0,.72),
    0 14px 38px rgba(43,229,162,.10);
}

.hero-v21 h1,
.page-hero h1,
.compiler-hero h1 {
  letter-spacing: .008em;
}

.brand strong {
  letter-spacing: .055em;
}

@media (max-width: 640px) {
  :where(h1,.brand strong) {
    letter-spacing: .008em;
    text-shadow:
      0 1px 0 rgba(231,255,244,.10),
      0 2px 0 rgba(0,0,0,.62),
      0 8px 24px rgba(43,229,162,.07);
  }
  .brand strong { letter-spacing: .04em; }
}

@media print {
  :where(h1,.brand strong) {
    font-family: Georgia, "Times New Roman", serif;
    font-weight: 700;
    text-shadow: none;
  }
}
`;

function sha256(body) {
  return crypto.createHash('sha256').update(body).digest('hex');
}

function requireValue(condition, message) {
  if (!condition) throw new Error(message);
}

async function loadFont() {
  if (!fontPromise) {
    fontPromise = (async () => {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
      try {
        const response = await fetch(FONT_URL, {
          headers: { 'user-agent': 'GlacierEQ-V26-Title-Font/1.0' },
          signal: controller.signal,
          redirect: 'error',
        });
        requireValue(response.ok, `title_font_http_${response.status}`);
        const declared = Number(response.headers.get('content-length') || 0);
        requireValue(!declared || declared <= MAX_FONT_BYTES, 'title_font_declared_too_large');
        const body = Buffer.from(await response.arrayBuffer());
        requireValue(body.length > 1024 && body.length <= MAX_FONT_BYTES, 'title_font_size_invalid');
        requireValue(body.subarray(0, 4).toString('ascii') === 'wOF2', 'title_font_not_woff2');
        return Object.freeze({ body, sha256: sha256(body) });
      } catch (error) {
        if (error?.name === 'AbortError') throw new Error('title_font_fetch_timeout');
        throw error;
      } finally {
        clearTimeout(timer);
      }
    })().catch((error) => {
      fontPromise = null;
      throw error;
    });
  }
  return fontPromise;
}

function capture(handler, req) {
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
    Promise.resolve(handler(req, res))
      .then(() => { if (!settled) reject(new Error('title_font_capture_did_not_end')); })
      .catch(reject);
  });
}

function injectTitleFont(body) {
  const bytes = Buffer.isBuffer(body) ? body : Buffer.from(body || '');
  let text = bytes.toString('utf8');
  if (!/<\/head>/i.test(text)) return bytes;
  const matches = text.match(/\/assets\/site\.title-font\.css/g) || [];
  if (matches.length > 1) throw new Error('duplicate_title_font_stylesheet');
  if (matches.length === 1) return bytes;
  const algerian = '<link rel="stylesheet" href="/assets/site.algerian.css">';
  if (text.includes(algerian)) {
    text = text.replace(algerian, `${algerian}\n  ${CSS_LINK}`);
  } else {
    text = text.replace(/<\/head>/i, `  ${CSS_LINK}\n</head>`);
  }
  return Buffer.from(text);
}

function applyReleaseHeaders(res) {
  res.setHeader('X-PSYSOCX-Title-Release', RELEASE);
  res.setHeader('X-GlacierEQ-Title-Font-Source', 'fontsource-rye-5.3.0');
}

function replayHeaders(headers, res) {
  for (const [name, value] of headers) {
    if (name === 'content-length' || name === 'x-psysocx-title-release') continue;
    res.setHeader(name, value);
  }
  applyReleaseHeaders(res);
}

function serveCss(res) {
  const body = Buffer.from(TITLE_FONT_CSS);
  applyReleaseHeaders(res);
  res.statusCode = 200;
  res.setHeader('Content-Type', 'text/css; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=900, must-revalidate');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Content-Length', String(body.length));
  res.end(body);
}

async function serveFont(res) {
  const font = await loadFont();
  applyReleaseHeaders(res);
  res.statusCode = 200;
  res.setHeader('Content-Type', 'font/woff2');
  res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-GlacierEQ-Title-Font-SHA256', font.sha256);
  res.setHeader('Content-Length', String(font.body.length));
  res.end(font.body);
}

async function verifyV26(res) {
  const errors = [];
  let inherited = null;
  let font = null;
  let homepage = null;
  try {
    const [v25Response, fontResult, homeResponse] = await Promise.all([
      capture(compilerProxy, { url: '/?path=__v25_verify' }),
      loadFont(),
      capture(compilerProxy, { url: '/?path=index.html' }),
    ]);
    try { inherited = JSON.parse(v25Response.body.toString('utf8')); } catch {}
    if (v25Response.status !== 200 || inherited?.status !== 'PASS') errors.push('v25_inheritance_failed');
    font = {
      source: FONT_SOURCE,
      sha256: fontResult.sha256,
      bytes: fontResult.body.length,
      woff2_signature: fontResult.body.subarray(0, 4).toString('ascii') === 'wOF2',
    };
    const html = injectTitleFont(homeResponse.body).toString('utf8');
    const algerianIndex = html.indexOf('/assets/site.algerian.css');
    const titleIndex = html.indexOf('/assets/site.title-font.css');
    homepage = {
      status: homeResponse.status,
      stylesheet_count: (html.match(/\/assets\/site\.title-font\.css/g) || []).length,
      algerian_precedes_title_layer: algerianIndex !== -1 && titleIndex !== -1 && algerianIndex < titleIndex,
      script_free: !/<script\b/i.test(html),
    };
    if (!font.woff2_signature) errors.push('title_font_signature_failed');
    if (homepage.status !== 200 || homepage.stylesheet_count !== 1 || !homepage.algerian_precedes_title_layer || !homepage.script_free) {
      errors.push('title_font_homepage_contract_failed');
    }
  } catch (error) {
    errors.push(error instanceof Error ? error.message : 'v26_verification_failed');
  }

  const pass = errors.length === 0;
  const body = Buffer.from(JSON.stringify({
    schema: VERIFY_SCHEMA,
    status: pass ? 'PASS' : 'FAIL',
    release: RELEASE,
    inherited_v25: inherited ? { schema: inherited.schema, status: inherited.status } : null,
    font,
    homepage,
    title_scope: ['h1', 'brand strong'],
    browser_font_origin: 'self',
    client_scripts_added: 0,
    truth_boundary: {
      typography_only: true,
      body_typography_modified: false,
      historical_proof_authorities_modified: false,
      external_browser_font_origin_added: false,
    },
    errors,
  }, null, 2));
  applyReleaseHeaders(res);
  res.statusCode = pass ? 200 : 503;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Content-Length', String(body.length));
  res.end(body);
}

module.exports = async function titleFontProxy(req, res) {
  const rawPath = proxy.requestPath(req);
  if (rawPath === '__v26_verify') return verifyV26(res);
  const filePath = proxy.normalize(rawPath);
  if (!filePath) return compilerProxy(req, res);
  if (filePath === CSS_PATH) return serveCss(res);
  if (filePath === FONT_PATH) return serveFont(res);

  const captured = await capture(compilerProxy, req);
  replayHeaders(captured.headers, res);
  res.statusCode = captured.status;
  let body = captured.body;
  const type = String(captured.headers.get('content-type') || '');
  if (type.startsWith('text/html')) body = injectTitleFont(body);
  res.setHeader('Content-Length', String(body.length));
  res.end(body);
};

module.exports.constants = {
  RELEASE,
  VERIFY_SCHEMA,
  FONT_SOURCE,
  FONT_URL,
  FONT_PATH,
  CSS_PATH,
  CSS_LINK,
};
module.exports.TITLE_FONT_CSS = TITLE_FONT_CSS;
module.exports.injectTitleFont = injectTitleFont;
module.exports.loadFont = loadFont;
module.exports.sha256 = sha256;
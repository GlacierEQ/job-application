const crypto = require('node:crypto');
const compilerProxy = require('./compiler-proxy.js');
const titleFontProxy = require('./title-font-proxy.js');
const proxy = require('./proxy.js');

const RELEASE = 'V27-ALGERIAN-MONUMENT';
const VERIFY_SCHEMA = 'glaciereq.v27-monument-title-verification.v1';
const FONT_SOURCE = 'Fontsource Ewert 5.3.0 · OFL-1.1';
const FONT_URL = 'https://cdn.jsdelivr.net/fontsource/fonts/ewert@5.3.0/latin-400-normal.woff2';
const FONT_PATH = 'assets/title-monument.woff2';
const CSS_PATH = 'assets/site.title-monument.css';
const CSS_LINK = '<link rel="stylesheet" href="/assets/site.title-monument.css">';
const FETCH_TIMEOUT_MS = 10_000;
const MAX_FONT_BYTES = 128 * 1024;
const EXPECTED_FONT_SHA256 = '2a98066e14efc2176ee1ba818ea565e77409b81a9a909e1b53b286307a2e70fb';

let fontPromise = null;

const MONUMENT_CSS = `
@font-face {
  font-family: "Glacier Algerian Monument";
  font-style: normal;
  font-display: swap;
  font-weight: 400;
  src: url("/assets/title-monument.woff2") format("woff2");
  unicode-range: U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD;
}

:where(h1,.brand strong) {
  font-family: "Glacier Algerian Monument", "Algerian", "Copperplate", "Copperplate Gothic Bold", serif;
  font-weight: 400;
  font-synthesis: none;
  text-rendering: geometricPrecision;
  letter-spacing: .022em;
  -webkit-text-stroke: .18px rgba(224,255,244,.20);
  text-shadow:
    0 1px 0 rgba(237,255,248,.20),
    0 2px 0 rgba(13,35,27,.92),
    0 3px 0 rgba(0,0,0,.76),
    0 10px 28px rgba(27,255,162,.11),
    0 24px 64px rgba(0,168,112,.08);
}

.hero-v21 h1,
.page-hero h1,
.compiler-hero h1 {
  letter-spacing: .016em;
  line-height: .98;
}

.hero-v21 h1 em,
.page-hero h1 em,
.compiler-hero h1 em {
  font: inherit;
  color: inherit;
}

.brand strong {
  letter-spacing: .075em;
}

.master-card h1,
.master-card h2,
.master-card h3,
h2,h3,h4,h5,h6 {
  /* Preserve V24's more restrained Algerian/Copperplate hierarchy below the title tier. */
}

@media (max-width: 900px) {
  :where(h1,.brand strong) {
    letter-spacing: .015em;
  }
}

@media (max-width: 640px) {
  :where(h1,.brand strong) {
    letter-spacing: .010em;
    -webkit-text-stroke: .12px rgba(224,255,244,.16);
    text-shadow:
      0 1px 0 rgba(237,255,248,.16),
      0 2px 0 rgba(5,22,16,.82),
      0 7px 22px rgba(27,255,162,.08),
      0 16px 40px rgba(0,168,112,.05);
  }
  .brand strong { letter-spacing: .055em; }
}

@media (prefers-reduced-motion: reduce) {
  :where(h1,.brand strong) { text-shadow: 0 1px 0 rgba(237,255,248,.14), 0 2px 0 rgba(5,22,16,.80); }
}

@media print {
  :where(h1,.brand strong) {
    font-family: Georgia, "Times New Roman", serif;
    font-weight: 700;
    -webkit-text-stroke: 0;
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
          headers: { 'user-agent': 'GlacierEQ-V27-Monument-Title/1.0' },
          signal: controller.signal,
          redirect: 'error',
        });
        requireValue(response.ok, `monument_font_http_${response.status}`);
        const declared = Number(response.headers.get('content-length') || 0);
        requireValue(!declared || declared <= MAX_FONT_BYTES, 'monument_font_declared_too_large');
        const body = Buffer.from(await response.arrayBuffer());
        requireValue(body.length > 1024 && body.length <= MAX_FONT_BYTES, 'monument_font_size_invalid');
        requireValue(body.subarray(0, 4).toString('ascii') === 'wOF2', 'monument_font_not_woff2');
        const digest = sha256(body);
        requireValue(digest === EXPECTED_FONT_SHA256, 'monument_font_sha256_mismatch');
        return Object.freeze({ body, sha256: digest });
      } catch (error) {
        if (error?.name === 'AbortError') throw new Error('monument_font_fetch_timeout');
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
      .then(() => { if (!settled) reject(new Error('monument_capture_did_not_end')); })
      .catch(reject);
  });
}

function injectMonument(body) {
  const bytes = Buffer.isBuffer(body) ? body : Buffer.from(body || '');
  let text = bytes.toString('utf8');
  if (!/<\/head>/i.test(text)) return bytes;
  const matches = text.match(/\/assets\/site\.title-monument\.css/g) || [];
  if (matches.length > 1) throw new Error('duplicate_monument_stylesheet');
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
  res.setHeader('X-GlacierEQ-Title-Font-Source', 'fontsource-ewert-5.3.0');
}

function replayHeaders(headers, res) {
  for (const [name, value] of headers) {
    if (name === 'content-length' || name === 'x-psysocx-title-release') continue;
    res.setHeader(name, value);
  }
  applyReleaseHeaders(res);
}

function serveCss(res) {
  const body = Buffer.from(MONUMENT_CSS);
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

async function verifyV27(res) {
  const errors = [];
  let inherited = null;
  let font = null;
  let homepage = null;
  try {
    const [v26Response, fontResult, homeResponse] = await Promise.all([
      capture(titleFontProxy, { url: '/?path=__v26_verify' }),
      loadFont(),
      capture(compilerProxy, { url: '/?path=index.html' }),
    ]);
    try { inherited = JSON.parse(v26Response.body.toString('utf8')); } catch {}
    if (v26Response.status !== 200 || inherited?.status !== 'PASS') errors.push('v26_inheritance_failed');
    font = {
      source: FONT_SOURCE,
      sha256: fontResult.sha256,
      bytes: fontResult.body.length,
      woff2_signature: fontResult.body.subarray(0, 4).toString('ascii') === 'wOF2',
    };
    const html = injectMonument(homeResponse.body).toString('utf8');
    const algerianIndex = html.indexOf('/assets/site.algerian.css');
    const monumentIndex = html.indexOf('/assets/site.title-monument.css');
    homepage = {
      status: homeResponse.status,
      stylesheet_count: (html.match(/\/assets\/site\.title-monument\.css/g) || []).length,
      algerian_precedes_monument: algerianIndex !== -1 && monumentIndex !== -1 && algerianIndex < monumentIndex,
      old_trueface_absent: !html.includes('/assets/site.title-font.css'),
      script_free: !/<script\b/i.test(html),
    };
    if (!font.woff2_signature) errors.push('monument_font_signature_failed');
    if (homepage.status !== 200 || homepage.stylesheet_count !== 1 || !homepage.algerian_precedes_monument || !homepage.old_trueface_absent || !homepage.script_free) {
      errors.push('monument_homepage_contract_failed');
    }
  } catch (error) {
    errors.push(error instanceof Error ? error.message : 'v27_verification_failed');
  }

  const pass = errors.length === 0;
  const body = Buffer.from(JSON.stringify({
    schema: VERIFY_SCHEMA,
    status: pass ? 'PASS' : 'FAIL',
    release: RELEASE,
    inherited_v26: inherited ? { schema: inherited.schema, status: inherited.status } : null,
    font,
    homepage,
    title_scope: ['h1', 'brand strong'],
    secondary_heading_owner: 'V24 Algerian/Copperplate layer',
    browser_font_origin: 'self',
    client_scripts_added: 0,
    truth_boundary: {
      typography_only: true,
      body_typography_modified: false,
      secondary_heading_hierarchy_replaced: false,
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

module.exports = async function monumentTitleProxy(req, res) {
  const rawPath = proxy.requestPath(req);
  if (rawPath === '__v27_verify') return verifyV27(res);
  const filePath = proxy.normalize(rawPath);
  if (!filePath) return compilerProxy(req, res);
  if (filePath === CSS_PATH) return serveCss(res);
  if (filePath === FONT_PATH) return serveFont(res);

  const captured = await capture(compilerProxy, req);
  replayHeaders(captured.headers, res);
  res.statusCode = captured.status;
  let body = captured.body;
  const type = String(captured.headers.get('content-type') || '');
  if (type.startsWith('text/html')) body = injectMonument(body);
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
  EXPECTED_FONT_SHA256,
};
module.exports.MONUMENT_CSS = MONUMENT_CSS;
module.exports.injectMonument = injectMonument;
module.exports.loadFont = loadFont;
module.exports.sha256 = sha256;

const { URL } = require('node:url');
const proxy = require('./proxy.js');
const designProxy = require('./design-proxy.js');
const estateProxy = require('./estate-proxy.js');
const truthRuntime = require('./truth-runtime.js');
const typographyProxy = require('./typography-proxy.js');
const compilerProxy = require('./compiler-proxy.js');
const titleFontProxy = require('./title-font-proxy.js');
const monumentTitleProxy = require('./monument-title-proxy.js');
const systemsAtlasProxy = require('./systems-atlas-proxy.js');

const PUBLIC_ORIGIN = 'https://casey-barton-glaciereq.vercel.app';
const V26_ASSETS = new Set([
  'assets/title-algerian.woff2',
  'assets/site.title-font.css',
]);
const ROUTE_SELECTOR_PARAMS = ['company', 'role', 'depth'];

function requestUrl(req) {
  return new URL(String(req?.url || '/'), 'https://glaciereq.invalid');
}

function hasRouteSelectors(req) {
  const parsed = requestUrl(req);
  return ROUTE_SELECTOR_PARAMS.some((name) => parsed.searchParams.has(name));
}

function seoPolicy(req, rawPath) {
  const filePath = proxy.normalize(rawPath);
  if (!filePath) return null;

  if (filePath === 'companies/index.html') {
    return { kind: 'redirect', location: '/atlas/' };
  }

  let match = /^atlas\/([a-z0-9-]+)\/(index\.html|record\.json)$/.exec(filePath);
  if (match) {
    const [, slug, leaf] = match;
    return {
      kind: 'redirect',
      location: leaf === 'record.json'
        ? `/companies/${slug}/record.json`
        : `/companies/${slug}/`,
    };
  }

  if (filePath === 'atlas/index.html') {
    return {
      kind: 'html',
      canonical: `${PUBLIC_ORIGIN}/atlas/`,
      robots: 'index,follow',
    };
  }

  match = /^companies\/([a-z0-9-]+)\/index\.html$/.exec(filePath);
  if (match) {
    return {
      kind: 'html',
      canonical: `${PUBLIC_ORIGIN}/companies/${match[1]}/`,
      robots: hasRouteSelectors(req) ? 'noindex,follow' : 'index,follow',
    };
  }

  if (filePath === 'compiler/index.html') {
    return {
      kind: 'html',
      canonical: `${PUBLIC_ORIGIN}/compiler/`,
      robots: hasRouteSelectors(req) ? 'noindex,follow' : 'index,follow',
    };
  }

  if (filePath === 'sitemap.xml') return { kind: 'sitemap' };
  return null;
}

function rewriteHtmlSeo(body, policy) {
  const bytes = Buffer.isBuffer(body) ? body : Buffer.from(body || '');
  let html = bytes.toString('utf8');
  if (!/<\/head>/i.test(html)) return bytes;

  html = html
    .replace(/\s*<link\b[^>]*\brel=["']canonical["'][^>]*>\s*/gi, '\n')
    .replace(/\s*<meta\b[^>]*\bname=["']robots["'][^>]*>\s*/gi, '\n');

  const authority = [
    `  <meta name="robots" content="${policy.robots}">`,
    `  <link rel="canonical" href="${policy.canonical}">`,
  ].join('\n');
  html = html.replace(/<\/head>/i, `${authority}\n</head>`);
  return Buffer.from(html);
}

function rewriteSitemapSeo(body) {
  const bytes = Buffer.isBuffer(body) ? body : Buffer.from(body || '');
  let xml = bytes.toString('utf8');
  xml = xml.replace(
    /\s*<url><loc>https:\/\/casey-barton-glaciereq\.vercel\.app\/companies\/<\/loc>(?:<priority>[^<]*<\/priority>)?<\/url>/g,
    '',
  );
  xml = xml.replace(
    /\s*<url><loc>https:\/\/casey-barton-glaciereq\.vercel\.app\/atlas\/[a-z0-9-]+\/<\/loc>(?:<priority>[^<]*<\/priority>)?<\/url>/g,
    '',
  );
  return Buffer.from(xml.endsWith('\n') ? xml : `${xml}\n`);
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
      .then(() => { if (!settled) reject(new Error('seo_capture_did_not_end')); })
      .catch(reject);
  });
}

function replayHeaders(headers, res) {
  for (const [name, value] of headers) {
    if (
      name === 'content-length'
      || name === 'x-robots-tag'
      || name === 'x-glaciereq-canonical-route'
    ) continue;
    res.setHeader(name, value);
  }
}

function serveRedirect(res, location) {
  res.statusCode = 308;
  res.setHeader('Location', location);
  res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=3600, must-revalidate');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Content-Length', '0');
  res.end();
}

async function serveSeoGoverned(req, res, policy) {
  if (policy.kind === 'redirect') return serveRedirect(res, policy.location);

  const captured = await capture(monumentTitleProxy, req);
  replayHeaders(captured.headers, res);
  res.statusCode = captured.status;
  let body = captured.body;

  if (captured.status === 200 && policy.kind === 'html') {
    body = rewriteHtmlSeo(body, policy);
    res.setHeader('X-Robots-Tag', policy.robots);
    res.setHeader('X-GlacierEQ-Canonical-Route', policy.canonical);
  } else if (captured.status === 200 && policy.kind === 'sitemap') {
    body = rewriteSitemapSeo(body);
  }

  res.setHeader('Content-Length', String(body.length));
  res.end(body);
}

module.exports = async function releaseRouter(req, res) {
  const rawPath = proxy.requestPath(req);
  if (rawPath === '__systems_atlas_verify' || systemsAtlasProxy.handles(rawPath)) {
    return systemsAtlasProxy(req, res);
  }
  if (rawPath === '__v21_verify') return proxy(req, res);
  if (rawPath === '__design_verify') return designProxy(req, res);
  if (rawPath === '__v22_verify') return estateProxy(req, res);
  if (rawPath === '__v23_verify') return truthRuntime(req, res);
  if (rawPath === '__v24_verify') return typographyProxy(req, res);
  if (rawPath === '__v25_verify') return compilerProxy(req, res);
  if (rawPath === '__v26_verify' || V26_ASSETS.has(rawPath)) return titleFontProxy(req, res);
  if (rawPath === '__v27_verify') return monumentTitleProxy(req, res);

  const policy = seoPolicy(req, rawPath);
  if (policy) return serveSeoGoverned(req, res, policy);
  return monumentTitleProxy(req, res);
};

module.exports.V26_ASSETS = V26_ASSETS;
module.exports.PUBLIC_ORIGIN = PUBLIC_ORIGIN;
module.exports.hasRouteSelectors = hasRouteSelectors;
module.exports.seoPolicy = seoPolicy;
module.exports.rewriteHtmlSeo = rewriteHtmlSeo;
module.exports.rewriteSitemapSeo = rewriteSitemapSeo;
module.exports.serveRedirect = serveRedirect;

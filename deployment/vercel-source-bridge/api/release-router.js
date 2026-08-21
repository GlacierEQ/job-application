const crypto = require('node:crypto');
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
const inventionsProxy = require('./inventions-proxy.js');
const starmapProxy = require('./starmap-proxy.js');
const workflowTopologyProxy = require('./workflow-topology-proxy.js');
require('./workflow-topology-loader-patch.js');
const workflowRecruiterProxy = require('./workflow-recruiter-proxy.js');

const PUBLIC_ORIGIN = 'https://casey-barton-glaciereq.vercel.app';
const V26_ASSETS = new Set([
  'assets/title-algerian.woff2',
  'assets/site.title-font.css',
]);
const ROUTE_SELECTOR_PARAMS = ['company', 'role', 'depth', 'stage'];
const ROLE_MATRIX_SCHEMA = 'glaciereq.public-recruiter-role-matrix.v1';
const ROLE_MATRIX_ROLES = Object.freeze(Object.keys(workflowRecruiterProxy.constants.ROLE_WEIGHTS));

function stableStringify(value) {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

function sha256(value) {
  return crypto.createHash('sha256').update(stableStringify(value)).digest('hex');
}

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
  if (match && match[1] !== 'starmap') {
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

  if (filePath === 'atlas/starmap/index.html') {
    return {
      kind: 'html',
      canonical: `${PUBLIC_ORIGIN}/atlas/starmap/`,
      robots: hasRouteSelectors(req) ? 'noindex,follow' : 'index,follow',
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
    /\s*<url><loc>https:\/\/casey-barton-glaciereq\.vercel\.app\/atlas\/(?!starmap\/)[a-z0-9-]+\/<\/loc>(?:<priority>[^<]*<\/priority>)?<\/url>/g,
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

function buildRoleMatrix(topology, freshness) {
  if (topology?.schema !== 'glaciereq.workflow-topology.v1') {
    throw new Error('role_matrix_topology_schema');
  }
  if (freshness?.schema !== 'glaciereq.public-evidence-freshness.v2') {
    throw new Error('role_matrix_freshness_schema');
  }
  if (freshness.topology_receipt_sha256 !== topology.receipt_sha256) {
    throw new Error('role_matrix_topology_receipt_mismatch');
  }
  if (!/^[a-f0-9]{64}$/.test(freshness.receipt_sha256 || '')) {
    throw new Error('role_matrix_freshness_receipt');
  }

  const rankings = {};
  for (const role of ROLE_MATRIX_ROLES) {
    const briefs = workflowRecruiterProxy.rankFlows(topology, role, freshness);
    if (!briefs.length) throw new Error(`role_matrix_empty_role:${role}`);
    rankings[role] = {
      top_flow: briefs[0].flow_id,
      top_score: briefs[0].score,
      briefs,
    };
  }

  const core = {
    schema: ROLE_MATRIX_SCHEMA,
    release: workflowRecruiterProxy.constants.RELEASE,
    topology_receipt_sha256: topology.receipt_sha256,
    freshness_receipt_sha256: freshness.receipt_sha256,
    as_of: freshness.as_of,
    verification_passes: 1,
    roles: ROLE_MATRIX_ROLES,
    coverage: {
      verified_systems: freshness.entries.length,
      unverified_systems: freshness.missing_systems.length,
    },
    missing_systems: freshness.missing_systems,
    rankings,
  };
  return { ...core, receipt_sha256: sha256(core) };
}

function sendRoleMatrixJson(res, status, payload, cacheControl) {
  const body = Buffer.from(`${JSON.stringify(payload, null, 2)}\n`);
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', cacheControl);
  res.setHeader('Content-Length', String(body.length));
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('X-PSYSOCX-Release', workflowRecruiterProxy.constants.RELEASE);
  res.end(body);
}

async function serveRoleMatrix(res) {
  try {
    const topology = await workflowTopologyProxy.loadTopology();
    const freshness = await workflowRecruiterProxy.loadLiveFreshness(topology);
    return sendRoleMatrixJson(
      res,
      200,
      buildRoleMatrix(topology, freshness),
      'public, max-age=0, s-maxage=300, must-revalidate',
    );
  } catch (error) {
    return sendRoleMatrixJson(
      res,
      503,
      {
        schema: ROLE_MATRIX_SCHEMA,
        status: 'FAIL_CLOSED',
        error: error instanceof Error ? error.message : String(error),
      },
      'no-store',
    );
  }
}

module.exports = async function releaseRouter(req, res) {
  const rawPath = proxy.requestPath(req);
  if (rawPath === '__systems_atlas_verify' || systemsAtlasProxy.handles(rawPath)) {
    return systemsAtlasProxy(req, res);
  }
  if (rawPath === '__inventions_verify' || inventionsProxy.handles(rawPath)) {
    return inventionsProxy(req, res);
  }
  if (rawPath === '__starmap_verify' || starmapProxy.handles(rawPath)) {
    return starmapProxy(req, res);
  }
  if (rawPath === '__workflow_topology_verify' || workflowTopologyProxy.handles(rawPath)) {
    return workflowTopologyProxy(req, res);
  }
  if (rawPath === '__recruiter_proof_verify' || workflowRecruiterProxy.handles(rawPath)) {
    return workflowRecruiterProxy(req, res);
  }
  if (rawPath === 'data/recruiter-role-matrix.json') {
    return serveRoleMatrix(res);
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
module.exports.ROLE_MATRIX_SCHEMA = ROLE_MATRIX_SCHEMA;
module.exports.ROLE_MATRIX_ROLES = ROLE_MATRIX_ROLES;
module.exports.buildRoleMatrix = buildRoleMatrix;
module.exports.hasRouteSelectors = hasRouteSelectors;
module.exports.seoPolicy = seoPolicy;
module.exports.rewriteHtmlSeo = rewriteHtmlSeo;
module.exports.rewriteSitemapSeo = rewriteSitemapSeo;
module.exports.serveRedirect = serveRedirect;
module.exports.serveRoleMatrix = serveRoleMatrix;

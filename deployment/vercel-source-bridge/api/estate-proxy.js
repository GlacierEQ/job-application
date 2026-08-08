const crypto = require('node:crypto');
const designProxy = require('./design-proxy.js');
const proxy = require('./proxy.js');

const ESTATE_HELIX_COMMIT = 'f1234df9101dec2934e46a7935569e68a0eb23c5';
const EXTERNAL_PATH = 'manifests/application_intelligence/company_bottleneck_atlas.external.json';
const EXTERNAL_SHA256 = '2d93f4e0c736426dcf6904be6d0139075a48c78f3051278becf05703ee67f654';
const HELIX_RAW = `https://raw.githubusercontent.com/GlacierEQ/job-app-helix/${ESTATE_HELIX_COMMIT}/`;
const RELEASE = 'V22-ESTATE-INTELLIGENCE-COMPLETE-WEB';
const OUTPUT_SCHEMA = 'glaciereq.public-estate-intelligence.v1';
const VERIFY_SCHEMA = 'glaciereq.v22-estate-intelligence-verification.v1';
const EXPECTED_RECORDS = 47;
const FETCH_TIMEOUT_MS = 12_000;
const MAX_BYTES = 4 * 1024 * 1024;
const SHA64 = /^[a-f0-9]{64}$/;
const COMPANY_ID = /^[a-z0-9_]+$/;
const SHARD_PATH = /^manifests\/application_intelligence\/atlas_shards\/[a-z0-9_]+\.json$/;
const START = '<!-- ESTATE_INTELLIGENCE_START -->';
const END = '<!-- ESTATE_INTELLIGENCE_END -->';

let estatePromise = null;

function sha256(body) {
  return crypto.createHash('sha256').update(body).digest('hex');
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function requireValue(condition, message) {
  if (!condition) throw new Error(message);
}

async function boundedBytes(url, maxBytes = MAX_BYTES) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      headers: { 'user-agent': 'GlacierEQ-V22-Estate-Runtime/1.0' },
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

function parseJson(body, label) {
  try {
    const value = JSON.parse(Buffer.isBuffer(body) ? body.toString('utf8') : String(body));
    requireValue(value && typeof value === 'object' && !Array.isArray(value), `${label}:object`);
    return value;
  } catch (error) {
    throw new Error(`${label}:${error instanceof Error ? error.message : String(error)}`);
  }
}

function rawUrl(filePath) {
  if (typeof filePath !== 'string' || filePath.includes('..')) throw new Error('helix_path_escape');
  return `${HELIX_RAW}${filePath}`;
}

function validateOfficialSource(source, companyId) {
  requireValue(source && typeof source === 'object' && !Array.isArray(source), `${companyId}:official_source`);
  requireValue(typeof source.url === 'string' && source.url.startsWith('https://'), `${companyId}:source_url`);
  requireValue(typeof source.source_sha256 === 'string' && SHA64.test(source.source_sha256), `${companyId}:source_sha`);
  requireValue(typeof source.title === 'string' && source.title, `${companyId}:source_title`);
  requireValue(typeof source.observed_signal === 'string' && source.observed_signal, `${companyId}:source_signal`);
  return {
    observed_signal: source.observed_signal,
    publisher: typeof source.publisher === 'string' ? source.publisher : 'Official source',
    source_sha256: source.source_sha256,
    title: source.title,
    url: source.url,
  };
}

function normalizeRecord(raw, manifest) {
  requireValue(raw && typeof raw === 'object' && !Array.isArray(raw), 'record_invalid');
  const companyId = raw.company_id;
  requireValue(typeof companyId === 'string' && COMPANY_ID.test(companyId), 'company_id_invalid');
  for (const field of [
    'display_name',
    'observed_current_pressure',
    'inferred_bottleneck',
    'inferred_brick_wall',
    'application_move',
    'next_deep_dive',
  ]) {
    requireValue(typeof raw[field] === 'string' && raw[field].trim(), `${companyId}:${field}`);
  }
  const leverage = raw.leverage;
  requireValue(leverage && typeof leverage === 'object' && !Array.isArray(leverage), `${companyId}:leverage`);
  requireValue(typeof leverage.mechanism === 'string' && leverage.mechanism.trim(), `${companyId}:mechanism`);
  requireValue(typeof leverage.expected_impact === 'string' && leverage.expected_impact.trim(), `${companyId}:impact`);
  requireValue(Array.isArray(raw.official_sources) && raw.official_sources.length, `${companyId}:sources`);
  requireValue(Array.isArray(raw.target_roles), `${companyId}:roles`);
  return {
    application_move: raw.application_move,
    company_id: companyId,
    display_name: raw.display_name,
    expected_impact: leverage.expected_impact,
    freshness_state: manifest.freshness_state,
    inference_boundary: manifest.inference_boundary,
    inferred_bottleneck: raw.inferred_bottleneck,
    inferred_brick_wall: raw.inferred_brick_wall,
    leverage_mechanism: leverage.mechanism,
    next_deep_dive: raw.next_deep_dive,
    observed_current_pressure: raw.observed_current_pressure,
    official_sources: raw.official_sources.map((source) => validateOfficialSource(source, companyId)),
    research_as_of: manifest.research_as_of,
    target_roles: raw.target_roles.filter((role) => typeof role === 'string' && role),
  };
}

async function loadEstate() {
  if (!estatePromise) {
    estatePromise = (async () => {
      const manifestResponse = await boundedBytes(rawUrl(EXTERNAL_PATH));
      requireValue(manifestResponse.response.ok, `manifest_http_${manifestResponse.response.status}`);
      requireValue(sha256(manifestResponse.body) === EXTERNAL_SHA256, 'manifest_sha256_mismatch');
      const manifest = parseJson(manifestResponse.body, 'estate_manifest');
      requireValue(manifest.schema === 'glaciereq.external-company-bottleneck-atlas.v1', 'manifest_schema');
      requireValue(manifest.record_count === EXPECTED_RECORDS, 'manifest_record_count');
      requireValue(typeof manifest.research_as_of === 'string' && manifest.research_as_of, 'manifest_research_as_of');
      requireValue(
        typeof manifest.freshness_state === 'string' && manifest.freshness_state.includes('REQUIRES_REFRESH'),
        'manifest_freshness_gate',
      );
      requireValue(typeof manifest.inference_boundary === 'string' && manifest.inference_boundary, 'manifest_inference_boundary');
      requireValue(
        manifest.truth_boundary?.official_source_observation_separate_from_glaciereq_inference === true,
        'manifest_observation_inference_boundary',
      );
      requireValue(
        manifest.truth_boundary?.source_snapshot_requires_refresh_for_live_application === true,
        'manifest_live_application_freshness_boundary',
      );
      requireValue(Array.isArray(manifest.shards) && manifest.shards.length, 'manifest_shards');
      requireValue(Array.isArray(manifest.excluded_company_ids), 'manifest_excluded_companies');

      const records = new Map();
      for (const shardRef of manifest.shards) {
        requireValue(shardRef && typeof shardRef === 'object' && !Array.isArray(shardRef), 'shard_ref_invalid');
        requireValue(typeof shardRef.path === 'string' && SHARD_PATH.test(shardRef.path), 'shard_path_invalid');
        requireValue(typeof shardRef.shard_sha256 === 'string' && SHA64.test(shardRef.shard_sha256), 'shard_sha_invalid');
        const shardResponse = await boundedBytes(rawUrl(shardRef.path));
        requireValue(shardResponse.response.ok, `shard_http_${shardResponse.response.status}`);
        const shard = parseJson(shardResponse.body, shardRef.path);
        requireValue(
          shard.schema === 'glaciereq.job-app-helix.company-bottleneck-atlas-shard.v1',
          `${shardRef.path}:schema`,
        );
        requireValue(shard.shard_sha256 === shardRef.shard_sha256, `${shardRef.path}:embedded_sha`);
        requireValue(Array.isArray(shard.records), `${shardRef.path}:records`);
        requireValue(shard.records.length === shardRef.record_count, `${shardRef.path}:count`);
        for (const raw of shard.records) {
          const record = normalizeRecord(raw, manifest);
          requireValue(!records.has(record.company_id), `${record.company_id}:duplicate`);
          records.set(record.company_id, record);
        }
      }
      requireValue(records.size === EXPECTED_RECORDS, 'estate_record_count');
      for (const excluded of manifest.excluded_company_ids) {
        requireValue(!records.has(excluded), `${excluded}:excluded_leak`);
      }
      const orderedRecords = [...records.values()].sort((a, b) => a.company_id.localeCompare(b.company_id));
      return {
        manifest,
        records,
        publicBundle: {
          schema: OUTPUT_SCHEMA,
          source: {
            authority_commit: ESTATE_HELIX_COMMIT,
            external_manifest_path: EXTERNAL_PATH,
            external_manifest_sha256: EXTERNAL_SHA256,
            freshness_state: manifest.freshness_state,
            inference_boundary: manifest.inference_boundary,
            research_as_of: manifest.research_as_of,
            snapshot_origin_commit: manifest.source_commit,
          },
          records: orderedRecords,
          truth_boundary: {
            authenticated_estate_cardinality_published: false,
            legal_private_material_published: false,
            private_repository_identities_published: false,
            role_fit_is_capability_overlap_not_hiring_prediction: true,
            support_counts_as_independent_accomplishment: false,
            source_snapshot_requires_refresh_for_live_application: true,
          },
        },
      };
    })().catch((error) => {
      estatePromise = null;
      throw error;
    });
  }
  return estatePromise;
}

function captureDesign(req) {
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
    Promise.resolve(designProxy(req, res))
      .then(() => {
        if (!settled) reject(new Error('design_proxy_did_not_end'));
      })
      .catch(reject);
  });
}

function securityHeaders(res) {
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'none'; style-src 'self'; img-src 'self' data:; connect-src 'none'; font-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'; form-action 'self' mailto:; upgrade-insecure-requests",
  );
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=()');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  res.setHeader('X-GlacierEQ-Source-Commit', designProxy.constants.WEB_SOURCE_COMMIT);
  res.setHeader('X-GlacierEQ-Helix-Commit', designProxy.constants.HELIX_COMMIT);
  res.setHeader('X-GlacierEQ-Estate-Helix-Commit', ESTATE_HELIX_COMMIT);
  res.setHeader('X-PSYSOCX-Release', RELEASE);
}

function replayHeaders(captured, res) {
  for (const [name, value] of captured.headers) {
    if (
      name === 'content-length' ||
      name === 'x-glaciereq-source-commit' ||
      name === 'x-glaciereq-helix-commit' ||
      name === 'x-glaciereq-estate-helix-commit' ||
      name === 'x-psysocx-release'
    ) {
      continue;
    }
    res.setHeader(name, value);
  }
  res.setHeader('X-GlacierEQ-Source-Commit', designProxy.constants.WEB_SOURCE_COMMIT);
  res.setHeader('X-GlacierEQ-Helix-Commit', designProxy.constants.HELIX_COMMIT);
  res.setHeader('X-GlacierEQ-Estate-Helix-Commit', ESTATE_HELIX_COMMIT);
  res.setHeader('X-PSYSOCX-Release', RELEASE);
}

function replaceOrInsert(html, block) {
  const expression = new RegExp(`${START}[\\s\\S]*?${END}`, 'm');
  if (expression.test(html)) return html.replace(expression, block);
  if (!html.includes('</main>')) throw new Error('html_main_boundary_missing');
  return html.replace('</main>', `${block}\n</main>`);
}

function sourceLinks(record) {
  return record.official_sources
    .map(
      (source) => `<li><a href="${escapeHtml(source.url)}" target="_blank" rel="noopener">${escapeHtml(source.title)}</a><br><small>${escapeHtml(source.publisher)} · observed signal: ${escapeHtml(source.observed_signal)}</small></li>`,
    )
    .join('');
}

function companyBlock(record) {
  return `${START}
<section class="section company-layer estate-intelligence" id="estate-intelligence">
  <div class="shell">
    <div class="layer-heading"><span>ESTATE INTELLIGENCE · SOURCE-BOUND</span><h2>Operating pressure → engineering intervention.</h2></div>
    <p class="muted"><strong>Research snapshot:</strong> ${escapeHtml(record.research_as_of)} · ${escapeHtml(record.freshness_state)}. Observed pressure is source-backed snapshot material; bottlenecks and interventions are GlacierEQ inference.</p>
    <div class="company-two-col">
      <article class="card"><h3>Observed current pressure</h3><p>${escapeHtml(record.observed_current_pressure)}</p><h3>Official signals</h3><ul class="evolution-list">${sourceLinks(record)}</ul></article>
      <article class="card"><h3>GlacierEQ bottleneck inference</h3><p>${escapeHtml(record.inferred_bottleneck)}</p><p><strong>Brick wall:</strong> ${escapeHtml(record.inferred_brick_wall)}</p><p><strong>Inference boundary:</strong> ${escapeHtml(record.inference_boundary)}</p></article>
    </div>
    <div class="company-two-col">
      <article class="card"><h3>Intervention mechanism</h3><p>${escapeHtml(record.leverage_mechanism)}</p><p><strong>Expected impact:</strong> ${escapeHtml(record.expected_impact)}</p></article>
      <article class="card"><h3>Application move</h3><p>${escapeHtml(record.application_move)}</p><p><strong>Next deep dive:</strong> ${escapeHtml(record.next_deep_dive)}</p></article>
    </div>
  </div>
</section>
${END}`;
}

function atlasBlock(recordCount, manifest) {
  return `${START}
<section class="section company-layer estate-intelligence" id="operating-intelligence">
  <div class="shell">
    <div class="layer-heading"><span>OPERATING INTELLIGENCE</span><h2>${recordCount} source-bound company pressure dossiers.</h2></div>
    <div class="company-two-col">
      <article class="card"><h3>Observed ≠ inferred</h3><p>Official-source observations remain distinct from GlacierEQ bottleneck, brick-wall, leverage, and intervention hypotheses. Every enriched company page carries that boundary.</p></article>
      <article class="card"><h3>Freshness gate</h3><p>Research snapshot ${escapeHtml(manifest.research_as_of)} · ${escapeHtml(manifest.freshness_state)}. Refresh is required before a live application claims current hiring or operating conditions.</p></article>
    </div>
  </div>
</section>
${END}`;
}

function companyIdForPath(filePath) {
  const match = /^companies\/([a-z0-9-]+)\/index\.html$/.exec(filePath);
  return match ? match[1].replaceAll('-', '_') : null;
}

async function serveCaptured(req, res, filePath) {
  const captured = await captureDesign(req);
  let body = captured.body;
  if (captured.status === 200 && String(captured.headers.get('content-type') || '').startsWith('text/html')) {
    const estate = await loadEstate();
    const companyId = companyIdForPath(filePath);
    if (companyId && estate.records.has(companyId)) {
      body = Buffer.from(replaceOrInsert(body.toString('utf8'), companyBlock(estate.records.get(companyId))));
    } else if (filePath === 'atlas/index.html') {
      body = Buffer.from(replaceOrInsert(body.toString('utf8'), atlasBlock(estate.records.size, estate.manifest)));
    }
  }
  if (body.length > MAX_BYTES) throw new Error('runtime_output_too_large');
  replayHeaders(captured, res);
  res.statusCode = captured.status;
  res.setHeader('Content-Length', String(body.length));
  res.end(body);
}

async function serveEstateJson(res) {
  const estate = await loadEstate();
  const body = Buffer.from(JSON.stringify(estate.publicBundle, null, 2));
  securityHeaders(res);
  res.statusCode = 200;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=300, must-revalidate');
  res.setHeader('Content-Length', String(body.length));
  res.end(body);
}

async function verifyV22(res) {
  const errors = [];
  let baseDesign = null;
  let estate = null;
  let sampleInjected = false;
  try {
    const design = await captureDesign({ url: '/?path=__design_verify' });
    let payload = null;
    try {
      payload = JSON.parse(design.body.toString('utf8'));
    } catch {}
    baseDesign = {
      status_code: design.status,
      schema: payload?.schema || null,
      status: payload?.status || null,
      source_commit: payload?.source_commit || null,
    };
    if (design.status !== 200 || payload?.status !== 'PASS') errors.push('base_design_verifier_failed');

    estate = await loadEstate();
    if (estate.records.size !== EXPECTED_RECORDS) errors.push('estate_record_count');
    if (!estate.records.has('openai')) errors.push('openai_record_missing');
    const sample = await captureDesign({ url: '/?path=companies/openai/index.html' });
    if (sample.status !== 200) {
      errors.push('openai_route_failed');
    } else {
      const record = estate.records.get('openai');
      const html = replaceOrInsert(sample.body.toString('utf8'), companyBlock(record));
      sampleInjected =
        html.includes('id="estate-intelligence"') &&
        html.includes('Observed current pressure') &&
        html.includes('GlacierEQ bottleneck inference') &&
        !/<script\b/i.test(html) &&
        !/\sstyle\s*=\s*/i.test(html);
      if (!sampleInjected) errors.push('openai_injection_failed');
    }
  } catch (error) {
    errors.push(error instanceof Error ? error.message : 'v22_verification_failed');
  }

  const pass = errors.length === 0;
  const payload = Buffer.from(
    JSON.stringify(
      {
        schema: VERIFY_SCHEMA,
        status: pass ? 'PASS' : 'FAIL',
        release: RELEASE,
        base_design: baseDesign,
        proof_helix_commit: designProxy.constants.HELIX_COMMIT,
        estate_helix_commit: ESTATE_HELIX_COMMIT,
        external_manifest_sha256: EXTERNAL_SHA256,
        estate_records: estate?.records?.size ?? null,
        research_as_of: estate?.manifest?.research_as_of ?? null,
        freshness_state: estate?.manifest?.freshness_state ?? null,
        sample_company_injected: sampleInjected,
        truth_boundary: {
          authenticated_estate_cardinality_published: false,
          legal_private_material_published: false,
          private_repository_identities_published: false,
          observed_source_separate_from_glaciereq_inference: true,
          live_application_refresh_required: true,
        },
        errors,
        client_scripts: 0,
      },
      null,
      2,
    ),
  );
  securityHeaders(res);
  res.statusCode = pass ? 200 : 503;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Content-Length', String(payload.length));
  res.end(payload);
}

function delegateV22(req, res) {
  const originalSetHeader = res.setHeader.bind(res);
  const originalEnd = res.end.bind(res);
  res.setHeader = (name, value) => {
    const lower = String(name).toLowerCase();
    if (lower === 'x-psysocx-release') value = RELEASE;
    return originalSetHeader(name, value);
  };
  res.end = (body, ...args) => {
    originalSetHeader('X-GlacierEQ-Estate-Helix-Commit', ESTATE_HELIX_COMMIT);
    originalSetHeader('X-PSYSOCX-Release', RELEASE);
    return originalEnd(body, ...args);
  };
  return designProxy(req, res);
}

module.exports = async function estateProxy(req, res) {
  const rawPath = proxy.requestPath(req);
  if (rawPath === '__v22_verify') return verifyV22(res);
  const filePath = proxy.normalize(rawPath);
  if (!filePath) {
    securityHeaders(res);
    res.statusCode = 400;
    res.end('Invalid path');
    return;
  }
  if (filePath === 'data/estate-intelligence.json') return serveEstateJson(res);
  if (filePath === 'atlas/index.html' || companyIdForPath(filePath)) {
    return serveCaptured(req, res, filePath);
  }
  return delegateV22(req, res);
};

module.exports.constants = {
  ESTATE_HELIX_COMMIT,
  EXTERNAL_PATH,
  EXTERNAL_SHA256,
  RELEASE,
  OUTPUT_SCHEMA,
  VERIFY_SCHEMA,
  EXPECTED_RECORDS,
};
module.exports.companyIdForPath = companyIdForPath;
module.exports.companyBlock = companyBlock;
module.exports.atlasBlock = atlasBlock;
module.exports.normalizeRecord = normalizeRecord;
module.exports.replaceOrInsert = replaceOrInsert;

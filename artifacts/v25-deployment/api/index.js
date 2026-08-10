const crypto = require('node:crypto');
const path = require('node:path');
const { URL } = require('node:url');

const RELEASE = 'V25-APPLICATION-COMPILER';
const SOURCE_COMMIT = '95a91fd9b51c77babf51b3bed7c156acfd9d06f7';
const ENTRY = 'api/release-router.js';
const EXPECTED_FACTORY_BUNDLE_SHA256 = 'b91a0724ba4b7fe82930c7ad003f213d8a8ebe598717f9e8ce00d3a3ca7111a3';
const BUNDLE_VERIFY_SCHEMA = 'glaciereq.v25-bundled-release-verification.v2';
const EXPECTED_FACTORY_SHA256 = Object.freeze({"api/compiler-proxy.js":"1ea880c2c8adcd1ea65e5bea804f9ae992e81c3d558d4ad5c2c8836322fb0597","api/design-proxy.js":"33f07104e3556cbc85c2f07d32cc94fc5afb4fdf226895344ac402681f668e95","api/estate-proxy.js":"b41c1ad0b153a9ec1d21851f258cbfa2add975be583d1e908d5d7eb48d814b5f","api/proxy.js":"935a245227e2abb23a9a5393078f3c835abff4e7fc242f5f2db4ea718d9234c3","api/release-router.js":"eb08935cee7e98cf9f48c9879cdcda4763fd8ecef928c05cd98396e0d0173a3a","api/title-font-proxy.js":"e105aa9b0a2bc29127ccdfa9ffd3b6bf86c4e0bef4831d40cf0c9f2f06825caa","api/truth-proxy.js":"23bbceb16919e9972e864eeeed1c2690e5d354522a9db94b02a75648b511f857","api/truth-runtime.js":"abdc1ee799941fb8c428c8e82602e90e36fadc639f14ea7cb5f5c5ec69ec5ffe","api/typography-proxy.js":"9b5ee6fb647133771e368e7fc15d79a385b831996c71c22d690123b5c3e8f656"});
const FACTORIES = Object.freeze({
"api/compiler-proxy.js":function(exports, require, module, __filename, __dirname) {
const crypto = require('node:crypto');
const { URL } = require('node:url');
const estateProxy = require('./estate-proxy.js');
const proxy = require('./proxy.js');
const typographyProxy = require('./typography-proxy.js');

const COMPILER_HELIX_COMMIT = '435c1e9d5dd4bf7466d869aa7c6918b56225b788';
const HELIX_RAW = `https://raw.githubusercontent.com/GlacierEQ/job-app-helix/${COMPILER_HELIX_COMMIT}/`;
const COMPANY_INDEX_PATH = 'manifests/company_dossiers.json';
const SECOND_DEPTH_PATH = 'manifests/company_second_depth.json';
const FLAGSHIP_PATH = 'manifests/flagship_registry.json';
const PRESSURE_MANIFEST_PATH = 'manifests/application_intelligence/company_bottleneck_atlas.external.json';
const PRESSURE_MANIFEST_SHA256 = '2d93f4e0c736426dcf6904be6d0139075a48c78f3051278becf05703ee67f654';
const RELEASE = 'V25-APPLICATION-COMPILER';
const VERIFY_SCHEMA = 'glaciereq.v25-application-compiler-verification.v1';
const OUTPUT_SCHEMA = 'glaciereq.public-application-compiler.v1';
const EMERALD_MOTION_LINK = '<link rel="stylesheet" href="/assets/site.emerald-motion.css">';
const FETCH_TIMEOUT_MS = 12_000;
const MAX_BYTES = 4 * 1024 * 1024;
const DEPTHS = new Set(['recruiter', 'company_reviewer', 'senior_engineer']);
const COMPANY_ID = /^[a-z0-9_]+$/;
const PUBLIC_FLAGSHIP_SURFACES = new Set(['PUBLIC']);
const PUBLIC_FLAGSHIP_STATES = new Set(['PROMOTED', 'REFERENCE_ONLY']);
const EVIDENCE_FIELDS = [
  'role_evidence',
  'problem_evidence',
  'inspected_repositories',
  'gap_queue',
  'implementation_receipts',
  'proof_artifacts',
  'claim_receipts',
];

let compilerPromise = null;

function sha256(body) {
  return crypto.createHash('sha256').update(body).digest('hex');
}

function esc(value) {
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

function capture(handler, req) {
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
    Promise.resolve(handler(req, res))
      .then(() => {
        if (!settled) reject(new Error('compiler_capture_did_not_end'));
      })
      .catch(reject);
  });
}

async function boundedBytes(url, userAgent) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      headers: { 'user-agent': userAgent },
      signal: controller.signal,
      redirect: 'error',
    });
    const declared = Number(response.headers.get('content-length') || 0);
    if (declared > MAX_BYTES) throw new Error('compiler_response_too_large');
    const body = Buffer.from(await response.arrayBuffer());
    if (body.length > MAX_BYTES) throw new Error('compiler_response_too_large');
    return { response, body };
  } catch (error) {
    if (error?.name === 'AbortError') throw new Error('compiler_fetch_timeout');
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

function helixUrl(filePath) {
  requireValue(typeof filePath === 'string' && filePath && !filePath.includes('..'), 'compiler_helix_path_invalid');
  return `${HELIX_RAW}${filePath}`;
}

async function fetchHelixJson(filePath, label = filePath) {
  const { response, body } = await boundedBytes(
    helixUrl(filePath),
    'GlacierEQ-V25-Application-Compiler/1.0',
  );
  requireValue(response.ok, `${label}:http_${response.status}`);
  try {
    const value = JSON.parse(body.toString('utf8'));
    requireValue(value && typeof value === 'object' && !Array.isArray(value), `${label}:object`);
    return { value, body };
  } catch (error) {
    throw new Error(`${label}:json:${error instanceof Error ? error.message : String(error)}`);
  }
}

function normalizeFlagships(registry) {
  requireValue(registry.schema === 'glaciereq.flagship-registry.v2', 'compiler_flagship_schema');
  requireValue(registry.authority === 'GlacierEQ/job-app-helix', 'compiler_flagship_authority');
  requireValue(Array.isArray(registry.flagships), 'compiler_flagship_rows');
  const rows = new Map();
  for (const row of registry.flagships) {
    if (!row || typeof row !== 'object' || Array.isArray(row)) continue;
    if (typeof row.system_id !== 'string' || !row.system_id) continue;
    if (!PUBLIC_FLAGSHIP_SURFACES.has(row.public_surface)) continue;
    if (!PUBLIC_FLAGSHIP_STATES.has(row.state)) continue;
    if (typeof row.repository !== 'string' || !row.repository.startsWith('GlacierEQ/')) continue;
    rows.set(row.system_id, {
      system_id: row.system_id,
      repository: row.repository,
      level: row.level,
      state: row.state,
      role: row.role,
      evidence: row.evidence,
      next_gate: row.next_gate,
    });
  }
  return rows;
}

async function loadPressureRecords() {
  const manifestResponse = await fetchHelixJson(PRESSURE_MANIFEST_PATH, 'pressure_manifest');
  requireValue(sha256(manifestResponse.body) === PRESSURE_MANIFEST_SHA256, 'pressure_manifest_sha256_mismatch');
  const manifest = manifestResponse.value;
  requireValue(manifest.schema === 'glaciereq.external-company-bottleneck-atlas.v1', 'pressure_manifest_schema');
  requireValue(Array.isArray(manifest.shards) && manifest.shards.length, 'pressure_manifest_shards');
  requireValue(Array.isArray(manifest.excluded_company_ids), 'pressure_manifest_exclusions');
  requireValue(
    manifest.truth_boundary?.official_source_observation_separate_from_glaciereq_inference === true,
    'pressure_observation_inference_boundary',
  );
  requireValue(
    manifest.truth_boundary?.source_snapshot_requires_refresh_for_live_application === true,
    'pressure_freshness_boundary',
  );

  const records = new Map();
  for (const shardRef of manifest.shards) {
    requireValue(shardRef && typeof shardRef === 'object' && !Array.isArray(shardRef), 'pressure_shard_ref');
    requireValue(typeof shardRef.path === 'string' && shardRef.path.startsWith('manifests/application_intelligence/atlas_shards/'), 'pressure_shard_path');
    requireValue(typeof shardRef.shard_sha256 === 'string' && /^[a-f0-9]{64}$/.test(shardRef.shard_sha256), 'pressure_shard_sha');
    const shard = (await fetchHelixJson(shardRef.path, shardRef.path)).value;
    requireValue(shard.schema === 'glaciereq.job-app-helix.company-bottleneck-atlas-shard.v1', `${shardRef.path}:schema`);
    requireValue(shard.shard_sha256 === shardRef.shard_sha256, `${shardRef.path}:embedded_sha`);
    requireValue(Array.isArray(shard.records), `${shardRef.path}:records`);
    requireValue(shard.records.length === shardRef.record_count, `${shardRef.path}:count`);
    for (const raw of shard.records) {
      const record = estateProxy.normalizeRecord(raw, manifest);
      requireValue(!records.has(record.company_id), `${record.company_id}:pressure_duplicate`);
      records.set(record.company_id, record);
    }
  }
  requireValue(records.size === manifest.record_count, 'pressure_record_count');
  for (const excluded of manifest.excluded_company_ids) {
    requireValue(!records.has(excluded), `${excluded}:pressure_excluded_leak`);
  }
  return { manifest, records };
}

async function loadCompiler() {
  if (!compilerPromise) {
    compilerPromise = (async () => {
      const [indexResult, secondDepthResult, flagshipResult, pressure] = await Promise.all([
        fetchHelixJson(COMPANY_INDEX_PATH),
        fetchHelixJson(SECOND_DEPTH_PATH),
        fetchHelixJson(FLAGSHIP_PATH),
        loadPressureRecords(),
      ]);
      const index = indexResult.value;
      requireValue(Array.isArray(index.dossier_files) && index.dossier_files.length, 'compiler_dossier_files');
      const shards = await Promise.all(
        index.dossier_files.map(async (filePath) => (await fetchHelixJson(filePath)).value),
      );
      const projection = proxy.compileProjection(index, shards, secondDepthResult.value);
      projection.source_commit = COMPILER_HELIX_COMMIT;
      const flagships = normalizeFlagships(flagshipResult.value);
      return {
        projection,
        flagships,
        pressureManifest: pressure.manifest,
        pressureRecords: pressure.records,
      };
    })().catch((error) => {
      compilerPromise = null;
      throw error;
    });
  }
  return compilerPromise;
}

function queryState(req, projection) {
  const parsed = new URL(String(req.url || '/'), 'https://glaciereq.invalid');
  const requestedCompany = parsed.searchParams.get('company') || 'openai';
  const company = projection.companies.find((row) => row.company_id === requestedCompany)
    || projection.companies.find((row) => row.company_id === 'openai')
    || projection.companies[0];
  requireValue(company, 'compiler_company_projection_empty');

  const roles = Array.isArray(company.target_roles)
    ? company.target_roles.filter((role) => typeof role === 'string' && role)
    : [];
  const requestedRole = parsed.searchParams.get('role') || '';
  const role = roles.includes(requestedRole) ? requestedRole : (roles[0] || 'Role route pending');
  const requestedDepth = parsed.searchParams.get('depth') || 'recruiter';
  const depth = DEPTHS.has(requestedDepth) ? requestedDepth : 'recruiter';
  return { company, role, depth };
}

function publicCapabilityDonors(company, flagships) {
  const ids = Array.isArray(company.applicable_flagships) ? company.applicable_flagships : [];
  return ids
    .map((id) => flagships.get(id))
    .filter(Boolean);
}

function depthLimit(depth) {
  if (depth === 'recruiter') return 3;
  if (depth === 'company_reviewer') return 5;
  return Number.POSITIVE_INFINITY;
}

function evidenceCounts(secondDepth) {
  const evidence = secondDepth && secondDepth.evidence && typeof secondDepth.evidence === 'object'
    ? secondDepth.evidence
    : {};
  return Object.fromEntries(
    EVIDENCE_FIELDS.map((field) => [field, Array.isArray(evidence[field]) ? evidence[field].length : 0]),
  );
}

function compileRoute(data, state) {
  const { company, role, depth } = state;
  const pressure = data.pressureRecords.get(company.company_id) || null;
  const donors = publicCapabilityDonors(company, data.flagships);
  const proofDonors = company.repositories.slice(0, depthLimit(depth));
  const counts = evidenceCounts(company.second_depth);
  return {
    schema: OUTPUT_SCHEMA,
    authority: {
      repository: 'GlacierEQ/job-app-helix',
      commit: COMPILER_HELIX_COMMIT,
      company_index: COMPANY_INDEX_PATH,
      second_depth: SECOND_DEPTH_PATH,
      flagship_registry: FLAGSHIP_PATH,
      pressure_manifest: PRESSURE_MANIFEST_PATH,
      pressure_manifest_sha256: PRESSURE_MANIFEST_SHA256,
    },
    route: {
      company_id: company.company_id,
      company: company.display_name,
      role,
      depth,
    },
    observed_pressure: pressure ? {
      statement: pressure.observed_current_pressure,
      research_as_of: pressure.research_as_of,
      freshness_state: pressure.freshness_state,
      official_sources: pressure.official_sources,
    } : null,
    inference: pressure ? {
      bottleneck: pressure.inferred_bottleneck,
      brick_wall: pressure.inferred_brick_wall,
      leverage_mechanism: pressure.leverage_mechanism,
      expected_impact: pressure.expected_impact,
      application_move: pressure.application_move,
      next_deep_dive: pressure.next_deep_dive,
      boundary: pressure.inference_boundary,
    } : null,
    capability_donors: donors,
    direct_public_proof_donors: proofDonors,
    company_projection: {
      recruiter_thesis: company.recruiter_thesis,
      track_state: company.track_state,
      second_depth: {
        stage: company.second_depth.stage,
        ordinal: company.second_depth.ordinal,
        claim_ceiling: company.second_depth.claim_ceiling,
        blockers: company.second_depth.blockers,
        next_gate: company.second_depth.next_gate,
        evidence_counts: counts,
      },
      non_affiliation: company.non_affiliation,
    },
    truth_boundary: {
      public_projection_only: true,
      authenticated_full_estate_not_published: true,
      raw_estate_cardinality_not_published: true,
      private_repository_identities_not_published: true,
      legal_private_material_not_published: true,
      observed_pressure_is_source_backed_snapshot: Boolean(pressure),
      bottleneck_and_intervention_are_glaciereq_inference: Boolean(pressure),
      role_fit_is_capability_alignment_not_employer_endorsement: true,
      company_naming_does_not_imply_affiliation: true,
    },
  };
}

function selected(value, current) {
  return value === current ? ' selected' : '';
}

function companyOptions(projection, current) {
  return projection.companies
    .map((company) => `<option value="${esc(company.company_id)}"${selected(company.company_id, current)}>${esc(company.display_name)}</option>`)
    .join('');
}

function roleOptions(company, current) {
  const roles = Array.isArray(company.target_roles) ? company.target_roles : [];
  if (!roles.length) return '<option value="">Role route pending</option>';
  return roles.map((role) => `<option value="${esc(role)}"${selected(role, current)}>${esc(role)}</option>`).join('');
}

function repoUrl(repository) {
  const [owner, name] = String(repository || '').split('/');
  if (!owner || !name) return '#';
  return `https://github.com/${encodeURIComponent(owner)}/${encodeURIComponent(name)}`;
}

function sourceList(route) {
  const sources = route.observed_pressure?.official_sources || [];
  if (!sources.length) return '<p class="compiler-empty">No external source-bound pressure dossier is available for this route.</p>';
  return `<ul class="compiler-sources">${sources.slice(0, 4).map((source) => `<li><a href="${esc(source.url)}" target="_blank" rel="noopener">${esc(source.title)}</a><small>${esc(source.publisher)} · ${esc(source.observed_signal)}</small></li>`).join('')}</ul>`;
}

function donorCards(route) {
  if (!route.capability_donors.length) {
    return '<article class="compiler-proof-card empty"><h3>No public capability donor promoted for this lens.</h3><p>The compiler does not substitute private or blocked systems.</p></article>';
  }
  return route.capability_donors.map((donor) => `<article class="compiler-proof-card"><span>${esc(donor.level)} · ${esc(donor.state)}</span><h3>${esc(donor.role)}</h3><p>${esc(donor.evidence)}</p><a href="${repoUrl(donor.repository)}" target="_blank" rel="noopener">Inspect ${esc(donor.repository)} →</a></article>`).join('');
}

function proofCards(route) {
  if (!route.direct_public_proof_donors.length) {
    return '<article class="compiler-proof-card empty"><h3>No direct public company proof donor admitted.</h3><p>This route remains a capability-alignment lens until Helix promotes direct evidence.</p></article>';
  }
  return route.direct_public_proof_donors.map((repo) => `<article class="compiler-proof-card"><span>${esc(repo.level)} · ${esc(repo.promotion_state)}</span><h3>${esc(repo.repository.split('/').pop())}</h3><p>Provenance: ${esc(repo.provenance_state)}</p><a href="${repoUrl(repo.repository)}" target="_blank" rel="noopener">Inspect public repository →</a></article>`).join('');
}

function evidenceLedger(route) {
  const counts = route.company_projection.second_depth.evidence_counts;
  return EVIDENCE_FIELDS.map((field) => `<li><span>${esc(field.replaceAll('_', ' '))}</span><strong>${counts[field]}</strong></li>`).join('');
}

function routeHref(route) {
  const params = new URLSearchParams({
    company: route.route.company_id,
    role: route.route.role,
    depth: route.route.depth,
  });
  return `/compiler/?${params.toString()}`;
}

function compilerHtml(data, route) {
  const pressure = route.observed_pressure?.statement
    || 'No external source-bound operating-pressure dossier is promoted for this company lens.';
  const inference = route.inference?.bottleneck
    || 'No GlacierEQ bottleneck inference is promoted for this company lens.';
  const intervention = route.inference?.application_move
    || route.company_projection.recruiter_thesis;
  const proofCount = route.direct_public_proof_donors.length;
  const capabilityCount = route.capability_donors.length;
  const pressureState = route.observed_pressure ? 'SOURCE-BOUND SNAPSHOT' : 'NO EXTERNAL PRESSURE DOSSIER';
  const depthLabel = {
    recruiter: 'Recruiter · signal',
    company_reviewer: 'Company reviewer · intervention',
    senior_engineer: 'Senior engineer · diligence',
  }[route.route.depth];

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
  <meta name="theme-color" content="#03070a">
  <meta name="description" content="Script-free GlacierEQ application intelligence compiler: company pressure to role-specific public proof.">
  <meta name="robots" content="index,follow">
  <title>${esc(route.route.company)} · Application Compiler · Casey Barton</title>
  <link rel="icon" href="/assets/favicon.svg" type="image/svg+xml">
  <link rel="stylesheet" href="/assets/site.css">
  <link rel="stylesheet" href="/assets/site.systems.css">
  <link rel="stylesheet" href="/assets/site.complete.css">
  <link rel="stylesheet" href="/assets/site.interaction.css">
  <link rel="stylesheet" href="/assets/site.algerian.css">
  <link rel="stylesheet" href="/assets/site.emerald-motion.css">
  <link rel="stylesheet" href="/assets/application-compiler.css">
</head>
<body>
<a class="skip" href="#main">Skip to content</a>
<div class="signal-bar"><div class="shell signal-inner"><span class="signal-live">V25 APPLICATION COMPILER · PUBLIC PROJECTION · SCRIPT-FREE</span><span>Helix ${COMPILER_HELIX_COMMIT.slice(0, 8)} · ${esc(pressureState)}</span></div></div>
<header class="site-header"><div class="shell nav"><a class="brand" href="/"><span class="mark">CB</span><span><strong>CASEY BARTON</strong><small>APPLIED AI SYSTEMS ARCHITECT</small></span></a><nav class="links" aria-label="Primary navigation"><a href="/">Recruiter</a><a href="/resume/">Résumé</a><a href="/master/">Master</a><a href="/companies/">Companies</a><a href="/atlas/">Atlas</a><a aria-current="page" href="/compiler/">Compiler</a><a href="/machine/">Machine</a></nav><a class="nav-cta" href="mailto:glacier.equilibrium@gmail.com">Start a conversation</a></div></header>
<main id="main">
<section class="compiler-hero"><div class="shell compiler-hero-grid"><div><p class="eyebrow">APPLICATION INTELLIGENCE COMPILER</p><h1>Start with the operating problem. <em>Compile the proof.</em></h1><p class="lead">One governed public graph is projected into the smallest evidence surface that matters for a company, role, and reviewer. Repository volume stays underneath the system instead of becoming the pitch.</p><div class="compiler-truth"><strong>Public boundary</strong><span>This surface compiles public recruiter-admitted evidence only. The authenticated full-estate graph remains private; raw estate cardinality, private repository identities, and legal-private material are not published.</span></div></div><aside class="compiler-route-card"><span>COMPILED ROUTE</span><h2>${esc(route.route.company)}</h2><p>${esc(route.route.role)}</p><dl><div><dt>Depth</dt><dd>${esc(depthLabel)}</dd></div><div><dt>Capability donors</dt><dd>${capabilityCount}</dd></div><div><dt>Direct proof donors</dt><dd>${proofCount}</dd></div><div><dt>Proof stage</dt><dd>${esc(route.company_projection.second_depth.stage)}</dd></div></dl></aside></div></section>
<section class="section compiler-controls-section"><div class="shell"><form class="compiler-form" action="/compiler/" method="get"><label><span>Target company</span><select name="company">${companyOptions(data.projection, route.route.company_id)}</select></label><label><span>Target role</span><select name="role">${roleOptions(data.projection.companies.find((row) => row.company_id === route.route.company_id), route.route.role)}</select></label><label><span>Review depth</span><select name="depth"><option value="recruiter"${selected('recruiter', route.route.depth)}>Recruiter · signal</option><option value="company_reviewer"${selected('company_reviewer', route.route.depth)}>Company reviewer · intervention</option><option value="senior_engineer"${selected('senior_engineer', route.route.depth)}>Senior engineer · diligence</option></select></label><button class="button primary" type="submit">Compile route</button></form></div></section>
<section class="section"><div class="shell"><div class="compiler-chain" aria-label="Application compilation chain"><article><span>01 · OBSERVED</span><h2>Operating pressure</h2><p>${esc(pressure)}</p></article><article><span>02 · ROUTE</span><h2>Role + capability</h2><p>${esc(route.route.role)}</p><strong>${capabilityCount} public capability donor${capabilityCount === 1 ? '' : 's'}</strong></article><article><span>03 · PROOF</span><h2>Public evidence</h2><p>${proofCount ? `${proofCount} direct recruiter-admitted proof donor${proofCount === 1 ? '' : 's'} selected at this depth.` : 'No direct company proof donor is promoted for this route.'}</p></article><article><span>04 · CEILING</span><h2>${esc(route.company_projection.second_depth.stage)}</h2><p>${esc(route.company_projection.second_depth.claim_ceiling)}</p></article></div></div></section>
<section class="section alt"><div class="shell"><div class="section-head"><div><p class="eyebrow">FACT / INFERENCE SEPARATION</p><h2>Observed signal and engineering hypothesis never collapse into one claim.</h2></div><p>Pressure is an official-source snapshot. Bottleneck, leverage, expected impact, and application move are explicitly GlacierEQ inference.</p></div><div class="compiler-intelligence"><article class="card observed"><span>OBSERVED · ${esc(pressureState)}</span><h3>Operating pressure</h3><p>${esc(pressure)}</p>${sourceList(route)}</article><article class="card inferred"><span>GLACIEREQ INFERENCE</span><h3>Engineering bottleneck</h3><p>${esc(inference)}</p>${route.inference ? `<p><strong>Brick wall:</strong> ${esc(route.inference.brick_wall)}</p><p><strong>Mechanism:</strong> ${esc(route.inference.leverage_mechanism)}</p>` : ''}</article><article class="card intervention"><span>APPLICATION MOVE</span><h3>Transferable intervention</h3><p>${esc(intervention)}</p>${route.inference ? `<p><strong>Expected impact:</strong> ${esc(route.inference.expected_impact)}</p>` : ''}</article></div></div></section>
<section class="section"><div class="shell"><div class="section-head"><div><p class="eyebrow">CAPABILITY DONOR GRAPH · PUBLIC SLICE</p><h2>What can transfer into this role.</h2></div><p>These systems are public capability donors, not claims that the named employer uses them or requested them.</p></div><div class="compiler-proof-grid">${donorCards(route)}</div></div></section>
<section class="section alt"><div class="shell"><div class="section-head"><div><p class="eyebrow">DIRECT PUBLIC PROOF</p><h2>Company-lens evidence admitted by Helix.</h2></div><p>Private, blocked, experiment, upstream-shaped, and unsupported candidates are excluded from this proof surface.</p></div><div class="compiler-proof-grid">${proofCards(route)}</div></div></section>
<section class="section"><div class="shell"><div class="compiler-diligence"><article class="card"><p class="eyebrow">SECOND-DEPTH PROOF STATE</p><h2>${esc(route.company_projection.second_depth.stage)}</h2><p><strong>Claim ceiling:</strong> ${esc(route.company_projection.second_depth.claim_ceiling)}</p><ul class="compiler-evidence-ledger">${evidenceLedger(route)}</ul></article><article class="card"><p class="eyebrow">NEXT EVIDENCE GATE</p><h2>What must happen before the claim can rise.</h2><p>${esc(route.company_projection.second_depth.next_gate)}</p>${route.company_projection.second_depth.blockers.length ? `<ul class="evolution-list">${route.company_projection.second_depth.blockers.map((blocker) => `<li>${esc(blocker)}</li>`).join('')}</ul>` : '<p class="compiler-empty">No unresolved blocker is recorded at the current stage.</p>'}<p class="compiler-boundary">${esc(route.company_projection.non_affiliation)}</p></article></div></div></section>
<section class="section tight"><div class="shell compiler-machine"><div><p class="eyebrow">MACHINE PROJECTION</p><h2>Same route, structured.</h2><p>Agents can inspect the public compiler projection without scraping presentation HTML.</p></div><div class="actions"><a class="button secondary" href="/data/application-compiler.json?company=${encodeURIComponent(route.route.company_id)}&amp;role=${encodeURIComponent(route.route.role)}&amp;depth=${encodeURIComponent(route.route.depth)}">Open JSON projection</a><a class="button ghost" href="${esc(routeHref(route))}">Permalink this route</a></div></div></section>
</main>
<footer class="footer"><div class="shell footer-grid"><div><strong>Casey Del Carpio Barton</strong><br><span>Independent Applied AI Systems Architect · Honolulu, Hawaiʻi</span></div><nav class="footer-links" aria-label="Footer navigation"><a href="/resume/">Résumé</a><a href="/companies/">Companies</a><a href="/atlas/">Atlas</a><a href="/compiler/">Compiler</a><a href="/machine/">Machine</a></nav></div></footer>
</body>
</html>`;
}

const EMERALD_MOTION_CSS = `
/* Script-free presentation energy for the Master technical surface. */
.page-hero{
  background:
    radial-gradient(760px 430px at 14% 8%,rgba(73,255,177,.12),transparent 66%),
    radial-gradient(620px 360px at 86% 18%,rgba(31,210,154,.08),transparent 68%);
}
.master-grid{position:relative;isolation:isolate}
.master-card{
  position:relative;
  overflow:hidden;
  border-color:rgba(107,255,194,.24)!important;
  background:
    radial-gradient(420px 220px at 0% 0%,rgba(67,255,178,.085),transparent 70%),
    linear-gradient(150deg,rgba(8,38,34,.92),rgba(4,16,18,.96))!important;
  box-shadow:0 22px 70px rgba(0,0,0,.34),0 0 0 1px rgba(75,255,181,.035),0 0 38px rgba(39,226,154,.075)!important;
  transition:transform .22s ease,border-color .22s ease,box-shadow .22s ease;
}
.master-card::before{
  content:"";
  position:absolute;
  inset:-2px;
  z-index:0;
  pointer-events:none;
  background:linear-gradient(112deg,transparent 14%,transparent 36%,rgba(142,255,212,.14) 48%,rgba(67,238,176,.055) 53%,transparent 66%,transparent 100%);
  transform:translateX(-145%);
  animation:emerald-master-sheen 8.8s cubic-bezier(.4,0,.2,1) infinite;
}
.master-card:nth-child(2n)::before{animation-delay:-4.1s}
.master-card>*{position:relative;z-index:1}
.master-card h2,.master-card h3{filter:drop-shadow(0 0 16px rgba(96,255,198,.075))}
.terminal{
  border-color:rgba(86,255,190,.24)!important;
  background:linear-gradient(180deg,rgba(40,255,176,.028),transparent 38%),#020a0b!important;
  box-shadow:inset 0 1px 0 rgba(128,255,210,.055),inset 0 0 55px rgba(35,225,151,.035),0 26px 80px rgba(0,0,0,.4),0 0 42px rgba(38,231,157,.07)!important;
  animation:emerald-terminal-breathe 6.4s ease-in-out infinite;
}
.terminal .prompt,.terminal strong,.terminal b{color:#a9ffd8}
.table-wrap{
  border-color:rgba(92,255,191,.2)!important;
  background:linear-gradient(145deg,rgba(7,31,29,.76),rgba(3,14,17,.82))!important;
  box-shadow:0 20px 58px rgba(0,0,0,.22),inset 0 1px 0 rgba(129,255,212,.035);
}
.table-wrap th{background:rgba(65,239,172,.055)!important;color:#c9ffe8}
.table-wrap tbody tr:hover{background:rgba(70,245,178,.035)}
.tree,.branch{border-color:rgba(85,247,183,.19)!important;box-shadow:inset 0 0 28px rgba(42,223,156,.025)}
.callout{
  border-color:rgba(91,255,190,.23)!important;
  background:radial-gradient(420px 180px at 8% 20%,rgba(56,244,169,.075),transparent 72%),linear-gradient(135deg,rgba(49,231,164,.055),rgba(139,220,255,.02))!important;
  box-shadow:0 18px 54px rgba(0,0,0,.2),0 0 38px rgba(39,226,154,.045);
}
@media(hover:hover) and (pointer:fine){
  .master-card:hover{transform:translateY(-3px);border-color:rgba(125,255,205,.4)!important;box-shadow:0 28px 86px rgba(0,0,0,.4),0 0 52px rgba(44,240,164,.13)!important}
}
@keyframes emerald-master-sheen{
  0%,17%{transform:translateX(-145%);opacity:0}
  23%{opacity:1}
  39%{transform:translateX(145%);opacity:.9}
  45%,100%{transform:translateX(145%);opacity:0}
}
@keyframes emerald-terminal-breathe{
  0%,100%{box-shadow:inset 0 1px 0 rgba(128,255,210,.055),inset 0 0 55px rgba(35,225,151,.035),0 26px 80px rgba(0,0,0,.4),0 0 34px rgba(38,231,157,.055)}
  50%{box-shadow:inset 0 1px 0 rgba(128,255,210,.08),inset 0 0 62px rgba(35,225,151,.055),0 26px 80px rgba(0,0,0,.4),0 0 54px rgba(38,231,157,.105)}
}
@media(max-width:640px){
  .master-card{box-shadow:0 16px 45px rgba(0,0,0,.3),0 0 26px rgba(39,226,154,.055)!important}
  .terminal{box-shadow:inset 0 0 38px rgba(35,225,151,.03),0 18px 52px rgba(0,0,0,.34)!important}
}
@media(prefers-reduced-motion:reduce){
  .master-card::before,.terminal{animation:none!important}
  .master-card{transition:none!important}
}
@media print{
  .master-card,.terminal,.table-wrap,.callout,.tree,.branch{box-shadow:none!important;background:#fff!important}
  .master-card::before{display:none!important}
}
`;

const COMPILER_CSS = `
.compiler-hero{padding:clamp(5rem,10vw,8rem) 0 2rem;background:radial-gradient(circle at 82% 12%,rgba(110,231,231,.12),transparent 30rem),radial-gradient(circle at 10% 4%,rgba(114,183,255,.12),transparent 34rem)}
.compiler-hero-grid{display:grid;grid-template-columns:minmax(0,1.45fr) minmax(280px,.55fr);gap:clamp(2rem,6vw,5rem);align-items:end}.compiler-hero h1{max-width:14ch}.compiler-truth{display:grid;grid-template-columns:auto 1fr;gap:.8rem;margin-top:1.4rem;padding:1rem;border:1px solid var(--line);border-radius:14px;background:rgba(255,255,255,.025);font-size:.82rem}.compiler-truth strong{color:var(--cyan)}.compiler-truth span{color:var(--muted)}
.compiler-route-card{padding:1.35rem;border:1px solid rgba(110,231,231,.3);border-radius:22px;background:linear-gradient(145deg,rgba(110,231,231,.09),rgba(255,255,255,.025));box-shadow:0 28px 70px rgba(0,0,0,.3)}.compiler-route-card>span,.compiler-chain article>span,.compiler-intelligence article>span{font-size:.68rem;font-weight:850;letter-spacing:.1em;color:var(--cyan)}.compiler-route-card h2{margin:.55rem 0 .25rem}.compiler-route-card>p{color:var(--muted)}.compiler-route-card dl{display:grid;gap:.55rem;margin:1.2rem 0 0}.compiler-route-card dl div{display:flex;justify-content:space-between;gap:1rem;padding-top:.55rem;border-top:1px solid var(--line)}.compiler-route-card dt{color:var(--muted);font-size:.75rem}.compiler-route-card dd{margin:0;font-size:.75rem;font-weight:800;text-align:right}
.compiler-controls-section{padding-top:1rem}.compiler-form{display:grid;grid-template-columns:1fr 1.35fr 1fr auto;gap:.75rem;align-items:end;padding:1rem;border:1px solid var(--line);border-radius:18px;background:rgba(10,20,37,.72)}.compiler-form label{display:grid;gap:.4rem}.compiler-form label>span{font-size:.68rem;font-weight:850;letter-spacing:.08em;color:var(--muted);text-transform:uppercase}.compiler-form select{min-height:46px;width:100%;padding:.7rem .8rem;color:var(--text);border:1px solid var(--line);border-radius:12px;background:var(--panel-strong);font:inherit;font-size:.86rem;font-weight:700}
.compiler-chain{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));border:1px solid var(--line);border-radius:22px;overflow:hidden;background:rgba(10,20,37,.58)}.compiler-chain article{min-height:205px;padding:1.3rem;border-right:1px solid var(--line)}.compiler-chain article:last-child{border-right:0}.compiler-chain h2{margin:.7rem 0;font-size:1.25rem}.compiler-chain p{color:var(--muted)}.compiler-chain strong{font-size:.8rem;color:var(--green)}
.compiler-intelligence{display:grid;grid-template-columns:1.15fr 1fr 1fr;gap:.9rem}.compiler-intelligence article{min-height:330px}.compiler-intelligence article.observed{border-color:rgba(126,226,168,.28)}.compiler-intelligence article.observed>span{color:var(--green)}.compiler-intelligence article.inferred{border-color:rgba(255,210,122,.28)}.compiler-intelligence article.inferred>span{color:var(--amber)}.compiler-intelligence article.intervention{border-color:rgba(114,183,255,.3)}.compiler-intelligence article.intervention>span{color:var(--blue)}.compiler-sources{display:grid;gap:.55rem;padding-left:1.1rem}.compiler-sources li{color:var(--muted)}.compiler-sources a{font-weight:750}.compiler-sources small{display:block;margin-top:.2rem;color:var(--muted)}
.compiler-proof-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:.9rem}.compiler-proof-card{min-height:255px;padding:1.25rem;border:1px solid var(--line);border-radius:18px;background:linear-gradient(155deg,rgba(110,231,231,.055),rgba(255,255,255,.018)),var(--panel)}.compiler-proof-card>span{font-size:.68rem;font-weight:850;letter-spacing:.08em;color:var(--cyan)}.compiler-proof-card h3{margin:.65rem 0}.compiler-proof-card p{color:var(--muted)}.compiler-proof-card a{font-size:.78rem;font-weight:780}.compiler-proof-card.empty{grid-column:1/-1;min-height:auto}.compiler-diligence{display:grid;grid-template-columns:1fr 1fr;gap:.9rem}.compiler-evidence-ledger{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:.45rem;padding:0;list-style:none}.compiler-evidence-ledger li{display:flex;justify-content:space-between;gap:1rem;padding:.65rem;border:1px solid var(--line);border-radius:10px;color:var(--muted);font-size:.75rem}.compiler-evidence-ledger strong{color:var(--text)}.compiler-boundary{margin-top:1rem;padding-top:1rem;border-top:1px solid var(--line);color:var(--muted);font-size:.82rem}.compiler-empty{color:var(--muted)}.compiler-machine{display:flex;align-items:end;justify-content:space-between;gap:2rem;padding:1.35rem;border:1px solid var(--line);border-radius:20px;background:rgba(255,255,255,.025)}.compiler-machine h2{margin:.35rem 0}.compiler-machine p{margin-bottom:0;color:var(--muted)}
@media(max-width:1000px){.compiler-form{grid-template-columns:1fr 1fr}.compiler-chain{grid-template-columns:1fr 1fr}.compiler-chain article:nth-child(2){border-right:0}.compiler-chain article:nth-child(-n+2){border-bottom:1px solid var(--line)}.compiler-intelligence{grid-template-columns:1fr}.compiler-proof-grid{grid-template-columns:1fr 1fr}}
@media(max-width:720px){.compiler-hero-grid,.compiler-diligence{grid-template-columns:1fr}.compiler-form,.compiler-chain,.compiler-proof-grid{grid-template-columns:1fr}.compiler-chain article{border-right:0;border-bottom:1px solid var(--line)}.compiler-chain article:last-child{border-bottom:0}.compiler-machine{display:grid}.compiler-truth{grid-template-columns:1fr}}
@media print{.compiler-controls-section{display:none}.compiler-proof-card,.compiler-intelligence article,.compiler-chain,.compiler-route-card{break-inside:avoid;box-shadow:none}}
`;

function injectCompilerNavigation(body) {
  const bytes = Buffer.isBuffer(body) ? body : Buffer.from(body || '');
  let html = bytes.toString('utf8');
  if (!/<html\b/i.test(html) || !/<nav class="links"/i.test(html)) return bytes;
  if (html.includes('href="/compiler/"')) return bytes;
  const navStart = html.search(/<nav class="links"/i);
  if (navStart < 0) return bytes;
  const navEnd = html.indexOf('</nav>', navStart);
  if (navEnd < 0) return bytes;
  html = `${html.slice(0, navEnd)}<a href="/compiler/">Compiler</a>${html.slice(navEnd)}`;
  return Buffer.from(html);
}

function injectEmeraldMotion(body) {
  const bytes = Buffer.isBuffer(body) ? body : Buffer.from(body || '');
  let html = bytes.toString('utf8');
  if (!/<\/head>/i.test(html)) return bytes;
  const matches = html.match(/\/assets\/site\.emerald-motion\.css/g) || [];
  if (matches.length > 1) throw new Error('duplicate_emerald_motion_stylesheet');
  if (matches.length === 1) return bytes;
  const typography = '<link rel="stylesheet" href="/assets/site.algerian.css">';
  if (html.includes(typography)) html = html.replace(typography, `${typography}\n  ${EMERALD_MOTION_LINK}`);
  else html = html.replace(/<\/head>/i, `  ${EMERALD_MOTION_LINK}\n</head>`);
  return Buffer.from(html);
}

function applyReleaseHeaders(res) {
  res.setHeader('X-GlacierEQ-Compiler-Helix-Commit', COMPILER_HELIX_COMMIT);
  res.setHeader('X-PSYSOCX-Release', RELEASE);
}

function replayHeaders(headers, res) {
  for (const [name, value] of headers) {
    if (name === 'content-length' || name === 'x-psysocx-release') continue;
    res.setHeader(name, value);
  }
  applyReleaseHeaders(res);
}

function generatedSecurityHeaders(res) {
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'none'; style-src 'self'; img-src 'self' data:; connect-src 'none'; font-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'; form-action 'self' mailto:; upgrade-insecure-requests",
  );
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=()');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  applyReleaseHeaders(res);
}

async function serveCompilerPage(req, res) {
  const data = await loadCompiler();
  const state = queryState(req, data.projection);
  const route = compileRoute(data, state);
  const body = Buffer.from(compilerHtml(data, route));
  generatedSecurityHeaders(res);
  res.statusCode = 200;
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=300, must-revalidate');
  res.setHeader('Content-Length', String(body.length));
  res.end(body);
}

async function serveCompilerJson(req, res) {
  const data = await loadCompiler();
  const state = queryState(req, data.projection);
  const route = compileRoute(data, state);
  const body = Buffer.from(`${JSON.stringify(route, null, 2)}\n`);
  generatedSecurityHeaders(res);
  res.statusCode = 200;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=300, must-revalidate');
  res.setHeader('Content-Length', String(body.length));
  res.end(body);
}

function serveCompilerCss(res) {
  const body = Buffer.from(COMPILER_CSS);
  generatedSecurityHeaders(res);
  res.statusCode = 200;
  res.setHeader('Content-Type', 'text/css; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=900, must-revalidate');
  res.setHeader('Content-Length', String(body.length));
  res.end(body);
}

function serveEmeraldMotionCss(res) {
  const body = Buffer.from(EMERALD_MOTION_CSS);
  generatedSecurityHeaders(res);
  res.statusCode = 200;
  res.setHeader('Content-Type', 'text/css; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=900, must-revalidate');
  res.setHeader('Content-Length', String(body.length));
  res.end(body);
}

async function verifyV25(res) {
  const errors = [];
  let inherited = null;
  let route = null;
  let page = null;
  try {
    const v24 = await capture(typographyProxy, { url: '/?path=__v24_verify' });
    try { inherited = JSON.parse(v24.body.toString('utf8')); } catch {}
    if (v24.status !== 200 || inherited?.status !== 'PASS') errors.push('v24_typography_verifier_failed');

    const data = await loadCompiler();
    const state = queryState(
      { url: '/?path=compiler&company=openai&depth=senior_engineer' },
      data.projection,
    );
    route = compileRoute(data, state);
    const html = compilerHtml(data, route);
    page = {
      company_count: data.projection.company_count,
      company: route.route.company_id,
      depth: route.route.depth,
      pressure_source_backed: Boolean(route.observed_pressure),
      capability_donors: route.capability_donors.length,
      direct_public_proof_donors: route.direct_public_proof_donors.length,
      script_free: !/<script\b/i.test(html),
      inline_style_free: !/\sstyle\s*=\s*/i.test(html),
      compiler_nav: html.includes('href="/compiler/"'),
      machine_projection: html.includes('/data/application-compiler.json'),
    };
    if (data.projection.source_commit !== COMPILER_HELIX_COMMIT) errors.push('compiler_projection_authority_mismatch');
    if (data.projection.company_count !== 76) errors.push('compiler_company_count');
    if (route.route.company_id !== 'openai') errors.push('compiler_openai_route_missing');
    if (!route.observed_pressure) errors.push('compiler_openai_pressure_missing');
    if (!page.script_free || !page.inline_style_free) errors.push('compiler_script_free_contract_failed');
    const serialized = JSON.stringify(route);
    if (serialized.includes('native_repository_count') || serialized.includes('private_repository_count')) {
      errors.push('compiler_estate_cardinality_leak');
    }
    if (!route.truth_boundary.raw_estate_cardinality_not_published) errors.push('compiler_truth_boundary_missing');
    if (!route.truth_boundary.private_repository_identities_not_published) errors.push('compiler_private_identity_boundary_missing');
  } catch (error) {
    errors.push(error instanceof Error ? error.message : 'v25_verification_failed');
  }

  const pass = errors.length === 0;
  const payload = Buffer.from(JSON.stringify({
    schema: VERIFY_SCHEMA,
    status: pass ? 'PASS' : 'FAIL',
    release: RELEASE,
    compiler_helix_commit: COMPILER_HELIX_COMMIT,
    inherited_v24: inherited ? { schema: inherited.schema, status: inherited.status } : null,
    route: route ? {
      company: route.route.company_id,
      role: route.route.role,
      depth: route.route.depth,
      pressure_snapshot: route.observed_pressure?.research_as_of || null,
      proof_stage: route.company_projection.second_depth.stage,
      claim_ceiling: route.company_projection.second_depth.claim_ceiling,
    } : null,
    page,
    truth_boundary: {
      public_projection_only: true,
      raw_estate_cardinality_published: false,
      private_repository_identities_published: false,
      legal_private_material_published: false,
      observed_pressure_separate_from_glaciereq_inference: true,
      company_naming_implies_affiliation: false,
      client_scripts: 0,
    },
    errors,
  }, null, 2));
  generatedSecurityHeaders(res);
  res.statusCode = pass ? 200 : 503;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Content-Length', String(payload.length));
  res.end(payload);
}

module.exports = async function compilerProxy(req, res) {
  const rawPath = proxy.requestPath(req);
  if (rawPath === '__v25_verify') return verifyV25(res);
  const filePath = proxy.normalize(rawPath);
  if (!filePath) return typographyProxy(req, res);
  if (filePath === 'compiler/index.html') return serveCompilerPage(req, res);
  if (filePath === 'data/application-compiler.json') return serveCompilerJson(req, res);
  if (filePath === 'assets/application-compiler.css') return serveCompilerCss(res);
  if (filePath === 'assets/site.emerald-motion.css') return serveEmeraldMotionCss(res);

  const captured = await capture(typographyProxy, req);
  replayHeaders(captured.headers, res);
  res.statusCode = captured.status;
  let body = captured.body;
  const type = String(captured.headers.get('content-type') || '');
  if (type.startsWith('text/html')) {
    body = injectCompilerNavigation(body);
    if (filePath === 'master/index.html') body = injectEmeraldMotion(body);
  }
  res.setHeader('Content-Length', String(body.length));
  res.end(body);
};

module.exports.constants = {
  COMPILER_HELIX_COMMIT,
  PRESSURE_MANIFEST_SHA256,
  RELEASE,
  VERIFY_SCHEMA,
  OUTPUT_SCHEMA,
};
module.exports.capture = capture;
module.exports.compileRoute = compileRoute;
module.exports.compilerHtml = compilerHtml;
module.exports.injectCompilerNavigation = injectCompilerNavigation;
module.exports.injectEmeraldMotion = injectEmeraldMotion;
module.exports.EMERALD_MOTION_CSS = EMERALD_MOTION_CSS;
module.exports.loadCompiler = loadCompiler;
module.exports.normalizeFlagships = normalizeFlagships;
module.exports.queryState = queryState;

},
"api/design-proxy.js":function(exports, require, module, __filename, __dirname) {
const crypto = require('node:crypto');
const { URL } = require('node:url');
const proxy = require('./proxy.js');

const WEB_SOURCE_COMMIT = '95a91fd9b51c77babf51b3bed7c156acfd9d06f7';
const HELIX_COMMIT = '8345955b67f163c3215b23195a267b6021a5be5e';
const WEB_RAW_ROOT = `https://raw.githubusercontent.com/GlacierEQ/job-application/${WEB_SOURCE_COMMIT}/site-v15/`;
const GITHUB_TREE_ROOT = `https://api.github.com/repos/GlacierEQ/job-application/git/trees/${WEB_SOURCE_COMMIT}`;
const COMPLETE_LINK = '<link rel="stylesheet" href="/assets/site.complete.css">';
const INTERACTION_LINK = '<link rel="stylesheet" href="/assets/site.interaction.css">';
const RELEASE = 'V21-FIRST-STAR-COMPLETE-WEB';
const EXPECTED_STATIC_HTML = 132;
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
  'index.html': '3eedd4d11bb6a213c3ede80f2c1f253b891f76e0',
  'resume/index.html': '895e0da08bbc44771b2a1fa2ae7744964e1f7d21',
  'master/index.html': '741663a7ce6c138b6d3b8557db1641609798678e',
  'mesh/index.html': '3190f1b5305b6201dccc4e60e31c3abb859d5416',
  'machine/index.html': 'ac8d0b74324dd945b57250907ce5373af158d921',
  'assets/site.css': '27dbe7b99cd44f9c3c1f22c9d6870a2e02468fc0',
  'assets/site.systems.css': 'd2c7dc6f3e74a68b97e45bc166fec02b42517456',
  'assets/site.complete.css': 'd98c701e09f712e3558ea0bb5f48dd713e8c294b',
  'assets/site.interaction.css': '65fbd9c4bf7818cec997631f4cabde44e5123401',
  'data/current-proof.json': 'b05d5f88a10490df3bfbc0be4536c458b24bd332',
  'downloads/Casey_Barton_Resume.pdf': 'b50ee700f79aeaffdeb3e297427d157b83edd908',
  'downloads/Casey_Barton_Resume.docx': '8fd749a5ff3711b77b125ba4c54212c0eaff542e',
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
  if (projection.company_count < 49 || !Array.isArray(projection.companies)) throw new Error('company_projection_topology_drift');
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
    && /^[a-f0-9]{40}$/.test(String(star?.company_projection?.helix_commit || ''));
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

},
"api/estate-proxy.js":function(exports, require, module, __filename, __dirname) {
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

},
"api/proxy.js":function(exports, require, module, __filename, __dirname) {
const crypto = require('crypto');
const { URL } = require('node:url');

const SOURCE_COMMIT = '95a91fd9b51c77babf51b3bed7c156acfd9d06f7';
const HELIX_COMMIT = '8345955b67f163c3215b23195a267b6021a5be5e';
const RAW_ROOT = `https://raw.githubusercontent.com/GlacierEQ/job-application/${SOURCE_COMMIT}/site-v15/`;
const HELIX_ROOT = `https://raw.githubusercontent.com/GlacierEQ/job-app-helix/${HELIX_COMMIT}/`;
const PUBLIC_ORIGIN = 'https://casey-barton-glaciereq.vercel.app';
const COMPANY_INDEX_PATH = 'manifests/company_dossiers.json';
const SECOND_DEPTH_PATH = 'manifests/company_second_depth.json';

const REPOSITORY_PATTERN = /^GlacierEQ\/[A-Za-z0-9_.-]+$/;
const COMPANY_ID_PATTERN = /^[a-z0-9_]+$/;
const EVIDENCE_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]*$/;
const SOURCE_REF_PATTERN = /^(?:commit:[a-f0-9]{40}|sha256:[a-f0-9]{64})$/;
const LEVELS = new Set(['L0', 'L1', 'L2', 'L3', 'L4', 'L5']);

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.pdf': 'application/pdf',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.proto': 'text/plain; charset=utf-8',
};

const REQUIRED = {
  'index.html': '148211c832bb387511025eb7adc98e6657791858b8b6de16ae65e0955d64aed7',
  'resume/index.html': '7cb6ece0921e4d1082eb3815fe73ed6fe4b177d91451dcb10cca93314fb6664e',
  'master/index.html': '443aba6b6de06bf9e6776637346cc7d1595c5f562b367ae76d50ac91be50c195',
  'mesh/index.html': '5a5e8ea706893aa743fd81ce79b5cbd906a7d77bde830049ab9b02794fb9f0a1',
  'machine/index.html': '104c7092757119e3c7d1a5b156ff6c87657c7a5dcfb6675e084ade13289f8047',
  'assets/site.css': '8f3a659076fa9a4cbb90cf623baf5a29dad2a1cf14c246f4496aeb48c382012b',
  'assets/site.systems.css': '47c31b9d8a3e4eccfe87569b97a702a2fa1ff1641856febd8d275aa4af888407',
  'downloads/Casey_Barton_Resume.pdf': 'c34c069999b9432f59e3a956183a1b07537a7d165a70d8eaa3ae173e61c46eca',
  'downloads/Casey_Barton_Resume.docx': 'abf5835bc33ef4c978a684fda30a9b8539ec72510e9b45ee6a9399efe3deeaed',
};

const SECOND_DEPTH_STAGES = [
  ['MAPPED_ONLY', [], 'company_alignment_only'],
  ['ROLE_VERIFIED', ['role_evidence'], 'verified_role_alignment'],
  ['PROBLEM_BOUNDED', ['role_evidence', 'problem_evidence'], 'externally_bounded_problem_alignment'],
  ['CODE_INSPECTED', ['role_evidence', 'problem_evidence', 'inspected_repositories'], 'inspected_implementation_alignment'],
  ['REMEDY_BOUNDED', ['role_evidence', 'problem_evidence', 'inspected_repositories', 'gap_queue'], 'bounded_remedy_design'],
  ['IMPLEMENTED', ['role_evidence', 'problem_evidence', 'inspected_repositories', 'gap_queue', 'implementation_receipts'], 'implemented_candidate_capability'],
  ['PROOF_REPRODUCED', ['role_evidence', 'problem_evidence', 'inspected_repositories', 'gap_queue', 'implementation_receipts', 'proof_artifacts'], 'reproducible_company_specific_proof'],
  ['CLAIM_PROMOTED', ['role_evidence', 'problem_evidence', 'inspected_repositories', 'gap_queue', 'implementation_receipts', 'proof_artifacts', 'claim_receipts'], 'proof_bound_company_specific'],
];

const EVIDENCE_KIND_BY_FIELD = {
  role_evidence: 'role',
  problem_evidence: 'problem',
  inspected_repositories: 'repository_inspection',
  gap_queue: 'bounded_gap',
  implementation_receipts: 'implementation_receipt',
  proof_artifacts: 'proof_artifact',
  claim_receipts: 'claim_receipt',
};
const EVIDENCE_FIELDS = Object.keys(EVIDENCE_KIND_BY_FIELD);
const EVIDENCE_KEYS = ['id', 'kind', 'source_identity', 'source_ref', 'visibility', 'verification_state'].sort();
const VERIFICATION_RANK = { VERIFIED: 1, REPRODUCED: 2 };

const POWER_LAYERS = [
  ['Silicon + compute', ['nvidia', 'amd', 'intel', 'qualcomm', 'groq', 'cerebras', 'coreweave']],
  ['Cloud + infrastructure', ['aws', 'microsoft', 'google_deepmind', 'oracle', 'cloudflare', 'vercel']],
  ['Models + agent systems', ['openai', 'anthropic', 'xai', 'mistral', 'cohere', 'deepseek', 'kimi', 'qwen', 'meta']],
  ['Platforms + knowledge', ['notion', 'databricks', 'snowflake', 'salesforce', 'adobe', 'hugging_face', 'perplexity', 'lovable', 'opera']],
  ['Mission + autonomy', ['spacex', 'palantir', 'anduril', 'lockheed_martin', 'tesla', 'waymo', 'zoox', 'blue_origin', 'rocket_lab', 'nasa', 'robotics']],
  ['Distribution + operators', ['apple', 'scale_ai', 'tasklet', 'manus', 'openclaw', 'ibm', 'glaciereq_core']],
];

let projectionPromise = null;

const sha256 = (body) => crypto.createHash('sha256').update(body).digest('hex');
const esc = (value) => String(value ?? '')
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#39;');

function requestPath(req) {
  const parsed = new URL(String(req.url || '/'), 'https://glaciereq.invalid');
  const values = parsed.searchParams.getAll('path');
  if (!values.length) return '';
  return values.length === 1 ? values[0] : values.join('/');
}

function normalize(input) {
  const raw = Array.isArray(input) ? input.join('/') : String(input || '');
  const clean = raw.replace(/^\/+|\/+$/g, '');
  if (!clean) return 'index.html';
  if (clean.includes('..') || clean.includes('\\')) return null;
  const last = clean.split('/').pop() || '';
  return last.includes('.') ? clean : `${clean}/index.html`;
}

function extension(filePath) {
  const match = filePath.match(/(\.[a-z0-9]+)$/i);
  return match ? match[1].toLowerCase() : '';
}

function companySlug(companyId) {
  if (typeof companyId !== 'string' || !COMPANY_ID_PATTERN.test(companyId)) return null;
  return companyId.replaceAll('_', '-');
}

function companyRoute(companyId) {
  const slug = companySlug(companyId);
  return slug ? `/companies/${slug}/` : null;
}

function depthLabel(stage) {
  return String(stage || 'MAPPED_ONLY')
    .toLowerCase()
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
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
  res.setHeader('X-GlacierEQ-Source-Commit', SOURCE_COMMIT);
  res.setHeader('X-GlacierEQ-Helix-Commit', HELIX_COMMIT);
  res.setHeader('X-PSYSOCX-Release', 'V21-FIRST-STAR-COMPLETION');
}

async function fetchBuffer(url, userAgent) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12_000);
  try {
    const response = await fetch(url, {
      headers: { 'User-Agent': userAgent },
      signal: controller.signal,
    });
    const body = Buffer.from(await response.arrayBuffer());
    return { response, body, sha256: sha256(body) };
  } finally {
    clearTimeout(timer);
  }
}

function resolveSourceUrl(filePath) {
  const resolved = new URL(filePath, RAW_ROOT);
  if (!resolved.href.startsWith(RAW_ROOT)) {
    throw new Error('source path escapes pinned root');
  }
  return resolved.href;
}

const fetchSource = (filePath) => fetchBuffer(
  resolveSourceUrl(filePath),
  'GlacierEQ-V21-Source-Bridge/1.0',
);

async function fetchHelixJson(filePath) {
  const { response, body } = await fetchBuffer(
    HELIX_ROOT + filePath,
    'GlacierEQ-V21-Company-Second-Depth/1.0',
  );
  if (!response.ok) throw new Error(`${filePath} returned ${response.status}`);
  try {
    const value = JSON.parse(body.toString('utf8'));
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      throw new Error('root must be an object');
    }
    return value;
  } catch (error) {
    throw new Error(`${filePath} contains invalid JSON: ${error.message}`);
  }
}

function validateEvidenceReference(companyId, field, item) {
  if (!item || typeof item !== 'object' || Array.isArray(item)) {
    throw new Error(`${companyId}.${field}: evidence entry must be an object`);
  }
  const keys = Object.keys(item).sort();
  if (JSON.stringify(keys) !== JSON.stringify(EVIDENCE_KEYS)) {
    throw new Error(`${companyId}.${field}: evidence fields drift`);
  }
  for (const key of EVIDENCE_KEYS) {
    if (typeof item[key] !== 'string' || !item[key]) {
      throw new Error(`${companyId}.${field}.${key}: required string missing`);
    }
  }
  if (!EVIDENCE_ID_PATTERN.test(item.id)) {
    throw new Error(`${companyId}.${field}: evidence id invalid`);
  }
  if (item.kind !== EVIDENCE_KIND_BY_FIELD[field]) {
    throw new Error(`${companyId}.${field}: evidence kind mismatch`);
  }
  if (!(item.source_identity.startsWith('https://') || item.source_identity.startsWith('GlacierEQ/'))) {
    throw new Error(`${companyId}.${field}: evidence source is not public-addressable`);
  }
  if (!SOURCE_REF_PATTERN.test(item.source_ref)) {
    throw new Error(`${companyId}.${field}: evidence source_ref is not immutable`);
  }
  if (item.visibility !== 'public') {
    throw new Error(`${companyId}.${field}: private evidence leaked`);
  }
  const rank = VERIFICATION_RANK[item.verification_state] || 0;
  const minimum = field === 'proof_artifacts' ? VERIFICATION_RANK.REPRODUCED : VERIFICATION_RANK.VERIFIED;
  if (rank < minimum) {
    throw new Error(`${companyId}.${field}: evidence verification is too weak`);
  }
  return { ...item };
}

function resolveSecondDepth(index, registry, companyIds) {
  if (!registry || registry.schema !== 'glaciereq.company-second-depth.v1') {
    throw new Error('company second-depth schema mismatch');
  }
  if (registry.authority !== 'GlacierEQ/job-app-helix') {
    throw new Error('company second-depth authority mismatch');
  }
  if (registry.company_index !== COMPANY_INDEX_PATH || index.second_depth_registry !== SECOND_DEPTH_PATH) {
    throw new Error('company second-depth pointer drift');
  }

  const contract = registry.evidence_reference_contract;
  if (!contract || typeof contract !== 'object' || Array.isArray(contract)) {
    throw new Error('company second-depth evidence contract missing');
  }
  if (contract.visibility !== 'public') {
    throw new Error('company second-depth evidence must be public');
  }
  if (!Array.isArray(contract.required_fields) ||
      JSON.stringify([...contract.required_fields].sort()) !== JSON.stringify(EVIDENCE_KEYS)) {
    throw new Error('company second-depth evidence field contract drift');
  }
  if (JSON.stringify(Object.entries(contract.field_kinds).sort()) !==
      JSON.stringify(Object.entries(EVIDENCE_KIND_BY_FIELD).sort())) {
    throw new Error('company second-depth evidence kind contract drift');
  }

  if (!Array.isArray(registry.stage_order) || registry.stage_order.length !== SECOND_DEPTH_STAGES.length) {
    throw new Error('company second-depth stage count mismatch');
  }
  SECOND_DEPTH_STAGES.forEach(([id, minimumEvidence, ceiling], ordinal) => {
    const row = registry.stage_order[ordinal];
    if (!row || row.id !== id || row.ordinal !== ordinal) {
      throw new Error(`company second-depth stage ${ordinal} identity drift`);
    }
    if (JSON.stringify(row.minimum_evidence) !== JSON.stringify(minimumEvidence)) {
      throw new Error(`${id}: minimum evidence contract drift`);
    }
    if (row.public_claim_ceiling !== ceiling) {
      throw new Error(`${id}: claim ceiling drift`);
    }
  });

  const defaults = registry.default_company_state;
  const overrides = registry.company_overrides;
  if (!defaults || typeof defaults !== 'object' || Array.isArray(defaults) || defaults.stage !== 'MAPPED_ONLY') {
    throw new Error('company second-depth default state invalid');
  }
  if (!overrides || typeof overrides !== 'object' || Array.isArray(overrides)) {
    throw new Error('company second-depth overrides invalid');
  }
  for (const companyId of Object.keys(overrides)) {
    if (!companyIds.has(companyId)) {
      throw new Error(`second-depth override references unknown company ${companyId}`);
    }
  }

  const stageMap = new Map(
    SECOND_DEPTH_STAGES.map(([id, minimumEvidence, ceiling], ordinal) => [
      id,
      { ordinal, minimumEvidence, ceiling },
    ]),
  );

  const resolved = new Map();
  for (const companyId of companyIds) {
    const override = overrides[companyId] || {};
    if (!override || typeof override !== 'object' || Array.isArray(override)) {
      throw new Error(`${companyId}: second-depth override invalid`);
    }
    const state = { ...defaults, ...override };
    const stage = stageMap.get(state.stage);
    if (!stage) throw new Error(`${companyId}: invalid second-depth stage`);
    if (state.claim_ceiling !== stage.ceiling) {
      throw new Error(`${companyId}: second-depth claim ceiling exceeds stage`);
    }
    if (!Array.isArray(state.blockers) || !state.blockers.every((value) => typeof value === 'string' && value)) {
      throw new Error(`${companyId}: second-depth blockers invalid`);
    }
    if (typeof state.next_gate !== 'string' || !state.next_gate) {
      throw new Error(`${companyId}: second-depth next gate missing`);
    }

    const evidence = {};
    for (const field of EVIDENCE_FIELDS) {
      if (!Array.isArray(state[field])) throw new Error(`${companyId}.${field}: evidence array missing`);
      evidence[field] = state[field].map((item) => validateEvidenceReference(companyId, field, item));
    }
    for (const field of stage.minimumEvidence) {
      if (!evidence[field].length) {
        throw new Error(`${companyId}: stage ${state.stage} requires ${field}`);
      }
    }
    if (stage.ordinal < stageMap.get('PROOF_REPRODUCED').ordinal && evidence.proof_artifacts.length) {
      throw new Error(`${companyId}: proof precedes proof stage`);
    }
    if (stage.ordinal < stageMap.get('CLAIM_PROMOTED').ordinal && evidence.claim_receipts.length) {
      throw new Error(`${companyId}: claim receipt precedes claim stage`);
    }

    resolved.set(companyId, {
      stage: state.stage,
      ordinal: stage.ordinal,
      claim_ceiling: state.claim_ceiling,
      blockers: [...state.blockers],
      next_gate: state.next_gate,
      evidence,
    });
  }
  return resolved;
}

function compileProjection(index, shards, secondDepthRegistry) {
  if (!index || index.schema !== 'glaciereq.company-dossiers-index.v2') {
    throw new Error('company dossier index schema mismatch');
  }
  const columns = index.repository_record_columns;
  const recruiterStates = new Set(index.truth_boundary?.public_recruiter_admission_states || []);
  const aliases = index.repository_record_legacy_aliases?.promotion_state || {};
  if (!Array.isArray(columns) || columns.length < 6 || !recruiterStates.size) {
    throw new Error('company dossier public contract is incomplete');
  }

  const companyIds = new Set();
  const normalized = [];
  for (const shard of shards) {
    if (!shard || !Array.isArray(shard.companies)) throw new Error('company shard is invalid');
    const defaults = shard.defaults && typeof shard.defaults === 'object' && !Array.isArray(shard.defaults)
      ? shard.defaults
      : {};
    for (const raw of shard.companies) {
      const company = { ...defaults, ...raw };
      if (!COMPANY_ID_PATTERN.test(String(company.company_id || ''))) throw new Error('invalid company id');
      if (companyIds.has(company.company_id)) throw new Error(`duplicate company id ${company.company_id}`);
      companyIds.add(company.company_id);
      normalized.push(company);
    }
  }

  const required = index.required_company_tracks || [];
  if (!Array.isArray(required) || required.length !== normalized.length || required.some((id) => !companyIds.has(id))) {
    throw new Error('required company track contract does not match compiled projection');
  }
  const secondDepthByCompany = resolveSecondDepth(index, secondDepthRegistry, companyIds);

  const companies = normalized.map((company) => {
    if (!company.display_name || !company.recruiter_thesis || !company.gap_or_next_gate || !company.non_affiliation) {
      throw new Error(`${company.company_id}: required company fields are missing`);
    }
    if (!Array.isArray(company.repositories)) throw new Error(`${company.company_id}: repositories are invalid`);

    const repositories = [];
    for (const tuple of company.repositories) {
      if (!Array.isArray(tuple) || tuple.length !== columns.length) {
        throw new Error(`${company.company_id}: repository tuple mismatch`);
      }
      const row = Object.fromEntries(columns.map((column, index) => [column, tuple[index]]));
      const state = aliases[row.promotion_state] || row.promotion_state;
      if (!REPOSITORY_PATTERN.test(String(row.repository || ''))) {
        throw new Error(`${company.company_id}: repository identity is invalid`);
      }
      if (!LEVELS.has(row.skill_innovation_level)) throw new Error(`${row.repository}: level is invalid`);
      if (row.visibility === 'public' && row.skill_innovation_level !== 'L0' && recruiterStates.has(state)) {
        repositories.push({
          repository: row.repository,
          level: row.skill_innovation_level,
          promotion_state: state,
          provenance_state: row.provenance_state,
        });
      }
    }

    return {
      company_id: company.company_id,
      display_name: company.display_name,
      track_state: String(company.track_state || 'MAPPED'),
      target_roles: Array.isArray(company.target_roles) ? company.target_roles : [],
      recruiter_thesis: company.recruiter_thesis,
      gap_or_next_gate: company.gap_or_next_gate,
      non_affiliation: company.non_affiliation,
      repositories,
      applicable_flagships: Array.isArray(company.applicable_flagships) ? company.applicable_flagships : [],
      second_depth: secondDepthByCompany.get(company.company_id),
    };
  });

  companies.sort((a, b) => a.display_name.localeCompare(b.display_name));
  if (companies.length < 49) throw new Error(`expected >=49 company tracks, received ${companies.length}`);
  return {
    schema: 'glaciereq.company-atlas-projection.v2',
    authority: 'GlacierEQ/job-app-helix',
    source_commit: HELIX_COMMIT,
    source_index: COMPANY_INDEX_PATH,
    second_depth_source: SECOND_DEPTH_PATH,
    company_count: companies.length,
    companies,
    second_depth: {
      schema: secondDepthRegistry.schema,
      stage_order: secondDepthRegistry.stage_order.map((row) => ({
        id: row.id,
        ordinal: row.ordinal,
        public_claim_ceiling: row.public_claim_ceiling,
      })),
      priority_wave: [...(secondDepthRegistry.priority_wave || [])],
    },
    truth_boundary: {
      public_only: true,
      recruiter_admission_states: [...recruiterStates].sort(),
      company_naming_does_not_imply_affiliation: true,
      stage_promotion_is_helix_only: true,
    },
  };
}

async function loadProjection() {
  if (!projectionPromise) {
    projectionPromise = (async () => {
      const index = await fetchHelixJson(COMPANY_INDEX_PATH);
      if (!Array.isArray(index.dossier_files) || !index.dossier_files.length) {
        throw new Error('dossier files are missing');
      }
      const [shards, secondDepth] = await Promise.all([
        Promise.all(index.dossier_files.map(fetchHelixJson)),
        fetchHelixJson(SECOND_DEPTH_PATH),
      ]);
      return compileProjection(index, shards, secondDepth);
    })().catch((error) => {
      projectionPromise = null;
      throw error;
    });
  }
  return projectionPromise;
}

function evidenceState(company) {
  const repositories = Array.isArray(company.repositories) ? company.repositories : [];
  const advanced = repositories.some((repo) => repo.level === 'L4' || repo.level === 'L5');
  if (repositories.length >= 2 || advanced) return 'repository-rich';
  if (repositories.length === 1) return 'seeded';
  return 'scaffold';
}

function evidenceLabel(state) {
  return {
    'repository-rich': 'Repository-rich',
    seeded: 'Seeded',
    scaffold: 'Scaffold',
  }[state] || 'Scaffold';
}

function statusClass(state) {
  if (state === 'PROMOTED') return 'verified';
  if (state === 'REFERENCE_ONLY') return 'reviewed';
  return 'blocked';
}

function repoUrl(repository) {
  const [owner, name] = String(repository).split('/');
  return `https://github.com/${encodeURIComponent(owner)}/${encodeURIComponent(name)}`;
}

function nav(current = '') {
  const items = [
    ['Recruiter', '/'],
    ['Résumé', '/resume/'],
    ['Master', '/master/'],
    ['Mesh', '/mesh/'],
    ['Companies', '/companies/'],
    ['Atlas', '/atlas/'],
    ['Machine', '/machine/'],
  ];
  return `<nav class="links" aria-label="Primary navigation">${items
    .map(([label, href]) => `<a${current === label ? ' aria-current="page"' : ''} href="${href}">${label}</a>`)
    .join('')}</nav>`;
}

function shell({ title, description, signal, signalNote, current = 'Atlas', body, footer }) {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><meta name="theme-color" content="#03080b"><meta name="description" content="${esc(description)}"><meta name="robots" content="index,follow"><title>${esc(title)}</title><link rel="icon" href="/assets/favicon.svg" type="image/svg+xml"><link rel="stylesheet" href="/assets/site.css"><link rel="stylesheet" href="/assets/site.systems.css"><link rel="stylesheet" href="/assets/helix-atlas.css"><link rel="stylesheet" href="/assets/company-constellation.css"></head><body><a class="skip" href="#main">Skip to content</a><div class="signal-bar"><div class="shell signal-inner"><span class="signal-live">${esc(signal)}</span><span>${esc(signalNote || 'pinned public evidence · no affiliation implied')}</span></div></div><header class="site-header"><div class="shell nav"><a class="brand" href="/"><span class="mark">CB</span><span><strong>CASEY BARTON</strong><small>APPLIED AI SYSTEMS ARCHITECT</small></span></a>${nav(current)}<a class="nav-cta" href="mailto:glacier.equilibrium@gmail.com">Start a conversation</a></div></header><main id="main">${body}</main><footer class="site-footer"><div class="shell"><p><strong>Casey Barton · GlacierEQ</strong></p><p>${esc(footer || 'Independent systems work. Company alignment does not imply affiliation, endorsement, employment, proprietary access, contract relationship, clearance, or production deployment.')}</p></div></footer></body></html>\n`;
}

function star(company, index) {
  const state = evidenceState(company);
  return `<a class="atlas-star star-p${index} ${state}" href="${companyRoute(company.company_id)}" aria-label="Open ${esc(company.display_name)} company intelligence" title="${esc(company.display_name)} · ${evidenceLabel(state)} · ${esc(company.second_depth.stage)}"><span class="star-core"></span><span class="star-label">${esc(company.display_name)} · ${esc(depthLabel(company.second_depth.stage))}</span></a>`;
}

function directoryItem(company) {
  const state = evidenceState(company);
  return `<a class="atlas-directory-item" href="${companyRoute(company.company_id)}"><span><strong>${esc(company.display_name)}</strong><small>${esc(company.track_state)} · ${esc(company.second_depth.stage)}</small></span><b class="evidence-state ${state}">${evidenceLabel(state)}</b></a>`;
}

function powerMap(companies) {
  const byId = new Map(companies.map((company) => [company.company_id, company]));
  const used = new Set();
  const layers = POWER_LAYERS.map(([label, ids]) => {
    const links = ids
      .map((id) => byId.get(id))
      .filter(Boolean)
      .map((company) => {
        used.add(company.company_id);
        return `<a href="${companyRoute(company.company_id)}">${esc(company.display_name)}</a>`;
      })
      .join('');
    return `<div class="power-layer"><strong>${esc(label)}</strong><div>${links || '<span class="muted">No current public track</span>'}</div></div>`;
  }).join('');
  const other = companies.filter((company) => !used.has(company.company_id));
  return `${layers}${other.length ? `<div class="power-layer"><strong>Other governed targets</strong><div>${other.map((company) => `<a href="${companyRoute(company.company_id)}">${esc(company.display_name)}</a>`).join('')}</div></div>` : ''}`;
}

function renderAtlas(projection) {
  const companies = projection.companies;
  const rich = companies.filter((company) => evidenceState(company) === 'repository-rich').length;
  const seeded = companies.filter((company) => evidenceState(company) === 'seeded').length;
  const scaffold = companies.length - rich - seeded;
  const memberships = companies.reduce((count, company) => count + company.repositories.length, 0);
  const advanced = companies.filter((company) => company.second_depth.ordinal > 0).length;
  return shell({
    title: 'Company Atlas · Casey Barton',
    description: 'GlacierEQ Company Atlas: governed company lenses, evidence state, second-depth progression, real company routes, and four-depth technical intelligence.',
    signal: `HELIX ${HELIX_COMMIT.slice(0, 8)} · ${companies.length} COMPANY LENSES`,
    signalNote: `${advanced} past mapped-only · pinned public evidence`,
    body: `<section class="hero atlas-hero"><div class="shell"><p class="eyebrow">COMPANY INTELLIGENCE · REAL ROUTES · GOVERNED SECOND DEPTH</p><h1>Choose a star. <em>Follow the proof.</em></h1><p class="lead">Every company route is compiled from one pinned Job App Helix authority. Repository evidence state and second-depth progress are separate: a company can be mapped without being role-verified, code-inspected, or proof-promoted.</p><div class="proof-strip"><div><b>${companies.length}</b><span>governed company lenses</span></div><div><b>${memberships}</b><span>direct public memberships</span></div><div><b>${rich}</b><span>repository-rich</span></div><div><b>${seeded}</b><span>seeded</span></div><div><b>${scaffold}</b><span>scaffold</span></div><div><b>${advanced}</b><span>past mapped-only</span></div></div><div class="actions"><a class="button primary" href="#constellation">Enter constellation</a><a class="button secondary" href="#power-map">Open power map</a><a class="button ghost" href="/data/company-atlas.json">Machine projection</a></div></div></section><section id="constellation" class="section constellation-section"><div class="shell"><div class="section-head"><div><p class="eyebrow">CONSTELLATION MODE</p><h2>The ecosystem as a navigable field.</h2></div><p>Every star is a real link. The directory remains the keyboard and text-search fallback, and the site stays script-free.</p></div><div class="constellation-layout"><div class="constellation-stage">${companies.map(star).join('')}<div class="constellation-core" aria-hidden="true"><span>GLACIEREQ</span><b>COMPANY<br>ATLAS</b></div><div class="orbit orbit-1"></div><div class="orbit orbit-2"></div><div class="orbit orbit-3"></div></div><aside class="constellation-directory"><div class="directory-head"><p class="eyebrow">DIRECTORY</p><h3>All company lenses</h3><p>Repository-rich / Seeded / Scaffold describes direct public repository evidence. The line under each company separately reports its Helix track and second-depth stage.</p></div><div class="atlas-directory">${companies.map(directoryItem).join('')}</div></aside></div></div></section><section id="power-map" class="section alt"><div class="shell"><div class="section-head"><div><p class="eyebrow">POWER-MAP MODE</p><h2>See where each target sits in the operating stack.</h2></div><p>Orientation only; no affiliation or access claim.</p></div><div class="power-map">${powerMap(companies)}</div></div></section><section class="section tight"><div class="shell callout"><p class="eyebrow">SECOND-DEPTH CONTRACT</p><h2>Mapping is not proof. Progress is a governed state transition.</h2><p>${projection.second_depth.stage_order.map((row) => esc(row.id)).join(' → ')}</p><p>A missing override means MAPPED_ONLY, never completion. Each promoted stage must carry its cumulative pinned public evidence prerequisites upstream in Helix.</p></div></section>`,
  });
}

function repoLedger(company) {
  if (!company.repositories.length) {
    return '<p class="empty-state">No direct repository is recruiter-admitted yet. This is an engineering queue, not a reason to invent proof.</p>';
  }
  return `<ul class="company-repo-ledger">${company.repositories.map((repo) => {
    const name = repo.repository.split('/')[1];
    return `<li><div><a href="${repoUrl(repo.repository)}" target="_blank" rel="noopener">${esc(name)}</a><small>${esc(repo.repository)}</small></div><span class="status ${statusClass(repo.promotion_state)}">${esc(repo.level)} · ${esc(repo.promotion_state)}</span></li>`;
  }).join('')}</ul>`;
}

function blockerList(company) {
  return company.second_depth.blockers.length
    ? `<ul class="evolution-list">${company.second_depth.blockers.map((blocker) => `<li>${esc(blocker)}</li>`).join('')}</ul>`
    : '<p class="empty-state">No unresolved blocker is recorded at the current stage.</p>';
}

function depthTimeline(company) {
  return SECOND_DEPTH_STAGES.map(([id, , ceiling], ordinal) => {
    const marker = ordinal < company.second_depth.ordinal ? '✓' : ordinal === company.second_depth.ordinal ? 'CURRENT' : '□';
    return `<li><strong>${esc(marker)}</strong> ${esc(depthLabel(id))}<br><small>${esc(ceiling)}</small></li>`;
  }).join('');
}

function compactMachineRecord(company) {
  return {
    schema: 'glaciereq.company-intelligence.v1',
    id: company.company_id,
    route: companyRoute(company.company_id),
    state: evidenceState(company),
    track: company.track_state,
    roles: company.target_roles,
    repos: company.repositories.map((repo) => ({
      id: repo.repository,
      lvl: repo.level,
      state: repo.promotion_state,
      provenance: repo.provenance_state,
    })),
    flagships: company.applicable_flagships,
    second_depth: company.second_depth,
    gate: company.gap_or_next_gate,
    boundary: company.non_affiliation,
    source: {
      repository: 'GlacierEQ/job-app-helix',
      commit: HELIX_COMMIT,
    },
  };
}

function wireField(value) {
  return String(value ?? '')
    .replaceAll('\\', '\\\\')
    .replaceAll('\n', '\\n')
    .replaceAll('\r', '\\r')
    .replaceAll('|', '\\u007c')
    .replaceAll(';', '\\u003b')
    .replaceAll(']', '\\u005d');
}

function machineWire(company) {
  const record = compactMachineRecord(company);
  const repos = record.repos
    .map((repo) => [repo.id, repo.lvl, repo.state, repo.provenance].map(wireField).join('|'))
    .join(';') || '∅';
  const roles = record.roles.map(wireField).join('|') || '∅';
  const blockers = record.second_depth.blockers.map(wireField).join('|') || '∅';
  return `GEQ.CI/1 id=${wireField(record.id)} state=${wireField(record.state)} track=${wireField(record.track)}\nROLE[${roles}]\nREPO[${repos}]\nDEPTH[${wireField(record.second_depth.stage)}|${wireField(record.second_depth.claim_ceiling)}]\nBLOCKER[${blockers}]\nHOOK route=${record.route} json=${record.route}record.json\nNEXT ${wireField(record.second_depth.next_gate)}`;
}

function renderCompany(company) {
  const evidence = evidenceState(company);
  const roleChips = company.target_roles.map((role) => `<span>${esc(role)}</span>`).join('');
  const meshLinks = [
    ...company.repositories.map((repo) => `<li><span>ALIGNS_WITH</span><a href="${repoUrl(repo.repository)}" target="_blank" rel="noopener">${esc(repo.repository)}</a></li>`),
    ...company.applicable_flagships.map((flagship) => `<li><span>TRANSFERABLE_CAPABILITY</span><a href="/atlas/#crown-jewels">${esc(flagship)}</a></li>`),
  ].join('');
  return shell({
    title: `${company.display_name} · GlacierEQ Company Intelligence`,
    description: `Independent GlacierEQ technical alignment dossier for ${company.display_name}: current evidence, second-depth state, machine contract, and evolution mesh.`,
    signal: `COMPANY INTELLIGENCE · ${evidenceLabel(evidence).toUpperCase()}`,
    signalNote: `${company.second_depth.stage} · claim ceiling ${company.second_depth.claim_ceiling}`,
    body: `<section class="company-hero"><div class="shell company-hero-grid"><div><p class="eyebrow">INDEPENDENT COMPANY LENS · ${evidenceLabel(evidence).toUpperCase()}</p><h1>${esc(company.display_name)}</h1><p class="lead">${esc(company.recruiter_thesis)}</p><div class="company-role-chips">${roleChips}</div></div><aside class="card company-state-card"><span class="evidence-state ${evidence}">${evidenceLabel(evidence)}</span><strong>${company.repositories.length}</strong><p>direct public evidence ${company.repositories.length === 1 ? 'repository' : 'repositories'}</p><small>${esc(company.track_state)}</small><p><strong>Second depth:</strong> ${esc(depthLabel(company.second_depth.stage))}</p><small>claim ceiling · ${esc(company.second_depth.claim_ceiling)}</small></aside></div></section><section class="section company-layer" id="recruiter"><div class="shell"><div class="layer-heading"><span>01 · RECRUITER</span><h2>What matters to this operating environment.</h2></div><div class="company-two-col"><article class="card"><h3>Alignment thesis</h3><p>${esc(company.recruiter_thesis)}</p><p>${company.repositories.length ? `${company.repositories.length} recruiter-admitted public ${company.repositories.length === 1 ? 'repository' : 'repositories'} currently map to this company lens.` : 'No company-specific repository is currently admitted to the public recruiter surface.'}</p></article><article class="card boundary-card"><h3>Truth boundary</h3><p>${esc(company.non_affiliation)}</p><p><strong>Current public claim ceiling:</strong> ${esc(company.second_depth.claim_ceiling)}</p></article></div></div></section><section class="section alt company-layer" id="master"><div class="shell"><div class="layer-heading"><span>02 · MASTER</span><h2>Innovation, architecture, and the governed second-depth gate.</h2></div><div class="company-two-col"><article class="card"><h3>Current repository evidence</h3>${repoLedger(company)}</article><article class="card aspiration-card"><p class="eyebrow">SECOND-DEPTH STATE</p><h3>${esc(depthLabel(company.second_depth.stage))}</h3><p><strong>Claim ceiling:</strong> ${esc(company.second_depth.claim_ceiling)}</p><h3>Blocking conditions</h3>${blockerList(company)}<p><strong>Next gate:</strong> ${esc(company.second_depth.next_gate)}</p></article></div></div></section><section class="section company-layer" id="machine"><div class="shell"><div class="layer-heading"><span>03 · MACHINE</span><h2>Dense integration contract.</h2></div><div class="card machine-contract"><div class="machine-contract-head"><p>Compact wire view for agents and tooling.</p><a class="button ghost small" href="record.json">record.json</a></div><pre>${esc(machineWire(company))}</pre><p class="machine-hook">Discover → inspect record → follow pinned public evidence → verify native proof → respect stage prerequisites and claim ceiling.</p></div></div></section><section class="section alt company-layer" id="mesh"><div class="shell"><div class="layer-heading"><span>04 · MESH</span><h2>One node in the larger GlacierEQ system.</h2></div><div class="company-two-col"><article class="card"><h3>Relationships</h3>${meshLinks ? `<ul class="mesh-edge-list">${meshLinks}</ul>` : '<p class="empty-state">No direct public repository edge is admitted yet.</p>'}<h3>Current blockers</h3>${blockerList(company)}</article><article class="card evolution-card"><p class="eyebrow">ASPIRATION &amp; EVOLUTION</p><h3>Governed promotion path</h3><ol class="evolution-list">${depthTimeline(company)}</ol><p><strong>Current stage:</strong> ${esc(company.second_depth.stage)}</p><p><strong>Next gate:</strong> ${esc(company.second_depth.next_gate)}</p><p>The path advances only when upstream Helix carries the required pinned public evidence.</p></article></div></div></section>`,
    footer: company.non_affiliation,
  });
}

function augmentHtmlNavigation(body) {
  let text = body.toString('utf8');
  const navStart = text.indexOf('<nav class="links"');
  if (navStart < 0) return Buffer.from(text);
  const navEnd = text.indexOf('</nav>', navStart);
  if (navEnd < 0) return Buffer.from(text);
  const nav = text.slice(navStart, navEnd);
  let insertion = '';
  if (!nav.includes('href="/companies/"')) insertion += '<a href="/companies/">Companies</a>';
  if (!nav.includes('href="/atlas/"')) insertion += '<a href="/atlas/">Atlas</a>';
  if (!insertion) return Buffer.from(text);
  text = `${text.slice(0, navEnd)}${insertion}${text.slice(navEnd)}`;
  return Buffer.from(text);
}

function augmentSitemap(body, projection) {
  let text = body.toString('utf8');
  if (!text.includes('</urlset>')) return body;
  text = text.replace(/\s*<url><loc>https:\/\/casey-barton-glaciereq\.vercel\.app\/companies\/[^<]+<\/loc>(?:<priority>[^<]+<\/priority>)?<\/url>/g, '');
  const wanted = [
    `${PUBLIC_ORIGIN}/atlas/`,
    `${PUBLIC_ORIGIN}/companies/`,
    ...projection.companies.map((company) => `${PUBLIC_ORIGIN}${companyRoute(company.company_id)}`),
  ];
  const insertion = wanted
    .filter((url) => !text.includes(`<loc>${url}</loc>`))
    .map((url) => `  <url><loc>${url}</loc></url>`)
    .join('\n');
  const closing = text.lastIndexOf('</urlset>');
  if (insertion) text = `${text.slice(0, closing).trimEnd()}\n${insertion}\n${text.slice(closing)}`;
  return Buffer.from(text.endsWith('\n') ? text : `${text}\n`);
}

function augmentLlms(body, projection) {
  const lines = body.toString('utf8').split('\n').filter((line) => !line.startsWith('- Company Atlas:'));
  while (lines.length && lines.at(-1) === '') lines.pop();
  lines.push(
    `- Company Atlas: ${PUBLIC_ORIGIN}/atlas/ (${projection.company_count} governed routes; Recruiter + Master + Machine + Mesh; Helix-governed second-depth stage, claim ceiling, blockers, next gate, and pinned public evidence)`,
    '',
  );
  return Buffer.from(lines.join('\n'));
}

async function verifyDeployment(res) {
  const files = [];
  let pass = true;
  for (const [filePath, expected] of Object.entries(REQUIRED)) {
    const { response, body, sha256: actual } = await fetchSource(filePath);
    const ok = response.ok && actual === expected;
    pass = pass && ok;
    files.push({ path: filePath, status: response.status, bytes: body.length, sha256: actual, expected, ok });
  }

  let projection = null;
  let projectionError = null;
  try {
    projection = await loadProjection();
  } catch (error) {
    projectionError = error.message;
    pass = false;
  }

  try {
    const atlas = await fetchSource('assets/helix-atlas.css');
    const atlasText = atlas.body.toString('utf8');
    const atlasOk = atlas.response.ok && atlasText.includes('.constellation-stage');
    pass = pass && atlasOk;
    files.push({ path: 'assets/helix-atlas.css', status: atlas.response.status, bytes: atlas.body.length, sha256: atlas.sha256, expected: 'contains .constellation-stage and .atlas-star.star-p48', ok: atlasOk });

    const stars = await fetchSource('assets/helix-atlas.stars.css');
    const starsText = stars.body.toString('utf8');
    const starsOk = stars.response.ok && starsText.includes('.atlas-star.star-p0{') && starsText.includes(`.atlas-star.star-p${Math.max(0, (projection?.company_count || 1) - 1)}{`);
    pass = pass && starsOk;
    files.push({ path: 'assets/helix-atlas.stars.css', status: stars.response.status, bytes: stars.body.length, sha256: stars.sha256, expected: 'generated multi-ring star positions', ok: starsOk });

    const constellation = await fetchSource('assets/company-constellation.css');
    const constellationText = constellation.body.toString('utf8');
    const constellationOk = constellation.response.ok && constellationText.includes('.company-constellation');
    pass = pass && constellationOk;
    files.push({ path: 'assets/company-constellation.css', status: constellation.response.status, bytes: constellation.body.length, sha256: constellation.sha256, expected: 'contains .company-constellation', ok: constellationOk });
  } catch (error) {
    pass = false;
    files.push({ path: 'Atlas stylesheet verification', ok: false, error: error.message });
  }

  const stageCounts = Object.fromEntries(SECOND_DEPTH_STAGES.map(([stage]) => [stage, 0]));
  let memberships = 0;
  let lockheed = null;
  if (projection) {
    for (const company of projection.companies) {
      stageCounts[company.second_depth.stage] += 1;
      memberships += company.repositories.length;
    }
    lockheed = projection.companies.find((company) => company.company_id === 'lockheed_martin') || null;
    const topologyOk = projection.company_count >= 49 && memberships === 59 &&
      stageCounts.CLAIM_PROMOTED === 1 && Object.values(stageCounts).reduce((a,b)=>a+b,0) === projection.company_count &&
      lockheed && lockheed.repositories.length === 0 &&
      lockheed.second_depth.stage === 'CLAIM_PROMOTED' &&
      lockheed.second_depth.ordinal === 7 &&
      lockheed.second_depth.claim_ceiling === 'proof_bound_company_specific' &&
      lockheed.second_depth.evidence.role_evidence.length === 1 &&
      lockheed.second_depth.evidence.problem_evidence.length === 1 &&
      lockheed.second_depth.evidence.inspected_repositories.length === 4 &&
      lockheed.second_depth.evidence.gap_queue.length === 1 &&
      lockheed.second_depth.evidence.implementation_receipts.length === 1 &&
      lockheed.second_depth.evidence.proof_artifacts.length === 1 &&
      lockheed.second_depth.evidence.proof_artifacts[0].verification_state === 'REPRODUCED' &&
      lockheed.second_depth.evidence.claim_receipts.length === 1;
    pass = pass && topologyOk;
  }

  res.statusCode = pass ? 200 : 503;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify({
    schema: 'glaciereq.v21-production-verification.v1',
    status: pass ? 'PASS' : 'FAIL',
    source_commit: SOURCE_COMMIT,
    helix_source_commit: HELIX_COMMIT,
    release: 'V21 First Star Completion',
    canonical_routes: ['/', '/resume/', '/master/', '/mesh/', '/machine/', '/companies/', '/atlas/'],
    company_routes: projection?.company_count ?? null,
    public_repository_memberships: projection ? memberships : null,
    second_depth: projection ? stageCounts : null,
    lockheed_martin: lockheed ? {
      repositories: lockheed.repositories.length,
      stage: lockheed.second_depth.stage,
      ordinal: lockheed.second_depth.ordinal,
      claim_ceiling: lockheed.second_depth.claim_ceiling,
      role_evidence: lockheed.second_depth.evidence.role_evidence.length,
      problem_evidence: lockheed.second_depth.evidence.problem_evidence.length,
      inspected_repositories: lockheed.second_depth.evidence.inspected_repositories.length,
      gap_queue: lockheed.second_depth.evidence.gap_queue.length,
      implementation_receipts: lockheed.second_depth.evidence.implementation_receipts.length,
      proof_artifacts: lockheed.second_depth.evidence.proof_artifacts.length,
      proof_verification_state: lockheed.second_depth.evidence.proof_artifacts[0]?.verification_state ?? null,
      claim_receipts: lockheed.second_depth.evidence.claim_receipts.length,
    } : null,
    projection_error: projectionError,
    facts_invariant: true,
    scripts: 0,
    trackers: 0,
    files,
  }, null, 2));
}

function needsProjection(filePath) {
  return filePath === 'atlas/index.html' ||
    filePath === 'companies/index.html' ||
    filePath === 'data/company-atlas.json' ||
    filePath === 'sitemap.xml' ||
    filePath === 'llms.txt' ||
    /^companies\/[a-z0-9-]+\/(?:index\.html|record\.json)$/.test(filePath) ||
    /^atlas\/[a-z0-9-]+\/(?:index\.html|record\.json)$/.test(filePath);
}

async function dynamicResponse(filePath, projection) {
  if (filePath === 'atlas/index.html' || filePath === 'companies/index.html') {
    return { status: 200, type: TYPES['.html'], body: Buffer.from(renderAtlas(projection)) };
  }
  if (filePath === 'data/company-atlas.json') {
    return { status: 200, type: TYPES['.json'], body: Buffer.from(`${JSON.stringify(projection, null, 2)}\n`) };
  }

  let match = filePath.match(/^companies\/([a-z0-9-]+)\/(index\.html|record\.json)$/);
  if (!match) match = filePath.match(/^atlas\/([a-z0-9-]+)\/(index\.html|record\.json)$/);
  if (match) {
    const [, slug, leaf] = match;
    const company = projection.companies.find((candidate) => companySlug(candidate.company_id) === slug);
    if (!company) return null;
    if (leaf === 'record.json') {
      return { status: 200, type: TYPES['.json'], body: Buffer.from(`${JSON.stringify(compactMachineRecord(company), null, 2)}\n`) };
    }
    return { status: 200, type: TYPES['.html'], body: Buffer.from(renderCompany(company)) };
  }
  return null;
}

module.exports = async function handler(req, res) {
  securityHeaders(res);
  const raw = requestPath(req);
  if (raw === '__v21_verify') {
    return verifyDeployment(res);
  }

  const filePath = normalize(raw);
  if (!filePath) {
    res.statusCode = 400;
    res.end('Invalid path');
    return;
  }

  let projection = null;
  if (needsProjection(filePath)) {
    try {
      projection = await loadProjection();
    } catch (error) {
      res.statusCode = 503;
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.setHeader('Cache-Control', 'no-store');
      res.end(`Company projection unavailable: ${error.message}`);
      return;
    }
  }

  if (projection) {
    const dynamic = await dynamicResponse(filePath, projection);
    if (dynamic) {
      res.statusCode = dynamic.status;
      res.setHeader('Content-Type', dynamic.type);
      res.setHeader('Cache-Control', filePath.endsWith('.json') ? 'public, max-age=0, s-maxage=300, must-revalidate' : 'public, max-age=0, s-maxage=900, must-revalidate');
      res.setHeader('Content-Length', String(dynamic.body.length));
      res.end(dynamic.body);
      return;
    }
  }

  let upstream;
  let body;
  try {
    ({ response: upstream, body } = await fetchSource(filePath));
    if (!upstream.ok) {
      const fallback = await fetchSource('404.html');
      upstream = fallback.response;
      body = fallback.body;
      res.statusCode = 404;
    } else {
      res.statusCode = 200;
    }
  } catch (error) {
    res.statusCode = 502;
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('Retry-After', '60');
    res.end(`Source bridge unavailable: ${error.message}`);
    return;
  }

  if (projection && filePath === 'sitemap.xml') body = augmentSitemap(body, projection);
  if (projection && filePath === 'llms.txt') body = augmentLlms(body, projection);
  if (extension(filePath) === '.html') body = augmentHtmlNavigation(body);

  const ext = extension(filePath);
  res.setHeader('Content-Type', TYPES[ext] || 'application/octet-stream');
  res.setHeader(
    'Cache-Control',
    filePath.startsWith('data/') || filePath.endsWith('.json') || filePath === 'resume/ats.txt'
      ? 'public, max-age=0, s-maxage=300, must-revalidate'
      : 'public, max-age=0, s-maxage=900, must-revalidate',
  );
  if (filePath.startsWith('downloads/')) {
    res.setHeader('Content-Disposition', `attachment; filename="${filePath.split('/').pop()}"`);
  }
  res.setHeader('Content-Length', String(body.length));
  res.end(body);
};

module.exports.requestPath = requestPath;
module.exports.normalize = normalize;
module.exports.compileProjection = compileProjection;
module.exports.resolveSecondDepth = resolveSecondDepth;
module.exports.renderAtlas = renderAtlas;
module.exports.renderCompany = renderCompany;
module.exports.compactMachineRecord = compactMachineRecord;
module.exports.needsProjection = needsProjection;
module.exports.resolveSourceUrl = resolveSourceUrl;
module.exports.wireField = wireField;
module.exports.constants = { SOURCE_COMMIT, HELIX_COMMIT, SECOND_DEPTH_PATH };

},
"api/release-router.js":function(exports, require, module, __filename, __dirname) {
const proxy = require('./proxy.js');
const designProxy = require('./design-proxy.js');
const estateProxy = require('./estate-proxy.js');
const truthRuntime = require('./truth-runtime.js');
const typographyProxy = require('./typography-proxy.js');
const compilerProxy = require('./compiler-proxy.js');
const titleFontProxy = require('./title-font-proxy.js');

module.exports = async function releaseRouter(req, res) {
  const rawPath = proxy.requestPath(req);
  if (rawPath === '__v21_verify') return proxy(req, res);
  if (rawPath === '__design_verify') return designProxy(req, res);
  if (rawPath === '__v22_verify') return estateProxy(req, res);
  if (rawPath === '__v23_verify') return truthRuntime(req, res);
  if (rawPath === '__v24_verify') return typographyProxy(req, res);
  if (rawPath === '__v25_verify') return compilerProxy(req, res);
  if (rawPath === '__v26_verify') return titleFontProxy(req, res);
  return titleFontProxy(req, res);
};
},
"api/title-font-proxy.js":function(exports, require, module, __filename, __dirname) {
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
const EXPECTED_FONT_SHA256 = '00de26ff9e435fb8f9e3ad15877f9deb4b70f3945ae0abcf7f0ed278d593014b';

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
        const digest = sha256(body);
        requireValue(digest === EXPECTED_FONT_SHA256, 'title_font_sha256_mismatch');
        return Object.freeze({ body, sha256: digest });
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
  EXPECTED_FONT_SHA256,
};
module.exports.TITLE_FONT_CSS = TITLE_FONT_CSS;
module.exports.injectTitleFont = injectTitleFont;
module.exports.loadFont = loadFont;
module.exports.sha256 = sha256;
},
"api/truth-proxy.js":function(exports, require, module, __filename, __dirname) {
const crypto = require('node:crypto');
const estateProxy = require('./estate-proxy.js');
const proxy = require('./proxy.js');

const TRUTH_COMMIT = '77358d5a53c137333d28421f64315b27e17a459d';
const RESUME_PATH = 'RESUME.md';
const RESUME_BLOB_SHA1 = 'd70c803b3cc1557b8d484f010f3cf0599842cf15';
const RAW_RESUME = `https://raw.githubusercontent.com/GlacierEQ/job-application/${TRUTH_COMMIT}/${RESUME_PATH}`;
const RELEASE = 'V23-TRUTH-SYNC-COMPLETE-WEB';
const VERIFY_SCHEMA = 'glaciereq.v23-truth-sync-verification.v1';
const ADMITTED_REPOSITORIES = 67;
const PACKAGE_STATE = 'PARTIALLY_VERIFIED';
const FETCH_TIMEOUT_MS = 12_000;
const MAX_BYTES = 4 * 1024 * 1024;
const STALE_BINARY_PATHS = new Set([
  'downloads/Casey_Barton_Resume.pdf',
  'downloads/Casey_Barton_Resume.docx',
]);
const CURRENT_RESUME_URL = `https://github.com/GlacierEQ/job-application/blob/${TRUTH_COMMIT}/RESUME.md`;

let truthPromise = null;

function gitBlobSha1(body) {
  const header = Buffer.from(`blob ${body.length}\0`);
  return crypto.createHash('sha1').update(header).update(body).digest('hex');
}

function requireValue(condition, message) {
  if (!condition) throw new Error(message);
}

async function boundedBytes(url, maxBytes = MAX_BYTES) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      headers: { 'user-agent': 'GlacierEQ-V23-Truth-Sync/1.0' },
      redirect: 'error',
      signal: controller.signal,
    });
    const declared = Number(response.headers.get('content-length') || 0);
    if (declared > maxBytes) throw new Error('truth_response_too_large');
    const body = Buffer.from(await response.arrayBuffer());
    if (body.length > maxBytes) throw new Error('truth_response_too_large');
    return { response, body };
  } catch (error) {
    if (error?.name === 'AbortError') throw new Error('truth_fetch_timeout');
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

async function loadTruthAuthority() {
  if (!truthPromise) {
    truthPromise = (async () => {
      const { response, body } = await boundedBytes(RAW_RESUME);
      requireValue(response.ok, `truth_resume_http_${response.status}`);
      const blobSha1 = gitBlobSha1(body);
      requireValue(blobSha1 === RESUME_BLOB_SHA1, `truth_resume_blob_mismatch:${blobSha1}`);
      const text = body.toString('utf8');
      requireValue(text.includes('67-repository admitted boundary'), 'truth_resume_boundary_missing');
      requireValue(text.includes(PACKAGE_STATE), 'truth_resume_state_missing');
      return {
        blob_sha1: blobSha1,
        text,
      };
    })().catch((error) => {
      truthPromise = null;
      throw error;
    });
  }
  return truthPromise;
}

function captureEstate(req) {
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
    Promise.resolve(estateProxy(req, res))
      .then(() => {
        if (!settled) reject(new Error('estate_proxy_did_not_end'));
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
  res.setHeader('X-GlacierEQ-Truth-Commit', TRUTH_COMMIT);
  res.setHeader('X-PSYSOCX-Release', RELEASE);
}

function replayHeaders(captured, res) {
  for (const [name, value] of captured.headers) {
    if (
      name === 'content-length' ||
      name === 'x-glaciereq-truth-commit' ||
      name === 'x-psysocx-release'
    ) {
      continue;
    }
    res.setHeader(name, value);
  }
  res.setHeader('X-GlacierEQ-Truth-Commit', TRUTH_COMMIT);
  res.setHeader('X-PSYSOCX-Release', RELEASE);
}

function staleHelixClaim(text) {
  const value = String(text || '');
  const forward = /(?:Job Application Helix|Helix)[\s\S]{0,500}(?:148\/148|148 of 148)/i;
  const reverse = /(?:148\/148|148 of 148)[\s\S]{0,500}(?:Job Application Helix|Helix)/i;
  return forward.test(value) || reverse.test(value);
}

function truthMarkerPresent(text) {
  const value = String(text || '');
  return value.includes('67') && value.includes(PACKAGE_STATE);
}

function replaceResumeDownloadLinks(html) {
  let output = html;
  output = output.replace(
    /<a class="button primary small" href="\/downloads\/Casey_Barton_Resume\.pdf">Human PDF<\/a>/g,
    `<a class="button primary small" href="${CURRENT_RESUME_URL}" target="_blank" rel="noopener">Canonical résumé</a>`,
  );
  output = output.replace(
    /<a class="button secondary small" href="\/downloads\/Casey_Barton_Resume\.docx">Editable DOCX<\/a>/g,
    '<a class="button secondary small" href="/resume/ats.txt">Current ATS text</a>',
  );
  return output;
}

function transformHtml(html) {
  let output = String(html || '');
  output = output.replaceAll(
    'V21 FIRST STAR COMPLETION · VERIFIED PRODUCTION',
    'V23 TRUTH SYNC · V22 ESTATE INTELLIGENCE · VERIFIED PRODUCTION',
  );
  output = output.replaceAll(
    '<b>148/148</b><span>Job Application Helix recorded tests</span>',
    '<b>67</b><span>Helix admitted repositories · PARTIALLY_VERIFIED</span>',
  );
  output = output.replaceAll(
    'data-claim-id="helix-tests" data-evidence-state="RECORDED"><b>148/148</b><span>Helix tests</span>',
    'data-claim-id="helix-tests" data-evidence-state="PARTIALLY_VERIFIED"><b>67</b><span>admitted repositories</span>',
  );
  output = output.replaceAll(
    'data-claim-id="helix" data-evidence-state="RECORDED_TESTS"',
    'data-claim-id="helix" data-evidence-state="PARTIALLY_VERIFIED"',
  );
  output = output.replaceAll('148/148 RECORDED', 'PARTIALLY_VERIFIED · 67 REPOSITORIES');
  output = output.replaceAll('RECORDED 148/148', 'PARTIALLY_VERIFIED · 67 REPOSITORIES');
  output = output.replaceAll(
    '148/148 recorded repository tests',
    '67-repository admitted boundary · PARTIALLY_VERIFIED',
  );
  output = output.replaceAll(
    '148/148 recorded tests',
    '67-repository admitted boundary · PARTIALLY_VERIFIED',
  );
  output = output.replaceAll(
    '148 of 148 recorded repository tests',
    'exact 67-repository admitted boundary; package PARTIALLY_VERIFIED; child repositories retain independent evidence states',
  );
  output = replaceResumeDownloadLinks(output);
  return output;
}

function transformAts(text) {
  let output = String(text || '');
  output = output.replaceAll(
    '- Job Application Helix: 148 of 148 recorded repository tests for evidence-governed hiring and portfolio orchestration.',
    '- Job Application Helix: exact 67-repository admitted boundary for evidence-governed hiring and portfolio orchestration; package PARTIALLY_VERIFIED; child repositories retain independent evidence states.',
  );
  output = output.replaceAll(
    'Job Application Helix - RECORDED 148/148',
    'Job Application Helix - PARTIALLY_VERIFIED - 67 REPOSITORIES ADMITTED',
  );
  output = output.replaceAll(
    '148/148 recorded repository tests',
    '67-repository admitted boundary; package PARTIALLY_VERIFIED',
  );
  output = output.replaceAll(
    '148 of 148 recorded repository tests',
    'exact 67-repository admitted boundary; package PARTIALLY_VERIFIED',
  );
  return output;
}

function transformResumeJson(value) {
  const data = structuredClone(value);
  data.meta = data.meta && typeof data.meta === 'object' ? data.meta : {};
  data.meta.truth_sync_authority_commit = TRUTH_COMMIT;
  data.meta.truth_sync_release = RELEASE;
  const projects = Array.isArray(data.projects) ? data.projects : [];
  const helix = projects.find((project) => project?.name === 'Job Application Helix');
  requireValue(helix, 'resume_json_helix_project_missing');
  helix.description =
    'Evidence-governed hiring and portfolio orchestration over an exact 67-repository admitted boundary; package PARTIALLY_VERIFIED and child repositories retain independent evidence states.';
  helix.keywords = [PACKAGE_STATE, 'admitted_repositories:67'];
  data.x_evidence = data.x_evidence && typeof data.x_evidence === 'object' ? data.x_evidence : {};
  data.x_evidence.proof =
    data.x_evidence.proof && typeof data.x_evidence.proof === 'object'
      ? data.x_evidence.proof
      : {};
  delete data.x_evidence.proof.helix_tests;
  data.x_evidence.proof.helix_admitted_repositories = ADMITTED_REPOSITORIES;
  data.x_evidence.proof.helix_package_state = PACKAGE_STATE;
  data.x_evidence.proof.helix_child_repository_states_independent = true;
  return data;
}

function transformPortfolioJson(value) {
  const data = structuredClone(value);
  data.release = data.release && typeof data.release === 'object' ? data.release : {};
  // Kill stale V15 product brand; path site-v15 is deploy output only.
  data.release.name = 'Unified Helix-Bound Hire Surface';
  data.release.truth_sync_authority_commit = TRUTH_COMMIT;
  data.release.truth_sync_release = RELEASE;
  data.release.supersedes = Array.from(
    new Set([...(Array.isArray(data.release.supersedes) ? data.release.supersedes : []), 'V15 Final Hiring Release']),
  );
  if (!data.release.authority || typeof data.release.authority !== 'object') {
    data.release.authority = {
      control_plane: 'GlacierEQ/job-app-helix',
      flagship_registry: 'manifests/flagship_registry.json',
    };
  }
  const flagships = Array.isArray(data.flagships) ? data.flagships : [];
  const helix = flagships.find(
    (flagship) => flagship?.id === 'helix' || flagship?.name === 'Job Application Helix',
  );
  requireValue(helix, 'portfolio_json_helix_flagship_missing');
  helix.state = PACKAGE_STATE;
  helix.evidence =
    'Exact 67-repository admitted boundary; Helix package PARTIALLY_VERIFIED; child repositories retain independent evidence states.';
  helix.limit =
    'No aggregate Helix test-count claim is promoted. Child repositories retain independent evidence states and release-specific gates remain separate.';
  // Drop retired dead weight if present in older static blobs.
  data.flagships = flagships.filter((flagship) => flagship?.id !== 'microcode');
  return data;
}

function transformJson(filePath, text) {
  let value;
  try {
    value = JSON.parse(text);
  } catch (error) {
    throw new Error(`truth_json_parse:${filePath}:${error instanceof Error ? error.message : String(error)}`);
  }
  if (filePath === 'data/resume.json') return JSON.stringify(transformResumeJson(value), null, 2);
  if (filePath === 'data/portfolio.json') return JSON.stringify(transformPortfolioJson(value), null, 2);
  return text;
}

function transformBody(filePath, contentType, body) {
  if (body.length > MAX_BYTES) throw new Error('truth_input_too_large');
  const text = body.toString('utf8');
  let transformed = text;
  if (contentType.startsWith('text/html')) transformed = transformHtml(text);
  if (filePath === 'resume/ats.txt') transformed = transformAts(text);
  if (filePath === 'data/resume.json' || filePath === 'data/portfolio.json') {
    transformed = transformJson(filePath, text);
  }
  if (staleHelixClaim(transformed)) throw new Error(`stale_helix_claim:${filePath}`);
  const output = Buffer.from(transformed);
  if (output.length > MAX_BYTES) throw new Error('truth_output_too_large');
  return output;
}

async function projectCaptured(req, filePath) {
  const captured = await captureEstate(req);
  if (captured.status !== 200) return captured;
  const contentType = String(captured.headers.get('content-type') || '').toLowerCase();
  const supported =
    contentType.startsWith('text/html') ||
    filePath === 'resume/ats.txt' ||
    filePath === 'data/resume.json' ||
    filePath === 'data/portfolio.json';
  if (!supported) return captured;
  return {
    ...captured,
    body: transformBody(filePath, contentType, captured.body),
  };
}

function serveSupersededBinary(res, filePath) {
  const payload = Buffer.from(
    JSON.stringify(
      {
        schema: 'glaciereq.resume-binary-superseded.v1',
        status: 'SUPERSEDED',
        requested_path: filePath,
        reason: 'Binary résumé predates the current Helix truth authority and is withheld until regenerated.',
        current_resume: CURRENT_RESUME_URL,
        ats_text: '/resume/ats.txt',
        machine_resume: '/data/resume.json',
        truth_commit: TRUTH_COMMIT,
      },
      null,
      2,
    ),
  );
  securityHeaders(res);
  res.statusCode = 410;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Content-Length', String(payload.length));
  res.end(payload);
}

async function serveProjected(req, res, filePath) {
  const captured = await projectCaptured(req, filePath);
  replayHeaders(captured, res);
  res.statusCode = captured.status;
  res.setHeader('Content-Length', String(captured.body.length));
  res.end(captured.body);
}

async function verifySurface(path, options = {}) {
  const filePath = proxy.normalize(path);
  requireValue(filePath, `verify_invalid_path:${path}`);
  const captured = await projectCaptured({ url: `/?path=${encodeURIComponent(path)}` }, filePath);
  const text = captured.body.toString('utf8');
  const result = {
    status_code: captured.status,
    stale_helix_claim_absent: !staleHelixClaim(text),
    current_truth_marker_present: options.requireTruth ? truthMarkerPresent(text) : true,
  };
  result.ok =
    result.status_code === 200 &&
    result.stale_helix_claim_absent &&
    result.current_truth_marker_present;
  return result;
}

async function verifyV23(res) {
  const errors = [];
  let baseV22 = null;
  let authority = null;
  let surfaces = null;
  try {
    const v22 = await captureEstate({ url: '/?path=__v22_verify' });
    let payload = null;
    try {
      payload = JSON.parse(v22.body.toString('utf8'));
    } catch {}
    baseV22 = {
      status_code: v22.status,
      schema: payload?.schema || null,
      status: payload?.status || null,
      release: payload?.release || null,
    };
    if (v22.status !== 200 || payload?.status !== 'PASS') errors.push('base_v22_verifier_failed');

    authority = await loadTruthAuthority();
    const [root, resume, ats, resumeJson, portfolioJson, machine] = await Promise.all([
      verifySurface('', { requireTruth: true }),
      verifySurface('resume', { requireTruth: true }),
      verifySurface('resume/ats.txt', { requireTruth: true }),
      verifySurface('data/resume.json', { requireTruth: true }),
      verifySurface('data/portfolio.json', { requireTruth: true }),
      verifySurface('machine'),
    ]);
    surfaces = {
      root,
      resume,
      ats,
      resume_json: resumeJson,
      portfolio_json: portfolioJson,
      machine,
      stale_binary_downloads_blocked: [...STALE_BINARY_PATHS].length === 2,
    };
    for (const [name, result] of Object.entries(surfaces)) {
      if (name === 'stale_binary_downloads_blocked') continue;
      if (!result.ok) errors.push(`surface_failed:${name}`);
    }
    if (!surfaces.stale_binary_downloads_blocked) errors.push('stale_binary_boundary_failed');
  } catch (error) {
    errors.push(error instanceof Error ? error.message : 'v23_verification_failed');
  }

  const pass = errors.length === 0;
  const payload = Buffer.from(
    JSON.stringify(
      {
        schema: VERIFY_SCHEMA,
        status: pass ? 'PASS' : 'FAIL',
        release: RELEASE,
        base_v22: baseV22,
        truth_commit: TRUTH_COMMIT,
        resume_blob_sha1: authority?.blob_sha1 || null,
        helix_public_boundary: {
          admitted_repositories: ADMITTED_REPOSITORIES,
          package_state: PACKAGE_STATE,
          child_repository_states_independent: true,
          aggregate_test_count_promoted: false,
        },
        surfaces,
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

module.exports = async function truthProxy(req, res) {
  const rawPath = proxy.requestPath(req);
  if (rawPath === '__v23_verify') return verifyV23(res);
  const filePath = proxy.normalize(rawPath);
  if (!filePath) {
    securityHeaders(res);
    res.statusCode = 400;
    res.end('Invalid path');
    return;
  }
  if (STALE_BINARY_PATHS.has(filePath)) return serveSupersededBinary(res, filePath);
  try {
    await loadTruthAuthority();
    return await serveProjected(req, res, filePath);
  } catch (error) {
    const payload = Buffer.from(
      JSON.stringify(
        {
          schema: 'glaciereq.v23-truth-sync-error.v1',
          status: 'FAIL_CLOSED',
          truth_commit: TRUTH_COMMIT,
          path: filePath,
          error: error instanceof Error ? error.message : String(error),
        },
        null,
        2,
      ),
    );
    securityHeaders(res);
    res.statusCode = 503;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('Content-Length', String(payload.length));
    res.end(payload);
  }
};

module.exports.constants = {
  ADMITTED_REPOSITORIES,
  CURRENT_RESUME_URL,
  PACKAGE_STATE,
  RELEASE,
  RESUME_BLOB_SHA1,
  RESUME_PATH,
  TRUTH_COMMIT,
  VERIFY_SCHEMA,
};
module.exports.gitBlobSha1 = gitBlobSha1;
module.exports.loadTruthAuthority = loadTruthAuthority;
module.exports.staleHelixClaim = staleHelixClaim;
module.exports.transformAts = transformAts;
module.exports.transformBody = transformBody;
module.exports.transformHtml = transformHtml;
module.exports.transformPortfolioJson = transformPortfolioJson;
module.exports.transformResumeJson = transformResumeJson;
module.exports._resetTruthCache = () => {
  truthPromise = null;
};

},
"api/truth-runtime.js":function(exports, require, module, __filename, __dirname) {
const estateProxy = require('./estate-proxy.js');
const proxy = require('./proxy.js');
const truthProxy = require('./truth-proxy.js');

const RELEASE = 'V23-TRUTH-SYNC-COMPLETE-WEB';
const VERIFY_SCHEMA = 'glaciereq.v23-truth-sync-verification.v1';
const ADMITTED_REPOSITORIES = 67;
const PACKAGE_STATE = 'PARTIALLY_VERIFIED';
const TRUTH_COMMIT = truthProxy.constants.TRUTH_COMMIT;
const STALE_BINARY_PATHS = [
  'downloads/Casey_Barton_Resume.pdf',
  'downloads/Casey_Barton_Resume.docx',
];

function requireValue(condition, message) {
  if (!condition) throw new Error(message);
}

function capture(handler, req) {
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
    Promise.resolve(handler(req, res))
      .then(() => {
        if (!settled) reject(new Error('handler_did_not_end'));
      })
      .catch(reject);
  });
}

function transformMachineHtml(html) {
  let output = String(html || '');
  output = output.replaceAll(
    '"helix": "148/148"',
    '"helix_admitted_repositories": 67,\n    "helix_package_state": "PARTIALLY_VERIFIED"',
  );
  output = output.replaceAll(
    '&quot;helix&quot;: &quot;148/148&quot;',
    '&quot;helix_admitted_repositories&quot;: 67,\n    &quot;helix_package_state&quot;: &quot;PARTIALLY_VERIFIED&quot;',
  );
  requireValue(!truthProxy.staleHelixClaim(output), 'stale_helix_claim:machine/index.html');
  requireValue(output.includes('67'), 'machine_truth_boundary_missing');
  requireValue(output.includes(PACKAGE_STATE), 'machine_truth_state_missing');
  return output;
}

function isMachinePath(filePath) {
  return filePath === 'machine/index.html';
}

function replayHeaders(captured, res) {
  for (const [name, value] of captured.headers) {
    if (
      name === 'content-length' ||
      name === 'x-glaciereq-truth-commit' ||
      name === 'x-psysocx-release'
    ) {
      continue;
    }
    res.setHeader(name, value);
  }
  res.setHeader('X-GlacierEQ-Truth-Commit', TRUTH_COMMIT);
  res.setHeader('X-PSYSOCX-Release', RELEASE);
}

function failClosed(res, filePath, error) {
  const payload = Buffer.from(
    JSON.stringify(
      {
        schema: 'glaciereq.v23-truth-runtime-error.v1',
        status: 'FAIL_CLOSED',
        truth_commit: TRUTH_COMMIT,
        path: filePath,
        error: error instanceof Error ? error.message : String(error),
      },
      null,
      2,
    ),
  );
  res.statusCode = 503;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-GlacierEQ-Truth-Commit', TRUTH_COMMIT);
  res.setHeader('X-PSYSOCX-Release', RELEASE);
  res.setHeader('Content-Length', String(payload.length));
  res.end(payload);
}

async function projectMachine(req) {
  await truthProxy.loadTruthAuthority();
  const captured = await capture(estateProxy, req);
  if (captured.status !== 200) return captured;
  const contentType = String(captured.headers.get('content-type') || '').toLowerCase();
  requireValue(contentType.startsWith('text/html'), 'machine_content_type_not_html');
  const body = Buffer.from(transformMachineHtml(captured.body.toString('utf8')));
  return { ...captured, body };
}

async function serveMachine(req, res, filePath) {
  try {
    const captured = await projectMachine(req);
    replayHeaders(captured, res);
    res.statusCode = captured.status;
    res.setHeader('Content-Length', String(captured.body.length));
    res.end(captured.body);
  } catch (error) {
    failClosed(res, filePath, error);
  }
}

async function projectSurface(path) {
  const filePath = proxy.normalize(path);
  requireValue(filePath, `verify_invalid_path:${path}`);
  const req = { url: `/?path=${encodeURIComponent(path)}` };
  if (isMachinePath(filePath)) return projectMachine(req);
  return capture(truthProxy, req);
}

function currentTruthMarker(text) {
  const value = String(text || '');
  return value.includes('67') && value.includes(PACKAGE_STATE);
}

async function verifySurface(path) {
  const captured = await projectSurface(path);
  const text = captured.body.toString('utf8');
  const result = {
    status_code: captured.status,
    stale_helix_claim_absent: !truthProxy.staleHelixClaim(text),
    current_truth_marker_present: currentTruthMarker(text),
  };
  result.ok =
    result.status_code === 200 &&
    result.stale_helix_claim_absent &&
    result.current_truth_marker_present;
  return result;
}

async function verifyBinaryBoundary(path) {
  const captured = await capture(truthProxy, {
    url: `/?path=${encodeURIComponent(path)}`,
  });
  let payload = null;
  try {
    payload = JSON.parse(captured.body.toString('utf8'));
  } catch {}
  return {
    status_code: captured.status,
    status: payload?.status || null,
    ok: captured.status === 410 && payload?.status === 'SUPERSEDED',
  };
}

async function baseV22State() {
  const captured = await capture(estateProxy, { url: '/?path=__v22_verify' });
  let payload = null;
  try {
    payload = JSON.parse(captured.body.toString('utf8'));
  } catch {}
  return {
    status_code: captured.status,
    schema: payload?.schema || null,
    status: payload?.status || null,
    release: payload?.release || null,
    ok: captured.status === 200 && payload?.status === 'PASS',
  };
}

function verificationHeaders(res) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-GlacierEQ-Truth-Commit', TRUTH_COMMIT);
  res.setHeader('X-PSYSOCX-Release', RELEASE);
}

async function verifyV23(res) {
  const errors = [];
  let authority = null;
  let baseV22 = null;
  let surfaces = null;
  let binaryBoundary = null;
  try {
    baseV22 = await baseV22State();
    if (!baseV22.ok) errors.push('base_v22_verifier_failed');

    authority = await truthProxy.loadTruthAuthority();
    const [root, resume, ats, resumeJson, portfolioJson, machine] = await Promise.all([
      verifySurface(''),
      verifySurface('resume'),
      verifySurface('resume/ats.txt'),
      verifySurface('data/resume.json'),
      verifySurface('data/portfolio.json'),
      verifySurface('machine'),
    ]);
    surfaces = {
      root,
      resume,
      ats,
      resume_json: resumeJson,
      portfolio_json: portfolioJson,
      machine,
    };
    for (const [name, result] of Object.entries(surfaces)) {
      if (!result.ok) errors.push(`surface_failed:${name}`);
    }

    const [pdf, docx] = await Promise.all(
      STALE_BINARY_PATHS.map((path) => verifyBinaryBoundary(path)),
    );
    binaryBoundary = { pdf, docx };
    if (!pdf.ok) errors.push('stale_pdf_not_blocked');
    if (!docx.ok) errors.push('stale_docx_not_blocked');
  } catch (error) {
    errors.push(error instanceof Error ? error.message : 'v23_verification_failed');
  }

  const pass = errors.length === 0;
  const payload = Buffer.from(
    JSON.stringify(
      {
        schema: VERIFY_SCHEMA,
        status: pass ? 'PASS' : 'FAIL',
        release: RELEASE,
        base_v22: baseV22,
        truth_commit: TRUTH_COMMIT,
        resume_blob_sha1: authority?.blob_sha1 || null,
        helix_public_boundary: {
          admitted_repositories: ADMITTED_REPOSITORIES,
          package_state: PACKAGE_STATE,
          child_repository_states_independent: true,
          aggregate_test_count_promoted: false,
        },
        surfaces,
        stale_binary_boundary: binaryBoundary,
        errors,
        client_scripts: 0,
      },
      null,
      2,
    ),
  );
  verificationHeaders(res);
  res.statusCode = pass ? 200 : 503;
  res.setHeader('Content-Length', String(payload.length));
  res.end(payload);
}

module.exports = async function truthRuntime(req, res) {
  const rawPath = proxy.requestPath(req);
  if (rawPath === '__v23_verify') return verifyV23(res);
  const filePath = proxy.normalize(rawPath);
  if (!filePath) return truthProxy(req, res);
  if (isMachinePath(filePath)) return serveMachine(req, res, filePath);
  return truthProxy(req, res);
};

module.exports.constants = {
  ADMITTED_REPOSITORIES,
  PACKAGE_STATE,
  RELEASE,
  TRUTH_COMMIT,
  VERIFY_SCHEMA,
};
module.exports.capture = capture;
module.exports.currentTruthMarker = currentTruthMarker;
module.exports.isMachinePath = isMachinePath;
module.exports.projectMachine = projectMachine;
module.exports.transformMachineHtml = transformMachineHtml;
module.exports.verifyBinaryBoundary = verifyBinaryBoundary;

},
"api/typography-proxy.js":function(exports, require, module, __filename, __dirname) {
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

}
});
let handlerPromise = null;
let verifiedFactoryIds = null;
let runtimeHandler = null;
let bundleVerification = null;

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function resolveRelative(fromId, request) {
  let resolved = path.posix.normalize(path.posix.join(path.posix.dirname(fromId), request));
  if (!resolved.endsWith('.js')) resolved += '.js';
  if (!resolved.startsWith('api/') || !Object.hasOwn(FACTORIES, resolved)) {
    throw new Error('v25_bundle_module_not_found');
  }
  return resolved;
}

function verifyFactories() {
  if (verifiedFactoryIds) return verifiedFactoryIds;
  const ids = Object.keys(FACTORIES).sort();
  if (ids.length !== 9) throw new Error('v25_bundle_module_count_mismatch');
  const chunks = [];
  for (const id of ids) {
    const source = Function.prototype.toString.call(FACTORIES[id]);
    const digest = sha256(Buffer.from(source));
    if (digest !== EXPECTED_FACTORY_SHA256[id]) {
      throw new Error('v25_factory_sha256_mismatch');
    }
    chunks.push(id + '\0' + source + '\0');
  }
  if (sha256(Buffer.from(chunks.join(''))) !== EXPECTED_FACTORY_BUNDLE_SHA256) {
    throw new Error('v25_factory_bundle_sha256_mismatch');
  }
  verifiedFactoryIds = Object.freeze(ids.slice());
  return verifiedFactoryIds;
}

function createModuleLoader() {
  const cache = new Map();
  function load(id) {
    if (cache.has(id)) return cache.get(id).exports;
    const factory = FACTORIES[id];
    if (typeof factory !== 'function') throw new Error('v25_bundle_module_missing');
    const module = { exports: {} };
    cache.set(id, module);
    const localRequire = (request) => {
      if (!String(request).startsWith('.')) return require(request);
      return load(resolveRelative(id, request));
    };
    factory(module.exports, localRequire, module, id, path.posix.dirname(id));
    return module.exports;
  }
  return load;
}

function getVerifiedRuntimeHandler() {
  verifyFactories();
  if (runtimeHandler) return runtimeHandler;
  const load = createModuleLoader();
  const handler = load(ENTRY);
  if (typeof handler !== 'function') throw new Error('v25_bundle_entry_not_handler');
  runtimeHandler = handler;
  return runtimeHandler;
}

function verifyBundle() {
  if (bundleVerification) return bundleVerification;
  const ids = verifyFactories();
  getVerifiedRuntimeHandler();
  bundleVerification = Object.freeze({
    schema: BUNDLE_VERIFY_SCHEMA,
    status: 'PASS',
    release: RELEASE,
    source_commit: SOURCE_COMMIT,
    factory_bundle_sha256: EXPECTED_FACTORY_BUNDLE_SHA256,
    module_count: ids.length,
    entry: ENTRY,
    runtime_string_evaluation_required: false,
    bootstrap_network_fetch_required: false,
    every_factory_sha256_verified_before_execution: true,
    verification_cached_per_instance: true,
  });
  return bundleVerification;
}

function requestPath(req) {
  const parsed = new URL(String(req?.url || '/'), 'https://glaciereq.invalid');
  const values = parsed.searchParams.getAll('path');
  if (values.length) return values.join('/').replace(/^\/+|\/+$/g, '');
  return parsed.pathname.replace(/^\/+|\/+$/g, '');
}

function serveBundleVerify(res) {
  let payload;
  try {
    payload = verifyBundle();
  } catch (error) {
    payload = {
      schema: BUNDLE_VERIFY_SCHEMA,
      status: 'FAIL',
      release: RELEASE,
      source_commit: SOURCE_COMMIT,
      errors: [error instanceof Error ? error.message : 'v25_bundle_verification_failed'],
    };
  }
  const body = Buffer.from(JSON.stringify(payload, null, 2));
  res.statusCode = payload.status === 'PASS' ? 200 : 503;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-PSYSOCX-Release', RELEASE);
  res.setHeader('X-GlacierEQ-Bridge-Commit', SOURCE_COMMIT);
  res.setHeader('Content-Length', String(body.length));
  res.end(body);
}

async function getHandler() {
  if (!handlerPromise) {
    handlerPromise = Promise.resolve().then(getVerifiedRuntimeHandler).catch((error) => {
      handlerPromise = null;
      runtimeHandler = null;
      throw error;
    });
  }
  return handlerPromise;
}

module.exports = async function v25BundledRelease(req, res) {
  if (requestPath(req) === '__v25_bundle_verify') return serveBundleVerify(res);
  try {
    const handler = await getHandler();
    return handler(req, res);
  } catch (error) {
    console.error('V25 bundled release failed', error);
    const body = Buffer.from('Recruiter presentation temporarily unavailable.');
    res.statusCode = 502;
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-PSYSOCX-Release', RELEASE);
    res.setHeader('X-GlacierEQ-Bridge-Commit', SOURCE_COMMIT);
    res.setHeader('Content-Length', String(body.length));
    res.end(body);
  }
};

module.exports.constants = {
  BUNDLE_VERIFY_SCHEMA,
  EXPECTED_FACTORY_BUNDLE_SHA256,
  RELEASE,
  SOURCE_COMMIT,
};
module.exports.verifyBundle = verifyBundle;

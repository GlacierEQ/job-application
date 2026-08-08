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
    if (data.projection.company_count !== 49) errors.push('compiler_company_count');
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

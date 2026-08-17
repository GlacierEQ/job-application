const crypto = require('node:crypto');
const { URL } = require('node:url');
const sourceProxy = require('./proxy.js');

const RELEASE = 'V30-PROOF-STARMAP-RUNTIME';
const VERIFY_SCHEMA = 'glaciereq.v30-proof-starmap-verification.v1';
const MAP_SCHEMA = 'glaciereq.proof-starmap.v1';
const DONOR_COMMIT = '3882fe40830d22c5bba60f3c93ea95d44a56de2c';
const SCALABILITY_COMMIT = 'b9798002396f1210d80735f633e9fd9eb1b0e9c0';
const MAX_CAPTURE_BYTES = 4 * 1024 * 1024;
const COMPANY_ID_PATTERN = /^[a-z0-9_]+$/;
const STAGE_IDS = Object.freeze([
  'MAPPED_ONLY',
  'ROLE_VERIFIED',
  'PROBLEM_BOUNDED',
  'CODE_INSPECTED',
  'REMEDY_BOUNDED',
  'IMPLEMENTED',
  'PROOF_REPRODUCED',
  'CLAIM_PROMOTED',
]);

const CSS = `
.starmap-hero{padding-bottom:3.2rem}.starmap-section{overflow:hidden;background:radial-gradient(circle at 50% 34%,rgba(120,215,255,.055),transparent 34%),radial-gradient(circle at 72% 64%,rgba(198,178,255,.04),transparent 30%)}
.starmap-toolbar{display:flex;flex-wrap:wrap;gap:.5rem;margin:0 0 1rem}.starmap-toolbar a{display:inline-flex;min-height:40px;align-items:center;padding:.45rem .75rem;border:1px solid var(--line);border-radius:999px;color:var(--muted);font-size:.7rem;font-weight:780}.starmap-toolbar a:hover,.starmap-toolbar a:focus-visible,.starmap-toolbar a[aria-current="true"]{border-color:rgba(143,247,216,.62);color:var(--mint);background:rgba(143,247,216,.08)}
.starmap-layout{display:grid;grid-template-columns:minmax(0,1.55fr) minmax(280px,.45fr);gap:1rem;align-items:start}.proof-constellation{width:100%;height:auto;display:block;border:1px solid var(--line);border-radius:1.5rem;background:radial-gradient(circle at 50% 44%,rgba(143,247,216,.06),transparent 34%),linear-gradient(180deg,rgba(4,14,18,.94),rgba(2,8,11,.99));box-shadow:inset 0 0 70px rgba(0,0,0,.38)}
.orbit{fill:none;stroke:rgba(143,247,216,.07);stroke-width:1}.orbit-label{fill:var(--dim);font:800 9px/1 ui-sans-serif,system-ui,sans-serif;letter-spacing:.1em}.hit{fill:transparent;stroke:transparent;pointer-events:all}.halo{fill:none;stroke:var(--cyan);transform-box:fill-box;transform-origin:center}.star-core{fill:var(--mint);filter:drop-shadow(0 0 5px rgba(143,247,216,.68))}.sd-0 .star-core{fill:var(--dim);filter:none}.sd-0 .halo{opacity:.04}.sd-1 .halo{opacity:.12}.sd-2 .halo{opacity:.2}.sd-3 .halo{opacity:.3}.sd-4 .halo{opacity:.42}.sd-5 .halo{opacity:.58}.sd-6 .halo{opacity:.76}.sd-7 .halo{opacity:.96;stroke:var(--amber)}.crown{fill:var(--amber);filter:drop-shadow(0 0 8px rgba(255,212,138,.68))}.starmap-star:focus-visible .hit{stroke:var(--ink);stroke-width:2}
.donor-edge{fill:none;stroke:var(--amber);stroke-width:1;stroke-dasharray:4 5;opacity:.055;pointer-events:none}.company-linkage:hover .donor-edge,.company-linkage:focus-within .donor-edge{opacity:.86;stroke-width:1.7}.donor-core{fill:rgba(198,178,255,.14);stroke:var(--violet);stroke-width:1.1}.donor-label{fill:var(--muted);font:700 8px/1 ui-monospace,SFMono-Regular,Consolas,monospace;text-anchor:middle}.starmap-legend{display:flex;flex-wrap:wrap;gap:.5rem 1rem;margin:.7rem .2rem 0;color:var(--dim);font-size:.68rem}.legend-donor{color:var(--amber)}
.starmap-panel{position:sticky;top:102px;max-height:calc(100vh - 130px);overflow:auto;padding:1rem;border:1px solid var(--line);border-radius:1.2rem;background:rgba(4,13,17,.84)}.starmap-panel h3{margin:.25rem 0 .75rem}.stage-counts{display:grid;gap:.45rem}.stage-counts a{display:flex;justify-content:space-between;gap:.8rem;padding:.55rem .65rem;border:1px solid var(--line);border-radius:.7rem;color:var(--muted);font-size:.7rem}.stage-counts a:hover,.stage-counts a:focus-visible{color:var(--mint);border-color:var(--mint)}.stage-counts b{color:var(--ink)}
.starmap-directory{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:.55rem}.starmap-directory a{padding:.65rem;border:1px solid var(--line);border-radius:.8rem;background:rgba(255,255,255,.018)}.starmap-directory strong{display:block;color:var(--ink);font-size:.76rem}.starmap-directory small{display:block;margin-top:.2rem;color:var(--dim);font-size:.62rem;overflow-wrap:anywhere}.detail-card{margin-top:1rem;padding:1rem;border:1px solid var(--line);border-radius:1rem;background:rgba(255,255,255,.018)}.detail-card dl{display:grid;gap:.5rem}.detail-card dt{color:var(--dim);font-size:.59rem;font-weight:850;letter-spacing:.08em;text-transform:uppercase}.detail-card dd{margin:.1rem 0 0;font-size:.75rem;overflow-wrap:anywhere}.detail-card code{color:var(--cyan)}
@media(max-width:980px){.starmap-layout{grid-template-columns:1fr}.starmap-panel{position:static;max-height:none}.starmap-directory{grid-template-columns:repeat(2,minmax(0,1fr))}}
@media(max-width:700px){.proof-constellation{min-width:820px}.starmap-canvas{overflow-x:auto;padding-bottom:.35rem}.starmap-directory{grid-template-columns:1fr}.donor-label{font-size:7px}}
@media(prefers-reduced-motion:reduce){.starmap-toolbar a{transition:none!important}}
`;

let mapPromise = null;

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stable(value[key])]));
  }
  return value;
}

function stableStringify(value) {
  return JSON.stringify(stable(value));
}

function esc(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function requestUrl(req) {
  return new URL(String(req?.url || '/'), 'https://glaciereq.invalid');
}

function requestPath(req) {
  const parsed = requestUrl(req);
  const values = parsed.searchParams.getAll('path');
  const raw = values.length ? values.join('/') : parsed.pathname;
  return String(raw).replace(/^\/+|\/+$/g, '');
}

function handles(rawPath) {
  const path = String(rawPath || '').replace(/^\/+|\/+$/g, '');
  return path === 'atlas/starmap'
    || path === 'atlas/starmap/index.html'
    || path === 'data/proof-starmap.json'
    || path === 'assets/helix-starmap-runtime.css'
    || path === '__starmap_verify';
}

function captureSource(req, path) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    const headers = new Map();
    let size = 0;
    let settled = false;
    const innerReq = { ...req, url: `/?path=${encodeURIComponent(path)}` };
    const res = {
      statusCode: 200,
      setHeader(name, value) { headers.set(String(name).toLowerCase(), value); },
      getHeader(name) { return headers.get(String(name).toLowerCase()); },
      end(chunk = '') {
        if (settled) return;
        settled = true;
        const bytes = Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk));
        size += bytes.length;
        if (size > MAX_CAPTURE_BYTES) return reject(new Error('starmap_projection_capture_too_large'));
        chunks.push(bytes);
        resolve({ status: this.statusCode, headers, body: Buffer.concat(chunks) });
      },
      write(chunk = '') {
        const bytes = Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk));
        size += bytes.length;
        if (size > MAX_CAPTURE_BYTES) throw new Error('starmap_projection_capture_too_large');
        chunks.push(bytes);
      },
    };
    Promise.resolve(sourceProxy(innerReq, res))
      .then(() => { if (!settled) reject(new Error('starmap_projection_capture_did_not_end')); })
      .catch(reject);
  });
}

function companyLayout(companies) {
  const positions = new Map();
  const centerX = 550;
  const centerY = 390;
  const ordered = [...companies].sort((a, b) => {
    const depth = Number(b.ordinal || 0) - Number(a.ordinal || 0);
    return depth || String(a.name).localeCompare(String(b.name)) || String(a.id).localeCompare(String(b.id));
  });
  const rings = [];
  let remaining = ordered.length;
  let ring = 0;
  while (remaining > 0) {
    const capacity = 18 + ring * 10;
    const take = Math.min(remaining, capacity);
    rings.push(take);
    remaining -= take;
    ring += 1;
  }
  let index = 0;
  rings.forEach((count, ringIndex) => {
    const radius = 92 + ringIndex * 63;
    for (let slot = 0; slot < count; slot += 1) {
      const angle = (Math.PI * 2 * slot) / count - Math.PI / 2 + (ringIndex % 2 ? Math.PI / count : 0);
      const company = ordered[index];
      positions.set(company.id, [
        centerX + radius * Math.cos(angle),
        centerY + radius * Math.sin(angle),
      ]);
      index += 1;
    }
  });
  return { positions, rings, centerX, centerY, outerRadius: 92 + Math.max(0, rings.length - 1) * 63 };
}

function donorLayout(ids, baseY) {
  const positions = new Map();
  if (!ids.length) return { positions, rows: 0 };
  const columns = Math.min(8, ids.length);
  ids.forEach((id, index) => {
    const row = Math.floor(index / columns);
    const col = index % columns;
    const rowCount = Math.min(columns, ids.length - row * columns);
    const x = rowCount === 1 ? 550 : 135 + col * (830 / Math.max(1, rowCount - 1));
    positions.set(id, [x, baseY + row * 54]);
  });
  return { positions, rows: Math.ceil(ids.length / columns) };
}

function buildMap(projection) {
  if (!projection || typeof projection !== 'object') throw new Error('starmap_projection_invalid');
  if (!Array.isArray(projection.companies) || projection.companies.length < 1) throw new Error('starmap_companies_missing');
  if (!Array.isArray(projection?.second_depth?.stage_order) || projection.second_depth.stage_order.length !== STAGE_IDS.length) {
    throw new Error('starmap_stage_contract_missing');
  }
  projection.second_depth.stage_order.forEach((row, ordinal) => {
    if (row.id !== STAGE_IDS[ordinal]) throw new Error(`starmap_stage_contract_drift:${ordinal}`);
  });

  const ids = new Set();
  const companies = projection.companies.map((company) => {
    if (!COMPANY_ID_PATTERN.test(String(company.company_id || ''))) throw new Error('starmap_company_id_invalid');
    if (ids.has(company.company_id)) throw new Error(`starmap_duplicate_company:${company.company_id}`);
    ids.add(company.company_id);
    const depth = company.second_depth;
    if (!depth || !Number.isInteger(depth.ordinal) || depth.ordinal < 0 || depth.ordinal > 7) {
      throw new Error(`starmap_depth_invalid:${company.company_id}`);
    }
    if (depth.stage !== STAGE_IDS[depth.ordinal]) throw new Error(`starmap_stage_ordinal_mismatch:${company.company_id}`);
    return {
      id: company.company_id,
      name: company.display_name,
      route: `/companies/${company.company_id.replaceAll('_', '-')}/`,
      stage: depth.stage,
      ordinal: depth.ordinal,
      claim_ceiling: depth.claim_ceiling,
      blockers: Array.isArray(depth.blockers) ? depth.blockers : [],
      next_gate: depth.next_gate,
      donors: Array.isArray(company.applicable_flagships) ? [...new Set(company.applicable_flagships)].sort() : [],
      boundary: company.non_affiliation,
    };
  });
  companies.sort((a, b) => a.name.localeCompare(b.name) || a.id.localeCompare(b.id));
  const donorIds = [...new Set(companies.flatMap((company) => company.donors))].sort();
  const stageCounts = Object.fromEntries(STAGE_IDS.map((stage) => [stage, 0]));
  companies.forEach((company) => { stageCounts[company.stage] += 1; });
  const core = {
    schema: MAP_SCHEMA,
    release: RELEASE,
    source: {
      repository: 'GlacierEQ/job-app-helix',
      commit: projection.source_commit,
      projection_schema: projection.schema,
    },
    restoration_lineage: {
      qwen_donor_commit: DONOR_COMMIT,
      scalable_refresh_commit: SCALABILITY_COMMIT,
      recovered_mechanisms: [
        'proof-encoded company constellation',
        'claim-promoted crown semantics',
        'cross-system donor graph',
        'evolution ladder',
        'script-free keyboard-accessible navigation',
      ],
      surpassed_ceiling: 'live runtime now scales from the full pinned Helix projection instead of a fixed historical company cardinality',
    },
    stage_order: projection.second_depth.stage_order,
    stage_counts: stageCounts,
    donor_ids: donorIds,
    companies,
  };
  return { ...core, receipt_sha256: sha256(stableStringify(core)) };
}

async function loadMap(req) {
  if (!mapPromise) {
    mapPromise = captureSource(req, 'data/company-atlas.json')
      .then(({ status, body }) => {
        if (status !== 200) throw new Error(`starmap_projection_http_${status}`);
        return buildMap(JSON.parse(body.toString('utf8')));
      })
      .catch((error) => {
        mapPromise = null;
        throw error;
      });
  }
  return mapPromise;
}

function selection(req, map) {
  const url = requestUrl(req);
  const stage = url.searchParams.get('stage') || '';
  const company = url.searchParams.get('company') || '';
  const stageValid = !stage || STAGE_IDS.includes(stage);
  const companyValid = !company || map.companies.some((item) => item.id === company);
  return {
    stage,
    company,
    valid: stageValid && companyValid,
    companies: stageValid && companyValid
      ? map.companies.filter((item) => (!stage || item.stage === stage) && (!company || item.id === company))
      : [],
  };
}

function curve([ax, ay], [bx, by]) {
  const controlX = (ax + bx) / 2;
  const controlY = Math.min(ay, by) - Math.max(24, Math.abs(bx - ax) * 0.05);
  return `M${ax.toFixed(1)} ${ay.toFixed(1)} Q ${controlX.toFixed(1)} ${controlY.toFixed(1)} ${bx.toFixed(1)} ${by.toFixed(1)}`;
}

function renderHtml(map, selected) {
  const visible = selected.companies;
  const layout = companyLayout(visible);
  const donorIds = [...new Set(visible.flatMap((company) => company.donors))].sort();
  const donorBaseY = Math.max(785, layout.centerY + layout.outerRadius + 88);
  const donor = donorLayout(donorIds, donorBaseY);
  const svgHeight = donorBaseY + Math.max(1, donor.rows) * 54 + 44;
  const companyGroups = visible.map((company) => {
    const position = layout.positions.get(company.id);
    const [x, y] = position;
    const edges = company.donors.filter((id) => donor.positions.has(id)).map((id) => `<path class="donor-edge" d="${curve(position, donor.positions.get(id))}"/>`).join('');
    const crown = company.ordinal === 7 ? `<path class="crown" d="M${x - 7} ${y - 15} l3 -6 l4 4 l4 -4 l3 6 z"/>` : '';
    return `<g class="company-linkage"><a class="starmap-star sd-${company.ordinal}" href="?company=${encodeURIComponent(company.id)}#detail" aria-label="${esc(company.name)} — ${esc(company.stage)}"><title>${esc(company.name)} · ${esc(company.stage)} · ${esc(company.claim_ceiling)}</title><circle class="hit" cx="${x}" cy="${y}" r="12"/><circle class="halo" cx="${x}" cy="${y}" r="8"/><circle class="star-core" cx="${x}" cy="${y}" r="${(2.5 + company.ordinal * 0.5).toFixed(1)}"/>${crown}</a>${edges}</g>`;
  }).join('');
  const donorNodes = donorIds.map((id) => {
    const [x, y] = donor.positions.get(id);
    return `<g class="donor-node"><rect class="donor-core" x="${x - 5}" y="${y - 5}" width="10" height="10" rx="3"/><text class="donor-label" x="${x}" y="${y + 22}">${esc(id.replaceAll('_', ' '))}</text></g>`;
  }).join('');
  const orbitGuides = layout.rings.map((_, index) => {
    const radius = 92 + index * 63;
    return `<circle class="orbit" cx="${layout.centerX}" cy="${layout.centerY}" r="${radius}"/>`;
  }).join('');
  const current = selected.company ? map.companies.find((item) => item.id === selected.company) : null;
  const stageLinks = STAGE_IDS.map((stage) => `<a${selected.stage === stage ? ' aria-current="true"' : ''} href="/atlas/starmap/?stage=${encodeURIComponent(stage)}">${esc(stage.replaceAll('_', ' '))} <b>${map.stage_counts[stage]}</b></a>`).join('');
  const directory = visible.map((company) => `<a href="?company=${encodeURIComponent(company.id)}#detail"><strong>${esc(company.name)}</strong><small>${esc(company.stage)} · ${esc(company.claim_ceiling)}</small></a>`).join('');
  const detail = current ? `<article id="detail" class="detail-card"><p class="eyebrow">SELECTED COMPANY</p><h3>${esc(current.name)}</h3><dl><div><dt>Proof stage</dt><dd>${esc(current.stage)}</dd></div><div><dt>Claim ceiling</dt><dd><code>${esc(current.claim_ceiling)}</code></dd></div><div><dt>Transferable donors</dt><dd>${current.donors.length ? esc(current.donors.join(' · ')) : 'None attached to the current Helix company record.'}</dd></div><div><dt>Next gate</dt><dd>${esc(current.next_gate)}</dd></div><div><dt>Boundary</dt><dd>${esc(current.boundary)}</dd></div></dl><p><a class="button primary small" href="${esc(current.route)}">Open full company route</a></p></article>` : '';
  const selectorWarning = selected.valid ? '' : '<div class="callout"><strong>No matching proof route.</strong><p>Unknown selectors fail closed instead of broadening the displayed evidence.</p></div>';

  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><meta name="theme-color" content="#03080b"><meta name="description" content="Live script-free GlacierEQ proof starmap: Helix-governed company progression and transferable system relationships."><meta name="robots" content="index,follow"><link rel="canonical" href="https://casey-barton-glaciereq.vercel.app/atlas/starmap/"><title>Proof Starmap · Company Atlas · Casey Barton</title><link rel="stylesheet" href="/assets/site.css"><link rel="stylesheet" href="/assets/site.systems.css"><link rel="stylesheet" href="/assets/helix-atlas.css"><link rel="stylesheet" href="/assets/helix-starmap-runtime.css"></head><body><a class="skip" href="#main">Skip to content</a><div class="signal-bar"><div class="shell signal-inner"><span class="signal-live">${RELEASE}</span><span>${map.companies.length} governed company tracks · ${map.donor_ids.length} donor systems · zero client scripts</span></div></div><header class="site-header"><div class="shell nav"><a class="brand" href="/"><span class="mark">CB</span><span><strong>CASEY BARTON</strong><small>APPLIED AI SYSTEMS ARCHITECT</small></span></a><nav class="links" aria-label="Primary navigation"><a href="/">Recruiter</a><a href="/resume/">Résumé</a><a href="/master/">Master</a><a href="/mesh/">Mesh</a><a aria-current="page" href="/atlas/">Atlas</a><a href="/machine/">Machine</a></nav></div></header><main id="main"><section class="hero starmap-hero"><div class="shell"><p class="eyebrow">RESTORED CONSTELLATION · LIVE HELIX PROJECTION</p><h1>See <em>proof progression</em> and capability reuse at estate scale.</h1><p class="lead">The historical Qwen starmap is now a live runtime over the full pinned Helix projection. Brightness encodes proof depth, crowns require CLAIM_PROMOTED, and donor edges come only from each company record's transferable flagship references.</p><div class="proof-strip"><div><b>${map.companies.length}</b><span>governed company tracks</span></div><div><b>${map.stage_counts.CLAIM_PROMOTED}</b><span>claim-promoted</span></div><div><b>${map.donor_ids.length}</b><span>donor systems</span></div><div><b>0</b><span>browser scripts</span></div></div><div class="actions"><a class="button primary" href="/atlas/starmap/">Full starmap</a><a class="button secondary" href="/atlas/">Company Atlas</a><a class="button ghost" href="/data/proof-starmap.json">Machine map</a></div></div></section><section class="section starmap-section"><div class="shell">${selectorWarning}<div class="starmap-toolbar"><a${!selected.stage && !selected.company ? ' aria-current="true"' : ''} href="/atlas/starmap/">All ${map.companies.length}</a></div><div class="starmap-layout"><div class="starmap-canvas"><svg class="proof-constellation" viewBox="0 0 1100 ${svgHeight}" role="img" aria-label="Proof starmap with ${visible.length} visible company stars">${orbitGuides}${companyGroups}${donorNodes}</svg><p class="starmap-legend"><span>dim → bright = mapped → reproduced proof</span><span>crown = claim promoted</span><span class="legend-donor">gold edge = transferable flagship reference</span></p></div><aside class="starmap-panel"><p class="eyebrow">PROOF STAGES</p><div class="stage-counts">${stageLinks}</div>${detail}</aside></div></div></section><section class="section alt"><div class="shell"><div class="section-head"><div><p class="eyebrow">VISIBLE COMPANY ROUTES</p><h2>${visible.length} exact proof-bound targets.</h2></div><p>Filter links are server-rendered and fail closed. Every company remains reachable through its full recruiter/master/machine/mesh route.</p></div><div class="starmap-directory">${directory || '<p>No company matches the requested selector.</p>'}</div></div></section></main><footer class="site-footer"><div class="shell"><p><strong>Casey Barton · GlacierEQ</strong></p><p>Independent portfolio intelligence. Company naming does not imply affiliation, employment, endorsement, proprietary access, adoption, or deployment.</p></div></footer></body></html>\n`;
}

function securityHeaders(res) {
  res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'none'; style-src 'self'; img-src 'self' data:; connect-src 'none'; font-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'; form-action 'self' mailto:; upgrade-insecure-requests");
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=()');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  res.setHeader('X-GlacierEQ-Release', RELEASE);
}

function send(res, status, type, body, cache = 'public, max-age=0, s-maxage=300, must-revalidate') {
  const bytes = Buffer.isBuffer(body) ? body : Buffer.from(String(body));
  res.statusCode = status;
  res.setHeader('Content-Type', type);
  res.setHeader('Cache-Control', cache);
  res.setHeader('Content-Length', String(bytes.length));
  res.end(bytes);
}

async function verify(req, res) {
  const map = await loadMap(req);
  const selected = selection({ ...req, url: '/atlas/starmap/' }, map);
  const html = renderHtml(map, selected);
  const pass = map.companies.length > 0
    && map.companies.length === selected.companies.length
    && map.receipt_sha256.length === 64
    && !/<script(?:\s|>)/i.test(html)
    && html.includes(RELEASE)
    && html.includes('/data/proof-starmap.json');
  const payload = {
    schema: VERIFY_SCHEMA,
    status: pass ? 'PASS' : 'FAIL',
    release: RELEASE,
    source_commit: map.source.commit,
    company_count: map.companies.length,
    donor_count: map.donor_ids.length,
    stage_counts: map.stage_counts,
    receipt_sha256: map.receipt_sha256,
    script_free: !/<script(?:\s|>)/i.test(html),
    full_projection_visible: map.companies.length === selected.companies.length,
    restoration_lineage: map.restoration_lineage,
  };
  return send(res, pass ? 200 : 503, 'application/json; charset=utf-8', `${JSON.stringify(payload, null, 2)}\n`, 'no-store');
}

module.exports = async function starmapProxy(req, res) {
  securityHeaders(res);
  const path = requestPath(req);
  try {
    if (path === 'assets/helix-starmap-runtime.css') {
      return send(res, 200, 'text/css; charset=utf-8', CSS, 'public, max-age=0, s-maxage=3600, must-revalidate');
    }
    if (path === '__starmap_verify') return verify(req, res);
    const map = await loadMap(req);
    if (path === 'data/proof-starmap.json') {
      return send(res, 200, 'application/json; charset=utf-8', `${JSON.stringify(map, null, 2)}\n`);
    }
    if (path === 'atlas/starmap' || path === 'atlas/starmap/index.html') {
      const selected = selection(req, map);
      return send(res, selected.valid ? 200 : 404, 'text/html; charset=utf-8', renderHtml(map, selected), 'public, max-age=0, s-maxage=900, must-revalidate');
    }
    return send(res, 404, 'text/plain; charset=utf-8', 'Proof Starmap route not found.');
  } catch (error) {
    return send(res, 503, 'application/json; charset=utf-8', `${JSON.stringify({ schema: 'glaciereq.v30-proof-starmap-error.v1', status: 'UNAVAILABLE', release: RELEASE, error: error instanceof Error ? error.message : String(error) })}\n`, 'no-store');
  }
};

module.exports.RELEASE = RELEASE;
module.exports.STAGE_IDS = STAGE_IDS;
module.exports.CSS = CSS;
module.exports.handles = handles;
module.exports.requestPath = requestPath;
module.exports.buildMap = buildMap;
module.exports.companyLayout = companyLayout;
module.exports.selection = selection;
module.exports.renderHtml = renderHtml;

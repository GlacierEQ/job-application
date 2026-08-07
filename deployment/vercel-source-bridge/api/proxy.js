const crypto = require('crypto');
const { URL } = require('node:url');

const SOURCE_COMMIT = '150487be1d3cf88dd5886117e88125a4739faef3';
const HELIX_COMMIT = '556786e96ca49507125c77a62cb17904d645e134';
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
  'index.html': '960591eddf993906100a31f910a066acfade3e17fbb1a6a3ab8a5310ae1bbfd7',
  'resume/index.html': '0b956afa686604796ba983992768a85e67f442364e630471f5a2d1654d7f3cc1',
  'master/index.html': 'ee1b8d8cd5fe36d1e04e83667bf7ff8f463a89b8e057b340430b203f1ee189cd',
  'mesh/index.html': 'c2eb82d6d612a1b0272ee0593d4624b916eb6cc8d305d93b78f2ca2d9f9707e2',
  'machine/index.html': '04ae02c47333db08d533377a23b6250077ee1168ec79af539d104f844964f009',
  'assets/site.css': '8f3a659076fa9a4cbb90cf623baf5a29dad2a1cf14c246f4496aeb48c382012b',
  'assets/site.systems.css': '47c31b9d8a3e4eccfe87569b97a702a2fa1ff1641856febd8d275aa4af888407',
  'downloads/Casey_Barton_Resume.pdf': 'c46b4c3c31bea8405c28322e9f81be4ffd36c7faec9154acfd8da16a647cd1e3',
  'downloads/Casey_Barton_Resume.docx': 'aa022ca8c40d59624e6e7e3ef88fb439f6d21c7adcb997a0b11cd50b05827d0e',
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
  res.setHeader('X-PSYSOCX-Release', 'V19-COMPANY-SECOND-DEPTH');
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

const fetchSource = (filePath) => fetchBuffer(
  RAW_ROOT + filePath,
  'GlacierEQ-V19-Source-Bridge/1.0',
);

async function fetchHelixJson(filePath) {
  const { response, body } = await fetchBuffer(
    HELIX_ROOT + filePath,
    'GlacierEQ-V19-Company-Second-Depth/1.0',
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
  if (JSON.stringify(contract.field_kinds) !== JSON.stringify(EVIDENCE_KIND_BY_FIELD)) {
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
  if (companies.length !== 49) throw new Error(`expected 49 company tracks, received ${companies.length}`);
  const lockheed = companies.find((company) => company.company_id === 'lockheed_martin');
  if (!lockheed) throw new Error('Lockheed Martin track is missing');
  if (lockheed.repositories.length !== 0 || lockheed.second_depth.stage !== 'MAPPED_ONLY' ||
      lockheed.second_depth.claim_ceiling !== 'company_alignment_only') {
    throw new Error('Lockheed Martin truth boundary drift');
  }

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

function machineWire(company) {
  const record = compactMachineRecord(company);
  const repos = record.repos.map((repo) => `${repo.id}|${repo.lvl}|${repo.state}|${repo.provenance}`).join(';') || '∅';
  const roles = record.roles.join('|') || '∅';
  const blockers = record.second_depth.blockers.join('|') || '∅';
  return `GEQ.CI/1 id=${record.id} state=${record.state} track=${record.track}\nROLE[${roles}]\nREPO[${repos}]\nDEPTH[${record.second_depth.stage}|${record.second_depth.claim_ceiling}]\nBLOCKER[${blockers}]\nHOOK route=${record.route} json=${record.route}record.json\nNEXT ${record.second_depth.next_gate}`;
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
    const { response, body, sha256: actual } = await fetchSource('assets/helix-atlas.css');
    const text = body.toString('utf8');
    const ok = response.ok && text.includes('.constellation-stage') && text.includes('.atlas-star.star-p48{');
    pass = pass && ok;
    files.push({ path: 'assets/helix-atlas.css', status: response.status, bytes: body.length, sha256: actual, expected: 'contains .constellation-stage and .atlas-star.star-p48', ok });
  } catch (error) {
    pass = false;
    files.push({ path: 'assets/helix-atlas.css', ok: false, error: error.message });
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
    const topologyOk = projection.company_count === 49 && memberships === 59 &&
      stageCounts.MAPPED_ONLY === 49 &&
      lockheed && lockheed.repositories.length === 0 &&
      lockheed.second_depth.stage === 'MAPPED_ONLY' &&
      lockheed.second_depth.claim_ceiling === 'company_alignment_only';
    pass = pass && topologyOk;
  }

  res.statusCode = pass ? 200 : 503;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify({
    schema: 'glaciereq.v19-production-verification.v1',
    status: pass ? 'PASS' : 'FAIL',
    source_commit: SOURCE_COMMIT,
    helix_source_commit: HELIX_COMMIT,
    release: 'V19 Company Second Depth',
    canonical_routes: ['/', '/resume/', '/master/', '/mesh/', '/machine/', '/companies/', '/atlas/'],
    company_routes: projection?.company_count ?? null,
    public_repository_memberships: projection ? memberships : null,
    second_depth: projection ? stageCounts : null,
    lockheed_martin: lockheed ? {
      repositories: lockheed.repositories.length,
      stage: lockheed.second_depth.stage,
      claim_ceiling: lockheed.second_depth.claim_ceiling,
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
  if (raw === '__v19_verify' || raw === '__v18_verify' || raw === '__v15_verify') {
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
module.exports.constants = { SOURCE_COMMIT, HELIX_COMMIT, SECOND_DEPTH_PATH };

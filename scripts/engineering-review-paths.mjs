import { isUnavailableGithubUrl } from './unavailable-github-repositories.mjs';

const PUBLIC_SURFACES = new Set(['PUBLIC', 'PUBLIC_ALLOWLIST_REQUIRED']);
const OMITTED_STATES = new Set(['PRIVATE', 'EXCLUDED']);
const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const PUBLIC_SOURCE = /^https:\/\/github\.com\/GlacierEQ\/[A-Za-z0-9_-][A-Za-z0-9._-]*$/;
const escape = value => String(value).replace(/[&<>"']/g, character => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
})[character]);

const ROLE_PATHS = [
  {
    id: 'applied-ai',
    title: 'Applied AI engineering',
    responsibility: 'Connect model behavior to a usable workflow, define execution gates, and make the result inspectable.',
    case_ids: ['agent-assurance', 'programmatic-delivery'],
    system_ids: ['helix', 'pro-code-runtime', 'tower-of-babel'],
  },
  {
    id: 'platform',
    title: 'Platform engineering',
    responsibility: 'Define runtime contracts, investigate uncertain provider outcomes, and design recovery before retrying a side effect.',
    case_ids: ['provider-recovery'],
    system_ids: ['sigma-glue', 'pro-code-runtime', 'akos'],
  },
  {
    id: 'technical-operations',
    title: 'Technical operations',
    responsibility: 'Turn changing inputs into repeatable delivery, preserve source ownership, and make verification and handoff explicit.',
    case_ids: ['programmatic-delivery'],
    system_ids: ['helix', 'job-application', 'receipt-router'],
  },
];

const CASE_TITLES = {
  'agent-assurance': 'Agent execution gates',
  'programmatic-delivery': 'Programmatic delivery',
  'provider-recovery': 'Provider recovery',
};

// Read only admitted public fields. Visibility controls whether a source may be
// linked; it never upgrades the source-owned evidence or remaining gates.
export function buildReviewPaths(portfolio) {
  if (!Array.isArray(portfolio?.flagships)) throw new Error('review_paths_flagships_missing');
  const seen = new Set();
  const systems = [];
  for (const entry of portfolio.flagships) {
    if (!PUBLIC_SURFACES.has(entry?.public_surface) || OMITTED_STATES.has(entry?.state)) continue;
    if (typeof entry.id !== 'string' || !SLUG.test(entry.id)) throw new Error('review_paths_system_id_invalid');
    if (seen.has(entry.id)) throw new Error(`review_paths_system_id_duplicate:${entry.id}`);
    seen.add(entry.id);
    for (const field of ['name', 'state', 'evidence', 'limit']) {
      if (typeof entry[field] !== 'string' || !entry[field].trim()) {
        throw new Error(`review_paths_system_field_missing:${entry.id}:${field}`);
      }
    }
    if (typeof entry.repo !== 'string' || !PUBLIC_SOURCE.test(entry.repo)) {
      throw new Error(`review_paths_source_invalid:${entry.id}`);
    }
    const system = {
      id: entry.id,
      name: entry.name,
      state: entry.state,
      evidence: entry.evidence,
      boundary: entry.limit,
      review: `/evidence-gallery/${entry.id}/`,
    };
    if (entry.public_surface === 'PUBLIC' && !isUnavailableGithubUrl(entry.repo)) system.source = entry.repo;
    systems.push(system);
  }
  const roles = ROLE_PATHS.map(role => ({
    ...role,
    case_ids: [...role.case_ids],
    system_ids: role.system_ids.filter(id => seen.has(id)),
  }));
  return { roles, systems };
}

export function renderReviewPaths(model) {
  const systems = new Map(model.systems.map(system => [system.id, system]));
  const roles = model.roles.map(role => `<article class="experience-role" aria-labelledby="review-role-${escape(role.id)}">
<h3 id="review-role-${escape(role.id)}">${escape(role.title)}</h3><p>${escape(role.responsibility)}</p>
<p class="eyebrow">Start with a working example</p><ul>${role.case_ids.map(id => `<li><a href="#${escape(id)}">${escape(CASE_TITLES[id] ?? id)}</a></li>`).join('')}</ul>
${role.system_ids.length ? `<p class="eyebrow">Supporting systems</p><ul>${role.system_ids.filter(id => systems.has(id)).map(id => `<li><a href="#coverage-${escape(id)}">${escape(systems.get(id).name)}</a></li>`).join('')}</ul>` : ''}
</article>`).join('\n');
  const coverage = model.systems.map(system => `<details class="experience-coverage" id="coverage-${escape(system.id)}">
<summary>${escape(system.name)} <span>${escape(system.state)}</span></summary>
<dl><dt>Recorded source evidence</dt><dd>${escape(system.evidence)}</dd><dt>Scope and remaining gates</dt><dd>${escape(system.boundary)}</dd></dl>
<p><a href="${escape(system.review)}">Review public evidence →</a></p>
${system.source ? `<p><a href="${escape(system.source)}">Inspect public source ↗</a></p>` : '<p>Public method; source access limited.</p>'}
</details>`).join('\n');
  return `<section class="section" id="review-paths" aria-labelledby="review-paths-title"><div class="shell">
<div class="section-head"><div><p class="eyebrow">ROLE REVIEW PATHS</p><h2 id="review-paths-title">Connect the engineering to the responsibility.</h2></div><p>Suggested review paths connect demonstrated capabilities to role responsibilities. They do not imply employment, affiliation, or production adoption.</p></div>
<div class="experience-role-grid">${roles}</div></div></section>
<section class="section" id="portfolio-coverage" aria-labelledby="portfolio-coverage-title"><div class="shell">
<div class="section-head"><div><p class="eyebrow">PUBLIC PORTFOLIO COVERAGE</p><h2 id="portfolio-coverage-title">Inspect each system at its recorded evidence level.</h2></div><p>Every admitted public system keeps its source state, evidence, and remaining gates. These records provide context; they do not create new proof.</p></div>
<div class="experience-coverage-grid">${coverage}</div></div></section>`;
}

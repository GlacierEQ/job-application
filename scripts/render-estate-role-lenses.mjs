#!/usr/bin/env node

import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SITE = path.join(ROOT, 'site-v15');
const ESTATE_PATH = path.join(SITE, 'data', 'public-estate.json');
const OUTPUT_PATH = path.join(SITE, 'data', 'estate-role-lenses.json');
const HTML_PATH = path.join(SITE, 'estate', 'index.html');
const START = '<!-- ESTATE_ROLE_LENSES_START -->';
const END = '<!-- ESTATE_ROLE_LENSES_END -->';
const INSERTION = '<section class="section"><div class="shell"><div class="section-head"><div><p class="eyebrow">CAPABILITY FAMILIES</p>';

const ROLE_LENSES = [
  {
    id: 'forward-deployed-ai-architect',
    title: 'Forward-Deployed AI Architect',
    thesis: 'Systems that connect messy operating reality to working AI, deployment, evidence, and human workflows.',
    family_weights: {
      'job-career': 8,
      'company-engineering': 7,
      'agents-orchestration': 6,
      infrastructure: 5,
      'documents-evidence': 4,
      'developer-tooling': 3,
    },
    terms: ['agent', 'application', 'workflow', 'deploy', 'integration', 'automation', 'evidence', 'system', 'infra'],
  },
  {
    id: 'principal-agentic-systems-architect',
    title: 'Principal Agentic Systems Architect',
    thesis: 'Agent coordination, state, memory, authority, orchestration, recovery, and composable multi-system architecture.',
    family_weights: {
      'agents-orchestration': 8,
      'apex-control': 7,
      'memory-context': 6,
      'developer-tooling': 5,
      infrastructure: 4,
      'models-inference': 3,
    },
    terms: ['agent', 'swarm', 'mesh', 'memory', 'context', 'orchestrat', 'authority', 'control', 'recovery'],
  },
  {
    id: 'principal-ai-platform-automation-architect',
    title: 'Principal AI Platform / Automation Architect',
    thesis: 'Platform boundaries, developer tooling, runtime automation, infrastructure, model services, and reliable operations.',
    family_weights: {
      infrastructure: 8,
      'developer-tooling': 7,
      'apex-control': 6,
      'models-inference': 5,
      'agents-orchestration': 4,
      'documents-evidence': 2,
    },
    terms: ['platform', 'runtime', 'cloud', 'api', 'mcp', 'automation', 'server', 'model', 'inference', 'code'],
  },
  {
    id: 'staff-principal-applied-ai-engineer',
    title: 'Staff / Principal Applied AI Engineer',
    thesis: 'Applied model systems, retrieval, agent behavior, evaluation, evidence pipelines, and production-facing AI mechanisms.',
    family_weights: {
      'models-inference': 8,
      'agents-orchestration': 7,
      'company-engineering': 6,
      'memory-context': 5,
      'documents-evidence': 4,
      'developer-tooling': 3,
    },
    terms: ['ai', 'model', 'inference', 'rag', 'retriev', 'agent', 'eval', 'evidence', 'embedding', 'llm'],
  },
];

function fail(message) {
  throw new Error(`Estate role lenses failed: ${message}`);
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stable(value[key])]));
  }
  return value;
}

function stableJson(value) {
  return `${JSON.stringify(stable(value), null, 2)}\n`;
}

function sha256(text) {
  return createHash('sha256').update(text).digest('hex');
}

function candidateText(record) {
  return [record.name, record.description, record.language, record.family]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
}

export function scoreRepository(record, lens) {
  const familyScore = lens.family_weights[record.family_id] ?? 0;
  const text = candidateText(record);
  const matchedTerms = lens.terms.filter((term) => text.includes(term));
  const portfolioBonus = record.current_portfolio ? 5 : 0;
  const activeBonus = record.archived ? 0 : 2;
  const nativeBonus = record.fork ? 0 : 1;
  const evidenceScore = familyScore + Math.min(4, matchedTerms.length) + portfolioBonus + activeBonus + nativeBonus;
  return {
    evidence_score: evidenceScore,
    family_score: familyScore,
    matched_terms: matchedTerms,
    current_portfolio_bonus: portfolioBonus,
    active_bonus: activeBonus,
    native_bonus: nativeBonus,
  };
}

export function compileRoleLenses(estate, { limit = 8 } = {}) {
  if (!estate || estate.schema !== 'glaciereq.public-estate-explorer.v1' || !Array.isArray(estate.records)) {
    fail('public estate payload is invalid or unsupported');
  }
  if (!Number.isInteger(limit) || limit < 1 || limit > 25) fail('limit must be an integer between 1 and 25');

  const lenses = ROLE_LENSES.map((lens) => {
    const candidates = estate.records
      .map((record) => ({ record, score: scoreRepository(record, lens) }))
      .filter(({ score }) => score.family_score > 0 || score.matched_terms.length > 0)
      .sort((left, right) => (
        right.score.evidence_score - left.score.evidence_score
        || Number(right.record.current_portfolio) - Number(left.record.current_portfolio)
        || Number(left.record.archived) - Number(right.record.archived)
        || Number(left.record.fork) - Number(right.record.fork)
        || left.record.repository.localeCompare(right.record.repository)
      ));

    const selected = candidates.slice(0, limit).map(({ record, score }, rank) => ({
      rank: rank + 1,
      repository: record.repository,
      name: record.name,
      url: record.url,
      description: record.description,
      family_id: record.family_id,
      family: record.family,
      language: record.language,
      archived: record.archived,
      fork: record.fork,
      current_portfolio: record.current_portfolio,
      evidence_score: score.evidence_score,
      score_components: {
        family: score.family_score,
        matched_terms: score.matched_terms,
        current_portfolio_bonus: score.current_portfolio_bonus,
        active_bonus: score.active_bonus,
        native_bonus: score.native_bonus,
      },
    }));

    return {
      id: lens.id,
      title: lens.title,
      thesis: lens.thesis,
      selected_count: selected.length,
      eligible_count: candidates.length,
      repositories: selected,
    };
  });

  const payload = {
    schema: 'glaciereq.estate-role-lenses.v1',
    source: {
      schema: estate.schema,
      receipt_sha256: estate.receipt_sha256,
      portal_source: estate.portal_source,
      public_discovered_count: estate.public_discovered_count,
    },
    policy: {
      semantics: 'CAPABILITY_OVERLAP_NOT_HIRING_PREDICTION',
      private_repository_identities: 'NOT_PRESENT_IN_PUBLIC_SOURCE',
      archived_and_forked_records: 'PRESERVED_AND_LABELED',
      ranking_basis: 'TRANSPARENT_FAMILY_AND_REPOSITORY_METADATA_MATCH',
      limit_per_role: limit,
    },
    lenses,
  };
  payload.receipt_sha256 = sha256(stableJson(payload));
  return payload;
}

function repositoryCard(repository) {
  const tags = [
    repository.current_portfolio ? '<span class="estate-tag portfolio">current portfolio</span>' : '',
    repository.archived ? '<span class="estate-tag archive">archived · preserved</span>' : '<span class="estate-tag active">active</span>',
    repository.fork ? '<span class="estate-tag fork">fork / lineage</span>' : '<span class="estate-tag">native owner repo</span>',
  ].filter(Boolean).join('');
  const reasons = [
    `family ${repository.score_components.family}`,
    repository.score_components.matched_terms.length ? `signals ${repository.score_components.matched_terms.join(', ')}` : 'family alignment',
    repository.current_portfolio ? 'current portfolio' : 'estate depth',
  ].join(' · ');
  return `<article class="estate-role-repo"><div class="estate-role-rank">${repository.rank}</div><div><h3><a href="${escapeHtml(repository.url)}" target="_blank" rel="noopener">${escapeHtml(repository.name)}</a></h3><p>${escapeHtml(repository.description || 'Inspect repository source before promoting a capability claim.')}</p><div class="estate-tags">${tags}</div><small>${escapeHtml(reasons)} · evidence score ${repository.evidence_score}</small></div></article>`;
}

export function renderRoleLenses(payload) {
  const cards = payload.lenses.map((lens, index) => `<details class="estate-role-lens"${index === 0 ? ' open' : ''}><summary><div><p class="eyebrow">ROLE LENS ${String(index + 1).padStart(2, '0')}</p><h3>${escapeHtml(lens.title)}</h3><p>${escapeHtml(lens.thesis)}</p></div><span>${lens.selected_count} surfaced / ${lens.eligible_count} matching</span></summary><div class="estate-role-grid">${lens.repositories.map(repositoryCard).join('')}</div></details>`).join('');
  return `${START}<section class="section estate-role-section"><div class="shell"><div class="section-head"><div><p class="eyebrow">ROLE-DRIVEN ESTATE INTELLIGENCE</p><h2>Turn hundreds of repositories into inspectable hiring evidence lanes.</h2></div><p>These lenses prioritize capability overlap for the four current target roles using transparent repository metadata and family signals. They do not predict hiring outcomes, erase low-ranked repositories, or promote a repository into a capability claim.</p></div><div class="estate-role-policy"><strong>How ranking works:</strong> capability-family alignment + matching repository signals + current-portfolio relevance + active/native preference. The full estate remains below, unchanged.</div>${cards}<p class="estate-source">Role-lens receipt sha256:${escapeHtml(payload.receipt_sha256)} · public-estate receipt sha256:${escapeHtml(payload.source.receipt_sha256)}</p></div></section>${END}`;
}

export function injectRoleLenses(html, rendered) {
  if (typeof html !== 'string' || !html.includes(INSERTION)) fail('estate HTML insertion anchor missing');
  const start = html.indexOf(START);
  const end = html.indexOf(END);
  let base = html;
  if (start >= 0 || end >= 0) {
    if (start < 0 || end < start) fail('estate role-lens marker pair corrupt');
    base = `${html.slice(0, start)}${html.slice(end + END.length)}`;
  }
  const anchor = base.indexOf(INSERTION);
  if (anchor < 0) fail('estate HTML insertion anchor missing after normalization');
  return `${base.slice(0, anchor)}${rendered}\n${base.slice(anchor)}`;
}

async function main() {
  const [estate, html] = await Promise.all([
    readFile(ESTATE_PATH, 'utf8').then(JSON.parse),
    readFile(HTML_PATH, 'utf8'),
  ]);
  const payload = compileRoleLenses(estate);
  const rendered = renderRoleLenses(payload);
  const nextHtml = injectRoleLenses(html, rendered);
  await Promise.all([
    writeFile(OUTPUT_PATH, stableJson(payload), 'utf8'),
    writeFile(HTML_PATH, nextHtml, 'utf8'),
  ]);
  console.log(JSON.stringify({
    status: 'PASS',
    schema: payload.schema,
    roles: payload.lenses.length,
    surfaced_repositories: [...new Set(payload.lenses.flatMap((lens) => lens.repositories.map((row) => row.repository)))].length,
    public_estate_repositories: payload.source.public_discovered_count,
    receipt_sha256: payload.receipt_sha256,
  }, null, 2));
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.stack : error);
    process.exitCode = 1;
  });
}

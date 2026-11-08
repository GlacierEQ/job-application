import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { buildReviewPaths, renderReviewPaths } from '../scripts/engineering-review-paths.mjs';
import { isUnavailableGithubUrl } from '../scripts/unavailable-github-repositories.mjs';

const source = JSON.parse(await readFile(new URL('../site-v15/data/portfolio.json', import.meta.url), 'utf8'));
const fixture = () => structuredClone(source);

test('all admitted flagships retain their exact recorded fields without source mutation', () => {
  const portfolio = fixture();
  const before = structuredClone(portfolio);
  const model = buildReviewPaths(portfolio);
  const admitted = portfolio.flagships.filter(entry => ['PUBLIC', 'PUBLIC_ALLOWLIST_REQUIRED'].includes(entry.public_surface));
  assert.deepEqual(model.systems.map(entry => entry.id), admitted.map(entry => entry.id));
  for (const entry of admitted) {
    const system = model.systems.find(item => item.id === entry.id);
    assert.equal(system.name, entry.name);
    assert.equal(system.state, entry.state);
    assert.equal(system.evidence, entry.evidence);
    assert.equal(system.boundary, entry.limit);
    assert.equal(system.review, `/evidence-gallery/${entry.id}/`);
    assert.deepEqual(Object.keys(system).sort(), (system.source ? ['id', 'name', 'state', 'evidence', 'boundary', 'review', 'source'] : ['id', 'name', 'state', 'evidence', 'boundary', 'review']).sort());
  }
  assert.deepEqual(portfolio, before);
});

test('role routes retain the declared cases and only reference admitted systems', () => {
  const model = buildReviewPaths(fixture());
  assert.deepEqual(model.roles.map(role => ({ id: role.id, case_ids: role.case_ids, system_ids: role.system_ids })), [
    { id: 'applied-ai', case_ids: ['agent-assurance', 'programmatic-delivery'], system_ids: ['helix', 'pro-code-runtime', 'tower-of-babel'] },
    { id: 'platform', case_ids: ['provider-recovery'], system_ids: ['sigma-glue', 'pro-code-runtime', 'akos'] },
    { id: 'technical-operations', case_ids: ['programmatic-delivery'], system_ids: ['helix', 'job-application', 'receipt-router'] },
  ]);
  const portfolio = fixture();
  portfolio.flagships = portfolio.flagships.filter(entry => !['helix', 'akos'].includes(entry.id));
  const reduced = buildReviewPaths(portfolio);
  for (const role of reduced.roles) {
    assert.ok(role.system_ids.every(id => reduced.systems.some(system => system.id === id)));
    assert.ok(!role.system_ids.includes('helix') && !role.system_ids.includes('akos'));
  }
  assert.doesNotMatch(renderReviewPaths(reduced), /href="#coverage-(helix|akos)"/);
});

test('coverage expands to newly admitted systems without treating the role shortlist as membership', () => {
  const portfolio = fixture();
  portfolio.flagships.push({ id: 'additional-system', name: 'Additional system', state: 'REFERENCE_ONLY', evidence: 'One bounded source receipt.', limit: 'Execution remains unverified.', public_surface: 'PUBLIC', repo: 'https://github.com/GlacierEQ/additional-system' });
  const model = buildReviewPaths(portfolio);
  assert.equal(model.systems.length, portfolio.flagships.length);
  assert.ok(model.systems.some(system => system.id === 'additional-system'));
  const html = renderReviewPaths(model);
  assert.match(html, /id="coverage-additional-system"/);
  assert.match(html, /Execution remains unverified\./);
});

test('source links require public visibility and an available GlacierEQ repository', () => {
  const model = buildReviewPaths(fixture());
  for (const system of model.systems) {
    const original = source.flagships.find(entry => entry.id === system.id);
    if (original.public_surface === 'PUBLIC' && !isUnavailableGithubUrl(original.repo)) assert.equal(system.source, original.repo);
    else assert.ok(!Object.hasOwn(system, 'source'));
  }
  const html = renderReviewPaths(model);
  for (const system of model.systems.filter(entry => !entry.source)) {
    const details = html.match(new RegExp(`<details[^>]+id="coverage-${system.id}">([\\s\\S]*?)<\\/details>`))[1];
    assert.match(details, /Public method; source access limited\./);
    assert.doesNotMatch(details, /href="https:\/\/github\.com/);
  }
  assert.ok(!JSON.stringify(model.systems.find(entry => entry.id === 'akos')).includes('github.com'));
  assert.ok(!JSON.stringify(model.systems.find(entry => entry.id === 'doctor-strange')).includes('github.com'));
});

test('private and excluded records are omitted rather than copied or validated as public facts', () => {
  const portfolio = fixture();
  for (const visibility of ['PRIVATE', 'EXCLUDED', 'QUARANTINED']) portfolio.flagships.push({ id: `hidden-${visibility.toLowerCase()}`, public_surface: visibility, name: 'DO NOT PUBLISH', repo: 'javascript:secret' });
  portfolio.flagships.push({ id: 'hidden-state', public_surface: 'PUBLIC', state: 'EXCLUDED', evidence: 'DO NOT PUBLISH', repo: 'javascript:secret' });
  portfolio.flagships[0].internal_receipt = 'DO NOT PUBLISH';
  const model = buildReviewPaths(portfolio);
  assert.equal(model.systems.length, source.flagships.length);
  assert.doesNotMatch(JSON.stringify(model), /DO NOT PUBLISH|hidden-|internal_receipt|javascript:/);
  assert.doesNotMatch(renderReviewPaths(model), /DO NOT PUBLISH|hidden-|internal_receipt|javascript:/);
});

test('admitted records reject unsafe IDs, duplicate identities, missing evidence, and non-public URLs', () => {
  const mutations = [
    entry => { entry.id = '../escape'; },
    entry => { entry.id = 'Upper-Case'; },
    entry => { entry.id = 'two--separators'; },
    entry => { entry.id = 'x" onclick="alert(1)'; },
    ...['name', 'state', 'evidence', 'limit'].map(field => entry => { entry[field] = '  '; }),
    entry => { entry.repo = 'https://github.com/AnotherOwner/project'; },
    entry => { entry.repo = 'http://github.com/GlacierEQ/project'; },
    entry => { entry.repo = 'https://github.com.evil.example/GlacierEQ/project'; },
    entry => { entry.repo = 'https://github.com/GlacierEQ/../private'; },
    entry => { entry.repo = 'https://github.com/GlacierEQ/project?token=secret'; },
    entry => { entry.repo = 'javascript:alert(1)'; },
  ];
  for (const mutate of mutations) {
    const portfolio = fixture();
    mutate(portfolio.flagships[0]);
    assert.throws(() => buildReviewPaths(portfolio), /review_paths_(system_id_invalid|system_field_missing|source_invalid)/);
  }
  const portfolio = fixture();
  portfolio.flagships.push(structuredClone(portfolio.flagships[0]));
  assert.throws(() => buildReviewPaths(portfolio), /review_paths_system_id_duplicate:helix/);
  assert.throws(() => buildReviewPaths({}), /review_paths_flagships_missing/);
});

test('untrusted display text is escaped and evidence states are not silently promoted', () => {
  const portfolio = fixture();
  const payload = '<img src=x onerror="alert(1)"> & \'quoted\'';
  for (const field of ['name', 'state', 'evidence', 'limit']) portfolio.flagships[0][field] = payload;
  const model = buildReviewPaths(portfolio);
  assert.equal(model.systems[0].state, payload);
  assert.equal(model.systems[0].evidence, payload);
  const html = renderReviewPaths(model);
  assert.ok(html.includes('&lt;img src=x onerror=&quot;alert(1)&quot;&gt; &amp; &#39;quoted&#39;'));
  assert.ok(!html.includes(payload));
  assert.doesNotMatch(html, /<img\b|<script\b|\sstyle\s*=|\sonclick\s*=|\sonerror\s*=\s*["']/i);
  assert.match(html, /do not imply employment, affiliation, or production adoption/);
  assert.match(html, /do not create new proof/);
});

test('native semantic HTML exposes all coverage anchors and links roles to cases without scripts', () => {
  const model = buildReviewPaths(fixture());
  const html = renderReviewPaths(model);
  assert.match(html, /<section[^>]+id="review-paths"[^>]+aria-labelledby="review-paths-title"/);
  assert.match(html, /<section[^>]+id="portfolio-coverage"[^>]+aria-labelledby="portfolio-coverage-title"/);
  assert.equal([...html.matchAll(/<article class="experience-role"/g)].length, 3);
  assert.equal([...html.matchAll(/<details class="experience-coverage"/g)].length, model.systems.length);
  assert.equal([...html.matchAll(/<summary>/g)].length, model.systems.length);
  const ids = [...html.matchAll(/\sid="([^"]+)"/g)].map(match => match[1]);
  assert.equal(ids.length, new Set(ids).size);
  for (const system of model.systems) assert.ok(ids.includes(`coverage-${system.id}`));
  for (const match of html.matchAll(/href="#coverage-([^"]+)"/g)) assert.ok(ids.includes(`coverage-${match[1]}`));
  for (const match of html.matchAll(/href="#(?!coverage-)([^"]+)"/g)) assert.ok(['agent-assurance', 'programmatic-delivery', 'provider-recovery'].includes(match[1]));
  for (const match of html.matchAll(/aria-labelledby="([^"]+)"/g)) assert.ok(ids.includes(match[1]));
  assert.doesNotMatch(html, /<script\b|\sstyle\s*=|\sonclick\s*=/i);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { spawnSync } from 'node:child_process';
import { buildExperience, renderOverview, renderPage } from '../scripts/render-engineering-experience.mjs';

const { CLAIMS } = createRequire(import.meta.url)('../api/verify-proof.js');
const portfolioSource = JSON.parse(await readFile(new URL('../site-v15/data/portfolio.json', import.meta.url), 'utf8'));
const proofSource = JSON.parse(await readFile(new URL('../site-v15/data/current-proof.json', import.meta.url), 'utf8'));

function fixtures() {
  return {
    portfolio: structuredClone(portfolioSource),
    proof: structuredClone(proofSource),
    claims: structuredClone(CLAIMS),
  };
}

function experience() {
  const { portfolio, proof, claims } = fixtures();
  return buildExperience(portfolio, proof, claims);
}

function caseById(value, id) {
  const item = value.cases.find(entry => entry.id === id);
  assert.ok(item, `missing experience case: ${id}`);
  return item;
}

test('recorded engineering cases preserve source-owned evidence and remaining gates', () => {
  const { portfolio, proof, claims } = fixtures();
  const before = structuredClone({ portfolio, proof, claims });
  const result = buildExperience(portfolio, proof, claims);
  assert.equal(result.schema, 'glaciereq.engineering-experience.v1');
  assert.deepEqual({ portfolio, proof, claims }, before, 'presentation must not mutate its evidence sources');

  for (const [caseId, sourceId] of [['programmatic-delivery', 'helix'], ['provider-recovery', 'sigma-glue']]) {
    const item = caseById(result, caseId);
    const source = portfolio.flagships.find(entry => entry.id === sourceId);
    assert.equal(item.evidence, source.evidence);
    assert.equal(item.boundary, source.limit);
    assert.equal(item.source, source.repo);
    assert.equal(item.system, source.name);
    assert.ok(item.implementation && item.operations && item.problem);
  }

  const assurance = caseById(result, 'agent-assurance');
  const source = proof.current_star;
  assert.equal(assurance.implementation, source.allowed_claim);
  assert.ok(assurance.evidence.includes(`${source.implementation.acceptance_tests} recorded acceptance tests`));
  assert.ok(assurance.evidence.includes(source.implementation.commit));
  assert.ok(assurance.evidence.includes(source.proof.verification_state));
  for (const excluded of source.prohibited_claims) assert.ok(assurance.boundary.includes(excluded));
  assert.match(assurance.boundary, /single-process reference implementation/);
  assert.ok(assurance.source.includes('/tree/main/'));
  assert.ok(assurance.code.includes('/tree/main/'));
  assert.ok(!assurance.source.includes(source.implementation.commit));
  assert.match(assurance.source_note, /do not verify that commit or reproduce its test run/);
});

test('fresh source evidence flows through without inheriting historical totals or stronger claims', () => {
  const { portfolio, proof, claims } = fixtures();
  const sigma = portfolio.flagships.find(entry => entry.id === 'sigma-glue');
  sigma.evidence = 'A new source receipt records one bounded replay experiment.';
  sigma.limit = 'Provider connectivity is unresolved; no distributed deployment claim.';
  proof.current_star.implementation.acceptance_tests = 3;
  proof.current_star.proof.verification_state = 'RECORDED_REQUIRES_REFRESH';
  const result = buildExperience(portfolio, proof, claims);
  assert.equal(caseById(result, 'provider-recovery').evidence, sigma.evidence);
  assert.equal(caseById(result, 'provider-recovery').boundary, sigma.limit);
  assert.match(caseById(result, 'agent-assurance').evidence, /^3 recorded acceptance tests; proof state: RECORDED_REQUIRES_REFRESH;/);
  const html = renderPage(result);
  assert.ok(html.includes(sigma.evidence));
  assert.ok(html.includes(sigma.limit));
});

test('private, missing, or unbounded flagship evidence cannot become a public case study', () => {
  const mutations = [
    source => { source.public_surface = 'PRIVATE'; },
    source => { source.public_surface = 'PUBLIC_ALLOWLIST_REQUIRED'; },
    source => { delete source.evidence; },
    source => { source.evidence = ''; },
    source => { delete source.limit; },
    source => { source.limit = ''; },
    source => { source.repo = 'https://github.com/OtherOwner/sigma-glue'; },
    source => { source.repo = 'https://github.com/GlacierEQ/sigma-glue?private=true'; },
    source => { source.repo = 'javascript:alert(1)'; },
  ];
  for (const id of ['helix', 'sigma-glue']) {
    for (const mutate of mutations) {
      const { portfolio, proof, claims } = fixtures();
      mutate(portfolio.flagships.find(entry => entry.id === id));
      assert.throws(() => buildExperience(portfolio, proof, claims), /experience_(public_evidence_missing|source_invalid):/);
    }
    const { portfolio, proof, claims } = fixtures();
    portfolio.flagships = portfolio.flagships.filter(entry => entry.id !== id);
    assert.throws(() => buildExperience(portfolio, proof, claims), new RegExp(`experience_public_evidence_missing:${id}`));
  }
});

test('assurance requires an exact implementation identity and explicit claim exclusions', () => {
  const mutations = [
    source => { delete source.allowed_claim; },
    source => { source.prohibited_claims = []; },
    source => { source.implementation.acceptance_tests = 1.5; },
    source => { source.implementation.acceptance_tests = '17'; },
    source => { source.implementation.commit = 'main'; },
    source => { source.implementation.repository = 'PrivateOwner/hidden'; },
    source => { delete source.proof.verification_state; },
    source => { source.implementation.root = '../private/'; },
    source => { source.implementation.root = '/projects/mission-agentic-ai-assurance/'; },
    source => { source.implementation.root = 'projects/mission-agentic-ai-assurance/?redirect=private'; },
    source => { source.implementation.root = 'projects/another-project/'; },
  ];
  for (const mutate of mutations) {
    const { portfolio, proof, claims } = fixtures();
    mutate(proof.current_star);
    assert.throws(() => buildExperience(portfolio, proof, claims), /experience_assurance_evidence_missing/);
  }
});

test('live recovery action is pinned to source-commit presence and retains the inspector boundary', () => {
  const result = experience();
  const recovery = caseById(result, 'provider-recovery');
  const claim = CLAIMS['provider-recovery'];
  assert.equal(recovery.code, `https://github.com/${claim.repository}/commit/${claim.sha}`);
  assert.deepEqual(recovery.live_check, {
    url: '/api/verify-proof?claim=provider-recovery',
    observation: claim.verifiedMeaning,
    boundary: claim.boundary,
  });
  assert.match(recovery.live_check.observation, /source commit exists/);
  assert.match(recovery.live_check.boundary, /Source existence is not a live production/);
  assert.equal(result.cases.filter(item => item.live_check).length, 1);
  const html = renderPage(result);
  assert.ok(html.includes('Check the source commit live'));
  assert.ok(html.includes(claim.verifiedMeaning));
  assert.ok(html.includes(claim.boundary));
  assert.doesNotMatch(html, /MATCHED RECEIPT|verified live|live tests passed|live provider success/i);
  assert.match(result.evidence_policy, /not a new test run or a live provider observation/);
  assert.ok(result.cases.every(item => !Object.hasOwn(item, 'status') && !Object.hasOwn(item, 'observed_at')));
});

test('an incomplete or stronger-than-source live check is rejected', () => {
  const mutations = [
    claims => { delete claims['provider-recovery']; },
    claims => { claims['provider-recovery'].kind = 'workflow'; },
    claims => { claims['provider-recovery'].repository = 'PrivateOwner/hidden'; },
    claims => { claims['provider-recovery'].sha = 'main'; },
    claims => { delete claims['provider-recovery'].boundary; },
    claims => { delete claims['provider-recovery'].verifiedMeaning; },
  ];
  for (const mutate of mutations) {
    const { portfolio, proof, claims } = fixtures();
    mutate(claims);
    assert.throws(() => buildExperience(portfolio, proof, claims), /experience_recovery_source_missing/);
  }
});

test('source text is escaped in case headings, evidence, limits, and attribute contexts', () => {
  const { portfolio, proof, claims } = fixtures();
  const payload = '<img src=x onerror="alert(1)"> & \'quoted\'';
  const helix = portfolio.flagships.find(entry => entry.id === 'helix');
  helix.name = payload;
  helix.evidence = payload;
  helix.limit = payload;
  proof.current_star.allowed_claim = payload;
  proof.current_star.title = payload;
  proof.current_star.prohibited_claims = [payload];
  claims['provider-recovery'].boundary = payload;
  claims['provider-recovery'].verifiedMeaning = payload;
  const result = buildExperience(portfolio, proof, claims);
  const encoded = '&lt;img src=x onerror=&quot;alert(1)&quot;&gt; &amp; &#39;quoted&#39;';
  for (const html of [renderOverview(result), renderPage(result)]) {
    assert.ok(html.includes(encoded));
    assert.ok(!html.includes(payload));
    assert.doesNotMatch(html, /<img\b|<script\b|\sstyle\s*=|\sonerror\s*=\s*["']/i);
  }
  assert.ok(renderPage(result).includes(`aria-label="${encoded} evidence"`));
});

test('review pages expose semantic headings, working case anchors, and keyboard-native disclosure', () => {
  const result = experience();
  const html = renderPage(result);
  const overview = renderOverview(result);
  assert.match(html, /^<!doctype html>\s*<html lang="en">/);
  assert.match(html, /<a class="skip" href="#main">/);
  assert.match(html, /<main id="main">/);
  assert.equal([...html.matchAll(/<h1\b/g)].length, 1);
  assert.match(html, /<nav[^>]+aria-label="Choose an experience review path"/);
  assert.match(html, /href="\/atlas\/"/); // Later build stages must not rewrite the generated nav.
  assert.match(html, /<link rel="alternate" type="application\/json" href="\/data\/engineering-experience\.json"/);
  assert.match(overview, /<section[^>]+aria-labelledby="experience-heading"/);
  assert.match(overview, /<h2 id="experience-heading">/);
  assert.equal([...overview.matchAll(/<dt>Operational judgment<\/dt>/g)].length, result.cases.length);

  const ids = [...html.matchAll(/\sid="([^"]+)"/g)].map(match => match[1]);
  assert.equal(ids.length, new Set(ids).size, 'HTML IDs must be unique');
  for (const item of result.cases) {
    assert.ok(html.includes(`<article class="experience-case" id="${item.id}" aria-labelledby="${item.id}-title">`));
    assert.ok(html.includes(`<h2 id="${item.id}-title">`));
    assert.ok(overview.includes(`href="/experience/#${item.id}"`));
  }
  for (const match of html.matchAll(/href="#([^"]+)"/g)) assert.ok(ids.includes(match[1]), `broken in-page anchor: ${match[1]}`);
  for (const match of overview.matchAll(/href="\/experience\/#([^"]+)"/g)) assert.ok(ids.includes(match[1]), `broken overview anchor: ${match[1]}`);
  assert.equal([...html.matchAll(/<summary>Scope and remaining gates<\/summary>/g)].length, result.cases.length);
  assert.equal([...html.matchAll(/<details>/g)].length, [...html.matchAll(/<summary>/g)].length);
  for (const output of [html, overview]) assert.doesNotMatch(output, /<script\b|\sstyle\s*=|\sonclick\s*=/i);
});

test('CLI check reconciles generated page, JSON, and homepage without changing their bytes', async () => {
  const root = new URL('../', import.meta.url);
  const outputs = ['site-v15/experience/index.html', 'site-v15/data/engineering-experience.json', 'site-v15/index.html'];
  const before = await Promise.all(outputs.map(file => readFile(new URL(file, root), 'utf8')));
  const checked = spawnSync(process.execPath, ['scripts/render-engineering-experience.mjs', '--check'], {
    cwd: root,
    encoding: 'utf8',
  });
  assert.equal(checked.status, 0, checked.stderr || checked.stdout);
  assert.match(checked.stdout, /Engineering experience checked: 3 source-linked case studies/);
  assert.deepEqual(await Promise.all(outputs.map(file => readFile(new URL(file, root), 'utf8'))), before);
  assert.deepEqual(JSON.parse(before[1]), experience());
  assert.equal(before[0], renderPage(experience()));
  assert.equal([...before[2].matchAll(/<!-- engineering-experience:start -->/g)].length, 1);
  assert.equal([...before[2].matchAll(/<!-- engineering-experience:end -->/g)].length, 1);
  assert.ok(before[2].includes(renderOverview(experience())));
});

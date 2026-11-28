#!/usr/bin/env node
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { buildReviewPaths, renderReviewPaths } from './engineering-review-paths.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const { CLAIMS } = createRequire(import.meta.url)('../api/verify-proof.js');
const implementationReviews = JSON.parse(await readFile(path.join(ROOT, 'site-v15/data/implementation-reviews.json'), 'utf8'));
const escape = value => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// Presentation draws evidence and limits from the existing public sources.
// Rendering never runs the provider check or promotes recorded proof to live proof.
export function buildExperience(portfolio, currentProof, claims = CLAIMS) {
  const system = id => {
    const entry = portfolio.flagships.find(item => item.id === id);
    if (!entry || entry.public_surface !== 'PUBLIC' || !entry.evidence || !entry.limit) {
      throw new Error(`experience_public_evidence_missing:${id}`);
    }
    if (!/^https:\/\/github\.com\/GlacierEQ\/[a-zA-Z0-9_-]+$/.test(entry.repo)) {
      throw new Error(`experience_source_invalid:${id}`);
    }
    return entry;
  };
  const helix = system('helix');
  const sigma = system('sigma-glue');
  const star = currentProof.current_star;
  if (!star?.allowed_claim || !star.prohibited_claims?.length ||
      !Number.isInteger(star.implementation?.acceptance_tests) ||
      !/^[a-f0-9]{40}$/.test(star.implementation?.commit ?? '') ||
      star.implementation?.repository !== 'GlacierEQ/job-application' ||
      star.implementation?.root !== 'projects/mission-agentic-ai-assurance/' ||
      !star.proof?.verification_state) {
    throw new Error('experience_assurance_evidence_missing');
  }
  const recovery = claims['provider-recovery'];
  if (recovery?.kind !== 'commit' || recovery.repository !== 'GlacierEQ/sigma-glue' ||
      !/^[a-f0-9]{40}$/.test(recovery.sha) || !recovery.boundary || !recovery.verifiedMeaning) {
    throw new Error('experience_recovery_source_missing');
  }
  return {
    schema: 'glaciereq.engineering-experience.v1',
    sources: ['data/portfolio.json', 'data/current-proof.json', 'data/implementation-reviews.json', 'api/verify-proof.js'],
    evidence_policy: 'Recorded source evidence, not a new test run or a live provider observation. Each system keeps its evidence and limits.',
    review_paths: buildReviewPaths(portfolio),
    implementation_reviews: implementationReviews,
    cases: [
      {
        id: 'programmatic-delivery', title: 'Turn fragmented multi-repo workflows into a deterministic release pipeline.',
        system: helix.name, focus: 'Enterprise Control Plane · Delivery',
        problem: 'Enterprise AI estates drift fast when repository evidence, architecture dossiers, and public surfaces are maintained by hand—shipping stale claims or broken links.',
        implementation: 'Built a typed Python control plane (Job-App Helix) and Node build pipeline projecting commit-pinned data across a 166-company / 67-repository Helix boundary into validated HTML, structured JSON, and résumé surfaces.',
        operations: 'Separate source authority from presentation; reject inconsistent or unsafe inputs fail-closed; enforce automated pre-release validation gates; leave machine-readable state for the next operator.',
        value: 'Deterministic builds across 393 HTML routes and 166 company dossiers with zero client scripts and end-to-end commit-to-surface traceability.',
        evidence: helix.evidence, boundary: helix.limit,
        source: helix.repo, review: '/machine/', review_label: 'Inspect the machine contracts',
        code: 'https://github.com/GlacierEQ/job-application/blob/main/scripts/vercel-build.mjs',
      },
      {
        id: 'provider-recovery', title: 'Eliminate duplicate side effects when external tool writes time out.',
        system: sigma.name, focus: 'Agent Reliability · Failure Recovery',
        problem: 'In production tool-calling agents, an external API can apply a mutation and drop the response—blind retries duplicate writes, corrupt state, or double-send actions.',
        implementation: 'Engineered provider-aware state readback, restart-readable recovery trails, and deterministic replay guards in Sigma Glue (Node 22) to reconcile ambiguous executions before retrying.',
        operations: 'Treat an unknown tool outcome as a decision to investigate: read provider ground truth, preserve the recovery trail, and block a repeat action once completion is established.',
        value: '140/140 Node 22 tests passing; recorded GitHub canary recovered a deliberately lost success response and blocked replay before a third write.',
        evidence: sigma.evidence, boundary: sigma.limit,
        source: sigma.repo, review: '/evidence-gallery/sigma-glue/', review_label: 'Inspect the recovery evidence',
        code: `https://github.com/${recovery.repository}/commit/${recovery.sha}`,
        live_check: { url: '/api/verify-proof?claim=provider-recovery', observation: recovery.verifiedMeaning, boundary: recovery.boundary },
      },
      {
        id: 'agent-assurance', title: 'Gate autonomous agent actions behind policy, drift, and replay checks.',
        system: star.title, focus: 'Agent Evals · Execution Guardrails',
        problem: 'Unbounded LLM recommendations can hallucinate parameters, drift past cost or safety thresholds, or trigger concurrent replays against live systems.',
        implementation: star.allowed_claim,
        operations: 'Make refusal and failure states explicit; guard concurrent replays with thread-safe idempotency; reject non-finite metrics; bind every decision to an inspectable receipt.',
        value: '17/17 acceptance tests reproduced across a Python 3.11–3.13 CI matrix (0 failures), turning safety policies into executable pass/fail gates.',
        evidence: `${star.implementation.acceptance_tests} recorded acceptance tests; proof state: ${star.proof.verification_state}; implementation commit: ${star.implementation.commit}.`,
        boundary: `Independent single-process reference implementation. Excluded claims: ${star.prohibited_claims.join('; ')}.`,
        source: `https://github.com/${star.implementation.repository}/tree/main/${star.implementation.root}`,
        review: '/master/', review_label: 'Review architecture and proof',
        code: `https://github.com/${star.implementation.repository}/tree/main/${star.implementation.root}src/mission_assurance/`,
        source_note: 'Code links open the current main branch. The recorded implementation commit above is historical source metadata; these links do not verify that commit or reproduce its test run.',
      },
    ],
  };
}

export function renderOverview(experience) {
  return `<section id="engineering-operations" class="section experience-overview" aria-labelledby="experience-heading"><div class="shell">
<div class="section-head"><div><p class="eyebrow">ENTERPRISE CASE STUDIES · PROBLEM → ARCHITECTURE → OUTCOME</p><h2 id="experience-heading">Built for messy production workflows, verified under failure.</h2></div><p>From multi-repo control planes to tool-write recovery and execution gates: inspect the problem, the bounded architecture, and the measurable outcome.</p></div>
<div class="experience-grid">${experience.cases.map(item => `<article class="experience-card"><p class="eyebrow">${escape(item.focus)}</p><h3><a href="/experience/#${escape(item.id)}">${escape(item.title)}</a></h3><p>${escape(item.problem)}</p><dl><dt>Bounded architecture</dt><dd>${escape(item.implementation)}</dd><dt>Operational judgment</dt><dd>${escape(item.operations)}</dd><dt>Measurable outcome</dt><dd>${escape(item.value)}</dd></dl><a class="experience-review" href="/experience/#${escape(item.id)}">Review ${escape(item.system)} →</a></article>`).join('\n')}</div>
<div class="actions"><a class="button primary" href="/experience/">Engineering &amp; operations experience</a><a class="button secondary" href="/proof-lab/">Try the live proof inspector</a></div>
</div></section>`;
}

export function renderPage(experience) {
  const reviews = experience.implementation_reviews.reviews.map(review => {
    const source = `https://github.com/${review.repository}/blob/${review.commit}/${review.path}`;
    return `<article class="experience-role"><p class="eyebrow">LOCALLY VERIFIED COMPONENT · ${escape(review.repository)}</p><h3>${escape(review.title)}</h3><p>${escape(review.implementation)}</p><h4>Operational judgment</h4><p>${escape(review.operations)}</p><h4>Executed verification</h4><p>${escape(review.verification)}</p><p><code>${escape(review.command)}</code></p><p class="experience-note">${escape(review.boundary)}</p><a href="${escape(source)}">Inspect the reviewed implementation ↗</a><p class="experience-note">Revision <code>${escape(review.commit)}</code></p></article>`;
  }).join('\n');
  const cases = experience.cases.map(item => `<article class="experience-case" id="${escape(item.id)}" aria-labelledby="${escape(item.id)}-title">
<p class="eyebrow">${escape(item.focus)} · ${escape(item.system)}</p><h2 id="${escape(item.id)}-title">${escape(item.title)}</h2>
<div class="experience-case-grid"><div><h3>The problem</h3><p>${escape(item.problem)}</p><h3>What I built</h3><p>${escape(item.implementation)}</p><h3>The operating decisions</h3><p>${escape(item.operations)}</p><h3>Why it matters</h3><p>${escape(item.value)}</p></div>
<aside class="experience-evidence" aria-label="${escape(item.system)} evidence"><h3>Recorded source evidence</h3><p>${escape(item.evidence)}</p>${item.source_note ? `<p class="experience-note">${escape(item.source_note)}</p>` : ''}<details><summary>Scope and remaining gates</summary><p>${escape(item.boundary)}</p></details><div class="actions"><a class="button secondary small" href="${escape(item.code)}">Read the code ↗</a><a class="button ghost small" href="${escape(item.review)}">${escape(item.review_label)}</a></div><p><a href="${escape(item.source)}">Owning source ↗</a></p>
${item.live_check ? `<details><summary>Check the source commit live</summary><p>${escape(item.live_check.observation)}.</p><p>${escape(item.live_check.boundary)}</p><a class="button secondary small" href="${escape(item.live_check.url)}">Run read-only GitHub check</a></details>` : ''}</aside></div></article>`).join('\n');
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="description" content="Casey Barton: programmatic engineering and operational judgment, demonstrated through delivery systems, provider recovery, and agent assurance.">
<title>Engineering &amp; Operations Experience · Casey Barton</title><link rel="canonical" href="https://casey-barton-glaciereq.vercel.app/experience/">
<link rel="icon" href="/assets/favicon.svg" type="image/svg+xml">
${['site', 'site.systems', 'site.complete', 'site.interaction', 'site.algerian', 'site.experience'].map(name => `<link rel="stylesheet" href="/assets/${name}.css">`).join('\n')}
<link rel="alternate" type="application/json" href="/data/engineering-experience.json" title="Engineering and operations evidence"></head><body>
<a class="skip" href="#main">Skip to experience</a><header class="site-header"><div class="shell nav"><a class="brand" href="/"><span class="mark">CB</span><span><strong>CASEY BARTON</strong><small>ENGINEERING &amp; OPERATIONS</small></span></a><nav class="links" aria-label="Primary navigation"><a href="/">Home</a><a href="/hire/">Hire</a><a href="/resume/">Résumé</a><a href="/proof-lab/">Live proof</a><a href="/atlas/">Atlas</a></nav><a class="nav-cta" href="mailto:glacier.equilibrium@gmail.com">Email Casey</a></div></header>
<main id="main"><section class="section experience-intro"><div class="shell"><p class="eyebrow">GLACIEREQ · INDEPENDENT SYSTEMS ENGINEERING</p><h1>Hands-on engineering.<br>Operational judgment.</h1><p class="lead">I turn ambiguous work into executable systems and carry the work through verification, recovery, and handoff. These examples connect the code to the decisions that make it useful.</p>
<nav class="experience-lenses" aria-label="Choose an experience review path"><a href="#programmatic-delivery">Technical operations → delivery</a><a href="#provider-recovery">Platform engineering → recovery</a><a href="#agent-assurance">Applied AI → assurance</a></nav>
<div class="actions"><a class="button secondary" href="#review-paths">Choose a role review path</a><a class="button ghost" href="#portfolio-coverage">Explore the full admitted portfolio</a></div>
<p class="experience-note">${escape(experience.evidence_policy)}</p></div></section><div class="shell">${cases}</div>
<section class="section" id="implementation-reviews"><div class="shell"><div class="section-head"><div><p class="eyebrow">PROGRAMMING DEPTH · SOURCE REVIEW + EXECUTED CHECKS</p><h2>Inspect the mechanism, then the failure cases.</h2></div><p>Reviewed ${escape(experience.implementation_reviews.reviewed_on)}. ${escape(experience.implementation_reviews.policy)}</p></div><div class="experience-coverage-grid">${reviews}</div></div></section>
${renderReviewPaths(experience.review_paths)}
<section class="section"><div class="shell"><div class="section-head"><div><p class="eyebrow">OPERATING EXPERIENCE</p><h2>Scope the work. Sequence it. Own the closeout.</h2></div><p>Running a residential services business and inspecting building systems meant working with incomplete requirements, estimates, client priorities, safety constraints, and practical handoffs. That discipline carries into how I design software.</p></div><div class="actions"><a class="button secondary" href="/resume/">Review professional experience</a><a class="button ghost" href="/data/engineering-experience.json">Machine-readable evidence</a><a class="button primary" href="mailto:glacier.equilibrium@gmail.com">Discuss a role</a></div></div></section></main>
<footer class="footer"><div class="shell"><p>Casey Del Carpio Barton · Honolulu, Hawaiʻi · <a href="/hire/">Role fit and contact</a></p></div></footer></body></html>\n`;
}

async function main() {
  const read = file => readFile(path.join(ROOT, file), 'utf8');
  const experience = buildExperience(JSON.parse(await read('site-v15/data/portfolio.json')), JSON.parse(await read('site-v15/data/current-proof.json')));
  const outputs = new Map([
    ['site-v15/experience/index.html', renderPage(experience)],
    ['site-v15/data/engineering-experience.json', `${JSON.stringify(experience, null, 2)}\n`],
  ]);
  const overview = `<!-- engineering-experience:start -->\n${renderOverview(experience)}\n<!-- engineering-experience:end -->`;
  let home = await read('site-v15/index.html');
  const markers = /<!-- engineering-experience:start -->[\s\S]*?<!-- engineering-experience:end -->/;
  if (markers.test(home)) home = home.replace(markers, overview);
  else {
    if (!home.includes('<section id="impact"')) throw new Error('experience_home_anchor_missing');
    home = home.replace('<section id="impact"', `${overview}\n<section id="impact"`);
  }
  const css = '<link rel="stylesheet" href="/assets/site.experience.css">';
  if (!home.includes(css)) home = home.replace('</head>', `  ${css}\n</head>`);
  outputs.set('site-v15/index.html', home);
  for (const [relative, content] of outputs) {
    const target = path.join(ROOT, relative);
    if (process.argv.includes('--check')) {
      if (await read(relative) !== content) throw new Error(`experience_projection_stale:${relative}`);
    } else {
      await mkdir(path.dirname(target), { recursive: true });
      await writeFile(target, content);
    }
  }
  console.log(`Engineering experience ${process.argv.includes('--check') ? 'checked' : 'rendered'}: ${experience.cases.length} source-linked case studies.`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await main();

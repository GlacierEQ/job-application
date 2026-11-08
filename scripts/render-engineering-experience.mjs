#!/usr/bin/env node
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const { CLAIMS } = createRequire(import.meta.url)('../api/verify-proof.js');
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
    sources: ['data/portfolio.json', 'data/current-proof.json', 'api/verify-proof.js'],
    evidence_policy: 'Recorded source evidence, not a new test run or a live provider observation. Each system keeps its evidence and limits.',
    cases: [
      {
        id: 'programmatic-delivery', title: 'Turn a complex workflow into a repeatable delivery system.',
        system: helix.name, focus: 'Programmatic delivery',
        problem: 'Company intelligence, candidate evidence, application state, and public hiring pages need to stay connected as the source changes.',
        implementation: 'Build a Python control plane and a Node build pipeline that projects commit-pinned public data into HTML, structured JSON, and résumé surfaces.',
        operations: 'Separate source ownership from presentation; reject inconsistent or unsafe inputs; validate the output before release; leave machine-readable state for the next operator.',
        value: 'Makes a complicated workflow reproducible and gives reviewers a path from the presentation to its source.',
        evidence: helix.evidence, boundary: helix.limit,
        source: helix.repo, review: '/machine/', review_label: 'Inspect the machine contracts',
        code: 'https://github.com/GlacierEQ/job-application/blob/main/scripts/vercel-build.mjs',
      },
      {
        id: 'provider-recovery', title: 'Recover an uncertain write before deciding to retry.',
        system: sigma.name, focus: 'Reliability & operations',
        problem: 'A provider may apply a write and lose the success response. Retrying blindly can repeat a side effect.',
        implementation: 'Use provider-aware recovery, restart-readable evidence, and replay guards to reconcile an ambiguous execution.',
        operations: 'Treat an unknown outcome as a decision to investigate. Read provider state, preserve the recovery trail, and block a repeat action once completion is established.',
        value: 'Shows the judgment behind dependable automation: knowing when to act, when to inspect, and when to stop.',
        evidence: sigma.evidence, boundary: sigma.limit,
        source: sigma.repo, review: '/evidence-gallery/sigma-glue/', review_label: 'Inspect the recovery evidence',
        code: `https://github.com/${recovery.repository}/commit/${recovery.sha}`,
        live_check: { url: '/api/verify-proof?claim=provider-recovery', observation: recovery.verifiedMeaning, boundary: recovery.boundary },
      },
      {
        id: 'agent-assurance', title: 'Make an agent action pass explicit execution gates.',
        system: star.title, focus: 'Applied AI engineering',
        problem: 'An agent recommendation needs policy, evidence, drift, and replay checks before it can become an allowed action.',
        implementation: star.allowed_claim,
        operations: 'Make refusal and failure visible; guard concurrent replays; reject invalid metrics; bind the result to an inspectable receipt.',
        value: 'Turns operating requirements into executable checks and exposes the failure cases alongside the successful path.',
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
<div class="section-head"><div><p class="eyebrow">PROGRAMMATIC ENGINEERING · HIGH-LEVEL OPERATIONS</p><h2 id="experience-heading">I build the system and think through how it will run.</h2></div><p>From workflow design to failure recovery: inspect the implementation, the operating decision, and the evidence behind each example.</p></div>
<div class="experience-grid">${experience.cases.map(item => `<article class="experience-card"><p class="eyebrow">${escape(item.focus)}</p><h3><a href="/experience/#${escape(item.id)}">${escape(item.title)}</a></h3><p>${escape(item.problem)}</p><dl><dt>Engineering</dt><dd>${escape(item.implementation)}</dd><dt>Operational judgment</dt><dd>${escape(item.operations)}</dd></dl><a class="experience-review" href="/experience/#${escape(item.id)}">Review ${escape(item.system)} →</a></article>`).join('\n')}</div>
<div class="actions"><a class="button primary" href="/experience/">Engineering &amp; operations experience</a><a class="button secondary" href="/proof-lab/">Try the live proof inspector</a></div>
</div></section>`;
}

export function renderPage(experience) {
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
<p class="experience-note">${escape(experience.evidence_policy)}</p></div></section><div class="shell">${cases}</div>
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

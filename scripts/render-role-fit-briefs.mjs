#!/usr/bin/env node
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DATA = path.join(ROOT, 'site-v15/data/role-fit-targets.json');
const OUTPUT = path.join(ROOT, 'site-v15/role-fit');
const CHECK = process.argv.includes('--check');
const escape = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const SAFE_SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const SAFE_REPO = /^https:\/\/github\.com\/GlacierEQ\/[A-Za-z0-9_.-]+(?:\/(?:blob|tree|commit)\/[A-Za-z0-9_.-]+(?:\/[A-Za-z0-9_.\/-]+)?)?$/;
const SAFE_JOB = /^https:\/\/(?:jobs\.ashbyhq\.com|job-boards\.greenhouse\.io)\/[A-Za-z0-9_./?=&-]+$/;

function requireText(value, label) {
  if (typeof value !== 'string' || !value.trim()) throw new Error(`${label}_missing`);
  return value;
}

export function validateTargets(registry) {
  if (registry?.schema !== 'glaciereq.role-fit-targets.v1' || !Array.isArray(registry.targets) || !registry.targets.length) {
    throw new Error('role_fit_registry_invalid');
  }
  const seen = new Set();
  for (const target of registry.targets) {
    if (!SAFE_SLUG.test(target.slug) || seen.has(target.slug)) throw new Error('role_fit_slug_invalid');
    seen.add(target.slug);
    for (const field of ['company', 'role', 'problem', 'solution', 'first_move']) requireText(target[field], `${target.slug}_${field}`);
    if (!SAFE_JOB.test(target.job_url)) throw new Error(`${target.slug}_job_source_invalid`);
    if (!Array.isArray(target.proofs) || target.proofs.length < 2) throw new Error(`${target.slug}_proofs_missing`);
    for (const proof of target.proofs) {
      requireText(proof.name, `${target.slug}_proof_name`);
      requireText(proof.mechanism, `${target.slug}_proof_mechanism`);
      if (!SAFE_REPO.test(proof.url)) throw new Error(`${target.slug}_proof_url_invalid`);
    }
  }
  return registry;
}

const head = (title, description) => `<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1">\n<meta name="description" content="${escape(description)}">\n<title>${escape(title)} · Casey Barton · GlacierEQ</title>\n<link rel="stylesheet" href="/assets/site.css">\n<link rel="stylesheet" href="/assets/site.systems.css">\n<link rel="stylesheet" href="/assets/site.complete.css">\n<link rel="stylesheet" href="/assets/site.interaction.css">\n<link rel="stylesheet" href="/assets/site.algerian.css">\n<link rel="stylesheet" href="/assets/role-fit.css">\n</head>\n<body>\n<a class="skip" href="#main">Skip to content</a>\n<header class="site-header"><div class="shell nav"><a class="brand" href="/"><span class="mark">CB</span><span><strong>CASEY BARTON</strong><small>FOUNDER · AI SYSTEMS ARCHITECT</small></span></a><nav class="links" aria-label="Primary navigation"><a href="/">Portfolio</a><a href="/role-fit/">Employer briefs</a><a href="/experience/">Engineering</a><a href="/atlas/">Atlas</a><a href="/resume/">Résumé</a></nav><a class="nav-cta" href="mailto:glacier.equilibrium@gmail.com">Contact Casey</a></div></header>\n<main id="main">`;
const tail = `</main>\n<footer class="footer"><div class="shell footer-grid"><div><strong>Casey Del Carpio Barton</strong><p>Founder · GlacierEQ · AI Systems Architect</p></div><nav class="footer-links" aria-label="Footer navigation"><a href="/">Portfolio</a><a href="/role-fit/">Employer briefs</a><a href="/resume/">Résumé</a><a href="mailto:glacier.equilibrium@gmail.com">Email</a></nav></div></footer>\n</body>\n</html>\n`;

export function renderIndex(registry) {
  const cards = registry.targets.map(target => `<article class="fit-card"><p class="eyebrow">${escape(target.role)}</p><h2>${escape(target.company)}</h2><p>${escape(target.problem)}</p><a class="button secondary" href="/role-fit/${target.slug}/">See technical fit</a></article>`).join('\n');
  return head('Role-specific engineering evidence', 'Engineering-first employer briefs grounded in inspectable GlacierEQ source') + `\n<section class="fit-hero shell"><p class="eyebrow">ENGINEERING VALUE · SOURCE-BOUND</p><h1>Bring the hardest agent infrastructure problem. <em>Inspect how I solve it.</em></h1><p class="lead">I build stateful AI infrastructure, source-traceable tool execution, durable memory, and repeatable engineering delivery. These briefs connect specific employer problems to working GlacierEQ mechanisms and a concrete first move.</p><div class="hero-actions"><a class="button primary" href="mailto:glacier.equilibrium@gmail.com">Discuss a technical challenge</a><a class="button secondary" href="/experience/">Inspect engineering cases</a></div></section>\n<section class="section shell"><div class="section-head"><div><p class="eyebrow">SELECT AN ENGINEERING PROBLEM</p><h2>Employer-specific technical briefs</h2></div><p>Independent capability alignment to published roles; no employment, customer engagement, endorsement, or partnership is implied.</p></div><div class="fit-grid">${cards}</div></section>\n` + tail;
}

export function renderTarget(target) {
  const proofCards = target.proofs.map(proof => `<article class="fit-card"><p class="eyebrow">INSPECT IMPLEMENTATION</p><h2>${escape(proof.name)}</h2><p>${escape(proof.mechanism)}</p><a class="text-link" href="${escape(proof.url)}" target="_blank" rel="noopener noreferrer">Open source and evidence ↗</a></article>`).join('\n');
  return head(`${target.company} — ${target.role}`, `${target.company} technical fit: ${target.problem}`) + `\n<section class="fit-hero shell"><p class="eyebrow">INDEPENDENT TECHNICAL FIT · ${escape(target.company.toUpperCase())}</p><h1>${escape(target.problem)}</h1><p class="lead">${escape(target.solution)}</p><div class="hero-actions"><a class="button primary" href="mailto:glacier.equilibrium@gmail.com?subject=${encodeURIComponent(`Technical conversation — ${target.company}`)}">Discuss the architecture</a><a class="button secondary" href="${escape(target.job_url)}" target="_blank" rel="noopener noreferrer">See published role ↗</a><a class="button ghost" href="/resume/">Résumé</a></div></section>\n<section class="section shell"><div class="section-head"><div><p class="eyebrow">PROOF → ARCHITECTURE → DELIVERY</p><h2>Relevant systems I built</h2></div><p>Each implementation is available for source inspection. Repository evidence is separate from any future employer deployment.</p></div><div class="fit-grid">${proofCards}</div></section>\n<section class="section shell"><div class="fit-next"><p class="eyebrow">FIRST CONVERSATION · CONCRETE ENGINEERING MOVE</p><h2>What I would tackle first</h2><p>${escape(target.first_move)}</p><div class="hero-actions"><a class="button primary" href="mailto:glacier.equilibrium@gmail.com">Start a technical conversation</a><a class="button ghost" href="/role-fit/">View other briefs</a></div></div></section>\n` + tail;
}

async function emit(relative, html) {
  const filename = path.join(OUTPUT, relative);
  if (CHECK) {
    const actual = await readFile(filename, 'utf8');
    if (actual !== html) throw new Error(`role_fit_page_out_of_sync:${relative}`);
    return;
  }
  await mkdir(path.dirname(filename), { recursive: true });
  await writeFile(filename, html, 'utf8');
}

async function main() {
  const registry = validateTargets(JSON.parse(await readFile(DATA, 'utf8')));
  await emit('index.html', renderIndex(registry));
  for (const target of registry.targets) await emit(`${target.slug}/index.html`, renderTarget(target));
  process.stdout.write(`${JSON.stringify({state: CHECK ? 'verified' : 'rendered', targets: registry.targets.length, pages: registry.targets.length + 1})}\n`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch(error => { console.error(error); process.exitCode = 1; });
}

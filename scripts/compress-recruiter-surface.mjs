#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const SITE = path.join(ROOT, 'site-v15');
const VERIFY_ONLY = process.argv.includes('--check');

const HOME = path.join(SITE, 'index.html');
const RESUME = path.join(SITE, 'resume', 'index.html');

// The home route is an orientation surface, not a membership filter. Keep the
// complete review stack reachable from the primary navigation so the public estate
// remains discoverable without changing evidence, privacy, or claim boundaries.
const RECRUITER_NAV = '<nav class="links" aria-label="Primary navigation"><a href="#proof">Proof</a><a href="#flagships">Systems</a><a href="/inventions/">Inventions</a><a href="/mega-skills/">Mega-Skills</a><a href="/monolith/">Monolith</a><a href="/atlas/">Atlas</a><a href="/mesh/">Mesh</a><a href="/machine/">Machine</a><a href="/companies/">Companies</a><a href="/hire/">Hire</a><a href="/resume/">Résumé</a><a href="/master/">Technical</a></nav>';
const PRIMARY_NAV_RE = /<nav class="links" aria-label="Primary navigation">[\s\S]*?<\/nav>/;
const ATS_LINK_RE = /<a\b[^>]*href=["']\/resume\/ats\.txt["'][^>]*>[\s\S]*?<\/a>/g;

// These routes are static inputs at the point this transform runs. Compiler is
// generated later in the release pipeline and is verified by its own compiler
// proxy/validator, so requiring compiler/index.html here would create a false
// ordering dependency rather than protect a real route.
const REQUIRED_STATIC_DEEP_ROUTES = [
  'master/index.html',
  'mesh/index.html',
  'machine/index.html',
  'atlas/index.html',
  'inventions/index.html',
  'hire/index.html',
  'role-fit/index.html',
  'resume/index.html',
  'companies/index.html',
  'mega-skills/index.html',
];

function read(file) {
  return fs.readFileSync(file, 'utf8');
}

function writeAtomic(file, content) {
  const temp = `${file}.tmp`;
  fs.writeFileSync(temp, content, 'utf8');
  fs.renameSync(temp, file);
}

function curateEstate(html){
  const section=html.match(/<section\b[^>]*\bid="estate"[^>]*>[\s\S]*?<\/section>/);
  if(!section) throw new Error("estate_discovery_source_missing");
  if(section[0].includes('data-estate-curated="true"')) return html;
  const inner=section[0].match(/^<section\b[^>]*><div class="shell">([\s\S]*)<\/div><\/section>$/);
  if(!inner) throw new Error("estate_discovery_shell_invalid");
  const catalog=inner[1];
  for(const title of ["Companies","Mega-skill apexes","Public repositories named on the company dossiers"]){
    if(!catalog.includes(title))throw new Error(`estate_discovery_category_missing:${title}`);
  }
  const counts=catalog.match(/(\d+) company lenses\.\s*(\d+) apexes\.\s*(\d+) public repositories/);
  if(!counts)throw new Error("estate_discovery_counts_missing");
  const newSection=`<section id="estate" class="section estate-discovery" data-estate-curated="true"><div class="shell">
<div class="section-head estate-discovery-intro"><div><p class="eyebrow">EXPLORE THE WORK · CHOOSE YOUR ENTRY</p><h2>Different doors into one connected engineering system.</h2></div><p>The deep catalogue is still here. Start with the problem, the capability, or the original evidence instead of scrolling through an inventory.</p></div>
<div class="estate-discovery-grid" aria-label="Explore the engineering estate">
<a class="estate-path estate-path--problem" href="/inventions/"><span class="estate-path-label">01 / PROBLEM → SYSTEM</span><span class="estate-path-diagram" aria-hidden="true"><i>problem</i><i>mechanism</i><i>result</i></span><h3>Start with what the software is built to solve.</h3><p>Trace concrete engineering problems to implemented mechanisms, working demonstrations and evidence.</p><strong>Explore inventions <span aria-hidden="true">↗</span></strong></a>
<a class="estate-path estate-path--capability" href="/mega-skills/"><span class="estate-path-label">02 / CAPABILITY → DEPTH</span><span class="estate-path-count">${counts[2]}<small>capability apexes</small></span><h3>Explore the engineering disciplines behind the systems.</h3><p>Follow the capability hierarchy from architectural judgment to specific technical implementations.</p><strong>Explore capabilities <span aria-hidden="true">↗</span></strong></a>
<a class="estate-path estate-path--evidence" href="/atlas/"><span class="estate-path-label">03 / CONTEXT → EVIDENCE</span><span class="estate-path-count">${counts[1]}<small>company lenses</small></span><h3>Navigate company research and source-linked work.</h3><p>Use the atlas to see the targets, relationships, and evidence depths rather than a flat list.</p><strong>Open company atlas <span aria-hidden="true">↗</span></strong></a>
</div>
<div class="estate-discovery-footer"><a href="/monolith/">Browse the technical monolith <span aria-hidden="true">↗</span></a><a href="/proof-lab/">Inspect live proof <span aria-hidden="true">↗</span></a><span>${counts[3]} public repositories indexed in the complete directory</span></div>
<details class="estate-full-index"><summary><span>Open complete on-page directory</span><small>${counts[1]} companies · ${counts[2]} apexes · ${counts[3]} repositories</small></summary><div class="estate-full-index-body">${catalog}</div></details>
</div></section>`;
  const result=html.replace(section[0],newSection);
  if(result===html)throw new Error("estate_discovery_not_applied");
  return result;
}

function normalizeHome(source) {
  const match = source.match(PRIMARY_NAV_RE);
  if (!match) throw new Error('recruiter_primary_nav_missing');
  let html = curateEstate(source.replace(PRIMARY_NAV_RE, RECRUITER_NAV));
  // Make evidence-based employer conversations reachable without burying the
  // complete systems catalogue or adding another navigation inventory item.
  if (!html.includes('href="/role-fit/"')) {
    const actions = '<div class="hero-actions">';
    if (!html.includes(actions)) throw new Error('recruiter_hero_actions_missing');
    html = html.replace(actions, `${actions}<a class="button ghost" href="/role-fit/">Employer-specific engineering briefs</a>`);
  }
  return html;
}

function normalizeResume(source) {
  const matches = [...source.matchAll(ATS_LINK_RE)];
  if (matches.length === 0) throw new Error('resume_ats_cta_missing');
  if (matches.length === 1) return source;

  let seen = 0;
  return source.replace(ATS_LINK_RE, (anchor) => {
    seen += 1;
    return seen === 1 ? anchor : '';
  });
}

function extractPrimaryNav(source) {
  const match = source.match(PRIMARY_NAV_RE);
  if (!match) throw new Error('recruiter_primary_nav_missing_after_transform');
  return match[0];
}

function validate(home, resume) {
  if (!home.includes('data-estate-curated="true"') || !home.includes('class="estate-full-index"')) throw new Error('curated_estate_discovery_missing');
  if (!home.includes('href="/role-fit/"')) throw new Error('role_fit_recruiter_link_missing');
  const nav = extractPrimaryNav(home);
  const hrefs = [...nav.matchAll(/<a\b[^>]*href=["']([^"']+)["']/g)].map((match) => match[1]);
  const expected = ['#proof', '#flagships', '/inventions/', '/mega-skills/', '/monolith/', '/atlas/', '/mesh/', '/machine/', '/companies/', '/hire/', '/resume/', '/master/'];
  if (JSON.stringify(hrefs) !== JSON.stringify(expected)) {
    throw new Error(`recruiter_nav_contract_failed:${JSON.stringify(hrefs)}`);
  }

  // Deep review routes are intentionally present. Orientation order does not
  // define estate membership, so there is no forbidden deep-route list here.

  if (!home.includes('class="nav-cta"') || !home.includes('mailto:glacier.equilibrium@gmail.com')) {
    throw new Error('recruiter_contact_decision_missing');
  }

  const atsCount = [...resume.matchAll(ATS_LINK_RE)].length;
  if (atsCount !== 1) throw new Error(`resume_ats_cta_count:${atsCount}`);

  for (const relative of REQUIRED_STATIC_DEEP_ROUTES) {
    if (!fs.existsSync(path.join(SITE, relative))) {
      throw new Error(`static_deep_route_missing:${relative}`);
    }
  }

  return {
    primary_decisions: hrefs.length + 1,
    primary_nav_links: hrefs,
    contact_cta: 'mailto:glacier.equilibrium@gmail.com',
    ats_cta_count: atsCount,
    static_deep_routes_preserved: REQUIRED_STATIC_DEEP_ROUTES.length,
    invention_route: 'problem_first_capability_discovery',
    compiler_route: 'verified_by_release_compiler_stage',
  };
}

const originalHome = read(HOME);
const originalResume = read(RESUME);
const nextHome = normalizeHome(originalHome);
const nextResume = normalizeResume(originalResume);

if (!VERIFY_ONLY) {
  if (nextHome !== originalHome) writeAtomic(HOME, nextHome);
  if (nextResume !== originalResume) writeAtomic(RESUME, nextResume);
} else if (nextHome !== originalHome || nextResume !== originalResume) {
  throw new Error('recruiter_surface_not_normalized');
}

const result = validate(VERIFY_ONLY ? originalHome : nextHome, VERIFY_ONLY ? originalResume : nextResume);
console.log(JSON.stringify({
  schema: 'glaciereq.recruiter-surface-compression.v1',
  mode: VERIFY_ONLY ? 'check' : 'apply',
  ...result,
}, null, 2));


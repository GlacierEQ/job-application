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

// Recruiter compression should reduce decision noise without hiding the estate's
// strongest proof-discovery surfaces. Estate is intentionally primary because
// the 67-repository rollout is only a projection over the much larger library;
// compression may organize that depth, but may not erase its discoverability.
const RECRUITER_NAV = '<nav class="links" aria-label="Primary navigation"><a href="#proof">Proof</a><a href="#systems">Systems</a><a href="/visualizer/">Visualizer</a><a href="/inventions/">Inventions</a><a href="/estate/">Estate</a><a href="/atlas/">Company Atlas</a><a href="/resume/">Résumé</a><a href="/master/">Technical</a></nav>';
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
  'visualizer/index.html',
  'inventions/index.html',
  'estate/index.html',
  'resume/index.html',
];

function read(file) {
  return fs.readFileSync(file, 'utf8');
}

function writeAtomic(file, content) {
  const temp = `${file}.tmp`;
  fs.writeFileSync(temp, content, 'utf8');
  fs.renameSync(temp, file);
}

function normalizeHome(source) {
  const match = source.match(PRIMARY_NAV_RE);
  if (!match) throw new Error('recruiter_primary_nav_missing');
  return source.replace(PRIMARY_NAV_RE, RECRUITER_NAV);
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
  const nav = extractPrimaryNav(home);
  const hrefs = [...nav.matchAll(/<a\b[^>]*href=["']([^"']+)["']/g)].map((match) => match[1]);
  const expected = ['#proof', '#systems', '/visualizer/', '/inventions/', '/estate/', '/atlas/', '/resume/', '/master/'];
  if (JSON.stringify(hrefs) !== JSON.stringify(expected)) {
    throw new Error(`recruiter_nav_contract_failed:${JSON.stringify(hrefs)}`);
  }

  for (const required of ['/visualizer/', '/inventions/', '/estate/', '/atlas/']) {
    if (!nav.includes(`href="${required}"`)) {
      throw new Error(`recruiter_discovery_route_missing:${required}`);
    }
  }

  for (const secondary of ['/mesh/', '/machine/', '/compiler/']) {
    if (nav.includes(`href="${secondary}"`) || nav.includes(`href='${secondary}'`)) {
      throw new Error(`recruiter_secondary_route_promoted:${secondary}`);
    }
  }

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
    discovery_routes: {
      visualizer: 'system_composition_discovery',
      inventions: 'problem_first_capability_discovery',
      estate: 'full_library_discovery_without_projection_erasure',
      atlas: 'company_specific_evidence_discovery',
    },
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
  schema: 'glaciereq.recruiter-surface-compression.v3',
  mode: VERIFY_ONLY ? 'check' : 'apply',
  ...result,
}, null, 2));

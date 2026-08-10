#!/usr/bin/env node

import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PRIVATE_MICROCODE_URL = 'https://github.com/GlacierEQ/xai-colossus-microcode';

async function text(relative) {
  return readFile(path.join(ROOT, relative), 'utf8');
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const portfolioText = await text('site-v15/data/portfolio.json');
const portfolio = JSON.parse(portfolioText);
const resume = JSON.parse(await text('site-v15/data/resume.json'));
const home = await text('site-v15/index.html');
const resumeHtml = await text('site-v15/resume/index.html');
const machineHtml = await text('site-v15/machine/index.html');
const llms = await text('site-v15/llms.txt');
const ats = await text('site-v15/resume/ats.txt');

assert(!portfolio.flagships.some((item) => item.id === 'microcode'), 'microcode must not remain a public core flagship');
assert(!portfolioText.includes(PRIVATE_MICROCODE_URL), 'private microcode repository must not appear in portfolio JSON');
assert(!String(portfolio.release?.name || '').includes('V15'), 'V15 product brand must be retired from release.name');
assert(portfolio.flagships.some((item) => item.id === 'helix'), 'helix flagship required');
assert(portfolio.flagships.length >= 7, 'helix-bound flagship set required');

assert(resume.basics.label.startsWith('Forward-Deployed AI Architect'), 'resume primary role was not promoted');
assert(portfolio.person.roles[0] === 'Forward-Deployed AI Architect', 'portfolio primary role was not promoted');
assert(portfolio.person.roles.includes('Principal Agentic Systems Architect'), 'agentic systems role missing');
assert(portfolio.person.roles.includes('Principal AI Platform / Automation Architect'), 'platform architect role missing');

for (const [label, source] of [
  ['home', home],
  ['resume', resumeHtml],
  ['machine', machineHtml],
  ['llms', llms],
  ['ats', ats],
]) {
  assert(
    !source.includes(
      'Applied AI Systems Architect · Agent Infrastructure Engineer · Forward-Deployed AI Engineer',
    ),
    `${label}: stale three-role string remains`,
  );
}

for (const needle of [
  'href="/data/resume.json"',
  'href="/data/portfolio.json"',
  'href="/resume/ats.txt"',
]) {
  assert(home.includes(needle), `home: missing machine-discovery link ${needle}`);
}

assert(home.includes('<title>Casey Barton · Forward-Deployed AI Architect</title>'), 'home title not updated');
assert(home.includes('FORWARD-DEPLOYED AI ARCHITECT'), 'home visible primary role not updated');

console.log(
  JSON.stringify({
    status: 'PASS',
    checks: {
      microcode_retired: true,
      v15_brand_retired: true,
      helix_flagship: true,
      senior_role_positioning: true,
      machine_discovery_links: true,
      private_public_boundary: true,
    },
  }),
);

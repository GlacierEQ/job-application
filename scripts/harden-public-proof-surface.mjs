#!/usr/bin/env node

import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SITE = path.join(ROOT, 'site-v15');

const PRIMARY_ROLES = [
  'Forward-Deployed AI Architect',
  'Principal Agentic Systems Architect',
  'Principal AI Platform / Automation Architect',
  'Staff / Principal Applied AI Engineer',
];

const PRIMARY_ROLE_LINE = 'Forward-Deployed AI Architect · Principal Agentic Systems Architect · Principal AI Platform Architect';
const PUBLIC_MICROCODE_URL = 'https://github.com/GlacierEQ/xai-colossus-2/tree/main/microcode';
const PRIVATE_MICROCODE_URL = 'https://github.com/GlacierEQ/xai-colossus-microcode';

async function readText(relative) {
  return readFile(path.join(ROOT, relative), 'utf8');
}

async function writeText(relative, text) {
  await writeFile(path.join(ROOT, relative), text, 'utf8');
}

async function updateJson(relative, mutate) {
  const source = await readText(relative);
  const value = JSON.parse(source);
  mutate(value);
  await writeText(relative, `${JSON.stringify(value, null, 2)}\n`);
}

function replaceOnceOrAlready(text, before, after, label) {
  if (text.includes(after)) return text;
  if (!text.includes(before)) throw new Error(`${label}: expected source text not found`);
  return text.replace(before, after);
}

await updateJson('site-v15/data/portfolio.json', portfolio => {
  portfolio.person.roles = PRIMARY_ROLES;
  portfolio.person.positioning = 'I design and deploy dependable AI operating systems across model, tool, data, security, evaluation, recovery, and human-workflow boundaries.';

  const microcode = portfolio.flagships.find(item => item.id === 'microcode');
  if (!microcode) throw new Error('portfolio.json: microcode flagship missing');
  microcode.repo = PUBLIC_MICROCODE_URL;
  microcode.state = 'PUBLIC_ARCHITECTURE_REVIEWED_EXECUTION_BLOCKED';
  microcode.evidence = 'Public microcode implementation is inspectable inside xai-colossus-2; a separate 132-check contract exists on a private review surface and is not presented as public test proof.';
  microcode.limit = 'The private review repository is intentionally not exposed. Public source inspection is available through the xai-colossus-2 microcode subtree; no firmware mutation, production rollout, or public 132-check execution claim is made.';
});

await updateJson('site-v15/data/resume.json', resume => {
  resume.basics.label = 'Forward-Deployed AI Architect | Principal Agentic Systems Architect | Principal AI Platform Architect';
  resume.basics.summary = 'AI systems architect who turns ambiguous operating problems into dependable agentic systems using explicit authority, bounded tool execution, longitudinal evaluation, durable recovery, provenance, and human-verifiable completion.';
});

const discoveryLinks = [
  '  <link rel="alternate" type="application/json" href="/data/resume.json" title="Machine-readable resume">',
  '  <link rel="alternate" type="application/json" href="/data/portfolio.json" title="Machine-readable portfolio">',
  '  <link rel="alternate" type="text/plain" href="/resume/ats.txt" title="ATS resume">',
].join('\n');

let home = await readText('site-v15/index.html');
home = replaceOnceOrAlready(
  home,
  '<meta name="description" content="Casey Barton is an Applied AI Systems Architect building evidence-bound agent infrastructure, application intelligence, deterministic systems, and inspectable technical artifacts.">',
  '<meta name="description" content="Casey Barton is a Forward-Deployed AI Architect building dependable agentic systems, AI control planes, bounded execution, evaluation, recovery, and inspectable technical proof.">',
  'home meta description',
);
home = replaceOnceOrAlready(
  home,
  '<meta property="og:title" content="Casey Barton · Applied AI Systems Architect">',
  '<meta property="og:title" content="Casey Barton · Forward-Deployed AI Architect">',
  'home og title',
);
home = replaceOnceOrAlready(
  home,
  '<meta property="og:description" content="Independent applied AI systems work: bounded execution, deterministic evidence, reproducible proof, and complete operating surfaces.">',
  '<meta property="og:description" content="Forward-deployed AI architecture: agentic systems, control planes, bounded execution, evaluation, recovery, and reproducible proof.">',
  'home og description',
);
home = replaceOnceOrAlready(
  home,
  '<title>Casey Barton · Applied AI Systems Architect</title>',
  '<title>Casey Barton · Forward-Deployed AI Architect</title>',
  'home title',
);
home = replaceOnceOrAlready(
  home,
  '<small>APPLIED AI SYSTEMS ARCHITECT</small>',
  '<small>FORWARD-DEPLOYED AI ARCHITECT</small>',
  'home brand role',
);
home = replaceOnceOrAlready(
  home,
  '<p class="hero-role">Applied AI Systems Architect · Agent Infrastructure Engineer · Forward-Deployed AI Engineer</p>',
  `<p class="hero-role">${PRIMARY_ROLE_LINE}</p>`,
  'home hero roles',
);
home = replaceOnceOrAlready(
  home,
  '<h3>Applied AI Systems Architect</h3><p>Design the contracts and operating boundaries that make AI capability dependable.</p>',
  '<h3>Forward-Deployed AI Architect</h3><p>Own the path from messy operating reality through architecture, integration, verification, and usable handoff.</p>',
  'home architecture role card',
);
home = replaceOnceOrAlready(
  home,
  '<h3>Agent Infrastructure Engineer</h3><p>Make agent behavior deterministic enough to reason about, inspect, and recover.</p>',
  '<h3>Principal Agentic Systems Architect</h3><p>Design the orchestration, evaluation, authority, memory, tool, and recovery layers that make multi-agent behavior accountable.</p>',
  'home agentic role card',
);
home = replaceOnceOrAlready(
  home,
  '<h3>Forward-Deployed AI Engineer</h3><p>Translate incomplete real-world requirements into narrow systems that operators can actually use.</p>',
  '<h3>Principal AI Platform Architect</h3><p>Turn repeated AI integrations into reusable control-plane, capability, reliability, and deployment infrastructure.</p>',
  'home platform role card',
);
if (!home.includes('href="/data/resume.json"')) {
  if (!home.includes('</head>')) throw new Error('home: head close missing');
  home = home.replace('</head>', `${discoveryLinks}\n</head>`);
}
await writeText('site-v15/index.html', home);

for (const relative of ['site-v15/resume/index.html', 'site-v15/machine/index.html']) {
  let text = await readText(relative);
  text = text.replaceAll('Applied AI Systems Architect | Agent Infrastructure Engineer | Forward-Deployed AI Engineer', 'Forward-Deployed AI Architect | Principal Agentic Systems Architect | Principal AI Platform Architect');
  text = text.replaceAll('Applied AI Systems Architect · Agent Infrastructure Engineer · Forward-Deployed AI Engineer', PRIMARY_ROLE_LINE);
  await writeText(relative, text);
}

for (const relative of ['site-v15/llms.txt', 'site-v15/resume/ats.txt']) {
  let text = await readText(relative);
  text = text.replaceAll('Applied AI Systems Architect | Agent Infrastructure Engineer | Forward-Deployed AI Engineer', 'Forward-Deployed AI Architect | Principal Agentic Systems Architect | Principal AI Platform Architect');
  text = text.replaceAll('Applied AI Systems Architect · Agent Infrastructure Engineer · Forward-Deployed AI Engineer', PRIMARY_ROLE_LINE);
  await writeText(relative, text);
}

const result = {
  status: 'PASS',
  primary_roles: PRIMARY_ROLES,
  public_microcode_url: PUBLIC_MICROCODE_URL,
  private_microcode_url_removed_from_public_core: PRIVATE_MICROCODE_URL,
  machine_discovery: ['/data/resume.json', '/data/portfolio.json', '/resume/ats.txt'],
};

console.log(JSON.stringify(result));

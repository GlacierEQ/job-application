import assert from 'node:assert/strict';
import { access, readFile } from 'node:fs/promises';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const root = new URL('../', import.meta.url);
const read = (path) => readFile(new URL(path, root), 'utf8');

const backstageHumanRoutes = [
  '/recruiter-role-matrix/',
  '/recruiter-gap-analysis/',
  '/recruiter-action/',
  '/recruiter-review/',
];

const preservedInternalTools = [
  'tools/live-recruiter-gap-analysis.mjs',
  'tools/recruiter-action-packet.mjs',
  'tools/recruiter-recovery-completion.mjs',
];

function publiclyRoutesHumanSurface(routeSources, route) {
  const prefix = route.replace(/\/$/, '');
  return routeSources.some((src) => (
    src === prefix
    || src === `${prefix}/?`
    || src.startsWith(`${prefix}/`)
  ));
}

test('public identity stays Casey-and-systems-first while recruiter analytics remain backstage', async () => {
  const [home, workflowSource, releaseRouter, vercelText] = await Promise.all([
    read('site-v15/index.html'),
    read('deployment/vercel-source-bridge/api/workflow-topology-proxy.js'),
    read('deployment/vercel-source-bridge/api/release-router.js'),
    read('deployment/vercel-source-bridge/vercel.json'),
  ]);
  const vercel = JSON.parse(vercelText);
  const routeSources = vercel.routes.map((route) => route.src);

  assert.match(home, /Casey Barton/i, 'public front door must remain explicitly Casey-centered');
  assert.match(home, /href=["']\/inventions\//i, 'public front door must expose the inventions surface');
  assert.match(workflowSource, /href=["']\/inventions\//i, 'workflow topology must hand off to inventions, not recruiter scoring');

  for (const route of backstageHumanRoutes) {
    assert.ok(!home.includes(route), `home must not promote backstage recruiter route ${route}`);
    assert.ok(!workflowSource.includes(route), `workflow topology must not promote backstage recruiter route ${route}`);
    assert.ok(!publiclyRoutesHumanSurface(routeSources, route), `vercel route map must not promote human recruiter surface ${route}`);
  }

  assert.ok(
    routeSources.includes('/data/recruiter-role-matrix.json'),
    'machine-only role matrix may remain available as backstage decision support',
  );
  assert.ok(!releaseRouter.includes('serveRoleMatrixPage'), 'catch-all release router must not publish recruiter role-matrix HTML');
  assert.ok(!workflowSource.includes('Hiring proof shortcuts'), 'workflow topology must not carry recruiter-maintenance navigation');

  await Promise.all(preservedInternalTools.map((path) => access(fileURLToPath(new URL(path, root)))));
});

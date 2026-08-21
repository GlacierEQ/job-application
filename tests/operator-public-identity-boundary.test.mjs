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

test('public identity stays Casey-first while recruiter analytics remain contextual', async () => {
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

  for (const route of backstageHumanRoutes) {
    assert.ok(!home.includes(route), `home must not promote recruiter-maintenance route ${route}`);
    assert.ok(!publiclyRoutesHumanSurface(routeSources, route), `vercel route map must not create a separate promoted route for ${route}`);
  }

  assert.match(
    workflowSource,
    /href=["']\/recruiter-role-matrix\//i,
    'workflow topology may contextually hand off to recruiter role comparison',
  );
  assert.match(
    workflowSource,
    /href=["']\/inventions\//i,
    'workflow topology must preserve the invention continuation',
  );
  assert.ok(
    routeSources.includes('/data/recruiter-role-matrix.json'),
    'machine role matrix remains available as decision support',
  );
  assert.ok(
    releaseRouter.includes('serveRoleMatrixPage'),
    'catch-all runtime must preserve the recruiter role-matrix capability',
  );

  await Promise.all(preservedInternalTools.map((path) => access(fileURLToPath(new URL(path, root)))));
});

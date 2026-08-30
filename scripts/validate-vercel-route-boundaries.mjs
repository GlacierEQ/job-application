import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CONFIG_PATH = path.join(ROOT, 'vercel.json');
const config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));

const redirects = Array.isArray(config.redirects) ? config.redirects : [];
const atlasRedirects = redirects.filter(({ source }) => String(source || '').startsWith('/atlas/'));
const expectedSources = new Set([
  '/atlas/:slug((?!starmap$)[a-z0-9-]+)/',
  '/atlas/:slug((?!starmap$)[a-z0-9-]+)',
]);

if (atlasRedirects.length !== expectedSources.size) {
  throw new Error(
    `atlas_redirect_contract: expected ${expectedSources.size} legacy redirects, found ${atlasRedirects.length}`,
  );
}

for (const redirect of atlasRedirects) {
  if (!expectedSources.has(redirect.source)) {
    throw new Error(
      `atlas_redirect_contract: ${redirect.source} can preempt reserved runtime routes such as /atlas/starmap/`,
    );
  }
  if (redirect.destination !== '/companies/:slug/' || redirect.permanent !== true) {
    throw new Error(`atlas_redirect_contract: malformed legacy redirect ${redirect.source}`);
  }
}

for (const forbidden of ['/atlas/:slug/', '/atlas/:slug']) {
  if (redirects.some(({ source }) => source === forbidden)) {
    throw new Error(`atlas_redirect_contract: broad redirect ${forbidden} would swallow /atlas/starmap/`);
  }
}

const buildCommand = String(config.buildCommand || '');
if (buildCommand.length > 256) {
  throw new Error('atlas_redirect_contract: Vercel buildCommand must stay within the 256-character schema limit');
}
const buildWrapper = fs.readFileSync(path.join(ROOT, 'scripts/vercel-build.mjs'), 'utf8');
if (buildCommand !== 'node scripts/vercel-build.mjs') {
  throw new Error('atlas_redirect_contract: Vercel build must execute scripts/vercel-build.mjs');
}
if (!buildWrapper.includes('scripts/validate-vercel-route-boundaries.mjs')) {
  throw new Error('atlas_redirect_contract: Vercel build wrapper must execute this route-boundary validator');
}

console.log(JSON.stringify({
  status: 'PASS',
  reserved_runtime: '/atlas/starmap/',
  legacy_redirects: [...expectedSources],
  contract: 'legacy atlas company aliases may redirect; named runtime namespaces may not be preempted',
}, null, 2));

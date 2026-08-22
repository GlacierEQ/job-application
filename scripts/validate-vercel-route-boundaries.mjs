import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CONFIG_PATH = path.join(ROOT, 'vercel.json');
const config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));

const redirects = Array.isArray(config.redirects) ? config.redirects : [];
const atlasRedirects = redirects.filter(({ source }) => String(source || '').startsWith('/atlas/'));
const legacySources = new Set([
  '/atlas/:slug((?!starmap$)[a-z0-9-]+)/',
  '/atlas/:slug((?!starmap$)[a-z0-9-]+)',
]);
const retiredSources = new Set(['/atlas/starmap/', '/atlas/starmap']);

if (atlasRedirects.length !== legacySources.size + retiredSources.size) {
  throw new Error(
    `atlas_redirect_contract: expected ${legacySources.size + retiredSources.size} approved Atlas redirects, found ${atlasRedirects.length}`,
  );
}

for (const redirect of atlasRedirects) {
  if (legacySources.has(redirect.source)) {
    if (redirect.destination !== '/companies/:slug/' || redirect.permanent !== true) {
      throw new Error(`atlas_redirect_contract: malformed legacy redirect ${redirect.source}`);
    }
    continue;
  }
  if (retiredSources.has(redirect.source)) {
    if (redirect.destination !== '/atlas/' || redirect.permanent !== true) {
      throw new Error(`atlas_redirect_contract: malformed retired-route redirect ${redirect.source}`);
    }
    continue;
  }
  throw new Error(
    `atlas_redirect_contract: ${redirect.source} can preempt reserved Atlas routes`,
  );
}

for (const forbidden of ['/atlas/:slug/', '/atlas/:slug']) {
  if (redirects.some(({ source }) => source === forbidden)) {
    throw new Error(`atlas_redirect_contract: broad redirect ${forbidden} would swallow /atlas/starmap/`);
  }
}

if (!String(config.buildCommand || '').includes('node scripts/validate-vercel-route-boundaries.mjs')) {
  throw new Error('atlas_redirect_contract: Vercel build must execute this route-boundary validator');
}

console.log(JSON.stringify({
  status: 'PASS',
  retired_route: '/atlas/starmap/',
  legacy_redirects: [...legacySources],
  retired_redirects: [...retiredSources],
  contract: 'legacy Atlas company aliases and the retired Starmap route may redirect; broad dynamic redirects remain prohibited',
}, null, 2));

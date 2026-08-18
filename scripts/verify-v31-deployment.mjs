#!/usr/bin/env node

import { createRequire } from 'node:module';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outputArg = process.argv.indexOf('--bundle-dir');
const bundleDir = outputArg >= 0 ? path.resolve(process.argv[outputArg + 1]) : path.join(ROOT, 'artifacts', 'v31-deployment');
const entry = path.join(bundleDir, 'api', 'index.js');
const require = createRequire(import.meta.url);
const handler = require(entry);

function request(url) {
  return new Promise((resolve, reject) => {
    const headers = new Map();
    let settled = false;
    const res = {
      statusCode: 200,
      setHeader(name, value) { headers.set(String(name).toLowerCase(), value); },
      getHeader(name) { return headers.get(String(name).toLowerCase()); },
      end(chunk = '') {
        if (settled) return;
        settled = true;
        resolve({
          status: this.statusCode,
          headers,
          body: Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk)),
        });
      },
    };
    Promise.resolve(handler({ url }, res))
      .then(() => { if (!settled) reject(new Error(`route_did_not_end:${url}`)); })
      .catch(reject);
  });
}

function requireValue(condition, message) {
  if (!condition) throw new Error(`V31 deployment verification failed: ${message}`);
}

const v31 = await request('/?path=__v31_verify');
requireValue(v31.status === 200, `v31_verify_status:${v31.status}`);
const verification = JSON.parse(v31.body.toString('utf8'));
requireValue(verification.status === 'PASS', `v31_verify:${JSON.stringify(verification.errors)}`);
requireValue(verification.public_repositories >= 100, 'public estate count suspiciously small');
requireValue(verification.estate_total === 1183, 'full estate scope drift');
requireValue(verification.rollout_projection === 67, 'rollout projection drift');
requireValue(verification.private_repository_identities_published === false, 'private identities published');
requireValue(verification.home_estate_navigation === true, 'home does not link estate');
requireValue(verification.sitemap_estate_route === true, 'sitemap does not link estate');

const home = await request('/?path=index.html');
requireValue(home.status === 200, `home_status:${home.status}`);
requireValue(home.body.toString('utf8').includes('href="/estate/"'), 'deployed home lost Estate navigation');
requireValue(home.headers.get('x-glaciereq-source-commit') === verification.source_commit, 'home source header drift');

const estate = await request('/?path=estate/index.html');
requireValue(estate.status === 200, `estate_status:${estate.status}`);
const estateHtml = estate.body.toString('utf8');
requireValue(estateHtml.includes('The library is the substrate. The recruiter view is only a projection.'), 'estate restoration marker missing');
requireValue(!/<script\b/i.test(estateHtml), 'estate route introduced client script');
requireValue(estate.headers.get('content-security-policy')?.includes("script-src 'none'"), 'estate CSP weakened');

const dataResponse = await request('/?path=data/public-estate.json');
requireValue(dataResponse.status === 200, `estate_json_status:${dataResponse.status}`);
const data = JSON.parse(dataResponse.body.toString('utf8'));
requireValue(data.records.length === data.public_discovered_count, 'estate JSON cardinality mismatch');
requireValue(data.records.every((row) => String(row.url).startsWith('https://github.com/GlacierEQ/')), 'foreign/private repository URL leaked');
requireValue(data.archived_public_discovered_count > 0, 'archive lineage erased');
requireValue(data.fork_public_discovered_count > 0, 'fork lineage erased');

const css = await request('/?path=assets/site.estate.css');
requireValue(css.status === 200 && css.body.length > 1000, 'estate CSS missing');

const sitemap = await request('/?path=sitemap.xml');
requireValue(sitemap.status === 200 && sitemap.body.toString('utf8').includes('https://casey-barton-glaciereq.vercel.app/estate/'), 'estate sitemap route missing');

const inner = await request('/?path=__v25_bundle_verify');
requireValue(inner.status === 200, `inner_v25_status:${inner.status}`);
const innerVerification = JSON.parse(inner.body.toString('utf8'));
requireValue(innerVerification.status === 'PASS', 'inner V25 runtime regression');

console.log(JSON.stringify({
  status: 'PASS',
  release: verification.release,
  source_commit: verification.source_commit,
  public_repositories: verification.public_repositories,
  estate_total: verification.estate_total,
  private_repositories_withheld: verification.private_repositories_withheld,
  rollout_projection: verification.rollout_projection,
  outside_rollout_projection: verification.outside_rollout_projection,
  capability_families: verification.capability_families,
  archived_public_preserved: verification.archived_public_preserved,
  forks_preserved: verification.forks_preserved,
  home_estate_navigation: verification.home_estate_navigation,
  sitemap_estate_route: verification.sitemap_estate_route,
  inner_v25: innerVerification.status,
}, null, 2));

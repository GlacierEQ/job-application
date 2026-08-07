import { createHash } from 'node:crypto';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const siteRoot = resolve(here, '..');
const atlasRoot = join(siteRoot, 'company-atlas');
const fail = (msg) => { throw new Error(msg); };
const text = (p) => readFileSync(p, 'utf8');

const snapshotPath = join(atlasRoot, 'company-atlas.snapshot.json');
const hashPath = join(atlasRoot, 'company-atlas.snapshot.sha256');
const snapshotBytes = readFileSync(snapshotPath);
const snapshot = JSON.parse(snapshotBytes.toString('utf8'));
const expectedHash = text(hashPath).trim().split(/\s+/)[0];
const actualHash = createHash('sha256').update(snapshotBytes).digest('hex');
if (actualHash !== expectedHash) fail(`snapshot SHA mismatch: expected ${expectedHash}, got ${actualHash}`);

if (snapshot.counts.displayed_tracks !== snapshot.tracks.length) fail('displayed_tracks does not equal tracks.length');
if (snapshot.counts.governed_tracks !== 48) fail('governed baseline must remain 48 until Helix registry changes');
const ids = snapshot.tracks.map(t => t.id);
if (new Set(ids).size !== ids.length) fail('duplicate track id');
const hypotheses = snapshot.tracks.filter(t => t.state === 'HYPOTHESIS_PENDING_REGISTRY').map(t => t.id).sort();
if (JSON.stringify(hypotheses) !== JSON.stringify(['buildertrend','lockheed-martin'])) fail('pending-registry set drifted');
const zero = snapshot.tracks.filter(t => t.state === 'NO_DIRECT_EXHIBIT_VERIFIED');
if (zero.length !== snapshot.counts.no_direct_exhibit_tracks) fail('no-direct-exhibit count drifted');
for (const t of zero) if (t.repos !== 0 || t.admitted !== 0) fail(`${t.id}: zero-exhibit track has repo/admission count`);
for (const t of snapshot.tracks) if (t.admitted > t.repos) fail(`${t.id}: admitted > mapped`);

const htmlFiles = [];
function walk(dir) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p);
    else if (name.endsWith('.html')) htmlFiles.push(p);
  }
}
walk(atlasRoot);
if (htmlFiles.length !== 8) fail(`expected 8 atlas HTML surfaces, found ${htmlFiles.length}`);

const main = text(join(atlasRoot, 'index.html'));
if (/<script\b/i.test(main)) fail('atlas index contains script element under script-src none CSP');
const nodeLinks = [...main.matchAll(/<a class="atlas-node [^"]+" href="([^"]+)"[^>]*aria-label="([^"]+)"/g)];
if (nodeLinks.length !== snapshot.tracks.length) fail(`expected ${snapshot.tracks.length} SVG node links, found ${nodeLinks.length}`);

const routeToFile = new Map([
  ['/company-atlas/core/', join(atlasRoot,'core','index.html')],
  ['/company-atlas/frontier-ai/', join(atlasRoot,'frontier-ai','index.html')],
  ['/company-atlas/cloud-platform/', join(atlasRoot,'cloud-platform','index.html')],
  ['/company-atlas/silicon-compute/', join(atlasRoot,'silicon-compute','index.html')],
  ['/company-atlas/product-agents/', join(atlasRoot,'product-agents','index.html')],
  ['/company-atlas/mission-systems/', join(atlasRoot,'mission-systems','index.html')],
  ['/company-atlas/industry-field-systems/', join(atlasRoot,'industry-field-systems','index.html')],
]);
for (const [, href] of nodeLinks) {
  const [route, hash] = href.split('#');
  const p = routeToFile.get(route);
  if (!p) fail(`unmapped node route: ${route}`);
  if (!hash) fail(`node missing company anchor: ${href}`);
  if (!text(p).includes(`id="${hash}"`)) fail(`broken company anchor: ${href}`);
}

for (const p of htmlFiles) {
  const s = text(p);
  if (/<script\b/i.test(s)) fail(`script element in ${p}`);
  if (/https?:\/\/(?!casey-barton-glaciereq\.vercel\.app)/i.test(s.replace(/<link rel="canonical"[^>]+>/gi,''))) {
    fail(`unexpected remote runtime URL in ${p}`);
  }
  const idsHere = [...s.matchAll(/\sid="([^"]+)"/g)].map(m => m[1]);
  if (new Set(idsHere).size !== idsHere.length) fail(`duplicate DOM id in ${p}`);
}

console.log(JSON.stringify({
  status: 'PASS',
  html_surfaces: htmlFiles.length,
  company_nodes: nodeLinks.length,
  governed_tracks: snapshot.counts.governed_tracks,
  displayed_tracks: snapshot.counts.displayed_tracks,
  no_direct_exhibit_tracks: zero.length,
  pending_registry: hypotheses,
  snapshot_sha256: actualHash,
  runtime_javascript: 0,
}, null, 2));

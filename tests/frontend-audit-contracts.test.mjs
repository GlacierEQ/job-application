import test from 'node:test';
import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SITE = path.join(ROOT, 'site-v15');

async function walkHtml(dir, out = []) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules') continue;
    const target = path.join(dir, entry.name);
    if (entry.isDirectory()) await walkHtml(target, out);
    else if (entry.isFile() && entry.name.endsWith('.html')) out.push(target);
  }
  return out.sort();
}

function topLevelSelectors(cssText) {
  const cleaned = cssText.replace(/\/\*[\s\S]*?\*\//g, '');
  const selectors = new Set();
  let depth = 0;
  let buffer = '';
  for (const ch of cleaned) {
    if (ch === '{') {
      if (depth === 0) {
        const raw = buffer.trim();
        if (raw && !raw.startsWith('@')) {
          for (const part of raw.split(',')) {
            const norm = part.trim().replace(/\s+/g, ' ');
            if (norm) selectors.add(norm);
          }
        }
        buffer = '';
      }
      depth += 1;
    } else if (ch === '}') {
      depth = Math.max(0, depth - 1);
      if (depth === 0) buffer = '';
    } else if (depth === 0) {
      buffer += ch;
    }
  }
  return selectors;
}

test('vercel.json serves /companies/ directory directly instead of shadowing it behind /atlas/', async () => {
  const vercel = JSON.parse(await readFile(path.join(ROOT, 'vercel.json'), 'utf8'));
  const redirects = vercel.redirects || [];
  const shadowed = redirects.filter(({ source }) => source === '/companies' || source === '/companies/');
  assert.deepEqual(shadowed, [], '/companies/ must serve the 166-dossier index rather than redirecting to /atlas/');

  const atlasLegacy = redirects.filter(({ source }) => String(source || '').startsWith('/atlas/'));
  assert.equal(atlasLegacy.length, 2, 'legacy /atlas/:slug redirects must remain intact');
});

test('companies directory links all 166 dossiers and Atlas explains 2-of-166 governance boundary with link to /companies/', async () => {
  const snapshot = JSON.parse(await readFile(path.join(SITE, 'data/helix-root.json'), 'utf8'));
  const companiesHtml = await readFile(path.join(SITE, 'companies/index.html'), 'utf8');
  const atlasHtml = await readFile(path.join(SITE, 'atlas/index.html'), 'utf8');

  assert.equal(snapshot.companies.length, 166);
  for (const company of snapshot.companies) {
    const slug = company.company_id.replaceAll('_', '-');
    assert.ok(
      companiesHtml.includes(`href="/companies/${slug}/"`),
      `companies/index.html missing link for ${slug}`,
    );
  }

  assert.ok(atlasHtml.includes('href="/companies/"'), 'Atlas must link directly to the full /companies/ directory');
  assert.match(atlasHtml, /166/, 'Atlas must disclose total 166 target-domain dossiers');
  if (!atlasHtml.includes('class="atlas-scaffold-drawer"')) {
    assert.doesNotMatch(
      atlasHtml,
      /tucked inside the expandable research queue below/i,
      'Atlas must not claim a research queue drawer below when 0 scaffold items are rendered',
    );
  }
});

test('zero HTML pages contain CSP-violating inline <style> blocks or inline style attributes', async () => {
  const files = await walkHtml(SITE);
  assert.ok(files.length >= 395, `expected full generated surface (>=395 HTML files), got ${files.length}`);
  const styleTagOffenders = [];
  const styleAttrOffenders = [];
  for (const file of files) {
    const html = await readFile(file, 'utf8');
    const rel = path.relative(SITE, file).replaceAll(path.sep, '/');
    if (/<style\b/i.test(html)) styleTagOffenders.push(rel);
    if (/\sstyle\s*=\s*/i.test(html)) styleAttrOffenders.push(rel);
  }
  assert.deepEqual(styleTagOffenders, [], 'inline <style> tags violate CSP style-src self');
  assert.deepEqual(styleAttrOffenders, [], 'inline style attributes violate CSP style-src self');
});

test('every non-redirect HTML page including 404.html has a non-empty meta description', async () => {
  const files = await walkHtml(SITE);
  const missing = [];
  for (const file of files) {
    const html = await readFile(file, 'utf8');
    if (/http-equiv\s*=\s*["']refresh["']/i.test(html)) continue;
    const match = html.match(/<meta\b[^>]*\bname=["']description["'][^>]*\bcontent=["']([^"']+)["'][^>]*>/i)
      || html.match(/<meta\b[^>]*\bcontent=["']([^"']+)["'][^>]*\bname=["']description["'][^>]*>/i);
    if (!match || !match[1].trim()) {
      missing.push(path.relative(SITE, file).replaceAll(path.sep, '/'));
    }
  }
  assert.deepEqual(missing, [], 'every non-redirect HTML page requires a meta description');

  const notFound = await readFile(path.join(SITE, '404.html'), 'utf8');
  assert.match(notFound, /Path not found in the verified project graph/i);
});

test('core surfaces maintain sequential heading hierarchy without h1-to-h3 skips or consecutive duplicate h2s', async () => {
  for (const rel of [
    'index.html',
    'master/index.html',
    'machine/index.html',
    'mesh/index.html',
    'atlas/index.html',
    'companies/index.html',
    '404.html',
  ]) {
    const html = await readFile(path.join(SITE, rel), 'utf8');
    const headings = [...html.matchAll(/<(h[1-6])\b[^>]*>([\s\S]*?)<\/\1>/gi)].map(m => ({
      level: Number(m[1][1]),
      text: m[2].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim(),
    }));
    assert.ok(headings.length >= 1, `${rel}: must contain headings`);
    for (let i = 1; i < headings.length; i += 1) {
      assert.ok(
        headings[i].level <= headings[i - 1].level + 1,
        `${rel}: heading level skipped from h${headings[i - 1].level} ("${headings[i - 1].text}") to h${headings[i].level} ("${headings[i].text}")`,
      );
    }
    if (rel === 'index.html') {
      const h2s = headings.filter(h => h.level === 2).map(h => h.text);
      for (let i = 1; i < h2s.length; i += 1) {
        assert.notEqual(h2s[i], h2s[i - 1], `index.html has consecutive duplicate h2: "${h2s[i]}"`);
      }
    }
  }
});

test('homepage claims align with Helix, AKOS, and Pro-Code data contracts and avoid duplicate visible email', async () => {
  const home = await readFile(path.join(SITE, 'index.html'), 'utf8');
  const experience = await readFile(path.join(SITE, 'experience/index.html'), 'utf8');

  assert.match(home, /href="tel:\+18089365654"/, 'phone number in signal bar should be a tappable tel: link');
  assert.match(home, /808-936-5654/, 'phone number must be displayed on home surface');

  assert.doesNotMatch(home, /\b66-repo(?:sitory)?\b/i, 'ambiguous 66-repo wording must be clarified to 166-company / 67-repo Helix boundary');
  assert.doesNotMatch(experience, /\b66-repo(?:sitory)?\b/i, 'experience page must also use clarified 166-company / 67-repository Helix boundary');
  assert.doesNotMatch(home, /\b199\/200\b/, 'unbacked 199/200 count must not appear on homepage');
  assert.doesNotMatch(home, /Python \+ TS verified/i, 'blanket Python + TS verified badge must not outrun per-plane evidence');

  assert.match(home, /166-company \/ 67-repo(?:sitory)? Helix boundary/i);
  assert.match(home, /94\/94/);
  assert.match(home, /349\/363/);
  assert.match(home, /Py \+ TS planes passed/);

  const visibleText = home
    .replace(/<head[\s\S]*?<\/head>/gi, ' ')
    .replace(/<[^>]+>/g, ' ');
  const emailOccurrences = visibleText.match(/glacier\.equilibrium@gmail\.com/g) ?? [];
  assert.ok(
    emailOccurrences.length <= 1,
    `visible text repeats glacier.equilibrium@gmail.com ${emailOccurrences.length} times (expected <= 1)`,
  );
});

test('CSS layers consolidate .links, .signal-bar, and .site-header without rule duplication and wrap tablet nav cleanly', async () => {
  const [cssBase, cssSystems, cssComplete] = await Promise.all([
    readFile(path.join(SITE, 'assets/site.css'), 'utf8'),
    readFile(path.join(SITE, 'assets/site.systems.css'), 'utf8'),
    readFile(path.join(SITE, 'assets/site.complete.css'), 'utf8'),
  ]);

  const files = [
    ['site.css', topLevelSelectors(cssBase)],
    ['site.systems.css', topLevelSelectors(cssSystems)],
    ['site.complete.css', topLevelSelectors(cssComplete)],
  ];
  for (const critical of ['.links', '.signal-bar', '.site-header']) {
    const owners = files.filter(([, set]) => set.has(critical)).map(([name]) => name);
    assert.equal(
      owners.length,
      1,
      `expected selector "${critical}" to have 1 canonical owner across base/systems/complete CSS, found in: ${owners.join(', ')}`,
    );
  }

  const combined = `${cssBase}\n${cssSystems}\n${cssComplete}`;
  assert.doesNotMatch(
    combined,
    /\.links\s*\{[^}]*overflow-x\s*:\s*auto/i,
    'nav.links must wrap cleanly instead of clipping items inside overflow-x: auto',
  );
  assert.match(
    combined,
    /@media\s*\(\s*max-width\s*:\s*(?:800|1120|1240)px\s*\)[\s\S]*?\.links\s*\{[^}]*flex-wrap\s*:\s*wrap/i,
    'responsive nav.links must set flex-wrap: wrap so all 12 links remain reachable at tablet widths',
  );
  assert.doesNotMatch(
    combined,
    /\.signal-inner\s+span:last-child\s*\{\s*display\s*:\s*none\s*\}/i,
    'mobile CSS must not hide .signal-inner span:last-child (which contains the phone number)',
  );
});

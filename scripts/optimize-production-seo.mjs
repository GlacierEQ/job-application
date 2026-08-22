import { createHash } from 'node:crypto';
import { readdir, readFile, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SITE = path.join(ROOT, 'site-v15');
const BASE = 'https://casey-barton-glaciereq.vercel.app';
const SKIP_CANONICAL = new Set(['404.html']);

const PRIMARY_PAGES = {
  'index.html': {
    title: 'Casey Barton · Forward-Deployed AI Architect',
    description: 'Casey Barton is a Forward-Deployed AI Architect building dependable agentic systems, AI control planes, bounded execution, evaluation, recovery, and inspectable technical proof.',
    schema: [
      {
        '@context': 'https://schema.org',
        '@type': 'WebSite',
        name: 'Casey Barton · Applied AI Systems',
        url: `${BASE}/`,
      },
      {
        '@context': 'https://schema.org',
        '@type': 'Person',
        name: 'Casey Del Carpio Barton',
        url: `${BASE}/`,
        jobTitle: 'Forward-Deployed AI Architect',
        email: 'mailto:glacier.equilibrium@gmail.com',
        sameAs: ['https://github.com/GlacierEQ'],
        address: {
          '@type': 'PostalAddress',
          addressLocality: 'Honolulu',
          addressRegion: 'HI',
          addressCountry: 'US',
        },
      },
    ],
  },
  'resume/index.html': {
    title: 'Forward-Deployed AI Engineer Resume · Casey Barton',
    description: 'Resume for Casey Barton, a Forward-Deployed AI Engineer and Agent Infrastructure Engineer building dependable, evidence-bound applied AI systems.',
    schema: [{
      '@context': 'https://schema.org',
      '@type': 'ProfilePage',
      name: 'Forward-Deployed AI Engineer Resume · Casey Barton',
      mainEntity: {
        '@type': 'Person',
        name: 'Casey Del Carpio Barton',
        jobTitle: 'Forward-Deployed AI Engineer',
        url: `${BASE}/resume/`,
        sameAs: ['https://github.com/GlacierEQ'],
      },
    }],
  },
  'master/index.html': {
    title: 'Applied AI Systems Architecture · Casey Barton',
    description: 'Technical due diligence for Casey Barton’s applied AI systems portfolio: architecture, evidence, failure semantics, and exact operational limits.',
    schema: [{
      '@context': 'https://schema.org',
      '@type': 'AboutPage',
      name: 'Applied AI Systems Architecture · Casey Barton',
      about: {
        '@type': 'Person',
        name: 'Casey Del Carpio Barton',
        jobTitle: 'Forward-Deployed AI Architect',
      },
    }],
  },
  'visualizer/index.html': {
    title: 'Architecture Evidence Explorer · Casey Barton',
    description: 'Explore evidence-bound architecture, system relationships, implementation paths, and proof ceilings across GlacierEQ applied AI systems.',
    schema: [{
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      name: 'Architecture Evidence Explorer · Casey Barton',
      about: 'Evidence-bound applied AI system architecture',
    }],
  },
  'inventions/index.html': {
    title: 'Applied AI Invention Evidence Map · Casey Barton',
    description: 'Problem-centered evidence map of Casey Barton’s applied AI systems, cross-system workflows, repositories, and reproducible proof boundaries.',
    schema: [{
      '@context': 'https://schema.org',
      '@type': 'CollectionPage',
      name: 'Applied AI Invention Evidence Map · Casey Barton',
      description: 'Problem-centered map of public applied AI systems, evidence, and proof boundaries.',
    }],
  },
  'estate/index.html': {
    title: 'Applied AI Systems Estate Explorer · Casey Barton',
    description: 'Explore the public GlacierEQ applied AI systems estate by capability family, evidence boundary, and independently reviewable repository surface.',
    schema: [{
      '@context': 'https://schema.org',
      '@type': 'CollectionPage',
      name: 'Applied AI Systems Estate Explorer · Casey Barton',
      description: 'Public applied AI systems organized by capability family and evidence boundary.',
    }],
  },
  'atlas/index.html': {
    title: 'Company Alignment Atlas · Casey Barton',
    description: 'Explore public, evidence-bound company lenses and relevant applied AI systems without implying company affiliation, endorsement, or access.',
    schema: [{
      '@context': 'https://schema.org',
      '@type': 'CollectionPage',
      name: 'Company Alignment Atlas · Casey Barton',
      description: 'Public company lenses linked to evidence-bound applied AI system analysis.',
    }],
  },
};

const PRIORITY = new Map([
  ['/', '1.0'],
  ['/resume/', '0.9'],
  ['/master/', '0.8'],
  ['/mesh/', '0.8'],
  ['/machine/', '0.7'],
  ['/visualizer/', '0.8'],
  ['/inventions/', '0.8'],
  ['/estate/', '0.8'],
  ['/atlas/', '0.8'],
]);

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('"', '&quot;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');
}

function jsonLd(value) {
  return JSON.stringify(value).replaceAll('<', '\\u003c');
}

function routeFor(relative) {
  if (relative === 'index.html') return '/';
  if (!relative.endsWith('/index.html')) return `/${relative}`;
  return `/${relative.slice(0, -'index.html'.length)}`;
}

async function filesIn(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const output = [];
  for (const entry of entries) {
    const target = path.join(directory, entry.name);
    if (entry.isSymbolicLink()) throw new Error(`symbolic link found in generated site tree: ${path.relative(ROOT, target)}`);
    if (entry.isDirectory()) output.push(...await filesIn(target));
    else if (entry.isFile()) output.push(target);
  }
  return output;
}

async function assetVersions() {
  const assets = new Map();
  for (const name of ['site.css', 'site.complete.css', 'site.systems.css', 'site.interaction.css', 'site.algerian.css', 'favicon.svg', 'social-card.svg']) {
    const full = path.join(SITE, 'assets', name);
    try {
      const body = await readFile(full);
      assets.set(`/assets/${name}`, createHash('sha256').update(body).digest('hex').slice(0, 12));
    } catch (error) {
      if (error?.code !== 'ENOENT') throw error;
    }
  }
  return assets;
}

function injectBeforeHeadClose(html, addition) {
  if (html.includes(addition)) return html;
  const close = html.toLowerCase().lastIndexOf('</head>');
  if (close < 0) return html;
  return `${html.slice(0, close)}${addition}\n${html.slice(close)}`;
}

function withMeta(html, name, content, property = false) {
  const matcher = property
    ? new RegExp(`<meta\\s+[^>]*property=["']${name}["'][^>]*>`, 'i')
    : new RegExp(`<meta\\s+[^>]*name=["']${name}["'][^>]*>`, 'i');
  const tag = property
    ? `<meta property="${name}" content="${escapeHtml(content)}">`
    : `<meta name="${name}" content="${escapeHtml(content)}">`;
  if (matcher.test(html)) return html.replace(matcher, tag);
  return injectBeforeHeadClose(html, tag);
}

function withCanonical(html, url) {
  const tag = `<link rel="canonical" href="${escapeHtml(url)}">`;
  if (/<link\s+[^>]*rel=["']canonical["'][^>]*>/i.test(html)) return html;
  return injectBeforeHeadClose(html, tag);
}

function withSchema(html, schema) {
  if (!schema?.length || html.includes('data-production-seo-schema="v1"')) return html;
  return injectBeforeHeadClose(html, `<script type="application/ld+json" data-production-seo-schema="v1">${jsonLd(schema.length === 1 ? schema[0] : schema)}</script>`);
}

function replaceBrokenCompaniesNav(html) {
  return html
    .replaceAll('<a href="/companies/">Companies</a>', '<a href="/atlas/">Company Atlas</a>')
    .replaceAll('<a href="/companies/">Company Atlas</a>', '<a href="/atlas/">Company Atlas</a>');
}

function versionLocalAssets(html, versions) {
  for (const [asset, version] of versions) {
    const escaped = asset.replaceAll('.', '\\.');
    const matcher = new RegExp(`(${escaped})(?![A-Za-z0-9_?=&.-])`, 'g');
    html = html.replace(matcher, `$1?v=${version}`);
  }
  return html;
}

async function optimizeHtml() {
  const versions = await assetVersions();
  const htmlFiles = (await filesIn(SITE)).filter(file => file.endsWith('.html'));
  let changed = 0;
  for (const file of htmlFiles) {
    const relative = path.relative(SITE, file).replaceAll(path.sep, '/');
    let html = await readFile(file, 'utf8');
    const original = html;
    const route = routeFor(relative);
    const page = PRIMARY_PAGES[relative];

    html = replaceBrokenCompaniesNav(html);
    html = versionLocalAssets(html, versions);
    if (!SKIP_CANONICAL.has(relative) && !/<meta[^>]+name=["']robots["'][^>]+(?:noindex|none)/i.test(html)) {
      html = withCanonical(html, `${BASE}${route}`);
    }
    if (page) {
      html = withMeta(html, 'description', page.description);
      html = withMeta(html, 'og:type', 'website', true);
      html = withMeta(html, 'og:title', page.title, true);
      html = withMeta(html, 'og:description', page.description, true);
      html = withMeta(html, 'og:url', `${BASE}${route}`, true);
      html = withMeta(html, 'og:image', `${BASE}/assets/social-card.svg`, true);
      html = withMeta(html, 'twitter:card', 'summary_large_image');
      html = withMeta(html, 'twitter:title', page.title);
      html = withMeta(html, 'twitter:description', page.description);
      html = withMeta(html, 'twitter:image', `${BASE}/assets/social-card.svg`);
      html = withSchema(html, page.schema);
    }
    if (html !== original) {
      await writeFile(file, html, 'utf8');
      changed += 1;
    }
  }
  return { changed, htmlFiles: htmlFiles.length };
}

async function buildSitemap() {
  const companyRoot = path.join(SITE, 'companies');
  const entries = await readdir(companyRoot, { withFileTypes: true });
  const companyRoutes = [];
  for (const entry of entries) {
    if (!entry.isDirectory() || entry.isSymbolicLink()) continue;
    const index = path.join(companyRoot, entry.name, 'index.html');
    try {
      const info = await stat(index);
      if (info.isFile()) companyRoutes.push(`/companies/${entry.name}/`);
    } catch (error) {
      if (error?.code !== 'ENOENT') throw error;
    }
  }
  companyRoutes.sort();
  const routes = [...PRIORITY.keys(), ...companyRoutes];
  const body = routes.map(route => {
    const priority = PRIORITY.get(route);
    return priority
      ? `  <url><loc>${BASE}${route}</loc><priority>${priority}</priority></url>`
      : `  <url><loc>${BASE}${route}</loc></url>`;
  });
  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body.join('\n')}\n</urlset>\n`;
  await writeFile(path.join(SITE, 'sitemap.xml'), sitemap, 'utf8');
  return { routes: routes.length, companyRoutes: companyRoutes.length };
}

const html = await optimizeHtml();
const sitemap = await buildSitemap();
console.log(`Production SEO optimized: ${html.changed}/${html.htmlFiles} HTML files changed; sitemap has ${sitemap.routes} canonical URLs (${sitemap.companyRoutes} company routes).`);

const assert = require('node:assert/strict');
const test = require('node:test');
const releaseRouter = require('./api/release-router.js');

function fakeResponse() {
  const headers = new Map();
  return {
    statusCode: 200,
    body: null,
    ended: false,
    setHeader(name, value) { headers.set(String(name).toLowerCase(), value); },
    getHeader(name) { return headers.get(String(name).toLowerCase()); },
    end(chunk = '') {
      this.ended = true;
      this.body = Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk));
    },
  };
}

test('companies discovery root redirects permanently to canonical atlas root', async () => {
  const policy = releaseRouter.seoPolicy({ url: '/?path=companies' }, 'companies');
  assert.deepEqual(policy, { kind: 'redirect', location: '/atlas/' });

  const res = fakeResponse();
  await releaseRouter({ url: '/?path=companies' }, res);
  assert.equal(res.statusCode, 308);
  assert.equal(res.getHeader('location'), '/atlas/');
  assert.equal(res.getHeader('content-length'), '0');
  assert.equal(res.ended, true);
});

test('legacy atlas company routes redirect to canonical companies namespace', () => {
  assert.deepEqual(
    releaseRouter.seoPolicy({ url: '/?path=atlas/github' }, 'atlas/github'),
    { kind: 'redirect', location: '/companies/github/' },
  );
  assert.deepEqual(
    releaseRouter.seoPolicy(
      { url: '/?path=atlas/google-deepmind/record.json' },
      'atlas/google-deepmind/record.json',
    ),
    { kind: 'redirect', location: '/companies/google-deepmind/record.json' },
  );
});

test('atlas and company identities receive one canonical indexable URL', () => {
  assert.deepEqual(
    releaseRouter.seoPolicy({ url: '/?path=atlas' }, 'atlas'),
    {
      kind: 'html',
      canonical: 'https://casey-barton-glaciereq.vercel.app/atlas/',
      robots: 'index,follow',
    },
  );
  assert.deepEqual(
    releaseRouter.seoPolicy({ url: '/?path=companies/github' }, 'companies/github'),
    {
      kind: 'html',
      canonical: 'https://casey-barton-glaciereq.vercel.app/companies/github/',
      robots: 'index,follow',
    },
  );
});

test('parameterized company and compiler projections are noindex canonical views', () => {
  assert.deepEqual(
    releaseRouter.seoPolicy(
      { url: '/?path=companies/github&depth=senior_engineer' },
      'companies/github',
    ),
    {
      kind: 'html',
      canonical: 'https://casey-barton-glaciereq.vercel.app/companies/github/',
      robots: 'noindex,follow',
    },
  );
  assert.deepEqual(
    releaseRouter.seoPolicy(
      { url: '/?path=compiler&company=github&role=Engineer&depth=senior_engineer' },
      'compiler',
    ),
    {
      kind: 'html',
      canonical: 'https://casey-barton-glaciereq.vercel.app/compiler/',
      robots: 'noindex,follow',
    },
  );
  assert.deepEqual(
    releaseRouter.seoPolicy({ url: '/?path=compiler' }, 'compiler'),
    {
      kind: 'html',
      canonical: 'https://casey-barton-glaciereq.vercel.app/compiler/',
      robots: 'index,follow',
    },
  );
});

test('HTML rewrite removes competing robots/canonical declarations and emits exactly one authority pair', () => {
  const input = Buffer.from(`<!doctype html><html><head>
<meta name="robots" content="index,follow">
<link rel="canonical" href="https://example.invalid/old/">
<title>Example</title></head><body>ok</body></html>`);
  const output = releaseRouter.rewriteHtmlSeo(input, {
    robots: 'noindex,follow',
    canonical: 'https://casey-barton-glaciereq.vercel.app/compiler/',
  }).toString('utf8');

  assert.equal((output.match(/name="robots"/g) || []).length, 1);
  assert.equal((output.match(/rel="canonical"/g) || []).length, 1);
  assert.match(output, /content="noindex,follow"/);
  assert.match(output, /href="https:\/\/casey-barton-glaciereq\.vercel\.app\/compiler\/"/);
  assert.doesNotMatch(output, /example\.invalid/);
});

test('sitemap keeps canonical atlas and company identities but removes duplicate roots and legacy company paths', () => {
  const input = Buffer.from(`<?xml version="1.0"?><urlset>
<url><loc>https://casey-barton-glaciereq.vercel.app/atlas/</loc></url>
<url><loc>https://casey-barton-glaciereq.vercel.app/companies/</loc></url>
<url><loc>https://casey-barton-glaciereq.vercel.app/companies/github/</loc></url>
<url><loc>https://casey-barton-glaciereq.vercel.app/atlas/github/</loc></url>
</urlset>`);
  const output = releaseRouter.rewriteSitemapSeo(input).toString('utf8');

  assert.match(output, /\/atlas\/<\/loc>/);
  assert.match(output, /\/companies\/github\/<\/loc>/);
  assert.doesNotMatch(output, /\/companies\/<\/loc>/);
  assert.doesNotMatch(output, /\/atlas\/github\/<\/loc>/);
});

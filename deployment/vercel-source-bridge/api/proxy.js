const crypto = require('crypto');

const SOURCE_COMMIT = '9971548f05c9668cb491805fa15a9548763a1a6c';
const RAW_ROOT = `https://raw.githubusercontent.com/GlacierEQ/job-application/${SOURCE_COMMIT}/site-v15/`;

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.pdf': 'application/pdf',
};

const REQUIRED = {
  'index.html': '910ae7c7dc749fa792c495fb7c7e08c82a9d150ad28dd5ea2adc72e697a70478',
  'resume/index.html': '2d2c3c462b68683c3d9ddffd287f37b8e703eb058a33e36ce39393012e7a3225',
  'master/index.html': '7a846f60f92635ee0ecae088acbf340e3963b732a19f8362be44621b8a74971e',
  'mesh/index.html': '6e5781c69e5c119c0030fdc20f2901ec0514fd31d9ef19def7733303b79e7c94',
  'machine/index.html': '898c398ac3ca7cd8516f67b8ebf68941d7174437be061a4a916339667d51d8f8',
  'data/portfolio.json': 'd212ea17b5b3c479735efefe40ec78382d0913535768924c39e21da1f12b8d86',
  'data/company-families.json': '889295fdf234ee35dfe2a6cdd5f685f5ab4f60d9f5f4e023917405e494140f86',
  'data/psysoc-x-profiles.json': 'e8f27290acc0740d1109e9d4ae433f4f61bea03fcd46ee895671e462672f75a7',
  'downloads/Casey_Barton_Resume.pdf': 'e4d189910b324555f63e8d4214d9f47be582c3e501fdb87136f712db443fad88',
  'assets/site.css': '2737211f8aea4c978a02f46c82f738203385301e8d446d2814206875701896ad',
  'assets/social-card.svg': 'd785e31db1e5207b6361e2491a7ca6ff2a421fe3b6e86dd1b1d858cd98eeb67e',
  'assets/favicon.svg': '6b5a01683c105a1b1240ed3444f811036d17dd146a2a2e801a2821f792b2fe8c',
  'sitemap.xml': 'cd8c33d8fd75be84235e9009a299fcce955947f9218b10a5f0f78b36105ea400',
  'robots.txt': '3a4d91def310706fef59d6224ca266e48e95d8e3aaa9731edc693cc5914454c3',
  'llms.txt': 'e6ecd1a83b20f03e869bda927cdc4212044c429d49d43b3a77932c3a74c6289a',
  '404.html': '105398ac802698554f46d58af7551940501c87bc9f95dc6bcf4b27a58d2ea651',
};

function normalize(input) {
  const raw = Array.isArray(input) ? input.join('/') : String(input || '');
  const clean = raw.replace(/^\/+|\/+$/g, '');
  if (!clean) return 'index.html';
  if (clean.includes('..') || clean.includes('\\')) return null;
  const last = clean.split('/').pop() || '';
  return last.includes('.') ? clean : `${clean}/index.html`;
}

function extension(path) {
  const match = path.match(/(\.[a-z0-9]+)$/i);
  return match ? match[1].toLowerCase() : '';
}

function securityHeaders(res) {
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'none'; style-src 'self'; img-src 'self' data:; connect-src 'none'; font-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'; form-action 'self' mailto:; upgrade-insecure-requests",
  );
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=()');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  res.setHeader('X-V15-Source-Commit', SOURCE_COMMIT);
}

async function fetchSource(path) {
  const response = await fetch(RAW_ROOT + path, {
    headers: { 'User-Agent': 'GlacierEQ-V15-Source-Bridge/1.2' },
  });
  const body = Buffer.from(await response.arrayBuffer());
  return {
    response,
    body,
    sha256: crypto.createHash('sha256').update(body).digest('hex'),
  };
}

async function verifyDeployment(res) {
  const files = [];
  let pass = true;

  for (const [path, expected] of Object.entries(REQUIRED)) {
    const { response, body, sha256 } = await fetchSource(path);
    const ok = response.ok && sha256 === expected;
    pass = pass && ok;
    files.push({ path, status: response.status, bytes: body.length, sha256, expected, ok });
  }

  res.statusCode = pass ? 200 : 503;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(
    JSON.stringify(
      {
        schema: 'glaciereq.v15-production-verification.v1',
        status: pass ? 'PASS' : 'FAIL',
        source_commit: SOURCE_COMMIT,
        canonical_routes: ['/', '/resume/', '/master/', '/mesh/', '/machine/'],
        facts_invariant: true,
        files,
      },
      null,
      2,
    ),
  );
}

module.exports = async function handler(req, res) {
  securityHeaders(res);

  const raw = Array.isArray(req.query.path) ? req.query.path.join('/') : String(req.query.path || '');
  if (raw === '__v15_verify') return verifyDeployment(res);

  let path = normalize(raw);
  if (!path) {
    res.statusCode = 400;
    res.end('Invalid path');
    return;
  }

  let { response: upstream, body } = await fetchSource(path);
  if (!upstream.ok) {
    path = '404.html';
    ({ response: upstream, body } = await fetchSource(path));
    res.statusCode = 404;
  } else {
    res.statusCode = 200;
  }

  const ext = extension(path);
  res.setHeader('Content-Type', TYPES[ext] || 'application/octet-stream');
  res.setHeader(
    'Cache-Control',
    path.startsWith('data/')
      ? 'public, max-age=0, s-maxage=300, must-revalidate'
      : 'public, max-age=0, s-maxage=900, must-revalidate',
  );
  if (path.startsWith('downloads/')) {
    res.setHeader('Content-Disposition', `attachment; filename="${path.split('/').pop()}"`);
  }
  res.setHeader('Content-Length', String(body.length));
  res.end(body);
};

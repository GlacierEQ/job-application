const crypto = require('crypto');
const { URL } = require('node:url');

const SOURCE_COMMIT = 'ef0cc0394463181ee6999d06f1c8bc5a6c3ab657';
const RAW_ROOT = `https://raw.githubusercontent.com/GlacierEQ/job-application/${SOURCE_COMMIT}/site-v15/`;

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.pdf': 'application/pdf',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
};

const REQUIRED = {
  'index.html': '4568cbd3d4b20a031b38ff35aa69d650ba2a528ce1417816cfa2635322faefff',
  'resume/index.html': '0b956afa686604796ba983992768a85e67f442364e630471f5a2d1654d7f3cc1',
  'master/index.html': 'ee1b8d8cd5fe36d1e04e83667bf7ff8f463a89b8e057b340430b203f1ee189cd',
  'mesh/index.html': 'c2eb82d6d612a1b0272ee0593d4624b916eb6cc8d305d93b78f2ca2d9f9707e2',
  'machine/index.html': '04ae02c47333db08d533377a23b6250077ee1168ec79af539d104f844964f009',
  'data/portfolio.json': 'd212ea17b5b3c479735efefe40ec78382d0913535768924c39e21da1f12b8d86',
  'data/company-families.json': '889295fdf234ee35dfe2a6cdd5f685f5ab4f60d9f5f4e023917405e494140f86',
  'data/psysoc-x-profiles.json': 'e8f27290acc0740d1109e9d4ae433f4f61bea03fcd46ee895671e462672f75a7',
  'data/resume.json': '61a3fd77256af69ca36a774dad2d72f0f859a5d415d14423c21e0a2016c579b7',
  'data/resume-artifacts.json': '78675a7b2ec849b30918f867e837fe64fc83a6bfe6ec53f88b4ae7070790680c',
  'resume/ats.txt': '5d16695f186c5bb5762deefe77b2bcbf66ef9e730560b0c7a190a6d497f87c34',
  'downloads/Casey_Barton_Resume.pdf': 'c46b4c3c31bea8405c28322e9f81be4ffd36c7faec9154acfd8da16a647cd1e3',
  'downloads/Casey_Barton_Resume.docx': 'aa022ca8c40d59624e6e7e3ef88fb439f6d21c7adcb997a0b11cd50b05827d0e',
  'assets/site.css': '8f3a659076fa9a4cbb90cf623baf5a29dad2a1cf14c246f4496aeb48c382012b',
  'assets/site.systems.css': '47c31b9d8a3e4eccfe87569b97a702a2fa1ff1641856febd8d275aa4af888407',
  'assets/resume.v17.css': 'dca69585f5a380514c9f6d0eca2aadfd4f8792ccf7abf01a99b4df4b5b17f45f',
  'assets/social-card.svg': '8727f9617aefcf622aeb715fcdd39af34281cf8202e4885eb1152ff0f6092c19',
  'assets/favicon.svg': 'aeb81d69f18d01f4b0c3c8cdb81c631d28c9dccf5637639330f5fb02e32b33ff',
  'sitemap.xml': 'cd8c33d8fd75be84235e9009a299fcce955947f9218b10a5f0f78b36105ea400',
  'robots.txt': '3a4d91def310706fef59d6224ca266e48e95d8e3aaa9731edc693cc5914454c3',
  'llms.txt': '480062ea9fea49ca00cd0cba40fdd5260c377b3d0d71ab20e91a7f65702d5151',
  '404.html': '072452ab072b36a04ba1c7e76e8cc0d7d9207f936b9ab00df24ab4c4d0e11981',
};

function requestPath(req) {
  const parsed = new URL(String(req.url || '/'), 'https://glaciereq.invalid');
  const values = parsed.searchParams.getAll('path');
  if (!values.length) return '';
  return values.length === 1 ? values[0] : values.join('/');
}

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
  res.setHeader('X-GlacierEQ-Source-Commit', SOURCE_COMMIT);
  res.setHeader('X-PSYSOCX-Release', 'V16-V17');
}

async function fetchSource(path) {
  const response = await fetch(RAW_ROOT + path, {
    headers: { 'User-Agent': 'GlacierEQ-V17-Source-Bridge/1.0' },
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
        schema: 'glaciereq.v17-production-verification.v1',
        status: pass ? 'PASS' : 'FAIL',
        source_commit: SOURCE_COMMIT,
        release: 'V16 Signal Architecture + V17 Resume Intelligence',
        canonical_routes: ['/', '/resume/', '/master/', '/mesh/', '/machine/'],
        resume_surfaces: [
          '/downloads/Casey_Barton_Resume.pdf',
          '/downloads/Casey_Barton_Resume.docx',
          '/resume/ats.txt',
          '/data/resume.json',
        ],
        psysoc_x_profiles: ['recruiter', 'master', 'machine', 'mesh'],
        facts_invariant: true,
        scripts: 0,
        trackers: 0,
        files,
      },
      null,
      2,
    ),
  );
}

module.exports = async function handler(req, res) {
  securityHeaders(res);

  const raw = requestPath(req);
  if (raw === '__v17_verify' || raw === '__v15_verify') return verifyDeployment(res);

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
    path.startsWith('data/') || path === 'resume/ats.txt'
      ? 'public, max-age=0, s-maxage=300, must-revalidate'
      : 'public, max-age=0, s-maxage=900, must-revalidate',
  );
  if (path.startsWith('downloads/')) {
    res.setHeader('Content-Disposition', `attachment; filename="${path.split('/').pop()}"`);
  }
  res.setHeader('Content-Length', String(body.length));
  res.end(body);
};

module.exports.requestPath = requestPath;
module.exports.normalize = normalize;

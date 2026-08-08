const crypto = require('crypto');
const { URL } = require('node:url');

const WEB_SOURCE_COMMIT = 'b531968963269b01dd627a9bfe211b61274beec0';
const LEGACY_SOURCE_COMMIT = 'c5701dedc834359c78399b4370a8147501784d19';
const HELIX_COMMIT = '83549cda4af3714304f202d0f4d35b29d28da9f7';
const LEGACY_RAW_ROOT = `https://raw.githubusercontent.com/GlacierEQ/job-application/${LEGACY_SOURCE_COMMIT}/site-v15/`;
const WEB_RAW_ROOT = `https://raw.githubusercontent.com/GlacierEQ/job-application/${WEB_SOURCE_COMMIT}/site-v15/`;
const COMPLETE_LINK = '<link rel="stylesheet" href="/assets/site.complete.css">';
const RELEASE = 'V21-FIRST-STAR-COMPLETE-WEB';

const REQUIRED_GIT_BLOBS = {
  'index.html': '4d927fb3bb0fa15debaf0c8554c0965bbcc994fd',
  'resume/index.html': '854b82f7ec491937ba27fadd749f69e9bb0532d4',
  'master/index.html': '36fc08c8b3915cc94323f3ee9aa9df5c91da56bd',
  'mesh/index.html': 'fa2406d1c0d4d198f69b1e94544e6c2c306611be',
  'machine/index.html': 'c24123649c301dd88b7d8116f916af508e46ff32',
  'assets/site.css': '27dbe7b99cd44f9c3c1f22c9d6870a2e02468fc0',
  'assets/site.systems.css': 'd2c7dc6f3e74a68b97e45bc166fec02b42517456',
  'assets/site.complete.css': 'd98c701e09f712e3558ea0bb5f48dd713e8c294b',
  'data/current-proof.json': 'b05d5f88a10490df3bfbc0be4536c458b24bd332',
  'downloads/Casey_Barton_Resume.pdf': '90f03d4c2d4c7a2660c8396cd4291d0e78ca0f4a',
  'downloads/Casey_Barton_Resume.docx': '42d9e518b0a82a51b8c48de77dbbb28ffe6871c1',
};

const nativeFetch = global.fetch.bind(global);

function sourceRewrite(input) {
  const value = typeof input === 'string' || input instanceof URL ? String(input) : input?.url;
  if (!value || !value.startsWith(LEGACY_RAW_ROOT)) return null;
  return `${WEB_RAW_ROOT}${value.slice(LEGACY_RAW_ROOT.length)}`;
}

global.fetch = async (input, init) => {
  const rewritten = sourceRewrite(input);
  if (!rewritten) return nativeFetch(input, init);
  if (typeof Request !== 'undefined' && input instanceof Request) {
    return nativeFetch(new Request(rewritten, input), init);
  }
  return nativeFetch(rewritten, init);
};

const proxy = require('./proxy.js');

function gitBlobSha(body) {
  const header = Buffer.from(`blob ${body.length}\0`, 'utf8');
  return crypto.createHash('sha1').update(Buffer.concat([header, body])).digest('hex');
}

function sha256(body) {
  return crypto.createHash('sha256').update(body).digest('hex');
}

function designHtml(body) {
  const buffer = Buffer.isBuffer(body) ? body : Buffer.from(body || '');
  const text = buffer.toString('utf8');
  if (text.includes('/assets/site.complete.css')) return buffer;
  if (!/<\/head>/i.test(text)) return buffer;
  return Buffer.from(text.replace(/<\/head>/i, `  ${COMPLETE_LINK}\n</head>`));
}

function securityHeaders(res) {
  res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'none'; style-src 'self'; img-src 'self' data:; connect-src 'none'; font-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'; form-action 'self' mailto:; upgrade-insecure-requests");
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=()');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  res.setHeader('X-GlacierEQ-Source-Commit', WEB_SOURCE_COMMIT);
  res.setHeader('X-GlacierEQ-Helix-Commit', HELIX_COMMIT);
  res.setHeader('X-PSYSOCX-Release', RELEASE);
}

async function verifyWebRelease(res) {
  const files = [];
  let pass = true;
  for (const [filePath, expectedBlob] of Object.entries(REQUIRED_GIT_BLOBS)) {
    let status = 0;
    let body = Buffer.alloc(0);
    try {
      const response = await nativeFetch(`${WEB_RAW_ROOT}${filePath}`, { headers: { 'User-Agent': 'GlacierEQ-Complete-Web-Verifier/1.0' } });
      status = response.status;
      body = Buffer.from(await response.arrayBuffer());
    } catch {
      status = 599;
    }
    const actualBlob = body.length ? gitBlobSha(body) : null;
    const ok = status === 200 && actualBlob === expectedBlob;
    pass = pass && ok;
    files.push({ path: filePath, status, bytes: body.length, git_blob: actualBlob, expected_git_blob: expectedBlob, sha256: body.length ? sha256(body) : null, ok });
  }

  let proof = null;
  try {
    const response = await nativeFetch(`${WEB_RAW_ROOT}data/current-proof.json`, { headers: { 'User-Agent': 'GlacierEQ-Complete-Web-Verifier/1.0' } });
    proof = await response.json();
    const star = proof?.current_star;
    pass = pass
      && proof?.schema === 'glaciereq.current-proof.v1'
      && proof?.release === 'V21 First Star Completion'
      && star?.id === 'mission-agentic-ai-assurance'
      && star?.implementation?.commit === '4328fa7078e6e4125f895768142c6af0c5ec1234'
      && star?.implementation?.acceptance_tests === 17
      && star?.proof?.verification_state === 'REPRODUCED'
      && star?.proof?.receipt_id === 'b7a3e3cba968e19bb91ed8f6881b69e37efc97d7e8414be0aca431dff501123f'
      && star?.company_projection?.stage === 'CLAIM_PROMOTED'
      && star?.company_projection?.claim_ceiling === 'proof_bound_company_specific'
      && star?.company_projection?.helix_commit === HELIX_COMMIT;
  } catch {
    pass = false;
  }

  const payload = Buffer.from(JSON.stringify({
    status: pass ? 'PASS' : 'FAIL',
    release: RELEASE,
    source_repository: 'GlacierEQ/job-application',
    source_commit: WEB_SOURCE_COMMIT,
    helix_repository: 'GlacierEQ/job-app-helix',
    helix_commit: HELIX_COMMIT,
    complete_design: true,
    client_scripts: 0,
    source_files: files,
    current_star: proof?.current_star?.id || null,
    proof_state: proof?.current_star?.proof?.verification_state || null,
    company_stage: proof?.current_star?.company_projection?.stage || null,
    claim_ceiling: proof?.current_star?.company_projection?.claim_ceiling || null,
  }, null, 2));

  securityHeaders(res);
  res.statusCode = pass ? 200 : 503;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Content-Length', String(payload.length));
  res.end(payload);
}

module.exports = async (req, res) => {
  const rawPath = proxy.requestPath(req);
  if (rawPath === '__v21_verify' || rawPath === '__design_verify') {
    await verifyWebRelease(res);
    return;
  }

  const originalSetHeader = res.setHeader.bind(res);
  const originalEnd = res.end.bind(res);
  res.setHeader = (name, value) => {
    const lower = String(name).toLowerCase();
    if (lower === 'x-glaciereq-source-commit') value = WEB_SOURCE_COMMIT;
    if (lower === 'x-psysocx-release') value = RELEASE;
    return originalSetHeader(name, value);
  };
  res.end = (body, ...args) => {
    const type = String(res.getHeader('Content-Type') || '');
    let output = Buffer.isBuffer(body) ? body : Buffer.from(body || '');
    if (type.startsWith('text/html')) output = designHtml(output);
    originalSetHeader('X-GlacierEQ-Source-Commit', WEB_SOURCE_COMMIT);
    originalSetHeader('X-GlacierEQ-Helix-Commit', HELIX_COMMIT);
    originalSetHeader('X-PSYSOCX-Release', RELEASE);
    originalSetHeader('Content-Length', String(output.length));
    return originalEnd(output, ...args);
  };

  await proxy(req, res);
};

module.exports.constants = { WEB_SOURCE_COMMIT, HELIX_COMMIT, RELEASE };
module.exports.gitBlobSha = gitBlobSha;
module.exports.designHtml = designHtml;

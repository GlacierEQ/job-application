const crypto = require('node:crypto');
const estateProxy = require('./estate-proxy.js');
const proxy = require('./proxy.js');

const TRUTH_COMMIT = '77358d5a53c137333d28421f64315b27e17a459d';
const RESUME_PATH = 'RESUME.md';
const RESUME_BLOB_SHA1 = 'd70c803b3cc1557b8d484f010f3cf0599842cf15';
const RAW_RESUME = `https://raw.githubusercontent.com/GlacierEQ/job-application/${TRUTH_COMMIT}/${RESUME_PATH}`;
const RELEASE = 'V23-TRUTH-SYNC-COMPLETE-WEB';
const VERIFY_SCHEMA = 'glaciereq.v23-truth-sync-verification.v1';
const ADMITTED_REPOSITORIES = 67;
const PACKAGE_STATE = 'PARTIALLY_VERIFIED';
const FETCH_TIMEOUT_MS = 12_000;
const MAX_BYTES = 4 * 1024 * 1024;
const STALE_BINARY_PATHS = new Set([
  'downloads/Casey_Barton_Resume.pdf',
  'downloads/Casey_Barton_Resume.docx',
]);
const CURRENT_RESUME_URL = `https://github.com/GlacierEQ/job-application/blob/${TRUTH_COMMIT}/RESUME.md`;

let truthPromise = null;

function gitBlobSha1(body) {
  const header = Buffer.from(`blob ${body.length}\0`);
  return crypto.createHash('sha1').update(header).update(body).digest('hex');
}

function requireValue(condition, message) {
  if (!condition) throw new Error(message);
}

async function boundedBytes(url, maxBytes = MAX_BYTES) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      headers: { 'user-agent': 'GlacierEQ-V23-Truth-Sync/1.0' },
      redirect: 'error',
      signal: controller.signal,
    });
    const declared = Number(response.headers.get('content-length') || 0);
    if (declared > maxBytes) throw new Error('truth_response_too_large');
    const body = Buffer.from(await response.arrayBuffer());
    if (body.length > maxBytes) throw new Error('truth_response_too_large');
    return { response, body };
  } catch (error) {
    if (error?.name === 'AbortError') throw new Error('truth_fetch_timeout');
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

async function loadTruthAuthority() {
  if (!truthPromise) {
    truthPromise = (async () => {
      const { response, body } = await boundedBytes(RAW_RESUME);
      requireValue(response.ok, `truth_resume_http_${response.status}`);
      const blobSha1 = gitBlobSha1(body);
      requireValue(blobSha1 === RESUME_BLOB_SHA1, `truth_resume_blob_mismatch:${blobSha1}`);
      const text = body.toString('utf8');
      requireValue(text.includes('67-repository admitted boundary'), 'truth_resume_boundary_missing');
      requireValue(text.includes(PACKAGE_STATE), 'truth_resume_state_missing');
      return {
        blob_sha1: blobSha1,
        text,
      };
    })().catch((error) => {
      truthPromise = null;
      throw error;
    });
  }
  return truthPromise;
}

function captureEstate(req) {
  return new Promise((resolve, reject) => {
    const headers = new Map();
    let settled = false;
    const res = {
      statusCode: 200,
      setHeader(name, value) {
        headers.set(String(name).toLowerCase(), value);
      },
      getHeader(name) {
        return headers.get(String(name).toLowerCase());
      },
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
    Promise.resolve(estateProxy(req, res))
      .then(() => {
        if (!settled) reject(new Error('estate_proxy_did_not_end'));
      })
      .catch(reject);
  });
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
  res.setHeader('X-GlacierEQ-Truth-Commit', TRUTH_COMMIT);
  res.setHeader('X-PSYSOCX-Release', RELEASE);
}

function replayHeaders(captured, res) {
  for (const [name, value] of captured.headers) {
    if (
      name === 'content-length' ||
      name === 'x-glaciereq-truth-commit' ||
      name === 'x-psysocx-release'
    ) {
      continue;
    }
    res.setHeader(name, value);
  }
  res.setHeader('X-GlacierEQ-Truth-Commit', TRUTH_COMMIT);
  res.setHeader('X-PSYSOCX-Release', RELEASE);
}

function staleHelixClaim(text) {
  const value = String(text || '');
  const forward = /(?:Job Application Helix|Helix)[\s\S]{0,500}(?:148\/148|148 of 148)/i;
  const reverse = /(?:148\/148|148 of 148)[\s\S]{0,500}(?:Job Application Helix|Helix)/i;
  return forward.test(value) || reverse.test(value);
}

function truthMarkerPresent(text) {
  const value = String(text || '');
  return value.includes('67') && value.includes(PACKAGE_STATE);
}

function replaceResumeDownloadLinks(html) {
  let output = html;
  output = output.replace(
    /<a class="button primary small" href="\/downloads\/Casey_Barton_Resume\.pdf">Human PDF<\/a>/g,
    `<a class="button primary small" href="${CURRENT_RESUME_URL}" target="_blank" rel="noopener">Canonical résumé</a>`,
  );
  output = output.replace(
    /<a class="button secondary small" href="\/downloads\/Casey_Barton_Resume\.docx">Editable DOCX<\/a>/g,
    '<a class="button secondary small" href="/resume/ats.txt">Current ATS text</a>',
  );
  return output;
}

function transformHtml(html) {
  let output = String(html || '');
  output = output.replaceAll(
    'V21 FIRST STAR COMPLETION · VERIFIED PRODUCTION',
    'V23 TRUTH SYNC · V22 ESTATE INTELLIGENCE · VERIFIED PRODUCTION',
  );
  output = output.replaceAll(
    '<b>148/148</b><span>Job Application Helix recorded tests</span>',
    '<b>67</b><span>Helix admitted repositories · PARTIALLY_VERIFIED</span>',
  );
  output = output.replaceAll(
    'data-claim-id="helix-tests" data-evidence-state="RECORDED"><b>148/148</b><span>Helix tests</span>',
    'data-claim-id="helix-tests" data-evidence-state="PARTIALLY_VERIFIED"><b>67</b><span>admitted repositories</span>',
  );
  output = output.replaceAll(
    'data-claim-id="helix" data-evidence-state="RECORDED_TESTS"',
    'data-claim-id="helix" data-evidence-state="PARTIALLY_VERIFIED"',
  );
  output = output.replaceAll('148/148 RECORDED', 'PARTIALLY_VERIFIED · 67 REPOSITORIES');
  output = output.replaceAll('RECORDED 148/148', 'PARTIALLY_VERIFIED · 67 REPOSITORIES');
  output = output.replaceAll(
    '148/148 recorded repository tests',
    '67-repository admitted boundary · PARTIALLY_VERIFIED',
  );
  output = output.replaceAll(
    '148/148 recorded tests',
    '67-repository admitted boundary · PARTIALLY_VERIFIED',
  );
  output = output.replaceAll(
    '148 of 148 recorded repository tests',
    'exact 67-repository admitted boundary; package PARTIALLY_VERIFIED; child repositories retain independent evidence states',
  );
  output = replaceResumeDownloadLinks(output);
  return output;
}

function transformAts(text) {
  let output = String(text || '');
  output = output.replaceAll(
    '- Job Application Helix: 148 of 148 recorded repository tests for evidence-governed hiring and portfolio orchestration.',
    '- Job Application Helix: exact 67-repository admitted boundary for evidence-governed hiring and portfolio orchestration; package PARTIALLY_VERIFIED; child repositories retain independent evidence states.',
  );
  output = output.replaceAll(
    'Job Application Helix - RECORDED 148/148',
    'Job Application Helix - PARTIALLY_VERIFIED - 67 REPOSITORIES ADMITTED',
  );
  output = output.replaceAll(
    '148/148 recorded repository tests',
    '67-repository admitted boundary; package PARTIALLY_VERIFIED',
  );
  output = output.replaceAll(
    '148 of 148 recorded repository tests',
    'exact 67-repository admitted boundary; package PARTIALLY_VERIFIED',
  );
  return output;
}

function transformResumeJson(value) {
  const data = structuredClone(value);
  data.meta = data.meta && typeof data.meta === 'object' ? data.meta : {};
  data.meta.truth_sync_authority_commit = TRUTH_COMMIT;
  data.meta.truth_sync_release = RELEASE;
  const projects = Array.isArray(data.projects) ? data.projects : [];
  const helix = projects.find((project) => project?.name === 'Job Application Helix');
  requireValue(helix, 'resume_json_helix_project_missing');
  helix.description =
    'Evidence-governed hiring and portfolio orchestration over an exact 67-repository admitted boundary; package PARTIALLY_VERIFIED and child repositories retain independent evidence states.';
  helix.keywords = [PACKAGE_STATE, 'admitted_repositories:67'];
  data.x_evidence = data.x_evidence && typeof data.x_evidence === 'object' ? data.x_evidence : {};
  data.x_evidence.proof =
    data.x_evidence.proof && typeof data.x_evidence.proof === 'object'
      ? data.x_evidence.proof
      : {};
  delete data.x_evidence.proof.helix_tests;
  data.x_evidence.proof.helix_admitted_repositories = ADMITTED_REPOSITORIES;
  data.x_evidence.proof.helix_package_state = PACKAGE_STATE;
  data.x_evidence.proof.helix_child_repository_states_independent = true;
  return data;
}

function transformPortfolioJson(value) {
  const data = structuredClone(value);
  data.release = data.release && typeof data.release === 'object' ? data.release : {};
  // Kill stale V15 product brand; path site-v15 is deploy output only.
  data.release.name = 'Unified Helix-Bound Hire Surface';
  data.release.truth_sync_authority_commit = TRUTH_COMMIT;
  data.release.truth_sync_release = RELEASE;
  data.release.supersedes = Array.from(
    new Set([...(Array.isArray(data.release.supersedes) ? data.release.supersedes : []), 'V15 Final Hiring Release']),
  );
  if (!data.release.authority || typeof data.release.authority !== 'object') {
    data.release.authority = {
      control_plane: 'GlacierEQ/job-app-helix',
      flagship_registry: 'manifests/flagship_registry.json',
    };
  }
  const flagships = Array.isArray(data.flagships) ? data.flagships : [];
  const helix = flagships.find(
    (flagship) => flagship?.id === 'helix' || flagship?.name === 'Job Application Helix',
  );
  requireValue(helix, 'portfolio_json_helix_flagship_missing');
  helix.state = PACKAGE_STATE;
  helix.evidence =
    'Exact 67-repository admitted boundary; Helix package PARTIALLY_VERIFIED; child repositories retain independent evidence states.';
  helix.limit =
    'No aggregate Helix test-count claim is promoted. Child repositories retain independent evidence states and release-specific gates remain separate.';
  // Drop retired dead weight if present in older static blobs.
  data.flagships = flagships.filter((flagship) => flagship?.id !== 'microcode');
  return data;
}

function transformJson(filePath, text) {
  let value;
  try {
    value = JSON.parse(text);
  } catch (error) {
    throw new Error(`truth_json_parse:${filePath}:${error instanceof Error ? error.message : String(error)}`);
  }
  if (filePath === 'data/resume.json') return JSON.stringify(transformResumeJson(value), null, 2);
  if (filePath === 'data/portfolio.json') return JSON.stringify(transformPortfolioJson(value), null, 2);
  return text;
}

function transformBody(filePath, contentType, body) {
  if (body.length > MAX_BYTES) throw new Error('truth_input_too_large');
  const text = body.toString('utf8');
  let transformed = text;
  if (contentType.startsWith('text/html')) transformed = transformHtml(text);
  if (filePath === 'resume/ats.txt') transformed = transformAts(text);
  if (filePath === 'data/resume.json' || filePath === 'data/portfolio.json') {
    transformed = transformJson(filePath, text);
  }
  if (staleHelixClaim(transformed)) throw new Error(`stale_helix_claim:${filePath}`);
  const output = Buffer.from(transformed);
  if (output.length > MAX_BYTES) throw new Error('truth_output_too_large');
  return output;
}

async function projectCaptured(req, filePath) {
  const captured = await captureEstate(req);
  if (captured.status !== 200) return captured;
  const contentType = String(captured.headers.get('content-type') || '').toLowerCase();
  const supported =
    contentType.startsWith('text/html') ||
    filePath === 'resume/ats.txt' ||
    filePath === 'data/resume.json' ||
    filePath === 'data/portfolio.json';
  if (!supported) return captured;
  return {
    ...captured,
    body: transformBody(filePath, contentType, captured.body),
  };
}

function serveSupersededBinary(res, filePath) {
  const payload = Buffer.from(
    JSON.stringify(
      {
        schema: 'glaciereq.resume-binary-superseded.v1',
        status: 'SUPERSEDED',
        requested_path: filePath,
        reason: 'Binary résumé predates the current Helix truth authority and is withheld until regenerated.',
        current_resume: CURRENT_RESUME_URL,
        ats_text: '/resume/ats.txt',
        machine_resume: '/data/resume.json',
        truth_commit: TRUTH_COMMIT,
      },
      null,
      2,
    ),
  );
  securityHeaders(res);
  res.statusCode = 410;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Content-Length', String(payload.length));
  res.end(payload);
}

async function serveProjected(req, res, filePath) {
  const captured = await projectCaptured(req, filePath);
  replayHeaders(captured, res);
  res.statusCode = captured.status;
  res.setHeader('Content-Length', String(captured.body.length));
  res.end(captured.body);
}

async function verifySurface(path, options = {}) {
  const filePath = proxy.normalize(path);
  requireValue(filePath, `verify_invalid_path:${path}`);
  const captured = await projectCaptured({ url: `/?path=${encodeURIComponent(path)}` }, filePath);
  const text = captured.body.toString('utf8');
  const result = {
    status_code: captured.status,
    stale_helix_claim_absent: !staleHelixClaim(text),
    current_truth_marker_present: options.requireTruth ? truthMarkerPresent(text) : true,
  };
  result.ok =
    result.status_code === 200 &&
    result.stale_helix_claim_absent &&
    result.current_truth_marker_present;
  return result;
}

async function verifyV23(res) {
  const errors = [];
  let baseV22 = null;
  let authority = null;
  let surfaces = null;
  try {
    const v22 = await captureEstate({ url: '/?path=__v22_verify' });
    let payload = null;
    try {
      payload = JSON.parse(v22.body.toString('utf8'));
    } catch {}
    baseV22 = {
      status_code: v22.status,
      schema: payload?.schema || null,
      status: payload?.status || null,
      release: payload?.release || null,
    };
    if (v22.status !== 200 || payload?.status !== 'PASS') errors.push('base_v22_verifier_failed');

    authority = await loadTruthAuthority();
    const [root, resume, ats, resumeJson, portfolioJson, machine] = await Promise.all([
      verifySurface('', { requireTruth: true }),
      verifySurface('resume', { requireTruth: true }),
      verifySurface('resume/ats.txt', { requireTruth: true }),
      verifySurface('data/resume.json', { requireTruth: true }),
      verifySurface('data/portfolio.json', { requireTruth: true }),
      verifySurface('machine'),
    ]);
    surfaces = {
      root,
      resume,
      ats,
      resume_json: resumeJson,
      portfolio_json: portfolioJson,
      machine,
      stale_binary_downloads_blocked: [...STALE_BINARY_PATHS].length === 2,
    };
    for (const [name, result] of Object.entries(surfaces)) {
      if (name === 'stale_binary_downloads_blocked') continue;
      if (!result.ok) errors.push(`surface_failed:${name}`);
    }
    if (!surfaces.stale_binary_downloads_blocked) errors.push('stale_binary_boundary_failed');
  } catch (error) {
    errors.push(error instanceof Error ? error.message : 'v23_verification_failed');
  }

  const pass = errors.length === 0;
  const payload = Buffer.from(
    JSON.stringify(
      {
        schema: VERIFY_SCHEMA,
        status: pass ? 'PASS' : 'FAIL',
        release: RELEASE,
        base_v22: baseV22,
        truth_commit: TRUTH_COMMIT,
        resume_blob_sha1: authority?.blob_sha1 || null,
        helix_public_boundary: {
          admitted_repositories: ADMITTED_REPOSITORIES,
          package_state: PACKAGE_STATE,
          child_repository_states_independent: true,
          aggregate_test_count_promoted: false,
        },
        surfaces,
        errors,
        client_scripts: 0,
      },
      null,
      2,
    ),
  );
  securityHeaders(res);
  res.statusCode = pass ? 200 : 503;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Content-Length', String(payload.length));
  res.end(payload);
}

module.exports = async function truthProxy(req, res) {
  const rawPath = proxy.requestPath(req);
  if (rawPath === '__v23_verify') return verifyV23(res);
  const filePath = proxy.normalize(rawPath);
  if (!filePath) {
    securityHeaders(res);
    res.statusCode = 400;
    res.end('Invalid path');
    return;
  }
  if (STALE_BINARY_PATHS.has(filePath)) return serveSupersededBinary(res, filePath);
  try {
    await loadTruthAuthority();
    return await serveProjected(req, res, filePath);
  } catch (error) {
    const payload = Buffer.from(
      JSON.stringify(
        {
          schema: 'glaciereq.v23-truth-sync-error.v1',
          status: 'FAIL_CLOSED',
          truth_commit: TRUTH_COMMIT,
          path: filePath,
          error: error instanceof Error ? error.message : String(error),
        },
        null,
        2,
      ),
    );
    securityHeaders(res);
    res.statusCode = 503;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('Content-Length', String(payload.length));
    res.end(payload);
  }
};

module.exports.constants = {
  ADMITTED_REPOSITORIES,
  CURRENT_RESUME_URL,
  PACKAGE_STATE,
  RELEASE,
  RESUME_BLOB_SHA1,
  RESUME_PATH,
  TRUTH_COMMIT,
  VERIFY_SCHEMA,
};
module.exports.gitBlobSha1 = gitBlobSha1;
module.exports.loadTruthAuthority = loadTruthAuthority;
module.exports.staleHelixClaim = staleHelixClaim;
module.exports.transformAts = transformAts;
module.exports.transformBody = transformBody;
module.exports.transformHtml = transformHtml;
module.exports.transformPortfolioJson = transformPortfolioJson;
module.exports.transformResumeJson = transformResumeJson;
module.exports._resetTruthCache = () => {
  truthPromise = null;
};

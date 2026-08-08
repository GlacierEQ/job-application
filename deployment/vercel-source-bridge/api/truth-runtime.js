const estateProxy = require('./estate-proxy.js');
const proxy = require('./proxy.js');
const truthProxy = require('./truth-proxy.js');

const RELEASE = 'V23-TRUTH-SYNC-COMPLETE-WEB';
const VERIFY_SCHEMA = 'glaciereq.v23-truth-sync-verification.v1';
const ADMITTED_REPOSITORIES = 67;
const PACKAGE_STATE = 'PARTIALLY_VERIFIED';
const TRUTH_COMMIT = truthProxy.constants.TRUTH_COMMIT;
const STALE_BINARY_PATHS = [
  'downloads/Casey_Barton_Resume.pdf',
  'downloads/Casey_Barton_Resume.docx',
];

function requireValue(condition, message) {
  if (!condition) throw new Error(message);
}

function capture(handler, req) {
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
    Promise.resolve(handler(req, res))
      .then(() => {
        if (!settled) reject(new Error('handler_did_not_end'));
      })
      .catch(reject);
  });
}

function transformMachineHtml(html) {
  let output = String(html || '');
  output = output.replaceAll(
    '"helix": "148/148"',
    '"helix_admitted_repositories": 67,\n    "helix_package_state": "PARTIALLY_VERIFIED"',
  );
  output = output.replaceAll(
    '&quot;helix&quot;: &quot;148/148&quot;',
    '&quot;helix_admitted_repositories&quot;: 67,\n    &quot;helix_package_state&quot;: &quot;PARTIALLY_VERIFIED&quot;',
  );
  requireValue(!truthProxy.staleHelixClaim(output), 'stale_helix_claim:machine/index.html');
  requireValue(output.includes('67'), 'machine_truth_boundary_missing');
  requireValue(output.includes(PACKAGE_STATE), 'machine_truth_state_missing');
  return output;
}

function isMachinePath(filePath) {
  return filePath === 'machine/index.html';
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

function failClosed(res, filePath, error) {
  const payload = Buffer.from(
    JSON.stringify(
      {
        schema: 'glaciereq.v23-truth-runtime-error.v1',
        status: 'FAIL_CLOSED',
        truth_commit: TRUTH_COMMIT,
        path: filePath,
        error: error instanceof Error ? error.message : String(error),
      },
      null,
      2,
    ),
  );
  res.statusCode = 503;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-GlacierEQ-Truth-Commit', TRUTH_COMMIT);
  res.setHeader('X-PSYSOCX-Release', RELEASE);
  res.setHeader('Content-Length', String(payload.length));
  res.end(payload);
}

async function projectMachine(req) {
  await truthProxy.loadTruthAuthority();
  const captured = await capture(estateProxy, req);
  if (captured.status !== 200) return captured;
  const contentType = String(captured.headers.get('content-type') || '').toLowerCase();
  requireValue(contentType.startsWith('text/html'), 'machine_content_type_not_html');
  const body = Buffer.from(transformMachineHtml(captured.body.toString('utf8')));
  return { ...captured, body };
}

async function serveMachine(req, res, filePath) {
  try {
    const captured = await projectMachine(req);
    replayHeaders(captured, res);
    res.statusCode = captured.status;
    res.setHeader('Content-Length', String(captured.body.length));
    res.end(captured.body);
  } catch (error) {
    failClosed(res, filePath, error);
  }
}

async function projectSurface(path) {
  const filePath = proxy.normalize(path);
  requireValue(filePath, `verify_invalid_path:${path}`);
  const req = { url: `/?path=${encodeURIComponent(path)}` };
  if (isMachinePath(filePath)) return projectMachine(req);
  return capture(truthProxy, req);
}

function currentTruthMarker(text) {
  const value = String(text || '');
  return value.includes('67') && value.includes(PACKAGE_STATE);
}

async function verifySurface(path) {
  const captured = await projectSurface(path);
  const text = captured.body.toString('utf8');
  const result = {
    status_code: captured.status,
    stale_helix_claim_absent: !truthProxy.staleHelixClaim(text),
    current_truth_marker_present: currentTruthMarker(text),
  };
  result.ok =
    result.status_code === 200 &&
    result.stale_helix_claim_absent &&
    result.current_truth_marker_present;
  return result;
}

async function verifyBinaryBoundary(path) {
  const captured = await capture(truthProxy, {
    url: `/?path=${encodeURIComponent(path)}`,
  });
  let payload = null;
  try {
    payload = JSON.parse(captured.body.toString('utf8'));
  } catch {}
  return {
    status_code: captured.status,
    status: payload?.status || null,
    ok: captured.status === 410 && payload?.status === 'SUPERSEDED',
  };
}

async function baseV22State() {
  const captured = await capture(estateProxy, { url: '/?path=__v22_verify' });
  let payload = null;
  try {
    payload = JSON.parse(captured.body.toString('utf8'));
  } catch {}
  return {
    status_code: captured.status,
    schema: payload?.schema || null,
    status: payload?.status || null,
    release: payload?.release || null,
    ok: captured.status === 200 && payload?.status === 'PASS',
  };
}

function verificationHeaders(res) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-GlacierEQ-Truth-Commit', TRUTH_COMMIT);
  res.setHeader('X-PSYSOCX-Release', RELEASE);
}

async function verifyV23(res) {
  const errors = [];
  let authority = null;
  let baseV22 = null;
  let surfaces = null;
  let binaryBoundary = null;
  try {
    baseV22 = await baseV22State();
    if (!baseV22.ok) errors.push('base_v22_verifier_failed');

    authority = await truthProxy.loadTruthAuthority();
    const [root, resume, ats, resumeJson, portfolioJson, machine] = await Promise.all([
      verifySurface(''),
      verifySurface('resume'),
      verifySurface('resume/ats.txt'),
      verifySurface('data/resume.json'),
      verifySurface('data/portfolio.json'),
      verifySurface('machine'),
    ]);
    surfaces = {
      root,
      resume,
      ats,
      resume_json: resumeJson,
      portfolio_json: portfolioJson,
      machine,
    };
    for (const [name, result] of Object.entries(surfaces)) {
      if (!result.ok) errors.push(`surface_failed:${name}`);
    }

    const [pdf, docx] = await Promise.all(
      STALE_BINARY_PATHS.map((path) => verifyBinaryBoundary(path)),
    );
    binaryBoundary = { pdf, docx };
    if (!pdf.ok) errors.push('stale_pdf_not_blocked');
    if (!docx.ok) errors.push('stale_docx_not_blocked');
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
        stale_binary_boundary: binaryBoundary,
        errors,
        client_scripts: 0,
      },
      null,
      2,
    ),
  );
  verificationHeaders(res);
  res.statusCode = pass ? 200 : 503;
  res.setHeader('Content-Length', String(payload.length));
  res.end(payload);
}

module.exports = async function truthRuntime(req, res) {
  const rawPath = proxy.requestPath(req);
  if (rawPath === '__v23_verify') return verifyV23(res);
  const filePath = proxy.normalize(rawPath);
  if (!filePath) return truthProxy(req, res);
  if (isMachinePath(filePath)) return serveMachine(req, res, filePath);
  return truthProxy(req, res);
};

module.exports.constants = {
  ADMITTED_REPOSITORIES,
  PACKAGE_STATE,
  RELEASE,
  TRUTH_COMMIT,
  VERIFY_SCHEMA,
};
module.exports.capture = capture;
module.exports.currentTruthMarker = currentTruthMarker;
module.exports.isMachinePath = isMachinePath;
module.exports.projectMachine = projectMachine;
module.exports.transformMachineHtml = transformMachineHtml;
module.exports.verifyBinaryBoundary = verifyBinaryBoundary;

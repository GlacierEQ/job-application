const crypto = require('node:crypto');
const workflowTopologyProxy = require('./workflow-topology-proxy.js');
const recruiterProxy = require('./workflow-recruiter-proxy.js');
const roleMatrixRuntime = require('./recruiter-role-matrix.js');

const RELEASE = 'V32-RECRUITER-GAP-RUNTIME';
const SCHEMA = 'glaciereq.live-recruiter-gap-analysis.v1';
const LIVE_MATRIX_SCHEMA = 'glaciereq.live-recruiter-role-matrix.v1';
const PUBLIC_MATRIX_SCHEMA = 'glaciereq.public-recruiter-role-matrix.v1';
const SHA40 = /^[a-f0-9]{40}$/;
const SHA256 = /^[a-f0-9]{64}$/;

class RecruiterGapAnalysisError extends Error {}

function requireValue(condition, message) {
  if (!condition) throw new RecruiterGapAnalysisError(message);
}

function stableStringify(value) {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

function receipt(value) {
  return crypto.createHash('sha256').update(stableStringify(value)).digest('hex');
}

function round(value) {
  return Math.round(value * 1e6) / 1e6;
}

function validateTimestamp(value, code) {
  requireValue(typeof value === 'string' && value.length > 0, code);
  const parsed = Date.parse(value);
  requireValue(!Number.isNaN(parsed), code);
  requireValue(/[zZ]$|[+-]\d\d:\d\d$/.test(value), `${code}_timezone`);
  return parsed;
}

function verifyReceipt(payload, code) {
  requireValue(SHA256.test(payload?.receipt_sha256 || ''), code);
  const unsigned = { ...payload };
  delete unsigned.receipt_sha256;
  requireValue(receipt(unsigned) === payload.receipt_sha256, `${code}_mismatch`);
}

function normalizeMatrix(matrix) {
  requireValue(matrix && typeof matrix === 'object' && !Array.isArray(matrix), 'gap_matrix_object');
  requireValue(
    matrix.schema === LIVE_MATRIX_SCHEMA || matrix.schema === PUBLIC_MATRIX_SCHEMA,
    'gap_matrix_schema',
  );
  validateTimestamp(matrix.as_of, 'gap_matrix_as_of');
  requireValue(SHA256.test(matrix.freshness_receipt_sha256 || ''), 'gap_freshness_receipt');
  requireValue(matrix.verification_passes === 1, 'gap_matrix_verification_passes');
  verifyReceipt(matrix, 'gap_matrix_receipt');

  if (matrix.schema === LIVE_MATRIX_SCHEMA) {
    requireValue(matrix.roles && typeof matrix.roles === 'object' && !Array.isArray(matrix.roles), 'gap_matrix_roles');
    return {
      roles: Object.entries(matrix.roles),
      sourceSchema: matrix.schema,
    };
  }

  requireValue(Array.isArray(matrix.roles) && matrix.roles.length > 0, 'gap_matrix_roles');
  requireValue(matrix.rankings && typeof matrix.rankings === 'object' && !Array.isArray(matrix.rankings), 'gap_matrix_rankings');
  const rows = matrix.roles.map((role) => {
    requireValue(typeof role === 'string' && role.length > 0, 'gap_matrix_role');
    const ranking = matrix.rankings[role];
    requireValue(ranking && typeof ranking === 'object', `gap_matrix_ranking:${role}`);
    requireValue(Array.isArray(ranking.briefs) && ranking.briefs.length > 0, `gap_role_flows:${role}`);
    return [role, ranking.briefs];
  });
  return { roles: rows, sourceSchema: matrix.schema };
}

function pointOpportunity(role, flow, point) {
  requireValue(point && typeof point === 'object' && !Array.isArray(point), `gap_proof_point:${role}`);
  requireValue(typeof point.system_id === 'string' && point.system_id.length > 0, `gap_system_id:${role}`);
  requireValue(typeof point.repository === 'string' && point.repository.includes('GlacierEQ/'), `gap_repository:${role}:${point.system_id}`);

  const roleWeight = Number(point.role_weight || 0);
  const freshnessWeight = Number(point.freshness_weight || 0);
  requireValue(Number.isFinite(roleWeight) && roleWeight >= 0, `gap_role_weight:${role}:${point.system_id}`);
  requireValue(
    Number.isFinite(freshnessWeight) && freshnessWeight >= 0 && freshnessWeight <= 1,
    `gap_freshness_weight:${role}:${point.system_id}`,
  );

  const recoverableScore = round(roleWeight * (1 - freshnessWeight));
  if (recoverableScore <= 0) return null;

  const commitSha = point.commit_sha ?? null;
  if (commitSha !== null) requireValue(SHA40.test(commitSha), `gap_commit_sha:${role}:${point.system_id}`);
  const verifiedAt = point.verified_at ?? null;
  if (verifiedAt !== null) validateTimestamp(verifiedAt, `gap_verified_at:${role}:${point.system_id}`);

  return {
    role,
    flow_id: flow.flow_id,
    flow_name: flow.name,
    system_id: point.system_id,
    repository: point.repository,
    role_weight: roleWeight,
    freshness_weight: freshnessWeight,
    freshness_state: point.freshness_state || 'unverified',
    age_days: point.age_days ?? null,
    current_commit_sha: commitSha,
    verified_at: verifiedAt,
    verification_workflow: point.verification_workflow ?? null,
    verification_run_id: point.verification_run_id ?? null,
    recoverable_score: recoverableScore,
    action: freshnessWeight === 0
      ? 'establish exact successful verification identity'
      : 'refresh exact verification evidence on the owning repository',
  };
}

function analyzeRecruiterGaps(matrix) {
  const normalized = normalizeMatrix(matrix);
  const byRole = {};

  for (const [role, flows] of normalized.roles) {
    requireValue(Array.isArray(flows) && flows.length > 0, `gap_role_flows:${role}`);
    const seen = new Map();

    for (const flow of flows) {
      requireValue(typeof flow?.flow_id === 'string' && flow.flow_id, `gap_flow_id:${role}`);
      requireValue(Array.isArray(flow.proof_points), `gap_proof_points:${role}:${flow.flow_id}`);
      for (const point of flow.proof_points) {
        const candidate = pointOpportunity(role, flow, point);
        if (!candidate) continue;
        const previous = seen.get(candidate.system_id);
        if (
          !previous
          || candidate.recoverable_score > previous.recoverable_score
          || (
            candidate.recoverable_score === previous.recoverable_score
            && candidate.flow_id.localeCompare(previous.flow_id) < 0
          )
        ) {
          seen.set(candidate.system_id, candidate);
        }
      }
    }

    const opportunities = [...seen.values()].sort((left, right) =>
      right.recoverable_score - left.recoverable_score
      || right.role_weight - left.role_weight
      || left.system_id.localeCompare(right.system_id)
      || left.flow_id.localeCompare(right.flow_id));

    byRole[role] = {
      current_top_flow: flows[0].flow_id,
      current_top_score: flows[0].score,
      total_recoverable_score: round(
        opportunities.reduce((sum, entry) => sum + entry.recoverable_score, 0),
      ),
      opportunity_count: opportunities.length,
      top_opportunities: opportunities,
    };
  }

  const all = Object.values(byRole).flatMap((entry) => entry.top_opportunities);
  all.sort((left, right) =>
    right.recoverable_score - left.recoverable_score
    || right.role_weight - left.role_weight
    || left.role.localeCompare(right.role)
    || left.system_id.localeCompare(right.system_id));

  const core = {
    schema: SCHEMA,
    release: RELEASE,
    source_matrix_schema: normalized.sourceSchema,
    as_of: matrix.as_of,
    matrix_receipt_sha256: matrix.receipt_sha256,
    freshness_receipt_sha256: matrix.freshness_receipt_sha256,
    coverage: matrix.coverage,
    policy: 'rank only evidence gaps that can recover recruiter score; exact missing verification scores as zero freshness and stale proof exposes its recoverable role contribution',
    roles: byRole,
    global_top_opportunities: all,
  };
  return { ...core, receipt_sha256: receipt(core) };
}

function sendJson(res, status, payload, cacheControl) {
  const body = Buffer.from(`${JSON.stringify(payload, null, 2)}\n`);
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', cacheControl);
  res.setHeader('Content-Length', String(body.length));
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('X-PSYSOCX-Release', RELEASE);
  res.end(body);
}

async function buildPublicGapAnalysis() {
  const topology = await workflowTopologyProxy.loadTopology();
  const freshness = await recruiterProxy.loadLiveFreshness(topology);
  const matrix = roleMatrixRuntime.buildRoleMatrix(topology, freshness);
  return analyzeRecruiterGaps(matrix);
}

async function recruiterGapAnalysis(req, res) {
  try {
    return sendJson(
      res,
      200,
      await buildPublicGapAnalysis(),
      'public, max-age=0, s-maxage=300, must-revalidate',
    );
  } catch (error) {
    return sendJson(
      res,
      503,
      {
        schema: SCHEMA,
        release: RELEASE,
        status: 'FAIL_CLOSED',
        error: error instanceof Error ? error.message : String(error),
      },
      'no-store',
    );
  }
}

module.exports = recruiterGapAnalysis;
module.exports.RELEASE = RELEASE;
module.exports.SCHEMA = SCHEMA;
module.exports.RecruiterGapAnalysisError = RecruiterGapAnalysisError;
module.exports.analyzeRecruiterGaps = analyzeRecruiterGaps;
module.exports.buildPublicGapAnalysis = buildPublicGapAnalysis;
module.exports.stableStringify = stableStringify;

const crypto = require('node:crypto');
const workflowTopologyProxy = require('./workflow-topology-proxy.js');
const recruiterProxy = require('./workflow-recruiter-proxy.js');

const SCHEMA = 'glaciereq.public-recruiter-role-matrix.v1';
const ROLES = Object.freeze(Object.keys(recruiterProxy.constants.ROLE_WEIGHTS));

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

function requireValue(condition, message) {
  if (!condition) throw new Error(message);
}

function buildRoleMatrix(topology, freshness) {
  requireValue(topology?.schema === 'glaciereq.workflow-topology.v1', 'role_matrix_topology_schema');
  requireValue(freshness?.schema === 'glaciereq.public-evidence-freshness.v2', 'role_matrix_freshness_schema');
  requireValue(
    freshness.topology_receipt_sha256 === topology.receipt_sha256,
    'role_matrix_topology_receipt_mismatch',
  );
  requireValue(/^[a-f0-9]{64}$/.test(freshness.receipt_sha256 || ''), 'role_matrix_freshness_receipt');

  const rankings = {};
  for (const role of ROLES) {
    const briefs = recruiterProxy.rankFlows(topology, role, freshness);
    requireValue(briefs.length > 0, `role_matrix_empty_role:${role}`);
    rankings[role] = {
      top_flow: briefs[0].flow_id,
      top_score: briefs[0].score,
      briefs,
    };
  }

  const core = {
    schema: SCHEMA,
    release: recruiterProxy.constants.RELEASE,
    topology_receipt_sha256: topology.receipt_sha256,
    freshness_receipt_sha256: freshness.receipt_sha256,
    as_of: freshness.as_of,
    verification_passes: 1,
    roles: ROLES,
    coverage: {
      verified_systems: freshness.entries.length,
      unverified_systems: freshness.missing_systems.length,
    },
    missing_systems: freshness.missing_systems,
    rankings,
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
  res.setHeader('X-PSYSOCX-Release', recruiterProxy.constants.RELEASE);
  res.end(body);
}

module.exports = async function recruiterRoleMatrix(req, res) {
  try {
    const topology = await workflowTopologyProxy.loadTopology();
    // One live freshness read drives every role, preserving exact run identity across the matrix.
    const freshness = await recruiterProxy.loadLiveFreshness(topology);
    return sendJson(
      res,
      200,
      buildRoleMatrix(topology, freshness),
      'public, max-age=0, s-maxage=300, must-revalidate',
    );
  } catch (error) {
    return sendJson(
      res,
      503,
      {
        schema: SCHEMA,
        status: 'FAIL_CLOSED',
        error: error instanceof Error ? error.message : String(error),
      },
      'no-store',
    );
  }
};

module.exports.SCHEMA = SCHEMA;
module.exports.ROLES = ROLES;
module.exports.buildRoleMatrix = buildRoleMatrix;

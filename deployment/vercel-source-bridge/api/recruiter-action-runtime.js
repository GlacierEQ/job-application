const crypto = require('node:crypto');
const workflowTopologyProxy = require('./workflow-topology-proxy.js');
const recruiterProxy = require('./workflow-recruiter-proxy.js');
const roleMatrixRuntime = require('./recruiter-role-matrix.js');
const gapRuntime = require('./recruiter-gap-analysis.js');

const SCHEMA = 'glaciereq.recruiter-action-packet.v1';
const ACTION_MATRIX_SCHEMA = 'glaciereq.recruiter-action-matrix.v1';
const LIVE_MATRIX_SCHEMA = 'glaciereq.live-recruiter-role-matrix.v1';
const PUBLIC_MATRIX_SCHEMA = 'glaciereq.public-recruiter-role-matrix.v1';
const SUPPORTED_ROLES = Object.freeze(['recruiter', 'engineering-lead', 'systems-architect']);
const SHA256 = /^[a-f0-9]{64}$/;

class RecruiterActionPacketError extends Error {}

function requireValue(condition, message) {
  if (!condition) throw new RecruiterActionPacketError(message);
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

function roleFlows(matrix, role) {
  if (matrix.schema === LIVE_MATRIX_SCHEMA) {
    const flows = matrix.roles?.[role];
    requireValue(Array.isArray(flows) && flows.length > 0, `action_packet_role_missing:${role}`);
    return flows;
  }
  if (matrix.schema === PUBLIC_MATRIX_SCHEMA) {
    const flows = matrix.rankings?.[role]?.briefs;
    requireValue(Array.isArray(flows) && flows.length > 0, `action_packet_role_missing:${role}`);
    return flows;
  }
  throw new RecruiterActionPacketError('action_packet_matrix_schema');
}

function summarizeProof(flow) {
  const points = Array.isArray(flow.proof_points) ? flow.proof_points : [];
  return points.slice(0, 5).map((point) => ({
    system_id: point.system_id,
    repository: point.repository,
    contribution: point.contribution || '',
    freshness_state: point.freshness_state || 'unverified',
    freshness_weight: Number(point.freshness_weight || 0),
    age_days: point.age_days ?? null,
    commit_sha: point.commit_sha ?? null,
    verified_at: point.verified_at ?? null,
  }));
}

function buildRecruiterActionPacket(matrix, role, { maxActions = 3 } = {}) {
  requireValue(matrix && typeof matrix === 'object' && !Array.isArray(matrix), 'action_packet_matrix_object');
  requireValue(SUPPORTED_ROLES.includes(role), `action_packet_role:${role}`);
  requireValue(Number.isInteger(maxActions) && maxActions >= 1 && maxActions <= 10, 'action_packet_max_actions');
  requireValue(SHA256.test(matrix.receipt_sha256 || ''), 'action_packet_matrix_receipt');
  requireValue(SHA256.test(matrix.freshness_receipt_sha256 || ''), 'action_packet_freshness_receipt');

  const flows = roleFlows(matrix, role);
  const gap = gapRuntime.analyzeRecruiterGaps(matrix);
  const roleGap = gap.roles?.[role];
  requireValue(roleGap && typeof roleGap === 'object', `action_packet_gap_role_missing:${role}`);

  const leader = flows[0];
  requireValue(typeof leader?.flow_id === 'string' && leader.flow_id, `action_packet_top_flow:${role}`);
  requireValue(Number.isFinite(Number(leader.score)), `action_packet_top_score:${role}`);

  const actions = roleGap.top_opportunities.slice(0, maxActions).map((opportunity, index) => ({
    priority: index + 1,
    system_id: opportunity.system_id,
    flow_id: opportunity.flow_id,
    repository: opportunity.repository,
    recoverable_score: opportunity.recoverable_score,
    freshness_state: opportunity.freshness_state,
    freshness_weight: opportunity.freshness_weight,
    age_days: opportunity.age_days,
    current_commit_sha: opportunity.current_commit_sha,
    verified_at: opportunity.verified_at,
    action: opportunity.action,
  }));

  const core = {
    schema: SCHEMA,
    role,
    status: actions.length > 0 ? 'RECOVERY_ACTION_AVAILABLE' : 'PROOF_CURRENT',
    as_of: matrix.as_of,
    source_matrix_schema: matrix.schema,
    matrix_receipt_sha256: matrix.receipt_sha256,
    freshness_receipt_sha256: matrix.freshness_receipt_sha256,
    gap_analysis_receipt_sha256: gap.receipt_sha256,
    current_fit: {
      top_flow: leader.flow_id,
      top_flow_name: leader.name,
      top_score: Number(leader.score),
      proof_points: summarizeProof(leader),
    },
    recovery: {
      total_recoverable_score: roleGap.total_recoverable_score,
      opportunity_count: roleGap.opportunity_count,
      selected_action_count: actions.length,
      actions,
    },
    reviewer_routes: {
      role_matrix: '/recruiter-role-matrix/',
      full_proof: `/recruiter-proof/?role=${encodeURIComponent(role)}`,
      role_recovery: `/recruiter-gap-analysis/?role=${encodeURIComponent(role)}`,
      action_packet: `/recruiter-action/?role=${encodeURIComponent(role)}`,
      machine_action_packet: `/data/recruiter-action-packet.json?role=${encodeURIComponent(role)}`,
      machine_recovery: '/data/recruiter-gap-analysis.json',
      review_hub: '/recruiter-review/',
    },
    policy: 'bind current role fit and exact recoverable evidence work into one deterministic reviewer action packet without inventing applicant or proof state',
  };
  return { ...core, receipt_sha256: receipt(core) };
}

function buildRecruiterActionMatrix(matrix, { maxActions = 3 } = {}) {
  requireValue(matrix && typeof matrix === 'object' && !Array.isArray(matrix), 'action_matrix_matrix_object');
  requireValue(Number.isInteger(maxActions) && maxActions >= 1 && maxActions <= 10, 'action_matrix_max_actions');
  requireValue(SHA256.test(matrix.receipt_sha256 || ''), 'action_matrix_matrix_receipt');
  requireValue(SHA256.test(matrix.freshness_receipt_sha256 || ''), 'action_matrix_freshness_receipt');

  const packets = Object.fromEntries(
    SUPPORTED_ROLES.map((role) => [role, buildRecruiterActionPacket(matrix, role, { maxActions })]),
  );
  const core = {
    schema: ACTION_MATRIX_SCHEMA,
    as_of: matrix.as_of,
    source_matrix_schema: matrix.schema,
    matrix_receipt_sha256: matrix.receipt_sha256,
    freshness_receipt_sha256: matrix.freshness_receipt_sha256,
    roles: SUPPORTED_ROLES,
    verification_passes: 1,
    max_actions_per_role: maxActions,
    packets,
    policy: 'compare all supported hiring lenses from one exact role matrix and one freshness snapshot',
  };
  return { ...core, receipt_sha256: receipt(core) };
}

async function loadPublicRoleMatrix() {
  const topology = await workflowTopologyProxy.loadTopology();
  const freshness = await recruiterProxy.loadLiveFreshness(topology);
  return roleMatrixRuntime.buildRoleMatrix(topology, freshness);
}

async function buildPublicRecruiterActionPacket(role, options = {}) {
  requireValue(SUPPORTED_ROLES.includes(role), `action_packet_role:${role}`);
  return buildRecruiterActionPacket(await loadPublicRoleMatrix(), role, options);
}

async function buildPublicRecruiterActionMatrix(options = {}) {
  return buildRecruiterActionMatrix(await loadPublicRoleMatrix(), options);
}

module.exports = {
  SCHEMA,
  ACTION_MATRIX_SCHEMA,
  SUPPORTED_ROLES,
  RecruiterActionPacketError,
  buildRecruiterActionPacket,
  buildRecruiterActionMatrix,
  buildPublicRecruiterActionPacket,
  buildPublicRecruiterActionMatrix,
  stableStringify,
};

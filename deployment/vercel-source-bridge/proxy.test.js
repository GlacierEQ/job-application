const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const bridge = require('./api/proxy');
const proxySource = fs.readFileSync(path.join(__dirname, 'api', 'proxy.js'), 'utf8');

function baseIndex(ids) {
  return {
    schema: 'glaciereq.company-dossiers-index.v2',
    second_depth_registry: 'manifests/company_second_depth.json',
    repository_record_columns: [
      'repository',
      'skill_innovation_level',
      'promotion_state',
      'visibility',
      'inventory_scope',
      'provenance_state',
    ],
    repository_record_legacy_aliases: { promotion_state: {} },
    truth_boundary: {
      public_recruiter_admission_states: ['PROMOTED', 'REFERENCE_ONLY'],
    },
    required_company_tracks: ids,
  };
}

function depthRegistry(ids) {
  const stages = [
    ['MAPPED_ONLY', [], 'company_alignment_only'],
    ['ROLE_VERIFIED', ['role_evidence'], 'verified_role_alignment'],
    ['PROBLEM_BOUNDED', ['role_evidence', 'problem_evidence'], 'externally_bounded_problem_alignment'],
    ['CODE_INSPECTED', ['role_evidence', 'problem_evidence', 'inspected_repositories'], 'inspected_implementation_alignment'],
    ['REMEDY_BOUNDED', ['role_evidence', 'problem_evidence', 'inspected_repositories', 'gap_queue'], 'bounded_remedy_design'],
    ['IMPLEMENTED', ['role_evidence', 'problem_evidence', 'inspected_repositories', 'gap_queue', 'implementation_receipts'], 'implemented_candidate_capability'],
    ['PROOF_REPRODUCED', ['role_evidence', 'problem_evidence', 'inspected_repositories', 'gap_queue', 'implementation_receipts', 'proof_artifacts'], 'reproducible_company_specific_proof'],
    ['CLAIM_PROMOTED', ['role_evidence', 'problem_evidence', 'inspected_repositories', 'gap_queue', 'implementation_receipts', 'proof_artifacts', 'claim_receipts'], 'proof_bound_company_specific'],
  ];
  const fieldKinds = {
    role_evidence: 'role',
    problem_evidence: 'problem',
    inspected_repositories: 'repository_inspection',
    gap_queue: 'bounded_gap',
    implementation_receipts: 'implementation_receipt',
    proof_artifacts: 'proof_artifact',
    claim_receipts: 'claim_receipt',
  };
  return {
    schema: 'glaciereq.company-second-depth.v1',
    authority: 'GlacierEQ/job-app-helix',
    company_index: 'manifests/company_dossiers.json',
    evidence_reference_contract: {
      required_fields: ['id', 'kind', 'source_identity', 'source_ref', 'visibility', 'verification_state'],
      visibility: 'public',
      field_kinds: fieldKinds,
    },
    stage_order: stages.map(([id, minimum_evidence, public_claim_ceiling], ordinal) => ({
      id,
      ordinal,
      minimum_evidence,
      public_claim_ceiling,
    })),
    default_company_state: {
      stage: 'MAPPED_ONLY',
      role_evidence: [],
      problem_evidence: [],
      inspected_repositories: [],
      gap_queue: [],
      implementation_receipts: [],
      proof_artifacts: [],
      claim_receipts: [],
      claim_ceiling: 'company_alignment_only',
      blockers: ['current_role_not_verified'],
      next_gate: 'Verify a current public role.',
    },
    company_overrides: Object.fromEntries(ids.map((id) => [id, {}])),
    priority_wave: [],
  };
}

function company(id, displayName, repositories = []) {
  return {
    company_id: id,
    display_name: displayName,
    track_state: 'MAPPED',
    target_roles: ['Systems Engineer'],
    recruiter_thesis: 'Truth-bounded alignment.',
    gap_or_next_gate: 'Verify public role and exact code paths.',
    non_affiliation: `Independent work; no ${displayName} affiliation is claimed.`,
    repositories,
  };
}

function build49() {
  const ids = Array.from({ length: 47 }, (_, index) => `company_${index}`);
  ids.push('anthropic', 'lockheed_martin');
  const companies = ids.map((id) => {
    if (id === 'anthropic') {
      return company(id, 'Anthropic', [
        ['GlacierEQ/anthropic-agent-coordinator', 'L4', 'PROMOTED', 'public', 'HELIX_ADMITTED', 'ORIGINAL_CANDIDATE'],
        ['GlacierEQ/private-candidate', 'L4', 'PROMOTED', 'private', 'ESTATE_DISCOVERED_NOT_HELIX_ADMITTED', 'ORIGINAL_CANDIDATE'],
        ['GlacierEQ/quarantined', 'L0', 'PROMOTED', 'public', 'HELIX_ADMITTED', 'ORIGINAL_CANDIDATE'],
      ]);
    }
    if (id === 'lockheed_martin') return company(id, 'Lockheed Martin', []);
    return company(id, `Company ${id}`, []);
  });
  return { ids, companies };
}

function publicEvidence(id, kind, sourceIdentity, sourceRef) {
  return {
    id,
    kind,
    source_identity: sourceIdentity,
    source_ref: sourceRef,
    visibility: 'public',
    verification_state: 'VERIFIED',
  };
}

function advanceLockheed(depth) {
  const implementationCommit = '4328fa7078e6e4125f895768142c6af0c5ec1234';
  const implementationBase = `https://github.com/GlacierEQ/job-application/blob/${implementationCommit}/projects/mission-agentic-ai-assurance`;
  depth.company_overrides.lockheed_martin = {
    stage: 'CLAIM_PROMOTED',
    role_evidence: [publicEvidence('lockheed_role_734997br', 'role', 'https://www.lockheedmartinjobs.com/job/sunnyvale/architecture-and-algorithms-agentic-ai-ml-engineer-level-2-3/694/97838518096', `sha256:${'a'.repeat(64)}`)],
    problem_evidence: [publicEvidence('lockheed_problem_trusted_agentic_ai_integration', 'problem', 'https://www.lockheedmartin.com/en-us/capabilities/artificial-intelligence-machine-learning.html', `sha256:${'b'.repeat(64)}`)],
    inspected_repositories: [
      publicEvidence('lockheed_inspection_akos_runtime', 'repository_inspection', 'https://github.com/GlacierEQ/AKOS/blob/89403272a76dda8e1f9f317e16bfce5b60c1a3f5/runtime/src/index.ts', 'commit:89403272a76dda8e1f9f317e16bfce5b60c1a3f5'),
      publicEvidence('lockheed_inspection_apex_control_plane', 'repository_inspection', 'https://github.com/GlacierEQ/apex-control-plane/blob/340834cf8d6c65832196b6cc0b6df281574842f8/src/control_plane_runtime.py', 'commit:340834cf8d6c65832196b6cc0b6df281574842f8'),
      publicEvidence('lockheed_inspection_tower_integrity', 'repository_inspection', 'https://github.com/GlacierEQ/the-tower-of-babel/blob/e3778353e92b404de43f41963a0c7bffb84897ac/src/tower/integrity.py', 'commit:e3778353e92b404de43f41963a0c7bffb84897ac'),
      publicEvidence('lockheed_inspection_tower_receipt', 'repository_inspection', 'https://github.com/GlacierEQ/the-tower-of-babel/blob/e3778353e92b404de43f41963a0c7bffb84897ac/src/tower/receipt.py', 'commit:e3778353e92b404de43f41963a0c7bffb84897ac'),
    ],
    gap_queue: [publicEvidence('lockheed_remedy_mission_agentic_ai_assurance', 'bounded_gap', `${implementationBase}/machine/remedy.json`, `commit:${implementationCommit}`)],
    implementation_receipts: [publicEvidence('lockheed_implementation_mission_agentic_ai_assurance', 'implementation_receipt', `${implementationBase}/proof/implementation_receipt.json`, `commit:${implementationCommit}`)],
    proof_artifacts: [{...publicEvidence('lockheed_proof_mission_agentic_ai_assurance', 'proof_artifact', `${implementationBase}/proof/reproduced_receipt.json`, `commit:${implementationCommit}`), verification_state: 'REPRODUCED'}],
    claim_receipts: [publicEvidence('lockheed_claim_mission_agentic_ai_assurance', 'claim_receipt', `${implementationBase}/proof/claim_receipt.json`, `commit:${implementationCommit}`)],
    claim_ceiling: 'proof_bound_company_specific',
    blockers: ['distributed_state_not_implemented', 'production_scale_not_demonstrated'],
    next_gate: 'Preserve the proof-bound claim while evolving Mesh aspiration gaps.',
  };
  return depth;
}

test('request path is parsed with WHATWG URL semantics', () => {
  assert.equal(
    bridge.requestPath({ url: '/api/proxy?path=resume%2Fats.txt' }),
    'resume/ats.txt',
  );
});

test('repeated path parameters preserve the array-join contract', () => {
  assert.equal(
    bridge.requestPath({ url: '/api/proxy?path=resume&path=index.html' }),
    'resume/index.html',
  );
});

test('missing path remains the root-route contract', () => {
  assert.equal(bridge.requestPath({ url: '/api/proxy' }), '');
  assert.equal(bridge.normalize(''), 'index.html');
});

test('percent-encoded traversal is decoded then rejected', () => {
  const raw = bridge.requestPath({ url: '/api/proxy?path=..%2Fsecret' });
  assert.equal(raw, '../secret');
  assert.equal(bridge.normalize(raw), null);
});

test('bridge uses exact V21 first-star pins and no legacy URL parser', () => {
  assert.equal(
    bridge.constants.SOURCE_COMMIT,
    '261a3fb38d1236f15a50ce0a95d565cc9940bda9',
  );
  assert.equal(
    bridge.constants.HELIX_COMMIT,
    '8345955b67f163c3215b23195a267b6021a5be5e',
  );
  assert.match(proxySource, /new URL\(/);
  assert.doesNotMatch(proxySource, /\burl\.parse\s*\(/);
  assert.doesNotMatch(proxySource, /req\.query/);
});

test('V21 projection filters recruiter evidence and preserves Lockheed inspected boundary', () => {
  const { ids, companies } = build49();
  const projection = bridge.compileProjection(
    baseIndex(ids),
    [{ companies }],
    advanceLockheed(depthRegistry(ids)),
  );
  assert.ok(projection.company_count >= 49);
  const anthropic = projection.companies.find((row) => row.company_id === 'anthropic');
  assert.equal(anthropic.repositories.length, 1);
  assert.equal(
    anthropic.repositories[0].repository,
    'GlacierEQ/anthropic-agent-coordinator',
  );
  const lockheed = projection.companies.find(
    (row) => row.company_id === 'lockheed_martin',
  );
  assert.equal(lockheed.repositories.length, 0);
  assert.equal(lockheed.second_depth.stage, 'CLAIM_PROMOTED');
  assert.equal(lockheed.second_depth.ordinal, 7);
  assert.equal(lockheed.second_depth.claim_ceiling, 'proof_bound_company_specific');
  assert.equal(lockheed.second_depth.evidence.role_evidence.length, 1);
  assert.equal(lockheed.second_depth.evidence.problem_evidence.length, 1);
  assert.equal(lockheed.second_depth.evidence.inspected_repositories.length, 4);
  assert.equal(lockheed.second_depth.evidence.gap_queue.length, 1);
  assert.equal(lockheed.second_depth.evidence.implementation_receipts.length, 1);
  assert.equal(lockheed.second_depth.evidence.proof_artifacts.length, 1);
  assert.equal(lockheed.second_depth.evidence.proof_artifacts[0].verification_state, 'REPRODUCED');
  assert.equal(lockheed.second_depth.evidence.claim_receipts.length, 1);
});

test('malformed evidence cannot satisfy a second-depth stage', () => {
  const { ids, companies } = build49();
  const depth = depthRegistry(ids);
  depth.company_overrides.anthropic = {
    stage: 'ROLE_VERIFIED',
    claim_ceiling: 'verified_role_alignment',
    role_evidence: [{ id: 'fabricated' }],
  };
  assert.throws(
    () => bridge.compileProjection(baseIndex(ids), [{ companies }], depth),
    /evidence fields drift/,
  );
});

test('private evidence cannot satisfy a public second-depth stage', () => {
  const { ids, companies } = build49();
  const depth = depthRegistry(ids);
  depth.company_overrides.anthropic = {
    stage: 'ROLE_VERIFIED',
    claim_ceiling: 'verified_role_alignment',
    role_evidence: [{
      id: 'role:1',
      kind: 'role',
      source_identity: 'https://example.com/role',
      source_ref: `sha256:${'a'.repeat(64)}`,
      visibility: 'private',
      verification_state: 'VERIFIED',
    }],
  };
  assert.throws(
    () => bridge.compileProjection(baseIndex(ids), [{ companies }], depth),
    /private evidence leaked/,
  );
});

test('V21 Atlas and Lockheed page preserve four-depth no-script contract', () => {
  const { ids, companies } = build49();
  const projection = bridge.compileProjection(
    baseIndex(ids),
    [{ companies }],
    advanceLockheed(depthRegistry(ids)),
  );
  const lockheed = projection.companies.find(
    (row) => row.company_id === 'lockheed_martin',
  );
  const atlas = bridge.renderAtlas(projection);
  const page = bridge.renderCompany(lockheed);
  const record = bridge.compactMachineRecord(lockheed);

  assert.match(atlas, /SECOND-DEPTH CONTRACT/);
  assert.match(atlas, /Lockheed Martin/);
  assert.match(page, /01 · RECRUITER/);
  assert.match(page, /02 · MASTER/);
  assert.match(page, /03 · MACHINE/);
  assert.match(page, /04 · MESH/);
  assert.match(page, /ASPIRATION &amp; EVOLUTION/);
  assert.match(page, /CLAIM_PROMOTED/);
  assert.match(page, /proof_bound_company_specific/);
  assert.match(page, /No direct repository is recruiter-admitted yet/);
  assert.equal(record.second_depth.stage, 'CLAIM_PROMOTED');
  assert.equal(record.second_depth.ordinal, 7);
  assert.equal(record.second_depth.evidence.inspected_repositories.length, 4);
  assert.doesNotMatch(atlas, /<script(?:\s|>)/i);
  assert.doesNotMatch(page, /<script(?:\s|>)/i);
  assert.doesNotMatch(atlas, /\sstyle\s*=/i);
  assert.doesNotMatch(page, /\sstyle\s*=/i);
});


test('V21 source resolution cannot escape the pinned site root', () => {
  assert.match(bridge.resolveSourceUrl('assets/site.css'), /\/site-v15\/assets\/site\.css$/);
  assert.throws(
    () => bridge.resolveSourceUrl('%2e%2e/other/file.txt'),
    /source path escapes pinned root/,
  );
});

test('GEQ.CI wire fields escape line and delimiter injection', () => {
  assert.equal(
    bridge.wireField('role\nDEPTH[FORGED]|x];y'),
    'role\\nDEPTH[FORGED\\u005d\\u007cx\\u005d\\u003by',
  );
});

test('V21 verifier includes every rendered constellation stylesheet', () => {
  assert.match(proxySource, /fetchSource\('assets\/company-constellation\.css'\)/);
  assert.match(proxySource, /__v21_verify/);
});


test('V21 release topology is verifier-specific, not a generic compiler invariant', () => {
  const { ids, companies } = build49();
  const projection = bridge.compileProjection(baseIndex(ids), [{ companies }], depthRegistry(ids));
  const lockheed = projection.companies.find((company) => company.company_id === 'lockheed_martin');
  assert.equal(lockheed.second_depth.stage, 'MAPPED_ONLY');
  assert.equal(lockheed.second_depth.claim_ceiling, 'company_alignment_only');
});

test('only __v21_verify advertises the V21 verification schema', () => {
  assert.match(proxySource, /raw === '__v21_verify'/);
  assert.doesNotMatch(proxySource, /raw === '__v20_verify'/);
  assert.doesNotMatch(proxySource, /raw === '__v19_verify'/);
  assert.doesNotMatch(proxySource, /raw === '__v18_verify'/);
  assert.doesNotMatch(proxySource, /raw === '__v15_verify'/);
});

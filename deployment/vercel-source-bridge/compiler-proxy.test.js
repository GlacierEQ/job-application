const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const compiler = require('./api/compiler-proxy.js');

function fixture() {
  const company = {
    company_id: 'openai',
    display_name: 'OpenAI',
    track_state: 'MAPPED',
    target_roles: ['Agent Infrastructure Engineer', 'Applied AI Systems Engineer'],
    recruiter_thesis: 'Evidence-bound agent infrastructure and governed orchestration.',
    gap_or_next_gate: 'Refresh current role evidence.',
    non_affiliation: 'Independent GlacierEQ work; no OpenAI affiliation is claimed.',
    repositories: [
      {
        repository: 'GlacierEQ/job-app-helix',
        level: 'L5',
        promotion_state: 'PROMOTED',
        provenance_state: 'ORIGINAL',
      },
      {
        repository: 'GlacierEQ/AKOS',
        level: 'L5',
        promotion_state: 'PROMOTED',
        provenance_state: 'ORIGINAL',
      },
      {
        repository: 'GlacierEQ/job-application',
        level: 'L4',
        promotion_state: 'PROMOTED',
        provenance_state: 'ORIGINAL',
      },
      {
        repository: 'GlacierEQ/extra-proof',
        level: 'L4',
        promotion_state: 'PROMOTED',
        provenance_state: 'ORIGINAL',
      },
    ],
    applicable_flagships: ['job_app_helix', 'akos', 'blocked'],
    second_depth: {
      stage: 'ROLE_VERIFIED',
      ordinal: 1,
      claim_ceiling: 'verified_role_alignment',
      blockers: ['Problem evidence not yet promoted.'],
      next_gate: 'Promote source-bound problem evidence.',
      evidence: {
        role_evidence: [{ id: 'role-1' }],
        problem_evidence: [],
        inspected_repositories: [],
        gap_queue: [],
        implementation_receipts: [],
        proof_artifacts: [],
        claim_receipts: [],
      },
    },
  };
  const projection = { company_count: 1, companies: [company] };
  const flagships = new Map([
    ['job_app_helix', {
      system_id: 'job_app_helix',
      repository: 'GlacierEQ/job-app-helix',
      level: 'L5',
      state: 'PROMOTED',
      role: 'Canonical release control plane',
      evidence: 'Verified public evidence.',
      next_gate: 'Refresh exact current receipt.',
    }],
    ['akos', {
      system_id: 'akos',
      repository: 'GlacierEQ/AKOS',
      level: 'L5',
      state: 'PROMOTED',
      role: 'Authority and evidence runtime',
      evidence: 'Verified public evidence.',
      next_gate: 'Refresh connector receipts.',
    }],
  ]);
  const pressureRecords = new Map([
    ['openai', {
      company_id: 'openai',
      observed_current_pressure: 'Source-backed operating pressure.',
      inferred_bottleneck: 'GlacierEQ bottleneck inference.',
      inferred_brick_wall: 'GlacierEQ brick-wall inference.',
      leverage_mechanism: 'Governed orchestration.',
      expected_impact: 'Reduce integration ambiguity.',
      application_move: 'Lead with evidence-bound orchestration.',
      next_deep_dive: 'Refresh official role evidence.',
      research_as_of: '2026-08-05',
      freshness_state: 'HISTORICAL_SOURCE_SNAPSHOT_REQUIRES_REFRESH_BEFORE_LIVE_APPLICATION',
      inference_boundary: 'Observed and inferred remain distinct.',
      official_sources: [{
        title: 'Official source',
        publisher: 'OpenAI',
        url: 'https://example.test/source',
        source_sha256: 'f'.repeat(64),
        observed_signal: 'Observed signal.',
      }],
    }],
  ]);
  return { company, projection, flagships, pressureRecords };
}

test('pins V25 to the verified current Helix compiler authority', () => {
  assert.equal(
    compiler.constants.COMPILER_HELIX_COMMIT,
    '435c1e9d5dd4bf7466d869aa7c6918b56225b788',
  );
  assert.equal(compiler.constants.RELEASE, 'V25-APPLICATION-COMPILER');
  assert.equal(
    compiler.constants.OUTPUT_SCHEMA,
    'glaciereq.public-application-compiler.v1',
  );
});

test('compiles recruiter depth to a bounded public proof surface', () => {
  const data = fixture();
  const route = compiler.compileRoute(data, {
    company: data.company,
    role: 'Agent Infrastructure Engineer',
    depth: 'recruiter',
  });

  assert.equal(route.route.company_id, 'openai');
  assert.equal(route.route.role, 'Agent Infrastructure Engineer');
  assert.equal(route.direct_public_proof_donors.length, 3);
  assert.equal(route.capability_donors.length, 2);
  assert.equal(route.observed_pressure.statement, 'Source-backed operating pressure.');
  assert.equal(route.inference.bottleneck, 'GlacierEQ bottleneck inference.');
  assert.equal(route.company_projection.second_depth.evidence_counts.role_evidence, 1);
  assert.equal(route.truth_boundary.raw_estate_cardinality_not_published, true);
  assert.equal(route.truth_boundary.private_repository_identities_not_published, true);
  const serialized = JSON.stringify(route);
  assert.equal(serialized.includes('native_repository_count'), false);
  assert.equal(serialized.includes('private_repository_count'), false);
});

test('senior engineer depth preserves every admitted public proof donor', () => {
  const data = fixture();
  const route = compiler.compileRoute(data, {
    company: data.company,
    role: 'Agent Infrastructure Engineer',
    depth: 'senior_engineer',
  });
  assert.equal(route.direct_public_proof_donors.length, 4);
});

test('missing pressure fails closed without inventing an employer condition', () => {
  const data = fixture();
  data.pressureRecords = new Map();
  const route = compiler.compileRoute(data, {
    company: data.company,
    role: 'Agent Infrastructure Engineer',
    depth: 'company_reviewer',
  });
  assert.equal(route.observed_pressure, null);
  assert.equal(route.inference, null);
  assert.equal(route.truth_boundary.observed_pressure_is_source_backed_snapshot, false);
});

test('compiler presentation remains script free and exposes machine projection', () => {
  const data = fixture();
  const route = compiler.compileRoute(data, {
    company: data.company,
    role: 'Agent Infrastructure Engineer',
    depth: 'recruiter',
  });
  const html = compiler.compilerHtml(data, route);
  assert.equal(/<script\b/i.test(html), false);
  assert.equal(/\sstyle\s*=\s*/i.test(html), false);
  assert.ok(html.includes('Start with the operating problem.'));
  assert.ok(html.includes('FACT / INFERENCE SEPARATION'));
  assert.ok(html.includes('/data/application-compiler.json'));
  assert.ok(html.includes('authenticated full-estate graph remains private'));
  assert.equal(html.includes('598'), false);
});

test('compiler navigation injection is idempotent', () => {
  const source = Buffer.from(
    '<!doctype html><html><body><nav class="links"><a href="/">Recruiter</a></nav></body></html>',
  );
  const once = compiler.injectCompilerNavigation(source).toString('utf8');
  const twice = compiler.injectCompilerNavigation(Buffer.from(once)).toString('utf8');
  assert.equal((once.match(/href="\/compiler\/"/g) || []).length, 1);
  assert.equal(twice, once);
});

test('release router preserves V21-V24 verifiers and defaults to V25', () => {
  const source = fs.readFileSync(
    path.join(__dirname, 'api', 'release-router.js'),
    'utf8',
  );
  for (const verifier of ['__v21_verify', '__design_verify', '__v22_verify', '__v23_verify', '__v24_verify']) {
    assert.ok(source.includes(verifier), `${verifier} must remain routed`);
  }
  assert.ok(source.includes("require('./compiler-proxy.js')"));
  assert.ok(source.includes('return compilerProxy(req, res);'));
});


test('emerald motion restores technical energy without client script', () => {
  const css = compiler.EMERALD_MOTION_CSS;
  assert.ok(css.includes('.master-card::before'));
  assert.ok(css.includes('@keyframes emerald-master-sheen'));
  assert.ok(css.includes('@keyframes emerald-terminal-breathe'));
  assert.ok(css.includes('@media(prefers-reduced-motion:reduce)'));
  assert.ok(css.includes('rgba(73,255,177'));
  assert.equal(/<script\\b/i.test(css), false);
});

test('emerald motion injection is idempotent', () => {
  const source = Buffer.from('<!doctype html><html><head><link rel="stylesheet" href="/assets/site.algerian.css"></head><body><main></main></body></html>');
  const once = compiler.injectEmeraldMotion(source).toString('utf8');
  const twice = compiler.injectEmeraldMotion(Buffer.from(once)).toString('utf8');
  assert.equal(once.split('site.emerald-motion.css').length - 1, 1);
  assert.equal(twice, once);
});

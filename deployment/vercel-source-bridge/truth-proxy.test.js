const assert = require('node:assert/strict');
const test = require('node:test');

const truth = require('./api/truth-proxy.js');
const runtime = require('./api/truth-runtime.js');

const staleHome = [
  '<p>V21 FIRST STAR COMPLETION · VERIFIED PRODUCTION</p>',
  '<div><b>148/148</b><span>Job Application Helix recorded tests</span></div>',
].join('');

const staleResume = [
  '<div data-claim-id="helix-tests" data-evidence-state="RECORDED">',
  '<b>148/148</b><span>Helix tests</span></div>',
  '<div data-claim-id="helix" data-evidence-state="RECORDED_TESTS">',
  '<span>148/148 RECORDED</span></div>',
].join('');

const staleAts = [
  '- Job Application Helix: 148 of 148 recorded repository tests for evidence-governed hiring and portfolio orchestration.',
  'Job Application Helix - RECORDED 148/148',
].join('\n');

test('V23 HTML projection replaces stale Helix aggregate claims', () => {
  const home = truth.transformHtml(staleHome);
  const resume = truth.transformHtml(staleResume);
  assert.match(home, /V23 TRUTH SYNC/);
  assert.match(home, /67/);
  assert.match(home, /PARTIALLY_VERIFIED/);
  assert.equal(truth.staleHelixClaim(home), false);
  assert.match(resume, /67/);
  assert.match(resume, /PARTIALLY_VERIFIED/);
  assert.equal(truth.staleHelixClaim(resume), false);
});

test('V23 ATS projection replaces stale Helix aggregate claims', () => {
  const output = truth.transformAts(staleAts);
  assert.match(output, /67 REPOSITORIES ADMITTED/);
  assert.match(output, /PARTIALLY_VERIFIED/);
  assert.equal(truth.staleHelixClaim(output), false);
});

test('machine projection removes both literal and HTML-escaped stale claims', () => {
  const literal = '<pre>{"helix": "148/148"}</pre>';
  const escaped = '<pre>{&quot;helix&quot;: &quot;148/148&quot;}</pre>';
  for (const input of [literal, escaped]) {
    const output = runtime.transformMachineHtml(input);
    assert.match(output, /helix_admitted_repositories/);
    assert.match(output, /67/);
    assert.match(output, /PARTIALLY_VERIFIED/);
    assert.equal(truth.staleHelixClaim(output), false);
  }
});

test('truth transforms do not rewrite an unrelated perfect score', () => {
  const input = '<p>Benchmark score 148/148.</p>';
  assert.equal(truth.transformHtml(input), input);
});

test('structured resume replaces aggregate test count with admitted boundary', () => {
  const input = {
    meta: { version: 'old' },
    projects: [
      {
        name: 'Job Application Helix',
        description: 'old',
        keywords: ['RECORDED_TESTS', '148/148'],
      },
      { name: 'Other Project', description: 'unchanged' },
    ],
    x_evidence: { proof: { helix_tests: 148, other: 9 } },
  };
  const output = truth.transformResumeJson(input);
  const helix = output.projects.find((project) => project.name === 'Job Application Helix');
  assert.deepEqual(helix.keywords, ['PARTIALLY_VERIFIED', 'admitted_repositories:67']);
  assert.equal(output.x_evidence.proof.helix_tests, undefined);
  assert.equal(output.x_evidence.proof.helix_admitted_repositories, 67);
  assert.equal(output.x_evidence.proof.helix_package_state, 'PARTIALLY_VERIFIED');
  assert.equal(output.x_evidence.proof.helix_child_repository_states_independent, true);
  assert.equal(output.x_evidence.proof.other, 9);
});

test('portfolio projection corrects Helix truth without deleting source capability', () => {
  const input = {
    release: { name: 'V15 Final Hiring Release', source: 'old' },
    flagships: [
      { id: 'helix', name: 'Job Application Helix', state: 'RECORDED_TESTS', evidence: '148/148 recorded tests' },
      { id: 'other', name: 'Other System', state: 'VERIFIED', evidence: 'unchanged' },
      { id: 'microcode', name: 'Microcode', state: 'REVIEWED_EXECUTION_BLOCKED', evidence: 'preserve me' },
    ],
  };
  const output = truth.transformPortfolioJson(input);
  const helix = output.flagships.find((flagship) => flagship.id === 'helix');
  const other = output.flagships.find((flagship) => flagship.id === 'other');
  const microcode = output.flagships.find((flagship) => flagship.id === 'microcode');
  assert.equal(output.release.name, 'Unified Helix-Bound Hire Surface');
  assert.ok(output.release.supersedes.includes('V15 Final Hiring Release'));
  assert.equal(helix.state, 'PARTIALLY_VERIFIED');
  assert.match(helix.evidence, /67-repository admitted boundary/);
  assert.match(helix.limit, /No aggregate Helix test-count claim is promoted/);
  assert.deepEqual(other, input.flagships[1]);
  assert.deepEqual(microcode, input.flagships[2]);
  assert.equal(output.flagships.length, input.flagships.length);
});

test('stale detector is scoped to Helix rather than arbitrary 148 values', () => {
  assert.equal(truth.staleHelixClaim('Job Application Helix has 148/148 recorded tests'), true);
  assert.equal(truth.staleHelixClaim('Benchmark score 148/148'), false);
  assert.equal(
    truth.staleHelixClaim('Job Application Helix · 67 repositories · PARTIALLY_VERIFIED'),
    false,
  );
});

test('truth authority fails closed on Git blob mismatch', async () => {
  const originalFetch = global.fetch;
  truth._resetTruthCache();
  global.fetch = async () => new Response('wrong authority', { status: 200 });
  try {
    await assert.rejects(truth.loadTruthAuthority(), /truth_resume_blob_mismatch/);
  } finally {
    global.fetch = originalFetch;
    truth._resetTruthCache();
  }
});

test('V23 runtime constants preserve exact corrected authority', () => {
  assert.equal(runtime.constants.ADMITTED_REPOSITORIES, 67);
  assert.equal(runtime.constants.PACKAGE_STATE, 'PARTIALLY_VERIFIED');
  assert.equal(
    runtime.constants.TRUTH_COMMIT,
    '77358d5a53c137333d28421f64315b27e17a459d',
  );
  assert.equal(runtime.isMachinePath('machine/index.html'), true);
  assert.equal(runtime.isMachinePath('master/index.html'), false);
});

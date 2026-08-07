from pathlib import Path
import re

proxy_path = Path('deployment/vercel-source-bridge/api/proxy.js')
test_path = Path('deployment/vercel-source-bridge/proxy.test.js')
proxy = proxy_path.read_text()
tests = test_path.read_text()


def replace_once(text, old, new, label):
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{label}: expected exactly one match, found {count}')
    return text.replace(old, new, 1)


proxy = replace_once(
    proxy,
    "const SOURCE_COMMIT = '150487be1d3cf88dd5886117e88125a4739faef3';",
    "const SOURCE_COMMIT = 'be5ddaa49d60ee551177376a67b92d681768e088';",
    'website source pin',
)
proxy = replace_once(
    proxy,
    "const HELIX_COMMIT = '556786e96ca49507125c77a62cb17904d645e134';",
    "const HELIX_COMMIT = '87dd202abbff08ad2e7f6cf57739a8bdd661bd46';",
    'Helix source pin',
)
proxy = proxy.replace('V19-COMPANY-SECOND-DEPTH', 'V20-FIRST-STAR-MOTION')
proxy = proxy.replace('GlacierEQ-V19-Source-Bridge/1.0', 'GlacierEQ-V20-Source-Bridge/1.0')
proxy = proxy.replace('GlacierEQ-V19-Company-Second-Depth/1.0', 'GlacierEQ-V20-Company-Second-Depth/1.0')
proxy = proxy.replace('glaciereq.v19-production-verification.v1', 'glaciereq.v20-production-verification.v1')
proxy = proxy.replace('V19 Company Second Depth', 'V20 First Star Motion')
proxy = replace_once(
    proxy,
    "if (raw === '__v19_verify' || raw === '__v18_verify' || raw === '__v15_verify') {",
    "if (raw === '__v20_verify' || raw === '__v19_verify' || raw === '__v18_verify' || raw === '__v15_verify') {",
    'verifier route aliases',
)

old_fetch = """const fetchSource = (filePath) => fetchBuffer(
  RAW_ROOT + filePath,
  'GlacierEQ-V20-Source-Bridge/1.0',
);"""
new_fetch = """function resolveSourceUrl(filePath) {
  const resolved = new URL(filePath, RAW_ROOT);
  if (!resolved.href.startsWith(RAW_ROOT)) {
    throw new Error('source path escapes pinned root');
  }
  return resolved.href;
}

const fetchSource = (filePath) => fetchBuffer(
  resolveSourceUrl(filePath),
  'GlacierEQ-V20-Source-Bridge/1.0',
);"""
proxy = replace_once(proxy, old_fetch, new_fetch, 'source-root containment')

old_wire_pattern = re.compile(
    r"function machineWire\(company\) \{.*?\n\}\n\nfunction renderCompany",
    re.S,
)
wire_matches = list(old_wire_pattern.finditer(proxy))
if len(wire_matches) != 1:
    raise SystemExit(f'machineWire block: expected one match, found {len(wire_matches)}')
new_wire = r"""function wireField(value) {
  return String(value ?? '')
    .replaceAll('\\', '\\\\')
    .replaceAll('\n', '\\n')
    .replaceAll('\r', '\\r')
    .replaceAll('|', '\\u007c')
    .replaceAll(';', '\\u003b')
    .replaceAll(']', '\\u005d');
}

function machineWire(company) {
  const record = compactMachineRecord(company);
  const repos = record.repos
    .map((repo) => [repo.id, repo.lvl, repo.state, repo.provenance].map(wireField).join('|'))
    .join(';') || '∅';
  const roles = record.roles.map(wireField).join('|') || '∅';
  const blockers = record.second_depth.blockers.map(wireField).join('|') || '∅';
  return `GEQ.CI/1 id=${wireField(record.id)} state=${wireField(record.state)} track=${wireField(record.track)}\nROLE[${roles}]\nREPO[${repos}]\nDEPTH[${wireField(record.second_depth.stage)}|${wireField(record.second_depth.claim_ceiling)}]\nBLOCKER[${blockers}]\nHOOK route=${record.route} json=${record.route}record.json\nNEXT ${wireField(record.second_depth.next_gate)}`;
}

function renderCompany"""
proxy = old_wire_pattern.sub(lambda _: new_wire, proxy, count=1)

old_asset = """  try {
    const { response, body, sha256: actual } = await fetchSource('assets/helix-atlas.css');
    const text = body.toString('utf8');
    const ok = response.ok && text.includes('.constellation-stage') && text.includes('.atlas-star.star-p48{');
    pass = pass && ok;
    files.push({ path: 'assets/helix-atlas.css', status: response.status, bytes: body.length, sha256: actual, expected: 'contains .constellation-stage and .atlas-star.star-p48', ok });
  } catch (error) {
    pass = false;
    files.push({ path: 'assets/helix-atlas.css', ok: false, error: error.message });
  }"""
new_asset = """  try {
    const atlas = await fetchSource('assets/helix-atlas.css');
    const atlasText = atlas.body.toString('utf8');
    const atlasOk = atlas.response.ok && atlasText.includes('.constellation-stage') && atlasText.includes('.atlas-star.star-p48{');
    pass = pass && atlasOk;
    files.push({ path: 'assets/helix-atlas.css', status: atlas.response.status, bytes: atlas.body.length, sha256: atlas.sha256, expected: 'contains .constellation-stage and .atlas-star.star-p48', ok: atlasOk });

    const constellation = await fetchSource('assets/company-constellation.css');
    const constellationText = constellation.body.toString('utf8');
    const constellationOk = constellation.response.ok && constellationText.includes('.company-constellation');
    pass = pass && constellationOk;
    files.push({ path: 'assets/company-constellation.css', status: constellation.response.status, bytes: constellation.body.length, sha256: constellation.sha256, expected: 'contains .company-constellation', ok: constellationOk });
  } catch (error) {
    pass = false;
    files.push({ path: 'Atlas stylesheet verification', ok: false, error: error.message });
  }"""
proxy = replace_once(proxy, old_asset, new_asset, 'stylesheet release gate')

old_topology = """    const topologyOk = projection.company_count === 49 && memberships === 59 &&
      stageCounts.MAPPED_ONLY === 49 &&
      lockheed && lockheed.repositories.length === 0 &&
      lockheed.second_depth.stage === 'MAPPED_ONLY' &&
      lockheed.second_depth.claim_ceiling === 'company_alignment_only';"""
new_topology = """    const topologyOk = projection.company_count === 49 && memberships === 59 &&
      stageCounts.MAPPED_ONLY === 48 && stageCounts.CODE_INSPECTED === 1 &&
      lockheed && lockheed.repositories.length === 0 &&
      lockheed.second_depth.stage === 'CODE_INSPECTED' &&
      lockheed.second_depth.ordinal === 3 &&
      lockheed.second_depth.claim_ceiling === 'inspected_implementation_alignment' &&
      lockheed.second_depth.evidence.role_evidence.length === 1 &&
      lockheed.second_depth.evidence.problem_evidence.length === 1 &&
      lockheed.second_depth.evidence.inspected_repositories.length === 4 &&
      lockheed.second_depth.evidence.proof_artifacts.length === 0 &&
      lockheed.second_depth.evidence.claim_receipts.length === 0;"""
proxy = replace_once(proxy, old_topology, new_topology, 'V20 topology gate')

old_output = """    lockheed_martin: lockheed ? {
      repositories: lockheed.repositories.length,
      stage: lockheed.second_depth.stage,
      claim_ceiling: lockheed.second_depth.claim_ceiling,
    } : null,"""
new_output = """    lockheed_martin: lockheed ? {
      repositories: lockheed.repositories.length,
      stage: lockheed.second_depth.stage,
      ordinal: lockheed.second_depth.ordinal,
      claim_ceiling: lockheed.second_depth.claim_ceiling,
      role_evidence: lockheed.second_depth.evidence.role_evidence.length,
      problem_evidence: lockheed.second_depth.evidence.problem_evidence.length,
      inspected_repositories: lockheed.second_depth.evidence.inspected_repositories.length,
      proof_artifacts: lockheed.second_depth.evidence.proof_artifacts.length,
      claim_receipts: lockheed.second_depth.evidence.claim_receipts.length,
    } : null,"""
proxy = replace_once(proxy, old_output, new_output, 'Lockheed verifier payload')

proxy = replace_once(
    proxy,
    "module.exports.needsProjection = needsProjection;\nmodule.exports.constants = { SOURCE_COMMIT, HELIX_COMMIT, SECOND_DEPTH_PATH };",
    "module.exports.needsProjection = needsProjection;\nmodule.exports.resolveSourceUrl = resolveSourceUrl;\nmodule.exports.wireField = wireField;\nmodule.exports.constants = { SOURCE_COMMIT, HELIX_COMMIT, SECOND_DEPTH_PATH };",
    'test exports',
)

tests = tests.replace('exact V19 pins', 'exact V20 first-star pins')
tests = tests.replace('V19 projection filters recruiter evidence and preserves Lockheed mapped-only', 'V20 projection filters recruiter evidence and preserves Lockheed inspected boundary')
tests = tests.replace('V19 Atlas and Lockheed page preserve four-depth no-script contract', 'V20 Atlas and Lockheed page preserve four-depth no-script contract')
tests = tests.replace("'150487be1d3cf88dd5886117e88125a4739faef3'", "'be5ddaa49d60ee551177376a67b92d681768e088'")
tests = tests.replace("'556786e96ca49507125c77a62cb17904d645e134'", "'87dd202abbff08ad2e7f6cf57739a8bdd661bd46'")

helper_anchor = """  return { ids, companies };
}

"""
helper = r"""  return { ids, companies };
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
  depth.company_overrides.lockheed_martin = {
    stage: 'CODE_INSPECTED',
    role_evidence: [publicEvidence(
      'lockheed_role_734997br',
      'role',
      'https://www.lockheedmartinjobs.com/job/sunnyvale/architecture-and-algorithms-agentic-ai-ml-engineer-level-2-3/694/97838518096',
      `sha256:${'a'.repeat(64)}`,
    )],
    problem_evidence: [publicEvidence(
      'lockheed_problem_trusted_agentic_ai_integration',
      'problem',
      'https://www.lockheedmartin.com/en-us/capabilities/artificial-intelligence-machine-learning.html',
      `sha256:${'b'.repeat(64)}`,
    )],
    inspected_repositories: [
      publicEvidence('lockheed_inspection_akos_runtime', 'repository_inspection', 'https://github.com/GlacierEQ/AKOS/blob/89403272a76dda8e1f9f317e16bfce5b60c1a3f5/runtime/src/index.ts', 'commit:89403272a76dda8e1f9f317e16bfce5b60c1a3f5'),
      publicEvidence('lockheed_inspection_apex_control_plane', 'repository_inspection', 'https://github.com/GlacierEQ/apex-control-plane/blob/340834cf8d6c65832196b6cc0b6df281574842f8/src/control_plane_runtime.py', 'commit:340834cf8d6c65832196b6cc0b6df281574842f8'),
      publicEvidence('lockheed_inspection_tower_integrity', 'repository_inspection', 'https://github.com/GlacierEQ/the-tower-of-babel/blob/e3778353e92b404de43f41963a0c7bffb84897ac/src/tower/integrity.py', 'commit:e3778353e92b404de43f41963a0c7bffb84897ac'),
      publicEvidence('lockheed_inspection_tower_receipt', 'repository_inspection', 'https://github.com/GlacierEQ/the-tower-of-babel/blob/e3778353e92b404de43f41963a0c7bffb84897ac/src/tower/receipt.py', 'commit:e3778353e92b404de43f41963a0c7bffb84897ac'),
    ],
    claim_ceiling: 'inspected_implementation_alignment',
    blockers: ['company_specific_remedy_not_bounded', 'implementation_not_created', 'proof_not_reproduced'],
    next_gate: 'Bound a candidate remedy from inspected transferable capabilities.',
  };
  return depth;
}

"""
tests = replace_once(tests, helper_anchor, helper, 'Lockheed fixture helper')

old_projection_call = """  const projection = bridge.compileProjection(
    baseIndex(ids),
    [{ companies }],
    depthRegistry(ids),
  );"""
new_projection_call = """  const projection = bridge.compileProjection(
    baseIndex(ids),
    [{ companies }],
    advanceLockheed(depthRegistry(ids)),
  );"""
if tests.count(old_projection_call) < 2:
    raise SystemExit('positive projection fixtures: fewer than two expected matches')
tests = tests.replace(old_projection_call, new_projection_call, 1)

old_assertions = """  assert.equal(lockheed.repositories.length, 0);
  assert.equal(lockheed.second_depth.stage, 'MAPPED_ONLY');
  assert.equal(lockheed.second_depth.claim_ceiling, 'company_alignment_only');"""
new_assertions = """  assert.equal(lockheed.repositories.length, 0);
  assert.equal(lockheed.second_depth.stage, 'CODE_INSPECTED');
  assert.equal(lockheed.second_depth.ordinal, 3);
  assert.equal(lockheed.second_depth.claim_ceiling, 'inspected_implementation_alignment');
  assert.equal(lockheed.second_depth.evidence.role_evidence.length, 1);
  assert.equal(lockheed.second_depth.evidence.problem_evidence.length, 1);
  assert.equal(lockheed.second_depth.evidence.inspected_repositories.length, 4);
  assert.equal(lockheed.second_depth.evidence.proof_artifacts.length, 0);"""
tests = replace_once(tests, old_assertions, new_assertions, 'projection Lockheed assertions')

marker = "test('V20 Atlas and Lockheed page preserve four-depth no-script contract', () => {"
start = tests.index(marker)
tail = tests[start:]
if old_projection_call not in tail:
    raise SystemExit('Atlas promoted fixture call not found')
tail = tail.replace(old_projection_call, new_projection_call, 1)
tests = tests[:start] + tail

tests = replace_once(
    tests,
    "  assert.match(page, /MAPPED_ONLY/);\n  assert.match(page, /company_alignment_only/);",
    "  assert.match(page, /CODE_INSPECTED/);\n  assert.match(page, /inspected_implementation_alignment/);",
    'Atlas stage assertions',
)
tests = replace_once(
    tests,
    "  assert.equal(record.second_depth.stage, 'MAPPED_ONLY');",
    "  assert.equal(record.second_depth.stage, 'CODE_INSPECTED');\n  assert.equal(record.second_depth.ordinal, 3);\n  assert.equal(record.second_depth.evidence.inspected_repositories.length, 4);",
    'Atlas record assertions',
)

tests += r"""

test('V20 source resolution cannot escape the pinned site root', () => {
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

test('V20 verifier includes every rendered constellation stylesheet', () => {
  assert.match(proxySource, /fetchSource\('assets\/company-constellation\.css'\)/);
  assert.match(proxySource, /__v20_verify/);
});
"""

proxy_path.write_text(proxy)
test_path.write_text(tests)

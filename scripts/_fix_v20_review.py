from pathlib import Path

proxy_path = Path('deployment/vercel-source-bridge/api/proxy.js')
test_path = Path('deployment/vercel-source-bridge/proxy.test.js')
proxy = proxy_path.read_text()
tests = test_path.read_text()

old_boundary = """  const lockheed = companies.find((company) => company.company_id === 'lockheed_martin');
  if (!lockheed) throw new Error('Lockheed Martin track is missing');
  if (lockheed.repositories.length !== 0 ||
      lockheed.second_depth.stage !== 'CODE_INSPECTED' ||
      lockheed.second_depth.ordinal !== 3 ||
      lockheed.second_depth.claim_ceiling !== 'inspected_implementation_alignment' ||
      lockheed.second_depth.evidence.role_evidence.length !== 1 ||
      lockheed.second_depth.evidence.problem_evidence.length !== 1 ||
      lockheed.second_depth.evidence.inspected_repositories.length !== 4 ||
      lockheed.second_depth.evidence.proof_artifacts.length !== 0 ||
      lockheed.second_depth.evidence.claim_receipts.length !== 0) {
    throw new Error('Lockheed Martin truth boundary drift');
  }

"""
if proxy.count(old_boundary) != 1:
    raise SystemExit(f'generic Lockheed boundary: expected 1 match, found {proxy.count(old_boundary)}')
proxy = proxy.replace(old_boundary, '', 1)

old_aliases = "if (raw === '__v20_verify' || raw === '__v19_verify' || raw === '__v18_verify' || raw === '__v15_verify') {"
new_alias = "if (raw === '__v20_verify') {"
if proxy.count(old_aliases) != 1:
    raise SystemExit(f'verifier aliases: expected 1 match, found {proxy.count(old_aliases)}')
proxy = proxy.replace(old_aliases, new_alias, 1)

extra = r"""

test('V20 release topology is verifier-specific, not a generic compiler invariant', () => {
  const { ids, companies } = build49();
  const projection = bridge.compileProjection(baseIndex(ids), [{ companies }], depthRegistry(ids));
  const lockheed = projection.companies.find((company) => company.company_id === 'lockheed_martin');
  assert.equal(lockheed.second_depth.stage, 'MAPPED_ONLY');
  assert.equal(lockheed.second_depth.claim_ceiling, 'company_alignment_only');
});

test('only __v20_verify advertises the V20 verification schema', () => {
  assert.match(proxySource, /raw === '__v20_verify'/);
  assert.doesNotMatch(proxySource, /raw === '__v19_verify'/);
  assert.doesNotMatch(proxySource, /raw === '__v18_verify'/);
  assert.doesNotMatch(proxySource, /raw === '__v15_verify'/);
});
"""
if "V20 release topology is verifier-specific" not in tests:
    tests += extra

proxy_path.write_text(proxy)
test_path.write_text(tests)

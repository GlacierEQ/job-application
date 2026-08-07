from pathlib import Path

path = Path('deployment/vercel-source-bridge/api/proxy.js')
text = path.read_text()
old = """  if (lockheed.repositories.length !== 0 || lockheed.second_depth.stage !== 'MAPPED_ONLY' ||
      lockheed.second_depth.claim_ceiling !== 'company_alignment_only') {
    throw new Error('Lockheed Martin truth boundary drift');
  }"""
new = """  if (lockheed.repositories.length !== 0 ||
      lockheed.second_depth.stage !== 'CODE_INSPECTED' ||
      lockheed.second_depth.ordinal !== 3 ||
      lockheed.second_depth.claim_ceiling !== 'inspected_implementation_alignment' ||
      lockheed.second_depth.evidence.role_evidence.length !== 1 ||
      lockheed.second_depth.evidence.problem_evidence.length !== 1 ||
      lockheed.second_depth.evidence.inspected_repositories.length !== 4 ||
      lockheed.second_depth.evidence.proof_artifacts.length !== 0 ||
      lockheed.second_depth.evidence.claim_receipts.length !== 0) {
    throw new Error('Lockheed Martin truth boundary drift');
  }"""
if text.count(old) != 1:
    raise SystemExit(f'Lockheed compiler boundary: expected one match, found {text.count(old)}')
path.write_text(text.replace(old, new, 1))

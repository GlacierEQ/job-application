from __future__ import annotations

from pathlib import Path
import re

SOURCE = "c5701dedc834359c78399b4370a8147501784d19"
HELIX = "83549cda4af3714304f202d0f4d35b29d28da9f7"
IMPLEMENTATION = "4328fa7078e6e4125f895768142c6af0c5ec1234"

proxy_path = Path("deployment/vercel-source-bridge/api/proxy.js")
text = proxy_path.read_text()


def one(old: str, new: str, label: str) -> None:
    global text
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"{label}: expected one match, found {count}")
    text = text.replace(old, new, 1)


one(
    "const SOURCE_COMMIT = 'be5ddaa49d60ee551177376a67b92d681768e088';",
    f"const SOURCE_COMMIT = '{SOURCE}';",
    "source pin",
)
one(
    "const HELIX_COMMIT = '87dd202abbff08ad2e7f6cf57739a8bdd661bd46';",
    f"const HELIX_COMMIT = '{HELIX}';",
    "Helix pin",
)
one("'V20-FIRST-STAR-MOTION'", "'V21-FIRST-STAR-COMPLETION'", "release header")
text = text.replace("GlacierEQ-V20-", "GlacierEQ-V21-")
one(
    "if (JSON.stringify(contract.field_kinds) !== JSON.stringify(EVIDENCE_KIND_BY_FIELD)) {",
    "if (JSON.stringify(Object.entries(contract.field_kinds).sort()) !==\n"
    "      JSON.stringify(Object.entries(EVIDENCE_KIND_BY_FIELD).sort())) {",
    "field kind structural compare",
)
one(
    "stageCounts.MAPPED_ONLY === 48 && stageCounts.CODE_INSPECTED === 1 &&",
    "stageCounts.MAPPED_ONLY === 48 && stageCounts.CLAIM_PROMOTED === 1 &&",
    "stage topology",
)
one(
    "lockheed.second_depth.stage === 'CODE_INSPECTED' &&",
    "lockheed.second_depth.stage === 'CLAIM_PROMOTED' &&",
    "Lockheed stage",
)
one("lockheed.second_depth.ordinal === 3 &&", "lockheed.second_depth.ordinal === 7 &&", "Lockheed ordinal")
one(
    "lockheed.second_depth.claim_ceiling === 'inspected_implementation_alignment' &&",
    "lockheed.second_depth.claim_ceiling === 'proof_bound_company_specific' &&",
    "Lockheed ceiling",
)
one(
    "      lockheed.second_depth.evidence.inspected_repositories.length === 4 &&\n"
    "      lockheed.second_depth.evidence.proof_artifacts.length === 0 &&\n"
    "      lockheed.second_depth.evidence.claim_receipts.length === 0;",
    "      lockheed.second_depth.evidence.inspected_repositories.length === 4 &&\n"
    "      lockheed.second_depth.evidence.gap_queue.length === 1 &&\n"
    "      lockheed.second_depth.evidence.implementation_receipts.length === 1 &&\n"
    "      lockheed.second_depth.evidence.proof_artifacts.length === 1 &&\n"
    "      lockheed.second_depth.evidence.proof_artifacts[0].verification_state === 'REPRODUCED' &&\n"
    "      lockheed.second_depth.evidence.claim_receipts.length === 1;",
    "cumulative evidence topology",
)
one(
    "schema: 'glaciereq.v20-production-verification.v1',",
    "schema: 'glaciereq.v21-production-verification.v1',",
    "verifier schema",
)
one("release: 'V20 First Star Motion',", "release: 'V21 First Star Completion',", "release name")
one(
    "      inspected_repositories: lockheed.second_depth.evidence.inspected_repositories.length,\n"
    "      proof_artifacts: lockheed.second_depth.evidence.proof_artifacts.length,",
    "      inspected_repositories: lockheed.second_depth.evidence.inspected_repositories.length,\n"
    "      gap_queue: lockheed.second_depth.evidence.gap_queue.length,\n"
    "      implementation_receipts: lockheed.second_depth.evidence.implementation_receipts.length,\n"
    "      proof_artifacts: lockheed.second_depth.evidence.proof_artifacts.length,\n"
    "      proof_verification_state: lockheed.second_depth.evidence.proof_artifacts[0]?.verification_state ?? null,",
    "verifier evidence detail",
)
one("if (raw === '__v20_verify') {", "if (raw === '__v21_verify') {", "verifier route")
proxy_path.write_text(text)

test_path = Path("deployment/vercel-source-bridge/proxy.test.js")
tests = test_path.read_text().replace("V20", "V21")
tests = tests.replace("be5ddaa49d60ee551177376a67b92d681768e088", SOURCE)
tests = tests.replace("87dd202abbff08ad2e7f6cf57739a8bdd661bd46", HELIX)

pattern = re.compile(r"function advanceLockheed\(depth\) \{.*?\n\}\n\n", re.S)
replacement = f'''function advanceLockheed(depth) {{
  const implementationCommit = '{IMPLEMENTATION}';
  const implementationBase = `https://github.com/GlacierEQ/job-application/blob/${{implementationCommit}}/projects/mission-agentic-ai-assurance`;
  depth.company_overrides.lockheed_martin = {{
    stage: 'CLAIM_PROMOTED',
    role_evidence: [publicEvidence('lockheed_role_734997br', 'role', 'https://www.lockheedmartinjobs.com/job/sunnyvale/architecture-and-algorithms-agentic-ai-ml-engineer-level-2-3/694/97838518096', `sha256:${{'a'.repeat(64)}}`)],
    problem_evidence: [publicEvidence('lockheed_problem_trusted_agentic_ai_integration', 'problem', 'https://www.lockheedmartin.com/en-us/capabilities/artificial-intelligence-machine-learning.html', `sha256:${{'b'.repeat(64)}}`)],
    inspected_repositories: [
      publicEvidence('lockheed_inspection_akos_runtime', 'repository_inspection', 'https://github.com/GlacierEQ/AKOS/blob/89403272a76dda8e1f9f317e16bfce5b60c1a3f5/runtime/src/index.ts', 'commit:89403272a76dda8e1f9f317e16bfce5b60c1a3f5'),
      publicEvidence('lockheed_inspection_apex_control_plane', 'repository_inspection', 'https://github.com/GlacierEQ/apex-control-plane/blob/340834cf8d6c65832196b6cc0b6df281574842f8/src/control_plane_runtime.py', 'commit:340834cf8d6c65832196b6cc0b6df281574842f8'),
      publicEvidence('lockheed_inspection_tower_integrity', 'repository_inspection', 'https://github.com/GlacierEQ/the-tower-of-babel/blob/e3778353e92b404de43f41963a0c7bffb84897ac/src/tower/integrity.py', 'commit:e3778353e92b404de43f41963a0c7bffb84897ac'),
      publicEvidence('lockheed_inspection_tower_receipt', 'repository_inspection', 'https://github.com/GlacierEQ/the-tower-of-babel/blob/e3778353e92b404de43f41963a0c7bffb84897ac/src/tower/receipt.py', 'commit:e3778353e92b404de43f41963a0c7bffb84897ac'),
    ],
    gap_queue: [publicEvidence('lockheed_remedy_mission_agentic_ai_assurance', 'bounded_gap', `${{implementationBase}}/machine/remedy.json`, `commit:${{implementationCommit}}`)],
    implementation_receipts: [publicEvidence('lockheed_implementation_mission_agentic_ai_assurance', 'implementation_receipt', `${{implementationBase}}/proof/implementation_receipt.json`, `commit:${{implementationCommit}}`)],
    proof_artifacts: [{{...publicEvidence('lockheed_proof_mission_agentic_ai_assurance', 'proof_artifact', `${{implementationBase}}/proof/reproduced_receipt.json`, `commit:${{implementationCommit}}`), verification_state: 'REPRODUCED'}}],
    claim_receipts: [publicEvidence('lockheed_claim_mission_agentic_ai_assurance', 'claim_receipt', `${{implementationBase}}/proof/claim_receipt.json`, `commit:${{implementationCommit}}`)],
    claim_ceiling: 'proof_bound_company_specific',
    blockers: ['distributed_state_not_implemented', 'production_scale_not_demonstrated'],
    next_gate: 'Preserve the proof-bound claim while evolving Mesh aspiration gaps.',
  }};
  return depth;
}}

'''
tests, count = pattern.subn(replacement, tests, count=1)
if count != 1:
    raise SystemExit(f"advanceLockheed replacement count {count}")

tests = tests.replace("assert.equal(lockheed.second_depth.stage, 'CODE_INSPECTED');", "assert.equal(lockheed.second_depth.stage, 'CLAIM_PROMOTED');")
tests = tests.replace("assert.equal(lockheed.second_depth.ordinal, 3);", "assert.equal(lockheed.second_depth.ordinal, 7);")
tests = tests.replace("assert.equal(lockheed.second_depth.claim_ceiling, 'inspected_implementation_alignment');", "assert.equal(lockheed.second_depth.claim_ceiling, 'proof_bound_company_specific');")
tests = tests.replace(
    "assert.equal(lockheed.second_depth.evidence.proof_artifacts.length, 0);",
    "assert.equal(lockheed.second_depth.evidence.gap_queue.length, 1);\n"
    "  assert.equal(lockheed.second_depth.evidence.implementation_receipts.length, 1);\n"
    "  assert.equal(lockheed.second_depth.evidence.proof_artifacts.length, 1);\n"
    "  assert.equal(lockheed.second_depth.evidence.proof_artifacts[0].verification_state, 'REPRODUCED');\n"
    "  assert.equal(lockheed.second_depth.evidence.claim_receipts.length, 1);",
)
tests = tests.replace("assert.match(page, /CODE_INSPECTED/);", "assert.match(page, /CLAIM_PROMOTED/);")
tests = tests.replace("assert.match(page, /inspected_implementation_alignment/);", "assert.match(page, /proof_bound_company_specific/);")
tests = tests.replace("assert.equal(record.second_depth.stage, 'CODE_INSPECTED');", "assert.equal(record.second_depth.stage, 'CLAIM_PROMOTED');")
tests = tests.replace("assert.equal(record.second_depth.ordinal, 3);", "assert.equal(record.second_depth.ordinal, 7);")
tests = tests.replace("assert.match(proxySource, /__v20_verify/);", "assert.match(proxySource, /__v21_verify/);")
tests = tests.replace(
    "assert.match(proxySource, /raw === '__v21_verify'/);\n  assert.doesNotMatch(proxySource, /raw === '__v19_verify'/);",
    "assert.match(proxySource, /raw === '__v21_verify'/);\n  assert.doesNotMatch(proxySource, /raw === '__v20_verify'/);\n  assert.doesNotMatch(proxySource, /raw === '__v19_verify'/);",
)

test_path.write_text(tests)

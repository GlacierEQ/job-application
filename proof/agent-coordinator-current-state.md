# Agent Coordinator — Current-State Proof Surface

## Recruiter
Agent Coordinator demonstrates deterministic scheduling design around dependency order, role fit, capacity, priority, and shared budgets. Its strongest executable test result remains a historical pinned receipt rather than a current-head claim. The current canonical repository state is deliberately fail-closed: the repository demoted itself to `DISCOVERED` after a newer proof attempt recorded `TESTS_FAIL`, preventing an older passing result from being silently inherited by changed code.

## Master
The important mechanism is not the raw test count; it is proof inheritance control. Historical behavioral evidence is pinned to the exact executable revision that produced it. Current repository governance separately records principal state, promotion gates, a gap receipt, and an evolution cursor. At current head `0f2ca5199e67664a87ffef3f874d5836984dbbdb`, `machine/excellence-state.json` records `principal_state=DISCOVERED`, `proof_ok=false`, `operable_ok=false`, a demotion from an attempted `PROMOTED` claim, blocker `TESTS_FAIL`, and the rule `PROMOTED XOR gap-receipt`. The only passing gate in that state record is `EVOLUTION_CURSOR_DEFINED`.

This is a stronger reliability/governance proof than describing the repository as simply “62/62 tested”: it demonstrates explicit refusal to transfer stale proof across revisions.

## Machine
- repository: `GlacierEQ/anthropic-agent-coordinator`
- current evidence head: `0f2ca5199e67664a87ffef3f874d5836984dbbdb`
- excellence-state blob: `5fd86101521f4a35df43a521fb512d2b39eead3a`
- gap-receipt blob: `754a79800a7444a643372461fd2988a60bdb0c61`
- current principal state: `DISCOVERED`
- current blocker: `TESTS_FAIL`
- current proof_ok: `false`
- current operable_ok: `false`
- historical executable proof: `62/62` at `87438f57bdfd2cb380730cf51140611963d7c95b`
- claim ceiling: `HISTORICAL_EXECUTABLE_PROOF_PLUS_CURRENT_FAIL_CLOSED_GOVERNANCE`

## Mesh
Current evidence supports two separate propositions only:
1. the scheduler had a pinned historical 62/62 executable result at its historical revision; and
2. the changed repository currently refuses promotion because its newer proof state is not green.

Not claimed: current-head behavioral verification, current-head 62/62 execution, production deployment, production scale, Anthropic adoption, or Anthropic affiliation.

### Next promotion gate
Repair the current test failure, execute repository-native verification against the resulting exact head, bind a fresh receipt to that head, and only then consider restoring current-head behavioral-verification wording.
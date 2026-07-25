# Portfolio orchestration contract

This repository is the recruiter-facing control plane for the GlacierEQ engineering portfolio. It coordinates evidence, composition, verification, and release decisions without turning the portfolio into a repository dump.

## Operating principle

> A claim is publishable only when its evidence path, access state, and verification status are explicit.

The portfolio should optimize for reviewer confidence: a small number of inspectable systems, a short path to proof, and no implication that private or unverified work is public evidence.

## System of record

`portfolio_manifest.json` is the source of truth for the three flagship systems. `SHOWCASE.md` is generated output and must not be hand-edited. The generator and tests enforce:

- exactly three flagship systems;
- at least one public entry path;
- explicit visibility and readiness state;
- non-empty evidence paths, verified proof, and current gaps;
- exclusion of sensitive case, personal, and legal material;
- private repositories represented as review-required references, not public links.

## Orchestration flow

```text
candidate repository or project
        |
        v
scope + sensitivity screen
        |
        v
claim -> evidence path -> access state -> readiness state
        |
        v
manifest update
        |
        v
showcase generation -> tests -> CI drift check
        |
        v
human release review
        |
        +--> recruiter-facing publication
        +--> curated private review
        +--> return to hardening
```

## Evidence states

Every future case study should use these meanings consistently:

- **verified** — directly supported by inspectable code, tests, artifacts, or reproducible measurements;
- **measured** — supported by a repeatable run with inputs and method recorded;
- **illustrative** — an example, simulation, or design exercise, not a production result;
- **planned** — intended work that is not yet implemented;
- **unknown** — not established and must not be described as fact.

A strong portfolio can contain illustrative and planned work. It must label those states rather than smoothing them into accomplishments.

## Routing by employer signal

| Target | Primary proof | Supporting proof | Required caution |
|---|---|---|---|
| xAI | Resume Shapeshifter | Colossus cooling | Separate technical research from verified implementation |
| SpaceX | Thermal/capacity modeling | Reliability workflows | Publish assumptions, units, sources, and reproducible calculations |
| NVIDIA | Reasoning or scheduling infrastructure | GPU/health systems | Include benchmarks and hardware/environment details |
| Anthropic | Truthfulness, safety, and reliable-agent controls | AKOS/pro-code | Show failure behavior, tests, and human boundaries |
| Notion | MCP/workspace workflow tooling | Connector orchestration | Demonstrate idempotency, permissions, and auditability |

## Release gates

A human must approve each gate before a public release or application packet is sent:

1. **Sensitivity:** no personal records, application tracking data, dispute-related material, credentials, or private contacts.
2. **Truthfulness:** every accomplishment claim has an evidence path and a state.
3. **Access:** every linked artifact is actually accessible to the intended reviewer.
4. **Reproducibility:** technical claims include inputs, assumptions, method, and tests where applicable.
5. **Security:** secrets, unsafe defaults, and accidental private links are absent.
6. **Presentation:** the three-minute path reaches a working public proof without requiring privileged context.
7. **Human approval:** repository visibility changes, external submissions, and strategic claims remain user-controlled.

## Next implementation slices

1. Add a typed claims/evidence ledger while preserving the current manifest as the public contract.
2. Convert AKOS/pro-code into a bounded architecture case study with a runnable proof path.
3. Convert Colossus cooling into a cited, assumption-led technical case study.
4. Add link, secret, and sensitive-history checks to CI.
5. Perform the logged-out release review before considering any visibility change.


# SpaceX / Starlink — Proof of Work Narrative

## Evidence-linked recruiter narrative

I build control-plane systems for complex operations.

My work combines infrastructure automation, telemetry-oriented thinking, persistent system memory, deployment workflows, and auditable routing. The recurring theme is simple: connect fragmented tools and state into one reliable operating model that can be inspected, tested, and improved.

The strongest directly inspectable SpaceX-class simulation examples are:

- [`GlacierEQ/spacex-autonomy`](https://github.com/GlacierEQ/spacex-autonomy) — Python mode policy, one-dimensional state estimation, bounded position control and synthetic GO/HOLD quorum; Go flight-phase state/threshold simulation and native tests.
- [`GlacierEQ/spacex-mission-control`](https://github.com/GlacierEQ/spacex-mission-control) — local event fan-out, telemetry aggregation, callback-driven simulated mission phases and abort behavior; repository-owned test fixtures.
- [`GlacierEQ/spacex-launch-sequencer`](https://github.com/GlacierEQ/spacex-launch-sequencer) — Python/Go countdown milestone ordering, monotonic hold/resume accounting, readiness votes and fail-closed abort paths.

The associated independent physical-infrastructure and integration examples remain:

- [`GlacierEQ/xai-colossus-energy`](https://github.com/GlacierEQ/xai-colossus-energy) — Rust demand/PUE/headroom calculations, Python formula parity and pinned Alpha/Omega simulated load-shed family verification.
- [`GlacierEQ/colossus-gateway`](https://github.com/GlacierEQ/colossus-gateway) and [`GlacierEQ/apex-stack`](https://github.com/GlacierEQ/apex-stack) — gateway/orchestration architecture; exact runtime connectivity must be reviewed separately.
- CI/CD and connector automation across the engineering repositories.

In `apex-stack`, I organized GitHub, Supabase, Vercel, Supermemory, Notion, and Aspen Grove / M2A into a single deployment and memory sequence. In the Colossus-inspired projects, I applied the same systems approach to physical infrastructure domains such as cooling, energy, water, security, and server operations.

The relevance to SpaceX and Starlink is systems behavior that hiring managers can inspect in public source. These independent simulations do not replicate certified flight or network systems. It is the operating discipline behind them:

- define the source of truth
- make state observable
- automate repeatable operations
- separate public and protected system layers
- design for partial failure
- document the sequence clearly
- keep deployment and verification close to the code

I am interested in software infrastructure, operations tooling, telemetry, Starlink systems, mission support, manufacturing software, or reliability engineering roles where broad technical ownership is valuable.

What I would bring:

- fast independent execution
- strong GitHub and CI workflow discipline
- TypeScript, Python, Node.js, and Bash
- connector and API integration
- memory-aware agent systems
- operational documentation
- ability to move from problem framing to working implementation

I would be glad to provide a concise technical walkthrough of the selected projects and explain how I would adapt the same architecture to a mission-critical environment.

— Casey Del Carpio Barton
Honolulu, Hawaii

**Verification boundary:** These sources demonstrate inspectable implementations and repository-native test paths, not a fresh execution of every test by this application document. No employment or affiliation with SpaceX, flight certification, live telemetry, vehicle control, proprietary information, deployed reliability, or operational mission authority is claimed.

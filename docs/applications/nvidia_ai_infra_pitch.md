# AI Infrastructure Engineering — NVIDIA
**Casey Barton | Honolulu, Hawaii | GlacierEQ on GitHub**

---

## The Alignment

NVIDIA is building the infrastructure layer that the entire AI industry runs on. DGX systems, NIM microservices, AI factories, and the software stack that makes GPU clusters programmable — this is the engineering surface I have been working against from the application and orchestration side.

I am the engineer who builds the systems that sit on top of your hardware and make it coherent, observable, and operable at scale.

---

## What I Built

### AI Infrastructure Orchestration

The `GlacierEQ/apex-stack` system is a production-grade AI operations control plane. Core capabilities:

**MCP-to-All (M2A) Protocol**
- A broadcast routing protocol that dispatches AI agent requests to relevant service nodes
- Each request envelope declares intent, domain tags, and required capabilities
- The relevance router scores every registered node against the request and selects only qualified responders
- Response bundles are ranked, merged, and returned as structured output with full audit metadata
- Designed for GPU-cluster-scale coordination: the same problem NVIDIA faces routing NIM inference requests across multi-node deployments

**Responder Registry Architecture**
- JSON Schema-validated responder definitions with capability declarations, domain tags, cost class, latency class, priority, and effectiveness scores
- Runtime validation blocks malformed configurations before they can corrupt routing
- Hot-reloadable registry supports dynamic node registration without service restart

**Aspen Audit Persistence**
- Every M2A routing event, node selection, and bundle result is written to a structured audit log
- Three persistence modes: live connector, webhook fallback, offline buffer
- Audit events are semantically indexed via Supermemory.ai for retrieval and replay

### AI Factory Infrastructure Simulation

The Colossus-inspired infrastructure repos model the physical and operational layers of an AI compute facility:

| Domain | Repo | Capability |
|---|---|---|
| Thermal | `xai-colossus-cooling` | Zone-level cooling control, thermal fault modeling |
| Power | `xai-colossus-energy` | Load balancing, power draw analytics, delivery fault simulation |
| Security | `xai-colossus-security` | Access control, physical perimeter monitoring, audit sourcing |
| Deployment | `xai-colossus-build` | IaC pipelines, staged rollout, CI/CD health gates |
| Control | `colossus-gateway` | API gateway, service health, cross-domain routing |

This is an AI factory architecture — the same physical and operational stack that underlies every NVIDIA DGX Superpod and AI data center deployment.

### Connector Mesh and Platform Integration

NVIDIA's platform engineering teams need engineers who can integrate across complex toolchains. My connector mesh spans:

- **Supabase + Neon** — Postgres-native persistence with migration automation
- **Vercel** — Edge deployment and CI preview environments
- **GitHub Actions** — Workflow automation and CI/CD enforcement
- **n8n** — Cross-service workflow orchestration
- **DuckDB/MotherDuck** — Analytical queries against infrastructure telemetry
- **Pinecone + Qdrant** — Vector index for AI-native retrieval and semantic search
- **Supermemory.ai** — Persistent memory layer with semantic indexing

---

## Why NVIDIA

NVIDIA is the platform. Every AI application in production runs on your hardware, your drivers, your CUDA libraries, or your NIM microservices. The engineering work I want to do is at the intersection of your platform and the AI applications that run on it:

- **AI factory control software** — the orchestration layer that manages compute allocation, inference routing, and operational health across DGX clusters
- **NIM microservice infrastructure** — deployment automation, health monitoring, and operational tooling for NIM-based inference services
- **Developer infrastructure** — the SDKs, APIs, and integration tooling that make NVIDIA platforms accessible to the next generation of AI builders
- **Platform observability** — the telemetry, audit, and memory systems that make GPU-scale infrastructure understandable and recoverable

---

## Technical Profile

| Dimension | Detail |
|---|---|
| Primary languages | TypeScript, Python, SQL, Bash |
| Infrastructure | Docker, GitHub Actions, Vercel, Neon, Supabase |
| Databases | Postgres, DuckDB, MotherDuck |
| AI/ML adjacent | Vector DBs (Pinecone, Qdrant), MCP protocol, semantic memory |
| Architecture patterns | Event sourcing, relevance routing, registry validation, audit persistence |
| Deployment patterns | IaC, staged rollout, CI/CD health gates, environment config management |

---

## Proof Links

- GitHub Organization: [github.com/GlacierEQ](https://github.com/GlacierEQ)
- Application Hub: [github.com/GlacierEQ/job-application](https://github.com/GlacierEQ/job-application)
- Skills Matrix: [SKILLS_MATRIX.md](../SKILLS_MATRIX.md)
- Project Showcase: [PROJECT_SHOWCASE.md](../PROJECT_SHOWCASE.md)

*AI infrastructure. Deployed. Auditable. Production-ready.*

# Company Fit Projection — OpenAI Core Services

**Status:** CURRENT ROLE VERIFIED + BOUNDED CAPABILITY FIT  
**Company:** OpenAI  
**Current verified role:** Software Engineer, Core Services  
**Role source:** https://openai.com/careers/software-engineer-core-services-san-francisco/  
**Role evidence observed:** 2026-08-09  
**Job-application base:** `c66dfff509f659ff92c77c3fcc420d6fa17d343b`  
**Helix authority observed:** `GlacierEQ/job-app-helix@7882b3b76f60eece6a48a49d194df337c65ab5bb`  
**Primary admitted donor:** `GlacierEQ/openai-reasoning-kv-sentinel@9cd23baaaf00c02cfaca156899257a9264797fa2`  
**Truth boundary:** Independent GlacierEQ work. No OpenAI affiliation, endorsement, employment, proprietary access, internal-system access, adoption, production deployment, or production-scale reliability is claimed.

## Current role bottleneck

The current OpenAI Core Services role explicitly centers foundational backend platforms including caching systems, workflow orchestration, metadata stores, and file services. The role emphasizes reliability, scalability, performance, distributed-systems reasoning, and APIs/abstractions that accelerate product teams.

The defensible portfolio fit is therefore:

> **I build bounded control-plane mechanisms for state retention, workflow progression, explicit failure handling, and evidence-governed promotion. Those mechanisms map to the control problems behind caching and orchestration systems, while remaining clearly below claims of production distributed-cache operation or OpenAI-scale infrastructure.**

## Verified donor A — reasoning-record retention policy

**Repository:** `GlacierEQ/openai-reasoning-kv-sentinel`  
**Canonical head inspected:** `9cd23baaaf00c02cfaca156899257a9264797fa2`  
**Exact implementation:** `src/reasoning_kv_sentinel.py`  
**Blob:** `e4c9a2c4c98d10ebcbeaaa90a523a88fc8d89c71`

Verified implementation mechanisms:

- Shannon-entropy scoring over caller-supplied probability vectors;
- anchor preservation;
- configurable recent-tail retention;
- optional ONNX/NumPy keep scoring;
- count-bounded retention under `max_cache_tokens`;
- explicit retained/evicted/pressure metrics;
- fail-closed constructor validation for invalid resource-policy inputs;
- schema validation for tool-call payload shape and primitive field types without tool execution.

The current repository front door correctly limits this to a **local reasoning-record retention policy**. It explicitly does not claim transformer KV-tensor mutation, model-server integration, reasoning-quality preservation, measured VRAM savings, production latency/throughput gains, live MCP/APEX connectivity, or OpenAI deployment.

### Role mapping

This donor is relevant to the Core Services caching surface because it demonstrates one bounded cache-policy problem: **deciding what state remains admitted under a finite retention budget while preserving explicit policy semantics and observable pressure metrics**.

It is not evidence of a distributed cache, metadata store, or production cache service.

## Verified donor B — bounded state transitions

**Canonical portfolio proof:** `portfolio-proof/CAPABILITY_CLUSTER__BOUNDED_STATE_TRANSITIONS__2026-08-10.md`

The cluster captures a repeated engineering pattern across independent systems: state changes are admitted only when explicit prerequisites, resource constraints, safety boundaries, or evidence rules are satisfied; otherwise the system emits a named deferral/failure state instead of silently pretending success.

### Role mapping

This maps to workflow orchestration and foundational-service design at the control-plane level:

- explicit admission rules;
- deterministic state progression;
- visible deferral/failure;
- fail-closed invalid inputs;
- promotion only when evidence satisfies a declared gate.

It does not establish OpenAI-scale workflow execution, cluster scheduling, production incident ownership, or globally distributed state coordination.

## Verified donor C — Helix repository-evolution compiler

**Repository:** `GlacierEQ/job-app-helix`  
**Authority observed:** `7882b3b76f60eece6a48a49d194df337c65ab5bb`  
**Canonical proof:** `portfolio-proof/HELIX_REPOSITORY_EXCELLENCE_COMPILER_PROOF_SURFACES_2026-08-09.md`

The current proof surface records an implementation-inspected compiler that advances repository/system state through explicit evidence-gated lifecycle stages while preserving failure and side-exit states and separating architectural ambition from present proof.

### Role mapping

This contributes a governance analogue to orchestration systems: lifecycle transitions are explicit, prerequisites are named, and incomplete work remains incomplete rather than being promoted by prose.

It is not a production workflow engine or OpenAI internal control plane.

## Recruiter surface

> I build control-plane mechanisms that keep state transitions explicit under pressure: bounded retention policies, deterministic admission, visible deferrals, fail-closed validation, and evidence-gated lifecycle progression. My OpenAI-named KV Sentinel is intentionally scoped to local reasoning-record retention rather than pretending to be a production KV-cache implementation, and my broader portfolio repeats the same bounded-state discipline across orchestration and governance systems. That maps well to Core Services problems around caching and workflow orchestration without claiming OpenAI-scale infrastructure experience.

## Master surface

### What is actually proven

1. **Retention under a finite budget:** the KV Sentinel selects caller-supplied reasoning records using entropy, anchors, recency, and optional local scoring, then applies a count ceiling with observable metrics.
2. **Explicit state progression:** the bounded-state-transition cluster captures deterministic admission and named failure/deferral states across independent systems.
3. **Evidence-governed lifecycle control:** Helix applies explicit gates before advancing repository/system state.

### Why the combination matters

Caching and orchestration are both state-management problems. The recurring engineering habit here is to make the state machine explicit: what may enter, what must remain, what may advance, what must defer, and what evidence is required before declaring success.

### Claim ceiling

**BOUNDED_CORE_SERVICES_CONTROL_ALIGNMENT**

This means the portfolio demonstrates relevant control mechanisms and engineering discipline. It does **not** mean production distributed-cache implementation, distributed metadata-store operation, OpenAI deployment, production SLO ownership, or global-scale orchestration.

## Machine surface

```yaml
schema: glaciereq.company-fit-proof.v1
company: OpenAI
role:
  title: Software Engineer, Core Services
  observed: 2026-08-09
  source: https://openai.com/careers/software-engineer-core-services-san-francisco/
role_problem:
  - caching_systems
  - workflow_orchestration
  - metadata_stores
  - file_services
  - reliability
  - scalability
  - performance
  - api_abstractions
portfolio_fit:
  claim_ceiling: BOUNDED_CORE_SERVICES_CONTROL_ALIGNMENT
  primary_donor:
    repository: GlacierEQ/openai-reasoning-kv-sentinel
    head: 9cd23baaaf00c02cfaca156899257a9264797fa2
    path: src/reasoning_kv_sentinel.py
    blob: e4c9a2c4c98d10ebcbeaaa90a523a88fc8d89c71
    capability: local_reasoning_record_retention_policy
    evidence_level: implementation_inspected
  supporting_proofs:
    - portfolio-proof/CAPABILITY_CLUSTER__BOUNDED_STATE_TRANSITIONS__2026-08-10.md
    - portfolio-proof/HELIX_REPOSITORY_EXCELLENCE_COMPILER_PROOF_SURFACES_2026-08-09.md
nonclaims:
  - openai_affiliation_or_endorsement
  - openai_internal_access
  - production_distributed_cache
  - production_metadata_store
  - production_workflow_engine
  - model_server_kv_tensor_mutation
  - reasoning_quality_preservation
  - production_slo_ownership
  - openai_scale
  - deployment
```

## Mesh

```text
OpenAI Core Services fit

CURRENT ROLE
  VERIFIED -> Software Engineer, Core Services

ROLE PROBLEM
  BOUNDED -> caching + workflow orchestration + metadata/file services + reliability

DONOR A
  INSPECTED -> local reasoning-record retention policy
  finite retention budget + explicit pressure metrics
  NOT -> distributed cache / KV tensor mutation / production inference

DONOR B
  CANONICAL -> bounded state transitions under explicit failure semantics
  deterministic admission + visible deferral/failure

DONOR C
  CANONICAL -> Helix evidence-gated lifecycle compiler
  explicit prerequisites + no prose-based completion

CLAIM CEILING
  BOUNDED_CORE_SERVICES_CONTROL_ALIGNMENT

NEXT
  if pursuing a stronger company-specific stage:
    bind immutable role/problem evidence into Helix
    reproduce the KV Sentinel native verification path at the exact current head
    only then consider CODE_INSPECTED / later second-depth progression
```

## Supersession decision

**Retire:** any shorthand that implies `openai-reasoning-kv-sentinel` is already a production KV-cache, distributed cache, OpenAI runtime component, or model-server optimization.

**Use instead:**

> **A bounded local reasoning-record retention policy with explicit pressure metrics and strict nonclaims, supported by a broader portfolio pattern of deterministic state admission and evidence-gated progression.**

# Palantir — Governed Agent Actions Fit

## Recruiter
Palantir's public platform surface makes a concrete systems problem visible: pro-code agents can reason over enterprise state and call tools that read and write through the Ontology, while authorization, action submission criteria, lineage, and writeback semantics remain part of the operating boundary. GlacierEQ now has three independent canonical specialist systems that map to that boundary: causal action provenance, object-type/verb authorization, and transactional ontology writeback.

**Bounded fit claim:** demonstrated engineering patterns align with the problem of making agent-triggered operational mutations attributable, authorized, and transactionally inspectable. This is independent portfolio work, not Palantir adoption, integration, deployment, affiliation, or proprietary access.

## Master
### Externally supportable operating pressure
Current Palantir documentation states that Foundry Agents can call tools that read and write environment data; agents authenticate against OSDK/OMCP/Palantir MCP with scoped permissions. Ontology Actions provide transaction-shaped edits to objects, properties, and links, while action application depends on resource visibility, underlying permissions, and submission criteria. AI FDE additionally documents identity-bound execution, audit logging, and explicit approval for mutating operations.

This supports a bounded engineering pressure: **agentic action must not erase authorization, attribution, or transactional semantics when model reasoning crosses into operational mutation.** This pressure is inferred from public platform behavior; it is not represented as an employer-confirmed internal bottleneck.

### GlacierEQ intervention
Three canonical specialists provide separate evidence planes:

1. `GlacierEQ/palantir-action-lineage-graph@863d17fe691f5f5bdb45391a16a7d2d98fe9afca` — owns `causal_action_provenance`.
2. `GlacierEQ/palantir-object-authority-matrix@98d106ac56b36e798be37576ebfd0a381ffd0c8b` — owns `object_type_verb_authorization`.
3. `GlacierEQ/palantir-ontology-writeback-ledger@a4c29b3f7d55d80a50900206b63690a5be99bb2b` — owns `transactional_ontology_writeback`.

The portfolio value is not "three Palantir repositories." It is three independently bounded mechanisms that cover complementary failure surfaces: who/what caused a mutation, whether a subject may invoke a verb over an object type, and whether the resulting ontology mutation can be represented with transactional writeback semantics.

### Proposed composition — not yet exercised
`proposal -> lineage receipt -> authority receipt -> transactional writeback -> canonical readback/receipt -> new lineage node`

This composition is a design hypothesis only. The canonical registry receipt explicitly records `integration_exercised=false`. Until an end-to-end composition receipt exists, the triad must remain three verified specialists rather than one claimed integrated system.

## Machine
```text
GEQ.COMPANY_FIT/1
company=Palantir
problem=governed_agent_operational_mutation
public_basis=agents_read_write+scoped_permissions+ontology_actions+submission_criteria+audit_approval
inference=preserve_authorization+attribution+transaction_semantics_across_agent_mutation
DONOR[palantir-action-lineage-graph@863d17fe691f5f5bdb45391a16a7d2d98fe9afca|causal_action_provenance]
DONOR[palantir-object-authority-matrix@98d106ac56b36e798be37576ebfd0a381ffd0c8b|object_type_verb_authorization]
DONOR[palantir-ontology-writeback-ledger@a4c29b3f7d55d80a50900206b63690a5be99bb2b|transactional_ontology_writeback]
integration_exercised=false
claim_ceiling=BOUNDED_GOVERNED_AGENT_ACTION_ALIGNMENT
```

## Mesh
- **Current delta:** Palantir moves from generic `company_alignment_only` scaffold toward a source-bounded governed-agent-action projection backed by three canonical specialist mechanisms.
- **Do not claim:** Palantir adoption; Palantir employment/affiliation; proprietary access; production deployment; end-to-end triad integration; Palantir-scale performance; exact behavioral equivalence with Foundry/AIP.
- **Next promotion gate:** implement and execute one public-safe end-to-end triad composition fixture, bind every transition to exact donor revisions, reproduce it in repository-native CI, and only then consider an integrated-system claim.

## Public source anchors
- Palantir Agents overview: https://www.palantir.com/docs/foundry/agents/overview
- Ontology MCP authentication and authorization: https://www.palantir.com/docs/foundry/ontology-mcp/authentication-and-authorization
- Action types overview: https://www.palantir.com/docs/foundry/action-types/overview
- Action permissions: https://www.palantir.com/docs/foundry/action-types/permissions
- AI FDE security and governance: https://www.palantir.com/docs/foundry/ai-fde/security-and-governance

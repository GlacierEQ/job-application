# V17 cleanup manifest

The final release removes temporary bootstrap transport and obsolete regeneration machinery after the canonical artifacts are persisted and validated.

Removed in the following atomic cleanup commit:

- temporary V17 finalizer workflow;
- obsolete alternate-branch regeneration workflow;
- one-shot compaction/finalization helper scripts;
- digest-recovery helper and five transport chunks;
- temporary cleanup marker.

Retained:

- deterministic V17 generator and builder;
- V17 validator and validation workflow;
- PDF, DOCX, ATS text, machine JSON, artifact manifest;
- V16/V17 release receipts and canonical site surfaces.

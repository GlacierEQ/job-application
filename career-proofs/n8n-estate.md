# Proof: n8n production estate — audited clean against CVE-2026-21858

## Claim
Run n8n Cloud (primary) with 4 live workflows and 7 OAuth credentials (Gmail,
GitHub, Box, Notion, Google Sheets, Mistral, Vercel AI Gateway). Audited
2026-10-17 against CVE-2026-21858 ("Ni8mare", CVSS 10.0): not affected —
self-hosted-only RCE, cloud instances vendor-patched. Credential inventory and
rotation practiced live.

## Evidence
- Credential inventory via MCP, 2026-10-16 (7 credentials, personal project).
- Audit report: `workspace/.jarvis/idea-executions/c7794c9a-d0b3-45ff-8b9c-de64da564199/scratch/audit-result.md`.
- Advisory facts verified against n8n/Arctic Wolf/Censys sources, 2026-10-17.

## Verified
2026-10-17.

## Used in
- (none yet)

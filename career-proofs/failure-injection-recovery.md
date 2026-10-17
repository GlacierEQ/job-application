# Proof: Failure-injection labs — agents that survive auth failure

## Claim
Ran failure-injection labs against live automation workflows on 2026-10-15 —
all green, including recovery from an authentication-token expiry mid-run: the
run halts, classifies the failure, rotates the credential, and resumes cleanly
instead of corrupting state.

## Evidence
- n8n failure labs run, 2026-10-15 (estate record).
- n8n estate: 4 live workflows, 7 OAuth credentials inventoried 2026-10-16,
  key rotation executed live 2026-10-16.

## Verified
2026-10-15 (lab run). Re-run before citing as current.

## Used in
- Buildertrend Principal Cloud Engineer pack (2026-10-17)
- Beth Robertson partnership brief, Track 2 (2026-10-17)

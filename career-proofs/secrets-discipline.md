# Proof: Secrets discipline — rotation practiced, never leaked

## Claim
All service secrets held in 0600-permissioned stores, never in chat, logs, or
generated code. Live key rotation practiced on production credentials (most
recently n8n MCP key, 2026-10-16). Approval gates on every consequential agent
action; typed workflow contracts refuse to run unclassified failure modes.

## Evidence
- `~/.config/muse/keys.env` (0600); rotation log in memory 2026-10-16.
- MCP estate approval-gate design; worker contracts
  (`~/workspace/stranded-files-move/worker.sh` — classified-failure halt).

## Verified
2026-10-16/17.

## Used in
- Buildertrend Principal Cloud Engineer pack (2026-10-17)

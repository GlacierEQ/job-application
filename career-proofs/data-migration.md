# Proof: 6,000+ file migration — checksummed, idempotent, zero deletions

## Claim
Built and operate a Dropbox → Google Drive migration worker that moved 6,000+
files with md5+size verification per file, idempotent JSONL ledger resume, and
per-file root-cause quarantine. Nothing is ever deleted from source; sealed
archives are never opened.

## Evidence
- Worker: `~/workspace/stranded-files-move/worker.sh` (lock-protected, resumable).
- Run ledgers under `~/workspace/goals/stranded-files-move-dropbox-google-drive/`.
- Scoreboard 2026-10-17: step1 ok=1,525 failed=0; step2 ok=6,072 (cumulative).

## Verified
2026-10-17 (live run ledgers).

## Used in
- Buildertrend Principal Cloud Engineer pack (2026-10-17)

# Proof: Watcher fleet — named incident classes, self-healing, silent-when-healthy

## Claim
Operate a 24/7 cron-worker fleet where every incident class (token expiry mid-run,
flapping alerts, transport failures, VM replacement) has a named response runbook.
Watchdogs self-heal sshd and hook daemons after VM replacements; monitoring is
silent-when-healthy so anomalies surface instead of hiding in noise.

## Evidence
- Watchdog: `~/workspace/moshi/watchdog.sh` (verified recovering sshd + moshi-hook
  after VM replacement, 2026-10-17; apt-timeout hardening same day).
- Cron contracts under `~/workspace/cron.d/` and goal-owned crons.

## Verified
2026-10-17 (live recovery observed).

## Used in
- Buildertrend Principal Cloud Engineer pack (2026-10-17)

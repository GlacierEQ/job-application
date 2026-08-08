from __future__ import annotations

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "src"))

from mission_assurance import EvidenceRef, MissionAssuranceGateway, Policy


def main() -> int:
    fixture = json.loads((ROOT / "examples" / "lockheed_public_lens.json").read_text())
    evidence = [EvidenceRef(**item) for item in fixture["evidence"]]
    gateway = MissionAssuranceGateway(
        Policy(
            allowed_actions=("agent.integration.assess", "agent.integration.execute"),
            max_payload_bytes=4096,
            max_drift=0.10,
            require_evidence=True,
            breaker_failure_threshold=2,
        )
    )
    receipt = gateway.assess(
        action_id=fixture["action_id"],
        action=fixture["action"],
        payload=fixture["payload"],
        evidence=evidence,
        current_metric=fixture["current_metric"],
        baseline_metric=fixture["baseline_metric"],
        executor=lambda payload: {
            "accepted": True,
            "component": payload["component"],
            "mode": payload["mode"],
        },
    )
    sys.stdout.write(json.dumps(receipt, indent=2, sort_keys=True) + "\n")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

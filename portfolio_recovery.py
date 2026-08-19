"""Evidence-bound portfolio recovery: claims require an inspectable path."""

from dataclasses import dataclass


@dataclass(frozen=True)
class Claim:
    text: str
    evidence_paths: tuple[str, ...]
    status: str = "unverified"


def publishable(claim: Claim) -> bool:
    return bool(claim.text.strip()) and bool(claim.evidence_paths) and claim.status == "verified"

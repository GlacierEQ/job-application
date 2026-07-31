"""Generate the recruiter showcase from an evidence-bound manifest.

The generator favors a small number of inspectable systems over portfolio-count
marketing. Public repositories become links. Private repositories, when present,
remain clearly labeled so the generated surface cannot imply access or proof that
is not available.
"""

from __future__ import annotations

import json
import re
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parent
MANIFEST_PATH = ROOT / "portfolio_manifest.json"
OUT = ROOT / "SHOWCASE.md"

ALLOWED_VISIBILITY = {"public", "private"}
ALLOWED_STATUS = {"hardening", "private-review", "ready"}
LEGAL_BLOCK = re.compile(
    r"1FDV|SUPERLUMINAL_CASE|FEDERAL.?WARFARE|family.?court|court.?case|"
    r"docket|Kekoa|CSEA|civil.?rico|§1983|apex-legal|legal.?warfare",
    re.IGNORECASE,
)


def load_manifest(path: Path = MANIFEST_PATH) -> dict[str, Any]:
    if not path.is_file():
        raise ValueError(f"portfolio manifest not found: {path}")

    data = json.loads(path.read_text(encoding="utf-8"))
    validate_manifest(data)
    return data


def validate_manifest(data: dict[str, Any]) -> None:
    required_root = {
        "schema_version",
        "owner",
        "identity",
        "positioning",
        "flagships",
        "exclusions",
    }
    missing = sorted(required_root - data.keys())
    if missing:
        raise ValueError(f"manifest missing required fields: {', '.join(missing)}")

    flagships = data["flagships"]
    if not isinstance(flagships, list) or len(flagships) != 3:
        raise ValueError("manifest must define exactly three flagship systems")

    seen_ids: set[str] = set()
    for index, item in enumerate(flagships):
        required = {
            "id",
            "name",
            "visibility",
            "status",
            "demonstrates",
            "evidence_paths",
            "verified_proof",
            "current_gaps",
        }
        missing_item = sorted(required - item.keys())
        if missing_item:
            raise ValueError(
                f"flagship {index} missing fields: {', '.join(missing_item)}"
            )

        if item["id"] in seen_ids:
            raise ValueError(f"duplicate flagship id: {item['id']}")
        seen_ids.add(item["id"])

        if item["visibility"] not in ALLOWED_VISIBILITY:
            raise ValueError(f"unsupported visibility: {item['visibility']}")
        if item["status"] not in ALLOWED_STATUS:
            raise ValueError(f"unsupported status: {item['status']}")
        if not item.get("repo") and not item.get("repos"):
            raise ValueError(f"flagship {item['id']} requires repo or repos")

        for field in (
            "demonstrates",
            "evidence_paths",
            "verified_proof",
            "current_gaps",
        ):
            value = item[field]
            if not isinstance(value, list) or not value:
                raise ValueError(
                    f"flagship {item['id']} requires a non-empty {field} list"
                )

    if not any(item["visibility"] == "public" for item in flagships):
        raise ValueError("manifest requires at least one public flagship")

    serialized = json.dumps(data)
    if LEGAL_BLOCK.search(serialized):
        raise ValueError("legal or case material detected in recruiter manifest")


def github_url(owner: str, repo: str) -> str:
    return f"https://github.com/{owner}/{repo}"


def repositories(item: dict[str, Any]) -> list[str]:
    return [item["repo"]] if item.get("repo") else list(item["repos"])


def repository_label(owner: str, item: dict[str, Any]) -> str:
    repos = repositories(item)
    if item["visibility"] == "public":
        return " · ".join(f"[{repo}]({github_url(owner, repo)})" for repo in repos)
    return " · ".join(f"`{repo}`" for repo in repos)


def bullets(values: list[str]) -> str:
    return "\n".join(f"- {value}" for value in values)


def compact_signal(values: list[str]) -> str:
    return ", ".join(values[:3])


def visibility_summary(flagships: list[dict[str, Any]]) -> str:
    public_count = sum(item["visibility"] == "public" for item in flagships)
    private_count = len(flagships) - public_count
    if private_count == 0:
        return "All three flagship systems are public and directly inspectable."
    return (
        f"{public_count} flagship system(s) are public and directly inspectable; "
        f"{private_count} remain explicitly labeled for curated review."
    )


def build(data: dict[str, Any]) -> str:
    owner = data["owner"]
    flagships = data["flagships"]
    public_flagship = next(item for item in flagships if item["visibility"] == "public")
    control_plane = data.get("integration_control_plane", "job-app-helix")

    sections: list[str] = []
    for index, item in enumerate(flagships, start=1):
        access = (
            "Public and directly inspectable"
            if item["visibility"] == "public"
            else "Private; curated review required"
        )
        sections.append(
            f"""## {index}. {item["name"]}

**Repository:** {repository_label(owner, item)}  
**Access:** {access}  
**Status:** `{item["status"]}`

### What it demonstrates

{bullets(item["demonstrates"])}

### Verified proof

{bullets(item["verified_proof"])}

### Evidence path

{bullets(item["evidence_paths"])}

### Current gaps

{bullets(item["current_gaps"])}
"""
        )

    table_rows = "\n".join(
        f"| **{item['name']}** | {item['visibility']} | {item['status']} | "
        f"{compact_signal(item['demonstrates'])} |"
        for item in flagships
    )
    joined_sections = "\n---\n\n".join(sections)

    return f"""# GlacierEQ — Engineering Portfolio

> **{data["positioning"]}**

{data["identity"]}

This portfolio is intentionally concentrated around **three evidence-bearing systems** rather than repository-count marketing. {visibility_summary(flagships)} Every claim below is paired with an evidence path and an explicit boundary.

## Start here: three-minute proof

1. Open **[{public_flagship["name"]}]({github_url(owner, repositories(public_flagship)[0])})**.
2. Follow its listed evidence paths into the implementation and tests.
3. Compare the verified proof with the stated gaps; the gaps are part of the product record.
4. Open **[{control_plane}]({github_url(owner, control_plane)})** to inspect how portfolio evidence, README contracts, and repository relationships are governed.

## Flagship systems

| System | Access | Readiness | Primary signal |
|---|---|---|---|
{table_rows}

{joined_sections}

---

## Ten-minute engineering review

1. **Product behavior:** inspect Resume Shapeshifter's API routes, truthfulness boundary, and adversarial tests.
2. **Governance architecture:** inspect AKOS and pro-code for explicit authority, completion, and engineering-contract surfaces.
3. **Systems modeling:** inspect xAI Colossus Cooling's assumptions, calculations, and reproducibility path.
4. **Evidence discipline:** verify that each system separates public source, executable proof, deployment proof, and unresolved scope.
5. **Portfolio control:** inspect `{control_plane}` for deterministic inventory, planning, verification receipts, and the typed README Mesh.

## Repository roles

```text
job-application
├── recruiter-facing portfolio and application portal
├── evidence-bound flagship manifest
└── generated showcase and resume entrypoints

{control_plane}
├── portfolio inventory and verification control plane
├── README contract and typed repository mesh
└── deterministic plans and atomic receipts

JOB-RESUME-BUILDER-
└── public product proof; branded as Resume Shapeshifter

job-app
└── private resumes, applications, outreach, and status tracking
```

## Release gates

- Regenerate `SHOWCASE.md` whenever `portfolio_manifest.json` changes.
- Verify every public repository link before publishing the portal.
- Require repository-native tests or receipts before promoting runtime claims.
- Keep deployment, scale, and performance claims unverified until provider-backed evidence exists.
- Keep private operations, personal contacts, and credentials outside this public repository.

## Excluded by design

{bullets(data["exclusions"])}

---

_Generated from `portfolio_manifest.json`. Edit the manifest, run `python3 generate_showcase.py`, then run `python3 test_showcase.py`._
"""


def main() -> int:
    data = load_manifest()
    text = build(data)
    if LEGAL_BLOCK.search(text):
        raise SystemExit("legal or case material detected in generated showcase")
    OUT.write_text(text, encoding="utf-8")
    print(f"wrote {OUT} bytes={OUT.stat().st_size}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

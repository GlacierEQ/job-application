#!/usr/bin/env python3
"""Generate the recruiter showcase from an evidence-bound manifest.

The generator intentionally favors three inspectable systems over a broad repo
catalog. Public repositories become links; private repositories remain labeled
references so the portfolio never implies access that a recruiter does not have.
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
    re.I,
)


def load_manifest(path: Path = MANIFEST_PATH) -> dict[str, Any]:
    if not path.is_file():
        raise ValueError(f"portfolio manifest not found: {path}")

    data = json.loads(path.read_text(encoding="utf-8"))
    validate_manifest(data)
    return data


def validate_manifest(data: dict[str, Any]) -> None:
    required_root = {"schema_version", "owner", "identity", "positioning", "flagships", "exclusions"}
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
            raise ValueError(f"flagship {index} missing fields: {', '.join(missing_item)}")

        if item["id"] in seen_ids:
            raise ValueError(f"duplicate flagship id: {item['id']}")
        seen_ids.add(item["id"])

        if item["visibility"] not in ALLOWED_VISIBILITY:
            raise ValueError(f"unsupported visibility: {item['visibility']}")
        if item["status"] not in ALLOWED_STATUS:
            raise ValueError(f"unsupported status: {item['status']}")
        if not item.get("repo") and not item.get("repos"):
            raise ValueError(f"flagship {item['id']} requires repo or repos")

        for field in ("demonstrates", "evidence_paths", "verified_proof", "current_gaps"):
            value = item[field]
            if not isinstance(value, list) or not value:
                raise ValueError(f"flagship {item['id']} requires a non-empty {field} list")

    public_items = [item for item in flagships if item["visibility"] == "public"]
    if not public_items:
        raise ValueError("manifest requires at least one public flagship")

    serialized = json.dumps(data)
    if LEGAL_BLOCK.search(serialized):
        raise ValueError("legal or case material detected in recruiter manifest")


def github_url(owner: str, repo: str) -> str:
    return f"https://github.com/{owner}/{repo}"


def repository_label(owner: str, item: dict[str, Any]) -> str:
    repos = [item["repo"]] if item.get("repo") else list(item["repos"])
    if item["visibility"] == "public":
        return " · ".join(f"[{repo}]({github_url(owner, repo)})" for repo in repos)
    return " · ".join(f"`{repo}`" for repo in repos)


def bullets(values: list[str]) -> str:
    return "\n".join(f"- {value}" for value in values)


def compact_signal(values: list[str]) -> str:
    return ", ".join(values[:3])


def build(data: dict[str, Any]) -> str:
    owner = data["owner"]
    flagships = data["flagships"]
    public_flagship = next(item for item in flagships if item["visibility"] == "public")

    sections: list[str] = []
    for index, item in enumerate(flagships, start=1):
        access = (
            "Public and directly inspectable"
            if item["visibility"] == "public"
            else "Private; curated review required"
        )
        sections.append(
            f"""## {index}. {item['name']}

**Repository:** {repository_label(owner, item)}  
**Access:** {access}  
**Status:** `{item['status']}`

### What it demonstrates

{bullets(item['demonstrates'])}

### Verified proof

{bullets(item['verified_proof'])}

### Evidence path

{bullets(item['evidence_paths'])}

### Current gaps

{bullets(item['current_gaps'])}
"""
        )

    table_rows = "\n".join(
        f"| **{item['name']}** | {item['visibility']} | {item['status']} | {compact_signal(item['demonstrates'])} |"
        for item in flagships
    )
    joined_sections = "\n---\n\n".join(sections)

    return f"""# GlacierEQ — Engineering Portfolio

> **{data['positioning']}**

{data['identity']}

This portfolio is intentionally narrow: **one public product and two deeper architecture systems**. It does not use repository count as a quality claim, and it does not present private work as publicly inspectable proof.

## Start here: three-minute proof

1. Open **[{public_flagship['name']}]({github_url(owner, public_flagship['repo'])})**.
2. Read `lib/truthfulness.ts` and `tests/truthfulness.test.ts`.
3. Inspect the fail-closed model boundary and API orchestration.
4. Use the private architecture systems only through a curated case study or explicit access grant.

## Flagship systems

| System | Access | Readiness | Primary signal |
|---|---|---|---|
{table_rows}

{joined_sections}

---

## Ten-minute engineering review

1. **Product surface:** open the public Resume Shapeshifter repository and read its README.
2. **Control boundary:** inspect the deterministic truthfulness validator.
3. **Tests:** run `npm test` and review the adversarial cases.
4. **Service behavior:** inspect the analyze and tailor API routes plus the fail-closed model-service path.
5. **Architecture depth:** request the curated AKOS/pro-code or Colossus cooling case study only after its access path is ready.

## Repository roles

```text
job-application
└── recruiter-facing portfolio portal

JOB-RESUME-BUILDER-
└── public product proof; branded as Resume Shapeshifter

job-app
└── private resumes, applications, outreach, and status tracking
```

## Release gates

- Verify this repository is public before sending its URL to a recruiter.
- Do not link private flagship repositories as though they are inspectable.
- Publish a bounded architecture case study or grant access before using private work as proof.
- Deploy and verify the public product before describing it as live.
- Rename `JOB-RESUME-BUILDER-` only after redirects and portfolio references are planned.

## Excluded by design

{bullets(data['exclusions'])}

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

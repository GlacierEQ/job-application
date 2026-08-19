#!/usr/bin/env python3
"""Export the production JSON Resume into Job Application Helix CandidateProfile JSON.

The source resume remains the owning record. This bridge performs a deterministic,
loss-conscious projection into the compact profile contract consumed by job-app-helix.
It never invents candidate evidence and can verify that a committed projection is fresh.
"""

from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[1]
DEFAULT_SOURCE = ROOT / "site-v15" / "data" / "resume.json"
DEFAULT_OUTPUT = ROOT / "interop" / "job-app-helix" / "candidate-profile.json"


def _canonical_bytes(value: object) -> bytes:
    return json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":")).encode(
        "utf-8"
    )


def _digest(value: object) -> str:
    return hashlib.sha256(_canonical_bytes(value)).hexdigest()


def _clean(value: Any) -> str:
    return " ".join(str(value or "").split()).strip()


def _unique(values: list[str]) -> list[str]:
    seen: set[str] = set()
    result: list[str] = []
    for value in values:
        item = _clean(value)
        key = item.casefold()
        if item and key not in seen:
            seen.add(key)
            result.append(item)
    return result


def _period(entry: dict[str, Any]) -> str:
    start = _clean(entry.get("startDate"))
    end = _clean(entry.get("endDate")) or "present"
    return "–".join(part for part in (start, end) if part)


def _experience_entry(entry: dict[str, Any]) -> str:
    heading = " | ".join(
        part
        for part in (
            _clean(entry.get("position")),
            _clean(entry.get("name")),
            _period(entry),
            _clean(entry.get("location")),
        )
        if part
    )
    evidence = [_clean(entry.get("summary"))]
    evidence.extend(_clean(item) for item in entry.get("highlights", []) if item)
    body = " ".join(item for item in evidence if item)
    return f"{heading}: {body}" if heading and body else heading or body


def _project_achievement(project: dict[str, Any]) -> str:
    name = _clean(project.get("name"))
    description = _clean(project.get("description"))
    keywords = _unique([_clean(item) for item in project.get("keywords", [])])
    parts = [description]
    if keywords:
        parts.append("Evidence: " + "; ".join(keywords))
    body = " ".join(part for part in parts if part)
    return f"{name}: {body}" if name and body else name or body


def build_helix_profile(resume: dict[str, Any]) -> dict[str, Any]:
    basics = resume.get("basics")
    if not isinstance(basics, dict):
        raise ValueError("resume requires a basics object")
    name = _clean(basics.get("name"))
    if not name:
        raise ValueError("resume basics requires name")

    skills: list[str] = []
    for skill in resume.get("skills", []):
        if not isinstance(skill, dict):
            continue
        skills.append(_clean(skill.get("name")))
        skills.extend(_clean(item) for item in skill.get("keywords", []) if item)

    experience = [
        _experience_entry(entry)
        for entry in resume.get("work", [])
        if isinstance(entry, dict)
    ]
    achievements = [
        _project_achievement(project)
        for project in resume.get("projects", [])
        if isinstance(project, dict)
    ]

    profiles = basics.get("profiles") if isinstance(basics.get("profiles"), list) else []
    github = ""
    for profile in profiles:
        if isinstance(profile, dict) and _clean(profile.get("network")).casefold() == "github":
            github = _clean(profile.get("url"))
            break
    location = basics.get("location") if isinstance(basics.get("location"), dict) else {}
    location_text = ", ".join(
        value
        for value in (
            _clean(location.get("city")),
            _clean(location.get("region")),
            _clean(location.get("countryCode")),
        )
        if value
    )

    source = {
        "name": name,
        "headline": _clean(basics.get("label")),
        "summary": _clean(basics.get("summary")),
        "skills": _unique(skills),
        "experience": _unique(experience),
        "achievements": _unique(achievements),
        "contact": {
            key: value
            for key, value in {
                "email": _clean(basics.get("email")),
                "phone": _clean(basics.get("phone")),
                "url": _clean(basics.get("url")),
                "github": github,
                "location": location_text,
            }.items()
            if value
        },
    }
    source_digest = _digest(resume)
    profile = {
        "schema": "glaciereq.job-app-helix.candidate-profile.v1",
        "profile_id": f"candidate-{hashlib.sha256(name.encode('utf-8')).hexdigest()[:16]}",
        **source,
        "provenance": {
            "source": "site-v15/data/resume.json",
            "source_sha256": source_digest,
            "projection": "scripts/export_helix_candidate_profile.py",
            "evidence_policy": "projection_may_not_exceed_source_resume",
        },
    }
    return profile


def _load(path: Path) -> dict[str, Any]:
    value = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(value, dict):
        raise ValueError(f"{path} must contain a JSON object")
    return value


def render(profile: dict[str, Any]) -> str:
    return json.dumps(profile, ensure_ascii=False, indent=2, sort_keys=True) + "\n"


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source", type=Path, default=DEFAULT_SOURCE)
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT)
    parser.add_argument("--check", action="store_true")
    args = parser.parse_args()

    expected = render(build_helix_profile(_load(args.source)))
    if args.check:
        if not args.output.is_file():
            raise SystemExit(f"candidate profile missing: {args.output}")
        actual = args.output.read_text(encoding="utf-8")
        if actual != expected:
            raise SystemExit(
                "candidate profile is stale; run scripts/export_helix_candidate_profile.py"
            )
        print(f"verified {args.output}")
        return 0

    args.output.parent.mkdir(parents=True, exist_ok=True)
    temporary = args.output.with_suffix(args.output.suffix + ".tmp")
    temporary.write_text(expected, encoding="utf-8")
    temporary.replace(args.output)
    print(args.output)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

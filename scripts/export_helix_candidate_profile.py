#!/usr/bin/env python3
"""Project the maintained production resume into the Job Application Helix profile contract.

The resume remains the owning record. This bridge is deterministic and loss-conscious:
it carries only source-backed material into Helix, records the exact source digest, and
can fail closed when a persisted projection is stale.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import tempfile
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[1]
DEFAULT_SOURCE = ROOT / "site-v15" / "data" / "resume.json"
DEFAULT_OUTPUT = ROOT / "interop" / "job-app-helix" / "candidate-profile.json"
SCHEMA = "glaciereq.job-app-helix.candidate-profile.v1"


def _canonical_bytes(value: object) -> bytes:
    return json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":")).encode("utf-8")


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
    highlights = entry.get("highlights") if isinstance(entry.get("highlights"), list) else []
    evidence.extend(_clean(item) for item in highlights if item)
    body = " ".join(item for item in evidence if item)
    return f"{heading}: {body}" if heading and body else heading or body


def _project_achievement(project: dict[str, Any]) -> str:
    name = _clean(project.get("name"))
    description = _clean(project.get("description"))
    raw_keywords = project.get("keywords") if isinstance(project.get("keywords"), list) else []
    keywords = _unique([_clean(item) for item in raw_keywords])
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
    raw_skills = resume.get("skills") if isinstance(resume.get("skills"), list) else []
    for skill in raw_skills:
        if not isinstance(skill, dict):
            continue
        skills.append(_clean(skill.get("name")))
        keywords = skill.get("keywords") if isinstance(skill.get("keywords"), list) else []
        skills.extend(_clean(item) for item in keywords if item)

    raw_work = resume.get("work") if isinstance(resume.get("work"), list) else []
    experience = [_experience_entry(entry) for entry in raw_work if isinstance(entry, dict)]
    raw_projects = resume.get("projects") if isinstance(resume.get("projects"), list) else []
    achievements = [_project_achievement(project) for project in raw_projects if isinstance(project, dict)]

    profiles = basics.get("profiles") if isinstance(basics.get("profiles"), list) else []
    github = ""
    linkedin = ""
    for profile in profiles:
        if not isinstance(profile, dict):
            continue
        network = _clean(profile.get("network")).casefold()
        url = _clean(profile.get("url"))
        if network == "github" and not github:
            github = url
        elif network == "linkedin" and not linkedin:
            linkedin = url

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
    contact = {
        key: value
        for key, value in {
            "email": _clean(basics.get("email")),
            "phone": _clean(basics.get("phone")),
            "url": _clean(basics.get("url")),
            "github": github,
            "linkedin": linkedin,
            "location": location_text,
        }.items()
        if value
    }

    profile = {
        "schema": SCHEMA,
        "profile_id": f"candidate-{hashlib.sha256(name.encode('utf-8')).hexdigest()[:16]}",
        "name": name,
        "headline": _clean(basics.get("label")),
        "summary": _clean(basics.get("summary")),
        "skills": _unique(skills),
        "experience": _unique(experience),
        "achievements": _unique(achievements),
        "contact": contact,
        "provenance": {
            "source": "site-v15/data/resume.json",
            "source_sha256": _digest(resume),
            "projection": "scripts/export_helix_candidate_profile.py",
            "evidence_policy": "projection_may_not_exceed_source_resume",
        },
    }
    required = ("headline", "summary", "skills", "experience", "achievements")
    missing = [field for field in required if not profile[field]]
    if missing:
        raise ValueError(f"resume cannot satisfy Helix required fields: {missing}")
    return profile


def _load(path: Path) -> dict[str, Any]:
    value = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(value, dict):
        raise ValueError(f"{path} must contain a JSON object")
    return value


def render(profile: dict[str, Any]) -> str:
    return json.dumps(profile, ensure_ascii=False, indent=2, sort_keys=True) + "\n"


def _atomic_write(path: Path, content: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    fd, temporary = tempfile.mkstemp(prefix=f".{path.name}.", dir=path.parent, text=True)
    try:
        with os.fdopen(fd, "w", encoding="utf-8") as handle:
            handle.write(content)
            handle.flush()
            os.fsync(handle.fileno())
        os.replace(temporary, path)
    except Exception:
        try:
            os.unlink(temporary)
        except FileNotFoundError:
            pass
        raise


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
        if args.output.read_text(encoding="utf-8") != expected:
            raise SystemExit("candidate profile is stale; run scripts/export_helix_candidate_profile.py")
        print(f"verified {args.output}")
        return 0

    _atomic_write(args.output, expected)
    print(args.output)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

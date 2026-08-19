"""Bind stable applicant-answer intents to exact live Greenhouse field identities.

The live provider schema can rotate opaque field names between postings. This bridge keeps
applicant-confirmed values in a stable semantic source, then resolves each intent against the
current field bundle with fail-closed ambiguity and identity checks. The emitted JSON is
directly accepted by job-app-helix-greenhouse-prepare --applicant-answer-source.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import re
from dataclasses import dataclass
from pathlib import Path
from typing import Any


class AnswerBridgeError(RuntimeError):
    """Raised when a semantic answer cannot bind to exactly one live field."""


@dataclass(frozen=True)
class LiveField:
    name: str
    label: str
    field_type: str
    required: bool
    options: tuple[tuple[str, str], ...]


@dataclass(frozen=True)
class SemanticAnswer:
    key: str
    value: str
    label_pattern: str
    field_types: tuple[str, ...]
    provenance: str
    exact_field_name: str | None = None


def _read_json(path: Path) -> dict[str, Any]:
    try:
        payload = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        raise AnswerBridgeError(f"invalid JSON at {path}: {exc}") from exc
    if not isinstance(payload, dict):
        raise AnswerBridgeError(f"expected JSON object at {path}")
    return payload


def _sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def _live_fields(bundle: dict[str, Any]) -> tuple[LiveField, ...]:
    rows = bundle.get("fields")
    if not isinstance(rows, list) or not rows:
        raise AnswerBridgeError("Greenhouse field bundle requires non-empty fields")
    fields: list[LiveField] = []
    for row in rows:
        field = row.get("field") if isinstance(row, dict) else None
        if not isinstance(field, dict):
            continue
        name = str(field.get("name") or "").strip()
        label = str(field.get("label") or "").strip()
        field_type = str(field.get("field_type") or "").strip()
        if not name or not label or not field_type:
            continue
        raw_options = field.get("options") or []
        options: list[tuple[str, str]] = []
        if isinstance(raw_options, list):
            for option in raw_options:
                if isinstance(option, (list, tuple)) and len(option) == 2:
                    options.append((str(option[0]), str(option[1])))
        fields.append(
            LiveField(
                name,
                label,
                field_type,
                bool(field.get("required")),
                tuple(options),
            )
        )
    if not fields:
        raise AnswerBridgeError(
            "Greenhouse field bundle contains no usable live fields"
        )
    return tuple(fields)


def _semantic_answers(
    source: dict[str, Any], source_path: Path
) -> tuple[SemanticAnswer, ...]:
    rows = source.get("answers")
    if not isinstance(rows, list) or not rows:
        raise AnswerBridgeError("semantic answer source requires non-empty answers")
    answers: list[SemanticAnswer] = []
    seen: set[str] = set()
    for index, row in enumerate(rows):
        if not isinstance(row, dict):
            raise AnswerBridgeError(f"semantic answer #{index} must be an object")
        key = str(row.get("key") or "").strip()
        value = str(row.get("value") or "").strip()
        match = row.get("match")
        if not key or not value or not isinstance(match, dict):
            raise AnswerBridgeError(
                f"semantic answer #{index} requires key, value, and match"
            )
        if key in seen:
            raise AnswerBridgeError(f"duplicate semantic answer key: {key}")
        seen.add(key)
        pattern = str(match.get("label_pattern") or "").strip()
        if not pattern:
            raise AnswerBridgeError(
                f"semantic answer {key} requires match.label_pattern"
            )
        try:
            re.compile(pattern, flags=re.IGNORECASE)
        except re.error as exc:
            raise AnswerBridgeError(f"invalid label_pattern for {key}: {exc}") from exc
        raw_types = match.get("field_types") or []
        if not isinstance(raw_types, list) or not all(
            isinstance(item, str) and item.strip() for item in raw_types
        ):
            raise AnswerBridgeError(
                f"semantic answer {key} match.field_types must be a string list"
            )
        exact_field_name_value = match.get("field_name")
        exact_field_name = None
        if exact_field_name_value is not None:
            if (
                not isinstance(exact_field_name_value, str)
                or not exact_field_name_value.strip()
            ):
                raise AnswerBridgeError(
                    f"semantic answer {key} match.field_name must be a non-empty string"
                )
            exact_field_name = exact_field_name_value.strip()
        provenance = str(
            row.get("provenance") or f"{source_path}#answers[{index}]"
        ).strip()
        answers.append(
            SemanticAnswer(
                key,
                value,
                pattern,
                tuple(item.strip() for item in raw_types),
                provenance,
                exact_field_name,
            )
        )
    return tuple(answers)


def _matches(answer: SemanticAnswer, field: LiveField) -> bool:
    if field.field_type in {"input_hidden", "input_file"}:
        return False
    if answer.field_types and field.field_type not in answer.field_types:
        return False
    if answer.exact_field_name is not None and field.name != answer.exact_field_name:
        return False
    return re.search(answer.label_pattern, field.label, flags=re.IGNORECASE) is not None


def _normalize_option(field: LiveField, value: str) -> str:
    if not field.options:
        return value
    folded = value.casefold().strip()
    matches = [
        raw
        for raw, label in field.options
        if folded in {raw.casefold().strip(), label.casefold().strip()}
    ]
    if len(matches) != 1:
        labels = ", ".join(label for _, label in field.options)
        raise AnswerBridgeError(
            f"value for {field.label!r} must match exactly one live option: {labels}"
        )
    return matches[0]


def _verify_source_identity(bundle: dict[str, Any], source: dict[str, Any]) -> None:
    source_opening = source.get("opening_id")
    if source_opening is None:
        return
    if not isinstance(source_opening, str) or not source_opening.strip():
        raise AnswerBridgeError("semantic source opening_id must be a non-empty string")
    bundle_job = str(bundle.get("job_id") or "").strip()
    if not bundle_job:
        raise AnswerBridgeError(
            "Greenhouse field bundle requires job_id when semantic source is opening-bound"
        )
    if source_opening.strip() != bundle_job:
        raise AnswerBridgeError(
            "semantic source/provider opening identity drift: "
            f"{source_opening.strip()} != {bundle_job}"
        )


def compile_answer_source(
    field_bundle_path: Path, semantic_source_path: Path
) -> dict[str, Any]:
    bundle = _read_json(field_bundle_path)
    source = _read_json(semantic_source_path)
    _verify_source_identity(bundle, source)
    fields = _live_fields(bundle)
    semantic = _semantic_answers(source, semantic_source_path)
    compiled: list[dict[str, str]] = []
    bindings: list[dict[str, Any]] = []
    for answer in semantic:
        candidates = [field for field in fields if _matches(answer, field)]
        if len(candidates) != 1:
            details = [
                {
                    "name": field.name,
                    "label": field.label,
                    "field_type": field.field_type,
                }
                for field in candidates
            ]
            raise AnswerBridgeError(
                f"semantic answer {answer.key!r} matched {len(candidates)} live "
                f"fields; expected exactly one: {details}"
            )
        field = candidates[0]
        normalized = _normalize_option(field, answer.value)
        compiled.append(
            {
                "field_name": field.name,
                "value": normalized,
                "provenance": answer.provenance,
            }
        )
        bindings.append(
            {
                "semantic_key": answer.key,
                "field_name": field.name,
                "label": field.label,
                "field_type": field.field_type,
                "required": field.required,
            }
        )
    base = {
        "schema": "glaciereq.greenhouse-semantic-answer-bridge.v1",
        "field_bundle_sha256": _sha256(field_bundle_path),
        "semantic_source_sha256": _sha256(semantic_source_path),
        "application_id": source.get("application_id"),
        "opening_id": source.get("opening_id"),
        "answers": compiled,
        "bindings": bindings,
    }
    base["receipt_sha256"] = hashlib.sha256(
        json.dumps(base, sort_keys=True, separators=(",", ":")).encode("utf-8")
    ).hexdigest()
    return base


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--field-bundle", type=Path, required=True)
    parser.add_argument("--semantic-source", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    result = compile_answer_source(args.field_bundle, args.semantic_source)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(
        json.dumps(result, indent=2, sort_keys=True) + "\n", encoding="utf-8"
    )
    print(json.dumps(result, indent=2, sort_keys=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

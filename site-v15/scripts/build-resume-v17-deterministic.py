from __future__ import annotations

import hashlib
import json
import os
import re
import runpy
import zipfile
from pathlib import Path

from reportlab import rl_config

ROOT = Path(__file__).resolve().parents[1]
SOURCE_GENERATOR = ROOT / "scripts" / "generate-resume-v17.py"
PDF_PATH = ROOT / "downloads" / "Casey_Barton_Resume.pdf"
DOCX_PATH = ROOT / "downloads" / "Casey_Barton_Resume.docx"
MANIFEST_PATH = ROOT / "data" / "resume-artifacts.json"
FIXED_ZIP_TIME = (1980, 1, 1, 0, 0, 0)
FIXED_CORE_TIME = "2026-08-05T00:00:00Z"


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def normalize_core_properties(data: bytes) -> bytes:
    text = data.decode("utf-8")
    text = re.sub(
        r"(<dcterms:created[^>]*>).*?(</dcterms:created>)",
        rf"\g<1>{FIXED_CORE_TIME}\2",
        text,
    )
    text = re.sub(
        r"(<dcterms:modified[^>]*>).*?(</dcterms:modified>)",
        rf"\g<1>{FIXED_CORE_TIME}\2",
        text,
    )
    return text.encode("utf-8")


def normalize_docx(path: Path) -> None:
    temporary = path.with_suffix(".deterministic.docx")
    with zipfile.ZipFile(path, "r") as source, zipfile.ZipFile(
        temporary,
        "w",
        compression=zipfile.ZIP_DEFLATED,
        compresslevel=9,
    ) as target:
        for name in sorted(source.namelist()):
            data = source.read(name)
            if name == "docProps/core.xml":
                data = normalize_core_properties(data)
            original = source.getinfo(name)
            info = zipfile.ZipInfo(name, date_time=FIXED_ZIP_TIME)
            info.compress_type = zipfile.ZIP_DEFLATED
            info.create_system = 0
            info.external_attr = original.external_attr
            info.flag_bits = 0
            target.writestr(info, data)
    os.replace(temporary, path)


def write_manifest() -> dict:
    manifest = {
        "schema": "glaciereq.resume-artifacts.v17",
        "builder": "site-v15/scripts/build-resume-v17-deterministic.py",
        "source_generator": "site-v15/scripts/generate-resume-v17.py",
        "determinism": {
            "pdf": "reportlab invariant mode",
            "docx": "fixed core timestamps, sorted ZIP members, fixed ZIP timestamps",
        },
        "artifacts": {
            "pdf": {
                "path": str(PDF_PATH.relative_to(ROOT)),
                "bytes": PDF_PATH.stat().st_size,
                "sha256": sha256(PDF_PATH),
            },
            "docx": {
                "path": str(DOCX_PATH.relative_to(ROOT)),
                "bytes": DOCX_PATH.stat().st_size,
                "sha256": sha256(DOCX_PATH),
            },
        },
    }
    MANIFEST_PATH.write_text(
        json.dumps(manifest, indent=2, sort_keys=True) + "\n",
        encoding="utf-8",
    )
    return manifest


def main() -> None:
    rl_config.invariant = 1
    runpy.run_path(str(SOURCE_GENERATOR), run_name="__main__")
    if not PDF_PATH.read_bytes().startswith(b"%PDF-"):
        raise RuntimeError("generated PDF signature invalid")
    if not DOCX_PATH.read_bytes().startswith(b"PK"):
        raise RuntimeError("generated DOCX signature invalid")
    normalize_docx(DOCX_PATH)
    manifest = write_manifest()
    print(json.dumps(manifest, indent=2, sort_keys=True))


if __name__ == "__main__":
    main()

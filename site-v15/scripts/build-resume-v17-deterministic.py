from __future__ import annotations

import hashlib
import json
import os
import re
import runpy
import shutil
import subprocess
import tempfile
import zipfile
from pathlib import Path

from pypdf import PdfReader, PdfWriter
from pypdf.generic import ArrayObject, ByteStringObject

ROOT = Path(__file__).resolve().parents[1]
SOURCE_GENERATOR = ROOT / "scripts" / "generate-resume-v17.py"
PDF_PATH = ROOT / "downloads" / "Casey_Barton_Resume.pdf"
DOCX_PATH = ROOT / "downloads" / "Casey_Barton_Resume.docx"
MANIFEST_PATH = ROOT / "data" / "resume-artifacts.json"
FIXED_ZIP_TIME = (1980, 1, 1, 0, 0, 0)
FIXED_CORE_TIME = "2026-08-05T00:00:00Z"
FIXED_PDF_DATE = "D:20260805000000+00'00'"


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
    with (
        zipfile.ZipFile(path, "r") as source,
        zipfile.ZipFile(
            temporary,
            "w",
            compression=zipfile.ZIP_DEFLATED,
            compresslevel=9,
        ) as target,
    ):
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


def convert_pdf() -> None:
    with tempfile.TemporaryDirectory(prefix="v17-lo-") as temp:
        temp_path = Path(temp)
        home = temp_path / "home"
        home.mkdir()
        env = os.environ.copy()
        env["HOME"] = str(home)
        command = [
            shutil.which("libreoffice") or shutil.which("soffice") or "libreoffice",
            "--headless",
            "--convert-to",
            "pdf:writer_pdf_Export",
            "--outdir",
            str(temp_path),
            str(DOCX_PATH),
        ]
        subprocess.run(
            command,
            check=True,
            env=env,
            capture_output=True,
        )
        generated = temp_path / f"{DOCX_PATH.stem}.pdf"
        if not generated.exists():
            raise RuntimeError("LibreOffice did not create the resume PDF")
        reader = PdfReader(str(generated))
        writer = PdfWriter()
        writer.clone_document_from_reader(reader)
        writer.add_metadata(
            {
                "/Title": "Casey Barton - Applied AI Systems Architect Resume V17",
                "/Author": "Casey Del Carpio Barton",
                "/Subject": "PSYSOC-X calibrated human and machine-verifiable resume",
                "/Creator": "GlacierEQ V17 deterministic resume builder",
                "/Producer": "GlacierEQ V17 deterministic resume builder",
                "/CreationDate": FIXED_PDF_DATE,
                "/ModDate": FIXED_PDF_DATE,
            }
        )
        fixed_id = bytes.fromhex(
            "56473137524553554d45494e54454c4c4947454e43453230323630383035"
        )
        writer._ID = ArrayObject(
            [ByteStringObject(fixed_id), ByteStringObject(fixed_id)]
        )
        writer.compress_identical_objects(remove_identicals=True, remove_orphans=True)
        with PDF_PATH.open("wb") as output:
            writer.write(output)


def write_manifest() -> dict:
    manifest = {
        "schema": "glaciereq.resume-artifacts.v17",
        "builder": "site-v15/scripts/build-resume-v17-deterministic.py",
        "source_generator": "site-v15/scripts/generate-resume-v17.py",
        "determinism": {
            "docx": "fixed core timestamps, sorted ZIP members, fixed ZIP timestamps",
            "pdf": "LibreOffice visual export rewritten by pypdf with fixed metadata",
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
        json.dumps(manifest, indent=2, sort_keys=True) + "\n", encoding="utf-8"
    )
    return manifest


def main() -> None:
    runpy.run_path(str(SOURCE_GENERATOR), run_name="__main__")
    if not DOCX_PATH.read_bytes().startswith(b"PK"):
        raise RuntimeError("generated DOCX signature invalid")
    normalize_docx(DOCX_PATH)
    convert_pdf()
    if not PDF_PATH.read_bytes().startswith(b"%PDF-"):
        raise RuntimeError("generated PDF signature invalid")
    print(json.dumps(write_manifest(), indent=2, sort_keys=True))


if __name__ == "__main__":
    main()

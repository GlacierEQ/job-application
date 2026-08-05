from pathlib import Path
import runpy

root = Path(__file__).resolve().parents[2]
generator = root / "site-v15/scripts/generate-resume-v17.py"
text = generator.read_text(encoding="utf-8")
replacements = {
    "    sec.top_margin = Inches(0.42)": "    sec.top_margin = Inches(0.34)",
    "    sec.bottom_margin = Inches(0.38)": "    sec.bottom_margin = Inches(0.20)",
    "    p.paragraph_format.space_before = Pt(8)": "    p.paragraph_format.space_before = Pt(5)",
    "    p2.paragraph_format.space_after = Pt(5)": "    p2.paragraph_format.space_after = Pt(3)",
    "    p.paragraph_format.space_after = Pt(1.5)": "    p.paragraph_format.space_after = Pt(1)",
    "    set_cell_margins(boundary.cell(0, 0), 110, 130, 110, 130)": "    set_cell_margins(boundary.cell(0, 0), 65, 120, 65, 120)",
}
for old, new in replacements.items():
    if old not in text:
        raise RuntimeError(f"expected DOCX compaction anchor not found: {old}")
    text = text.replace(old, new)
generator.write_text(text, encoding="utf-8")
runpy.run_path(str(root / ".github/scripts/v17_finalize_artifacts.py"), run_name="__main__")

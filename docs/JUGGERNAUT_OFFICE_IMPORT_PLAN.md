# Juggernaut Office Import Plan
**Exporting This Repository for Microsoft Office / Word / PDF Delivery**

This plan covers how to export the application packet from Markdown (GitHub-native) to Word, PDF, and printable formats suitable for formal submission, email attachment, or in-person delivery.

---

## Why This Matters

Not every application channel accepts a GitHub link. Some companies use ATS (Applicant Tracking Systems) that require `.docx` or `.pdf` uploads. Some contacts prefer an email attachment over a repo link. The Juggernaut plan ensures the polished application packet is always available in any format.

---

## Document Priority for Export

Export these in this order — they cover 90% of formal submission scenarios:

| Priority | Document | Export Format | Use Case |
|---|---|---|---|
| 1 | `RESUME_STRATEGIC.md` | `.docx` + `.pdf` | ATS upload, email attachment |
| 2 | `docs/applications/xai_statement_of_exceptional_work.md` | `.pdf` | Direct submission to xAI |
| 3 | `COVER_LETTERS_CUSTOM.md` | `.docx` | ATS cover letter upload |
| 4 | `TECHNICAL_BRIEF.md` | `.pdf` | Technical screen preparation |
| 5 | `XAI_COLOSSUS_AUDIT.md` | `.pdf` | Deep-dive leave-behind |

---

## Export Methods

### Method 1: Pandoc (Best Quality)

Pandoc converts Markdown to `.docx` and `.pdf` with full formatting preservation.

```bash
# Install pandoc (macOS)
brew install pandoc

# Also install wkhtmltopdf or a LaTeX distribution for PDF output
brew install --cask wkhtmltopdf

# Convert to .docx
pandoc RESUME_STRATEGIC.md -o RESUME_STRATEGIC.docx

# Convert to .pdf
pandoc RESUME_STRATEGIC.md -o RESUME_STRATEGIC.pdf --pdf-engine=wkhtmltopdf

# Batch export all application docs
for f in RESUME_STRATEGIC COVER_LETTER TECHNICAL_BRIEF XAI_COLOSSUS_AUDIT; do
  pandoc ${f}.md -o exports/${f}.pdf --pdf-engine=wkhtmltopdf
done
```

### Method 2: VS Code + Markdown PDF Extension

1. Open the repo in VS Code
2. Install extension: **Markdown PDF** (yzane)
3. Right-click any `.md` file → **Markdown PDF: Export (pdf)**
4. Output lands in the same directory as the source file

Best for: quick one-off exports without terminal setup.

### Method 3: Typora

Typora is a WYSIWYG Markdown editor with native export.

1. Open the `.md` file in Typora
2. File → Export → PDF / Word
3. Adjust page margins to 1 inch before exporting resume/cover letter

Best for: when formatting polish matters (the resume especially).

### Method 4: GitHub → Download → Import

For any document on GitHub:
1. Open the file on GitHub
2. Click **Raw**
3. Save the raw `.md` file
4. Open in Word (File → Open → paste the raw content)
5. Apply a clean Word theme

Best for: quick and dirty, when no other tools are available.

---

## Resume Formatting Standards for .docx Export

When the resume is exported to Word format:

- **Margins:** 0.75" all sides
- **Font:** Calibri 11pt body, Calibri Light 14pt name header
- **Spacing:** 1.0 line spacing, 6pt before section headers
- **Color:** Black only — no accent colors (ATS compatibility)
- **No tables:** ATS systems often fail to parse table-formatted resumes
- **File name:** `Casey_Barton_Resume.pdf` — first+last+Resume, no version numbers, no underscores

---

## Exports Directory

Keep all exported files in a local `exports/` directory (gitignored) to avoid cluttering the repo:

```
exports/
├── Casey_Barton_Resume.pdf
├── Casey_Barton_Resume.docx
├── xAI_Statement_of_Exceptional_Work.pdf
├── Technical_Brief.pdf
├── Cover_Letter_xAI.pdf
└── XAI_Colossus_Audit.pdf
```

Add to `.gitignore`:
```
exports/
*.docx
*.pdf
```

---

## ATS Compatibility Checklist

Before submitting to any ATS portal:

- [ ] Resume is `.pdf` (not `.docx` unless specifically required)
- [ ] File name follows format: `Casey_Barton_Resume.pdf`
- [ ] No images, tables, or columns in the resume (use plain text layout)
- [ ] All dates are in `Month YYYY` or `YYYY` format
- [ ] Contact info is at the top of page 1, not in a header/footer
- [ ] Skills section uses keywords that match the job posting
- [ ] File size is under 5MB

from __future__ import annotations

import hashlib
import json
from pathlib import Path

from docx import Document
from docx.enum.table import WD_CELL_VERTICAL_ALIGNMENT, WD_TABLE_ALIGNMENT
from docx.enum.text import WD_ALIGN_PARAGRAPH, WD_BREAK
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from docx.shared import Inches, Pt, RGBColor
from reportlab.lib import colors

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "downloads"
OUT.mkdir(parents=True, exist_ok=True)
PDF_PATH = OUT / "Casey_Barton_Resume.pdf"
DOCX_PATH = OUT / "Casey_Barton_Resume.docx"

NAVY_HEX = "0B2028"
TEAL_HEX = "087A73"
MINT_HEX = "7DEAD4"
LIGHT_HEX = "EEF6F4"
LIGHT2_HEX = "F7FAF9"
MID_HEX = "D4E4E1"
DARK_HEX = "14232A"
MUTED_HEX = "5B6D75"
AMBER_HEX = "A56600"
AMBER_BG_HEX = "FFF5DE"
WHITE_HEX = "FFFFFF"

NAVY = colors.HexColor(f"#{NAVY_HEX}")
TEAL = colors.HexColor(f"#{TEAL_HEX}")
MINT = colors.HexColor(f"#{MINT_HEX}")
LIGHT = colors.HexColor(f"#{LIGHT_HEX}")
LIGHT2 = colors.HexColor(f"#{LIGHT2_HEX}")
MID = colors.HexColor(f"#{MID_HEX}")
DARK = colors.HexColor(f"#{DARK_HEX}")
MUTED = colors.HexColor(f"#{MUTED_HEX}")
AMBER = colors.HexColor(f"#{AMBER_HEX}")
AMBER_BG = colors.HexColor(f"#{AMBER_BG_HEX}")
WHITE = colors.white

SUMMARY = (
    "Builds the operating layer between model capability and dependable outcomes: explicit authority, "
    "bounded tool use, deterministic evidence, controlled failure, continuity, and completion receipts. "
    "Combines software architecture with scientific measurement, compressed-gas safety, building-system "
    "inspection, and owner-operated field execution."
)

PROOF = [
    ("69/69", "Receipt Router tests"),
    ("166 + 19", "bounded source + memory tests"),
    ("148/148", "Job Application Helix tests"),
    ("0", "external flagship actions"),
]

EXPERIENCE = [
    {
        "org": "GlacierEQ",
        "title": "Founder / Applied AI Systems Builder",
        "period": "Jan 2025-Present",
        "bullets": [
            "Design and implement evidence-bound systems spanning agent orchestration, application intelligence, document and evidence pipelines, memory and continuity, infrastructure governance, and human-machine interfaces.",
            "Convert ambiguous architecture into typed contracts, runnable slices, deterministic tests, explicit refusal behavior, machine-readable facts, and reviewable completion receipts.",
            "Built a public Portfolio Receipt Router that replaced unsupported autonomous-control semantics with a local fail-closed evidence system; 69 of 69 tests passed through direct and reusable CI with zero external actions.",
            "Govern a multi-repository portfolio by separating source presence, review, execution, deployment, authority, and verified completion so recruiter, technical, and machine views cannot drift.",
        ],
    },
    {
        "org": "Diamond Head Home Inspections",
        "title": "Certified Home Inspector",
        "period": "2020-2024",
        "bullets": [
            "Inspected residential structural, roofing, electrical, plumbing, HVAC, moisture, and safety conditions; translated field evidence into clear, decision-ready reports under time constraints.",
            "Developed disciplined habits around uncertainty labeling, defect prioritization, interacting-system analysis, client communication, and avoiding unsupported conclusions.",
        ],
    },
    {
        "org": "Hi-Class Home Services / Hi Class Maintenance Oahu LLC",
        "title": "Owner-Operator, Building Systems & Field Services",
        "period": "2017-Present",
        "bullets": [
            "Scope residential repair and service work, prepare estimates, coordinate execution, and communicate assumptions, constraints, and completion status with clients.",
            "Work across practical building-system problems including minor carpentry, plumbing, electrical fixture replacement, drywall, painting, flooring, and maintenance planning.",
        ],
    },
]

CAPABILITIES = [
    (
        "Agent infrastructure & governance",
        "Multi-agent coordination; MCP and tool contracts; capability/authority separation; approval models; state machines; bounded retries; recovery and closure.",
    ),
    (
        "Evidence & release engineering",
        "Provenance; claim-to-source mapping; deterministic testing; JSON Schema; CI/CD; static analysis; integrity hashing; machine-readable receipts.",
    ),
    (
        "Application & document intelligence",
        "Role research; evidence-qualified resume generation; document extraction; structured artifacts; human and machine presentation layers.",
    ),
    (
        "Primary technology",
        "Python; TypeScript; JavaScript; SQL; Bash; Node.js; React; Next.js; FastAPI; REST; JSON-RPC 2.0; MCP; GitHub Actions; Docker; Vercel.",
    ),
]

SYSTEMS = [
    (
        "Portfolio Receipt Router",
        "TEST VERIFIED",
        "Compatibility-safe architecture repair and evidence routing.",
        "69/69 tests; direct and reusable CI; artifact 8910423397; zero external actions.",
        "Independent technical exhibit; no datacenter control, company affiliation, or production-operation claim.",
    ),
    (
        "Job Application Helix",
        "RECORDED 148/148",
        "Evidence-governed hiring and portfolio orchestration.",
        "148/148 recorded repository tests.",
        "Release-specific current-SHA and deployment gates remain separate.",
    ),
    (
        "Agent Coordinator",
        "RECORDED 62/62",
        "Deterministic task ownership, dependencies, capacity, priority, and shared budgets.",
        "62/62 recorded Python tests.",
        "Hosted matrix and build-wheel promotion remain open.",
    ),
    (
        "Microcode Governance",
        "REVIEWED_EXECUTION_BLOCKED",
        "Firmware manifests, drift, SBOMs, provenance, compatibility policy, and approval-gated rollout planning.",
        "132-check generated contract; static review found no critical defect.",
        "Private CI did not execute; not test verified and performs no firmware mutation.",
    ),
    (
        "PSYSOC-X",
        "BOUNDED TEST SCOPE",
        "Audience calibration across recruiter, master, machine, and relationship views.",
        "Deterministic profile and invariant cases.",
        "No diagnosis, covert persuasion, or manipulation capability is claimed.",
    ),
]

FOUNDATION = [
    (
        "Scientific measurement",
        "University of Hawaii sea-urchin morphometric research, 2016-2017: processed physical measurements of gill structures to support visual species identification.",
    ),
    (
        "Compressed-gas systems",
        "Scuba Tank Technician, Hawaiian Diving Adventures and UH Dive Office, 2016-2017: tank filling, transport, inspection and repair support, and gas mixing under safety-critical procedures.",
    ),
    (
        "Field systems operations",
        "Residential inspection and repair work developed practical judgment around interacting systems, failure consequences, uncertainty, and clear client communication.",
    ),
    (
        "Earlier leadership",
        "Civil Air Patrol Cadet Commander and Search-and-Rescue Ground Team Leader, 2007-2011; historical leadership context, not formal professional management experience.",
    ),
]

BOUNDARY = (
    "Independent GlacierEQ work and bounded technical exhibits. Test counts refer only to their stated repository and scope. "
    "No company affiliation, proprietary access, production use, customer impact, formal people-management experience, "
    "current certification status, or hardware validation is claimed without direct evidence."
)


def shade(cell, fill):
    tcPr = cell._tc.get_or_add_tcPr()
    shd = tcPr.find(qn("w:shd"))
    if shd is None:
        shd = OxmlElement("w:shd")
        tcPr.append(shd)
    shd.set(qn("w:fill"), fill)


def set_cell_border(cell, **kwargs):
    tc = cell._tc
    tcPr = tc.get_or_add_tcPr()
    tcBorders = tcPr.first_child_found_in("w:tcBorders")
    if tcBorders is None:
        tcBorders = OxmlElement("w:tcBorders")
        tcPr.append(tcBorders)
    for edge in ("top", "left", "bottom", "right", "insideH", "insideV"):
        if edge in kwargs:
            edge_data = kwargs.get(edge)
            tag = f"w:{edge}"
            element = tcBorders.find(qn(tag))
            if element is None:
                element = OxmlElement(tag)
                tcBorders.append(element)
            for key in ["sz", "val", "color", "space"]:
                if key in edge_data:
                    element.set(qn(f"w:{key}"), str(edge_data[key]))


def set_cell_margins(cell, top=80, start=100, bottom=80, end=100):
    tc = cell._tc
    tcPr = tc.get_or_add_tcPr()
    tcMar = tcPr.first_child_found_in("w:tcMar")
    if tcMar is None:
        tcMar = OxmlElement("w:tcMar")
        tcPr.append(tcMar)
    for m, v in [("top", top), ("start", start), ("bottom", bottom), ("end", end)]:
        node = tcMar.find(qn(f"w:{m}"))
        if node is None:
            node = OxmlElement(f"w:{m}")
            tcMar.append(node)
        node.set(qn("w:w"), str(v))
        node.set(qn("w:type"), "dxa")


def no_cell_spacing(table):
    tblPr = table._tbl.tblPr
    spacing = tblPr.find(qn("w:tblCellSpacing"))
    if spacing is None:
        spacing = OxmlElement("w:tblCellSpacing")
        tblPr.append(spacing)
    spacing.set(qn("w:w"), "0")
    spacing.set(qn("w:type"), "dxa")


def keep_with_next(p, value=True):
    pPr = p._p.get_or_add_pPr()
    node = pPr.find(qn("w:keepNext"))
    if value and node is None:
        pPr.append(OxmlElement("w:keepNext"))
    elif not value and node is not None:
        pPr.remove(node)


def keep_together(p, value=True):
    pPr = p._p.get_or_add_pPr()
    node = pPr.find(qn("w:keepLines"))
    if value and node is None:
        pPr.append(OxmlElement("w:keepLines"))
    elif not value and node is not None:
        pPr.remove(node)


def set_repeat_table_header(row):
    trPr = row._tr.get_or_add_trPr()
    tblHeader = OxmlElement("w:tblHeader")
    tblHeader.set(qn("w:val"), "true")
    trPr.append(tblHeader)


def add_hyperlink(
    paragraph, text, url, color="FFFFFF", underline=False, bold=False, size=8.5
):
    part = paragraph.part
    r_id = part.relate_to(
        url,
        "http://schemas.openxmlformats.org/officeDocument/2006/relationships/hyperlink",
        is_external=True,
    )
    hyperlink = OxmlElement("w:hyperlink")
    hyperlink.set(qn("r:id"), r_id)
    new_run = OxmlElement("w:r")
    rPr = OxmlElement("w:rPr")
    c = OxmlElement("w:color")
    c.set(qn("w:val"), color)
    rPr.append(c)
    if bold:
        b = OxmlElement("w:b")
        rPr.append(b)
    if underline:
        u = OxmlElement("w:u")
        u.set(qn("w:val"), "single")
        rPr.append(u)
    else:
        u = OxmlElement("w:u")
        u.set(qn("w:val"), "none")
        rPr.append(u)
    sz = OxmlElement("w:sz")
    sz.set(qn("w:val"), str(int(size * 2)))
    rPr.append(sz)
    szcs = OxmlElement("w:szCs")
    szcs.set(qn("w:val"), str(int(size * 2)))
    rPr.append(szcs)
    new_run.append(rPr)
    t = OxmlElement("w:t")
    t.text = text
    new_run.append(t)
    hyperlink.append(new_run)
    paragraph._p.append(hyperlink)
    return hyperlink


def add_run(
    p, text, *, bold=False, color=None, size=None, italic=False, all_caps=False
):
    r = p.add_run(text.upper() if all_caps else text)
    r.bold = bold
    r.italic = italic
    if color:
        r.font.color.rgb = RGBColor.from_string(color)
    if size:
        r.font.size = Pt(size)
    r.font.name = "Aptos"
    r._element.rPr.rFonts.set(qn("w:eastAsia"), "Aptos")
    return r


def set_paragraph(
    p, *, space_before=0, space_after=0, line=1.0, left=0, right=0, keep=False
):
    f = p.paragraph_format
    f.space_before = Pt(space_before)
    f.space_after = Pt(space_after)
    f.line_spacing = line
    f.left_indent = Inches(left) if left else None
    f.right_indent = Inches(right) if right else None
    if keep:
        keep_with_next(p)
        keep_together(p)


def section_heading(doc, text):
    p = doc.add_paragraph()
    set_paragraph(p, space_before=6, space_after=3, keep=True)
    add_run(p, text, bold=True, color=TEAL_HEX, size=12.2, all_caps=True)
    pPr = p._p.get_or_add_pPr()
    pbdr = OxmlElement("w:pBdr")
    bottom = OxmlElement("w:bottom")
    bottom.set(qn("w:val"), "single")
    bottom.set(qn("w:sz"), "10")
    bottom.set(qn("w:space"), "2")
    bottom.set(qn("w:color"), TEAL_HEX)
    pbdr.append(bottom)
    pPr.append(pbdr)
    return p


def bullet(doc, text, *, size=9.25, indent=0.17, hanging=0.14, after=0.4):
    p = doc.add_paragraph(style="List Bullet")
    p.paragraph_format.left_indent = Inches(indent)
    p.paragraph_format.first_line_indent = Inches(-hanging)
    p.paragraph_format.space_after = Pt(after)
    p.paragraph_format.line_spacing = 1.0
    r = p.add_run(text)
    r.font.name = "Aptos"
    r._element.rPr.rFonts.set(qn("w:eastAsia"), "Aptos")
    r.font.size = Pt(size)
    r.font.color.rgb = RGBColor.from_string(DARK_HEX)
    keep_together(p)
    return p


def role_header(doc, org, title, period, location="Honolulu, Hawaii"):
    table = doc.add_table(rows=1, cols=2)
    table.alignment = WD_TABLE_ALIGNMENT.CENTER
    table.autofit = False
    table.columns[0].width = Inches(5.9)
    table.columns[1].width = Inches(1.65)
    no_cell_spacing(table)
    left, right = table.rows[0].cells
    for c in (left, right):
        set_cell_margins(c, top=30, bottom=15, start=0, end=0)
        set_cell_border(c, bottom={"val": "nil"})
    p = left.paragraphs[0]
    set_paragraph(p, space_after=0)
    add_run(p, org, bold=True, color=DARK_HEX, size=10.7)
    add_run(p, " | ", color=MUTED_HEX, size=10.5)
    add_run(p, title, bold=True, color=TEAL_HEX, size=10.3)
    p2 = right.paragraphs[0]
    p2.alignment = WD_ALIGN_PARAGRAPH.RIGHT
    set_paragraph(p2, space_after=0)
    add_run(p2, period, bold=True, color=MUTED_HEX, size=8.7)
    lp = doc.add_paragraph()
    set_paragraph(lp, space_after=1)
    add_run(lp, location, italic=True, color=MUTED_HEX, size=8.6)
    return table


def add_label_value(
    cell, label, value, label_color=TEAL_HEX, value_color=DARK_HEX, value_size=8.35
):
    p = cell.add_paragraph()
    set_paragraph(p, space_after=1)
    add_run(p, label, bold=True, color=label_color, size=7.25, all_caps=True)
    p2 = cell.add_paragraph()
    set_paragraph(p2, space_after=2, line=1.02)
    add_run(p2, value, color=value_color, size=value_size)


def set_doc_core(doc):
    sec = doc.sections[0]
    sec.page_width = Inches(8.5)
    sec.page_height = Inches(11)
    sec.top_margin = Inches(0.42)
    sec.bottom_margin = Inches(0.45)
    sec.left_margin = Inches(0.48)
    sec.right_margin = Inches(0.48)
    sec.header_distance = Inches(0.15)
    sec.footer_distance = Inches(0.25)
    styles = doc.styles
    styles["Normal"].font.name = "Aptos"
    styles["Normal"]._element.rPr.rFonts.set(qn("w:eastAsia"), "Aptos")
    styles["Normal"].font.size = Pt(9.2)
    styles["Normal"].font.color.rgb = RGBColor.from_string(DARK_HEX)
    styles["Normal"].paragraph_format.space_after = Pt(0)
    styles["List Bullet"].font.name = "Aptos"
    styles["List Bullet"]._element.rPr.rFonts.set(qn("w:eastAsia"), "Aptos")
    # Metadata
    cp = doc.core_properties
    cp.title = "Casey Barton - Applied AI Systems Architect Resume V17"
    cp.subject = "PSYSOC-X calibrated executive resume with machine-verifiable evidence boundaries"
    cp.author = "Casey Del Carpio Barton"
    cp.keywords = "Applied AI Systems Architect, Agent Infrastructure, MCP, multi-agent systems, evidence governance, deterministic validation, Python, TypeScript, Forward-Deployed AI"
    cp.comments = "Generated from a canonical evidence-bound resume model; claims are scoped to stated receipts."


def add_footer(sec):
    footer = sec.footer
    p = footer.paragraphs[0]
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    set_paragraph(p, space_before=0, space_after=0)
    add_run(
        p,
        "CASEY BARTON  |  PSYSOC-X V17 RESUME INTELLIGENCE  |  HUMAN SIGNAL + MACHINE-VERIFIABLE FACTS",
        bold=True,
        color=MUTED_HEX,
        size=6.9,
    )


def make_docx() -> None:
    doc = Document()
    set_doc_core(doc)

    # HEADER BAND
    header = doc.add_table(rows=1, cols=2)
    header.alignment = WD_TABLE_ALIGNMENT.CENTER
    header.autofit = False
    header.columns[0].width = Inches(5.55)
    header.columns[1].width = Inches(2.0)
    no_cell_spacing(header)
    left, right = header.rows[0].cells
    for c in (left, right):
        shade(c, NAVY_HEX)
        set_cell_margins(c, top=125, bottom=115, start=115, end=115)
        set_cell_border(
            c,
            top={"val": "nil"},
            left={"val": "nil"},
            right={"val": "nil"},
            bottom={"val": "nil"},
        )
    left.vertical_alignment = WD_CELL_VERTICAL_ALIGNMENT.CENTER
    right.vertical_alignment = WD_CELL_VERTICAL_ALIGNMENT.CENTER
    p = left.paragraphs[0]
    set_paragraph(p, space_after=2)
    add_run(p, "CASEY DEL CARPIO BARTON", bold=True, color=WHITE_HEX, size=20.5)
    p = left.add_paragraph()
    set_paragraph(p, space_after=2)
    add_run(p, "APPLIED AI SYSTEMS ARCHITECT", bold=True, color=MINT_HEX, size=10.5)
    add_run(p, "  |  Agent Infrastructure Engineer", color="D7E4E7", size=9.0)
    p = left.add_paragraph()
    set_paragraph(p, space_after=0)
    add_run(
        p,
        "Forward-Deployed AI  |  Evidence-bound execution for ambitious systems and high-consequence decisions.",
        color="C1D1D5",
        size=8.15,
    )
    p = right.paragraphs[0]
    p.alignment = WD_ALIGN_PARAGRAPH.RIGHT
    set_paragraph(p, space_after=1)
    add_run(p, "Honolulu, Hawaii", bold=True, color=WHITE_HEX, size=9.4)
    p = right.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.RIGHT
    set_paragraph(p, space_after=0)
    add_hyperlink(p, "808-936-5654", "tel:+18089365654", color="D7E4E7", size=8.4)
    add_run(p, "\n", size=1)
    add_hyperlink(
        p,
        "glacier.equilibrium@gmail.com",
        "mailto:glacier.equilibrium@gmail.com",
        color="D7E4E7",
        size=8.4,
    )
    add_run(p, "\n", size=1)
    add_hyperlink(
        p,
        "casey-barton-glaciereq.vercel.app",
        "https://casey-barton-glaciereq.vercel.app/",
        color="D7E4E7",
        size=8.4,
    )
    add_run(p, "\n", size=1)
    add_hyperlink(
        p,
        "github.com/GlacierEQ",
        "https://github.com/GlacierEQ",
        color="D7E4E7",
        size=8.4,
    )

    # EXECUTIVE SIGNAL
    signal = doc.add_table(rows=1, cols=1)
    signal.alignment = WD_TABLE_ALIGNMENT.CENTER
    no_cell_spacing(signal)
    c = signal.cell(0, 0)
    shade(c, LIGHT_HEX)
    set_cell_margins(c, top=75, bottom=75, start=90, end=90)
    set_cell_border(
        c,
        top={"val": "single", "sz": "8", "color": TEAL_HEX},
        bottom={"val": "single", "sz": "8", "color": TEAL_HEX},
        left={"val": "single", "sz": "2", "color": MID_HEX},
        right={"val": "single", "sz": "2", "color": MID_HEX},
    )
    p = c.paragraphs[0]
    set_paragraph(p, space_after=2)
    add_run(p, "EXECUTIVE SIGNAL", bold=True, color=TEAL_HEX, size=8.2, all_caps=True)
    p = c.add_paragraph()
    set_paragraph(p, space_after=0, line=1.06)
    add_run(
        p,
        "Builds the operating layer between model capability and dependable outcomes: explicit authority, bounded tool use, deterministic evidence, controlled failure, continuity, and completion receipts. Combines software architecture with scientific measurement, compressed-gas safety, building-system inspection, and owner-operated field execution.",
        color=DARK_HEX,
        size=9.7,
    )

    # METRICS
    metrics = doc.add_table(rows=1, cols=4)
    metrics.alignment = WD_TABLE_ALIGNMENT.CENTER
    metrics.autofit = False
    no_cell_spacing(metrics)
    for idx, (num, label) in enumerate(
        [
            ("69/69", "Receipt Router tests"),
            ("166 + 19", "Bounded source + memory tests"),
            ("148/148", "Job Application Helix tests"),
            ("0", "External actions in flagship verification"),
        ]
    ):
        cell = metrics.cell(0, idx)
        shade(cell, LIGHT2_HEX if idx % 2 == 0 else LIGHT_HEX)
        set_cell_margins(cell, top=65, bottom=65, start=40, end=40)
        set_cell_border(
            cell,
            top={"val": "single", "sz": "2", "color": MID_HEX},
            bottom={"val": "single", "sz": "2", "color": MID_HEX},
            left={"val": "single", "sz": "2", "color": MID_HEX},
            right={"val": "single", "sz": "2", "color": MID_HEX},
        )
        p = cell.paragraphs[0]
        p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        set_paragraph(p, space_after=1)
        add_run(p, num, bold=True, color=TEAL_HEX, size=15.8)
        p = cell.add_paragraph()
        p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        set_paragraph(p, space_after=0, line=0.95)
        add_run(p, label, color=MUTED_HEX, size=7.5)

    section_heading(doc, "Professional Experience")
    role_header(
        doc, "GlacierEQ", "Founder / Applied AI Systems Builder", "Jan 2025-Present"
    )
    for t in [
        "Design and implement evidence-bound systems spanning agent orchestration, application intelligence, document and evidence pipelines, memory and continuity, infrastructure governance, and human-machine interfaces.",
        "Convert ambiguous architecture into typed contracts, runnable slices, deterministic tests, explicit refusal behavior, machine-readable facts, and reviewable completion receipts.",
        "Built a public Portfolio Receipt Router that replaced unsupported autonomous-control semantics with a local fail-closed evidence system; 69 of 69 tests passed through direct and reusable CI with zero external actions.",
        "Govern a multi-repository portfolio by separating source presence, review, execution, deployment, authority, and verified completion so recruiter, technical, and machine views cannot drift.",
    ]:
        bullet(doc, t, size=9.0)

    role_header(
        doc, "Diamond Head Home Inspections", "Certified Home Inspector", "2020-2024"
    )
    for t in [
        "Inspected residential structural, roofing, electrical, plumbing, HVAC, moisture, and safety conditions; translated field evidence into clear, decision-ready reports under time constraints.",
        "Developed disciplined habits around uncertainty labeling, defect prioritization, interacting-system analysis, client communication, and avoiding unsupported conclusions.",
    ]:
        bullet(doc, t, size=9.0)

    role_header(
        doc,
        "Hi-Class Home Services / Hi Class Maintenance Oahu LLC",
        "Owner-Operator, Building Systems & Field Services",
        "2017-Present",
    )
    for t in [
        "Scope residential repair and service work, prepare estimates, coordinate execution, and communicate assumptions, constraints, and completion status with clients.",
        "Work across practical building-system problems including minor carpentry, plumbing, electrical fixture replacement, drywall, painting, flooring, and maintenance planning.",
    ]:
        bullet(doc, t, size=9.0)

    section_heading(doc, "Core Capability Matrix")
    cap = doc.add_table(rows=2, cols=2)
    cap.alignment = WD_TABLE_ALIGNMENT.CENTER
    cap.autofit = False
    no_cell_spacing(cap)
    cap_data = [
        (
            "Agent infrastructure & governance",
            "Multi-agent coordination; MCP and tool contracts; capability/authority separation; approval models; state machines; bounded retries; recovery and closure.",
        ),
        (
            "Evidence & release engineering",
            "Provenance; claim-to-source mapping; deterministic testing; JSON Schema; CI/CD; static analysis; integrity hashing; machine-readable receipts.",
        ),
        (
            "Application & document intelligence",
            "Role research; evidence-qualified resume generation; document extraction; structured artifacts; human and machine presentation layers.",
        ),
        (
            "Primary technology",
            "Python; TypeScript; JavaScript; SQL; Bash; Node.js; React; Next.js; FastAPI; REST; JSON-RPC 2.0; MCP; GitHub Actions; Docker; Vercel.",
        ),
    ]
    for i, (label, value) in enumerate(cap_data):
        cell = cap.cell(i // 2, i % 2)
        shade(cell, LIGHT2_HEX if i % 3 else LIGHT_HEX)
        set_cell_margins(cell, top=65, bottom=65, start=80, end=80)
        set_cell_border(
            cell,
            top={"val": "single", "sz": "2", "color": MID_HEX},
            bottom={"val": "single", "sz": "2", "color": MID_HEX},
            left={"val": "single", "sz": "2", "color": MID_HEX},
            right={"val": "single", "sz": "2", "color": MID_HEX},
        )
        p = cell.paragraphs[0]
        set_paragraph(p, space_after=2)
        add_run(p, label, bold=True, color=TEAL_HEX, size=8.3)
        p = cell.add_paragraph()
        set_paragraph(p, space_after=0, line=1.0)
        add_run(p, value, color=DARK_HEX, size=7.8)

    # page break
    p = doc.add_paragraph()
    p.add_run().add_break(WD_BREAK.PAGE)

    section_heading(doc, "Selected Systems and Evidence States")
    sys_table = doc.add_table(rows=5, cols=2)
    sys_table.alignment = WD_TABLE_ALIGNMENT.CENTER
    sys_table.autofit = False
    no_cell_spacing(sys_table)
    sys_table.columns[0].width = Inches(3.9)
    sys_table.columns[1].width = Inches(3.65)
    systems = [
        (
            "Portfolio Receipt Router",
            "TEST VERIFIED",
            "Compatibility-safe architecture repair and evidence routing.",
            "69/69 tests; direct and reusable CI; artifact 8910423397; zero external actions.",
            "Independent technical exhibit; no datacenter control, company affiliation, or production-operation claim.",
        ),
        (
            "Job Application Helix",
            "RECORDED 148/148",
            "Evidence-governed hiring and portfolio orchestration.",
            "148/148 recorded repository tests.",
            "Release-specific current-SHA and deployment gates remain separate.",
        ),
        (
            "Agent Coordinator",
            "RECORDED 62/62",
            "Deterministic task ownership, dependencies, capacity, priority, and shared budgets.",
            "62/62 recorded Python tests.",
            "Hosted matrix and build-wheel promotion remain open.",
        ),
        (
            "Microcode Governance",
            "REVIEWED - EXECUTION BLOCKED",
            "Firmware manifests, drift, SBOMs, provenance, compatibility policy, and approval-gated rollout planning.",
            "132-check generated contract; static review found no critical defect.",
            "Private CI did not execute; not test verified and performs no firmware mutation.",
        ),
        (
            "PSYSOC-X",
            "BOUNDED TEST SCOPE",
            "Audience calibration across recruiter, master, machine, and relationship views.",
            "Deterministic profile and invariant cases.",
            "No diagnosis, covert persuasion, or manipulation capability is claimed.",
        ),
    ]
    for i, (name, state, summary, evidence, boundary) in enumerate(systems):
        left, right = sys_table.rows[i].cells
        for cell in (left, right):
            shade(cell, LIGHT_HEX if i % 2 == 0 else LIGHT2_HEX)
            set_cell_margins(cell, top=65, bottom=65, start=65, end=65)
            set_cell_border(
                cell,
                top={"val": "single", "sz": "2", "color": MID_HEX},
                bottom={"val": "single", "sz": "2", "color": MID_HEX},
                left={"val": "single", "sz": "2", "color": MID_HEX},
                right={"val": "single", "sz": "2", "color": MID_HEX},
            )
            cell.vertical_alignment = WD_CELL_VERTICAL_ALIGNMENT.TOP
        p = left.paragraphs[0]
        set_paragraph(p, space_after=1)
        add_run(p, name, bold=True, color=DARK_HEX, size=10.2)
        p = left.add_paragraph()
        set_paragraph(p, space_after=2)
        add_run(
            p,
            state,
            bold=True,
            color=AMBER_HEX if "BLOCKED" in state else TEAL_HEX,
            size=7.3,
        )
        p = left.add_paragraph()
        set_paragraph(p, space_after=0, line=1.0)
        add_run(p, summary, color=DARK_HEX, size=8.25)
        add_label_value(
            right, "Evidence", evidence, label_color=TEAL_HEX, value_size=8.05
        )
        add_label_value(
            right,
            "Boundary",
            boundary,
            label_color=AMBER_HEX,
            value_color=MUTED_HEX,
            value_size=7.9,
        )

    section_heading(doc, "Cross-Domain Systems Foundation")
    found = doc.add_table(rows=4, cols=2)
    found.alignment = WD_TABLE_ALIGNMENT.CENTER
    found.autofit = False
    no_cell_spacing(found)
    found.columns[0].width = Inches(2.1)
    found.columns[1].width = Inches(5.45)
    found_data = [
        (
            "Scientific measurement",
            "University of Hawaii sea-urchin morphometric research, 2016-2017: processed physical measurements of gill structures to support visual species identification.",
        ),
        (
            "Compressed-gas systems",
            "Scuba Tank Technician, Hawaiian Diving Adventures and UH Dive Office, 2016-2017: tank filling, transport, inspection and repair support, and gas mixing under safety-critical procedures.",
        ),
        (
            "Field systems operations",
            "Residential inspection and repair work developed practical judgment around interacting systems, failure consequences, uncertainty, and clear client communication.",
        ),
        (
            "Earlier leadership",
            "Civil Air Patrol Cadet Commander and Search-and-Rescue Ground Team Leader, 2007-2011; included as historical leadership context, not as formal professional management experience.",
        ),
    ]
    for i, (label, value) in enumerate(found_data):
        c1, c2 = found.rows[i].cells
        for c in (c1, c2):
            shade(c, LIGHT_HEX if i % 2 == 0 else LIGHT2_HEX)
            set_cell_margins(c, top=55, bottom=55, start=65, end=65)
            set_cell_border(
                c,
                top={"val": "single", "sz": "2", "color": MID_HEX},
                bottom={"val": "single", "sz": "2", "color": MID_HEX},
                left={"val": "single", "sz": "2", "color": MID_HEX},
                right={"val": "single", "sz": "2", "color": MID_HEX},
            )
        p = c1.paragraphs[0]
        set_paragraph(p, space_after=0)
        add_run(p, label, bold=True, color=TEAL_HEX, size=8.3)
        p = c2.paragraphs[0]
        set_paragraph(p, space_after=0, line=1.0)
        add_run(p, value, color=DARK_HEX, size=8.15)

    section_heading(doc, "Education and Earlier Technical Credentials")
    edu = doc.add_table(rows=2, cols=2)
    edu.alignment = WD_TABLE_ALIGNMENT.CENTER
    edu.autofit = False
    no_cell_spacing(edu)
    edu.columns[0].width = Inches(4.8)
    edu.columns[1].width = Inches(2.75)
    for i, (school, credential) in enumerate(
        [
            ("University of Hawaii at Manoa", "B.S., Marine Biology - 2016"),
            (
                "AWS Cloud Institute",
                "Cloud Application Developer program - 2025-2026, in progress",
            ),
        ]
    ):
        c1, c2 = edu.rows[i].cells
        for c in (c1, c2):
            set_cell_margins(c, top=35, bottom=35, start=20, end=20)
            set_cell_border(c, bottom={"val": "nil"})
        p = c1.paragraphs[0]
        set_paragraph(p, space_after=0)
        add_run(p, school, bold=True, color=DARK_HEX, size=9.0)
        p = c2.paragraphs[0]
        p.alignment = WD_ALIGN_PARAGRAPH.RIGHT
        set_paragraph(p, space_after=0)
        add_run(p, credential, color=MUTED_HEX, size=8.5)

    p = doc.add_paragraph()
    set_paragraph(p, space_before=4, space_after=4, line=1.0)
    add_run(
        p,
        "Earlier technical certifications recorded in prior resumes: ",
        bold=True,
        color=TEAL_HEX,
        size=7.85,
    )
    add_run(
        p,
        "PSI Visual Cylinder Inspector, Eddy Current Technician, Valve Repair Technician, Oxygen Cleaning Cylinder Technician; NAUI Rescue and Master Diver; PADI Enriched Air Diver. Current status is not represented as active without updated documentation.",
        color=MUTED_HEX,
        size=7.7,
    )

    # evidence boundary box
    box = doc.add_table(rows=1, cols=1)
    box.alignment = WD_TABLE_ALIGNMENT.CENTER
    no_cell_spacing(box)
    c = box.cell(0, 0)
    shade(c, AMBER_BG_HEX)
    set_cell_margins(c, top=65, bottom=65, start=75, end=75)
    set_cell_border(
        c,
        top={"val": "single", "sz": "4", "color": "E5B34B"},
        bottom={"val": "single", "sz": "4", "color": "E5B34B"},
        left={"val": "single", "sz": "2", "color": "F2D99A"},
        right={"val": "single", "sz": "2", "color": "F2D99A"},
    )
    p = c.paragraphs[0]
    set_paragraph(p, space_after=0, line=1.0)
    add_run(p, "EVIDENCE BOUNDARY  ", bold=True, color=AMBER_HEX, size=8.0)
    add_run(
        p,
        "Independent GlacierEQ work and bounded technical exhibits. Test counts refer only to their stated repository and scope. No company affiliation, proprietary access, production use, customer impact, formal people-management experience, current certification status, or hardware validation is claimed without direct evidence.",
        color=DARK_HEX,
        size=7.9,
    )

    # Save and scrub metadata later
    for sec in doc.sections:
        add_footer(sec)
    doc.save(DOCX_PATH)


def main() -> None:
    make_docx()
    if not DOCX_PATH.read_bytes().startswith(b"PK"):
        raise RuntimeError("DOCX signature invalid")
    print(
        json.dumps(
            {
                "docx": {
                    "bytes": DOCX_PATH.stat().st_size,
                    "sha256": hashlib.sha256(DOCX_PATH.read_bytes()).hexdigest(),
                },
                "pdf": {
                    "mode": "committed visual export; identity bound by resume-artifacts.json"
                },
            },
            indent=2,
            sort_keys=True,
        )
    )


if __name__ == "__main__":
    main()

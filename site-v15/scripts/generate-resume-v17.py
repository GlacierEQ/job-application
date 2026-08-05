from __future__ import annotations

import hashlib
import json
from pathlib import Path

from docx import Document
from docx.enum.table import WD_CELL_VERTICAL_ALIGNMENT, WD_TABLE_ALIGNMENT
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from docx.shared import Inches, Pt, RGBColor
from reportlab.lib import colors
from reportlab.lib.enums import TA_LEFT
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import inch
from reportlab.platypus import (
    BaseDocTemplate,
    Frame,
    PageBreak,
    PageTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
)

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "downloads"
OUT.mkdir(parents=True, exist_ok=True)
PDF_PATH = OUT / "Casey_Barton_Resume.pdf"
DOCX_PATH = OUT / "Casey_Barton_Resume.docx"
MANIFEST_PATH = ROOT / "data" / "resume-artifacts.json"

INK = colors.HexColor("#12272D")
TEAL = colors.HexColor("#0D766C")
DARK = colors.HexColor("#071B21")
DARK_2 = colors.HexColor("#0D3A3C")
MINT = colors.HexColor("#B8F5DF")
PALE = colors.HexColor("#EDF6F3")
LINE = colors.HexColor("#D4E3E0")
MUTED = colors.HexColor("#536A6D")
AMBER = colors.HexColor("#9A6500")
AMBER_BG = colors.HexColor("#FFF6E3")
WHITE = colors.white

SUMMARY = (
    "Applied AI systems architect who builds the operating layer around model capability: "
    "task ownership, tool contracts, authority, evidence states, controlled failure, persistence, "
    "and completion receipts. Brings cross-domain discipline from software engineering, residential "
    "systems inspection, scientific measurement, field operations, and compressed-gas safety."
)

PROOF = [
    ("69/69", "Receipt Router tests"),
    ("166 + 19", "source + memory tests"),
    ("148/148", "Helix tests recorded"),
    ("0", "external flagship actions"),
]

PROJECTS = [
    {
        "name": "Portfolio Receipt Router",
        "state": "TEST VERIFIED",
        "text": "Replaced unsupported autonomous-control semantics with a local, fail-closed evidence router while preserving compatibility.",
        "proof": "69/69 tests; two CI paths; artifact 8910423397; zero external actions.",
    },
    {
        "name": "Job Application Helix",
        "state": "148/148 RECORDED",
        "text": "Evidence-governed hiring and portfolio orchestration across role research, source quality, claim calibration, package state, and follow-up.",
        "proof": "Recorded repository tests; current release and deployment gates remain distinct.",
    },
    {
        "name": "Agent Coordinator",
        "state": "62/62 RECORDED",
        "text": "Deterministic task ownership, dependency order, capacity, stable priority, shared budgets, and explicit refusal.",
        "proof": "Recorded Python tests; hosted promotion remains a separate state.",
    },
    {
        "name": "Microcode Governance",
        "state": "EXECUTION BLOCKED",
        "text": "Firmware manifests, drift, SBOMs, provenance, compatibility policy, and approval-gated rollout planning.",
        "proof": "Reviewed; private CI failed before runner execution; not represented as test verified.",
    },
]

EXPERIENCE = [
    (
        "GlacierEQ",
        "Founder / Applied AI Systems Builder",
        "Jan 2025-Present",
        [
            "Design and implement evidence-bound systems spanning agent orchestration, application intelligence, document and evidence pipelines, memory and continuity, infrastructure governance, and human-machine interfaces.",
            "Convert ambiguous architectures into typed contracts, runnable slices, deterministic tests, explicit refusal behavior, machine-readable facts, and reviewable completion receipts.",
            "Govern a multi-repository portfolio by separating source presence, review, execution, deployment, authority, and verified completion so recruiter, technical, and machine views cannot drift.",
            "Use AI-assisted development as an inspectable engineering process combining source review, bounded generation, adversarial checking, deterministic validation, and human judgment.",
        ],
    ),
    (
        "Diamond Head Home Inspections",
        "Certified Home Inspector",
        "2020-2024",
        [
            "Inspected residential systems and translated field observations into clear, decision-ready reports under time constraints.",
            "Applied disciplined evidence capture, uncertainty labeling, defect prioritization, interacting-system analysis, and plain-language communication.",
            "Developed the operating habit now used in software architecture: observe first, distinguish symptom from cause, test the boundary, and avoid unsupported conclusions.",
        ],
    ),
    (
        "Hi-Class Home Services / Hi Class Maintenance Oahu LLC",
        "Owner-Operator, Building Systems and Field Services",
        "2017-Present",
        [
            "Scope residential repair and service work, prepare estimates, coordinate field execution, and communicate constraints and completion status with clients.",
            "Work across practical building-system problems including minor carpentry, plumbing, electrical fixture replacement, drywall, painting, flooring, and maintenance planning.",
            "Translate incomplete real-world requirements into bounded work packages, explicit assumptions, and usable closeout artifacts.",
        ],
    ),
]

DOMAINS = [
    (
        "SCIENTIFIC MEASUREMENT",
        "Sea-urchin morphometric research",
        "University of Hawaii, 2016-2017. Processed physical measurements of gill structures to support visual species identification.",
    ),
    (
        "COMPRESSED-GAS SYSTEMS",
        "Scuba Tank Technician",
        "Hawaiian Diving Adventures and UH Dive Office, 2016-2017. Tank filling, transport, inspection and repair support, and gas mixing under safety-critical procedures.",
    ),
    (
        "FIELD SYSTEMS",
        "Inspection and repair operations",
        "Practical judgment around interacting systems, uncertainty, failure consequences, client communication, and closeout quality.",
    ),
]

CAPABILITIES = [
    (
        "Architecture",
        "Agent infrastructure, multi-agent coordination, application intelligence, authority and approval models, state machines, event design, idempotency, failure and recovery, human-in-the-loop systems.",
    ),
    (
        "Evidence and delivery",
        "Provenance, claim-to-source mapping, deterministic testing, JSON Schema, CI/CD, static analysis, dependency auditing, integrity hashing, release receipts, and machine-readable interfaces.",
    ),
    (
        "Primary technology",
        "Python, TypeScript, JavaScript, SQL, Bash, Node.js, React, Next.js, FastAPI, REST, JSON-RPC 2.0, MCP, GitHub Actions, Docker, and Vercel. Prior scientific computing: R and MATLAB.",
    ),
]

BOUNDARY = (
    "Independent GlacierEQ work and bounded technical exhibits. Test counts refer only to their stated repository and scope. "
    "No company affiliation, proprietary access, production use, customer impact, formal people-management experience, "
    "current certification status, or hardware validation is claimed without direct evidence."
)


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def pdf_styles():
    s = getSampleStyleSheet()
    return {
        "name": ParagraphStyle(
            "name",
            parent=s["Normal"],
            fontName="Helvetica-Bold",
            fontSize=28,
            leading=29,
            textColor=WHITE,
            spaceAfter=5,
        ),
        "title": ParagraphStyle(
            "title",
            parent=s["Normal"],
            fontName="Helvetica-Bold",
            fontSize=10.2,
            leading=13,
            textColor=MINT,
        ),
        "contact": ParagraphStyle(
            "contact",
            parent=s["Normal"],
            fontName="Helvetica",
            fontSize=7.7,
            leading=10.2,
            textColor=colors.HexColor("#D4E6E2"),
        ),
        "section": ParagraphStyle(
            "section",
            parent=s["Normal"],
            fontName="Helvetica-Bold",
            fontSize=12.4,
            leading=14,
            textColor=INK,
            spaceBefore=5,
            spaceAfter=6,
        ),
        "tag": ParagraphStyle(
            "tag",
            parent=s["Normal"],
            fontName="Helvetica-Bold",
            fontSize=6.3,
            leading=8,
            textColor=TEAL,
            spaceAfter=3,
        ),
        "body": ParagraphStyle(
            "body",
            parent=s["Normal"],
            fontName="Helvetica",
            fontSize=8.15,
            leading=11.1,
            textColor=INK,
        ),
        "small": ParagraphStyle(
            "small",
            parent=s["Normal"],
            fontName="Helvetica",
            fontSize=7.1,
            leading=9.5,
            textColor=MUTED,
        ),
        "card_title": ParagraphStyle(
            "card_title",
            parent=s["Normal"],
            fontName="Helvetica-Bold",
            fontSize=9,
            leading=10.5,
            textColor=INK,
            spaceAfter=4,
        ),
        "card_state": ParagraphStyle(
            "card_state",
            parent=s["Normal"],
            fontName="Helvetica-Bold",
            fontSize=5.8,
            leading=7,
            textColor=TEAL,
            spaceAfter=5,
        ),
        "metric": ParagraphStyle(
            "metric",
            parent=s["Normal"],
            fontName="Helvetica-Bold",
            fontSize=16.5,
            leading=17,
            textColor=MINT,
            alignment=TA_LEFT,
        ),
        "metric_label": ParagraphStyle(
            "metric_label",
            parent=s["Normal"],
            fontName="Helvetica",
            fontSize=6.5,
            leading=8,
            textColor=colors.HexColor("#D8E8E5"),
        ),
        "role": ParagraphStyle(
            "role",
            parent=s["Normal"],
            fontName="Helvetica-Bold",
            fontSize=8.6,
            leading=10,
            textColor=INK,
        ),
        "date": ParagraphStyle(
            "date",
            parent=s["Normal"],
            fontName="Helvetica-Bold",
            fontSize=7.2,
            leading=9,
            textColor=TEAL,
            alignment=TA_LEFT,
        ),
        "bullet": ParagraphStyle(
            "bullet",
            parent=s["Normal"],
            fontName="Helvetica",
            fontSize=7.6,
            leading=10.3,
            leftIndent=10,
            firstLineIndent=-7,
            bulletIndent=0,
            textColor=INK,
        ),
        "boundary": ParagraphStyle(
            "boundary",
            parent=s["Normal"],
            fontName="Helvetica",
            fontSize=6.7,
            leading=9,
            textColor=colors.HexColor("#5F5032"),
        ),
    }


def make_pdf() -> None:
    styles = pdf_styles()
    doc = BaseDocTemplate(
        str(PDF_PATH),
        pagesize=letter,
        leftMargin=0.42 * inch,
        rightMargin=0.42 * inch,
        topMargin=0.37 * inch,
        bottomMargin=0.34 * inch,
        title="Casey Barton - Applied AI Systems Architect Resume",
        author="Casey Del Carpio Barton",
    )
    frame = Frame(
        doc.leftMargin,
        doc.bottomMargin,
        doc.width,
        doc.height,
        id="main",
        leftPadding=0,
        rightPadding=0,
        topPadding=0,
        bottomPadding=0,
    )
    doc.addPageTemplates([PageTemplate(id="resume", frames=[frame])])
    story = []

    header_left = [
        Paragraph("CASEY DEL CARPIO BARTON", styles["name"]),
        Paragraph(
            "APPLIED AI SYSTEMS ARCHITECT | AGENT INFRASTRUCTURE ENGINEER",
            styles["title"],
        ),
        Spacer(1, 6),
        Paragraph(
            "Builds the operating layer that makes powerful AI dependable enough to use.",
            styles["contact"],
        ),
    ]
    header_right = [
        Paragraph("Honolulu, Hawaii", styles["contact"]),
        Paragraph("glacier.equilibrium@gmail.com", styles["contact"]),
        Paragraph("casey-barton-glaciereq.vercel.app", styles["contact"]),
        Paragraph("github.com/GlacierEQ", styles["contact"]),
    ]
    header = Table(
        [[header_left, header_right]],
        colWidths=[4.85 * inch, 2.05 * inch],
        hAlign="LEFT",
    )
    header.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, -1), DARK),
                ("BOX", (0, 0), (-1, -1), 0.6, DARK_2),
                ("VALIGN", (0, 0), (-1, -1), "BOTTOM"),
                ("LEFTPADDING", (0, 0), (0, 0), 18),
                ("RIGHTPADDING", (1, 0), (1, 0), 16),
                ("TOPPADDING", (0, 0), (-1, -1), 17),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 16),
            ]
        )
    )
    story.extend([header, Spacer(1, 10)])

    metric_cells = []
    for value, label in PROOF:
        metric_cells.append(
            [
                Paragraph(value, styles["metric"]),
                Paragraph(label, styles["metric_label"]),
            ]
        )
    metrics = Table([metric_cells], colWidths=[doc.width / 4] * 4)
    metrics.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, -1), DARK_2),
                ("BOX", (0, 0), (-1, -1), 0.5, DARK_2),
                ("INNERGRID", (0, 0), (-1, -1), 0.35, colors.HexColor("#2D6662")),
                ("LEFTPADDING", (0, 0), (-1, -1), 10),
                ("RIGHTPADDING", (0, 0), (-1, -1), 8),
                ("TOPPADDING", (0, 0), (-1, -1), 8),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
            ]
        )
    )
    story.extend(
        [
            metrics,
            Spacer(1, 10),
            Paragraph("SYSTEMS POSITIONING", styles["tag"]),
            Paragraph("Inspection discipline for AI systems.", styles["section"]),
            Paragraph(SUMMARY, styles["body"]),
            Spacer(1, 8),
        ]
    )

    project_cells = []
    for p in PROJECTS:
        state_color = AMBER if p["state"] == "EXECUTION BLOCKED" else TEAL
        block = [
            Paragraph(
                p["state"],
                ParagraphStyle(
                    "state", parent=styles["card_state"], textColor=state_color
                ),
            ),
            Paragraph(p["name"], styles["card_title"]),
            Paragraph(p["text"], styles["small"]),
            Spacer(1, 4),
            Paragraph(p["proof"], styles["small"]),
        ]
        project_cells.append(block)
    project_table = Table(
        [[project_cells[0], project_cells[1]], [project_cells[2], project_cells[3]]],
        colWidths=[doc.width / 2 - 4, doc.width / 2 - 4],
        hAlign="LEFT",
    )
    project_table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, -1), colors.white),
                ("BOX", (0, 0), (-1, -1), 0.5, LINE),
                ("INNERGRID", (0, 0), (-1, -1), 0.5, LINE),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("LEFTPADDING", (0, 0), (-1, -1), 11),
                ("RIGHTPADDING", (0, 0), (-1, -1), 11),
                ("TOPPADDING", (0, 0), (-1, -1), 9),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 9),
                ("BACKGROUND", (1, 1), (1, 1), AMBER_BG),
            ]
        )
    )
    story.extend(
        [
            Paragraph("SELECTED EXECUTION", styles["tag"]),
            Paragraph("Proof that reveals engineering judgment.", styles["section"]),
            project_table,
            Spacer(1, 10),
            Paragraph("EXPERIENCE", styles["tag"]),
        ]
    )

    first = EXPERIENCE[0]
    exp_head = Table(
        [
            [
                Paragraph(f"{first[0]} - {first[1]}", styles["role"]),
                Paragraph(first[2], styles["date"]),
            ]
        ],
        colWidths=[5.35 * inch, 1.55 * inch],
    )
    exp_head.setStyle(
        TableStyle(
            [
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("ALIGN", (1, 0), (1, 0), "RIGHT"),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
            ]
        )
    )
    story.append(exp_head)
    for b in first[3]:
        story.append(Paragraph(f"- {b}", styles["bullet"]))

    story.append(PageBreak())
    story.extend([Paragraph("EXPERIENCE CONTINUED", styles["tag"])])
    for org, role, period, bullets in EXPERIENCE[1:]:
        head = Table(
            [
                [
                    Paragraph(f"{org} - {role}", styles["role"]),
                    Paragraph(period, styles["date"]),
                ]
            ],
            colWidths=[5.35 * inch, 1.55 * inch],
        )
        head.setStyle(
            TableStyle(
                [
                    ("VALIGN", (0, 0), (-1, -1), "TOP"),
                    ("ALIGN", (1, 0), (1, 0), "RIGHT"),
                    ("TOPPADDING", (0, 0), (-1, -1), 7),
                    ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
                ]
            )
        )
        story.append(head)
        for b in bullets:
            story.append(Paragraph(f"- {b}", styles["bullet"]))

    story.extend(
        [
            Spacer(1, 8),
            Paragraph("CROSS-DOMAIN FOUNDATION", styles["tag"]),
            Paragraph("A rare operating perspective.", styles["section"]),
        ]
    )
    domain_cells = []
    for tag, title, text in DOMAINS:
        domain_cells.append(
            [
                Paragraph(tag, styles["card_state"]),
                Paragraph(title, styles["card_title"]),
                Paragraph(text, styles["small"]),
            ]
        )
    domains = Table([domain_cells], colWidths=[doc.width / 3] * 3)
    domains.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, -1), PALE),
                ("BOX", (0, 0), (-1, -1), 0.5, LINE),
                ("INNERGRID", (0, 0), (-1, -1), 0.5, LINE),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("LEFTPADDING", (0, 0), (-1, -1), 9),
                ("RIGHTPADDING", (0, 0), (-1, -1), 9),
                ("TOPPADDING", (0, 0), (-1, -1), 8),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
            ]
        )
    )
    story.extend([domains, Spacer(1, 8), Paragraph("CAPABILITIES", styles["tag"])])
    cap_cells = []
    for title, text in CAPABILITIES:
        cap_cells.append(
            [Paragraph(title, styles["card_title"]), Paragraph(text, styles["small"])]
        )
    caps = Table([cap_cells], colWidths=[doc.width / 3] * 3)
    caps.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, -1), colors.white),
                ("BOX", (0, 0), (-1, -1), 0.5, LINE),
                ("INNERGRID", (0, 0), (-1, -1), 0.5, LINE),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("LEFTPADDING", (0, 0), (-1, -1), 9),
                ("RIGHTPADDING", (0, 0), (-1, -1), 9),
                ("TOPPADDING", (0, 0), (-1, -1), 8),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
            ]
        )
    )
    story.extend([caps, Spacer(1, 8)])

    edu = Table(
        [
            [
                Paragraph("University of Hawaii at Manoa", styles["role"]),
                Paragraph("B.S., Marine Biology - 2016", styles["small"]),
                Paragraph("AWS Cloud Institute", styles["role"]),
                Paragraph(
                    "Cloud Application Developer program - 2025-2026, in progress",
                    styles["small"],
                ),
            ]
        ],
        colWidths=[1.55 * inch, 1.75 * inch, 1.35 * inch, 2.25 * inch],
    )
    edu.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, -1), PALE),
                ("BOX", (0, 0), (-1, -1), 0.5, LINE),
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ("LEFTPADDING", (0, 0), (-1, -1), 8),
                ("RIGHTPADDING", (0, 0), (-1, -1), 8),
                ("TOPPADDING", (0, 0), (-1, -1), 7),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 7),
            ]
        )
    )
    story.extend(
        [
            Paragraph("EDUCATION", styles["tag"]),
            edu,
            Spacer(1, 7),
            Paragraph(
                "Earlier technical certifications recorded in prior resumes: PSI Visual Cylinder Inspector, Eddy Current Technician, Valve Repair Technician, Oxygen Cleaning Cylinder Technician; NAUI Rescue and Master Diver; PADI Enriched Air Diver. Current status should be confirmed before role-specific use.",
                styles["small"],
            ),
            Spacer(1, 7),
        ]
    )
    boundary = Table(
        [[Paragraph(f"<b>Evidence boundary.</b> {BOUNDARY}", styles["boundary"])]],
        colWidths=[doc.width],
    )
    boundary.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, -1), AMBER_BG),
                ("BOX", (0, 0), (-1, -1), 0.5, colors.HexColor("#E7C77E")),
                ("LEFTPADDING", (0, 0), (-1, -1), 10),
                ("RIGHTPADDING", (0, 0), (-1, -1), 10),
                ("TOPPADDING", (0, 0), (-1, -1), 8),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
            ]
        )
    )
    story.append(boundary)
    doc.build(story)


def shade(cell, fill: str) -> None:
    tc_pr = cell._tc.get_or_add_tcPr()
    shd = OxmlElement("w:shd")
    shd.set(qn("w:fill"), fill)
    tc_pr.append(shd)


def set_cell_margins(cell, top=80, start=100, bottom=80, end=100) -> None:
    tc = cell._tc
    tc_pr = tc.get_or_add_tcPr()
    tc_mar = tc_pr.first_child_found_in("w:tcMar")
    if tc_mar is None:
        tc_mar = OxmlElement("w:tcMar")
        tc_pr.append(tc_mar)
    for m, v in (("top", top), ("start", start), ("bottom", bottom), ("end", end)):
        node = tc_mar.find(qn(f"w:{m}"))
        if node is None:
            node = OxmlElement(f"w:{m}")
            tc_mar.append(node)
        node.set(qn("w:w"), str(v))
        node.set(qn("w:type"), "dxa")


def add_run(paragraph, text, size=9, bold=False, color="14262C", font="Aptos"):
    run = paragraph.add_run(text)
    run.bold = bold
    run.font.name = font
    run._element.rPr.rFonts.set(qn("w:eastAsia"), font)
    run.font.size = Pt(size)
    run.font.color.rgb = RGBColor.from_string(color)
    return run


def add_heading(doc: Document, tag: str, title: str) -> None:
    p = doc.add_paragraph()
    p.paragraph_format.space_before = Pt(8)
    p.paragraph_format.space_after = Pt(2)
    add_run(p, tag.upper(), 7, True, "0D766C")
    p2 = doc.add_paragraph()
    p2.paragraph_format.space_after = Pt(5)
    add_run(p2, title, 15, True, "12272D")


def add_bullet(doc: Document, text: str) -> None:
    p = doc.add_paragraph(style="List Bullet")
    p.paragraph_format.left_indent = Inches(0.18)
    p.paragraph_format.first_line_indent = Inches(-0.12)
    p.paragraph_format.space_after = Pt(1.5)
    add_run(p, text, 8.2, False, "263C41")


def make_docx() -> None:
    doc = Document()
    sec = doc.sections[0]
    sec.top_margin = Inches(0.42)
    sec.bottom_margin = Inches(0.38)
    sec.left_margin = Inches(0.48)
    sec.right_margin = Inches(0.48)

    styles = doc.styles
    styles["Normal"].font.name = "Aptos"
    styles["Normal"]._element.rPr.rFonts.set(qn("w:eastAsia"), "Aptos")
    styles["Normal"].font.size = Pt(8.5)

    header = doc.add_table(rows=1, cols=2)
    header.alignment = WD_TABLE_ALIGNMENT.CENTER
    header.columns[0].width = Inches(5.1)
    header.columns[1].width = Inches(2.1)
    for c in header.rows[0].cells:
        shade(c, "071B21")
        set_cell_margins(c, 180, 180, 160, 180)
        c.vertical_alignment = WD_CELL_VERTICAL_ALIGNMENT.BOTTOM
    p = header.cell(0, 0).paragraphs[0]
    add_run(p, "CASEY DEL CARPIO BARTON", 24, True, "FFFFFF")
    p = header.cell(0, 0).add_paragraph()
    add_run(
        p,
        "APPLIED AI SYSTEMS ARCHITECT | AGENT INFRASTRUCTURE ENGINEER",
        9.2,
        True,
        "B8F5DF",
    )
    p = header.cell(0, 0).add_paragraph()
    add_run(
        p,
        "Builds the operating layer that makes powerful AI dependable enough to use.",
        8,
        False,
        "D4E6E2",
    )
    for i, text in enumerate(
        [
            "Honolulu, Hawaii",
            "glacier.equilibrium@gmail.com",
            "casey-barton-glaciereq.vercel.app",
            "github.com/GlacierEQ",
        ]
    ):
        p = (
            header.cell(0, 1).paragraphs[0]
            if i == 0
            else header.cell(0, 1).add_paragraph()
        )
        p.alignment = WD_ALIGN_PARAGRAPH.RIGHT
        add_run(p, text, 7.5, False, "D4E6E2")

    doc.add_paragraph().paragraph_format.space_after = Pt(1)
    metrics = doc.add_table(rows=1, cols=4)
    metrics.alignment = WD_TABLE_ALIGNMENT.CENTER
    for i, (value, label) in enumerate(PROOF):
        cell = metrics.cell(0, i)
        shade(cell, "0D3A3C")
        set_cell_margins(cell, 90, 110, 90, 110)
        p = cell.paragraphs[0]
        add_run(p, value, 15.5, True, "B8F5DF")
        p2 = cell.add_paragraph()
        add_run(p2, label, 6.6, False, "D8E8E5")

    add_heading(doc, "Systems positioning", "Inspection discipline for AI systems.")
    p = doc.add_paragraph()
    p.paragraph_format.space_after = Pt(5)
    add_run(p, SUMMARY, 8.6, False, "263C41")

    add_heading(doc, "Selected execution", "Proof that reveals engineering judgment.")
    projects = doc.add_table(rows=2, cols=2)
    projects.alignment = WD_TABLE_ALIGNMENT.CENTER
    for idx, project in enumerate(PROJECTS):
        r, c = divmod(idx, 2)
        cell = projects.cell(r, c)
        shade(cell, "FFF6E3" if project["state"] == "EXECUTION BLOCKED" else "FFFFFF")
        set_cell_margins(cell, 100, 120, 100, 120)
        p = cell.paragraphs[0]
        add_run(
            p,
            project["state"],
            6.3,
            True,
            "9A6500" if project["state"] == "EXECUTION BLOCKED" else "0D766C",
        )
        p = cell.add_paragraph()
        add_run(p, project["name"], 9.2, True, "14262C")
        p = cell.add_paragraph()
        add_run(p, project["text"], 7.6, False, "536A6D")
        p = cell.add_paragraph()
        add_run(p, project["proof"], 7.2, False, "536A6D")

    add_heading(doc, "Experience", "Software architecture grounded in real systems.")
    org, role, period, bullets = EXPERIENCE[0]
    t = doc.add_table(rows=1, cols=2)
    t.columns[0].width = Inches(5.8)
    t.columns[1].width = Inches(1.3)
    p = t.cell(0, 0).paragraphs[0]
    add_run(p, f"{org} - {role}", 9, True, "14262C")
    p = t.cell(0, 1).paragraphs[0]
    p.alignment = WD_ALIGN_PARAGRAPH.RIGHT
    add_run(p, period, 7.5, True, "0D766C")
    for b in bullets:
        add_bullet(doc, b)

    doc.add_page_break()
    add_heading(
        doc,
        "Experience continued",
        "Field systems, operations, and evidence discipline.",
    )
    for org, role, period, bullets in EXPERIENCE[1:]:
        t = doc.add_table(rows=1, cols=2)
        t.columns[0].width = Inches(5.8)
        t.columns[1].width = Inches(1.3)
        p = t.cell(0, 0).paragraphs[0]
        add_run(p, f"{org} - {role}", 9, True, "14262C")
        p = t.cell(0, 1).paragraphs[0]
        p.alignment = WD_ALIGN_PARAGRAPH.RIGHT
        add_run(p, period, 7.5, True, "0D766C")
        for b in bullets:
            add_bullet(doc, b)

    add_heading(doc, "Cross-domain foundation", "A rare operating perspective.")
    domains = doc.add_table(rows=1, cols=3)
    for i, (tag, title, text) in enumerate(DOMAINS):
        cell = domains.cell(0, i)
        shade(cell, "EDF6F3")
        set_cell_margins(cell, 90, 100, 90, 100)
        p = cell.paragraphs[0]
        add_run(p, tag, 6.2, True, "0D766C")
        p = cell.add_paragraph()
        add_run(p, title, 8.5, True, "14262C")
        p = cell.add_paragraph()
        add_run(p, text, 7.2, False, "536A6D")

    add_heading(
        doc,
        "Capabilities",
        "Built for applied AI roles where the model is only one component.",
    )
    caps = doc.add_table(rows=1, cols=3)
    for i, (title, text) in enumerate(CAPABILITIES):
        cell = caps.cell(0, i)
        set_cell_margins(cell, 90, 100, 90, 100)
        p = cell.paragraphs[0]
        add_run(p, title, 8.5, True, "14262C")
        p = cell.add_paragraph()
        add_run(p, text, 7.2, False, "536A6D")

    add_heading(doc, "Education", "Scientific foundation and current cloud training.")
    edu = doc.add_table(rows=1, cols=2)
    for cell in edu.rows[0].cells:
        shade(cell, "EDF6F3")
        set_cell_margins(cell, 90, 110, 90, 110)
    p = edu.cell(0, 0).paragraphs[0]
    add_run(p, "University of Hawaii at Manoa", 8.6, True, "14262C")
    p = edu.cell(0, 0).add_paragraph()
    add_run(p, "B.S., Marine Biology - 2016", 7.5, False, "536A6D")
    p = edu.cell(0, 1).paragraphs[0]
    add_run(p, "AWS Cloud Institute", 8.6, True, "14262C")
    p = edu.cell(0, 1).add_paragraph()
    add_run(
        p,
        "Cloud Application Developer program - 2025-2026, in progress",
        7.5,
        False,
        "536A6D",
    )

    p = doc.add_paragraph()
    p.paragraph_format.space_before = Pt(4)
    p.paragraph_format.space_after = Pt(5)
    add_run(
        p,
        "Earlier technical certifications recorded in prior resumes: PSI Visual Cylinder Inspector, Eddy Current Technician, Valve Repair Technician, Oxygen Cleaning Cylinder Technician; NAUI Rescue and Master Diver; PADI Enriched Air Diver. Current status should be confirmed before role-specific use.",
        7.1,
        False,
        "536A6D",
    )

    boundary = doc.add_table(rows=1, cols=1)
    shade(boundary.cell(0, 0), "FFF6E3")
    set_cell_margins(boundary.cell(0, 0), 110, 130, 110, 130)
    p = boundary.cell(0, 0).paragraphs[0]
    add_run(p, "Evidence boundary. ", 7.4, True, "9A6500")
    add_run(p, BOUNDARY, 7.2, False, "5F5032")

    for section in doc.sections:
        footer = section.footer.paragraphs[0]
        footer.alignment = WD_ALIGN_PARAGRAPH.CENTER
        add_run(
            footer,
            "Casey Del Carpio Barton | Resume Intelligence V17 | Evidence-bound presentation",
            6.5,
            False,
            "6A7C7E",
        )

    props = doc.core_properties
    props.title = "Casey Barton - Applied AI Systems Architect Resume"
    props.author = "Casey Del Carpio Barton"
    props.subject = "Evidence-bound applied AI systems architecture resume"
    props.keywords = "Applied AI, Agent Infrastructure, Systems Architecture, MCP, Evidence Governance"
    doc.save(DOCX_PATH)


def main() -> None:
    make_pdf()
    make_docx()
    manifest = {
        "schema": "glaciereq.resume-artifacts.v17",
        "generator": "site-v15/scripts/generate-resume-v17.py",
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
    print(json.dumps(manifest, indent=2, sort_keys=True))


if __name__ == "__main__":
    main()

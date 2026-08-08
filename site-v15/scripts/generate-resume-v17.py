from docx import Document
from docx.enum.table import WD_TABLE_ALIGNMENT, WD_CELL_VERTICAL_ALIGNMENT
from docx.enum.text import WD_ALIGN_PARAGRAPH, WD_BREAK
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from docx.shared import Inches, Pt, RGBColor
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'downloads'
OUT.mkdir(parents=True, exist_ok=True)
DOCX = OUT / 'Casey_Barton_Resume.docx'

NAVY='0B2028'; TEAL='087A73'; MINT='7DEAD4'; LIGHT='EEF6F4'; LIGHT2='F7FAF9'; MID='D4E4E1'; DARK='14232A'; MUTED='5B6D75'; AMBER='A56600'; AMBER_BG='FFF5DE'; WHITE='FFFFFF'
FONT='Carlito'


def shade(cell, fill):
    tcPr=cell._tc.get_or_add_tcPr(); shd=tcPr.find(qn('w:shd'))
    if shd is None:
        shd=OxmlElement('w:shd'); tcPr.append(shd)
    shd.set(qn('w:fill'), fill)

def borders(cell, color=MID, size='2'):
    tcPr=cell._tc.get_or_add_tcPr(); node=tcPr.find(qn('w:tcBorders'))
    if node is None: node=OxmlElement('w:tcBorders'); tcPr.append(node)
    for edge in ('top','left','bottom','right'):
        e=OxmlElement(f'w:{edge}'); e.set(qn('w:val'),'single'); e.set(qn('w:sz'),size); e.set(qn('w:color'),color); node.append(e)

def cell_margins(cell, top=70, start=90, bottom=70, end=90):
    tcPr=cell._tc.get_or_add_tcPr(); tcMar=tcPr.find(qn('w:tcMar'))
    if tcMar is None: tcMar=OxmlElement('w:tcMar'); tcPr.append(tcMar)
    for n,v in [('top',top),('start',start),('bottom',bottom),('end',end)]:
        x=OxmlElement(f'w:{n}'); x.set(qn('w:w'),str(v)); x.set(qn('w:type'),'dxa'); tcMar.append(x)

def no_spacing(table):
    tblPr=table._tbl.tblPr; x=tblPr.find(qn('w:tblCellSpacing'))
    if x is None: x=OxmlElement('w:tblCellSpacing'); tblPr.append(x)
    x.set(qn('w:w'),'0'); x.set(qn('w:type'),'dxa')

def run(p,text,bold=False,color=DARK,size=9,italic=False):
    r=p.add_run(text); r.bold=bold; r.italic=italic; r.font.name=FONT; r._element.rPr.rFonts.set(qn('w:eastAsia'),FONT); r.font.size=Pt(size); r.font.color.rgb=RGBColor.from_string(color); return r

def para(p,before=0,after=0,line=1.0):
    f=p.paragraph_format; f.space_before=Pt(before); f.space_after=Pt(after); f.line_spacing=line

def add_link(p,text,url,color=TEAL,size=8.5):
    part=p.part; rid=part.relate_to(url,'http://schemas.openxmlformats.org/officeDocument/2006/relationships/hyperlink',is_external=True)
    h=OxmlElement('w:hyperlink'); h.set(qn('r:id'),rid); rr=OxmlElement('w:r'); rpr=OxmlElement('w:rPr')
    c=OxmlElement('w:color'); c.set(qn('w:val'),color); rpr.append(c); u=OxmlElement('w:u'); u.set(qn('w:val'),'none'); rpr.append(u)
    sz=OxmlElement('w:sz'); sz.set(qn('w:val'),str(int(size*2))); rpr.append(sz); szc=OxmlElement('w:szCs'); szc.set(qn('w:val'),str(int(size*2))); rpr.append(szc)
    fonts=OxmlElement('w:rFonts'); fonts.set(qn('w:ascii'),FONT); fonts.set(qn('w:hAnsi'),FONT); rpr.append(fonts)
    rr.append(rpr); t=OxmlElement('w:t'); t.text=text; rr.append(t); h.append(rr); p._p.append(h)

def section_title(doc,kicker,title):
    p=doc.add_paragraph(); para(p,before=7,after=1); run(p,kicker.upper(),True,TEAL,7.3)
    p=doc.add_paragraph(); para(p,after=4); run(p,title,True,DARK,13.2)
    pPr=p._p.get_or_add_pPr(); b=OxmlElement('w:pBdr'); bot=OxmlElement('w:bottom'); bot.set(qn('w:val'),'single'); bot.set(qn('w:sz'),'8'); bot.set(qn('w:space'),'2'); bot.set(qn('w:color'),TEAL); b.append(bot); pPr.append(b)

def bullet(doc,text,size=8.75):
    p=doc.add_paragraph(style='List Bullet'); para(p,after=.7,line=1.03); p.paragraph_format.left_indent=Inches(.18); p.paragraph_format.first_line_indent=Inches(-.14); run(p,text,False,DARK,size)

def role(doc,org,title,period,bullets):
    t=doc.add_table(rows=1,cols=2); t.alignment=WD_TABLE_ALIGNMENT.CENTER; t.autofit=False; no_spacing(t); t.columns[0].width=Inches(5.6); t.columns[1].width=Inches(1.5)
    a,b=t.rows[0].cells
    for c in (a,b): cell_margins(c,25,0,10,0)
    p=a.paragraphs[0]; para(p); run(p,org,True,DARK,10.1); run(p,'  |  ',False,MUTED,9.3); run(p,title,True,TEAL,9.4)
    p=b.paragraphs[0]; p.alignment=WD_ALIGN_PARAGRAPH.RIGHT; para(p); run(p,period,True,MUTED,8.2)
    for x in bullets: bullet(doc,x)

def add_footer(sec):
    p=sec.footer.paragraphs[0]; p.alignment=WD_ALIGN_PARAGRAPH.CENTER; para(p); run(p,'CASEY BARTON  |  EVIDENCE-BOUND AI SYSTEMS  |  HONOLULU, HAWAII',True,MUTED,6.5)


doc=Document(); sec=doc.sections[0]
sec.page_width=Inches(8.5); sec.page_height=Inches(11)
# Real print-safe margins: visibly present, still compact.
sec.top_margin=Inches(.60); sec.bottom_margin=Inches(.60); sec.left_margin=Inches(.70); sec.right_margin=Inches(.70); sec.header_distance=Inches(.22); sec.footer_distance=Inches(.28)
styles=doc.styles
for sty in ('Normal','List Bullet'):
    styles[sty].font.name=FONT; styles[sty]._element.rPr.rFonts.set(qn('w:eastAsia'),FONT); styles[sty].font.size=Pt(9); styles[sty].font.color.rgb=RGBColor.from_string(DARK)
styles['Normal'].paragraph_format.space_after=Pt(0)
cp=doc.core_properties; cp.title='Casey Barton - Applied AI Systems Architect Resume'; cp.author='Casey Del Carpio Barton'; cp.subject='Evidence-bound applied AI systems resume'; cp.comments='Current claims are separated from ambition and bounded to stated evidence.'

# Header card inside margins
h=doc.add_table(rows=1,cols=2); h.alignment=WD_TABLE_ALIGNMENT.CENTER; h.autofit=False; no_spacing(h); h.columns[0].width=Inches(4.95); h.columns[1].width=Inches(2.15)
a,b=h.rows[0].cells
for c in (a,b): shade(c,NAVY); cell_margins(c,115,125,105,125); c.vertical_alignment=WD_CELL_VERTICAL_ALIGNMENT.CENTER
p=a.paragraphs[0]; para(p,after=2); run(p,'CASEY DEL CARPIO BARTON',True,WHITE,19.2)
p=a.add_paragraph(); para(p,after=2); run(p,'APPLIED AI SYSTEMS ARCHITECT',True,MINT,10.2); run(p,'  |  Agent Infrastructure Engineer',False,'D7E4E7',8.7)
p=a.add_paragraph(); para(p); run(p,'Forward-Deployed AI  |  Builds the operating layer that makes powerful AI dependable enough to use.',False,'C1D1D5',8.1)
p=b.paragraphs[0]; p.alignment=WD_ALIGN_PARAGRAPH.RIGHT; para(p,after=2); run(p,'Honolulu, Hawaii',True,WHITE,9.2)
for text,url in [('808-936-5654','tel:+18089365654'),('glacier.equilibrium@gmail.com','mailto:glacier.equilibrium@gmail.com'),('casey-barton-glaciereq.vercel.app','https://casey-barton-glaciereq.vercel.app/'),('github.com/GlacierEQ','https://github.com/GlacierEQ')]:
    p=b.add_paragraph(); p.alignment=WD_ALIGN_PARAGRAPH.RIGHT; para(p,after=0); add_link(p,text,url,'D7E4E7',8.15)

# Signal
s=doc.add_table(rows=1,cols=1); s.alignment=WD_TABLE_ALIGNMENT.CENTER; no_spacing(s); c=s.cell(0,0); shade(c,LIGHT); cell_margins(c,80,105,80,105); borders(c,TEAL,'5')
p=c.paragraphs[0]; para(p,after=2); run(p,'SYSTEMS SIGNAL',True,TEAL,7.4)
p=c.add_paragraph(); para(p,line=1.05); run(p,'Applied AI systems architect who turns ambitious, ambiguous ideas into bounded operating systems with explicit authority, deterministic evidence, controlled failure behavior, and inspectable completion receipts. The method is simple: observe the actual system, separate evidence from inference, isolate the governing failure, build the narrowest useful mechanism, test the stated behavior, expose the limit, and leave a usable artifact.',False,DARK,9.2)

# Metrics
m=doc.add_table(rows=1,cols=4); m.alignment=WD_TABLE_ALIGNMENT.CENTER; m.autofit=False; no_spacing(m)
metrics=[('69/69','Receipt Router tests'),('166 + 19','source + memory tests'),('67','Helix admitted public set'),('62/62','Agent Coordinator tests')]
for i,(num,label) in enumerate(metrics):
    c=m.cell(0,i); shade(c,LIGHT2 if i%2==0 else LIGHT); cell_margins(c,55,35,55,35); borders(c)
    p=c.paragraphs[0]; p.alignment=WD_ALIGN_PARAGRAPH.CENTER; para(p,after=1); run(p,num,True,TEAL,14.2)
    p=c.add_paragraph(); p.alignment=WD_ALIGN_PARAGRAPH.CENTER; para(p,line=.95); run(p,label,False,MUTED,7.1)

section_title(doc,'Proof at work','Professional Experience')
role(doc,'GlacierEQ','Founder / Applied AI Systems Builder','Jan 2025-Present',[
'Design and implement evidence-bound systems spanning agent orchestration, application intelligence, document and evidence pipelines, memory and continuity, infrastructure governance, and human-machine interfaces.',
'Convert broad architecture into typed contracts, runnable slices, deterministic tests, explicit refusal behavior, machine-readable facts, and reviewable completion receipts.',
'Built a public Portfolio Receipt Router that replaced unsupported autonomous-control semantics with a local fail-closed evidence system; 69/69 tests passed through direct and reusable CI with zero external actions.',
'Govern a multi-repository engineering estate by separating source presence, review, execution, deployment, authority, and verified completion so public claims cannot outrun proof.'
])
role(doc,'Diamond Head Home Inspections','Certified Home Inspector','2020-2024',[
'Inspected residential structural, roofing, electrical, plumbing, HVAC, moisture, and safety conditions; translated field evidence into clear, decision-ready reports under time constraints.',
'Built disciplined habits around uncertainty labeling, defect prioritization, interacting-system analysis, client communication, and avoiding unsupported conclusions.'
])
role(doc,'Hi-Class Home Services / Hi Class Maintenance Oahu LLC','Owner-Operator, Building Systems & Field Services','2017-Present',[
'Scope residential repair and service work, prepare estimates, coordinate execution, and communicate assumptions, constraints, and completion status with clients.',
'Translate incomplete real-world requirements into bounded work packages, explicit assumptions, and usable closeout artifacts.'
])

section_title(doc,'Capability field','Core Capabilities')
cap=doc.add_table(rows=2,cols=2); cap.alignment=WD_TABLE_ALIGNMENT.CENTER; cap.autofit=False; no_spacing(cap); cap.columns[0].width=Inches(3.55); cap.columns[1].width=Inches(3.55)
cap_data=[
('Agent infrastructure & governance','Multi-agent coordination; MCP and tool contracts; capability/authority separation; approval models; state machines; bounded retries; recovery and closure.'),
('Evidence & release engineering','Provenance; claim-to-source mapping; deterministic testing; JSON Schema; CI/CD; static analysis; dependency auditing; integrity hashing; machine-readable receipts.'),
('Application & document intelligence','Role research; evidence-qualified resume generation; document extraction; structured artifacts; human and machine presentation surfaces.'),
('Primary technology','Python; TypeScript; JavaScript; SQL; Bash; Node.js; React; Next.js; FastAPI; REST; JSON-RPC 2.0; MCP; GitHub Actions; Docker; Vercel.')]
for i,(label,val) in enumerate(cap_data):
    c=cap.cell(i//2,i%2); shade(c,LIGHT if i in (0,3) else LIGHT2); cell_margins(c,65,80,65,80); borders(c)
    p=c.paragraphs[0]; para(p,after=2); run(p,label,True,TEAL,8.2)
    p=c.add_paragraph(); para(p,line=1.0); run(p,val,False,DARK,7.75)

# Page 2
p=doc.add_paragraph(); p.add_run().add_break(WD_BREAK.PAGE)
section_title(doc,'Selected systems','Evidence states, not hype')
rows=[
('Portfolio Receipt Router','TEST VERIFIED','Fail-closed evidence routing and compatibility-safe architecture repair.','69/69 tests; direct and reusable CI; artifact 8910423397; zero external actions.','Independent technical exhibit; no production-operation or company-affiliation claim.'),
('Job Application Helix','PARTIALLY VERIFIED','Evidence-governed hiring and portfolio orchestration with an exact 67-repository admitted public proof boundary.','Fail-closed evidence levels, repository-state separation, promotion gates, machine contracts, and role-calibrated package generation.','The 67 admitted repositories are a public proof set, not accomplishment count or the full owned estate; child repositories retain independent evidence states.'),
('Agent Coordinator','RECORDED 62/62','Deterministic task ownership, dependency order, capacity, stable priority, and shared budgets.','62/62 recorded Python tests.','Hosted matrix and broader promotion gates remain separate.'),
('AKOS / PSYSOC-X','BOUNDED VERIFIED SURFACES','Authority, evidence, closure, and deterministic audience-calibration primitives.','Repository-native verification supports bounded current surfaces.','Presentation depth can change; facts, uncertainty, dignity, and authority may not.'),
]
t=doc.add_table(rows=len(rows),cols=2); t.alignment=WD_TABLE_ALIGNMENT.CENTER; t.autofit=False; no_spacing(t); t.columns[0].width=Inches(3.25); t.columns[1].width=Inches(3.85)
for i,(name,state,summary,evidence,boundary) in enumerate(rows):
    a,b=t.rows[i].cells
    for c in (a,b): shade(c,LIGHT if i%2==0 else LIGHT2); cell_margins(c,65,70,65,70); borders(c)
    p=a.paragraphs[0]; para(p,after=1); run(p,name,True,DARK,9.7)
    p=a.add_paragraph(); para(p,after=2); run(p,state,True,TEAL if 'BLOCK' not in state else AMBER,7.2)
    p=a.add_paragraph(); para(p,line=1.0); run(p,summary,False,DARK,7.85)
    p=b.paragraphs[0]; para(p,after=1); run(p,'EVIDENCE',True,TEAL,7.0); p=b.add_paragraph(); para(p,after=3,line=1.0); run(p,evidence,False,DARK,7.7)
    p=b.add_paragraph(); para(p,after=1); run(p,'BOUNDARY',True,AMBER,7.0); p=b.add_paragraph(); para(p,line=1.0); run(p,boundary,False,MUTED,7.55)

section_title(doc,'Systems foundation','Cross-domain operating perspective')
f=doc.add_table(rows=3,cols=2); f.alignment=WD_TABLE_ALIGNMENT.CENTER; f.autofit=False; no_spacing(f); f.columns[0].width=Inches(2.0); f.columns[1].width=Inches(5.1)
foundation=[
('Scientific measurement','University of Hawaii sea-urchin morphometric research, 2016-2017: processed physical measurements of gill structures to support visual species identification.'),
('Compressed-gas systems','Scuba Tank Technician, Hawaiian Diving Adventures and UH Dive Office, 2016-2017: tank filling, transport, inspection and repair support, and gas mixing under safety-critical procedures.'),
('Field systems operations','Residential inspection and repair work developed practical judgment around interacting systems, failure consequences, uncertainty, and clear client communication.')]
for i,(label,val) in enumerate(foundation):
    a,b=f.rows[i].cells
    for c in (a,b): shade(c,LIGHT if i%2==0 else LIGHT2); cell_margins(c,50,65,50,65); borders(c)
    p=a.paragraphs[0]; para(p); run(p,label,True,TEAL,7.9)
    p=b.paragraphs[0]; para(p,line=1.0); run(p,val,False,DARK,7.7)

section_title(doc,'Technical profile','Tools and architecture')
p=doc.add_paragraph(); para(p,after=2); run(p,'Primary: ',True,TEAL,8.1); run(p,'Python, TypeScript, JavaScript, SQL, Bash, Node.js, React, Next.js, FastAPI',False,DARK,8.1)
p=doc.add_paragraph(); para(p,after=2); run(p,'Architecture: ',True,TEAL,8.1); run(p,'REST, JSON-RPC 2.0, MCP, JSON Schema, Protocol Buffers, events, state machines, idempotency, authority models, evidence models',False,DARK,8.1)
p=doc.add_paragraph(); para(p,after=2); run(p,'Delivery: ',True,TEAL,8.1); run(p,'Git, GitHub Actions, Docker, Vercel, automated testing, static analysis, dependency auditing, deterministic release checks',False,DARK,8.1)
p=doc.add_paragraph(); para(p); run(p,'Additional evidence-bounded exposure: ',True,TEAL,8.1); run(p,'Go, Rust, C, C++, CUDA, Swift/Metal, Julia, R, Verilog/SystemVerilog, WebAssembly',False,DARK,8.1)

section_title(doc,'Education','Scientific foundation and current cloud training')
e=doc.add_table(rows=2,cols=2); e.alignment=WD_TABLE_ALIGNMENT.CENTER; e.autofit=False; no_spacing(e); e.columns[0].width=Inches(4.4); e.columns[1].width=Inches(2.7)
for i,(school,cred) in enumerate([('University of Hawaii at Manoa','B.S., Marine Biology - 2016'),('AWS Cloud Institute','Cloud Application Developer program - 2025-2026, in progress')]):
    a,b=e.rows[i].cells; cell_margins(a,30,20,30,20); cell_margins(b,30,20,30,20)
    p=a.paragraphs[0]; para(p); run(p,school,True,DARK,8.6); p=b.paragraphs[0]; p.alignment=WD_ALIGN_PARAGRAPH.RIGHT; para(p); run(p,cred,False,MUTED,8.0)

# boundary box
box=doc.add_table(rows=1,cols=1); box.alignment=WD_TABLE_ALIGNMENT.CENTER; no_spacing(box); c=box.cell(0,0); shade(c,AMBER_BG); cell_margins(c,65,80,65,80); borders(c,'E5B34B','4')
p=c.paragraphs[0]; para(p,line=1.0); run(p,'EVIDENCE BOUNDARY  ',True,AMBER,7.7); run(p,'Independent GlacierEQ work and bounded technical exhibits. Test counts refer only to their stated repository and scope. No company affiliation, proprietary access, production deployment, customer impact, formal people-management experience, current certification status, hardware validation, or measured business outcome is claimed without direct evidence.',False,DARK,7.65)

for s in doc.sections: add_footer(s)
doc.save(DOCX)
if not DOCX.read_bytes().startswith(b'PK'):
    raise RuntimeError('DOCX signature invalid')
print(DOCX)

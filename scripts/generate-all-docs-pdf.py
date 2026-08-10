#!/usr/bin/env python3
"""Generate separate PDF files for every project document."""

from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.enums import TA_JUSTIFY, TA_CENTER
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import inch
from reportlab.platypus import (
    ListFlowable,
    ListItem,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)

OUT = Path(__file__).resolve().parents[1] / "docs" / "export"
OUT.mkdir(parents=True, exist_ok=True)

PRIMARY = colors.HexColor("#0B1F3A")
ACCENT = colors.HexColor("#0E7490")
MUTED = colors.HexColor("#64748B")
ALT = colors.HexColor("#F0F9FF")
BORDER = colors.HexColor("#CBD5E1")
TEXT = colors.HexColor("#0F172A")

base = getSampleStyleSheet()
S = {
    "title": ParagraphStyle("t", parent=base["Title"], fontName="Helvetica-Bold", fontSize=18, textColor=PRIMARY, spaceAfter=6),
    "sub": ParagraphStyle("s", parent=base["Normal"], fontName="Helvetica", fontSize=11, textColor=ACCENT, spaceAfter=12),
    "h1": ParagraphStyle("h1", parent=base["Heading1"], fontName="Helvetica-Bold", fontSize=13, textColor=PRIMARY, spaceBefore=12, spaceAfter=6),
    "body": ParagraphStyle("b", parent=base["Normal"], fontName="Helvetica", fontSize=9, textColor=TEXT, leading=12, alignment=TA_JUSTIFY, spaceAfter=6),
    "cell": ParagraphStyle("c", parent=base["Normal"], fontName="Helvetica", fontSize=8, textColor=TEXT, leading=10),
    "cell_h": ParagraphStyle("ch", parent=base["Normal"], fontName="Helvetica-Bold", fontSize=8, textColor=colors.white, leading=10),
    "meta": ParagraphStyle("m", parent=base["Normal"], fontName="Helvetica", fontSize=8, textColor=MUTED, alignment=TA_CENTER),
}


def P(text, style="body"):
    return Paragraph(text, S[style])


def bullets(items):
    return ListFlowable(
        [ListItem(P(i), leftIndent=6, value="•") for i in items],
        bulletType="bullet",
        start="•",
        leftIndent=10,
        spaceAfter=6,
    )


def table(headers, rows, widths):
    data = [[P(h, "cell_h") for h in headers]] + [[P(str(c), "cell") for c in r] for r in rows]
    t = Table(data, colWidths=widths, repeatRows=1)
    cmds = [
        ("BACKGROUND", (0, 0), (-1, 0), PRIMARY),
        ("GRID", (0, 0), (-1, -1), 0.4, BORDER),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 4),
        ("RIGHTPADDING", (0, 0), (-1, -1), 4),
        ("TOPPADDING", (0, 0), (-1, -1), 3),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
    ]
    for i in range(1, len(data)):
        if i % 2 == 0:
            cmds.append(("BACKGROUND", (0, i), (-1, i), ALT))
    t.setStyle(TableStyle(cmds))
    return t


def footer(canvas, doc):
    canvas.saveState()
    canvas.setStrokeColor(ACCENT)
    canvas.setLineWidth(0.7)
    y = letter[1] - 0.5 * inch
    canvas.line(0.7 * inch, y, letter[0] - 0.7 * inch, y)
    canvas.setFont("Helvetica", 8)
    canvas.setFillColor(MUTED)
    canvas.drawString(0.7 * inch, y + 4, f"Network Visualizer  ·  {doc.title}")
    canvas.line(0.7 * inch, 0.5 * inch, letter[0] - 0.7 * inch, 0.5 * inch)
    canvas.drawRightString(letter[0] - 0.7 * inch, 0.35 * inch, f"Page {doc.page}")
    canvas.restoreState()


DOCS = [
    {
        "id": "NV-PROP-001",
        "file": "NV-PROP-001_Project_Proposal.pdf",
        "title": "Project Proposal & Business Case",
        "story": lambda W: [
            P("1. Executive summary", "h1"),
            P("Windows desktop app visualizing network destinations on a 3D globe with process attribution and live rates. Recommendation: build Phases 0–5 with Tauri 2 + React + Rust + Npcap + GeoLite2."),
            P("2. Problem", "h1"),
            table(["Pain", "Experience"], [["Opaque destinations", "Connected but no geography"], ["Tool fragmentation", "Wireshark vs Task Manager"], ["Privacy", "Want local insight"]], [2.2 * inch, W - 2.2 * inch]),
            P("3. Goals", "h1"),
            bullets(["Map flows home → destination", "Process attribution", "Throughput measurement", "Premium dashboard UX", "Local-first privacy"]),
            P("4. Stack", "h1"),
            table(["Layer", "Tech"], [["Shell", "Tauri 2"], ["UI", "React + TS"], ["Globe", "react-globe.gl"], ["Capture", "Npcap/Rust"], ["Geo", "GeoLite2"]], [2.0 * inch, W - 2.0 * inch]),
        ],
    },
    {
        "id": "NV-SRS-001",
        "file": "NV-SRS-001_Software_Requirements_Specification.pdf",
        "title": "Software Requirements Specification",
        "story": lambda W: [
            P("1. Scope", "h1"),
            P("Single-machine Windows client: capture, enrich, visualize, package."),
            P("2. Capture requirements", "h1"),
            table(["ID", "Requirement", "Pri"], [["CAP-01", "Npcap TCP/UDP capture", "Must"], ["CAP-04", "5-tuple aggregation", "Must"], ["CAP-05", "Throughput rates", "Must"], ["CAP-07", "Npcap missing UX", "Must"], ["CAP-10", "Degraded mode", "Should"]], [0.9 * inch, W - 1.6 * inch, 0.7 * inch]),
            P("3. Other requirements", "h1"),
            table(["Area", "IDs"], [["Process", "PRC-01..04"], ["Geo", "GEO-01..06"], ["Visual", "VIS-01..05"], ["UX", "UX-01..09"]], [1.6 * inch, W - 1.6 * inch]),
            P("4. Acceptance", "h1"),
            bullets(["Arcs appear when browsing", "Process names when available", "Filters + pause work", "Clear setup errors"]),
        ],
    },
    {
        "id": "NV-SAD-001",
        "file": "NV-SAD-001_System_Architecture_Design.pdf",
        "title": "System Architecture & Design",
        "story": lambda W: [
            P("1. Components", "h1"),
            table(["Component", "Role"], [["Capture", "Ingest packets/connections"], ["Flow", "Aggregate rates/expiry"], ["Process", "PID mapping"], ["Geo", "IP location"], ["Engine", "Orchestrate snapshots"], ["UI", "Globe dashboard"]], [1.8 * inch, W - 1.8 * inch]),
            P("2. Pipeline", "h1"),
            P("NIC → Npcap/Connections → Flow table → Process join → Geo → Snapshot event → React store → Globe/Feed/KPIs"),
            P("3. ADRs", "h1"),
            table(["ADR", "Decision"], [["001", "Tauri over Electron"], ["002", "Full capture + fallback"], ["003", "3D globe default"], ["004", "Offline geo primary"], ["005", "Header-only"], ["006", "Snapshot IPC"]], [1.0 * inch, W - 1.0 * inch]),
        ],
    },
    {
        "id": "NV-PLAN-001",
        "file": "NV-PLAN-001_Project_Plan_Roadmap.pdf",
        "title": "Project Plan & Roadmap",
        "story": lambda W: [
            P("1. Phases", "h1"),
            table(["Phase", "Outcome"], [["0", "Scaffold"], ["1", "Globe mock"], ["2", "Capture"], ["3", "Enrichment"], ["4", "Live wiring"], ["5", "Polish/ship"]], [1.2 * inch, W - 1.2 * inch]),
            P("2. Milestones", "h1"),
            table(["ID", "Evidence"], [["M0", "Docs baseline"], ["M1", "Visual prototype"], ["M2", "Capture alpha"], ["M3", "Enriched alpha"], ["M4", "Integrated beta"], ["M5", "Release candidate"]], [1.2 * inch, W - 1.2 * inch]),
        ],
    },
    {
        "id": "NV-RISK-001",
        "file": "NV-RISK-001_Risk_Security_Privacy.pdf",
        "title": "Risk, Security & Privacy",
        "story": lambda W: [
            P("1. Top risks", "h1"),
            table(["ID", "Risk", "Mitigation"], [["R-01", "Admin/Npcap friction", "Wizard + degraded"], ["R-02", "Globe jank", "Top-N arcs"], ["R-03", "Geo license", "No mmdb in git"], ["R-05", "Unknown UDP process", "Placeholder"]], [0.8 * inch, 2.4 * inch, W - 3.2 * inch]),
            P("2. Principles", "h1"),
            bullets(["Least data", "Local-first", "Explicit privilege", "Fail closed on capture errors"]),
        ],
    },
    {
        "id": "NV-DEV-001",
        "file": "NV-DEV-001_Development_Guide.pdf",
        "title": "Development Guide",
        "story": lambda W: [
            P("1. Prerequisites", "h1"),
            bullets(["Node 20+", "Rust stable", "VS Build Tools", "WebView2", "Npcap optional"]),
            P("2. Commands", "h1"),
            bullets(["npm install", "npm run tauri dev", "npm run tauri build", "npm run docs"]),
            P("3. Modes", "h1"),
            table(["Mode", "When"], [["Demo", "UI validation / no traffic"], ["Connections", "No Npcap"], ["Capture", "Admin + Npcap"]], [1.8 * inch, W - 1.8 * inch]),
        ],
    },
    {
        "id": "NV-API-001",
        "file": "NV-API-001_API_IPC_Specification.pdf",
        "title": "API / IPC Specification",
        "story": lambda W: [
            P("1. Channels", "h1"),
            bullets(["Commands: UI → Rust control plane", "Events: flow_snapshot high frequency"]),
            P("2. Commands", "h1"),
            bullets(["get_status / get_settings / update_settings", "start_capture / stop_capture", "list_interfaces / resolve_home / complete_first_run"]),
            P("3. Event", "h1"),
            P("flow_snapshot: status, mode, home, totals, flows[] every ~400ms"),
        ],
    },
    {
        "id": "NV-TEST-001",
        "file": "NV-TEST-001_Test_Plan.pdf",
        "title": "Test Plan",
        "story": lambda W: [
            P("1. Levels", "h1"),
            bullets(["Unit: flow merge, rates, private IP", "Integration: IPC + enrichment", "System: globe, filters, pause, wizard"]),
            P("2. Release checklist", "h1"),
            bullets(["Build succeeds", "Demo without Npcap", "No panic on start/stop"]),
        ],
    },
    {
        "id": "NV-STD-001",
        "file": "NV-STD-001_Coding_Standards.pdf",
        "title": "Coding Standards",
        "story": lambda W: [
            P("1. TypeScript / React", "h1"),
            bullets(["Strict TS", "Zustand for live state", "Memoize globe props", "CSS variables"]),
            P("2. Rust", "h1"),
            bullets(["camelCase serde IPC", "tracing not println", "No payload logs"]),
        ],
    },
    {
        "id": "NV-REL-001",
        "file": "NV-REL-001_Deployment_Release.pdf",
        "title": "Deployment & Release Guide",
        "story": lambda W: [
            P("1. Build", "h1"),
            P("npm install && npm run tauri build"),
            P("2. Prerequisites", "h1"),
            bullets(["WebView2", "Admin for capture", "Npcap recommended", "Optional GeoLite2"]),
            P("3. Release checklist", "h1"),
            bullets(["Version bump", "QA pass", "No illegal bundling of Npcap/GeoLite2", "Tag vX.Y.Z"]),
        ],
    },
]


def build_one(spec):
    W = 7.1 * inch
    path = OUT / spec["file"]
    story = [
        P("NETWORK VISUALIZER", "meta"),
        Spacer(1, 4),
        P(spec["title"], "title"),
        P(f"{spec['id']}  ·  Version 1.0  ·  2026-08-10  ·  Baseline", "sub"),
        table(
            ["Field", "Value"],
            [
                ["Document ID", spec["id"]],
                ["Product", "Network Visualizer"],
                ["Version", "1.0"],
                ["Date", "2026-08-10"],
                ["Status", "Baseline"],
            ],
            [2.0 * inch, W - 2.0 * inch],
        ),
        Spacer(1, 8),
        *spec["story"](W),
    ]
    doc = SimpleDocTemplate(
        str(path),
        pagesize=letter,
        leftMargin=0.7 * inch,
        rightMargin=0.7 * inch,
        topMargin=0.75 * inch,
        bottomMargin=0.7 * inch,
        title=f"{spec['id']} {spec['title']}",
        author="Network Visualizer Project",
    )
    doc.build(story, onFirstPage=footer, onLaterPages=footer)
    print("Wrote", path.name)


def main():
    for d in DOCS:
        build_one(d)
    # keep package generation available
    package = Path(__file__).resolve().parent / "generate-project-docs-pdf.py"
    if package.exists():
        print("Package PDF: python scripts/generate-project-docs-pdf.py")
    print("Done.")


if __name__ == "__main__":
    main()

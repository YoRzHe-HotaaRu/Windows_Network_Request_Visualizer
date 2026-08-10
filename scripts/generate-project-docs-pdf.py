#!/usr/bin/env python3
"""Generate Network Visualizer Project Documentation Package PDF."""

from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_JUSTIFY, TA_RIGHT
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import inch
from reportlab.platypus import (
    KeepTogether,
    ListFlowable,
    ListItem,
    PageBreak,
    Paragraph,
    Preformatted,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "docs" / "export" / "Network_Visualizer_Project_Documentation_Package.pdf"
OUT.parent.mkdir(parents=True, exist_ok=True)

PRIMARY = colors.HexColor("#0B1F3A")
ACCENT = colors.HexColor("#0E7490")
MUTED = colors.HexColor("#64748B")
ALT = colors.HexColor("#F0F9FF")
BORDER = colors.HexColor("#CBD5E1")
TEXT = colors.HexColor("#0F172A")


def styles():
    base = getSampleStyleSheet()
    s = {
        "cover_title": ParagraphStyle(
            "cover_title",
            parent=base["Title"],
            fontName="Helvetica-Bold",
            fontSize=28,
            textColor=PRIMARY,
            alignment=TA_CENTER,
            spaceAfter=12,
        ),
        "cover_sub": ParagraphStyle(
            "cover_sub",
            parent=base["Normal"],
            fontName="Helvetica",
            fontSize=16,
            textColor=ACCENT,
            alignment=TA_CENTER,
            spaceAfter=24,
        ),
        "h1": ParagraphStyle(
            "h1",
            parent=base["Heading1"],
            fontName="Helvetica-Bold",
            fontSize=16,
            textColor=PRIMARY,
            spaceBefore=16,
            spaceAfter=10,
        ),
        "h2": ParagraphStyle(
            "h2",
            parent=base["Heading2"],
            fontName="Helvetica-Bold",
            fontSize=12.5,
            textColor=ACCENT,
            spaceBefore=12,
            spaceAfter=6,
        ),
        "body": ParagraphStyle(
            "body",
            parent=base["Normal"],
            fontName="Helvetica",
            fontSize=9.5,
            textColor=TEXT,
            leading=13,
            alignment=TA_JUSTIFY,
            spaceAfter=8,
        ),
        "cell": ParagraphStyle(
            "cell",
            parent=base["Normal"],
            fontName="Helvetica",
            fontSize=8,
            textColor=TEXT,
            leading=11,
        ),
        "cell_h": ParagraphStyle(
            "cell_h",
            parent=base["Normal"],
            fontName="Helvetica-Bold",
            fontSize=8,
            textColor=colors.white,
            leading=11,
        ),
        "meta": ParagraphStyle(
            "meta",
            parent=base["Normal"],
            fontName="Helvetica",
            fontSize=9,
            textColor=MUTED,
            alignment=TA_CENTER,
            spaceAfter=6,
        ),
        "code": ParagraphStyle(
            "code",
            parent=base["Code"],
            fontName="Courier",
            fontSize=7.5,
            leading=10,
            textColor=colors.HexColor("#1E293B"),
            backColor=colors.HexColor("#F1F5F9"),
            leftIndent=4,
            rightIndent=4,
            spaceBefore=4,
            spaceAfter=8,
        ),
        "footer": ParagraphStyle(
            "footer",
            parent=base["Normal"],
            fontName="Helvetica",
            fontSize=8,
            textColor=MUTED,
            alignment=TA_RIGHT,
        ),
    }
    return s


S = styles()


def P(text, style="body"):
    return Paragraph(text, S[style])


def bullets(items):
    return ListFlowable(
        [ListItem(P(i), leftIndent=8, value="•") for i in items],
        bulletType="bullet",
        start="•",
        leftIndent=12,
        spaceBefore=2,
        spaceAfter=8,
    )


def numbers(items):
    return ListFlowable(
        [ListItem(P(i), leftIndent=8) for i in items],
        bulletType="1",
        leftIndent=12,
        spaceBefore=2,
        spaceAfter=8,
    )


def table(headers, rows, col_widths):
    data = [[P(h, "cell_h") for h in headers]]
    for row in rows:
        data.append([P(str(c), "cell") for c in row])
    t = Table(data, colWidths=col_widths, repeatRows=1)
    style_cmds = [
        ("BACKGROUND", (0, 0), (-1, 0), PRIMARY),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("GRID", (0, 0), (-1, -1), 0.4, BORDER),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 5),
        ("RIGHTPADDING", (0, 0), (-1, -1), 5),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
    ]
    for i in range(1, len(data)):
        if i % 2 == 0:
            style_cmds.append(("BACKGROUND", (0, i), (-1, i), ALT))
    t.setStyle(TableStyle(style_cmds))
    return t


def code_block(text):
    return Preformatted(text, S["code"])


def add_header_footer(canvas, doc):
    canvas.saveState()
    canvas.setStrokeColor(ACCENT)
    canvas.setLineWidth(0.8)
    y = letter[1] - 0.55 * inch
    canvas.line(0.7 * inch, y, letter[0] - 0.7 * inch, y)
    canvas.setFont("Helvetica", 8)
    canvas.setFillColor(MUTED)
    canvas.drawString(
        0.7 * inch,
        y + 6,
        "Network Visualizer  ·  Project Documentation Package  ·  NV-PKG-001",
    )
    canvas.setStrokeColor(BORDER)
    canvas.line(0.7 * inch, 0.55 * inch, letter[0] - 0.7 * inch, 0.55 * inch)
    canvas.drawRightString(
        letter[0] - 0.7 * inch,
        0.38 * inch,
        f"Confidential / Project Use  ·  Page {doc.page}",
    )
    canvas.restoreState()


def build():
    story = []
    W = 7.1 * inch

    # Cover
    story.append(Spacer(1, 1.6 * inch))
    story.append(P("NETWORK VISUALIZER", "cover_title"))
    story.append(P("Project Documentation Package", "cover_sub"))
    story.append(P("Corporate software development baseline", "meta"))
    story.append(Spacer(1, 0.35 * inch))
    story.append(
        table(
            ["Field", "Value"],
            [
                ["Document ID", "NV-PKG-001"],
                ["Product", "Network Visualizer"],
                ["Platform", "Windows 10 / 11 (x64)"],
                ["Stack", "Tauri 2 · React · TypeScript · Rust · Npcap"],
                ["Version", "1.0 — Documentation Baseline"],
                ["Date", "2026-08-10"],
                ["Status", "Approved for implementation"],
                ["Classification", "Internal / Open Source candidate"],
            ],
            [2.2 * inch, W - 2.2 * inch],
        )
    )
    story.append(Spacer(1, 0.4 * inch))
    story.append(
        P(
            "Includes: Project Proposal · Software Requirements Specification · "
            "System Architecture &amp; Design · Project Plan &amp; Roadmap · Risk, Security &amp; Privacy",
            "meta",
        )
    )
    story.append(PageBreak())

    # 1 Document control
    story.append(P("1. Document Control", "h1"))
    story.append(
        P(
            "This package consolidates the enterprise documentation set for Network Visualizer. "
            "Markdown sources of truth live under /docs; this file is the stakeholder-facing export."
        )
    )
    story.append(P("1.1 Document map", "h2"))
    story.append(
        table(
            ["ID", "Title", "Audience"],
            [
                ["NV-PROP-001", "Project Proposal &amp; Business Case", "Sponsors, product, eng"],
                ["NV-SRS-001", "Software Requirements Specification", "Product, eng, QA"],
                ["NV-SAD-001", "System Architecture &amp; Design", "Engineering, architecture"],
                ["NV-PLAN-001", "Project Plan &amp; Roadmap", "PM, engineering"],
                ["NV-RISK-001", "Risk, Security &amp; Privacy", "Security, compliance"],
            ],
            [1.2 * inch, 3.4 * inch, W - 4.6 * inch],
        )
    )
    story.append(P("1.2 Revision history", "h2"))
    story.append(
        table(
            ["Ver", "Date", "Author", "Notes"],
            [["1.0", "2026-08-10", "Project team", "Initial approved baseline"]],
            [0.7 * inch, 1.2 * inch, 1.5 * inch, W - 3.4 * inch],
        )
    )
    story.append(PageBreak())

    # 2 Proposal
    story.append(P("2. Project Proposal &amp; Business Case (NV-PROP-001)", "h1"))
    story.append(P("2.1 Executive summary", "h2"))
    story.append(
        P(
            "Network Visualizer is a Windows desktop application that answers: where does my network "
            "traffic go, and which application is sending it? The product captures host traffic, attributes "
            "flows to processes, geolocates remote endpoints, and renders connections as animated arcs on a "
            "3D interactive globe inside a premium operations-center dashboard."
        )
    )
    story.append(
        P(
            "<b>Recommendation:</b> Proceed to build Phases 0–5 using Tauri 2 + React + TypeScript, "
            "Rust/Npcap full traffic capture, MaxMind GeoLite2, and react-globe.gl visualization."
        )
    )
    story.append(P("2.2 Problem statement", "h2"))
    story.append(
        table(
            ["Pain", "Today’s experience"],
            [
                ["Opaque destinations", "Users see Connected but not where on Earth"],
                ["Tool fragmentation", "Task Manager, Wireshark, DevTools each show a slice"],
                ["Cognitive load", "Raw IP tables are accurate but not intuitive"],
                ["Privacy anxiety", "Users want local insight without cloud PCAP upload"],
            ],
            [2.0 * inch, W - 2.0 * inch],
        )
    )
    story.append(P("2.3 Goals (v1)", "h2"))
    story.append(
        numbers(
            [
                "Visualize active host network flows on a world globe (home → destination).",
                "Attribute flows to process name / PID where OS APIs allow.",
                "Measure approximate throughput via full traffic capture.",
                "Deliver a polished dark ops dashboard UX with smooth animation.",
                "Operate local-first with no mandatory cloud telemetry.",
            ]
        )
    )
    story.append(P("2.4 Non-goals (v1)", "h2"))
    story.append(
        bullets(
            [
                "Multi-host / fleet monitoring",
                "Full packet payload inspection or HTTPS MITM",
                "Official Linux/macOS shipping builds",
                "Commercial GeoIP accuracy SLAs",
                "Intrusion detection / automated threat scoring",
            ]
        )
    )
    story.append(P("2.5 Target users", "h2"))
    story.append(
        table(
            ["Persona", "Need", "Success moment"],
            [
                ["Power user", "What is my PC talking to?", "Chrome arcs to CDNs appear"],
                ["Developer", "Debug outbound calls", "Filter by process, pin a flow"],
                ["Home lab / small IT", "Spatial overview", "Top countries strip answers chatty apps"],
                ["Educator", "Teach networking", "Globe makes TCP/UDP geo tangible"],
            ],
            [1.5 * inch, 2.4 * inch, W - 3.9 * inch],
        )
    )
    story.append(P("2.6 Solution overview", "h2"))
    story.append(
        table(
            ["Layer", "Technology", "Role"],
            [
                ["Desktop shell", "Tauri 2", "Native window, IPC, packaging"],
                ["UI", "React 18 + TS + Vite", "Dashboard and state"],
                ["Globe", "react-globe.gl", "3D Earth, arcs, animation"],
                ["Capture", "Npcap + Rust pcap", "Full traffic capture"],
                ["Process map", "Windows IP Helper", "Socket → PID → name"],
                ["Geo", "GeoLite2-City offline", "IP → lat/lon/city/country"],
                ["Transport", "Tauri events 250–500 ms", "Delta snapshots to UI"],
            ],
            [1.5 * inch, 2.2 * inch, W - 3.7 * inch],
        )
    )
    story.append(P("2.7 Success criteria", "h2"))
    story.append(
        numbers(
            [
                "Demo-ready wow within 30 seconds after setup on clean Windows 11.",
                "Real browsing produces geo arcs with process labels.",
                "Core filters and pause work without deep training.",
                "Documented install path; GitHub README sufficient for contributors.",
                "No cloud telemetry by default; privacy model documented.",
            ]
        )
    )
    story.append(PageBreak())

    # 3 SRS
    story.append(P("3. Software Requirements Specification (NV-SRS-001)", "h1"))
    story.append(P("3.1 Purpose and scope", "h2"))
    story.append(
        P(
            "This SRS defines functional and non-functional requirements for Network Visualizer v1: "
            "single-machine Windows client, local capture, process enrichment, offline GeoIP, "
            "3D visualization, dashboard UX, and packaging."
        )
    )
    story.append(P("3.2 Capture requirements", "h2"))
    story.append(
        table(
            ["ID", "Requirement", "Pri"],
            [
                ["CAP-01", "Capture IP TCP/UDP via Npcap on selected interface", "Must"],
                ["CAP-02", "Parse headers only; no payload storage by default", "Must"],
                ["CAP-03", "IPv4 required; IPv6 best-effort", "Must"],
                ["CAP-04", "Aggregate into 5-tuple flows with counters", "Must"],
                ["CAP-05", "Compute approximate throughput rates", "Must"],
                ["CAP-06", "Expire idle flows (default 30–60s)", "Must"],
                ["CAP-07", "Detect missing Npcap with remediation UX", "Must"],
                ["CAP-08", "Detect lack of elevation with relaunch guidance", "Must"],
                ["CAP-09", "List/select capture interfaces in Settings", "Should"],
                ["CAP-10", "Degrade to connection-table mode if capture fails", "Should"],
            ],
            [0.85 * inch, W - 1.55 * inch, 0.7 * inch],
        )
    )
    story.append(P("3.3 Process, geo, visualization (summary)", "h2"))
    story.append(
        table(
            ["Area", "Key IDs", "Summary"],
            [
                ["Process", "PRC-01..04", "IP Helper map TCP (UDP best-effort); placeholder if unknown"],
                ["Geo", "GEO-01..06", "Offline GeoLite2; private IP policy; home origin + override"],
                ["Visual", "VIS-01..05", "3D globe, animated arcs, top-N cap for FPS"],
                ["UX", "UX-01..09", "Dashboard layout, KPIs, feed, filters, pause, wizard"],
                ["IPC", "IPC-01..03", "250–500 ms snapshots; start/stop/status/settings"],
            ],
            [1.1 * inch, 1.5 * inch, W - 2.6 * inch],
        )
    )
    story.append(P("3.4 Non-functional requirements", "h2"))
    story.append(
        bullets(
            [
                "PERF: Target 60 FPS under typical desktop traffic; throttle UI updates.",
                "REL: Capture failures surface actionable UI states.",
                "SEC: No payloads by default; no cloud telemetry; privilege explicit.",
                "USE: Core path start → arcs under 2 minutes after prerequisites.",
                "MAIN: Modular Rust modules; typed IPC; unit tests for flow/geo math.",
                "COMP: Windows 10 22H2+ and Windows 11 x64.",
            ]
        )
    )
    story.append(P("3.5 Acceptance criteria (v1)", "h2"))
    story.append(
        numbers(
            [
                "With Npcap + admin + GeoIP, browsing produces visible arcs.",
                "Major browser process names appear on enriched flows.",
                "Hover shows process, location, rate; filters and pause work.",
                "Missing Npcap/elevation yields clear remediation.",
                "README + docs package present in repository.",
            ]
        )
    )
    story.append(PageBreak())

    # 4 Architecture
    story.append(P("4. System Architecture &amp; Design (NV-SAD-001)", "h1"))
    story.append(P("4.1 Architectural goals", "h2"))
    story.append(
        table(
            ["Goal", "Design response"],
            [
                ["Real-time feel", "Event deltas every 250–500 ms; never per-packet UI"],
                ["Silky 3D UI", "WebGL globe isolated from capture thread"],
                ["Safe capture", "Header-only parse; privileged code in Rust"],
                ["Extensibility", "Modules: capture, flow, process, geo"],
                ["Small footprint", "Tauri instead of Electron"],
            ],
            [2.0 * inch, W - 2.0 * inch],
        )
    )
    story.append(P("4.2 Context diagram", "h2"))
    story.append(
        code_block(
            "User → Network Visualizer (Tauri + React + Rust)\n"
            "         ├─ Windows NIC + Npcap + IP Helper\n"
            "         ├─ GeoLite2-City.mmdb (local)\n"
            "         └─ Public IP service (optional, home location)"
        )
    )
    story.append(P("4.3 Logical architecture", "h2"))
    story.append(
        code_block(
            "Presentation: React | Store | Globe | KPI | Feed | Filters\n"
            "        │ Tauri invoke + events\n"
            "Application: commands + flow_snapshot emitter\n"
            "Domain: Capture → Flow Aggregator ← Process Mapper\n"
            "                 → Geo Service\n"
            "Infra: Npcap | IP Helper | maxminddb | optional HTTPS"
        )
    )
    story.append(P("4.4 Data pipeline", "h2"))
    story.append(
        code_block(
            "[NIC] → [Npcap] → [Parse L3/L4] → [Flow table]\n"
            "  → [Rates + expiry] → [Process join] → [Geo enrich]\n"
            "  → [Snapshot 250–500ms] → [React store] → [Globe + Feed + KPIs]"
        )
    )
    story.append(P("4.5 Flow aggregation algorithm", "h2"))
    story.append(
        code_block(
            "key = hash(src_ip, src_port, dst_ip, dst_port, protocol)\n"
            "if new: insert first_seen = now\n"
            "bytes_up/down += packet_len; packets += 1; last_seen = now\n"
            "recompute rate_bps on interval (EMA / sliding window)\n"
            "expire if now - last_seen > idle_timeout"
        )
    )
    story.append(P("4.6 Components", "h2"))
    story.append(
        table(
            ["Component", "Responsibility"],
            [
                ["Capture Engine", "Open interface, read packets, extract 5-tuple + length"],
                ["Flow Aggregator", "Authoritative flow table, rates, expiry"],
                ["Process Mapper", "TCP/UDP owner tables → PID → process name"],
                ["Geo Service", "mmdb lookup, private IP policy, home location"],
                ["Event Bridge", "Compact snapshots to UI"],
                ["UI Store/Views", "Filters, pause, arcs, feed, detail pin"],
            ],
            [1.9 * inch, W - 1.9 * inch],
        )
    )
    story.append(P("4.7 Architecture Decision Records", "h2"))
    story.append(
        table(
            ["ADR", "Decision", "Status"],
            [
                ["ADR-001", "Tauri 2 over Electron", "Accepted"],
                ["ADR-002", "Full Npcap capture; table fallback secondary", "Accepted"],
                ["ADR-003", "3D globe default visualization", "Accepted"],
                ["ADR-004", "Offline GeoLite2 over online-only APIs", "Accepted"],
                ["ADR-005", "Header-only; no payload storage default", "Accepted"],
                ["ADR-006", "Snapshot IPC not per-packet events", "Accepted"],
            ],
            [0.95 * inch, W - 2.05 * inch, 1.1 * inch],
        )
    )
    story.append(PageBreak())

    # 5 Plan
    story.append(P("5. Project Plan &amp; Roadmap (NV-PLAN-001)", "h1"))
    story.append(P("5.1 Delivery approach", "h2"))
    story.append(
        P(
            "Iterative phases with an early visual spike (Phase 1) to lock UX quality. "
            "Each phase ends with a demoable deliverable."
        )
    )
    story.append(P("5.2 Phases", "h2"))
    story.append(
        table(
            ["Phase", "Name", "Exit criteria"],
            [
                ["0", "Scaffold &amp; shell", "Window + premium empty dashboard"],
                ["1", "Globe visual spike", "Mock arcs wow pass"],
                ["2", "Capture engine", "Live flows + rates in backend"],
                ["3", "Enrichment", "Process + city/latlon on flows"],
                ["4", "Live wiring", "Real traffic drives globe/panels"],
                ["5", "Polish &amp; ship", "Installer + wizard + QA"],
            ],
            [0.7 * inch, 1.9 * inch, W - 2.6 * inch],
        )
    )
    story.append(P("5.3 Milestones", "h2"))
    story.append(
        table(
            ["ID", "Milestone", "Evidence"],
            [
                ["M0", "Docs baseline", "Docs/README present"],
                ["M1", "Visual prototype", "Globe mock demo"],
                ["M2", "Capture alpha", "Live flow events"],
                ["M3", "Enriched alpha", "Process + geo fields"],
                ["M4", "Integrated beta", "E2E dashboard"],
                ["M5", "v1 candidate", "Installer + QA sign-off"],
            ],
            [0.7 * inch, 1.9 * inch, W - 2.6 * inch],
        )
    )
    story.append(P("5.4 Indicative effort (solo FTE days)", "h2"))
    story.append(
        table(
            ["Phase", "Estimate"],
            [
                ["0", "0.5–1"],
                ["1", "1–2"],
                ["2", "2–4"],
                ["3", "1.5–3"],
                ["4", "2–3"],
                ["5", "1.5–3"],
                ["Total", "~9–16 days"],
            ],
            [2.5 * inch, W - 2.5 * inch],
        )
    )
    story.append(P("5.5 Definition of done", "h2"))
    story.append(
        numbers(
            [
                "Code builds without errors.",
                "Behavior matches linked requirement IDs where applicable.",
                "No payload logging introduced.",
                "Failure paths are user-readable.",
                "Docs/README updated if user-facing behavior changed.",
            ]
        )
    )
    story.append(PageBreak())

    # 6 Risk
    story.append(P("6. Risk, Security &amp; Privacy (NV-RISK-001)", "h1"))
    story.append(P("6.1 Risk register", "h2"))
    story.append(P("Score = Impact (1–5) × Likelihood (1–5)."))
    story.append(
        table(
            ["ID", "Risk", "I", "L", "Sc", "Mitigation"],
            [
                ["R-01", "Admin/Npcap friction", "5", "4", "20", "Wizard + degraded mode"],
                ["R-02", "Globe jank at high flow count", "4", "3", "12", "Top-N arcs + throttle"],
                ["R-03", "GeoLite2 license misuse", "4", "2", "8", "Never commit mmdb"],
                ["R-04", "City geo inaccuracy", "2", "4", "8", "Approximate copy; show country"],
                ["R-05", "Unknown UDP process", "3", "4", "12", "Placeholder; still geo"],
                ["R-06", "High PPS CPU", "4", "2", "8", "Header-only + batching"],
                ["R-07", "AV / privilege perception", "3", "3", "9", "Sign builds; explain admin"],
                ["R-08", "Public IP lookup privacy", "3", "2", "6", "Document; allow override"],
                ["R-09", "Scope creep to SIEM", "3", "3", "9", "SRS non-goals fence"],
                ["R-10", "WebGL/driver issues", "3", "2", "6", "Document GPU requirements"],
            ],
            [0.55 * inch, 2.1 * inch, 0.35 * inch, 0.35 * inch, 0.4 * inch, W - 3.75 * inch],
        )
    )
    story.append(P("6.2 Security principles", "h2"))
    story.append(
        numbers(
            [
                "Least data — headers + counters only.",
                "Local-first — no telemetry backend in v1.",
                "Explicit privilege — never hide UAC need.",
                "Fail closed on capture errors — no silent fake capture.",
                "Dependency hygiene — pin versions; review native deps.",
            ]
        )
    )
    story.append(P("6.3 Privacy data categories", "h2"))
    story.append(
        table(
            ["Category", "Stored?", "Leaves device?"],
            [
                ["Flow metadata (IP, ports, bytes, process)", "Memory only (v1)", "No"],
                ["Geo results", "Session cache", "No"],
                ["Settings", "Local disk", "No"],
                ["Public IP query", "Transient", "Yes if used (optional)"],
                ["Packet payload", "Not stored", "N/A"],
            ],
            [3.0 * inch, 2.0 * inch, W - 5.0 * inch],
        )
    )
    story.append(P("6.4 Residual risk statement", "h2"))
    story.append(
        P(
            "After mitigations, residual risk is acceptable for v1 personal/desktop use, dominated by "
            "setup friction (Npcap/admin) and approximate geolocation. Enterprise fleet use is not "
            "certified by this document."
        )
    )
    story.append(PageBreak())

    # 7 Appendix
    story.append(P("7. Appendix", "h1"))
    story.append(P("7.1 Technology stack", "h2"))
    story.append(
        table(
            ["Area", "Choice"],
            [
                ["Shell", "Tauri 2"],
                ["UI", "React 18 + TypeScript + Vite"],
                ["Globe", "react-globe.gl (Three.js)"],
                ["Capture", "Npcap + Rust pcap"],
                ["Parse", "etherparse / pnet_packet"],
                ["Process", "windows crate / IP Helper"],
                ["GeoIP", "maxminddb + GeoLite2-City"],
                ["State", "Zustand (planned)"],
            ],
            [2.2 * inch, W - 2.2 * inch],
        )
    )
    story.append(P("7.2 Glossary", "h2"))
    story.append(
        table(
            ["Term", "Definition"],
            [
                ["Flow", "Logical conversation identified by 5-tuple"],
                ["5-tuple", "src IP/port, dst IP/port, protocol"],
                ["Home location", "Arc origin (public IP geo or override)"],
                ["Arc", "Visual link on the 3D globe"],
                ["Enrichment", "Adding process + geo metadata to a flow"],
                ["Delta snapshot", "Incremental UI update of flows"],
            ],
            [1.8 * inch, W - 1.8 * inch],
        )
    )
    story.append(Spacer(1, 0.4 * inch))
    story.append(
        P(
            "— End of Network Visualizer Project Documentation Package —",
            "meta",
        )
    )

    doc = SimpleDocTemplate(
        str(OUT),
        pagesize=letter,
        leftMargin=0.7 * inch,
        rightMargin=0.7 * inch,
        topMargin=0.85 * inch,
        bottomMargin=0.75 * inch,
        title="Network Visualizer — Project Documentation Package",
        author="Network Visualizer Project",
        subject="NV-PKG-001",
    )
    doc.build(story, onFirstPage=add_header_footer, onLaterPages=add_header_footer)
    print(f"Wrote {OUT}")


if __name__ == "__main__":
    build()

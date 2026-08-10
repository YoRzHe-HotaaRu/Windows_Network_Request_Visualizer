/**
 * Generates Network Visualizer corporate documentation package (DOCX).
 * Run: node scripts/generate-project-docs.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  Header,
  Footer,
  AlignmentType,
  HeadingLevel,
  BorderStyle,
  WidthType,
  ShadingType,
  PageNumber,
  PageBreak,
  LevelFormat,
} from "docx";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const outDir = path.join(root, "docs", "export");
fs.mkdirSync(outDir, { recursive: true });

const PAGE_W = 12240;
const PAGE_H = 15840;
const MARGIN = 1080; // 0.75"
const CONTENT_W = PAGE_W - MARGIN * 2; // 10080

const colors = {
  primary: "0B1F3A",
  accent: "0E7490",
  headerBg: "0B1F3A",
  altRow: "F0F9FF",
  border: "CBD5E1",
  white: "FFFFFF",
  muted: "64748B",
  text: "0F172A",
};

const thin = { style: BorderStyle.SINGLE, size: 4, color: colors.border };
const borders = { top: thin, bottom: thin, left: thin, right: thin };
const noBorder = {
  style: BorderStyle.NONE,
  size: 0,
  color: "FFFFFF",
};
const noBorders = { top: noBorder, bottom: noBorder, left: noBorder, right: noBorder };

function p(text, opts = {}) {
  return new Paragraph({
    spacing: { after: opts.after ?? 120, before: opts.before ?? 0, line: opts.line },
    alignment: opts.align,
    ...opts.paragraph,
    children: [
      new TextRun({
        text,
        font: "Arial",
        size: opts.size ?? 22,
        bold: opts.bold,
        italics: opts.italics,
        color: opts.color ?? colors.text,
      }),
    ],
  });
}

function h1(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 360, after: 200 },
    children: [new TextRun({ text, font: "Arial", bold: true, size: 32, color: colors.primary })],
  });
}

function h2(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 280, after: 140 },
    children: [new TextRun({ text, font: "Arial", bold: true, size: 26, color: colors.accent })],
  });
}

function h3(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_3,
    spacing: { before: 200, after: 100 },
    children: [new TextRun({ text, font: "Arial", bold: true, size: 24, color: colors.primary })],
  });
}

function bullet(text, ref = "bullets") {
  return new Paragraph({
    numbering: { reference: ref, level: 0 },
    spacing: { after: 80 },
    children: [new TextRun({ text, font: "Arial", size: 20, color: colors.text })],
  });
}

function numbered(text, ref = "numbers") {
  return new Paragraph({
    numbering: { reference: ref, level: 0 },
    spacing: { after: 80 },
    children: [new TextRun({ text, font: "Arial", size: 20, color: colors.text })],
  });
}

function cell(text, width, opts = {}) {
  return new TableCell({
    borders: opts.noBorder ? noBorders : borders,
    width: { size: width, type: WidthType.DXA },
    shading: opts.fill
      ? { fill: opts.fill, type: ShadingType.CLEAR }
      : undefined,
    margins: { top: 60, bottom: 60, left: 80, right: 80 },
    verticalAlign: "center",
    children: [
      new Paragraph({
        children: [
          new TextRun({
            text: String(text ?? ""),
            font: "Arial",
            size: opts.size ?? 18,
            bold: opts.bold,
            color: opts.color ?? (opts.header ? colors.white : colors.text),
          }),
        ],
      }),
    ],
  });
}

function makeTable(headers, rows, colWidths) {
  const widths = colWidths ?? headers.map(() => Math.floor(CONTENT_W / headers.length));
  // normalize sum
  const sum = widths.reduce((a, b) => a + b, 0);
  if (sum !== CONTENT_W) widths[widths.length - 1] += CONTENT_W - sum;

  return new Table({
    width: { size: CONTENT_W, type: WidthType.DXA },
    columnWidths: widths,
    rows: [
      new TableRow({
        children: headers.map((h, i) =>
          cell(h, widths[i], { header: true, fill: colors.headerBg, bold: true })
        ),
      }),
      ...rows.map((row, ri) =>
        new TableRow({
          children: row.map((c, i) =>
            cell(c, widths[i], { fill: ri % 2 === 1 ? colors.altRow : undefined })
          ),
        })
      ),
    ],
  });
}

function monoBlock(lines) {
  return lines.map(
    (line) =>
      new Paragraph({
        spacing: { after: 0, line: 240 },
        shading: { fill: "F1F5F9", type: ShadingType.CLEAR },
        children: [
          new TextRun({
            text: line || " ",
            font: "Consolas",
            size: 15,
            color: "1E293B",
          }),
        ],
      })
  );
}

function pageBreak() {
  return new Paragraph({ children: [new PageBreak()] });
}

function spacer(after = 200) {
  return new Paragraph({ spacing: { after }, children: [] });
}

const children = [
  // ===== COVER =====
  spacer(1200),
  new Paragraph({
    alignment: AlignmentType.CENTER,
    children: [
      new TextRun({
        text: "NETWORK VISUALIZER",
        font: "Arial",
        bold: true,
        size: 56,
        color: colors.primary,
      }),
    ],
  }),
  spacer(200),
  new Paragraph({
    alignment: AlignmentType.CENTER,
    border: {
      bottom: { style: BorderStyle.SINGLE, size: 18, color: colors.accent, space: 1 },
    },
    spacing: { after: 400 },
    children: [
      new TextRun({
        text: "Project Documentation Package",
        font: "Arial",
        size: 32,
        color: colors.accent,
      }),
    ],
  }),
  p("Corporate software development baseline", {
    align: AlignmentType.CENTER,
    size: 24,
    color: colors.muted,
    after: 400,
  }),
  spacer(400),
  makeTable(
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
    [3200, CONTENT_W - 3200]
  ),
  spacer(600),
  p("Includes: Project Proposal · Software Requirements Specification · System Architecture & Design · Project Plan & Roadmap · Risk, Security & Privacy", {
    align: AlignmentType.CENTER,
    size: 18,
    italics: true,
    color: colors.muted,
  }),
  pageBreak(),

  // ===== TOC-like outline =====
  h1("1. Document Control"),
  p("This package consolidates the enterprise documentation set for Network Visualizer. Markdown sources of truth live under /docs; this file is the stakeholder-facing export."),
  h2("1.1 Document map"),
  makeTable(
    ["ID", "Title", "Audience"],
    [
      ["NV-PROP-001", "Project Proposal & Business Case", "Sponsors, product, eng"],
      ["NV-SRS-001", "Software Requirements Specification", "Product, eng, QA"],
      ["NV-SAD-001", "System Architecture & Design", "Engineering, architecture"],
      ["NV-PLAN-001", "Project Plan & Roadmap", "PM, engineering"],
      ["NV-RISK-001", "Risk, Security & Privacy", "Security, compliance"],
    ],
    [1800, 4200, CONTENT_W - 6000]
  ),
  h2("1.2 Revision history"),
  makeTable(
    ["Ver", "Date", "Author", "Notes"],
    [["1.0", "2026-08-10", "Project team", "Initial approved baseline"]],
    [1000, 1800, 2200, CONTENT_W - 5000]
  ),
  pageBreak(),

  // ===== PROPOSAL =====
  h1("2. Project Proposal & Business Case (NV-PROP-001)"),
  h2("2.1 Executive summary"),
  p("Network Visualizer is a Windows desktop application that answers: where does my network traffic go, and which application is sending it? The product captures host traffic, attributes flows to processes, geolocates remote endpoints, and renders connections as animated arcs on a 3D interactive globe inside a premium operations-center dashboard."),
  p("Recommendation: Proceed to build Phases 0–5 using Tauri 2 + React + TypeScript, Rust/Npcap full traffic capture, MaxMind GeoLite2, and react-globe.gl visualization."),
  h2("2.2 Problem statement"),
  makeTable(
    ["Pain", "Today’s experience"],
    [
      ["Opaque destinations", "Users see Connected but not where on Earth"],
      ["Tool fragmentation", "Task Manager, Wireshark, DevTools each show a slice"],
      ["Cognitive load", "Raw IP tables are accurate but not intuitive"],
      ["Privacy anxiety", "Users want local insight without cloud PCAP upload"],
    ],
    [2800, CONTENT_W - 2800]
  ),
  h2("2.3 Goals (v1)"),
  numbered("Visualize active host network flows on a world globe (home → destination)."),
  numbered("Attribute flows to process name / PID where OS APIs allow."),
  numbered("Measure approximate throughput via full traffic capture."),
  numbered("Deliver a polished dark ops dashboard UX with smooth animation."),
  numbered("Operate local-first with no mandatory cloud telemetry."),
  h2("2.4 Non-goals (v1)"),
  bullet("Multi-host / fleet monitoring"),
  bullet("Full packet payload inspection or HTTPS MITM"),
  bullet("Official Linux/macOS shipping builds"),
  bullet("Commercial GeoIP accuracy SLAs"),
  bullet("Intrusion detection / automated threat scoring"),
  h2("2.5 Target users"),
  makeTable(
    ["Persona", "Need", "Success moment"],
    [
      ["Power user", "What is my PC talking to?", "Chrome arcs to CDNs appear"],
      ["Developer", "Debug outbound calls", "Filter by process, pin a flow"],
      ["Home lab / small IT", "Spatial overview", "Top countries strip answers who is chatty"],
      ["Educator", "Teach networking", "Globe makes TCP/UDP geo tangible"],
    ],
    [2200, 3200, CONTENT_W - 5400]
  ),
  h2("2.6 Solution overview"),
  makeTable(
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
    [2200, 3000, CONTENT_W - 5200]
  ),
  h2("2.7 Success criteria"),
  numbered("Demo-ready wow within 30 seconds after setup on clean Windows 11."),
  numbered("Real browsing produces geo arcs with process labels."),
  numbered("Core filters and pause work without deep training."),
  numbered("Documented install path; GitHub README sufficient for contributors."),
  numbered("No cloud telemetry by default; privacy model documented."),
  h2("2.8 Alternatives considered"),
  makeTable(
    ["Option", "Decision"],
    [
      ["Connection table only", "Fallback mode only — primary is full capture"],
      ["Electron", "Rejected for size; prefer Tauri"],
      ["Pure WinUI/WPF", "Harder cinematic 3D; prefer WebView globe"],
      ["2D map only", "Deferred; 3D is default for v1"],
      ["Cloud geo API only", "Rejected as primary; offline mmdb preferred"],
    ],
    [3200, CONTENT_W - 3200]
  ),
  pageBreak(),

  // ===== SRS =====
  h1("3. Software Requirements Specification (NV-SRS-001)"),
  h2("3.1 Purpose and scope"),
  p("This SRS defines functional and non-functional requirements for Network Visualizer v1: single-machine Windows client, local capture, process enrichment, offline GeoIP, 3D visualization, dashboard UX, and packaging."),
  h2("3.2 Functional requirements — Capture"),
  makeTable(
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
    [1200, CONTENT_W - 2200, 1000]
  ),
  h2("3.3 Process attribution"),
  makeTable(
    ["ID", "Requirement", "Pri"],
    [
      ["PRC-01", "Map local TCP endpoints to PID via IP Helper", "Must"],
      ["PRC-02", "Resolve PID to process name/path when permitted", "Must"],
      ["PRC-03", "Attempt UDP mapping where OS allows", "Should"],
      ["PRC-04", "Unknown process shows clear placeholder", "Must"],
    ],
    [1200, CONTENT_W - 2200, 1000]
  ),
  h2("3.4 Geolocation"),
  makeTable(
    ["ID", "Requirement", "Pri"],
    [
      ["GEO-01", "Resolve public remotes via offline GeoLite2-City", "Must"],
      ["GEO-02", "Session memory cache for lookups", "Must"],
      ["GEO-03", "Private/reserved IPs marked LAN/private", "Must"],
      ["GEO-04", "Home location via public IP geo (or override)", "Must"],
      ["GEO-05", "User can override home coordinates", "Should"],
      ["GEO-06", "Geo DB acquisition/path without license violation", "Must"],
    ],
    [1200, CONTENT_W - 2200, 1000]
  ),
  h2("3.5 Visualization & UX"),
  makeTable(
    ["ID", "Requirement", "Pri"],
    [
      ["VIS-01", "Interactive 3D globe", "Must"],
      ["VIS-02", "Animated arcs home → destination", "Must"],
      ["VIS-05", "Cap rendered arcs (top-N) for frame rate", "Must"],
      ["UX-01", "Header, KPIs, globe, feed, bottom charts layout", "Must"],
      ["UX-02", "KPIs: flows, aggregate rates, destinations", "Must"],
      ["UX-03", "Live feed with process, IP, location, rate", "Must"],
      ["UX-04", "Hover tooltip with full flow summary", "Must"],
      ["UX-06", "Filters: process, country, protocol, min rate", "Must"],
      ["UX-07", "Pause freezes UI snapshot updates", "Must"],
      ["UX-08", "Dark ops-center aesthetic with glass panels", "Must"],
      ["UX-09", "First-run wizard: Npcap, elevation, GeoIP", "Must"],
    ],
    [1200, CONTENT_W - 2200, 1000]
  ),
  h2("3.6 Non-functional requirements"),
  bullet("PERF: Target 60 FPS globe under typical desktop traffic; throttle UI updates."),
  bullet("REL: Capture failures surface actionable UI states."),
  bullet("SEC: No payloads by default; no cloud telemetry; privilege explicit."),
  bullet("USE: Core path start → arcs under 2 minutes after prerequisites."),
  bullet("MAIN: Modular Rust modules; typed IPC; unit tests for flow/geo math."),
  bullet("COMP: Windows 10 22H2+ and Windows 11 x64."),
  h2("3.7 Acceptance criteria (v1)"),
  numbered("With Npcap + admin + GeoIP, browsing produces visible arcs."),
  numbered("Major browser process names appear on enriched flows."),
  numbered("Hover shows process, location, rate."),
  numbered("Filters reduce arcs/feed consistently; pause freezes feed."),
  numbered("Missing Npcap/elevation yields clear remediation."),
  numbered("README + docs package present in repository."),
  pageBreak(),

  // ===== ARCHITECTURE =====
  h1("4. System Architecture & Design (NV-SAD-001)"),
  h2("4.1 Architectural goals"),
  makeTable(
    ["Goal", "Design response"],
    [
      ["Real-time feel", "Event deltas every 250–500 ms; never per-packet UI"],
      ["Silky 3D UI", "WebGL globe isolated from capture thread"],
      ["Safe capture", "Header-only parse; privileged code in Rust"],
      ["Extensibility", "Modules: capture, flow, process, geo"],
      ["Small footprint", "Tauri instead of Electron"],
    ],
    [2800, CONTENT_W - 2800]
  ),
  h2("4.2 Context diagram"),
  ...monoBlock([
    "                 +---------------------------+",
    "                 |     User / Operator       |",
    "                 +-------------+-------------+",
    "                               |",
    "                 +-------------v-------------+",
    "                 |  Network Visualizer App   |",
    "                 |  Tauri + React + Rust     |",
    "                 +------+------------+-------+",
    "            packets|            | optional HTTP",
    "        +----------v---+   +----v-----------+",
    "        | Windows NIC  |   | Public IP API  |",
    "        | Npcap+Helper |   | (home locate)  |",
    "        +------+-------+   +----------------+",
    "               | local file",
    "        +------v-------+",
    "        | GeoLite2 mmdb|",
    "        +--------------+",
  ]),
  h2("4.3 Logical component architecture"),
  ...monoBlock([
    "Presentation: React | Zustand | Globe | KPI | Feed | Filters",
    "        |  Tauri invoke + events",
    "Application: commands + flow_snapshot emitter",
    "        |",
    "Domain services:",
    "  Capture Engine -> Flow Aggregator <- Process Mapper",
    "                 -> Geo Service",
    "        |",
    "Infrastructure: Npcap | IP Helper | maxminddb | optional HTTPS",
  ]),
  h2("4.4 Data pipeline"),
  ...monoBlock([
    "[NIC] -> [Npcap] -> [Parse L3/L4] -> [Flow table]",
    "   -> [Rates + expiry] -> [Process join] -> [Geo enrich]",
    "   -> [Snapshot 250-500ms] -> [React store] -> [Globe + Feed + KPIs]",
  ]),
  h2("4.5 Flow aggregation algorithm"),
  ...monoBlock([
    "key = hash(src_ip, src_port, dst_ip, dst_port, protocol)",
    "if new: insert first_seen = now",
    "bytes_up/down += packet_len; packets += 1; last_seen = now",
    "recompute rate_bps on interval (EMA / sliding window)",
    "expire if now - last_seen > idle_timeout",
  ]),
  h2("4.6 Component responsibilities"),
  makeTable(
    ["Component", "Responsibility"],
    [
      ["Capture Engine", "Open interface, read packets, extract 5-tuple + length"],
      ["Flow Aggregator", "Authoritative flow table, rates, expiry"],
      ["Process Mapper", "TCP/UDP owner tables → PID → process name"],
      ["Geo Service", "mmdb lookup, private IP policy, home location"],
      ["Event Bridge", "Compact snapshots to UI"],
      ["UI Store/Views", "Filters, pause, arcs, feed, detail pin"],
    ],
    [2800, CONTENT_W - 2800]
  ),
  h2("4.7 IPC contract (illustrative)"),
  bullet("Commands: startCapture, stopCapture, getStatus, updateSettings, getSettings"),
  bullet("Event flow_snapshot: timestamp, status, totals, top-N enriched flows"),
  h2("4.8 UI layout regions"),
  makeTable(
    ["Region", "Content"],
    [
      ["Header", "Brand, LIVE/PAUSED, pause, settings"],
      ["Left", "KPIs + filters"],
      ["Center", "3D globe"],
      ["Right", "Live feed + pinned detail"],
      ["Bottom", "Top processes, countries, throughput"],
    ],
    [2400, CONTENT_W - 2400]
  ),
  h2("4.9 Design tokens"),
  makeTable(
    ["Token", "Value"],
    [
      ["bg-deep", "#05080f"],
      ["bg-panel", "#0b1220 (glass)"],
      ["accent-cyan", "#22d3ee"],
      ["accent-violet", "#a78bfa"],
      ["text-primary", "#e2e8f0"],
    ],
    [2800, CONTENT_W - 2800]
  ),
  h2("4.10 Architecture Decision Records"),
  makeTable(
    ["ADR", "Decision", "Status"],
    [
      ["ADR-001", "Tauri 2 over Electron", "Accepted"],
      ["ADR-002", "Full Npcap capture; table fallback secondary", "Accepted"],
      ["ADR-003", "3D globe default visualization", "Accepted"],
      ["ADR-004", "Offline GeoLite2 over online-only APIs", "Accepted"],
      ["ADR-005", "Header-only; no payload storage default", "Accepted"],
      ["ADR-006", "Snapshot IPC not per-packet events", "Accepted"],
    ],
    [1400, CONTENT_W - 2800, 1400]
  ),
  h2("4.11 Error taxonomy"),
  makeTable(
    ["Code", "Meaning", "UX"],
    [
      ["NPCAP_MISSING", "Driver not installed", "Wizard install link"],
      ["NOT_ELEVATED", "Need administrator", "Relaunch prompt"],
      ["IFACE_OPEN_FAIL", "Cannot open device", "Pick another interface"],
      ["GEO_DB_MISSING", "mmdb not found", "Path / download steps"],
      ["CAPTURE_STOPPED", "User or error stop", "Status chip"],
    ],
    [2400, 3200, CONTENT_W - 5600]
  ),
  pageBreak(),

  // ===== PLAN =====
  h1("5. Project Plan & Roadmap (NV-PLAN-001)"),
  h2("5.1 Delivery approach"),
  p("Iterative phases with an early visual spike (Phase 1) to lock UX quality. Each phase ends with a demoable deliverable."),
  h2("5.2 Work breakdown structure"),
  ...monoBlock([
    "1.0 Foundation — scaffold, tooling, docs",
    "2.0 Presentation — design system, globe, feed, polish",
    "3.0 Capture plane — interface, pcap loop, flows, errors",
    "4.0 Enrichment — process map, geo, home location",
    "5.0 Integration — IPC, live store, top-N performance",
    "6.0 Release — wizard, settings, installer, QA",
  ]),
  h2("5.3 Phases"),
  makeTable(
    ["Phase", "Name", "Exit criteria"],
    [
      ["0", "Scaffold & shell", "Window + premium empty dashboard"],
      ["1", "Globe visual spike", "Mock arcs wow pass"],
      ["2", "Capture engine", "Live flows + rates in backend"],
      ["3", "Enrichment", "Process + city/latlon on flows"],
      ["4", "Live wiring", "Real traffic drives globe/panels"],
      ["5", "Polish & ship", "Installer + wizard + QA"],
    ],
    [1000, 2800, CONTENT_W - 3800]
  ),
  h2("5.4 Milestones"),
  makeTable(
    ["ID", "Milestone", "Evidence"],
    [
      ["M0", "Docs baseline", "Docs/README present"],
      ["M1", "Visual prototype", "Globe mock demo"],
      ["M2", "Capture alpha", "Live flow events"],
      ["M3", "Enriched alpha", "Process + geo fields"],
      ["M4", "Integrated beta", "E2E dashboard"],
      ["M5", "v1 candidate", "Installer + QA sign-off"],
    ],
    [1000, 2800, CONTENT_W - 3800]
  ),
  h2("5.5 Indicative effort (solo FTE days)"),
  makeTable(
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
    [4000, CONTENT_W - 4000]
  ),
  h2("5.6 Definition of done"),
  numbered("Code builds without errors."),
  numbered("Behavior matches linked requirement IDs where applicable."),
  numbered("No payload logging introduced."),
  numbered("Failure paths are user-readable."),
  numbered("Docs/README updated if user-facing behavior changed."),
  h2("5.7 Manual QA checklist (v1)"),
  bullet("Launch without admin → clear elevation message"),
  bullet("Launch without Npcap → clear install guidance"),
  bullet("Launch ready → LIVE status"),
  bullet("Open browser → arcs appear"),
  bullet("Process filter works; hover tooltip complete"),
  bullet("Pause freezes feed; home override moves origins"),
  bullet("High-tab stress → UI remains responsive"),
  pageBreak(),

  // ===== RISK =====
  h1("6. Risk, Security & Privacy (NV-RISK-001)"),
  h2("6.1 Risk register"),
  p("Score = Impact (1–5) × Likelihood (1–5).", { size: 18, italics: true, color: colors.muted }),
  makeTable(
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
    [900, 2800, 500, 500, 600, CONTENT_W - 5300]
  ),
  h2("6.2 Threat model (STRIDE-lite)"),
  makeTable(
    ["Asset", "Threat", "Mitigation"],
    [
      ["Packet metadata", "Local malware reading memory", "OS isolation; no default export"],
      ["Admin privileges", "Malicious installer", "Code signing; open review"],
      ["Geo DB path", "Path issues", "Validate; open read-only"],
      ["Public IP API", "Third-party tracking", "Minimize; offline override"],
    ],
    [2400, 3200, CONTENT_W - 5600]
  ),
  h2("6.3 Security principles"),
  numbered("Least data — headers + counters only."),
  numbered("Local-first — no telemetry backend in v1."),
  numbered("Explicit privilege — never hide UAC need."),
  numbered("Fail closed on capture errors — no silent fake capture."),
  numbered("Dependency hygiene — pin versions; review native deps."),
  h2("6.4 Privacy data categories"),
  makeTable(
    ["Category", "Stored?", "Leaves device?"],
    [
      ["Flow metadata (IP, ports, bytes, process)", "Memory only (v1)", "No"],
      ["Geo results", "Session cache", "No"],
      ["Settings", "Local disk", "No"],
      ["Public IP query", "Transient", "Yes if used (optional)"],
      ["Packet payload", "Not stored", "N/A"],
    ],
    [4200, 2400, CONTENT_W - 6600]
  ),
  h2("6.5 Third-party license notes"),
  bullet("Npcap: user-installed; respect Npcap redistribution terms."),
  bullet("GeoLite2: user-obtained DB; MaxMind attribution; do not illegally bundle."),
  bullet("OSS stack (Tauri, React, globe.gl): include NOTICE/attribution."),
  h2("6.6 Residual risk statement"),
  p("After mitigations, residual risk is acceptable for v1 personal/desktop use, dominated by setup friction (Npcap/admin) and approximate geolocation. Enterprise fleet use is not certified by this document."),
  pageBreak(),

  // ===== APPENDIX =====
  h1("7. Appendix"),
  h2("7.1 Technology stack summary"),
  makeTable(
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
    [3200, CONTENT_W - 3200]
  ),
  h2("7.2 Proposed repository structure"),
  ...monoBlock([
    "Network_Visualizer/",
    "  docs/ (+ export DOCX/PDF)",
    "  src-tauri/src/{capture,flow,process,geo,events}",
    "  src/{components,stores,hooks,styles}",
    "  README.md",
    "  package.json",
  ]),
  h2("7.3 Related repository files"),
  bullet("README.md — GitHub-facing architecture, diagrams, setup"),
  bullet("docs/*.md — source-of-truth modular documents"),
  bullet("docs/export/* — this package in DOCX/PDF"),
  h2("7.4 Glossary"),
  makeTable(
    ["Term", "Definition"],
    [
      ["Flow", "Logical conversation identified by 5-tuple"],
      ["5-tuple", "src IP/port, dst IP/port, protocol"],
      ["Home location", "Arc origin (public IP geo or override)"],
      ["Arc", "Visual link on the 3D globe"],
      ["Enrichment", "Adding process + geo metadata to a flow"],
      ["Delta snapshot", "Incremental UI update of flows"],
    ],
    [2800, CONTENT_W - 2800]
  ),
  spacer(400),
  p("— End of Network Visualizer Project Documentation Package —", {
    align: AlignmentType.CENTER,
    italics: true,
    color: colors.muted,
    size: 18,
  }),
];

const doc = new Document({
  styles: {
    default: {
      document: {
        run: { font: "Arial", size: 22 },
      },
    },
    paragraphStyles: [
      {
        id: "Heading1",
        name: "Heading 1",
        basedOn: "Normal",
        next: "Normal",
        quickFormat: true,
        run: { size: 32, bold: true, font: "Arial", color: colors.primary },
        paragraph: { spacing: { before: 360, after: 200 }, outlineLevel: 0 },
      },
      {
        id: "Heading2",
        name: "Heading 2",
        basedOn: "Normal",
        next: "Normal",
        quickFormat: true,
        run: { size: 26, bold: true, font: "Arial", color: colors.accent },
        paragraph: { spacing: { before: 280, after: 140 }, outlineLevel: 1 },
      },
      {
        id: "Heading3",
        name: "Heading 3",
        basedOn: "Normal",
        next: "Normal",
        quickFormat: true,
        run: { size: 24, bold: true, font: "Arial", color: colors.primary },
        paragraph: { spacing: { before: 200, after: 100 }, outlineLevel: 2 },
      },
    ],
  },
  numbering: {
    config: [
      {
        reference: "bullets",
        levels: [
          {
            level: 0,
            format: LevelFormat.BULLET,
            text: "•",
            alignment: AlignmentType.LEFT,
            style: { paragraph: { indent: { left: 720, hanging: 360 } } },
          },
        ],
      },
      {
        reference: "numbers",
        levels: [
          {
            level: 0,
            format: LevelFormat.DECIMAL,
            text: "%1.",
            alignment: AlignmentType.LEFT,
            style: { paragraph: { indent: { left: 720, hanging: 360 } } },
          },
        ],
      },
    ],
  },
  sections: [
    {
      properties: {
        page: {
          size: { width: PAGE_W, height: PAGE_H },
          margin: { top: MARGIN, right: MARGIN, bottom: MARGIN, left: MARGIN },
        },
      },
      headers: {
        default: new Header({
          children: [
            new Paragraph({
              border: {
                bottom: { style: BorderStyle.SINGLE, size: 6, color: colors.accent, space: 4 },
              },
              spacing: { after: 120 },
              children: [
                new TextRun({
                  text: "Network Visualizer  ·  Project Documentation Package  ·  NV-PKG-001",
                  font: "Arial",
                  size: 16,
                  color: colors.muted,
                }),
              ],
            }),
          ],
        }),
      },
      footers: {
        default: new Footer({
          children: [
            new Paragraph({
              border: {
                top: { style: BorderStyle.SINGLE, size: 6, color: colors.border, space: 4 },
              },
              spacing: { before: 80 },
              alignment: AlignmentType.RIGHT,
              children: [
                new TextRun({ text: "Confidential / Project Use  ·  Page ", font: "Arial", size: 16, color: colors.muted }),
                new TextRun({ children: [PageNumber.CURRENT], font: "Arial", size: 16, color: colors.muted }),
                new TextRun({ text: " of ", font: "Arial", size: 16, color: colors.muted }),
                new TextRun({ children: [PageNumber.TOTAL_PAGES], font: "Arial", size: 16, color: colors.muted }),
              ],
            }),
          ],
        }),
      },
      children,
    },
  ],
});

const outDocx = path.join(outDir, "Network_Visualizer_Project_Documentation_Package.docx");
const buffer = await Packer.toBuffer(doc);
fs.writeFileSync(outDocx, buffer);
console.log("Wrote", outDocx);

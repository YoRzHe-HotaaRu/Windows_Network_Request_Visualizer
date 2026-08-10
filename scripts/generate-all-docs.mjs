/**
 * Generate separate DOCX files for every project document + combined package.
 * Run: node scripts/generate-all-docs.mjs
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
  LevelFormat,
} from "docx";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const outDir = path.join(root, "docs", "export");
fs.mkdirSync(outDir, { recursive: true });

const PAGE_W = 12240;
const PAGE_H = 15840;
const MARGIN = 1080;
const CONTENT_W = PAGE_W - MARGIN * 2;
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

function p(text, opts = {}) {
  return new Paragraph({
    spacing: { after: opts.after ?? 120, before: opts.before ?? 0 },
    alignment: opts.align,
    children: [
      new TextRun({
        text,
        font: "Arial",
        size: opts.size ?? 20,
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
    spacing: { before: 280, after: 160 },
    children: [new TextRun({ text, font: "Arial", bold: true, size: 30, color: colors.primary })],
  });
}
function h2(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 220, after: 120 },
    children: [new TextRun({ text, font: "Arial", bold: true, size: 24, color: colors.accent })],
  });
}
function bullet(text) {
  return new Paragraph({
    numbering: { reference: "bullets", level: 0 },
    spacing: { after: 60 },
    children: [new TextRun({ text, font: "Arial", size: 19, color: colors.text })],
  });
}
function cell(text, width, opts = {}) {
  return new TableCell({
    borders,
    width: { size: width, type: WidthType.DXA },
    shading: opts.fill ? { fill: opts.fill, type: ShadingType.CLEAR } : undefined,
    margins: { top: 50, bottom: 50, left: 70, right: 70 },
    children: [
      new Paragraph({
        children: [
          new TextRun({
            text: String(text ?? ""),
            font: "Arial",
            size: opts.size ?? 16,
            bold: opts.bold || opts.header,
            color: opts.header ? colors.white : colors.text,
          }),
        ],
      }),
    ],
  });
}
function makeTable(headers, rows, colWidths) {
  const widths = [...colWidths];
  const sum = widths.reduce((a, b) => a + b, 0);
  if (sum !== CONTENT_W) widths[widths.length - 1] += CONTENT_W - sum;
  return new Table({
    width: { size: CONTENT_W, type: WidthType.DXA },
    columnWidths: widths,
    rows: [
      new TableRow({
        children: headers.map((h, i) => cell(h, widths[i], { header: true, fill: colors.headerBg, bold: true })),
      }),
      ...rows.map((row, ri) =>
        new TableRow({
          children: row.map((c, i) => cell(c, widths[i], { fill: ri % 2 === 1 ? colors.altRow : undefined })),
        })
      ),
    ],
  });
}

async function writeDoc({ id, title, subtitle, sections }) {
  const children = [
    p("NETWORK VISUALIZER", { size: 18, color: colors.muted, after: 40 }),
    new Paragraph({
      spacing: { after: 80 },
      children: [new TextRun({ text: title, font: "Arial", bold: true, size: 36, color: colors.primary })],
    }),
    p(subtitle, { size: 20, color: colors.accent, after: 80 }),
    makeTable(
      ["Field", "Value"],
      [
        ["Document ID", id],
        ["Product", "Network Visualizer"],
        ["Version", "1.0"],
        ["Date", "2026-08-10"],
        ["Status", "Baseline"],
      ],
      [2800, CONTENT_W - 2800]
    ),
    p(""),
    ...sections.flatMap((s) => s),
  ];

  const doc = new Document({
    styles: {
      default: { document: { run: { font: "Arial", size: 20 } } },
      paragraphStyles: [
        {
          id: "Heading1",
          name: "Heading 1",
          basedOn: "Normal",
          next: "Normal",
          quickFormat: true,
          run: { size: 30, bold: true, font: "Arial", color: colors.primary },
          paragraph: { spacing: { before: 280, after: 160 }, outlineLevel: 0 },
        },
        {
          id: "Heading2",
          name: "Heading 2",
          basedOn: "Normal",
          next: "Normal",
          quickFormat: true,
          run: { size: 24, bold: true, font: "Arial", color: colors.accent },
          paragraph: { spacing: { before: 220, after: 120 }, outlineLevel: 1 },
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
                border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: colors.accent, space: 4 } },
                children: [
                  new TextRun({
                    text: `Network Visualizer  ·  ${id}  ·  ${title}`,
                    font: "Arial",
                    size: 14,
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
                alignment: AlignmentType.RIGHT,
                children: [
                  new TextRun({ text: "Page ", font: "Arial", size: 14, color: colors.muted }),
                  new TextRun({ children: [PageNumber.CURRENT], font: "Arial", size: 14, color: colors.muted }),
                ],
              }),
            ],
          }),
        },
        children,
      },
    ],
  });

  const file = path.join(outDir, `${id}_${title.replace(/[^a-zA-Z0-9]+/g, "_")}.docx`);
  fs.writeFileSync(file, await Packer.toBuffer(doc));
  console.log("Wrote", path.basename(file));
  return file;
}

const docs = [
  {
    id: "NV-PROP-001",
    title: "Project_Proposal",
    subtitle: "Project Proposal & Business Case",
    sections: [
      [h1("1. Executive summary"), p("Windows desktop app that visualizes where network traffic goes on a 3D globe with process attribution and live rates."), p("Recommendation: build Phases 0–5 with Tauri 2 + React + Rust + Npcap + GeoLite2.")],
      [h1("2. Problem"), makeTable(["Pain", "Experience"], [["Opaque destinations", "Connected but no geography"], ["Tool fragmentation", "Wireshark vs Task Manager"], ["Privacy", "Want local insight"]], [3200, CONTENT_W - 3200])],
      [h1("3. Goals"), bullet("Map flows home → destination"), bullet("Process attribution"), bullet("Throughput measurement"), bullet("Premium dashboard UX"), bullet("Local-first privacy")],
      [h1("4. Non-goals"), bullet("Fleet SIEM"), bullet("HTTPS MITM"), bullet("Multi-OS v1")],
      [h1("5. Stack"), makeTable(["Layer", "Tech"], [["Shell", "Tauri 2"], ["UI", "React + TS"], ["Globe", "react-globe.gl"], ["Capture", "Npcap/Rust"], ["Geo", "GeoLite2"]], [3000, CONTENT_W - 3000])],
    ],
  },
  {
    id: "NV-SRS-001",
    title: "Software_Requirements_Specification",
    subtitle: "Software Requirements Specification",
    sections: [
      [h1("1. Scope"), p("Single-machine Windows client: capture, enrich, visualize, package.")],
      [h1("2. Capture requirements"), makeTable(["ID", "Requirement", "Pri"], [["CAP-01", "Npcap TCP/UDP capture", "Must"], ["CAP-04", "5-tuple aggregation", "Must"], ["CAP-05", "Throughput rates", "Must"], ["CAP-07", "Npcap missing UX", "Must"], ["CAP-10", "Degraded mode", "Should"]], [1400, CONTENT_W - 2400, 1000])],
      [h1("3. Process / Geo / UX"), makeTable(["Area", "IDs"], [["Process", "PRC-01..04"], ["Geo", "GEO-01..06"], ["Visual", "VIS-01..05"], ["UX", "UX-01..09"]], [2400, CONTENT_W - 2400])],
      [h1("4. NFRs"), bullet("60 FPS target typical load"), bullet("No payload storage default"), bullet("No cloud telemetry v1"), bullet("Windows 10/11 x64")],
      [h1("5. Acceptance"), bullet("Arcs appear when browsing"), bullet("Process names when available"), bullet("Filters + pause work"), bullet("Clear setup errors")],
    ],
  },
  {
    id: "NV-SAD-001",
    title: "System_Architecture_Design",
    subtitle: "System Architecture & Design",
    sections: [
      [h1("1. Goals"), bullet("Snapshot IPC not per-packet UI"), bullet("Capture off UI thread"), bullet("Modular Rust services")],
      [h1("2. Components"), makeTable(["Component", "Role"], [["Capture", "Ingest packets/connections"], ["Flow", "Aggregate rates/expiry"], ["Process", "PID mapping"], ["Geo", "IP location"], ["Engine", "Orchestrate snapshots"], ["UI", "Globe dashboard"]], [2800, CONTENT_W - 2800])],
      [h1("3. Pipeline"), p("NIC → Npcap/Connections → Flow table → Process join → Geo → Snapshot event → React store → Globe/Feed/KPIs")],
      [h1("4. ADRs"), makeTable(["ADR", "Decision"], [["001", "Tauri over Electron"], ["002", "Full capture + fallback"], ["003", "3D globe default"], ["004", "Offline geo primary"], ["005", "Header-only"], ["006", "Snapshot IPC"]], [1600, CONTENT_W - 1600])],
    ],
  },
  {
    id: "NV-PLAN-001",
    title: "Project_Plan_Roadmap",
    subtitle: "Project Plan & Roadmap",
    sections: [
      [h1("1. Phases"), makeTable(["Phase", "Outcome"], [["0", "Scaffold"], ["1", "Globe mock"], ["2", "Capture"], ["3", "Enrichment"], ["4", "Live wiring"], ["5", "Polish/ship"]], [1600, CONTENT_W - 1600])],
      [h1("2. Milestones"), makeTable(["ID", "Evidence"], [["M0", "Docs baseline"], ["M1", "Visual prototype"], ["M2", "Capture alpha"], ["M3", "Enriched alpha"], ["M4", "Integrated beta"], ["M5", "Release candidate"]], [1600, CONTENT_W - 1600])],
      [h1("3. DoD"), bullet("Builds"), bullet("SRS alignment"), bullet("No payload logs"), bullet("Readable errors")],
    ],
  },
  {
    id: "NV-RISK-001",
    title: "Risk_Security_Privacy",
    subtitle: "Risk, Security & Privacy",
    sections: [
      [h1("1. Top risks"), makeTable(["ID", "Risk", "Mitigation"], [["R-01", "Admin/Npcap friction", "Wizard + degraded"], ["R-02", "Globe jank", "Top-N arcs"], ["R-03", "Geo license", "No mmdb in git"], ["R-05", "Unknown UDP process", "Placeholder"]], [1200, 3200, CONTENT_W - 4400])],
      [h1("2. Principles"), bullet("Least data"), bullet("Local-first"), bullet("Explicit privilege"), bullet("Fail closed on capture errors")],
      [h1("3. Privacy"), makeTable(["Data", "Leaves device?"], [["Flow metadata", "No"], ["Settings", "No"], ["Public IP lookup", "Optional yes"], ["Payloads", "Not stored"]], [4000, CONTENT_W - 4000])],
    ],
  },
  {
    id: "NV-DEV-001",
    title: "Development_Guide",
    subtitle: "Development Guide",
    sections: [
      [h1("1. Prerequisites"), bullet("Node 20+"), bullet("Rust stable"), bullet("VS Build Tools"), bullet("WebView2"), bullet("Npcap optional")],
      [h1("2. Commands"), bullet("npm install"), bullet("npm run tauri dev"), bullet("npm run tauri build"), bullet("npm run docs")],
      [h1("3. Modes"), makeTable(["Mode", "When"], [["Demo", "UI validation / no traffic"], ["Connections", "No Npcap"], ["Capture", "Admin + Npcap"]], [2400, CONTENT_W - 2400])],
      [h1("4. Modules"), bullet("src-tauri: capture, flow, process, geo, engine"), bullet("src: components, stores, hooks, types")],
    ],
  },
  {
    id: "NV-API-001",
    title: "API_IPC_Specification",
    subtitle: "API / IPC Specification",
    sections: [
      [h1("1. Channels"), bullet("Commands: UI → Rust control plane"), bullet("Events: flow_snapshot high frequency")],
      [h1("2. Commands"), bullet("get_status / get_settings / update_settings"), bullet("start_capture / stop_capture"), bullet("list_interfaces / resolve_home / complete_first_run")],
      [h1("3. Event"), p("flow_snapshot: status, mode, home, totals, flows[] every ~400ms")],
      [h1("4. Errors"), bullet("NOT_ELEVATED"), bullet("NPCAP_MISSING"), bullet("IFACE_OPEN_FAIL"), bullet("GEO_DB_MISSING")],
    ],
  },
  {
    id: "NV-TEST-001",
    title: "Test_Plan",
    subtitle: "Test Plan",
    sections: [
      [h1("1. Levels"), bullet("Unit: flow merge, rates, private IP"), bullet("Integration: IPC + enrichment"), bullet("System: globe, filters, pause, wizard")],
      [h1("2. Acceptance mapping"), bullet("Arcs on browse"), bullet("Process names"), bullet("Filters/pause"), bullet("Setup messages")],
      [h1("3. Release checklist"), bullet("Build succeeds"), bullet("Demo without Npcap"), bullet("No panic on start/stop")],
    ],
  },
  {
    id: "NV-STD-001",
    title: "Coding_Standards",
    subtitle: "Coding Standards",
    sections: [
      [h1("1. TS/React"), bullet("Strict TS"), bullet("Zustand for live state"), bullet("Memoize globe props"), bullet("CSS variables")],
      [h1("2. Rust"), bullet("camelCase serde IPC"), bullet("tracing not println"), bullet("No payload logs")],
      [h1("3. Commits"), bullet("feat/fix/docs/chore conventional commits")],
    ],
  },
  {
    id: "NV-REL-001",
    title: "Deployment_Release",
    subtitle: "Deployment & Release Guide",
    sections: [
      [h1("1. Build"), p("npm install && npm run tauri build")],
      [h1("2. Prerequisites"), bullet("WebView2"), bullet("Admin for capture"), bullet("Npcap recommended"), bullet("Optional GeoLite2")],
      [h1("3. Release checklist"), bullet("Version bump"), bullet("QA pass"), bullet("No illegal bundling of Npcap/GeoLite2"), bullet("Tag vX.Y.Z")],
    ],
  },
];

for (const d of docs) {
  await writeDoc(d);
}

// Also run combined package if present
const packageScript = path.join(__dirname, "generate-project-docs.mjs");
if (fs.existsSync(packageScript)) {
  console.log("Combined package: run node scripts/generate-project-docs.mjs separately if needed");
}
console.log("Done. Files in docs/export/");

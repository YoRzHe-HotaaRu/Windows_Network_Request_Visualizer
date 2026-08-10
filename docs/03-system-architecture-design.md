# System Architecture & Design Document (SAD)  
## Network Visualizer (NV-SAD-001)

**Document type:** System Architecture / High-Level & Detailed Design  
**Version:** 1.0  
**Date:** 2026-08-10  
**Status:** Baseline  

---

## 1. Purpose

This document describes the architecture, component design, data flows, key algorithms, and interface contracts for Network Visualizer v1.

---

## 2. Architectural goals

| Goal | Design response |
|------|-----------------|
| Real-time feel | Event deltas every 250–500 ms; never per-packet UI |
| Silky 3D UI | WebGL globe isolated from capture thread |
| Safe capture | Header-only parse; privileged code minimized in Rust backend |
| Extensibility | Clear modules for capture / flow / process / geo |
| Small footprint | Tauri vs Electron |

### Quality attributes priority

1. Usability / visual quality  
2. Performance under moderate load  
3. Reliability of capture lifecycle  
4. Privacy  
5. Portability (v1 Windows-only OK)

---

## 3. Context diagram

```text
                    ┌─────────────────────────────┐
                    │         User / Operator     │
                    └─────────────┬───────────────┘
                                  │ interacts
                    ┌─────────────▼───────────────┐
                    │   Network Visualizer App    │
                    │   (Tauri + React + Rust)    │
                    └──────┬───────────┬──────────┘
           packets/API     │           │ optional HTTP
        ┌──────────────────▼──┐   ┌────▼────────────┐
        │ Windows Network +   │   │ Public IP API   │
        │ Npcap + IP Helper   │   │ (home location) │
        └─────────────────────┘   └─────────────────┘
                    │
                    │ local file
              ┌─────▼──────┐
              │ GeoLite2   │
              │ City.mmdb  │
              └────────────┘
```

---

## 4. Container / logical architecture

```text
┌──────────────────────────────────────────────────────────────────┐
│                         Presentation Layer                         │
│  React + TypeScript  |  Zustand store  |  Framer Motion  |  CSS  │
│  GlobeView | KpiStrip | LiveFeed | Filters | FlowDetail | Charts │
└───────────────────────────────┬──────────────────────────────────┘
                                │ Tauri invoke + events
┌───────────────────────────────▼──────────────────────────────────┐
│                         Application Layer (Rust)                   │
│  commands: start_capture | stop | status | settings                │
│  event emitter: flow_snapshot                                      │
└───────┬──────────┬───────────┬────────────┬───────────────────────┘
        │          │           │            │
   ┌────▼───┐ ┌────▼────┐ ┌───▼────┐ ┌─────▼─────┐
   │Capture │ │  Flow   │ │Process │ │   Geo     │
   │Engine  │ │ Aggreg. │ │Mapper  │ │  Service  │
   └────┬───┘ └────▲────┘ └───▲────┘ └─────▲─────┘
        │          │          │            │
   Npcap/pcap  merge pkts  IP Helper    maxminddb
```

---

## 5. Technology stack

| Concern | Choice | Rationale |
|---------|--------|-----------|
| Shell | Tauri 2 | Small binary, Rust backend, WebView2 |
| UI | React 18 + Vite + TS | Rapid dashboard development |
| Globe | react-globe.gl | Arcs/points animations battle-tested |
| Capture | Npcap + pcap crate | Industry standard on Windows |
| Packet parse | etherparse / pnet_packet | Zero-copy-ish header parse |
| Process | windows crate / IP Helper | Official connection tables |
| Geo | maxminddb + GeoLite2-City | Offline, fast |
| State | Zustand | Simple high-frequency updates |

---

## 6. Component design

### 6.1 Capture Engine

**Responsibility:** Open interface, read packets, extract 5-tuple + length + direction.

**Behavior:**
1. Enumerate devices; select default active adapter or user choice.  
2. Open live capture with BPF-style filter for IP TCP/UDP when supported.  
3. On packet: parse L3/L4; determine direction relative to local addresses; push update to Flow Aggregator.  
4. On error: set `CaptureState::Error { code, message }` and notify UI.

**Threading:** Dedicated capture thread/async task; lock-free or short-lock channel into aggregator.

### 6.2 Flow Aggregator

**Responsibility:** Maintain authoritative flow table and rates.

**Key algorithm — merge:**

```text
key = hash(src_ip, src_port, dst_ip, dst_port, protocol)
if not exists: insert with first_seen = now
increment bytes_up or bytes_down by packet_len
packets += 1
last_seen = now
periodically recompute rate_bps
expire if now - last_seen > idle_timeout
```

**Direction heuristic:** If either endpoint matches a local interface address, treat the other as remote; classify up vs down accordingly. For ambiguous cases, prefer OS connection table direction when available.

### 6.3 Process Mapper

**Responsibility:** Refresh TCP/UDP owner tables on an interval (e.g., 1s) and join to flows by local IP:port.

**Failure mode:** Leave process null; UI shows placeholder.

### 6.4 Geo Service

**Responsibility:** Load mmdb; lookup remote IPs; classify private ranges; resolve home location.

**Cache:** `HashMap<IpAddr, GeoResult>` process-lifetime.

**Home location:**  
1. Optional override from settings  
2. Else fetch public IP (HTTPS) once → mmdb lookup  
3. Else fallback to last known / approximate (configurable)

### 6.5 Event Bridge

**Responsibility:** Every 250–500 ms, publish compact snapshot:

- totals (flows, bps up/down)  
- top-N flows for globe  
- recent feed window  
- capture status  

Prefer deltas when bandwidth matters; v1 may send compact full top-N snapshots for simplicity.

### 6.6 Frontend store & views

**Zustand store** holds latest snapshot, filters, pause flag, selected flow.  
**Selectors** apply client-side filters to arcs and feed.  
**GlobeView** maps filtered flows → `arcsData` / `pointsData`.  
**Pause** stops applying incoming snapshots to the visible store (backend may still capture).

---

## 7. End-to-end data flow

```text
[NIC] --packets--> [Npcap] --> [Capture Engine]
                                      |
                                      v
                              [Flow Aggregator]
                                 |         ^
                    join         |         | rates/expiry timer
                                 v         |
                           [Process Mapper]
                                 |
                                 v
                            [Geo Service]
                                 |
                                 v
                           [Event Bridge] --snapshot--> [React Store]
                                                            |
                            ┌───────────────────────────────┼──────────────┐
                            v                               v              v
                        [Globe arcs]                  [Live feed]      [KPIs/Charts]
```

### Sequence: new outbound TCP connection

```text
Browser → TCP SYN to 1.2.3.4:443
Capture sees packets → Flow created
Process Mapper: local ephemeral port → chrome.exe
Geo: 1.2.3.4 → Ashburn, US (lat/lon)
Event Bridge includes flow in next snapshot
Globe draws arc Home → Ashburn; feed row appears
```

---

## 8. UI architecture

### 8.1 Layout regions

| Region | Content |
|--------|---------|
| Header | Brand, LIVE/PAUSED, pause toggle, settings |
| Left | KPIs + filters |
| Center | 3D globe |
| Right | Live feed + pinned detail |
| Bottom | Top processes, top countries, throughput sparkline |

### 8.2 Design tokens (baseline)

| Token | Value |
|-------|--------|
| bg-deep | `#05080f` |
| bg-panel | `#0b1220` @ glass |
| accent-cyan | `#22d3ee` |
| accent-violet | `#a78bfa` |
| danger | `#f87171` |
| text-primary | `#e2e8f0` |
| mono | ui-monospace / Cascadia / Consolas |

### 8.3 Performance strategy

- Cap arcs to top N by `rate_bps` then recency  
- Optional city-level merge for many IPs in same city  
- `requestAnimationFrame`-friendly store updates (batch set)  
- Avoid React re-render of full feed: virtualize if list > 100  

---

## 9. IPC contract (illustrative)

### Commands

```ts
startCapture(interfaceId?: string): Promise<CaptureStatus>
stopCapture(): Promise<void>
getStatus(): Promise<AppStatus>
updateSettings(partial: Settings): Promise<Settings>
getSettings(): Promise<Settings>
```

### Event: `flow_snapshot`

```ts
type FlowSnapshot = {
  ts: number
  status: "running" | "stopped" | "error" | "degraded"
  message?: string
  totals: { flows: number; bpsUp: number; bpsDown: number; destinations: number }
  flows: FlowRecord[]  // top-N enriched
}
```

---

## 10. Repository structure

```text
Network_Visualizer/
├── docs/                      # Corporate + technical documentation
│   └── export/                # Generated DOCX / PDF
├── src-tauri/
│   └── src/
│       ├── main.rs
│       ├── capture/
│       ├── flow/
│       ├── process/
│       ├── geo/
│       └── events.rs
├── src/
│   ├── components/
│   ├── stores/
│   ├── hooks/
│   └── styles/
├── package.json
├── README.md
└── LICENSE
```

---

## 11. Deployment architecture

```text
Developer machine                  End-user machine
┌─────────────────┐               ┌──────────────────────────┐
│ npm + rustc     │  tauri build  │ NetworkVisualizer.exe    │
│ source tree     │ ───────────►  │ + WebView2               │
└─────────────────┘               │ + Npcap (prerequisite)   │
                                  │ + GeoLite2 mmdb (setup)  │
                                  └──────────────────────────┘
```

---

## 12. Cross-cutting concerns

### Logging

- Rust: `tracing` with levels; no packet payloads in logs.  
- UI: console errors for IPC failures only in dev.

### Configuration

- Interface name, idle timeout, top-N, home override, geo db path, theme accents.

### Error taxonomy

| Code | Meaning | UX |
|------|---------|-----|
| NPCAP_MISSING | Driver not installed | Wizard link to install |
| NOT_ELEVATED | Need admin | Relaunch prompt |
| IFACE_OPEN_FAIL | Cannot open device | Pick another interface |
| GEO_DB_MISSING | mmdb not found | Path picker / download steps |
| CAPTURE_STOPPED | User or error stop | Status chip |

---

## 13. Future architecture (post-v1)

- Historical flow DB (SQLite) + timeline scrubber  
- Connections-only fallback as first-class mode  
- Threat intel optional overlays (user-supplied lists)  
- Plugin export of PCAP for Wireshark  
- Multi-platform Tauri targets  

---

## 14. Design decisions log (ADR summary)

| ADR | Decision | Status |
|-----|----------|--------|
| ADR-001 | Tauri 2 over Electron | Accepted |
| ADR-002 | Full capture (Npcap) primary; connection-table fallback secondary | Accepted |
| ADR-003 | 3D globe default visualization | Accepted |
| ADR-004 | Offline GeoLite2 over online-only APIs | Accepted |
| ADR-005 | Header-only capture, no payload storage default | Accepted |
| ADR-006 | Snapshot IPC not per-packet events | Accepted |

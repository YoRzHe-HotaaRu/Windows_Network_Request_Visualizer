# Software Requirements Specification (SRS)  
## Network Visualizer (NV-SRS-001)

**Document type:** Software Requirements Specification (IEEE 830–style)  
**Version:** 1.0  
**Date:** 2026-08-10  
**Status:** Baseline  

---

## 1. Introduction

### 1.1 Purpose

This SRS defines functional and non-functional requirements for **Network Visualizer v1**, a Windows desktop application that captures host network traffic and visualizes destinations on a 3D globe dashboard.

### 1.2 Scope

In scope: single-machine Windows client, local capture, process enrichment, offline GeoIP, 3D visualization, dashboard UX, packaging.  
Out of scope: multi-host fleet, payload DPI/MITM, mobile clients, paid GeoIP SLAs.

### 1.3 Definitions

| Term | Definition |
|------|------------|
| Flow | Bidirectional logical conversation identified by 5-tuple |
| 5-tuple | (src IP, src port, dst IP, dst port, protocol) |
| Home location | Geolocated origin (public IP or user override) used as arc start |
| Arc | Visual great-circle (or altitude-styled) link on the globe |
| Enrichment | Adding process + geo metadata to a flow |
| Delta snapshot | Incremental update of flows to the UI |

### 1.4 References

- NV-PROP-001 Project Proposal  
- NV-SAD-001 Architecture  
- Npcap documentation  
- MaxMind GeoLite2 EULA / license terms  

---

## 2. Overall description

### 2.1 Product perspective

Standalone desktop app (Tauri). Depends on OS networking stack, Npcap driver, and local GeoIP database file.

### 2.2 User characteristics

Users can install software and accept UAC elevation. Networking expertise is optional; UI must remain approachable.

### 2.3 Constraints

- Windows 10/11 x64  
- Capture requires Administrator + Npcap  
- GeoLite2 redistribution constraints  
- WebGL-capable GPU/driver recommended  

### 2.4 Assumptions

- User machine has outbound internet (for real destinations & optional public-IP home lookup).  
- WebView2 runtime available.  
- Clock is reasonably accurate for duration metrics.

---

## 3. Functional requirements

### 3.1 Capture (CAP)

| ID | Requirement | Priority |
|----|-------------|----------|
| CAP-01 | System shall capture IP packets for TCP and UDP on a selected local interface via Npcap. | Must |
| CAP-02 | System shall parse IP/TCP/UDP headers only (no application payload storage by default). | Must |
| CAP-03 | System shall support IPv4; IPv6 support is required where practical in v1. | Must / Should |
| CAP-04 | System shall aggregate packets into flows keyed by 5-tuple with byte and packet counters. | Must |
| CAP-05 | System shall compute approximate throughput rates (e.g., EMA or sliding window). | Must |
| CAP-06 | System shall expire idle flows after a configurable timeout (default 30–60s). | Must |
| CAP-07 | System shall detect missing Npcap and surface a clear error with remediation. | Must |
| CAP-08 | System shall detect lack of elevation and instruct the user to re-run as Administrator. | Must |
| CAP-09 | System should list available capture interfaces and allow selection in Settings. | Should |
| CAP-10 | If capture fails, system should degrade to connection-table-only mode (no byte rates) when feasible. | Should |

### 3.2 Process attribution (PRC)

| ID | Requirement | Priority |
|----|-------------|----------|
| PRC-01 | System shall map local TCP endpoints to owning PID via IP Helper APIs. | Must |
| PRC-02 | System shall resolve PID to process name (and path when permitted). | Must |
| PRC-03 | System shall attempt UDP endpoint mapping where OS tables allow. | Should |
| PRC-04 | When process is unknown, UI shall show a clear placeholder (e.g., “Unknown / System”). | Must |

### 3.3 Geolocation (GEO)

| ID | Requirement | Priority |
|----|-------------|----------|
| GEO-01 | System shall resolve public remote IPs to city/country/lat/lon via offline GeoLite2-City. | Must |
| GEO-02 | System shall cache geo lookups in memory for the session. | Must |
| GEO-03 | System shall not treat private/reserved IPs as public destinations (mark LAN/private). | Must |
| GEO-04 | System shall determine home location via public IP geolocation once per session (or cached). | Must |
| GEO-05 | User shall be able to override home lat/lon (or city) in Settings. | Should |
| GEO-06 | First-run or settings shall support configuring path / acquisition of GeoIP DB without violating license. | Must |

### 3.4 Visualization (VIS)

| ID | Requirement | Priority |
|----|-------------|----------|
| VIS-01 | UI shall render an interactive 3D globe (rotate, zoom/drag as library allows). | Must |
| VIS-02 | Each eligible public flow shall be represented as an animated arc from home to destination. | Must |
| VIS-03 | Destination points shall pulse or highlight on new/updated activity. | Should |
| VIS-04 | Arc visual weight (stroke/opacity) should scale with throughput. | Should |
| VIS-05 | UI shall cap rendered arcs (top-N by rate/recency) to preserve frame rate. | Must |
| VIS-06 | Auto-rotate when idle; stop or slow on user interaction. | Should |

### 3.5 Dashboard & UX (UX)

| ID | Requirement | Priority |
|----|-------------|----------|
| UX-01 | Layout shall include header (status), main globe, side KPIs/filters, live feed, bottom charts. | Must |
| UX-02 | KPIs shall include active flows, aggregate up/down rate, destination count (minimum set). | Must |
| UX-03 | Live feed shall list recent/active flows with process, remote IP, location, rate. | Must |
| UX-04 | Hover/tooltip shall show process, IP, ports, city/country, rate, duration. | Must |
| UX-05 | Click shall pin flow detail in a side panel. | Should |
| UX-06 | Filters: process, country, protocol (TCP/UDP), min rate (minimum set). | Must |
| UX-07 | Pause control shall freeze UI snapshot updates (capture may continue). | Must |
| UX-08 | Visual design shall use dark ops-center aesthetic with glass panels and smooth transitions. | Must |
| UX-09 | First-run wizard shall cover Npcap, elevation, and GeoIP setup. | Must |
| UX-10 | Settings shall expose interface selection, home override, arc density, basic preferences. | Should |

### 3.6 Events & IPC (IPC)

| ID | Requirement | Priority |
|----|-------------|----------|
| IPC-01 | Backend shall stream flow delta snapshots to frontend at ~250–500 ms. | Must |
| IPC-02 | Frontend shall not require per-packet events. | Must |
| IPC-03 | Commands: start/stop capture, set filters (if server-side), get status, set settings. | Must |

### 3.7 Packaging & docs (PKG)

| ID | Requirement | Priority |
|----|-------------|----------|
| PKG-01 | Project shall ship via Tauri Windows installer. | Must |
| PKG-02 | Repository shall include README with architecture diagrams and setup. | Must |
| PKG-03 | Corporate documentation suite (proposal, SRS, architecture, plan, risk) in MD + DOCX + PDF. | Must |

---

## 4. Non-functional requirements

### 4.1 Performance (PERF)

| ID | Requirement |
|----|-------------|
| PERF-01 | Globe target 60 FPS under typical desktop traffic (browsing + messaging) on mid-range hardware. |
| PERF-02 | UI update path shall be throttled; capture path shall not block the UI thread. |
| PERF-03 | Header-only parse; batching under high PPS to bound CPU. |
| PERF-04 | Memory: flow table bounded by expiry + hard cap if needed. |

### 4.2 Reliability (REL)

| ID | Requirement |
|----|-------------|
| REL-01 | Capture thread crash shall not silently kill UI without error state. |
| REL-02 | Missing dependencies produce actionable messages, not empty screens only. |

### 4.3 Security & privacy (SEC)

| ID | Requirement |
|----|-------------|
| SEC-01 | No packet payloads stored by default. |
| SEC-02 | No cloud telemetry by default. |
| SEC-03 | Local storage limited to settings and optional caches. |
| SEC-04 | Document privilege requirements and least-data principles. |

### 4.4 Usability (USE)

| ID | Requirement |
|----|-------------|
| USE-01 | Core path (start → see arcs) achievable in < 2 minutes after prerequisites installed. |
| USE-02 | Monospace for technical fields (IP, port); human labels for process/city. |

### 4.5 Maintainability (MAIN)

| ID | Requirement |
|----|-------------|
| MAIN-01 | Modular Rust crates/modules: capture, flow, process, geo, events. |
| MAIN-02 | Typed IPC contracts between Rust and TypeScript. |
| MAIN-03 | Unit tests for flow merge, rate math, geo cache keying. |

### 4.6 Compatibility (COMP)

| ID | Requirement |
|----|-------------|
| COMP-01 | Windows 10 22H2+ and Windows 11 x64. |
| COMP-02 | Npcap supported versions documented at release. |

---

## 5. Data requirements

### 5.1 Flow record (logical)

| Field | Type | Notes |
|-------|------|-------|
| flow_id | string | Stable key / hash of 5-tuple |
| src_ip, dst_ip | string | |
| src_port, dst_port | u16 | |
| protocol | enum | TCP / UDP / Other |
| bytes_up, bytes_down | u64 | Direction relative to host |
| packets | u64 | |
| rate_bps | f64 | Derived |
| process_name | string? | |
| pid | u32? | |
| remote_city, remote_country | string? | |
| remote_lat, remote_lon | f64? | |
| first_seen, last_seen | timestamp | |
| is_private_remote | bool | |

### 5.2 Persistence

- Settings: JSON or Tauri store  
- Geo DB: external `.mmdb` file  
- No mandatory historical flow DB in v1 (optional later)

---

## 6. External interface requirements

### 6.1 User interface

Desktop window; primary WebView UI; keyboard/mouse; optional future tray icon (not required v1).

### 6.2 Hardware interfaces

Network adapters via Npcap; display with WebGL.

### 6.3 Software interfaces

| Interface | Purpose |
|-----------|---------|
| Npcap / libpcap | Packet capture |
| Windows IP Helper | Connection → PID |
| MaxMind mmdb | Geo lookup |
| HTTP (optional) | Public IP discovery for home location |
| Tauri IPC | Frontend ↔ backend |

---

## 7. Acceptance criteria (v1 release)

1. With Npcap + admin + GeoIP DB configured, browsing produces visible arcs home → destinations.  
2. At least one major browser process name appears correctly on enriched flows.  
3. Hover shows process, location, rate.  
4. Filters reduce visible arcs/feed consistently.  
5. Pause freezes feed/globe updates.  
6. Missing Npcap/elevation yields clear remediation UI.  
7. README + docs package present in repository.

---

## 8. Traceability (summary)

| Goal (Proposal) | Primary requirements |
|-----------------|----------------------|
| See the path | CAP-*, GEO-*, VIS-01/02 |
| Know who is talking | PRC-* |
| Measure traffic | CAP-04/05, UX-02 |
| Premium dashboard | UX-01/08, VIS-* |
| Local-first | SEC-01/02, GEO-01 |

---

## 9. Open requirements (tracked)

| Item | Default for v1 |
|------|----------------|
| Exact rate algorithm | EMA over 1s window |
| Arc top-N default | 80 |
| Idle expiry | 45s |
| IPv6 completeness | Best-effort |

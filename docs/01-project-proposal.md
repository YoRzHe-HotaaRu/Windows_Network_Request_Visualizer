# Project Proposal & Business Case  
## Network Visualizer (NV-PROP-001)

**Document type:** Project Proposal / Business Case  
**Version:** 1.0  
**Date:** 2026-08-10  
**Status:** Approved baseline  

---

## 1. Executive summary

**Network Visualizer** is a Windows desktop application that answers a simple but powerful question in real time:

> *Where does my network traffic go — and which application is sending it?*

The product captures host network traffic, attributes flows to processes, geolocates remote endpoints, and renders connections as **animated arcs on a 3D interactive globe**, surrounded by a premium operations-center dashboard (KPIs, live feed, filters, charts).

It targets power users, security-curious individuals, developers, and small IT teams who want **spatial intuition** for network activity without deploying enterprise SIEM or complex packet-analysis stacks.

### Recommendation

**Proceed to build** Phase 0–5 as scoped: Tauri 2 + React + TypeScript frontend, Rust backend with Npcap full traffic capture, MaxMind GeoLite2 geolocation, and `react-globe.gl` visualization.

---

## 2. Problem statement

| Pain | Today’s experience |
|------|---------------------|
| Opaque destinations | Users see “Connected” but not *where on Earth* or *which city/CDN* |
| Tool fragmentation | Task Manager, Resource Monitor, Wireshark, and browser DevTools each show a slice — never a unified spatial view |
| Cognitive load | Raw IP tables and packet dumps are accurate but not intuitive |
| Trust & privacy anxiety | People want to know which apps talk to which countries — without uploading PCAP to the cloud |

### Opportunity

Combine **real capture + process attribution + offline GeoIP + cinematic 3D UI** into a single local-first Windows app. No comparable open, beautiful, consumer-grade product dominates this niche on Windows.

---

## 3. Goals and non-goals

### 3.1 Goals (v1)

1. Visualize active host network flows on a world globe (home → destination).
2. Attribute flows to process name / PID where OS APIs allow.
3. Measure approximate throughput (bytes in/out, rates) via full traffic capture.
4. Deliver a polished dark “ops dashboard” UX with smooth animation.
5. Operate **local-first** (no mandatory cloud telemetry).

### 3.2 Non-goals (v1)

- Multi-host / fleet monitoring  
- Full packet payload inspection or HTTPS MITM  
- Official Linux/macOS shipping builds  
- Commercial GeoIP accuracy SLAs  
- Intrusion detection / automated threat scoring  

---

## 4. Target users & use cases

| Persona | Need | Success moment |
|---------|------|----------------|
| Power user | “What is my PC talking to?” | Opens app, sees Chrome arcs to CDNs in US/EU |
| Developer | Debug unexpected outbound calls | Filters by process, pins a flow, notes port/city |
| Home lab / small IT | Quick spatial overview | Top countries + processes strip answers “who’s chatty” |
| Educator / demo | Teach networking | Globe makes TCP/UDP and geo tangible |

### Primary use cases

1. **UC-01 Live map:** User launches app elevated; globe paints arcs for active destinations within seconds.  
2. **UC-02 Process drill-down:** User filters to one process and sees only its destinations.  
3. **UC-03 Throughput glance:** User reads aggregate up/down Mbps and per-flow rates.  
4. **UC-04 Pause & inspect:** User pauses UI, inspects a pinned flow (IP, city, ports, process).  
5. **UC-05 First-run setup:** User without Npcap is guided to install and re-run elevated.

---

## 5. Solution overview

| Layer | Technology | Role |
|-------|------------|------|
| Desktop shell | Tauri 2 | Native Windows window, IPC, packaging |
| UI | React 18 + TypeScript + Vite | Dashboard, state, filters |
| Globe | `react-globe.gl` (Three.js) | 3D Earth, arcs, points, animation |
| Capture | Npcap + Rust `pcap` | Full traffic capture |
| Parse | Header-only (TCP/UDP/IP) | 5-tuple + lengths |
| Process map | Windows IP Helper API | Socket → PID → process name |
| Geo | MaxMind GeoLite2-City (offline) | IP → lat/lon/city/country |
| Transport | Tauri events (~250–500 ms) | Delta flow snapshots to UI |

---

## 6. Value proposition

- **Clarity:** Geography turns abstract IPs into places.  
- **Accountability:** Process names answer “who did this?”  
- **Performance awareness:** Byte rates surface chatty apps.  
- **Aesthetics:** Silky globe + glass dashboard invites daily use, not only incident response.  
- **Privacy posture:** Metadata stays on device by design.

---

## 7. Scope & deliverables

| Deliverable | Description |
|-------------|-------------|
| Application binary | Windows installer (MSI/NSIS via Tauri) |
| Source repository | GitHub-ready structure with README & docs |
| Documentation package | Proposal, SRS, Architecture, Plan, Risk (MD + DOCX + PDF) |
| First-run guidance | Npcap, elevation, GeoIP DB setup |
| v1 feature set | Capture, enrich, globe, feed, filters, KPIs, settings baseline |

---

## 8. High-level timeline (indicative)

| Phase | Name | Outcome |
|-------|------|---------|
| 0 | Scaffold & shell | Empty premium dashboard window |
| 1 | Globe mock | Cinematic demo with synthetic arcs |
| 2 | Capture engine | Live flows + byte rates in backend |
| 3 | Enrichment | Process + geo on each flow |
| 4 | Live wiring | Real traffic drives globe & panels |
| 5 | Polish & ship | Wizard, settings, installer, QA |

Phases may overlap (UI polish alongside capture) after Phase 1.

---

## 9. Dependencies & constraints

| Dependency | Constraint |
|------------|------------|
| Npcap | Required for full capture; admin install |
| Administrator rights | Required for capture on Windows |
| WebView2 | Required by Tauri on Windows (usually preinstalled) |
| GeoLite2 license | Free MaxMind account; redistribution rules apply |
| Hardware | Discrete GPU preferred for 3D comfort; integrated OK for moderate arcs |

---

## 10. Risks (summary)

See **NV-RISK-001** for full register. Top risks: Npcap/admin friction, UI performance under high flow counts, GeoIP license/accuracy, incomplete process mapping for some UDP.

---

## 11. Success criteria (business / product)

1. **Demo-ready:** 30-second “wow” on a clean Windows 11 machine after setup.  
2. **Functional:** Real browsing/chat traffic produces correct-looking geo arcs with process labels.  
3. **Usable:** Core filters and pause work without tutorial beyond first-run wizard.  
4. **Shipable:** Documented install path; GitHub README sufficient for contributors.  
5. **Trustworthy:** No cloud telemetry by default; privacy model documented.

---

## 12. Alternatives considered

| Option | Pros | Cons | Decision |
|--------|------|------|----------|
| Connection table only (no pcap) | No Npcap | No true byte rates | Fallback mode only |
| Electron | Faster web tooling familiarity | Heavier install | Prefer Tauri |
| Pure WinUI / WPF | Native | Harder cinematic 3D | Prefer WebView globe |
| 2D map only | Clearer dense data | Less “wow” | 3D default for v1 |
| Cloud geo API only | No DB files | Latency, privacy, rate limits | Offline mmdb primary |

---

## 13. Approval

| Role | Name | Decision | Date |
|------|------|----------|------|
| Product owner | — | Approved | 2026-08-10 |
| Engineering lead | — | Approved | 2026-08-10 |
| Security review | — | Pending build artifacts | — |

---

## 14. References

- Implementation plan (build phases)  
- NV-SRS-001 Software Requirements Specification  
- NV-SAD-001 System Architecture & Design  
- NV-PLAN-001 Project Plan & Roadmap  
- NV-RISK-001 Risk, Security & Privacy  

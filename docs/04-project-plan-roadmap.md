# Project Plan & Roadmap  
## Network Visualizer (NV-PLAN-001)

**Document type:** Project Plan / Implementation Roadmap  
**Version:** 1.0  
**Date:** 2026-08-10  
**Status:** Baseline  

---

## 1. Purpose

Define work packages, phases, milestones, dependencies, and definition of done for Network Visualizer v1.

---

## 2. Delivery approach

- **Method:** Iterative phases with a visual spike early (Phase 1) to lock UX quality.  
- **Primary stack:** Tauri 2 + React + TypeScript + Rust capture.  
- **Quality bar:** Each phase has a demoable deliverable.

---

## 3. Work breakdown structure (WBS)

```text
1.0 Project foundation
  1.1 Repo scaffold (Tauri/Vite)
  1.2 Tooling (lint, format, scripts)
  1.3 Documentation baseline (this suite)
2.0 Presentation layer
  2.1 Design system / tokens
  2.2 Dashboard shell layout
  2.3 Globe integration + mock data
  2.4 Feed, KPIs, filters, detail panel
  2.5 Motion / polish
3.0 Capture & data plane
  3.1 Interface discovery
  3.2 Live capture loop
  3.3 Flow aggregation + rates + expiry
  3.4 Error states (Npcap / elevation)
4.0 Enrichment
  4.1 Process mapping (TCP/UDP)
  4.2 GeoIP service + cache
  4.3 Home location resolution
5.0 Integration
  5.1 IPC contracts + events
  5.2 Live store wiring
  5.3 Performance caps (top-N arcs)
  5.4 Degraded mode (optional)
6.0 Release
  6.1 First-run wizard
  6.2 Settings
  6.3 Installer build
  6.4 QA checklist + docs finalize
```

---

## 4. Phased roadmap

### Phase 0 — Scaffold & design shell

| Item | Detail |
|------|--------|
| Objective | Runnable window with premium empty dashboard |
| Tasks | Create Tauri 2 app; theme tokens; layout chrome; mock KPIs |
| Exit criteria | App launches on Windows; layout matches wireframe regions |
| Dependencies | Node, Rust, WebView2 |

### Phase 1 — Globe visual spike

| Item | Detail |
|------|--------|
| Objective | Cinematic 3D globe with synthetic traffic |
| Tasks | `react-globe.gl`; night earth; animated arcs; glass panels; idle rotate |
| Exit criteria | Stakeholder “wow” pass on visuals without real capture |
| Dependencies | Phase 0 |

### Phase 2 — Capture engine

| Item | Detail |
|------|--------|
| Objective | Real packets → flow table with rates |
| Tasks | Npcap open; parse headers; aggregate; expire; status errors |
| Exit criteria | Backend events/logs show live flows + bps under test load |
| Dependencies | Npcap installed; admin |

### Phase 3 — Enrichment

| Item | Detail |
|------|--------|
| Objective | Process + geo on flows; home origin |
| Tasks | IP Helper join; mmdb; private IP handling; home IP |
| Exit criteria | Sample flow has chrome.exe + city + lat/lon |
| Dependencies | Phase 2; GeoLite2 DB |

### Phase 4 — Live dashboard wiring

| Item | Detail |
|------|--------|
| Objective | Real traffic drives globe + panels |
| Tasks | Tauri events → store; filters; hover; pin; pause; top-N |
| Exit criteria | End-to-end UC-01..04 pass |
| Dependencies | Phases 1–3 |

### Phase 5 — Polish & ship

| Item | Detail |
|------|--------|
| Objective | Installable v1 with guidance |
| Tasks | Wizard; settings; `tauri build`; README screenshots; QA |
| Exit criteria | Clean machine install path documented & verified |
| Dependencies | Phase 4 |

---

## 5. Milestones

| ID | Milestone | Evidence |
|----|-----------|----------|
| M0 | Repo + docs baseline | Docs/README present |
| M1 | Visual prototype | Globe mock demo |
| M2 | Capture alpha | Live flow events |
| M3 | Enriched alpha | Process + geo fields |
| M4 | Integrated beta | E2E dashboard |
| M5 | v1 candidate | Installer + QA sign-off |

---

## 6. Roles (lightweight)

| Role | Responsibilities |
|------|------------------|
| Product owner | Scope, acceptance, priority |
| Engineer(s) | Implementation across stack |
| Designer (optional) | Tokens, motion, layout critique |
| Reviewer | Code review, security/privacy pass |

For solo development, one person holds all roles with checklist discipline.

---

## 7. Schedule model

Indicative effort bands (solo full-time equivalent days; adjust as needed):

| Phase | Est. days |
|-------|-----------|
| 0 | 0.5–1 |
| 1 | 1–2 |
| 2 | 2–4 |
| 3 | 1.5–3 |
| 4 | 2–3 |
| 5 | 1.5–3 |
| **Total** | **~9–16** |

Parallelization: after Phase 1, UI polish can continue while Phase 2–3 proceed.

---

## 8. Definition of done (global)

A work item is done when:

1. Code builds without errors.  
2. Behavior matches linked requirement IDs where applicable.  
3. No payload logging introduced.  
4. UX errors are user-readable for failure paths.  
5. Docs/README updated if user-facing behavior changed.  

---

## 9. Test plan (summary)

| Level | Focus |
|-------|--------|
| Unit | Flow merge, rate math, private IP detection, geo cache |
| Integration | Capture start/stop; snapshot shape; process join |
| Manual UI | Globe FPS, filters, pause, wizard paths |
| Install | Clean Windows 10/11 with/without Npcap |

### Manual QA checklist (v1)

- [ ] Launch without admin → clear elevation message  
- [ ] Launch without Npcap → clear install guidance  
- [ ] Launch ready → LIVE status  
- [ ] Open browser → arcs appear  
- [ ] Process filter works  
- [ ] Hover tooltip complete  
- [ ] Pause freezes feed  
- [ ] Settings home override moves arc origins  
- [ ] High-tab stress → UI remains responsive  

---

## 10. Communication & repo hygiene

- Conventional commits preferred  
- Feature branches → PR → main  
- Tag releases `v0.1.0-alpha`, `v1.0.0`  
- Issues labeled: `capture`, `ui`, `geo`, `docs`, `bug`  

---

## 11. Post-v1 backlog (roadmap horizon)

| Theme | Ideas |
|-------|--------|
| History | SQLite timeline, replay |
| Modes | First-class connections-only mode |
| Intelligence | Optional blocklists / ASN highlighting |
| Export | PCAP snippet / CSV of flows |
| Platforms | macOS/Linux experiments |

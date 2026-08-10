# Test Plan  
## Network Visualizer (NV-TEST-001)

**Version:** 1.0 · **Date:** 2026-08-10

---

## 1. Scope

Validate v1 functional requirements (SRS), performance under typical load, and install/setup paths.

---

## 2. Test levels

| Level | Owner | Focus |
|-------|-------|-------|
| Unit | Eng | Flow merge, rate math, private IP, geo cache keys |
| Integration | Eng | Commands + snapshot shape; process join |
| System / UI | Eng + PO | Globe, filters, pause, wizard |
| Acceptance | PO | SRS acceptance criteria |

---

## 3. Unit cases

| ID | Case | Expected |
|----|------|----------|
| U-01 | New 5-tuple inserts flow | first_seen set, counters init |
| U-02 | Same key increments bytes | counters rise, last_seen updates |
| U-03 | Idle expiry | flow removed after timeout |
| U-04 | Private IP detection | 10/8, 192.168/16, 127/8 marked private |
| U-05 | Rate EMA stability | rate tracks step input within bound |

---

## 4. Integration cases

| ID | Case | Expected |
|----|------|----------|
| I-01 | start_capture without admin | degraded or error with message |
| I-02 | start_capture demo mode | status=demo, synthetic flows |
| I-03 | stop_capture | status=stopped, events cease |
| I-04 | update_settings topN | subsequent snapshots respect topN |
| I-05 | Process enrichment | browser connection shows process name when available |

---

## 5. UI / system cases

| ID | Case | Expected |
|----|------|----------|
| S-01 | First launch | Wizard appears if firstRunComplete=false |
| S-02 | Globe renders | WebGL canvas visible, auto-rotate |
| S-03 | Hover arc | Tooltip with process/geo/rate |
| S-04 | Filter process | Feed + arcs reduce |
| S-05 | Pause | Feed freezes; resume updates |
| S-06 | Settings home override | Arc origins move |
| S-07 | Dark glass theme | Tokens applied; readable contrast |

---

## 6. Performance checks

| ID | Metric | Target |
|----|--------|--------|
| P-01 | UI snapshot apply | No multi-second freezes |
| P-02 | Arc count | ≤ topN (default 80) |
| P-03 | Demo mode FPS | Subjectively smooth on mid hardware |

---

## 7. Acceptance mapping

| SRS acceptance | Tests |
|----------------|-------|
| Arcs on browse | S-02, I-05 |
| Process names | I-05, S-03 |
| Filters/pause | S-04, S-05 |
| Npcap/elevation messages | I-01, S-01 |
| Docs present | Repo checklist |

---

## 8. Manual QA checklist (release)

- [ ] Clean machine docs path works  
- [ ] `npm run tauri build` succeeds  
- [ ] Demo mode demoable without Npcap  
- [ ] No panics on stop/start cycles  
- [ ] README screenshots/paths accurate  

---

## 9. Exit criteria

All Must-level SRS items verified or waived with written reason; no open Sev-1 bugs.

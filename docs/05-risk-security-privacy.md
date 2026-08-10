# Risk, Security & Privacy  
## Network Visualizer (NV-RISK-001)

**Document type:** Risk Register + Security & Privacy Design  
**Version:** 1.0  
**Date:** 2026-08-10  
**Status:** Baseline  

---

## 1. Purpose

Identify risks, mitigations, security controls, and privacy principles for Network Visualizer v1.

---

## 2. Risk register

Scoring: **Impact** 1–5, **Likelihood** 1–5, **Score** = I × L.

| ID | Risk | I | L | Score | Mitigation | Owner |
|----|------|---|---|-------|------------|-------|
| R-01 | Users cannot/will not run as Admin or install Npcap | 5 | 4 | 20 | First-run wizard; clear errors; degraded connection-table mode | Product/Eng |
| R-02 | Globe jank with hundreds of flows | 4 | 3 | 12 | Top-N arcs; city merge; throttle snapshots | Eng |
| R-03 | GeoLite2 license misuse if DB committed to git | 4 | 2 | 8 | Never commit mmdb; document acquisition; first-run path | Eng/Docs |
| R-04 | Inaccurate city-level geo confuses users | 2 | 4 | 8 | Show country always; treat city as approximate in copy | Product |
| R-05 | Process unknown for many UDP flows | 3 | 4 | 12 | Placeholder label; still show geo | Eng |
| R-06 | High PPS CPU on busy hosts | 4 | 2 | 8 | Header-only; batching; optional sampling later | Eng |
| R-07 | Privilege escalation perception / AV false positives | 3 | 3 | 9 | Code-sign installer when available; explain why admin needed | Release |
| R-08 | Public IP lookup privacy concern | 3 | 2 | 6 | Document call; allow manual home override; cache | Privacy |
| R-09 | Scope creep (fleet SIEM features) | 3 | 3 | 9 | SRS non-goals; backlog fence | Product |
| R-10 | WebView2 / GPU driver issues on old machines | 3 | 2 | 6 | Document requirements; graceful WebGL error | Eng |

### Priority actions

1. Ship excellent first-run + degraded mode path (R-01).  
2. Implement top-N rendering early in Phase 4 (R-02).  
3. Document GeoIP handling loudly (R-03/R-04).  

---

## 3. Threat model (STRIDE-lite)

| Asset | Threat | Mitigation |
|-------|--------|------------|
| Packet metadata | Local malware reading app memory | OS process isolation; no network export of flows by default |
| Admin privileges | Malicious installer impersonation | Prefer signed builds; open source review |
| Geo DB path | Path traversal if user path unsanitized | Validate path; open read-only |
| Settings file | Tampering | Low impact; validate schema |
| Optional public IP API | Tracking by third party | Minimize calls; document; allow offline override |

**Out of scope for v1 threat model:** defending against kernel rootkits already controlling the NIC.

---

## 4. Security design principles

1. **Least data:** Headers + counters only; no payloads by default.  
2. **Local-first:** No telemetry backend in v1.  
3. **Explicit privilege:** Capture only when elevated; never hide UAC need.  
4. **Fail closed on capture errors:** Do not silently pretend to capture.  
5. **Dependency hygiene:** Pin crate/npm versions; review native deps (pcap).  

### Secure development practices

- No secrets in repo  
- Dependency updates before release  
- Avoid logging full IPs in verbose production logs if unnecessary (debug OK)  
- Tauri allowlist: only required commands/events  

---

## 5. Privacy design

### Data categories

| Category | Examples | Stored? | Leaves device? |
|----------|----------|---------|----------------|
| Flow metadata | IP, port, bytes, process | Memory only (v1) | No |
| Geo results | City, country, lat/lon | Memory cache | No |
| Settings | Interface, home override | Local disk | No |
| Public IP query | Your public IP | Transient | Yes (to IP service), optional |
| Packet payload | HTTP body, etc. | **Not captured/stored** | N/A |

### User notices (product copy)

- Admin + Npcap required for full capture  
- App inspects connection metadata, not message content  
- GeoIP database is local  
- Public IP lookup optional / overridable  

### Regulatory note

This is a personal/local tool. Operators deploying in regulated environments should perform their own DPIA. v1 does not claim GDPR “processor” features.

---

## 6. Compliance & third-party licenses

| Component | License concern | Action |
|-----------|-----------------|--------|
| Tauri, React, globe.gl | OSS licenses | Include NOTICE/attribution |
| Npcap | Npcap license (OEM considerations for redistribution) | Require user install; do not bundle illegally |
| GeoLite2 | MaxMind license / attribution | User-obtained DB; attribution in About |
| Fonts/assets | License check | Use open fonts |

---

## 7. Operational security for contributors

- Never commit `.mmdb`, PCAPs with sensitive traffic, or personal IP dumps  
- Use synthetic data in screenshots when possible  
- Rotate any accidental secret commits immediately  

---

## 8. Residual risk statement

After mitigations, residual risk is **acceptable for v1 personal/desktop use**, dominated by setup friction (Npcap/admin) and approximate geolocation. Enterprise fleet use is **not** certified by this document.

---

## 9. Review cadence

| Event | Action |
|-------|--------|
| Before M4 beta | Re-score R-01, R-02 with real metrics |
| Before M5 release | Privacy copy review; license NOTICE complete |
| Post-release issues | Add risks to register via PR |

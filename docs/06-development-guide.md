# Development Guide  
## Network Visualizer (NV-DEV-001)

**Version:** 1.0 · **Date:** 2026-08-10 · **Audience:** Engineers

---

## 1. Prerequisites

| Tool | Version |
|------|---------|
| Windows 10/11 x64 | — |
| Node.js | 20+ |
| Rust (rustup) | stable |
| Visual Studio Build Tools | C++ workload (for Rust on Windows) |
| WebView2 | Runtime |
| Npcap (optional for full capture) | Latest |
| GeoLite2-City.mmdb (optional) | MaxMind free |

```powershell
# Verify
node -v
rustc -V
cargo -V
```

---

## 2. Clone & install

```powershell
cd Network_Visualizer
npm install
cd src-tauri
cargo fetch
cd ..
```

---

## 3. Run (development)

```powershell
npm run tauri dev
```

- Frontend Vite HMR on default Vite port  
- Tauri window loads `http://localhost:1420` (see `tauri.conf.json`)

### Modes

| Mode | How | Behavior |
|------|-----|----------|
| **Live (degraded)** | Default without Npcap | Connection-table polling + estimated rates + online/offline geo |
| **Live (full capture)** | Admin + Npcap | Packet-based byte counters when capture feature enabled |
| **Demo** | Settings → Demo mode, or auto when no flows | Synthetic globe traffic for UI validation |

---

## 4. Scripts

| Script | Purpose |
|--------|---------|
| `npm run dev` | Vite only (UI without Tauri) |
| `npm run build` | Frontend production build |
| `npm run tauri dev` | Full desktop app |
| `npm run tauri build` | Installer / binary |
| `npm run docs:docx` | Generate all Word docs |
| `npm run docs:pdf` | Generate all PDF docs |
| `npm run docs` | DOCX + PDF |

---

## 5. Project map

```text
src/                 React UI
src-tauri/src/       Rust backend modules
docs/                Specs + export/
scripts/             Doc generators
```

### Rust modules

| Module | Role |
|--------|------|
| `capture` | Packet / connection ingestion |
| `flow` | Aggregation, rates, expiry |
| `process` | PID ↔ socket |
| `geo` | IP → location |
| `engine` | Orchestration + snapshot emit |
| `commands` | Tauri IPC |

### React areas

| Path | Role |
|------|------|
| `components/` | Globe, panels, wizard, settings |
| `stores/` | Zustand live state |
| `hooks/` | Tauri event subscription |
| `styles/` | Design tokens |
| `types/` | Shared TS contracts |

---

## 6. Debugging tips

1. **Blank globe:** Check WebGL; open devtools (if enabled) for React errors.  
2. **No flows:** Run as Administrator; verify connections exist (`netstat -ano`).  
3. **No cities:** Set GeoDB path or allow network for ip-api fallback.  
4. **Npcap link errors:** Install Npcap with WinPcap API compatible mode; rebuild.

---

## 7. Coding workflow

1. Branch from `main`  
2. Implement against SRS IDs when possible  
3. Prefer small PRs: capture | ui | docs  
4. Run `npm run build` + `cargo check` before merge  
5. Never commit `.mmdb`, PCAPs with personal traffic, or secrets  

---

## 8. Definition of done (dev)

- [ ] Builds on Windows  
- [ ] No payload logging  
- [ ] UI failure states readable  
- [ ] Demo mode still works offline for UI demos  

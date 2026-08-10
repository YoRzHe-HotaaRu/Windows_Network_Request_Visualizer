# Deployment & Release Guide  
## Network Visualizer (NV-REL-001)

**Version:** 1.0 · **Date:** 2026-08-10

---

## 1. Build artifacts

```powershell
npm install
npm run tauri build
```

Outputs typically under:

```text
src-tauri/target/release/
src-tauri/target/release/bundle/nsis/   # or msi
```

---

## 2. Runtime prerequisites (end user)

1. Windows 10 22H2+ / Windows 11 x64  
2. WebView2 Runtime  
3. **Administrator** for preferred capture modes  
4. Npcap (recommended for full capture)  
5. Optional: GeoLite2-City.mmdb path  

---

## 3. Release checklist

- [ ] Version bumped in `package.json` + `src-tauri/Cargo.toml` + `tauri.conf.json`  
- [ ] CHANGELOG updated  
- [ ] IPC doc matches code  
- [ ] Manual QA checklist (NV-TEST-001) passed  
- [ ] Installer smoke-tested on clean VM if available  
- [ ] License + third-party notices reviewed (Npcap/MaxMind not illegally bundled)  
- [ ] Git tag `vX.Y.Z`  

---

## 4. Distribution notes

| Component | Policy |
|-----------|--------|
| App binary | Distribute under project license |
| Npcap | User installs from npcap.com |
| GeoLite2 | User obtains per MaxMind terms |

---

## 5. Rollback

Keep previous installer; settings file path documented so users retain config across versions when possible.

---

## 6. Support matrix

| Feature | Without admin | Without Npcap | Without mmdb |
|---------|---------------|---------------|--------------|
| Demo mode | Yes | Yes | Yes |
| Connection listing | Limited | Yes | Yes |
| Full packet rates | No | No | Yes (if admin+Npcap) |
| Offline geo | Yes | Yes | No (HTTP fallback) |

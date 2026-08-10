# Coding Standards  
## Network Visualizer (NV-STD-001)

**Version:** 1.0 · **Date:** 2026-08-10

---

## 1. General

- Prefer clarity over cleverness  
- Small modules with single responsibility  
- No secrets, mmdb, or sensitive PCAPs in git  
- User-facing errors: plain language  

---

## 2. TypeScript / React

- Strict TypeScript  
- Functional components  
- Zustand for live high-churn state; avoid prop-drilling snapshots  
- Memoize heavy globe props (`useMemo`)  
- Do not re-create huge arrays every render without need  
- CSS variables for theme tokens  

### Naming

- Components: `PascalCase.tsx`  
- Hooks: `useThing.ts`  
- Types: `ipc.ts`, interfaces `PascalCase`  

---

## 3. Rust

- `snake_case` modules/functions  
- Serde structs for IPC use `#[serde(rename_all = "camelCase")]`  
- Prefer `tracing` over `println!`  
- Never log packet payloads  
- Errors: `thiserror` / `anyhow` at boundaries; string messages for Tauri  

### Unsafe

- Avoid; only for unavoidable Win32 with documented safety comments  

---

## 4. Privacy rules (code)

- Default: headers + counters only  
- No automatic cloud analytics  
- Geo HTTP fallback only when offline DB missing and network allowed  

---

## 5. Commits

Conventional commits:

```text
feat: add flow expiry
fix: correct private IP check
docs: update IPC spec
chore: bump deps
```

---

## 6. PR checklist

- [ ] Builds (`cargo check`, `npm run build`)  
- [ ] No new payload capture  
- [ ] Docs updated if IPC/UX changed  
- [ ] Manual smoke: start → see flows/demo → stop  

# API / IPC Specification  
## Network Visualizer (NV-API-001)

**Version:** 1.0 · **Date:** 2026-08-10

---

## 1. Overview

Frontend ↔ backend communication uses **Tauri 2** commands (`invoke`) and **events** (`listen`).

| Channel | Direction | Use |
|---------|-----------|-----|
| Commands | UI → Rust | Control plane |
| Events | Rust → UI | High-frequency snapshots |

---

## 2. Shared types

```typescript
export type CaptureStatus =
  | "stopped"
  | "starting"
  | "running"
  | "degraded"
  | "demo"
  | "error";

export type Protocol = "TCP" | "UDP" | "Other";

export interface FlowRecord {
  id: string;
  protocol: Protocol;
  srcIp: string;
  srcPort: number;
  dstIp: string;
  dstPort: number;
  bytesUp: number;
  bytesDown: number;
  packets: number;
  rateBps: number;
  pid?: number | null;
  processName?: string | null;
  remoteCity?: string | null;
  remoteCountry?: string | null;
  remoteLat?: number | null;
  remoteLon?: number | null;
  firstSeen: number; // unix ms
  lastSeen: number;
  isPrivateRemote: boolean;
}

export interface SnapshotTotals {
  flows: number;
  bpsUp: number;
  bpsDown: number;
  destinations: number;
}

export interface FlowSnapshot {
  ts: number;
  status: CaptureStatus;
  message?: string | null;
  mode: "capture" | "connections" | "demo";
  home: { lat: number; lon: number; label: string };
  totals: SnapshotTotals;
  flows: FlowRecord[];
}

export interface AppSettings {
  interfaceId?: string | null;
  idleTimeoutSecs: number;
  topN: number;
  snapshotMs: number;
  demoMode: boolean;
  homeLat?: number | null;
  homeLon?: number | null;
  homeLabel?: string | null;
  geoDbPath?: string | null;
  firstRunComplete: boolean;
}

export interface AppStatus {
  status: CaptureStatus;
  message?: string | null;
  elevated: boolean;
  npcapAvailable: boolean;
  geoReady: boolean;
  settings: AppSettings;
}
```

---

## 3. Commands

### `get_status` → `AppStatus`

Returns lifecycle state, elevation, capability flags, settings.

### `get_settings` → `AppSettings`

### `update_settings` `(partial: Partial<AppSettings>)` → `AppSettings`

Merges partial settings; persists to disk when possible.

### `start_capture` → `AppStatus`

Starts engine (capture / connections / demo per settings & capabilities).

### `stop_capture` → `AppStatus`

### `list_interfaces` → `{ id: string; name: string; description?: string }[]`

### `resolve_home` → `{ lat: number; lon: number; label: string }`

Forces re-resolution of home location.

### `complete_first_run` → `AppSettings`

Marks wizard complete.

---

## 4. Events

### `flow_snapshot`

Payload: `FlowSnapshot`  
Interval: `settings.snapshotMs` (default 400)

UI must tolerate dropped frames; apply only latest snapshot when paused=false.

---

## 5. Error model

Commands return `Result<T, string>` where `string` is user-readable:

| Code-ish prefix | Meaning |
|-----------------|---------|
| `NOT_ELEVATED` | Need admin for preferred mode |
| `NPCAP_MISSING` | Driver not found |
| `IFACE_OPEN_FAIL` | Cannot open adapter |
| `GEO_DB_MISSING` | Path invalid (fallback may still work) |
| `INTERNAL` | Unexpected |

---

## 6. Versioning

Breaking IPC changes bump minor app version and this document (`NV-API-001`).  
Frontend types in `src/types/ipc.ts` are source of truth for TS; Rust serde structs must match field names (camelCase via serde rename).

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
  firstSeen: number;
  lastSeen: number;
  isPrivateRemote: boolean;
}

export interface SnapshotTotals {
  flows: number;
  bpsUp: number;
  bpsDown: number;
  destinations: number;
}

export interface HomeLocation {
  lat: number;
  lon: number;
  label: string;
}

export interface FlowSnapshot {
  ts: number;
  status: CaptureStatus;
  message?: string | null;
  mode: "capture" | "connections" | "demo";
  home: HomeLocation;
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

export interface NetInterface {
  id: string;
  name: string;
  description?: string | null;
}

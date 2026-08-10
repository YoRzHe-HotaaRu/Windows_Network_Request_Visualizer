import { useMemo } from "react";
import { create } from "zustand";
import type {
  AppSettings,
  AppStatus,
  FlowRecord,
  FlowSnapshot,
  HomeLocation,
} from "../types/ipc";

export interface Filters {
  process: string;
  country: string;
  protocol: "ALL" | "TCP" | "UDP";
  minRateBps: number;
}

interface FlowState {
  snapshot: FlowSnapshot | null;
  status: AppStatus | null;
  paused: boolean;
  frozen: FlowSnapshot | null;
  selectedId: string | null;
  filters: Filters;
  settingsOpen: boolean;
  wizardOpen: boolean;
  setSnapshot: (s: FlowSnapshot) => void;
  setStatus: (s: AppStatus) => void;
  setPaused: (p: boolean) => void;
  setSelectedId: (id: string | null) => void;
  setFilters: (f: Partial<Filters>) => void;
  setSettingsOpen: (v: boolean) => void;
  setWizardOpen: (v: boolean) => void;
}

export const defaultHome: HomeLocation = {
  lat: 37.7749,
  lon: -122.4194,
  label: "Home",
};

const EMPTY_FLOWS: FlowRecord[] = [];

export const useFlowStore = create<FlowState>((set, get) => ({
  snapshot: null,
  status: null,
  paused: false,
  frozen: null,
  selectedId: null,
  filters: { process: "", country: "", protocol: "ALL", minRateBps: 0 },
  settingsOpen: false,
  wizardOpen: false,

  setSnapshot: (s) => {
    if (get().paused) return;
    set({ snapshot: s });
  },

  setStatus: (s) => set({ status: s }),

  setPaused: (p) => {
    if (p) {
      set({ paused: true, frozen: get().snapshot });
    } else {
      set({ paused: false, frozen: null });
    }
  },

  setSelectedId: (id) => set({ selectedId: id }),
  setFilters: (f) => set({ filters: { ...get().filters, ...f } }),
  setSettingsOpen: (v) => set({ settingsOpen: v }),
  setWizardOpen: (v) => set({ wizardOpen: v }),
}));

/** Stable: select only store fields (never return new objects from the selector). */
export function useActiveSnapshot(): FlowSnapshot | null {
  const paused = useFlowStore((s) => s.paused);
  const frozen = useFlowStore((s) => s.frozen);
  const snapshot = useFlowStore((s) => s.snapshot);
  return paused ? frozen ?? snapshot : snapshot;
}

export function useHome(): HomeLocation {
  const snap = useActiveSnapshot();
  return snap?.home ?? defaultHome;
}

export function filterFlows(
  snap: FlowSnapshot | null,
  filters: Filters
): FlowRecord[] {
  if (!snap?.flows?.length) return EMPTY_FLOWS;
  const f = filters;
  const out = snap.flows.filter((flow) => {
    if (flow.isPrivateRemote) return false;
    if (flow.remoteLat == null || flow.remoteLon == null) return false;
    if (f.protocol !== "ALL" && flow.protocol !== f.protocol) return false;
    if (f.minRateBps > 0 && flow.rateBps < f.minRateBps) return false;
    if (
      f.process &&
      !(flow.processName || "").toLowerCase().includes(f.process.toLowerCase())
    ) {
      return false;
    }
    if (
      f.country &&
      !(flow.remoteCountry || "")
        .toLowerCase()
        .includes(f.country.toLowerCase())
    ) {
      return false;
    }
    return true;
  });
  return out.length ? out : EMPTY_FLOWS;
}

export function useVisibleFlows(): FlowRecord[] {
  const snap = useActiveSnapshot();
  const filters = useFlowStore((s) => s.filters);
  return useMemo(() => filterFlows(snap, filters), [snap, filters]);
}

export function formatBps(bps: number): string {
  if (bps < 1000) return `${bps.toFixed(0)} B/s`;
  if (bps < 1_000_000) return `${(bps / 1000).toFixed(1)} KB/s`;
  if (bps < 1_000_000_000) return `${(bps / 1_000_000).toFixed(2)} MB/s`;
  return `${(bps / 1_000_000_000).toFixed(2)} GB/s`;
}

export function formatBytes(n: number): string {
  if (n < 1000) return `${n} B`;
  if (n < 1_000_000) return `${(n / 1000).toFixed(1)} KB`;
  if (n < 1_000_000_000) return `${(n / 1_000_000).toFixed(2)} MB`;
  return `${(n / 1_000_000_000).toFixed(2)} GB`;
}

export const defaultSettings = (): AppSettings => ({
  interfaceId: null,
  idleTimeoutSecs: 45,
  topN: 80,
  snapshotMs: 400,
  demoMode: false,
  homeLat: null,
  homeLon: null,
  homeLabel: null,
  geoDbPath: null,
  firstRunComplete: false,
});

import { useEffect, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";
import type { AppStatus, FlowSnapshot } from "../types/ipc";
import { useFlowStore } from "../stores/flows";

const isTauri = () =>
  typeof window !== "undefined" &&
  ("__TAURI_INTERNALS__" in window || "__TAURI__" in window);

export function useCaptureBootstrap() {
  const setSnapshot = useFlowStore((s) => s.setSnapshot);
  const setStatus = useFlowStore((s) => s.setStatus);
  const setWizardOpen = useFlowStore((s) => s.setWizardOpen);
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    let unlisten: UnlistenFn | undefined;

    async function boot() {
      if (!isTauri()) {
        // Browser-only: seed demo snapshot so UI can be developed without Tauri
        const { startBrowserDemo } = await import("../lib/browserDemo");
        startBrowserDemo(setSnapshot, setStatus);
        setWizardOpen(false);
        return;
      }

      try {
        const status = await invoke<AppStatus>("get_status");
        setStatus(status);
        if (!status.settings.firstRunComplete) {
          setWizardOpen(true);
        }
        try {
          unlisten = await listen<FlowSnapshot>("flow_snapshot", (e) => {
            setSnapshot(e.payload);
          });
        } catch (listenErr) {
          console.error("listen failed", listenErr);
        }
        // Auto-start for convenience
        try {
          const next = await invoke<AppStatus>("start_capture");
          setStatus(next);
        } catch (startErr) {
          console.error("start_capture failed", startErr);
          // Fall back to browser-style demo so UI is never empty
          const { startBrowserDemo } = await import("../lib/browserDemo");
          startBrowserDemo(setSnapshot, setStatus);
        }
      } catch (err) {
        console.error("bootstrap failed", err);
        setStatus({
          status: "error",
          message: String(err),
          elevated: false,
          npcapAvailable: false,
          geoReady: false,
          settings: {
            interfaceId: null,
            idleTimeoutSecs: 45,
            topN: 80,
            snapshotMs: 400,
            demoMode: true,
            firstRunComplete: true,
          },
        });
        try {
          const { startBrowserDemo } = await import("../lib/browserDemo");
          startBrowserDemo(setSnapshot, setStatus);
        } catch (demoErr) {
          console.error("demo fallback failed", demoErr);
        }
      }
    }

    boot();
    return () => {
      unlisten?.();
    };
  }, [setSnapshot, setStatus, setWizardOpen]);
}

export async function startCapture() {
  if (!isTauri()) return null;
  return invoke<AppStatus>("start_capture");
}

export async function stopCapture() {
  if (!isTauri()) return null;
  return invoke<AppStatus>("stop_capture");
}

export async function updateSettings(partial: Record<string, unknown>) {
  if (!isTauri()) return null;
  return invoke("update_settings", { partial });
}

export async function completeFirstRun() {
  if (!isTauri()) return null;
  return invoke("complete_first_run");
}

export async function getStatus() {
  if (!isTauri()) return null;
  return invoke<AppStatus>("get_status");
}

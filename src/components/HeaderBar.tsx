import { useFlowStore, useActiveSnapshot } from "../stores/flows";
import { startCapture, stopCapture } from "../hooks/useCapture";

export function HeaderBar() {
  const status = useFlowStore((s) => s.status);
  const snapshot = useActiveSnapshot();
  const paused = useFlowStore((s) => s.paused);
  const setPaused = useFlowStore((s) => s.setPaused);
  const setSettingsOpen = useFlowStore((s) => s.setSettingsOpen);
  const setStatus = useFlowStore((s) => s.setStatus);

  const st = snapshot?.status ?? status?.status ?? "stopped";
  const chipClass = paused
    ? "paused"
    : st === "demo"
      ? "demo"
      : st === "error"
        ? "error"
        : st === "degraded"
          ? "degraded"
          : st === "running"
            ? "live"
            : "";

  const label = paused
    ? "PAUSED"
    : st === "demo"
      ? "DEMO"
      : st === "degraded"
        ? "DEGRADED"
        : st === "running"
          ? "LIVE"
          : String(st).toUpperCase();

  return (
    <header className="app-header">
      <div className="brand">
        <span className="brand-mark" aria-hidden />
        <span className="brand-title">Network Visualizer</span>
        <span className="brand-sub">host → earth</span>
      </div>

      <div className="header-meta">
        <span className={`chip ${chipClass}`}>
          <span className="dot" />
          {label}
        </span>
        {snapshot?.mode && (
          <span className="chip">mode {snapshot.mode}</span>
        )}
        {status && (
          <span className="chip">
            {status.elevated ? "elevated" : "user"}
            {status.npcapAvailable ? " · npcap" : ""}
          </span>
        )}
      </div>

      <div className="header-actions">
        <button type="button" className="ghost" onClick={() => setPaused(!paused)}>
          {paused ? "Resume" : "Pause"}
        </button>
        <button
          type="button"
          className="primary"
          onClick={async () => {
            const s = await startCapture();
            if (s) setStatus(s);
          }}
        >
          Start
        </button>
        <button
          type="button"
          className="ghost"
          onClick={async () => {
            const s = await stopCapture();
            if (s) setStatus(s);
          }}
        >
          Stop
        </button>
        <button type="button" className="ghost" onClick={() => setSettingsOpen(true)}>
          Settings
        </button>
      </div>
    </header>
  );
}

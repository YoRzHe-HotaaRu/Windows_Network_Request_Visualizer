import { useEffect, useState } from "react";
import { useFlowStore } from "../stores/flows";
import { getStatus, updateSettings, startCapture } from "../hooks/useCapture";
import type { AppSettings } from "../types/ipc";

export function SettingsModal() {
  const open = useFlowStore((s) => s.settingsOpen);
  const setOpen = useFlowStore((s) => s.setSettingsOpen);
  const setStatus = useFlowStore((s) => s.setStatus);
  const status = useFlowStore((s) => s.status);
  const [form, setForm] = useState<AppSettings | null>(null);

  useEffect(() => {
    if (open) {
      setForm(status?.settings ?? null);
      getStatus().then((s) => {
        if (s) {
          setStatus(s);
          setForm(s.settings);
        }
      });
    }
  }, [open, status?.settings, setStatus]);

  if (!open || !form) return null;

  return (
    <div className="modal-backdrop" onClick={() => setOpen(false)}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-hd">
          <h2>Settings</h2>
          <p>Capture mode, density, and origin override.</p>
        </div>
        <div className="modal-bd">
          <div className="field">
            <label className="check-row">
              <input
                type="checkbox"
                checked={form.demoMode}
                onChange={(e) => setForm({ ...form, demoMode: e.target.checked })}
              />
              Demo mode (synthetic traffic)
            </label>
          </div>
          <div className="field">
            <label>Top-N arcs</label>
            <input
              type="number"
              min={10}
              max={200}
              value={form.topN}
              onChange={(e) => setForm({ ...form, topN: Number(e.target.value) })}
            />
          </div>
          <div className="field">
            <label>Idle timeout (seconds)</label>
            <input
              type="number"
              min={10}
              max={300}
              value={form.idleTimeoutSecs}
              onChange={(e) =>
                setForm({ ...form, idleTimeoutSecs: Number(e.target.value) })
              }
            />
          </div>
          <div className="field">
            <label>Snapshot interval (ms)</label>
            <input
              type="number"
              min={200}
              max={2000}
              value={form.snapshotMs}
              onChange={(e) =>
                setForm({ ...form, snapshotMs: Number(e.target.value) })
              }
            />
          </div>
          <div className="field">
            <label>Home latitude</label>
            <input
              type="number"
              step="0.0001"
              value={form.homeLat ?? ""}
              placeholder="auto"
              onChange={(e) =>
                setForm({
                  ...form,
                  homeLat: e.target.value === "" ? null : Number(e.target.value),
                })
              }
            />
          </div>
          <div className="field">
            <label>Home longitude</label>
            <input
              type="number"
              step="0.0001"
              value={form.homeLon ?? ""}
              placeholder="auto"
              onChange={(e) =>
                setForm({
                  ...form,
                  homeLon: e.target.value === "" ? null : Number(e.target.value),
                })
              }
            />
          </div>
          <div className="field">
            <label>Home label</label>
            <input
              value={form.homeLabel ?? ""}
              placeholder="Home"
              onChange={(e) => setForm({ ...form, homeLabel: e.target.value })}
            />
          </div>
          <div className="field">
            <label>GeoLite2-City.mmdb path</label>
            <input
              value={form.geoDbPath ?? ""}
              placeholder="C:\path\GeoLite2-City.mmdb"
              onChange={(e) => setForm({ ...form, geoDbPath: e.target.value })}
            />
          </div>
        </div>
        <div className="modal-ft">
          <button type="button" className="ghost" onClick={() => setOpen(false)}>
            Cancel
          </button>
          <button
            type="button"
            className="primary"
            onClick={async () => {
              await updateSettings(form as unknown as Record<string, unknown>);
              const st = await getStatus();
              if (st) setStatus(st);
              await startCapture();
              setOpen(false);
            }}
          >
            Save & restart
          </button>
        </div>
      </div>
    </div>
  );
}

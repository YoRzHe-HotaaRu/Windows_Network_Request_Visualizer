import {
  formatBps,
  useFlowStore,
  useActiveSnapshot,
  useHome,
} from "../stores/flows";

export function KpiStrip() {
  const snap = useActiveSnapshot();
  const home = useHome();
  const filters = useFlowStore((s) => s.filters);
  const setFilters = useFlowStore((s) => s.setFilters);
  const t = snap?.totals;

  return (
    <aside className="panel">
      <div className="panel-hd">
        <h3>Telemetry</h3>
      </div>
      <div className="panel-bd">
        <div className="kpi-grid">
          <div className="kpi">
            <div className="label">Flows</div>
            <div className="value">{t?.flows ?? 0}</div>
          </div>
          <div className="kpi">
            <div className="label">Destinations</div>
            <div className="value ice">{t?.destinations ?? 0}</div>
          </div>
          <div className="kpi">
            <div className="label">Downlink</div>
            <div className="value">{formatBps(t?.bpsDown ?? 0)}</div>
          </div>
          <div className="kpi">
            <div className="label">Uplink</div>
            <div className="value ice">{formatBps(t?.bpsUp ?? 0)}</div>
          </div>
        </div>

        <div className="panel-hd" style={{ margin: "0 -12px 12px", borderTop: "1px solid var(--line)" }}>
          <h3>Filters</h3>
        </div>

        <div className="field">
          <label>Process</label>
          <input
            placeholder="chrome, discord…"
            value={filters.process}
            onChange={(e) => setFilters({ process: e.target.value })}
          />
        </div>
        <div className="field">
          <label>Country</label>
          <input
            placeholder="United States…"
            value={filters.country}
            onChange={(e) => setFilters({ country: e.target.value })}
          />
        </div>
        <div className="field">
          <label>Protocol</label>
          <select
            value={filters.protocol}
            onChange={(e) =>
              setFilters({ protocol: e.target.value as "ALL" | "TCP" | "UDP" })
            }
          >
            <option value="ALL">All</option>
            <option value="TCP">TCP</option>
            <option value="UDP">UDP</option>
          </select>
        </div>
        <div className="field">
          <label>Min rate (KB/s)</label>
          <input
            type="number"
            min={0}
            value={Math.round(filters.minRateBps / 1000)}
            onChange={(e) =>
              setFilters({ minRateBps: Number(e.target.value || 0) * 1000 })
            }
          />
        </div>

        <div className="home-block">
          <div className="label">Origin</div>
          <div>{home.label}</div>
          <div className="mono faint" style={{ marginTop: 2 }}>
            {home.lat.toFixed(4)}, {home.lon.toFixed(4)}
          </div>
        </div>
      </div>
    </aside>
  );
}

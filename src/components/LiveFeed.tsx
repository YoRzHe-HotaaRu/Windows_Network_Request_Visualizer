import { formatBps, useFlowStore, useVisibleFlows } from "../stores/flows";
import {
  flowAppLabel,
  flowServiceHint,
  friendlyProcessName,
} from "../lib/processDisplay";

export function LiveFeed() {
  const flows = useVisibleFlows();
  const selectedId = useFlowStore((s) => s.selectedId);
  const setSelectedId = useFlowStore((s) => s.setSelectedId);
  const selected = flows.find((f) => f.id === selectedId) ?? flows[0];

  return (
    <aside className="panel">
      <div className="panel-hd">
        <h3>Live feed</h3>
        <span className="mono faint" style={{ fontSize: 10 }}>
          {flows.length}
        </span>
      </div>

      <div className="scroll-y" style={{ flex: 1, minHeight: 0 }}>
        {flows.length === 0 && (
          <div className="faint" style={{ padding: 12 }}>
            No mapped destinations yet.
          </div>
        )}
        {flows.slice(0, 80).map((f) => {
          const app = flowAppLabel(f.processName, f.pid, f.dstPort);
          const svc = flowServiceHint(f.dstPort);
          return (
            <div
              key={f.id}
              className={`feed-item ${f.id === selected?.id ? "active" : ""}`}
              onClick={() => setSelectedId(f.id)}
            >
              <div className="top">
                <span title={f.processName || undefined}>{app}</span>
                <span className="rate">{formatBps(f.rateBps)}</span>
              </div>
              <div className="sub">
                {f.remoteCity || "—"}, {f.remoteCountry || "—"}
                {" · "}
                {f.dstIp}:{f.dstPort}
                {svc ? ` · ${svc}` : ""}
                {" · "}
                {f.protocol}
                {f.processName ? ` · ${f.processName}` : f.pid != null ? ` · pid ${f.pid}` : ""}
              </div>
            </div>
          );
        })}
      </div>

      <div className="detail-block">
        <h3>Selection</h3>
        {selected ? (
          <div className="detail-grid">
            <span className="k">App</span>
            <span className="v">
              {friendlyProcessName(selected.processName, selected.pid)}
            </span>
            <span className="k">Process</span>
            <span className="v">
              {selected.processName || "—"}
              {selected.pid != null ? `  ·  pid ${selected.pid}` : ""}
            </span>
            <span className="k">Remote</span>
            <span className="v">
              {selected.dstIp}:{selected.dstPort}
              {flowServiceHint(selected.dstPort)
                ? `  (${flowServiceHint(selected.dstPort)})`
                : ""}
            </span>
            <span className="k">Location</span>
            <span className="v">
              {selected.remoteCity || "—"}, {selected.remoteCountry || "—"}
            </span>
            <span className="k">Rate</span>
            <span className="v">
              {formatBps(selected.rateBps)} · {selected.protocol}
            </span>
            <span className="k">Volume</span>
            <span className="v">
              ↓ {selected.bytesDown.toLocaleString()} · ↑{" "}
              {selected.bytesUp.toLocaleString()} · {selected.packets} pkts
            </span>
          </div>
        ) : (
          <div className="faint">Select a flow</div>
        )}
      </div>
    </aside>
  );
}

import { useMemo, useRef, useEffect, useState } from "react";
import { formatBps, useActiveSnapshot, useVisibleFlows } from "../stores/flows";

function aggregate(
  flows: { key: string; rate: number }[],
  limit = 5
): { key: string; rate: number }[] {
  const map = new Map<string, number>();
  for (const f of flows) {
    map.set(f.key, (map.get(f.key) || 0) + f.rate);
  }
  return [...map.entries()]
    .map(([key, rate]) => ({ key, rate }))
    .sort((a, b) => b.rate - a.rate)
    .slice(0, limit);
}

function Bars({
  items,
  ice,
}: {
  items: { key: string; rate: number }[];
  ice?: boolean;
}) {
  const max = Math.max(1, ...items.map((i) => i.rate));
  return (
    <div>
      {items.length === 0 && <div className="faint">—</div>}
      {items.map((i) => (
        <div className="bar-row" key={i.key}>
          <div className="name" title={i.key}>
            {i.key}
          </div>
          <div className="bar">
            <span
              className={ice ? "ice" : undefined}
              style={{ width: `${(i.rate / max) * 100}%` }}
            />
          </div>
          <div className="val">{formatBps(i.rate)}</div>
        </div>
      ))}
    </div>
  );
}

function Sparkline({ series }: { series: number[] }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    const dpr = window.devicePixelRatio || 1;
    const w = c.clientWidth || 200;
    const h = c.clientHeight || 56;
    c.width = w * dpr;
    c.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);

    // inset grid
    ctx.strokeStyle = "#2a2e34";
    ctx.lineWidth = 1;
    for (let i = 1; i < 4; i++) {
      const y = (h / 4) * i;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }

    if (series.length < 2) return;
    const max = Math.max(...series, 1);
    const pad = 4;

    // fill under line — solid wash, not gradient
    ctx.beginPath();
    series.forEach((v, i) => {
      const x = (i / (series.length - 1)) * w;
      const y = h - pad - (v / max) * (h - pad * 2);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.lineTo(w, h);
    ctx.lineTo(0, h);
    ctx.closePath();
    ctx.fillStyle = "rgba(240, 162, 2, 0.12)";
    ctx.fill();

    // line
    ctx.beginPath();
    series.forEach((v, i) => {
      const x = (i / (series.length - 1)) * w;
      const y = h - pad - (v / max) * (h - pad * 2);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.strokeStyle = "#f0a202";
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }, [series]);

  return <canvas ref={canvasRef} className="spark" />;
}

export function BottomCharts() {
  const flows = useVisibleFlows();
  const snap = useActiveSnapshot();
  const [history, setHistory] = useState<number[]>([0]);

  const total = (snap?.totals.bpsDown ?? 0) + (snap?.totals.bpsUp ?? 0);

  useEffect(() => {
    setHistory((prev) => {
      if (prev.length && prev[prev.length - 1] === total && prev.length > 1) {
        return prev;
      }
      return [...prev.slice(-48), total];
    });
  }, [total]);

  const processes = useMemo(
    () =>
      aggregate(
        flows.map((f) => ({
          key: f.processName || "Unknown",
          rate: f.rateBps,
        }))
      ),
    [flows]
  );
  const countries = useMemo(
    () =>
      aggregate(
        flows.map((f) => ({
          key: f.remoteCountry || "Unknown",
          rate: f.rateBps,
        }))
      ),
    [flows]
  );

  return (
    <div className="bottom-strip">
      <section className="panel">
        <div className="panel-hd">
          <h3>Top processes</h3>
        </div>
        <div className="panel-bd" style={{ paddingTop: 10 }}>
          <Bars items={processes} />
        </div>
      </section>
      <section className="panel">
        <div className="panel-hd">
          <h3>Top countries</h3>
        </div>
        <div className="panel-bd" style={{ paddingTop: 10 }}>
          <Bars items={countries} ice />
        </div>
      </section>
      <section className="panel">
        <div className="panel-hd">
          <h3>Throughput</h3>
          <span className="mono" style={{ color: "var(--amber)", fontSize: 11 }}>
            {formatBps(total)}
          </span>
        </div>
        <div className="panel-bd" style={{ paddingTop: 10 }}>
          <Sparkline series={history} />
        </div>
      </section>
    </div>
  );
}

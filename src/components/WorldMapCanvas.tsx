import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import {
  formatBps,
  useHome,
  useVisibleFlows,
  useFlowStore,
} from "../stores/flows";
import type { FlowRecord } from "../types/ipc";
import {
  project,
  unproject,
  flightArcPoints,
  clampView,
  DEFAULT_VIEW,
  type MapView,
} from "../lib/geoProject";
import { friendlyProcessName } from "../lib/processDisplay";

type Props = { width: number; height: number };

type FC = {
  type: string;
  features: Array<{
    geometry: {
      type: string;
      coordinates: number[][][] | number[][][][];
    } | null;
  }>;
};

const PAD = 12;
const AMBER = "#f0a202";
const AMBER_DIM = "rgba(240, 162, 2, 0.45)";
const ICE = "#7eb8da";
const ICE_DIM = "rgba(126, 184, 218, 0.45)";
const LAND_FILL = "#151a20";
const LAND_EDGE = "#3a424e";
const OCEAN = "#0b0d10";
const GRID = "rgba(90, 98, 110, 0.22)";
const MAX_ARCS = 48;

function ringPath(
  ctx: CanvasRenderingContext2D,
  ring: number[][],
  w: number,
  h: number,
  view: MapView
) {
  if (!ring?.length) return;
  let started = false;
  for (let i = 0; i < ring.length; i++) {
    const lon = ring[i][0];
    const lat = ring[i][1];
    if (!Number.isFinite(lon) || !Number.isFinite(lat)) continue;
    const p = project(lon, lat, w, h, PAD, view);
    if (!started) {
      ctx.moveTo(p.x, p.y);
      started = true;
    } else {
      ctx.lineTo(p.x, p.y);
    }
  }
  if (started) ctx.closePath();
}

function paintGeometry(
  ctx: CanvasRenderingContext2D,
  g: { type: string; coordinates: number[][][] | number[][][][] },
  w: number,
  h: number,
  view: MapView
) {
  if (g.type === "Polygon") {
    for (const ring of g.coordinates as number[][][]) {
      ringPath(ctx, ring, w, h, view);
    }
  } else if (g.type === "MultiPolygon") {
    for (const poly of g.coordinates as number[][][][]) {
      for (const ring of poly) {
        ringPath(ctx, ring, w, h, view);
      }
    }
  }
}

function drawBaseMap(
  ctx: CanvasRenderingContext2D,
  land: FC | null,
  w: number,
  h: number,
  view: MapView
) {
  ctx.fillStyle = OCEAN;
  ctx.fillRect(0, 0, w, h);

  // graticule
  ctx.save();
  ctx.strokeStyle = GRID;
  ctx.lineWidth = 1;
  ctx.beginPath();
  const lonStep = view.scale >= 4 ? 10 : 30;
  const latStep = view.scale >= 4 ? 10 : 30;
  for (let lon = -180; lon <= 180; lon += lonStep) {
    const a = project(lon, 85, w, h, PAD, view);
    const b = project(lon, -85, w, h, PAD, view);
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
  }
  for (let lat = -80; lat <= 80; lat += latStep) {
    const a = project(-180, lat, w, h, PAD, view);
    const b = project(180, lat, w, h, PAD, view);
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
  }
  ctx.stroke();
  ctx.restore();

  if (!land?.features?.length) return;

  ctx.beginPath();
  for (const f of land.features) {
    if (f.geometry) paintGeometry(ctx, f.geometry, w, h, view);
  }
  ctx.fillStyle = LAND_FILL;
  ctx.fill();

  ctx.beginPath();
  for (const f of land.features) {
    if (f.geometry) paintGeometry(ctx, f.geometry, w, h, view);
  }
  ctx.strokeStyle = LAND_EDGE;
  ctx.lineWidth = view.scale >= 3 ? 1.25 : 1;
  ctx.stroke();

  ctx.beginPath();
  const eqA = project(-180, 0, w, h, PAD, view);
  const eqB = project(180, 0, w, h, PAD, view);
  ctx.moveTo(eqA.x, eqA.y);
  ctx.lineTo(eqB.x, eqB.y);
  ctx.strokeStyle = "rgba(240, 162, 2, 0.12)";
  ctx.lineWidth = 1;
  ctx.stroke();
}

function clusterFlows(flows: FlowRecord[]) {
  const map = new Map<
    string,
    {
      key: string;
      lat: number;
      lon: number;
      label: string;
      country: string;
      rate: number;
      protocol: string;
      sample: FlowRecord;
      count: number;
    }
  >();

  for (const f of flows) {
    if (f.remoteLat == null || f.remoteLon == null) continue;
    const city = (f.remoteCity || f.dstIp || "?").trim();
    const country = (f.remoteCountry || "").trim();
    const key = `${city}|${country}|${f.remoteLat.toFixed(1)}|${f.remoteLon.toFixed(1)}`;
    const existing = map.get(key);
    if (existing) {
      existing.rate += f.rateBps || 0;
      existing.count += 1;
      if ((f.rateBps || 0) > (existing.sample.rateBps || 0)) {
        existing.sample = f;
        existing.protocol = f.protocol;
      }
    } else {
      map.set(key, {
        key,
        lat: f.remoteLat,
        lon: f.remoteLon,
        label: city,
        country,
        rate: f.rateBps || 0,
        protocol: f.protocol,
        sample: f,
        count: 1,
      });
    }
  }

  return [...map.values()]
    .sort((a, b) => b.rate - a.rate)
    .slice(0, MAX_ARCS);
}

export function WorldMapCanvas({ width, height }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const landRef = useRef<FC | null>(null);
  const [landReady, setLandReady] = useState(false);
  const phaseRef = useRef(0);
  const animRef = useRef(0);
  const viewRef = useRef<MapView>({ ...DEFAULT_VIEW });
  const [view, setView] = useState<MapView>({ ...DEFAULT_VIEW });
  const dragRef = useRef<{
    active: boolean;
    x: number;
    y: number;
    view: MapView;
  } | null>(null);

  const [hover, setHover] = useState<{
    cluster: ReturnType<typeof clusterFlows>[0];
    x: number;
    y: number;
  } | null>(null);

  const home = useHome();
  const flows = useVisibleFlows();
  const setSelectedId = useFlowStore((s) => s.setSelectedId);
  const selectedId = useFlowStore((s) => s.selectedId);

  const clusters = useMemo(() => clusterFlows(flows), [flows]);

  // Keep ref in sync for paint loop without restarting rAF every pan frame
  useEffect(() => {
    viewRef.current = view;
  }, [view]);

  useEffect(() => {
    let cancelled = false;
    fetch("/geo/ne_110m_land.geojson")
      .then((r) => {
        if (!r.ok) throw new Error(String(r.status));
        return r.json();
      })
      .then((j) => {
        if (!cancelled) {
          landRef.current = j as FC;
          setLandReady(true);
        }
      })
      .catch(() => {
        fetch("/geo/ne-110m-land.json")
          .then((r) => r.json())
          .then((j) => {
            if (!cancelled) {
              landRef.current = j as FC;
              setLandReady(true);
            }
          })
          .catch(() => {
            if (!cancelled) setLandReady(true);
          });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Center on home once when we know it
  const didCenter = useRef(false);
  useEffect(() => {
    if (didCenter.current) return;
    if (home.label && home.label !== "Home") {
      didCenter.current = true;
      setView((v) =>
        clampView({ ...v, centerLon: home.lon, centerLat: home.lat, scale: 1.35 })
      );
    }
  }, [home.label, home.lon, home.lat]);

  const paint = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || width < 2 || height < 2) return;
    const v = viewRef.current;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const bw = Math.floor(width * dpr);
    const bh = Math.floor(height * dpr);
    if (canvas.width !== bw || canvas.height !== bh) {
      canvas.width = bw;
      canvas.height = bh;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
    }

    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    drawBaseMap(ctx, landRef.current, width, height, v);

    const maxRate = Math.max(1, ...clusters.map((c) => c.rate));
    const phase = phaseRef.current;
    const homePt = project(home.lon, home.lat, width, height, PAD, v);

    for (const c of clusters) {
      const intensity = Math.min(1, c.rate / maxRate);
      const isUdp = c.protocol === "UDP";
      const selected = c.sample.id === selectedId;
      const color = isUdp
        ? intensity > 0.4
          ? ICE
          : ICE_DIM
        : intensity > 0.4
          ? AMBER
          : AMBER_DIM;

      const pts = flightArcPoints(
        home.lon,
        home.lat,
        c.lon,
        c.lat,
        width,
        height,
        PAD,
        v,
        48
      );

      ctx.save();
      ctx.beginPath();
      ctx.moveTo(pts[0].x, pts[0].y);
      for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
      ctx.strokeStyle = color;
      ctx.lineWidth = selected ? 2 : 1 + intensity * 1.2;
      ctx.globalAlpha = selected ? 0.95 : 0.4 + intensity * 0.45;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.setLineDash([7, 10]);
      ctx.lineDashOffset = -phase * (14 + intensity * 20);
      ctx.stroke();
      ctx.restore();

      const ti = Math.floor(((phase * 0.35 + intensity) % 1) * (pts.length - 1));
      const particle = pts[ti];
      if (particle) {
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, selected ? 2.5 : 1.6, 0, Math.PI * 2);
        ctx.fillStyle = isUdp ? ICE : AMBER;
        ctx.globalAlpha = 0.9;
        ctx.fill();
        ctx.globalAlpha = 1;
      }
    }

    for (const c of clusters) {
      const p = project(c.lon, c.lat, width, height, PAD, v);
      // skip if far off-screen
      if (p.x < -40 || p.y < -40 || p.x > width + 40 || p.y > height + 40) continue;

      const intensity = Math.min(1, c.rate / maxRate);
      const isUdp = c.protocol === "UDP";
      const color = isUdp ? ICE : AMBER;
      const selected = c.sample.id === selectedId;
      const pulse = 0.55 + 0.45 * Math.sin(phase * 2.8 + c.lon * 0.1);

      ctx.beginPath();
      ctx.arc(p.x, p.y, 4 + intensity * 4 + pulse * 2.5, 0, Math.PI * 2);
      ctx.strokeStyle = color;
      ctx.globalAlpha = 0.2 + pulse * 0.2;
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.globalAlpha = 1;
      ctx.beginPath();
      ctx.arc(p.x, p.y, selected ? 3.5 : 2.4, 0, Math.PI * 2);
      ctx.fillStyle = selected ? "#ffffff" : color;
      ctx.fill();
      ctx.strokeStyle = OCEAN;
      ctx.lineWidth = 1;
      ctx.stroke();

      if (intensity > 0.3 || selected || v.scale >= 2) {
        const app = friendlyProcessName(
          c.sample.processName,
          c.sample.pid
        );
        const label =
          c.count > 1 ? `${c.label} · ${app}` : `${c.label}`;
        ctx.font = "500 10px 'IBM Plex Mono', monospace";
        ctx.fillStyle = "rgba(232, 230, 227, 0.78)";
        ctx.textAlign = "left";
        ctx.textBaseline = "middle";
        ctx.fillText(label, p.x + 7, p.y);
      }
    }

    const breath = 1 + Math.sin(phase * 2) * 0.12;
    ctx.save();
    ctx.translate(homePt.x, homePt.y);
    ctx.scale(breath, breath);
    ctx.strokeStyle = AMBER;
    ctx.globalAlpha = 0.35;
    ctx.lineWidth = 1.5;
    ctx.strokeRect(-8, -8, 16, 16);
    ctx.globalAlpha = 1;
    ctx.fillStyle = AMBER;
    ctx.fillRect(-4, -4, 8, 8);
    ctx.strokeStyle = OCEAN;
    ctx.lineWidth = 1;
    ctx.strokeRect(-4, -4, 8, 8);
    ctx.restore();

    ctx.font = "500 10px 'IBM Plex Mono', monospace";
    ctx.fillStyle = "rgba(240, 162, 2, 0.85)";
    ctx.textAlign = "left";
    ctx.fillText("YOU", homePt.x + 10, homePt.y - 1);

    ctx.strokeStyle = "#2a2e34";
    ctx.lineWidth = 1;
    ctx.strokeRect(0.5, 0.5, width - 1, height - 1);
  }, [clusters, home.lat, home.lon, selectedId, width, height, landReady]);

  useEffect(() => {
    let alive = true;
    const loop = () => {
      if (!alive) return;
      phaseRef.current += 0.018;
      paint();
      animRef.current = requestAnimationFrame(loop);
    };
    animRef.current = requestAnimationFrame(loop);
    return () => {
      alive = false;
      cancelAnimationFrame(animRef.current);
    };
  }, [paint]);

  // Zoom toward cursor
  const onWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    const before = unproject(mx, my, width, height, PAD, view);

    const factor = e.deltaY > 0 ? 0.88 : 1.14;
    const nextScale = Math.min(12, Math.max(1, view.scale * factor));

    // zoom around cursor: keep geo under cursor stable
    let next: MapView = clampView({
      ...view,
      scale: nextScale,
      centerLon: before.lon,
      centerLat: before.lat,
    });
    // after centering on cursor point, nudge so cursor still maps to same geo
    const after = project(before.lon, before.lat, width, height, PAD, next);
    const dx = mx - after.x;
    const dy = my - after.y;
    // convert pixel delta to geo at new scale roughly
    const mid = unproject(width / 2 - dx, height / 2 - dy, width, height, PAD, next);
    next = clampView({
      scale: nextScale,
      centerLon: mid.lon,
      centerLat: mid.lat,
    });
    setView(next);
  };

  const onPointerDown = (e: React.PointerEvent) => {
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    dragRef.current = {
      active: true,
      x: e.clientX,
      y: e.clientY,
      view: { ...view },
    };
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (dragRef.current?.active) {
      const dx = e.clientX - dragRef.current.x;
      const dy = e.clientY - dragRef.current.y;
      const start = dragRef.current.view;
      // pan: move center opposite to drag, scaled by zoom
      const w = width - PAD * 2;
      const h = height - PAD * 2;
      const dLon = -(dx / (w * start.scale)) * 360;
      const dLat = (dy / (h * start.scale)) * 180;
      setView(
        clampView({
          scale: start.scale,
          centerLon: start.centerLon + dLon,
          centerLat: start.centerLat + dLat,
        })
      );
      return;
    }

    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    let best: {
      cluster: (typeof clusters)[0];
      dist: number;
      x: number;
      y: number;
    } | null = null;
    for (const c of clusters) {
      const p = project(c.lon, c.lat, width, height, PAD, view);
      const d = Math.hypot(p.x - x, p.y - y);
      if (d < 16 && (!best || d < best.dist)) {
        best = { cluster: c, dist: d, x: p.x, y: p.y };
      }
    }
    if (best) setHover({ cluster: best.cluster, x: best.x, y: best.y });
    else setHover(null);
  };

  const onPointerUp = (e: React.PointerEvent) => {
    const wasDrag = dragRef.current;
    dragRef.current = null;
    if (!wasDrag) return;
    const moved =
      Math.hypot(e.clientX - wasDrag.x, e.clientY - wasDrag.y) > 4;
    if (!moved) {
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      for (const c of clusters) {
        const p = project(c.lon, c.lat, width, height, PAD, view);
        if (Math.hypot(p.x - x, p.y - y) < 16) {
          setSelectedId(c.sample.id);
          break;
        }
      }
    }
  };

  const zoomBy = (factor: number) => {
    setView((v) =>
      clampView({
        ...v,
        scale: v.scale * factor,
      })
    );
  };

  const resetView = () => {
    setView(
      clampView({
        scale: 1.35,
        centerLon: home.lon,
        centerLat: home.lat,
      })
    );
  };

  const fitWorld = () => setView({ ...DEFAULT_VIEW });

  return (
    <div style={{ width, height, position: "relative" }}>
      <canvas
        ref={canvasRef}
        style={{
          width,
          height,
          display: "block",
          cursor: dragRef.current?.active ? "grabbing" : hover ? "pointer" : "grab",
          touchAction: "none",
        }}
        onWheel={onWheel}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={() => {
          dragRef.current = null;
        }}
      />

      <div className="map-zoom-controls">
        <button type="button" title="Zoom in" onClick={() => zoomBy(1.25)}>
          +
        </button>
        <button type="button" title="Zoom out" onClick={() => zoomBy(0.8)}>
          −
        </button>
        <button type="button" title="Center on home" onClick={resetView}>
          ⌖
        </button>
        <button type="button" title="Fit world" onClick={fitWorld}>
          ⤢
        </button>
      </div>

      <div className="globe-hud tl">
        <span className="accent">■</span> natural earth · {view.scale.toFixed(1)}×
      </div>
      <div className="globe-hud bl">
        scroll zoom · drag pan · {clusters.length} routes · {home.label}
      </div>
      <div className="globe-hud br">
        <span style={{ color: AMBER }}>■</span> TCP{"  "}
        <span style={{ color: ICE }}>■</span> UDP
      </div>

      {!landReady && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "grid",
            placeItems: "center",
            pointerEvents: "none",
            color: "var(--text-muted)",
            fontFamily: "var(--mono)",
            fontSize: 11,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
          }}
        >
          Loading coastline data…
        </div>
      )}

      {hover && (
        <div
          className="tooltip"
          style={{
            left: Math.min(hover.x + 14, width - 240),
            top: Math.max(10, hover.y - 10),
          }}
        >
          <div className="t-title">
            {friendlyProcessName(
              hover.cluster.sample.processName,
              hover.cluster.sample.pid
            )}
            {hover.cluster.count > 1 ? ` · ${hover.cluster.count} flows` : ""}
          </div>
          <div className="dim">
            {hover.cluster.label}
            {hover.cluster.country ? `, ${hover.cluster.country}` : ""}
          </div>
          <div className="t-meta">
            {hover.cluster.sample.dstIp}:{hover.cluster.sample.dstPort} ·{" "}
            {hover.cluster.protocol}
            {hover.cluster.sample.processName
              ? ` · ${hover.cluster.sample.processName}`
              : ""}
          </div>
          <div className="t-rate">{formatBps(hover.cluster.rate)}</div>
        </div>
      )}
    </div>
  );
}

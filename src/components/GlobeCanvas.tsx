import { useEffect, useMemo, useRef, useState } from "react";
import Globe, { type GlobeMethods } from "react-globe.gl";
import {
  formatBps,
  useHome,
  useVisibleFlows,
  useFlowStore,
} from "../stores/flows";
import type { FlowRecord } from "../types/ipc";

type Arc = {
  id: string;
  startLat: number;
  startLng: number;
  endLat: number;
  endLng: number;
  color: string;
  stroke: number;
  altitude: number;
  flow: FlowRecord;
};

type Point = {
  id: string;
  lat: number;
  lng: number;
  size: number;
  color: string;
  label: string;
};

// Night earth + topology (jsDelivr is more WebView-friendly than unpkg)
const EARTH_NIGHT =
  "https://cdn.jsdelivr.net/npm/three-globe@2.44.0/example/img/earth-night.jpg";
const EARTH_TOPO =
  "https://cdn.jsdelivr.net/npm/three-globe@2.44.0/example/img/earth-topology.png";

type Props = { width: number; height: number };

export function GlobeCanvas({ width, height }: Props) {
  const globeRef = useRef<GlobeMethods | undefined>(undefined);
  const [hover, setHover] = useState<FlowRecord | null>(null);
  const [ready, setReady] = useState(false);
  const [textureOk, setTextureOk] = useState(true);

  const home = useHome();
  const flows = useVisibleFlows();
  const setSelectedId = useFlowStore((s) => s.setSelectedId);
  const selectedId = useFlowStore((s) => s.selectedId);

  // Probe texture availability once
  useEffect(() => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => setTextureOk(true);
    img.onerror = () => setTextureOk(false);
    img.src = EARTH_NIGHT;
  }, []);

  useEffect(() => {
    let cancelled = false;
    let tries = 0;
    const id = window.setInterval(() => {
      if (cancelled) return;
      const g = globeRef.current;
      tries += 1;
      if (!g) {
        if (tries > 60) clearInterval(id);
        return;
      }
      try {
        const controls = g.controls();
        controls.autoRotate = true;
        controls.autoRotateSpeed = 0.35;
        controls.enableZoom = true;
        controls.enableDamping = true;
        g.pointOfView({ lat: home.lat, lng: home.lon, altitude: 2.05 }, 0);

        // Darker globe material when night texture is unavailable
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const mat = (g as any).globeMaterial?.();
        if (mat) {
          if (!textureOk) {
            mat.color?.set?.("#1a1f26");
            mat.emissive?.set?.("#12161c");
            mat.emissiveIntensity = 0.35;
          } else {
            mat.color?.set?.("#ffffff");
          }
        }

        setReady(true);
        clearInterval(id);
      } catch {
        if (tries > 60) clearInterval(id);
      }
    }, 80);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [home.lat, home.lon, textureOk]);

  const maxRate = useMemo(() => {
    if (!flows.length) return 1;
    return Math.max(1, ...flows.map((f) => f.rateBps || 0));
  }, [flows]);

  const arcs: Arc[] = useMemo(
    () =>
      flows
        .filter(
          (f) =>
            typeof f.remoteLat === "number" &&
            typeof f.remoteLon === "number" &&
            Number.isFinite(f.remoteLat) &&
            Number.isFinite(f.remoteLon)
        )
        .map((f) => {
          const intensity = Math.min(1, (f.rateBps || 0) / maxRate);
          // Solid colors — amber TCP, ice UDP (no gradient slop)
          const color =
            f.protocol === "UDP"
              ? intensity > 0.5
                ? "#7eb8da"
                : "#4a7a96"
              : intensity > 0.5
                ? "#f0a202"
                : "#b87a02";
          return {
            id: f.id,
            startLat: home.lat,
            startLng: home.lon,
            endLat: f.remoteLat as number,
            endLng: f.remoteLon as number,
            color,
            stroke: 0.55 + intensity * 1.35,
            altitude: 0.18 + intensity * 0.28,
            flow: f,
          };
        }),
    [flows, home.lat, home.lon, maxRate]
  );

  const points: Point[] = useMemo(() => {
    const dest = arcs.map((a) => ({
      id: a.id,
      lat: a.endLat,
      lng: a.endLng,
      size: 0.28 + Math.min(1, (a.flow.rateBps || 0) / maxRate) * 0.5,
      color: a.id === selectedId ? "#ffffff" : a.color,
      label: `${a.flow.remoteCity || a.flow.dstIp}`,
    }));
    dest.unshift({
      id: "home",
      lat: home.lat,
      lng: home.lon,
      size: 0.85,
      color: "#f0a202",
      label: home.label,
    });
    return dest;
  }, [arcs, home.lat, home.lon, home.label, maxRate, selectedId]);

  const rings = useMemo(
    () =>
      points
        .filter((p) => p.id !== "home")
        .slice(0, 12)
        .map((p) => ({
          lat: p.lat,
          lng: p.lng,
          maxR: 2.2,
          propagationSpeed: 1.4,
          repeatPeriod: 1400,
          color: p.color,
        })),
    [points]
  );

  return (
    <div style={{ width, height, position: "relative" }}>
      <Globe
        ref={globeRef}
        width={width}
        height={height}
        backgroundColor="rgba(0,0,0,0)"
        globeImageUrl={textureOk ? EARTH_NIGHT : undefined}
        bumpImageUrl={textureOk ? EARTH_TOPO : undefined}
        showAtmosphere
        atmosphereColor="#c4a574"
        atmosphereAltitude={0.22}
        // Solid dark fill when texture missing
        {...(!textureOk
          ? {
              globeMaterial: undefined,
            }
          : {})}
        arcsData={arcs}
        arcColor="color"
        arcStroke="stroke"
        arcAltitude="altitude"
        arcDashLength={0.55}
        arcDashGap={0.35}
        arcDashAnimateTime={2200}
        arcsTransitionDuration={350}
        onArcHover={(arc: object | null) => {
          if (!arc) {
            setHover(null);
            try {
              const c = globeRef.current?.controls();
              if (c) c.autoRotate = true;
            } catch {
              /* */
            }
            return;
          }
          setHover((arc as Arc).flow);
          try {
            const c = globeRef.current?.controls();
            if (c) c.autoRotate = false;
          } catch {
            /* */
          }
        }}
        onArcClick={(arc: object) => {
          setSelectedId((arc as Arc).flow.id);
        }}
        pointsData={points}
        pointLat="lat"
        pointLng="lng"
        pointAltitude={0.012}
        pointRadius="size"
        pointColor="color"
        pointsMerge={false}
        pointLabel="label"
        ringsData={rings}
        ringColor={(d: object) => (d as { color: string }).color}
        ringMaxRadius="maxR"
        ringPropagationSpeed="propagationSpeed"
        ringRepeatPeriod="repeatPeriod"
        rendererConfig={{
          antialias: true,
          alpha: true,
          powerPreference: "high-performance",
        }}
      />

      {hover && (
        <div className="tooltip" style={{ left: 14, top: 36 }}>
          <div className="t-title">{hover.processName || "Unknown process"}</div>
          <div className="dim">
            {hover.remoteCity || "—"}, {hover.remoteCountry || "—"}
          </div>
          <div className="t-meta">
            {hover.dstIp}:{hover.dstPort} · {hover.protocol}
          </div>
          <div className="t-rate">{formatBps(hover.rateBps)}</div>
        </div>
      )}

      <div className="globe-hud tl">
        <span className="accent">●</span> surface map
        {!textureOk && " · offline texture"}
      </div>
      <div className="globe-hud bl">
        drag orbit · scroll zoom · {arcs.length} arcs
      </div>
      <div className="globe-hud br">
        <span style={{ color: "#f0a202" }}>■</span> TCP{"  "}
        <span style={{ color: "#7eb8da" }}>■</span> UDP
      </div>

      {!ready && (
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
          Compiling globe…
        </div>
      )}
    </div>
  );
}

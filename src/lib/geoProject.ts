/** Equirectangular projection + map view (zoom/pan) + flight arcs */

export type MapView = {
  /** 1 = full world, higher = zoomed in */
  scale: number;
  centerLon: number;
  centerLat: number;
};

export const DEFAULT_VIEW: MapView = {
  scale: 1,
  centerLon: 0,
  centerLat: 12,
};

export function clampView(v: MapView): MapView {
  return {
    scale: Math.min(12, Math.max(1, v.scale)),
    centerLon: ((((v.centerLon + 180) % 360) + 360) % 360) - 180,
    centerLat: Math.max(-75, Math.min(75, v.centerLat)),
  };
}

/** Project lon/lat → screen with optional zoom/pan view. */
export function project(
  lon: number,
  lat: number,
  width: number,
  height: number,
  pad = 0,
  view: MapView = DEFAULT_VIEW
): { x: number; y: number } {
  const w = width - pad * 2;
  const h = height - pad * 2;
  const la = Math.max(-85, Math.min(85, lat));
  const lo = ((((lon + 180) % 360) + 360) % 360) - 180;

  // base equirectangular in padded content box
  const bx = pad + ((lo + 180) / 360) * w;
  const by = pad + ((90 - la) / 180) * h;

  // view center in base coords
  const cla = Math.max(-85, Math.min(85, view.centerLat));
  const clo = ((((view.centerLon + 180) % 360) + 360) % 360) - 180;
  const cx = pad + ((clo + 180) / 360) * w;
  const cy = pad + ((90 - cla) / 180) * h;

  const s = view.scale;
  return {
    x: (bx - cx) * s + width / 2,
    y: (by - cy) * s + height / 2,
  };
}

/** Inverse: screen → approx lon/lat under current view. */
export function unproject(
  x: number,
  y: number,
  width: number,
  height: number,
  pad = 0,
  view: MapView = DEFAULT_VIEW
): { lon: number; lat: number } {
  const w = width - pad * 2;
  const h = height - pad * 2;
  const s = view.scale || 1;

  const cla = Math.max(-85, Math.min(85, view.centerLat));
  const clo = ((((view.centerLon + 180) % 360) + 360) % 360) - 180;
  const cx = pad + ((clo + 180) / 360) * w;
  const cy = pad + ((90 - cla) / 180) * h;

  const bx = (x - width / 2) / s + cx;
  const by = (y - height / 2) / s + cy;

  const lon = ((bx - pad) / w) * 360 - 180;
  const lat = 90 - ((by - pad) / h) * 180;
  return {
    lon: ((((lon + 180) % 360) + 360) % 360) - 180,
    lat: Math.max(-85, Math.min(85, lat)),
  };
}

export function lonDelta(from: number, to: number): number {
  let d = to - from;
  while (d > 180) d -= 360;
  while (d < -180) d += 360;
  return d;
}

/** Screen-space flight arc under current map view. */
export function flightArcPoints(
  lon1: number,
  lat1: number,
  lon2: number,
  lat2: number,
  width: number,
  height: number,
  pad: number,
  view: MapView,
  samples = 56
): { x: number; y: number }[] {
  const dLon = lonDelta(lon1, lon2);
  const lon2u = lon1 + dLon;

  const a = project(lon1, lat1, width, height, pad, view);
  const b = project(lon2u, lat2, width, height, pad, view);

  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const dist = Math.hypot(dx, dy) || 1;
  const bulge = Math.min(dist * 0.32, height * 0.28, 140 * Math.sqrt(view.scale));

  const mx = (a.x + b.x) / 2;
  const my = (a.y + b.y) / 2;
  let px = -dy / dist;
  let py = dx / dist;
  if (py > 0) {
    px = -px;
    py = -py;
  }
  const cx = mx + px * bulge * 0.15;
  const cy = my - bulge;

  const pts: { x: number; y: number }[] = [];
  for (let i = 0; i <= samples; i++) {
    const t = i / samples;
    const u = 1 - t;
    pts.push({
      x: u * u * a.x + 2 * u * t * cx + t * t * b.x,
      y: u * u * a.y + 2 * u * t * cy + t * t * b.y,
    });
  }
  return pts;
}

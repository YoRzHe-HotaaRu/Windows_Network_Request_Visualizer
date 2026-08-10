/// <reference types="vite/client" />

// Minimal GeoJSON typings for land polygons
declare namespace GeoJSON {
  interface FeatureCollection {
    type: "FeatureCollection";
    features: Feature[];
  }
  interface Feature {
    type: "Feature";
    properties?: Record<string, unknown> | null;
    geometry: Geometry | null;
  }
  type Geometry =
    | { type: "Polygon"; coordinates: number[][][] }
    | { type: "MultiPolygon"; coordinates: number[][][][] };
}


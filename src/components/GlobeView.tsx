import { useEffect, useRef, useState } from "react";
import { ErrorBoundary } from "./ErrorBoundary";
import { WorldMapCanvas } from "./WorldMapCanvas";

/**
 * Center surface: Canvas 2D world map (reliable in WebView2).
 * react-globe.gl / dual Three versions were rendering a black void.
 */
export function GlobeView() {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;

    const measure = () => {
      const w = Math.floor(el.clientWidth);
      const h = Math.floor(el.clientHeight);
      if (w < 2 || h < 2) return;
      setSize((prev) => (prev.w === w && prev.h === h ? prev : { w, h }));
    };

    measure();
    const ro = new ResizeObserver(() => requestAnimationFrame(measure));
    ro.observe(el);
    const t1 = window.setTimeout(measure, 40);
    const t2 = window.setTimeout(measure, 200);
    return () => {
      ro.disconnect();
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, []);

  return (
    <div className="globe-wrap" ref={wrapRef} style={{ minHeight: 280 }}>
      {size.w < 2 || size.h < 2 ? (
        <div
          style={{
            height: "100%",
            display: "grid",
            placeItems: "center",
            color: "var(--text-muted)",
            fontFamily: "var(--mono)",
            fontSize: 11,
            letterSpacing: "0.14em",
            textTransform: "uppercase",
          }}
        >
          Preparing map…
        </div>
      ) : (
        <ErrorBoundary fallbackTitle="Map surface error">
          <WorldMapCanvas width={size.w} height={size.h} />
        </ErrorBoundary>
      )}
    </div>
  );
}

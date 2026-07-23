"use client";

/**
 * Zero-dependency world map for the Geography page.
 *
 * Equirectangular projection: x = (lon+180)/360·W, y = (90−lat)/180·H over
 * the simplified land outline in worldOutline.ts. Visitor points are plotted
 * as sqrt-scaled bubbles (bubble area ∝ visitors), doubling as the location
 * heatmap. Load via next/dynamic({ ssr: false }) — the outline data should
 * never enter public-page bundles.
 */

import { useState } from "react";
import { WORLD_PATH, WORLD_VIEWBOX } from "./worldOutline";
import { CHART } from "./charts";

export interface MapPoint {
  lat: number;
  lon: number;
  visitors: number;
}

const W = 1000;
const H = 500;

export default function WorldMap({ points }: { points: MapPoint[] }) {
  const [hover, setHover] = useState<MapPoint | null>(null);

  const max = Math.max(1, ...points.map((p) => p.visitors));
  const radius = (v: number) => 3 + Math.sqrt(v / max) * 14;

  return (
    <div className="relative">
      <svg
        viewBox={WORLD_VIEWBOX}
        className="w-full h-auto"
        role="img"
        aria-label="World map of visitor locations"
      >
        <path d={WORLD_PATH} fill="#26261f" stroke="#3a3a30" strokeWidth={0.6} />
        {points.map((p, i) => {
          const x = ((p.lon + 180) / 360) * W;
          const y = ((90 - p.lat) / 180) * H;
          return (
            <circle
              key={i}
              cx={x}
              cy={y}
              r={radius(p.visitors)}
              fill={CHART.accent}
              fillOpacity={0.35}
              stroke={CHART.accent}
              strokeWidth={0.8}
              onMouseEnter={() => setHover(p)}
              onMouseLeave={() => setHover(null)}
            >
              <title>{`${p.visitors} visitor${p.visitors === 1 ? "" : "s"} @ ${p.lat}, ${p.lon}`}</title>
            </circle>
          );
        })}
      </svg>
      <div className="absolute bottom-1 left-2 font-mono text-[10px] text-[var(--text-3)]">
        {hover
          ? `${hover.visitors} visitor${hover.visitors === 1 ? "" : "s"} @ ${hover.lat}, ${hover.lon}`
          : `${points.length} location${points.length === 1 ? "" : "s"}`}
      </div>
    </div>
  );
}

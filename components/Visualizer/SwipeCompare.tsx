"use client";

import React, { useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";

const MapDeck = dynamic(() => import("./MapDeck"), { ssr: false });

export default function SwipeCompare({
  baseline,
  scenario,
  year,
  locations = {},
  toggles = { heatmap: true, facilities: true, flows: true, serviceRings: true, cog: true },
}: {
  baseline: any;
  scenario: any;
  year: number | null;
  locations?: Record<string, { lat: number; lng: number }>;
  toggles?: {
    heatmap?: boolean;
    facilities?: boolean;
    flows?: boolean;
    serviceRings?: boolean;
    cog?: boolean;
  };
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState(50); // percent split

  const clip = useMemo(() => `inset(0 ${100 - pos}% 0 0)`, [pos]);

  return (
    <div className="relative w-full h-[70vh] rounded-2xl overflow-hidden border">
      {/* Baseline (bottom) */}
      <div className="absolute inset-0">
        <MapDeck
          scenario={baseline}
          baseline={baseline}
          year={year}
          locations={locations}
          toggles={toggles}
        />
      </div>

      {/* Selected (top, clipped) */}
      <div className="absolute inset-0" style={{ clipPath: clip }}>
        <MapDeck
          scenario={scenario}
          baseline={baseline}
          year={year}
          locations={locations}
          toggles={toggles}
        />
      </div>

      {/* Handle + Slider */}
      <div
        className="absolute top-0 h-full"
        style={{ left: `${pos}%`, transform: "translateX(-50%)" }}
      >
        <div className="h-full w-1 bg-black/40" />
        <div className="absolute top-1/2 -translate-y-1/2 -left-3 right-0 flex justify-center">
          <div className="rounded-full bg-white shadow px-2 py-1 text-[10px] border">
            {pos}% Selected
          </div>
        </div>
      </div>

      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-white/90 backdrop-blur rounded-full border px-4 py-1 shadow flex items-center gap-2">
        <span className="text-xs text-gray-600">Baseline</span>
        <input
          type="range"
          min={0}
          max={100}
          value={pos}
          onChange={(e) => setPos(Number(e.target.value))}
          className="w-64"
        />
        <span className="text-xs text-gray-600">Selected</span>
      </div>
    </div>
  );
}

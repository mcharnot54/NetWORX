"use client";

import React, { useMemo } from "react";
import DeckGL from "@deck.gl/react";
import { Map } from "react-map-gl/maplibre";
import {
  ScatterplotLayer,
  GeoJsonLayer,
  TextLayer,
} from "@deck.gl/layers";

type LatLng = { lat: number; lng: number };
type LocationsIndex = Record<string, LatLng>;

const BASE_STYLE = "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json";

export default function SimpleMapDeck({
  scenario,
  baseline,
  year,
  locations = {},
  toggles = {
    heatmap: false, // Disabled for now
    facilities: true,
    flows: false, // Disabled for now
    serviceRings: true,
    cog: false, // Disabled for now
  },
}: {
  scenario: any;
  baseline?: any;
  year: number | null;
  locations?: LocationsIndex;
  toggles?: {
    heatmap?: boolean;
    facilities?: boolean;
    flows?: boolean;
    serviceRings?: boolean;
    cog?: boolean;
  };
}) {
  const initial = useMemo(
    () => ({ longitude: -96.9, latitude: 37.6, zoom: 3.5, bearing: 0, pitch: 0 }),
    []
  );

  // Normalize the selected year slice from transport results
  const yr = useMemo(() => {
    if (!scenario?.transport?.perYear || year == null) return null;
    return scenario.transport.perYear.find((y: any) => y.year === year) || null;
  }, [scenario, year]);

  const yrBaseline = useMemo(() => {
    if (!baseline?.transport?.perYear || year == null) return null;
    return baseline.transport.perYear.find((y: any) => y.year === year) || null;
  }, [baseline, year]);

  const data = useMemo(() => {
    if (!yr) return null;

    // Helpers
    const coord = (name: string) => locations[name] ?? null;

    // Facilities (selected vs baseline overlay)
    const selectedOpen = new Set<string>(
      yr.open_facilities || yr.transport?.open_facilities || []
    );
    const baselineOpen = new Set<string>(
      yrBaseline?.open_facilities || yrBaseline?.transport?.open_facilities || []
    );

    const names = new Set<string>([
      ...Array.from(selectedOpen),
      ...Array.from(baselineOpen),
    ]);

    const facilities = Array.from(names)
      .map((name) => {
        const c = coord(name);
        if (!c) return null;
        const type = selectedOpen.has(name) ? "selected" : "baseline";
        return { name, ...c, type, open: true };
      })
      .filter(Boolean) as Array<LatLng & { name: string; type: string; open: boolean }>;

    // Service rings for each facility (geodesic)
    const servicePolys: any[] = [];
    const serviceMiles = [250, 500, 750];
    for (const f of facilities) {
      for (const r of serviceMiles) {
        servicePolys.push({
          type: "Feature",
          properties: { facility: f.name, radius: r },
          geometry: milesCircle([f.lng, f.lat], r),
        });
      }
    }

    return { facilities, servicePolys };
  }, [yr, yrBaseline, locations]);

  if (!data) {
    return (
      <div className="h-full w-full grid place-items-center text-sm text-gray-600">
        Select a scenario & year to view the map.
      </div>
    );
  }

  const layers: any[] = [];

  // Facilities (selected vs baseline) + labels
  if (toggles.facilities && data.facilities?.length) {
    layers.push(
      new ScatterplotLayer({
        id: "facilities",
        data: data.facilities,
        getPosition: (d: any) => [d.lng, d.lat],
        getRadius: (d: any) => (d.open ? 10 : 7) * 1000,
        radiusUnits: "meters",
        pickable: true,
        stroked: true,
        lineWidthMinPixels: 2,
        getFillColor: (d: any) =>
          d.type === "selected"
            ? [0, 122, 255, 200]
            : [0, 200, 0, 180],
        getLineColor: (_: any) => [255, 255, 255, 220],
      })
    );

    layers.push(
      new TextLayer({
        id: "fac-labels",
        data: data.facilities,
        getPosition: (d: any) => [d.lng, d.lat],
        getText: (d: any) => d.name,
        getSize: 12,
        getColor: [40, 40, 40, 220],
        background: true,
        getBackgroundColor: [255, 255, 255, 200],
        backgroundPadding: [3, 2],
        billboard: true,
      })
    );
  }

  // Service rings (geodesic circles)
  if (toggles.serviceRings && data.servicePolys?.length) {
    layers.push(
      new GeoJsonLayer({
        id: "service",
        data: {
          type: "FeatureCollection",
          features: data.servicePolys,
        },
        stroked: true,
        filled: false,
        getLineColor: [100, 100, 100, 120],
        getLineWidth: 1,
      })
    );
  }

  return (
    <DeckGL initialViewState={initial} controller={true} layers={layers}>
      <Map
        reuseMaps
        attributionControl={true}
        mapStyle={BASE_STYLE}
      />
    </DeckGL>
  );
}

// Great-circle (geodesic) circle polygon by radius (miles), centered at [lng, lat]
function milesCircle([lng, lat]: [number, number], miles: number) {
  const R = 3958.8; // Earth radius in miles
  const rad = Math.PI / 180;
  const deg = 180 / Math.PI;
  const d = miles / R; // angular distance
  const φ1 = lat * rad;
  const λ1 = lng * rad;
  const steps = 64; // Reduced for performance
  const coords: [number, number][] = [];
  for (let i = 0; i <= steps; i++) {
    const θ = (2 * Math.PI * i) / steps;
    const φ2 =
      Math.asin(
        Math.sin(φ1) * Math.cos(d) +
          Math.cos(φ1) * Math.sin(d) * Math.cos(θ)
      );
    const λ2 =
      λ1 +
      Math.atan2(
        Math.sin(θ) * Math.sin(d) * Math.cos(φ1),
        Math.cos(d) - Math.sin(φ1) * Math.sin(φ2)
      );
    coords.push([λ2 * deg, φ2 * deg]);
  }
  return { type: "Polygon", coordinates: [coords] } as const;
}

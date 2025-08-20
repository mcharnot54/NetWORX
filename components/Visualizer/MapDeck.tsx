"use client";

import React, { useMemo } from "react";
import DeckGL from "@deck.gl/react";
import { Map } from "react-map-gl/maplibre";
import {
  HeatmapLayer,
  ArcLayer,
  ScatterplotLayer,
  GeoJsonLayer,
  TextLayer,
} from "@deck.gl/layers";

type LatLng = { lat: number; lng: number };
type LocationsIndex = Record<string, LatLng>;

const BASE_STYLE = "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json";

export default function MapDeck({
  scenario,
  baseline,
  year,
  locations = {},
  toggles = {
    heatmap: true,
    facilities: true,
    flows: true,
    serviceRings: true,
    cog: true,
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

    // Assignments for flows + heat
    const assignments = yr.assignments || yr.transport?.assignments || [];
    const destPoints: any[] = [];
    const flows: any[] = [];

    for (const a of assignments) {
      const o = coord(a.Facility);
      const d = coord(a.Destination);
      const w = Number(a.Demand ?? 0);

      if (d && Number.isFinite(w) && w > 0) {
        destPoints.push({ ...d, weight: w });
      }
      if (o && d && Number.isFinite(w) && w > 0) {
        flows.push({ o, d, units: w });
      }
    }

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

    return { destPoints, flows, facilities, servicePolys, assignments };
  }, [yr, yrBaseline, locations]);

  // Centers of gravity (baseline vs selected)
  const cogs = useMemo(() => {
    if (!data) return null;
    const selected = cogFromAssignments(data.assignments || [], locations);
    const baseAssigns = yrBaseline?.assignments || yrBaseline?.transport?.assignments || [];
    const baselineCOG = cogFromAssignments(baseAssigns, locations);
    return { selected, baseline: baselineCOG };
  }, [data, yrBaseline, locations]);

  if (!data) {
    return (
      <div className="h-full w-full grid place-items-center text-sm text-gray-600">
        Select a scenario & year to view the map.
      </div>
    );
  }

  const layers: any[] = [];

  // 1) Heatmap of destinations (weighted by demand)
  if (toggles.heatmap && data.destPoints?.length) {
    layers.push(
      new HeatmapLayer({
        id: "heatmap",
        data: data.destPoints,
        getPosition: (d: any) => [d.lng, d.lat],
        getWeight: (d: any) => d.weight,
        radiusPixels: 90,
        intensity: 1.0,
        threshold: 0.05,
      })
    );
  }

  // 2) Facilities (selected vs baseline) + labels
  if (toggles.facilities && data.facilities?.length) {
    layers.push(
      new ScatterplotLayer({
        id: "facilities",
        data: data.facilities,
        getPosition: (d: any) => [d.lng, d.lat],
        getRadius: (d: any) => (d.open ? 7 : 5) * 1000,
        radiusUnits: "meters",
        pickable: true,
        stroked: true,
        lineWidthMinPixels: 1,
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
        getSize: 10,
        getColor: [40, 40, 40, 220],
        background: true,
        getBackgroundColor: [255, 255, 255, 200],
        backgroundPadding: [2, 2],
        billboard: true,
      })
    );
  }

  // 3) Flows (arcs) weighted by demand
  if (toggles.flows && data.flows?.length) {
    layers.push(
      new ArcLayer({
        id: "flows",
        data: data.flows,
        getSourcePosition: (d: any) => [d.o.lng, d.o.lat],
        getTargetPosition: (d: any) => [d.d.lng, d.d.lat],
        getWidth: (d: any) => Math.max(1, Math.log10(d.units + 1)),
        getSourceColor: [0, 122, 255],
        getTargetColor: [0, 0, 0],
        greatCircle: true,
      })
    );
  }

  // 4) Service rings (geodesic circles)
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
        getLineColor: [0, 0, 0, 80],
        getLineWidth: 1,
      })
    );
  }

  // 5) Centers of gravity (+ shift line)
  if (toggles.cog && cogs) {
    if (cogs.baseline) {
      layers.push(
        new ScatterplotLayer({
          id: "cog-base",
          data: [cogs.baseline],
          getPosition: (d: any) => [d.lng, d.lat],
          getRadius: 7000,
          radiusUnits: "meters",
          getFillColor: [0, 200, 0, 220],
        })
      );
    }
    if (cogs.selected) {
      layers.push(
        new ScatterplotLayer({
          id: "cog-selected",
          data: [cogs.selected],
          getPosition: (d: any) => [d.lng, d.lat],
          getRadius: 7000,
          radiusUnits: "meters",
          getFillColor: [0, 122, 255, 220],
        })
      );
    }
    if (cogs.baseline && cogs.selected) {
      layers.push(
        new GeoJsonLayer({
          id: "cog-shift",
          data: {
            type: "Feature",
            geometry: {
              type: "LineString",
              coordinates: [
                [cogs.baseline.lng, cogs.baseline.lat],
                [cogs.selected.lng, cogs.selected.lat],
              ],
            },
          },
          getLineColor: [255, 140, 0],
          getLineWidth: 2,
        })
      );
    }
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

/** ===== Helpers (keep here or move to /lib/geo.ts) ===== **/

// Great-circle (geodesic) circle polygon by radius (miles), centered at [lng, lat]
function milesCircle([lng, lat]: [number, number], miles: number) {
  const R = 3958.8; // Earth radius in miles
  const rad = Math.PI / 180;
  const deg = 180 / Math.PI;
  const d = miles / R; // angular distance
  const φ1 = lat * rad;
  const λ1 = lng * rad;
  const steps = 128;
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

// Demand-weighted center of gravity (spherical approximation)
function cogFromAssignments(assigns: any[], locations: LocationsIndex) {
  if (!assigns?.length) return null;

  const toXYZ = (lat: number, lng: number, w: number) => {
    const rad = Math.PI / 180;
    const φ = lat * rad;
    const λ = lng * rad;
    return { x: Math.cos(φ) * Math.cos(λ) * w, y: Math.cos(φ) * Math.sin(λ) * w, z: Math.sin(φ) * w };
  };
  const toLatLng = (x: number, y: number, z: number) => {
    const hyp = Math.sqrt(x * x + y * y);
    const lat = Math.atan2(z, hyp) * (180 / Math.PI);
    const lng = Math.atan2(y, x) * (180 / Math.PI);
    return { lat, lng };
  };

  let sx = 0,
    sy = 0,
    sz = 0,
    sw = 0;

  for (const a of assigns) {
    const w = Number(a.Demand ?? 0);
    if (!Number.isFinite(w) || w <= 0) continue;
    const dest = locations[a.Destination];
    if (!dest) continue;
    const { x, y, z } = toXYZ(dest.lat, dest.lng, w);
    sx += x;
    sy += y;
    sz += z;
    sw += w;
  }
  if (sw <= 0) return null;
  const { lat, lng } = toLatLng(sx, sy, sz);
  return { lat, lng };
}

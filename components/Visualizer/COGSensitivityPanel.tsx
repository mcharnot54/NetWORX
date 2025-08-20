"use client";

import React, { useMemo, useState } from "react";
import DeckGL from "@deck.gl/react";
import { Map } from "react-map-gl/maplibre";
import { ScatterplotLayer } from "@deck.gl/layers";
import { HeatmapLayer } from "@deck.gl/aggregation-layers";
import { buildCOGSensitivity } from "@/lib/visualizer/sensitivity";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";

const BASE_STYLE = "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json";

export default function COGSensitivityPanel({
  scenario,
  year,
  locations,
  defaultCostPerMile = 2.5,
}: {
  scenario: any;
  year: number | null;
  locations: Record<string, { lat: number; lng: number }>;
  defaultCostPerMile?: number;
}) {
  const [metric, setMetric] = useState<"distance" | "time">("distance");
  const [avgSpeedMph, setAvgSpeedMph] = useState<number>(45);
  const [penaltyPerHour, setPenaltyPerHour] = useState<number>(0); // $/hr
  const [gridLatSteps, setGridLatSteps] = useState<number>(44);
  const [gridLngSteps, setGridLngSteps] = useState<number>(70);

  const initial = { longitude: -96.9, latitude: 37.6, zoom: 3.5, bearing: 0, pitch: 0 };

  const yr = useMemo(() => {
    if (!scenario?.transport?.perYear || year == null) return null;
    return scenario.transport.perYear.find((y: any) => y.year === year) || null;
  }, [scenario, year]);

  const result = useMemo(() => {
    if (!yr) return { points: [], top: [] as { lat: number; lng: number; score: number }[] };
    const openFacilities: string[] = yr.open_facilities || [];
    const assignments = yr.assignments || [];
    return buildCOGSensitivity({
      assignments,
      openFacilities,
      locations,
      costPerMile: defaultCostPerMile,
      metric,
      avgSpeedMph,
      penaltyPerHour,
      gridLatSteps,
      gridLngSteps,
    });
  }, [yr, locations, defaultCostPerMile, metric, avgSpeedMph, penaltyPerHour, gridLatSteps, gridLngSteps]);

  const layers: any[] = [];
  if (result.points.length) {
    layers.push(
      new HeatmapLayer({
        id: "cog-sensitivity",
        data: result.points,
        getPosition: (d: any) => [d.lng, d.lat],
        getWeight: (d: any) => d.score, // $ savings weight
        radiusPixels: 80,
        intensity: 1.0,
        threshold: 0.01,
      })
    );
  }
  // show current open facilities for context
  const facs = (yr?.open_facilities || [])
    .map((name: string) => ({ name, ...locations[name] }))
    .filter((p: any) => p && Number.isFinite(p.lat) && Number.isFinite(p.lng));
  layers.push(
    new ScatterplotLayer({
      id: "sens-facilities",
      data: facs,
      getPosition: (d: any) => [d.lng, d.lat],
      getRadius: 6000,
      radiusUnits: "meters",
      getFillColor: [0, 122, 255, 220],
      stroked: true,
      getLineColor: [255, 255, 255, 220],
      lineWidthMinPixels: 1,
    })
  );

  return (
    <div className="grid lg:grid-cols-[360px,1fr] gap-4 items-start">
      <Card className="sticky top-4 self-start">
        <CardHeader><CardTitle className="text-base">Sensitivity Settings</CardTitle></CardHeader>
        <CardContent className="grid gap-3 text-sm">
          <div className="grid gap-1">
            <Label>Metric</Label>
            <Select value={metric} onValueChange={(v) => setMetric(v as any)}>
              <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="distance">Distance only</SelectItem>
                <SelectItem value="time">Time (adds $/hour penalty)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {metric === "time" && (
            <>
              <div className="grid gap-1">
                <Label>Average speed (mph)</Label>
                <Input type="number" value={avgSpeedMph} onChange={(e) => setAvgSpeedMph(Number(e.target.value))} />
              </div>
              <div className="grid gap-1">
                <Label>Penalty ($/hour)</Label>
                <Input type="number" value={penaltyPerHour} onChange={(e) => setPenaltyPerHour(Number(e.target.value))} />
              </div>
            </>
          )}
          <div className="grid gap-1">
            <Label>Grid resolution (lat × lng)</Label>
            <div className="flex items-center gap-2">
              <Input type="number" value={gridLatSteps} onChange={(e) => setGridLatSteps(Number(e.target.value))} className="w-24" />
              <span>×</span>
              <Input type="number" value={gridLngSteps} onChange={(e) => setGridLngSteps(Number(e.target.value))} className="w-24" />
            </div>
          </div>
          <div className="text-xs text-gray-500">
            Tip: Higher resolution finds sharper hot spots but increases compute time.
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4">
        <Card className="overflow-hidden">
          <CardHeader><CardTitle>COG Sensitivity Heatmap</CardTitle></CardHeader>
          <CardContent className="p-0">
            <div className="h-[60vh] w-full">
              <DeckGL initialViewState={{ ...initial }} controller layers={layers}>
                <Map
                  reuseMaps
                  attributionControl
                  mapStyle={BASE_STYLE}
                />
              </DeckGL>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Top Candidate Coordinates (Estimated Annual Savings)</CardTitle></CardHeader>
          <CardContent className="overflow-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-1 px-2">Rank</th>
                  <th className="text-left py-1 px-2">Lat</th>
                  <th className="text-left py-1 px-2">Lng</th>
                  <th className="text-right py-1 px-2">Savings ($/yr)</th>
                </tr>
              </thead>
              <tbody>
                {result.top.map((p, idx) => (
                  <tr key={`${p.lat}-${p.lng}-${idx}`} className="border-b">
                    <td className="py-1 px-2">{idx + 1}</td>
                    <td className="py-1 px-2">{p.lat.toFixed(4)}</td>
                    <td className="py-1 px-2">{p.lng.toFixed(4)}</td>
                    <td className="py-1 px-2 text-right">
                      {Math.round(p.score).toLocaleString()}
                    </td>
                  </tr>
                ))}
                {!result.top.length && (
                  <tr><td colSpan={4} className="py-2 text-center text-gray-500">No candidates produced savings with current settings.</td></tr>
                )}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

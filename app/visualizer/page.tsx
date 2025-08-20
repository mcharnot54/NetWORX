"use client";

import { useEffect, useState } from "react";
import "./maplibre.css";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import dynamic from "next/dynamic";
import ResultsTimeline from "@/components/ResultsTimeline";
import LaneWaterfall, { LaneDelta } from "@/components/Charts/LaneWaterfall";
import { loadSampleData } from "@/lib/sample-data";

const MapDeck = dynamic(() => import("@/components/Visualizer/MapDeck"), { ssr: false });
const SimpleMapDeck = dynamic(() => import("@/components/Visualizer/SimpleMapDeck"), { ssr: false });
const SwipeCompare = dynamic(() => import("@/components/Visualizer/SwipeCompare"), { ssr: false });
const COGSensitivityPanel = dynamic(() => import("@/components/Visualizer/COGSensitivityPanel"), { ssr: false });

export default function VisualizerPage() {
  const [data, setData] = useState<any>(null);
  const [scenarioIndex, setScenarioIndex] = useState(0);
  const [year, setYear] = useState<number | null>(null);
  const [useSwipe, setUseSwipe] = useState(false);
  const [useAdvancedMap, setUseAdvancedMap] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("lastRun");
    if (stored) {
      const parsedData = JSON.parse(stored);
      setData(parsedData);
      
      // Set initial year if available
      if (parsedData?.scenarios?.[0]?.transport?.perYear?.length > 0) {
        setYear(parsedData.scenarios[0].transport.perYear[0].year);
      }
    }
  }, []);

  if (!data) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <div className="p-4 max-w-4xl mx-auto">
          <div className="text-center py-12">
            <div className="text-6xl mb-4">📊</div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">No Results Available</h2>
            <p className="text-gray-600 mb-6">
              Run an optimization to view professional network analysis, maps, and visualizations.
            </p>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-left max-w-md mx-auto">
              <h3 className="font-semibold text-blue-900 mb-2">Expected Data Structure:</h3>
              <ul className="text-sm text-blue-800 space-y-1 mb-4">
                <li>• scenarios[] with transport.perYear data</li>
                <li>• locations{} with lat/lng coordinates</li>
                <li>• KPIs and facility assignments</li>
              </ul>
              <button
                onClick={() => {
                  loadSampleData();
                  window.location.reload();
                }}
                className="w-full bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors text-sm"
              >
                Load Sample Data for Testing
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const scenarios = data.scenarios || [];
  const scenario = scenarios[scenarioIndex];
  const years = scenario?.transport?.perYear?.map((y: any) => y.year) || [];

  // Build lane deltas for waterfall chart
  function lanesFromAssignments(baseYr: any, selYr: any): LaneDelta[] {
    const sumBy = (rows: any[]) => {
      const m: Record<string, number> = {};
      for (const r of rows || []) {
        const key = `${r.Facility} → ${r.Destination}`;
        const cost = (r.Cost ?? 0) * (r.Demand ?? 0);
        m[key] = (m[key] ?? 0) + cost;
      }
      return m;
    };
    const b = sumBy(baseYr?.assignments || []);
    const s = sumBy(selYr?.assignments || []);
    const keys = new Set([...Object.keys(b), ...Object.keys(s)]);
    return Array.from(keys).map((k) => ({ lane: k, baseline: b[k] ?? 0, selected: s[k] ?? 0 }));
  }

  const baseYr = (scenarios[0]?.transport?.perYear || []).find((y:any) => y.year === year);
  const selYr = (scenario?.transport?.perYear || []).find((y:any) => y.year === year);
  const laneDeltas = lanesFromAssignments(baseYr, selYr);

  return (
    <div className="content-area">
      <div className="space-y-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            📊 Network Strategy Visualizer
          </h1>
          <p className="text-lg text-gray-600 max-w-3xl">
            Professional-grade network analysis with interactive maps, COG sensitivity, and timeline visualization.
          </p>
        </div>

        {/* Scenario Controls */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-wrap gap-4 items-center">
              <div className="flex flex-col space-y-2">
                <Label>Scenario</Label>
                <Select onValueChange={(val) => setScenarioIndex(Number(val))} defaultValue="0">
                  <SelectTrigger className="w-[280px]">
                    <SelectValue placeholder="Select scenario" />
                  </SelectTrigger>
                  <SelectContent>
                    {scenarios.map((s: any, idx: number) => (
                      <SelectItem key={idx} value={String(idx)}>
                        {s.nodes} Nodes – ${(s.kpis?.total_network_cost_all_years ?? 0).toLocaleString()}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-col space-y-2">
                <Label>Year</Label>
                <Select onValueChange={(val) => setYear(Number(val))} value={year ? String(year) : ""}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="Year" />
                  </SelectTrigger>
                  <SelectContent>
                    {years.map((y: number) => (
                      <SelectItem key={y} value={String(y)}>
                        {y}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-col space-y-2">
                <Label>Map Features</Label>
                <div className="space-y-1">
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={useAdvancedMap}
                      onChange={(e) => setUseAdvancedMap(e.target.checked)}
                      className="rounded"
                    />
                    Advanced features (heatmap, flows, COG)
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={useSwipe}
                      onChange={(e) => setUseSwipe(e.target.checked)}
                      className="rounded"
                      disabled={!useAdvancedMap}
                    />
                    Swipe compare (requires advanced features)
                  </label>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Total Cost</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900">
                ${(scenario?.kpis?.total_network_cost_all_years ?? 0).toLocaleString()}
              </div>
              <p className="text-xs text-gray-500 mt-1">All years</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Transportation</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">
                ${(scenario?.kpis?.total_transport_cost_all_years ?? 0).toLocaleString()}
              </div>
              <p className="text-xs text-gray-500 mt-1">Transport only</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Service Level</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {((scenario?.kpis?.weighted_service_level ?? 0) * 100).toFixed(1)}%
              </div>
              <p className="text-xs text-gray-500 mt-1">Weighted avg</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Network Nodes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-600">
                {scenario?.nodes ?? 0}
              </div>
              <p className="text-xs text-gray-500 mt-1">Active facilities</p>
            </CardContent>
          </Card>
        </div>

        {/* Main Map */}
        <Card className="overflow-hidden">
          <CardHeader>
            <CardTitle>Network Map</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {useAdvancedMap ? (
              useSwipe ? (
                <SwipeCompare
                  baseline={scenarios[0]}
                  scenario={scenario}
                  year={year}
                  locations={data.locations || {}}
                />
              ) : (
                <div className="h-[40vh] w-full relative overflow-hidden">
                  <MapDeck
                    scenario={scenario}
                    year={year}
                    locations={data.locations || {}}
                    baseline={scenarios[0]}
                  />
                </div>
              )
            ) : (
              <div className="h-[40vh] w-full relative overflow-hidden">
                <SimpleMapDeck
                  scenario={scenario}
                  year={year}
                  locations={data.locations || {}}
                  baseline={scenarios[0]}
                />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Timeline and Lane Analysis Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Facility Timeline</CardTitle>
            </CardHeader>
            <CardContent>
              <ResultsTimeline
                result={scenario?.transport}
                title="Network Open/Expand Timeline"
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Lane Cost Waterfall — {year}</CardTitle>
            </CardHeader>
            <CardContent>
              {laneDeltas.length > 0 ? (
                <LaneWaterfall lanes={laneDeltas} topN={15} currency="$" />
              ) : (
                <div className="h-[300px] flex items-center justify-center text-gray-500">
                  No lane data available for waterfall analysis
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* COG Sensitivity Analysis - Only show if advanced features enabled */}
        {useAdvancedMap && (
          <Card>
            <CardHeader>
              <CardTitle>COG Sensitivity Analysis (What-if new node)</CardTitle>
            </CardHeader>
            <CardContent>
              <COGSensitivityPanel
                scenario={scenario}
                year={year}
                locations={data.locations || {}}
                defaultCostPerMile={data?.config?.transportation?.cost_per_mile ?? 2.5}
              />
            </CardContent>
          </Card>
        )}

        {/* Footer Info */}
        <div className="text-center text-sm text-gray-500 py-4">
          Professional network strategy visualization powered by Deck.gl and advanced analytics.
          <br />
          Data automatically saved to localStorage.lastRun for seamless visualization.
        </div>
      </div>
    </div>
  );
}

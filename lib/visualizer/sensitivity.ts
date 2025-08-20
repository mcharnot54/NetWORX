// /lib/visualizer/sensitivity.ts
export type LatLng = { lat: number; lng: number };
export type LocationsIndex = Record<string, LatLng>;

type Assignment = {
  Facility: string;
  Destination: string;
  Demand: number;
  Cost?: number;
  Distance?: number;
};

export type SensitivityGridPoint = {
  lat: number;
  lng: number;
  score: number; // $ annual savings
};

export type Bounds = { minLat: number; maxLat: number; minLng: number; maxLng: number };

const R_EARTH_MI = 3958.8;
const RAD = Math.PI / 180;

function haversineMiles(a: LatLng, b: LatLng) {
  const dLat = (b.lat - a.lat) * RAD;
  const dLng = (b.lng - a.lng) * RAD;
  const la1 = a.lat * RAD,
    la2 = b.lat * RAD;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(la1) * Math.cos(la2) * Math.sin(dLng / 2) ** 2;
  return 2 * R_EARTH_MI * Math.asin(Math.sqrt(h));
}

function inferBoundsFromPoints(points: LatLng[], pad = 1.0): Bounds {
  if (!points.length)
    return { minLat: 24, maxLat: 49, minLng: -125, maxLng: -66 }; // CONUS fallback
  let minLat = +Infinity,
    maxLat = -Infinity,
    minLng = +Infinity,
    maxLng = -Infinity;
  for (const p of points) {
    minLat = Math.min(minLat, p.lat);
    maxLat = Math.max(maxLat, p.lat);
    minLng = Math.min(minLng, p.lng);
    maxLng = Math.max(maxLng, p.lng);
  }
  const latPad = (maxLat - minLat) * pad * 0.1;
  const lngPad = (maxLng - minLng) * pad * 0.1;
  return {
    minLat: minLat - latPad,
    maxLat: maxLat + latPad,
    minLng: minLng - lngPad,
    maxLng: maxLng + lngPad,
  };
}

export function buildCOGSensitivity({
  assignments,
  openFacilities,
  locations,
  costPerMile = 2.5,
  metric = "distance", // "distance" | "time"
  avgSpeedMph = 45,     // for time metric
  penaltyPerHour = 0,   // $/hour service penalty
  gridLatSteps = 40,
  gridLngSteps = 60,
  bounds,
}: {
  assignments: Assignment[];
  openFacilities: string[];
  locations: LocationsIndex;
  costPerMile?: number;
  metric?: "distance" | "time";
  avgSpeedMph?: number;
  penaltyPerHour?: number;
  gridLatSteps?: number;
  gridLngSteps?: number;
  bounds?: Bounds;
}): { points: SensitivityGridPoint[]; top: SensitivityGridPoint[] } {
  // Cache points
  const destPts: LatLng[] = [];
  const destByName: Record<string, LatLng> = {};
  const facPts: LatLng[] = [];

  for (const a of assignments) {
    const d = locations[a.Destination];
    if (d && !destByName[a.Destination]) {
      destByName[a.Destination] = d;
      destPts.push(d);
    }
  }
  for (const f of openFacilities) {
    const p = locations[f];
    if (p) facPts.push(p);
  }

  const bb = bounds ?? inferBoundsFromPoints([...destPts, ...facPts]);

  // Precompute CURRENT best distances/times for each destination
  const bestDistForDest: Record<string, number> = {};
  const bestTimeForDest: Record<string, number> = {};
  for (const [name, d] of Object.entries(destByName)) {
    let bestDist = Infinity;
    for (const f of facPts) bestDist = Math.min(bestDist, haversineMiles(d, f));
    bestDistForDest[name] = isFinite(bestDist) ? bestDist : Infinity;
    bestTimeForDest[name] = bestDistForDest[name] / Math.max(1, avgSpeedMph); // hours
  }

  const points: SensitivityGridPoint[] = [];
  if (gridLatSteps < 2 || gridLngSteps < 2)
    return { points, top: [] };

  for (let i = 0; i < gridLatSteps; i++) {
    const lat = bb.minLat + (i / (gridLatSteps - 1)) * (bb.maxLat - bb.minLat);
    for (let j = 0; j < gridLngSteps; j++) {
      const lng = bb.minLng + (j / (gridLngSteps - 1)) * (bb.maxLng - bb.minLng);

      let savings = 0;
      for (const a of assignments) {
        const dem = Number(a.Demand ?? 0);
        if (!Number.isFinite(dem) || dem <= 0) continue;
        const dpt = destByName[a.Destination];
        if (!dpt) continue;

        const currentMiles = bestDistForDest[a.Destination];
        const candidateMiles = haversineMiles(dpt, { lat, lng });

        // Transport savings (distance→$)
        const milesSaved = Math.max(0, currentMiles - candidateMiles);
        const transportSavings = milesSaved * dem * costPerMile;

        // Optional service penalty savings (time metric)
        let serviceSavings = 0;
        if (metric === "time" && penaltyPerHour > 0) {
          const currentHrs = bestTimeForDest[a.Destination];
          const candidateHrs = candidateMiles / Math.max(1, avgSpeedMph);
          const hrsSaved = Math.max(0, currentHrs - candidateHrs);
          serviceSavings = hrsSaved * dem * penaltyPerHour;
        }

        savings += transportSavings + serviceSavings;
      }

      if (savings > 0) points.push({ lat, lng, score: savings });
    }
  }

  // Top candidates by score
  const top = [...points].sort((a, b) => b.score - a.score).slice(0, 25);
  return { points, top };
}

import { EVStation, SearchResult, ChargingStop } from '../types';

function toRad(deg: number): number {
  return deg * (Math.PI / 180);
}

export function haversineDistance(
  p1: { latitude: number; longitude: number },
  p2: { latitude: number; longitude: number }
): number {
  const R = 6371;
  const dLat = toRad(p2.latitude - p1.latitude);
  const dLon = toRad(p2.longitude - p1.longitude);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(p1.latitude)) *
    Math.cos(toRad(p2.latitude)) *
    Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export async function geocodeSearch(query: string): Promise<SearchResult[]> {
  try {
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&countrycodes=in&limit=5`;
    const response = await fetch(url, {
      headers: { 'User-Agent': 'ChargeWay-EVApp/1.0' },
    });
    if (!response.ok) return [];
    return await response.json();
  } catch {
    return [];
  }
}

export async function getRoute(
  origin: { latitude: number; longitude: number },
  destination: { latitude: number; longitude: number }
): Promise<{
  distance: number;
  duration: number;
  coordinates: Array<{ latitude: number; longitude: number }>;
} | null> {
  try {
    const url = `https://router.project-osrm.org/route/v1/driving/${origin.longitude},${origin.latitude};${destination.longitude},${destination.latitude}?overview=full&geometries=geojson`;
    const response = await fetch(url);
    if (!response.ok) return null;
    const data = await response.json();
    if (!data.routes || data.routes.length === 0) return null;
    const route = data.routes[0];
    return {
      distance: route.distance / 1000,
      duration: route.duration / 60,
      coordinates: route.geometry.coordinates.map(
        ([lon, lat]: [number, number]) => ({
          latitude: lat,
          longitude: lon,
        })
      ),
    };
  } catch {
    return null;
  }
}



// Helper to find squared distance from point p to line segment vw
function distToSegmentSquared(p: { latitude: number; longitude: number; }, v: { latitude: number; longitude: number; }, w: { latitude: number; longitude: number; }): number {
  const l2 = (v.latitude - w.latitude) ** 2 + (v.longitude - w.longitude) ** 2;
  if (l2 === 0) return (p.latitude - v.latitude) ** 2 + (p.longitude - v.longitude) ** 2;
  let t = ((p.latitude - v.latitude) * (w.latitude - v.latitude) + (p.longitude - v.longitude) * (w.longitude - v.longitude)) / l2;
  t = Math.max(0, Math.min(1, t));
  return (p.latitude - (v.latitude + t * (w.latitude - v.latitude))) ** 2 +
    (p.longitude - (v.longitude + t * (w.longitude - v.longitude))) ** 2;
}

// Helper to find shortest distance from point to a polyline
function distToPolyline(p: { latitude: number; longitude: number; }, coords: Array<{ latitude: number; longitude: number; }>): { distance: number, index: number } {
  let minDistSq = Infinity;
  let index = 0;

  // Checking every single segment might be too slow for very long routes (thousands of points)
  // Optimization: Sample every 10th point first to find a rough area, then check closely?
  // Or just iterate given typical route sizes aren't massive for this app context. 
  // OSRM full geometry can be large. Let's use a step of 5 for coarse check, then refine?
  // Actually, for accuracy, let's just use all segments but optimize by simple bounding box check first if needed.
  // For now, simple iteration.

  for (let i = 0; i < coords.length - 1; i++) {
    const dSq = distToSegmentSquared(p, coords[i], coords[i + 1]);
    if (dSq < minDistSq) {
      minDistSq = dSq;
      index = i;
    }
  }

  // Convert lat/lon squared diff to roughly km (approximation)
  // 1 deg lat ~ 111km. 1 deg lon ~ 111km * cos(lat)
  // This is a rough heuristic. For precise result, take the closest point on segment and use haversine.
  // But since we just need relative sorting and threshold, simpler is better.
  // Let's get the closest point on the segment `index` and calculate Haversine to it.

  const v = coords[index];
  const w = coords[index + 1];
  const l2 = (v.latitude - w.latitude) ** 2 + (v.longitude - w.longitude) ** 2;
  if (l2 === 0) return { distance: haversineDistance(p, v), index };

  let t = ((p.latitude - v.latitude) * (w.latitude - v.latitude) + (p.longitude - v.longitude) * (w.longitude - v.longitude)) / l2;
  t = Math.max(0, Math.min(1, t));

  const closestPoint = {
    latitude: v.latitude + t * (w.latitude - v.latitude),
    longitude: v.longitude + t * (w.longitude - v.longitude)
  };

  return { distance: haversineDistance(p, closestPoint), index };
}

export function findStationsAlongRoute(
  stations: EVStation[],
  routeCoords: Array<{ latitude: number; longitude: number }>,
  maxDistanceKm: number = 1
): Array<{
  station: EVStation;
  distanceToRoute: number;
  distanceAlongRoute: number;
}> {
  // Pre-calculate cumulative distance for the route to map "distance along route"
  const cumDist: number[] = [0];
  for (let i = 1; i < routeCoords.length; i++) {
    cumDist.push(cumDist[i - 1] + haversineDistance(routeCoords[i - 1], routeCoords[i]));
  }

  return stations
    .map((station) => {
      // Find the true shortest distance to the route polyline
      const { distance, index } = distToPolyline(
        { latitude: station.latitude, longitude: station.longitude },
        routeCoords
      );

      return {
        station,
        distanceToRoute: distance,
        distanceAlongRoute: cumDist[index], // Approximation: distance to the start of the closest segment
      };
    })
    .filter((s) => s.distanceToRoute <= maxDistanceKm)
    .sort((a, b) => a.distanceAlongRoute - b.distanceAlongRoute);
}

function isDCType(type: string): boolean {
  const t = type.toLowerCase();
  return t.includes('dc') || t.includes('ccs') || t.includes('chademo');
}

export function planChargingStops(
  totalDistance: number,
  currentSOC: number,
  maxMileage: number,
  stations: EVStation[],
  routeCoords: Array<{ latitude: number; longitude: number }>
): ChargingStop[] {
  const remainingRange = (currentSOC / 100) * maxMileage;
  if (remainingRange >= totalDistance * 1.1) return [];

  // Reduce search radius to 1km to ensure stations are strictly on/near the route
  const nearbyStations = findStationsAlongRoute(stations, routeCoords, 1);
  if (nearbyStations.length === 0) return [];

  const stops: ChargingStop[] = [];
  let currentRange = remainingRange;
  let distanceCovered = 0;
  let socCalc = currentSOC;
  let iterations = 0;

  while (distanceCovered + currentRange < totalDistance && iterations < 20) {
    iterations++;
    const safeRange = currentRange * 0.85;

    // Find all stations reachable within the safe range
    // We prioritize stations that are further along the route (to minimize stops)
    // BUT we also want to minimize detour distance.
    // Strategy: Look at the furthest reachable stations (e.g., in the last 20% of the reachable window)
    // and pick the one with the smallest distanceToRoute.

    let reachable = nearbyStations.filter(
      (s) =>
        s.distanceAlongRoute > distanceCovered + 5 && // Ensure at least 5km travel between stops
        s.distanceAlongRoute <= distanceCovered + safeRange
    );

    if (reachable.length === 0) {
      // If no safe stops, try pushing to the absolute limit of range
      reachable = nearbyStations.filter(
        (s) =>
          s.distanceAlongRoute > distanceCovered + 1 &&
          s.distanceAlongRoute <= distanceCovered + currentRange
      );
      if (reachable.length === 0) break;
    }

    // Optimization: Consider the top 3 furthest stations (or top 25% if many) 
    // and pick the one closest to the route line.
    const candidatesCount = Math.max(1, Math.floor(reachable.length * 0.25));
    const candidates = reachable.slice(-Math.max(3, candidatesCount));

    // Pick the candidate with the minimum deviation from route
    const best = candidates.reduce((prev, curr) =>
      prev.distanceToRoute < curr.distanceToRoute ? prev : curr
    );

    const distToStation = best.distanceAlongRoute - distanceCovered;
    const socUsed = (distToStation / maxMileage) * 100;
    const socOnArrival = Math.max(0, Math.round(socCalc - socUsed));
    const targetSOC = 80;
    const socToCharge = Math.max(0, targetSOC - socOnArrival);
    const rate = isDCType(best.station.type) ? 1 : 4;
    const chargingTime = Math.ceil(socToCharge * rate);

    // Simulate waiting time (0-30 mins) based on station popularity/randomness
    // In a real app, this would come from live data
    const waitTime = Math.floor(Math.random() * 30);

    stops.push({
      station: best.station,
      distanceFromStart: Math.round(best.distanceAlongRoute * 10) / 10,
      socOnArrival,
      chargingTimeMinutes: chargingTime,
      waitTimeMinutes: waitTime,
      socAfterCharging: targetSOC,
    });

    distanceCovered = best.distanceAlongRoute;
    socCalc = targetSOC;
    currentRange = (socCalc / 100) * maxMileage;
  }

  return stops;
}

export function calculateRemainingRange(
  soc: number,
  maxMileage: number
): number {
  return Math.round((soc / 100) * maxMileage);
}

export function estimateChargeTime(
  currentSOC: number,
  targetSOC: number = 100,
  isDCFast: boolean = true
): number {
  const socToCharge = Math.max(0, targetSOC - currentSOC);
  const rate = isDCFast ? 1 : 4;
  return Math.ceil(socToCharge * rate);
}

export function formatDistance(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)}m`;
  if (km < 10) return `${km.toFixed(1)} km`;
  return `${Math.round(km)} km`;
}

export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${Math.round(minutes)} min`;
  const hours = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
}

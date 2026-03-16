import { EVStation, SearchResult, ChargingStop, StationCrowdStatus, CrowdDensityLevel } from '../types';

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
// Helper to find squared distance from point p to line segment vw using longitude scaling for accuracy
function distToSegmentSquared(p: { latitude: number; longitude: number; }, v: { latitude: number; longitude: number; }, w: { latitude: number; longitude: number; }): number {
  const lonScale = Math.cos(toRad(p.latitude));
  const dx = (w.longitude - v.longitude) * lonScale;
  const dy = w.latitude - v.latitude;
  const l2 = dx * dx + dy * dy;

  if (l2 === 0) {
    const p_dx = (p.longitude - v.longitude) * lonScale;
    const p_dy = p.latitude - v.latitude;
    return p_dx * p_dx + p_dy * p_dy;
  }

  const p_dx = (p.longitude - v.longitude) * lonScale;
  const p_dy = p.latitude - v.latitude;
  let t = (p_dx * dx + p_dy * dy) / l2;
  t = Math.max(0, Math.min(1, t));

  const closest_dx = p_dx - t * dx;
  const closest_dy = p_dy - t * dy;
  return closest_dx * closest_dx + closest_dy * closest_dy;
}

// Helper to find shortest distance from point to a polyline
// Returns precise distance and the absolute distance along the route to that point
function distToPolyline(
  p: { latitude: number; longitude: number },
  coords: Array<{ latitude: number; longitude: number }>,
  cumDist: number[]
): { distance: number; distanceAlongRoute: number } {
  let minDistSq = Infinity;
  let segmentIndex = 0;

  for (let i = 0; i < coords.length - 1; i++) {
    const dSq = distToSegmentSquared(p, coords[i], coords[i + 1]);
    if (dSq < minDistSq) {
      minDistSq = dSq;
      segmentIndex = i;
    }
  }

  const v = coords[segmentIndex];
  const w = coords[segmentIndex + 1];
  const l2 = (v.latitude - w.latitude) ** 2 + (v.longitude - w.longitude) ** 2;

  if (l2 === 0) {
    return {
      distance: haversineDistance(p, v),
      distanceAlongRoute: cumDist[segmentIndex]
    };
  }

  let t = ((p.latitude - v.latitude) * (w.latitude - v.latitude) + (p.longitude - v.longitude) * (w.longitude - v.longitude)) / l2;
  t = Math.max(0, Math.min(1, t));

  const closestPoint = {
    latitude: v.latitude + t * (w.latitude - v.latitude),
    longitude: v.longitude + t * (w.longitude - v.longitude)
  };

  const distToClosestOnSegment = haversineDistance(v, closestPoint);
  return {
    distance: haversineDistance(p, closestPoint),
    distanceAlongRoute: cumDist[segmentIndex] + distToClosestOnSegment
  };
}

export function findStationsAlongRoute(
  stations: EVStation[],
  routeCoords: Array<{ latitude: number; longitude: number }>,
  maxDistanceKm: number = 5 // Increased default to encompass fallback limit
): Array<{
  station: EVStation;
  distanceToRoute: number;
  distanceAlongRoute: number;
}> {
  const cumDist: number[] = [0];
  for (let i = 1; i < routeCoords.length; i++) {
    cumDist.push(cumDist[i - 1] + haversineDistance(routeCoords[i - 1], routeCoords[i]));
  }

  return stations
    .map((station) => {
      const { distance, distanceAlongRoute } = distToPolyline(
        { latitude: station.latitude, longitude: station.longitude },
        routeCoords,
        cumDist
      );

      return {
        station,
        distanceToRoute: distance,
        distanceAlongRoute,
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
  routeCoords: Array<{ latitude: number; longitude: number }>,
  stationStatuses: Record<string, StationCrowdStatus> = {}
): ChargingStop[] {
  const remainingRange = (currentSOC / 100) * maxMileage;
  
  console.log(`[DEBUG] Current SOC: ${currentSOC}%`);
  console.log(`[DEBUG] Max Mileage: ${maxMileage} km`);
  console.log(`[DEBUG] Reachable Distance = ${remainingRange.toFixed(2)} km`);

  if (remainingRange >= totalDistance * 1.1) {
    console.log("[INFO] Destination is within battery range (incl. 10% buffer). No stops needed.");
    return [];
  }

  // Get all stations within priority ranges
  const candidates = findStationsAlongRoute(stations, routeCoords, 5.0);
  if (candidates.length === 0) {
    console.log("[ERROR] No stations found within 5km of the route corridor.");
    return [];
  }

  const stops: ChargingStop[] = [];
  let currentRange = remainingRange;
  let distanceCovered = 0;
  let socCalc = currentSOC;
  let iterations = 0;

  let cumulativeMinutes = 0;
  const avgSpeedKmPerMin = 1.0; // 60 km/h average

  while (distanceCovered + currentRange < totalDistance && iterations < 20) {
    iterations++;
    console.log(`\n[ITERATION ${iterations}] Position: ${distanceCovered.toFixed(2)} km, Available Range: ${currentRange.toFixed(2)} km`);

    // STEP 1 & 3: Reachability and Ahead Filter
    const reachable = candidates.filter(s => {
      const distFromUser = s.distanceAlongRoute - distanceCovered;
      
      // Allow 0km travel for the first stop (emergency saves at origin)
      // For subsequent stops, require at least 100m to avoid loops
      const minTravel = iterations === 1 ? 0 : 0.1;
      const isReachable = distFromUser <= currentRange && distFromUser >= minTravel;
      
      return isReachable;
    });

    if (reachable.length === 0) {
      console.log(`[ERROR] No reachable EV stations found within ${currentRange.toFixed(2)} km range.`);
      console.log("[SUGGESTION] Reduce route or arrange towing.");
      break;
    }

    const RADIUS_ON_ROUTE = 1.0;
    const RADIUS_CORRIDOR = 2.5;

    const tier1 = reachable.filter(s => s.distanceToRoute <= RADIUS_ON_ROUTE);
    const tier2 = reachable.filter(s => s.distanceToRoute <= RADIUS_CORRIDOR);
    
    let validCandidates = [];
    let priorityTier = "";

    if (tier1.length > 0) {
      validCandidates = tier1;
      priorityTier = "Priority 1 (On Route)";
    } else if (tier2.length > 0) {
      validCandidates = tier2;
      priorityTier = "Priority 2 (Corridor)";
    } else {
      validCandidates = reachable;
      priorityTier = "Priority 3 (Fallback)";
    }

    console.log(`[INFO] Valid Stations Count: ${validCandidates.length} (${priorityTier})`);

    const scoredCandidates = validCandidates.map(s => {
      const status = stationStatuses[s.station.id];
      const density = status?.densityLevel || 'LOW';
      const userCount = status?.userCount || 0;
      const demandScore = density === 'CRITICAL' ? 3 : (density === 'HIGH' ? 2 : (density === 'MEDIUM' ? 1 : 0));
      return { ...s, demand: density, demandScore, userCount };
    });

    scoredCandidates.sort((a, b) => {
      if (a.demandScore !== b.demandScore) return a.demandScore - b.demandScore;
      const distA = a.distanceAlongRoute - distanceCovered;
      const distB = b.distanceAlongRoute - distanceCovered;
      if (Math.abs(distA - distB) > 0.001) return distA - distB;
      return a.distanceToRoute - b.distanceToRoute;
    });

    console.log("[INFO] Sorted By Demand (50m) > Distance From User");

    // Debugging logic for visibility (per user request) - Showing TOP 5 sorted candidates
    scoredCandidates.slice(0, 5).forEach((c, idx) => {
        const distFromUser = c.distanceAlongRoute - distanceCovered;
        console.log(`[CHECK] Candidate #${idx + 1}: ${c.station.name} (${c.station.id})`);
        console.log(`  Demand: ${c.demand}, Users within 50m: ${c.userCount}`);
        console.log(`  Distance From User: ${distFromUser.toFixed(3)} km`);
        console.log(`  Distance From Route: ${c.distanceToRoute.toFixed(3)} km`);
        console.log(`  Reachable: YES, Ahead: YES`);
    });

    const best = scoredCandidates[0];
    console.log(`[INFO] Selected First Station: ${best.station.name} (${best.station.id})`);

    const distToStation = best.distanceAlongRoute - distanceCovered;
    const travelTime = Math.ceil(distToStation / avgSpeedKmPerMin);
    const arrivalTime = cumulativeMinutes + travelTime;
    
    const socUsed = (distToStation / maxMileage) * 100;
    const socOnArrival = Math.max(0, Math.round(socCalc - socUsed));
    const targetSOC = 80;
    const socToCharge = Math.max(0, targetSOC - socOnArrival);
    const rate = isDCType(best.station.type) ? 1 : 4;
    const chargingTime = Math.ceil(socToCharge * rate);
    
    const baseWait = best.demand === 'CRITICAL' ? 45 : (best.demand === 'HIGH' ? 25 : (best.demand === 'MEDIUM' ? 10 : 0));
    const waitTime = baseWait + Math.floor(Math.random() * 10);
    const leavingTime = arrivalTime + waitTime + chargingTime;

    console.log(`[STOP ${stops.length + 1}] ${best.station.name}`);
    console.log(`  Arrive: ${socOnArrival}% at +${arrivalTime} min`);
    console.log(`  Wait: ${waitTime} min (Demand: ${best.demand})`);
    console.log(`  Charge: ${chargingTime} min (${best.station.type})`);
    console.log(`  Leave: at +${leavingTime} min`);

    stops.push({
      station: best.station,
      distanceFromStart: Math.round(best.distanceAlongRoute * 10) / 10,
      socOnArrival,
      chargingTimeMinutes: chargingTime,
      waitTimeMinutes: waitTime,
      socAfterCharging: targetSOC,
      arrivalTimeMinutes: arrivalTime,
      leavingTimeMinutes: leavingTime,
    });

    distanceCovered = best.distanceAlongRoute;
    socCalc = targetSOC;
    currentRange = (socCalc / 100) * maxMileage;
    cumulativeMinutes = leavingTime;
  }

  if (stops.length > 0) {
    console.log(`\n[RESULT] Planned ${stops.length} charging stops.`);
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

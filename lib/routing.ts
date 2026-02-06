import { EVStation, SearchResult, ChargingStop } from '@/types';

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

function sampleRoute(
  coords: Array<{ latitude: number; longitude: number }>,
  numPoints: number
): Array<{ latitude: number; longitude: number }> {
  if (coords.length <= numPoints) return coords;
  const step = Math.max(1, Math.floor(coords.length / numPoints));
  const sampled: Array<{ latitude: number; longitude: number }> = [];
  for (let i = 0; i < coords.length; i += step) {
    sampled.push(coords[i]);
  }
  if (sampled[sampled.length - 1] !== coords[coords.length - 1]) {
    sampled.push(coords[coords.length - 1]);
  }
  return sampled;
}

export function findStationsAlongRoute(
  stations: EVStation[],
  routeCoords: Array<{ latitude: number; longitude: number }>,
  maxDistanceKm: number = 15
): Array<{
  station: EVStation;
  distanceToRoute: number;
  distanceAlongRoute: number;
}> {
  const sampled = sampleRoute(routeCoords, 100);
  const cumDist: number[] = [0];
  for (let i = 1; i < sampled.length; i++) {
    cumDist.push(cumDist[i - 1] + haversineDistance(sampled[i - 1], sampled[i]));
  }

  return stations
    .map((station) => {
      let minDist = Infinity;
      let nearestIdx = 0;
      for (let i = 0; i < sampled.length; i++) {
        const dist = haversineDistance(
          { latitude: station.latitude, longitude: station.longitude },
          sampled[i]
        );
        if (dist < minDist) {
          minDist = dist;
          nearestIdx = i;
        }
      }
      return {
        station,
        distanceToRoute: minDist,
        distanceAlongRoute: cumDist[nearestIdx],
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

  const nearbyStations = findStationsAlongRoute(stations, routeCoords, 15);
  if (nearbyStations.length === 0) return [];

  const stops: ChargingStop[] = [];
  let currentRange = remainingRange;
  let distanceCovered = 0;
  let socCalc = currentSOC;
  let iterations = 0;

  while (distanceCovered + currentRange < totalDistance && iterations < 20) {
    iterations++;
    const safeRange = currentRange * 0.85;

    let reachable = nearbyStations.filter(
      (s) =>
        s.distanceAlongRoute > distanceCovered + 3 &&
        s.distanceAlongRoute <= distanceCovered + safeRange
    );

    if (reachable.length === 0) {
      reachable = nearbyStations.filter(
        (s) =>
          s.distanceAlongRoute > distanceCovered + 1 &&
          s.distanceAlongRoute <= distanceCovered + currentRange
      );
      if (reachable.length === 0) break;
    }

    const best = reachable[reachable.length - 1];
    const distToStation = best.distanceAlongRoute - distanceCovered;
    const socUsed = (distToStation / maxMileage) * 100;
    const socOnArrival = Math.max(0, Math.round(socCalc - socUsed));
    const targetSOC = 80;
    const socToCharge = Math.max(0, targetSOC - socOnArrival);
    const rate = isDCType(best.station.type) ? 1 : 4;
    const chargingTime = Math.ceil(socToCharge * rate);

    stops.push({
      station: best.station,
      distanceFromStart: Math.round(best.distanceAlongRoute * 10) / 10,
      socOnArrival,
      chargingTimeMinutes: chargingTime,
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

export interface EVStation {
  id: string;
  name: string;
  state: string;
  city: string;
  address: string;
  latitude: number;
  longitude: number;
  type: string;
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  password: string;
  evModel: string;
  maxMileage: number;
  batteryCapacity: number;
}

export interface SearchResult {
  display_name: string;
  lat: string;
  lon: string;
  place_id: number;
}

export interface ChargingStop {
  station: EVStation;
  distanceFromStart: number;
  socOnArrival: number;
  chargingTimeMinutes: number;
  socAfterCharging: number;
}

export interface TripPlan {
  destination: {
    name: string;
    latitude: number;
    longitude: number;
  };
  totalDistance: number;
  totalDuration: number;
  canComplete: boolean;
  chargingStops: ChargingStop[];
  routeCoordinates: Array<{ latitude: number; longitude: number }>;
}

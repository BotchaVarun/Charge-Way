import { EVStation } from '../types';

const staticStations: EVStation[] = [
  { id: '1', name: 'Tata Power EV Charging Station', state: 'Maharashtra', city: 'Mumbai', address: 'Andheri East, Mumbai', latitude: 19.1136, longitude: 72.8697, type: 'DC Fast Charger' },
  { id: '2', name: 'Ather Grid Charging Point', state: 'Karnataka', city: 'Bangalore', address: 'Koramangala, Bangalore', latitude: 12.9352, longitude: 77.6245, type: 'AC Charger' },
  { id: '3', name: 'ChargeZone Hub', state: 'Delhi', city: 'New Delhi', address: 'Connaught Place, New Delhi', latitude: 28.6315, longitude: 77.2167, type: 'DC Fast Charger' },
  { id: '4', name: 'EESL Public Charging', state: 'Tamil Nadu', city: 'Chennai', address: 'T Nagar, Chennai', latitude: 13.0418, longitude: 80.2341, type: 'AC Charger' },
  { id: '5', name: 'Fortum Charge & Drive', state: 'Telangana', city: 'Hyderabad', address: 'HITEC City, Hyderabad', latitude: 17.4435, longitude: 78.3772, type: 'DC Fast Charger' },
  { id: '6', name: 'Statiq Charging Station', state: 'Uttar Pradesh', city: 'Noida', address: 'Sector 18, Noida', latitude: 28.5706, longitude: 77.321, type: 'DC Fast Charger' },
  { id: '7', name: 'MG Motor Charging Point', state: 'Gujarat', city: 'Ahmedabad', address: 'SG Highway, Ahmedabad', latitude: 23.0225, longitude: 72.5714, type: 'AC Charger' },
  { id: '8', name: 'EV Motors India', state: 'West Bengal', city: 'Kolkata', address: 'Salt Lake, Kolkata', latitude: 22.5726, longitude: 88.4373, type: 'DC Fast Charger' },
  { id: '9', name: 'BPCL Fast Charger', state: 'Kerala', city: 'Kochi', address: 'MG Road, Kochi', latitude: 9.9312, longitude: 76.2673, type: 'DC Fast Charger' },
  { id: '10', name: 'HPCL EV Station', state: 'Rajasthan', city: 'Jaipur', address: 'MI Road, Jaipur', latitude: 26.9124, longitude: 75.7873, type: 'AC Charger' },
  { id: '11', name: 'Reliance BP Mobility', state: 'Punjab', city: 'Chandigarh', address: 'Sector 17, Chandigarh', latitude: 30.7333, longitude: 76.7794, type: 'DC Fast Charger' },
  { id: '12', name: 'Jio-bp Pulse', state: 'Maharashtra', city: 'Pune', address: 'Hinjewadi, Pune', latitude: 18.5913, longitude: 73.7389, type: 'DC Fast Charger' },
  { id: '13', name: 'Shell Recharge', state: 'Karnataka', city: 'Bangalore', address: 'Whitefield, Bangalore', latitude: 12.9698, longitude: 77.7500, type: 'DC Fast Charger' },
  { id: '14', name: 'Kazam EV', state: 'Maharashtra', city: 'Mumbai', address: 'Powai, Mumbai', latitude: 19.1176, longitude: 72.9060, type: 'AC Charger' },
  { id: '15', name: 'Glida Power Station', state: 'Delhi', city: 'New Delhi', address: 'Nehru Place, New Delhi', latitude: 28.5494, longitude: 77.2534, type: 'DC Fast Charger' },
  { id: '16', name: 'Bolt Earth Charging Station', state: 'Andhra Pradesh', city: 'Visakhapatnam', address: 'Sector 11, MVP Colony', latitude: 17.7382, longitude: 83.3420, type: 'AC Charger' },
  { id: '17', name: 'Bolt Earth Charging Station', state: 'Andhra Pradesh', city: 'Visakhapatnam', address: 'MVP Colony', latitude: 17.7428, longitude: 83.3403, type: 'AC Charger' },
  { id: '18', name: 'Bolt Earth Charging Station', state: 'Andhra Pradesh', city: 'Visakhapatnam', address: 'Near Rama Talkies', latitude: 17.7344, longitude: 83.2772, type: 'AC Charger' },
  { id: '19', name: 'ChargeZone Fast Charger', state: 'Andhra Pradesh', city: 'Visakhapatnam', address: 'Anandapuram', latitude: 17.8991, longitude: 83.3860, type: 'DC Fast Charger' },
  { id: '20', name: 'ChargeZone Fast Charger', state: 'Andhra Pradesh', city: 'Visakhapatnam', address: '10-28-3, Uplands', latitude: 17.7210, longitude: 83.3121, type: 'DC Fast Charger' },
  { id: '21', name: 'IndianOil EV Station', state: 'Andhra Pradesh', city: 'Visakhapatnam', address: 'IOCL Hanumanthawaka', latitude: 17.6832, longitude: 83.1909, type: 'DC Fast Charger' },
  { id: '22', name: 'Jio-bp pulse', state: 'Andhra Pradesh', city: 'Visakhapatnam', address: 'Anandapuram', latitude: 17.8989, longitude: 83.3860, type: 'DC Fast Charger' },
  { id: '23', name: 'Jio-bp pulse', state: 'Andhra Pradesh', city: 'Visakhapatnam', address: 'Road No 5', latitude: 17.8285, longitude: 83.3585, type: 'DC Fast Charger' },
  { id: '24', name: 'OLA EV Station', state: 'Andhra Pradesh', city: 'Visakhapatnam', address: 'Nad Junction', latitude: 17.7447, longitude: 83.2318, type: 'DC Fast Charger' },
  { id: '25', name: 'Tata Power EZ Charge', state: 'Andhra Pradesh', city: 'Visakhapatnam', address: 'Beach Road', latitude: 17.7122, longitude: 83.3166, type: 'DC Fast Charger' },
  { id: '26', name: 'Tata Power EZ Charge', state: 'Andhra Pradesh', city: 'Visakhapatnam', address: 'Beach Road', latitude: 17.7213, longitude: 83.3361, type: 'DC Fast Charger' },
  { id: '27', name: 'Tata Power EZ Charge', state: 'Andhra Pradesh', city: 'Visakhapatnam', address: '28-2-48, Suryabagh', latitude: 17.7105, longitude: 83.3011, type: 'DC Fast Charger' },
  { id: '28', name: 'Zeon Charging', state: 'Andhra Pradesh', city: 'Visakhapatnam', address: '48-8-17, 1st Floor', latitude: 17.7267, longitude: 83.3070, type: 'AC Charger' },
  { id: '29', name: 'Ather Grid', state: 'Andhra Pradesh', city: 'Visakhapatnam', address: 'NH16, Beside Varun Motors', latitude: 17.8184, longitude: 83.3444, type: 'DC Fast Charger' },
  { id: '30', name: 'FreshBus Station', state: 'Andhra Pradesh', city: 'Visakhapatnam', address: 'Ambedkar Colony', latitude: 17.8150, longitude: 83.3490, type: 'AC Charger' },
];

const cities = [
  { city: 'Mumbai', state: 'Maharashtra', lat: 19.076, lng: 72.8777 },
  { city: 'Delhi', state: 'Delhi', lat: 28.6139, lng: 77.209 },
  { city: 'Bangalore', state: 'Karnataka', lat: 12.9716, lng: 77.5946 },
  { city: 'Chennai', state: 'Tamil Nadu', lat: 13.0827, lng: 80.2707 },
  { city: 'Hyderabad', state: 'Telangana', lat: 17.385, lng: 78.4867 },
  { city: 'Pune', state: 'Maharashtra', lat: 18.5204, lng: 73.8567 },
  { city: 'Ahmedabad', state: 'Gujarat', lat: 23.0225, lng: 72.5714 },
  { city: 'Kolkata', state: 'West Bengal', lat: 22.5726, lng: 88.3639 },
  { city: 'Visakhapatnam', state: 'Andhra Pradesh', lat: 17.6868, lng: 83.2185 },
  { city: 'Lucknow', state: 'Uttar Pradesh', lat: 26.8467, lng: 80.9462 },
  { city: 'Nagpur', state: 'Maharashtra', lat: 21.1458, lng: 79.0882 },
  { city: 'Indore', state: 'Madhya Pradesh', lat: 22.7196, lng: 75.8577 },
];

const providers = [
  'Tata Power', 'Ather Grid', 'ChargeZone', 'Statiq', 'Fortum',
  'Shell Recharge', 'Jio-bp Pulse', 'BPCL', 'HPCL', 'EESL',
  'Kazam EV', 'Glida Power', 'Bolt Earth',
];

const types = ['AC Charger', 'DC Fast Charger', 'CCS2', 'CHAdeMO'];

function seedRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function generateStations(count: number): EVStation[] {
  const rand = seedRandom(42);
  // Do NOT include staticStations here, as they are already in allStations
  const stations: EVStation[] = [];

  // We start ID generation after the static count to avoid collision if we were using static IDs,
  // but static IDs are "1", "2" etc. and generated are "gen_X".
  // Let's keep the logic of generating `count` *new* stations.
  // The original logic was generating up to `count` total stations including static.
  // If we passed 50, and static was 30, it generated 20 new ones.
  // Let's change it to generate exactly `count` new stations for clarity, 
  // OR respect the original intent if `count` meant "total random stations to add".

  // Usage is: ...generateStations(50). 
  // Previously: ...generateStations(120) gave 120 total (30 static + 90 new).
  // Current usage: ...generateStations(50) gives 50 total (30 static + 20 new).
  // BUT we spread staticStations separately: [...static, ...imported, ...generateStations(50)].
  // So we ended up with: static (30) + imported + static(30) + new(20). 

  // We want: static + imported + new.
  // So generateStations should just return `count` NEW stations.

  for (let i = 0; i < count; i++) {
    const cityInfo = cities[Math.floor(rand() * cities.length)];
    const provider = providers[Math.floor(rand() * providers.length)];
    const type = types[Math.floor(rand() * types.length)];

    stations.push({
      id: `gen_${i + 1}`,
      name: `${provider} Station`,
      state: cityInfo.state,
      city: cityInfo.city,
      address: `${cityInfo.city} Location ${i + 1}`,
      latitude: cityInfo.lat + (rand() - 0.5) * 0.25,
      longitude: cityInfo.lng + (rand() - 0.5) * 0.25,
      type,
    });
  }

  return stations;
}

import { importedStations } from './ev_stations_data';

export const allStations: EVStation[] = [
  ...staticStations,
  ...importedStations,
  ...generateStations(50) // Reduce generated count as we have real data now
];

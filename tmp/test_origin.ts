import { findStationsAlongRoute, haversineDistance } from '../lib/routing';
import { EVStation } from '../types';

async function testOriginProximity() {
    const user = { latitude: 17.825829, longitude: 83.352399 };
    const destination = { latitude: 17.7282, longitude: 83.3089 };
    const routeCoords = [user, destination];

    const tataPower: EVStation = {
        id: 'csv_1496',
        name: 'Tata Power (Renuka Residency)',
        state: 'Andhrapradesh',
        city: 'Visakhapatnam',
        address: 'Renuka Residency',
        latitude: 17.825753,
        longitude: 83.352351,
        type: 'AC Charger'
    };

    const distActual = haversineDistance(user, { latitude: tataPower.latitude, longitude: tataPower.longitude });
    console.log(`Direct Haversine Distance: ${(distActual * 1000).toFixed(2)} meters`);

    const along = findStationsAlongRoute([tataPower], routeCoords, 1.0);
    if (along.length > 0) {
        console.log(`Distance Along Route: ${(along[0].distanceAlongRoute * 1000).toFixed(2)} meters`);
        console.log(`Distance To Route: ${(along[0].distanceToRoute * 1000).toFixed(2)} meters`);
    } else {
        console.log("Station NOT found along route.");
    }
}

testOriginProximity();

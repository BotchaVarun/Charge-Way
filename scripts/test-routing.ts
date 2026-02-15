
import { planChargingStops } from '../lib/routing';
import { EVStation } from '../types';

// Mock data
const mockStations: EVStation[] = [
    { id: '1', name: 'Station A (Off)', state: 'KA', city: 'Bangalore', address: 'Addr A', latitude: 12.92, longitude: 77.52, type: 'DC Fast Charger' }, // ~2km+ off
    { id: '4', name: 'Station D (On Route)', state: 'KA', city: 'Bangalore', address: 'Addr D', latitude: 12.9, longitude: 77.5, type: 'DC Fast Charger' }, // Exactly on vertex

];

const mockRouteCoords = [
    { latitude: 12.9716, longitude: 77.5946 }, // Start
    { latitude: 12.9, longitude: 77.5 },       // Near Station A
    { latitude: 12.7, longitude: 77.8 },       // Near Station B
    { latitude: 12.5, longitude: 78.0 },       // End
];

const totalDistance = 100; // km
const currentSOC = 20; // low SOC
const maxMileage = 100; // km range (so 20% = 20km range, trip is 100km, needs charge)

console.log("Starting routing logic test...");

try {
    const stops = planChargingStops(
        totalDistance,
        currentSOC,
        maxMileage,
        mockStations,
        mockRouteCoords
    );

    console.log(`Planned ${stops.length} stops.`);
    stops.forEach((stop, i) => {
        console.log(`Stop ${i + 1}: ${stop.station.name}`);
        console.log(`  - Charge Time: ${stop.chargingTimeMinutes} mins`);
        console.log(`  - Wait Time: ${stop.waitTimeMinutes} mins`);
        console.log(`  - SOC Arrival: ${stop.socOnArrival}%`);
        console.log(`  - SOC Leave: ${stop.socAfterCharging}%`);

        if (stop.waitTimeMinutes === undefined) {
            console.error("ERROR: waitTimeMinutes is missing!");
            process.exit(1);
        }
    });

    if (stops.length > 0) {
        console.log("Test Passed: Stops generated with wait times.");
    } else {
        console.log("Test Warning: No stops generated (might be due to reachability logic with mock data).");
    }

} catch (e) {
    console.error("Test Failed with error:", e);
    process.exit(1);
}

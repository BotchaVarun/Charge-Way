import { planChargingStops } from '../lib/routing';
import { EVStation, StationCrowdStatus } from '../types';

async function runFinalVerification() {
    const origin = { latitude: 17.825829, longitude: 83.352399 };
    const routeCoords = [
        origin,
        { latitude: 17.7282, longitude: 83.3089 } // Maddilapalem
    ];
    
    const soc = 1;
    const maxMileage = 421;

    const mockStations: EVStation[] = [
        { 
            id: 'csv_1496', name: 'Tata Power (Renuka Residency)', 
            latitude: 17.825753, longitude: 83.352351, // ~9.8m away
            address: 'Renuka Residency', city: 'Vizag', state: 'AP', type: 'AC' 
        },
        { 
            id: 'STA_JIO_BP', name: 'Jio-bp pulse', 
            latitude: 17.820, longitude: 83.350, // ~600m away
            address: 'Main Road', city: 'Vizag', state: 'AP', type: 'DC' 
        },
    ];

    const stationStatuses: Record<string, StationCrowdStatus> = {
        'csv_1496': {
            stationId: 'csv_1496',
            densityLevel: 'LOW',
            userCount: 0,
            trend: 'STABLE'
        },
        'STA_JIO_BP': {
            stationId: 'STA_JIO_BP',
            densityLevel: 'LOW',
            userCount: 0,
            trend: 'STABLE'
        }
    };

    console.log("====================================");
    console.log("    ORIGIN-PRIORITY SIMULATION");
    console.log("====================================");
    
    const stops = planChargingStops(12, soc, maxMileage, mockStations, routeCoords, stationStatuses);

    console.log("\n====================================");
    console.log("    FINAL RECOMMENDATION");
    console.log("====================================");
    if (stops.length > 0) {
        console.log(`RECOMMENDED: ${stops[0].station.name}`);
    } else {
        console.log("NO STATION FOUND");
    }
    console.log("====================================");
}

runFinalVerification();

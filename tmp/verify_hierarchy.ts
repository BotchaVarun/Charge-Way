import { planChargingStops } from '../lib/routing';
import { EVStation, StationCrowdStatus } from '../types';

async function runHierarchicalVerification() {
    const origin = { latitude: 17.825829, longitude: 83.352399 };
    const routeCoords = [
        origin,
        { latitude: 17.7282, longitude: 83.3089 } // Maddilapalem
    ];
    
    const soc = 1;
    const maxMileage = 421;

    const mockStations: EVStation[] = [
        { 
            id: 'TATA_POWER', name: 'Tata Power (9m, On Route, BUSY)', 
            latitude: 17.825753, longitude: 83.352351,
            address: 'Renuka Residency', city: 'Vizag', state: 'AP', type: 'AC' 
        },
        { 
            id: 'STA_CORRIDOR', name: 'Station CORRIDOR (300m, OFF Route, FREE)', 
            latitude: 17.822, longitude: 83.355, 
            address: 'Detour Road', city: 'Vizag', state: 'AP', type: 'DC' 
        },
        { 
            id: 'STA_ON_ROUTE_FAR', name: 'Station ON ROUTE (800m, ON Route, FREE)', 
            latitude: 17.820, longitude: 83.350, 
            address: 'Main Road', city: 'Vizag', state: 'AP', type: 'DC' 
        },
    ];

    const stationStatuses: Record<string, StationCrowdStatus> = {
        'TATA_POWER': {
            stationId: 'TATA_POWER',
            densityLevel: 'CRITICAL',
            userCount: 5,
            trend: 'STABLE'
        },
        'STA_CORRIDOR': {
            stationId: 'STA_CORRIDOR',
            densityLevel: 'LOW',
            userCount: 0,
            trend: 'STABLE'
        },
        'STA_ON_ROUTE_FAR': {
            stationId: 'STA_ON_ROUTE_FAR',
            densityLevel: 'LOW',
            userCount: 0,
            trend: 'STABLE'
        }
    };

    console.log("====================================");
    console.log("   HIERARCHICAL TIERING TEST");
    console.log("====================================");
    
    // Scenario: We have reachable stations in Priority 1 and Priority 2.
    // Tier 1 contains TATA_POWER (Critical) and STA_ON_ROUTE_FAR (Low).
    // Tier 2 contains STA_CORRIDOR (Low).
    
    // Outcome: Should pick STA_ON_ROUTE_FAR because it's in the highest available tier 
    // and has lower demand than TATA_POWER. It should NOT pick STA_CORRIDOR even though it's nearer 
    // than STA_ON_ROUTE_FAR because STA_ON_ROUTE_FAR is Tier 1.

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

runHierarchicalVerification();

import { planChargingStops } from '../lib/routing';
import { EVStation, StationCrowdStatus } from '../types';

async function run50mDemandVerification() {
    const origin = { latitude: 17.825829, longitude: 83.352399 };
    const routeCoords = [origin, { latitude: 17.7282, longitude: 83.3089 }];
    
    const soc = 1;
    const maxMileage = 421;

    const mockStations: EVStation[] = [
        { 
            id: 'csv_1496', name: 'Tata Power (9m, 3 Users)', 
            latitude: 17.825753, longitude: 83.352351,
            address: 'Renuka Residency', city: 'Vizag', state: 'AP', type: 'AC' 
        },
        { 
            id: 'csv_1504', name: 'Birla Power (150m, 0 Users)', 
            latitude: 17.824561, longitude: 83.352266,
            address: 'Kommadi', city: 'Vizag', state: 'AP', type: 'AC' 
        },
    ];

    const stationStatuses: Record<string, StationCrowdStatus> = {
        'csv_1496': {
            stationId: 'csv_1496',
            densityLevel: 'CRITICAL', // 3 users within 50m
            userCount: 3,
            trend: 'STABLE'
        },
        'csv_1504': {
            stationId: 'csv_1504',
            densityLevel: 'LOW', // 0 users within 50m
            userCount: 0,
            trend: 'STABLE'
        }
    };

    console.log("====================================");
    console.log("   50M DYNAMIC DEMAND PRIORITY TEST");
    console.log("====================================");
    
    planChargingStops(12, soc, maxMileage, mockStations, routeCoords, stationStatuses);

    console.log("====================================");
}

run50mDemandVerification();

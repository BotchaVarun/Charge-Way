import { useState, useEffect } from 'react';
import { CrowdDetectionService, StationCrowdStatus } from '../services/crowdDetectionService';
import { EVStation } from '../types';

export function useCrowdDensity(
    stations: EVStation[],
    userLocation: { latitude: number; longitude: number } | null,
    userId: string | undefined
) {
    const [stationStatuses, setStationStatuses] = useState<Record<string, StationCrowdStatus>>({});

    useEffect(() => {
        // Initialize listener for other users
        CrowdDetectionService.initializeSimulation(stations);

        return () => CrowdDetectionService.cleanup();
    }, [stations]);

    // Subscribe to real-time updates from the service
    useEffect(() => {
        // Initial fetch
        setStationStatuses(CrowdDetectionService.getStationCrowdStatus(stations));

        // Subscribe to updates
        const unsubscribe = CrowdDetectionService.subscribe(() => {
            const statuses = CrowdDetectionService.getStationCrowdStatus(stations);
            setStationStatuses(statuses);
        });

        return () => unsubscribe();
    }, [stations]);

    // Update own location
    useEffect(() => {
        if (userLocation && userId) {
            CrowdDetectionService.updateUserLocation(userId, userLocation.latitude, userLocation.longitude);

            // Update regularly while moving
            const interval = setInterval(() => {
                CrowdDetectionService.updateUserLocation(userId, userLocation.latitude, userLocation.longitude);
            }, 10000); // Heartbeat every 10s

            return () => clearInterval(interval);
        }
    }, [userLocation, userId]);

    return { stationStatuses };
}

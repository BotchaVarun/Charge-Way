import { db } from '../lib/firebase';
import {
    collection,
    doc,
    setDoc,
    onSnapshot,
    query,
    where,
    Timestamp,
    getDocs
} from 'firebase/firestore';
import { EVStation } from '../types';
import { haversineDistance } from '../lib/routing';

// Types
export type CrowdDensityLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface CrowdPoint {
    latitude: number;
    longitude: number;
    weight: number;
    timestamp?: number;
}

export interface StationCrowdStatus {
    stationId: string;
    densityLevel: CrowdDensityLevel;
    userCount: number;
    trend: 'STABLE' | 'INCREASING' | 'DECREASING';
}

// Configuration
const CROWD_RADIUS_KM = 0.5; // 500m radius for station crowd
const USER_TIMEOUT_MS = 1 * 60 * 1000; // 5 minutes inactivity timeout
const HIGH_DENSITY_THRESHOLD = 2; // > 1 user (so 2 or more)
const CRITICAL_DENSITY_THRESHOLD = 5; // > 4 users

// State
let activeUsers: { id: string; lat: number; lng: number; lastUpdated: number }[] = [];
let monitoredStations: EVStation[] = [];
let listeners: (() => void)[] = [];
let unsubscribeSnapshot: (() => void) | null = null;

// Service Methods
export const CrowdDetectionService = {
    // Start listening to real-time updates from Firestore
    initializeSimulation: (stations: EVStation[]) => {
        monitoredStations = stations;
        if (unsubscribeSnapshot) return;

        const q = query(
            collection(db, "active_users"),
            where("timestamp", ">", Timestamp.fromMillis(Date.now() - USER_TIMEOUT_MS))
        );

        unsubscribeSnapshot = onSnapshot(q, (snapshot) => {
            activeUsers = [];
            snapshot.forEach(doc => {
                const data = doc.data();
                if (data.latitude && data.longitude) {
                    activeUsers.push({
                        id: doc.id,
                        lat: data.latitude,
                        lng: data.longitude,
                        lastUpdated: data.timestamp?.toMillis() || Date.now()
                    });
                }
            });
            CrowdDetectionService.notifyListeners();
        });
    },

    // Push current user location to Firestore
    updateUserLocation: async (userId: string, lat: number, lng: number) => {
        if (!userId) return;
        try {
            await setDoc(doc(db, "active_users", userId), {
                latitude: lat,
                longitude: lng,
                timestamp: Timestamp.now(),
                userId: userId
            }, { merge: true });
        } catch (e) {
            console.error("Error updating location:", e);
        }
    },

    getHeatmapData: (): CrowdPoint[] => {
        // Refined Logic (Per User Request):
        // 1. Do NOT show individual user locations.
        // 2. Only show heatmap effect AT THE STATION if density is high.

        const heatmapPoints: CrowdPoint[] = [];

        // Calculate status for all monitored stations
        const statuses = CrowdDetectionService.getStationCrowdStatus(monitoredStations);

        Object.values(statuses).forEach(status => {
            const station = monitoredStations.find(s => s.id === status.stationId);
            if (station && (status.densityLevel === 'HIGH' || status.densityLevel === 'CRITICAL')) {
                // Add a strong weight point at the station location to create a "glow"
                heatmapPoints.push({
                    latitude: station.latitude,
                    longitude: station.longitude,
                    weight: 1, // Max weight for high density
                });
            }
        });

        return heatmapPoints;
    },

    getStationCrowdStatus: (stations: EVStation[]): Record<string, StationCrowdStatus> => {
        const statusMap: Record<string, StationCrowdStatus> = {};

        stations.forEach(station => {
            // Users within radius
            const nearbyUsers = activeUsers.filter(u => {
                const dist = haversineDistance(
                    { latitude: u.lat, longitude: u.lng },
                    { latitude: station.latitude, longitude: station.longitude }
                );
                return dist <= CROWD_RADIUS_KM;
            });

            const count = nearbyUsers.length;
            let density: CrowdDensityLevel = 'LOW';

            // Strict threshold check
            if (count >= CRITICAL_DENSITY_THRESHOLD) density = 'CRITICAL';
            else if (count >= HIGH_DENSITY_THRESHOLD) density = 'HIGH';
            else density = 'LOW';

            // Only report status if meaningful density
            if (density !== 'LOW') {
                statusMap[station.id] = {
                    stationId: station.id,
                    densityLevel: density,
                    userCount: count,
                    trend: 'STABLE', // Real trend tracking would require history
                };
            }
        });

        return statusMap;
    },

    subscribe: (callback: () => void) => {
        listeners.push(callback);
        return () => {
            listeners = listeners.filter(l => l !== callback);
        };
    },

    notifyListeners: () => {
        listeners.forEach(l => l());
    },

    cleanup: () => {
        if (unsubscribeSnapshot) {
            unsubscribeSnapshot();
            unsubscribeSnapshot = null;
        }
    }
};

import React, { useEffect, useState } from 'react';
import { Heatmap } from 'react-native-maps';
import { CrowdDetectionService, CrowdPoint } from '../services/crowdDetectionService';

interface CrowdHeatmapProps {
    opacity?: number;
    radius?: number;
}

export const CrowdHeatmap: React.FC<CrowdHeatmapProps> = ({
    opacity = 0.7,
    radius = 50
}) => {
    const [points, setPoints] = useState<CrowdPoint[]>([]);

    useEffect(() => {
        // Initial fetch
        setPoints(CrowdDetectionService.getHeatmapData());

        // Subscribe to updates
        const unsubscribe = CrowdDetectionService.subscribe(() => {
            setPoints(CrowdDetectionService.getHeatmapData());
        });

        return () => {
            // unsubscribe logic if service supported it, currently it returns void or similar
            // The implemented service returns a cleanup function? Let's check.
            // Yes, I implemented a subscribe that returns a cleanup function.
            unsubscribe();
        };
    }, []);

    if (points.length === 0) return null;

    // Convert to WeightedLatLng format expected by react-native-maps
    const heatmapPoints = points.map(p => ({
        latitude: p.latitude,
        longitude: p.longitude,
        weight: p.weight // 1 for now
    }));

    return (
        <Heatmap
            points={heatmapPoints}
            opacity={opacity}
            radius={radius}
            gradient={{
                colors: ['#00FF00', '#FFFF00', '#FF0000'], // Green -> Yellow -> Red
                startPoints: [0.2, 0.5, 0.8],
                colorMapSize: 256
            }}
        />
    );
};

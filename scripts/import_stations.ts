
import fs from 'fs';
import path from 'path';
import { EVStation } from '../types';

const csvFilePath = path.join(__dirname, '../attached_assets/ev_stations_india_cleaned.csv');
const outputFilePath = path.join(__dirname, '../lib/ev_stations_data.ts');

function parseCSV(csv: string): EVStation[] {
    const lines = csv.split('\n');
    const stations: EVStation[] = [];

    // Skip header
    for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        // Simple CSV parsing handling quotes
        const matches = line.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g);
        // Better regex or split? CSVs can be tricky.
        // Let's use a robust regex for CSV parsing
        const row: string[] = [];
        let inQuote = false;
        let currentField = '';

        for (let j = 0; j < line.length; j++) {
            const char = line[j];
            if (char === '"') {
                inQuote = !inQuote;
            } else if (char === ',' && !inQuote) {
                row.push(currentField.trim().replace(/^"|"$/g, '').replace(/""/g, '"'));
                currentField = '';
            } else {
                currentField += char;
            }
        }
        row.push(currentField.trim().replace(/^"|"$/g, '').replace(/""/g, '"'));

        // Expected columns: name,state,city,address,lattitude,longitude,type
        if (row.length < 7) continue;

        const name = row[0];
        const state = row[1];
        const city = row[2];
        const address = row[3];
        const latitude = parseFloat(row[4]);
        const longitude = parseFloat(row[5]);
        const rowType = row[6] ? row[6].toString().trim() : '';

        let type = 'AC Charger'; // Default
        const lowerName = name.toLowerCase();

        if (lowerName.includes('dc') || lowerName.includes('fast') || lowerName.includes('ccs') || lowerName.includes('chademo')) {
            type = 'DC Fast Charger';
        } else if (lowerName.includes('ac ') || lowerName.includes('ac charger')) {
            type = 'AC Charger';
        } else if (rowType && isNaN(parseFloat(rowType))) {
            // If original type specific string (not number), use it
            type = rowType;
        }
        // If rowType is a number (like 12.0), we ignore it unless we could map it.
        // But since we saw 12.0 for both AC and DC, we can't rely on it.
        // Name inference is safer.

        if (isNaN(latitude) || isNaN(longitude)) continue;

        stations.push({
            id: `csv_${i}`,
            name,
            state,
            city,
            address,
            latitude,
            longitude,
            type,
        });
    }
    return stations;
}

try {
    const csvContent = fs.readFileSync(csvFilePath, 'utf-8');
    const stations = parseCSV(csvContent);

    const fileContent = `import { EVStation } from '../types';

export const importedStations: EVStation[] = ${JSON.stringify(stations, null, 2)};
`;

    fs.writeFileSync(outputFilePath, fileContent);
    console.log(`Successfully imported ${stations.length} stations to ${outputFilePath}`);

} catch (error) {
    console.error('Error importing stations:', error);
    process.exit(1);
}

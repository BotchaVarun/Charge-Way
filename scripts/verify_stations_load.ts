
import { allStations } from '../lib/stations';

console.log(`Total stations loaded: ${allStations.length}`);

if (allStations.length < 1500) {
    console.error('Error: Station count is too low!');
    process.exit(1);
}

const sample = allStations.find(s => s.id.startsWith('csv_'));
if (!sample) {
    console.error('Error: No imported stations found!');
    process.exit(1);
}

console.log('Sample imported station:', sample);
console.log('Verification successful!');

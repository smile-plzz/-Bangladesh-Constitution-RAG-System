
import { setupDatabase } from './rag.js';

const DEFAULT_DATA_FILE = 'bdlaws.parquet';

async function run() {
    const argPath = process.argv[2];
    const dataFile = argPath || DEFAULT_DATA_FILE;
    console.log(`Setting up the database from: ${dataFile}`);
    await setupDatabase(dataFile);
    console.log('Database setup is complete.');
}

run();

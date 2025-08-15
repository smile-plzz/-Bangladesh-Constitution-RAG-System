
import { setupDatabase } from './rag.js';

const DATA_FILE = 'bdlaws.parquet';

async function run() {
    console.log('Setting up the database...');
    await setupDatabase(DATA_FILE);
    console.log('Database setup is complete.');
}

run();

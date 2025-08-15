
import { queryDatabase, prepareLLMPrompt, generateAnswer } from './rag.js';

async function run() {
    const args = process.argv.slice(2);
    const query = args.join(' ');

    if (!query) {
        console.error('Please provide a query.');
        process.exit(1);
    }

    console.log(`Querying for: "${query}"`);
    const results = await queryDatabase(query);

    if (results) {
        console.log('\nRetrieved documents:');
        console.log(results.documents);

        const prompt = prepareLLMPrompt(query, results);
        console.log('\n--- LLM Prompt ---');
        console.log(prompt);

        console.log('\n--- Generated Answer ---');
        const answer = await generateAnswer(prompt);
        console.log(answer);
    }
}

run();

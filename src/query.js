
import { queryDatabase, prepareLLMPrompt, composeStructuredAnswer } from './rag.js';

async function run() {
    const argv = process.argv.slice(2);
    const langArg = argv.find(a => a.startsWith('--lang='));
    const language = langArg ? langArg.split('=')[1] : 'en';
    const query = argv.filter(a => !a.startsWith('--lang=')).join(' ');

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

        console.log('\n--- Answer ---');
        const answer = composeStructuredAnswer(query, results, { maxProvisions: 6, language });
        console.log(answer);
    }
}

run();

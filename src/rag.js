import { pipeline } from '@xenova/transformers';
import { ChromaClient } from 'chromadb';
import fs from 'fs';

const DB_PATH = 'chroma_db';
const COLLECTION_NAME = 'constitution';

// 1. Initialize the pipeline for creating embeddings
const extractor = await pipeline('feature-extraction', 'Xenova/bge-small-en-v1.5');

// 2. Initialize ChromaDB client
const client = new ChromaClient({ path: DB_PATH });

// 3. Function to create and store embeddings

import { ParquetReader } from 'parquetjs-lite';

// ... (rest of the file is the same until setupDatabase)

// 3. Function to create and store embeddings
async function setupDatabase(filePath) {
    try {
        // Get or create the collection
        const collection = await client.getOrCreateCollection({ name: COLLECTION_NAME });

        // Create a ParquetReader for the file
        const reader = await ParquetReader.openFile(filePath);

        // Read the entire file
        const cursor = reader.getCursor();
        const records = [];
        let record = null;
        while (record = await cursor.next()) {
            records.push(record);
        }
        await reader.close();

        // Prepare documents and metadata
        const documents = records.map(record => record.text);
        const metadatas = records.map(record => ({
            doc_url: record.doc_url,
            doc_title: record.doc_title,
            headings: record.headings,
        }));
        const ids = records.map(record => record.chunk_id);

        // Generate embeddings
        const embeddings = [];
        for (const doc of documents) {
            const result = await extractor(doc, { pooling: 'mean', normalize: true });
            embeddings.push(Array.from(result.data));
        }

        // Add to the collection
        await collection.add({
            ids: ids,
            embeddings: embeddings,
            metadatas: metadatas,
            documents: documents
        });

        console.log('Database setup complete.');

    } catch (error) {
        console.error('Error setting up database:', error);
    }
}


// 4. Function to query the database
async function queryDatabase(queryText, nResults = 5) {
    try {
        const collection = await client.getCollection({ name: COLLECTION_NAME });

        // Generate embedding for the query
        const queryEmbedding = await extractor(queryText, { pooling: 'mean', normalize: true });

        // Query the collection
        const results = await collection.query({
            queryEmbeddings: [Array.from(queryEmbedding.data)],
            nResults: nResults,
        });

        return results;

    } catch (error) {
        console.error('Error querying database:', error);
        return null;
    }
}

// 5. Placeholder for preparing the LLM prompt
function prepareLLMPrompt(query, retrievedDocs) {
    const context = retrievedDocs.documents[0].map((doc, index) => {
        const metadata = retrievedDocs.metadatas[0][index];
        return `Source: ${metadata.doc_title} (${metadata.doc_url})\nHeadings: ${metadata.headings}\n\n${doc}`;
    }).join('\n\n---\n\n');

    const prompt = `
        You are a legal assistant providing information from the Constitution of Bangladesh.
        Answer the following question based ONLY on the provided context.
        If the answer is not in the context, say 'This is not covered by the Constitution text I have.'

        Context:
        ${context}

        Question: ${query}

        Answer:
    `;

    return prompt;
}


// 6. Function to generate an answer using a local LLM
async function generateAnswer(prompt) {
    try {
        const generator = await pipeline('text-generation', 'Xenova/distilgpt2');
        const result = await generator(prompt, {
            max_new_tokens: 100,
            no_repeat_ngram_size: 3,
            early_stopping: true,
            eos_token_id: 2
        });
        return result[0].generated_text.replace(prompt, '').trim();
    } catch (error) {
        console.error('Error generating answer:', error);
        return 'Error generating answer.';
    }
}

export { setupDatabase, queryDatabase, prepareLLMPrompt, generateAnswer };
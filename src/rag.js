import { pipeline } from '@xenova/transformers';
import { ChromaClient } from 'chromadb';
import fs from 'fs';
import crypto from 'crypto';

const DB_PATH = 'chroma_db';
const COLLECTION_NAME = 'constitution';

// 1. Initialize the pipeline for creating embeddings
const extractor = await pipeline('feature-extraction', 'Xenova/bge-small-en-v1.5');

// 2. Initialize ChromaDB client
// Use HTTP server (start with: `chroma run --path ./chroma_db`)
const client = new ChromaClient({ host: 'localhost', port: 8000, ssl: false });

// 3. Function to create and store embeddings

import parquet from 'parquetjs-lite';
const { ParquetReader } = parquet;

// ... (rest of the file is the same until setupDatabase)

// 3. Function to create and store embeddings
async function setupDatabase(filePath) {
    try {
        // Get or create the collection (disable default embedding function)
        const collection = await client.getOrCreateCollection({ name: COLLECTION_NAME, embeddingFunction: null });

        // Prepare a unified list of records regardless of source (Parquet or JSONL)
        let records = [];

        if (filePath.toLowerCase().endsWith('.parquet')) {
            // Create a ParquetReader for the file
            const reader = await ParquetReader.openFile(filePath);

            // Read the entire file
            const cursor = reader.getCursor();
            let record = null;
            while (record = await cursor.next()) {
                records.push(record);
            }
            await reader.close();
        } else if (filePath.toLowerCase().endsWith('.jsonl') || filePath.toLowerCase().endsWith('.json')) {
            // Load JSONL or JSON file and chunk to the same schema
            const raw = fs.readFileSync(filePath, 'utf-8');
            const lines = filePath.toLowerCase().endsWith('.jsonl') ? raw.split(/\r?\n/).filter(Boolean) : [raw];
            const docs = filePath.toLowerCase().endsWith('.jsonl')
                ? lines.map(line => JSON.parse(line))
                : JSON.parse(raw); // expect array or object with url/title/text

            const inputDocs = Array.isArray(docs) ? docs : [docs];

            // Chunking parameters similar to crawler
            const CHUNK_TOKENS = 800;
            const OVERLAP_TOKENS = 120;
            const step = Math.max(1, CHUNK_TOKENS - OVERLAP_TOKENS);

            for (const d of inputDocs) {
                const url = d.url || d.doc_url || '';
                const title = d.title || d.doc_title || '';
                const headingsArray = Array.isArray(d.headings) ? d.headings : (typeof d.headings === 'string' ? [d.headings] : []);
                const headingsJoined = headingsArray.join(' | ');
                const text = d.text || d.raw_text || '';
                if (!text) continue;

                const words = text.split(/\s+/);
                for (let i = 0; i < words.length; i += step) {
                    const chunkWords = words.slice(i, i + CHUNK_TOKENS);
                    const chunk = chunkWords.join(' ').trim();
                    if (!chunk) continue;
                    const chunk_id = crypto.createHash('md5').update(String(url) + String(i)).digest('hex').slice(0, 16);
                    records.push({
                        doc_url: url,
                        doc_title: title,
                        headings: headingsJoined,
                        chunk_id,
                        chunk_index: Math.floor(i / step),
                        text: chunk,
                    });
                }
            }
        } else {
            throw new Error(`Unsupported file type for setupDatabase: ${filePath}`);
        }

        if (!records.length) {
            console.warn('No records found to index.');
            return;
        }

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

// 5b. Deterministic extractive answer from retrieved context with citations
function answerFromContext(query, retrievedDocs, maxSentences = 5) {
    if (!retrievedDocs || !retrievedDocs.documents || !retrievedDocs.documents[0]) {
        return 'No context retrieved.';
    }
    const docs = retrievedDocs.documents[0];
    const metas = retrievedDocs.metadatas[0];

    const keywords = Array.from(new Set(String(query).toLowerCase().split(/[^a-zA-Z]+/).filter(w => w.length >= 4)));

    const seen = new Set();
    const sentences = [];

    const splitIntoSentences = (text) => {
        return String(text)
            .replace(/\s+/g, ' ')
            .split(/(?<=[\.\?!])\s+/)
            .map(s => s.trim())
            .filter(Boolean);
    };

    // Prefer sentences that include any keyword; keep order by retrieval rank then sentence order
    docs.forEach((doc, i) => {
        const meta = metas[i];
        const sents = splitIntoSentences(doc);
        for (const s of sents) {
            const lower = s.toLowerCase();
            const matches = keywords.length === 0 ? true : keywords.some(k => lower.includes(k));
            if (!matches) continue;
            const key = `${i}:${s}`;
            if (seen.has(key)) continue;
            seen.add(key);
            sentences.push({ text: s, meta });
        }
    });

    // Fallback: if nothing matched, take first sentence of top docs
    if (sentences.length === 0) {
        docs.forEach((doc, i) => {
            const meta = metas[i];
            const first = splitIntoSentences(doc)[0];
            if (first) sentences.push({ text: first, meta });
        });
    }

    const picked = sentences.slice(0, maxSentences);
    const bullets = picked.map(({ text, meta }) => `- ${text} (Source: ${meta.doc_title} - ${meta.doc_url})`);
    return bullets.join('\n');
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

export { setupDatabase, queryDatabase, prepareLLMPrompt, generateAnswer, answerFromContext };
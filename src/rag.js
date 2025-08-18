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
        // Merge leading article number line like "55." with the next sentence
        if (sents.length >= 2 && /^\d+\.$/.test(sents[0])) {
            sents[1] = `${sents[0]} ${sents[1]}`;
            sents.shift();
        }
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

    // Fallback: if nothing matched, take first sentence of top docs (after merge rule)
    if (sentences.length === 0) {
        docs.forEach((doc, i) => {
            const meta = metas[i];
            const sents = splitIntoSentences(doc);
            if (sents.length >= 2 && /^\d+\.$/.test(sents[0])) {
                sents[1] = `${sents[0]} ${sents[1]}`;
                sents.shift();
            }
            const first = sents[0];
            if (first) sentences.push({ text: first, meta });
        });
    }

    const picked = sentences.slice(0, maxSentences);
    const bullets = picked.map(({ text, meta }) => `- ${text} (Source: ${meta.doc_title} - ${meta.doc_url})`);
    return bullets.join('\n');
}

// 5c. Structured answer composer (Summary, Key provisions, Sources)
function composeStructuredAnswer(query, retrievedDocs, options = {}) {
    const maxProvisions = options.maxProvisions ?? 5;
    const language = options.language || 'en';

    const L = (key) => {
        if (language === 'bn') {
            switch (key) {
                case 'summary': return 'সারসংক্ষেপ';
                case 'keyProvisions': return 'প্রধান বিধানসমূহ';
                case 'sources': return 'সূত্র';
                case 'article': return 'অনুচ্ছেদ';
                default: return key;
            }
        }
        switch (key) {
            case 'summary': return 'Summary';
            case 'keyProvisions': return 'Key provisions';
            case 'sources': return 'Sources';
            case 'article': return 'Article';
            default: return key;
        }
    };

    if (!retrievedDocs || !retrievedDocs.documents || !retrievedDocs.documents[0]) {
        return language === 'bn' ? 'কোনও প্রাসঙ্গিক প্রসঙ্গ পাওয়া যায়নি।' : 'No context retrieved.';
    }
    const docs = retrievedDocs.documents[0];
    const metas = retrievedDocs.metadatas[0];

    const splitIntoSentences = (text) => String(text)
        .replace(/\s+/g, ' ')
        .split(/(?<=[\.\?!])\s+/)
        .map(s => s.trim())
        .filter(Boolean);

    const simplify = (s) => s
        .replace(/\(\d+\)/g, '') // remove clause markers like (1)
        .replace(/\s+/g, ' ')
        .trim();

    const extractArticle = (line) => {
        const m = String(line).match(/^\s*(\d+[A-Z]?)\./); // supports 73A.
        return m ? m[1] : null;
    };

    // Query expansion for relevance scoring
    const q = String(query).toLowerCase();
    const qTerms = new Set(q.split(/[^a-z]+/).filter(Boolean));
    const bonusTerms = new Set(['power', 'authority', 'executive', 'prime', 'minister', 'cabinet', 'dissolve', 'parliament']);

    const scoreSentence = (s) => {
        const t = s.toLowerCase();
        let score = 0;
        for (const term of qTerms) if (t.includes(term)) score += 2;
        for (const term of bonusTerms) if (t.includes(term)) score += 1;
        return score;
    };

    // Build candidate provisions with merged first sentence
    const provisions = [];
    for (let i = 0; i < docs.length; i++) {
        const text = docs[i];
        const meta = metas[i];
        const sents = splitIntoSentences(text);
        if (sents.length >= 2 && /^\d+\.$/.test(sents[0])) {
            sents[1] = `${sents[0]} ${sents[1]}`;
            sents.shift();
        }
        if (sents.length === 0) continue;
        const first = sents[0];
        const article = extractArticle(first);
        const clauseMatch = first.match(/\((\d+)\)/);
        const clause = clauseMatch ? clauseMatch[1] : null;
        const heading = (meta.headings || '').split(' | ')[0] || '';
        const summary = simplify(first);
        const score = scoreSentence(first);
        provisions.push({ article, clause, heading, summary, meta, score });
    }

    // Prioritize by score then by original order
    provisions.sort((a, b) => b.score - a.score);

    // Deduplicate by article+heading to keep best-scored per provision
    const seen = new Set();
    const unique = [];
    for (const p of provisions) {
        const key = `${p.article || ''}|${p.heading}`;
        if (seen.has(key)) continue;
        seen.add(key);
        unique.push(p);
    }

    // Summary: top 2 scored provisions as single sentences
    const summaryLines = unique.slice(0, 2).map(p => p.summary);

    const lines = [];
    if (summaryLines.length) {
        lines.push(`${L('summary')}:`);
        summaryLines.forEach(s => lines.push(`- ${s}`));
        lines.push('');
    }

    lines.push(`${L('keyProvisions')}:`);
    unique.slice(0, maxProvisions).forEach(p => {
        const art = p.article ? `${L('article')} ${p.article}` : `${L('article')}`;
        const clausePart = p.clause ? `(${p.clause})` : '';
        const head = p.heading ? ` — ${p.heading}` : '';
        lines.push(`- ${art}${clausePart}${head}: ${p.summary}`);
    });

    // Sources
    const sourcesSeen = new Set();
    const sources = [];
    for (const p of unique) {
        const srcKey = `${p.meta.doc_title}|${p.meta.doc_url}`;
        if (sourcesSeen.has(srcKey)) continue;
        sourcesSeen.add(srcKey);
        sources.push(`- ${p.meta.doc_title} (${p.meta.doc_url})`);
        if (sources.length >= 10) break;
    }
    if (sources.length) {
        lines.push('');
        lines.push(`${L('sources')}:`);
        lines.push(...sources);
    }

    return lines.join('\n');
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

export { setupDatabase, queryDatabase, prepareLLMPrompt, generateAnswer, answerFromContext, composeStructuredAnswer };
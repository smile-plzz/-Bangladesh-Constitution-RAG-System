import fs from 'fs';
import crypto from 'crypto';
import { ChromaClient } from 'chromadb';
import OpenAI from 'openai';

const DEFAULT_COLLECTION = process.env.CHROMA_COLLECTION || 'constitution_openai';
const CHROMA_URL = process.env.CHROMA_URL || 'http://localhost:8000';
const OPENAI_MODEL = process.env.OPENAI_EMBED_MODEL || 'text-embedding-3-small';

const client = new ChromaClient({ path: CHROMA_URL });
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

function parseJsonl(filePath) {
    const raw = fs.readFileSync(filePath, 'utf-8');
    return raw.split(/\r?\n/).filter(Boolean).map(line => JSON.parse(line));
}

function chunkRecord(rec) {
    const CHUNK_TOKENS = 800;
    const OVERLAP_TOKENS = 120;
    const step = Math.max(1, CHUNK_TOKENS - OVERLAP_TOKENS);

    const url = rec.url || rec.doc_url || '';
    const title = rec.title || rec.doc_title || '';
    const headingsArray = Array.isArray(rec.headings) ? rec.headings : (typeof rec.headings === 'string' ? [rec.headings] : []);
    const headings = headingsArray.join(' | ');
    const text = rec.text || rec.raw_text || '';
    const created_at = rec.created_at || null;
    const updated_at = rec.updated_at || null;
    const act_id = rec.act_id || null;
    const section_id = rec.section_id || null;
    if (!text) return [];

    const words = text.split(/\s+/);
    const chunks = [];
    for (let i = 0; i < words.length; i += step) {
        const chunkText = words.slice(i, i + CHUNK_TOKENS).join(' ').trim();
        if (!chunkText) continue;
        const chunk_id = crypto.createHash('md5').update(String(url) + String(i)).digest('hex').slice(0, 16);
        chunks.push({ chunk_id, text: chunkText, doc_url: url, doc_title: title, headings, created_at, updated_at, act_id, section_id });
    }
    return chunks;
}

async function embedBatch(texts) {
    const res = await openai.embeddings.create({ model: OPENAI_MODEL, input: texts });
    return res.data.map(d => d.embedding);
}

async function run() {
    const filePath = process.argv[2];
    if (!filePath) {
        console.error('Usage: node src/setup-db-openai.js <jsonl-file>');
        process.exit(1);
    }

    const recs = parseJsonl(filePath);
    const allChunks = recs.flatMap(chunkRecord);
    if (allChunks.length === 0) {
        console.log('No chunks to index.');
        return;
    }

    const collection = await client.getOrCreateCollection({ name: DEFAULT_COLLECTION, embeddingFunction: null });

    const BATCH = 64;
    for (let i = 0; i < allChunks.length; i += BATCH) {
        const batch = allChunks.slice(i, i + BATCH);
        const ids = batch.map(b => b.chunk_id);
        const documents = batch.map(b => b.text);
        const metadatas = batch.map(b => ({ doc_url: b.doc_url, doc_title: b.doc_title, headings: b.headings, created_at: b.created_at, updated_at: b.updated_at, act_id: b.act_id, section_id: b.section_id }));
        const embeddings = await embedBatch(documents);
        await collection.upsert({ ids, embeddings, metadatas, documents });
        console.log(`Indexed ${Math.min(i + BATCH, allChunks.length)} / ${allChunks.length}`);
    }

    console.log('OpenAI-indexed database setup complete.');
}

run().catch(err => {
    console.error('Error:', err?.message || err);
    process.exit(1);
});

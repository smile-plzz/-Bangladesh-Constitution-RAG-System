import { NextRequest } from 'next/server';
import { ChromaClient } from 'chromadb';
import OpenAI from 'openai';

const CHROMA_URL = process.env.CHROMA_URL!; // e.g., https://your-chroma-host
const CHROMA_COLLECTION = process.env.CHROMA_COLLECTION || 'constitution_openai';
const OPENAI_MODEL = process.env.OPENAI_EMBED_MODEL || 'text-embedding-3-small';

const client = new ChromaClient({ path: CHROMA_URL });
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

function splitSentences(text: string): string[] {
	return String(text)
		.replace(/\s+/g, ' ')
		.split(/(?<=[\.\?!])\s+/)
		.map(s => s.trim())
		.filter(Boolean)
		.filter(s => !/^\[+.*\]+$/.test(s) && s !== '[***]' && !/\[OMITTED\]/i.test(s));
}

function buildStructuredAnswer(query: string, results: any, language: 'en' | 'bn' = 'en') {
	const L = (k: string) => {
		const bn: Record<string, string> = { summary: 'সারসংক্ষেপ', keyProvisions: 'প্রধান বিধানসমূহ', sources: 'সূত্র', article: 'অনুচ্ছেদ' };
		const en: Record<string, string> = { summary: 'Summary', keyProvisions: 'Key provisions', sources: 'Sources', article: 'Article' };
		return language === 'bn' ? (bn[k] || k) : (en[k] || k);
	};
	if (!results?.documents?.[0]) {
		return { summary: language === 'bn' ? 'কোনও প্রাসঙ্গিক প্রসঙ্গ পাওয়া যায়নি।' : 'No context retrieved.', provisions: [], sources: [], labels: { summary: L('summary'), keyProvisions: L('keyProvisions'), sources: L('sources'), article: L('article') } };
	}
	const docs = results.documents[0] as string[];
	const metas = results.metadatas[0] as any[];
	const dists: number[] = (results.distances?.[0] as number[] | undefined) || [];

	const extractArticle = (line: string) => {
		const m = String(line).match(/^\s*(\d+[A-Z]?)\./);
		return m ? m[1] : null;
	};

	const qTerms = new Set(query.toLowerCase().split(/[^\p{L}]+/u).filter(Boolean));
	const bonus = new Set(['power','authority','executive','prime','minister','cabinet','দায়িত্ব','ক্ষমতা','প্রধানমন্ত্রী','ক্যাবিনেট','পার্লামেন্ট','দিসলভ','ভোট']);
	const score = (s: string) => { const t = s.toLowerCase(); let sc = 0; for (const term of qTerms) if (t.includes(term)) sc += 2; for (const b of bonus) if (t.includes(b)) sc += 1; return sc; };

	type P = { article: string|null, clause: string|null, heading: string, summary: string, source: { title: string, url: string }, updatedTs: number, createdTs: number, score: number, distance?: number };
	const provisions: P[] = [];
	for (let i = 0; i < docs.length; i++) {
		const sents = splitSentences(docs[i]);
		if (sents.length >= 2 && /^\d+\.$/.test(sents[0])) { sents[1] = `${sents[0]} ${sents[1]}`; sents.shift(); }
		if (!sents.length) continue;
		const first = sents[0];
		const article = extractArticle(first);
		const clauseMatch = first.match(/\((\d+)\)/);
		const clause = clauseMatch ? clauseMatch[1] : null;
		const heading = (metas[i].headings || '').split(' | ')[0] || '';
		const summary = first.replace(/\(\d+\)/g, '').replace(/\s+/g,' ').trim();
		const updatedTs = metas[i].updated_at ? Date.parse(metas[i].updated_at) : 0;
		const createdTs = metas[i].created_at ? Date.parse(metas[i].created_at) : 0;
		const distance = typeof dists[i] === 'number' ? dists[i] : undefined;
		provisions.push({ article, clause, heading, summary, source: { title: metas[i].doc_title, url: metas[i].doc_url }, updatedTs, createdTs, score: score(first), distance });
	}

	// Filter by distance threshold if distances available (smaller is better for cosine)
	const withDist = provisions.filter(p => typeof p.distance === 'number');
	if (withDist.length) {
		withDist.sort((a,b) => (a.distance! - b.distance!));
		const topDist = withDist[0].distance!;
		const THRESH = topDist + 0.15; // adaptive band
		provisions.splice(0, provisions.length, ...provisions.filter(p => (typeof p.distance !== 'number') || (p.distance! <= THRESH)));
	}

	provisions.sort((a,b) => (b.updatedTs-a.updatedTs) || (b.createdTs-a.createdTs) || (b.score-a.score));
	const seen = new Set<string>();
	const unique: P[] = [];
	for (const p of provisions) { const key = `${p.article||''}|${p.heading}`; if (seen.has(key)) continue; seen.add(key); unique.push(p); }

	const summary = unique.length ? unique[0].summary : (language === 'bn' ? 'কোনও প্রাসঙ্গিক প্রসঙ্গ পাওয়া যায়নি।' : 'No context retrieved.');
	const provisionsOut = unique.slice(0,3).map(p => ({ article: p.article, clause: p.clause, heading: p.heading, summary: p.summary, source: p.source, distance: p.distance }));
	const sSeen = new Set<string>();
	const sources = [] as { title: string, url: string }[];
	for (const p of unique) { const k = `${p.source.title}|${p.source.url}`; if (sSeen.has(k)) continue; sSeen.add(k); sources.push(p.source); if (sources.length>=5) break; }

	return { summary, provisions: provisionsOut, sources, labels: { summary: L('summary'), keyProvisions: L('keyProvisions'), sources: L('sources'), article: L('article') } };
}

export const runtime = 'nodejs';
export async function POST(req: NextRequest) {
	try {
		const { question, lang, maxProvisions } = await req.json();
		const q = (question || '').toString().trim();
		if (!q) return new Response(JSON.stringify({ error: 'Missing question' }), { status: 400 });
		if (q.length > 500) return new Response(JSON.stringify({ error: 'Question too long' }), { status: 400 });

		if (!process.env.OPENAI_API_KEY || !process.env.CHROMA_URL) {
			return new Response(JSON.stringify({ error: 'Server not configured' }), { status: 503 });
		}

		const collection = await client.getCollection({ name: CHROMA_COLLECTION });
		const embed = await openai.embeddings.create({ model: OPENAI_MODEL, input: q });
		const queryEmbedding = embed.data[0].embedding;
		const results = await collection.query({ queryEmbeddings: [queryEmbedding], nResults: 12, where: { act_id: 406 }, include: ["documents","metadatas","distances"] as any });

		const structured = buildStructuredAnswer(q, results, (lang === 'bn' ? 'bn' : 'en'));
		if (typeof maxProvisions === 'number' && structured.provisions.length > maxProvisions) {
			structured.provisions = structured.provisions.slice(0, maxProvisions);
		}
		return new Response(JSON.stringify(structured), { status: 200, headers: { 'content-type': 'application/json' } });
	} catch (e: any) {
		return new Response(JSON.stringify({ error: e?.message || 'Server error' }), { status: 500, headers: { 'content-type': 'application/json' } });
	}
}

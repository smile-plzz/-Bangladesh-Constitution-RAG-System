# Developer Guide

## Local Development

- Install dependencies:
```
npm install
```
- Start Chroma locally (optional; for local end-to-end testing):
```
npm run start:chroma
```
- Set local envs (PowerShell example):
```
$env:OPENAI_API_KEY="sk-..."
$env:CHROMA_URL="http://localhost:8000"
$env:CHROMA_COLLECTION="constitution_openai"
```
- Start Next.js dev server:
```
npm run dev
```

## Indexing

- Fetch data from API:
```
node src/fetch-constitution.js
```
- Build index with OpenAI embeddings:
```
node src/setup-db-openai.js bdlaws_constitution_406.jsonl
```
- Test query via UI or API:
```
curl -s -X POST http://localhost:3000/api/query -H "content-type: application/json" -d '{"question":"What is the supreme law of the Republic?","lang":"en"}'
```

## Scripts

- `npm run dev|build|start` — Next.js app
- `npm run start:chroma` — start local Chroma (Docker or Python CLI)
- `npm run health` — check Chroma heartbeat
- `npm run fetch:constitution` — fetch JSONL via API
- `npm run build:db:openai` — index JSONL into Chroma via OpenAI embeddings

## Code Structure

- `app/` — Next.js App Router frontend and API route
- `src/` — data scripts and local RAG pipeline (Node)
- `scripts/` — helper PowerShell scripts
- `docs/` — documentation

## Conventions

- Use English for code and comments; Bangla only for labels and UI text when required
- Prefer structured JSON from APIs; UI renders presentation
- Keep the same embedding model for indexing and querying

## Troubleshooting

- 500 on `/api/query`: check envs and Chroma reachability; try `npm run health`
- OpenAI 429: reduce batch size, add delays, or upgrade plan
- Build error about `@chroma-core/default-embed`: ensured alias in `next.config.mjs`

# Deployment Guide

This document explains how to deploy the Bangladesh Constitution RAG to production using Vercel for the web/API and an external Chroma server for the vector database.

## Overview

- UI + API: Vercel (Next.js App Router)
- Vector DB: Chroma server (Chroma Cloud or your own VM/Docker)
- Embeddings: OpenAI at query-time and for indexing (consistent model recommended)

## Prerequisites

- A running Chroma server exposed via HTTP (e.g., `https://your-chroma-host:8000`)
- An OpenAI API key with access to embeddings (e.g., `text-embedding-3-small`)
- Indexed corpus in Chroma (see Indexing section)

## Environment Variables

Set these in Vercel Project Settings → Environment Variables:

- `CHROMA_URL` (e.g., `https://your-chroma-host:8000`)
- `CHROMA_COLLECTION` (e.g., `constitution_openai`)
- `OPENAI_API_KEY` (your OpenAI key)
- `OPENAI_EMBED_MODEL` (optional, default `text-embedding-3-small`)

## Indexing the Corpus

Indexing is performed off-platform (local or CI) against your Chroma server.

1. Ensure your Chroma server is reachable from your network.
2. Prepare the JSONL corpus (e.g., `bdlaws_constitution_406.jsonl`).
3. Set environment vars locally:

```
# PowerShell example
$env:OPENAI_API_KEY="sk-..."
$env:CHROMA_URL="https://your-chroma-host:8000"
$env:CHROMA_COLLECTION="constitution_openai"
```

4. Run the indexer:

```
node src/setup-db-openai.js bdlaws_constitution_406.jsonl
```

Tips:
- To test on a subset:
```
Get-Content bdlaws_constitution_406.jsonl -TotalCount 50 | Set-Content sample.jsonl
node src/setup-db-openai.js sample.jsonl
```
- If you hit OpenAI 429 quota limits, reduce batch size and add delay between batches; or upgrade plan.

## Vercel Deployment

1. Connect the repository to Vercel.
2. Ensure `next.config.mjs` exists and project builds locally: `npm run build`.
3. Configure env vars in Vercel as above.
4. Deploy.

### Post-Deploy Verification

- Open the site and ask a question.
- The API route is `POST /api/query` with JSON `{ "question": "...", "lang": "en" | "bn" }`.
- If responses are empty, verify:
  - Chroma reachable from Vercel (network, CORS not required for server-to-server).
  - Collection exists and contains embeddings for the chosen model.
  - OPENAI_API_KEY is set and working.

## Troubleshooting

- 500 from `/api/query`:
  - Missing env vars or Chroma unreachable.
  - Use `curl -i -X POST ...` and inspect the error JSON.
- `@chroma-core/default-embed` module error during build:
  - We stubbed it in `next.config.mjs` via alias; ensure that file is present.
- Local dev: favicon 404 is harmless; add `public/favicon.ico` to silence.

## Notes

- We do not run Chroma inside Vercel. Use Chroma Cloud or a managed VM.
- Keep the same embedding model for indexing and query-time to avoid vector mismatch.
- The API includes recency sorting and an adaptive relevance threshold for better answers.

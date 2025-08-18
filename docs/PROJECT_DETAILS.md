
<!-- Gemini Directive: This file should be kept up-to-date with the project's progress. -->

> **Note:** For the current development plan and task list, see `docs/TASK_LIST.md`.

# Project Details

This document provides a detailed overview of the Bangladesh Constitution Q&A System.

## 1. Project Overview

The goal of this project is to create a reliable and accurate question-answering system for the Constitution of Bangladesh. It uses a Retrieval-Augmented Generation (RAG) architecture, which combines the power of a large language model (LLM) with a specific knowledge base.

### Architecture

The system is composed of two main parts:

1.  **Data Pipeline (Python or API):**
    - Python-based crawler (`crawl_bdlaws.py`) that fetches and chunks content from `https://bd-laws.pages.dev/`.
    - API-based fetchers (`src/fetch-constitution.js`, `src/fetch-sections.js`) that pull sections from `https://bd-laws-api.bdit.community/api` and emit JSONL.
2.  **RAG Pipeline (Node.js):**
    - Generates embeddings locally, stores vectors in Chroma, retrieves the most relevant chunks, and prepares a strict, citation-oriented prompt.

## 2. Data Pipeline

You can use either the Python crawler or the API fetchers.

- JSONL record fields now include `created_at`, `updated_at`, `act_id`, `section_id` for recency-aware answers.

## 3. RAG Pipeline

### Key Components

- **`src/rag.js`:**
  - **Embedding Model:** `Xenova/bge-m3` (multilingual) via `@xenova/transformers`.
  - **Vector Database:** Chroma over HTTP (collection: `constitution_m3`).
  - **Indexing:** Batched embeddings (64 docs/batch) and `upsert` to reduce memory and allow incremental rebuilds.
  - **Query:** Returns up to 8 nearest chunks.
  - **Answer composition:** Structured, concise output with Summary, Key provisions and Sources. Supports Bangla labels via `--lang=bn`. Filters noisy `[***]`/`[OMITTED]` lines.
- **`src/setup-db.js`:** Reads Parquet/JSONL, builds embeddings and upserts to Chroma (batched).
- **`src/query.js`:** CLI to retrieve and print a structured answer. Accepts `--lang=bn`.
- **Scripts:**
  - `scripts/start-chroma.ps1`: Windows helper to start Chroma (Docker or Python CLI).
  - `scripts/healthcheck.ps1`: Check server heartbeat.

### How it Works

1. Start a Chroma HTTP server (`npm run start:chroma`) on `http://localhost:8000`.
2. Acquire data (crawler or API) → JSONL with date metadata.
3. `setup-db.js` chunks (if JSONL), batches embeddings, and upserts into Chroma.
4. `query.js` embeds the query, retrieves nearest chunks, and prints a concise, date-sorted structured answer.

## 4. How to Use

1. `npm install`
2. Start Chroma: `npm run start:chroma` (new terminal)
3. Healthcheck: `npm run health` (expect `200`)
4. Fetch data: `node src/fetch-constitution.js`
5. Build DB: `npm run build:db` (or `node src/setup-db.js <your JSONL>`)
6. Query: `npm run ask` or `npm run ask:bn`

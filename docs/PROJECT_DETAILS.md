
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

The data pipeline is responsible for acquiring and processing the constitution text. You can use either the Python crawler or the API fetchers.

### Python Crawler: `crawl_bdlaws.py`

- **Purpose:** Crawl `https://bd-laws.pages.dev/` and extract the full text.
- **Technology:** Python, Playwright, BeautifulSoup, pandas.
- **Process:**
    1. Recursively crawl and extract main content.
    2. Clean and chunk text (≈800 tokens with overlap).
    3. Emit `bdlaws.jsonl` and `bdlaws.parquet`.
- **Schema (`bdlaws.parquet`):**
    - `doc_url` (string): The source URL of the document.
    - `doc_title` (string): The title of the document.
    - `headings` (string): The headings from the document, joined by " | ".
    - `chunk_id` (string): A unique ID for each text chunk.
    - `chunk_index` (integer): The index of the chunk within the document.
    - `text` (string): The text chunk.

### API Fetchers: `src/fetch-constitution.js`, `src/fetch-sections.js`

- **Purpose:** Pull sections for the Constitution (or any act) directly from the API and emit JSONL compatible with the RAG pipeline.
- **Schema (JSONL records):**
    - `url` (string): API URL for the section with an anchor.
    - `title` (string): Human-readable title, e.g., `Act <id> - <section name>`.
    - `headings` (array of strings): Section name.
    - `text` (string): Section description/content.
- **Ingestion:** JSONL is chunked on-the-fly inside `src/rag.js` to the same effective chunking as Parquet.

## 3. RAG Pipeline

The RAG pipeline is the core of the Q&A system. It uses the data from `bdlaws.parquet` or JSONL files to answer questions.

### Key Components

- **`src/rag.js`:** The main file containing the RAG logic.
    - **Embedding Model:** `Xenova/bge-small-en-v1.5` via `@xenova/transformers`.
    - **Vector Database:** Chroma over HTTP (requires running a local server) with the collection name `constitution`.
    - **LLM:** Local text generation model (`Xenova/distilgpt2`) to produce the final answer.
    - **Strictness:** The prompt instructs the model to answer only from provided context; if not covered, it must say so.
- **`src/setup-db.js`:** CLI to read Parquet or JSONL, embed, and populate Chroma.
- **`src/query.js`:** CLI to retrieve, build the prompt, and generate an answer.
- **`src/fetch-constitution.js` / `src/fetch-sections.js`:** Data acquisition via API.

### How it Works

1. Start a Chroma HTTP server (Docker or Python CLI) on `http://localhost:8000`.
2. Acquire data (crawler or API) → produce `bdlaws.parquet` or JSONL.
3. `setup-db.js` reads records, chunks (if JSONL), embeds with `@xenova/transformers`, and upserts into Chroma.
4. `query.js` embeds the user query, retrieves nearest chunks, constructs a strict prompt with inline sources, and generates an answer.

## 4. How to Use

1. Acquire the data (crawler or API).
2. `npm install`.
3. Start Chroma server:
   - Docker: `docker run -p 8000:8000 chromadb/chroma`
   - Python: `chroma run --path ./chroma_db`
4. Build DB: `node src/setup-db.js <your .parquet | .jsonl>`
5. Query: `node src/query.js "Your question here"`

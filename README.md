<!-- Gemini Directive: This file should be kept up-to-date with the project's progress. -->

# Constitution of Bangladesh - Q&A System

This project aims to build a question-answering system for the Constitution of Bangladesh using a Retrieval-Augmented Generation (RAG) approach.

## Project Structure

- `crawl_bdlaws.py`: A Python script that crawls the `bd-laws.pages.dev` website and extracts the constitution text.
- `bdlaws.jsonl`: The raw, line-delimited JSON output from the crawler.
- `bdlaws.parquet`: The final, chunked, and processed data ready for the RAG pipeline.
- `src/`: Contains the Node.js-based RAG pipeline.
  - `rag.js`: The core RAG logic, including embedding generation (multilingual), querying and answer composition.
  - `setup-db.js`: A script to set up the vector database (batched upserts).
  - `query.js`: A script to query the RAG system (supports `--lang=bn`).
  - `fetch-sections.js`: Fetch sections for a given act (e.g., `/sections/383`) and write JSONL.
  - `fetch-constitution.js`: Discover the Constitution act via API and write all its sections as JSONL.
- `scripts/`: Helper scripts
  - `start-chroma.ps1`: Start a local Chroma server (Docker or Python CLI).
  - `healthcheck.ps1`: Check the server heartbeat.
- `data/`: Directory for storing data.

## Data Acquisition

You can acquire data via either the Python crawler or the API.

**Option A: Python Crawler (`https://bd-laws.pages.dev/`)**

```
pip install playwright beautifulsoup4 pandas tqdm lxml aiohttp
playwright install
python crawl_bdlaws.py
```

This produces `bdlaws.jsonl` and `bdlaws.parquet`.

**Option B: API (`https://bd-laws-api.bdit.community/api`)**

- Fetch Constitution automatically:
```
node src/fetch-constitution.js
```
- Or fetch a specific act’s sections (e.g., 383):
```
node src/fetch-sections.js https://bd-laws-api.bdit.community/api/sections/383
```
This produces a JSONL file like `bdlaws_constitution_<ACT_ID>.jsonl` or `bdlaws_sections_383.jsonl` including `created_at`/`updated_at`.

## RAG Pipeline

- Embeddings: `Xenova/bge-m3` (multilingual) via `@xenova/transformers`.
- Vector DB: Chroma HTTP server (collection: `constitution_m3`).
- Indexing: Batched embeddings (64) and upserts for efficiency.
- Answering: Concise structured output (Summary, Key provisions, Sources) with Bangla labels via `--lang=bn`.

### Quickstart

1) Install deps
```
npm install
```

2) Start Chroma server (new terminal)
```
npm run start:chroma
# healthcheck
npm run health   # expect 200
```

3) Fetch data
```
node src/fetch-constitution.js
```

4) Build the DB
```
npm run build:db
# or: node src/setup-db.js bdlaws_constitution_<ACT_ID>.jsonl
```

5) Ask questions
```
npm run ask
npm run ask:bn
```

## Documentation

- **`docs/PROJECT_DETAILS.md`**: Architecture, data pipeline, RAG details.
- **`docs/DEVELOPMENT_LOG.md`**: Development history.

## Project Management

- See `docs/TASK_LIST.md` for plan and tasks.
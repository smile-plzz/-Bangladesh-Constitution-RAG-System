<!-- Gemini Directive: This file should be kept up-to-date with the project's progress. -->

# Constitution of Bangladesh - Q&A System

This project aims to build a question-answering system for the Constitution of Bangladesh using a Retrieval-Augmented Generation (RAG) approach.

## Project Structure

- `crawl_bdlaws.py`: A Python script that crawls the `bd-laws.pages.dev` website and extracts the constitution text.
- `bdlaws.jsonl`: The raw, line-delimited JSON output from the crawler.
- `bdlaws.parquet`: The final, chunked, and processed data ready for the RAG pipeline.
- `src/`: Contains the Node.js-based RAG pipeline.
  - `rag.js`: The core RAG logic, including embedding generation and querying.
  - `setup-db.js`: A script to set up the vector database.
  - `query.js`: A script to query the RAG system.
  - `fetch-sections.js`: Fetch sections for a given act (e.g., `/sections/383`) and write JSONL.
  - `fetch-constitution.js`: Discover the Constitution act via API and write all its sections as JSONL.
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
This produces a JSONL file like `bdlaws_constitution_<ACT_ID>.jsonl` or `bdlaws_sections_383.jsonl`.

## RAG Pipeline

Once the data has been acquired, use the Node.js-based RAG pipeline to ask questions. The vector store uses a Chroma HTTP server.

**1. Install Node.js Dependencies:**

```
npm install
```

**2. Start Chroma Server (required):**

- Docker:
```
docker run -p 8000:8000 chromadb/chroma
```
- Or Python:
```
pip install chromadb
chroma run --path ./chroma_db
# or: python -m chromadb run --path ./chroma_db
```

**3. Set up the Database:**

- From Parquet:
```
node src/setup-db.js bdlaws.parquet
```
- From JSONL (API output or crawler output):
```
node src/setup-db.js bdlaws_constitution_<ACT_ID>.jsonl
# or
node src/setup-db.js bdlaws_sections_383.jsonl
```

**4. Query the System:**

```
node src/query.js "Your question about the constitution"
```

## Documentation

For a more detailed explanation of the project, see the following documents:

- **`docs/PROJECT_DETAILS.md`**: A detailed overview of the project architecture, data pipeline, and RAG pipeline.
- **`docs/DEVELOPMENT_LOG.md`**: A log of the development process.

## Project Management

For the current development plan and task list, see `docs/TASK_LIST.md`.
<!-- Gemini Directive: This file should be kept up-to-date with the project's progress. -->

# Project Task List

This document outlines the current development plan and tracks the progress of the project.

## Phase 1: Finalize the Data and Core Engine

- [x] **Add API Fetchers**: Implement `src/fetch-constitution.js` and `src/fetch-sections.js` to acquire data from the API.
- [x] **Support JSONL Ingestion**: Enhance `src/rag.js` to accept `.jsonl`/`.json` input and chunk on-the-fly.
- [x] **Chroma HTTP Client**: Update RAG to connect to a Chroma server via host/port and disable default EF.
- [x] **Batched Upserts**: Batch embeddings and use `upsert` for efficient indexing.
- [ ] **Build the Production Database**: Start Chroma and run `node src/setup-db.js <your JSONL/Parquet>`.
- [ ] **Test the Engine**: Run a few test queries from the command line (`node src/query.js "..."`).

## Phase 2: Build a Web Interface

- [ ] **Create a Simple API**: Create an Express.js or Next.js API (Vercel) that proxies retrieval and generation.
- [ ] **Develop the Frontend**: Build a user-friendly web interface using `index.html` as a starting point.

## Phase 3: Deployment

- [ ] **Chroma Hosting**: Configure Chroma Cloud or a managed VM/Docker endpoint; set `CHROMA_URL`.
- [ ] **Vercel API**: Deploy `api/query.ts` to Vercel with `OPENAI_API_KEY`, `CHROMA_URL`, `CHROMA_COLLECTION`.
- [ ] **CI Indexing**: Add a GitHub Action to run `src/setup-db-openai.js` against the hosted Chroma on demand.
- [ ] **Frontend on Vercel**: Hook up the UI to call the `/api/query` route.

## Future Development

- [ ] **Integrate DVC**: Integrate Data Version Control (DVC) to manage the dataset. See `docs/FUTURE_DEVELOPMENT.md` for more details.
- [ ] **Relevance Thresholding**: Add a similarity threshold and refuse to answer when context is too weak.
- [ ] **Citations**: Return source URLs and titles alongside answers in the API/UI.
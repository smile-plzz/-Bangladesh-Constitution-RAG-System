<!-- Gemini Directive: This file should be kept up-to-date with the project's progress. -->

# Project Task List

This document outlines the current development plan and tracks the progress of the project.

## Phase 1: Finalize the Data and Core Engine

- [x] **Add API Fetchers**: Implement `src/fetch-constitution.js` and `src/fetch-sections.js` to acquire data from the API.
- [x] **Support JSONL Ingestion**: Enhance `src/rag.js` to accept `.jsonl`/`.json` input and chunk on-the-fly.
- [x] **Chroma HTTP Client**: Update RAG to connect to a Chroma server via host/port and disable default EF.
- [ ] **Run the Crawler (optional)**: Generate `bdlaws.parquet` using `crawl_bdlaws.py`.
- [ ] **Build the Production Database**: Start Chroma and run `node src/setup-db.js <your JSONL/Parquet>`.
- [ ] **Test the Engine**: Run a few test queries from the command line (`node src/query.js "..."`).

## Phase 2: Build a Web Interface

- [ ] **Create a Simple API**: Create an Express.js API that proxies retrieval and generation.
- [ ] **Develop the Frontend**: Build a user-friendly web interface using `index.html` as a starting point.

## Phase 3: Deployment (Future)

- [ ] **Deploy the Application**: Deploy the web application and Chroma server to a cloud service.

## Future Development

- [ ] **Integrate DVC**: Integrate Data Version Control (DVC) to manage the dataset. See `docs/FUTURE_DEVELOPMENT.md` for more details.
- [ ] **Relevance Thresholding**: Add a similarity threshold and refuse to answer when context is too weak.
- [ ] **Citations**: Return source URLs and titles alongside answers in the API/UI.
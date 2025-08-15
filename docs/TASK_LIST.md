<!-- Gemini Directive: This file should be kept up-to-date with the project's progress. -->

# Project Task List

This document outlines the current development plan and tracks the progress of the project.

## Phase 1: Finalize the Data and Core Engine

- [ ] **Run the Crawler**: Run the `crawl_bdlaws.py` script to generate the final `bdlaws.parquet` file.
- [ ] **Build the Production Database**: Run `node src/setup-db.js` to create the final vector database from the full dataset.
- [ ] **Test the Engine**: Run a few test queries from the command line (`node src/query.js "..."`) to ensure the RAG engine is working as expected with the full dataset.

## Phase 2: Build a Web Interface

- [ ] **Create a Simple API**: Create a simple API (e.g., using Express.js) to expose the RAG pipeline to the web.
- [ ] **Develop the Frontend**: Build a user-friendly web interface using `index.html` as a starting point.

## Phase 3: Deployment (Future)

- [ ] **Deploy the Application**: Deploy the web application to a cloud service to make it publicly accessible.

## Future Development

- [ ] **Integrate DVC**: Integrate Data Version Control (DVC) to manage the dataset. See `docs/FUTURE_DEVELOPMENT.md` for more details.

# Development Log

This log tracks the development process of the Bangladesh Constitution Q&A System.

## 2025-08-15

- **Project Initialization & Initial Exploration:**
    - The project was initialized with a basic structure, including a `README.md`, `package.json`, and some initial data files (`constitution_text.html`, `constitution_volume_15.html`).
    - The initial idea was to use a Node.js-based scraper (`src/scraper.js`) to parse the constitution text.
    - The `Concept .txt` file was created, outlining the core RAG approach for the project.

- **Challenges with Data Acquisition:**
    - The initial web scraping approach with Node.js proved to be challenging due to the dynamic nature of the source websites.
    - An alternative API (`https://bd-laws-api.bdit.community/api`) was investigated, but it was found to be undocumented and difficult to use.

- **Shift to Python-based Crawler:**
    - A new data acquisition strategy was adopted using a Python-based crawler (`crawl_bdlaws.py`) with Playwright and BeautifulSoup.
    - This approach proved to be more robust and successful in extracting the data from `https://bd-laws.pages.dev/`.

- **Building the RAG Pipeline (Node.js):**
    - While the data acquisition was being worked on, the core RAG pipeline was built in Node.js.
    - Key components created:
        - `src/rag.js`: The core RAG logic, including functions for setting up the database, querying, and preparing the LLM prompt.
        - `src/setup-db.js`: A script to initialize the ChromaDB vector database.
        - `src/query.js`: A script to query the RAG system from the command line.
    - Dependencies added: `@xenova/transformers` for local embeddings, `chromadb` for the vector store, and `parquetjs-lite` to read the data from the Python crawler.

- **Module System Issues and Resolution:**
    - Encountered and resolved issues with the Node.js module system, transitioning the project from CommonJS to ES Modules to support the required libraries.
    - This involved updating `package.json` and converting all `require` statements to `import` statements.

- **Documentation:**
    - The `README.md` was updated to reflect the new Python-based data pipeline.
    - This development log and a more detailed project description were created to provide better context for future development.

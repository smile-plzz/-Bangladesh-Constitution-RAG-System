
<!-- Gemini Directive: This file should be kept up-to-date with the project's progress. -->

> **Note:** For the current development plan and task list, see `docs/TASK_LIST.md`.

# Project Details

This document provides a detailed overview of the Bangladesh Constitution Q&A System.

## 1. Project Overview

The goal of this project is to create a reliable and accurate question-answering system for the Constitution of Bangladesh. It uses a Retrieval-Augmented Generation (RAG) architecture, which combines the power of a large language model (LLM) with a specific knowledge base.

### Architecture

The system is composed of two main parts:

1.  **Data Pipeline (Python):** A Python-based crawler that fetches the constitution text from the web, processes it, and stores it in a structured format.
2.  **RAG Pipeline (Node.js):** A Node.js application that uses the processed data to answer user questions.

## 2. Data Pipeline

The data pipeline is responsible for acquiring and processing the constitution text. It consists of a single Python script: `crawl_bdlaws.py`.

### `crawl_bdlaws.py`

- **Purpose:** To crawl the `https://bd-laws.pages.dev/` website and extract the full text of the Bangladesh Constitution.
- **Technology:** Python, Playwright, BeautifulSoup, pandas.
- **Process:**
    1.  The script starts at the `START_URL` and recursively crawls all same-site links.
    2.  For each page, it extracts the main text content and its headings.
    3.  The extracted data is saved to `bdlaws.jsonl`.
    4.  The text is then chunked into smaller pieces and saved to `bdlaws.parquet`, which is the final output used by the RAG pipeline.
- **Schema (`bdlaws.parquet`):**
    - `doc_url` (string): The source URL of the document.
    - `doc_title` (string): The title of the document.
    - `headings` (string): The headings from the document, joined by " | ".
    - `chunk_id` (string): A unique ID for each text chunk.
    - `chunk_index` (integer): The index of the chunk within the document.
    - `text` (string): The text chunk.

## 3. RAG Pipeline

The RAG pipeline is the core of the Q&A system. It uses the data from the `bdlaws.parquet` file to answer questions.

### Key Components

- **`src/rag.js`:** The main file containing the RAG logic.
    - **Embedding Model:** Uses the `Xenova/bge-small-en-v1.5` model from `@xenova/transformers` to generate vector embeddings for the text chunks.
    - **Vector Database:** Uses `ChromaDB` to store the vector embeddings and perform similarity searches.
    - **LLM:** Uses a local text generation model (`Xenova/distilgpt2`) to generate the final answer.
- **`src/setup-db.js`:** A script to read the `bdlaws.parquet` file, generate embeddings, and populate the ChromaDB database.
- **`src/query.js`:** A command-line interface to ask questions to the system.

### How it Works

1.  When the user asks a question, the `query.js` script generates an embedding for the query.
2.  It then queries the ChromaDB database to find the most similar text chunks from the constitution.
3.  The retrieved text chunks are then used to construct a detailed prompt for the LLM.
4.  The LLM generates an answer based *only* on the provided context from the constitution.

## 4. How to Use

1.  **Acquire the Data:**
    - Install Python dependencies: `pip install playwright beautifulsoup4 pandas tqdm lxml`
    - Install Playwright browsers: `playwright install`
    - Run the crawler: `python crawl_bdlaws.py`

2.  **Run the RAG Pipeline:**
    - Install Node.js dependencies: `npm install`
    - Set up the database: `node src/setup-db.js`
    - Ask a question: `node src/query.js "Your question here"`

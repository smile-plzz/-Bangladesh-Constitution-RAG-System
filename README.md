# Constitution of Bangladesh - Q&A System (Work in Progress)

This project aims to build a question-answering system for the Constitution of Bangladesh using a Retrieval-Augmented Generation (RAG) approach.

## Current Status

This project is currently in development. The web scraping phase has been challenging due to the dynamic nature of the target websites. We have decided to proceed with a manual data acquisition step for the initial text of the Constitution.

## Project Structure

- `src/scraper.js`: A script designed to parse the manually provided constitution text into a structured JSON format. Currently contains placeholder parsing logic.
- `data/`: Directory to store the raw text (`constitution.txt`) and the parsed JSON data (`constitution.json`).
- `docs/`: Directory for documentation.
- `project-spec.json`: Configuration file for the project.

## How to Continue Development

To continue working on this project, follow these steps:

1.  **Manual Data Acquisition**: The constitution text needs to be manually acquired.
    *   Open this URL in your browser: `http://bdlaws.minlaw.gov.bd/act-367.html`
    *   Copy the entire text of the Constitution from that page.
    *   Create a new file named `constitution.txt` inside the `data/` directory of this project.
    *   Paste the copied text into `data/constitution.txt` and save it.

2.  **Install dependencies**: `npm install`

3.  **Run the parsing script**: Once `data/constitution.txt` is ready, run the parsing script. This script currently contains placeholder logic and will need further development to fully structure the data.
    `node src/scraper.js --input=data/constitution.txt --output=data/constitution.json`

4.  **Develop Parsing Logic**: The `src/scraper.js` file needs to be further developed to accurately parse the `constitution.txt` file into the desired structured JSON format (including `id`, `part`, `article`, `clauses`, `language`, `text`, `source_url`, and `last_checked_at`).

5.  **Build RAG Pipeline**: After the data is correctly structured, the next step is to build the Retrieval-Augmented Generation (RAG) pipeline.
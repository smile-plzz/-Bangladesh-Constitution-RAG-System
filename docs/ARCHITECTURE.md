# Architecture

## Goals

- Strict retrieval-augmented answers from the Constitution of Bangladesh
- Production-ready web/API with external vector DB and consistent embeddings
- Support English and Bangla labels in output

## High-Level Components

- Data acquisition (API or crawler)
- Index builder (OpenAI embeddings) → Chroma server collection
- Web/API (Next.js on Vercel) → queries external Chroma and composes structured answers

## Data Flow

1. Acquire data
   - API: `src/fetch-constitution.js` or `src/fetch-sections.js`
   - Output: JSONL with fields: `url`, `title`, `headings`, `text`, `created_at`, `updated_at`, `act_id`, `section_id`
2. Indexing
   - `src/setup-db-openai.js` chunks documents, embeds with OpenAI, upserts into Chroma collection
3. Query
   - `/api/query` route: embeds the question with OpenAI, queries Chroma, composes structured answer

## Indexing Details

- Chunk size ~800 tokens with ~120 overlap (word-based approximation)
- Batched upserts to Chroma
- Model: `text-embedding-3-small` (configurable)
- Collection: `constitution_openai` (configurable)

## Query/Answer Logic

- Retrieval: `nResults` up to 12, with `where: { act_id: 406 }`
- Include distances; apply adaptive threshold around top distance
- Compose structured JSON:
  - `summary`: first relevant provision
  - `provisions`: up to 3 items with `article`, `clause`, `heading`, `summary`, `source`, `distance`
  - `sources`: unique list of sources (up to 5)
- Language: labels in EN or BN (`--lang=bn` from CLI or `lang: 'bn'` in API)

## UI

- Next.js App Router
- Simple form, language toggle, structured rendering with source links

## Operational Concerns

- External Chroma server recommended; avoid running DB in serverless
- Use same embedding model for indexing and querying
- Add rate limits, input validation, and logging for production

## Future Enhancements

- Cross-encoder reranking
- Multi-query expansion
- Token-based chunking
- CI indexing workflows and index versioning

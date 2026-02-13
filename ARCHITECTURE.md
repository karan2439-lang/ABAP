# ABAP RAG Service Architecture

## ABAP patterns observed in this repository

The current ABAP sources are primarily class-centric utility wrappers around standard SAP function modules, with additional standalone function snippets. Common detected patterns:

- `CLASS ... DEFINITION/IMPLEMENTATION` blocks with static helper methods.
- `METHOD ... ENDMETHOD` sections calling BAPIs/FMs such as `BAPI_SALESORDER_CHANGE`, `ENQUEUE_EVVBAKE`, `SD_SALESDOCUMENT_CREATE`.
- Frequent type references (`TYPE vbeln`, `TYPE bapisdh1`, etc.) and message class usage (`MESSAGE e042(v1)`).
- File organization by topic directories (`Class/`, `Function/`) with `.abap` files.

## Pipeline

1. **Ingest + ABAP-aware chunking**
   - `src/ingest/ingestor.ts` scans glob patterns.
   - `src/ingest/chunker.ts` splits by ABAP structural boundaries (class/interface/method/form/function/report) and captures metadata:
     - `object_type`
     - `object_name`
     - `file_path`
     - `start_line` / `end_line`
     - detected references (types/functions/messages/table-like tokens)

2. **Embed + store**
   - `src/generation/openai-client.ts` calls OpenAI embeddings.
   - Vector backend selected by `VECTOR_BACKEND`:
     - `pgvector`: `src/db/pgvector-store.ts` stores content and embedding vectors in Postgres.
     - `memory`: `src/db/vector-store.ts` in-memory adapter for tests/local runs.

3. **Retrieve**
   - `/api/retrieve` embeds the query then executes cosine similarity search.
   - Supports filters: `object_type`, `object_name_prefix`, `file_path_contains`.
   - Lightweight reranking boosts chunks that match object names/references in query text.

4. **Generate (S/4HANA policy constrained)**
   - `src/generation/prompt-builder.ts` builds a policy-heavy prompt from requirement + summarized retrieved chunks.
   - `src/generation/generator.ts` uses OpenAI **Responses API** and JSON schema output.
   - Output includes generated ABAP, source list, assumptions, open points, and rationale.

## REST APIs

- `POST /api/ingest`
- `POST /api/retrieve`
- `POST /api/generate`

The orchestration is implemented in `src/service.ts`, with HTTP wiring in `src/server.ts`.

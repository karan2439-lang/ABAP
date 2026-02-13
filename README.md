# ABAP Contextual Retrieval + S/4HANA ABAP Generation Service

Node.js/TypeScript service that indexes this repository's ABAP code and generates S/4HANA ABAP grounded only in retrieved context.

## Stack

- Node.js 20+
- TypeScript
- Fastify
- OpenAI official SDK (`openai`) with:
  - Embeddings API for indexing/query vectors
  - Responses API for generation
- Postgres + pgvector (default)
- In-memory vector adapter for local tests

## Setup

```bash
npm install
cp .env.example .env
# edit .env with OPENAI_API_KEY
docker compose up -d
npm run dev
```

Service starts on `http://localhost:3000`.

## Windows CMD quickstart (fix for "tsc/vitest not recognized")

If you downloaded the repo and run commands directly in CMD, use the npm scripts below (they resolve local binaries in `node_modules/.bin`):

```cmd
npm install
npm run build
npm test
```

If you still see command-not-found, install dependencies again including devDependencies:

```cmd
npm install --include=dev
```

You can also run tools explicitly through npm without relying on PATH:

```cmd
npm exec tsc -p tsconfig.json
npm exec vitest run
```

## Environment

See `.env.example`.

- `VECTOR_BACKEND=pgvector` (default) requires `DATABASE_URL`
- `VECTOR_BACKEND=memory` for local non-DB runs/tests

## API examples

### 1) Ingest

```bash
curl -X POST http://localhost:3000/api/ingest \
  -H 'content-type: application/json' \
  -d '{
    "root": "/workspace/ABAP",
    "includeGlobs": ["**/*.abap"],
    "excludeGlobs": ["**/node_modules/**"],
    "chunk": {"maxChars": 3500}
  }'
```

### 2) Retrieve

```bash
curl -X POST http://localhost:3000/api/retrieve \
  -H 'content-type: application/json' \
  -d '{
    "query": "update sales order with BAPI and lock handling",
    "topK": 5,
    "filters": {"object_type": "METHOD", "file_path_contains": "Class"}
  }'
```

### 3) Generate

```bash
curl -X POST http://localhost:3000/api/generate \
  -H 'content-type: application/json' \
  -d '{
    "requirement": "Create a class method to update sales order item quantities with commit/rollback and lock handling.",
    "artifact_type": "CLASS_METHOD",
    "release": "S/4HANA 2023",
    "topK": 6
  }'
```

Response includes:

- `abap`
- `sourcesUsed[]` with file and line ranges
- `assumptions[]`
- `openPoints[]`
- `whyTheseSources`

## Tests

```bash
npm test
```

Covers:
- chunker correctness
- vector retrieval adapter behavior
- prompt policy enforcement

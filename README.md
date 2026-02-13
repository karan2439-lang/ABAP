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


## Windows CMD troubleshooting for `npm ERR! ENOENT ... package.json`

If you see an error like:

```text
npm ERR! enoent Could not read package.json
...\...\package.json
```

you are running npm in the wrong folder (or using a path that literally contains `...`).

Use this exact CMD flow:

```cmd
cd /d C:\Users\karchaturvedi\Downloads\ABAP-codex-build-abap-contextual-retrieval-engine\ABAP-codex-build-abap-contextual-retrieval-engine

dir package.json
npm install
npm run build
npm test
```

Notes:
- `dir package.json` must show the file before running npm commands.
- Do **not** use `...` in paths; that is only shorthand in messages, not a real folder name.
- If the project is nested after unzip, run `cd` until `dir` shows `package.json`.
- If OneDrive/zip extraction moved files, re-extract and open CMD directly in the project root.


## Postgres `ECONNREFUSED` on startup

If you see a stack trace from `pg-pool` with `ECONNREFUSED` on port `5432`, Postgres is not running/reachable.

You now have two options:

1. Start Postgres + pgvector:

```cmd
docker compose up -d
```

2. Or run without Postgres:

- set `VECTOR_BACKEND=memory` in `.env`, then restart `npm run dev`

Additionally, the server now auto-falls back to in-memory mode when `VECTOR_BACKEND=pgvector` and Postgres is unreachable, and logs a warning so you can continue testing APIs.

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

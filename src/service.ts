import { Pool } from 'pg';
import { env } from './config/env.js';
import type { VectorStore } from './db/vector-store.js';
import { InMemoryVectorStore } from './db/vector-store.js';
import { PgVectorStore } from './db/pgvector-store.js';
import { ingestFromDisk } from './ingest/ingestor.js';
import { embedTexts } from './generation/openai-client.js';
import { generateAbap } from './generation/generator.js';
import type { RetrieveFilters } from './types/index.js';
import { isConnectionRefused } from './utils/errors.js';

export function createVectorStore(): VectorStore {
  if (env.VECTOR_BACKEND === 'memory') return new InMemoryVectorStore();
  const pool = new Pool({ connectionString: env.DATABASE_URL });
  return new PgVectorStore(pool);
}

export async function createInitializedService(): Promise<{ service: AbapRagService; backend: 'pgvector' | 'memory'; warning?: string }> {
  const preferred = env.VECTOR_BACKEND;
  const service = new AbapRagService(createVectorStore());

  try {
    await service.init();
    return { service, backend: preferred };
  } catch (error) {
    if (preferred === 'pgvector' && isConnectionRefused(error)) {
      const fallback = new AbapRagService(new InMemoryVectorStore());
      await fallback.init();
      return {
        service: fallback,
        backend: 'memory',
        warning: 'Postgres is unreachable (ECONNREFUSED). Falling back to in-memory vector store. Start docker compose or set VECTOR_BACKEND=memory explicitly.'
      };
    }
    throw error;
  }
}

export class AbapRagService {
  constructor(private readonly store: VectorStore) {}

  async init(): Promise<void> {
    await this.store.init();
  }

  async ingest(request: Parameters<typeof ingestFromDisk>[0]) {
    const started = Date.now();
    const { files, chunks, errors } = await ingestFromDisk(request);
    const embeddings = await embedTexts(chunks.map((c) => c.content));
    chunks.forEach((c, i) => {
      c.embedding = embeddings[i];
    });
    const indexed = await this.store.upsertChunks(chunks);
    return {
      filesScanned: files.length,
      chunksCreated: chunks.length,
      chunksIndexed: indexed,
      durationMs: Date.now() - started,
      errors
    };
  }

  async retrieve(query: string, topK = 6, filters?: RetrieveFilters) {
    const [queryEmbedding] = await embedTexts([query]);
    return this.store.similaritySearch(queryEmbedding, topK, filters, query);
  }

  async generate(input: {
    requirement: string;
    artifact_type: string;
    release?: string;
    constraints?: Record<string, unknown>;
    topK?: number;
  }) {
    const retrieved = await this.retrieve(input.requirement, input.topK ?? 6);
    const generated = await generateAbap({
      requirement: input.requirement,
      artifactType: input.artifact_type,
      release: input.release,
      constraints: input.constraints,
      chunks: retrieved
    });

    return {
      abap: generated.abap,
      sourcesUsed: retrieved.map((r) => ({
        file_path: r.metadata.file_path,
        start_line: r.metadata.start_line,
        end_line: r.metadata.end_line
      })),
      assumptions: generated.assumptions,
      openPoints: generated.openPoints,
      whyTheseSources: generated.whyTheseSources
    };
  }
}

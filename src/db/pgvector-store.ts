import { Pool } from 'pg';
import type { Chunk, RetrieveFilters, RetrievedChunk } from '../types/index.js';
import type { VectorStore } from './vector-store.js';
import { rerank } from './vector-store.js';

function toVector(v: number[]): string {
  return `[${v.join(',')}]`;
}

export class PgVectorStore implements VectorStore {
  constructor(private readonly pool: Pool) {}

  async init(): Promise<void> {
    await this.pool.query('CREATE EXTENSION IF NOT EXISTS vector');
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS abap_chunks (
        id BIGSERIAL PRIMARY KEY,
        content TEXT NOT NULL,
        object_type TEXT NOT NULL,
        object_name TEXT NOT NULL,
        file_path TEXT NOT NULL,
        start_line INTEGER NOT NULL,
        end_line INTEGER NOT NULL,
        references_json JSONB NOT NULL,
        embedding vector(1536) NOT NULL,
        created_at TIMESTAMPTZ DEFAULT now()
      );
    `);
    await this.pool.query('CREATE INDEX IF NOT EXISTS idx_abap_chunks_embedding ON abap_chunks USING ivfflat (embedding vector_cosine_ops)');
    await this.pool.query('CREATE INDEX IF NOT EXISTS idx_abap_chunks_object_type ON abap_chunks (object_type)');
    await this.pool.query('CREATE INDEX IF NOT EXISTS idx_abap_chunks_object_name ON abap_chunks (object_name)');
  }

  async upsertChunks(chunks: Chunk[]): Promise<number> {
    let inserted = 0;
    for (const c of chunks) {
      if (!c.embedding) continue;
      await this.pool.query(
        `INSERT INTO abap_chunks (content, object_type, object_name, file_path, start_line, end_line, references_json, embedding)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8::vector)`,
        [
          c.content,
          c.metadata.object_type,
          c.metadata.object_name,
          c.metadata.file_path,
          c.metadata.start_line,
          c.metadata.end_line,
          JSON.stringify(c.metadata.references),
          toVector(c.embedding)
        ]
      );
      inserted++;
    }
    return inserted;
  }

  async similaritySearch(queryEmbedding: number[], topK: number, filters?: RetrieveFilters, queryText?: string): Promise<RetrievedChunk[]> {
    const where: string[] = [];
    const params: unknown[] = [toVector(queryEmbedding)];

    if (filters?.object_type) {
      params.push(filters.object_type);
      where.push(`object_type = $${params.length}`);
    }
    if (filters?.object_name_prefix) {
      params.push(`${filters.object_name_prefix}%`);
      where.push(`object_name ILIKE $${params.length}`);
    }
    if (filters?.file_path_contains) {
      params.push(`%${filters.file_path_contains}%`);
      where.push(`file_path ILIKE $${params.length}`);
    }

    params.push(topK);

    const sql = `
      SELECT content, object_type, object_name, file_path, start_line, end_line, references_json,
             1 - (embedding <=> $1::vector) AS score
      FROM abap_chunks
      ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
      ORDER BY embedding <=> $1::vector
      LIMIT $${params.length}
    `;

    const result = await this.pool.query(sql, params);
    type Row = {
      content: string;
      object_type: any;
      object_name: string;
      file_path: string;
      start_line: number;
      end_line: number;
      references_json: string[];
      score: number | string;
    };
    return rerank(
      (result.rows as Row[]).map((r) => ({
        snippet: r.content,
        metadata: {
          object_type: r.object_type,
          object_name: r.object_name,
          file_path: r.file_path,
          start_line: r.start_line,
          end_line: r.end_line,
          references: r.references_json ?? []
        },
        score: Number(r.score)
      })),
      queryText
    );
  }
}

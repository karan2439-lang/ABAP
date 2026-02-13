import type { Chunk, RetrieveFilters, RetrievedChunk } from '../types/index.js';

export interface VectorStore {
  init(): Promise<void>;
  upsertChunks(chunks: Chunk[]): Promise<number>;
  similaritySearch(queryEmbedding: number[], topK: number, filters?: RetrieveFilters, queryText?: string): Promise<RetrievedChunk[]>;
}

function applyFilter(chunk: Chunk, filters?: RetrieveFilters): boolean {
  if (!filters) return true;
  if (filters.object_type && chunk.metadata.object_type !== filters.object_type) return false;
  if (filters.object_name_prefix && !chunk.metadata.object_name.toLowerCase().startsWith(filters.object_name_prefix.toLowerCase())) return false;
  if (filters.file_path_contains && !chunk.metadata.file_path.toLowerCase().includes(filters.file_path_contains.toLowerCase())) return false;
  return true;
}

export function rerank(chunks: RetrievedChunk[], queryText = ''): RetrievedChunk[] {
  const q = queryText.toLowerCase();
  return chunks
    .map((c) => {
      let boost = 0;
      if (q.includes(c.metadata.object_name.toLowerCase())) boost += 0.08;
      if (c.metadata.references.some((r) => q.includes(r.toLowerCase()))) boost += 0.04;
      return { ...c, score: c.score + boost };
    })
    .sort((a, b) => b.score - a.score);
}

function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0;
  let magA = 0;
  let magB = 0;
  for (let i = 0; i < Math.min(a.length, b.length); i++) {
    dot += a[i] * b[i];
    magA += a[i] * a[i];
    magB += b[i] * b[i];
  }
  if (!magA || !magB) return 0;
  return dot / (Math.sqrt(magA) * Math.sqrt(magB));
}

export class InMemoryVectorStore implements VectorStore {
  private chunks: Chunk[] = [];

  async init(): Promise<void> {}

  async upsertChunks(chunks: Chunk[]): Promise<number> {
    this.chunks.push(...chunks);
    return chunks.length;
  }

  async similaritySearch(queryEmbedding: number[], topK: number, filters?: RetrieveFilters, queryText?: string): Promise<RetrievedChunk[]> {
    const scored = this.chunks
      .filter((c) => c.embedding && applyFilter(c, filters))
      .map((c) => ({
        snippet: c.content,
        metadata: c.metadata,
        score: cosineSimilarity(queryEmbedding, c.embedding!)
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, topK);

    return rerank(scored, queryText);
  }
}

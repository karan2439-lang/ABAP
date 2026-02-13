export type ObjectType =
  | 'CLASS'
  | 'INTERFACE'
  | 'REPORT'
  | 'FUNCTION'
  | 'METHOD'
  | 'FORM'
  | 'INCLUDE'
  | 'UNKNOWN';

export interface ChunkMetadata {
  object_type: ObjectType;
  object_name: string;
  file_path: string;
  start_line: number;
  end_line: number;
  references: string[];
}

export interface Chunk {
  id?: number;
  content: string;
  metadata: ChunkMetadata;
  embedding?: number[];
}

export interface RetrieveFilters {
  object_type?: ObjectType;
  object_name_prefix?: string;
  file_path_contains?: string;
}

export interface RetrievedChunk {
  snippet: string;
  metadata: ChunkMetadata;
  score: number;
}

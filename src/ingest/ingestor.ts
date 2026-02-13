import fg from 'fast-glob';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { chunkAbap } from './chunker.js';
import type { Chunk } from '../types/index.js';

export interface IngestRequest {
  root?: string;
  includeGlobs?: string[];
  excludeGlobs?: string[];
  chunk?: { maxChars?: number };
}

const DEFAULT_INCLUDE = ['**/*.abap', '**/*.clas.abap', '**/*.intf.abap', '**/*.prog.abap', '**/*.fugr.abap', '**/*.incl.abap'];
const DEFAULT_EXCLUDE = ['**/node_modules/**', '**/.git/**', '**/dist/**'];

export async function ingestFromDisk(req: IngestRequest): Promise<{ files: string[]; chunks: Chunk[]; errors: string[] }> {
  const root = req.root ?? process.cwd();
  const include = req.includeGlobs?.length ? req.includeGlobs : DEFAULT_INCLUDE;
  const exclude = [...DEFAULT_EXCLUDE, ...(req.excludeGlobs ?? [])];

  const files = await fg(include, { cwd: root, ignore: exclude, onlyFiles: true });
  const chunks: Chunk[] = [];
  const errors: string[] = [];

  for (const relative of files) {
    try {
      const abs = path.join(root, relative);
      const content = await readFile(abs, 'utf8');
      chunks.push(...chunkAbap(relative, content, req.chunk?.maxChars));
    } catch (e) {
      errors.push(`${relative}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  return { files, chunks, errors };
}

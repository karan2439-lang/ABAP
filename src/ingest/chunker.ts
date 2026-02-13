import type { Chunk, ObjectType } from '../types/index.js';

const referenceRegexes = [
  /\bTYPE\s+([A-Za-z0-9_\/-]+)/gi,
  /CALL\s+FUNCTION\s+'([^']+)'/gi,
  /MESSAGE\s+[a-z]\d+\(([A-Za-z0-9_]+)\)/gi,
  /FROM\s+([A-Za-z0-9_]+)/gi,
  /INTO\s+TABLE\s+([A-Za-z0-9_]+)/gi
];

interface Block {
  object_type: ObjectType;
  object_name: string;
  start: number;
  end: number;
}

const starts = [
  { re: /^\s*CLASS\s+([A-Za-z0-9_]+)\s+(DEFINITION|IMPLEMENTATION)/i, type: 'CLASS' as const },
  { re: /^\s*INTERFACE\s+([A-Za-z0-9_]+)/i, type: 'INTERFACE' as const },
  { re: /^\s*METHOD\s+([A-Za-z0-9_]+)\./i, type: 'METHOD' as const },
  { re: /^\s*FORM\s+([A-Za-z0-9_]+)\b/i, type: 'FORM' as const },
  { re: /^\s*FUNCTION\s+([A-Za-z0-9_]+)\./i, type: 'FUNCTION' as const },
  { re: /^\s*REPORT\s+([A-Za-z0-9_]+)\./i, type: 'REPORT' as const }
];

const endings: Record<ObjectType, RegExp> = {
  CLASS: /^\s*ENDCLASS\./i,
  INTERFACE: /^\s*ENDINTERFACE\./i,
  METHOD: /^\s*ENDMETHOD\./i,
  FORM: /^\s*ENDFORM\./i,
  FUNCTION: /^\s*ENDFUNCTION\./i,
  REPORT: /^\s*$/i,
  INCLUDE: /^\s*$/i,
  UNKNOWN: /^\s*$/i
};

export function detectObjectTypeFromPath(filePath: string): ObjectType {
  const lower = filePath.toLowerCase();
  if (lower.includes('.clas.abap') || lower.includes('/class/')) return 'CLASS';
  if (lower.includes('.intf.abap')) return 'INTERFACE';
  if (lower.includes('.prog.abap')) return 'REPORT';
  if (lower.includes('.fugr.abap') || lower.includes('/function/')) return 'FUNCTION';
  if (lower.includes('.incl.abap')) return 'INCLUDE';
  return 'UNKNOWN';
}

export function extractReferences(content: string): string[] {
  const refs = new Set<string>();
  for (const regex of referenceRegexes) {
    let m: RegExpExecArray | null;
    while ((m = regex.exec(content))) refs.add(m[1]);
  }
  return [...refs];
}

export function chunkAbap(filePath: string, content: string, maxChars = 4000): Chunk[] {
  const lines = content.split(/\r?\n/);
  const blocks: Block[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    for (const s of starts) {
      const m = line.match(s.re);
      if (!m) continue;
      let end = lines.length - 1;
      const endRe = endings[s.type];
      for (let j = i + 1; j < lines.length; j++) {
        if (endRe.test(lines[j])) {
          end = j;
          break;
        }
      }
      blocks.push({ object_type: s.type, object_name: m[1], start: i, end });
      break;
    }
  }

  if (blocks.length === 0) {
    blocks.push({
      object_type: detectObjectTypeFromPath(filePath),
      object_name: filePath.split('/').pop()?.replace(/\.abap$/i, '') || 'unknown',
      start: 0,
      end: lines.length - 1
    });
  }

  const chunks: Chunk[] = [];
  for (const b of blocks) {
    const raw = lines.slice(b.start, b.end + 1).join('\n');
    if (raw.length <= maxChars) {
      chunks.push({
        content: raw,
        metadata: {
          object_type: b.object_type,
          object_name: b.object_name,
          file_path: filePath,
          start_line: b.start + 1,
          end_line: b.end + 1,
          references: extractReferences(raw)
        }
      });
      continue;
    }

    let cursor = b.start;
    while (cursor <= b.end) {
      let charCount = 0;
      let endLine = cursor;
      while (endLine <= b.end && charCount + lines[endLine].length + 1 <= maxChars) {
        charCount += lines[endLine].length + 1;
        endLine++;
      }
      const sliceEnd = Math.max(cursor, endLine - 1);
      const piece = lines.slice(cursor, sliceEnd + 1).join('\n');
      chunks.push({
        content: piece,
        metadata: {
          object_type: b.object_type,
          object_name: b.object_name,
          file_path: filePath,
          start_line: cursor + 1,
          end_line: sliceEnd + 1,
          references: extractReferences(piece)
        }
      });
      cursor = sliceEnd + 1;
    }
  }

  return chunks;
}

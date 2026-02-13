import type { RetrievedChunk } from '../types/index.js';

export function buildGenerationPrompt(args: {
  requirement: string;
  artifactType: string;
  release?: string;
  constraints?: Record<string, unknown>;
  chunks: RetrievedChunk[];
}): string {
  const sourceBlock = args.chunks
    .map((c, i) => `SOURCE_${i + 1}: ${c.metadata.file_path}:${c.metadata.start_line}-${c.metadata.end_line}\n${summarize(c.snippet)}`)
    .join('\n\n');

  return `You are an ABAP generator for S/4HANA only.
Return strict JSON with keys: abap, assumptions, openPoints, whyTheseSources.

User requirement: ${args.requirement}
Artifact type: ${args.artifactType}
Release: ${args.release ?? 'S/4HANA'}
Constraints: ${JSON.stringify(args.constraints ?? {})}

Hard policies:
1) S/4HANA only: avoid ECC assumptions.
2) No invention: do NOT invent custom tables/fields/CDS/BADIs/message classes/APIs. If missing, use TODO_* markers and list in openPoints.
3) No verbatim copying of large blocks from sources; rewrite logic.
4) Include ABAP header line: [ABAP-GEN] timestamp | S/4HANA | sources | assumptions
5) Ground every non-trivial element in sources below.

Retrieved context (summarized):
${sourceBlock}
`;
}

export function summarize(text: string, maxLen = 700): string {
  const clean = text.replace(/\s+/g, ' ').trim();
  return clean.length <= maxLen ? clean : `${clean.slice(0, maxLen)}...`;
}

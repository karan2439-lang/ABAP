import { env } from '../config/env.js';
import { openai } from './openai-client.js';
import { buildGenerationPrompt } from './prompt-builder.js';
import type { RetrievedChunk } from '../types/index.js';

export interface GenerateResult {
  abap: string;
  assumptions: string[];
  openPoints: string[];
  whyTheseSources: string;
}

export async function generateAbap(input: {
  requirement: string;
  artifactType: string;
  release?: string;
  constraints?: Record<string, unknown>;
  chunks: RetrievedChunk[];
}): Promise<GenerateResult> {
  const prompt = buildGenerationPrompt({
    requirement: input.requirement,
    artifactType: input.artifactType,
    release: input.release,
    constraints: input.constraints,
    chunks: input.chunks
  });

  const response = await openai.responses.create({
    model: env.OPENAI_MODEL,
    input: prompt,
    text: {
      format: {
        type: 'json_schema',
        name: 'abap_generation',
        strict: true,
        schema: {
          type: 'object',
          additionalProperties: false,
          properties: {
            abap: { type: 'string' },
            assumptions: { type: 'array', items: { type: 'string' } },
            openPoints: { type: 'array', items: { type: 'string' } },
            whyTheseSources: { type: 'string' }
          },
          required: ['abap', 'assumptions', 'openPoints', 'whyTheseSources']
        }
      }
    }
  });

  const text = response.output_text;
  const parsed = JSON.parse(text) as GenerateResult;
  return parsed;
}

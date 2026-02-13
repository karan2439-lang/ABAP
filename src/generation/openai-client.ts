import OpenAI from 'openai';
import { env } from '../config/env.js';

export const openai = new OpenAI({ apiKey: env.OPENAI_API_KEY });

export async function embedTexts(input: string[]): Promise<number[][]> {
  const response = await openai.embeddings.create({
    model: env.OPENAI_EMBED_MODEL,
    input
  });
  return response.data.map((d) => d.embedding);
}

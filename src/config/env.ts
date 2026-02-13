import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const schema = z.object({
  OPENAI_API_KEY: z.string().min(1),
  OPENAI_MODEL: z.string().default('gpt-4.1-mini'),
  OPENAI_EMBED_MODEL: z.string().default('text-embedding-3-small'),
  PORT: z.coerce.number().default(3000),
  VECTOR_BACKEND: z.enum(['pgvector', 'memory']).default('pgvector'),
  DATABASE_URL: z.string().optional()
}).superRefine((v, ctx) => {
  if (v.VECTOR_BACKEND === 'pgvector' && !v.DATABASE_URL) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'DATABASE_URL is required for pgvector backend' });
  }
});

export const env = schema.parse(process.env);

import Fastify from 'fastify';
import { z } from 'zod';
import { env } from './config/env.js';
import { createInitializedService } from './service.js';

const app = Fastify({ logger: true });
const { service, backend, warning } = await createInitializedService();
if (warning) app.log.warn(warning);
app.log.info({ backend }, 'ABAP RAG vector backend initialized');

app.post('/api/ingest', async (req, reply) => {
  const schema = z.object({
    root: z.string().optional(),
    includeGlobs: z.array(z.string()).optional(),
    excludeGlobs: z.array(z.string()).optional(),
    chunk: z.object({ maxChars: z.number().int().positive().optional() }).optional()
  });
  const parsed = schema.parse(req.body ?? {});
  return reply.send(await service.ingest(parsed));
});

app.post('/api/retrieve', async (req, reply) => {
  const schema = z.object({
    query: z.string().min(1),
    topK: z.number().int().positive().optional(),
    filters: z
      .object({
        object_type: z.enum(['CLASS', 'INTERFACE', 'REPORT', 'FUNCTION', 'METHOD', 'FORM', 'INCLUDE', 'UNKNOWN']).optional(),
        object_name_prefix: z.string().optional(),
        file_path_contains: z.string().optional()
      })
      .optional()
  });
  const parsed = schema.parse(req.body ?? {});
  const data = await service.retrieve(parsed.query, parsed.topK, parsed.filters);
  return reply.send(data);
});

app.post('/api/generate', async (req, reply) => {
  const schema = z.object({
    requirement: z.string().min(1),
    artifact_type: z.string().min(1),
    release: z.string().optional(),
    constraints: z.record(z.unknown()).optional(),
    topK: z.number().int().positive().optional()
  });
  const parsed = schema.parse(req.body ?? {});
  return reply.send(await service.generate(parsed));
});

app.listen({ host: '0.0.0.0', port: env.PORT }).catch((e) => {
  app.log.error(e);
  process.exit(1);
});

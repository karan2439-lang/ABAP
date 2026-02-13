import { describe, expect, it } from 'vitest';
import { InMemoryVectorStore } from '../src/db/vector-store.js';

describe('InMemoryVectorStore', () => {
  it('retrieves best matching vectors with filters', async () => {
    const store = new InMemoryVectorStore();
    await store.init();
    await store.upsertChunks([
      {
        content: 'sales order change logic',
        embedding: [1, 0, 0],
        metadata: {
          object_type: 'CLASS',
          object_name: 'ZCL_SALES',
          file_path: 'Class/zcl_sales.abap',
          start_line: 1,
          end_line: 10,
          references: ['VBAK']
        }
      },
      {
        content: 'delivery update logic',
        embedding: [0, 1, 0],
        metadata: {
          object_type: 'CLASS',
          object_name: 'ZCL_DELIVERY',
          file_path: 'Class/zcl_delivery.abap',
          start_line: 1,
          end_line: 10,
          references: ['LIKP']
        }
      }
    ]);

    const result = await store.similaritySearch([0.9, 0.1, 0], 1, { object_name_prefix: 'ZCL_SAL' }, 'sales');
    expect(result).toHaveLength(1);
    expect(result[0].metadata.object_name).toBe('ZCL_SALES');
  });
});

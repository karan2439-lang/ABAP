import { describe, expect, it } from 'vitest';
import { chunkAbap } from '../src/ingest/chunker.js';

describe('chunkAbap', () => {
  it('extracts class and method chunks with metadata', () => {
    const code = `CLASS zcl_demo DEFINITION.
PUBLIC SECTION.
  METHODS run.
ENDCLASS.

CLASS zcl_demo IMPLEMENTATION.
  METHOD run.
    CALL FUNCTION 'BAPI_SALESORDER_CHANGE'.
  ENDMETHOD.
ENDCLASS.`;

    const chunks = chunkAbap('Class/zcl_demo.abap', code, 1000);
    const names = chunks.map((c) => c.metadata.object_name.toLowerCase());
    expect(names).toContain('zcl_demo');
    expect(names).toContain('run');
    const methodChunk = chunks.find((c) => c.metadata.object_name.toLowerCase() === 'run');
    expect(methodChunk?.metadata.references).toContain('BAPI_SALESORDER_CHANGE');
  });
});

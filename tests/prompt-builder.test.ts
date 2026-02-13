import { describe, expect, it } from 'vitest';
import { buildGenerationPrompt } from '../src/generation/prompt-builder.js';

describe('buildGenerationPrompt', () => {
  it('contains anti-hallucination policies and header instruction', () => {
    const prompt = buildGenerationPrompt({
      requirement: 'Create sales order update utility',
      artifactType: 'CLASS',
      chunks: [
        {
          snippet: 'CALL FUNCTION \'BAPI_SALESORDER_CHANGE\'.',
          score: 0.9,
          metadata: {
            object_type: 'METHOD',
            object_name: 'UPDATE_SALESORD',
            file_path: 'Class/zcl_salesord.abap',
            start_line: 1,
            end_line: 20,
            references: ['BAPI_SALESORDER_CHANGE']
          }
        }
      ]
    });

    expect(prompt).toContain('No invention');
    expect(prompt).toContain('TODO_*');
    expect(prompt).toContain('[ABAP-GEN] timestamp | S/4HANA | sources | assumptions');
    expect(prompt).toContain('Class/zcl_salesord.abap:1-20');
  });
});

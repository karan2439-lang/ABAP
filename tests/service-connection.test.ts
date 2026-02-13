import { describe, expect, it } from 'vitest';
import { isConnectionRefused } from '../src/utils/errors.js';

describe('isConnectionRefused', () => {
  it('detects direct ECONNREFUSED', () => {
    expect(isConnectionRefused({ code: 'ECONNREFUSED' })).toBe(true);
  });

  it('detects nested ECONNREFUSED in aggregate errors', () => {
    const err = {
      code: 'SOMETHING_ELSE',
      errors: [{ code: 'ECONNREFUSED' }, { code: 'OTHER' }]
    };
    expect(isConnectionRefused(err)).toBe(true);
  });

  it('returns false for unrelated errors', () => {
    expect(isConnectionRefused({ code: 'EINVAL' })).toBe(false);
  });
});

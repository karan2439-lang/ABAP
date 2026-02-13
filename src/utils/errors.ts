export function isConnectionRefused(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;

  const record = error as { code?: string; errors?: unknown[] };
  if (record.code === 'ECONNREFUSED') return true;

  if (Array.isArray(record.errors)) {
    return record.errors.some((e) => isConnectionRefused(e));
  }

  return false;
}

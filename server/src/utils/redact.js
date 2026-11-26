/**
 * Redacts credentials (user:password@) from any URI or driver error message.
 */
function redactSecrets(input) {
  if (input === null || input === undefined) return '';
  const text = typeof input === 'string' ? input : input.message || String(input);
  return text.replace(/([a-zA-Z0-9+._-]+:\/\/)?[^:\s/@]+:[^@\s/]+@/g, '$1***@');
}

/**
 * Safely extracts cluster host and database name from a MongoDB URI without credentials.
 */
function parseSafeDbTarget(uri) {
  if (!uri || typeof uri !== 'string') {
    return { host: 'unknown', database: 'unknown' };
  }
  try {
    const normalized = uri.replace(/^mongodb\+srv:\/\//i, 'https://').replace(/^mongodb:\/\//i, 'http://');
    const parsed = new URL(normalized);
    const host = parsed.host || 'unknown';
    const dbPath = (parsed.pathname || '').replace(/^\/+/, '');
    const database = dbPath || 'default';
    return { host, database };
  } catch {
    return { host: 'unknown', database: 'unknown' };
  }
}

module.exports = {
  redactSecrets,
  parseSafeDbTarget,
};

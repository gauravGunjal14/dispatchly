/**
 * NoSQL Injection Protection Middleware
 * Strips MongoDB operators ($gt, $where, $regex, etc.) and dot notation keys
 * from req.body, req.query, and req.params.
 */

const sanitizeObject = (obj) => {
  if (!obj || typeof obj !== 'object') return obj;

  if (Array.isArray(obj)) {
    return obj.map(sanitizeObject);
  }

  const clean = {};
  for (const key of Object.keys(obj)) {
    // If key starts with '$' (Mongo operator) or contains '.' (path traversal injection)
    if (key.startsWith('$') || key.includes('.')) {
      continue; // Strip suspicious operator
    }

    const value = obj[key];
    if (value && typeof value === 'object') {
      clean[key] = sanitizeObject(value);
    } else {
      clean[key] = value;
    }
  }

  return clean;
};

const sanitizeInput = (req, res, next) => {
  if (req.body) req.body = sanitizeObject(req.body);
  if (req.query) req.query = sanitizeObject(req.query);
  if (req.params) req.params = sanitizeObject(req.params);
  next();
};

module.exports = {
  sanitizeInput,
  sanitizeObject,
};

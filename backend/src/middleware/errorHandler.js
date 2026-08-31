const env = require('../config/env');

// Central error handler — the LAST middleware in server.js.
// Never leaks stack traces or secrets to the frontend, per the
// "Error Handling" requirement in the project brief.
function notFound(req, res) {
  res.status(404).json({ error: `Route not found: ${req.method} ${req.originalUrl}` });
}

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  console.error('[error]', err);

  // Postgres unique-violation, foreign-key, etc. get a friendlier message.
  if (err.code === '23505') {
    return res.status(409).json({ error: 'That value already exists (duplicate entry).' });
  }
  if (err.code === '23503') {
    return res.status(400).json({ error: 'Related record not found (invalid reference).' });
  }
  if (err.code === 'ECONNREFUSED') {
    return res.status(503).json({ error: 'Database is currently unavailable. Please try again shortly.' });
  }

  const status = err.status || 500;
  const message = status === 500 ? 'Something went wrong on the server.' : err.message;

  res.status(status).json({
    error: message,
    ...(env.nodeEnv === 'development' && status === 500 ? { debug: err.message } : {}),
  });
}

module.exports = { notFound, errorHandler };

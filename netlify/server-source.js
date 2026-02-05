/**
 * Netlify Function (CommonJS): leitet /api/* und /auth/* an das Express-Backend weiter.
 * Backend wird direkt importiert und mit gebündelt (kein Top-Level-Await mehr).
 */
process.env.NETLIFY = 'true';

const serverlessHttp = require('serverless-http');
const { app } = require('../backend/index.js');
const serverless = serverlessHttp(app);

async function handler(event, context) {
  try {
    let path = event.path || event.rawPath || '';
    const originalPath = path;
    if (path.startsWith('/.netlify/functions/server')) {
      path = path.replace('/.netlify/functions/server', '') || '/';
    }
    if (path === originalPath && event.headers && (event.headers['x-original-url'] || (event.multiValueHeaders && event.multiValueHeaders['x-original-url'] && event.multiValueHeaders['x-original-url'][0]))) {
      const orig = event.headers['x-original-url'] || (event.multiValueHeaders && event.multiValueHeaders['x-original-url'] && event.multiValueHeaders['x-original-url'][0]) || '';
      try {
        path = new URL(orig).pathname || path;
      } catch (_) {}
    }
    event = { ...event, path };
    if (process.env.NETLIFY_DEBUG) {
      console.log('[server] path:', originalPath, '->', path, 'body length:', event.body ? event.body.length : 0);
    }
    return await serverless(event, context);
  } catch (err) {
    console.error('[server] handler error:', err && err.message, err && err.stack);
    const body = JSON.stringify({
      error: 'Server-Fehler (Function).',
      detail: (err && err.message && String(err.message).slice(0, 200)) || 'Unbekannter Fehler – siehe Netlify Function-Log.',
    });
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body,
    };
  }
}

module.exports = { handler };

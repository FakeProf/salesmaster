/**
 * Netlify Function (CommonJS): leitet /api/* und /auth/* an das Express-Backend weiter.
 * Backend wird als ESM (backend-bundle.mjs) gebaut und per import() geladen (Top-Level-Await).
 * Liegt ausserhalb netlify/functions/, damit nur server.js als Function deployed wird.
 */
process.env.NETLIFY = 'true';

const serverlessHttp = require('serverless-http');

let serverlessPromise = null;
function getServerless() {
  if (!serverlessPromise) {
    serverlessPromise = import('./lib/backend-bundle.mjs').then(function (mod) {
      const app = mod && mod.app;
      return app ? serverlessHttp(app) : serverlessHttp(mod);
    });
  }
  return serverlessPromise;
}

async function handler(event, context) {
  try {
    const serverless = await getServerless();
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

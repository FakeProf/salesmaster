/**
 * Netlify Function (CommonJS): leitet /api/* und /auth/* an das Express-Backend weiter.
 * CommonJS-Einstieg, damit die Runtime require() nutzen kann; ESM-Module per import().
 */
process.env.NETLIFY = 'true';

let handlerPromise = null;

async function getHandler() {
  if (handlerPromise) return handlerPromise;
  handlerPromise = (async () => {
    const serverlessHttp = (await import('serverless-http')).default;
    const { app } = await import('../../backend/index.js');
    return serverlessHttp(app);
  })();
  return handlerPromise;
}

async function handler(event, context) {
  try {
    const serverless = await getHandler();
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

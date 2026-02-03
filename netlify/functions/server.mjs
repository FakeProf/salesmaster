/**
 * Netlify Function: leitet /api/* und /auth/* an das Express-Backend weiter.
 * Setze NETLIFY, damit das Backend keinen lokalen Server startet.
 */
process.env.NETLIFY = 'true';

let handlerPromise = null;

async function getHandler() {
  if (handlerPromise) return handlerPromise;
  handlerPromise = (async () => {
    const { default: serverlessHttp } = await import('serverless-http');
    const { app } = await import('../../backend/index.js');
    return serverlessHttp(app);
  })();
  return handlerPromise;
}

export async function handler(event, context) {
  const serverless = await getHandler();
  // Netlify ruft die Function unter /.netlify/functions/server/... auf – Express braucht den echten Pfad (/api/..., /auth/...)
  let path = event.path || event.rawPath || '';
  const originalPath = path;
  if (path.startsWith('/.netlify/functions/server')) {
    path = path.replace('/.netlify/functions/server', '') || '/';
  }
  // Falls path unverändert (z. B. anderes Rewrite-Format), x-original-url nutzen
  if (path === originalPath && event.headers && (event.headers['x-original-url'] || event.multiValueHeaders?.['x-original-url']?.[0])) {
    const orig = event.headers['x-original-url'] || event.multiValueHeaders?.['x-original-url']?.[0] || '';
    try {
      path = new URL(orig).pathname || path;
    } catch (_) {}
  }
  event = { ...event, path };
  if (process.env.NETLIFY_DEBUG) {
    console.log('[server] path:', originalPath, '->', path, 'body length:', event.body?.length ?? 0);
  }
  return serverless(event, context);
}

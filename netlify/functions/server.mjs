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
  if (event.path && event.path.startsWith('/.netlify/functions/server')) {
    event = { ...event, path: event.path.replace('/.netlify/functions/server', '') || '/' };
  }
  return serverless(event, context);
}

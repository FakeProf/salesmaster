// Backend-URL für API und Auth (lokal oder VITE_API_URL aus .env)
const DEFAULT_PORTS = [4001, 40011, 40012, 40013, 40014, 40015, 40016, 40017, 40018];

function isLocalHost() {
  if (typeof window === 'undefined') return true;
  const h = window.location.hostname;
  return h === 'localhost' || h === '127.0.0.1';
}

function getDefaultBase() {
  const env = import.meta.env.VITE_API_URL;
  if (env) return env;
  if (!isLocalHost()) return ''; // Live-Seite: nie localhost, nur VITE_API_URL
  const stored = typeof sessionStorage !== 'undefined' && sessionStorage.getItem('salesmaster_api_base');
  if (stored) return stored;
  return `http://localhost:${DEFAULT_PORTS[0]}`;
}
export let API_BASE = getDefaultBase();

export function apiFetch(path, options = {}) {
  const base = path.startsWith('http') ? '' : API_BASE;
  const url = path.startsWith('http') ? path : (base + path);
  return fetch(url, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  }).catch(async (err) => {
    if (path.startsWith('http') || !isLocalHost()) throw err;
    for (const port of DEFAULT_PORTS) {
      const tryBase = `http://localhost:${port}`;
      if (tryBase === API_BASE) continue;
      try {
        const res = await fetch(`${tryBase}${path}`, {
          method: options.method,
          body: options.body,
          credentials: 'include',
          headers: { 'Content-Type': 'application/json', ...options.headers },
        });
        API_BASE = tryBase;
        if (typeof sessionStorage !== 'undefined') sessionStorage.setItem('salesmaster_api_base', tryBase);
        return res;
      } catch (_) {}
    }
    throw err;
  });
}

# Netlify – Umgebungsvariablen für Backend (API/Auth)

Wenn Frontend und Backend über **dasselbe** Netlify-Projekt laufen, leitet Netlify `/api/*` und `/auth/*` an die Backend-Function weiter. **VITE_API_URL** ist dann nicht nötig (gleiche Domain).

In Netlify unter **Site settings → Environment variables** sollten gesetzt sein:

| Variable | Beschreibung |
|----------|--------------|
| `DATABASE_URL` | Neon-PostgreSQL-URL (wie lokal in `backend/.env`) |
| `SESSION_SECRET` | Geheimer Schlüssel für Sessions (z. B. langer Zufallsstring) |

Optional: `URL` setzt Netlify automatisch auf die Site-URL (für CORS).

Nach dem Setzen der Variablen einen neuen **Deploy** auslösen.

# Netlify – Umgebungsvariablen für Backend (API/Auth)

Wenn Frontend und Backend über **dasselbe** Netlify-Projekt laufen, leitet Netlify `/api/*` und `/auth/*` an die Backend-Function weiter. **VITE_API_URL** ist dann nicht nötig (gleiche Domain).

In Netlify unter **Site settings → Environment variables** folgende Variablen anlegen:

| Variable | Pflicht | Beschreibung |
|----------|--------|--------------|
| `DATABASE_URL` | **Ja** | Neon-PostgreSQL-URL (wie in `backend/.env` lokal). Ohne diese Variable schlägt Registrierung/Anmeldung fehl. |
| `SESSION_SECRET` | Nein | Geheimer Schlüssel für Sessions (empfohlen für Produktion). Ohne Wert wird ein Standard genutzt – die Anmeldung funktioniert trotzdem. |

**SESSION_SECRET erzeugen** (z. B. lokal in der Konsole):

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Den ausgegebenen String (64 Zeichen) in Netlify als Wert für `SESSION_SECRET` eintragen.

Optional: `URL` setzt Netlify automatisch auf die Site-URL (für CORS).

Nach dem Setzen der Variablen einen neuen **Deploy** auslösen.

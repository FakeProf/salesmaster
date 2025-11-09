# Neon Database Setup

## Environment Variables

Setze diese Umgebungsvariablen in deinem Netlify Dashboard:

### Für Production (Netlify):
```
NETLIFY_DATABASE_URL=postgresql://username:password@hostname/database
```

### Für Local Development:
Erstelle eine `.env` Datei im `backend/` Ordner:
```
DATABASE_URL=postgresql://username:password@hostname/database
```

## Database Schema

Das System erstellt automatisch folgende Tabellen:

### `scenarios` Tabelle:
```sql
CREATE TABLE scenarios (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  industry VARCHAR(100) NOT NULL,
  difficulty VARCHAR(50) NOT NULL,
  description TEXT,
  phases JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### `user_progress` Tabelle:
```sql
CREATE TABLE user_progress (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL,
  scenario_id INTEGER REFERENCES scenarios(id),
  completed BOOLEAN DEFAULT FALSE,
  score INTEGER DEFAULT 0,
  completed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## API Endpoints

### Scenarios:
- `GET /api/scenarios` - Alle Szenarien abrufen
- `GET /api/scenarios/:id` - Einzelnes Szenario abrufen

### Progress:
- `GET /api/progress/:userId` - Benutzerfortschritt abrufen
- `POST /api/progress` - Fortschritt speichern

### Beispiel für Progress POST:
```json
{
  "userId": "user123",
  "scenarioId": 1,
  "completed": true,
  "score": 85
}
```

## Deployment

1. Verbinde deine Neon-Datenbank mit Netlify
2. Setze die `NETLIFY_DATABASE_URL` Umgebungsvariable
3. Deploye das Backend auf Netlify Functions
4. Das System erstellt automatisch die Tabellen beim ersten Start


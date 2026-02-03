# 🎯 SalesMaster - React Platform

Eine moderne Verkaufsschulungs-Plattform mit React Frontend und Express Backend.

## 🚀 Features

### Vertriebs-Training
- **Einwandbehandlung**: Preis-, Zeit-, Vertrauens- und Konkurrenz-Einwände
- **Fragetechniken**: SPIN-Selling, BANT-Qualifizierung, offene vs. geschlossene Fragen
- **Verkaufspsychologie**: DISC-Persönlichkeitstypen, Reziprozität, Knappheit, sozialer Beweis
- **Verkaufssprache**: Professionelle Formulierungen, Themenablenkung, Wert-Kommunikation

### Übungsmodus
- **Adaptives Quiz**: Intelligentes Quiz mit Spaced Repetition
- **Karteikarten**: Intelligente Wiederholung schwieriger Inhalte
- **Rollenspiel**: Realistische Verkaufsgespräche
- **Herausforderungen**: Fortgeschrittene Übungen
- **Mikro-Learning**: 5-Minuten Lerneinheiten
- **Lern-Insights**: Personalisiertes Feedback

### Verkaufsszenarien
- **6 Branchen**: Finanzen, Gesundheit, Bildung, Logistik, Vertrieb, Compliance
- **3 Schwierigkeitsgrade**: Anfänger, Fortgeschritten, Experte
- **Detaillierte Szenarien**: Mit Stakeholdern, Einwänden, Fragen und Zielen

### Fortschritt
- **Level-System**: XP-basierte Progression
- **Erfolge**: Gamification mit Achievements
- **Lernstreak**: Tägliche Lerngewohnheiten
- **Aktivitäts-Tracking**: Detaillierte Lernhistorie

## 🛠️ Setup

### Voraussetzungen
- Node.js (v16 oder höher)
- npm

### Installation
```bash
# Repository klonen
git clone https://github.com/FakeProf/salesmaster.git
cd salesmaster

# Dependencies installieren
npm run install:all

# Entwicklungsserver starten (Frontend + Backend)
npm run dev
```

### URLs
- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:4000

## 📁 Projektstruktur

```
salesmaster/
├── frontend/          # React App (Vite)
│   ├── src/
│   │   ├── App.jsx    # Hauptkomponente
│   │   ├── App.css    # Styles
│   │   └── main.jsx   # Entry Point
│   ├── index.html     # HTML Entry Point
│   ├── vite.config.js # Vite Konfiguration
│   └── package.json
├── backend/           # Express API
│   ├── index.js      # Server
│   └── package.json
├── package.json      # Monorepo Root
└── README.md
```

## 🎨 Design

- **Modern UI**: Gradient-Hintergründe, Glasmorphismus-Effekte
- **Responsive**: Mobile-first Design
- **Gamification**: XP, Level, Achievements, Streaks
- **Accessibility**: Keyboard-Navigation, Screen-Reader Support

## 🔧 Scripts

```bash
# Entwicklung
npm run dev              # Startet Frontend + Backend
npm run dev:frontend     # Nur Frontend
npm run dev:backend      # Nur Backend

# Build
npm run build            # Frontend + Backend builden
npm run build:frontend   # Frontend builden
npm run build:backend    # Backend builden

# Production
npm run start            # Production Server
```

## 📊 API Endpoints

### Szenarien
- `GET /api/scenarios` - Alle Szenarien
- `GET /api/scenarios/:id` - Einzelnes Szenario

### Quiz
- `GET /api/quiz` - Quiz-Übersicht
- `GET /api/quiz/:topic` - Quiz nach Thema

### Health
- `GET /api/health` - Server Status

## 🎯 Nächste Schritte

1. **Datenbank Integration**: PostgreSQL/MongoDB für persistente Daten
2. **User Authentication**: Login/Registration System
3. **Real-time Features**: WebSocket für Live-Collaboration
4. **Mobile App**: React Native Version
5. **Analytics**: Detaillierte Lernanalysen
6. **Content Management**: Admin-Panel für Inhalte

## 🤝 Contributing

1. Fork das Repository
2. Erstelle einen Feature Branch
3. Committe deine Änderungen
4. Push zum Branch
5. Erstelle einen Pull Request

## 📄 Lizenz

© 2026 SalesMaster. Alle Rechte vorbehalten.

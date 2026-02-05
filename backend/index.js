import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// __dirname für ESM (wird beim Bundling zu CJS konvertiert)
let __dirname;
try {
  __dirname = path.dirname(fileURLToPath(import.meta.url));
} catch {
  __dirname = process.cwd(); // Fallback für CJS-Bundle
}
dotenv.config({ path: path.join(__dirname, '.env') });
// Debug: Prüfe ob GROQ_API_KEY geladen wurde
console.log('Environment check:', {
  envFile: path.join(__dirname, '.env'),
  groqKeyExists: !!process.env.GROQ_API_KEY,
  groqKeyLength: process.env.GROQ_API_KEY ? process.env.GROQ_API_KEY.length : 0
});

import crypto from 'crypto';
 import express from 'express';
import cors from 'cors';
import session from 'express-session';
import cookieParser from 'cookie-parser';
import { neon } from '@neondatabase/serverless';
import nodeFetch from 'node-fetch';
const fetch = nodeFetch.default || nodeFetch;

const app = express();
const PORT = process.env.PORT || 4001;

// Neon Database Connection (optional for local development)
let sql = null;
try {
  const databaseUrl = process.env.DATABASE_URL || process.env.NETLIFY_DATABASE_URL;
  if (databaseUrl && databaseUrl !== 'postgresql://placeholder:placeholder@localhost:5432/placeholder') {
    sql = neon(databaseUrl);
    console.log('Database connected successfully');
  } else {
    console.log('No database URL provided, running in demo mode');
  }
} catch (error) {
  console.log('Database connection failed, running in demo mode:', error.message);
}

// Initialize database tables
async function initializeDatabase() {
  if (!sql) {
    console.log('Database not available, skipping table initialization');
    return;
  }
  
  try {
    // Create scenarios table if it doesn't exist
    await sql`
      CREATE TABLE IF NOT EXISTS scenarios (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        industry VARCHAR(100) NOT NULL,
        difficulty VARCHAR(50) NOT NULL,
        description TEXT,
        phases JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;
    
    // Create users table (E-Mail/Passwort-Anmeldung)
    await sql`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        name VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;
    
    // Create user_progress table if it doesn't exist
    await sql`
      CREATE TABLE IF NOT EXISTS user_progress (
        id SERIAL PRIMARY KEY,
        user_id VARCHAR(255) NOT NULL,
        scenario_id INTEGER NOT NULL,
        completed BOOLEAN DEFAULT FALSE,
        score INTEGER DEFAULT 0,
        completed_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;
    try {
      await sql`CREATE UNIQUE INDEX IF NOT EXISTS user_progress_user_scenario_key ON user_progress (user_id, scenario_id)`;
    } catch (_) {}
    
    await sql`
      CREATE TABLE IF NOT EXISTS user_training_activity (
        id SERIAL PRIMARY KEY,
        user_id VARCHAR(255) NOT NULL,
        module_id VARCHAR(100) NOT NULL,
        completed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, module_id)
      )
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS user_question_stats (
        id SERIAL PRIMARY KEY,
        user_id VARCHAR(255) NOT NULL,
        module_id VARCHAR(100) NOT NULL,
        correct_answers INTEGER DEFAULT 0,
        total_answers INTEGER DEFAULT 0,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, module_id)
      )
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS user_guides (
        id SERIAL PRIMARY KEY,
        user_id VARCHAR(255) NOT NULL,
        title VARCHAR(255) NOT NULL,
        items JSONB NOT NULL,
        usps JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;
    
    console.log('Database tables initialized successfully');
  } catch (error) {
    console.log('Database initialization failed:', error.message);
  }
}

// Database connection (using Neon)
// const pool = new Pool({
//   connectionString: process.env.DATABASE_URL,
//   ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
// });

const FRONTEND_URL = process.env.FRONTEND_URL || process.env.URL || 'http://localhost:5173';

app.use(cors({
  origin: [
    FRONTEND_URL,
    process.env.URL,
    'http://localhost:5173', 'http://localhost:5174', 'http://localhost:5175', 'http://localhost:5176', 'http://localhost:5177',
    'http://127.0.0.1:5173', 'http://127.0.0.1:5174', 'http://127.0.0.1:5175', 'http://127.0.0.1:5176', 'http://127.0.0.1:5177',
    /^http:\/\/localhost(:\d+)?$/, /^http:\/\/127\.0\.0\.1(:\d+)?$/, /^https:\/\/[a-z0-9-]+\.netlify\.app$/
  ].filter(Boolean),
  credentials: true,
}));
app.use(cookieParser());
app.use(express.json());
const sessionSecret = process.env.SESSION_SECRET || 'salesmaster-dev-secret-change-in-production';
const isNetlify = process.env.NETLIFY === 'true' || process.env.NETLIFY === true;
if (isNetlify && !process.env.SESSION_SECRET) {
  console.warn('SESSION_SECRET nicht gesetzt – es wird ein Standardwert genutzt. Für Produktion in Netlify unter Environment variables setzen.');
}

// Cookie-Session lazy laden (kein Top-Level-Await für Netlify-Bundling)
let cookieSessionMiddleware = null;
if (isNetlify) {
  app.use(async (req, res, next) => {
    if (!cookieSessionMiddleware) {
      const cookieSession = (await import('cookie-session')).default;
      cookieSessionMiddleware = cookieSession({
        name: 'session',
        keys: [sessionSecret],
        maxAge: 7 * 24 * 60 * 60 * 1000,
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
      });
    }
    return cookieSessionMiddleware(req, res, next);
  });
} else {
  app.use(session({
    secret: sessionSecret,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 7 * 24 * 60 * 60 * 1000,
      sameSite: 'lax',
    },
  }));
}

// --- E-Mail/Passwort-Anmeldung (kostenlos, nur eigene DB) ---
function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
  return `${salt}:${hash}`;
}
function verifyPassword(password, stored) {
  const [salt, hash] = stored.split(':');
  if (!salt || !hash) return false;
  const computed = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
  return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(computed, 'hex'));
}

app.post('/auth/register', async (req, res) => {
  const { email, password, name } = req.body || {};
  const trimmedEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
  if (!trimmedEmail || !password || password.length < 6) {
    return res.status(400).json({ error: 'E-Mail und Passwort (min. 6 Zeichen) sind erforderlich.' });
  }
  if (!sql) {
    return res.status(503).json({ error: 'Registrierung derzeit nicht verfügbar (Datenbank nicht verbunden).' });
  }
  try {
    const passwordHash = hashPassword(password);
    await sql`
      INSERT INTO users (email, password_hash, name)
      VALUES (${trimmedEmail}, ${passwordHash}, ${name?.trim() || null})
    `;
    const [user] = await sql`SELECT id, email, name FROM users WHERE email = ${trimmedEmail}`;
    req.session.user = { id: String(user.id), email: user.email, name: user.name || user.email };
    if (typeof req.session.save === 'function') {
      req.session.save((err) => {
        if (err) return res.status(500).json({ error: 'Session konnte nicht gespeichert werden.' });
        res.status(201).json({ user: req.session.user });
      });
    } else {
      res.status(201).json({ user: req.session.user });
    }
  } catch (e) {
    if (e.code === '23505') {
      return res.status(409).json({ error: 'Diese E-Mail-Adresse ist bereits registriert.' });
    }
    console.error('Register error:', e?.message || e, 'code:', e?.code, 'stack:', e?.stack);
    const detail = (e?.message && typeof e.message === 'string') ? e.message.slice(0, 200) : (e?.code ? String(e.code) : '');
    res.status(500).json({
      error: 'Registrierung fehlgeschlagen.',
      detail: detail || (e?.code ? 'Datenbankfehler – DATABASE_URL prüfen.' : ''),
    });
  }
});

app.post('/auth/login', async (req, res) => {
  const { email, password } = req.body || {};
  const trimmedEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
  if (!trimmedEmail || !password) {
    return res.status(400).json({ error: 'E-Mail und Passwort sind erforderlich.' });
  }
  if (!sql) {
    return res.status(503).json({ error: 'Anmeldung derzeit nicht verfügbar (Datenbank nicht verbunden).' });
  }
  try {
    const rows = await sql`SELECT id, email, name, password_hash FROM users WHERE email = ${trimmedEmail}`;
    if (rows.length === 0) {
      return res.status(401).json({ error: 'E-Mail oder Passwort falsch.' });
    }
    const user = rows[0];
    if (!verifyPassword(password, user.password_hash)) {
      return res.status(401).json({ error: 'E-Mail oder Passwort falsch.' });
    }
    req.session.user = { id: String(user.id), email: user.email, name: user.name || user.email };
    if (typeof req.session.save === 'function') {
      req.session.save((err) => {
        if (err) return res.status(500).json({ error: 'Session konnte nicht gespeichert werden.' });
        res.json({ user: req.session.user });
      });
    } else {
      res.json({ user: req.session.user });
    }
  } catch (e) {
    console.error('Login error:', e?.message || e, 'code:', e?.code);
    const detail = (e?.message && typeof e.message === 'string') ? e.message.slice(0, 200) : (e?.code ? String(e.code) : '');
    res.status(500).json({
      error: 'Anmeldung fehlgeschlagen.',
      detail: detail || (e?.code ? 'Datenbankfehler – DATABASE_URL prüfen.' : ''),
    });
  }
});

app.get('/auth/me', (req, res) => {
  if (req.session?.user) {
    return res.json({ user: req.session.user });
  }
  res.status(401).json({ user: null });
});

// Diagnose: Erreichbarkeit + DB (ohne sensible Daten)
app.get('/auth/status', (_req, res) => {
  res.json({
    ok: true,
    db: !!sql,
    netlify: !!process.env.NETLIFY,
  });
});

app.post('/auth/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) console.error('Logout session destroy error:', err);
    res.clearCookie('connect.sid');
    res.status(204).end();
  });
});

// In-memory demo data (migrate to DB later)
const scenarios = [
  { 
    id: 'buchhaltung', 
    title: 'Buchhaltung - Digitale Belegverarbeitung', 
    industry: 'finance', 
    difficulty: 'beginner',
    description: 'Digitale Buchhaltungslösung mit GoBD-Konformität verkaufen',
    situation: 'Sie präsentieren eine Lösung zur digitalen Belegverarbeitung an ein mittelständisches Unternehmen',
    challenge: 'Die Buchhaltung zweifelt an GoBD-Konformität und Datenqualität',
    goal: 'Vertrag über 15.000€/Jahr für digitale Buchhaltungslösung abschließen',
    timeLimit: 12,
    stakeholders: ['Buchhalter', 'Geschäftsführer', 'Steuerberater'],
    objections: ['GoBD-Konformität unklar', 'Zu teuer für kleine Firma', 'Datenschutz-Bedenken', 'Zu komplex'],
    questions: [
      'Wie verwalten Sie aktuell Ihre Belege?',
      'Welche GoBD-Anforderungen sind Ihnen wichtig?',
      'Wie hoch ist Ihr manueller Aufwand?',
      'Wer prüft Ihre Buchhaltung?'
    ],
    phases: [
      {
        id: 'opening',
        title: 'Gesprächseröffnung',
        description: 'Erste Kontaktaufnahme und Vertrauen aufbauen',
        tasks: [
          {
            id: 'task1',
            type: 'question',
            title: 'Eröffnungsfrage',
            description: 'Wie eröffnen Sie das Gespräch professionell?',
            question: 'Sie treffen auf den Buchhalter. Wie beginnen Sie das Gespräch?',
            options: [
              { id: 1, text: '„Hallo, ich möchte Ihnen unsere Lösung vorstellen."', correct: false, feedback: 'Zu direkt. Fehlt die persönliche Ansprache.' },
              { id: 2, text: '„Guten Tag, vielen Dank für Ihre Zeit. Wie läuft Ihre aktuelle Belegverwaltung?"', correct: true, feedback: 'Perfekt! Offene Frage, zeigt Interesse am Kunden.' },
              { id: 3, text: '„Ich habe eine tolle Lösung für Sie."', correct: false, feedback: 'Zu verkaufsorientiert. Kunde fühlt sich unter Druck gesetzt.' }
            ]
          },
          {
            id: 'task2',
            type: 'objection',
            title: 'Erster Einwand',
            description: 'Der Buchhalter zeigt Skepsis',
            question: 'Der Buchhalter sagt: "Wir haben schon ein System, das funktioniert." Wie reagieren Sie?',
            options: [
              { id: 1, text: '„Unser System ist besser."', correct: false, feedback: 'Zu defensiv. Kritisiert den Kunden indirekt.' },
              { id: 2, text: '„Das verstehe ich. Was funktioniert gut, was könnte besser sein?"', correct: true, feedback: 'Sehr gut! Zeigt Respekt und öffnet das Gespräch.' },
              { id: 3, text: '„Dann brauchen Sie uns wohl nicht."', correct: false, feedback: 'Zu schnell aufgegeben. Jeder Einwand ist eine Chance.' }
            ]
          }
        ]
      },
      {
        id: 'discovery',
        title: 'Bedarfsanalyse',
        description: 'Herausforderungen und Bedürfnisse identifizieren',
        tasks: [
          {
            id: 'task3',
            type: 'question',
            title: 'SPIN-Fragen: Situation',
            description: 'Aktuelle Situation verstehen',
            question: 'Welche Frage hilft Ihnen, die aktuelle Situation zu verstehen?',
            options: [
              { id: 1, text: '„Wie viele Belege verarbeiten Sie pro Monat?"', correct: true, feedback: 'Gut! Konkrete Situationsfrage mit Zahlen.' },
              { id: 2, text: '„Möchten Sie unser System kaufen?"', correct: false, feedback: 'Zu früh für Abschlussfrage. Erst Situation klären.' },
              { id: 3, text: '„Ist Ihr aktuelles System teuer?"', correct: false, feedback: 'Geschlossene Frage. Besser offen fragen.' }
            ]
          },
          {
            id: 'task4',
            type: 'question',
            title: 'SPIN-Fragen: Problem',
            description: 'Herausforderungen identifizieren',
            question: 'Der Buchhalter erwähnt, dass die Belegsuche lange dauert. Wie vertiefen Sie das Problem?',
            options: [
              { id: 1, text: '„Das ist nicht so schlimm."', correct: false, feedback: 'Ignoriert das Problem. Verpasste Chance.' },
              { id: 2, text: '„Wie lange dauert die Suche im Schnitt? Was bedeutet das für Ihren Arbeitsalltag?"', correct: true, feedback: 'Perfekt! Problemfrage mit Implikation.' },
              { id: 3, text: '„Unser System ist schneller."', correct: false, feedback: 'Zu früh zur Lösung. Erst Problem verstehen.' }
            ]
          },
          {
            id: 'task5',
            type: 'objection',
            title: 'Preis-Einwand',
            description: 'Budget-Bedenken behandeln',
            question: 'Der Geschäftsführer sagt: "15.000€ pro Jahr ist zu teuer für uns." Wie reagieren Sie?',
            options: [
              { id: 1, text: '„Dann können wir leider nicht zusammenarbeiten."', correct: false, feedback: 'Zu schnell aufgegeben. Preis-Einwand ist oft versteckter Einwand.' },
              { id: 2, text: '„Ich kann Ihnen 20% Rabatt geben."', correct: false, feedback: 'Zu schnell nachgegeben. Wert nicht kommuniziert.' },
              { id: 3, text: '„Teuer im Vergleich zu was? Was kostet Sie die aktuelle manuelle Suche an Zeit?"', correct: true, feedback: 'Sehr gut! Wert-Kommunikation statt Preisdiskussion.' }
            ]
          }
        ]
      },
      {
        id: 'presentation',
        title: 'Lösungspräsentation',
        description: 'Ihre Lösung präsentieren und Mehrwert zeigen',
        tasks: [
          {
            id: 'task6',
            type: 'question',
            title: 'Wert-Kommunikation',
            description: 'Mehrwert statt Features präsentieren',
            question: 'Wie präsentieren Sie die GoBD-Konformität wertorientiert?',
            options: [
              { id: 1, text: '„Unsere Lösung ist GoBD-konform."', correct: false, feedback: 'Zu technisch. Kunde versteht den Wert nicht.' },
              { id: 2, text: '„Mit unserer Lösung erfüllen Sie alle GoBD-Anforderungen automatisch. Das bedeutet: Keine Risiken bei Steuerprüfungen, keine Nacharbeit, mehr Sicherheit."', correct: true, feedback: 'Perfekt! Wert und Nutzen klar kommuniziert.' },
              { id: 3, text: '„GoBD ist wichtig."', correct: false, feedback: 'Zu vage. Kein konkreter Nutzen.' }
            ]
          },
          {
            id: 'task7',
            type: 'objection',
            title: 'Datenschutz-Bedenken',
            description: 'Vertrauen bei Datenschutz aufbauen',
            question: 'Der Buchhalter fragt: "Wo werden unsere Daten gespeichert? Ist das DSGVO-konform?"',
            options: [
              { id: 1, text: '„Das ist kompliziert zu erklären."', correct: false, feedback: 'Wirkt unsicher. Kunde verliert Vertrauen.' },
              { id: 2, text: '„Unsere Server stehen in Deutschland, wir haben ein AVV und sind DSGVO-zertifiziert. Darf ich Ihnen unsere Zertifikate zeigen?"', correct: true, feedback: 'Sehr gut! Konkret, transparent, vertrauensbildend.' },
              { id: 3, text: '„Das ist kein Problem."', correct: false, feedback: 'Zu oberflächlich. Kunde braucht Details.' }
            ]
          }
        ]
      },
      {
        id: 'closing',
        title: 'Abschluss',
        description: 'Zum Abschluss führen',
        tasks: [
          {
            id: 'task8',
            type: 'question',
            title: 'Abschlussfrage',
            description: 'Natürlich zum Abschluss führen',
            question: 'Der Geschäftsführer zeigt Interesse. Wie führen Sie zum Abschluss?',
            options: [
              { id: 1, text: '„Wollen Sie jetzt kaufen?"', correct: false, feedback: 'Zu direkt. Wirkt aufdringlich.' },
              { id: 2, text: '„Wie klingt das für Sie – sollen wir den Vertrag für den 1. Februar starten?"', correct: true, feedback: 'Perfekt! Alternativfrage mit konkretem Starttermin.' },
              { id: 3, text: '„Sie können sich ja noch überlegen."', correct: false, feedback: 'Zu passiv. Verpasste Chance.' }
            ]
          }
        ]
      }
    ]
  },
  { 
    id: 'pflege', 
    title: 'Pflege - Dienstplan- und Dokumentationssystem', 
    industry: 'healthcare', 
    difficulty: 'intermediate',
    description: 'Pflegesystem in Einrichtung einführen',
    situation: 'Sie führen ein neues Dienstplan-/Dokumentationssystem in einer Pflegeeinrichtung ein',
    challenge: 'Pflegekräfte befürchten Mehraufwand und technische Komplexität',
    goal: 'System erfolgreich einführen und Akzeptanz schaffen',
    timeLimit: 18,
    stakeholders: ['Pflegedienstleitung', 'Pflegekräfte', 'Geschäftsführung'],
    objections: ['Zu kompliziert', 'Mehraufwand im Alltag', 'Technik-Probleme', 'Schulungsaufwand'],
    questions: [
      'Wie planen Sie aktuell Ihre Dienste?',
      'Welche Dokumentation ist wichtig?',
      'Wie digital sind Sie bereits?',
      'Wer entscheidet über neue Systeme?'
    ],
    phases: [
      {
        id: 'opening',
        title: 'Gesprächseröffnung',
        description: 'Mit Pflegedienstleitung Kontakt aufnehmen',
        tasks: [
          {
            id: 'task1',
            type: 'question',
            title: 'Empathische Eröffnung',
            description: 'Respekt für die Arbeit der Pflegekräfte zeigen',
            question: 'Sie treffen die Pflegedienstleitung. Wie eröffnen Sie das Gespräch?',
            options: [
              { id: 1, text: '„Ich habe ein System, das Ihre Arbeit erleichtert."', correct: false, feedback: 'Zu verkaufsorientiert. Fehlt Empathie.' },
              { id: 2, text: '„Vielen Dank für Ihre Zeit. Wie läuft die Dienstplanung aktuell bei Ihnen?"', correct: true, feedback: 'Perfekt! Zeigt Respekt und Interesse.' },
              { id: 3, text: '„Sie brauchen unser System."', correct: false, feedback: 'Zu direktiv. Wirkt arrogant.' }
            ]
          }
        ]
      },
      {
        id: 'discovery',
        title: 'Bedarfsanalyse',
        description: 'Herausforderungen im Pflegealltag verstehen',
        tasks: [
          {
            id: 'task2',
            type: 'question',
            title: 'Problem-Identifikation',
            description: 'Herausforderungen bei der Dokumentation finden',
            question: 'Die Pflegedienstleitung erwähnt, dass die Dokumentation viel Zeit kostet. Wie vertiefen Sie das?',
            options: [
              { id: 1, text: '„Unser System ist schneller."', correct: false, feedback: 'Zu früh zur Lösung. Erst Problem verstehen.' },
              { id: 2, text: '„Wie viel Zeit investieren Sie aktuell? Was bedeutet das für die Zeit mit den Bewohnern?"', correct: true, feedback: 'Sehr gut! Problem mit Implikation vertieft.' },
              { id: 3, text: '„Das ist normal."', correct: false, feedback: 'Ignoriert das Problem.' }
            ]
          },
          {
            id: 'task3',
            type: 'objection',
            title: 'Mehraufwand-Einwand',
            description: 'Bedenken der Pflegekräfte adressieren',
            question: 'Eine Pflegekraft sagt: "Das wird nur noch mehr Arbeit für uns." Wie reagieren Sie?',
            options: [
              { id: 1, text: '„Das stimmt nicht."', correct: false, feedback: 'Zu defensiv. Ignoriert die Bedenken.' },
              { id: 2, text: '„Ich verstehe Ihre Sorge. Lassen Sie mich zeigen, wie andere Einrichtungen Zeit sparen. Was würde Ihnen am meisten helfen?"', correct: true, feedback: 'Perfekt! Empathie, Social Proof, offene Frage.' },
              { id: 3, text: '„Sie müssen es einfach nutzen."', correct: false, feedback: 'Zu autoritär. Schafft Widerstand.' }
            ]
          }
        ]
      },
      {
        id: 'presentation',
        title: 'Lösungspräsentation',
        description: 'System vorstellen und Mehrwert zeigen',
        tasks: [
          {
            id: 'task4',
            type: 'question',
            title: 'Wert für Pflegekräfte',
            description: 'Mehrwert für den Alltag kommunizieren',
            question: 'Wie präsentieren Sie die mobile Dokumentation wertorientiert?',
            options: [
              { id: 1, text: '„Sie können am Tablet dokumentieren."', correct: false, feedback: 'Zu technisch. Fehlt der Nutzen.' },
              { id: 2, text: '„Sie dokumentieren direkt am Bett, sparen Wege und haben mehr Zeit für die Bewohner."', correct: true, feedback: 'Perfekt! Konkreter Nutzen für den Alltag.' },
              { id: 3, text: '„Es ist modern."', correct: false, feedback: 'Zu vage. Kein konkreter Wert.' }
            ]
          }
        ]
      },
      {
        id: 'closing',
        title: 'Abschluss',
        description: 'Zum Abschluss führen',
        tasks: [
          {
            id: 'task5',
            type: 'question',
            title: 'Pilotprojekt vorschlagen',
            description: 'Risiko reduzieren durch Pilot',
            question: 'Die Pflegedienstleitung ist interessiert, aber unsicher. Wie schlagen Sie vor?',
            options: [
              { id: 1, text: '„Sie müssen das ganze System kaufen."', correct: false, feedback: 'Zu risikoreich für den Kunden.' },
              { id: 2, text: '„Wie wäre es mit einem 3-Monats-Pilot in einer Station? So können Sie es risikofrei testen."', correct: true, feedback: 'Sehr gut! Risiko reduziert, natürlicher Abschluss.' },
              { id: 3, text: '„Sie können es ja mal probieren."', correct: false, feedback: 'Zu vage. Keine klare Handlung.' }
            ]
          }
        ]
      }
    ]
  },
  { 
    id: 'kita', 
    title: 'Kita - Elternkommunikations- und Abrechnungs-App', 
    industry: 'education', 
    difficulty: 'intermediate',
    description: 'Kita-App mit Datenschutz verkaufen',
    situation: 'Eine Kita prüft eine Elternkommunikations- und Abrechnungs-App',
    challenge: 'Leitung sorgt sich um Datenschutz und Bedienbarkeit',
    goal: 'App erfolgreich einführen und Eltern begeistern',
    timeLimit: 15,
    stakeholders: ['Kitaleitung', 'Erzieherinnen', 'Elternbeirat'],
    objections: ['Datenschutz-Bedenken', 'Zu teuer', 'Zu kompliziert', 'Eltern-Akzeptanz unklar'],
    questions: [
      'Wie kommunizieren Sie aktuell mit Eltern?',
      'Welche Datenschutz-Anforderungen haben Sie?',
      'Wie digital sind Ihre Eltern?',
      'Wer entscheidet über neue Tools?'
    ],
    phases: [
      {
        id: 'opening',
        title: 'Gesprächseröffnung',
        description: 'Vertrauen mit der Kitaleitung aufbauen',
        tasks: [
          {
            id: 'task1',
            type: 'question',
            title: 'Empathische Eröffnung',
            description: 'Respekt für die Arbeit in der Kita zeigen',
            question: 'Sie treffen die Kitaleitung. Wie eröffnen Sie das Gespräch?',
            options: [
              { id: 1, text: '„Ich habe eine App, die Sie brauchen."', correct: false, feedback: 'Zu direkt. Fehlt Empathie und Respekt.' },
              { id: 2, text: '„Guten Tag, vielen Dank für Ihre Zeit. Wie kommunizieren Sie aktuell mit den Eltern?"', correct: true, feedback: 'Perfekt! Zeigt Respekt und Interesse an der aktuellen Situation.' },
              { id: 3, text: '„Ich verkaufe Apps für Kitas."', correct: false, feedback: 'Zu verkaufsorientiert. Kunde fühlt sich unter Druck gesetzt.' }
            ]
          }
        ]
      },
      {
        id: 'discovery',
        title: 'Bedarfsanalyse',
        description: 'Herausforderungen in der Elternkommunikation verstehen',
        tasks: [
          {
            id: 'task2',
            type: 'question',
            title: 'Situation verstehen',
            description: 'Aktuelle Kommunikationswege identifizieren',
            question: 'Die Kitaleitung erwähnt, dass sie per E-Mail und Zettel kommunizieren. Wie vertiefen Sie das?',
            options: [
              { id: 1, text: '„Das ist veraltet. Sie brauchen eine App."', correct: false, feedback: 'Zu kritisch. Ignoriert die aktuelle Situation.' },
              { id: 2, text: '„Wie funktioniert das im Alltag? Was klappt gut, wo gibt es Herausforderungen?"', correct: true, feedback: 'Sehr gut! Offene Fragen, zeigt Interesse an Problemen.' },
              { id: 3, text: '„Unsere App ist besser."', correct: false, feedback: 'Zu früh zur Lösung. Erst Situation verstehen.' }
            ]
          },
          {
            id: 'task3',
            type: 'objection',
            title: 'Datenschutz-Bedenken',
            description: 'DSGVO-Konformität transparent kommunizieren',
            question: 'Die Kitaleitung fragt: "Wie ist das mit dem Datenschutz? Wir haben Kinderdaten." Wie reagieren Sie?',
            options: [
              { id: 1, text: '„Das ist kein Problem."', correct: false, feedback: 'Zu oberflächlich. Kunde braucht Details.' },
              { id: 2, text: '„Sehr gute Frage! Unsere App ist DSGVO-konform, speichert in Deutschland und wir haben ein AVV. Darf ich Ihnen unsere Datenschutzerklärung zeigen?"', correct: true, feedback: 'Perfekt! Konkret, transparent, vertrauensbildend.' },
              { id: 3, text: '„Das ist kompliziert zu erklären."', correct: false, feedback: 'Wirkt unsicher. Kunde verliert Vertrauen.' }
            ]
          },
          {
            id: 'task4',
            type: 'question',
            title: 'Problem-Identifikation',
            description: 'Herausforderungen bei der Kommunikation finden',
            question: 'Die Kitaleitung erwähnt, dass wichtige Infos manchmal untergehen. Wie vertiefen Sie das Problem?',
            options: [
              { id: 1, text: '„Unsere App löst das."', correct: false, feedback: 'Zu früh zur Lösung. Erst Problem verstehen.' },
              { id: 2, text: '„Was bedeutet das konkret? Welche Folgen hat das für Sie und die Eltern?"', correct: true, feedback: 'Sehr gut! Problemfrage mit Implikation.' },
              { id: 3, text: '„Das ist normal."', correct: false, feedback: 'Ignoriert das Problem. Verpasste Chance.' }
            ]
          }
        ]
      },
      {
        id: 'presentation',
        title: 'Lösungspräsentation',
        description: 'App vorstellen und Mehrwert für Kita und Eltern zeigen',
        tasks: [
          {
            id: 'task5',
            type: 'question',
            title: 'Wert-Kommunikation',
            description: 'Mehrwert statt Features präsentieren',
            question: 'Wie präsentieren Sie die Push-Benachrichtigungen wertorientiert?',
            options: [
              { id: 1, text: '„Die App hat Push-Benachrichtigungen."', correct: false, feedback: 'Zu technisch. Kunde versteht den Wert nicht.' },
              { id: 2, text: '„Eltern erhalten wichtige Infos sofort aufs Handy. Das bedeutet: Keine verpassten Termine, weniger Rückfragen, mehr Zeit für die Kinder."', correct: true, feedback: 'Perfekt! Wert und Nutzen klar kommuniziert.' },
              { id: 3, text: '„Es ist modern."', correct: false, feedback: 'Zu vage. Kein konkreter Nutzen.' }
            ]
          },
          {
            id: 'task6',
            type: 'objection',
            title: 'Bedienbarkeit-Einwand',
            description: 'Einfachheit und Schulung kommunizieren',
            question: 'Eine Erzieherin sagt: "Das ist zu kompliziert für uns." Wie reagieren Sie?',
            options: [
              { id: 1, text: '„Das stimmt nicht, es ist einfach."', correct: false, feedback: 'Zu defensiv. Ignoriert die Bedenken.' },
              { id: 2, text: '„Ich verstehe Ihre Sorge. Wir bieten eine kostenlose Schulung und Support. Viele Kitas sagen, dass es nach 2 Tagen selbstverständlich ist. Darf ich Ihnen zeigen, wie einfach es ist?"', correct: true, feedback: 'Sehr gut! Empathie, Social Proof, konkrete Unterstützung.' },
              { id: 3, text: '„Sie müssen es einfach nutzen."', correct: false, feedback: 'Zu autoritär. Schafft Widerstand.' }
            ]
          },
          {
            id: 'task7',
            type: 'objection',
            title: 'Preis-Einwand',
            description: 'Wert statt Preis kommunizieren',
            question: 'Die Kitaleitung sagt: "Das ist zu teuer für uns." Wie reagieren Sie?',
            options: [
              { id: 1, text: '„Dann können wir leider nicht zusammenarbeiten."', correct: false, feedback: 'Zu schnell aufgegeben. Preis-Einwand ist oft versteckter Einwand.' },
              { id: 2, text: '„Teuer im Vergleich zu was? Was kostet Sie die aktuelle Kommunikation an Zeit und verpassten Infos?"', correct: true, feedback: 'Sehr gut! Wert-Kommunikation statt Preisdiskussion.' },
              { id: 3, text: '„Ich kann Ihnen 20% Rabatt geben."', correct: false, feedback: 'Zu schnell nachgegeben. Wert nicht kommuniziert.' }
            ]
          }
        ]
      },
      {
        id: 'closing',
        title: 'Abschluss',
        description: 'Zum Abschluss führen und Pilot vorschlagen',
        tasks: [
          {
            id: 'task8',
            type: 'question',
            title: 'Pilotprojekt vorschlagen',
            description: 'Risiko reduzieren durch Testphase',
            question: 'Die Kitaleitung ist interessiert, aber unsicher wegen der Eltern-Akzeptanz. Wie schlagen Sie vor?',
            options: [
              { id: 1, text: '„Sie müssen die App für alle Eltern kaufen."', correct: false, feedback: 'Zu risikoreich für den Kunden.' },
              { id: 2, text: '„Wie wäre es mit einem 2-Monats-Pilot mit einer Gruppe? So können Sie und die Eltern es risikofrei testen."', correct: true, feedback: 'Sehr gut! Risiko reduziert, natürlicher Abschluss.' },
              { id: 3, text: '„Sie können es ja mal probieren."', correct: false, feedback: 'Zu vage. Keine klare Handlung.' }
            ]
          }
        ]
      }
    ]
  },
  { 
    id: 'export', 
    title: 'Export - Ursprung, Präferenzen und Sanktionslisten', 
    industry: 'logistics', 
    difficulty: 'advanced',
    description: 'Export-Compliance-Lösung verkaufen',
    situation: 'Sie verkaufen eine Export-Compliance-Software an ein Handelsunternehmen',
    challenge: 'Komplexe Zoll- und Sanktionsregelungen verstehen und kommunizieren',
    goal: 'Software-Lizenz für 50.000€/Jahr verkaufen',
    timeLimit: 25,
    stakeholders: ['Export-Leiter', 'Compliance-Officer', 'Geschäftsführung'],
    objections: ['Zu komplex', 'Hohe Kosten', 'Unklarer ROI', 'Implementierungsaufwand'],
    questions: [
      'Welche Länder exportieren Sie?',
      'Wie handhaben Sie aktuell Compliance?',
      'Welche Sanktionslisten sind relevant?',
      'Wer ist für Export-Entscheidungen zuständig?'
    ],
    phases: [
      {
        id: 'opening',
        title: 'Gesprächseröffnung',
        description: 'Professioneller Erstkontakt mit Export-Leiter',
        tasks: [
          {
            id: 'task1',
            type: 'question',
            title: 'Professionelle Eröffnung',
            description: 'Expertise und Verständnis für Export-Compliance zeigen',
            question: 'Sie treffen den Export-Leiter. Wie eröffnen Sie das Gespräch?',
            options: [
              { id: 1, text: '„Ich habe eine Software für Sie."', correct: false, feedback: 'Zu direkt. Fehlt Kontext und Expertise.' },
              { id: 2, text: '„Guten Tag, vielen Dank für Ihre Zeit. Wie handhaben Sie aktuell Export-Compliance und Sanktionsprüfungen?"', correct: true, feedback: 'Perfekt! Zeigt Fachwissen und Interesse an der aktuellen Situation.' },
              { id: 3, text: '„Ich verkaufe Compliance-Software."', correct: false, feedback: 'Zu verkaufsorientiert. Kunde fühlt sich unter Druck gesetzt.' }
            ]
          }
        ]
      },
      {
        id: 'discovery',
        title: 'Bedarfsanalyse',
        description: 'Compliance-Herausforderungen und Risiken identifizieren',
        tasks: [
          {
            id: 'task2',
            type: 'question',
            title: 'Situation verstehen',
            description: 'Aktuelle Compliance-Prozesse analysieren',
            question: 'Der Export-Leiter erwähnt, dass sie manuell Sanktionslisten prüfen. Wie vertiefen Sie das?',
            options: [
              { id: 1, text: '„Das ist ineffizient. Sie brauchen unsere Software."', correct: false, feedback: 'Zu kritisch. Ignoriert die aktuelle Situation.' },
              { id: 2, text: '„Wie läuft das im Detail ab? Wie viele Exporte prüfen Sie pro Woche? Wie lange dauert eine Prüfung?"', correct: true, feedback: 'Sehr gut! Konkrete Situationsfragen mit Zahlen.' },
              { id: 3, text: '„Unsere Software ist schneller."', correct: false, feedback: 'Zu früh zur Lösung. Erst Situation verstehen.' }
            ]
          },
          {
            id: 'task3',
            type: 'question',
            title: 'Problem-Identifikation',
            description: 'Risiken und Herausforderungen identifizieren',
            question: 'Der Compliance-Officer erwähnt, dass manuelle Prüfungen fehleranfällig sind. Wie vertiefen Sie das Problem?',
            options: [
              { id: 1, text: '„Das ist gefährlich."', correct: false, feedback: 'Zu alarmierend. Wirkt übertrieben.' },
              { id: 2, text: '„Was bedeutet das konkret? Welche Risiken bestehen? Was wäre der Worst Case bei einem Fehler?"', correct: true, feedback: 'Perfekt! Problemfrage mit Implikation und Risikobewertung.' },
              { id: 3, text: '„Unsere Software verhindert Fehler."', correct: false, feedback: 'Zu früh zur Lösung. Erst Problem verstehen.' }
            ]
          },
          {
            id: 'task4',
            type: 'objection',
            title: 'Komplexitäts-Einwand',
            description: 'Komplexität als Stärke positionieren',
            question: 'Der Export-Leiter sagt: "Das System klingt zu komplex für uns." Wie reagieren Sie?',
            options: [
              { id: 1, text: '„Das stimmt nicht, es ist einfach."', correct: false, feedback: 'Zu defensiv. Ignoriert die Bedenken.' },
              { id: 2, text: '„Ich verstehe Ihre Sorge. Export-Compliance ist komplex – genau deshalb automatisieren wir das. Sie müssen sich nicht mit den Details beschäftigen, das System macht es für Sie."', correct: true, feedback: 'Sehr gut! Anerkennt Komplexität, zeigt wie die Lösung sie reduziert.' },
              { id: 3, text: '„Sie müssen es einfach nutzen."', correct: false, feedback: 'Zu autoritär. Schafft Widerstand.' }
            ]
          }
        ]
      },
      {
        id: 'presentation',
        title: 'Lösungspräsentation',
        description: 'Compliance-Lösung präsentieren und ROI zeigen',
        tasks: [
          {
            id: 'task5',
            type: 'question',
            title: 'Wert-Kommunikation',
            description: 'Mehrwert statt Features präsentieren',
            question: 'Wie präsentieren Sie die automatische Sanktionsprüfung wertorientiert?',
            options: [
              { id: 1, text: '„Die Software prüft automatisch Sanktionslisten."', correct: false, feedback: 'Zu technisch. Kunde versteht den Wert nicht.' },
              { id: 2, text: '„Jeder Export wird automatisch gegen aktuelle Sanktionslisten geprüft. Das bedeutet: Keine Compliance-Risiken, keine Bußgelder, keine Reputationsschäden. Sie sparen Zeit und schlafen ruhiger."', correct: true, feedback: 'Perfekt! Wert, Risikominimierung und Nutzen klar kommuniziert.' },
              { id: 3, text: '„Es ist sicher."', correct: false, feedback: 'Zu vage. Kein konkreter Nutzen.' }
            ]
          },
          {
            id: 'task6',
            type: 'objection',
            title: 'ROI-Einwand',
            description: 'ROI konkret berechnen und kommunizieren',
            question: 'Die Geschäftsführung fragt: "Wie rechtfertigen wir 50.000€ pro Jahr?" Wie reagieren Sie?',
            options: [
              { id: 1, text: '„Das ist der Preis."', correct: false, feedback: 'Zu passiv. Kein Wert kommuniziert.' },
              { id: 2, text: '„Lassen Sie uns das durchrechnen: Wie viel kostet Sie eine manuelle Prüfung? Was wäre ein Compliance-Verstoß wert? Bei 1000 Exporten pro Jahr und 10 Minuten pro Prüfung sparen Sie [X] Stunden. Ein Verstoß kann [Y]€ kosten. Die Software amortisiert sich schnell."', correct: true, feedback: 'Sehr gut! Konkrete ROI-Berechnung mit Zahlen.' },
              { id: 3, text: '„Es ist eine Investition."', correct: false, feedback: 'Zu vage. Keine konkreten Zahlen.' }
            ]
          },
          {
            id: 'task7',
            type: 'objection',
            title: 'Implementierungsaufwand',
            description: 'Implementierung als machbar darstellen',
            question: 'Der IT-Leiter sagt: "Die Implementierung wird zu aufwendig." Wie reagieren Sie?',
            options: [
              { id: 1, text: '„Das stimmt nicht."', correct: false, feedback: 'Zu defensiv. Ignoriert die Bedenken.' },
              { id: 2, text: '„Ich verstehe Ihre Sorge. Wir bieten vollständige Implementierungsunterstützung, Schulungen und einen dedizierten Ansprechpartner. Viele Kunden sind nach 4-6 Wochen produktiv. Darf ich Ihnen unseren Implementierungsplan zeigen?"', correct: true, feedback: 'Perfekt! Konkrete Unterstützung, Zeitrahmen, Social Proof.' },
              { id: 3, text: '„Sie müssen es einfach implementieren."', correct: false, feedback: 'Zu autoritär. Schafft Widerstand.' }
            ]
          }
        ]
      },
      {
        id: 'closing',
        title: 'Abschluss',
        description: 'Zum Abschluss führen und nächste Schritte definieren',
        tasks: [
          {
            id: 'task8',
            type: 'question',
            title: 'Abschlussfrage',
            description: 'Natürlich zum Abschluss führen',
            question: 'Die Geschäftsführung zeigt Interesse. Wie führen Sie zum Abschluss?',
            options: [
              { id: 1, text: '„Wollen Sie jetzt kaufen?"', correct: false, feedback: 'Zu direkt. Wirkt aufdringlich.' },
              { id: 2, text: '„Wie klingt das für Sie – sollen wir mit der Implementierung im nächsten Quartal starten? Ich bereite Ihnen gerne ein konkretes Angebot vor."', correct: true, feedback: 'Perfekt! Alternativfrage mit konkretem nächsten Schritt.' },
              { id: 3, text: '„Sie können sich ja noch überlegen."', correct: false, feedback: 'Zu passiv. Verpasste Chance.' }
            ]
          }
        ]
      }
    ]
  },
  { 
    id: 'sekretaerin', 
    title: 'Sekretärin - Gatekeeper überwinden', 
    industry: 'sales', 
    difficulty: 'beginner',
    description: 'Gatekeeper überwinden und Termin vereinbaren',
    situation: 'Sie versuchen einen Termin mit dem Geschäftsführer zu vereinbaren',
    challenge: 'Die Sekretärin blockiert alle Verkaufsgespräche',
    goal: 'Termin mit Entscheidungsträger vereinbaren',
    timeLimit: 8,
    stakeholders: ['Sekretärin', 'Geschäftsführer'],
    objections: ['Keine Zeit', 'Nicht interessiert', 'Bereits andere Anbieter', 'Zu teuer'],
    questions: [
      'Wie erreiche ich den Geschäftsführer?',
      'Was ist der beste Zeitpunkt?',
      'Wie überzeuge ich die Sekretärin?',
      'Welche Argumente helfen?'
    ],
    phases: [
      {
        id: 'opening',
        title: 'Kontaktaufnahme',
        description: 'Professioneller Erstkontakt mit der Sekretärin',
        tasks: [
          {
            id: 'task1',
            type: 'question',
            title: 'Erstkontakt',
            description: 'Respektvoll und wertschätzend Kontakt aufnehmen',
            question: 'Sie rufen an und die Sekretärin geht ran. Wie beginnen Sie?',
            options: [
              { id: 1, text: '„Ich möchte mit dem Geschäftsführer sprechen."', correct: false, feedback: 'Zu direkt. Ignoriert die Sekretärin.' },
              { id: 2, text: '„Guten Tag, mein Name ist [Ihr Name]. Ich helfe Unternehmen bei [Nutzen]. Ist der Geschäftsführer verfügbar?"', correct: true, feedback: 'Perfekt! Höflich, klar, zeigt Wert.' },
              { id: 3, text: '„Ist der Chef da?"', correct: false, feedback: 'Zu unprofessionell und respektlos.' }
            ]
          }
        ]
      },
      {
        id: 'objection-handling',
        title: 'Einwandbehandlung',
        description: 'Typische Gatekeeper-Einwände professionell behandeln',
        tasks: [
          {
            id: 'task2',
            type: 'objection',
            title: 'Keine Zeit',
            description: 'Zeit-Einwand der Sekretärin',
            question: 'Die Sekretärin sagt: "Der Geschäftsführer hat keine Zeit." Wie reagieren Sie?',
            options: [
              { id: 1, text: '„Dann rufe ich später an."', correct: false, feedback: 'Zu passiv. Verpasste Chance.' },
              { id: 2, text: '„Das verstehe ich. Wann wäre ein guter Zeitpunkt? Oder soll ich eine kurze E-Mail mit 3 Vorteilen schicken?"', correct: true, feedback: 'Sehr gut! Zeigt Verständnis, bietet Alternative.' },
              { id: 3, text: '„Das ist wichtig, ich muss mit ihm sprechen."', correct: false, feedback: 'Zu aufdringlich. Erzeugt Widerstand.' }
            ]
          },
          {
            id: 'task3',
            type: 'objection',
            title: 'Nicht interessiert',
            description: 'Interesse wecken',
            question: 'Die Sekretärin sagt: "Wir sind nicht interessiert." Wie reagieren Sie?',
            options: [
              { id: 1, text: '„Okay, dann nicht."', correct: false, feedback: 'Zu schnell aufgegeben.' },
              { id: 2, text: '„Das verstehe ich. Viele Kunden dachten das auch, bis sie sahen, wie [konkreter Nutzen]. Darf ich 2 Minuten erklären, warum es relevant sein könnte?"', correct: true, feedback: 'Perfekt! Social Proof, konkreter Nutzen, kurze Zeit.' },
              { id: 3, text: '„Sie müssen interessiert sein."', correct: false, feedback: 'Zu aggressiv. Schafft Widerstand.' }
            ]
          }
        ]
      },
      {
        id: 'value-proposition',
        title: 'Wertversprechen',
        description: 'Kurzen, prägnanten Nutzen kommunizieren',
        tasks: [
          {
            id: 'task4',
            type: 'question',
            title: 'Elevator Pitch',
            description: 'Kurzer, überzeugender Nutzen',
            question: 'Die Sekretärin fragt: "Worum geht es denn?" Wie antworten Sie?',
            options: [
              { id: 1, text: '„Wir verkaufen Software."', correct: false, feedback: 'Zu vage. Kein Nutzen.' },
              { id: 2, text: '„Wir helfen Unternehmen, [konkrete Zeitersparnis/Messgröße] zu erreichen. Ein 15-Minuten-Gespräch reicht, um zu sehen, ob es passt."', correct: true, feedback: 'Perfekt! Konkreter Nutzen, niedrige Hürde.' },
              { id: 3, text: '„Das ist kompliziert zu erklären."', correct: false, feedback: 'Wirkt unsicher. Kein Vertrauen.' }
            ]
          }
        ]
      },
      {
        id: 'closing',
        title: 'Terminvereinbarung',
        description: 'Konkreten Termin vereinbaren',
        tasks: [
          {
            id: 'task5',
            type: 'question',
            title: 'Termin vereinbaren',
            description: 'Konkreten nächsten Schritt setzen',
            question: 'Die Sekretärin zeigt Interesse. Wie vereinbaren Sie den Termin?',
            options: [
              { id: 1, text: '„Soll ich einfach vorbeikommen?"', correct: false, feedback: 'Zu unverbindlich. Kein konkreter Termin.' },
              { id: 2, text: '„Perfekt! Passt Ihnen nächste Woche Dienstag, 14 Uhr, oder Donnerstag, 10 Uhr besser?"', correct: true, feedback: 'Sehr gut! Alternativfrage mit konkreten Optionen.' },
              { id: 3, text: '„Rufen Sie mich an, wenn Sie Zeit haben."', correct: false, feedback: 'Zu passiv. Verpasste Chance.' }
            ]
          }
        ]
      }
    ]
  },
  { 
    id: 'datenschutz', 
    title: 'Datenschutz - DSB-Bewertung einer SaaS-Lösung', 
    industry: 'compliance', 
    difficulty: 'intermediate',
    description: 'DSGVO-konforme SaaS-Lösung verkaufen',
    situation: 'Sie verkaufen eine SaaS-Lösung an ein Unternehmen mit DSB',
    challenge: 'Datenschutzbeauftragter prüft DSGVO-Konformität',
    goal: 'Vertrag über 30.000€/Jahr abschließen',
    timeLimit: 20,
    stakeholders: ['DSB', 'Geschäftsführung', 'IT-Leiter', 'Rechtsabteilung'],
    objections: ['DSGVO-Risiko', 'Subprozessoren unklar', 'Löschkonzept unzureichend', 'AVV fehlt'],
    questions: [
      'Welche Daten verarbeiten Sie?',
      'Wie ist Ihr aktueller Datenschutz organisiert?',
      'Welche Subprozessoren nutzen Sie?',
      'Wie lange speichern Sie Daten?'
    ],
    phases: [
      {
        id: 'opening',
        title: 'Gesprächseröffnung',
        description: 'Professioneller Erstkontakt mit DSB',
        tasks: [
          {
            id: 'task1',
            type: 'question',
            title: 'Respektvolle Eröffnung',
            description: 'Expertise des DSB anerkennen',
            question: 'Sie treffen den Datenschutzbeauftragten. Wie eröffnen Sie das Gespräch?',
            options: [
              { id: 1, text: '„Ich habe eine DSGVO-konforme Lösung."', correct: false, feedback: 'Zu direkt. Fehlt Respekt für die Expertise des DSB.' },
              { id: 2, text: '„Guten Tag, vielen Dank für Ihre Zeit. Ich weiß, dass Datenschutz für Sie Priorität hat. Welche Anforderungen haben Sie an SaaS-Lösungen?"', correct: true, feedback: 'Perfekt! Zeigt Respekt und Interesse an den Anforderungen.' },
              { id: 3, text: '„Ich verkaufe Software."', correct: false, feedback: 'Zu verkaufsorientiert. Kunde fühlt sich unter Druck gesetzt.' }
            ]
          }
        ]
      },
      {
        id: 'discovery',
        title: 'Bedarfsanalyse',
        description: 'Datenschutz-Anforderungen und Risiken identifizieren',
        tasks: [
          {
            id: 'task2',
            type: 'question',
            title: 'Situation verstehen',
            description: 'Aktuelle Datenschutz-Organisation analysieren',
            question: 'Der DSB erwähnt, dass sie bereits mehrere SaaS-Lösungen nutzen. Wie vertiefen Sie das?',
            options: [
              { id: 1, text: '„Unsere Lösung ist besser."', correct: false, feedback: 'Zu kritisch. Ignoriert die aktuelle Situation.' },
              { id: 2, text: '„Wie handhaben Sie aktuell die DSGVO-Compliance bei Ihren SaaS-Lösungen? Welche Herausforderungen gibt es?"', correct: true, feedback: 'Sehr gut! Offene Fragen, zeigt Interesse an Herausforderungen.' },
              { id: 3, text: '„Unsere Lösung ist DSGVO-konform."', correct: false, feedback: 'Zu früh zur Lösung. Erst Situation verstehen.' }
            ]
          },
          {
            id: 'task3',
            type: 'question',
            title: 'Problem-Identifikation',
            description: 'Datenschutz-Risiken identifizieren',
            question: 'Der DSB erwähnt, dass die Prüfung neuer Lösungen zeitaufwendig ist. Wie vertiefen Sie das Problem?',
            options: [
              { id: 1, text: '„Das ist ineffizient."', correct: false, feedback: 'Zu kritisch. Ignoriert die Komplexität.' },
              { id: 2, text: '„Was bedeutet das konkret? Wie lange dauert eine Prüfung? Welche Risiken bestehen bei unzureichender Prüfung?"', correct: true, feedback: 'Perfekt! Problemfrage mit Implikation und Risikobewertung.' },
              { id: 3, text: '„Unsere Lösung ist schnell geprüft."', correct: false, feedback: 'Zu früh zur Lösung. Erst Problem verstehen.' }
            ]
          },
          {
            id: 'task4',
            type: 'objection',
            title: 'Subprozessoren-Einwand',
            description: 'Transparenz bei Subprozessoren zeigen',
            question: 'Der DSB fragt: "Welche Subprozessoren nutzen Sie? Das ist unklar." Wie reagieren Sie?',
            options: [
              { id: 1, text: '„Das ist kompliziert."', correct: false, feedback: 'Wirkt unsicher. Kunde verliert Vertrauen.' },
              { id: 2, text: '„Sehr gute Frage! Hier ist unsere vollständige Liste der Subprozessoren mit Standorten und Zwecken. Alle haben AVVs mit uns. Darf ich Ihnen die Dokumentation zeigen?"', correct: true, feedback: 'Perfekt! Transparent, vollständig, vertrauensbildend.' },
              { id: 3, text: '„Das ist kein Problem."', correct: false, feedback: 'Zu oberflächlich. Kunde braucht Details.' }
            ]
          }
        ]
      },
      {
        id: 'presentation',
        title: 'Lösungspräsentation',
        description: 'DSGVO-Konformität präsentieren und Vertrauen aufbauen',
        tasks: [
          {
            id: 'task5',
            type: 'question',
            title: 'Wert-Kommunikation',
            description: 'Mehrwert statt Features präsentieren',
            question: 'Wie präsentieren Sie die DSGVO-Konformität wertorientiert?',
            options: [
              { id: 1, text: '„Unsere Lösung ist DSGVO-konform."', correct: false, feedback: 'Zu technisch. Kunde versteht den Wert nicht.' },
              { id: 2, text: '„Wir erfüllen alle DSGVO-Anforderungen: Daten in Deutschland, vollständige AVVs, Löschkonzept, Datenschutzfolgenabschätzung. Das bedeutet: Keine Compliance-Risiken für Sie, schnelle Prüfung, mehr Sicherheit."', correct: true, feedback: 'Perfekt! Konkrete Maßnahmen, Wert und Nutzen klar kommuniziert.' },
              { id: 3, text: '„DSGVO ist wichtig."', correct: false, feedback: 'Zu vage. Kein konkreter Nutzen.' }
            ]
          },
          {
            id: 'task6',
            type: 'objection',
            title: 'Löschkonzept-Einwand',
            description: 'Löschkonzept transparent darstellen',
            question: 'Der DSB fragt: "Wie funktioniert das Löschkonzept? Das ist unzureichend dokumentiert." Wie reagieren Sie?',
            options: [
              { id: 1, text: '„Das ist kompliziert zu erklären."', correct: false, feedback: 'Wirkt unsicher. Kunde verliert Vertrauen.' },
              { id: 2, text: '„Sehr gute Frage! Hier ist unser detailliertes Löschkonzept: Automatische Löschung nach [X] Jahren, manuelle Löschung auf Anfrage innerhalb von [Y] Tagen, vollständige Dokumentation. Darf ich Ihnen die Details zeigen?"', correct: true, feedback: 'Sehr gut! Konkret, transparent, vollständig.' },
              { id: 3, text: '„Das ist kein Problem."', correct: false, feedback: 'Zu oberflächlich. Kunde braucht Details.' }
            ]
          },
          {
            id: 'task7',
            type: 'objection',
            title: 'AVV-Einwand',
            description: 'AVV-Vorlage anbieten und Transparenz zeigen',
            question: 'Der DSB sagt: "Sie haben kein AVV vorgelegt." Wie reagieren Sie?',
            options: [
              { id: 1, text: '„Das brauchen Sie nicht."', correct: false, feedback: 'Falsch! AVV ist bei Auftragsverarbeitung Pflicht.' },
              { id: 2, text: '„Selbstverständlich! Hier ist unsere AVV-Vorlage nach Art. 28 DSGVO. Wir passen sie gerne an Ihre Anforderungen an. Haben Sie spezielle Anforderungen?"', correct: true, feedback: 'Perfekt! Professionell, transparent, kooperativ.' },
              { id: 3, text: '„Das kommt später."', correct: false, feedback: 'Zu unverbindlich. Kunde braucht Sicherheit.' }
            ]
          }
        ]
      },
      {
        id: 'closing',
        title: 'Abschluss',
        description: 'Zum Abschluss führen mit DSB-Zustimmung',
        tasks: [
          {
            id: 'task8',
            type: 'question',
            title: 'Abschlussfrage',
            description: 'Natürlich zum Abschluss führen',
            question: 'Der DSB zeigt grünes Licht und die Geschäftsführung ist interessiert. Wie führen Sie zum Abschluss?',
            options: [
              { id: 1, text: '„Wollen Sie jetzt kaufen?"', correct: false, feedback: 'Zu direkt. Wirkt aufdringlich.' },
              { id: 2, text: '„Perfekt! Wie klingt das für Sie – sollen wir den Vertrag für den 1. nächsten Monat starten? Ich bereite Ihnen gerne das finale Angebot mit allen DSGVO-Dokumenten vor."', correct: true, feedback: 'Perfekt! Alternativfrage mit konkretem Starttermin und DSGVO-Fokus.' },
              { id: 3, text: '„Sie können sich ja noch überlegen."', correct: false, feedback: 'Zu passiv. Verpasste Chance.' }
            ]
          }
        ]
      }
    ]
  },
  { 
    id: 'einwandbehandlung', 
    title: 'Einwandbehandlung - Professionelle Gesprächsführung', 
    industry: 'sales', 
    difficulty: 'intermediate',
    description: 'Lerne, wie du die häufigsten Einwände professionell behandelst und in Verkaufschancen umwandelst.',
    situation: 'Sie führen ein Verkaufsgespräch und müssen verschiedene Einwände professionell behandeln',
    challenge: 'Verschiedene Einwandtypen erkennen und passende Antwortstrategien anwenden',
    goal: 'Einwände in Verkaufschancen umwandeln und Vertrauen aufbauen',
    timeLimit: 25,
    stakeholders: ['Kunde', 'Entscheidungsträger', 'Beeinflusser'],
    objections: ['Preis-Einwände', 'Zeit-Einwände', 'Vertrauens-Einwände', 'Konkurrenz-Einwände'],
    questions: [
      'Welche Einwandtypen kennen Sie?',
      'Wie gehen Sie mit Preis-Einwänden um?',
      'Was tun bei Zeit-Einwänden?',
      'Wie bauen Sie Vertrauen auf?',
      'Wie positionieren Sie sich gegen Konkurrenz?'
    ],
    learningContent: {
      title: 'Einwandbehandlung meistern',
      description: 'Lerne, wie du die häufigsten Einwände professionell behandelst und in Verkaufschancen umwandelst.',
      categories: [
        {
          name: 'Preis-Einwände',
          description: 'Strategien für "zu teuer" und Budget-Einwände',
          techniques: ['ROI-Rechnung', 'Wert-Demonstration', 'Zahlungsmodalitäten', 'Preisvergleich']
        },
        {
          name: 'Zeit-Einwände', 
          description: 'Umgang mit "keine Zeit" und Timing-Problemen',
          techniques: ['Prioritäten klären', 'Zeit sparen zeigen', 'Terminvereinbarung', 'Dringlichkeit schaffen']
        },
        {
          name: 'Vertrauens-Einwände',
          description: 'Vertrauen aufbauen bei Skepsis und Misstrauen',
          techniques: ['Referenzen zeigen', 'Testimonials', 'Probezeit anbieten', 'Garantien geben']
        },
        {
          name: 'Konkurrenz-Einwände',
          description: 'Positionierung gegen Mitbewerber',
          techniques: ['Differenzierung', 'Alleinstellungsmerkmale', 'Vergleichsgespräch', 'Zusatznutzen']
        }
      ],
      methods: [
        'ZHL-Methode (Zustimmen – Hinterfragen – Lösen)',
        'Feel-Felt-Found-Methode', 
        'Spiegeln & Verstehen statt Überreden',
        'Fragetechniken zur Einwand-Analyse',
        'Sandwich-Technik (positiv – Einwand – positiv)'
      ]
    },
    phases: [
      {
        id: 'preis-einwaende',
        title: 'Preis-Einwände',
        description: 'Strategien für "zu teuer" und Budget-Einwände',
        tasks: [
          {
            id: 'task1',
            type: 'objection',
            title: 'Preis-Einwand: ZHL-Methode',
            description: 'Zustimmen – Hinterfragen – Lösen anwenden',
            question: 'Der Kunde sagt: "Das ist zu teuer für uns." Wie reagieren Sie mit der ZHL-Methode?',
            options: [
              { id: 1, text: '„Das stimmt nicht, es ist günstig."', correct: false, feedback: 'Zu defensiv. Ignoriert den Einwand.' },
              { id: 2, text: '„Das verstehe ich. Teuer im Vergleich zu was? Was kostet Sie die aktuelle Lösung an Zeit und Problemen?"', correct: true, feedback: 'Perfekt! ZHL-Methode: Zustimmen, Hinterfragen, dann Wert zeigen.' },
              { id: 3, text: '„Ich kann Ihnen 20% Rabatt geben."', correct: false, feedback: 'Zu schnell nachgegeben. Wert nicht kommuniziert.' }
            ]
          },
          {
            id: 'task2',
            type: 'objection',
            title: 'ROI-Rechnung',
            description: 'Wert statt Preis kommunizieren',
            question: 'Der Kunde sagt: "Wir haben kein Budget dafür." Wie reagieren Sie?',
            options: [
              { id: 1, text: '„Dann können wir leider nicht zusammenarbeiten."', correct: false, feedback: 'Zu schnell aufgegeben. Budget-Einwand ist oft versteckter Einwand.' },
              { id: 2, text: '„Das verstehe ich. Lassen Sie uns den ROI durchrechnen: Was kostet Sie die aktuelle Situation? Was sparen Sie mit unserer Lösung? Die Amortisation liegt bei [X] Monaten."', correct: true, feedback: 'Sehr gut! ROI-Rechnung mit konkreten Zahlen.' },
              { id: 3, text: '„Sie müssen es einfach kaufen."', correct: false, feedback: 'Zu autoritär. Schafft Widerstand.' }
            ]
          }
        ]
      },
      {
        id: 'zeit-einwaende',
        title: 'Zeit-Einwände',
        description: 'Umgang mit "keine Zeit" und Timing-Problemen',
        tasks: [
          {
            id: 'task3',
            type: 'objection',
            title: 'Zeit-Einwand: Prioritäten klären',
            description: 'Dringlichkeit und Priorität identifizieren',
            question: 'Der Kunde sagt: "Wir haben gerade keine Zeit dafür." Wie reagieren Sie?',
            options: [
              { id: 1, text: '„Dann rufe ich später an."', correct: false, feedback: 'Zu passiv. Verpasste Chance.' },
              { id: 2, text: '„Das verstehe ich. Was hat aktuell Priorität? Was würde passieren, wenn Sie das Problem nicht lösen?"', correct: true, feedback: 'Sehr gut! Prioritäten klären, Dringlichkeit zeigen.' },
              { id: 3, text: '„Sie müssen sich Zeit nehmen."', correct: false, feedback: 'Zu aufdringlich. Erzeugt Widerstand.' }
            ]
          },
          {
            id: 'task4',
            type: 'objection',
            title: 'Zeit sparen zeigen',
            description: 'Zeitersparnis als Wert kommunizieren',
            question: 'Der Kunde sagt: "Die Implementierung kostet zu viel Zeit." Wie reagieren Sie?',
            options: [
              { id: 1, text: '„Das stimmt nicht."', correct: false, feedback: 'Zu defensiv. Ignoriert die Bedenken.' },
              { id: 2, text: '„Ich verstehe Ihre Sorge. Lassen Sie mich zeigen, wie Sie langfristig Zeit sparen: [konkrete Zeitersparnis]. Die Implementierung dauert [X] Wochen, danach sparen Sie [Y] Stunden pro Woche."', correct: true, feedback: 'Perfekt! Zeitersparnis konkret kommuniziert.' },
              { id: 3, text: '„Sie müssen es einfach machen."', correct: false, feedback: 'Zu autoritär. Schafft Widerstand.' }
            ]
          }
        ]
      },
      {
        id: 'vertrauens-einwaende',
        title: 'Vertrauens-Einwände',
        description: 'Vertrauen aufbauen bei Skepsis und Misstrauen',
        tasks: [
          {
            id: 'task5',
            type: 'objection',
            title: 'Feel-Felt-Found-Methode',
            description: 'Empathie, Social Proof und Lösung kombinieren',
            question: 'Der Kunde sagt: "Ich traue dem nicht. Das klingt zu gut, um wahr zu sein." Wie reagieren Sie?',
            options: [
              { id: 1, text: '„Das stimmt schon."', correct: false, feedback: 'Zu defensiv. Ignoriert die Skepsis.' },
              { id: 2, text: '„Ich verstehe, dass Sie skeptisch sind. Viele unserer Kunden dachten das auch (Felt), bis sie es ausprobiert haben (Found). Darf ich Ihnen Referenzen zeigen?"', correct: true, feedback: 'Perfekt! Feel-Felt-Found-Methode mit Social Proof.' },
              { id: 3, text: '„Sie müssen mir vertrauen."', correct: false, feedback: 'Zu aufdringlich. Erzeugt Widerstand.' }
            ]
          },
          {
            id: 'task6',
            type: 'objection',
            title: 'Referenzen und Testimonials',
            description: 'Social Proof nutzen',
            question: 'Der Kunde sagt: "Ich kenne Ihr Unternehmen nicht." Wie reagieren Sie?',
            options: [
              { id: 1, text: '„Wir sind groß."', correct: false, feedback: 'Zu vage. Kein konkreter Beweis.' },
              { id: 2, text: '„Das verstehe ich. Hier sind 3 Referenzen aus Ihrer Branche mit ähnlichen Herausforderungen. Darf ich Ihnen zeigen, wie wir ihnen geholfen haben?"', correct: true, feedback: 'Sehr gut! Konkrete Referenzen mit Relevanz.' },
              { id: 3, text: '„Sie müssen uns einfach vertrauen."', correct: false, feedback: 'Zu aufdringlich. Kein Beweis.' }
            ]
          },
          {
            id: 'task7',
            type: 'objection',
            title: 'Probezeit anbieten',
            description: 'Risiko reduzieren',
            question: 'Der Kunde sagt: "Ich bin unsicher, ob das funktioniert." Wie reagieren Sie?',
            options: [
              { id: 1, text: '„Das funktioniert schon."', correct: false, feedback: 'Zu defensiv. Ignoriert die Unsicherheit.' },
              { id: 2, text: '„Das verstehe ich. Wie wäre es mit einer 30-Tage-Probezeit? So können Sie es risikofrei testen. Wenn es nicht passt, kostet es Sie nichts."', correct: true, feedback: 'Perfekt! Risiko reduziert, natürlicher Abschluss.' },
              { id: 3, text: '„Sie müssen es einfach probieren."', correct: false, feedback: 'Zu autoritär. Schafft Widerstand.' }
            ]
          }
        ]
      },
      {
        id: 'konkurrenz-einwaende',
        title: 'Konkurrenz-Einwände',
        description: 'Positionierung gegen Mitbewerber',
        tasks: [
          {
            id: 'task8',
            type: 'objection',
            title: 'Differenzierung',
            description: 'Alleinstellungsmerkmale kommunizieren',
            question: 'Der Kunde sagt: "Wir prüfen auch andere Anbieter." Wie reagieren Sie?',
            options: [
              { id: 1, text: '„Die sind schlechter."', correct: false, feedback: 'Zu negativ. Kritisiert Konkurrenz direkt.' },
              { id: 2, text: '„Das verstehe ich. Was ist Ihnen bei der Auswahl wichtig? Lassen Sie mich zeigen, was uns auszeichnet: [konkrete Alleinstellungsmerkmale]."', correct: true, feedback: 'Sehr gut! Differenzierung ohne Konkurrenz zu kritisieren.' },
              { id: 3, text: '„Sie müssen uns wählen."', correct: false, feedback: 'Zu autoritär. Schafft Widerstand.' }
            ]
          },
          {
            id: 'task9',
            type: 'objection',
            title: 'Vergleichsgespräch',
            description: 'Vergleich konstruktiv nutzen',
            question: 'Der Kunde sagt: "Anbieter X ist günstiger." Wie reagieren Sie?',
            options: [
              { id: 1, text: '„Die sind schlecht."', correct: false, feedback: 'Zu negativ. Kritisiert Konkurrenz direkt.' },
              { id: 2, text: '„Das verstehe ich. Preis ist wichtig, aber auch der Wert. Lassen Sie uns vergleichen: Was bietet Anbieter X? Was bieten wir zusätzlich? Wo liegt der Mehrwert?"', correct: true, feedback: 'Perfekt! Konstruktiver Vergleich, Fokus auf Wert.' },
              { id: 3, text: '„Sie müssen mehr bezahlen."', correct: false, feedback: 'Zu direktiv. Kein Wert kommuniziert.' }
            ]
          }
        ]
      },
      {
        id: 'closing',
        title: 'Abschluss',
        description: 'Nach Einwandbehandlung zum Abschluss führen',
        tasks: [
          {
            id: 'task10',
            type: 'question',
            title: 'Abschlussfrage nach Einwand',
            description: 'Natürlich zum Abschluss führen',
            question: 'Sie haben alle Einwände behandelt und der Kunde zeigt Interesse. Wie führen Sie zum Abschluss?',
            options: [
              { id: 1, text: '„Wollen Sie jetzt kaufen?"', correct: false, feedback: 'Zu direkt. Wirkt aufdringlich.' },
              { id: 2, text: '„Perfekt! Wie klingt das für Sie – sollen wir mit [konkreter nächster Schritt] starten?"', correct: true, feedback: 'Perfekt! Alternativfrage mit konkretem nächsten Schritt.' },
              { id: 3, text: '„Sie können sich ja noch überlegen."', correct: false, feedback: 'Zu passiv. Verpasste Chance.' }
            ]
          }
        ]
      }
    ]
  }
];

app.get('/api/health', (_req, res) => {
  res.json({ ok: true });
});

app.get('/api/scenarios', async (req, res) => {
  try {
    // Try to fetch from database first, fallback to static data
    if (sql) {
      try {
        const dbScenarios = await sql`SELECT * FROM scenarios ORDER BY id`;
        if (dbScenarios && dbScenarios.length > 0) {
          return res.json({ scenarios: dbScenarios });
        }
      } catch (dbError) {
        console.log('Database not ready, using static data:', dbError.message);
      }
    } else {
      console.log('No database connection, using static data');
    }
    
    // Fallback to static data
    res.json({ scenarios });
  } catch (error) {
    console.error('Error fetching scenarios:', error);
    res.status(500).json({ error: 'Failed to fetch scenarios' });
  }
});

app.get('/api/scenarios/:id', (req, res) => {
  const scenario = scenarios.find(s => s.id === req.params.id);
  if (scenario) {
    res.json(scenario);
  } else {
    res.status(404).json({ error: 'Szenario nicht gefunden' });
  }
});

app.get('/api/quiz', (_req, res) => {
  res.json({ items: [] });
});

app.get('/api/quiz/:topic', (req, res) => {
  // Placeholder for quiz data by topic
  res.json({ 
    topic: req.params.topic,
    questions: [],
    message: 'Quiz-System wird implementiert'
  });
});

// User Progress API – für eingeloggten User (Session)
app.get('/api/progress/me', async (req, res) => {
  try {
    const userId = req.session?.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Nicht angemeldet' });
    }
    if (!sql) {
      return res.json({ progress: [], trainingActivity: [], totalScenarios: 0 });
    }
    const progress = await sql`
      SELECT s.id, s.title, s.industry, up.completed, up.score, up.completed_at
      FROM user_progress up
      LEFT JOIN scenarios s ON up.scenario_id = s.id
      WHERE up.user_id = ${String(userId)}
      ORDER BY up.completed_at DESC
    `;
    const trainingActivity = await sql`
      SELECT module_id, completed_at
      FROM user_training_activity
      WHERE user_id = ${String(userId)}
      ORDER BY completed_at DESC
    `;
    const scenarioCount = await sql`SELECT COUNT(*)::int AS c FROM scenarios`.catch(() => [{ c: 0 }]);
    const totalScenarios = (scenarioCount[0]?.c) ?? 0;
    res.json({
      progress: progress || [],
      trainingActivity: trainingActivity || [],
      totalScenarios,
    });
  } catch (error) {
    console.error('Error fetching progress:', error);
    res.status(500).json({ error: 'Failed to fetch progress' });
  }
});

// Legacy: Progress by userId (für Kompatibilität)
app.get('/api/progress/:userId', async (req, res) => {
  try {
    if (!sql) return res.json({ progress: [] });
    const userId = req.params.userId;
    const progress = await sql`
      SELECT s.title, s.industry, up.completed, up.score, up.completed_at
      FROM user_progress up
      LEFT JOIN scenarios s ON up.scenario_id = s.id
      WHERE up.user_id = ${userId}
      ORDER BY up.completed_at DESC
    `;
    res.json({ progress: progress || [] });
  } catch (error) {
    console.error('Error fetching progress:', error);
    res.status(500).json({ error: 'Failed to fetch progress' });
  }
});

// Save Progress API – verwendet Session-User
app.post('/api/progress', async (req, res) => {
  try {
    const userId = req.session?.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Nicht angemeldet' });
    }
    if (!sql) {
      return res.json({ success: true, message: 'Progress not saved (no database connection)' });
    }
    const { scenarioId, completed, score } = req.body;
    const sid = typeof scenarioId === 'number' ? scenarioId : parseInt(scenarioId, 10);
    if (Number.isNaN(sid)) {
      return res.status(400).json({ error: 'Ungültige scenarioId' });
    }
    const result = await sql`
      INSERT INTO user_progress (user_id, scenario_id, completed, score, completed_at)
      VALUES (${String(userId)}, ${sid}, ${!!completed}, ${score ?? 0}, ${completed ? new Date() : null})
      ON CONFLICT (user_id, scenario_id) 
      DO UPDATE SET 
        completed = ${!!completed},
        score = ${score ?? 0},
        completed_at = ${completed ? new Date() : null}
      RETURNING *
    `;
    res.json({ success: true, data: result[0] });
  } catch (error) {
    console.error('Error saving progress:', error);
    res.status(500).json({ error: 'Failed to save progress' });
  }
});

// Training-Modul abgeschlossen (Vertriebs-Training)
app.post('/api/training-complete', async (req, res) => {
  try {
    const userId = req.session?.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Nicht angemeldet' });
    }
    if (!sql) {
      return res.json({ success: true });
    }
    const { moduleId } = req.body || {};
    if (!moduleId || typeof moduleId !== 'string') {
      return res.status(400).json({ error: 'moduleId erforderlich' });
    }
    await sql`
      INSERT INTO user_training_activity (user_id, module_id, completed_at)
      VALUES (${String(userId)}, ${moduleId}, ${new Date()})
      ON CONFLICT (user_id, module_id) DO UPDATE SET completed_at = ${new Date()}
    `;
    res.json({ success: true });
  } catch (error) {
    console.error('Error saving training:', error);
    res.status(500).json({ error: 'Failed to save training' });
  }
});

// Lern-Insights: einzelne Antwort speichern (richtig/falsch pro Frage)
app.post('/api/insights/answer', async (req, res) => {
  try {
    const userId = req.session?.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Nicht angemeldet' });
    }
    if (!sql) {
      return res.json({ success: true });
    }
    const { moduleId, questionId, correct } = req.body || {};
    if (!moduleId || typeof moduleId !== 'string') {
      return res.status(400).json({ error: 'moduleId erforderlich' });
    }
    const isCorrect = correct === true;
    await sql`
      INSERT INTO user_question_stats (user_id, module_id, correct_answers, total_answers, updated_at)
      VALUES (${String(userId)}, ${moduleId}, ${isCorrect ? 1 : 0}, 1, ${new Date()})
      ON CONFLICT (user_id, module_id) DO UPDATE SET
        correct_answers = user_question_stats.correct_answers + ${isCorrect ? 1 : 0},
        total_answers = user_question_stats.total_answers + 1,
        updated_at = ${new Date()}
    `;
    res.json({ success: true });
  } catch (error) {
    console.error('Error saving insight answer:', error);
    res.status(500).json({ error: 'Fehler beim Speichern' });
  }
});

// Lern-Insights: aggregierte Statistik für eingeloggten User (Bereiche mit häufigsten Fehlern)
const MODULE_TITLES = {
  'objection-handling': 'Einwandbehandlung',
  'question-techniques': 'Fragetechniken',
  'sales-psychology': 'Verkaufspsychologie',
  'sales-language': 'Verkaufssprache',
  'practice-quiz-einwaende': 'Adaptives Quiz (Einwände)',
  'practice-quiz-fragen': 'Adaptives Quiz (Fragen)',
  'practice-flashcards': 'Karteikarten',
  'practice-rollenspiel': 'Rollenspiel',
  'practice-micro-einwaende': 'Mikro-Learning (Einwände)',
  'practice-micro-spin': 'Mikro-Learning (SPIN)'
};

const MODULE_RECOMMENDATIONS = {
  'objection-handling': {
    low: 'Wiederhole Modul „Preis-Einwände" in 2 Tagen',
    mid: 'Fokus auf „Konkurrenz-Einwände"',
    high: 'Weiter mit „Funnel-Fragen – Fortgeschritten"'
  },
  'question-techniques': {
    low: 'Wiederhole „SPIN-Selling" und „BANT-Qualifizierung"',
    mid: 'Fokus auf „Offene vs. geschlossene Fragen"',
    high: 'Weiter mit „Funnel-Fragen – Fortgeschritten"'
  },
  'sales-psychology': {
    low: 'Wiederhole Grundlagen „DISC" und „Reziprozität"',
    mid: 'Fokus auf „Reziprozität in B2B"',
    high: 'Weiter mit „Knappheit und sozialer Beweis"'
  },
  'sales-language': {
    low: 'Wiederhole „Professionelle Formulierungen"',
    mid: 'Fokus auf „Wert-Kommunikation"',
    high: 'Weiter mit „Abschluss-Formulierungen"'
  },
  'practice-quiz-einwaende': {
    low: 'Wiederhole Einwandbehandlung im Vertriebs-Training',
    mid: 'Mehr Übung im Adaptiven Quiz „Einwände"',
    high: 'Weiter mit Fragetechniken oder Rollenspiel'
  },
  'practice-quiz-fragen': {
    low: 'Wiederhole Fragetechniken im Vertriebs-Training',
    mid: 'Mehr Übung im Adaptiven Quiz „Fragen"',
    high: 'Weiter mit Einwandbehandlung oder Mikro-Learning'
  },
  'practice-flashcards': {
    low: 'Karteikarten häufiger durchgehen, Schwer-Karten wiederholen',
    mid: 'Schwer bewertete Karten gezielt üben',
    high: 'Weiter mit Quiz oder Rollenspiel'
  },
  'practice-rollenspiel': {
    low: 'Rollenspiel-Szenarien mehrfach durchspielen',
    mid: 'Fokus auf Kundentyp und Feedback im Rollenspiel',
    high: 'Weiter mit Herausforderung oder Mikro-Learning'
  },
  'practice-micro-einwaende': {
    low: 'Mikro-Learning „Einwände" wiederholen',
    mid: 'Weitere Einheiten zu Einwandbehandlung',
    high: 'Weiter mit SPIN oder Vertriebs-Training'
  },
  'practice-micro-spin': {
    low: 'Mikro-Learning „SPIN" wiederholen',
    mid: 'Weitere Einheiten zu Fragetechniken',
    high: 'Weiter mit Einwände oder Vertriebs-Training'
  }
};

function getRecommendation(moduleId, percentage) {
  const rec = MODULE_RECOMMENDATIONS[moduleId];
  if (!rec) return 'Weiter üben.';
  if (percentage < 70) return rec.low;
  if (percentage < 90) return rec.mid;
  return rec.high;
}

app.get('/api/insights/me', async (req, res) => {
  try {
    const userId = req.session?.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Nicht angemeldet' });
    }
    if (!sql) {
      return res.json({ insights: [] });
    }
    const rows = await sql`
      SELECT module_id, correct_answers, total_answers
      FROM user_question_stats
      WHERE user_id = ${String(userId)} AND total_answers > 0
      ORDER BY (correct_answers::float / NULLIF(total_answers, 0)) ASC, total_answers DESC
    `;
    const insights = rows.map((r) => {
      const pct = r.total_answers > 0 ? Math.round((r.correct_answers / r.total_answers) * 100) : 0;
      return {
        moduleId: r.module_id,
        title: MODULE_TITLES[r.module_id] || r.module_id,
        correctAnswers: r.correct_answers,
        totalAnswers: r.total_answers,
        percentageCorrect: pct,
        recommendation: getRecommendation(r.module_id, pct)
      };
    });
    res.json({ insights });
  } catch (error) {
    console.error('Error fetching insights:', error);
    res.status(500).json({ error: 'Fehler beim Laden der Insights' });
  }
});

// Leitfäden API-Endpunkte
app.get('/api/guides/me', async (req, res) => {
  try {
    const userId = req.session?.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Nicht angemeldet' });
    }
    if (!sql) {
      return res.json({ guides: [] });
    }
    const guides = await sql`
      SELECT id, title, items, usps, created_at, updated_at
      FROM user_guides
      WHERE user_id = ${String(userId)}
      ORDER BY updated_at DESC
    `;
    res.json({ guides: guides.map(g => ({
      id: g.id,
      title: g.title,
      items: g.items,
      usps: g.usps,
      createdAt: g.created_at,
      updatedAt: g.updated_at
    })) });
  } catch (error) {
    console.error('Error fetching guides:', error);
    res.status(500).json({ error: 'Fehler beim Laden der Leitfäden' });
  }
});

app.post('/api/guides', async (req, res) => {
  try {
    const userId = req.session?.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Nicht angemeldet' });
    }
    if (!sql) {
      return res.status(503).json({ error: 'Datenbank nicht verfügbar' });
    }
    const { title, items, usps } = req.body;
    if (!title || !items || !Array.isArray(items)) {
      return res.status(400).json({ error: 'Titel und Items sind erforderlich' });
    }
    const result = await sql`
      INSERT INTO user_guides (user_id, title, items, usps)
      VALUES (${String(userId)}, ${title}, ${JSON.stringify(items)}, ${usps ? JSON.stringify(usps) : null})
      RETURNING id, title, items, usps, created_at, updated_at
    `;
    res.json({ 
      success: true, 
      guide: {
        id: result[0].id,
        title: result[0].title,
        items: result[0].items,
        usps: result[0].usps,
        createdAt: result[0].created_at,
        updatedAt: result[0].updated_at
      }
    });
  } catch (error) {
    console.error('Error saving guide:', error);
    res.status(500).json({ error: 'Fehler beim Speichern des Leitfadens' });
  }
});

app.put('/api/guides/:id', async (req, res) => {
  try {
    const userId = req.session?.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Nicht angemeldet' });
    }
    if (!sql) {
      return res.status(503).json({ error: 'Datenbank nicht verfügbar' });
    }
    const guideId = parseInt(req.params.id, 10);
    if (Number.isNaN(guideId)) {
      return res.status(400).json({ error: 'Ungültige Leitfaden-ID' });
    }
    const { title, items, usps } = req.body;
    
    // Prüfen ob Leitfaden dem User gehört
    const existing = await sql`
      SELECT user_id FROM user_guides WHERE id = ${guideId}
    `;
    if (!existing || existing.length === 0) {
      return res.status(404).json({ error: 'Leitfaden nicht gefunden' });
    }
    if (existing[0].user_id !== String(userId)) {
      return res.status(403).json({ error: 'Keine Berechtigung' });
    }
    
    const result = await sql`
      UPDATE user_guides
      SET title = ${title}, items = ${JSON.stringify(items)}, usps = ${usps ? JSON.stringify(usps) : null}, updated_at = CURRENT_TIMESTAMP
      WHERE id = ${guideId} AND user_id = ${String(userId)}
      RETURNING id, title, items, usps, created_at, updated_at
    `;
    if (result.length === 0) {
      return res.status(404).json({ error: 'Leitfaden nicht gefunden' });
    }
    res.json({ 
      success: true, 
      guide: {
        id: result[0].id,
        title: result[0].title,
        items: result[0].items,
        usps: result[0].usps,
        createdAt: result[0].created_at,
        updatedAt: result[0].updated_at
      }
    });
  } catch (error) {
    console.error('Error updating guide:', error);
    res.status(500).json({ error: 'Fehler beim Aktualisieren des Leitfadens' });
  }
});

app.delete('/api/guides/:id', async (req, res) => {
  try {
    const userId = req.session?.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Nicht angemeldet' });
    }
    if (!sql) {
      return res.status(503).json({ error: 'Datenbank nicht verfügbar' });
    }
    const guideId = parseInt(req.params.id, 10);
    if (Number.isNaN(guideId)) {
      return res.status(400).json({ error: 'Ungültige Leitfaden-ID' });
    }
    const result = await sql`
      DELETE FROM user_guides
      WHERE id = ${guideId} AND user_id = ${String(userId)}
      RETURNING id
    `;
    if (result.length === 0) {
      return res.status(404).json({ error: 'Leitfaden nicht gefunden' });
    }
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting guide:', error);
    res.status(500).json({ error: 'Fehler beim Löschen des Leitfadens' });
  }
});

// USP-Extraktion aus Website (mit Groq API - kostenlos)
async function extractUSPsFromWebsite(websiteUrl, customInstructions = null) {
  try {
    console.log('Fetching website:', websiteUrl);
    if (customInstructions && customInstructions.trim()) {
      console.log('Custom instructions received:', customInstructions.substring(0, 100) + '...');
    }
    
    // Website-Inhalt fetchen mit User-Agent Header (manche Websites blockieren Requests ohne User-Agent)
    const response = await fetch(websiteUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });
    
    if (!response.ok) {
      throw new Error(`Website nicht erreichbar: HTTP ${response.status} - ${response.statusText}`);
    }
    
    const html = await response.text();
    console.log('Website fetched, HTML length:', html.length);
    
    if (!html || html.length < 100) {
      throw new Error('Website-Inhalt zu kurz oder leer');
    }
    
    // Einfache Text-Extraktion (kann später mit cheerio/jsdom verbessert werden)
    const textContent = html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .substring(0, 12000); // Limit für Groq (größer als OpenAI)
    
    if (!textContent || textContent.length < 50) {
      throw new Error('Kein verwertbarer Text aus Website extrahiert');
    }
    
    console.log('Text extracted, length:', textContent.length);
    
    // Groq API aufrufen (kostenlos)
    const groqApiKey = process.env.GROQ_API_KEY;
    if (!groqApiKey) {
      throw new Error('GROQ_API_KEY nicht gesetzt. Bitte setze die Umgebungsvariable GROQ_API_KEY in deiner .env Datei.');
    }
    
    // Erstelle den User-Prompt mit optionalen individuellen Anweisungen
    let userPrompt = '';
    
    if (customInstructions && customInstructions.trim()) {
      userPrompt += `⚠️ WICHTIGE ANWEISUNGEN - BITTE GENAU BEACHTEN:\n${customInstructions.trim()}\n\n`;
      userPrompt += `Analysiere den folgenden Website-Inhalt NUR im Kontext der obigen Anweisungen:\n\n${textContent}\n\n`;
    } else {
      userPrompt = `Analysiere folgende Website-Inhalt und extrahiere USPs in drei Kategorien:\n\n${textContent}\n\n`;
    }
    
    userPrompt += `Gib die USPs als JSON-Objekt zurück im Format:\n{\n  "grundsaetzlich": [{"title": "USP Titel", "description": "Beschreibung"}, ...],\n  "gegenueberKonkurrenten": [{"title": "USP Titel", "description": "Beschreibung"}, ...],\n  "gegenueberAlterenMethoden": [{"title": "USP Titel", "description": "Beschreibung"}, ...]\n}\n\n`;
    
    if (customInstructions && customInstructions.trim()) {
      userPrompt += `WICHTIG: Berücksichtige bei der Extraktion die oben genannten Anweisungen. Extrahiere NUR USPs, die zu den Anweisungen passen. Ignoriere alle anderen Inhalte.\n\n`;
    }
    
    userPrompt += `Analysiere den Inhalt sorgfältig und ordne die USPs den passenden Kategorien zu. Wenn eine Kategorie nicht zutrifft, gib ein leeres Array zurück.`;
    
    console.log('Calling Groq API...');
    if (customInstructions && customInstructions.trim()) {
      console.log('Prompt includes custom instructions');
      console.log('User prompt preview:', userPrompt.substring(0, 300) + '...');
    }
    
    const systemPrompt = customInstructions && customInstructions.trim()
      ? 'Du bist ein Experte für Verkaufsargumente. Analysiere eine Unternehmenswebsite und extrahiere Unique Selling Points (USPs) in drei Kategorien: 1) Grundsätzliche USPs (allgemeine Alleinstellungsmerkmale), 2) USPs gegenüber ähnlichen Konkurrenten (Differenzierung), 3) USPs gegenüber älteren Methoden (Innovation/Modernisierung). WICHTIG: Wenn der Nutzer spezifische Anweisungen gibt, befolge diese GENAU und extrahiere NUR die USPs, die zu diesen Anweisungen passen. Ignoriere alle anderen Inhalte, die nicht zu den Anweisungen passen. Gib die USPs als strukturiertes JSON-Objekt zurück.'
      : 'Du bist ein Experte für Verkaufsargumente. Analysiere eine Unternehmenswebsite und extrahiere Unique Selling Points (USPs) in drei Kategorien: 1) Grundsätzliche USPs (allgemeine Alleinstellungsmerkmale), 2) USPs gegenüber ähnlichen Konkurrenten (Differenzierung), 3) USPs gegenüber älteren Methoden (Innovation/Modernisierung). Gib die USPs als strukturiertes JSON-Objekt zurück.';
    
    const groqResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${groqApiKey}`
      },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant', // Kostenlos und sehr schnell (verfügbares Modell)
        messages: [
          {
            role: 'system',
            content: systemPrompt
          },
          {
            role: 'user',
            content: userPrompt
          }
        ],
        temperature: 0.7,
        max_tokens: 2000
      })
    });
    
    console.log('Groq API response status:', groqResponse.status);
    
    if (!groqResponse.ok) {
      const errorData = await groqResponse.json().catch(() => ({}));
      console.error('Groq API error:', errorData);
      throw new Error(`Groq API Fehler (${groqResponse.status}): ${errorData.error?.message || JSON.stringify(errorData)}`);
    }
    
    const groqData = await groqResponse.json();
    const content = groqData.choices?.[0]?.message?.content;
    
    if (!content) {
      console.error('No content in Groq response:', groqData);
      throw new Error('Keine Antwort von Groq API erhalten');
    }
    
    console.log('Groq response content length:', content.length);
    console.log('Groq response preview:', content.substring(0, 300));
    
    // JSON aus Antwort extrahieren (kann Objekt oder Array sein)
    let jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      // Fallback: Versuche Array zu finden
      jsonMatch = content.match(/\[[\s\S]*\]/);
    }
    
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[0]);
        
        // Wenn es ein Objekt mit Kategorien ist, gebe es so zurück
        if (parsed.grundsaetzlich || parsed.gegenueberKonkurrenten || parsed.gegenueberAlterenMethoden) {
          console.log('Successfully parsed categorized USPs:', {
            grundsaetzlich: parsed.grundsaetzlich?.length || 0,
            gegenueberKonkurrenten: parsed.gegenueberKonkurrenten?.length || 0,
            gegenueberAlterenMethoden: parsed.gegenueberAlterenMethoden?.length || 0
          });
          return {
            grundsaetzlich: parsed.grundsaetzlich || [],
            gegenueberKonkurrenten: parsed.gegenueberKonkurrenten || [],
            gegenueberAlterenMethoden: parsed.gegenueberAlterenMethoden || []
          };
        }
        
        // Wenn es ein Array ist (alte Format), konvertiere es
        if (Array.isArray(parsed)) {
          console.log('Found array format, converting to categorized format');
          return {
            grundsaetzlich: parsed,
            gegenueberKonkurrenten: [],
            gegenueberAlterenMethoden: []
          };
        }
        
        return parsed;
      } catch (parseError) {
        console.error('JSON parse error:', parseError);
        throw new Error(`JSON-Parsing fehlgeschlagen: ${parseError.message}`);
      }
    }
    
    // Fallback: Versuche die gesamte Antwort zu parsen
    try {
      const parsed = JSON.parse(content);
      if (parsed.grundsaetzlich || parsed.gegenueberKonkurrenten || parsed.gegenueberAlterenMethoden) {
        return {
          grundsaetzlich: parsed.grundsaetzlich || [],
          gegenueberKonkurrenten: parsed.gegenueberKonkurrenten || [],
          gegenueberAlterenMethoden: parsed.gegenueberAlterenMethoden || []
        };
      }
      if (Array.isArray(parsed)) {
        return {
          grundsaetzlich: parsed,
          gegenueberKonkurrenten: [],
          gegenueberAlterenMethoden: []
        };
      }
      return parsed;
    } catch (parseError) {
      console.error('Fallback JSON parse error:', parseError);
      throw new Error(`Konnte keine gültigen USPs aus der Antwort extrahieren. Antwort: ${content.substring(0, 500)}`);
    }
  } catch (error) {
    console.error('Error extracting USPs:', error);
    console.error('Error stack:', error.stack);
    throw error;
  }
}

// Challenge-Bewertung mit KI
app.post('/api/practice/evaluate-challenge', async (req, res) => {
  try {
    const userId = req.session?.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Nicht angemeldet' });
    }
    const { challengeTitle, situation, answer, criteria } = req.body;
    
    if (!answer || !answer.trim()) {
      return res.status(400).json({ error: 'Antwort ist erforderlich' });
    }
    
    if (!criteria || !Array.isArray(criteria) || criteria.length === 0) {
      return res.status(400).json({ error: 'Bewertungskriterien sind erforderlich' });
    }
    
    const groqApiKey = process.env.GROQ_API_KEY;
    if (!groqApiKey) {
      return res.status(500).json({ error: 'GROQ_API_KEY nicht gesetzt' });
    }
    
    console.log('Evaluating challenge answer:', {
      challengeTitle,
      situation: situation?.substring(0, 100),
      criteriaCount: criteria?.length,
      answerLength: answer?.length
    });
    
    if (!criteria || !Array.isArray(criteria) || criteria.length === 0) {
      console.error('Invalid criteria:', criteria);
      return res.status(400).json({ error: 'Ungültige Bewertungskriterien' });
    }
    
    // Erstelle den Prompt für die Bewertung
    const criteriaList = criteria.map((c, idx) => `${idx + 1}. ${c} (0-5 Punkte)`).join('\n');
    
    const userPrompt = `Du bist ein Experte für Verkaufstraining. Bewerte die folgende Verkaufsantwort nach den gegebenen Kriterien:

**Situation/Kundenaussage:**
${situation}

**Antwort des Verkäufers:**
${answer}

**Bewertungskriterien:**
${criteriaList}

**Aufgabe:**
1. Bewerte jeden Punkt von 0-5 Punkten
2. Gib konstruktives Feedback zur gegebenen Antwort
3. Erstelle eine BEISPIELANTWORT, die der Verkäufer hätte geben können, um 15/15 Punkte zu erreichen

**KRITISCH WICHTIG für die Beispielantwort - Professionelle Verkaufsstimme:**
- Die Beispielantwort muss eine VOLLSTÄNDIGE Antwort des Verkäufers sein (nicht nur die Situation wiederholen!)
- Sie muss direkt auf die Situation "${situation}" antworten
- Sie muss alle Bewertungskriterien perfekt erfüllen
- **SELBSTBEWUSST & PROFESSIONELL:** Die Antwort soll selbstbewusst und professionell klingen, NICHT defensiv oder rechtfertigend
- **WERTORIENTIERT:** Fokus auf den Mehrwert für den Kunden, nicht auf Rechtfertigung oder Entschuldigungen
- **PARTNERSCHAFTLICH:** Der Verkäufer bietet eine Lösung an, der Kunde kommt aus eigenem Interesse - nicht weil der Verkäufer ihn braucht
- **KEINE DEFENSIVITÄT:** Vermeide Formulierungen wie "Ich verstehe Ihre Bedenken", "Lassen Sie mich erklären", "Wir sind wirklich gut" - stattdessen: Fakten, Nutzen, konkrete Lösungen
- **SERIÖS & EXPERTENHAFT:** Die Antwort soll zeigen, dass der Verkäufer ein Experte ist, der dem Kunden hilft, nicht jemand der um den Kunden kämpft
- Konkret, überzeugend und wertorientiert sein
- Zeigen, wie man optimal auf die Kundenaussage reagiert, ohne sich zu rechtfertigen

Gib die Antwort als JSON-Objekt zurück im Format:
{
  "scores": {
    "${criteria[0]}": <0-5>,
    "${criteria[1]}": <0-5>,
    "${criteria[2]}": <0-5>
  },
  "totalScore": <Summe aller Punkte>,
  "feedback": "<Konstruktives Feedback zur gegebenen Antwort, was gut war und was verbessert werden kann. Achte darauf, ob die Antwort defensiv oder rechtfertigend klingt - das sollte vermieden werden.>",
  "bestAnswer": "<VOLLSTÄNDIGE Beispielantwort des Verkäufers, die direkt auf die Situation antwortet und alle Kriterien perfekt erfüllt. Die Antwort muss SELBSTBEWUSST, PROFESSIONELL und WERTORIENTIERT sein - NICHT defensiv oder rechtfertigend. Zeige, dass der Verkäufer ein Experte ist, der dem Kunden hilft, nicht jemand der um den Kunden kämpft.>"
}`;
    
    const groqResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${groqApiKey}`
      },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant',
        messages: [
          {
            role: 'system',
            content: 'Du bist ein Experte für professionelles Verkaufstraining und Bewertung von Verkaufsgesprächen. Professionelle Verkäufer sind selbstbewusst, wertorientiert und partnerschaftlich - sie rechtfertigen sich nicht und kämpfen nicht um Kunden. Sie bieten Lösungen an, die Kunden aus eigenem Interesse nutzen. Bewerte Antworten objektiv, konstruktiv und hilfreich. Gib immer konkrete Verbesserungsvorschläge. Wenn du eine Beispielantwort erstellst, muss diese eine VOLLSTÄNDIGE, SELBSTBEWUSSTE und PROFESSIONELLE Antwort des Verkäufers sein, die direkt auf die Kundenaussage reagiert - NICHT defensiv oder rechtfertigend, sondern wertorientiert und expertenhaft. Die Antwort soll zeigen, dass der Verkäufer dem Kunden hilft, nicht dass er den Kunden braucht.'
          },
          {
            role: 'user',
            content: userPrompt
          }
        ],
        temperature: 0.7,
        max_tokens: 1500
      })
    });
    
    if (!groqResponse.ok) {
      const errorData = await groqResponse.json().catch(() => ({}));
      throw new Error(`Groq API Fehler: ${groqResponse.status} - ${JSON.stringify(errorData)}`);
    }
    
    const groqData = await groqResponse.json();
    const content = groqData.choices?.[0]?.message?.content;
    
    if (!content) {
      throw new Error('Keine Antwort von Groq API');
    }
    
    // JSON aus Antwort extrahieren
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      let evaluation;
      try {
        evaluation = JSON.parse(jsonMatch[0]);
      } catch (parseError) {
        console.error('JSON parse error:', parseError);
        console.error('Content:', content.substring(0, 500));
        throw new Error(`JSON-Parsing fehlgeschlagen: ${parseError.message}`);
      }
      
      console.log('Parsed evaluation:', JSON.stringify(evaluation, null, 2));
      
      // Prüfe, ob bestAnswer die Situation wiederholt (Fehler der KI)
      if (evaluation.bestAnswer && typeof evaluation.bestAnswer === 'string') {
        const situationLower = situation.toLowerCase().trim();
        const bestAnswerLower = evaluation.bestAnswer.toLowerCase().trim();
        // Wenn die Beispielantwort zu ähnlich zur Situation ist, markiere es
        if (bestAnswerLower.includes(situationLower.substring(0, 20)) || 
            situationLower.includes(bestAnswerLower.substring(0, 20))) {
          console.warn('WARNING: bestAnswer seems to be a copy of the situation, not a real answer');
        }
      }
      
      // Validiere und normalisiere die Bewertung
      const normalizedScores = {};
      let totalScore = 0;
      
      criteria.forEach((criterion, idx) => {
        const score = evaluation.scores?.[criterion] || evaluation.scores?.[idx] || 0;
        const normalizedScore = Math.max(0, Math.min(5, Math.round(score)));
        normalizedScores[criterion] = normalizedScore;
        totalScore += normalizedScore;
      });
      
      // Stelle sicher, dass feedback und bestAnswer Strings sind
      let feedbackText = evaluation.feedback || 'Kein Feedback verfügbar.';
      if (typeof feedbackText !== 'string') {
        // Wenn es ein Objekt ist, versuche den Text zu extrahieren
        if (typeof feedbackText === 'object' && feedbackText !== null) {
          // Versuche verschiedene mögliche Keys
          feedbackText = feedbackText.text || feedbackText.message || feedbackText.content || 
                        feedbackText.feedback || Object.values(feedbackText)[0] || 
                        JSON.stringify(feedbackText);
          // Stelle sicher, dass es ein String ist
          if (typeof feedbackText !== 'string') {
            feedbackText = String(feedbackText);
          }
        } else {
          feedbackText = String(feedbackText);
        }
      }
      
      let bestAnswerText = evaluation.bestAnswer || null;
      if (bestAnswerText && typeof bestAnswerText !== 'string') {
        // Wenn es ein Objekt ist, versuche den Text zu extrahieren
        if (typeof bestAnswerText === 'object' && bestAnswerText !== null) {
          // Versuche verschiedene mögliche Keys
          bestAnswerText = bestAnswerText.text || bestAnswerText.message || bestAnswerText.content || 
                         bestAnswerText.answer || bestAnswerText.bestAnswer || Object.values(bestAnswerText)[0] || 
                         JSON.stringify(bestAnswerText);
          // Stelle sicher, dass es ein String ist
          if (typeof bestAnswerText !== 'string') {
            bestAnswerText = String(bestAnswerText);
          }
        } else {
          bestAnswerText = String(bestAnswerText);
        }
      }
      
      // Prüfe, ob bestAnswer nur die Situation wiederholt (Fehler der KI)
      if (bestAnswerText && typeof bestAnswerText === 'string') {
        const situationLower = situation.toLowerCase().trim();
        const bestAnswerLower = bestAnswerText.toLowerCase().trim();
        // Wenn die Beispielantwort zu ähnlich zur Situation ist, generiere eine neue
        if (bestAnswerLower === situationLower || 
            bestAnswerLower.includes(situationLower.substring(0, 30)) && bestAnswerLower.length < situationLower.length + 50) {
          console.warn('bestAnswer is too similar to situation, will request regeneration');
          // Setze bestAnswer auf null, damit es neu generiert wird
          bestAnswerText = null;
        }
      }
      
      // Wenn bestAnswer fehlt oder ungültig ist, generiere eine neue
      if (!bestAnswerText || bestAnswerText.trim().length < 20) {
        console.log('bestAnswer missing or too short, generating new one...');
        try {
          // Zweiter API-Call nur für die Beispielantwort
          const bestAnswerPrompt = `Erstelle eine VOLLSTÄNDIGE, PROFESSIONELLE Beispielantwort für einen Verkäufer, die auf folgende Kundenaussage reagiert:

**Kundenaussage:**
${situation}

**Bewertungskriterien (alle müssen erfüllt werden):**
${criteriaList}

Die Antwort muss:
- Direkt auf die Kundenaussage eingehen
- Alle Kriterien perfekt erfüllen
- SELBSTBEWUSST und PROFESSIONELL sein - NICHT defensiv oder rechtfertigend
- WERTORIENTIERT: Fokus auf den Mehrwert für den Kunden, nicht auf Entschuldigungen
- PARTNERSCHAFTLICH: Der Verkäufer ist ein Experte, der hilft - nicht jemand der um den Kunden kämpft
- SERIÖS & EXPERTENHAFT: Zeige Expertise und Kompetenz, nicht Verzweiflung
- Konkret, überzeugend und wertorientiert sein
- Eine echte Verkäuferantwort sein (nicht die Situation wiederholen!)

VERMEIDE:
- Rechtfertigungen ("Ich verstehe Ihre Bedenken", "Lassen Sie mich erklären")
- Defensive Formulierungen ("Wir sind wirklich gut", "Bitte geben Sie uns eine Chance")
- Bittende Töne ("Es wäre toll, wenn...", "Könnten Sie vielleicht...")

STATTDESSEN:
- Fakten und konkrete Nutzen präsentieren
- Lösungen anbieten, die den Kunden weiterbringen
- Selbstbewusst und expertenhaft kommunizieren

Gib NUR die Antwort zurück, ohne zusätzlichen Text oder Erklärungen.`;

          const bestAnswerResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${groqApiKey}`
            },
            body: JSON.stringify({
              model: 'llama-3.1-8b-instant',
              messages: [
                {
                  role: 'system',
                  content: 'Du bist ein Experte für professionelle Verkaufsgespräche. Professionelle Verkäufer sind selbstbewusst, wertorientiert und partnerschaftlich. Sie rechtfertigen sich nicht und kämpfen nicht um Kunden - sie bieten Lösungen an, die Kunden aus eigenem Interesse nutzen. Erstelle optimale, selbstbewusste Verkäuferantworten, die direkt auf Kundenaussagen reagieren, ohne defensiv oder rechtfertigend zu klingen. Die Antworten sollen zeigen, dass der Verkäufer ein Experte ist, der dem Kunden hilft.'
                },
                {
                  role: 'user',
                  content: bestAnswerPrompt
                }
              ],
              temperature: 0.7,
              max_tokens: 500
            })
          });
          
          if (bestAnswerResponse.ok) {
            const bestAnswerData = await bestAnswerResponse.json();
            let bestAnswerContent = bestAnswerData.choices?.[0]?.message?.content;
            
            // Entferne mögliche Markdown-Formatierung oder Anführungszeichen
            if (bestAnswerContent) {
              bestAnswerContent = bestAnswerContent.trim()
                .replace(/^["']|["']$/g, '') // Entferne Anführungszeichen am Anfang/Ende
                .replace(/^```[\w]*\n?|\n?```$/g, '') // Entferne Code-Blöcke
                .trim();
            }
            
            if (bestAnswerContent && bestAnswerContent.length > 20) {
              // Prüfe nochmal, ob es nicht die Situation ist
              const situationLower = situation.toLowerCase().trim();
              const answerLower = bestAnswerContent.toLowerCase().trim();
              
              if (answerLower !== situationLower && 
                  !(answerLower.includes(situationLower.substring(0, 30)) && answerLower.length < situationLower.length + 50)) {
                bestAnswerText = bestAnswerContent;
                console.log('Generated new bestAnswer:', bestAnswerText.substring(0, 100));
              } else {
                console.warn('Generated answer is still too similar to situation, using fallback');
                bestAnswerText = 'Eine optimale Antwort würde direkt auf die Kundenaussage eingehen, alle Bewertungskriterien erfüllen und wertorientiert sein.';
              }
            }
          }
        } catch (bestAnswerError) {
          console.error('Error generating bestAnswer:', bestAnswerError);
          // Fallback: Verwende einen Platzhalter
          bestAnswerText = 'Eine optimale Antwort würde direkt auf die Kundenaussage eingehen, alle Bewertungskriterien erfüllen und wertorientiert sein.';
        }
      }
      
      const result = {
        scores: normalizedScores,
        totalScore: totalScore,
        feedback: feedbackText,
        bestAnswer: bestAnswerText
      };
      
      console.log('Challenge evaluation successful:', {
        scores: result.scores,
        totalScore: result.totalScore,
        feedbackLength: result.feedback?.length,
        bestAnswerLength: result.bestAnswer?.length,
        bestAnswerPreview: result.bestAnswer?.substring(0, 100)
      });
      res.json({ success: true, evaluation: result });
    } else {
      throw new Error('Konnte keine Bewertung aus der Antwort extrahieren');
    }
  } catch (error) {
    console.error('Error evaluating challenge:', error);
    res.status(500).json({ 
      error: 'Fehler bei der Bewertung', 
      message: error.message 
    });
  }
});

// Stichpunkte-Konvertierung mit KI
app.post('/api/guides/convert-to-bullets', async (req, res) => {
  try {
    const userId = req.session?.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Nicht angemeldet' });
    }
    const { items } = req.body;
    if (!items || !Array.isArray(items)) {
      return res.status(400).json({ error: 'Items Array ist erforderlich' });
    }
    
    const groqApiKey = process.env.GROQ_API_KEY;
    if (!groqApiKey) {
      return res.status(500).json({ error: 'GROQ_API_KEY nicht gesetzt' });
    }
    
    // Erstelle Text aus allen Items
    const fullText = items.map(item => item.text).join('\n');
    
    console.log('Converting to bullets with AI, text length:', fullText.length);
    
    const groqResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${groqApiKey}`
      },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant',
        messages: [
          {
            role: 'system',
            content: 'Du bist ein Experte für kompakte Verkaufsformulierungen. Konvertiere Verkaufssätze in extrem kompakte Stichpunkte, die nur die wichtigsten Keywords enthalten. Der Sinn muss erhalten bleiben, aber verwende so wenig Wörter wie möglich. Entferne alle Füllwörter, Höflichkeitsfloskeln und überflüssige Artikel.'
          },
          {
            role: 'user',
            content: `Konvertiere folgende Verkaufssätze in extrem kompakte Stichpunkte (nur Keywords, Sinn erhalten):\n\n${fullText}\n\nGib die Stichpunkte als JSON-Array zurück im Format: ["Stichpunkt 1", "Stichpunkt 2", ...]\n\nJeder Stichpunkt sollte maximal 4-6 Wörter enthalten und nur die Kernaussage transportieren.`
          }
        ],
        temperature: 0.5,
        max_tokens: 1500
      })
    });
    
    if (!groqResponse.ok) {
      const errorData = await groqResponse.json().catch(() => ({}));
      throw new Error(`Groq API Fehler: ${groqResponse.status} - ${JSON.stringify(errorData)}`);
    }
    
    const groqData = await groqResponse.json();
    const content = groqData.choices?.[0]?.message?.content;
    
    if (!content) {
      throw new Error('Keine Antwort von Groq API');
    }
    
    // JSON aus Antwort extrahieren
    const jsonMatch = content.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      const bullets = JSON.parse(jsonMatch[0]);
      console.log('Successfully converted to bullets:', bullets.length);
      res.json({ success: true, bullets });
    } else {
      throw new Error('Konnte keine Stichpunkte aus der Antwort extrahieren');
    }
  } catch (error) {
    console.error('Error converting to bullets:', error);
    res.status(500).json({ 
      error: 'Fehler bei der Stichpunkte-Konvertierung', 
      message: error.message 
    });
  }
});

app.post('/api/guides/extract-usps', async (req, res) => {
  try {
    const userId = req.session?.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Nicht angemeldet' });
    }
    const { websiteUrl, instructions } = req.body;
    if (!websiteUrl) {
      return res.status(400).json({ error: 'Website-URL ist erforderlich' });
    }
    
    // URL validieren
    let url;
    try {
      url = new URL(websiteUrl);
      if (!['http:', 'https:'].includes(url.protocol)) {
        return res.status(400).json({ error: 'Nur HTTP/HTTPS URLs erlaubt' });
      }
    } catch {
      return res.status(400).json({ error: 'Ungültige URL' });
    }
    
    console.log('Starting USP extraction for URL:', url.toString());
    if (instructions && instructions.trim()) {
      console.log('With custom instructions:', instructions);
    } else {
      console.log('No custom instructions provided');
    }
    const usps = await extractUSPsFromWebsite(url.toString(), instructions);
    const totalCount = (usps.grundsaetzlich?.length || 0) + 
                      (usps.gegenueberKonkurrenten?.length || 0) + 
                      (usps.gegenueberAlterenMethoden?.length || 0);
    console.log('USP extraction successful, found', totalCount, 'USPs');
    res.json({ success: true, usps });
  } catch (error) {
    console.error('Error extracting USPs:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      websiteUrl: req.body.websiteUrl,
      userId: req.session?.user?.id
    });
    const errorMessage = error.message || 'Unbekannter Fehler';
    res.status(500).json({ 
      error: 'Fehler bei der USP-Extraktion', 
      message: errorMessage,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// DB-Init lazy beim ersten Request (kein Top-Level-Await für Netlify-Bundling)
let dbInitPromise = null;
if (isNetlify) {
  app.use(async (req, res, next) => {
    if (!dbInitPromise && sql) {
      dbInitPromise = initializeDatabase().catch((e) => {
        console.error('Netlify DB init error:', e?.message || e);
        return null;
      });
    }
    if (dbInitPromise) {
      await dbInitPromise;
    }
    next();
  });
}

export { app };

// Optional: Szenarien als JSON exportieren. Aufruf: WRITE_SCENARIOS_JSON=1 node backend/index.js
if (process.env.WRITE_SCENARIOS_JSON) {
  import('fs').then((fs) => {
    import('path').then((path) => {
      const outDir = path.join(__dirname, '..', 'frontend', 'public');
      fs.mkdirSync(outDir, { recursive: true });
      fs.writeFileSync(path.join(outDir, 'scenarios.json'), JSON.stringify({ scenarios }, null, 2), 'utf8');
      console.log('Wrote frontend/public/scenarios.json');
      process.exit(0);
    });
  });
} else if (!isNetlify) {
  // Lokal: Server starten (bei Netlify wird die App als Function verwendet)
  const startServer = async () => {
    const portsToTry = [PORT, 4001, 40011, 40012, 40013, 40014, 40015, 40016, 40017, 40018];
    let portIndex = 0;
    function tryListen(port) {
      const server = app.listen(port, async () => {
        console.log(`Backend listening on http://localhost:${server.address().port}`);
        await initializeDatabase();
      });
      server.on('error', (err) => {
        if (err.code === 'EADDRINUSE') {
          server.close(() => {});
          portIndex++;
          tryListen(portsToTry[portIndex] ?? port + 1);
        } else {
          console.error('Server error:', err);
        }
      });
    }
    tryListen(portsToTry[0]);
  };
  startServer();
}



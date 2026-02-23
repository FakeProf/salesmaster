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
import dns from 'dns/promises';
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
      CREATE TABLE IF NOT EXISTS user_spaced_repetition (
        id SERIAL PRIMARY KEY,
        user_id VARCHAR(255) NOT NULL,
        module_id VARCHAR(100) NOT NULL,
        question_id INTEGER NOT NULL,
        e_factor REAL DEFAULT 2.5,
        interval_days INTEGER DEFAULT 1,
        repetitions INTEGER DEFAULT 0,
        next_review_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        last_reviewed TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        difficulty_rating VARCHAR(20),
        UNIQUE(user_id, module_id, question_id)
      )
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS user_guides (
        id SERIAL PRIMARY KEY,
        user_id VARCHAR(255) NOT NULL,
        title VARCHAR(255) NOT NULL,
        items JSONB NOT NULL,
        usps JSONB,
        bullets JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;
    await sql`ALTER TABLE user_guides ADD COLUMN IF NOT EXISTS bullets JSONB`;

    await sql`
      CREATE TABLE IF NOT EXISTS shared_formulations (
        id SERIAL PRIMARY KEY,
        chapter_id VARCHAR(100) NOT NULL,
        text TEXT NOT NULL,
        created_by VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;
    await sql`
      CREATE TABLE IF NOT EXISTS shared_guides (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        items JSONB NOT NULL,
        usps JSONB,
        bullets JSONB,
        shared_by VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;
    console.log('Database tables initialized successfully');
  } catch (error) {
    console.log('Database initialization failed:', error.message);
  }
}

const VALID_LEITFADEN_CHAPTER_IDS = ['begruessung', 'einstieg', 'fragen', 'pitch', 'einwaende', 'abschluss', 'verabschiedung'];
function isThomasBoekeUser(req) {
  const email = req.session?.user?.email;
  if (!email || typeof email !== 'string') return false;
  return email.trim().toLowerCase().endsWith('@thomas-boeke.com');
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
    title: 'Buchhaltung - Fachinfodienst für GoBD-Compliance', 
    industry: 'finance', 
    difficulty: 'beginner',
    description: 'Fachinfodienst für Buchhaltung mit kostenlosem Testzeitraum verkaufen',
    situation: 'Sie präsentieren einen Fachinfodienst für Buchhaltung und GoBD-Compliance an ein mittelständisches Unternehmen',
    challenge: 'Die Buchhaltung zweifelt am Nutzen und der Aktualität der Informationen',
    goal: 'Abonnement für Fachinfodienst abschließen - kostenloser Testzeitraum, danach kann die Zeitschrift behalten werden',
    timeLimit: 12,
    stakeholders: ['Buchhalter', 'Geschäftsführer', 'Steuerberater'],
    objections: ['Nutzen unklar', 'Zu teuer für kleine Firma', 'Aktualität der Informationen', 'Brauchen wir nicht'],
    questions: [
      'Wie informieren Sie sich aktuell über GoBD-Anforderungen?',
      'Welche Informationsquellen nutzen Sie für Buchhaltung?',
      'Wie aktuell müssen Ihre Informationen sein?',
      'Wer entscheidet über Fachinfodienste?'
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
              { id: 1, text: '„Hallo, ich möchte Ihnen unseren Fachinfodienst vorstellen."', correct: false, feedback: 'Zu direkt. Fehlt die persönliche Ansprache.' },
              { id: 2, text: '„Guten Tag, vielen Dank für Ihre Zeit. Wie informieren Sie sich aktuell über GoBD-Anforderungen und Buchhaltungsthemen?"', correct: true, feedback: 'Perfekt! Offene Frage, zeigt Interesse am Kunden.' },
              { id: 3, text: '„Ich habe eine tolle Zeitschrift für Sie."', correct: false, feedback: 'Zu verkaufsorientiert. Kunde fühlt sich unter Druck gesetzt.' }
            ]
          },
          {
            id: 'task2',
            type: 'objection',
            title: 'Erster Einwand',
            description: 'Der Buchhalter zeigt Skepsis',
            question: 'Der Buchhalter sagt: "Wir haben schon Informationsquellen, die funktionieren." Wie reagieren Sie?',
            options: [
              { id: 1, text: '„Unser Fachinfodienst ist besser."', correct: false, feedback: 'Zu defensiv. Kritisiert den Kunden indirekt.' },
              { id: 2, text: '„Das verstehe ich. Welche Informationsquellen nutzen Sie? Was funktioniert gut, was könnte aktueller sein?"', correct: true, feedback: 'Sehr gut! Zeigt Respekt und öffnet das Gespräch.' },
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
              { id: 1, text: '„Wie informieren Sie sich aktuell über neue GoBD-Anforderungen und Buchhaltungsthemen?"', correct: true, feedback: 'Gut! Konkrete Situationsfrage zur Informationsbeschaffung.' },
              { id: 2, text: '„Möchten Sie unseren Fachinfodienst abonnieren?"', correct: false, feedback: 'Zu früh für Abschlussfrage. Erst Situation klären.' },
              { id: 3, text: '„Sind Ihre aktuellen Informationsquellen teuer?"', correct: false, feedback: 'Geschlossene Frage. Besser offen fragen.' }
            ]
          },
          {
            id: 'task4',
            type: 'question',
            title: 'SPIN-Fragen: Problem',
            description: 'Herausforderungen identifizieren',
            question: 'Der Buchhalter erwähnt, dass er manchmal zu spät von neuen GoBD-Anforderungen erfährt. Wie vertiefen Sie das Problem?',
            options: [
              { id: 1, text: '„Das ist nicht so schlimm."', correct: false, feedback: 'Ignoriert das Problem. Verpasste Chance.' },
              { id: 2, text: '„Was bedeutet das konkret? Welche Folgen hatte das schon? Wie wichtig ist es, immer aktuell informiert zu sein?"', correct: true, feedback: 'Perfekt! Problemfrage mit Implikation.' },
              { id: 3, text: '„Unser Fachinfodienst informiert Sie sofort."', correct: false, feedback: 'Zu früh zur Lösung. Erst Problem verstehen.' }
            ]
          },
          {
            id: 'task5',
            type: 'objection',
            title: 'Preis-Einwand',
            description: 'Budget-Bedenken behandeln',
            question: 'Der Geschäftsführer sagt: "Das Abonnement ist zu teuer für uns." Wie reagieren Sie?',
            options: [
              { id: 1, text: '„Dann können wir leider nicht zusammenarbeiten."', correct: false, feedback: 'Zu schnell aufgegeben. Preis-Einwand ist oft versteckter Einwand.' },
              { id: 2, text: '„Ich kann Ihnen 20% Rabatt geben."', correct: false, feedback: 'Zu schnell nachgegeben. Wert nicht kommuniziert.' },
              { id: 3, text: '„Das verstehe ich. Sie können unseren Fachinfodienst 4 Wochen kostenlos testen. Danach können Sie entscheiden, ob Sie die Zeitschrift behalten möchten. Was kostet Sie fehlende oder veraltete Informationen?"', correct: true, feedback: 'Sehr gut! Kostenloser Testzeitraum anbieten, Wert-Kommunikation statt Preisdiskussion.' }
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
            question: 'Wie präsentieren Sie den Fachinfodienst wertorientiert?',
            options: [
              { id: 1, text: '„Unser Fachinfodienst informiert über GoBD."', correct: false, feedback: 'Zu technisch. Kunde versteht den Wert nicht.' },
              { id: 2, text: '„Unser Fachinfodienst hält Sie immer aktuell über GoBD-Anforderungen und Buchhaltungsthemen. Das bedeutet: Sie sind immer informiert, vermeiden Fehler bei Steuerprüfungen, sparen Recherchezeit. Sie können 4 Wochen kostenlos testen, danach können Sie die Zeitschrift behalten."', correct: true, feedback: 'Perfekt! Wert und Nutzen klar kommuniziert, kostenloser Testzeitraum erwähnt.' },
              { id: 3, text: '„GoBD ist wichtig."', correct: false, feedback: 'Zu vage. Kein konkreter Nutzen.' }
            ]
          },
          {
            id: 'task7',
            type: 'objection',
            title: 'Datenschutz-Bedenken',
            description: 'Vertrauen bei Datenschutz aufbauen',
            question: 'Der Buchhalter fragt: "Wie aktuell sind die Informationen? Werden die Inhalte regelmäßig aktualisiert?"',
            options: [
              { id: 1, text: '„Das ist kompliziert zu erklären."', correct: false, feedback: 'Wirkt unsicher. Kunde verliert Vertrauen.' },
              { id: 2, text: '„Unser Fachinfodienst wird monatlich aktualisiert mit den neuesten GoBD-Anforderungen und Buchhaltungsthemen. Alle Informationen sind geprüft und aktuell. Sie können 4 Wochen kostenlos testen, um sich selbst zu überzeugen."', correct: true, feedback: 'Sehr gut! Konkret, transparent, vertrauensbildend, kostenloser Testzeitraum erwähnt.' },
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
              { id: 1, text: '„Wollen Sie jetzt abonnieren?"', correct: false, feedback: 'Zu direkt. Wirkt aufdringlich.' },
              { id: 2, text: '„Wie klingt das für Sie – sollen wir mit dem kostenlosen 4-Wochen-Test starten? Danach können Sie entscheiden, ob Sie die Zeitschrift behalten möchten."', correct: true, feedback: 'Perfekt! Alternativfrage mit kostenlosem Testzeitraum, danach Option die Zeitschrift zu behalten.' },
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
    objections: ['Nutzen unklar', 'Zu teuer', 'Aktualität der Informationen', 'Brauchen wir nicht'],
    questions: [
      'Wie informieren Sie sich aktuell über neue Anforderungen in der Pflege?',
      'Welche Informationsquellen nutzen Sie für Dokumentation und rechtliche Themen?',
      'Wie wichtig ist es, immer aktuell informiert zu sein?',
      'Wer entscheidet über Fachinfodienste?'
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
            question: 'Die Pflegedienstleitung erwähnt, dass sie manchmal zu spät von neuen Anforderungen erfährt. Wie vertiefen Sie das?',
            options: [
              { id: 1, text: '„Unser Fachinfodienst informiert Sie sofort."', correct: false, feedback: 'Zu früh zur Lösung. Erst Problem verstehen.' },
              { id: 2, text: '„Was bedeutet das konkret? Welche Folgen hatte das schon? Wie wichtig ist es, immer aktuell informiert zu sein?"', correct: true, feedback: 'Sehr gut! Problem mit Implikation vertieft.' },
              { id: 3, text: '„Das ist normal."', correct: false, feedback: 'Ignoriert das Problem.' }
            ]
          },
          {
            id: 'task3',
            type: 'objection',
            title: 'Mehraufwand-Einwand',
            description: 'Bedenken der Pflegekräfte adressieren',
            question: 'Eine Pflegekraft sagt: "Wir haben schon genug zu lesen." Wie reagieren Sie?',
            options: [
              { id: 1, text: '„Das stimmt nicht."', correct: false, feedback: 'Zu defensiv. Ignoriert die Bedenken.' },
              { id: 2, text: '„Das verstehe ich. Unser Fachinfodienst ist kompakt und fokussiert auf das Wesentliche. Sie können 4 Wochen kostenlos testen, um zu sehen, ob er Ihnen hilft. Was würde Ihnen am meisten helfen?"', correct: true, feedback: 'Perfekt! Empathie, kostenloser Testzeitraum, offene Frage.' },
              { id: 3, text: '„Sie müssen es einfach lesen."', correct: false, feedback: 'Zu autoritär. Schafft Widerstand.' }
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
            question: 'Wie präsentieren Sie den Fachinfodienst wertorientiert?',
            options: [
              { id: 1, text: '„Unser Fachinfodienst informiert über Pflegethemen."', correct: false, feedback: 'Zu technisch. Fehlt der Nutzen.' },
              { id: 2, text: '„Unser Fachinfodienst hält Sie immer aktuell über neue Anforderungen, rechtliche Themen und Best Practices. Das bedeutet: Sie sind immer informiert, vermeiden Fehler, sparen Recherchezeit. Sie können 4 Wochen kostenlos testen, danach können Sie die Zeitschrift behalten."', correct: true, feedback: 'Perfekt! Konkreter Nutzen, kostenloser Testzeitraum erwähnt.' },
              { id: 3, text: '„Es ist informativ."', correct: false, feedback: 'Zu vage. Kein konkreter Wert.' }
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
              { id: 1, text: '„Sie müssen das Abonnement direkt abschließen."', correct: false, feedback: 'Zu risikoreich für den Kunden.' },
              { id: 2, text: '„Wie wäre es mit einem kostenlosen 4-Wochen-Test? So können Sie risikofrei prüfen, ob der Fachinfodienst Ihnen hilft. Danach können Sie entscheiden, ob Sie die Zeitschrift behalten möchten."', correct: true, feedback: 'Sehr gut! Kostenloser Testzeitraum, Risiko reduziert, natürlicher Abschluss.' },
              { id: 3, text: '„Sie können es ja mal probieren."', correct: false, feedback: 'Zu vage. Keine klare Handlung.' }
            ]
          }
        ]
      }
    ]
  },
  { 
    id: 'kita', 
    title: 'Kita - Fachinfodienst für Kindertagesstätten', 
    industry: 'education', 
    difficulty: 'intermediate',
    description: 'Fachinfodienst für Kitas mit kostenlosem Testzeitraum verkaufen',
    situation: 'Eine Kita prüft einen Fachinfodienst zu aktuellen Themen wie Pädagogik, rechtliche Anforderungen und Elternarbeit',
    challenge: 'Leitung sorgt sich um Nutzen und Aktualität der Informationen',
    goal: 'Abonnement für Fachinfodienst abschließen - kostenloser Testzeitraum, danach kann die Zeitschrift behalten werden',
    timeLimit: 15,
    stakeholders: ['Kitaleitung', 'Erzieherinnen', 'Elternbeirat'],
    objections: ['Nutzen unklar', 'Zu teuer', 'Aktualität der Informationen', 'Brauchen wir nicht'],
    questions: [
      'Wie informieren Sie sich aktuell über neue pädagogische Ansätze und rechtliche Anforderungen?',
      'Welche Informationsquellen nutzen Sie für Ihre Arbeit?',
      'Wie wichtig ist es, immer aktuell informiert zu sein?',
      'Wer entscheidet über Fachinfodienste?'
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
              { id: 1, text: '„Ich habe einen Fachinfodienst, den Sie brauchen."', correct: false, feedback: 'Zu direkt. Fehlt Empathie und Respekt.' },
              { id: 2, text: '„Guten Tag, vielen Dank für Ihre Zeit. Wie informieren Sie sich aktuell über neue pädagogische Ansätze und rechtliche Anforderungen?"', correct: true, feedback: 'Perfekt! Zeigt Respekt und Interesse an der aktuellen Situation.' },
              { id: 3, text: '„Ich verkaufe Fachinfodienste für Kitas."', correct: false, feedback: 'Zu verkaufsorientiert. Kunde fühlt sich unter Druck gesetzt.' }
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
            question: 'Die Kitaleitung fragt: "Wie aktuell sind die Informationen? Werden die Inhalte regelmäßig aktualisiert?" Wie reagieren Sie?',
            options: [
              { id: 1, text: '„Das ist kein Problem."', correct: false, feedback: 'Zu oberflächlich. Kunde braucht Details.' },
              { id: 2, text: '„Sehr gute Frage! Unser Fachinfodienst wird monatlich aktualisiert mit den neuesten pädagogischen Ansätzen und rechtlichen Anforderungen. Alle Informationen sind geprüft und aktuell. Sie können 4 Wochen kostenlos testen, um sich selbst zu überzeugen."', correct: true, feedback: 'Perfekt! Konkret, transparent, vertrauensbildend, kostenloser Testzeitraum erwähnt.' },
              { id: 3, text: '„Das ist kompliziert zu erklären."', correct: false, feedback: 'Wirkt unsicher. Kunde verliert Vertrauen.' }
            ]
          },
          {
            id: 'task4',
            type: 'question',
            title: 'Problem-Identifikation',
            description: 'Herausforderungen bei der Kommunikation finden',
            question: 'Die Kitaleitung erwähnt, dass sie manchmal wichtige Informationen verpasst. Wie vertiefen Sie das Problem?',
            options: [
              { id: 1, text: '„Unser Fachinfodienst löst das."', correct: false, feedback: 'Zu früh zur Lösung. Erst Problem verstehen.' },
              { id: 2, text: '„Was bedeutet das konkret? Welche Folgen hat das für Sie und Ihre Arbeit?"', correct: true, feedback: 'Sehr gut! Problemfrage mit Implikation.' },
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
            question: 'Wie präsentieren Sie den Fachinfodienst wertorientiert?',
            options: [
              { id: 1, text: '„Unser Fachinfodienst informiert über Kit-Themen."', correct: false, feedback: 'Zu technisch. Kunde versteht den Wert nicht.' },
              { id: 2, text: '„Unser Fachinfodienst hält Sie immer aktuell über neue pädagogische Ansätze, rechtliche Anforderungen und Best Practices. Das bedeutet: Sie sind immer informiert, vermeiden Fehler, sparen Recherchezeit. Sie können 4 Wochen kostenlos testen, danach können Sie die Zeitschrift behalten."', correct: true, feedback: 'Perfekt! Wert und Nutzen klar kommuniziert, kostenloser Testzeitraum erwähnt.' },
              { id: 3, text: '„Es ist informativ."', correct: false, feedback: 'Zu vage. Kein konkreter Nutzen.' }
            ]
          },
          {
            id: 'task6',
            type: 'objection',
            title: 'Bedienbarkeit-Einwand',
            description: 'Einfachheit und Schulung kommunizieren',
            question: 'Eine Erzieherin sagt: "Wir haben schon genug zu lesen." Wie reagieren Sie?',
            options: [
              { id: 1, text: '„Das stimmt nicht, es ist einfach."', correct: false, feedback: 'Zu defensiv. Ignoriert die Bedenken.' },
              { id: 2, text: '„Das verstehe ich. Unser Fachinfodienst ist kompakt und fokussiert auf das Wesentliche. Sie können 4 Wochen kostenlos testen, um zu sehen, ob er Ihnen hilft. Viele Kitas sagen, dass er ihnen Zeit spart."', correct: true, feedback: 'Sehr gut! Empathie, kostenloser Testzeitraum, Social Proof.' },
              { id: 3, text: '„Sie müssen es einfach lesen."', correct: false, feedback: 'Zu autoritär. Schafft Widerstand.' }
            ]
          },
          {
            id: 'task7',
            type: 'objection',
            title: 'Preis-Einwand',
            description: 'Wert statt Preis kommunizieren',
            question: 'Die Kitaleitung sagt: "Das Abonnement ist zu teuer für uns." Wie reagieren Sie?',
            options: [
              { id: 1, text: '„Dann können wir leider nicht zusammenarbeiten."', correct: false, feedback: 'Zu schnell aufgegeben. Preis-Einwand ist oft versteckter Einwand.' },
              { id: 2, text: '„Das verstehe ich. Sie können unseren Fachinfodienst 4 Wochen kostenlos testen. Danach können Sie entscheiden, ob Sie die Zeitschrift behalten möchten. Was kostet Sie fehlende oder veraltete Informationen?"', correct: true, feedback: 'Sehr gut! Kostenloser Testzeitraum anbieten, Wert-Kommunikation statt Preisdiskussion.' },
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
            question: 'Die Kitaleitung ist interessiert, aber unsicher. Wie schlagen Sie vor?',
            options: [
              { id: 1, text: '„Sie müssen das Abonnement direkt abschließen."', correct: false, feedback: 'Zu risikoreich für den Kunden.' },
              { id: 2, text: '„Wie wäre es mit einem kostenlosen 4-Wochen-Test? So können Sie risikofrei prüfen, ob der Fachinfodienst Ihnen hilft. Danach können Sie entscheiden, ob Sie die Zeitschrift behalten möchten."', correct: true, feedback: 'Sehr gut! Kostenloser Testzeitraum, Risiko reduziert, natürlicher Abschluss.' },
              { id: 3, text: '„Sie können es ja mal probieren."', correct: false, feedback: 'Zu vage. Keine klare Handlung.' }
            ]
          }
        ]
      }
    ]
  },
  { 
    id: 'export', 
    title: 'Export - Fachinfodienst für Export-Compliance', 
    industry: 'logistics', 
    difficulty: 'advanced',
    description: 'Fachinfodienst für Export-Compliance mit kostenlosem Testzeitraum verkaufen',
    situation: 'Sie verkaufen einen Fachinfodienst für Export-Compliance zu Themen wie Ursprung, Präferenzen und Sanktionslisten an ein Handelsunternehmen',
    challenge: 'Komplexe Zoll- und Sanktionsregelungen verstehen und kommunizieren',
    goal: 'Abonnement für Fachinfodienst abschließen - kostenloser Testzeitraum, danach kann die Zeitschrift behalten werden',
    timeLimit: 25,
    stakeholders: ['Export-Leiter', 'Compliance-Officer', 'Geschäftsführung'],
    objections: ['Nutzen unklar', 'Zu teuer', 'Aktualität der Informationen', 'Brauchen wir nicht'],
    questions: [
      'Wie informieren Sie sich aktuell über Export-Compliance und Sanktionslisten?',
      'Welche Informationsquellen nutzen Sie für Compliance-Themen?',
      'Wie wichtig ist es, immer aktuell informiert zu sein?',
      'Wer entscheidet über Fachinfodienste?'
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
            question: 'Der Export-Leiter erwähnt, dass sie manchmal zu spät von neuen Sanktionslisten erfahren. Wie vertiefen Sie das?',
            options: [
              { id: 1, text: '„Das ist ineffizient. Sie brauchen unseren Fachinfodienst."', correct: false, feedback: 'Zu kritisch. Ignoriert die aktuelle Situation.' },
              { id: 2, text: '„Was bedeutet das konkret? Welche Folgen hatte das schon? Wie wichtig ist es, immer aktuell informiert zu sein?"', correct: true, feedback: 'Sehr gut! Konkrete Situationsfragen mit Implikation.' },
              { id: 3, text: '„Unser Fachinfodienst informiert Sie sofort."', correct: false, feedback: 'Zu früh zur Lösung. Erst Situation verstehen.' }
            ]
          },
          {
            id: 'task3',
            type: 'question',
            title: 'Problem-Identifikation',
            description: 'Risiken und Herausforderungen identifizieren',
            question: 'Der Compliance-Officer erwähnt, dass veraltete Informationen zu Fehlern führen können. Wie vertiefen Sie das Problem?',
            options: [
              { id: 1, text: '„Das ist gefährlich."', correct: false, feedback: 'Zu alarmierend. Wirkt übertrieben.' },
              { id: 2, text: '„Was bedeutet das konkret? Welche Risiken bestehen? Was wäre der Worst Case bei einem Fehler?"', correct: true, feedback: 'Perfekt! Problemfrage mit Implikation und Risikobewertung.' },
              { id: 3, text: '„Unser Fachinfodienst verhindert Fehler."', correct: false, feedback: 'Zu früh zur Lösung. Erst Problem verstehen.' }
            ]
          },
          {
            id: 'task4',
            type: 'objection',
            title: 'Komplexitäts-Einwand',
            description: 'Komplexität als Stärke positionieren',
            question: 'Der Export-Leiter sagt: "Das klingt zu komplex für uns." Wie reagieren Sie?',
            options: [
              { id: 1, text: '„Das stimmt nicht, es ist einfach."', correct: false, feedback: 'Zu defensiv. Ignoriert die Bedenken.' },
              { id: 2, text: '„Das verstehe ich. Export-Compliance ist komplex – genau deshalb bieten wir einen kompakten Fachinfodienst, der die wichtigsten Informationen aufbereitet. Sie können 4 Wochen kostenlos testen, um zu sehen, ob er Ihnen hilft."', correct: true, feedback: 'Sehr gut! Anerkennt Komplexität, zeigt wie die Lösung hilft, kostenloser Testzeitraum erwähnt.' },
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
            question: 'Wie präsentieren Sie den Fachinfodienst wertorientiert?',
            options: [
              { id: 1, text: '„Unser Fachinfodienst informiert über Sanktionslisten."', correct: false, feedback: 'Zu technisch. Kunde versteht den Wert nicht.' },
              { id: 2, text: '„Unser Fachinfodienst hält Sie immer aktuell über neue Sanktionslisten und Export-Compliance-Themen. Das bedeutet: Keine Compliance-Risiken, keine Bußgelder, keine Reputationsschäden. Sie sparen Recherchezeit. Sie können 4 Wochen kostenlos testen, danach können Sie die Zeitschrift behalten."', correct: true, feedback: 'Perfekt! Wert, Risikominimierung und Nutzen klar kommuniziert, kostenloser Testzeitraum erwähnt.' },
              { id: 3, text: '„Es ist informativ."', correct: false, feedback: 'Zu vage. Kein konkreter Nutzen.' }
            ]
          },
          {
            id: 'task6',
            type: 'objection',
            title: 'ROI-Einwand',
            description: 'ROI konkret berechnen und kommunizieren',
            question: 'Die Geschäftsführung fragt: "Das Abonnement ist zu teuer." Wie reagieren Sie?',
            options: [
              { id: 1, text: '„Das ist der Preis."', correct: false, feedback: 'Zu passiv. Kein Wert kommuniziert.' },
              { id: 2, text: '„Das verstehe ich. Sie können unseren Fachinfodienst 4 Wochen kostenlos testen. Danach können Sie entscheiden, ob Sie die Zeitschrift behalten möchten. Was kostet Sie fehlende oder veraltete Compliance-Informationen? Ein Verstoß kann [Y]€ kosten."', correct: true, feedback: 'Sehr gut! Kostenloser Testzeitraum anbieten, Wert-Kommunikation mit Risikobewertung.' },
              { id: 3, text: '„Es ist eine Investition."', correct: false, feedback: 'Zu vage. Keine konkreten Zahlen.' }
            ]
          },
          {
            id: 'task7',
            type: 'objection',
            title: 'Implementierungsaufwand',
            description: 'Implementierung als machbar darstellen',
            question: 'Der Export-Leiter sagt: "Wir haben schon genug zu lesen." Wie reagieren Sie?',
            options: [
              { id: 1, text: '„Das stimmt nicht."', correct: false, feedback: 'Zu defensiv. Ignoriert die Bedenken.' },
              { id: 2, text: '„Das verstehe ich. Unser Fachinfodienst ist kompakt und fokussiert auf das Wesentliche. Sie können 4 Wochen kostenlos testen, um zu sehen, ob er Ihnen hilft. Viele Unternehmen sagen, dass er ihnen Zeit spart."', correct: true, feedback: 'Perfekt! Empathie, kostenloser Testzeitraum, Social Proof.' },
              { id: 3, text: '„Sie müssen es einfach lesen."', correct: false, feedback: 'Zu autoritär. Schafft Widerstand.' }
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
              { id: 1, text: '„Wollen Sie jetzt abonnieren?"', correct: false, feedback: 'Zu direkt. Wirkt aufdringlich.' },
              { id: 2, text: '„Wie klingt das für Sie – sollen wir mit dem kostenlosen 4-Wochen-Test starten? Danach können Sie entscheiden, ob Sie die Zeitschrift behalten möchten."', correct: true, feedback: 'Perfekt! Alternativfrage mit kostenlosem Testzeitraum, danach Option die Zeitschrift zu behalten.' },
              { id: 3, text: '„Sie können sich ja noch überlegen."', correct: false, feedback: 'Zu passiv. Verpasste Chance.' }
            ]
          }
        ]
      }
    ]
  },
  { 
    id: 'sekretaerin', 
    title: 'Sekretärin - Gatekeeper überwinden für Fachinfodienst', 
    industry: 'sales', 
    difficulty: 'beginner',
    description: 'Gatekeeper überwinden und Termin für Fachinfodienst vereinbaren',
    situation: 'Sie versuchen einen Termin mit dem Geschäftsführer zu vereinbaren, um einen Fachinfodienst vorzustellen',
    challenge: 'Die Sekretärin blockiert alle Verkaufsgespräche',
    goal: 'Termin mit Entscheidungsträger vereinbaren für kostenlosen Testzeitraum des Fachinfodienstes',
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
              { id: 2, text: '„Guten Tag, mein Name ist [Ihr Name]. Ich biete einen Fachinfodienst mit kostenlosem Testzeitraum an. Ist der Geschäftsführer verfügbar?"', correct: true, feedback: 'Perfekt! Höflich, klar, zeigt Wert und kostenlosen Testzeitraum.' },
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
              { id: 1, text: '„Wir verkaufen Fachinfodienste."', correct: false, feedback: 'Zu vage. Kein Nutzen.' },
              { id: 2, text: '„Wir bieten einen Fachinfodienst mit kostenlosem 4-Wochen-Test an. Ein 15-Minuten-Gespräch reicht, um zu sehen, ob es passt. Danach kann die Zeitschrift behalten werden."', correct: true, feedback: 'Perfekt! Konkreter Nutzen, kostenloser Testzeitraum, niedrige Hürde.' },
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
    title: 'Datenschutz - Fachinfodienst für DSGVO-Compliance', 
    industry: 'compliance', 
    difficulty: 'intermediate',
    description: 'Fachinfodienst für Datenschutz mit kostenlosem Testzeitraum verkaufen',
    situation: 'Sie verkaufen einen Fachinfodienst für Datenschutz und DSGVO-Compliance an ein Unternehmen mit DSB',
    challenge: 'Datenschutzbeauftragter prüft Nutzen und Aktualität der Informationen',
    goal: 'Abonnement für Fachinfodienst abschließen - kostenloser Testzeitraum, danach kann die Zeitschrift behalten werden',
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
              { id: 1, text: '„Ich habe einen DSGVO-Fachinfodienst."', correct: false, feedback: 'Zu direkt. Fehlt Respekt für die Expertise des DSB.' },
              { id: 2, text: '„Guten Tag, vielen Dank für Ihre Zeit. Ich weiß, dass Datenschutz für Sie Priorität hat. Wie informieren Sie sich aktuell über neue DSGVO-Anforderungen?"', correct: true, feedback: 'Perfekt! Zeigt Respekt und Interesse an der aktuellen Situation.' },
              { id: 3, text: '„Ich verkaufe Fachinfodienste."', correct: false, feedback: 'Zu verkaufsorientiert. Kunde fühlt sich unter Druck gesetzt.' }
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
            question: 'Der DSB erwähnt, dass sie manchmal zu spät von neuen DSGVO-Anforderungen erfahren. Wie vertiefen Sie das?',
            options: [
              { id: 1, text: '„Unser Fachinfodienst ist besser."', correct: false, feedback: 'Zu kritisch. Ignoriert die aktuelle Situation.' },
              { id: 2, text: '„Was bedeutet das konkret? Welche Folgen hatte das schon? Wie wichtig ist es, immer aktuell informiert zu sein?"', correct: true, feedback: 'Sehr gut! Offene Fragen, zeigt Interesse an Problemen.' },
              { id: 3, text: '„Unser Fachinfodienst informiert Sie sofort."', correct: false, feedback: 'Zu früh zur Lösung. Erst Situation verstehen.' }
            ]
          },
          {
            id: 'task3',
            type: 'question',
            title: 'Problem-Identifikation',
            description: 'Datenschutz-Risiken identifizieren',
            question: 'Der DSB erwähnt, dass veraltete Informationen zu Compliance-Risiken führen können. Wie vertiefen Sie das Problem?',
            options: [
              { id: 1, text: '„Das ist gefährlich."', correct: false, feedback: 'Zu alarmierend. Wirkt übertrieben.' },
              { id: 2, text: '„Was bedeutet das konkret? Welche Risiken bestehen? Was wäre der Worst Case bei einem Fehler?"', correct: true, feedback: 'Perfekt! Problemfrage mit Implikation und Risikobewertung.' },
              { id: 3, text: '„Unser Fachinfodienst verhindert Fehler."', correct: false, feedback: 'Zu früh zur Lösung. Erst Problem verstehen.' }
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
            question: 'Wie präsentieren Sie den Fachinfodienst wertorientiert?',
            options: [
              { id: 1, text: '„Unser Fachinfodienst informiert über DSGVO."', correct: false, feedback: 'Zu technisch. Kunde versteht den Wert nicht.' },
              { id: 2, text: '„Unser Fachinfodienst hält Sie immer aktuell über neue DSGVO-Anforderungen und Datenschutz-Themen. Das bedeutet: Keine Compliance-Risiken, schnelle Information, mehr Sicherheit. Sie können 4 Wochen kostenlos testen, danach können Sie die Zeitschrift behalten."', correct: true, feedback: 'Perfekt! Konkrete Maßnahmen, Wert und Nutzen klar kommuniziert, kostenloser Testzeitraum erwähnt.' },
              { id: 3, text: '„DSGVO ist wichtig."', correct: false, feedback: 'Zu vage. Kein konkreter Nutzen.' }
            ]
          },
          {
            id: 'task6',
            type: 'objection',
            title: 'Löschkonzept-Einwand',
            description: 'Löschkonzept transparent darstellen',
            question: 'Der DSB sagt: "Das Abonnement ist zu teuer." Wie reagieren Sie?',
            options: [
              { id: 1, text: '„Das ist der Preis."', correct: false, feedback: 'Zu passiv. Kein Wert kommuniziert.' },
              { id: 2, text: '„Das verstehe ich. Sie können unseren Fachinfodienst 4 Wochen kostenlos testen. Danach können Sie entscheiden, ob Sie die Zeitschrift behalten möchten. Was kostet Sie fehlende oder veraltete Compliance-Informationen?"', correct: true, feedback: 'Sehr gut! Kostenloser Testzeitraum anbieten, Wert-Kommunikation mit Risikobewertung.' },
              { id: 3, text: '„Das ist kein Problem."', correct: false, feedback: 'Zu oberflächlich. Kunde braucht Details.' }
            ]
          },
          {
            id: 'task7',
            type: 'objection',
            title: 'AVV-Einwand',
            description: 'AVV-Vorlage anbieten und Transparenz zeigen',
            question: 'Der DSB sagt: "Wir haben schon genug zu lesen." Wie reagieren Sie?',
            options: [
              { id: 1, text: '„Das stimmt nicht."', correct: false, feedback: 'Zu defensiv. Ignoriert die Bedenken.' },
              { id: 2, text: '„Das verstehe ich. Unser Fachinfodienst ist kompakt und fokussiert auf das Wesentliche. Sie können 4 Wochen kostenlos testen, um zu sehen, ob er Ihnen hilft. Viele DSBs sagen, dass er ihnen Zeit spart."', correct: true, feedback: 'Perfekt! Empathie, kostenloser Testzeitraum, Social Proof.' },
              { id: 3, text: '„Sie müssen es einfach lesen."', correct: false, feedback: 'Zu autoritär. Schafft Widerstand.' }
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
              { id: 1, text: '„Wollen Sie jetzt abonnieren?"', correct: false, feedback: 'Zu direkt. Wirkt aufdringlich.' },
              { id: 2, text: '„Perfekt! Wie klingt das für Sie – sollen wir mit dem kostenlosen 4-Wochen-Test starten? Danach können Sie entscheiden, ob Sie die Zeitschrift behalten möchten."', correct: true, feedback: 'Perfekt! Alternativfrage mit kostenlosem Testzeitraum, danach Option die Zeitschrift zu behalten.' },
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
            question: 'Der Kunde sagt: "Das Abonnement ist zu teuer für uns." Wie reagieren Sie mit der ZHL-Methode?',
            options: [
              { id: 1, text: '„Das stimmt nicht, es ist günstig."', correct: false, feedback: 'Zu defensiv. Ignoriert den Einwand.' },
              { id: 2, text: '„Das verstehe ich. Sie können unseren Fachinfodienst 4 Wochen kostenlos testen. Danach können Sie entscheiden, ob Sie die Zeitschrift behalten möchten. Teuer im Vergleich zu was? Was kostet Sie fehlende oder veraltete Informationen?"', correct: true, feedback: 'Perfekt! ZHL-Methode: Zustimmen, kostenloser Testzeitraum anbieten, Hinterfragen, dann Wert zeigen.' },
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
              { id: 2, text: '„Das verstehe ich. Sie können unseren Fachinfodienst 4 Wochen kostenlos testen - das kostet Sie keine Zeit. Was hat aktuell Priorität? Was würde passieren, wenn Sie wichtige Informationen verpassen?"', correct: true, feedback: 'Sehr gut! Kostenloser Testzeitraum anbieten, Prioritäten klären, Dringlichkeit zeigen.' },
              { id: 3, text: '„Sie müssen sich Zeit nehmen."', correct: false, feedback: 'Zu aufdringlich. Erzeugt Widerstand.' }
            ]
          },
          {
            id: 'task4',
            type: 'objection',
            title: 'Zeit sparen zeigen',
            description: 'Zeitersparnis als Wert kommunizieren',
            question: 'Der Kunde sagt: "Wir haben schon genug zu lesen." Wie reagieren Sie?',
            options: [
              { id: 1, text: '„Das stimmt nicht."', correct: false, feedback: 'Zu defensiv. Ignoriert die Bedenken.' },
              { id: 2, text: '„Das verstehe ich. Unser Fachinfodienst ist kompakt und fokussiert auf das Wesentliche. Sie können 4 Wochen kostenlos testen, um zu sehen, ob er Ihnen hilft. Viele Kunden sagen, dass er ihnen Zeit spart."', correct: true, feedback: 'Perfekt! Empathie, kostenloser Testzeitraum, Social Proof.' },
              { id: 3, text: '„Sie müssen es einfach lesen."', correct: false, feedback: 'Zu autoritär. Schafft Widerstand.' }
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
              { id: 2, text: '„Ich verstehe, dass Sie skeptisch sind. Viele unserer Kunden dachten das auch (Felt), bis sie unseren Fachinfodienst 4 Wochen kostenlos getestet haben (Found). Sie können es risikofrei testen. Darf ich Ihnen Referenzen zeigen?"', correct: true, feedback: 'Perfekt! Feel-Felt-Found-Methode mit kostenlosem Testzeitraum und Social Proof.' },
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
            question: 'Der Kunde sagt: "Ich bin unsicher, ob der Fachinfodienst uns hilft." Wie reagieren Sie?',
            options: [
              { id: 1, text: '„Das hilft schon."', correct: false, feedback: 'Zu defensiv. Ignoriert die Unsicherheit.' },
              { id: 2, text: '„Das verstehe ich. Wie wäre es mit einem kostenlosen 4-Wochen-Test? So können Sie es risikofrei testen. Wenn es nicht passt, kostet es Sie nichts. Danach können Sie entscheiden, ob Sie die Zeitschrift behalten möchten."', correct: true, feedback: 'Perfekt! Kostenloser Testzeitraum, Risiko reduziert, natürlicher Abschluss.' },
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
              { id: 1, text: '„Wollen Sie jetzt abonnieren?"', correct: false, feedback: 'Zu direkt. Wirkt aufdringlich.' },
              { id: 2, text: '„Perfekt! Wie klingt das für Sie – sollen wir mit dem kostenlosen 4-Wochen-Test starten? Danach können Sie entscheiden, ob Sie die Zeitschrift behalten möchten."', correct: true, feedback: 'Perfekt! Alternativfrage mit kostenlosem Testzeitraum, danach Option die Zeitschrift zu behalten.' },
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

app.post('/api/check-email', async (req, res) => {
  try {
    const { email } = req.body || {};
    const trimmed = typeof email === 'string' ? email.trim().toLowerCase() : '';
    if (!trimmed || !trimmed.includes('@')) {
      return res.status(400).json({ valid: false, message: 'Ungültige E-Mail-Adresse.' });
    }
    const domain = trimmed.split('@')[1];
    if (!domain || domain.length === 0) {
      return res.status(400).json({ valid: false, message: 'Ungültige Domain.' });
    }

    let mxRecords = [];
    try {
      mxRecords = await dns.resolveMx(domain);
    } catch {
      return res.json({
        valid: false,
        domain,
        message: `Keine MX-Records für ${domain} gefunden. Die Domain hat keinen konfigurierten Mailserver.`,
      });
    }
    if (mxRecords.length === 0) {
      return res.json({
        valid: false,
        domain,
        message: `Keine MX-Records für ${domain} gefunden.`,
      });
    }

    mxRecords.sort((a, b) => a.priority - b.priority);
    const mxDetails = mxRecords.map((m) => ({ host: m.exchange.replace(/\.$/, ''), priority: m.priority }));
    const hosts = mxDetails.map((m) => m.host);

    return res.json({
      valid: true,
      domain,
      mx: hosts,
      mxDetails,
      message: `Mailserver erreichbar: ${hosts.join(', ')}.`,
    });
  } catch (err) {
    console.error('check-email error:', err?.message || err);
    return res.status(500).json({
      valid: false,
      message: 'Ein Fehler ist aufgetreten. Bitte versuchen Sie es erneut.',
    });
  }
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

// Spaced Repetition: E-Faktor Algorithmus (SuperMemo)
function calculateEFactor(oldEFactor, quality) {
  // Quality: 0-5 (0=komplett falsch, 5=perfekt)
  // E-Faktor wird basierend auf Qualität angepasst
  let newEFactor = oldEFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
  return Math.max(1.3, newEFactor); // Minimum 1.3
}

function calculateNextInterval(oldInterval, eFactor, quality) {
  if (quality < 3) {
    // Falsch beantwortet - zurück auf Anfang
    return 1;
  }
  if (oldInterval === 0) {
    return 1;
  }
  if (oldInterval === 1) {
    return 6;
  }
  return Math.round(oldInterval * eFactor);
}

// Lern-Insights: einzelne Antwort speichern (richtig/falsch pro Frage) mit Spaced Repetition
app.post('/api/insights/answer', async (req, res) => {
  try {
    const userId = req.session?.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Nicht angemeldet' });
    }
    if (!sql) {
      return res.json({ success: true });
    }
    const { moduleId, questionId, correct, quality, difficultyRating } = req.body || {};
    if (!moduleId || typeof moduleId !== 'string') {
      return res.status(400).json({ error: 'moduleId erforderlich' });
    }
    const isCorrect = correct === true;
    
    // Speichere in user_question_stats (aggregiert)
    await sql`
      INSERT INTO user_question_stats (user_id, module_id, correct_answers, total_answers, updated_at)
      VALUES (${String(userId)}, ${moduleId}, ${isCorrect ? 1 : 0}, 1, ${new Date()})
      ON CONFLICT (user_id, module_id) DO UPDATE SET
        correct_answers = user_question_stats.correct_answers + ${isCorrect ? 1 : 0},
        total_answers = user_question_stats.total_answers + 1,
        updated_at = ${new Date()}
    `;
    
    // Spaced Repetition: speichere pro Frage
    if (typeof questionId === 'number' || typeof questionId === 'string') {
      const qualityScore = quality !== undefined ? quality : (isCorrect ? 5 : 0);
      
      // Hole bestehende Spaced Repetition Daten
      const existing = await sql`
        SELECT e_factor, interval_days, repetitions
        FROM user_spaced_repetition
        WHERE user_id = ${String(userId)} AND module_id = ${moduleId} AND question_id = ${Number(questionId)}
      `.catch(() => []);
      
      const oldEFactor = existing[0]?.e_factor || 2.5;
      const oldInterval = existing[0]?.interval_days || 1;
      const oldRepetitions = existing[0]?.repetitions || 0;
      
      // Berechne neue Werte
      const newEFactor = calculateEFactor(oldEFactor, qualityScore);
      const newInterval = calculateNextInterval(oldInterval, newEFactor, qualityScore);
      const newRepetitions = qualityScore >= 3 ? oldRepetitions + 1 : 0;
      
      const nextReviewDate = new Date();
      nextReviewDate.setDate(nextReviewDate.getDate() + newInterval);
      
      // Speichere difficulty_rating wenn vorhanden (z.B. von Karteikarten-Bewertung)
      const difficultyValue = difficultyRating && ['Einfach', 'Mittel', 'Schwer'].includes(difficultyRating) 
        ? difficultyRating 
        : null;
      
      await sql`
        INSERT INTO user_spaced_repetition (
          user_id, module_id, question_id, e_factor, interval_days, repetitions,
          next_review_date, last_reviewed, difficulty_rating
        )
        VALUES (
          ${String(userId)}, ${moduleId}, ${Number(questionId)}, ${newEFactor},
          ${newInterval}, ${newRepetitions}, ${nextReviewDate}, ${new Date()}, ${difficultyValue}
        )
        ON CONFLICT (user_id, module_id, question_id) DO UPDATE SET
          e_factor = ${newEFactor},
          interval_days = ${newInterval},
          repetitions = ${newRepetitions},
          next_review_date = ${nextReviewDate},
          last_reviewed = ${new Date()},
          difficulty_rating = COALESCE(${difficultyValue}, user_spaced_repetition.difficulty_rating)
      `.catch(err => {
        console.error('Error saving spaced repetition:', err);
      });
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error saving insight answer:', error);
    res.status(500).json({ error: 'Fehler beim Speichern' });
  }
});

// API: Hole Fragen für adaptives Quiz basierend auf Spaced Repetition
app.get('/api/quiz/questions/:moduleId', async (req, res) => {
  try {
    const userId = req.session?.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Nicht angemeldet' });
    }
    if (!sql) {
      return res.json({ questions: [], dueQuestions: [] });
    }
    
    const { moduleId } = req.params;
    const { difficulty, limit = 10 } = req.query;
    
    // Hole Fragen die zur Wiederholung fällig sind
    const dueQuestions = await sql`
      SELECT question_id, e_factor, interval_days, repetitions, difficulty_rating
      FROM user_spaced_repetition
      WHERE user_id = ${String(userId)} 
        AND module_id = ${moduleId}
        AND next_review_date <= ${new Date()}
      ORDER BY next_review_date ASC
      LIMIT ${Number(limit)}
    `.catch(() => []);
    
    // Hole neue Fragen (noch nicht gelernt)
    const learnedQuestionIds = dueQuestions.map(q => q.question_id);
    const learnedCondition = learnedQuestionIds.length > 0 
      ? sql`AND question_id NOT IN ${sql(learnedQuestionIds)}`
      : sql``;
    
    const difficultyFilter = difficulty 
      ? sql`AND difficulty = ${difficulty}`
      : sql``;
    
    // Für neue Fragen: Hole basierend auf aktueller Performance
    const userStats = await sql`
      SELECT correct_answers, total_answers
      FROM user_question_stats
      WHERE user_id = ${String(userId)} AND module_id = ${moduleId}
    `.catch(() => []);
    
    const performance = userStats[0] 
      ? (userStats[0].correct_answers / Math.max(userStats[0].total_answers, 1)) * 100
      : 50;
    
    // Bestimme Schwierigkeit basierend auf Performance
    let targetDifficulty = 'Mittel';
    if (performance >= 80) targetDifficulty = 'Schwer';
    else if (performance < 50) targetDifficulty = 'Einfach';
    
    res.json({
      dueQuestions: dueQuestions.map(q => q.question_id),
      targetDifficulty,
      performance: Math.round(performance)
    });
  } catch (error) {
    console.error('Error fetching quiz questions:', error);
    res.status(500).json({ error: 'Fehler beim Laden der Fragen' });
  }
});

// API: Hole Karteikarten basierend auf Schwierigkeit und Spaced Repetition
app.get('/api/flashcards/:moduleId', async (req, res) => {
  try {
    const userId = req.session?.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Nicht angemeldet' });
    }
    if (!sql) {
      return res.json({ cards: [], dueCards: [] });
    }
    
    const { moduleId } = req.params;
    const { difficulty } = req.query;
    
    // Hole Karten die zur Wiederholung fällig sind
    const dueCards = await sql`
      SELECT question_id, e_factor, interval_days, repetitions, difficulty_rating
      FROM user_spaced_repetition
      WHERE user_id = ${String(userId)} 
        AND module_id = ${moduleId}
        AND next_review_date <= ${new Date()}
        ${difficulty ? sql`AND difficulty_rating = ${difficulty}` : sql``}
      ORDER BY next_review_date ASC, e_factor ASC
    `.catch(() => []);
    
    // Hole alle bereits gelernten Karten-IDs für Filterung
    const learnedCardIds = await sql`
      SELECT DISTINCT question_id
      FROM user_spaced_repetition
      WHERE user_id = ${String(userId)} 
        AND module_id = ${moduleId}
    `.catch(() => []);
    
    const learnedIdsSet = new Set(learnedCardIds.map(c => c.question_id));
    
    res.json({
      dueCards: dueCards.map(c => ({
        questionId: c.question_id,
        difficulty: c.difficulty_rating,
        repetitions: c.repetitions
      })),
      learnedCardIds: Array.from(learnedIdsSet)
    });
  } catch (error) {
    console.error('Error fetching flashcards:', error);
    res.status(500).json({ error: 'Fehler beim Laden der Karteikarten' });
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
      SELECT id, title, items, usps, bullets, created_at, updated_at
      FROM user_guides
      WHERE user_id = ${String(userId)}
      ORDER BY updated_at DESC
    `;
    res.json({ guides: guides.map(g => ({
      id: g.id,
      title: g.title,
      items: g.items,
      usps: g.usps,
      bullets: g.bullets,
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
    const { title, items, usps, bullets } = req.body;
    if (!title || !items || !Array.isArray(items)) {
      return res.status(400).json({ error: 'Titel und Items sind erforderlich' });
    }
    const result = await sql`
      INSERT INTO user_guides (user_id, title, items, usps, bullets)
      VALUES (${String(userId)}, ${title}, ${JSON.stringify(items)}, ${usps ? JSON.stringify(usps) : null}, ${bullets && Array.isArray(bullets) ? JSON.stringify(bullets) : null})
      RETURNING id, title, items, usps, bullets, created_at, updated_at
    `;
    res.json({ 
      success: true, 
      guide: {
        id: result[0].id,
        title: result[0].title,
        items: result[0].items,
        usps: result[0].usps,
        bullets: result[0].bullets,
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
      RETURNING id, title, items, usps, bullets, created_at, updated_at
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
        bullets: result[0].bullets,
        createdAt: result[0].created_at,
        updatedAt: result[0].updated_at
      }
    });
  } catch (error) {
    console.error('Error updating guide:', error);
    res.status(500).json({ error: 'Fehler beim Aktualisieren des Leitfadens' });
  }
});

app.patch('/api/guides/:id/bullets', async (req, res) => {
  try {
    const userId = req.session?.user?.id;
    if (!userId) return res.status(401).json({ error: 'Nicht angemeldet' });
    if (!sql) return res.status(503).json({ error: 'Datenbank nicht verfügbar' });
    const guideId = parseInt(req.params.id, 10);
    if (Number.isNaN(guideId)) return res.status(400).json({ error: 'Ungültige Leitfaden-ID' });
    const { bullets } = req.body;
    if (!Array.isArray(bullets)) return res.status(400).json({ error: 'bullets muss ein Array sein' });
    const existing = await sql`SELECT user_id FROM user_guides WHERE id = ${guideId}`;
    if (!existing?.length) return res.status(404).json({ error: 'Leitfaden nicht gefunden' });
    if (existing[0].user_id !== String(userId)) return res.status(403).json({ error: 'Keine Berechtigung' });
    const result = await sql`
      UPDATE user_guides SET bullets = ${JSON.stringify(bullets)}, updated_at = CURRENT_TIMESTAMP
      WHERE id = ${guideId} AND user_id = ${String(userId)}
      RETURNING id, title, items, usps, bullets, created_at, updated_at
    `;
    res.json({
      success: true,
      guide: {
        id: result[0].id,
        title: result[0].title,
        items: result[0].items,
        usps: result[0].usps,
        bullets: result[0].bullets,
        createdAt: result[0].created_at,
        updatedAt: result[0].updated_at
      }
    });
  } catch (error) {
    console.error('Error updating guide bullets:', error);
    res.status(500).json({ error: 'Fehler beim Speichern der Stichpunkte' });
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

// --- Shared (Intern) API: nur @thomas-boeke.com ---
app.get('/api/shared/formulations', async (req, res) => {
  try {
    const userId = req.session?.user?.id;
    if (!userId) return res.status(401).json({ error: 'Nicht angemeldet' });
    if (!isThomasBoekeUser(req)) return res.status(403).json({ error: 'Nur für Firmen-Accounts (@thomas-boeke.com)' });
    if (!sql) return res.status(503).json({ error: 'Datenbank nicht verfügbar' });
    const chapterId = req.query.chapter_id;
    let rows;
    if (chapterId) {
      rows = await sql`SELECT id, chapter_id, text, created_by, created_at FROM shared_formulations WHERE chapter_id = ${chapterId} ORDER BY created_at DESC`;
    } else {
      rows = await sql`SELECT id, chapter_id, text, created_by, created_at FROM shared_formulations ORDER BY chapter_id, created_at DESC`;
    }
    res.json({ formulations: rows });
  } catch (error) {
    console.error('Error fetching shared formulations:', error);
    res.status(500).json({ error: 'Fehler beim Laden der Formulierungen' });
  }
});

app.post('/api/shared/formulations', async (req, res) => {
  try {
    const userId = req.session?.user?.id;
    if (!userId) return res.status(401).json({ error: 'Nicht angemeldet' });
    if (!isThomasBoekeUser(req)) return res.status(403).json({ error: 'Nur für Firmen-Accounts (@thomas-boeke.com)' });
    if (!sql) return res.status(503).json({ error: 'Datenbank nicht verfügbar' });
    const { chapter_id, text } = req.body || {};
    if (!chapter_id || !VALID_LEITFADEN_CHAPTER_IDS.includes(chapter_id)) {
      return res.status(400).json({ error: 'Ungültiges chapter_id' });
    }
    if (!text || typeof text !== 'string' || !text.trim()) {
      return res.status(400).json({ error: 'Text ist erforderlich' });
    }
    const result = await sql`
      INSERT INTO shared_formulations (chapter_id, text, created_by)
      VALUES (${chapter_id}, ${text.trim()}, ${String(userId)})
      RETURNING id, chapter_id, text, created_by, created_at
    `;
    res.status(201).json(result[0]);
  } catch (error) {
    console.error('Error creating shared formulation:', error);
    res.status(500).json({ error: 'Fehler beim Speichern' });
  }
});

app.delete('/api/shared/formulations/:id', async (req, res) => {
  try {
    const userId = req.session?.user?.id;
    if (!userId) return res.status(401).json({ error: 'Nicht angemeldet' });
    if (!isThomasBoekeUser(req)) return res.status(403).json({ error: 'Nur für Firmen-Accounts (@thomas-boeke.com)' });
    if (!sql) return res.status(503).json({ error: 'Datenbank nicht verfügbar' });
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) return res.status(400).json({ error: 'Ungültige ID' });
    const result = await sql`
      DELETE FROM shared_formulations WHERE id = ${id} AND created_by = ${String(userId)} RETURNING id
    `;
    if (result.length === 0) return res.status(404).json({ error: 'Nicht gefunden oder keine Berechtigung' });
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting shared formulation:', error);
    res.status(500).json({ error: 'Fehler beim Löschen' });
  }
});

app.get('/api/shared/guides', async (req, res) => {
  try {
    const userId = req.session?.user?.id;
    if (!userId) return res.status(401).json({ error: 'Nicht angemeldet' });
    if (!isThomasBoekeUser(req)) return res.status(403).json({ error: 'Nur für Firmen-Accounts (@thomas-boeke.com)' });
    if (!sql) return res.status(503).json({ error: 'Datenbank nicht verfügbar' });
    const rows = await sql`
      SELECT id, title, items, usps, bullets, shared_by, created_at FROM shared_guides ORDER BY created_at DESC
    `;
    res.json({ guides: rows });
  } catch (error) {
    console.error('Error fetching shared guides:', error);
    res.status(500).json({ error: 'Fehler beim Laden der Leitfäden' });
  }
});

app.post('/api/shared/guides', async (req, res) => {
  try {
    const userId = req.session?.user?.id;
    if (!userId) return res.status(401).json({ error: 'Nicht angemeldet' });
    if (!isThomasBoekeUser(req)) return res.status(403).json({ error: 'Nur für Firmen-Accounts (@thomas-boeke.com)' });
    if (!sql) return res.status(503).json({ error: 'Datenbank nicht verfügbar' });
    const { guideId, title, items, usps, bullets } = req.body || {};
    let payload;
    if (guideId != null) {
      const existing = await sql`
        SELECT id, title, items, usps, bullets FROM user_guides WHERE id = ${Number(guideId)} AND user_id = ${String(userId)}
      `;
      if (!existing?.length) return res.status(404).json({ error: 'Leitfaden nicht gefunden' });
      payload = { title: existing[0].title, items: existing[0].items, usps: existing[0].usps, bullets: existing[0].bullets };
    } else if (title && items && Array.isArray(items)) {
      payload = { title, items, usps: usps || null, bullets: bullets || null };
    } else {
      return res.status(400).json({ error: 'guideId oder title+items erforderlich' });
    }
    const result = await sql`
      INSERT INTO shared_guides (title, items, usps, bullets, shared_by)
      VALUES (${payload.title}, ${JSON.stringify(payload.items)}, ${payload.usps ? JSON.stringify(payload.usps) : null}, ${payload.bullets ? JSON.stringify(payload.bullets) : null}, ${String(userId)})
      RETURNING id, title, items, usps, bullets, shared_by, created_at
    `;
    res.status(201).json(result[0]);
  } catch (error) {
    console.error('Error creating shared guide:', error);
    res.status(500).json({ error: 'Fehler beim Teilen' });
  }
});

app.delete('/api/shared/guides/:id', async (req, res) => {
  try {
    const userId = req.session?.user?.id;
    if (!userId) return res.status(401).json({ error: 'Nicht angemeldet' });
    if (!isThomasBoekeUser(req)) return res.status(403).json({ error: 'Nur für Firmen-Accounts (@thomas-boeke.com)' });
    if (!sql) return res.status(503).json({ error: 'Datenbank nicht verfügbar' });
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) return res.status(400).json({ error: 'Ungültige ID' });
    const result = await sql`
      DELETE FROM shared_guides WHERE id = ${id} AND shared_by = ${String(userId)} RETURNING id
    `;
    if (result.length === 0) return res.status(404).json({ error: 'Nicht gefunden oder keine Berechtigung' });
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting shared guide:', error);
    res.status(500).json({ error: 'Fehler beim Löschen' });
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
    userPrompt += `Qualität der USPs (besonders für „mögliche Einwände“ im Leitfaden): Formuliere jeden USP als direktes Verkaufsargument – klarer Nutzen für den Kunden, konkret und nachvollziehbar. Keine vagen Floskeln oder reinen Feature-Aufzählungen. Regeln: (1) Nur Aussagen übernehmen, die der Website-Text enthält. (2) Keine Schlussfolgerungen oder „naheliegenden“ Zusatzargumente. (3) Jeder USP muss konkret und verkaufsrelevant formuliert sein (Nutzen, nicht nur Beschreibung).\n\n`;
    if (customInstructions && customInstructions.trim()) {
      userPrompt += `WICHTIG: Berücksichtige bei der Extraktion die oben genannten Anweisungen. Extrahiere NUR USPs, die zu den Anweisungen passen. Ignoriere alle anderen Inhalte.\n\n`;
    }
    userPrompt += `Analysiere den Inhalt sorgfältig und ordne die USPs den passenden Kategorien zu. Wenn eine Kategorie nicht zutrifft, gib ein leeres Array zurück.`;
    
    console.log('Calling Groq API...');
    if (customInstructions && customInstructions.trim()) {
      console.log('Prompt includes custom instructions');
      console.log('User prompt preview:', userPrompt.substring(0, 300) + '...');
    }
    
    const systemRules = ' Formuliere jeden USP als direktes Verkaufsargument: klarer Nutzen für den Kunden, konkret und nachvollziehbar. Keine vagen Floskeln oder reinen Feature-Aufzählungen. Regeln: (1) Nur Aussagen übernehmen, die der Website-Text enthält. (2) Keine Schlussfolgerungen oder „naheliegenden“ Zusatzargumente. (3) Jeder USP muss konkret und verkaufsrelevant formuliert sein (Nutzen, nicht nur Beschreibung). Die USPs werden u.a. für „mögliche Einwände“ im Verkaufsleitfaden genutzt – sie müssen als direkte Verkaufs- und Einwand-Argumente verwendbar sein.';
    const systemPrompt = customInstructions && customInstructions.trim()
      ? 'Du bist ein Experte für Verkaufsargumente. Analysiere eine Unternehmenswebsite und extrahiere Unique Selling Points (USPs) in drei Kategorien: 1) Grundsätzliche USPs (allgemeine Alleinstellungsmerkmale), 2) USPs gegenüber ähnlichen Konkurrenten (Differenzierung), 3) USPs gegenüber älteren Methoden (Innovation/Modernisierung). WICHTIG: Wenn der Nutzer spezifische Anweisungen gibt, befolge diese GENAU und extrahiere NUR die USPs, die zu diesen Anweisungen passen. Ignoriere alle anderen Inhalte, die nicht zu den Anweisungen passen.' + systemRules + ' Gib die USPs als strukturiertes JSON-Objekt zurück.'
      : 'Du bist ein Experte für Verkaufsargumente. Analysiere eine Unternehmenswebsite und extrahiere Unique Selling Points (USPs) in drei Kategorien: 1) Grundsätzliche USPs (allgemeine Alleinstellungsmerkmale), 2) USPs gegenüber ähnlichen Konkurrenten (Differenzierung), 3) USPs gegenüber älteren Methoden (Innovation/Modernisierung).' + systemRules + ' Gib die USPs als strukturiertes JSON-Objekt zurück.';
    
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

// Einwand-Antworten situationsbezogen generieren (zum Vorlesen im Verkaufsgespräch)
// Darf USPs interpretieren und anpassen – muss nicht wörtlich von der Website stammen.
async function generateObjectionResponses(usps) {
  const groqApiKey = process.env.GROQ_API_KEY;
  if (!groqApiKey) {
    throw new Error('GROQ_API_KEY nicht gesetzt');
  }
  const grundsaetzlich = usps.grundsaetzlich || [];
  const gegenueberKonkurrenten = usps.gegenueberKonkurrenten || [];
  const gegenueberAlterenMethoden = usps.gegenueberAlterenMethoden || [];
  const uspsText = JSON.stringify({
    grundsaetzlich: grundsaetzlich.map(u => ({ title: u.title, description: u.description })),
    gegenueberKonkurrenten: gegenueberKonkurrenten.map(u => ({ title: u.title, description: u.description })),
    gegenueberAlterenMethoden: gegenueberAlterenMethoden.map(u => ({ title: u.title, description: u.description }))
  }, null, 2);

  const systemPrompt = `Du bist ein Verkaufscoach. Deine Aufgabe: Zu gegebenen USPs (Unique Selling Points) generierst du "mögliche Einwände" mit Antworten für einen Gesprächsleitfaden.

WICHTIG:
- Die ANTWORTEN sind zum direkten Vorlesen im Verkaufsgespräch gedacht. Formuliere sie gesprochen, konkret und zur jeweiligen Einwand-Situation passend.
- Du DARFST die USPs interpretieren und situationsbezogen zuspitzen – die Antwort muss NICHT wörtlich vom Website-Text stammen, sondern perfekt zum Einwand passen (z.B. bei "zu teuer" eine echte Preis-/ROI-Antwort, bei "keine Zeit" eine echte Zeitersparnis-Formulierung).
- Jede Antwort: 2–4 Sätze, Du- bzw. Sie-Form, so dass der Verkäufer sie 1:1 sagen kann. Keine vagen Floskeln.

Beispiele für die Art der Formulierung (nur Stil, Inhalt kommt aus den USPs):
- Einwand "Das ist mir zu teuer" → Antwort z.B.: "Verstehe ich. Wenn Sie die monatliche Ersparnis durch [konkret aus USP] gegenüber Ihrer jetzigen Lösung rechnen, trägt sich das oft in X Monaten. Soll ich das kurz durchrechnen?"
- Einwand "Ich habe keine Zeit" → Antwort z.B.: "Darum geht es ja genau: Mit [Lösung aus USP] sparen Sie ab dem ersten Tag Zeit, weil [konkret]. Viele Kunden berichten, dass sie nach zwei Wochen bereits X Stunden pro Woche gewinnen."
- Einwand "Die Konkurrenz ist günstiger" → Antwort z.B.: "Der Unterschied ist [konkreter Nutzen aus USPs], nicht nur der Listenpreis. Bei uns ist [z.B. Support/Updates] inklusive – da sind andere oft erst im Nachhinein teurer."
- Einwand "Wir haben das schon anders gelöst" → Antwort z.B.: "Verstehe ich. Der Vorteil unserer Lösung in dem Fall: [konkret aus USPs gegenüber älteren Methoden]. Das bringt Ihnen [messbarer Nutzen], ohne dass Sie alles umwerfen müssen."`;

  const userPrompt = `Gegeben sind folgende USPs eines Unternehmens (aus einer Website extrahiert):

${uspsText}

Erzeuge genau ein JSON-Objekt mit dem Schlüssel "objections" und einem Array von Objekten. Jedes Objekt hat:
- "title": kurzer Einwand (z.B. "Das ist mir zu teuer", "Ich habe keine Zeit", "Ich kenne Ihre Firma nicht", "Die Konkurrenz ist günstiger", "Wir haben das schon anders gelöst", "Ich muss das erst mit meinem Team besprechen"). Nutze diese oder sehr ähnliche, passende Einwände.
- "response": die Antwort zum Vorlesen (2–4 Sätze, Sie-Form, konkret zur Situation, auf Basis der USPs interpretiert – nicht einfach USP abschreiben).

Mindestens 5, maximal 8 Einträge. Gib NUR das JSON zurück, ohne Erklärung.`;

  const groqResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${groqApiKey}`
    },
    body: JSON.stringify({
      model: 'llama-3.1-8b-instant',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.6,
      max_tokens: 2500
    })
  });

  if (!groqResponse.ok) {
    const err = await groqResponse.json().catch(() => ({}));
    throw new Error(`Groq API Fehler: ${err.error?.message || groqResponse.statusText}`);
  }

  const data = await groqResponse.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error('Keine Antwort von Groq erhalten');

  const jsonMatch = content.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('Kein JSON in der Antwort gefunden');
  const parsed = JSON.parse(jsonMatch[0]);
  const list = Array.isArray(parsed.objections) ? parsed.objections : parsed;
  const objections = (Array.isArray(list) ? list : []).slice(0, 8)
    .filter(o => o && (o.title || o.response))
    .map(o => ({ title: o.title || 'Einwand', response: o.response || '' }));
  return objections;
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
- Die Beispielantwort muss eine VOLLSTÄNDIGE Antwort des Verkäufers sein - sie darf NICHT die Situation/Kundenaussage wiederholen oder paraphrasieren!
- Sie muss direkt auf die Situation "${situation}" reagieren, aber OHNE sie zu wiederholen
- **LOGISCHE KONSISTENZ:** Die Antwort muss logisch konsistent sein - keine widersprüchlichen Aussagen!
  - Beispiel: Wenn der Kunde sagt "zu teuer", dann NICHT "wir sind günstiger" sagen (das wäre ein Widerspruch)
  - Stattdessen: Den Wert/M Nutzen kommunizieren, ohne den Preis zu bestreiten
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
  "bestAnswer": "<VOLLSTÄNDIGE Beispielantwort des Verkäufers, die direkt auf die Situation antwortet und alle Kriterien perfekt erfüllt. WICHTIG: Die Antwort darf NICHT die Situation/Kundenaussage wiederholen oder paraphrasieren! Sie muss LOGISCH KONSISTENT sein - keine widersprüchlichen Aussagen. Die Antwort muss SELBSTBEWUSST, PROFESSIONELL und WERTORIENTIERT sein - NICHT defensiv oder rechtfertigend. Zeige, dass der Verkäufer ein Experte ist, der dem Kunden hilft, nicht jemand der um den Kunden kämpft.>"
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
- Direkt auf die Kundenaussage eingehen, aber OHNE sie zu wiederholen oder zu paraphrasieren
- LOGISCH KONSISTENT sein - keine widersprüchlichen Aussagen!
  - Beispiel: Wenn Kunde sagt "zu teuer", dann NICHT "wir sind günstiger" (Widerspruch!)
  - Stattdessen: Wert/M Nutzen kommunizieren, ohne Preis zu bestreiten
- Alle Kriterien perfekt erfüllen
- SELBSTBEWUSST und PROFESSIONELL sein - NICHT defensiv oder rechtfertigend
- WERTORIENTIERT: Fokus auf den Mehrwert für den Kunden, nicht auf Entschuldigungen
- PARTNERSCHAFTLICH: Der Verkäufer ist ein Experte, der hilft - nicht jemand der um den Kunden kämpft
- SERIÖS & EXPERTENHAFT: Zeige Expertise und Kompetenz, nicht Verzweiflung
- Konkret, überzeugend und wertorientiert sein
- Eine echte Verkäuferantwort sein (nicht die Situation wiederholen!)

VERMEIDE:
- Die Situation/Kundenaussage zu wiederholen oder zu paraphrasieren
- Widersprüchliche Aussagen (z.B. "Sie sagen X, aber wir sind Y" wenn das nicht logisch passt)
- Rechtfertigungen ("Ich verstehe Ihre Bedenken", "Lassen Sie mich erklären")
- Defensive Formulierungen ("Wir sind wirklich gut", "Bitte geben Sie uns eine Chance")
- Bittende Töne ("Es wäre toll, wenn...", "Könnten Sie vielleicht...")

STATTDESSEN:
- Direkt mit Fakten und konkretem Nutzen beginnen
- Lösungen anbieten, die den Kunden weiterbringen
- Selbstbewusst und expertenhaft kommunizieren
- Logisch konsistent argumentieren

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
            content: 'Du bist ein Experte für Stichpunkt-Formulierungen. Deine Aufgabe: Vollständigen Verkaufstext in echte Stichpunkte umwandeln – stichpunktartig gekürzt, aber inhaltlich vollständig.\n\nRegeln: (1) Der gesamte Inhalt muss erhalten bleiben – keine Gedanken, Schritte oder Abläufe weglassen. (2) Nur sprachlich kürzen: Füllwörter, überflüssige Artikel, Wiederholungen und Höflichkeitsfloskeln raus; Formulierung stichpunktartig (kurz, telegrammstil). (3) Wichtige Abläufe und Reihenfolgen müssen vollständig abgebildet sein – wenn der Originaltext mehrere Schritte enthält, gibt es entsprechend mehrere Stichpunkte. (4) Jeder Stichpunkt = eine klare Aussage oder ein Schritt, so kurz wie möglich formuliert, aber ohne Informationsverlust.'
          },
          {
            role: 'user',
            content: `Wandle den folgenden Verkaufstext in Stichpunkte um. WICHTIG: Inhaltlich alles erhalten – nichts weglassen oder zusammenfassen, was Information oder Ablauf ist. Nur Wörter kürzen (stichpunktartig formulieren). Bei mehreren Schritten/Abläufen pro Satz mehrere Stichpunkte erzeugen.\n\nOriginaltext:\n\n${fullText}\n\nGib die Stichpunkte als JSON-Array zurück: ["Stichpunkt 1", "Stichpunkt 2", ...]. Jeder Eintrag = stichpunktartig gekürzt, aber inhaltlich vollständig; wichtige Abläufe dürfen nicht fehlen.`
          }
        ],
        temperature: 0.3,
        max_tokens: 2000
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

app.post('/api/guides/generate-objections', async (req, res) => {
  try {
    const userId = req.session?.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Nicht angemeldet' });
    }
    const { usps } = req.body;
    if (!usps) {
      return res.status(400).json({ error: 'usps ist erforderlich' });
    }
    const normalized = {
      grundsaetzlich: usps.grundsaetzlich || [],
      gegenueberKonkurrenten: usps.gegenueberKonkurrenten || [],
      gegenueberAlterenMethoden: usps.gegenueberAlterenMethoden || []
    };
    const objections = await generateObjectionResponses(normalized);
    res.json({ success: true, objections });
  } catch (error) {
    console.error('Error generating objections:', error);
    res.status(500).json({
      error: 'Fehler bei der Generierung der Einwand-Antworten',
      message: error.message
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



import express from 'express';
import cors from 'cors';
import { neon } from '@neondatabase/serverless';

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
    
    // Create user_progress table if it doesn't exist
    await sql`
      CREATE TABLE IF NOT EXISTS user_progress (
        id SERIAL PRIMARY KEY,
        user_id VARCHAR(255) NOT NULL,
        scenario_id INTEGER REFERENCES scenarios(id),
        completed BOOLEAN DEFAULT FALSE,
        score INTEGER DEFAULT 0,
        completed_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
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

app.use(cors());
app.use(express.json());

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
    }
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

// User Progress API
app.get('/api/progress/:userId', async (req, res) => {
  try {
    if (!sql) {
      console.log('No database connection, returning empty progress');
      return res.json({ progress: [] });
    }
    
    const userId = req.params.userId;
    const progress = await sql`
      SELECT s.title, s.industry, up.completed, up.score, up.completed_at
      FROM user_progress up
      JOIN scenarios s ON up.scenario_id = s.id
      WHERE up.user_id = ${userId}
      ORDER BY up.completed_at DESC
    `;
    res.json({ progress });
  } catch (error) {
    console.error('Error fetching progress:', error);
    res.status(500).json({ error: 'Failed to fetch progress' });
  }
});

// Save Progress API
app.post('/api/progress', async (req, res) => {
  try {
    if (!sql) {
      console.log('No database connection, progress not saved');
      return res.json({ success: true, message: 'Progress not saved (no database connection)' });
    }
    
    const { userId, scenarioId, completed, score } = req.body;
    
    const result = await sql`
      INSERT INTO user_progress (user_id, scenario_id, completed, score, completed_at)
      VALUES (${userId}, ${scenarioId}, ${completed}, ${score}, ${completed ? new Date() : null})
      ON CONFLICT (user_id, scenario_id) 
      DO UPDATE SET 
        completed = ${completed},
        score = ${score},
        completed_at = ${completed ? new Date() : null}
      RETURNING *
    `;
    
    res.json({ success: true, data: result[0] });
  } catch (error) {
    console.error('Error saving progress:', error);
    res.status(500).json({ error: 'Failed to save progress' });
  }
});

// Start server with port fallback
const startServer = async () => {
  const server = app.listen(PORT, async () => {
    console.log(`Backend listening on http://localhost:${PORT}`);
    
    // Initialize database
    await initializeDatabase();
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.log(`Port ${PORT} is in use, trying ${PORT + 1}...`);
      const newPort = PORT + 1;
      const newServer = app.listen(newPort, async () => {
        console.log(`Backend listening on http://localhost:${newPort}`);
        await initializeDatabase();
      });
    } else {
      console.error('Server error:', err);
    }
  });
};

startServer();



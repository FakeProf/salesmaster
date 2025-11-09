import React from 'react'
import { Routes, Route, NavLink } from 'react-router-dom'
import EmailChecker from './EmailChecker'
import './App.css'

function Layout({ children }) {
  return (
    <div className="app-container">
      <header className="app-header">
        <div className="header-content">
          <NavLink to="/" className="logo-link">
            <h1>🎯 SalesMaster</h1>
          </NavLink>
          <nav className="nav-tabs">
            <NavLink to="/training" className="nav-tab">Vertriebs-Training</NavLink>
            <NavLink to="/practice" className="nav-tab">Übungsmodus</NavLink>
            <NavLink to="/scenarios" className="nav-tab">Szenarien</NavLink>
            <NavLink to="/progress" className="nav-tab">Fortschritt</NavLink>
            <NavLink to="/email-check" className="nav-tab">E-Mail-Prüfung</NavLink>
          </nav>
        </div>
      </header>
      <main className="main-content">{children}</main>
      <footer className="modern-footer">
        <div className="footer-content">
          <div className="footer-section">
            <h4>SalesMaster</h4>
            <p>Professionelle Verkaufsschulung</p>
          </div>
          <div className="footer-section">
            <h4>Support</h4>
            <a href="/kontakt">Kontakt</a>
          </div>
          <div className="footer-section">
            <h4>Rechtliches</h4>
            <a href="/datenschutz">Datenschutz</a>
            <a href="/impressum">Impressum</a>
            <a href="/agb">AGB</a>
            <a href="/cookies">Cookies</a>
          </div>
          <div className="footer-section">
            <p>&copy; 2025 SalesMaster. Alle Rechte vorbehalten.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}

function Home() {
  return (
    <div className="home-container">
      <div className="hero-section">
        <h2>Willkommen bei SalesMaster</h2>
        <p>Verbessere deine Verkaufskünste mit interaktiven Übungen und realistischen Szenarien</p>
      </div>
      
      <div className="training-grid">
        <div className="training-card">
          <h3><i className="fas fa-graduation-cap"></i> Vertriebs-Training</h3>
          <p>Lerne die Grundlagen des erfolgreichen Verkaufs. Einwandbehandlung, Fragetechniken, Verkaufspsychologie und Verkaufssprache.</p>
          <button className="btn" onClick={() => window.location.href = '/training'}>Training starten</button>
        </div>
        
        <div className="training-card">
          <h3><i className="fas fa-dumbbell"></i> Übungsmodus</h3>
          <p>Teste dein Wissen mit Quiz-Fragen, Karteikarten und interaktiven Übungen.</p>
          <button className="btn" onClick={() => window.location.href = '/practice'}>Jetzt üben</button>
        </div>
        
        <div className="training-card">
          <h3><i className="fas fa-theater-masks"></i> Verkaufsszenarien</h3>
          <p>Übe mit echten Verkaufssituationen aus verschiedenen Branchen und Zielgruppen.</p>
          <button className="btn" onClick={() => window.location.href = '/scenarios'}>Szenarien erkunden</button>
        </div>
        
        <div className="training-card">
          <h3><i className="fas fa-chart-line"></i> Fortschritt</h3>
          <p>Verfolge deine Lernreise, sammle Erfolge und erreiche neue Ziele.</p>
          <button className="btn" onClick={() => window.location.href = '/progress'}>Fortschritt anzeigen</button>
        </div>
      </div>
    </div>
  )
}

function Training() {
  const trainingModules = [
    {
      id: 'objection-handling',
      title: 'Einwandbehandlung',
      icon: 'fas fa-shield-alt',
      description: 'Lerne, wie du die häufigsten Einwände professionell behandelst und in Verkaufschancen umwandelst.',
      topics: ['Preis-Einwände', 'Zeit-Einwände', 'Vertrauens-Einwände', 'Konkurrenz-Einwände'],
      action: () => startObjectionTraining()
    },
    {
      id: 'question-techniques',
      title: 'Fragetechniken',
      icon: 'fas fa-question-circle',
      description: 'Meistere die Kunst der richtigen Fragen. SPIN-Selling, BANT-Qualifizierung und mehr.',
      topics: ['SPIN-Selling', 'BANT-Qualifizierung', 'Offene vs. geschlossene Fragen', 'Funnel-Fragen'],
      action: () => startQuestionTraining()
    },
    {
      id: 'sales-psychology',
      title: 'Verkaufspsychologie',
      icon: 'fas fa-brain',
      description: 'Verstehe die Psychologie hinter erfolgreichen Verkäufen und nutze sie zu deinem Vorteil.',
      topics: ['DISC-Persönlichkeitstypen', 'Reziprozität', 'Knappheit', 'Sozialer Beweis'],
      action: () => startPsychologyTraining()
    },
    {
      id: 'sales-language',
      title: 'Verkaufssprache',
      icon: 'fas fa-comments',
      description: 'Lerne professionelle Formulierungen und vermeide Verkaufskiller-Wörter.',
      topics: ['Professionelle Formulierungen', 'Themenablenkung', 'Wert-Kommunikation', 'Abschluss-Formulierungen'],
      action: () => startLanguageTraining()
    }
  ]

  function startObjectionTraining() { alert('Einwandbehandlung-Training wird gestartet...') }
  function startQuestionTraining() { alert('Fragetechniken-Training wird gestartet...') }
  function startPsychologyTraining() { alert('Verkaufspsychologie-Training wird gestartet...') }
  function startLanguageTraining() { alert('Verkaufssprache-Training wird gestartet...') }

  return (
    <div className="training-container">
      <div className="section-header">
        <h2>Vertriebs-Training</h2>
        <p>Lerne die Grundlagen des erfolgreichen Verkaufs</p>
      </div>

      <div className="training-grid">
        {trainingModules.map(module => (
          <div key={module.id} className="training-card">
            <h3><i className={module.icon}></i> {module.title}</h3>
            <p>{module.description}</p>
            <div className="topics-list">
              <h4>Lerninhalte:</h4>
              <ul>
                {module.topics.map((topic, idx) => (
                  <li key={idx}>{topic}</li>
                ))}
              </ul>
            </div>
            <button className="btn" onClick={module.action}>
              Training starten
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}

function Practice() {
  const [activeModule, setActiveModule] = React.useState(null)

  const modules = [
    {
      id: 'adaptive-quiz',
      title: 'Adaptives Quiz',
      icon: 'fas fa-brain',
      description: 'Intelligentes Quiz mit Spaced Repetition und personalisierter Schwierigkeit.',
      buttons: [
        { label: 'Einwände', action: () => startAdvancedObjectionQuiz() },
        { label: 'Fragen', action: () => startAdvancedQuestionQuiz() },
        { label: 'Rollenspiel', action: () => startAdvancedScenarioQuiz() }
      ]
    },
    {
      id: 'flashcards',
      title: 'Karteikarten',
      icon: 'fas fa-cards-blank',
      description: 'Lerne mit intelligenten Karteikarten. Schwierige Karten werden häufiger wiederholt.',
      buttons: [
        { label: 'Karten starten', action: () => startFlashcards() }
      ]
    },
    {
      id: 'roleplay',
      title: 'Rollenspiel',
      icon: 'fas fa-theater-masks',
      description: 'Übe Verkaufsgespräche in realistischen Szenarien mit verschiedenen Kundentypen.',
      buttons: [
        { label: 'Rollenspiel starten', action: () => startRoleplay() }
      ]
    },
    {
      id: 'challenge',
      title: 'Herausforderung',
      icon: 'fas fa-trophy',
      description: 'Spezielle Übungen für Fortgeschrittene. Meistere komplexe Verkaufssituationen.',
      buttons: [
        { label: 'Herausforderung starten', action: () => startChallenge() }
      ]
    },
    {
      id: 'micro-learning',
      title: 'Mikro-Learning',
      icon: 'fas fa-microphone',
      description: '5-Minuten Lerneinheiten mit Storytelling und interaktiven Szenarien.',
      buttons: [
        { label: 'Einwände', action: () => startMicroLearning('objection_handling') },
        { label: 'SPIN', action: () => startMicroLearning('question_techniques') }
      ]
    },
    {
      id: 'insights',
      title: 'Lern-Insights',
      icon: 'fas fa-chart-line',
      description: 'Personalisiertes Feedback und Empfehlungen für optimalen Lernerfolg.',
      buttons: [
        { label: 'Insights anzeigen', action: () => viewLearningInsights() }
      ]
    }
  ]

  // Placeholder functions - will be implemented
  function startAdvancedObjectionQuiz() { alert('Adaptives Einwände-Quiz wird gestartet...') }
  function startAdvancedQuestionQuiz() { alert('Adaptives Fragen-Quiz wird gestartet...') }
  function startAdvancedScenarioQuiz() { alert('Adaptives Szenario-Quiz wird gestartet...') }
  function startFlashcards() { alert('Karteikarten-System wird gestartet...') }
  function startRoleplay() { alert('Rollenspiel wird gestartet...') }
  function startChallenge() { alert('Herausforderung wird gestartet...') }
  function startMicroLearning(topic) { alert(`Mikro-Learning für ${topic} wird gestartet...`) }
  function viewLearningInsights() { alert('Lern-Insights werden angezeigt...') }

  return (
    <div className="practice-container">
      <div className="section-header">
        <h2>Übungsmodus</h2>
        <p>Teste und verbessere deine Verkaufskünste</p>
      </div>

      <div className="training-grid">
        {modules.map(module => (
          <div key={module.id} className="training-card">
            <h3><i className={module.icon}></i> {module.title}</h3>
            <p>{module.description}</p>
            <div className="module-buttons">
              {module.buttons.map((btn, idx) => (
                <button key={idx} className="btn" onClick={btn.action}>
                  {btn.label}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function Scenarios() {
  const [scenarios, setScenarios] = React.useState([])
  const [filteredScenarios, setFilteredScenarios] = React.useState([])
  const [selectedIndustry, setSelectedIndustry] = React.useState('all')
  const [selectedScenario, setSelectedScenario] = React.useState(null)

  const industries = [
    { id: 'all', name: 'Alle' },
    { id: 'finance', name: 'Finanzen' },
    { id: 'healthcare', name: 'Gesundheit' },
    { id: 'education', name: 'Bildung' },
    { id: 'logistics', name: 'Logistik' },
    { id: 'sales', name: 'Vertrieb' },
    { id: 'compliance', name: 'Compliance' }
  ]

  React.useEffect(() => {
    fetch('http://localhost:4000/api/scenarios')
      .then(r => r.json())
      .then(j => {
        setScenarios(j.scenarios ?? [])
        setFilteredScenarios(j.scenarios ?? [])
      })
      .catch(() => {
        setScenarios([])
        setFilteredScenarios([])
      })
  }, [])

  const filterScenarios = (industry) => {
    setSelectedIndustry(industry)
    if (industry === 'all') {
      setFilteredScenarios(scenarios)
    } else {
      setFilteredScenarios(scenarios.filter(s => s.industry === industry))
    }
  }

  const startScenario = (scenarioId) => {
    const scenario = scenarios.find(s => s.id === scenarioId)
    if (scenario) {
      setSelectedScenario(scenario)
    }
  }

  const closeModal = () => {
    setSelectedScenario(null)
  }

  return (
    <div className="scenarios-container">
      <div className="section-header">
        <h2>Verkaufsszenarien</h2>
        <p>Übe mit echten Verkaufssituationen aus verschiedenen Branchen</p>
      </div>

      <div className="industry-filters">
        <h3>Wähle deine Branche:</h3>
        <div className="filter-buttons">
          {industries.map(industry => (
            <button
              key={industry.id}
              className={`btn ${selectedIndustry === industry.id ? 'active' : ''}`}
              onClick={() => filterScenarios(industry.id)}
            >
              {industry.name}
            </button>
          ))}
        </div>
      </div>

      <div className="scenarios-grid">
        {filteredScenarios.map(scenario => (
          <div key={scenario.id} className="scenario-card">
            <div className={`difficulty ${scenario.difficulty}`}>
              {scenario.difficulty === 'beginner' ? 'Anfänger' : 
               scenario.difficulty === 'intermediate' ? 'Fortgeschritten' : 'Experte'}
            </div>
            <h4>{scenario.title}</h4>
            <p><strong>Situation:</strong> {scenario.description}</p>
            <button className="btn" onClick={() => startScenario(scenario.id)}>
              Szenario starten
            </button>
          </div>
        ))}
      </div>

      {selectedScenario && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>🎯 {selectedScenario.title}</h2>
              <button className="close-btn" onClick={closeModal}>×</button>
            </div>
            <div className="scenario-details">
              <div className="scenario-info">
                <h3>📋 Situation:</h3>
                <p>{selectedScenario.description}</p>
                <h3>🎯 Herausforderung:</h3>
                <p>Meistere dieses Verkaufsszenario mit professionellen Techniken.</p>
                <h3>🏆 Ziel:</h3>
                <p>Erfolgreich verkaufen und Kunden überzeugen.</p>
              </div>
              <div className="scenario-actions">
                <button className="btn primary" onClick={() => {
                  alert('Szenario wird gestartet...')
                  closeModal()
                }}>
                  Szenario starten
                </button>
                <button className="btn secondary" onClick={closeModal}>
                  Schließen
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function Progress() {
  const [userProgress, setUserProgress] = React.useState({
    completedTrainings: 2,
    totalTrainings: 4,
    completedScenarios: 3,
    totalScenarios: 6,
    currentStreak: 5,
    totalXP: 1250,
    level: 3,
    achievements: [
      { id: 1, name: 'Erste Schritte', description: 'Erstes Training abgeschlossen', earned: true },
      { id: 2, name: 'Einwand-Profi', description: '10 Einwände erfolgreich behandelt', earned: true },
      { id: 3, name: 'Fragen-Meister', description: 'SPIN-Selling gemeistert', earned: false },
      { id: 4, name: 'Szenario-Champion', description: 'Alle Szenarien durchgespielt', earned: false }
    ],
    recentActivity: [
      { date: '2025-01-15', activity: 'Einwandbehandlung-Training abgeschlossen', xp: 150 },
      { date: '2025-01-14', activity: 'Buchhaltung-Szenario gemeistert', xp: 200 },
      { date: '2025-01-13', activity: 'Fragetechniken-Quiz bestanden', xp: 100 }
    ]
  })

  const trainingProgress = (userProgress.completedTrainings / userProgress.totalTrainings) * 100
  const scenarioProgress = (userProgress.completedScenarios / userProgress.totalScenarios) * 100

  return (
    <div className="progress-container">
      <div className="section-header">
        <h2>Dein Fortschritt</h2>
        <p>Verfolge deine Lernreise und erreiche neue Ziele</p>
      </div>

      <div className="progress-stats">
        <div className="stat-card">
          <div className="stat-icon">🏆</div>
          <div className="stat-content">
            <h3>Level {userProgress.level}</h3>
            <p>{userProgress.totalXP} XP</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">🔥</div>
          <div className="stat-content">
            <h3>{userProgress.currentStreak} Tage</h3>
            <p>Lernstreak</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">📚</div>
          <div className="stat-content">
            <h3>{userProgress.completedTrainings}/{userProgress.totalTrainings}</h3>
            <p>Trainings abgeschlossen</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">🎯</div>
          <div className="stat-content">
            <h3>{userProgress.completedScenarios}/{userProgress.totalScenarios}</h3>
            <p>Szenarien gemeistert</p>
          </div>
        </div>
      </div>

      <div className="progress-sections">
        <div className="progress-section">
          <h3>Training-Fortschritt</h3>
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${trainingProgress}%` }}></div>
          </div>
          <p>{userProgress.completedTrainings} von {userProgress.totalTrainings} Trainings abgeschlossen</p>
        </div>

        <div className="progress-section">
          <h3>Szenario-Fortschritt</h3>
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${scenarioProgress}%` }}></div>
          </div>
          <p>{userProgress.completedScenarios} von {userProgress.totalScenarios} Szenarien gemeistert</p>
        </div>
      </div>

      <div className="achievements-section">
        <h3>Erfolge</h3>
        <div className="achievements-grid">
          {userProgress.achievements.map(achievement => (
            <div key={achievement.id} className={`achievement-card ${achievement.earned ? 'earned' : 'locked'}`}>
              <div className="achievement-icon">
                {achievement.earned ? '🏆' : '🔒'}
              </div>
              <div className="achievement-content">
                <h4>{achievement.name}</h4>
                <p>{achievement.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="activity-section">
        <h3>Letzte Aktivitäten</h3>
        <div className="activity-list">
          {userProgress.recentActivity.map((activity, idx) => (
            <div key={idx} className="activity-item">
              <div className="activity-date">{activity.date}</div>
              <div className="activity-description">{activity.activity}</div>
              <div className="activity-xp">+{activity.xp} XP</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/training" element={<Training />} />
        <Route path="/practice" element={<Practice />} />
        <Route path="/scenarios" element={<Scenarios />} />
        <Route path="/progress" element={<Progress />} />
        <Route path="/email-check" element={<EmailChecker />} />
      </Routes>
    </Layout>
  )
}



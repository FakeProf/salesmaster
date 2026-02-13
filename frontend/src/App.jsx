import React, { useEffect, useState } from 'react'
import { Routes, Route, NavLink, useSearchParams, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from './AuthContext'
import { apiFetch } from './api'
import AuthModal from './AuthModal'
import EmailChecker from './EmailChecker'
import './App.css'

// Toast Notification Context
const ToastContext = React.createContext(null)

function ToastProvider({ children }) {
  const [toasts, setToasts] = React.useState([])

  const showToast = (message, type = 'info') => {
    const id = Date.now()
    setToasts(prev => [...prev, { id, message, type }])
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id))
    }, 3000)
  }

  return (
    <ToastContext.Provider value={showToast}>
      {children}
      <div className="toast-container">
        {toasts.map(toast => (
          <div key={toast.id} className={`toast toast-${toast.type}`}>
            {toast.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

function useToast() {
  const context = React.useContext(ToastContext)
  if (!context) {
    return () => {} // Fallback: keine Aktion
  }
  return context
}

function Layout({ children }) {
  const { user, loading, logout, refreshUser, showAuthModal, setShowAuthModal } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const location = useLocation()
  const [userMenuOpen, setUserMenuOpen] = React.useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false)
  const userMenuRef = React.useRef(null)
  const mobileMenuRef = React.useRef(null)
  const mobileMenuToggleRef = React.useRef(null)

  useEffect(() => {
    if (searchParams.get('logged_in') === '1') {
      refreshUser()
      setSearchParams((prev) => {
        const p = new URLSearchParams(prev)
        p.delete('logged_in')
        return p
      }, { replace: true })
    }
  }, [refreshUser, searchParams, setSearchParams])

  React.useEffect(() => {
    if (!userMenuOpen) return
    const close = (e) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) setUserMenuOpen(false)
    }
    document.addEventListener('click', close)
    return () => document.removeEventListener('click', close)
  }, [userMenuOpen])

  React.useEffect(() => {
    if (!mobileMenuOpen) return
    const close = (e) => {
      if (mobileMenuRef.current && !mobileMenuRef.current.contains(e.target) && 
          mobileMenuToggleRef.current && !mobileMenuToggleRef.current.contains(e.target)) {
        setMobileMenuOpen(false)
      }
    }
    document.addEventListener('click', close)
    return () => document.removeEventListener('click', close)
  }, [mobileMenuOpen])

  // Schließe das mobile Menü, wenn die Route wechselt
  React.useEffect(() => {
    setMobileMenuOpen(false)
  }, [location.pathname])

  return (
    <div className="app-container">
      <header className="app-header">
        <div className="header-content">
          <div className="header-left">
            <button 
              type="button" 
              ref={mobileMenuToggleRef}
              className="mobile-menu-toggle"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Menü öffnen"
              aria-expanded={mobileMenuOpen}
            >
              <span className="hamburger-icon">
                <span></span>
                <span></span>
                <span></span>
              </span>
            </button>
            <NavLink to="/" className="logo-link">
              <h1>SalesMaster</h1>
            </NavLink>
          </div>
          <nav className={`nav-tabs ${mobileMenuOpen ? 'mobile-menu-open' : ''}`} ref={mobileMenuRef}>
            <NavLink to="/training" className="nav-tab" onClick={() => setMobileMenuOpen(false)}>Vertriebs-Training</NavLink>
            <NavLink to="/practice" className="nav-tab" onClick={() => setMobileMenuOpen(false)}>Übungsmodus</NavLink>
            <NavLink to="/scenarios" className="nav-tab" onClick={() => setMobileMenuOpen(false)}>Szenarien</NavLink>
            <NavLink to="/leitfaden" className="nav-tab" onClick={() => setMobileMenuOpen(false)}>Leitfaden</NavLink>
            <NavLink to="/email-check" className="nav-tab" onClick={() => setMobileMenuOpen(false)}>E-Mail-Prüfung</NavLink>
          </nav>
          <div className="header-auth">
            {!loading && (
              user ? (
                <div className="header-user-wrap" ref={userMenuRef}>
                  <button
                    type="button"
                    className="header-user-trigger"
                    onClick={() => setUserMenuOpen((o) => !o)}
                    aria-expanded={userMenuOpen}
                    aria-haspopup="true"
                  >
                    <span className="header-user-name">{user.name || user.email}</span>
                    <span className="header-user-chevron" aria-hidden>▼</span>
                  </button>
                  {userMenuOpen && (
                    <div className="header-user-menu">
                      <NavLink to="/progress" className="header-user-menu-item" onClick={() => setUserMenuOpen(false)}>
                        Fortschritt
                      </NavLink>
                      <button type="button" className="header-user-menu-item header-user-menu-logout" onClick={() => { setUserMenuOpen(false); logout(); }}>
                        Abmelden
                      </button>
        </div>
                  )}
                </div>
              ) : (
                <>
                  <button type="button" className="btn btn-auth" onClick={() => setShowAuthModal(true)}>
                    Anmelden
                  </button>
                  {showAuthModal && <AuthModal onClose={() => setShowAuthModal(false)} />}
                </>
              )
            )}
          </div>
        </div>
        {searchParams.get('auth_error') && (
          <div className="auth-error-banner">
            Anmeldung fehlgeschlagen. Bitte erneut versuchen.
          </div>
        )}
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
            <NavLink to="/kontakt">Kontakt</NavLink>
          </div>
          <div className="footer-section">
            <h4>Rechtliches</h4>
            <NavLink to="/datenschutz">Datenschutz</NavLink>
            <NavLink to="/impressum">Impressum</NavLink>
            <NavLink to="/cookies">Cookies</NavLink>
          </div>
          <div className="footer-section">
            <p>&copy; 2026 SalesMaster. Alle Rechte vorbehalten.</p>
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
  const { user } = useAuth()
  const [activeModule, setActiveModule] = React.useState(null)
  const [currentQuestionIndex, setCurrentQuestionIndex] = React.useState(0)
  const [selectedAnswer, setSelectedAnswer] = React.useState(null)
  const [showNextButton, setShowNextButton] = React.useState(false)

  const trainingModules = [
    {
      id: 'objection-handling',
      title: 'Einwandbehandlung',
      icon: 'fas fa-shield-alt',
      description: 'Lerne, wie du die häufigsten Einwände professionell behandelst und in Verkaufschancen umwandelst.',
      topics: ['Preis-Einwände', 'Zeit-Einwände', 'Vertrauens-Einwände', 'Konkurrenz-Einwände'],
      action: () => {
        setActiveModule('objection-handling')
        setCurrentQuestionIndex(0)
        setSelectedAnswer(null)
        setShowNextButton(false)
      }
    },
    {
      id: 'question-techniques',
      title: 'Fragetechniken',
      icon: 'fas fa-question-circle',
      description: 'Meistere die Kunst der richtigen Fragen. SPIN-Selling, BANT-Qualifizierung und mehr.',
      topics: ['SPIN-Selling', 'BANT-Qualifizierung', 'Offene vs. geschlossene Fragen', 'Funnel-Fragen'],
      action: () => {
        setActiveModule('question-techniques')
        setCurrentQuestionIndex(0)
        setSelectedAnswer(null)
        setShowNextButton(false)
      }
    },
    {
      id: 'sales-psychology',
      title: 'Verkaufspsychologie',
      icon: 'fas fa-brain',
      description: 'Verstehe die Psychologie hinter erfolgreichen Verkäufen und nutze sie zu deinem Vorteil.',
      topics: ['DISC-Persönlichkeitstypen', 'Reziprozität', 'Knappheit', 'Sozialer Beweis'],
      action: () => {
        setActiveModule('sales-psychology')
        setCurrentQuestionIndex(0)
        setSelectedAnswer(null)
        setShowNextButton(false)
      }
    },
    {
      id: 'sales-language',
      title: 'Verkaufssprache',
      icon: 'fas fa-comments',
      description: 'Lerne professionelle Formulierungen und vermeide Verkaufskiller-Wörter.',
      topics: ['Professionelle Formulierungen', 'Themenablenkung', 'Wert-Kommunikation', 'Abschluss-Formulierungen'],
      action: () => {
        setActiveModule('sales-language')
        setCurrentQuestionIndex(0)
        setSelectedAnswer(null)
        setShowNextButton(false)
      }
    }
  ]

  // Alle 8 Fragen in einer flachen Liste
  const objectionQuestions = [
    {
      id: 1,
      question: 'Ein Kunde sagt: „Das ist mir zu teuer!" – Wie reagierst du am professionellsten?',
      options: [
        { id: 1, text: '„Dann kommen wir wohl nicht zusammen."', correct: false },
        { id: 2, text: '„Teuer im Vergleich zu was genau?"', correct: true },
        { id: 3, text: '„Ich kann Ihnen sofort 20 % Rabatt geben."', correct: false },
        { id: 4, text: '„Unsere Preise sind nun mal so."', correct: false }
      ],
      explanation: 'Durch gezieltes Nachfragen findest du heraus, ob der Preis-Einwand echt ist oder ob andere Bedenken dahinterstecken. "Teuer" ist relativ – der Kunde vergleicht vielleicht mit einem unpassenden Produkt oder hat den Wert noch nicht verstanden. Diese Frage öffnet das Gespräch und ermöglicht es dir, den Mehrwert zu kommunizieren.'
    },
    {
      id: 2,
      question: 'Wie kannst du einen Preis-Einwand positiv umwandeln?',
      options: [
        { id: 1, text: 'Den Fokus auf den Mehrwert und den Nutzen legen', correct: true },
        { id: 2, text: 'Den Preis sofort senken', correct: false },
        { id: 3, text: 'Dem Kunden zustimmen, dass es teuer ist', correct: false },
        { id: 4, text: 'Über die Konkurrenz schlecht reden', correct: false }
      ],
      explanation: 'Preis ist nur ein Faktor – der Wert ist entscheidend. Indem du den Fokus auf den Mehrwert, den Nutzen und die ROI legst, hilfst du dem Kunden, die Investition zu rechtfertigen. Ein sofortiger Rabatt devaluiert dein Produkt und zeigt mangelndes Vertrauen in den Wert. Der Kunde kauft nicht den Preis, sondern die Lösung für sein Problem.'
    },
    {
      id: 3,
      question: 'Ein Kunde sagt: „Ich muss erst noch darüber nachdenken." Was ist eine gute Antwort?',
      options: [
        { id: 1, text: '„Okay, melden Sie sich einfach irgendwann."', correct: false },
        { id: 2, text: '„Dann rufe ich Sie in einem Jahr wieder an."', correct: false },
        { id: 3, text: '„Natürlich! Was genau möchten Sie sich noch überlegen?"', correct: true },
        { id: 4, text: '„Das ist keine gute Idee."', correct: false }
      ],
      explanation: 'Ein "Zeit-Einwand" ist oft ein versteckter Einwand. Durch gezieltes Nachfragen findest du heraus, ob es wirklich um Zeit geht oder um Preis, Vertrauen oder andere Bedenken. Wenn du einfach abwartest, verlierst du den Deal. Professionelle Verkäufer klären Bedenken sofort, nicht später.'
    },
    {
      id: 4,
      question: 'Wie erkennst du, ob ein „Zeit-Einwand" echt ist?',
      options: [
        { id: 1, text: 'Indem du sofort einen Rabatt anbietest', correct: false },
        { id: 2, text: 'Du wartest einfach ab', correct: false },
        { id: 3, text: 'Du gehst davon aus, dass der Kunde nicht interessiert ist', correct: false },
        { id: 4, text: 'Durch gezieltes Nachfragen, z. B. „Geht es um den Preis oder um etwas anderes?"', correct: true }
      ],
      explanation: 'Die meisten "Zeit-Einwände" sind Scheinargumente. Echte Zeitprobleme haben konkrete Gründe (Budgetzyklen, Genehmigungen, etc.). Durch gezieltes Nachfragen deckst du die wahren Bedenken auf. Ein sofortiger Rabatt signalisiert Unsicherheit und löst nicht das eigentliche Problem.'
    },
    {
      id: 5,
      question: 'Ein Kunde sagt: „Ich kenne Ihre Firma nicht." – Was tust du am besten?',
      options: [
        { id: 1, text: 'Referenzen, Fallbeispiele oder Kundenstimmen zeigen', correct: true },
        { id: 2, text: 'Das ignorieren und weiter präsentieren', correct: false },
        { id: 3, text: 'Den Kunden bitten, selbst im Internet zu recherchieren', correct: false },
        { id: 4, text: 'Den Preis senken, um Vertrauen zu schaffen', correct: false }
      ],
      explanation: 'Vertrauen entsteht durch sozialen Beweis. Referenzen, Fallbeispiele und Kundenstimmen zeigen dem Kunden, dass andere bereits erfolgreich mit dir gearbeitet haben. Das reduziert das Risiko in seiner Wahrnehmung. Ein niedrigerer Preis schafft kein Vertrauen – im Gegenteil, er kann Misstrauen wecken.'
    },
    {
      id: 6,
      question: 'Wie kannst du Vertrauen aufbauen, bevor Einwände entstehen?',
      options: [
        { id: 1, text: 'Durch viele Fachbegriffe', correct: false },
        { id: 2, text: 'Durch authentisches Auftreten und ehrliche Kommunikation', correct: true },
        { id: 3, text: 'Durch aggressives Verkaufen', correct: false },
        { id: 4, text: 'Durch Zeitdruck', correct: false }
      ],
      explanation: 'Vertrauen ist die Basis jedes Verkaufs. Authentizität und Ehrlichkeit schaffen eine Verbindung zum Kunden. Fachbegriffe können einschüchtern, aggressives Verkaufen wirkt manipulativ, und Zeitdruck erzeugt Stress. Ein vertrauensvoller Verkäufer ist ein Berater, der dem Kunden hilft, die beste Entscheidung zu treffen.'
    },
    {
      id: 7,
      question: 'Ein Kunde sagt: „Ihr Mitbewerber bietet das günstiger an." – Wie reagierst du souverän?',
      options: [
        { id: 1, text: '„Dann kaufen Sie doch dort."', correct: false },
        { id: 2, text: '„Unsere Konkurrenz ist schlecht."', correct: false },
        { id: 3, text: '„Das kann sein – was ist Ihnen denn außer dem Preis noch wichtig?"', correct: true },
        { id: 4, text: '„Ich mache denselben Preis."', correct: false }
      ],
      explanation: 'Konkurrenzvergleiche sind normal. Statt defensiv zu reagieren, lenkst du das Gespräch auf die Kriterien, die wirklich wichtig sind: Qualität, Service, Support, Zuverlässigkeit. Preis ist nur ein Faktor. Diese Frage hilft dem Kunden, seine Prioritäten zu klären und zeigt, dass du selbstbewusst und kundenorientiert bist.'
    },
    {
      id: 8,
      question: 'Was ist der beste Umgang mit einem Konkurrenz-Einwand?',
      options: [
        { id: 1, text: 'Den Konkurrenten kritisieren', correct: false },
        { id: 2, text: 'Den Kunden überreden', correct: false },
        { id: 3, text: 'Den Einwand ignorieren', correct: false },
        { id: 4, text: 'Verständnis zeigen und den Mehrwert deiner Lösung betonen', correct: true }
      ],
      explanation: 'Konkurrenten zu kritisieren wirkt unprofessionell und schadet deiner Glaubwürdigkeit. Stattdessen zeigst du Verständnis für die Situation und fokussierst dich auf deine Stärken und den einzigartigen Mehrwert deiner Lösung. Der Kunde will eine fundierte Entscheidung treffen – helfe ihm dabei, indem du die Vorteile deiner Lösung klar kommunizierst.'
    }
  ]

  // Alle 12 Fragen für Fragetechniken
  const questionTechniquesQuestions = [
    {
      id: 1,
      question: 'Wofür steht die Abkürzung SPIN im SPIN-Selling-Modell?',
      options: [
        { id: 1, text: 'Situation, Problem, Implication, Need-Payoff', correct: true },
        { id: 2, text: 'Strategy, Plan, Information, Negotiation', correct: false },
        { id: 3, text: 'Solution, Price, Interest, Network', correct: false },
        { id: 4, text: 'Sell, Promote, Inspire, Negotiate', correct: false }
      ],
      explanation: 'SPIN-Selling ist ein bewährtes Verkaufsmodell von Neil Rackham. Die vier Phasen führen den Kunden systematisch durch den Verkaufsprozess: Situation (aktuelle Lage verstehen), Problem (Herausforderungen identifizieren), Implication (Folgen des Problems aufzeigen) und Need-Payoff (Nutzen der Lösung verdeutlichen).'
    },
    {
      id: 2,
      question: 'Was ist das Ziel der „Implication Questions" im SPIN-Selling?',
      options: [
        { id: 1, text: 'Das Budget des Kunden herausfinden', correct: false },
        { id: 2, text: 'Die Folgen des Problems für den Kunden aufzeigen', correct: true },
        { id: 3, text: 'Das Produkt zu präsentieren', correct: false },
        { id: 4, text: 'Den Kunden unter Druck setzen', correct: false }
      ],
      explanation: 'Implication Questions helfen dem Kunden, die Konsequenzen seines Problems zu erkennen. Wenn der Kunde versteht, was passiert, wenn er nichts unternimmt, steigt sein Bedürfnis nach einer Lösung. Diese Fragen schaffen Dringlichkeit auf natürliche Weise, ohne Druck auszuüben.'
    },
    {
      id: 3,
      question: 'Welche Frage gehört zur Phase „Need-Payoff" im SPIN-Selling?',
      options: [
        { id: 1, text: '„Wie groß ist Ihr Unternehmen?"', correct: false },
        { id: 2, text: '„Wer trifft bei Ihnen die Entscheidung?"', correct: false },
        { id: 3, text: '„Wie würde sich Ihr Alltag verändern, wenn Sie dieses Problem lösen könnten?"', correct: true },
        { id: 4, text: '„Wie hoch ist Ihr aktuelles Budget?"', correct: false }
      ],
      explanation: 'Need-Payoff Questions lassen den Kunden selbst die Vorteile einer Lösung beschreiben. Wenn der Kunde die positiven Auswirkungen verbalisiert, wird er zum Verkäufer seiner eigenen Entscheidung. Diese Fragen sind besonders wirkungsvoll, weil sie den Kunden aktiv einbeziehen.'
    },
    {
      id: 4,
      question: 'Was bedeutet das Kürzel BANT?',
      options: [
        { id: 1, text: 'Benefit, Analysis, Negotiation, Target', correct: false },
        { id: 2, text: 'Buyer, Attention, Network, Target', correct: false },
        { id: 3, text: 'Budget, Agreement, Name, Trust', correct: false },
        { id: 4, text: 'Budget, Authority, Need, Timeline', correct: true }
      ],
      explanation: 'BANT ist ein Qualifizierungsmodell, das hilft zu prüfen, ob ein Lead wirklich kaufbereit ist. Budget (hat der Kunde Geld?), Authority (darf er entscheiden?), Need (braucht er die Lösung?) und Timeline (wann braucht er sie?). Nur wenn alle vier Kriterien erfüllt sind, ist der Lead qualifiziert.'
    },
    {
      id: 5,
      question: 'Was prüfst du bei der Komponente „Authority" im BANT-Modell?',
      options: [
        { id: 1, text: 'Wer die Kaufentscheidung trifft', correct: true },
        { id: 2, text: 'Wie viel Budget der Kunde hat', correct: false },
        { id: 3, text: 'Welche Produkte die Konkurrenz anbietet', correct: false },
        { id: 4, text: 'Ob der Kunde zufrieden ist', correct: false }
      ],
      explanation: 'Authority prüft, ob dein Gesprächspartner die Entscheidungsbefugnis hat. Es bringt nichts, mit jemandem zu verhandeln, der am Ende nicht entscheiden darf. Finde heraus, wer der Entscheider ist und ob dein Gesprächspartner Einfluss auf die Entscheidung hat.'
    },
    {
      id: 6,
      question: 'Warum ist BANT wichtig für den Vertrieb?',
      options: [
        { id: 1, text: 'Es ersetzt den gesamten Verkaufsprozess', correct: false },
        { id: 2, text: 'Es hilft, qualifizierte Leads von uninteressanten zu unterscheiden', correct: true },
        { id: 3, text: 'Es dient nur der Preisgestaltung', correct: false },
        { id: 4, text: 'Es wird nur im After-Sales genutzt', correct: false }
      ],
      explanation: 'BANT spart Zeit und Ressourcen, indem es früh zeigt, welche Leads wirklich kaufbereit sind. Ohne Qualifizierung verschwendest du Zeit mit Leads, die nie kaufen werden. BANT ist ein Werkzeug, kein Ersatz für den gesamten Verkaufsprozess, aber ein wichtiger Filter.'
    },
    {
      id: 7,
      question: 'Was ist der Hauptunterschied zwischen offenen und geschlossenen Fragen?',
      options: [
        { id: 1, text: 'Geschlossene Fragen sind höflicher', correct: false },
        { id: 2, text: 'Offene Fragen sind nur für Umfragen gedacht', correct: false },
        { id: 3, text: 'Offene Fragen regen zum Erzählen an, geschlossene liefern kurze Antworten', correct: true },
        { id: 4, text: 'Geschlossene Fragen sind besser für Vertrauensaufbau', correct: false }
      ],
      explanation: 'Offene Fragen beginnen mit W-Wörtern (Was, Wie, Warum, Wann, Wo) und lassen den Kunden ausführlich antworten. Geschlossene Fragen können mit Ja/Nein beantwortet werden. Im Verkauf nutzt du offene Fragen, um Informationen zu sammeln und Vertrauen aufzubauen, geschlossene Fragen für Bestätigungen und Abschlüsse.'
    },
    {
      id: 8,
      question: 'Welche der folgenden ist eine offene Frage?',
      options: [
        { id: 1, text: '„Sind Sie zufrieden?"', correct: false },
        { id: 2, text: '„Haben Sie Interesse?"', correct: false },
        { id: 3, text: '„Möchten Sie ein Angebot?"', correct: false },
        { id: 4, text: '„Wie entscheiden Sie, welche Anbieter Sie wählen?"', correct: true }
      ],
      explanation: 'Offene Fragen beginnen mit Fragewörtern wie "Wie", "Was", "Warum" und fordern ausführliche Antworten. Sie helfen, die Gedankenwelt des Kunden zu verstehen. Geschlossene Fragen (Ja/Nein) sind wichtig für Bestätigungen, aber weniger geeignet, um tiefe Einblicke zu gewinnen.'
    },
    {
      id: 9,
      question: 'Wann sind geschlossene Fragen im Verkauf sinnvoll?',
      options: [
        { id: 1, text: 'Um Entscheidungen zu bestätigen oder den Abschluss einzuleiten', correct: true },
        { id: 2, text: 'Zu Beginn des Gesprächs', correct: false },
        { id: 3, text: 'Wenn du noch Vertrauen aufbauen willst', correct: false },
        { id: 4, text: 'Wenn du Informationen sammeln möchtest', correct: false }
      ],
      explanation: 'Geschlossene Fragen sind ideal für Bestätigungen und Abschlüsse. "Passt Ihnen der Termin?" oder "Sollen wir das so umsetzen?" führen zu klaren Entscheidungen. Zu Beginn des Gesprächs und beim Vertrauensaufbau sind offene Fragen besser, weil sie dem Kunden Raum geben, sich zu öffnen.'
    },
    {
      id: 10,
      question: 'Was beschreibt der Begriff „Funnel-Fragen" im Vertrieb?',
      options: [
        { id: 1, text: 'Fragen, die nur nach Preisen fragen', correct: false },
        { id: 2, text: 'Fragen, die vom Allgemeinen zum Spezifischen führen', correct: true },
        { id: 3, text: 'Fragen, die den Kunden verwirren', correct: false },
        { id: 4, text: 'Fragen, die sofort zum Abschluss führen', correct: false }
      ],
      explanation: 'Funnel-Fragen folgen einer Trichter-Struktur: Du beginnst mit breiten, offenen Fragen und verengst dann schrittweise zu spezifischen Details. Diese Technik hilft, ein vollständiges Bild zu bekommen, ohne den Kunden zu überfordern. Sie bauen Vertrauen auf, weil der Kunde das Gefühl hat, verstanden zu werden.'
    },
    {
      id: 11,
      question: 'Wie beginnt man typischerweise eine Funnel-Fragen-Sequenz?',
      options: [
        { id: 1, text: 'Mit einer Preisfrage', correct: false },
        { id: 2, text: 'Mit einer geschlossenen Entscheidungsfrage', correct: false },
        { id: 3, text: 'Mit einer offenen, allgemeinen Frage', correct: true },
        { id: 4, text: 'Mit einer Bedarfsbestätigung', correct: false }
      ],
      explanation: 'Eine Funnel-Sequenz beginnt immer breit: "Wie läuft Ihr aktueller Prozess?" oder "Was beschäftigt Sie derzeit am meisten?". Diese offenen Fragen geben dem Kunden Raum, seine Situation zu schildern. Erst dann verengst du zu spezifischen Details. Ein direkter Start mit Preisfragen wirkt zu aggressiv.'
    },
    {
      id: 12,
      question: 'Warum sind Funnel-Fragen wirkungsvoll im Verkaufsgespräch?',
      options: [
        { id: 1, text: 'Sie verkürzen das Gespräch stark', correct: false },
        { id: 2, text: 'Sie ersetzen die Bedarfsanalyse', correct: false },
        { id: 3, text: 'Sie sollen den Kunden verwirren', correct: false },
        { id: 4, text: 'Sie helfen, Bedürfnisse zu konkretisieren und Vertrauen aufzubauen', correct: true }
      ],
      explanation: 'Funnel-Fragen sind wirkungsvoll, weil sie den Kunden aktiv einbeziehen. Er fühlt sich gehört und verstanden, was Vertrauen schafft. Gleichzeitig sammelst du systematisch alle relevanten Informationen. Der Kunde führt sich selbst zur Erkenntnis, dass er eine Lösung braucht – das ist viel stärker, als wenn du es ihm sagst.'
    }
  ]

  // Alle 12 Fragen für Verkaufspsychologie
  const salesPsychologyQuestions = [
    {
      id: 1,
      question: 'Wofür steht die Abkürzung DISC im Persönlichkeitsmodell?',
      options: [
        { id: 1, text: 'Dominance, Influence, Steadiness, Conscientiousness', correct: true },
        { id: 2, text: 'Decision, Integrity, Sales, Communication', correct: false },
        { id: 3, text: 'Drive, Innovation, Strength, Confidence', correct: false },
        { id: 4, text: 'Direction, Inspiration, Support, Cooperation', correct: false }
      ],
      explanation: 'DISC ist ein bewährtes Persönlichkeitsmodell, das vier Verhaltenstypen beschreibt: D (dominant, ergebnisorientiert), I (influencing, kommunikativ), S (steadiness, beständig, teamorientiert) und C (conscientious, gewissenhaft, detailorientiert). Wenn du den Typ deines Kunden erkennst, kannst du deine Kommunikation anpassen und bessere Ergebnisse erzielen.'
    },
    {
      id: 2,
      question: 'Wie sprichst du am besten einen „Dominanten" (D-Typ) Kunden an?',
      options: [
        { id: 1, text: 'Mit vielen technischen Details', correct: false },
        { id: 2, text: 'Direkt, ergebnisorientiert und mit Fokus auf Erfolge', correct: true },
        { id: 3, text: 'Mit langen, emotionalen Geschichten', correct: false },
        { id: 4, text: 'Indem du ihn möglichst oft unterbrichst', correct: false }
      ],
      explanation: 'D-Typen sind ergebnisorientiert, direkt und haben wenig Zeit. Sie wollen schnell zum Punkt kommen. Präsentiere die wichtigsten Vorteile, zeige konkrete Ergebnisse und vermeide Smalltalk. Technische Details und emotionale Geschichten langweilen sie. Respektiere ihre Zeit und zeige, wie deine Lösung ihnen hilft, ihre Ziele schneller zu erreichen.'
    },
    {
      id: 3,
      question: 'Wie sollte man mit einem „Gewissenhaften" (C-Typ) Kunden umgehen?',
      options: [
        { id: 1, text: 'Mit spontanen Ideen und Humor', correct: false },
        { id: 2, text: 'Mit emotionalen Storys', correct: false },
        { id: 3, text: 'Mit genauen Fakten, Daten und logischen Argumenten', correct: true },
        { id: 4, text: 'Mit Zeitdruck', correct: false }
      ],
      explanation: 'C-Typen sind analytisch, detailorientiert und brauchen Fakten. Sie treffen Entscheidungen basierend auf Daten, nicht auf Emotionen. Bereite dich gründlich vor, liefere präzise Informationen, zeige Vergleichstabellen und Studien. Spontanität und Druck wirken kontraproduktiv. Gib ihnen Zeit, die Informationen zu prüfen.'
    },
    {
      id: 4,
      question: 'Was bedeutet das Prinzip der Reziprozität im Verkauf?',
      options: [
        { id: 1, text: 'Verkäufer und Kunden verhandeln immer auf Augenhöhe', correct: false },
        { id: 2, text: 'Jeder Kunde sollte gleich behandelt werden', correct: false },
        { id: 3, text: 'Verkäufe beruhen nur auf Preis und Leistung', correct: false },
        { id: 4, text: 'Menschen fühlen sich verpflichtet, eine Gefälligkeit zu erwidern', correct: true }
      ],
      explanation: 'Reziprozität ist ein fundamentales psychologisches Prinzip: Wenn du jemandem etwas gibst, fühlt sich diese Person verpflichtet, etwas zurückzugeben. Im Verkauf bedeutet das: Wenn du dem Kunden echten Mehrwert bietest (z.B. kostenlose Beratung, hilfreiche Tipps), steigt die Wahrscheinlichkeit, dass er bei dir kauft. Wichtig: Es muss authentisch sein, nicht manipulierend.'
    },
    {
      id: 5,
      question: 'Wie kannst du das Reziprozitätsprinzip im Vertrieb nutzen?',
      options: [
        { id: 1, text: 'Indem du dem Kunden vorab einen kleinen Mehrwert bietest', correct: true },
        { id: 2, text: 'Indem du Druck aufbaust', correct: false },
        { id: 3, text: 'Indem du Rabatt als Gefälligkeit verkaufst', correct: false },
        { id: 4, text: 'Indem du auf Geschenke verzichtest', correct: false }
      ],
      explanation: 'Biete dem Kunden echten Mehrwert, bevor du verkaufst: kostenlose Analyse, hilfreiche Tipps, relevante Ressourcen oder eine unverbindliche Beratung. Der Schlüssel ist Authentizität – der Mehrwert muss echt sein. Druck und manipulatives Verhalten zerstören Vertrauen. Wenn der Kunde spürt, dass du ihm wirklich helfen willst, wird er eher bereit sein, mit dir zusammenzuarbeiten.'
    },
    {
      id: 6,
      question: 'Welches Beispiel zeigt Reziprozität in Aktion?',
      options: [
        { id: 1, text: 'Du wartest, bis der Kunde von selbst kauft', correct: false },
        { id: 2, text: 'Du gibst dem Kunden kostenlose Tipps, bevor du ein Angebot machst', correct: true },
        { id: 3, text: 'Du sagst dem Kunden, dass du keine Zeit hast', correct: false },
        { id: 4, text: 'Du machst kein Follow-up', correct: false }
      ],
      explanation: 'Reziprozität funktioniert, wenn du dem Kunden etwas Wertvolles gibst, ohne sofort etwas zu erwarten. Kostenlose Tipps, eine Analyse oder hilfreiche Ressourcen zeigen, dass du es ernst meinst. Der Kunde fühlt sich dann verpflichtet, dein Angebot ernsthaft zu prüfen. Wichtig: Es muss ehrlich gemeint sein, nicht als Taktik.'
    },
    {
      id: 7,
      question: 'Was bewirkt das Prinzip der Knappheit im Verkauf?',
      options: [
        { id: 1, text: 'Kunden fühlen sich unter Druck gesetzt und brechen ab', correct: false },
        { id: 2, text: 'Der Verkäufer wirkt großzügig', correct: false },
        { id: 3, text: 'Produkte erscheinen wertvoller, wenn sie begrenzt verfügbar sind', correct: true },
        { id: 4, text: 'Der Preis sinkt automatisch', correct: false }
      ],
      explanation: 'Knappheit erhöht die wahrgenommene Wertigkeit. Wenn etwas selten oder begrenzt verfügbar ist, wird es attraktiver. Das ist evolutionär bedingt – seltene Ressourcen waren immer wertvoll. Im Verkauf kann echte Knappheit (begrenzte Stückzahl, zeitlich begrenztes Angebot) die Kaufentscheidung beschleunigen. Wichtig: Es muss authentisch sein.'
    },
    {
      id: 8,
      question: 'Wie kannst du Knappheit authentisch einsetzen?',
      options: [
        { id: 1, text: 'Indem du künstlich Druck aufbaust', correct: false },
        { id: 2, text: 'Indem du eine falsche Verknappung vorgibst', correct: false },
        { id: 3, text: 'Indem du Kunden täuschst', correct: false },
        { id: 4, text: 'Wenn es wirklich nur begrenzte Stückzahlen oder Zeitfenster gibt', correct: true }
      ],
      explanation: 'Knappheit funktioniert nur, wenn sie echt ist. Wenn du lügst ("nur noch 2 Stück", obwohl es 100 gibt), verlierst du sofort das Vertrauen. Echte Knappheit: begrenzte Produktionskapazität, zeitlich begrenzte Aktionen, limitierte Editionen. Authentische Knappheit schafft Dringlichkeit ohne Manipulation. Kunden merken schnell, wenn etwas künstlich erzeugt wird.'
    },
    {
      id: 9,
      question: 'Was ist ein Risiko beim falschen Einsatz von Knappheit?',
      options: [
        { id: 1, text: 'Der Kunde verliert Vertrauen', correct: true },
        { id: 2, text: 'Der Kunde kauft schneller', correct: false },
        { id: 3, text: 'Der Verkäufer wirkt sympathischer', correct: false },
        { id: 4, text: 'Der Umsatz steigt dauerhaft', correct: false }
      ],
      explanation: 'Falsche oder übertriebene Knappheit zerstört Vertrauen. Wenn der Kunde merkt, dass du lügst oder manipulierst, ist das Geschäft verloren – und möglicherweise auch zukünftige Geschäfte. Vertrauen ist schwer aufzubauen, aber leicht zu zerstören. Verwende Knappheit nur, wenn sie echt ist, sonst schadest du deiner Reputation langfristig.'
    },
    {
      id: 10,
      question: 'Was bedeutet „Sozialer Beweis" im Verkauf?',
      options: [
        { id: 1, text: 'Verkäufer müssen immer selbstbewusst wirken', correct: false },
        { id: 2, text: 'Menschen orientieren sich am Verhalten anderer, um Entscheidungen zu treffen', correct: true },
        { id: 3, text: 'Kunden vertrauen nur persönlichen Empfehlungen', correct: false },
        { id: 4, text: 'Es geht um rechtliche Nachweise', correct: false }
      ],
      explanation: 'Sozialer Beweis (Social Proof) ist ein psychologisches Prinzip: Menschen schauen, was andere tun, um ihre eigenen Entscheidungen zu treffen. Wenn viele andere etwas kaufen oder nutzen, wirkt es vertrauenswürdiger. Das reduziert das wahrgenommene Risiko. "Wenn 1000 andere Unternehmen das nutzen, kann es nicht schlecht sein" – dieser Gedanke beeinflusst Kaufentscheidungen stark.'
    },
    {
      id: 11,
      question: 'Wie kannst du Social Proof im Verkaufsgespräch nutzen?',
      options: [
        { id: 1, text: 'Durch Rabatte', correct: false },
        { id: 2, text: 'Durch technische Details', correct: false },
        { id: 3, text: 'Durch Kundenreferenzen, Bewertungen oder Erfolgsgeschichten', correct: true },
        { id: 4, text: 'Durch Zeitdruck', correct: false }
      ],
      explanation: 'Social Proof funktioniert durch konkrete Beispiele: "Mehr als 500 Unternehmen nutzen unsere Lösung", Kundenreferenzen, Case Studies, Bewertungen, Testimonials. Je spezifischer und relevanter für den Kunden, desto besser. Ein Kunde aus derselben Branche ist überzeugender als eine generische Statistik. Zeige, dass andere ähnliche Kunden erfolgreich sind.'
    },
    {
      id: 12,
      question: 'Welches Beispiel zeigt sozialen Beweis?',
      options: [
        { id: 1, text: '„Ich denke, das Produkt ist gut."', correct: false },
        { id: 2, text: '„Heute ist schönes Wetter."', correct: false },
        { id: 3, text: '„Wir haben noch zwei Stück auf Lager."', correct: false },
        { id: 4, text: '„Mehr als 1.000 Unternehmen nutzen bereits unsere Lösung."', correct: true }
      ],
      explanation: 'Sozialer Beweis funktioniert durch konkrete Zahlen und Beispiele. "Mehr als 1.000 Unternehmen nutzen unsere Lösung" zeigt, dass viele andere bereits vertraut haben. Das reduziert das Risiko in der Wahrnehmung des Kunden. Persönliche Meinungen ("Ich denke...") sind weniger überzeugend als objektive Zahlen. Je spezifischer und relevanter, desto stärker der Effekt.'
    }
  ]

  // Alle 12 Fragen für Verkaufssprache
  const salesLanguageQuestions = [
    {
      id: 1,
      question: 'Welche Aussage klingt professioneller und kundenorientierter?',
      options: [
        { id: 1, text: '„Das müsste eigentlich funktionieren."', correct: false },
        { id: 2, text: '„Ich zeige Ihnen gern, wie das für Sie funktioniert."', correct: true },
        { id: 3, text: '„Ich bin mir da nicht ganz sicher."', correct: false },
        { id: 4, text: '„Mal sehen, ob das klappt."', correct: false }
      ],
      explanation: 'Professionelle Verkaufssprache ist aktiv, kundenorientiert und vermittelt Sicherheit. "Ich zeige Ihnen gern, wie das für Sie funktioniert" ist konkret, persönlich und zeigt Kompetenz. Unsichere Formulierungen wie "müsste", "vielleicht" oder "mal sehen" wirken unprofessionell und schaffen Zweifel beim Kunden.'
    },
    {
      id: 2,
      question: 'Welches Wort gilt als typischer Verkaufskiller und sollte vermieden werden?',
      options: [
        { id: 1, text: '„eigentlich"', correct: true },
        { id: 2, text: '„gerne"', correct: false },
        { id: 3, text: '„selbstverständlich"', correct: false },
        { id: 4, text: '„natürlich"', correct: false }
      ],
      explanation: '"Eigentlich" ist ein Verkaufskiller, weil es Unsicherheit und Zweifel vermittelt. Es impliziert, dass etwas nicht ganz stimmt oder nur unter bestimmten Bedingungen funktioniert. Stattdessen nutze klare, positive Formulierungen wie "selbstverständlich", "natürlich" oder "gerne" – diese vermitteln Sicherheit und Kompetenz.'
    },
    {
      id: 3,
      question: 'Welche Formulierung vermittelt Sicherheit und Kompetenz?',
      options: [
        { id: 1, text: '„Ich hoffe, das funktioniert."', correct: false },
        { id: 2, text: '„Vielleicht klappt das auch bei Ihnen."', correct: false },
        { id: 3, text: '„Ich kann Ihnen genau zeigen, wie das funktioniert."', correct: true },
        { id: 4, text: '„Ich bin mir nicht sicher, aber…"', correct: false }
      ],
      explanation: 'Sicherheit und Kompetenz werden durch klare, präzise Aussagen vermittelt. "Ich kann Ihnen genau zeigen" ist aktiv, konkret und zeigt Expertise. Formulierungen mit "hoffe", "vielleicht" oder "nicht sicher" wirken unsicher und schaffen Zweifel. Der Kunde braucht einen Experten, der weiß, was er tut.'
    },
    {
      id: 4,
      question: 'Ein Kunde bringt einen kritischen Punkt, der nicht relevant für den Verkaufsprozess ist. Was tust du?',
      options: [
        { id: 1, text: 'Du diskutierst das Thema ausführlich', correct: false },
        { id: 2, text: 'Du ignorierst den Einwand komplett', correct: false },
        { id: 3, text: 'Du wechselt das Thema abrupt', correct: false },
        { id: 4, text: 'Du lenkst geschickt zurück zum Nutzen für den Kunden', correct: true }
      ],
      explanation: 'Geschickte Themensteuerung bedeutet, den Kunden zu respektieren, aber den Fokus auf relevante Punkte zu lenken. Ignorieren wirkt respektlos, abruptes Wechseln wirkt manipulativ. Die beste Methode: Den Punkt kurz würdigen ("Das ist interessant"), dann geschickt zum Nutzen zurücklenken. So fühlt sich der Kunde gehört, aber du behältst die Kontrolle.'
    },
    {
      id: 5,
      question: 'Welche Antwort zeigt eine geschickte Themensteuerung?',
      options: [
        { id: 1, text: '„Das ist ein spannender Punkt. Darf ich Ihnen kurz zeigen, warum unsere Lösung hier besonders interessant ist?"', correct: true },
        { id: 2, text: '„Das spielt keine Rolle."', correct: false },
        { id: 3, text: '„Das weiß ich auch nicht."', correct: false },
        { id: 4, text: '„Darüber reden wir später vielleicht."', correct: false }
      ],
      explanation: 'Geschickte Themensteuerung verbindet Anerkennung mit Fokussierung. Du zeigst, dass du den Kunden gehört hast ("spannender Punkt"), und lenkst dann natürlich zur relevanten Lösung. Das wirkt respektvoll, nicht manipulativ. Abrupte Ablehnung oder Unsicherheit wirken unprofessionell.'
    },
    {
      id: 6,
      question: 'Warum ist Themenablenkung im Verkaufsgespräch wichtig?',
      options: [
        { id: 1, text: 'Um schwierige Fragen zu vermeiden', correct: false },
        { id: 2, text: 'Um den Fokus auf entscheidungsrelevante Themen zu halten', correct: true },
        { id: 3, text: 'Um Zeit zu gewinnen', correct: false },
        { id: 4, text: 'Um den Kunden zu überreden', correct: false }
      ],
      explanation: 'Themensteuerung ist wichtig, um das Gespräch produktiv zu halten. Nicht jedes Thema ist relevant für die Kaufentscheidung. Wenn du jeden Einwand ausführlich diskutierst, verlierst du Zeit und Fokus. Geschickte Steuerung hilft, die wichtigen Punkte zu behandeln, ohne den Kunden zu übergehen oder zu manipulieren.'
    },
    {
      id: 7,
      question: 'Was bedeutet „Wert-Kommunikation" im Verkauf?',
      options: [
        { id: 1, text: 'Nur über den Preis sprechen', correct: false },
        { id: 2, text: 'Möglichst viel Fachsprache verwenden', correct: false },
        { id: 3, text: 'Den Fokus auf Nutzen und Mehrwert statt auf den Preis legen', correct: true },
        { id: 4, text: 'Den Kunden mit Emotionen überreden', correct: false }
      ],
      explanation: 'Wert-Kommunikation bedeutet, den Fokus auf den Nutzen und Mehrwert zu legen, nicht auf den Preis. Der Kunde kauft nicht den Preis, sondern die Lösung für sein Problem. Wenn du den Wert klar kommunizierst, wird der Preis sekundär. Fachsprache kann abschrecken, reine Emotionen ohne Substanz wirken manipulativ.'
    },
    {
      id: 8,
      question: 'Welche Formulierung kommuniziert Wert statt Preis?',
      options: [
        { id: 1, text: '„Wir sind 10 % günstiger als andere."', correct: false },
        { id: 2, text: '„Wir haben gerade ein Sonderangebot."', correct: false },
        { id: 3, text: '„Der Preis ist verhandelbar."', correct: false },
        { id: 4, text: '„Unsere Lösung spart Ihnen pro Monat rund 10 Stunden Zeit."', correct: true }
      ],
      explanation: 'Wert-Kommunikation zeigt konkreten Nutzen: Zeitersparnis, Effizienzsteigerung, ROI. "10 Stunden Zeit sparen" ist greifbar und wertvoll. Preisvergleiche und Rabatte lenken den Fokus auf Kosten statt Nutzen. Der Kunde soll verstehen, was er gewinnt, nicht was er spart.'
    },
    {
      id: 9,
      question: 'Wie kannst du den Wert emotional greifbar machen?',
      options: [
        { id: 1, text: 'Durch konkrete Beispiele und Kundenergebnisse', correct: true },
        { id: 2, text: 'Durch Zahlen ohne Zusammenhang', correct: false },
        { id: 3, text: 'Durch technische Details', correct: false },
        { id: 4, text: 'Durch abstrakte Fachbegriffe', correct: false }
      ],
      explanation: 'Wert wird greifbar durch konkrete, relevante Beispiele. "Kunde X hat mit unserer Lösung 30 % mehr Umsatz gemacht" ist viel stärker als abstrakte Zahlen. Storys und Case Studies machen den Wert erlebbar. Technische Details und Fachbegriffe bleiben abstrakt und erreichen den Kunden nicht emotional.'
    },
    {
      id: 10,
      question: 'Welche Formulierung ist abschlussorientiert, ohne Druck aufzubauen?',
      options: [
        { id: 1, text: '„Wollen Sie jetzt kaufen oder nicht?"', correct: false },
        { id: 2, text: '„Wie klingt das für Sie – möchten wir den nächsten Schritt gemeinsam gehen?"', correct: true },
        { id: 3, text: '„Ich weiß nicht, ob das für Sie passt."', correct: false },
        { id: 4, text: '„Sie können ja noch ein bisschen überlegen."', correct: false }
      ],
      explanation: 'Ein guter Abschluss ist partnerschaftlich, nicht fordernd. "Wie klingt das für Sie" respektiert den Kunden, "gemeinsam gehen" zeigt Partnerschaft. Aggressive Fragen ("wollen Sie oder nicht") wirken unter Druck setzend. Unsicherheit ("weiß nicht") oder Passivität ("können überlegen") führen nicht zum Abschluss.'
    },
    {
      id: 11,
      question: 'Wann ist der richtige Zeitpunkt für eine Abschlussfrage?',
      options: [
        { id: 1, text: 'Direkt zu Beginn', correct: false },
        { id: 2, text: 'Wenn der Kunde noch unsicher ist', correct: false },
        { id: 3, text: 'Wenn der Kunde den Nutzen klar erkannt hat', correct: true },
        { id: 4, text: 'Wenn der Kunde über den Preis spricht', correct: false }
      ],
      explanation: 'Der richtige Zeitpunkt für den Abschluss ist, wenn der Kunde den Nutzen verstanden hat und positive Signale zeigt. Zu früh (direkt zu Beginn) wirkt aggressiv. Bei Unsicherheit musst du erst Bedenken klären. Wenn der Kunde nur über Preis spricht, hat er den Wert noch nicht erkannt – dann ist es zu früh für den Abschluss.'
    },
    {
      id: 12,
      question: 'Welche Abschlussfrage wirkt natürlich und verbindlich?',
      options: [
        { id: 1, text: '„Sind Sie sicher, dass Sie das wollen?"', correct: false },
        { id: 2, text: '„Muss ich Ihnen noch etwas beweisen?"', correct: false },
        { id: 3, text: '„Sie können sich ja melden, wenn Sie wollen."', correct: false },
        { id: 4, text: '„Wann möchten Sie starten – eher diese oder nächste Woche?"', correct: true }
      ],
      explanation: 'Eine gute Abschlussfrage ist eine Alternativfrage, die den Kunden zur Entscheidung führt, ohne Druck aufzubauen. "Wann möchten Sie starten – diese oder nächste Woche?" setzt voraus, dass er starten will, und gibt ihm die Wahl zwischen zwei Optionen. Das ist natürlicher als Ja/Nein-Fragen und führt zu klaren Entscheidungen.'
    }
  ]

  const handleAnswerClick = (option) => {
    setSelectedAnswer(option.id)
    setShowNextButton(true)
  }

  const handleNextQuestion = () => {
    let currentQuestions
    if (activeModule === 'objection-handling') {
      currentQuestions = objectionQuestions
    } else if (activeModule === 'question-techniques') {
      currentQuestions = questionTechniquesQuestions
    } else if (activeModule === 'sales-psychology') {
      currentQuestions = salesPsychologyQuestions
    } else if (activeModule === 'sales-language') {
      currentQuestions = salesLanguageQuestions
    }
    const question = currentQuestions[currentQuestionIndex]
    const correctOption = question?.options?.find(opt => opt.correct)
    const correct = correctOption && selectedAnswer !== null && correctOption.id === selectedAnswer

    if (user && activeModule && selectedAnswer !== null) {
      apiFetch('/api/insights/answer', {
        method: 'POST',
        body: JSON.stringify({ moduleId: activeModule, questionId: question?.id, correct })
      }).catch(() => {})
    }
    
    if (currentQuestionIndex < currentQuestions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1)
      setSelectedAnswer(null)
      setShowNextButton(false)
    } else {
      if (user && activeModule) {
        apiFetch('/api/training-complete', {
          method: 'POST',
          body: JSON.stringify({ moduleId: activeModule })
        }).catch(() => {})
      }
      setActiveModule(null)
      setCurrentQuestionIndex(0)
      setSelectedAnswer(null)
      setShowNextButton(false)
    }
  }

  const handleBackToModules = () => {
    setActiveModule(null)
    setCurrentQuestionIndex(0)
    setSelectedAnswer(null)
    setShowNextButton(false)
  }

  if (activeModule === 'objection-handling' || activeModule === 'question-techniques' || activeModule === 'sales-psychology' || activeModule === 'sales-language') {
    let currentQuestions
    let moduleTitle
    if (activeModule === 'objection-handling') {
      currentQuestions = objectionQuestions
      moduleTitle = 'Einwandbehandlung'
    } else if (activeModule === 'question-techniques') {
      currentQuestions = questionTechniquesQuestions
      moduleTitle = 'Fragetechniken'
    } else if (activeModule === 'sales-psychology') {
      currentQuestions = salesPsychologyQuestions
      moduleTitle = 'Verkaufspsychologie'
    } else if (activeModule === 'sales-language') {
      currentQuestions = salesLanguageQuestions
      moduleTitle = 'Verkaufssprache'
    }
    
    const question = currentQuestions[currentQuestionIndex]
    const correctOption = question.options.find(opt => opt.correct)
    const isLastQuestion = currentQuestionIndex === currentQuestions.length - 1
    
    return (
      <div className="training-container">
        <div className="section-header">
          <button className="btn-back" onClick={handleBackToModules}>← Zurück zu Trainings</button>
          <h2>{moduleTitle}</h2>
          <p>Frage {currentQuestionIndex + 1} von {currentQuestions.length}</p>
        </div>

        <div className="question-container">
          <div className="question-card">
            <h3>Frage {question.id}:</h3>
            <p className="question-text">{question.question}</p>
            
            <div className="options-list">
              {question.options.map(option => {
                const isSelected = selectedAnswer === option.id
                const isCorrect = option.correct
                const showResult = selectedAnswer !== null
                
                return (
                  <button
                    key={option.id}
                    className={`option-btn ${isSelected ? 'selected' : ''} ${
                      showResult ? (isCorrect ? 'correct' : isSelected ? 'incorrect' : '') : ''
                    }`}
                    onClick={() => handleAnswerClick(option)}
                    disabled={selectedAnswer !== null}
                  >
                    <span className="option-label">Option {option.id}:</span>
                    <span className="option-text">{option.text}</span>
                    {showResult && isCorrect && <span className="checkmark">✅</span>}
                  </button>
                )
              })}
            </div>

            {selectedAnswer !== null && (
              <>
                <div className={`feedback ${correctOption.id === selectedAnswer ? 'correct-feedback' : 'incorrect-feedback'}`}>
                  {correctOption.id === selectedAnswer ? (
                    <>
                      <p className="feedback-title">✅ Richtig! {correctOption.text}</p>
                      <div className="explanation-box">
                        <p className="explanation-label">Erklärung:</p>
                        <p className="explanation-text">{question.explanation}</p>
                      </div>
                    </>
                  ) : (
                    <>
                      <p className="feedback-title">❌ Falsch. Die richtige Antwort ist: {correctOption.text}</p>
                      <div className="explanation-box">
                        <p className="explanation-label">Erklärung:</p>
                        <p className="explanation-text">{question.explanation}</p>
                      </div>
                    </>
                  )}
                </div>
                {showNextButton && (
                  <div className="next-button-container">
                    <button className="btn primary" onClick={handleNextQuestion}>
                      {isLastQuestion ? 'Training abschließen' : 'Nächste Frage'}
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    )
  }

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
  const { user, setShowAuthModal } = useAuth()
  const [activeMode, setActiveMode] = React.useState(null)
  const [activeTopic, setActiveTopic] = React.useState(null)
  const [insightsData, setInsightsData] = React.useState([])
  const [insightsLoading, setInsightsLoading] = React.useState(false)
  
  // Adaptives Quiz State
  const [quizQuestionIndex, setQuizQuestionIndex] = React.useState(0)
  const [quizAnswer, setQuizAnswer] = React.useState(null)
  const [quizDifficulty, setQuizDifficulty] = React.useState('Mittel')
  const [quizScore, setQuizScore] = React.useState(0)
  const [quizQuestions, setQuizQuestions] = React.useState([])
  const [quizPerformance, setQuizPerformance] = React.useState(50)
  
  // Karteikarten State
  const [flashcardIndex, setFlashcardIndex] = React.useState(0)
  const [flashcardFlipped, setFlashcardFlipped] = React.useState(false)
  const [flashcardRating, setFlashcardRating] = React.useState(null)
  const [flashcardPool, setFlashcardPool] = React.useState([])
  const [flashcardDifficulty, setFlashcardDifficulty] = React.useState(null)
  
  // Rollenspiel State
  const [roleplayScenarioIndex, setRoleplayScenarioIndex] = React.useState(0)
  const [roleplayAnswer, setRoleplayAnswer] = React.useState(null)
  
  // Herausforderung State
  const [challengeActive, setChallengeActive] = React.useState(false)
  const [challengeIndex, setChallengeIndex] = React.useState(0)
  const [challengeTime, setChallengeTime] = React.useState(300) // 5 Minuten
  const [challengeAnswer, setChallengeAnswer] = React.useState('')
  const [challengeTimer, setChallengeTimer] = React.useState(null)
  const [challengeEvaluation, setChallengeEvaluation] = React.useState(null)
  const [evaluatingChallenge, setEvaluatingChallenge] = React.useState(false)
  const showToast = useToast()
  
  // Mikro-Learning State
  const [microStoryIndex, setMicroStoryIndex] = React.useState(0)
  const [microAnswer, setMicroAnswer] = React.useState(null)
  
  // Quiz-Fragen (vereinfacht, aus Training-Daten)
  const adaptiveQuizQuestions = {
    'Einwände': [
      {
        question: 'Wie reagierst du professionell auf den Einwand "Das ist mir zu teuer"?',
        options: [
          { text: '„Teuer im Vergleich zu was genau?"', correct: true },
          { text: '„Dann kommen wir wohl nicht zusammen."', correct: false },
          { text: '„Ich gebe sofort Rabatt."', correct: false }
        ],
        feedback: 'Perfekt! Rückfrage-Fragen zeigen Kompetenz und Interesse.',
        difficulty: 'Mittel'
      },
      {
        question: 'Ein Kunde sagt: "Ich muss erst noch darüber nachdenken." Was ist die beste Reaktion?',
        options: [
          { text: '„Okay, melden Sie sich einfach irgendwann."', correct: false },
          { text: '„Das ist keine gute Idee."', correct: false },
          { text: '„Natürlich! Was genau möchten Sie sich noch überlegen?"', correct: true },
          { text: '„Dann rufe ich Sie in einem Jahr wieder an."', correct: false }
        ],
        feedback: 'Zeit-Einwände sind oft versteckte Bedenken. Durch gezieltes Nachfragen findest du die wahren Gründe heraus.',
        difficulty: 'Mittel'
      },
      {
        question: 'Wie behandelst du einen Vertrauens-Einwand am besten?',
        options: [
          { text: 'Referenzen, Fallbeispiele oder Kundenstimmen zeigen', correct: true },
          { text: 'Das ignorieren und weiter präsentieren', correct: false },
          { text: 'Den Preis senken, um Vertrauen zu schaffen', correct: false },
          { text: 'Den Kunden bitten, selbst im Internet zu recherchieren', correct: false }
        ],
        feedback: 'Vertrauen entsteht durch sozialen Beweis. Referenzen zeigen, dass andere bereits erfolgreich mit dir gearbeitet haben.',
        difficulty: 'Mittel'
      },
      {
        question: 'Ein Kunde sagt: "Ihr Mitbewerber bietet das günstiger an." Wie reagierst du souverän?',
        options: [
          { text: '„Dann kaufen Sie doch dort."', correct: false },
          { text: '„Unsere Konkurrenz ist schlecht."', correct: false },
          { text: '„Das kann sein – was ist Ihnen denn außer dem Preis noch wichtig?"', correct: true },
          { text: '„Ich mache denselben Preis."', correct: false }
        ],
        feedback: 'Lenke das Gespräch auf die Kriterien, die wirklich wichtig sind: Qualität, Service, Support, Zuverlässigkeit.',
        difficulty: 'Schwer'
      },
      {
        question: 'Was ist der beste Umgang mit einem Konkurrenz-Einwand?',
        options: [
          { text: 'Verständnis zeigen und den Mehrwert deiner Lösung betonen', correct: true },
          { text: 'Den Konkurrenten kritisieren', correct: false },
          { text: 'Den Kunden überreden', correct: false },
          { text: 'Den Einwand ignorieren', correct: false }
        ],
        feedback: 'Zeige Verständnis und fokussiere dich auf deine Stärken und den einzigartigen Mehrwert deiner Lösung.',
        difficulty: 'Mittel'
      },
      {
        question: 'Wie kannst du einen Preis-Einwand positiv umwandeln?',
        options: [
          { text: 'Den Preis sofort senken', correct: false },
          { text: 'Den Fokus auf den Mehrwert und den Nutzen legen', correct: true },
          { text: 'Dem Kunden zustimmen, dass es teuer ist', correct: false },
          { text: 'Über die Konkurrenz schlecht reden', correct: false }
        ],
        feedback: 'Preis ist nur ein Faktor – der Wert ist entscheidend. Indem du den Fokus auf den Mehrwert legst, hilfst du dem Kunden, die Investition zu rechtfertigen.',
        difficulty: 'Mittel'
      },
      {
        question: 'Wie erkennst du, ob ein "Zeit-Einwand" echt ist?',
        options: [
          { text: 'Indem du sofort einen Rabatt anbietest', correct: false },
          { text: 'Du wartest einfach ab', correct: false },
          { text: 'Durch gezieltes Nachfragen, z. B. "Geht es um den Preis oder um etwas anderes?"', correct: true },
          { text: 'Du gehst davon aus, dass der Kunde nicht interessiert ist', correct: false }
        ],
        feedback: 'Die meisten "Zeit-Einwände" sind Scheinargumente. Durch gezieltes Nachfragen deckst du die wahren Bedenken auf.',
        difficulty: 'Mittel'
      },
      {
        question: 'Wie kannst du Vertrauen aufbauen, bevor Einwände entstehen?',
        options: [
          { text: 'Durch viele Fachbegriffe', correct: false },
          { text: 'Durch aggressives Verkaufen', correct: false },
          { text: 'Durch authentisches Auftreten und ehrliche Kommunikation', correct: true },
          { text: 'Durch Zeitdruck', correct: false }
        ],
        feedback: 'Vertrauen ist die Basis jedes Verkaufs. Authentizität und Ehrlichkeit schaffen eine Verbindung zum Kunden.',
        difficulty: 'Einfach'
      },
      {
        question: 'Was ist die beste Strategie bei einem wiederholten Preis-Einwand?',
        options: [
          { text: 'Den Preis immer weiter senken', correct: false },
          { text: 'Den Kunden unter Druck setzen', correct: false },
          { text: 'Den ROI und langfristigen Nutzen konkret berechnen und zeigen', correct: true },
          { text: 'Das Gespräch abbrechen', correct: false }
        ],
        feedback: 'Wenn der Preis-Einwand wiederholt kommt, hat der Kunde den Wert noch nicht verstanden. Zeige konkrete Zahlen und ROI-Berechnungen.',
        difficulty: 'Schwer'
      },
      {
        question: 'Ein Kunde sagt: "Ich kenne Ihre Firma nicht." Was tust du am besten?',
        options: [
          { text: 'Das ignorieren und weiter präsentieren', correct: false },
          { text: 'Referenzen, Fallbeispiele oder Kundenstimmen zeigen', correct: true },
          { text: 'Den Kunden bitten, selbst im Internet zu recherchieren', correct: false },
          { text: 'Den Preis senken, um Vertrauen zu schaffen', correct: false }
        ],
        feedback: 'Vertrauen entsteht durch sozialen Beweis. Referenzen zeigen dem Kunden, dass andere bereits erfolgreich mit dir gearbeitet haben.',
        difficulty: 'Einfach'
      },
      {
        question: 'Ein Kunde sagt: "Ich habe schon ein ähnliches Produkt." Wie reagierst du?',
        options: [
          { text: '„Was funktioniert bei Ihrer aktuellen Lösung gut und was nicht?"', correct: true },
          { text: '„Dann brauchen Sie uns nicht."', correct: false },
          { text: '„Ihre Lösung ist veraltet."', correct: false },
          { text: '„Dann können wir nichts für Sie tun."', correct: false }
        ],
        feedback: 'Finde heraus, was fehlt oder nicht optimal funktioniert. Jede Lösung hat Verbesserungspotenzial.',
        difficulty: 'Mittel'
      },
      {
        question: 'Wie behandelst du einen Einwand, der während der Präsentation kommt?',
        options: [
          { text: 'Den Einwand ignorieren und später darauf eingehen', correct: false },
          { text: 'Die Präsentation abbrechen', correct: false },
          { text: 'Den Einwand sofort beantworten und dann weitermachen', correct: true },
          { text: 'Den Kunden bitten, alle Fragen am Ende zu stellen', correct: false }
        ],
        feedback: 'Einwände während der Präsentation zeigen Engagement. Beantworte sie sofort, um Vertrauen zu zeigen.',
        difficulty: 'Mittel'
      },
      {
        question: 'Was ist die beste Reaktion auf "Ich muss das erst mit meinem Chef besprechen"?',
        options: [
          { text: '„Verstehe. Was genau möchte Ihr Chef wissen? Kann ich dabei sein?"', correct: true },
          { text: '„Okay, melden Sie sich dann."', correct: false },
          { text: '„Dann ist das Gespräch beendet."', correct: false },
          { text: '„Ihr Chef wird schon zustimmen."', correct: false }
        ],
        feedback: 'Aktiviere dich im Entscheidungsprozess. Biete an, beim Gespräch mit dem Chef dabei zu sein.',
        difficulty: 'Schwer'
      },
      {
        question: 'Ein Kunde sagt: "Das ist zu kompliziert für uns." Wie gehst du vor?',
        options: [
          { text: '„Dann sind Sie nicht qualifiziert."', correct: false },
          { text: '„Das ist einfach."', correct: false },
          { text: '„Was genau erscheint Ihnen kompliziert? Lassen Sie uns das Schritt für Schritt durchgehen."', correct: true },
          { text: '„Dann passt es nicht."', correct: false }
        ],
        feedback: 'Komplexität ist oft ein Einwand gegen Veränderung. Zerlege die Lösung in verständliche Schritte.',
        difficulty: 'Mittel'
      },
      {
        question: 'Wie reagierst du auf "Ich brauche das nicht"?',
        options: [
          { text: '„Doch, Sie brauchen es."', correct: false },
          { text: '„Dann ist das Gespräch beendet."', correct: false },
          { text: '„Verstehe. Was würde passieren, wenn Sie das Problem nicht lösen?"', correct: true },
          { text: '„Sie wissen nicht, was gut für Sie ist."', correct: false }
        ],
        feedback: 'Der Kunde sieht den Bedarf noch nicht. Zeige die Konsequenzen des Nicht-Handelns.',
        difficulty: 'Schwer'
      },
      {
        question: 'Ein Kunde sagt: "Ihr Produkt hat zu viele Funktionen, die ich nicht brauche." Was tust du?',
        options: [
          { text: '„Dann kaufen Sie es nicht."', correct: false },
          { text: '„Sie müssen alles nehmen."', correct: false },
          { text: '„Welche Funktionen sind für Sie am wichtigsten? Wir können auch eine schlankere Version anbieten."', correct: true },
          { text: '„Das ist unser Standard."', correct: false }
        ],
        feedback: 'Flexibilität zeigt Service-Orientierung. Finde heraus, was wirklich gebraucht wird.',
        difficulty: 'Mittel'
      },
      {
        question: 'Wie behandelst du einen Einwand, der auf einem Missverständnis basiert?',
        options: [
          { text: 'Den Kunden korrigieren und weiter machen', correct: false },
          { text: 'Den Einwand ignorieren', correct: false },
          { text: 'Verständnis zeigen, dann die korrekte Information liefern', correct: true },
          { text: 'Den Kunden kritisieren', correct: false }
        ],
        feedback: 'Missverständnisse sind Chancen. Zeige Verständnis, dann kläre auf, ohne den Kunden zu beschämen.',
        difficulty: 'Mittel'
      },
      {
        question: 'Ein Kunde sagt: "Ich habe schlechte Erfahrungen mit ähnlichen Anbietern gemacht." Wie reagierst du?',
        options: [
          { text: '„Wir sind anders."', correct: false },
          { text: '„Das war nicht unsere Schuld."', correct: false },
          { text: '„Das tut mir leid. Was genau ist damals schiefgelaufen? So kann ich sicherstellen, dass wir das anders machen."', correct: true },
          { text: '„Dann kaufen Sie es nicht."', correct: false }
        ],
        feedback: 'Negative Erfahrungen sind Bedenken. Zeige Empathie und lerne daraus, um Vertrauen aufzubauen.',
        difficulty: 'Schwer'
      },
      {
        question: 'Was ist die beste Strategie bei einem wiederholten Einwand?',
        options: [
          { text: 'Den Einwand nochmal genauso beantworten', correct: false },
          { text: 'Aufgeben', correct: false },
          { text: 'Eine andere Perspektive wählen oder den ROI konkret berechnen', correct: true },
          { text: 'Den Preis senken', correct: false }
        ],
        feedback: 'Wenn ein Einwand wiederholt kommt, hat der Kunde den Wert noch nicht verstanden. Ändere deine Kommunikationsstrategie.',
        difficulty: 'Schwer'
      },
      {
        question: 'Ein Kunde sagt: "Das ist zu riskant für uns." Wie gehst du vor?',
        options: [
          { text: '„Es ist nicht riskant."', correct: false },
          { text: '„Dann machen Sie es nicht."', correct: false },
          { text: '„Was genau macht Ihnen Sorgen? Lassen Sie uns das Risiko minimieren, z. B. durch eine Testphase."', correct: true },
          { text: '„Risiko gehört dazu."', correct: false }
        ],
        feedback: 'Risiko ist ein häufiger Einwand. Zeige konkrete Maßnahmen zur Risikominimierung.',
        difficulty: 'Mittel'
      },
      {
        question: 'Wie reagierst du auf "Ich habe kein Budget"?',
        options: [
          { text: '„Dann können wir nichts machen."', correct: false },
          { text: '„Dann müssen Sie es finden."', correct: false },
          { text: '„Verstehe. Wann wäre ein Budget verfügbar? Oder gibt es andere Finanzierungsmöglichkeiten?"', correct: true },
          { text: '„Das ist nicht mein Problem."', correct: false }
        ],
        feedback: 'Budget-Einwände sind oft Zeit-Einwände in Verkleidung. Finde heraus, ob es wirklich ums Budget geht.',
        difficulty: 'Mittel'
      },
      {
        question: 'Ein Kunde sagt: "Ihr Service ist nicht gut genug." Wie behandelst du das?',
        options: [
          { text: '„Doch, unser Service ist gut."', correct: false },
          { text: '„Dann kaufen Sie es nicht."', correct: false },
          { text: '„Was genau erwarten Sie vom Service? Lassen Sie mich zeigen, wie wir das umsetzen."', correct: true },
          { text: '„Das stimmt nicht."', correct: false }
        ],
        feedback: 'Service-Bedenken sind konkret. Finde heraus, was genau erwartet wird, und zeige, wie du das erfüllst.',
        difficulty: 'Mittel'
      },
      {
        question: 'Was ist die beste Reaktion auf "Ich brauche mehr Zeit zum Nachdenken"?',
        options: [
          { text: '„Okay, ich rufe in einem Jahr an."', correct: false },
          { text: '„Sie haben genug Zeit gehabt."', correct: false },
          { text: '„Natürlich. Was genau möchten Sie bedenken? Vielleicht kann ich dabei helfen."', correct: true },
          { text: '„Dann ist das Gespräch beendet."', correct: false }
        ],
        feedback: 'Zeit-Einwände sind oft versteckte Bedenken. Finde heraus, was wirklich bedacht werden muss.',
        difficulty: 'Mittel'
      },
      {
        question: 'Ein Kunde sagt: "Ihr Produkt passt nicht zu unserem Unternehmen." Wie reagierst du?',
        options: [
          { text: '„Doch, es passt."', correct: false },
          { text: '„Dann können wir nichts machen."', correct: false },
          { text: '„Was genau passt nicht? Lassen Sie uns gemeinsam prüfen, ob wir eine Lösung finden."', correct: true },
          { text: '„Sie wissen nicht, was gut für Sie ist."', correct: false }
        ],
        feedback: 'Finde heraus, was genau nicht passt. Oft gibt es Anpassungsmöglichkeiten oder Alternativen.',
        difficulty: 'Mittel'
      },
      {
        question: 'Wie behandelst du einen Einwand, der emotional geladen ist?',
        options: [
          { text: 'Den Einwand rational beantworten', correct: false },
          { text: 'Die Emotion ignorieren', correct: false },
          { text: 'Zuerst die Emotion anerkennen, dann sachlich antworten', correct: true },
          { text: 'Gegenargumentieren', correct: false }
        ],
        feedback: 'Emotionale Einwände brauchen zuerst emotionale Anerkennung, dann sachliche Antworten.',
        difficulty: 'Schwer'
      },
      {
        question: 'Ein Kunde sagt: "Das ist zu teuer für das, was es bietet." Was tust du?',
        options: [
          { text: 'Den Preis senken', correct: false },
          { text: '„Dann kaufen Sie es nicht."', correct: false },
          { text: 'Den Mehrwert konkret aufzeigen und ROI berechnen', correct: true },
          { text: '„Das ist unser Preis."', correct: false }
        ],
        feedback: 'Der Kunde sieht den Wert nicht. Zeige konkrete Zahlen und den Return on Investment.',
        difficulty: 'Schwer'
      },
      {
        question: 'Was ist die beste Strategie bei mehreren gleichzeitigen Einwänden?',
        options: [
          { text: 'Alle auf einmal beantworten', correct: false },
          { text: 'Die wichtigsten ignorieren', correct: false },
          { text: 'Priorisieren und einen nach dem anderen behandeln', correct: true },
          { text: 'Aufgeben', correct: false }
        ],
        feedback: 'Mehrere Einwände zeigen Engagement. Priorisiere und behandle sie systematisch.',
        difficulty: 'Schwer'
      },
      {
        question: 'Ein Kunde sagt: "Ich habe schon einen Anbieter, der das macht." Wie reagierst du?',
        options: [
          { text: '„Dann brauchen Sie uns nicht."', correct: false },
          { text: '„Ihr Anbieter ist schlecht."', correct: false },
          { text: '„Wie zufrieden sind Sie mit Ihrer aktuellen Lösung? Was könnte besser sein?"', correct: true },
          { text: '„Sie müssen wechseln."', correct: false }
        ],
        feedback: 'Finde heraus, was nicht optimal läuft. Jede Lösung hat Verbesserungspotenzial.',
        difficulty: 'Mittel'
      },
      {
        question: 'Wie behandelst du einen Einwand, der auf falschen Informationen basiert?',
        options: [
          { text: 'Den Kunden direkt korrigieren', correct: false },
          { text: 'Den Einwand ignorieren', correct: false },
          { text: 'Verständnis zeigen, dann die korrekte Information liefern', correct: true },
          { text: 'Den Kunden kritisieren', correct: false }
        ],
        feedback: 'Falsche Informationen sind Chancen zur Aufklärung. Zeige Verständnis, dann kläre auf.',
        difficulty: 'Mittel'
      },
      {
        question: 'Ein Kunde sagt: "Ich muss erst noch andere Angebote einholen." Was tust du?',
        options: [
          { text: '„Dann machen Sie das."', correct: false },
          { text: '„Dann ist das Gespräch beendet."', correct: false },
          { text: '„Verstehe. Was genau möchten Sie vergleichen? Vielleicht kann ich Ihnen dabei helfen."', correct: true },
          { text: '„Wir sind die Besten."', correct: false }
        ],
        feedback: 'Vergleichsprozesse sind normal. Biete Unterstützung an, um deine Stärken zu zeigen.',
        difficulty: 'Mittel'
      },
      {
        question: 'Was ist die beste Reaktion auf "Das ist zu aufwendig zu implementieren"?',
        options: [
          { text: '„Dann machen Sie es nicht."', correct: false },
          { text: '„Das ist einfach."', correct: false },
          { text: '„Was genau macht Ihnen Sorgen? Wir unterstützen Sie bei der Implementierung."', correct: true },
          { text: '„Das ist Ihr Problem."', correct: false }
        ],
        feedback: 'Implementierungsbedenken sind real. Zeige konkrete Unterstützung und einen klaren Plan.',
        difficulty: 'Mittel'
      },
      {
        question: 'Ein Kunde sagt: "Ich brauche das nicht sofort." Wie gehst du vor?',
        options: [
          { text: '„Was würde passieren, wenn Sie warten? Welche Kosten entstehen durch Verzögerung?"', correct: true },
          { text: '„Dann rufe ich später an."', correct: false },
          { text: '„Dann ist das Gespräch beendet."', correct: false },
          { text: '„Sie müssen es jetzt kaufen."', correct: false }
        ],
        feedback: 'Zeit-Einwände sind oft Dringlichkeits-Einwände. Zeige die Kosten des Wartens.',
        difficulty: 'Schwer'
      },
      {
        question: 'Wie reagierst du auf "Ihr Produkt ist zu neu, ich warte lieber"?',
        options: [
          { text: '„Dann warten Sie."', correct: false },
          { text: '„Es ist nicht neu."', correct: false },
          { text: '„Verstehe. Was sind Ihre Bedenken? Wir haben bereits viele erfolgreiche Implementierungen."', correct: true },
          { text: '„Dann kaufen Sie es nicht."', correct: false }
        ],
        feedback: 'Neue Technologien lösen Bedenken aus. Zeige Referenzen und Erfolgsgeschichten.',
        difficulty: 'Mittel'
      },
      {
        question: 'Ein Kunde sagt: "Ich habe gehört, dass Ihr Support schlecht ist." Was tust du?',
        options: [
          { text: '„Das stimmt nicht."', correct: false },
          { text: '„Dann kaufen Sie es nicht."', correct: false },
          { text: '„Woher haben Sie diese Information? Lassen Sie mich zeigen, wie unser Support wirklich funktioniert."', correct: true },
          { text: '„Das ist nicht mein Problem."', correct: false }
        ],
        feedback: 'Negative Gerüchte müssen direkt adressiert werden. Zeige konkrete Beispiele deines Supports.',
        difficulty: 'Schwer'
      },
      {
        question: 'Was ist die beste Strategie bei einem Einwand, der auf Vorurteilen basiert?',
        options: [
          { text: 'Das Vorurteil direkt angreifen', correct: false },
          { text: 'Das Vorurteil ignorieren', correct: false },
          { text: 'Verständnis zeigen, dann mit Fakten und Beispielen aufklären', correct: true },
          { text: 'Den Kunden kritisieren', correct: false }
        ],
        feedback: 'Vorurteile sind hartnäckig. Zeige Verständnis, dann liefere Fakten und positive Beispiele.',
        difficulty: 'Schwer'
      },
      {
        question: 'Ein Kunde sagt: "Ich habe schon zu viele Anbieter getestet." Wie reagierst du?',
        options: [
          { text: '„Dann testen Sie uns nicht."', correct: false },
          { text: '„Wir sind anders."', correct: false },
          { text: '„Das verstehe ich. Was hat bei den anderen nicht funktioniert? So kann ich sicherstellen, dass wir das anders machen."', correct: true },
          { text: '„Dann ist das Gespräch beendet."', correct: false }
        ],
        feedback: 'Negative Erfahrungen sind Chancen. Lerne daraus und zeige, wie du es besser machst.',
        difficulty: 'Schwer'
      },
      {
        question: 'Wie behandelst du einen Einwand, der während eines Online-Meetings kommt?',
        options: [
          { text: 'Den Einwand auf später verschieben', correct: false },
          { text: 'Den Einwand ignorieren', correct: false },
          { text: 'Den Einwand sofort ansprechen und visuell unterstützen', correct: true },
          { text: 'Das Meeting beenden', correct: false }
        ],
        feedback: 'Online-Meetings brauchen aktive Einwandbehandlung. Nutze visuelle Tools zur Unterstützung.',
        difficulty: 'Mittel'
      },
      {
        question: 'Ein Kunde sagt: "Das ist zu komplex für meine Mitarbeiter." Was tust du?',
        options: [
          { text: '„Dann sind Ihre Mitarbeiter nicht qualifiziert."', correct: false },
          { text: '„Das ist einfach."', correct: false },
          { text: '„Was genau macht Ihnen Sorgen? Wir bieten umfassende Schulungen und Support."', correct: true },
          { text: '„Dann passt es nicht."', correct: false }
        ],
        feedback: 'Komplexitätsbedenken sind real. Zeige konkrete Schulungs- und Support-Angebote.',
        difficulty: 'Mittel'
      },
      {
        question: 'Was ist die beste Reaktion auf "Ich muss erst noch meine Kollegen fragen"?',
        options: [
          { text: '„Verstehe. Was genau möchten Sie fragen? Kann ich dabei sein oder Materialien bereitstellen?"', correct: true },
          { text: '„Okay, melden Sie sich dann."', correct: false },
          { text: '„Dann ist das Gespräch beendet."', correct: false },
          { text: '„Sie können selbst entscheiden."', correct: false }
        ],
        feedback: 'Aktiviere dich im internen Entscheidungsprozess. Biete Unterstützung an.',
        difficulty: 'Mittel'
      },
      {
        question: 'Ein Kunde sagt: "Ihr Produkt ist zu teuer für unseren Markt." Wie gehst du vor?',
        options: [
          { text: 'Den Preis senken', correct: false },
          { text: '„Dann passt es nicht."', correct: false },
          { text: 'Den ROI für diesen spezifischen Markt berechnen und zeigen', correct: true },
          { text: '„Das ist unser Preis."', correct: false }
        ],
        feedback: 'Marktspezifische Bedenken brauchen marktspezifische Antworten. Zeige den ROI für diesen Markt.',
        difficulty: 'Schwer'
      },
      {
        question: 'Wie reagierst du auf "Ich habe schon ein Budget für etwas anderes"?',
        options: [
          { text: '„Verstehe. Können wir gemeinsam prüfen, ob eine Umverteilung möglich ist oder ob es andere Finanzierungswege gibt?"', correct: true },
          { text: '„Dann können wir nichts machen."', correct: false },
          { text: '„Dann müssen Sie das Budget ändern."', correct: false },
          { text: '„Das ist nicht mein Problem."', correct: false }
        ],
        feedback: 'Budget ist oft flexibel. Finde heraus, ob eine Umverteilung möglich ist.',
        difficulty: 'Mittel'
      },
      {
        question: 'Ein Kunde sagt: "Das ist zu innovativ, wir sind konservativ." Was tust du?',
        options: [
          { text: '„Dann sind Sie nicht modern genug."', correct: false },
          { text: '„Dann passt es nicht."', correct: false },
          { text: '„Verstehe. Lassen Sie mich zeigen, wie konservative Unternehmen erfolgreich damit arbeiten."', correct: true },
          { text: '„Sie müssen innovativer werden."', correct: false }
        ],
        feedback: 'Konservative Kunden brauchen konservative Referenzen. Zeige ähnliche Unternehmen als Beispiele.',
        difficulty: 'Schwer'
      },
      {
        question: 'Was ist die beste Strategie bei einem Einwand, der auf einem Vergleich mit der Konkurrenz basiert?',
        options: [
          { text: 'Die Konkurrenz kritisieren', correct: false },
          { text: 'Sagen, dass die Konkurrenz schlecht ist', correct: false },
          { text: 'Die Unterschiede anerkennen und deine Stärken betonen', correct: true },
          { text: 'Den Vergleich ignorieren', correct: false }
        ],
        feedback: 'Vergleiche sind normal. Zeige deine einzigartigen Stärken, ohne die Konkurrenz zu kritisieren.',
        difficulty: 'Mittel'
      },
      {
        question: 'Ein Kunde sagt: "Ich brauche das nicht, weil wir das intern lösen." Wie reagierst du?',
        options: [
          { text: '„Verstehe. Was kostet Sie die interne Lösung? Zeit, Ressourcen, Opportunitätskosten?"', correct: true },
          { text: '„Dann brauchen Sie uns nicht."', correct: false },
          { text: '„Dann machen Sie das."', correct: false },
          { text: '„Das funktioniert nicht."', correct: false }
        ],
        feedback: 'Interne Lösungen haben versteckte Kosten. Zeige die wahren Kosten der internen Lösung.',
        difficulty: 'Schwer'
      },
      {
        question: 'Wie behandelst du einen Einwand, der auf einem Missverständnis über dein Produkt basiert?',
        options: [
          { text: 'Den Kunden korrigieren', correct: false },
          { text: 'Den Einwand ignorieren', correct: false },
          { text: 'Verständnis zeigen, dann die korrekte Funktionsweise erklären', correct: true },
          { text: 'Den Kunden kritisieren', correct: false }
        ],
        feedback: 'Missverständnisse sind Chancen zur Aufklärung. Zeige Verständnis, dann kläre auf.',
        difficulty: 'Mittel'
      },
      {
        question: 'Ein Kunde sagt: "Das ist zu teuer für den ROI, den ich sehe." Was tust du?',
        options: [
          { text: 'Den Preis senken', correct: false },
          { text: '„Dann kaufen Sie es nicht."', correct: false },
          { text: 'Den ROI detailliert berechnen und zeigen, was der Kunde übersieht', correct: true },
          { text: '„Das ist unser Preis."', correct: false }
        ],
        feedback: 'Der Kunde sieht den ROI nicht vollständig. Zeige alle versteckten Vorteile und Einsparungen.',
        difficulty: 'Schwer'
      },
      {
        question: 'Was ist die beste Reaktion auf "Ich habe schon zu viele Anbieter, die mir das versprochen haben"?',
        options: [
          { text: '„Wir sind anders."', correct: false },
          { text: '„Dann kaufen Sie es nicht."', correct: false },
          { text: '„Das verstehe ich. Lassen Sie mich zeigen, wie wir unsere Versprechen halten – mit konkreten Beispielen."', correct: true },
          { text: '„Das war nicht unsere Schuld."', correct: false }
        ],
        feedback: 'Gebrochene Versprechen schaffen Misstrauen. Zeige konkrete Beispiele, wie du Versprechen hältst.',
        difficulty: 'Schwer'
      },
      {
        question: 'Ein Kunde sagt: "Das ist zu teuer für unsere Größe." Wie gehst du vor?',
        options: [
          { text: 'Den Preis senken', correct: false },
          { text: '„Dann passt es nicht."', correct: false },
          { text: 'Den ROI für Unternehmen dieser Größe berechnen und skalierbare Optionen zeigen', correct: true },
          { text: '„Das ist unser Preis."', correct: false }
        ],
        feedback: 'Größenbedenken brauchen größenangepasste Antworten. Zeige skalierbare Lösungen und ROI.',
        difficulty: 'Mittel'
      },
      {
        question: 'Wie reagierst du auf "Ich brauche das nicht, weil wir das anders machen"?',
        options: [
          { text: '„Verstehe. Wie machen Sie das aktuell? Vielleicht können wir Ihre Methode optimieren."', correct: true },
          { text: '„Dann brauchen Sie uns nicht."', correct: false },
          { text: '„Ihre Methode ist falsch."', correct: false },
          { text: '„Dann machen Sie es falsch."', correct: false }
        ],
        feedback: 'Andere Methoden sind nicht automatisch schlecht. Finde heraus, wie du helfen kannst.',
        difficulty: 'Mittel'
      },
      {
        question: 'Ein Kunde sagt: "Das ist zu teuer für unseren Use Case." Was tust du?',
        options: [
          { text: 'Den Preis senken', correct: false },
          { text: '„Dann passt es nicht."', correct: false },
          { text: 'Den ROI für diesen spezifischen Use Case berechnen und zeigen', correct: true },
          { text: '„Das ist unser Preis."', correct: false }
        ],
        feedback: 'Use-Case-spezifische Bedenken brauchen Use-Case-spezifische ROI-Berechnungen.',
        difficulty: 'Schwer'
      },
      {
        question: 'Was ist die beste Strategie bei einem Einwand, der auf einem schlechten ersten Eindruck basiert?',
        options: [
          { text: 'Den ersten Eindruck ignorieren', correct: false },
          { text: 'Den Kunden kritisieren', correct: false },
          { text: 'Den ersten Eindruck anerkennen und dann einen neuen, positiven Eindruck schaffen', correct: true },
          { text: 'Aufgeben', correct: false }
        ],
        feedback: 'Erste Eindrücke sind wichtig, aber korrigierbar. Schaffe einen neuen, positiven Eindruck.',
        difficulty: 'Schwer'
      },
      {
        question: 'Ein Kunde sagt: "Ich habe schon zu viele Tools, die ich nicht nutze." Wie reagierst du?',
        options: [
          { text: '„Dann brauchen Sie uns nicht."', correct: false },
          { text: '„Wir sind anders."', correct: false },
          { text: '„Verstehe. Was hat bei den anderen Tools nicht funktioniert? So kann ich sicherstellen, dass Sie unser Tool wirklich nutzen."', correct: true },
          { text: '„Dann kaufen Sie es nicht."', correct: false }
        ],
        feedback: 'Ungenutzte Tools sind ein echtes Problem. Zeige, wie du Adoption sicherstellst.',
        difficulty: 'Schwer'
      },
      {
        question: 'Wie behandelst du einen Einwand, der auf einem schlechten Erlebnis mit einem ähnlichen Produkt basiert?',
        options: [
          { text: 'Sagen, dass dein Produkt anders ist', correct: false },
          { text: 'Das schlechte Erlebnis ignorieren', correct: false },
          { text: 'Empathie zeigen, dann zeigen, wie du die Probleme vermeidest', correct: true },
          { text: 'Den Kunden kritisieren', correct: false }
        ],
        feedback: 'Negative Erfahrungen sind real. Zeige Empathie und dann, wie du es besser machst.',
        difficulty: 'Schwer'
      },
      {
        question: 'Ein Kunde sagt: "Das ist zu teuer für das, was wir damit machen können." Was tust du?',
        options: [
          { text: 'Den Preis senken', correct: false },
          { text: '„Dann kaufen Sie es nicht."', correct: false },
          { text: 'Zeigen, was der Kunde wirklich damit machen kann – oft mehr als gedacht', correct: true },
          { text: '„Das ist unser Preis."', correct: false }
        ],
        feedback: 'Der Kunde sieht nicht alle Möglichkeiten. Zeige den vollen Funktionsumfang und Nutzen.',
        difficulty: 'Schwer'
      }
    ],
    'Fragen': [
      {
        question: 'Was ist das Ziel der "Implication Questions" im SPIN-Selling?',
        options: [
          { text: 'Das Budget des Kunden herausfinden', correct: false },
          { text: 'Das Produkt zu präsentieren', correct: false },
          { text: 'Die Folgen des Problems für den Kunden aufzeigen', correct: true }
        ],
        feedback: 'Richtig! Implication Questions helfen, die Dringlichkeit zu erhöhen.',
        difficulty: 'Mittel'
      },
      {
        question: 'Wofür steht die Abkürzung SPIN im SPIN-Selling-Modell?',
        options: [
          { text: 'Situation, Problem, Implication, Need-Payoff', correct: true },
          { text: 'Strategy, Plan, Information, Negotiation', correct: false },
          { text: 'Solution, Price, Interest, Network', correct: false },
          { text: 'Sell, Promote, Inspire, Negotiate', correct: false }
        ],
        feedback: 'SPIN-Selling ist ein bewährtes Verkaufsmodell. Die vier Phasen führen den Kunden systematisch durch den Verkaufsprozess.',
        difficulty: 'Einfach'
      },
      {
        question: 'Welche Frage gehört zur Phase "Need-Payoff" im SPIN-Selling?',
        options: [
          { text: '„Wie groß ist Ihr Unternehmen?"', correct: false },
          { text: '„Wie würde sich Ihr Alltag verändern, wenn Sie dieses Problem lösen könnten?"', correct: true },
          { text: '„Wie hoch ist Ihr aktuelles Budget?"', correct: false },
          { text: '„Wer trifft bei Ihnen die Entscheidung?"', correct: false }
        ],
        feedback: 'Need-Payoff Questions lassen den Kunden selbst die Vorteile einer Lösung beschreiben. Wenn der Kunde die positiven Auswirkungen verbalisiert, wird er zum Verkäufer seiner eigenen Entscheidung.',
        difficulty: 'Mittel'
      },
      {
        question: 'Was bedeutet das Kürzel BANT?',
        options: [
          { text: 'Benefit, Analysis, Negotiation, Target', correct: false },
          { text: 'Budget, Authority, Need, Timeline', correct: true },
          { text: 'Buyer, Attention, Network, Target', correct: false },
          { text: 'Budget, Agreement, Name, Trust', correct: false }
        ],
        feedback: 'BANT ist ein Qualifizierungsmodell, das hilft zu prüfen, ob ein Lead wirklich kaufbereit ist. Nur wenn alle vier Kriterien erfüllt sind, ist der Lead qualifiziert.',
        difficulty: 'Einfach'
      },
      {
        question: 'Was prüfst du bei der Komponente "Authority" im BANT-Modell?',
        options: [
          { text: 'Wer die Kaufentscheidung trifft', correct: true },
          { text: 'Wie viel Budget der Kunde hat', correct: false },
          { text: 'Welche Produkte die Konkurrenz anbietet', correct: false },
          { text: 'Ob der Kunde zufrieden ist', correct: false }
        ],
        feedback: 'Authority prüft, ob dein Gesprächspartner die Entscheidungsbefugnis hat. Finde heraus, wer der Entscheider ist.',
        difficulty: 'Einfach'
      },
      {
        question: 'Was ist der Hauptunterschied zwischen offenen und geschlossenen Fragen?',
        options: [
          { text: 'Geschlossene Fragen sind höflicher', correct: false },
          { text: 'Offene Fragen regen zum Erzählen an, geschlossene liefern kurze Antworten', correct: true },
          { text: 'Offene Fragen sind nur für Umfragen gedacht', correct: false },
          { text: 'Geschlossene Fragen sind besser für Vertrauensaufbau', correct: false }
        ],
        feedback: 'Offene Fragen beginnen mit W-Wörtern und lassen den Kunden ausführlich antworten. Geschlossene Fragen können mit Ja/Nein beantwortet werden.',
        difficulty: 'Einfach'
      },
      {
        question: 'Welche der folgenden ist eine offene Frage?',
        options: [
          { text: '„Sind Sie zufrieden?"', correct: false },
          { text: '„Wie entscheiden Sie, welche Anbieter Sie wählen?"', correct: true },
          { text: '„Haben Sie Interesse?"', correct: false },
          { text: '„Möchten Sie ein Angebot?"', correct: false }
        ],
        feedback: 'Offene Fragen beginnen mit Fragewörtern wie "Wie", "Was", "Warum" und fordern ausführliche Antworten.',
        difficulty: 'Einfach'
      },
      {
        question: 'Wann sind geschlossene Fragen im Verkauf sinnvoll?',
        options: [
          { text: 'Um Entscheidungen zu bestätigen oder den Abschluss einzuleiten', correct: true },
          { text: 'Zu Beginn des Gesprächs', correct: false },
          { text: 'Wenn du noch Vertrauen aufbauen willst', correct: false },
          { text: 'Wenn du Informationen sammeln möchtest', correct: false }
        ],
        feedback: 'Geschlossene Fragen sind ideal für Bestätigungen und Abschlüsse. "Passt Ihnen der Termin?" führt zu klaren Entscheidungen.',
        difficulty: 'Mittel'
      },
      {
        question: 'Was beschreibt der Begriff "Funnel-Fragen" im Vertrieb?',
        options: [
          { text: 'Fragen, die nur nach Preisen fragen', correct: false },
          { text: 'Fragen, die vom Allgemeinen zum Spezifischen führen', correct: true },
          { text: 'Fragen, die den Kunden verwirren', correct: false },
          { text: 'Fragen, die sofort zum Abschluss führen', correct: false }
        ],
        feedback: 'Funnel-Fragen folgen einer Trichter-Struktur: Du beginnst mit breiten, offenen Fragen und verengst dann schrittweise zu spezifischen Details.',
        difficulty: 'Mittel'
      },
      {
        question: 'Wie beginnt man typischerweise eine Funnel-Fragen-Sequenz?',
        options: [
          { text: 'Mit einer Preisfrage', correct: false },
          { text: 'Mit einer offenen, allgemeinen Frage', correct: true },
          { text: 'Mit einer geschlossenen Entscheidungsfrage', correct: false },
          { text: 'Mit einer Bedarfsbestätigung', correct: false }
        ],
        feedback: 'Eine Funnel-Sequenz beginnt immer breit: "Wie läuft Ihr aktueller Prozess?" Diese offenen Fragen geben dem Kunden Raum, seine Situation zu schildern.',
        difficulty: 'Mittel'
      },
      {
        question: 'Was ist das Ziel von "Situation Questions" im SPIN-Selling?',
        options: [
          { text: 'Das Problem zu identifizieren', correct: false },
          { text: 'Den aktuellen Zustand und Kontext des Kunden zu verstehen', correct: true },
          { text: 'Die Lösung zu präsentieren', correct: false },
          { text: 'Den Abschluss einzuleiten', correct: false }
        ],
        feedback: 'Situation Questions helfen, den Kontext zu verstehen. Ohne Kontext kannst du keine passende Lösung anbieten.',
        difficulty: 'Einfach'
      },
      {
        question: 'Was ist das Ziel von "Problem Questions" im SPIN-Selling?',
        options: [
          { text: 'Die Lösung zu präsentieren', correct: false },
          { text: 'Schmerzpunkte und Herausforderungen zu identifizieren', correct: true },
          { text: 'Das Budget zu erfragen', correct: false },
          { text: 'Den Abschluss einzuleiten', correct: false }
        ],
        feedback: 'Problem Questions decken Schmerzpunkte auf. Ohne Problem gibt es keinen Bedarf für eine Lösung.',
        difficulty: 'Einfach'
      },
      {
        question: 'Welche Frage ist eine typische "Situation Question"?',
        options: [
          { text: '„Was passiert, wenn Sie das Problem nicht lösen?"', correct: false },
          { text: '„Wie groß ist Ihr Unternehmen?"', correct: true },
          { text: '„Wie hoch ist Ihr Budget?"', correct: false },
          { text: '„Wann können Sie starten?"', correct: false }
        ],
        feedback: 'Situation Questions erfragen Fakten über den aktuellen Zustand: Unternehmensgröße, Prozesse, Strukturen.',
        difficulty: 'Einfach'
      },
      {
        question: 'Welche Frage ist eine typische "Problem Question"?',
        options: [
          { text: '„Wie groß ist Ihr Unternehmen?"', correct: false },
          { text: '„Welche Herausforderungen haben Sie aktuell?"', correct: true },
          { text: '„Wie hoch ist Ihr Budget?"', correct: false },
          { text: '„Wann können Sie starten?"', correct: false }
        ],
        feedback: 'Problem Questions identifizieren Schmerzpunkte und Herausforderungen, die der Kunde hat.',
        difficulty: 'Einfach'
      },
      {
        question: 'Was prüfst du bei der Komponente "Budget" im BANT-Modell?',
        options: [
          { text: 'Wer die Entscheidung trifft', correct: false },
          { text: 'Ob finanzielle Mittel vorhanden sind', correct: true },
          { text: 'Welche Produkte die Konkurrenz anbietet', correct: false },
          { text: 'Ob der Kunde zufrieden ist', correct: false }
        ],
        feedback: 'Budget prüft, ob der Kunde finanzielle Mittel hat. Ohne Budget ist kein Kauf möglich.',
        difficulty: 'Einfach'
      },
      {
        question: 'Was prüfst du bei der Komponente "Need" im BANT-Modell?',
        options: [
          { text: 'Wer die Entscheidung trifft', correct: false },
          { text: 'Ob ein echter Bedarf vorhanden ist', correct: true },
          { text: 'Wie viel Budget vorhanden ist', correct: false },
          { text: 'Welche Produkte die Konkurrenz anbietet', correct: false }
        ],
        feedback: 'Need prüft, ob ein echter Bedarf vorhanden ist. Ohne Bedarf gibt es keinen Grund zu kaufen.',
        difficulty: 'Einfach'
      },
      {
        question: 'Was prüfst du bei der Komponente "Timeline" im BANT-Modell?',
        options: [
          { text: 'Wer die Entscheidung trifft', correct: false },
          { text: 'Ob es einen Zeitrahmen für die Entscheidung gibt', correct: true },
          { text: 'Wie viel Budget vorhanden ist', correct: false },
          { text: 'Welche Produkte die Konkurrenz anbietet', correct: false }
        ],
        feedback: 'Timeline prüft, ob es einen Zeitrahmen gibt. Ohne Timeline kann der Deal endlos dauern.',
        difficulty: 'Einfach'
      },
      {
        question: 'Was ist der Unterschied zwischen offenen und geschlossenen Fragen in der Praxis?',
        options: [
          { text: 'Offene Fragen sind länger', correct: false },
          { text: 'Offene Fragen fördern Dialog, geschlossene liefern schnelle Antworten', correct: true },
          { text: 'Geschlossene Fragen sind besser', correct: false },
          { text: 'Es gibt keinen Unterschied', correct: false }
        ],
        feedback: 'Offene Fragen fördern Gespräche und tiefere Einblicke. Geschlossene Fragen liefern schnelle, klare Antworten.',
        difficulty: 'Einfach'
      },
      {
        question: 'Wann solltest du offene Fragen verwenden?',
        options: [
          { text: 'Nur am Ende des Gesprächs', correct: false },
          { text: 'Wenn du Informationen sammeln und den Kunden zum Reden bringen willst', correct: true },
          { text: 'Nur zu Beginn', correct: false },
          { text: 'Niemals', correct: false }
        ],
        feedback: 'Offene Fragen sind ideal, um Informationen zu sammeln und den Kunden zum Reden zu bringen.',
        difficulty: 'Einfach'
      },
      {
        question: 'Wann solltest du geschlossene Fragen verwenden?',
        options: [
          { text: 'Zu Beginn des Gesprächs', correct: false },
          { text: 'Wenn du Bestätigungen brauchst oder Entscheidungen einleitest', correct: true },
          { text: 'Wenn du Informationen sammeln willst', correct: false },
          { text: 'Immer', correct: false }
        ],
        feedback: 'Geschlossene Fragen sind ideal für Bestätigungen und Entscheidungen, nicht für Informationssammlung.',
        difficulty: 'Einfach'
      },
      {
        question: 'Was ist eine "Leading Question" und wann ist sie problematisch?',
        options: [
          { text: 'Eine Frage, die den Kunden in eine bestimmte Richtung lenkt – kann manipulativ wirken', correct: true },
          { text: 'Eine Frage, die offen ist – immer gut', correct: false },
          { text: 'Eine Frage, die geschlossen ist – immer schlecht', correct: false },
          { text: 'Eine Frage, die das Budget erfragt', correct: false }
        ],
        feedback: 'Leading Questions lenken den Kunden in eine Richtung. Sie können manipulativ wirken und Vertrauen schädigen.',
        difficulty: 'Mittel'
      },
      {
        question: 'Was ist eine "Clarifying Question"?',
        options: [
          { text: 'Eine Frage, die Unklarheiten beseitigt', correct: true },
          { text: 'Eine Frage, die das Budget erfragt', correct: false },
          { text: 'Eine Frage, die den Abschluss einleitet', correct: false },
          { text: 'Eine Frage, die offen ist', correct: false }
        ],
        feedback: 'Clarifying Questions helfen, Unklarheiten zu beseitigen und Missverständnisse zu vermeiden.',
        difficulty: 'Einfach'
      },
      {
        question: 'Wie nutzt du "Funnel-Fragen" effektiv?',
        options: [
          { text: 'Du stellst nur geschlossene Fragen', correct: false },
          { text: 'Du beginnst breit und verengst dann schrittweise zu spezifischen Details', correct: true },
          { text: 'Du stellst nur offene Fragen', correct: false },
          { text: 'Du fragst nur nach dem Preis', correct: false }
        ],
        feedback: 'Funnel-Fragen folgen einer Trichter-Struktur: breit beginnen, dann schrittweise verengen.',
        difficulty: 'Mittel'
      },
      {
        question: 'Was ist das Ziel von "Need-Payoff Questions" im SPIN-Selling?',
        options: [
          { text: 'Das Problem zu identifizieren', correct: false },
          { text: 'Den Kunden selbst die Vorteile einer Lösung beschreiben lassen', correct: true },
          { text: 'Das Budget zu erfragen', correct: false },
          { text: 'Die Lösung zu präsentieren', correct: false }
        ],
        feedback: 'Need-Payoff Questions lassen den Kunden selbst die Vorteile beschreiben. So wird er zum Verkäufer seiner eigenen Entscheidung.',
        difficulty: 'Mittel'
      },
      {
        question: 'Welche Frage ist eine typische "Implication Question"?',
        options: [
          { text: '„Wie groß ist Ihr Unternehmen?"', correct: false },
          { text: '„Was passiert, wenn Sie dieses Problem nicht lösen?"', correct: true },
          { text: '„Wie hoch ist Ihr Budget?"', correct: false },
          { text: '„Wann können Sie starten?"', correct: false }
        ],
        feedback: 'Implication Questions zeigen die Folgen des Problems. Sie erhöhen die Dringlichkeit.',
        difficulty: 'Mittel'
      },
      {
        question: 'Wie nutzt du Fragen, um den Bedarf zu qualifizieren?',
        options: [
          { text: 'Du fragst nur nach dem Preis', correct: false },
          { text: 'Du nutzt BANT oder ähnliche Modelle, um Budget, Authority, Need und Timeline zu prüfen', correct: true },
          { text: 'Du fragst nur nach dem Namen', correct: false },
          { text: 'Du stellst keine Fragen', correct: false }
        ],
        feedback: 'Qualifizierung braucht strukturierte Fragen. BANT ist ein bewährtes Modell dafür.',
        difficulty: 'Mittel'
      },
      {
        question: 'Was ist eine "Assumptive Question"?',
        options: [
          { text: 'Eine Frage, die eine Annahme enthält und den Kunden in eine Richtung lenkt', correct: true },
          { text: 'Eine Frage, die offen ist', correct: false },
          { text: 'Eine Frage, die geschlossen ist', correct: false },
          { text: 'Eine Frage, die das Budget erfragt', correct: false }
        ],
        feedback: 'Assumptive Questions enthalten Annahmen. Sie können nützlich sein, aber auch manipulativ wirken.',
        difficulty: 'Mittel'
      },
      {
        question: 'Wie nutzt du Fragen, um Einwände zu vermeiden?',
        options: [
          { text: 'Du stellst keine Fragen', correct: false },
          { text: 'Du stellst proaktive Fragen, die Bedenken früh aufdecken', correct: true },
          { text: 'Du fragst nur nach dem Preis', correct: false },
          { text: 'Du stellst nur geschlossene Fragen', correct: false }
        ],
        feedback: 'Proaktive Fragen decken Bedenken früh auf, bevor sie zu Einwänden werden.',
        difficulty: 'Mittel'
      },
      {
        question: 'Was ist eine "Trial Close Question"?',
        options: [
          { text: 'Eine Frage, die den Abschluss testet, ohne ihn direkt zu fordern', correct: true },
          { text: 'Eine Frage, die offen ist', correct: false },
          { text: 'Eine Frage, die geschlossen ist', correct: false },
          { text: 'Eine Frage, die das Budget erfragt', correct: false }
        ],
        feedback: 'Trial Close Questions testen die Kaufbereitschaft, ohne direkt zu schließen.',
        difficulty: 'Mittel'
      },
      {
        question: 'Wie nutzt du Fragen, um den Entscheidungsprozess zu verstehen?',
        options: [
          { text: 'Du fragst nur nach dem Preis', correct: false },
          { text: 'Du stellst Fragen wie "Wer ist am Entscheidungsprozess beteiligt?" und "Wie läuft der Prozess ab?"', correct: true },
          { text: 'Du stellst keine Fragen', correct: false },
          { text: 'Du fragst nur nach dem Namen', correct: false }
        ],
        feedback: 'Entscheidungsprozess-Fragen helfen, die Struktur und Beteiligten zu verstehen.',
        difficulty: 'Mittel'
      },
      {
        question: 'Was ist eine "Pain Question"?',
        options: [
          { text: 'Eine Frage, die Schmerzpunkte identifiziert', correct: true },
          { text: 'Eine Frage, die offen ist', correct: false },
          { text: 'Eine Frage, die geschlossen ist', correct: false },
          { text: 'Eine Frage, die das Budget erfragt', correct: false }
        ],
        feedback: 'Pain Questions identifizieren Schmerzpunkte und Herausforderungen des Kunden.',
        difficulty: 'Einfach'
      },
      {
        question: 'Wie nutzt du Fragen, um den Wert zu kommunizieren?',
        options: [
          { text: 'Du fragst nur nach dem Preis', correct: false },
          { text: 'Du stellst Fragen, die den Kunden selbst den Wert beschreiben lassen', correct: true },
          { text: 'Du stellst keine Fragen', correct: false },
          { text: 'Du fragst nur nach dem Namen', correct: false }
        ],
        feedback: 'Wert-Fragen lassen den Kunden selbst den Wert beschreiben. Das ist überzeugender als wenn du es sagst.',
        difficulty: 'Schwer'
      },
      {
        question: 'Was ist eine "Objection Prevention Question"?',
        options: [
          { text: 'Eine Frage, die Einwände verhindert, bevor sie entstehen', correct: true },
          { text: 'Eine Frage, die offen ist', correct: false },
          { text: 'Eine Frage, die geschlossen ist', correct: false },
          { text: 'Eine Frage, die das Budget erfragt', correct: false }
        ],
        feedback: 'Objection Prevention Questions decken Bedenken früh auf, bevor sie zu Einwänden werden.',
        difficulty: 'Mittel'
      },
      {
        question: 'Wie nutzt du Fragen, um den Zeitrahmen zu verstehen?',
        options: [
          { text: 'Du fragst nur "Wann?"', correct: false },
          { text: 'Du stellst Fragen wie "Was passiert, wenn Sie warten?" und "Was ist der Zeitrahmen für die Entscheidung?"', correct: true },
          { text: 'Du stellst keine Fragen', correct: false },
          { text: 'Du fragst nur nach dem Preis', correct: false }
        ],
        feedback: 'Zeitrahmen-Fragen helfen, Dringlichkeit und Timeline zu verstehen.',
        difficulty: 'Mittel'
      },
      {
        question: 'Was ist eine "Benefit Question"?',
        options: [
          { text: 'Eine Frage, die den Nutzen einer Lösung erfragt', correct: true },
          { text: 'Eine Frage, die offen ist', correct: false },
          { text: 'Eine Frage, die geschlossen ist', correct: false },
          { text: 'Eine Frage, die das Budget erfragt', correct: false }
        ],
        feedback: 'Benefit Questions helfen, den Nutzen einer Lösung zu verstehen und zu kommunizieren.',
        difficulty: 'Mittel'
      },
      {
        question: 'Wie nutzt du Fragen, um die Konkurrenz zu verstehen?',
        options: [
          { text: 'Du kritisierst die Konkurrenz', correct: false },
          { text: 'Du stellst Fragen wie "Welche anderen Lösungen prüfen Sie?" und "Was ist Ihnen bei einer Lösung wichtig?"', correct: true },
          { text: 'Du stellst keine Fragen', correct: false },
          { text: 'Du fragst nur nach dem Preis', correct: false }
        ],
        feedback: 'Konkurrenz-Fragen helfen, die Kriterien zu verstehen, ohne die Konkurrenz zu kritisieren.',
        difficulty: 'Mittel'
      },
      {
        question: 'Was ist eine "Commitment Question"?',
        options: [
          { text: 'Eine Frage, die eine Zusage oder Verpflichtung testet', correct: true },
          { text: 'Eine Frage, die offen ist', correct: false },
          { text: 'Eine Frage, die geschlossen ist', correct: false },
          { text: 'Eine Frage, die das Budget erfragt', correct: false }
        ],
        feedback: 'Commitment Questions testen die Bereitschaft, eine Zusage zu machen oder sich zu verpflichten.',
        difficulty: 'Mittel'
      },
      {
        question: 'Wie nutzt du Fragen, um den Entscheider zu identifizieren?',
        options: [
          { text: 'Du fragst nur "Wer entscheidet?"', correct: false },
          { text: 'Du stellst Fragen wie "Wer ist am Entscheidungsprozess beteiligt?" und "Wer hat die finale Entscheidungsbefugnis?"', correct: true },
          { text: 'Du stellst keine Fragen', correct: false },
          { text: 'Du fragst nur nach dem Preis', correct: false }
        ],
        feedback: 'Entscheider-Fragen helfen, die Entscheidungsstruktur zu verstehen.',
        difficulty: 'Mittel'
      },
      {
        question: 'Was ist eine "Discovery Question"?',
        options: [
          { text: 'Eine Frage, die Informationen über den Kunden und seine Situation sammelt', correct: true },
          { text: 'Eine Frage, die offen ist', correct: false },
          { text: 'Eine Frage, die geschlossen ist', correct: false },
          { text: 'Eine Frage, die das Budget erfragt', correct: false }
        ],
        feedback: 'Discovery Questions sammeln Informationen über den Kunden, seine Situation und Bedürfnisse.',
        difficulty: 'Einfach'
      },
      {
        question: 'Wie nutzt du Fragen, um den ROI zu kommunizieren?',
        options: [
          { text: 'Du sagst einfach den ROI', correct: false },
          { text: 'Du stellst Fragen, die den Kunden selbst den ROI berechnen lassen', correct: true },
          { text: 'Du stellst keine Fragen', correct: false },
          { text: 'Du fragst nur nach dem Preis', correct: false }
        ],
        feedback: 'ROI-Fragen lassen den Kunden selbst den ROI berechnen. Das ist überzeugender als wenn du es sagst.',
        difficulty: 'Schwer'
      },
      {
        question: 'Was ist eine "Qualifying Question"?',
        options: [
          { text: 'Eine Frage, die prüft, ob der Lead kaufbereit ist', correct: true },
          { text: 'Eine Frage, die offen ist', correct: false },
          { text: 'Eine Frage, die geschlossen ist', correct: false },
          { text: 'Eine Frage, die das Budget erfragt', correct: false }
        ],
        feedback: 'Qualifying Questions prüfen, ob ein Lead wirklich kaufbereit ist (z. B. BANT).',
        difficulty: 'Einfach'
      },
      {
        question: 'Wie nutzt du Fragen, um den Bedarf zu verstärken?',
        options: [
          { text: 'Du sagst einfach, dass der Kunde es braucht', correct: false },
          { text: 'Du stellst Implication Questions, die die Folgen des Problems zeigen', correct: true },
          { text: 'Du stellst keine Fragen', correct: false },
          { text: 'Du fragst nur nach dem Preis', correct: false }
        ],
        feedback: 'Implication Questions verstärken den Bedarf, indem sie die Folgen des Problems zeigen.',
        difficulty: 'Schwer'
      },
      {
        question: 'Was ist eine "Objection Handling Question"?',
        options: [
          { text: 'Eine Frage, die einen Einwand behandelt, indem sie nachfragt', correct: true },
          { text: 'Eine Frage, die offen ist', correct: false },
          { text: 'Eine Frage, die geschlossen ist', correct: false },
          { text: 'Eine Frage, die das Budget erfragt', correct: false }
        ],
        feedback: 'Objection Handling Questions behandeln Einwände, indem sie nachfragen und klären.',
        difficulty: 'Mittel'
      },
      {
        question: 'Wie nutzt du Fragen, um den Abschluss einzuleiten?',
        options: [
          { text: 'Du sagst einfach "Kaufen Sie es"', correct: false },
          { text: 'Du stellst geschlossene Fragen, die eine Entscheidung testen', correct: true },
          { text: 'Du stellst keine Fragen', correct: false },
          { text: 'Du fragst nur nach dem Preis', correct: false }
        ],
        feedback: 'Abschluss-Fragen testen die Kaufbereitschaft und leiten den Abschluss ein.',
        difficulty: 'Mittel'
      },
      {
        question: 'Was ist eine "Follow-up Question"?',
        options: [
          { text: 'Eine Frage, die auf eine vorherige Antwort aufbaut', correct: true },
          { text: 'Eine Frage, die offen ist', correct: false },
          { text: 'Eine Frage, die geschlossen ist', correct: false },
          { text: 'Eine Frage, die das Budget erfragt', correct: false }
        ],
        feedback: 'Follow-up Questions bauen auf vorherige Antworten auf und vertiefen das Verständnis.',
        difficulty: 'Einfach'
      },
      {
        question: 'Wie nutzt du Fragen, um Vertrauen aufzubauen?',
        options: [
          { text: 'Du fragst nur nach dem Preis', correct: false },
          { text: 'Du stellst Fragen, die echtes Interesse zeigen und den Kunden zum Reden bringen', correct: true },
          { text: 'Du stellst keine Fragen', correct: false },
          { text: 'Du fragst nur nach dem Namen', correct: false }
        ],
        feedback: 'Vertrauens-Fragen zeigen echtes Interesse und lassen den Kunden reden. Das baut Vertrauen auf.',
        difficulty: 'Mittel'
      },
      {
        question: 'Was ist eine "Value Question"?',
        options: [
          { text: 'Eine Frage, die den Wert einer Lösung erfragt oder kommuniziert', correct: true },
          { text: 'Eine Frage, die offen ist', correct: false },
          { text: 'Eine Frage, die geschlossen ist', correct: false },
          { text: 'Eine Frage, die das Budget erfragt', correct: false }
        ],
        feedback: 'Value Questions helfen, den Wert einer Lösung zu verstehen und zu kommunizieren.',
        difficulty: 'Mittel'
      },
      {
        question: 'Wie nutzt du Fragen, um den Entscheidungsprozess zu beschleunigen?',
        options: [
          { text: 'Du drängst den Kunden', correct: false },
          { text: 'Du stellst Fragen, die die Dringlichkeit zeigen und den Prozess strukturieren', correct: true },
          { text: 'Du stellst keine Fragen', correct: false },
          { text: 'Du fragst nur nach dem Preis', correct: false }
        ],
        feedback: 'Prozess-Fragen strukturieren den Entscheidungsprozess und zeigen Dringlichkeit, ohne zu drängen.',
        difficulty: 'Schwer'
      }
    ]
  }
  
  // Karteikarten
  const flashcards = [
    {
      front: 'Was ist eine offene Frage?',
      back: 'Eine Frage, die den Kunden zum Erzählen anregt (z. B. "Wie entscheiden Sie, welche Anbieter Sie wählen?").',
      difficulty: 'Einfach'
    },
    {
      front: 'Was beschreibt das SPIN-Modell?',
      back: 'Fragesystem aus Situation, Problem, Implication, Need-Payoff – hilft, Bedürfnisse zu entdecken.',
      difficulty: 'Mittel'
    },
    {
      front: 'Was bedeutet Reziprozität im Verkauf?',
      back: 'Menschen fühlen sich verpflichtet, eine Gefälligkeit zu erwidern. Wenn du dem Kunden Mehrwert bietest, steigt die Kaufbereitschaft.',
      difficulty: 'Mittel'
    },
    {
      front: 'Was ist eine geschlossene Frage?',
      back: 'Eine Frage, die mit Ja oder Nein beantwortet werden kann. Ideal für Bestätigungen und Abschlüsse.',
      difficulty: 'Einfach'
    },
    {
      front: 'Was bedeutet BANT?',
      back: 'Budget, Authority, Need, Timeline – ein Qualifizierungsmodell, um zu prüfen, ob ein Lead kaufbereit ist.',
      difficulty: 'Mittel'
    },
    {
      front: 'Wie reagierst du auf einen Preis-Einwand?',
      back: 'Durch gezieltes Nachfragen ("Teuer im Vergleich zu was?") und Fokus auf den Mehrwert statt auf den Preis.',
      difficulty: 'Mittel'
    },
    {
      front: 'Was ist sozialer Beweis (Social Proof)?',
      back: 'Menschen orientieren sich am Verhalten anderer. Referenzen, Bewertungen und Erfolgsgeschichten reduzieren das wahrgenommene Risiko.',
      difficulty: 'Mittel'
    },
    {
      front: 'Was bedeutet Knappheit im Verkauf?',
      back: 'Produkte erscheinen wertvoller, wenn sie begrenzt verfügbar sind. Wichtig: Es muss authentisch sein, nicht künstlich erzeugt.',
      difficulty: 'Mittel'
    },
    {
      front: 'Wie sprichst du einen D-Typ (dominant) Kunden an?',
      back: 'Direkt, ergebnisorientiert und mit Fokus auf Erfolge. Zeige die wichtigsten Vorteile, vermeide Smalltalk.',
      difficulty: 'Schwer'
    },
    {
      front: 'Wie sprichst du einen C-Typ (gewissenhaft) Kunden an?',
      back: 'Mit genauen Fakten, Daten und logischen Argumenten. C-Typen treffen Entscheidungen basierend auf Daten, nicht auf Emotionen.',
      difficulty: 'Schwer'
    },
    {
      front: 'Was sind Implication Questions?',
      back: 'Fragen, die die Folgen des Problems für den Kunden aufzeigen. Sie helfen, die Dringlichkeit zu erhöhen.',
      difficulty: 'Mittel'
    },
    {
      front: 'Was sind Need-Payoff Questions?',
      back: 'Fragen, die den Kunden selbst die Vorteile einer Lösung beschreiben lassen. Der Kunde wird zum Verkäufer seiner eigenen Entscheidung.',
      difficulty: 'Mittel'
    },
    {
      front: 'Was sind Funnel-Fragen?',
      back: 'Fragen, die vom Allgemeinen zum Spezifischen führen. Du beginnst breit und verengst dann schrittweise zu Details.',
      difficulty: 'Mittel'
    },
    {
      front: 'Was ist Wert-Kommunikation?',
      back: 'Den Fokus auf Nutzen und Mehrwert legen, nicht auf den Preis. Der Kunde kauft die Lösung für sein Problem, nicht den Preis.',
      difficulty: 'Mittel'
    },
    {
      front: 'Wie behandelst du einen Zeit-Einwand?',
      back: 'Durch gezieltes Nachfragen ("Was genau möchten Sie sich noch überlegen?"). Zeit-Einwände sind oft versteckte Bedenken.',
      difficulty: 'Mittel'
    },
    {
      front: 'Was ist eine Leading Question?',
      back: 'Eine Frage, die den Kunden in eine bestimmte Richtung lenkt. Kann manipulativ wirken, wenn nicht vorsichtig eingesetzt.',
      difficulty: 'Mittel'
    },
    {
      front: 'Was ist eine Clarifying Question?',
      back: 'Eine Frage, die Unklarheiten beseitigt und Missverständnisse vermeidet. Wichtig für effektive Kommunikation.',
      difficulty: 'Einfach'
    },
    {
      front: 'Was ist eine Trial Close Question?',
      back: 'Eine Frage, die die Kaufbereitschaft testet, ohne direkt zu schließen. Beispiel: "Wenn der Preis passt, würden Sie dann zustimmen?"',
      difficulty: 'Mittel'
    },
    {
      front: 'Was ist eine Pain Question?',
      back: 'Eine Frage, die Schmerzpunkte und Herausforderungen identifiziert. Hilft, den Bedarf zu verstehen.',
      difficulty: 'Einfach'
    },
    {
      front: 'Was ist eine Benefit Question?',
      back: 'Eine Frage, die den Nutzen einer Lösung erfragt oder kommuniziert. Hilft, den Wert zu verstehen.',
      difficulty: 'Mittel'
    },
    {
      front: 'Was ist eine Commitment Question?',
      back: 'Eine Frage, die eine Zusage oder Verpflichtung testet. Beispiel: "Sind Sie bereit, nächste Woche zu starten?"',
      difficulty: 'Mittel'
    },
    {
      front: 'Was ist eine Discovery Question?',
      back: 'Eine Frage, die Informationen über den Kunden und seine Situation sammelt. Basis für jede Verkaufsstrategie.',
      difficulty: 'Einfach'
    },
    {
      front: 'Was ist eine Qualifying Question?',
      back: 'Eine Frage, die prüft, ob der Lead kaufbereit ist. Teil des BANT-Modells oder ähnlicher Qualifizierungsmodelle.',
      difficulty: 'Einfach'
    },
    {
      front: 'Was ist eine Objection Prevention Question?',
      back: 'Eine Frage, die Einwände verhindert, bevor sie entstehen. Deckt Bedenken früh auf.',
      difficulty: 'Mittel'
    },
    {
      front: 'Was ist eine Value Question?',
      back: 'Eine Frage, die den Wert einer Lösung erfragt oder kommuniziert. Hilft, den ROI zu verstehen.',
      difficulty: 'Mittel'
    },
    {
      front: 'Was ist eine Follow-up Question?',
      back: 'Eine Frage, die auf eine vorherige Antwort aufbaut und das Verständnis vertieft. Zeigt aktives Zuhören.',
      difficulty: 'Einfach'
    },
    {
      front: 'Was ist eine Objection Handling Question?',
      back: 'Eine Frage, die einen Einwand behandelt, indem sie nachfragt und klärt. Beispiel: "Teuer im Vergleich zu was?"',
      difficulty: 'Mittel'
    },
    {
      front: 'Was ist eine Assumptive Question?',
      back: 'Eine Frage, die eine Annahme enthält und den Kunden in eine Richtung lenkt. Kann nützlich sein, aber auch manipulativ wirken.',
      difficulty: 'Mittel'
    },
    {
      front: 'Wie sprichst du einen I-Typ (influencing) Kunden an?',
      back: 'Mit Storys, Emotionen und persönlicher Verbindung. I-Typen reagieren auf Begeisterung und soziale Interaktion.',
      difficulty: 'Schwer'
    },
    {
      front: 'Wie sprichst du einen S-Typ (steadiness) Kunden an?',
      back: 'Mit Sicherheit, Beständigkeit und sanften Übergängen. S-Typen brauchen Zeit und Vertrauen für Veränderungen.',
      difficulty: 'Schwer'
    },
    {
      front: 'Was ist der Unterschied zwischen Situation und Problem Questions?',
      back: 'Situation Questions erfragen Fakten über den aktuellen Zustand. Problem Questions identifizieren Schmerzpunkte und Herausforderungen.',
      difficulty: 'Mittel'
    },
    {
      front: 'Was ist der Unterschied zwischen Implication und Need-Payoff Questions?',
      back: 'Implication Questions zeigen die Folgen des Problems. Need-Payoff Questions lassen den Kunden selbst die Vorteile beschreiben.',
      difficulty: 'Mittel'
    },
    {
      front: 'Was ist ROI-Kommunikation?',
      back: 'Den Return on Investment konkret berechnen und zeigen. Hilft, den Wert einer Investition zu verstehen.',
      difficulty: 'Mittel'
    },
    {
      front: 'Was ist Wert-Kommunikation vs. Preis-Kommunikation?',
      back: 'Wert-Kommunikation fokussiert auf Nutzen und Mehrwert. Preis-Kommunikation fokussiert nur auf den Preis – weniger überzeugend.',
      difficulty: 'Mittel'
    },
    {
      front: 'Was ist sozialer Beweis (Social Proof)?',
      back: 'Menschen orientieren sich am Verhalten anderer. Referenzen, Bewertungen und Erfolgsgeschichten reduzieren das wahrgenommene Risiko.',
      difficulty: 'Mittel'
    },
    {
      front: 'Was ist Reziprozität im Verkauf?',
      back: 'Menschen fühlen sich verpflichtet, eine Gefälligkeit zu erwidern. Wenn du dem Kunden Mehrwert bietest, steigt die Kaufbereitschaft.',
      difficulty: 'Mittel'
    },
    {
      front: 'Was bedeutet Knappheit im Verkauf?',
      back: 'Produkte erscheinen wertvoller, wenn sie begrenzt verfügbar sind. Wichtig: Es muss authentisch sein, nicht künstlich erzeugt.',
      difficulty: 'Mittel'
    },
    {
      front: 'Was ist Commitment und Konsistenz?',
      back: 'Menschen handeln konsistent mit früheren Zusagen. Kleine Zusagen führen zu größeren Zusagen.',
      difficulty: 'Schwer'
    },
    {
      front: 'Was ist Autorität im Verkauf?',
      back: 'Menschen folgen Experten. Zeige Expertise durch Zertifikate, Erfahrung oder Fachwissen.',
      difficulty: 'Mittel'
    },
    {
      front: 'Was ist Sympathie im Verkauf?',
      back: 'Menschen kaufen eher von Menschen, die sie mögen. Baue echte Beziehungen auf, nicht nur geschäftliche.',
      difficulty: 'Mittel'
    },
    {
      front: 'Was ist der Unterschied zwischen Bedarf und Bedürfnis?',
      back: 'Bedarf ist objektiv (z. B. ein Problem). Bedürfnis ist subjektiv (z. B. ein Wunsch). Beide sind wichtig für den Verkauf.',
      difficulty: 'Mittel'
    },
    {
      front: 'Was ist der Unterschied zwischen Features und Benefits?',
      back: 'Features sind Produkteigenschaften. Benefits sind der Nutzen für den Kunden. Verkaufe Benefits, nicht Features.',
      difficulty: 'Einfach'
    },
    {
      front: 'Was ist der Unterschied zwischen Werten und Preisen?',
      back: 'Preis ist, was der Kunde zahlt. Wert ist, was der Kunde bekommt. Verkaufe den Wert, nicht den Preis.',
      difficulty: 'Einfach'
    },
    {
      front: 'Was ist der Unterschied zwischen Einwand und Bedenken?',
      back: 'Einwände sind geäußerte Bedenken. Bedenken können auch unausgesprochen sein. Beide müssen behandelt werden.',
      difficulty: 'Mittel'
    },
    {
      front: 'Was ist der Unterschied zwischen Qualifizierung und Disqualifizierung?',
      back: 'Qualifizierung prüft, ob ein Lead kaufbereit ist. Disqualifizierung erkennt, wenn ein Lead nicht kaufbereit ist – spart Zeit.',
      difficulty: 'Mittel'
    },
    {
      front: 'Was ist der Unterschied zwischen Abschluss und Verhandlung?',
      back: 'Abschluss ist die finale Entscheidung. Verhandlung ist der Prozess, die Bedingungen zu klären. Beide sind wichtig.',
      difficulty: 'Mittel'
    },
    {
      front: 'Was ist der Unterschied zwischen Verkauf und Beratung?',
      back: 'Verkauf fokussiert auf den Verkauf. Beratung fokussiert auf den Kunden und seine Bedürfnisse. Beratung ist langfristig erfolgreicher.',
      difficulty: 'Mittel'
    },
    {
      front: 'Was ist der Unterschied zwischen Push und Pull im Verkauf?',
      back: 'Push drängt den Kunden zum Kauf. Pull zieht den Kunden durch Wert und Nutzen. Pull ist nachhaltiger.',
      difficulty: 'Mittel'
    },
    {
      front: 'Was ist der Unterschied zwischen Transaktion und Beziehung?',
      back: 'Transaktion ist ein einmaliger Verkauf. Beziehung ist langfristige Kundenbindung. Beziehungen sind wertvoller.',
      difficulty: 'Einfach'
    },
    {
      front: 'Was ist der Unterschied zwischen B2B und B2C Verkauf?',
      back: 'B2B verkauft an Unternehmen (längerer Prozess, mehrere Entscheider). B2C verkauft an Endkunden (schnellerer Prozess, einzelner Entscheider).',
      difficulty: 'Einfach'
    },
    {
      front: 'Was ist der Unterschied zwischen Inside und Outside Sales?',
      back: 'Inside Sales verkauft telefonisch oder online. Outside Sales verkauft persönlich. Beide haben ihre Vorteile.',
      difficulty: 'Einfach'
    },
    {
      front: 'Was ist der Unterschied zwischen Lead und Prospect?',
      back: 'Lead ist ein potenzieller Kunde. Prospect ist ein qualifizierter Lead. Qualifizierung ist wichtig.',
      difficulty: 'Einfach'
    },
    {
      front: 'Was ist der Unterschied zwischen Pipeline und Funnel?',
      back: 'Pipeline zeigt den Verkaufsprozess. Funnel zeigt die Konversion von Leads zu Kunden. Beide sind wichtig für das Management.',
      difficulty: 'Mittel'
    },
    {
      front: 'Was ist der Unterschied zwischen Conversion Rate und Close Rate?',
      back: 'Conversion Rate zeigt, wie viele Leads zu Kunden werden. Close Rate zeigt, wie viele Angebote zu Verkäufen werden.',
      difficulty: 'Mittel'
    },
    {
      front: 'Was ist der Unterschied zwischen ACV und ARR?',
      back: 'ACV (Annual Contract Value) ist der jährliche Vertragswert. ARR (Annual Recurring Revenue) ist wiederkehrende Einnahmen. Beide sind wichtig für SaaS.',
      difficulty: 'Schwer'
    },
    {
      front: 'Was ist der Unterschied zwischen Upsell und Cross-Sell?',
      back: 'Upsell verkauft eine höhere Version. Cross-Sell verkauft zusätzliche Produkte. Beide steigern den Wert.',
      difficulty: 'Einfach'
    },
    {
      front: 'Was ist der Unterschied zwischen Churn und Retention?',
      back: 'Churn ist Kundenverlust. Retention ist Kundenbindung. Retention ist wichtiger als Neukundengewinnung.',
      difficulty: 'Mittel'
    },
    {
      front: 'Was ist der Unterschied zwischen LTV und CAC?',
      back: 'LTV (Lifetime Value) ist der Kundenwert über die Zeit. CAC (Customer Acquisition Cost) sind die Akquisekosten. LTV sollte höher sein als CAC.',
      difficulty: 'Schwer'
    },
    {
      front: 'Was ist der Unterschied zwischen Qualifizierung und Disqualifizierung?',
      back: 'Qualifizierung prüft, ob ein Lead kaufbereit ist. Disqualifizierung erkennt, wenn ein Lead nicht kaufbereit ist – spart Zeit.',
      difficulty: 'Mittel'
    },
    {
      front: 'Was ist der Unterschied zwischen Cold Call und Warm Call?',
      back: 'Cold Call ist ein Anruf ohne Vorwarnung. Warm Call ist ein Anruf nach Vorbereitung. Warm Calls sind erfolgreicher.',
      difficulty: 'Einfach'
    },
    {
      front: 'Was ist der Unterschied zwischen Pitch und Präsentation?',
      back: 'Pitch ist kurz und prägnant. Präsentation ist ausführlich und detailliert. Beide haben ihren Platz.',
      difficulty: 'Einfach'
    },
    {
      front: 'Was ist der Unterschied zwischen Demo und Trial?',
      back: 'Demo zeigt das Produkt. Trial lässt den Kunden es testen. Beide sind wichtig für den Verkauf.',
      difficulty: 'Einfach'
    },
    {
      front: 'Was ist der Unterschied zwischen Proposal und Quote?',
      back: 'Proposal ist ein detailliertes Angebot. Quote ist ein Preisangebot. Beide sind wichtig für den Abschluss.',
      difficulty: 'Einfach'
    },
    {
      front: 'Was ist der Unterschied zwischen Negotiation und Closing?',
      back: 'Negotiation klärt die Bedingungen. Closing ist die finale Entscheidung. Beide sind Teil des Verkaufsprozesses.',
      difficulty: 'Mittel'
    },
    {
      front: 'Was ist der Unterschied zwischen Objection und Stalling?',
      back: 'Objection ist ein geäußerter Einwand. Stalling ist Verzögerung ohne klaren Grund. Beide müssen behandelt werden.',
      difficulty: 'Mittel'
    },
    {
      front: 'Was ist der Unterschied zwischen Need und Want?',
      back: 'Need ist objektiv notwendig. Want ist subjektiv gewünscht. Beide sind wichtig für den Verkauf.',
      difficulty: 'Einfach'
    },
    {
      front: 'Was ist der Unterschied zwischen Pain und Gain?',
      back: 'Pain ist der Schmerz des Problems. Gain ist der Nutzen der Lösung. Beide motivieren den Kauf.',
      difficulty: 'Einfach'
    },
    {
      front: 'Was ist der Unterschied zwischen Feature und Benefit?',
      back: 'Feature ist eine Produkteigenschaft. Benefit ist der Nutzen für den Kunden. Verkaufe Benefits, nicht Features.',
      difficulty: 'Einfach'
    },
    {
      front: 'Was ist der Unterschied zwischen Price und Value?',
      back: 'Price ist, was der Kunde zahlt. Value ist, was der Kunde bekommt. Verkaufe den Value, nicht den Price.',
      difficulty: 'Einfach'
    },
    {
      front: 'Was ist der Unterschied zwischen Cost und Investment?',
      back: 'Cost ist eine Ausgabe. Investment ist eine Investition mit ROI. Positioniere es als Investment, nicht als Cost.',
      difficulty: 'Mittel'
    },
    {
      front: 'Was ist der Unterschied zwischen Sale und Relationship?',
      back: 'Sale ist ein einmaliger Verkauf. Relationship ist langfristige Kundenbindung. Relationships sind wertvoller.',
      difficulty: 'Einfach'
    },
    {
      front: 'Was ist der Unterschied zwischen Push und Pull?',
      back: 'Push drängt den Kunden zum Kauf. Pull zieht den Kunden durch Wert und Nutzen. Pull ist nachhaltiger.',
      difficulty: 'Mittel'
    },
    {
      front: 'Was ist der Unterschied zwischen Transaction und Relationship?',
      back: 'Transaction ist ein einmaliger Verkauf. Relationship ist langfristige Kundenbindung. Relationships sind wertvoller.',
      difficulty: 'Einfach'
    },
    {
      front: 'Was ist der Unterschied zwischen B2B und B2C?',
      back: 'B2B verkauft an Unternehmen (längerer Prozess, mehrere Entscheider). B2C verkauft an Endkunden (schnellerer Prozess, einzelner Entscheider).',
      difficulty: 'Einfach'
    },
    {
      front: 'Was ist der Unterschied zwischen Inside und Outside Sales?',
      back: 'Inside Sales verkauft telefonisch oder online. Outside Sales verkauft persönlich. Beide haben ihre Vorteile.',
      difficulty: 'Einfach'
    },
    {
      front: 'Was ist der Unterschied zwischen Lead und Prospect?',
      back: 'Lead ist ein potenzieller Kunde. Prospect ist ein qualifizierter Lead. Qualifizierung ist wichtig.',
      difficulty: 'Einfach'
    },
    {
      front: 'Was ist der Unterschied zwischen Pipeline und Funnel?',
      back: 'Pipeline zeigt den Verkaufsprozess. Funnel zeigt die Konversion von Leads zu Kunden. Beide sind wichtig für das Management.',
      difficulty: 'Mittel'
    },
    {
      front: 'Was ist der Unterschied zwischen Conversion Rate und Close Rate?',
      back: 'Conversion Rate zeigt, wie viele Leads zu Kunden werden. Close Rate zeigt, wie viele Angebote zu Verkäufen werden.',
      difficulty: 'Mittel'
    },
    {
      front: 'Was ist der Unterschied zwischen ACV und ARR?',
      back: 'ACV (Annual Contract Value) ist der jährliche Vertragswert. ARR (Annual Recurring Revenue) ist wiederkehrende Einnahmen. Beide sind wichtig für SaaS.',
      difficulty: 'Schwer'
    },
    {
      front: 'Was ist der Unterschied zwischen Upsell und Cross-Sell?',
      back: 'Upsell verkauft eine höhere Version. Cross-Sell verkauft zusätzliche Produkte. Beide steigern den Wert.',
      difficulty: 'Einfach'
    },
    {
      front: 'Was ist der Unterschied zwischen Churn und Retention?',
      back: 'Churn ist Kundenverlust. Retention ist Kundenbindung. Retention ist wichtiger als Neukundengewinnung.',
      difficulty: 'Mittel'
    },
    {
      front: 'Was ist der Unterschied zwischen LTV und CAC?',
      back: 'LTV (Lifetime Value) ist der Kundenwert über die Zeit. CAC (Customer Acquisition Cost) sind die Akquisekosten. LTV sollte höher sein als CAC.',
      difficulty: 'Schwer'
    }
  ]
  
  // Rollenspiel-Szenarien
  const roleplayScenarios = [
    {
      title: 'Preis-Einwand bei C-Typ',
      scenario: 'Kunde lehnt wegen Preis ab',
      customerType: 'C-Typ (analytisch)',
      situation: '„Ihr Angebot ist zu teuer im Vergleich zur Konkurrenz."',
      options: [
        { text: '„Dann kaufen Sie dort."', correct: false, feedback: 'Zu passiv. C-Typen brauchen Daten und Vergleiche.' },
        { text: '„Was genau vergleichen Sie?"', correct: true, feedback: 'Sehr gut – C-Typen reagieren auf logische Vergleiche, keine Emotionen.' },
        { text: '„Wir machen denselben Preis."', correct: false, feedback: 'Preis ist nicht alles. Zeige den Mehrwert mit Fakten.' }
      ]
    },
    {
      title: 'Zeit-Einwand bei D-Typ',
      scenario: 'Geschäftsführer hat wenig Zeit',
      customerType: 'D-Typ (dominant, ergebnisorientiert)',
      situation: '„Ich habe nur 10 Minuten. Warum sollte ich gerade mit Ihnen sprechen?"',
      options: [
        { text: '„Dann verschieben wir das Gespräch."', correct: false, feedback: 'D-Typen respektieren deine Zeit, wenn du direkt zum Punkt kommst.' },
        { text: '„In 2 Minuten zeige ich Ihnen, wie Sie 20% mehr Umsatz machen."', correct: true, feedback: 'Perfekt! D-Typen wollen Ergebnisse, keine langen Erklärungen.' },
        { text: '„Ich erzähle Ihnen erst mal etwas über unsere Firma."', correct: false, feedback: 'Zu langsam. D-Typen wollen sofort den Nutzen sehen.' }
      ]
    },
    {
      title: 'Vertrauens-Einwand bei I-Typ',
      scenario: 'Kunde kennt deine Firma nicht',
      customerType: 'I-Typ (influencing, kommunikativ)',
      situation: '„Ich habe noch nie von Ihrer Firma gehört. Wie kann ich Ihnen vertrauen?"',
      options: [
        { text: '„Wir sind sehr zuverlässig."', correct: false, feedback: 'Zu abstrakt. I-Typen brauchen konkrete, emotionale Beispiele.' },
        { text: '„Darf ich Ihnen zeigen, wie ähnliche Kunden erfolgreich mit uns arbeiten? Hier ist eine Erfolgsgeschichte..."', correct: true, feedback: 'Sehr gut! I-Typen reagieren auf Storys und emotionale Verbindungen.' },
        { text: '„Sie können uns im Internet recherchieren."', correct: false, feedback: 'Zu passiv. I-Typen wollen persönliche Verbindung und Storys.' }
      ]
    },
    {
      title: 'Konkurrenz-Einwand bei S-Typ',
      scenario: 'Kunde erwähnt Mitbewerber',
      customerType: 'S-Typ (steadiness, beständig, teamorientiert)',
      situation: '„Wir arbeiten schon seit Jahren mit Firma XY zusammen. Warum sollten wir wechseln?"',
      options: [
        { text: '„Die sind schlechter als wir."', correct: false, feedback: 'S-Typen schätzen Beständigkeit. Kritik an bestehenden Partnern wirkt negativ.' },
        { text: '„Ich verstehe, dass Sie eine langjährige Beziehung haben. Darf ich Ihnen zeigen, wie andere Kunden beide Lösungen kombinieren?"', correct: true, feedback: 'Perfekt! S-Typen brauchen Sicherheit und sanfte Übergänge, keine abrupten Wechsel.' },
        { text: '„Sie müssen sofort wechseln."', correct: false, feedback: 'Zu aggressiv. S-Typen brauchen Zeit und Vertrauen für Veränderungen.' }
      ]
    },
    {
      title: 'BANT-Qualifizierung im Erstgespräch',
      scenario: 'Neuer Lead, unklare Situation',
      customerType: 'Unbekannt',
      situation: '„Wir interessieren uns für Ihre Lösung, aber ich bin mir nicht sicher, ob das passt."',
      options: [
        { text: '„Dann machen wir einfach ein Angebot."', correct: false, feedback: 'Ohne Qualifizierung verschwendest du Zeit. Prüfe zuerst BANT.' },
        { text: '„Lassen Sie uns das gemeinsam prüfen. Haben Sie bereits ein Budget dafür eingeplant?"', correct: true, feedback: 'Sehr gut! Beginne mit BANT-Qualifizierung, um zu prüfen, ob der Lead wirklich kaufbereit ist.' },
        { text: '„Ich schicke Ihnen einfach die Broschüre."', correct: false, feedback: 'Zu passiv. Aktive Qualifizierung spart Zeit und zeigt Kompetenz.' }
      ]
    },
    {
      title: 'Preis-Einwand bei I-Typ',
      scenario: 'Kommunikativer Kunde lehnt wegen Preis ab',
      customerType: 'I-Typ (influencing, kommunikativ)',
      situation: '„Das ist mir zu teuer. Ich habe schon so viel ausgegeben."',
      options: [
        { text: '„Dann können wir nichts machen."', correct: false, feedback: 'I-Typen reagieren auf Emotionen und Storys, nicht auf Preis allein.' },
        { text: '„Verstehe. Lassen Sie mich Ihnen zeigen, wie andere Kunden mit ähnlicher Situation den ROI gesehen haben – hier ist eine Erfolgsgeschichte..."', correct: true, feedback: 'Perfekt! I-Typen reagieren auf Storys und emotionale Verbindungen, nicht nur auf Zahlen.' },
        { text: '„Das ist unser Preis."', correct: false, feedback: 'Zu starr. I-Typen brauchen persönliche Verbindung und Storys.' }
      ]
    },
    {
      title: 'Zeit-Einwand bei S-Typ',
      scenario: 'Beständiger Kunde braucht mehr Zeit',
      customerType: 'S-Typ (steadiness, beständig)',
      situation: '„Ich brauche mehr Zeit, um das mit meinem Team zu besprechen."',
      options: [
        { text: '„Sie müssen sich jetzt entscheiden."', correct: false, feedback: 'Zu aggressiv. S-Typen brauchen Zeit und Vertrauen für Entscheidungen.' },
        { text: '„Natürlich. Wie kann ich Ihnen und Ihrem Team dabei helfen? Ich kann Materialien bereitstellen oder an einem Meeting teilnehmen."', correct: true, feedback: 'Sehr gut! S-Typen schätzen Unterstützung und sanfte Übergänge.' },
        { text: '„Dann rufe ich später an."', correct: false, feedback: 'Zu passiv. Biete aktive Unterstützung an.' }
      ]
    },
    {
      title: 'Vertrauens-Einwand bei D-Typ',
      scenario: 'Dominanter Kunde zweifelt an Kompetenz',
      customerType: 'D-Typ (dominant, ergebnisorientiert)',
      situation: '„Ich kenne Ihre Firma nicht. Warum sollte ich Ihnen vertrauen?"',
      options: [
        { text: '„Wir sind sehr zuverlässig."', correct: false, feedback: 'Zu abstrakt. D-Typen wollen konkrete Ergebnisse und Zahlen.' },
        { text: '„Hier sind drei Referenzen mit ähnlichen Herausforderungen. Alle haben ihre Ziele in 6 Monaten erreicht."', correct: true, feedback: 'Perfekt! D-Typen reagieren auf konkrete Ergebnisse und Erfolge, nicht auf Versprechen.' },
        { text: '„Sie können uns im Internet recherchieren."', correct: false, feedback: 'Zu passiv. D-Typen wollen direkte, konkrete Antworten.' }
      ]
    },
    {
      title: 'Konkurrenz-Einwand bei C-Typ',
      scenario: 'Analytischer Kunde vergleicht mit Konkurrenz',
      customerType: 'C-Typ (gewissenhaft, analytisch)',
      situation: '„Ihr Mitbewerber bietet mehr Features zum gleichen Preis."',
      options: [
        { text: '„Die sind schlechter als wir."', correct: false, feedback: 'C-Typen wollen Fakten, nicht Meinungen. Kritik wirkt unprofessionell.' },
        { text: '„Lassen Sie uns die Features vergleichen. Hier ist eine detaillierte Analyse, die zeigt, wo wir überlegen sind."', correct: true, feedback: 'Sehr gut! C-Typen reagieren auf Daten, Vergleiche und logische Argumente.' },
        { text: '„Wir machen denselben Preis."', correct: false, feedback: 'Zu einfach. C-Typen wollen detaillierte Vergleiche und Fakten.' }
      ]
    },
    {
      title: 'Budget-Einwand bei I-Typ',
      scenario: 'Kommunikativer Kunde sagt, kein Budget zu haben',
      customerType: 'I-Typ (influencing, kommunikativ)',
      situation: '„Das klingt gut, aber wir haben kein Budget dafür."',
      options: [
        { text: '„Dann können wir nichts machen."', correct: false, feedback: 'I-Typen reagieren auf Emotionen und Storys, nicht auf starre Antworten.' },
        { text: '„Verstehe. Lassen Sie mich Ihnen zeigen, wie andere Kunden das Budget gefunden haben – oft gibt es kreative Lösungen."', correct: true, feedback: 'Perfekt! I-Typen reagieren auf Storys und kreative Lösungen, nicht nur auf Budget.' },
        { text: '„Dann müssen Sie das Budget finden."', correct: false, feedback: 'Zu direkt. I-Typen brauchen Unterstützung und Storys.' }
      ]
    },
    {
      title: 'Komplexitäts-Einwand bei S-Typ',
      scenario: 'Beständiger Kunde fürchtet Veränderung',
      customerType: 'S-Typ (steadiness, beständig)',
      situation: '„Das ist zu komplex. Wir sind mit unserer aktuellen Lösung zufrieden."',
      options: [
        { text: '„Dann bleiben Sie bei Ihrer alten Lösung."', correct: false, feedback: 'Zu passiv. S-Typen brauchen sanfte Übergänge und Sicherheit.' },
        { text: '„Ich verstehe, dass Veränderung herausfordernd sein kann. Lassen Sie mich Ihnen zeigen, wie wir andere Kunden bei der Umstellung unterstützt haben – Schritt für Schritt."', correct: true, feedback: 'Sehr gut! S-Typen brauchen Sicherheit, sanfte Übergänge und Unterstützung.' },
        { text: '„Sie müssen sich ändern."', correct: false, feedback: 'Zu aggressiv. S-Typen brauchen Zeit und Vertrauen für Veränderungen.' }
      ]
    },
    {
      title: 'ROI-Einwand bei C-Typ',
      scenario: 'Analytischer Kunde sieht keinen ROI',
      customerType: 'C-Typ (gewissenhaft, analytisch)',
      situation: '„Ich sehe nicht, wie sich das rechnet. Der ROI ist nicht klar."',
      options: [
        { text: '„Doch, der ROI ist gut."', correct: false, feedback: 'Zu vage. C-Typen wollen konkrete Zahlen und Berechnungen.' },
        { text: '„Lassen Sie uns das gemeinsam berechnen. Hier ist eine detaillierte ROI-Analyse basierend auf Ihren Zahlen."', correct: true, feedback: 'Perfekt! C-Typen reagieren auf konkrete Daten, Berechnungen und logische Argumente.' },
        { text: '„Sie müssen mir vertrauen."', correct: false, feedback: 'Zu emotional. C-Typen wollen Fakten, nicht Vertrauen allein.' }
      ]
    },
    {
      title: 'Implementierungs-Einwand bei D-Typ',
      scenario: 'Dominanter Kunde fürchtet Zeitaufwand',
      customerType: 'D-Typ (dominant, ergebnisorientiert)',
      situation: '„Die Implementierung dauert zu lange. Ich brauche schnelle Ergebnisse."',
      options: [
        { text: '„Das dauert halt so lange."', correct: false, feedback: 'Zu passiv. D-Typen wollen konkrete Lösungen und schnelle Ergebnisse.' },
        { text: '„Wir können in 2 Wochen erste Ergebnisse liefern. Hier ist ein Phasenplan mit konkreten Meilensteinen."', correct: true, feedback: 'Sehr gut! D-Typen reagieren auf konkrete Pläne, Meilensteine und schnelle Ergebnisse.' },
        { text: '„Sie müssen geduldig sein."', correct: false, feedback: 'Zu langsam. D-Typen wollen sofortige Ergebnisse und klare Pläne.' }
      ]
    },
    {
      title: 'Feature-Einwand bei I-Typ',
      scenario: 'Kommunikativer Kunde will mehr Features',
      customerType: 'I-Typ (influencing, kommunikativ)',
      situation: '„Das klingt gut, aber ich brauche noch mehr Features."',
      options: [
        { text: '„Das haben wir nicht."', correct: false, feedback: 'Zu starr. I-Typen reagieren auf Flexibilität und kreative Lösungen.' },
        { text: '„Lassen Sie mich Ihnen zeigen, wie wir ähnliche Anforderungen erfüllt haben. Wir können das anpassen – hier sind Beispiele..."', correct: true, feedback: 'Perfekt! I-Typen reagieren auf Storys, Beispiele und flexible Lösungen.' },
        { text: '„Das ist unser Standard."', correct: false, feedback: 'Zu starr. I-Typen brauchen persönliche Anpassung und Storys.' }
      ]
    },
    {
      title: 'Support-Einwand bei S-Typ',
      scenario: 'Beständiger Kunde fürchtet mangelnden Support',
      customerType: 'S-Typ (steadiness, beständig)',
      situation: '„Was ist, wenn wir Probleme haben? Ich brauche zuverlässigen Support."',
      options: [
        { text: '„Unser Support ist gut."', correct: false, feedback: 'Zu vage. S-Typen brauchen konkrete Beispiele und Sicherheit.' },
        { text: '„Ich verstehe Ihre Sorge. Lassen Sie mich Ihnen zeigen, wie unser Support funktioniert – hier sind konkrete Beispiele und Garantien."', correct: true, feedback: 'Sehr gut! S-Typen brauchen Sicherheit, konkrete Beispiele und Garantien.' },
        { text: '„Sie müssen uns vertrauen."', correct: false, feedback: 'Zu abstrakt. S-Typen brauchen konkrete Beweise und Sicherheit.' }
      ]
    },
    {
      title: 'Preisverhandlung bei C-Typ',
      scenario: 'Analytischer Kunde verhandelt hart',
      customerType: 'C-Typ (gewissenhaft, analytisch)',
      situation: '„Ihr Preis ist 20% höher als die Konkurrenz. Warum sollte ich das zahlen?"',
      options: [
        { text: '„Das ist unser Preis."', correct: false, feedback: 'Zu starr. C-Typen wollen detaillierte Vergleiche und Begründungen.' },
        { text: '„Lassen Sie uns die Gesamtkosten vergleichen – nicht nur den Preis. Hier ist eine detaillierte Analyse, die zeigt, warum wir langfristig günstiger sind."', correct: true, feedback: 'Perfekt! C-Typen reagieren auf detaillierte Analysen, Vergleiche und logische Argumente.' },
        { text: '„Wir sind besser."', correct: false, feedback: 'Zu vage. C-Typen wollen konkrete Daten und Vergleiche.' }
      ]
    },
    {
      title: 'Zeitdruck bei D-Typ',
      scenario: 'Dominanter Kunde hat wenig Zeit',
      customerType: 'D-Typ (dominant, ergebnisorientiert)',
      situation: '„Ich habe nur 5 Minuten. Zeigen Sie mir, warum ich mit Ihnen sprechen sollte."',
      options: [
        { text: '„Dann verschieben wir das Gespräch."', correct: false, feedback: 'Zu passiv. D-Typen respektieren deine Zeit, wenn du direkt zum Punkt kommst.' },
        { text: '„In 2 Minuten zeige ich Ihnen, wie Sie 30% Zeit sparen. Hier sind die drei wichtigsten Punkte..."', correct: true, feedback: 'Sehr gut! D-Typen wollen direkte, ergebnisorientierte Antworten, keine langen Erklärungen.' },
        { text: '„Ich erzähle Ihnen erst mal etwas über unsere Firma."', correct: false, feedback: 'Zu langsam. D-Typen wollen sofort den Nutzen sehen.' }
      ]
    },
    {
      title: 'Emotionaler Einwand bei I-Typ',
      scenario: 'Kommunikativer Kunde ist frustriert',
      customerType: 'I-Typ (influencing, kommunikativ)',
      situation: '„Ich habe schon so viele schlechte Erfahrungen gemacht. Warum sollte ich Ihnen vertrauen?"',
      options: [
        { text: '„Wir sind anders."', correct: false, feedback: 'Zu abstrakt. I-Typen brauchen emotionale Verbindung und Storys.' },
        { text: '„Das tut mir leid, dass Sie diese Erfahrungen gemacht haben. Lassen Sie mich Ihnen zeigen, wie wir anderen Kunden in ähnlicher Situation geholfen haben – hier ist eine Erfolgsgeschichte..."', correct: true, feedback: 'Perfekt! I-Typen reagieren auf Empathie, emotionale Verbindung und Erfolgsgeschichten.' },
        { text: '„Das war nicht unsere Schuld."', correct: false, feedback: 'Zu defensiv. I-Typen brauchen Empathie und Verständnis.' }
      ]
    },
    {
      title: 'Technischer Einwand bei C-Typ',
      scenario: 'Analytischer Kunde zweifelt an Technologie',
      customerType: 'C-Typ (gewissenhaft, analytisch)',
      situation: '„Ich bin nicht sicher, ob Ihre Technologie zuverlässig ist. Haben Sie Beweise?"',
      options: [
        { text: '„Ja, sie ist zuverlässig."', correct: false, feedback: 'Zu vage. C-Typen wollen konkrete Daten, Tests und Beweise.' },
        { text: '„Hier sind unabhängige Tests, Zertifikate und technische Dokumentation. Außerdem haben wir 99,9% Uptime bei 10.000+ Kunden."', correct: true, feedback: 'Sehr gut! C-Typen reagieren auf konkrete Daten, Tests und logische Beweise.' },
        { text: '„Sie müssen uns vertrauen."', correct: false, feedback: 'Zu emotional. C-Typen wollen Fakten, nicht Vertrauen allein.' }
      ]
    },
    {
      title: 'Team-Einwand bei S-Typ',
      scenario: 'Beständiger Kunde muss Team überzeugen',
      customerType: 'S-Typ (steadiness, beständig)',
      situation: '„Mein Team ist skeptisch. Sie mögen Veränderungen nicht."',
      options: [
        { text: '„Dann müssen Sie sie überzeugen."', correct: false, feedback: 'Zu direkt. S-Typen brauchen Unterstützung und sanfte Übergänge.' },
        { text: '„Ich verstehe. Lassen Sie mich Ihnen helfen, Ihr Team zu überzeugen. Ich kann an einem Meeting teilnehmen oder Materialien bereitstellen, die die Vorteile zeigen."', correct: true, feedback: 'Perfekt! S-Typen schätzen Unterstützung, Team-Orientierung und sanfte Übergänge.' },
        { text: '„Dann passt es nicht."', correct: false, feedback: 'Zu passiv. Biete aktive Unterstützung an.' }
      ]
    },
    {
      title: 'Skalierungs-Einwand bei D-Typ',
      scenario: 'Dominanter Kunde fürchtet Wachstumsgrenzen',
      customerType: 'D-Typ (dominant, ergebnisorientiert)',
      situation: '„Wird das mit unserem Wachstum mithalten? Ich brauche eine Lösung, die skaliert."',
      options: [
        { text: '„Ja, das wird funktionieren."', correct: false, feedback: 'Zu vage. D-Typen wollen konkrete Pläne und Beweise.' },
        { text: '„Absolut. Hier sind drei Kunden, die von 10 auf 1000 Mitarbeiter gewachsen sind. Hier ist der Skalierungsplan."', correct: true, feedback: 'Sehr gut! D-Typen reagieren auf konkrete Beispiele, Pläne und ergebnisorientierte Antworten.' },
        { text: '„Das sehen wir dann."', correct: false, feedback: 'Zu unklar. D-Typen wollen konkrete Pläne und Beweise.' }
      ]
    },
    {
      title: 'Integration-Einwand bei C-Typ',
      scenario: 'Analytischer Kunde fürchtet technische Probleme',
      customerType: 'C-Typ (gewissenhaft, analytisch)',
      situation: '„Wie integriert sich das mit unseren bestehenden Systemen? Ich brauche Details."',
      options: [
        { text: '„Das funktioniert schon."', correct: false, feedback: 'Zu vage. C-Typen wollen detaillierte technische Informationen.' },
        { text: '„Hier ist eine detaillierte Integrationsdokumentation mit API-Spezifikationen, Beispielen und einem Test-Plan. Wir unterstützen Sie bei der Implementierung."', correct: true, feedback: 'Perfekt! C-Typen reagieren auf detaillierte technische Dokumentation, Pläne und logische Argumente.' },
        { text: '„Das ist kompliziert."', correct: false, feedback: 'Zu negativ. C-Typen wollen Lösungen, nicht Probleme.' }
      ]
    },
    {
      title: 'Kosten-Einwand bei I-Typ',
      scenario: 'Kommunikativer Kunde fürchtet versteckte Kosten',
      customerType: 'I-Typ (influencing, kommunikativ)',
      situation: '„Ich fürchte, es gibt versteckte Kosten. Das ist mir schon passiert."',
      options: [
        { text: '„Nein, es gibt keine versteckten Kosten."', correct: false, feedback: 'Zu defensiv. I-Typen brauchen Transparenz und Storys.' },
        { text: '„Ich verstehe Ihre Sorge. Lassen Sie mich Ihnen eine vollständige Kostenaufstellung zeigen – alles transparent. Hier sind Beispiele von Kunden, die das bestätigen."', correct: true, feedback: 'Sehr gut! I-Typen reagieren auf Transparenz, Storys und emotionale Verbindung.' },
        { text: '„Das war nicht unsere Schuld."', correct: false, feedback: 'Zu defensiv. Zeige Empathie und Transparenz.' }
      ]
    },
    {
      title: 'Sicherheits-Einwand bei C-Typ',
      scenario: 'Analytischer Kunde fürchtet Sicherheitsrisiken',
      customerType: 'C-Typ (gewissenhaft, analytisch)',
      situation: '„Ich bin besorgt über Datensicherheit. Haben Sie Zertifikate?"',
      options: [
        { text: '„Ja, wir sind sicher."', correct: false, feedback: 'Zu vage. C-Typen wollen konkrete Zertifikate, Tests und Beweise.' },
        { text: '„Hier sind unsere ISO 27001, SOC 2 und GDPR-Zertifikate. Außerdem haben wir unabhängige Sicherheitsaudits durchgeführt."', correct: true, feedback: 'Perfekt! C-Typen reagieren auf konkrete Zertifikate, Audits und logische Beweise.' },
        { text: '„Sie müssen uns vertrauen."', correct: false, feedback: 'Zu emotional. C-Typen wollen Fakten, nicht Vertrauen allein.' }
      ]
    },
    {
      title: 'Change-Management bei S-Typ',
      scenario: 'Beständiger Kunde fürchtet Veränderung',
      customerType: 'S-Typ (steadiness, beständig)',
      situation: '„Wir haben schon so viele Veränderungen. Das ist zu viel für mein Team."',
      options: [
        { text: '„Dann bleiben Sie bei Ihrer alten Lösung."', correct: false, feedback: 'Zu passiv. S-Typen brauchen sanfte Übergänge und Unterstützung.' },
        { text: '„Ich verstehe. Lassen Sie mich Ihnen zeigen, wie wir andere Teams bei ähnlichen Situationen unterstützt haben – Schritt für Schritt, mit viel Unterstützung."', correct: true, feedback: 'Sehr gut! S-Typen brauchen Sicherheit, sanfte Übergänge und konkrete Unterstützung.' },
        { text: '„Sie müssen sich ändern."', correct: false, feedback: 'Zu aggressiv. S-Typen brauchen Zeit und Vertrauen für Veränderungen.' }
      ]
    },
    {
      title: 'ROI-Verhandlung bei D-Typ',
      scenario: 'Dominanter Kunde will schnellen ROI',
      customerType: 'D-Typ (dominant, ergebnisorientiert)',
      situation: '„Wie schnell sehe ich Ergebnisse? Ich brauche schnellen ROI."',
      options: [
        { text: '„Das dauert eine Weile."', correct: false, feedback: 'Zu vage. D-Typen wollen konkrete Zeitpläne und schnelle Ergebnisse.' },
        { text: '„In 30 Tagen sehen Sie erste Ergebnisse. Hier ist ein Phasenplan mit konkreten Meilensteinen und ROI-Projektionen."', correct: true, feedback: 'Perfekt! D-Typen reagieren auf konkrete Zeitpläne, Meilensteine und ergebnisorientierte Antworten.' },
        { text: '„Das sehen wir dann."', correct: false, feedback: 'Zu unklar. D-Typen wollen konkrete Pläne und schnelle Ergebnisse.' }
      ]
    },
    {
      title: 'Multi-Stakeholder bei I-Typ',
      scenario: 'Kommunikativer Kunde muss mehrere Personen überzeugen',
      customerType: 'I-Typ (influencing, kommunikativ)',
      situation: '„Ich muss das mit mehreren Kollegen besprechen. Sie sind alle skeptisch."',
      options: [
        { text: '„Dann besprechen Sie es."', correct: false, feedback: 'Zu passiv. I-Typen brauchen Unterstützung und Storys.' },
        { text: '„Lassen Sie mich Ihnen helfen. Ich kann an einem Meeting teilnehmen oder Materialien bereitstellen, die die Vorteile zeigen – mit Erfolgsgeschichten."', correct: true, feedback: 'Sehr gut! I-Typen reagieren auf Unterstützung, Storys und emotionale Verbindungen.' },
        { text: '„Dann passt es nicht."', correct: false, feedback: 'Zu passiv. Biete aktive Unterstützung an.' }
      ]
    },
    {
      title: 'Langfristigkeit bei C-Typ',
      scenario: 'Analytischer Kunde fürchtet langfristige Verpflichtung',
      customerType: 'C-Typ (gewissenhaft, analytisch)',
      situation: '„Ich bin nicht sicher, ob Sie langfristig bestehen bleiben. Was ist, wenn Sie pleite gehen?"',
      options: [
        { text: '„Das passiert nicht."', correct: false, feedback: 'Zu vage. C-Typen wollen konkrete Beweise und Daten.' },
        { text: '„Hier sind unsere Finanzzahlen, Investoren und Wachstumsdaten. Außerdem haben wir Exit-Strategien für den Fall, dass etwas passiert."', correct: true, feedback: 'Perfekt! C-Typen reagieren auf konkrete Daten, Finanzzahlen und logische Argumente.' },
        { text: '„Sie müssen uns vertrauen."', correct: false, feedback: 'Zu emotional. C-Typen wollen Fakten, nicht Vertrauen allein.' }
      ]
    }
  ]
  
  // Herausforderungen
  const challenges = [
    {
      title: 'Preisgespräch unter Zeitdruck',
      situation: 'Kunde: "Ich habe nur 5 Minuten – warum sollte ich gerade mit Ihnen sprechen?"',
      criteria: ['Klarheit', 'Nutzenargumentation', 'Empathie & Sicherheit']
    },
    {
      title: 'Preis-Einwand',
      situation: 'Kunde: "Das ist zu teuer. Ich kann das woanders günstiger bekommen."',
      criteria: ['Wert-Kommunikation', 'ROI-Argumentation', 'Unterschiede klar machen']
    },
    {
      title: 'Vertrauens-Einwand',
      situation: 'Kunde: "Ich kenne Ihre Firma nicht. Warum sollte ich Ihnen vertrauen?"',
      criteria: ['Vertrauensaufbau', 'Referenzen & Nachweise', 'Transparenz']
    },
    {
      title: 'Komplexer Einwand-Mix',
      situation: 'Kunde: "Das ist zu teuer, ich kenne Ihre Firma nicht, und außerdem muss ich erst noch mit meinem Team sprechen."',
      criteria: ['Priorisierung', 'Systematische Einwandbehandlung', 'Vertrauensaufbau']
    },
    {
      title: 'BANT-Qualifizierung in 3 Minuten',
      situation: 'Neuer Lead, unklare Situation. Du musst in 3 Minuten herausfinden, ob Budget, Authority, Need und Timeline vorhanden sind.',
      criteria: ['Effiziente Fragen', 'BANT-Abdeckung', 'Zeitmanagement']
    },
    {
      title: 'Wert-Kommunikation bei hohem Preis',
      situation: 'Premium-Produkt, deutlich teurer als Konkurrenz. Kunde sagt: "Das ist das Doppelte von Firma XY. Warum sollte ich das zahlen?"',
      criteria: ['ROI-Berechnung', 'Mehrwert-Kommunikation', 'Unterschiede klar machen']
    },
    {
      title: 'Multi-Stakeholder Verhandlung',
      situation: 'Du musst 5 verschiedene Stakeholder überzeugen, die alle unterschiedliche Prioritäten haben. Budget-Halter, Techniker, Endnutzer, Compliance und Geschäftsführung.',
      criteria: ['Stakeholder-Analyse', 'Anpassung der Argumentation', 'Konsens finden']
    },
    {
      title: 'Emotionaler Kunde nach schlechter Erfahrung',
      situation: 'Kunde ist sehr emotional und frustriert von vorherigen Anbietern. Er sagt: "Ich habe schon so viele schlechte Erfahrungen gemacht. Warum sollte ich Ihnen vertrauen?"',
      criteria: ['Empathie zeigen', 'Vertrauen aufbauen', 'Konkrete Lösungen anbieten']
    },
    {
      title: 'Technischer Einwand bei komplexem Produkt',
      situation: 'Kunde hat technische Bedenken: "Ich bin nicht sicher, ob das mit unseren Systemen funktioniert. Die Integration ist zu komplex."',
      criteria: ['Technische Expertise zeigen', 'Risiken adressieren', 'Lösungen anbieten']
    },
    {
      title: 'Zeitdruck und Dringlichkeit',
      situation: 'Kunde braucht eine Lösung in 2 Wochen, aber der normale Prozess dauert 6 Wochen. Du musst eine Lösung finden.',
      criteria: ['Kreativität', 'Ressourcen-Management', 'Erwartungen managen']
    },
    {
      title: 'Budget-Kürzung während Verhandlung',
      situation: 'Während der Verhandlung sagt der Kunde: "Unser Budget wurde um 30% gekürzt. Können Sie das anpassen?"',
      criteria: ['Flexibilität zeigen', 'Wert neu kommunizieren', 'Alternativen anbieten']
    },
    {
      title: 'Konkurrenz-Vergleich mit besserem Preis',
      situation: 'Kunde sagt: "Ihr Mitbewerber bietet das gleiche für 40% weniger. Warum sollte ich bei Ihnen kaufen?"',
      criteria: ['Unterschiede klar machen', 'Mehrwert kommunizieren', 'ROI zeigen']
    },
    {
      title: 'Interner Widerstand beim Kunden',
      situation: 'Dein Ansprechpartner ist überzeugt, aber sein Team ist skeptisch. Du musst das Team überzeugen.',
      criteria: ['Team-Dynamik verstehen', 'Bedenken adressieren', 'Konsens schaffen']
    },
    {
      title: 'Compliance und rechtliche Bedenken',
      situation: 'Kunde hat Compliance-Bedenken: "Ist das GDPR-konform? Was ist mit unseren rechtlichen Anforderungen?"',
      criteria: ['Rechtliche Expertise zeigen', 'Compliance nachweisen', 'Risiken adressieren']
    },
    {
      title: 'Skalierungs-Bedenken bei Wachstum',
      situation: 'Kunde sagt: "Wir wachsen schnell. Wird das mit unserem Wachstum mithalten? Was ist in 2 Jahren?"',
      criteria: ['Zukunftsvision zeigen', 'Skalierungsplan präsentieren', 'Langfristigkeit beweisen']
    },
    {
      title: 'Change-Management bei konservativem Kunden',
      situation: 'Kunde ist sehr konservativ und fürchtet Veränderung: "Wir haben das schon immer so gemacht. Warum sollten wir das ändern?"',
      criteria: ['Veränderungsresistenz adressieren', 'Sicherheit bieten', 'Sanfte Übergänge zeigen']
    },
    {
      title: 'ROI-Berechnung bei unklaren Metriken',
      situation: 'Kunde sagt: "Ich sehe nicht, wie sich das rechnet. Unsere Metriken sind anders als Ihre."',
      criteria: ['Metriken anpassen', 'ROI neu berechnen', 'Wert klar kommunizieren']
    },
    {
      title: 'Multi-Product Verkauf mit Cross-Sell',
      situation: 'Du musst mehrere Produkte verkaufen, aber der Kunde will nur eines. Wie überzeugst du ihn von der Kombination?',
      criteria: ['Synergien zeigen', 'Gesamtwert kommunizieren', 'Paket-Lösung präsentieren']
    },
    {
      title: 'Kundentyp-Mix in einem Meeting',
      situation: 'In einem Meeting sind D-Typ (Geschäftsführer), C-Typ (CTO), I-Typ (Marketing) und S-Typ (Operations). Alle müssen überzeugt werden.',
      criteria: ['Kundentypen erkennen', 'Anpassung der Kommunikation', 'Konsens finden']
    },
    {
      title: 'Preisverhandlung mit hartem Verhandler',
      situation: 'Kunde ist ein erfahrener Verhandler und drängt auf 50% Rabatt. Du musst den Wert halten.',
      criteria: ['Verhandlungstaktik', 'Wert kommunizieren', 'Grenzen setzen']
    },
    {
      title: 'Technische Integration bei Legacy-Systemen',
      situation: 'Kunde hat sehr alte Systeme: "Wie integriert sich das mit unseren 20 Jahre alten Systemen?"',
      criteria: ['Technische Expertise', 'Lösungen finden', 'Risiken minimieren']
    },
    {
      title: 'Security-Bedenken bei sensiblen Daten',
      situation: 'Kunde hat sehr sensible Daten: "Wie sicher ist das? Was ist, wenn es gehackt wird?"',
      criteria: ['Sicherheit nachweisen', 'Risiken adressieren', 'Vertrauen aufbauen']
    },
    {
      title: 'Zeit-Einwand bei langem Verkaufszyklus',
      situation: 'Kunde sagt: "Das dauert zu lange. Wir brauchen eine Lösung in 3 Monaten, nicht in 6."',
      criteria: ['Zeitplan optimieren', 'Prioritäten setzen', 'Phasen-Ansatz zeigen']
    },
    {
      title: 'Budget-Freigabe bei mehreren Entscheidern',
      situation: 'Du musst Budget von 3 verschiedenen Abteilungen bekommen. Jede hat andere Prioritäten.',
      criteria: ['Stakeholder-Management', 'Anpassung der Argumentation', 'Konsens schaffen']
    },
    {
      title: 'Feature-Anfrage außerhalb des Roadmaps',
      situation: 'Kunde will ein Feature, das nicht in der Roadmap ist: "Ich kaufe nur, wenn Sie Feature X hinzufügen."',
      criteria: ['Alternativen finden', 'Wert neu kommunizieren', 'Roadmap erklären']
    },
    {
      title: 'Kundentyp-Wechsel während Gespräch',
      situation: 'Zu Beginn ist der Kunde ein I-Typ, aber dann kommt der C-Typ Chef dazu. Du musst beide überzeugen.',
      criteria: ['Kundentypen erkennen', 'Kommunikation anpassen', 'Beide zufriedenstellen']
    },
    {
      title: 'ROI bei unklarem Use Case',
      situation: 'Kunde sagt: "Ich sehe nicht, wie das für uns funktioniert. Unser Use Case ist anders."',
      criteria: ['Use Case verstehen', 'ROI anpassen', 'Wert neu kommunizieren']
    },
    {
      title: 'Multi-Language und kulturelle Unterschiede',
      situation: 'Du verkaufst an ein internationales Team mit verschiedenen Sprachen und Kulturen. Alle müssen überzeugt werden.',
      criteria: ['Kulturelle Sensibilität', 'Anpassung der Kommunikation', 'Konsens finden']
    },
    {
      title: 'Verkauf während Krise beim Kunden',
      situation: 'Kunde hat gerade eine Krise (z. B. Datenleck, Systemausfall). Du musst helfen und gleichzeitig verkaufen.',
      criteria: ['Empathie zeigen', 'Sofortige Hilfe anbieten', 'Wert langfristig kommunizieren']
    },
    {
      title: 'Preis-Einwand bei wiederholtem Kontakt',
      situation: 'Du hast den Kunden schon 5 Mal kontaktiert. Jedes Mal kommt der Preis-Einwand. Wie behandelst du das jetzt?',
      criteria: ['Strategie ändern', 'Wert neu kommunizieren', 'Abschluss einleiten']
    }
  ]
  
  // Mikro-Learning Stories
  const microStories = {
    'objection_handling': [
      {
        story: 'Lisa, Vertriebsprofi bei einem Softwareanbieter, hat einen Termin mit einem skeptischen C-Typ-Kunden. Sie soll Vertrauen aufbauen – aber der Kunde zweifelt an der Zuverlässigkeit ihres Produkts.',
        question: 'Wie sollte Lisa reagieren?',
        options: [
          { text: '„Unsere Konkurrenz ist schlechter."', correct: false },
          { text: '„Darf ich Ihnen kurz zeigen, wie andere Kunden mit ähnlichen Anforderungen erfolgreich arbeiten?"', correct: true },
          { text: '„Wir sind einfach günstiger."', correct: false }
        ],
        learningGoal: 'Empathie + Vertrauen + situatives Denken'
      },
      {
        story: 'Markus hat einen Preis-Einwand bekommen: "Das ist zu teuer." Er hat schon zweimal versucht, den Mehrwert zu erklären, aber der Kunde kommt immer wieder auf den Preis zurück.',
        question: 'Was sollte Markus jetzt tun?',
        options: [
          { text: 'Den Preis sofort senken', correct: false },
          { text: 'Den ROI konkret berechnen und zeigen, was der Kunde übersieht', correct: true },
          { text: 'Aufgeben und das Gespräch beenden', correct: false }
        ],
        learningGoal: 'Wiederholte Preis-Einwände mit ROI-Berechnung behandeln'
      },
      {
        story: 'Sophie hat einen Zeit-Einwand: "Ich muss erst noch darüber nachdenken." Sie weiß, dass Zeit-Einwände oft versteckte Bedenken sind.',
        question: 'Wie sollte Sophie reagieren?',
        options: [
          { text: '„Okay, melden Sie sich dann."', correct: false },
          { text: '„Natürlich! Was genau möchten Sie sich noch überlegen?"', correct: true },
          { text: '„Sie müssen sich jetzt entscheiden."', correct: false }
        ],
        learningGoal: 'Zeit-Einwände als versteckte Bedenken erkennen und behandeln'
      },
      {
        story: 'Thomas hat einen Konkurrenz-Einwand: "Ihr Mitbewerber bietet das günstiger an." Er weiß, dass er nicht die Konkurrenz kritisieren sollte.',
        question: 'Was ist die beste Strategie?',
        options: [
          { text: 'Die Konkurrenz kritisieren', correct: false },
          { text: 'Verständnis zeigen und den Mehrwert seiner Lösung betonen', correct: true },
          { text: 'Den Preis sofort senken', correct: false }
        ],
        learningGoal: 'Konkurrenz-Einwände professionell behandeln ohne Kritik'
      },
      {
        story: 'Julia hat einen komplexen Einwand-Mix: "Das ist zu teuer, ich kenne Ihre Firma nicht, und außerdem muss ich erst noch mit meinem Team sprechen."',
        question: 'Wie sollte Julia vorgehen?',
        options: [
          { text: 'Alle Einwände auf einmal beantworten', correct: false },
          { text: 'Priorisieren und einen nach dem anderen behandeln', correct: true },
          { text: 'Die wichtigsten ignorieren', correct: false }
        ],
        learningGoal: 'Mehrere Einwände systematisch priorisieren und behandeln'
      }
    ],
    'question_techniques': [
      {
        story: 'Max nutzt SPIN-Selling in einem Gespräch. Er hat die Situation und das Problem identifiziert. Jetzt muss er die Implication-Phase nutzen.',
        question: 'Welche Frage gehört zur Implication-Phase?',
        options: [
          { text: '„Was passiert, wenn Sie dieses Problem nicht lösen?"', correct: true },
          { text: '„Wie groß ist Ihr Unternehmen?"', correct: false },
          { text: '„Wie hoch ist Ihr Budget?"', correct: false }
        ],
        learningGoal: 'SPIN-Selling: Implication Questions richtig einsetzen'
      },
      {
        story: 'Sarah führt ein Erstgespräch mit einem neuen Lead. Sie muss schnell herausfinden, ob der Lead wirklich kaufbereit ist. Welches Modell sollte sie nutzen?',
        question: 'Welches Qualifizierungsmodell ist am besten für schnelle Lead-Qualifizierung?',
        options: [
          { text: 'BANT – Budget, Authority, Need, Timeline', correct: true },
          { text: 'SPIN-Selling', correct: false },
          { text: 'DISC-Modell', correct: false }
        ],
        learningGoal: 'BANT-Qualifizierung im Erstgespräch'
      },
      {
        story: 'Tom hat ein Problem identifiziert, aber der Kunde sieht die Dringlichkeit nicht. Er muss die Folgen des Problems aufzeigen.',
        question: 'Welche Art von Fragen hilft, die Dringlichkeit zu erhöhen?',
        options: [
          { text: 'Implication Questions – zeigen die Folgen des Problems', correct: true },
          { text: 'Situation Questions – erfragen den aktuellen Zustand', correct: false },
          { text: 'Problem Questions – identifizieren Schmerzpunkte', correct: false }
        ],
        learningGoal: 'Implication Questions für Dringlichkeit nutzen'
      },
      {
        story: 'Anna möchte, dass der Kunde selbst die Vorteile einer Lösung beschreibt. Sie nutzt Need-Payoff Questions.',
        question: 'Was ist das Ziel von Need-Payoff Questions?',
        options: [
          { text: 'Den Kunden selbst die Vorteile beschreiben lassen', correct: true },
          { text: 'Das Budget zu erfragen', correct: false },
          { text: 'Die Lösung zu präsentieren', correct: false }
        ],
        learningGoal: 'Need-Payoff Questions für Selbstüberzeugung nutzen'
      },
      {
        story: 'David führt ein Gespräch und beginnt mit breiten, offenen Fragen. Dann verengt er schrittweise zu spezifischen Details.',
        question: 'Welche Fragetechnik nutzt David?',
        options: [
          { text: 'Funnel-Fragen – vom Allgemeinen zum Spezifischen', correct: true },
          { text: 'Leading Questions – lenken in eine Richtung', correct: false },
          { text: 'Closed Questions – liefern kurze Antworten', correct: false }
        ],
        learningGoal: 'Funnel-Fragen für strukturierte Informationssammlung'
      }
    ]
  }
  
  // Lern-Insights: echte Daten laden wenn Nutzer „Insights anzeigen“ öffnet
  React.useEffect(() => {
    if (activeMode !== 'insights' || !user) {
      setInsightsData([])
      return
    }
    setInsightsLoading(true)
    apiFetch('/api/insights/me')
      .then(r => r.ok ? r.json() : { insights: [] })
      .then(data => {
        setInsightsData(data.insights || [])
        setInsightsLoading(false)
      })
      .catch(() => {
        setInsightsData([])
        setInsightsLoading(false)
      })
  }, [activeMode, user])

  // Handler Functions
  const startAdaptiveQuiz = async (topic) => {
    setActiveMode('adaptive-quiz')
    setActiveTopic(topic)
    setQuizQuestionIndex(0)
    setQuizAnswer(null)
    setQuizScore(0)
    setQuizDifficulty('Mittel')
    
    // Lade adaptive Fragen basierend auf Spaced Repetition
    if (user) {
      try {
        const moduleId = topic === 'Einwände' ? 'practice-quiz-einwaende' : 'practice-quiz-fragen'
        const response = await apiFetch(`/api/quiz/questions/${moduleId}`)
        const data = await response.json()
        
        if (data.targetDifficulty) {
          setQuizDifficulty(data.targetDifficulty)
        }
        if (data.performance !== undefined) {
          setQuizPerformance(data.performance)
        }
        
        // Filtere Fragen basierend auf fälligen Wiederholungen und Schwierigkeit
        const allQuestions = adaptiveQuizQuestions[topic] || []
        const dueQuestionIds = new Set(data.dueQuestions || [])
        
        // Priorisiere fällige Fragen, dann neue Fragen mit passender Schwierigkeit
        let filteredQuestions = []
        
        // 1. Fällige Fragen zuerst
        const dueQuestions = allQuestions.filter((q, idx) => dueQuestionIds.has(idx))
        filteredQuestions.push(...dueQuestions)
        
        // 2. Neue Fragen mit passender Schwierigkeit (priorisiere diese)
        const newQuestions = allQuestions.filter((q, idx) => 
          !dueQuestionIds.has(idx) && q.difficulty === data.targetDifficulty
        )
        filteredQuestions.push(...newQuestions)
        
        // 3. Falls nicht genug Fragen: Fragen mit ähnlicher Schwierigkeit hinzufügen
        if (filteredQuestions.length < 10) {
          const difficultyOrder = data.targetDifficulty === 'Einfach' 
            ? ['Einfach', 'Mittel', 'Schwer']
            : data.targetDifficulty === 'Mittel'
            ? ['Mittel', 'Einfach', 'Schwer']
            : ['Schwer', 'Mittel', 'Einfach']
          
          for (const diff of difficultyOrder) {
            if (filteredQuestions.length >= 10) break
            const additional = allQuestions.filter((q, idx) => 
              !dueQuestionIds.has(idx) && 
              q.difficulty === diff &&
              !filteredQuestions.includes(q)
            )
            filteredQuestions.push(...additional.slice(0, 10 - filteredQuestions.length))
          }
        }
        
        // Mische die Fragen für Abwechslung, aber behalte Priorität: fällige zuerst
        const dueCount = dueQuestions.length
        const duePart = filteredQuestions.slice(0, dueCount).sort(() => Math.random() - 0.5)
        const newPart = filteredQuestions.slice(dueCount).sort(() => Math.random() - 0.5)
        filteredQuestions = [...duePart, ...newPart].slice(0, 15) // Mehr Fragen für bessere Anpassung
        setQuizQuestions(filteredQuestions)
      } catch (error) {
        console.error('Error loading adaptive questions:', error)
        // Fallback: alle Fragen verwenden
        setQuizQuestions(adaptiveQuizQuestions[topic] || [])
      }
    } else {
      // Nicht eingeloggt: Standard-Fragen verwenden
      setQuizQuestions(adaptiveQuizQuestions[topic] || [])
    }
  }

  const handleQuizAnswer = async (option) => {
    setQuizAnswer(option)
    const wasCorrect = option.correct
    const newScore = wasCorrect ? quizScore + 1 : quizScore
    
    // Berechne neue Performance
    const totalAnswered = quizQuestionIndex + 1
    const newPerformance = (newScore / totalAnswered) * 100
    
    // Dynamische Schwierigkeitsanpassung basierend auf Performance
    const oldDifficulty = quizDifficulty
    let newDifficulty = oldDifficulty
    if (wasCorrect) {
      // Bei richtiger Antwort: Erhöhe Schwierigkeit wenn Performance gut
      if (newPerformance >= 80 && oldDifficulty === 'Mittel') {
        newDifficulty = 'Schwer'
      } else if (newPerformance >= 70 && oldDifficulty === 'Einfach') {
        newDifficulty = 'Mittel'
      }
    } else {
      // Bei falscher Antwort: Verringere Schwierigkeit wenn Performance schlecht
      if (newPerformance < 50 && oldDifficulty === 'Mittel') {
        newDifficulty = 'Einfach'
      } else if (newPerformance < 60 && oldDifficulty === 'Schwer') {
        newDifficulty = 'Mittel'
      }
    }
    
    setQuizScore(newScore)
    setQuizDifficulty(newDifficulty)
    setQuizPerformance(Math.round(newPerformance))
    
    // Wenn wir noch Fragen haben und die Schwierigkeit sich geändert hat, lade neue Fragen
    if (quizQuestionIndex < quizQuestions.length - 1 && newDifficulty !== oldDifficulty && user) {
      // Lade zusätzliche Fragen mit neuer Schwierigkeit für die nächsten Fragen
      try {
        const moduleId = activeTopic === 'Einwände' ? 'practice-quiz-einwaende' : 'practice-quiz-fragen'
        const response = await apiFetch(`/api/quiz/questions/${moduleId}?difficulty=${newDifficulty}&limit=5`)
        const data = await response.json()
        
        const allQuestions = adaptiveQuizQuestions[activeTopic] || []
        const dueQuestionIds = new Set(data.dueQuestions || [])
        
        // Hole neue Fragen mit neuer Schwierigkeit
        const newQuestions = allQuestions.filter((q, idx) => {
          const isNotInCurrentPool = !quizQuestions.some(qq => qq === q)
          const matchesDifficulty = q.difficulty === newDifficulty
          const isDue = dueQuestionIds.has(idx)
          return (isNotInCurrentPool && matchesDifficulty) || (isDue && matchesDifficulty)
        })
        
        // Füge neue Fragen zum Pool hinzu
        if (newQuestions.length > 0) {
          const shuffledNew = newQuestions.sort(() => Math.random() - 0.5).slice(0, 3)
          setQuizQuestions(prev => [...prev, ...shuffledNew])
        }
      } catch (error) {
        console.error('Error loading additional questions:', error)
      }
    }
  }

  const handleNextQuizQuestion = () => {
    if (user && quizAnswer !== null) {
      const moduleId = activeTopic === 'Einwände' ? 'practice-quiz-einwaende' : 'practice-quiz-fragen'
      const currentQuestion = quizQuestions[quizQuestionIndex]
      const questionId = adaptiveQuizQuestions[activeTopic].findIndex(q => q === currentQuestion)
      
      // Quality: 0-5 basierend auf Antwort und Schwierigkeit
      // Schwierigere Fragen geben mehr Punkte bei richtiger Antwort
      let quality = 0
      if (quizAnswer?.correct) {
        if (currentQuestion.difficulty === 'Schwer') quality = 5
        else if (currentQuestion.difficulty === 'Mittel') quality = 4
        else quality = 3
      } else {
        // Bei falscher Antwort: weniger Quality-Abzug bei schwierigeren Fragen
        if (currentQuestion.difficulty === 'Schwer') quality = 2
        else if (currentQuestion.difficulty === 'Mittel') quality = 1
        else quality = 0
      }
      
      apiFetch('/api/insights/answer', {
        method: 'POST',
        body: JSON.stringify({ 
          moduleId, 
          questionId, 
          correct: quizAnswer?.correct,
          quality 
        })
      }).catch(() => {})
    }
    
    if (quizQuestionIndex < quizQuestions.length - 1) {
      setQuizQuestionIndex(quizQuestionIndex + 1)
      setQuizAnswer(null)
    } else {
      setActiveMode(null)
      showToast('Quiz abgeschlossen!', 'success')
    }
  }

  const startFlashcards = async (difficulty = null) => {
    setActiveMode('flashcards')
    setFlashcardIndex(0)
    setFlashcardFlipped(false)
    setFlashcardRating(null)
    setFlashcardDifficulty(difficulty)
    
    // Lade adaptive Karteikarten basierend auf Spaced Repetition
    if (user) {
      try {
        const moduleId = 'practice-flashcards'
        const url = difficulty 
          ? `/api/flashcards/${moduleId}?difficulty=${difficulty}`
          : `/api/flashcards/${moduleId}`
        const response = await apiFetch(url)
        const data = await response.json()
        
        // Filtere Karten basierend auf fälligen Wiederholungen und Schwierigkeit
        const dueCardIds = new Set(data.dueCards?.map(c => c.questionId) || [])
        const learnedCardIds = new Set(data.learnedCardIds || [])
        
        // Priorisiere fällige Karten
        let filteredCards = []
        
        // 1. Fällige Karten zuerst (mit optionaler Schwierigkeitsfilterung)
        const dueCards = flashcards.filter((card, idx) => {
          const isDue = dueCardIds.has(idx)
          if (difficulty) {
            // Wenn Schwierigkeit gefiltert wird, prüfe auch die gespeicherte difficulty_rating
            const cardData = data.dueCards?.find(c => c.questionId === idx)
            return isDue && (cardData?.difficulty === difficulty || card.difficulty === difficulty)
          }
          return isDue
        })
        filteredCards.push(...dueCards)
        
        // 2. Neue Karten hinzufügen basierend auf Schwierigkeit
        const newCards = flashcards.filter((card, idx) => {
          if (dueCardIds.has(idx)) return false // Bereits in dueCards
          if (learnedCardIds.has(idx)) return false // Bereits gelernt (aber nicht fällig)
          
          // Wenn Schwierigkeit gefiltert wird, nur Karten mit passender Schwierigkeit
          if (difficulty) {
            return card.difficulty === difficulty
          }
          
          // Wenn keine Schwierigkeit gefiltert wird, alle neuen Karten
          return true
        })
        
        // Priorisiere neue Karten mit passender Schwierigkeit
        if (difficulty) {
          const matchingDifficulty = newCards.filter(c => c.difficulty === difficulty)
          filteredCards.push(...matchingDifficulty)
        } else {
          filteredCards.push(...newCards)
        }
        
        // Mische für Abwechslung
        filteredCards = filteredCards.sort(() => Math.random() - 0.5)
        setFlashcardPool(filteredCards)
      } catch (error) {
        console.error('Error loading adaptive flashcards:', error)
        // Fallback: alle Karten verwenden, optional nach Schwierigkeit filtern
        if (difficulty) {
          // Filtere nach Schwierigkeit im Fallback
          const filtered = flashcards.filter(card => card.difficulty === difficulty)
          setFlashcardPool(filtered.length > 0 ? filtered : flashcards)
        } else {
          setFlashcardPool(flashcards)
        }
      }
    } else {
      setFlashcardPool(flashcards)
    }
  }

  const handleFlashcardFlip = () => {
    setFlashcardFlipped(!flashcardFlipped)
  }

  const handleFlashcardRating = (rating) => {
    setFlashcardRating(rating)
    setFlashcardDifficulty(rating)
    
    if (user) {
      const currentCard = flashcardPool[flashcardIndex]
      const questionId = flashcards.findIndex(c => c === currentCard)
      
      // Quality basierend auf Rating: Einfach=5, Mittel=4, Schwer=2
      const qualityMap = { 'Einfach': 5, 'Mittel': 4, 'Schwer': 2 }
      const quality = qualityMap[rating] || 3
      const correct = rating !== 'Schwer'
      
      apiFetch('/api/insights/answer', {
        method: 'POST',
        body: JSON.stringify({ 
          moduleId: 'practice-flashcards', 
          questionId, 
          correct,
          quality,
          difficultyRating: rating 
        })
      }).catch(() => {})
    }
    
    // Schwierige Karten werden häufiger wiederholt (schnell wieder angezeigt)
    // Einfache Karten werden seltener wiederholt (spät wieder im Stapel)
    const newPool = [...flashcardPool]
    
    if (rating === 'Schwer') {
      // "Schwer" = häufige Wiederholung: Karte bleibt im Pool und wird früher wieder gezeigt
      // Verschiebe Karte einige Positionen nach vorne (z.B. 3-5 Positionen), damit sie schnell wieder kommt
      const currentCard = newPool[flashcardIndex]
      newPool.splice(flashcardIndex, 1)
      const insertPosition = Math.min(flashcardIndex + 3, newPool.length)
      newPool.splice(insertPosition, 0, currentCard)
      setFlashcardPool(newPool)
    } else if (rating === 'Einfach') {
      // "Einfach" = seltene Wiederholung: Karte ans Ende verschieben (spät wieder im Stapel)
      const currentCard = newPool[flashcardIndex]
      newPool.splice(flashcardIndex, 1)
      newPool.push(currentCard)
      setFlashcardPool(newPool)
    }
    // "Mittel" = keine Änderung der Position
    
    setTimeout(() => {
      if (flashcardIndex < flashcardPool.length - 1) {
        setFlashcardIndex(flashcardIndex + 1)
        setFlashcardFlipped(false)
        setFlashcardRating(null)
      } else {
        setActiveMode(null)
        showToast('Karteikarten durchgearbeitet!', 'success')
      }
    }, 1000)
  }

  const startRoleplay = () => {
    setActiveMode('roleplay')
    setRoleplayScenarioIndex(0)
    setRoleplayAnswer(null)
  }

  const handleRoleplayAnswer = (option) => {
    setRoleplayAnswer(option)
  }

  const handleNextRoleplayScenario = () => {
    if (user && roleplayAnswer !== null) {
      apiFetch('/api/insights/answer', {
        method: 'POST',
        body: JSON.stringify({ moduleId: 'practice-rollenspiel', questionId: roleplayScenarioIndex, correct: roleplayAnswer?.correct })
      }).catch(() => {})
    }
    if (roleplayScenarioIndex < roleplayScenarios.length - 1) {
      setRoleplayScenarioIndex(roleplayScenarioIndex + 1)
      setRoleplayAnswer(null)
    } else {
      setActiveMode(null)
    }
  }

  const startChallenge = (index = 0) => {
    setActiveMode('challenge')
    setChallengeActive(true)
    setChallengeIndex(index)
    setChallengeTime(300)
    setChallengeAnswer('')
    setChallengeEvaluation(null)
    // Timer starten
    const timer = setInterval(() => {
      setChallengeTime(prev => {
        if (prev <= 1) {
          clearInterval(timer)
          return 0
        }
        return prev - 1
      })
    }, 1000)
    setChallengeTimer(timer)
  }
  
  const startChallengeSelection = () => {
    setActiveMode('challenge-selection')
  }
  
  const handleSubmitChallengeAnswer = async () => {
    if (!challengeAnswer.trim()) {
      showToast('Bitte gib eine Antwort ein', 'error')
      return
    }
    
    if (!user) {
      setShowAuthModal(true)
      return
    }
    
    const currentChallenge = challenges[challengeIndex] || challenges[0]
    if (!currentChallenge) {
      showToast('Fehler: Herausforderung nicht gefunden', 'error')
      return
    }
    
    console.log('Submitting challenge answer:', {
      challengeIndex,
      challengeTitle: currentChallenge.title,
      situation: currentChallenge.situation,
      criteria: currentChallenge.criteria
    })
    
    setEvaluatingChallenge(true)
    try {
      const res = await apiFetch('/api/practice/evaluate-challenge', {
        method: 'POST',
        body: JSON.stringify({
          challengeTitle: currentChallenge.title,
          situation: currentChallenge.situation,
          answer: challengeAnswer.trim(),
          criteria: currentChallenge.criteria
        })
      })
      
      if (res.ok) {
        const data = await res.json()
        console.log('Evaluation received:', data)
        if (data.evaluation) {
          setChallengeEvaluation(data.evaluation)
          showToast('Antwort erfolgreich analysiert', 'success')
        } else {
          console.error('No evaluation in response:', data)
          showToast('Fehler: Keine Bewertung erhalten', 'error')
        }
      } else {
        const error = await res.json().catch(() => ({}))
        console.error('API error:', error)
        showToast(`Fehler bei der Analyse: ${error.error || error.message || 'Unbekannter Fehler'}`, 'error')
      }
    } catch (error) {
      console.error('Fehler bei der Challenge-Bewertung:', error)
      console.error('Error details:', {
        message: error.message,
        stack: error.stack,
        challengeIndex,
        currentChallenge
      })
      showToast(`Fehler bei der Analyse: ${error.message || 'Netzwerkfehler'}`, 'error')
    } finally {
      setEvaluatingChallenge(false)
    }
  }

  const handleNextChallenge = () => {
    if (challengeTimer) {
      clearInterval(challengeTimer)
      setChallengeTimer(null)
    }
    if (challengeIndex < challenges.length - 1) {
      setChallengeIndex(challengeIndex + 1)
      setChallengeTime(300)
      setChallengeAnswer('')
      setChallengeEvaluation(null)
      // Timer neu starten
      const timer = setInterval(() => {
        setChallengeTime(prev => {
          if (prev <= 1) {
            clearInterval(timer)
            return 0
          }
          return prev - 1
        })
      }, 1000)
      setChallengeTimer(timer)
    } else {
      setActiveMode(null)
    }
  }

  React.useEffect(() => {
    return () => {
      if (challengeTimer) {
        clearInterval(challengeTimer)
      }
    }
  }, [challengeTimer])

  const startMicroLearning = (topic) => {
    setActiveMode('micro-learning')
    setActiveTopic(topic)
    setMicroStoryIndex(0)
    setMicroAnswer(null)
  }

  const handleMicroAnswer = (option) => {
    setMicroAnswer(option)
  }

  const handleNextMicroStory = () => {
    if (user && microAnswer !== null) {
      const moduleId = activeTopic === 'objection_handling' ? 'practice-micro-einwaende' : 'practice-micro-spin'
      apiFetch('/api/insights/answer', {
        method: 'POST',
        body: JSON.stringify({ moduleId, questionId: microStoryIndex, correct: microAnswer?.correct })
      }).catch(() => {})
    }
    if (microStoryIndex < microStories[activeTopic].length - 1) {
      setMicroStoryIndex(microStoryIndex + 1)
      setMicroAnswer(null)
    } else {
      setActiveMode(null)
    }
  }

  const viewLearningInsights = () => {
    setActiveMode('insights')
  }

  const handleBack = () => {
    if (activeMode === 'challenge-selection') {
      setActiveMode(null)
    } else if (activeMode === 'challenge') {
      setActiveMode('challenge-selection')
      if (challengeTimer) {
        clearInterval(challengeTimer)
        setChallengeTimer(null)
      }
      setChallengeTime(300)
      setChallengeAnswer('')
      setChallengeEvaluation(null)
    } else {
      setActiveMode(null)
      setActiveTopic(null)
    }
  }

  // Render verschiedene Modi
  if (activeMode === 'adaptive-quiz') {
    const questions = quizQuestions.length > 0 ? quizQuestions : (adaptiveQuizQuestions[activeTopic] || [])
    const question = questions[quizQuestionIndex]
    
    if (!question) {
      return (
        <div className="practice-container">
          <div className="section-header">
            <button className="btn-back" onClick={handleBack}>← Zurück</button>
            <h2>Adaptives Quiz - {activeTopic}</h2>
          </div>
          <p>Keine Fragen verfügbar.</p>
        </div>
      )
    }
    
    return (
      <div className="practice-container">
        <div className="section-header">
          <button className="btn-back" onClick={handleBack}>← Zurück</button>
          <h2>Adaptives Quiz - {activeTopic}</h2>
          <p>Schwierigkeit: {quizDifficulty} | Punktestand: {quizScore}/{quizQuestionIndex + 1} | Performance: {quizPerformance}% | Fragen im Pool: {quizQuestions.length}</p>
        </div>
        <div className="question-container">
          <div className="question-card">
            <h3>Frage {quizQuestionIndex + 1}</h3>
            <p className="question-text">{question.question}</p>
            <div className="options-list">
              {question.options.map((option, idx) => (
                <button
                  key={idx}
                  className={`option-btn ${quizAnswer === option ? (option.correct ? 'correct' : 'incorrect') : ''}`}
                  onClick={() => handleQuizAnswer(option)}
                  disabled={quizAnswer !== null}
                >
                  {option.text}
                </button>
              ))}
            </div>
            {quizAnswer && (
              <>
                <div className={`feedback ${quizAnswer.correct ? 'correct-feedback' : 'incorrect-feedback'}`}>
                  <p>{question.feedback}</p>
                </div>
                <div className="next-button-container">
                  <button className="btn primary" onClick={handleNextQuizQuestion}>
                    {quizQuestionIndex < questions.length - 1 ? 'Nächste Frage' : 'Quiz beenden'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    )
  }

  if (activeMode === 'flashcards') {
    const cards = flashcardPool.length > 0 ? flashcardPool : flashcards
    const card = cards[flashcardIndex]
    
    if (!card) {
      return (
        <div className="practice-container">
          <div className="section-header">
            <button className="btn-back" onClick={handleBack}>← Zurück</button>
            <h2>Karteikarten</h2>
          </div>
          <p>Keine Karten verfügbar.</p>
        </div>
      )
    }
    
    return (
      <div className="practice-container">
        <div className="section-header">
          <button className="btn-back" onClick={handleBack}>← Zurück</button>
          <h2>Karteikarten</h2>
          <p>Karte {flashcardIndex + 1} von {cards.length} {flashcardDifficulty ? `| Schwierigkeit: ${flashcardDifficulty}` : ''}</p>
        </div>
        <div className="flashcard-container">
          <div className={`flashcard ${flashcardFlipped ? 'flipped' : ''}`} onClick={handleFlashcardFlip}>
            <div className="flashcard-front">
              <h3>{card.front}</h3>
              <p className="flashcard-hint">Klicke zum Umdrehen</p>
            </div>
            <div className="flashcard-back">
              <p>{card.back}</p>
              {!flashcardRating && (
                <div className="flashcard-rating">
                  <p>Wie schwer war diese Karte?</p>
                  <div className="rating-buttons">
                    <button className="btn" onClick={() => handleFlashcardRating('Einfach')}>Einfach</button>
                    <button className="btn" onClick={() => handleFlashcardRating('Mittel')}>Mittel</button>
                    <button className="btn" onClick={() => handleFlashcardRating('Schwer')}>Schwer</button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (activeMode === 'roleplay') {
    const scenario = roleplayScenarios[roleplayScenarioIndex]
    const isLastScenario = roleplayScenarioIndex === roleplayScenarios.length - 1
    
    return (
      <div className="practice-container">
        <div className="section-header">
          <button className="btn-back" onClick={handleBack}>← Zurück</button>
          <h2>Rollenspiel</h2>
          <p>Szenario {roleplayScenarioIndex + 1} von {roleplayScenarios.length}</p>
        </div>
        <div className="roleplay-container">
          <div className="roleplay-card">
            <h3>{scenario.title}</h3>
            <div className="roleplay-info">
              <p><strong>Kundentyp:</strong> {scenario.customerType}</p>
              <p><strong>Situation:</strong> {scenario.situation}</p>
            </div>
            <div className="options-list">
              {scenario.options.map((option, idx) => (
                <button
                  key={idx}
                  className={`option-btn ${roleplayAnswer === option ? (option.correct ? 'correct' : 'incorrect') : ''}`}
                  onClick={() => handleRoleplayAnswer(option)}
                  disabled={roleplayAnswer !== null}
                >
                  {option.text}
                </button>
              ))}
            </div>
            {roleplayAnswer && (
              <div className={`feedback ${roleplayAnswer.correct ? 'correct-feedback' : 'incorrect-feedback'}`}>
                <p>{roleplayAnswer.feedback}</p>
                <button className="btn primary" onClick={handleNextRoleplayScenario}>
                  {isLastScenario ? 'Rollenspiel abschließen' : 'Nächstes Szenario'}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  if (activeMode === 'challenge-selection') {
    return (
      <div className="practice-container">
        <div className="section-header">
          <button className="btn-back" onClick={handleBack}>← Zurück</button>
          <h2>Herausforderung auswählen</h2>
        </div>
        <div className="challenge-selection-container">
          <p className="challenge-selection-description">
            Wähle eine Herausforderung aus, die du üben möchtest. Jede Herausforderung hat spezifische Bewertungskriterien.
          </p>
          <div className="challenge-selection-grid">
            {challenges.map((challenge, idx) => (
              <div key={idx} className="challenge-selection-card">
                <h3>{challenge.title}</h3>
                <p className="challenge-selection-situation">{challenge.situation}</p>
                <div className="challenge-selection-criteria">
                  <strong>Bewertungskriterien:</strong>
                  <ul>
                    {challenge.criteria.map((criterion, cIdx) => (
                      <li key={cIdx}>{criterion}</li>
                    ))}
                  </ul>
                </div>
                <button 
                  className="btn btn-primary" 
                  onClick={() => startChallenge(idx)}
                >
                  Herausforderung starten
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (activeMode === 'challenge') {
    const challenge = challenges[challengeIndex] || challenges[0]
    const minutes = Math.floor(challengeTime / 60)
    const seconds = challengeTime % 60
    
    return (
      <div className="practice-container">
        <div className="section-header">
          <button className="btn-back" onClick={handleBack}>← Zurück</button>
          <h2>Herausforderung: {challenge.title}</h2>
          <p className="challenge-timer">⏱️ {minutes}:{seconds.toString().padStart(2, '0')}</p>
          <p className="challenge-progress">Herausforderung {challengeIndex + 1} von {challenges.length}</p>
        </div>
        <div className="challenge-container">
          <div className="challenge-card">
            <h3>Situation:</h3>
            <p className="challenge-situation">{challenge.situation}</p>
            <h3>Deine Antwort:</h3>
            <textarea
              className="challenge-textarea"
              value={challengeAnswer}
              onChange={(e) => setChallengeAnswer(e.target.value)}
              placeholder="Formuliere eine überzeugende, wertorientierte Antwort..."
              rows={6}
            />
            <div className="challenge-criteria">
              <h4>Bewertungskriterien:</h4>
              <ul>
                {challenge.criteria.map((criterion, idx) => (
                  <li key={idx}>{criterion} (0-5 Punkte)</li>
                ))}
              </ul>
            </div>
            <button 
              className="btn primary" 
              onClick={handleSubmitChallengeAnswer}
              disabled={!challengeAnswer.trim() || evaluatingChallenge}
            >
              {evaluatingChallenge ? 'Analysiere Antwort...' : 'Antwort einreichen'}
            </button>
            {challengeEvaluation && (
              <div className="challenge-evaluation">
                <h4>Bewertung:</h4>
                <div className="evaluation-scores">
                  {challenge.criteria.map((criterion, idx) => {
                    const score = challengeEvaluation.scores?.[criterion] || challengeEvaluation.scores?.[idx] || 0
                    return (
                      <div key={idx} className="evaluation-score-item">
                        <span className="evaluation-criterion">{criterion}:</span>
                        <span className="evaluation-points">{score}/5 Punkte</span>
                        <div className="evaluation-bar">
                          <div 
                            className="evaluation-bar-fill" 
                            style={{ width: `${(score / 5) * 100}%` }}
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>
                <div className="evaluation-total">
                  <strong>Gesamt: {challengeEvaluation.totalScore || 0}/15 Punkte</strong>
                </div>
                {challengeEvaluation.feedback && (
                  <div className="evaluation-feedback">
                    <h5>Feedback:</h5>
                    <p>{typeof challengeEvaluation.feedback === 'string' ? challengeEvaluation.feedback : JSON.stringify(challengeEvaluation.feedback)}</p>
                  </div>
                )}
                {challengeEvaluation.bestAnswer && (
                  <div className="evaluation-best-answer">
                    <h5>Beispielantwort (15/15 Punkte):</h5>
                    <div className="best-answer-content">
                      <p>{typeof challengeEvaluation.bestAnswer === 'string' ? challengeEvaluation.bestAnswer : JSON.stringify(challengeEvaluation.bestAnswer)}</p>
                    </div>
                  </div>
                )}
                <div className="evaluation-actions">
                  <button className="btn btn-outline" onClick={() => {
                    setChallengeEvaluation(null)
                    setChallengeAnswer('')
                  }}>
                    Neue Antwort versuchen
                  </button>
                  <button className="btn btn-outline" onClick={() => {
                    setChallengeEvaluation(null)
                    setChallengeAnswer('')
                    if (challengeTimer) {
                      clearInterval(challengeTimer)
                      setChallengeTimer(null)
                    }
                    setChallengeTime(300)
                    setActiveMode('challenge-selection')
                  }}>
                    Zurück zur Auswahl
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  if (activeMode === 'micro-learning') {
    const stories = microStories[activeTopic]
    const story = stories[microStoryIndex]
    
    return (
      <div className="practice-container">
        <div className="section-header">
          <button className="btn-back" onClick={handleBack}>← Zurück</button>
          <h2>Mikro-Learning</h2>
          <p>⏱️ 5-Minuten Lerneinheit</p>
        </div>
        <div className="micro-learning-container">
          <div className="micro-story-card">
            <div className="story-section">
              <h3>📖 Story:</h3>
              <p>{story.story}</p>
            </div>
            <div className="interactive-question">
              <h3>{story.question}</h3>
              <div className="options-list">
                {story.options.map((option, idx) => (
                  <button
                    key={idx}
                    className={`option-btn ${microAnswer === option ? (option.correct ? 'correct' : 'incorrect') : ''}`}
                    onClick={() => handleMicroAnswer(option)}
                    disabled={microAnswer !== null}
                  >
                    {option.text}
                  </button>
                ))}
              </div>
            </div>
            {microAnswer && (
              <>
                <div className={`feedback ${microAnswer.correct ? 'correct-feedback' : 'incorrect-feedback'}`}>
                  <p><strong>Lernziel:</strong> {story.learningGoal}</p>
                </div>
                <div className="next-button-container">
                  <button className="btn primary" onClick={handleNextMicroStory}>
                    {microStoryIndex < stories.length - 1 ? 'Nächste Story' : 'Abschließen'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    )
  }

  if (activeMode === 'insights') {
    return (
      <div className="practice-container">
        <div className="section-header">
          <button className="btn-back" onClick={handleBack}>← Zurück</button>
          <h2>Lern-Insights</h2>
          <p>Personalisiertes Feedback und Empfehlungen</p>
        </div>
        {!user ? (
          <div className="progress-login-gate">
            <div className="progress-login-card">
              <div className="progress-login-icon">📊</div>
              <h3>Anmeldung erforderlich</h3>
              <p>Melde dich an, um zu sehen, in welchen Bereichen du die häufigsten Fehler machst und welche Module du wiederholen solltest.</p>
              <button type="button" className="btn btn-primary" onClick={() => setShowAuthModal(true)}>
                Anmelden
              </button>
            </div>
          </div>
        ) : insightsLoading ? (
          <p className="insights-loading">Lade Lern-Insights…</p>
        ) : insightsData.length === 0 ? (
          <p className="insights-empty">Noch keine Antworten im Vertriebs-Training. Beantworte Fragen in den Trainingsmodulen, damit hier deine Stärken und Schwächen angezeigt werden.</p>
        ) : (
        <div className="insights-container">
          <div className="insights-grid">
              {insightsData.map((item) => (
                <div key={item.moduleId} className="insight-card">
                  <h3>{item.title}</h3>
                <div className="performance-bar">
                    <div className="performance-fill" style={{ width: `${item.percentageCorrect}%` }} />
                    <span className="performance-score">{item.percentageCorrect}%</span>
                </div>
                  <p className="insight-recommendation">Empfehlung: {item.recommendation}</p>
              </div>
            ))}
          </div>
        </div>
        )}
      </div>
    )
  }

  // Hauptansicht
  const modules = [
    {
      id: 'adaptive-quiz',
      title: 'Adaptives Quiz',
      icon: 'fas fa-brain',
      description: 'Intelligentes Quiz mit Spaced Repetition und personalisierter Schwierigkeit.',
      buttons: [
        { label: 'Einwände', action: () => startAdaptiveQuiz('Einwände') },
        { label: 'Fragen', action: () => startAdaptiveQuiz('Fragen') }
      ]
    },
    {
      id: 'flashcards',
      title: 'Karteikarten',
      icon: 'fas fa-cards-blank',
      description: 'Lerne mit intelligenten Karteikarten. Schwierige Karten werden häufiger wiederholt.',
      buttons: [
        { label: 'Alle Karten', action: () => startFlashcards() },
        { label: 'Einfach', action: () => startFlashcards('Einfach') },
        { label: 'Mittel', action: () => startFlashcards('Mittel') },
        { label: 'Schwer', action: () => startFlashcards('Schwer') }
      ]
    },
    {
      id: 'roleplay',
      title: 'Rollenspiel',
      icon: 'fas fa-theater-masks',
      description: 'Übe Verkaufsgespräche in realistischen Szenarien mit verschiedenen Kundentypen.',
      buttons: [
        { label: 'Rollenspiel starten', action: startRoleplay }
      ]
    },
    {
      id: 'challenge',
      title: 'Herausforderung',
      icon: 'fas fa-trophy',
      description: 'Spezielle Übungen für Fortgeschrittene. Meistere komplexe Verkaufssituationen.',
      buttons: [
        { label: 'Herausforderung auswählen', action: startChallengeSelection }
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
        { label: 'Insights anzeigen', action: viewLearningInsights }
      ]
    }
  ]

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
  const { user } = useAuth()
  const [scenarios, setScenarios] = React.useState([])
  const [filteredScenarios, setFilteredScenarios] = React.useState([])
  const [selectedIndustry, setSelectedIndustry] = React.useState('all')
  const [selectedScenario, setSelectedScenario] = React.useState(null)
  const [activeScenario, setActiveScenario] = React.useState(null)
  const [currentPhaseIndex, setCurrentPhaseIndex] = React.useState(0)
  const [currentTaskIndex, setCurrentTaskIndex] = React.useState(0)
  const [selectedAnswer, setSelectedAnswer] = React.useState(null)
  const [showFeedback, setShowFeedback] = React.useState(false)
  const [score, setScore] = React.useState(0)
  const [completedTasks, setCompletedTasks] = React.useState([])
  const [loading, setLoading] = React.useState(true)

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
    setLoading(true)
    apiFetch('/api/scenarios')
      .then(r => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        return r.json()
      })
      .then(j => {
        const scenariosData = Array.isArray(j?.scenarios) ? j.scenarios : []
        if (scenariosData.length > 0) {
        setScenarios(scenariosData)
        setLoading(false)
          return
        }
        throw new Error('No scenarios from API')
      })
      .catch(() => {
        // Live ohne Backend: Fallback aus statischer Datei (wird bei Build in dist kopiert)
        fetch('/scenarios.json')
          .then(r => r.ok ? r.json() : { scenarios: [] })
          .then(j => {
            setScenarios(j.scenarios ?? [])
            setLoading(false)
          })
          .catch(() => {
        setScenarios([])
        setFilteredScenarios([])
        setLoading(false)
          })
      })
  }, [])

  // Update filtered scenarios when scenarios or selectedIndustry changes
  React.useEffect(() => {
    if (scenarios.length === 0) {
      console.log('No scenarios loaded yet')
      return
    }
    
    console.log(`Filtering ${scenarios.length} scenarios for industry: ${selectedIndustry}`)
    console.log('Available industries in scenarios:', [...new Set(scenarios.map(s => s.industry))])
    
    if (selectedIndustry === 'all') {
      setFilteredScenarios(scenarios)
    } else {
      const filtered = scenarios.filter(s => {
        const matches = s.industry === selectedIndustry
        if (!matches) {
          console.log(`Scenario ${s.id} (${s.title}) has industry "${s.industry}", not "${selectedIndustry}"`)
        }
        return matches
      })
      console.log(`Filtered for ${selectedIndustry}:`, filtered.length, 'scenarios found', filtered.map(s => s.title))
      setFilteredScenarios(filtered)
    }
  }, [scenarios, selectedIndustry])

  const filterScenarios = (industry) => {
    console.log('Filter button clicked:', industry)
    setSelectedIndustry(industry)
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

  const beginScenario = () => {
    if (selectedScenario) {
      setActiveScenario(selectedScenario)
      setCurrentPhaseIndex(0)
      setCurrentTaskIndex(0)
      setSelectedAnswer(null)
      setShowFeedback(false)
      setScore(0)
      setCompletedTasks([])
      setSelectedScenario(null)
    }
  }

  const handleAnswerSelect = (answer) => {
    setSelectedAnswer(answer)
    setShowFeedback(true)
    if (answer.correct) {
      setScore(score + 10)
    }
    setCompletedTasks([...completedTasks, { phaseIndex: currentPhaseIndex, taskIndex: currentTaskIndex }])
  }

  const handleNextTask = () => {
    const currentPhase = activeScenario.phases[currentPhaseIndex]
    if (currentTaskIndex < currentPhase.tasks.length - 1) {
      setCurrentTaskIndex(currentTaskIndex + 1)
      setSelectedAnswer(null)
      setShowFeedback(false)
    } else {
      // Nächste Phase
      if (currentPhaseIndex < activeScenario.phases.length - 1) {
        setCurrentPhaseIndex(currentPhaseIndex + 1)
        setCurrentTaskIndex(0)
        setSelectedAnswer(null)
        setShowFeedback(false)
      } else {
        // Szenario abgeschlossen
        finishScenario()
      }
    }
  }

  const finishScenario = () => {
    const finalScore = score
    if (user && activeScenario?.id != null && typeof activeScenario.id === 'number') {
      apiFetch('/api/progress', {
        method: 'POST',
        body: JSON.stringify({
          scenarioId: activeScenario.id,
          completed: true,
          score: finalScore
        })
      }).catch(() => {})
    }
    // Szenario abgeschlossen - Score wird im UI angezeigt
    setActiveScenario(null)
    setCurrentPhaseIndex(0)
    setCurrentTaskIndex(0)
    setScore(0)
    setCompletedTasks([])
  }

  const exitScenario = () => {
    if (confirm('Möchten Sie das Szenario wirklich beenden? Der Fortschritt geht verloren.')) {
      setActiveScenario(null)
      setCurrentPhaseIndex(0)
      setCurrentTaskIndex(0)
      setSelectedAnswer(null)
      setShowFeedback(false)
      setScore(0)
      setCompletedTasks([])
    }
  }

  // Aktive Szenario-Durchführung
  if (activeScenario && activeScenario.phases) {
    const currentPhase = activeScenario.phases[currentPhaseIndex]
    const currentTask = currentPhase.tasks[currentTaskIndex]
    const totalPhases = activeScenario.phases.length
    const totalTasks = activeScenario.phases.reduce((sum, phase) => sum + phase.tasks.length, 0)
    const completedTasksCount = completedTasks.length

    return (
      <div className="scenario-active-container">
        <div className="scenario-header">
          <button className="btn-back" onClick={exitScenario}>← Beenden</button>
          <div className="scenario-title">
            <h2>🎯 {activeScenario.title}</h2>
            <div className="scenario-progress">
              <div className="progress-bar">
                <div 
                  className="progress-fill" 
                  style={{ width: `${(completedTasksCount / totalTasks) * 100}%` }}
                ></div>
              </div>
              <p>Phase {currentPhaseIndex + 1}/{totalPhases} | Aufgabe {currentTaskIndex + 1}/{currentPhase.tasks.length} | Score: {score}</p>
            </div>
          </div>
        </div>

        <div className="scenario-content">
          <div className="phase-info">
            <h3>📋 {currentPhase.title}</h3>
            <p>{currentPhase.description}</p>
          </div>

          <div className="task-container">
            <div className="task-header">
              <h4>{currentTask.title}</h4>
              <p className="task-description">{currentTask.description}</p>
            </div>

            <div className="task-question">
              <p className="question-text">{currentTask.question}</p>
            </div>

            <div className="options-list">
              {currentTask.options.map(option => {
                const isSelected = selectedAnswer?.id === option.id
                const isCorrect = option.correct
                const showResult = showFeedback

                return (
                  <button
                    key={option.id}
                    className={`option-btn ${isSelected ? 'selected' : ''} ${
                      showResult ? (isCorrect ? 'correct' : isSelected ? 'incorrect' : '') : ''
                    }`}
                    onClick={() => !showFeedback && handleAnswerSelect(option)}
                    disabled={showFeedback}
                  >
                    <span className="option-label">Option {option.id}:</span>
                    <span className="option-text">{option.text}</span>
                    {showResult && isCorrect && <span className="checkmark">✅</span>}
                  </button>
                )
              })}
            </div>

            {showFeedback && (
              <div className={`feedback ${selectedAnswer?.correct ? 'correct-feedback' : 'incorrect-feedback'}`}>
                {selectedAnswer?.correct ? (
                  <>
                    <p className="feedback-title">✅ Richtig!</p>
                    <p className="feedback-text">{selectedAnswer.feedback}</p>
                  </>
                ) : (
                  <>
                    <p className="feedback-title">❌ Nicht optimal</p>
                    <p className="feedback-text">{selectedAnswer?.feedback}</p>
                    <p className="feedback-hint">💡 Tipp: Überlege, was der Kunde wirklich braucht und wie du professionell kommunizierst.</p>
                  </>
                )}
                <div className="next-button-container">
                  <button className="btn primary" onClick={handleNextTask}>
                    {currentTaskIndex < currentPhase.tasks.length - 1 
                      ? 'Nächste Aufgabe' 
                      : currentPhaseIndex < activeScenario.phases.length - 1
                      ? 'Nächste Phase'
                      : 'Szenario abschließen'}
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="scenario-sidebar">
            <div className="scenario-info-card">
              <h4>📊 Szenario-Info</h4>
              <p><strong>Ziel:</strong> {activeScenario.goal}</p>
              <p><strong>Herausforderung:</strong> {activeScenario.challenge}</p>
              <p><strong>Zeitlimit:</strong> {activeScenario.timeLimit} Minuten</p>
              <div className="stakeholders">
                <strong>Beteiligte:</strong>
                <ul>
                  {activeScenario.stakeholders?.map((stakeholder, idx) => (
                    <li key={idx}>{stakeholder}</li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="phases-overview">
              <h4>Phasen-Übersicht</h4>
              {activeScenario.phases.map((phase, idx) => (
                <div 
                  key={idx} 
                  className={`phase-item ${idx === currentPhaseIndex ? 'active' : idx < currentPhaseIndex ? 'completed' : ''}`}
                >
                  <span className="phase-number">{idx + 1}</span>
                  <span className="phase-name">{phase.title}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    )
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

      {loading ? (
        <div className="loading-message">
          <p>Lade Verkaufsszenarien...</p>
        </div>
      ) : filteredScenarios.length === 0 ? (
        <div className="no-scenarios-message">
          <p>Keine Szenarien für diese Branche gefunden.</p>
        </div>
      ) : (
        <div className="scenarios-grid">
          {filteredScenarios.map(scenario => (
            <div key={scenario.id} className="scenario-card">
              <div className={`difficulty ${scenario.difficulty}`}>
                {scenario.difficulty === 'beginner' ? 'Anfänger' : 
                 scenario.difficulty === 'intermediate' ? 'Fortgeschritten' : 'Experte'}
              </div>
              <h4>{scenario.title}</h4>
              <p><strong>Situation:</strong> {scenario.description}</p>
              {scenario.phases && (
                <p className="scenario-stats">
                  {scenario.phases.length} Phasen • {scenario.phases.reduce((sum, p) => sum + p.tasks.length, 0)} Aufgaben
                </p>
              )}
              <button className="btn" onClick={() => startScenario(scenario.id)}>
                Szenario starten
              </button>
            </div>
          ))}
        </div>
      )}

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
                <p>{selectedScenario.situation || selectedScenario.description}</p>
                <h3>🎯 Herausforderung:</h3>
                <p>{selectedScenario.challenge || 'Meistere dieses Verkaufsszenario mit professionellen Techniken.'}</p>
                <h3>🏆 Ziel:</h3>
                <p>{selectedScenario.goal || 'Erfolgreich verkaufen und Kunden überzeugen.'}</p>
                {selectedScenario.timeLimit && (
                  <p><strong>⏱️ Zeitlimit:</strong> {selectedScenario.timeLimit} Minuten</p>
                )}
                {selectedScenario.phases && (
                  <div className="phases-preview">
                    <h4>Phasen:</h4>
                    <ul>
                      {selectedScenario.phases.map((phase, idx) => (
                        <li key={idx}>
                          {phase.title} ({phase.tasks.length} Aufgaben)
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
              <div className="scenario-actions">
                <button className="btn primary" onClick={beginScenario}>
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

const TRAINING_MODULE_NAMES = {
  'objection-handling': 'Einwandbehandlung',
  'question-techniques': 'Fragetechniken',
  'sales-psychology': 'Verkaufspsychologie',
  'sales-language': 'Verkaufssprache'
}
const TOTAL_TRAINING_MODULES = 4

// Leitfaden-Generator: Kapitel mit je mehreren Formulierungs-Varianten
// Angepasst für Kaltakquise im Callcenter (telefonisch, ohne persönliche Präsenz)
const LEITFADEN_KAPITEL = [
  {
    id: 'begruessung',
    title: 'Begrüßung',
    options: [
      'Guten Tag, mein Name ist [Ihr Name] von [Firma].',
      'Guten Tag, [Name des Gesprächspartners], hier ist [Ihr Name] von [Firma].',
      'Guten Tag, vielen Dank, dass Sie sich Zeit nehmen.',
      'Hallo, mein Name ist [Ihr Name]. Ich rufe im Auftrag von [Auftraggeber] an.',
      'Guten Tag, ich melde mich von [Firma] wegen [Thema].',
      'Guten Tag, [Name], ich rufe Sie kurz an, weil …'
    ]
  },
  {
    id: 'einstieg',
    title: 'Einstieg / Gesprächseröffnung',
    options: [
      'Haben Sie kurz Zeit für ein Gespräch?',
      'Ich rufe Sie an, weil ich Ihnen eine interessante Möglichkeit vorstellen möchte.',
      'Ich möchte Ihnen kurz erklären, warum ich anrufe.',
      'Sind Sie der richtige Ansprechpartner für [Thema]?',
      'Bevor ich Ihnen mehr erzähle: Haben Sie gerade 2-3 Minuten Zeit?',
      'Ich rufe an, um Ihnen zu zeigen, wie andere Unternehmen [Nutzen] erreichen.'
    ]
  },
  {
    id: 'fragen',
    title: 'Fragen & Bedarf',
    options: [
      'Wie handhaben Sie aktuell [Thema]?',
      'Was ist Ihnen dabei am wichtigsten?',
      'Welche Herausforderungen haben Sie in diesem Bereich?',
      'Was würde passieren, wenn Sie das Problem nicht lösen?',
      'Wie würden Sie idealerweise arbeiten wollen?',
      'Was wäre für Sie ein Erfolg in den nächsten 6 Monaten?',
      'Wer ist neben Ihnen noch in die Entscheidung eingebunden?',
      'Was sollte ich unbedingt noch wissen?',
      'Welche Fragen habe ich Ihnen noch nicht gestellt?',
      'Wie viele Mitarbeiter sind davon betroffen?',
      'Was kostet Sie die aktuelle Situation an Zeit oder Geld?'
    ]
  },
  {
    id: 'pitch',
    title: 'Lösung vorstellen (Pitch)',
    options: [
      'Darf ich Ihnen unsere Lösung kurz am Telefon erklären?',
      'Lassen Sie mich Ihnen zeigen, wie wir Sie unterstützen können.',
      'Unsere Lösung hilft Unternehmen dabei, [konkreter Nutzen].',
      'Wo sehen Sie den größten Nutzen für sich?',
      'Andere Kunden sagen uns, dass sie [konkreter Vorteil] erreichen.',
      'Der entscheidende Vorteil für Sie wäre [konkreter Mehrwert].',
      'Viele Unternehmen nutzen unsere Lösung, um [Problem] zu lösen.',
      'Stellen Sie sich vor, Sie könnten [konkreter Nutzen] – wie würde das für Sie aussehen?'
    ]
  },
  {
    id: 'einwaende',
    title: 'Einwände aufgreifen',
    options: [
      'Teuer im Vergleich zu was genau?',
      'Was müsste passieren, damit es sich für Sie lohnt?',
      'Das verstehe ich. Was genau möchten Sie noch bedenken?',
      'Verstehe. Darf ich Ihnen erklären, wie andere das gelöst haben?',
      'Das ist eine wichtige Frage. Lassen Sie mich das kurz einordnen.',
      'Was bräuchten Sie, um den nächsten Schritt zu gehen?',
      'Ich verstehe Ihre Bedenken. Was genau macht Sie unsicher?',
      'Das höre ich öfter. Lassen Sie mich Ihnen zeigen, warum es trotzdem passt.'
    ]
  },
  {
    id: 'abschluss',
    title: 'Abschluss & nächste Schritte',
    options: [
      'Was wäre der nächste sinnvolle Schritt für Sie?',
      'Wie klingt das für Sie – sollen wir mit [konkreter Schritt] starten?',
      'Wann möchten Sie starten – eher diese oder nächste Woche?',
      'Soll ich Ihnen die nächsten Schritte kurz zusammenfassen?',
      'Womit möchten Sie anfangen?',
      'Passt das so für Sie?',
      'Soll ich Ihnen eine E-Mail mit den Details schicken?',
      'Können wir einen kurzen Termin für nächste Woche vereinbaren?',
      'Wie wäre es mit einem 15-Minuten-Gespräch nächste Woche?'
    ]
  },
  {
    id: 'verabschiedung',
    title: 'Verabschiedung',
    options: [
      'Vielen Dank für Ihre Zeit und das Gespräch.',
      'Ich freue mich auf die weitere Zusammenarbeit.',
      'Kann ich Ihnen noch etwas am Telefon erklären?',
      'Bei Fragen können Sie mich jederzeit anrufen.',
      'Einen schönen Tag noch.',
      'Vielen Dank und auf Wiederhören.',
      'Ich sende Ihnen gerne die Informationen per E-Mail zu.'
    ]
  }
]

const LEITFADEN_CHAPTER_TITLES = Object.fromEntries(LEITFADEN_KAPITEL.map(k => [k.id, k.title]))

function LeitfadenOverview() {
  return (
    <div className="leitfaden-overview-container">
      <div className="section-header">
        <h2>Leitfaden</h2>
        <p>Erstelle und verwalte deine Verkaufsleitfäden für Kaltakquise im Callcenter.</p>
      </div>
      <div className="leitfaden-overview-cards">
        <NavLink to="/leitfaden/generator" className="leitfaden-overview-card">
          <div className="leitfaden-card-icon">📝</div>
          <h3>Leitfaden Generator</h3>
          <p>Erstelle einen neuen Gesprächsleitfaden mit vorgefertigten Sätzen und eigenen Formulierungen.</p>
          <div className="leitfaden-card-arrow">→</div>
        </NavLink>
        <NavLink to="/leitfaden/meine" className="leitfaden-overview-card">
          <div className="leitfaden-card-icon">📚</div>
          <h3>Meine Leitfäden</h3>
          <p>Verwalte deine gespeicherten Leitfäden, bearbeite sie oder nutze sie für deine Gespräche.</p>
          <div className="leitfaden-card-arrow">→</div>
        </NavLink>
      </div>
    </div>
  )
}

function LeitfadenGenerator() {
  const { user, setShowAuthModal } = useAuth()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const showToast = useToast()
  
  const [guideItems, setGuideItems] = React.useState([])
  const [customInput, setCustomInput] = React.useState('')
  const [dragSource, setDragSource] = React.useState(null) // 'suggest' | 'guide'
  const [dragIndex, setDragIndex] = React.useState(null)
  const [dropIndex, setDropIndex] = React.useState(null)
  const [editingId, setEditingId] = React.useState(null)
  const [editingText, setEditingText] = React.useState('')
  const [showSaveModal, setShowSaveModal] = React.useState(false)
  const [saveTitle, setSaveTitle] = React.useState('')
  const [saving, setSaving] = React.useState(false)
  const [showUSPExtractor, setShowUSPExtractor] = React.useState(false)
  const [uspWebsiteUrl, setUspWebsiteUrl] = React.useState('')
  const [uspInstructions, setUspInstructions] = React.useState('')
  const [extractingUSPs, setExtractingUSPs] = React.useState(false)
  const [extractedUSPs, setExtractedUSPs] = React.useState({
    grundsaetzlich: [],
    gegenueberKonkurrenten: [],
    gegenueberAlterenMethoden: []
  })
  const [currentGuideId, setCurrentGuideId] = React.useState(null)
  const nextId = React.useRef(1)
  // State für eingeklappte Kapitel (alle am Anfang eingeklappt = false)
  const [expandedChapters, setExpandedChapters] = React.useState({})

  // Laden eines Leitfadens zum Bearbeiten
  React.useEffect(() => {
    const editId = searchParams.get('edit')
    if (editId && user) {
      loadGuideForEdit(parseInt(editId, 10))
    }
  }, [searchParams, user])

  const loadGuideForEdit = async (guideId) => {
    try {
      const res = await apiFetch('/api/guides/me')
      if (res.ok) {
        const data = await res.json()
        const guide = data.guides?.find(g => g.id === guideId)
        if (guide) {
          const items = guide.items || []
          setGuideItems(items)
          // Setze nextId höher als die maximale ID in den Items
          const maxId = items.reduce((max, item) => Math.max(max, item.id || 0), 0)
          nextId.current = maxId + 1
          setCurrentGuideId(guideId)
          setSaveTitle(guide.title)
          if (guide.usps) {
            // Normalisiere USPs falls sie im alten Format sind
            const usps = guide.usps
            if (Array.isArray(usps)) {
              setExtractedUSPs({
                grundsaetzlich: usps,
                gegenueberKonkurrenten: [],
                gegenueberAlterenMethoden: []
              })
            } else {
              setExtractedUSPs({
                grundsaetzlich: usps.grundsaetzlich || [],
                gegenueberKonkurrenten: usps.gegenueberKonkurrenten || [],
                gegenueberAlterenMethoden: usps.gegenueberAlterenMethoden || []
              })
            }
          }
        }
      }
    } catch (error) {
      console.error('Fehler beim Laden des Leitfadens:', error)
    }
  }

  const addToGuide = (text, custom = false, chapterId = null) => {
    if (!text.trim()) return
    setGuideItems(prev => [...prev, { id: nextId.current++, text: text.trim(), custom, chapterId }])
    if (custom) setCustomInput('')
  }

  const removeFromGuide = (index) => {
    setGuideItems(prev => prev.filter((_, i) => i !== index))
  }

  const startEditing = (item) => {
    setEditingId(item.id)
    setEditingText(item.text)
  }

  const saveEditing = (itemId) => {
    if (!editingText.trim()) {
      setEditingId(null)
      setEditingText('')
      return
    }
    setGuideItems(prev => prev.map(item => 
      item.id === itemId ? { ...item, text: editingText.trim(), custom: true } : item
    ))
    setEditingId(null)
    setEditingText('')
  }

  const cancelEditing = () => {
    setEditingId(null)
    setEditingText('')
  }

  const moveInGuide = (fromIndex, toIndex) => {
    if (fromIndex === toIndex) return
    setGuideItems(prev => {
      const arr = [...prev]
      const [item] = arr.splice(fromIndex, 1)
      arr.splice(toIndex, 0, item)
      return arr
    })
  }

  const handleDragStart = (e, source, index, text, chapterId = null) => {
    setDragSource(source)
    setDragIndex(index)
    e.dataTransfer.setData('text/plain', text)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('application/json', JSON.stringify({ source, index, text, chapterId }))
    e.target.classList.add('leitfaden-dragging')
  }

  const handleDragEnd = (e) => {
    e.target.classList.remove('leitfaden-dragging')
    setDragSource(null)
    setDragIndex(null)
    setDropIndex(null)
  }

  const handleDragOver = (e, toIndex) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    if (dragSource === 'guide') setDropIndex(toIndex)
  }

  const handleDropOnGuide = (e, toIndex) => {
    e.preventDefault()
    try {
      const data = e.dataTransfer.getData('application/json')
      if (data) {
        const { source, index, text, chapterId } = JSON.parse(data)
        if (source === 'suggest') {
          addToGuide(text, false, chapterId || null)
        } else if (source === 'guide' && typeof index === 'number') {
          moveInGuide(index, toIndex)
        }
      } else {
        const text = e.dataTransfer.getData('text/plain')
        if (text) addToGuide(text, false, null)
      }
    } catch (_) {
      const text = e.dataTransfer.getData('text/plain')
      if (text) addToGuide(text, false, null)
    }
    setDropIndex(null)
    setDragSource(null)
    setDragIndex(null)
  }

  const handleCopy = () => {
    const text = guideItems.map(i => i.text).join('\n')
    if (text) {
      navigator.clipboard.writeText(text).then(() => showToast('Leitfaden in die Zwischenablage kopiert.', 'success'))
    }
  }

  const handleSave = async () => {
    if (!saveTitle.trim()) {
      alert('Bitte gib einen Titel ein')
      return
    }
    if (guideItems.length === 0) {
      alert('Der Leitfaden ist leer')
      return
    }
    if (!user) {
      setShowAuthModal(true)
      return
    }

    setSaving(true)
    try {
      const payload = {
        title: saveTitle.trim(),
        items: guideItems,
        usps: getTotalUSPCount() > 0 ? extractedUSPs : null
      }

      let res
      if (currentGuideId) {
        res = await apiFetch(`/api/guides/${currentGuideId}`, {
          method: 'PUT',
          body: JSON.stringify(payload)
        })
      } else {
        res = await apiFetch('/api/guides', {
          method: 'POST',
          body: JSON.stringify(payload)
        })
      }

      if (res.ok) {
        alert('Leitfaden gespeichert!')
        setShowSaveModal(false)
        setSaveTitle('')
        if (navigate) {
          navigate('/leitfaden/meine')
        }
      } else {
        const error = await res.json().catch(() => ({}))
        alert(`Fehler beim Speichern: ${error.error || 'Unbekannter Fehler'}`)
      }
    } catch (error) {
      console.error('Fehler beim Speichern:', error)
      alert('Fehler beim Speichern')
    } finally {
      setSaving(false)
    }
  }

  const handleExtractUSPs = async (e) => {
    if (e && e.preventDefault) {
      e.preventDefault()
      e.stopPropagation()
    }
    console.log('handleExtractUSPs called', e)
    console.log('uspWebsiteUrl:', uspWebsiteUrl)
    console.log('user:', user)
    
    if (!uspWebsiteUrl || !uspWebsiteUrl.trim()) {
      console.log('No URL provided')
      showToast('Bitte gib eine Website-URL ein', 'error')
      return
    }
    if (!user) {
      console.log('No user, showing auth modal')
      setShowAuthModal(true)
      return
    }

    console.log('Starting extraction...')
    setExtractingUSPs(true)
    try {
      console.log('Calling API for:', uspWebsiteUrl.trim())
      console.log('With instructions:', uspInstructions.trim() || '(none)')
      const res = await apiFetch('/api/guides/extract-usps', {
        method: 'POST',
        body: JSON.stringify({ 
          websiteUrl: uspWebsiteUrl.trim(),
          instructions: uspInstructions && uspInstructions.trim() ? uspInstructions.trim() : undefined
        })
      })

      console.log('API response status:', res.status, res.ok)

      if (res.ok) {
        const data = await res.json()
        console.log('API response data:', data)
        
        // Normalisiere die USPs (kann Array oder Objekt sein)
        const usps = data.usps || {}
        console.log('Raw USPs:', usps, 'Type:', Array.isArray(usps) ? 'Array' : 'Object')
        
        const normalizedUSPs = Array.isArray(usps) 
          ? { grundsaetzlich: usps, gegenueberKonkurrenten: [], gegenueberAlterenMethoden: [] }
          : {
              grundsaetzlich: usps.grundsaetzlich || [],
              gegenueberKonkurrenten: usps.gegenueberKonkurrenten || [],
              gegenueberAlterenMethoden: usps.gegenueberAlterenMethoden || []
            }
        
        console.log('Normalized USPs:', normalizedUSPs)
        setExtractedUSPs(normalizedUSPs)
        
        const totalCount = (normalizedUSPs.grundsaetzlich?.length || 0) + 
                          (normalizedUSPs.gegenueberKonkurrenten?.length || 0) + 
                          (normalizedUSPs.gegenueberAlterenMethoden?.length || 0)
        console.log('Total USP count:', totalCount)
        
        showToast(`USPs erfolgreich extrahiert: ${totalCount} gefunden`, 'success')
      } else {
        const error = await res.json().catch(() => ({}))
        const errorMessage = error.error || error.message || `HTTP ${res.status}: ${res.statusText}`
        console.error('Backend error:', error)
        showToast(`Fehler bei der Extraktion: ${errorMessage}`, 'error')
      }
    } catch (error) {
      console.error('Fehler bei der USP-Extraktion:', error)
      console.error('Error stack:', error.stack)
      showToast(`Fehler bei der USP-Extraktion: ${error.message || 'Netzwerkfehler'}`, 'error')
    } finally {
      setExtractingUSPs(false)
    }
  }

  const getTotalUSPCount = () => {
    if (!extractedUSPs || typeof extractedUSPs !== 'object') return 0
    return (extractedUSPs.grundsaetzlich?.length || 0) + 
           (extractedUSPs.gegenueberKonkurrenten?.length || 0) + 
           (extractedUSPs.gegenueberAlterenMethoden?.length || 0)
  }
  
  const addUSPsToGuide = () => {
    const allUSPs = [
      ...(extractedUSPs.grundsaetzlich || []),
      ...(extractedUSPs.gegenueberKonkurrenten || []),
      ...(extractedUSPs.gegenueberAlterenMethoden || [])
    ]
    if (allUSPs.length === 0) return
    const uspItems = allUSPs.map(usp => ({
      id: nextId.current++,
      text: `${usp.title}: ${usp.description}`,
      custom: true,
      chapterId: null
    }))
    setGuideItems(prev => [...prev, ...uspItems])
    setShowUSPExtractor(false)
  }

  return (
    <div className="leitfaden-container">
      <div className="section-header">
        <h2>Leitfaden-Generator</h2>
        <p>Baue deinen Gesprächsleitfaden für Kaltakquise im Callcenter per Drag & Drop aus vorgeschlagenen Sätzen und eigenen Formulierungen. Die Beispielsätze sind für telefonische Gespräche ohne persönliche Präsenz optimiert.</p>
      </div>

      <div className="leitfaden-layout">
        <section className="leitfaden-suggestions">
          <h3>Vorgeschlagene Sätze nach Kapitel</h3>
          <p className="leitfaden-hint">Wähle pro Kapitel eine Variante – ziehen oder klicken, um sie in deinen Leitfaden zu übernehmen.</p>
          <div className="leitfaden-chapters">
            {LEITFADEN_KAPITEL.map((kapitel) => {
              const isExpanded = expandedChapters[kapitel.id] || false
              return (
                <div key={kapitel.id} className="leitfaden-chapter">
                  <h4 
                    className="leitfaden-chapter-title leitfaden-chapter-toggle"
                    onClick={() => setExpandedChapters(prev => ({
                      ...prev,
                      [kapitel.id]: !isExpanded
                    }))}
                  >
                    <span className="leitfaden-chapter-icon">
                      {isExpanded ? '▼' : '▶'}
                    </span>
                    {kapitel.title}
                  </h4>
                  {isExpanded && (
                    <div className="leitfaden-chips">
                      {kapitel.options.map((satz, idx) => (
                        <span
                          key={idx}
                          className="leitfaden-chip"
                          draggable
                          onDragStart={(e) => handleDragStart(e, 'suggest', idx, satz, kapitel.id)}
                          onDragEnd={handleDragEnd}
                          onClick={() => addToGuide(satz, false, kapitel.id)}
                        >
                          {satz}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
          <div className="leitfaden-custom">
            <label>Eigenen Satz hinzufügen</label>
            <div className="leitfaden-custom-row">
              <input
                type="text"
                value={customInput}
                onChange={(e) => setCustomInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addToGuide(customInput, true)}
                placeholder="z. B. Ihr eigener Eröffnungssatz …"
                className="leitfaden-input"
              />
              <button type="button" className="btn" onClick={() => addToGuide(customInput, true)}>
                Hinzufügen
              </button>
            </div>
          </div>
        </section>

        <section
          className={`leitfaden-guide ${guideItems.length === 0 ? 'leitfaden-guide-empty' : ''}`}
          onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move' }}
          onDrop={(e) => {
            e.preventDefault()
            const data = e.dataTransfer.getData('application/json')
            if (data) {
              try {
                const { source, index, text, chapterId } = JSON.parse(data)
                if (source === 'suggest') addToGuide(text, false, chapterId || null)
                else if (source === 'guide') moveInGuide(index, guideItems.length)
              } catch (_) {}
            } else {
              const text = e.dataTransfer.getData('text/plain')
              if (text) addToGuide(text, false, null)
            }
            setDropIndex(null)
          }}
        >
          <h3>Dein Leitfaden</h3>
          <p className="leitfaden-hint">Reihenfolge per Drag & Drop ändern. Klicke auf einen Satz oder ✎ zum Bearbeiten. ✕ zum Entfernen.</p>
          {guideItems.length === 0 ? (
            <p className="leitfaden-placeholder">Sätze hierher ziehen oder aus den Vorschlägen hinzufügen.</p>
          ) : (
            <ol className="leitfaden-list">
              {guideItems.map((item, idx) => (
                <li
                  key={item.id}
                  className={`leitfaden-list-item ${dropIndex === idx ? 'leitfaden-drop-here' : ''} ${editingId === item.id ? 'leitfaden-list-item-editing' : ''}`}
                  draggable={editingId !== item.id}
                  onDragStart={(e) => editingId !== item.id && handleDragStart(e, 'guide', idx, item.text)}
                  onDragEnd={handleDragEnd}
                  onDragOver={(e) => editingId !== item.id && handleDragOver(e, idx)}
                  onDrop={(e) => {
                    if (editingId === item.id) return
                    e.preventDefault()
                    e.stopPropagation()
                    if (dragSource === 'guide' && typeof dragIndex === 'number') moveInGuide(dragIndex, idx)
                    setDropIndex(null)
                  }}
                >
                  <span className="leitfaden-list-num">{idx + 1}.</span>
                  {editingId === item.id ? (
                    <div className="leitfaden-edit-container">
                      <input
                        type="text"
                        className="leitfaden-edit-input"
                        value={editingText}
                        onChange={(e) => setEditingText(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault()
                            saveEditing(item.id)
                          } else if (e.key === 'Escape') {
                            e.preventDefault()
                            cancelEditing()
                          }
                        }}
                        onBlur={() => saveEditing(item.id)}
                        autoFocus
                      />
                      <div className="leitfaden-edit-actions">
                        <button type="button" className="leitfaden-edit-save" onClick={() => saveEditing(item.id)} aria-label="Speichern">✓</button>
                        <button type="button" className="leitfaden-edit-cancel" onClick={cancelEditing} aria-label="Abbrechen">✕</button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <span 
                        className="leitfaden-list-text" 
                        onClick={() => startEditing(item)}
                        title="Klicken zum Bearbeiten"
                      >
                        {item.text}
                      </span>
                      {item.custom && <span className="leitfaden-list-badge leitfaden-badge-eigen">eigen</span>}
                      {!item.custom && item.chapterId && <span className="leitfaden-list-badge">{LEITFADEN_CHAPTER_TITLES[item.chapterId] || item.chapterId}</span>}
                      <button type="button" className="leitfaden-edit" onClick={() => startEditing(item)} aria-label="Bearbeiten">✎</button>
                      <button type="button" className="leitfaden-remove" onClick={() => removeFromGuide(idx)} aria-label="Entfernen">✕</button>
                    </>
                  )}
                </li>
              ))}
            </ol>
          )}
          {guideItems.length > 0 && (
            <div className="leitfaden-actions">
              <button type="button" className="btn" onClick={handleCopy}>Leitfaden kopieren</button>
              <button type="button" className="btn btn-outline" onClick={() => setShowUSPExtractor(true)}>
                USPs extrahieren
              </button>
              <button type="button" className="btn btn-primary" onClick={() => setShowSaveModal(true)}>
                Leitfaden speichern
              </button>
              <button type="button" className="btn btn-outline" onClick={() => setGuideItems([])}>Leitfaden leeren</button>
            </div>
          )}
        </section>
      </div>

      {/* Save Modal */}
      {showSaveModal && (
        <div className="modal-overlay" onClick={() => !saving && setShowSaveModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>{currentGuideId ? 'Leitfaden aktualisieren' : 'Leitfaden speichern'}</h3>
            <div className="modal-form">
              <label>
                Titel:
                <input
                  type="text"
                  value={saveTitle}
                  onChange={(e) => setSaveTitle(e.target.value)}
                  placeholder="z.B. Kaltakquise Fachinfodienste"
                  disabled={saving}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !saving) {
                      handleSave()
                    }
                  }}
                />
              </label>
              {getTotalUSPCount() > 0 && (
                <div className="modal-usps-preview">
                  <p><strong>Extrahierte USPs:</strong> {getTotalUSPCount()}</p>
                </div>
              )}
            </div>
            <div className="modal-actions">
              <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                {saving ? 'Speichere...' : (currentGuideId ? 'Aktualisieren' : 'Speichern')}
              </button>
              <button className="btn btn-outline" onClick={() => setShowSaveModal(false)} disabled={saving}>
                Abbrechen
              </button>
            </div>
          </div>
        </div>
      )}

      {/* USP Extractor Modal */}
      {showUSPExtractor && (
        <div className="modal-overlay" onClick={() => !extractingUSPs && setShowUSPExtractor(false)}>
          <div className="modal-content modal-content-large" onClick={(e) => e.stopPropagation()}>
            <h3>USPs aus Website extrahieren</h3>
            <div className="modal-form">
              <label>
                Website-URL
                <input
                  type="url"
                  value={uspWebsiteUrl}
                  onChange={(e) => setUspWebsiteUrl(e.target.value)}
                  placeholder="https://www.beispiel.de"
                  disabled={extractingUSPs}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !extractingUSPs && e.ctrlKey) {
                      e.preventDefault()
                      handleExtractUSPs(e)
                    }
                  }}
                />
              </label>
              <label>
                Individuelle Anweisungen (optional)
                <textarea
                  value={uspInstructions}
                  onChange={(e) => setUspInstructions(e.target.value)}
                  placeholder="z.B. Fokussiere dich nur auf das Produkt XYZ, ignoriere andere Produkte..."
                  disabled={extractingUSPs}
                  rows={3}
                  style={{ 
                    width: '100%', 
                    padding: '0.75rem', 
                    borderRadius: '6px', 
                    border: '1px solid #4a5568',
                    backgroundColor: '#2d3748',
                    color: '#e2e8f0',
                    fontFamily: 'inherit',
                    fontSize: '0.9rem',
                    resize: 'vertical'
                  }}
                />
                <small style={{ color: '#a0aec0', fontSize: '0.85rem', marginTop: '0.25rem', display: 'block' }}>
                  Gib hier spezifische Anweisungen ein, z.B. wenn die Website mehrere Produkte hat und du nur Informationen zu einem bestimmten Produkt benötigst.
                </small>
              </label>
              <button 
                type="button"
                className="btn btn-primary" 
                onClick={(e) => {
                  console.log('Button clicked, uspWebsiteUrl:', uspWebsiteUrl)
                  handleExtractUSPs(e)
                }} 
                disabled={extractingUSPs || !uspWebsiteUrl || !uspWebsiteUrl.trim()}
              >
                {extractingUSPs ? 'Extrahiere USPs...' : 'USPs extrahieren'}
              </button>
            </div>
            {getTotalUSPCount() > 0 && (
              <div className="usp-results">
                <h4>Extrahierte USPs:</h4>
                
                {extractedUSPs.grundsaetzlich && extractedUSPs.grundsaetzlich.length > 0 && (
                  <div className="usp-category">
                    <h5 className="usp-category-title">1. Grundsätzliche USPs</h5>
                    <div className="usp-cards-grid">
                      {extractedUSPs.grundsaetzlich.map((usp, idx) => (
                        <div key={`grund-${idx}`} className="usp-card">
                          <div className="usp-card-header">
                            <h6 className="usp-card-title">{usp.title}</h6>
                          </div>
                          <div className="usp-card-body">
                            <p className="usp-card-description">{usp.description}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {extractedUSPs.gegenueberKonkurrenten && extractedUSPs.gegenueberKonkurrenten.length > 0 && (
                  <div className="usp-category">
                    <h5 className="usp-category-title">2. USPs gegenüber ähnlichen Konkurrenten</h5>
                    <div className="usp-cards-grid">
                      {extractedUSPs.gegenueberKonkurrenten.map((usp, idx) => (
                        <div key={`konkurrent-${idx}`} className="usp-card">
                          <div className="usp-card-header">
                            <h6 className="usp-card-title">{usp.title}</h6>
                          </div>
                          <div className="usp-card-body">
                            <p className="usp-card-description">{usp.description}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {extractedUSPs.gegenueberAlterenMethoden && extractedUSPs.gegenueberAlterenMethoden.length > 0 && (
                  <div className="usp-category">
                    <h5 className="usp-category-title">3. USPs gegenüber älteren Methoden</h5>
                    <div className="usp-cards-grid">
                      {extractedUSPs.gegenueberAlterenMethoden.map((usp, idx) => (
                        <div key={`alt-${idx}`} className="usp-card">
                          <div className="usp-card-header">
                            <h6 className="usp-card-title">{usp.title}</h6>
                          </div>
                          <div className="usp-card-body">
                            <p className="usp-card-description">{usp.description}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                <div className="usp-results-actions">
                  <button className="btn btn-primary" onClick={addUSPsToGuide}>
                    Alle USPs zu Leitfaden hinzufügen
                  </button>
                </div>
              </div>
            )}
            <div className="modal-actions">
              <button 
                type="button"
                className="btn btn-outline" 
                onClick={() => {
                  setShowUSPExtractor(false)
                  setUspWebsiteUrl('')
                  setUspInstructions('')
                }} 
                disabled={extractingUSPs}
              >
                Schließen
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function MeineLeitfaeden() {
  const { user, loading: authLoading, setShowAuthModal } = useAuth()
  const [guides, setGuides] = React.useState([])
  const [loading, setLoading] = React.useState(true)
  const [selectedGuide, setSelectedGuide] = React.useState(null)
  const [viewMode, setViewMode] = React.useState('full') // 'full' or 'bullets'
  const [showDeleteConfirm, setShowDeleteConfirm] = React.useState(null)
  const [convertedBullets, setConvertedBullets] = React.useState([])
  const [convertingBullets, setConvertingBullets] = React.useState(false)
  const [selectedUSP, setSelectedUSP] = React.useState(null)
  const [hoveredUSP, setHoveredUSP] = React.useState(null)
  const [tooltipPos, setTooltipPos] = React.useState({ top: 0, left: 0 })
  const showToast = useToast()

  React.useEffect(() => {
    if (!user) {
      setGuides([])
      setLoading(false)
      return
    }
    loadGuides()
  }, [user])

  const loadGuides = async () => {
    setLoading(true)
    try {
      const res = await apiFetch('/api/guides/me')
      if (res.ok) {
        const data = await res.json()
        setGuides(data.guides || [])
      } else {
        console.error('Fehler beim Laden der Leitfäden')
      }
    } catch (error) {
      console.error('Fehler beim Laden der Leitfäden:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (guideId) => {
    try {
      const res = await apiFetch(`/api/guides/${guideId}`, { method: 'DELETE' })
      if (res.ok) {
        setGuides(prev => prev.filter(g => g.id !== guideId))
        if (selectedGuide?.id === guideId) {
          setSelectedGuide(null)
        }
        setShowDeleteConfirm(null)
        showToast('Leitfaden gelöscht', 'success')
      } else {
        showToast('Fehler beim Löschen', 'error')
      }
    } catch (error) {
      console.error('Fehler beim Löschen:', error)
      showToast('Fehler beim Löschen', 'error')
    }
  }

  // Konvertiere automatisch wenn ViewMode auf bullets wechselt
  React.useEffect(() => {
    if (selectedGuide && viewMode === 'bullets' && selectedGuide.items && selectedGuide.items.length > 0) {
      const convertToBulletPoints = async () => {
        setConvertingBullets(true)
        try {
          const res = await apiFetch('/api/guides/convert-to-bullets', {
            method: 'POST',
            body: JSON.stringify({ items: selectedGuide.items })
          })
          
          if (res.ok) {
            const data = await res.json()
            const bullets = data.bullets || []
            setConvertedBullets(bullets.map(b => `• ${b}`))
          } else {
            // Fallback auf einfache Komprimierung
            console.error('KI-Konvertierung fehlgeschlagen, verwende Fallback')
            const fallback = selectedGuide.items.map(item => {
              const text = item.text.trim()
              const words = text.split(/\s+/).filter(w => w.length > 3).slice(0, 4)
              return `• ${words.join(' ')}`
            })
            setConvertedBullets(fallback)
          }
        } catch (error) {
          console.error('Fehler bei KI-Konvertierung:', error)
          // Fallback auf einfache Komprimierung
          const fallback = selectedGuide.items.map(item => {
            const text = item.text.trim()
            const words = text.split(/\s+/).filter(w => w.length > 3).slice(0, 4)
            return `• ${words.join(' ')}`
          })
          setConvertedBullets(fallback)
        } finally {
          setConvertingBullets(false)
        }
      }
      
      convertToBulletPoints()
    } else {
      setConvertedBullets([])
    }
  }, [selectedGuide, viewMode])
  
  const compressUSP = (usp) => {
    // Komprimiere USP-Titel und Beschreibung für Stichpunkte
    const compressText = (text) => {
      if (!text) return ''
      let compressed = text.trim()
      
      // Entferne Artikel
      compressed = compressed.replace(/\b(der|die|das|ein|eine|einen|einem|einer)\s+/gi, ' ')
      
      // Entferne häufige Präpositionen
      compressed = compressed.replace(/\s+(für|von|mit|auf|in|zu|an|bei|über|unter)\s+/gi, ' ')
      
      // Entferne Hilfsverben
      compressed = compressed.replace(/\s+(ist|sind|war|waren|wird|werden|hat|haben)\s+/gi, ' ')
      
      // Bereinige
      compressed = compressed.replace(/\s+/g, ' ').trim()
      
      // Begrenze auf wichtige Keywords
      if (compressed.length > 35) {
        const words = compressed.split(/\s+/)
        const important = words.filter(w => w.length > 3).slice(0, 5)
        compressed = important.join(' ')
      }
      
      return compressed
    }
    
    return {
      title: compressText(usp.title),
      description: compressText(usp.description)
    }
  }


  if (authLoading || loading) {
    return <div className="loading">Lade Leitfäden...</div>
  }

  if (!user) {
    return (
      <div className="section-header">
        <h2>Meine Leitfäden</h2>
        <p>Bitte melde dich an, um deine Leitfäden zu sehen.</p>
        <button className="btn" onClick={() => setShowAuthModal(true)}>Anmelden</button>
      </div>
    )
  }

  if (selectedGuide) {
    // Normalisiere USPs
    const usps = selectedGuide.usps 
      ? (Array.isArray(selectedGuide.usps) 
          ? { grundsaetzlich: selectedGuide.usps, gegenueberKonkurrenten: [], gegenueberAlterenMethoden: [] }
          : selectedGuide.usps)
      : { grundsaetzlich: [], gegenueberKonkurrenten: [], gegenueberAlterenMethoden: [] }
    
    const grundsaetzlich = usps.grundsaetzlich || []
    const gegenueberKonkurrenten = usps.gegenueberKonkurrenten || []
    const gegenueberAlterenMethoden = usps.gegenueberAlterenMethoden || []
    
    // Alle USPs für Sidebars sammeln
    const allUSPs = [
      ...grundsaetzlich.map((usp, idx) => ({ ...usp, category: 'grundsaetzlich', index: idx })),
      ...gegenueberKonkurrenten.map((usp, idx) => ({ ...usp, category: 'gegenueberKonkurrenten', index: idx })),
      ...gegenueberAlterenMethoden.map((usp, idx) => ({ ...usp, category: 'gegenueberAlterenMethoden', index: idx }))
    ]
    
    // Generiere Einwände basierend auf den USPs
    const generateObjections = (usps) => {
      const objections = []
      
      // Standard-Einwände, die zu USPs passen
      const standardObjections = [
        {
          title: 'Das ist mir zu teuer',
          response: usps.grundsaetzlich.length > 0 
            ? `Verstehe ich. Lassen Sie mich zeigen, warum sich die Investition lohnt: ${usps.grundsaetzlich[0]?.title || 'Unser Produkt bietet einen klaren Mehrwert'}. ${usps.grundsaetzlich[0]?.description || 'Der ROI überwiegt die Kosten deutlich.'}`
            : 'Verstehe ich. Lassen Sie uns den konkreten Nutzen und ROI betrachten.'
        },
        {
          title: 'Ich habe keine Zeit',
          response: usps.grundsaetzlich.length > 0
            ? `Das verstehe ich. Genau deshalb spart unser Produkt Zeit: ${usps.grundsaetzlich.find(u => u.title?.toLowerCase().includes('zeit') || u.description?.toLowerCase().includes('zeit'))?.description || usps.grundsaetzlich[0]?.description || 'Effizienzsteigerung'}`
            : 'Verstehe ich. Unser Produkt spart langfristig Zeit durch Automatisierung.'
        },
        {
          title: 'Ich kenne Ihre Firma nicht',
          response: usps.grundsaetzlich.length > 0
            ? `Das ist verständlich. Wir sind spezialisiert auf: ${usps.grundsaetzlich[0]?.title || 'Ihre Branche'}. ${usps.grundsaetzlich[0]?.description || 'Mit nachweisbaren Erfolgen.'}`
            : 'Verstehe ich. Wir haben bereits viele erfolgreiche Projekte in Ihrer Branche.'
        },
        {
          title: 'Die Konkurrenz ist günstiger',
          response: usps.gegenueberKonkurrenten.length > 0
            ? `Das kann sein. Der Unterschied liegt im Mehrwert: ${usps.gegenueberKonkurrenten[0]?.title || 'Qualität und Service'}. ${usps.gegenueberKonkurrenten[0]?.description || 'Langfristig ist unsere Lösung kosteneffizienter.'}`
            : usps.grundsaetzlich.length > 0
              ? `Der Preis allein sagt wenig aus. Entscheidend ist der Wert: ${usps.grundsaetzlich[0]?.description || 'Unser Produkt bietet mehr als nur einen niedrigen Preis.'}`
              : 'Der Preis ist nur ein Faktor. Entscheidend ist der Gesamtnutzen und ROI.'
        },
        {
          title: 'Wir haben das schon anders gelöst',
          response: usps.gegenueberAlterenMethoden.length > 0
            ? `Verstehe ich. Der Vorteil unserer Lösung: ${usps.gegenueberAlterenMethoden[0]?.title || 'Modernere Technologie'}. ${usps.gegenueberAlterenMethoden[0]?.description || 'Deutlich effizienter und zukunftssicherer.'}`
            : usps.grundsaetzlich.length > 0
              ? `Das ist gut. Unsere Lösung bietet zusätzlich: ${usps.grundsaetzlich[0]?.description || 'Moderne Technologie und bessere Ergebnisse.'}`
              : 'Verstehe ich. Unsere Lösung bietet moderne Vorteile gegenüber älteren Methoden.'
        },
        {
          title: 'Ich muss das erst mit meinem Team besprechen',
          response: usps.grundsaetzlich.length > 0
            ? `Das ist sinnvoll. Für die Besprechung: ${usps.grundsaetzlich[0]?.title || 'Die wichtigsten Vorteile'}. ${usps.grundsaetzlich[0]?.description || 'Das hilft bei der Entscheidungsfindung.'}`
            : 'Gerne. Ich kann Ihnen eine Zusammenfassung der wichtigsten Punkte für die Besprechung geben.'
        }
      ]
      
      // Füge USP-spezifische Einwände hinzu
      usps.grundsaetzlich.forEach((usp, idx) => {
        if (idx < 3) { // Maximal 3 zusätzliche USP-bezogene Einwände
          objections.push({
            title: `Ist ${usp.title} wirklich so wichtig?`,
            response: `Ja, absolut. ${usp.description} Das ist einer unserer Kernvorteile und macht den Unterschied.`
          })
        }
      })
      
      return [...standardObjections, ...objections].slice(0, 8) // Maximal 8 Einwände
    }
    
    // Links: Alle USPs, Rechts: Einwände
    const leftUSPs = allUSPs
    const objections = generateObjections(usps)
    
    return (
      <div className="leitfaden-viewer-container">
        <div className="leitfaden-viewer-header">
          <button className="btn btn-outline" onClick={() => { setSelectedGuide(null); setSelectedUSP(null); }}>← Zurück</button>
          <h2>{selectedGuide.title}</h2>
          <div className="leitfaden-viewer-actions">
            <button 
              className={`btn ${viewMode === 'full' ? 'btn-primary' : 'btn-outline'}`}
              onClick={() => setViewMode('full')}
            >
              Vollständig
            </button>
            <button 
              className={`btn ${viewMode === 'bullets' ? 'btn-primary' : 'btn-outline'}`}
              onClick={() => setViewMode('bullets')}
            >
              Stichpunkte
            </button>
            <NavLink to={`/leitfaden/generator?edit=${selectedGuide.id}`} className="btn btn-outline">
              Bearbeiten
            </NavLink>
          </div>
        </div>
        <div className="leitfaden-viewer-layout">
          {/* Linke Sidebar: USPs */}
          <div className="leitfaden-viewer-sidebar leitfaden-viewer-sidebar-left">
            <h3>USPs</h3>
            {leftUSPs.length > 0 ? (
              <div className="usp-sidebar-list">
                {leftUSPs.map((usp, idx) => {
                  const displayUSP = viewMode === 'bullets' ? compressUSP(usp) : usp
                  const uspId = `left-${usp.category}-${usp.index}`
                  const isHovered = hoveredUSP === uspId
                  return (
                    <div
                      key={uspId}
                      className="usp-sidebar-item"
                      onMouseEnter={(e) => {
                        const updatePos = () => {
                          const rect = e.currentTarget.getBoundingClientRect()
                          setTooltipPos({
                            top: rect.top,
                            left: rect.right + 10
                          })
                        }
                        setHoveredUSP(uspId)
                        updatePos()
                        const handleScroll = () => updatePos()
                        window.addEventListener('scroll', handleScroll, true)
                        e.currentTarget._scrollHandler = handleScroll
                      }}
                      onMouseMove={(e) => {
                        if (hoveredUSP === uspId) {
                          const rect = e.currentTarget.getBoundingClientRect()
                          setTooltipPos({
                            top: rect.top,
                            left: rect.right + 10
                          })
                        }
                      }}
                      onMouseLeave={(e) => {
                        setHoveredUSP(null)
                        if (e.currentTarget._scrollHandler) {
                          window.removeEventListener('scroll', e.currentTarget._scrollHandler, true)
                          delete e.currentTarget._scrollHandler
                        }
                      }}
                    >
                      <div className="usp-sidebar-title">{displayUSP.title}</div>
                      {isHovered && (
                        <div 
                          className="usp-sidebar-tooltip usp-sidebar-tooltip-left"
                          style={{ top: `${tooltipPos.top}px`, left: `${tooltipPos.left}px` }}
                        >
                          <div className="usp-sidebar-tooltip-content">
                            <strong>{displayUSP.title}</strong>
                            <p>{displayUSP.description}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            ) : (
              <p className="usp-sidebar-empty">Keine USPs verfügbar</p>
            )}
          </div>
          
          {/* Zentrale Content-Area */}
          <div className="leitfaden-viewer-content">
            {selectedUSP ? (
              <div className="leitfaden-viewer-usp-detail">
                <button className="btn btn-outline btn-sm" onClick={() => setSelectedUSP(null)} style={{ marginBottom: '1rem' }}>
                  ← Zurück zum Leitfaden
                </button>
                <h3>{selectedUSP.title}</h3>
                <div className="usp-detail-description">
                  <p>{selectedUSP.description}</p>
                </div>
              </div>
            ) : (
              <>
                {viewMode === 'full' ? (
                  <ol className="leitfaden-viewer-list">
                    {selectedGuide.items.map((item, idx) => (
                      <li key={idx} className="leitfaden-viewer-item">
                        <span className="leitfaden-viewer-num">{idx + 1}.</span>
                        <span className="leitfaden-viewer-text">{item.text}</span>
                      </li>
                    ))}
                  </ol>
                ) : (
                  <div>
                    {convertingBullets ? (
                      <div className="loading-bullets">
                        <p>Konvertiere zu Stichpunkten...</p>
                      </div>
                    ) : convertedBullets.length > 0 ? (
                      <ul className="leitfaden-viewer-bullets">
                        {convertedBullets.map((bullet, idx) => (
                          <li key={idx} className="leitfaden-viewer-bullet">{bullet}</li>
                        ))}
                      </ul>
                    ) : (
                      <ul className="leitfaden-viewer-bullets">
                        {selectedGuide.items.map((item, idx) => {
                          const words = item.text.split(/\s+/).filter(w => w.length > 3).slice(0, 4)
                          return (
                            <li key={idx} className="leitfaden-viewer-bullet">• {words.join(' ')}</li>
                          )
                        })}
                      </ul>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
          
          {/* Rechte Sidebar: Einwände */}
          <div className="leitfaden-viewer-sidebar leitfaden-viewer-sidebar-right">
            <h3>Mögliche Einwände</h3>
            {objections.length > 0 ? (
              <div className="usp-sidebar-list">
                {objections.map((objection, idx) => {
                  const objectionId = `objection-${idx}`
                  const isHovered = hoveredUSP === objectionId
                  return (
                    <div
                      key={objectionId}
                      className="usp-sidebar-item"
                      onMouseEnter={(e) => {
                        const updatePos = () => {
                          const rect = e.currentTarget.getBoundingClientRect()
                          setTooltipPos({
                            top: rect.top,
                            left: rect.left - 310
                          })
                        }
                        setHoveredUSP(objectionId)
                        updatePos()
                        const handleScroll = () => updatePos()
                        window.addEventListener('scroll', handleScroll, true)
                        e.currentTarget._scrollHandler = handleScroll
                      }}
                      onMouseMove={(e) => {
                        if (hoveredUSP === objectionId) {
                          const rect = e.currentTarget.getBoundingClientRect()
                          setTooltipPos({
                            top: rect.top,
                            left: rect.left - 310
                          })
                        }
                      }}
                      onMouseLeave={(e) => {
                        setHoveredUSP(null)
                        if (e.currentTarget._scrollHandler) {
                          window.removeEventListener('scroll', e.currentTarget._scrollHandler, true)
                          delete e.currentTarget._scrollHandler
                        }
                      }}
                    >
                      <div className="usp-sidebar-title">{objection.title}</div>
                      {isHovered && (
                        <div 
                          className="usp-sidebar-tooltip usp-sidebar-tooltip-right"
                          style={{ top: `${tooltipPos.top}px`, left: `${tooltipPos.left}px` }}
                        >
                          <div className="usp-sidebar-tooltip-content">
                            <strong>{objection.title}</strong>
                            <p><strong>Antwort:</strong> {objection.response}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            ) : (
              <p className="usp-sidebar-empty">Keine Einwände verfügbar</p>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="meine-leitfaeden-container">
      <div className="section-header">
        <h2>Meine Leitfäden</h2>
        <div className="meine-leitfaeden-actions">
          <NavLink to="/leitfaden/generator" className="btn btn-primary">
            + Neuer Leitfaden
          </NavLink>
        </div>
      </div>
      {guides.length === 0 ? (
        <div className="meine-leitfaeden-empty">
          <p>Du hast noch keine Leitfäden gespeichert.</p>
          <NavLink to="/leitfaden/generator" className="btn btn-primary">
            Ersten Leitfaden erstellen
          </NavLink>
        </div>
      ) : (
        <div className="meine-leitfaeden-list">
          {guides.map((guide) => (
            <div key={guide.id} className="meine-leitfaeden-item">
              <div className="meine-leitfaeden-item-content">
                <h3>{guide.title}</h3>
                <p className="meine-leitfaeden-meta">
                  {guide.items.length} Sätze • Erstellt: {new Date(guide.createdAt).toLocaleDateString('de-DE')}
                </p>
              </div>
              <div className="meine-leitfaeden-item-actions">
                <button className="btn btn-outline" onClick={() => setSelectedGuide(guide)}>
                  Anzeigen
                </button>
                <NavLink to={`/leitfaden/generator?edit=${guide.id}`} className="btn btn-outline">
                  Bearbeiten
                </NavLink>
                <button 
                  className="btn btn-danger" 
                  onClick={() => setShowDeleteConfirm(guide.id)}
                >
                  Löschen
                </button>
              </div>
              {showDeleteConfirm === guide.id && (
                <div className="meine-leitfaeden-delete-confirm">
                  <p>Möchtest du diesen Leitfaden wirklich löschen?</p>
                  <div className="meine-leitfaeden-delete-actions">
                    <button className="btn btn-danger" onClick={() => handleDelete(guide.id)}>
                      Ja, löschen
                    </button>
                    <button className="btn btn-outline" onClick={() => setShowDeleteConfirm(null)}>
                      Abbrechen
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function Progress() {
  const { user, loading: authLoading, setShowAuthModal } = useAuth()
  const [progressData, setProgressData] = React.useState(null)
  const [loading, setLoading] = React.useState(true)

  React.useEffect(() => {
    if (!user) {
      setProgressData(null)
      setLoading(false)
      return
    }
    setLoading(true)
    apiFetch('/api/progress/me')
      .then(r => r.ok ? r.json() : { progress: [], trainingActivity: [], totalScenarios: 0 })
      .then(data => {
        setProgressData(data)
        setLoading(false)
      })
      .catch(() => {
        setProgressData({ progress: [], trainingActivity: [], totalScenarios: 0 })
        setLoading(false)
      })
  }, [user])

  if (authLoading || (user && loading)) {
    return (
      <div className="progress-container">
        <div className="section-header">
          <p>Lade Fortschritt…</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="progress-container">
        <div className="section-header">
          <h2>Fortschritt</h2>
          <p>Melde dich an, um deinen Fortschritt zu speichern und Erfolge zu sammeln.</p>
        </div>
        <div className="progress-login-gate">
          <div className="progress-login-card">
            <div className="progress-login-icon">📊</div>
            <h3>Anmeldung erforderlich</h3>
            <p>Hier siehst du, welche Trainings und Szenarien du abgeschlossen hast, wann du sie gemacht hast und welche Erfolge du freischalten kannst.</p>
            <button type="button" className="btn btn-primary" onClick={() => setShowAuthModal(true)}>
              Anmelden
            </button>
          </div>
        </div>
      </div>
    )
  }

  const progress = progressData?.progress || []
  const trainingActivity = progressData?.trainingActivity || []
  const totalScenarios = Math.max(progressData?.totalScenarios ?? 0, 1)
  const completedScenarios = progress.filter(p => p.completed).length
  const completedTrainings = trainingActivity.length
  const totalXP = completedScenarios * 100 + completedTrainings * 50
  const level = Math.floor(totalXP / 500) + 1
  const trainingProgressPct = (completedTrainings / TOTAL_TRAINING_MODULES) * 100
  const scenarioProgressPct = totalScenarios > 0 ? (completedScenarios / totalScenarios) * 100 : 0

  const achievements = [
    { id: 1, name: 'Erste Schritte', description: 'Erstes Training abgeschlossen', earned: completedTrainings >= 1 },
    { id: 2, name: 'Einwand-Profi', description: 'Einwandbehandlung-Training abgeschlossen', earned: trainingActivity.some(t => t.module_id === 'objection-handling') },
    { id: 3, name: 'Fragen-Meister', description: 'Fragetechniken-Training abgeschlossen', earned: trainingActivity.some(t => t.module_id === 'question-techniques') },
    { id: 4, name: 'Szenario-Champion', description: 'Alle Szenarien durchgespielt', earned: totalScenarios > 0 && completedScenarios >= totalScenarios },
    { id: 5, name: 'Vollständiger Lehrplan', description: 'Alle 4 Trainingsmodule abgeschlossen', earned: completedTrainings >= TOTAL_TRAINING_MODULES }
  ]

  const recentActivity = [
    ...progress.filter(p => p.completed_at).map(p => ({
      at: new Date(p.completed_at).getTime(),
      date: new Date(p.completed_at).toLocaleDateString('de-DE'),
      activity: `${p.title || 'Szenario'} abgeschlossen`,
      xp: (p.score || 0) || 100
    })),
    ...trainingActivity.map(t => ({
      at: t.completed_at ? new Date(t.completed_at).getTime() : 0,
      date: t.completed_at ? new Date(t.completed_at).toLocaleDateString('de-DE') : '',
      activity: `${TRAINING_MODULE_NAMES[t.module_id] || t.module_id}-Training abgeschlossen`,
      xp: 50
    }))
  ].sort((a, b) => b.at - a.at).slice(0, 10)

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
            <h3>Level {level}</h3>
            <p>{totalXP} XP</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">📚</div>
          <div className="stat-content">
            <h3>{completedTrainings}/{TOTAL_TRAINING_MODULES}</h3>
            <p>Trainings abgeschlossen</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">🎯</div>
          <div className="stat-content">
            <h3>{completedScenarios}/{totalScenarios}</h3>
            <p>Szenarien gemeistert</p>
          </div>
        </div>
      </div>

      <div className="progress-sections">
        <div className="progress-section">
          <h3>Training-Fortschritt</h3>
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${trainingProgressPct}%` }}></div>
          </div>
          <p>{completedTrainings} von {TOTAL_TRAINING_MODULES} Trainings abgeschlossen</p>
        </div>
        <div className="progress-section">
          <h3>Szenario-Fortschritt</h3>
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${scenarioProgressPct}%` }}></div>
          </div>
          <p>{completedScenarios} von {totalScenarios} Szenarien gemeistert</p>
        </div>
      </div>

      <div className="achievements-section">
        <h3>Erfolge</h3>
        <div className="achievements-grid">
          {achievements.map(achievement => (
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
          {recentActivity.length === 0 ? (
            <p className="activity-empty">Noch keine Aktivitäten. Starte ein Training oder ein Szenario!</p>
          ) : (
            recentActivity.map((activity, idx) => (
            <div key={idx} className="activity-item">
              <div className="activity-date">{activity.date}</div>
              <div className="activity-description">{activity.activity}</div>
              <div className="activity-xp">+{activity.xp} XP</div>
            </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}

function Kontakt() {
  return (
    <div className="page-container">
      <div className="section-header">
        <h2>Kontakt</h2>
      </div>
      <div className="content-section">
        <h3>Wir freuen uns auf Ihre Nachricht</h3>
        <p>Haben Sie Fragen, Anregungen oder benötigen Sie Unterstützung? Kontaktieren Sie uns gerne.</p>
        
        <div className="contact-info">
          <div className="contact-item">
            <h4>E-Mail</h4>
            <p>
              <a href="mailto:mail@juliansteiner.de" className="email-link">mail@juliansteiner.de</a>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

function Datenschutz() {
  return (
    <div className="page-container">
      <div className="section-header">
        <h2>Datenschutzerklärung</h2>
      </div>
      <div className="content-section">
        <h3>1. Datenschutz auf einen Blick</h3>
        
        <h4>Allgemeine Hinweise</h4>
        <p>
          Die folgenden Hinweise geben einen einfachen Überblick darüber, was mit Ihren personenbezogenen Daten 
          passiert, wenn Sie diese Website besuchen. Personenbezogene Daten sind alle Daten, mit denen Sie persönlich 
          identifiziert werden können.
        </p>

        <h4>Datenerfassung auf dieser Website</h4>
        <p>
          Wer ist verantwortlich für die Datenerfassung auf dieser Website? Die Datenverarbeitung auf dieser Website 
          erfolgt durch den Websitebetreiber. Dessen Kontaktdaten können Sie dem Abschnitt „Hinweis zur 
          Verantwortlichen Stelle" in dieser Datenschutzerklärung entnehmen.
        </p>

        <h3>2. Hosting</h3>
        <p>
          Diese Website wird bei einem externen Dienstleister gehostet (Hoster). Die personenbezogenen Daten, die 
          auf dieser Website erfasst werden, werden auf den Servern des Hosters gespeichert.
        </p>

        <h3>3. Allgemeine Hinweise und Pflichtinformationen</h3>
        
        <h4>Datenschutz</h4>
        <p>
          Die Betreiber dieser Seiten nehmen den Schutz Ihrer persönlichen Daten sehr ernst. Wir behandeln Ihre 
          personenbezogenen Daten vertraulich und entsprechend den gesetzlichen Datenschutzbestimmungen sowie dieser 
          Datenschutzerklärung.
        </p>

        <h4>Hinweis zur verantwortlichen Stelle</h4>
      

        <h3>4. Datenerfassung auf dieser Website</h3>
        
        <h4>Cookies</h4>
        <p>
          Unsere Internetseiten verwenden teilweise so genannte Cookies. Cookies richten auf Ihrem Rechner keinen 
          Schaden an und enthalten keine Viren. Cookies dienen dazu, unser Angebot nutzerfreundlicher, effektiver 
          und sicherer zu machen.
        </p>

        <h3>5. Ihre Rechte</h3>
        <p>
          Sie haben jederzeit das Recht, unentgeltlich Auskunft über Herkunft, Empfänger und Zweck Ihrer 
          gespeicherten personenbezogenen Daten zu erhalten. Sie haben außerdem ein Recht, die Berichtigung oder 
          Löschung dieser Daten zu verlangen.
        </p>
      </div>
    </div>
  )
}

function Impressum() {
  return (
    <div className="page-container">
      <div className="section-header">
        <h2>Impressum</h2>
      </div>
      <div className="content-section">
        <h3>Angaben gemäß § 5 TMG</h3>
       

        <h3>Kontakt</h3>
        <p>
          E-Mail: mail@juliansteiner.de
        </p>


        <h3>Verantwortlich für den Inhalt nach § 55 Abs. 2 RStV</h3>
        <p>
         Julian Steiner<br />
          Gernsstrasse 36<br />
          30659 Hannover
        </p>

        <h3>Haftungsausschluss</h3>
        
        <h4>Haftung für Inhalte</h4>
        <p>
          Die Inhalte unserer Seiten wurden mit größter Sorgfalt erstellt. Für die Richtigkeit, Vollständigkeit 
          und Aktualität der Inhalte können wir jedoch keine Gewähr übernehmen.
        </p>

        <h4>Haftung für Links</h4>
        <p>
          Unser Angebot enthält Links zu externen Webseiten Dritter, auf deren Inhalte wir keinen Einfluss haben. 
          Für die Inhalte der verlinkten Seiten ist stets der jeweilige Anbieter oder Betreiber der Seiten 
          verantwortlich.
        </p>
      </div>
    </div>
  )
}

function Cookies() {
  return (
    <div className="page-container">
      <div className="section-header">
        <h2>Cookie-Richtlinie</h2>
      </div>
      <div className="content-section">
        <h3>Was sind Cookies?</h3>
        <p>
          Cookies sind kleine Textdateien, die auf Ihrem Gerät gespeichert werden, wenn Sie eine Website besuchen. 
          Sie werden häufig verwendet, um Websites funktionsfähig zu machen oder effizienter zu gestalten sowie 
          um Berichtsinformationen bereitzustellen.
        </p>

        <h3>Wie verwenden wir Cookies?</h3>
        <p>
          SalesMaster verwendet Cookies, um die Funktionalität der Website zu gewährleisten und Ihre 
          Nutzererfahrung zu verbessern. Wir verwenden Cookies für folgende Zwecke:
        </p>

        <h4>Notwendige Cookies</h4>
        <p>
          Diese Cookies sind für das Funktionieren der Website unbedingt erforderlich. Sie ermöglichen 
          grundlegende Funktionen wie die Navigation auf der Seite und den Zugriff auf sichere Bereiche der Website.
        </p>

        <h4>Funktionale Cookies</h4>
        <p>
          Diese Cookies ermöglichen es der Website, erweiterte Funktionalität und Personalisierung bereitzustellen. 
          Sie können von uns oder von Drittanbietern gesetzt werden, deren Dienste wir auf unseren Seiten verwenden.
        </p>

        <h4>Analytische Cookies</h4>
        <p>
          Diese Cookies helfen uns zu verstehen, wie Besucher mit unserer Website interagieren, indem sie 
          Informationen anonym sammeln und melden. Dies ermöglicht es uns, die Struktur und den Inhalt unserer 
          Website zu verbessern.
        </p>

        <h3>Cookie-Verwaltung</h3>
        <p>
          Sie können Ihre Cookie-Einstellungen jederzeit in Ihren Browsereinstellungen anpassen. Bitte beachten 
          Sie, dass das Deaktivieren von Cookies die Funktionalität dieser Website beeinträchtigen kann.
        </p>

        <h3>Drittanbieter-Cookies</h3>
        <p>
          Einige Cookies werden von Drittanbietern gesetzt, die auf unseren Seiten erscheinen. Wir haben keine 
          Kontrolle über diese Cookies. Bitte besuchen Sie die Websites dieser Drittanbieter für weitere 
          Informationen über deren Cookies.
        </p>

        <h3>Weitere Informationen</h3>
        <p>
          Wenn Sie Fragen zu unserer Verwendung von Cookies haben, kontaktieren Sie uns bitte unter 
          mail@juliansteiner.de.
        </p>
      </div>
    </div>
  )
}

export default function App() {
  return (
    <ToastProvider>
      <Layout>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/training" element={<Training />} />
          <Route path="/practice" element={<Practice />} />
          <Route path="/scenarios" element={<Scenarios />} />
          <Route path="/progress" element={<Progress />} />
          <Route path="/leitfaden" element={<LeitfadenOverview />} />
          <Route path="/leitfaden/generator" element={<LeitfadenGenerator />} />
          <Route path="/leitfaden/meine" element={<MeineLeitfaeden />} />
          <Route path="/email-check" element={<EmailChecker />} />
          <Route path="/kontakt" element={<Kontakt />} />
          <Route path="/datenschutz" element={<Datenschutz />} />
          <Route path="/impressum" element={<Impressum />} />
          <Route path="/cookies" element={<Cookies />} />
        </Routes>
      </Layout>
    </ToastProvider>
  )
}

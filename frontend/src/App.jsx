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
            <h1>SalesMaster</h1>
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
        { id: 1, text: '„Natürlich! Was genau möchten Sie sich noch überlegen?"', correct: true },
        { id: 2, text: '„Okay, melden Sie sich einfach irgendwann."', correct: false },
        { id: 3, text: '„Dann rufe ich Sie in einem Jahr wieder an."', correct: false },
        { id: 4, text: '„Das ist keine gute Idee."', correct: false }
      ],
      explanation: 'Ein "Zeit-Einwand" ist oft ein versteckter Einwand. Durch gezieltes Nachfragen findest du heraus, ob es wirklich um Zeit geht oder um Preis, Vertrauen oder andere Bedenken. Wenn du einfach abwartest, verlierst du den Deal. Professionelle Verkäufer klären Bedenken sofort, nicht später.'
    },
    {
      id: 4,
      question: 'Wie erkennst du, ob ein „Zeit-Einwand" echt ist?',
      options: [
        { id: 1, text: 'Durch gezieltes Nachfragen, z. B. „Geht es um den Preis oder um etwas anderes?"', correct: true },
        { id: 2, text: 'Indem du sofort einen Rabatt anbietest', correct: false },
        { id: 3, text: 'Du wartest einfach ab', correct: false },
        { id: 4, text: 'Du gehst davon aus, dass der Kunde nicht interessiert ist', correct: false }
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
        { id: 1, text: 'Durch authentisches Auftreten und ehrliche Kommunikation', correct: true },
        { id: 2, text: 'Durch viele Fachbegriffe', correct: false },
        { id: 3, text: 'Durch aggressives Verkaufen', correct: false },
        { id: 4, text: 'Durch Zeitdruck', correct: false }
      ],
      explanation: 'Vertrauen ist die Basis jedes Verkaufs. Authentizität und Ehrlichkeit schaffen eine Verbindung zum Kunden. Fachbegriffe können einschüchtern, aggressives Verkaufen wirkt manipulativ, und Zeitdruck erzeugt Stress. Ein vertrauensvoller Verkäufer ist ein Berater, der dem Kunden hilft, die beste Entscheidung zu treffen.'
    },
    {
      id: 7,
      question: 'Ein Kunde sagt: „Ihr Mitbewerber bietet das günstiger an." – Wie reagierst du souverän?',
      options: [
        { id: 1, text: '„Das kann sein – was ist Ihnen denn außer dem Preis noch wichtig?"', correct: true },
        { id: 2, text: '„Dann kaufen Sie doch dort."', correct: false },
        { id: 3, text: '„Unsere Konkurrenz ist schlecht."', correct: false },
        { id: 4, text: '„Ich mache denselben Preis."', correct: false }
      ],
      explanation: 'Konkurrenzvergleiche sind normal. Statt defensiv zu reagieren, lenkst du das Gespräch auf die Kriterien, die wirklich wichtig sind: Qualität, Service, Support, Zuverlässigkeit. Preis ist nur ein Faktor. Diese Frage hilft dem Kunden, seine Prioritäten zu klären und zeigt, dass du selbstbewusst und kundenorientiert bist.'
    },
    {
      id: 8,
      question: 'Was ist der beste Umgang mit einem Konkurrenz-Einwand?',
      options: [
        { id: 1, text: 'Verständnis zeigen und den Mehrwert deiner Lösung betonen', correct: true },
        { id: 2, text: 'Den Konkurrenten kritisieren', correct: false },
        { id: 3, text: 'Den Kunden überreden', correct: false },
        { id: 4, text: 'Den Einwand ignorieren', correct: false }
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
        { id: 1, text: 'Die Folgen des Problems für den Kunden aufzeigen', correct: true },
        { id: 2, text: 'Das Budget des Kunden herausfinden', correct: false },
        { id: 3, text: 'Das Produkt zu präsentieren', correct: false },
        { id: 4, text: 'Den Kunden unter Druck setzen', correct: false }
      ],
      explanation: 'Implication Questions helfen dem Kunden, die Konsequenzen seines Problems zu erkennen. Wenn der Kunde versteht, was passiert, wenn er nichts unternimmt, steigt sein Bedürfnis nach einer Lösung. Diese Fragen schaffen Dringlichkeit auf natürliche Weise, ohne Druck auszuüben.'
    },
    {
      id: 3,
      question: 'Welche Frage gehört zur Phase „Need-Payoff" im SPIN-Selling?',
      options: [
        { id: 1, text: '„Wie würde sich Ihr Alltag verändern, wenn Sie dieses Problem lösen könnten?"', correct: true },
        { id: 2, text: '„Wie groß ist Ihr Unternehmen?"', correct: false },
        { id: 3, text: '„Wer trifft bei Ihnen die Entscheidung?"', correct: false },
        { id: 4, text: '„Wie hoch ist Ihr aktuelles Budget?"', correct: false }
      ],
      explanation: 'Need-Payoff Questions lassen den Kunden selbst die Vorteile einer Lösung beschreiben. Wenn der Kunde die positiven Auswirkungen verbalisiert, wird er zum Verkäufer seiner eigenen Entscheidung. Diese Fragen sind besonders wirkungsvoll, weil sie den Kunden aktiv einbeziehen.'
    },
    {
      id: 4,
      question: 'Was bedeutet das Kürzel BANT?',
      options: [
        { id: 1, text: 'Budget, Authority, Need, Timeline', correct: true },
        { id: 2, text: 'Benefit, Analysis, Negotiation, Target', correct: false },
        { id: 3, text: 'Buyer, Attention, Network, Target', correct: false },
        { id: 4, text: 'Budget, Agreement, Name, Trust', correct: false }
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
        { id: 1, text: 'Es hilft, qualifizierte Leads von uninteressanten zu unterscheiden', correct: true },
        { id: 2, text: 'Es ersetzt den gesamten Verkaufsprozess', correct: false },
        { id: 3, text: 'Es dient nur der Preisgestaltung', correct: false },
        { id: 4, text: 'Es wird nur im After-Sales genutzt', correct: false }
      ],
      explanation: 'BANT spart Zeit und Ressourcen, indem es früh zeigt, welche Leads wirklich kaufbereit sind. Ohne Qualifizierung verschwendest du Zeit mit Leads, die nie kaufen werden. BANT ist ein Werkzeug, kein Ersatz für den gesamten Verkaufsprozess, aber ein wichtiger Filter.'
    },
    {
      id: 7,
      question: 'Was ist der Hauptunterschied zwischen offenen und geschlossenen Fragen?',
      options: [
        { id: 1, text: 'Offene Fragen regen zum Erzählen an, geschlossene liefern kurze Antworten', correct: true },
        { id: 2, text: 'Geschlossene Fragen sind höflicher', correct: false },
        { id: 3, text: 'Offene Fragen sind nur für Umfragen gedacht', correct: false },
        { id: 4, text: 'Geschlossene Fragen sind besser für Vertrauensaufbau', correct: false }
      ],
      explanation: 'Offene Fragen beginnen mit W-Wörtern (Was, Wie, Warum, Wann, Wo) und lassen den Kunden ausführlich antworten. Geschlossene Fragen können mit Ja/Nein beantwortet werden. Im Verkauf nutzt du offene Fragen, um Informationen zu sammeln und Vertrauen aufzubauen, geschlossene Fragen für Bestätigungen und Abschlüsse.'
    },
    {
      id: 8,
      question: 'Welche der folgenden ist eine offene Frage?',
      options: [
        { id: 1, text: '„Wie entscheiden Sie, welche Anbieter Sie wählen?"', correct: true },
        { id: 2, text: '„Sind Sie zufrieden?"', correct: false },
        { id: 3, text: '„Haben Sie Interesse?"', correct: false },
        { id: 4, text: '„Möchten Sie ein Angebot?"', correct: false }
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
        { id: 1, text: 'Fragen, die vom Allgemeinen zum Spezifischen führen', correct: true },
        { id: 2, text: 'Fragen, die nur nach Preisen fragen', correct: false },
        { id: 3, text: 'Fragen, die den Kunden verwirren', correct: false },
        { id: 4, text: 'Fragen, die sofort zum Abschluss führen', correct: false }
      ],
      explanation: 'Funnel-Fragen folgen einer Trichter-Struktur: Du beginnst mit breiten, offenen Fragen und verengst dann schrittweise zu spezifischen Details. Diese Technik hilft, ein vollständiges Bild zu bekommen, ohne den Kunden zu überfordern. Sie bauen Vertrauen auf, weil der Kunde das Gefühl hat, verstanden zu werden.'
    },
    {
      id: 11,
      question: 'Wie beginnt man typischerweise eine Funnel-Fragen-Sequenz?',
      options: [
        { id: 1, text: 'Mit einer offenen, allgemeinen Frage', correct: true },
        { id: 2, text: 'Mit einer Preisfrage', correct: false },
        { id: 3, text: 'Mit einer geschlossenen Entscheidungsfrage', correct: false },
        { id: 4, text: 'Mit einer Bedarfsbestätigung', correct: false }
      ],
      explanation: 'Eine Funnel-Sequenz beginnt immer breit: "Wie läuft Ihr aktueller Prozess?" oder "Was beschäftigt Sie derzeit am meisten?". Diese offenen Fragen geben dem Kunden Raum, seine Situation zu schildern. Erst dann verengst du zu spezifischen Details. Ein direkter Start mit Preisfragen wirkt zu aggressiv.'
    },
    {
      id: 12,
      question: 'Warum sind Funnel-Fragen wirkungsvoll im Verkaufsgespräch?',
      options: [
        { id: 1, text: 'Sie helfen, Bedürfnisse zu konkretisieren und Vertrauen aufzubauen', correct: true },
        { id: 2, text: 'Sie verkürzen das Gespräch stark', correct: false },
        { id: 3, text: 'Sie ersetzen die Bedarfsanalyse', correct: false },
        { id: 4, text: 'Sie sollen den Kunden verwirren', correct: false }
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
        { id: 1, text: 'Direkt, ergebnisorientiert und mit Fokus auf Erfolge', correct: true },
        { id: 2, text: 'Mit vielen technischen Details', correct: false },
        { id: 3, text: 'Mit langen, emotionalen Geschichten', correct: false },
        { id: 4, text: 'Indem du ihn möglichst oft unterbrichst', correct: false }
      ],
      explanation: 'D-Typen sind ergebnisorientiert, direkt und haben wenig Zeit. Sie wollen schnell zum Punkt kommen. Präsentiere die wichtigsten Vorteile, zeige konkrete Ergebnisse und vermeide Smalltalk. Technische Details und emotionale Geschichten langweilen sie. Respektiere ihre Zeit und zeige, wie deine Lösung ihnen hilft, ihre Ziele schneller zu erreichen.'
    },
    {
      id: 3,
      question: 'Wie sollte man mit einem „Gewissenhaften" (C-Typ) Kunden umgehen?',
      options: [
        { id: 1, text: 'Mit genauen Fakten, Daten und logischen Argumenten', correct: true },
        { id: 2, text: 'Mit spontanen Ideen und Humor', correct: false },
        { id: 3, text: 'Mit emotionalen Storys', correct: false },
        { id: 4, text: 'Mit Zeitdruck', correct: false }
      ],
      explanation: 'C-Typen sind analytisch, detailorientiert und brauchen Fakten. Sie treffen Entscheidungen basierend auf Daten, nicht auf Emotionen. Bereite dich gründlich vor, liefere präzise Informationen, zeige Vergleichstabellen und Studien. Spontanität und Druck wirken kontraproduktiv. Gib ihnen Zeit, die Informationen zu prüfen.'
    },
    {
      id: 4,
      question: 'Was bedeutet das Prinzip der Reziprozität im Verkauf?',
      options: [
        { id: 1, text: 'Menschen fühlen sich verpflichtet, eine Gefälligkeit zu erwidern', correct: true },
        { id: 2, text: 'Verkäufer und Kunden verhandeln immer auf Augenhöhe', correct: false },
        { id: 3, text: 'Jeder Kunde sollte gleich behandelt werden', correct: false },
        { id: 4, text: 'Verkäufe beruhen nur auf Preis und Leistung', correct: false }
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
        { id: 1, text: 'Du gibst dem Kunden kostenlose Tipps, bevor du ein Angebot machst', correct: true },
        { id: 2, text: 'Du wartest, bis der Kunde von selbst kauft', correct: false },
        { id: 3, text: 'Du sagst dem Kunden, dass du keine Zeit hast', correct: false },
        { id: 4, text: 'Du machst kein Follow-up', correct: false }
      ],
      explanation: 'Reziprozität funktioniert, wenn du dem Kunden etwas Wertvolles gibst, ohne sofort etwas zu erwarten. Kostenlose Tipps, eine Analyse oder hilfreiche Ressourcen zeigen, dass du es ernst meinst. Der Kunde fühlt sich dann verpflichtet, dein Angebot ernsthaft zu prüfen. Wichtig: Es muss ehrlich gemeint sein, nicht als Taktik.'
    },
    {
      id: 7,
      question: 'Was bewirkt das Prinzip der Knappheit im Verkauf?',
      options: [
        { id: 1, text: 'Produkte erscheinen wertvoller, wenn sie begrenzt verfügbar sind', correct: true },
        { id: 2, text: 'Kunden fühlen sich unter Druck gesetzt und brechen ab', correct: false },
        { id: 3, text: 'Der Verkäufer wirkt großzügig', correct: false },
        { id: 4, text: 'Der Preis sinkt automatisch', correct: false }
      ],
      explanation: 'Knappheit erhöht die wahrgenommene Wertigkeit. Wenn etwas selten oder begrenzt verfügbar ist, wird es attraktiver. Das ist evolutionär bedingt – seltene Ressourcen waren immer wertvoll. Im Verkauf kann echte Knappheit (begrenzte Stückzahl, zeitlich begrenztes Angebot) die Kaufentscheidung beschleunigen. Wichtig: Es muss authentisch sein.'
    },
    {
      id: 8,
      question: 'Wie kannst du Knappheit authentisch einsetzen?',
      options: [
        { id: 1, text: 'Wenn es wirklich nur begrenzte Stückzahlen oder Zeitfenster gibt', correct: true },
        { id: 2, text: 'Indem du künstlich Druck aufbaust', correct: false },
        { id: 3, text: 'Indem du eine falsche Verknappung vorgibst', correct: false },
        { id: 4, text: 'Indem du Kunden täuschst', correct: false }
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
        { id: 1, text: 'Menschen orientieren sich am Verhalten anderer, um Entscheidungen zu treffen', correct: true },
        { id: 2, text: 'Verkäufer müssen immer selbstbewusst wirken', correct: false },
        { id: 3, text: 'Kunden vertrauen nur persönlichen Empfehlungen', correct: false },
        { id: 4, text: 'Es geht um rechtliche Nachweise', correct: false }
      ],
      explanation: 'Sozialer Beweis (Social Proof) ist ein psychologisches Prinzip: Menschen schauen, was andere tun, um ihre eigenen Entscheidungen zu treffen. Wenn viele andere etwas kaufen oder nutzen, wirkt es vertrauenswürdiger. Das reduziert das wahrgenommene Risiko. "Wenn 1000 andere Unternehmen das nutzen, kann es nicht schlecht sein" – dieser Gedanke beeinflusst Kaufentscheidungen stark.'
    },
    {
      id: 11,
      question: 'Wie kannst du Social Proof im Verkaufsgespräch nutzen?',
      options: [
        { id: 1, text: 'Durch Kundenreferenzen, Bewertungen oder Erfolgsgeschichten', correct: true },
        { id: 2, text: 'Durch Rabatte', correct: false },
        { id: 3, text: 'Durch technische Details', correct: false },
        { id: 4, text: 'Durch Zeitdruck', correct: false }
      ],
      explanation: 'Social Proof funktioniert durch konkrete Beispiele: "Mehr als 500 Unternehmen nutzen unsere Lösung", Kundenreferenzen, Case Studies, Bewertungen, Testimonials. Je spezifischer und relevanter für den Kunden, desto besser. Ein Kunde aus derselben Branche ist überzeugender als eine generische Statistik. Zeige, dass andere ähnliche Kunden erfolgreich sind.'
    },
    {
      id: 12,
      question: 'Welches Beispiel zeigt sozialen Beweis?',
      options: [
        { id: 1, text: '„Mehr als 1.000 Unternehmen nutzen bereits unsere Lösung."', correct: true },
        { id: 2, text: '„Ich denke, das Produkt ist gut."', correct: false },
        { id: 3, text: '„Heute ist schönes Wetter."', correct: false },
        { id: 4, text: '„Wir haben noch zwei Stück auf Lager."', correct: false }
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
        { id: 1, text: '„Ich kann Ihnen genau zeigen, wie das funktioniert."', correct: true },
        { id: 2, text: '„Ich hoffe, das funktioniert."', correct: false },
        { id: 3, text: '„Vielleicht klappt das auch bei Ihnen."', correct: false },
        { id: 4, text: '„Ich bin mir nicht sicher, aber…"', correct: false }
      ],
      explanation: 'Sicherheit und Kompetenz werden durch klare, präzise Aussagen vermittelt. "Ich kann Ihnen genau zeigen" ist aktiv, konkret und zeigt Expertise. Formulierungen mit "hoffe", "vielleicht" oder "nicht sicher" wirken unsicher und schaffen Zweifel. Der Kunde braucht einen Experten, der weiß, was er tut.'
    },
    {
      id: 4,
      question: 'Ein Kunde bringt einen kritischen Punkt, der nicht relevant für den Verkaufsprozess ist. Was tust du?',
      options: [
        { id: 1, text: 'Du lenkst geschickt zurück zum Nutzen für den Kunden', correct: true },
        { id: 2, text: 'Du diskutierst das Thema ausführlich', correct: false },
        { id: 3, text: 'Du ignorierst den Einwand komplett', correct: false },
        { id: 4, text: 'Du wechselt das Thema abrupt', correct: false }
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
        { id: 1, text: 'Um den Fokus auf entscheidungsrelevante Themen zu halten', correct: true },
        { id: 2, text: 'Um schwierige Fragen zu vermeiden', correct: false },
        { id: 3, text: 'Um Zeit zu gewinnen', correct: false },
        { id: 4, text: 'Um den Kunden zu überreden', correct: false }
      ],
      explanation: 'Themensteuerung ist wichtig, um das Gespräch produktiv zu halten. Nicht jedes Thema ist relevant für die Kaufentscheidung. Wenn du jeden Einwand ausführlich diskutierst, verlierst du Zeit und Fokus. Geschickte Steuerung hilft, die wichtigen Punkte zu behandeln, ohne den Kunden zu übergehen oder zu manipulieren.'
    },
    {
      id: 7,
      question: 'Was bedeutet „Wert-Kommunikation" im Verkauf?',
      options: [
        { id: 1, text: 'Den Fokus auf Nutzen und Mehrwert statt auf den Preis legen', correct: true },
        { id: 2, text: 'Nur über den Preis sprechen', correct: false },
        { id: 3, text: 'Möglichst viel Fachsprache verwenden', correct: false },
        { id: 4, text: 'Den Kunden mit Emotionen überreden', correct: false }
      ],
      explanation: 'Wert-Kommunikation bedeutet, den Fokus auf den Nutzen und Mehrwert zu legen, nicht auf den Preis. Der Kunde kauft nicht den Preis, sondern die Lösung für sein Problem. Wenn du den Wert klar kommunizierst, wird der Preis sekundär. Fachsprache kann abschrecken, reine Emotionen ohne Substanz wirken manipulativ.'
    },
    {
      id: 8,
      question: 'Welche Formulierung kommuniziert Wert statt Preis?',
      options: [
        { id: 1, text: '„Unsere Lösung spart Ihnen pro Monat rund 10 Stunden Zeit."', correct: true },
        { id: 2, text: '„Wir sind 10 % günstiger als andere."', correct: false },
        { id: 3, text: '„Wir haben gerade ein Sonderangebot."', correct: false },
        { id: 4, text: '„Der Preis ist verhandelbar."', correct: false }
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
        { id: 1, text: '„Wie klingt das für Sie – möchten wir den nächsten Schritt gemeinsam gehen?"', correct: true },
        { id: 2, text: '„Wollen Sie jetzt kaufen oder nicht?"', correct: false },
        { id: 3, text: '„Ich weiß nicht, ob das für Sie passt."', correct: false },
        { id: 4, text: '„Sie können ja noch ein bisschen überlegen."', correct: false }
      ],
      explanation: 'Ein guter Abschluss ist partnerschaftlich, nicht fordernd. "Wie klingt das für Sie" respektiert den Kunden, "gemeinsam gehen" zeigt Partnerschaft. Aggressive Fragen ("wollen Sie oder nicht") wirken unter Druck setzend. Unsicherheit ("weiß nicht") oder Passivität ("können überlegen") führen nicht zum Abschluss.'
    },
    {
      id: 11,
      question: 'Wann ist der richtige Zeitpunkt für eine Abschlussfrage?',
      options: [
        { id: 1, text: 'Wenn der Kunde den Nutzen klar erkannt hat', correct: true },
        { id: 2, text: 'Direkt zu Beginn', correct: false },
        { id: 3, text: 'Wenn der Kunde noch unsicher ist', correct: false },
        { id: 4, text: 'Wenn der Kunde über den Preis spricht', correct: false }
      ],
      explanation: 'Der richtige Zeitpunkt für den Abschluss ist, wenn der Kunde den Nutzen verstanden hat und positive Signale zeigt. Zu früh (direkt zu Beginn) wirkt aggressiv. Bei Unsicherheit musst du erst Bedenken klären. Wenn der Kunde nur über Preis spricht, hat er den Wert noch nicht erkannt – dann ist es zu früh für den Abschluss.'
    },
    {
      id: 12,
      question: 'Welche Abschlussfrage wirkt natürlich und verbindlich?',
      options: [
        { id: 1, text: '„Wann möchten Sie starten – eher diese oder nächste Woche?"', correct: true },
        { id: 2, text: '„Sind Sie sicher, dass Sie das wollen?"', correct: false },
        { id: 3, text: '„Muss ich Ihnen noch etwas beweisen?"', correct: false },
        { id: 4, text: '„Sie können sich ja melden, wenn Sie wollen."', correct: false }
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
    
    if (currentQuestionIndex < currentQuestions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1)
      setSelectedAnswer(null)
      setShowNextButton(false)
    } else {
      // Alle Fragen beantwortet - zurück zu Trainings
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
  const [activeMode, setActiveMode] = React.useState(null)
  const [activeTopic, setActiveTopic] = React.useState(null)
  
  // Adaptives Quiz State
  const [quizQuestionIndex, setQuizQuestionIndex] = React.useState(0)
  const [quizAnswer, setQuizAnswer] = React.useState(null)
  const [quizDifficulty, setQuizDifficulty] = React.useState('Mittel')
  const [quizScore, setQuizScore] = React.useState(0)
  
  // Karteikarten State
  const [flashcardIndex, setFlashcardIndex] = React.useState(0)
  const [flashcardFlipped, setFlashcardFlipped] = React.useState(false)
  const [flashcardRating, setFlashcardRating] = React.useState(null)
  
  // Rollenspiel State
  const [roleplayScenario, setRoleplayScenario] = React.useState(null)
  const [roleplayAnswer, setRoleplayAnswer] = React.useState(null)
  
  // Herausforderung State
  const [challengeActive, setChallengeActive] = React.useState(false)
  const [challengeTime, setChallengeTime] = React.useState(300) // 5 Minuten
  const [challengeAnswer, setChallengeAnswer] = React.useState('')
  const [challengeTimer, setChallengeTimer] = React.useState(null)
  
  // Mikro-Learning State
  const [microStoryIndex, setMicroStoryIndex] = React.useState(0)
  const [microAnswer, setMicroAnswer] = React.useState(null)
  
  // Quiz-Fragen (vereinfacht, aus Training-Daten)
  const adaptiveQuizQuestions = {
    'Einwände': [
      {
        question: 'Wie reagierst du professionell auf den Einwand "Das ist mir zu teuer"?',
        options: [
          { text: '„Dann kommen wir wohl nicht zusammen."', correct: false },
          { text: '„Teuer im Vergleich zu was genau?"', correct: true },
          { text: '„Ich gebe sofort Rabatt."', correct: false }
        ],
        feedback: 'Perfekt! Rückfrage-Fragen zeigen Kompetenz und Interesse.',
        difficulty: 'Mittel'
      }
    ],
    'Fragen': [
      {
        question: 'Was ist das Ziel der "Implication Questions" im SPIN-Selling?',
        options: [
          { text: 'Die Folgen des Problems für den Kunden aufzeigen', correct: true },
          { text: 'Das Budget des Kunden herausfinden', correct: false },
          { text: 'Das Produkt zu präsentieren', correct: false }
        ],
        feedback: 'Richtig! Implication Questions helfen, die Dringlichkeit zu erhöhen.',
        difficulty: 'Mittel'
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
        { text: '„Was genau vergleichen Sie?"', correct: true, feedback: 'Sehr gut – C-Typen reagieren auf logische Vergleiche, keine Emotionen.' },
        { text: '„Dann kaufen Sie dort."', correct: false, feedback: 'Zu passiv. C-Typen brauchen Daten und Vergleiche.' },
        { text: '„Wir machen denselben Preis."', correct: false, feedback: 'Preis ist nicht alles. Zeige den Mehrwert mit Fakten.' }
      ]
    }
  ]
  
  // Herausforderungen
  const challenges = [
    {
      title: 'Preisgespräch unter Zeitdruck',
      situation: 'Kunde: "Ich habe nur 5 Minuten – warum sollte ich gerade mit Ihnen sprechen?"',
      criteria: ['Klarheit', 'Nutzenargumentation', 'Empathie & Sicherheit']
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
      }
    ],
    'question_techniques': [
      {
        story: 'Max nutzt SPIN-Selling in einem Gespräch. Er hat die Situation und das Problem identifiziert. Jetzt muss er die Implication-Phase nutzen.',
        question: 'Welche Frage gehört zur Implication-Phase?',
        options: [
          { text: '„Wie groß ist Ihr Unternehmen?"', correct: false },
          { text: '„Was passiert, wenn Sie dieses Problem nicht lösen?"', correct: true },
          { text: '„Wie hoch ist Ihr Budget?"', correct: false }
        ],
        learningGoal: 'SPIN-Selling: Implication Questions richtig einsetzen'
      }
    ]
  }
  
  // Lern-Insights Daten
  const learningInsights = {
    performance: [
      { area: 'Einwandbehandlung', score: 65, recommendation: 'Wiederhole Modul "Preis-Einwände" in 2 Tagen' },
      { area: 'Fragetechniken', score: 90, recommendation: 'Weiter mit "Funnel-Fragen – Fortgeschritten"' },
      { area: 'Verkaufspsychologie', score: 80, recommendation: 'Fokus auf "Reziprozität in B2B"' }
    ]
  }

  // Handler Functions
  const startAdaptiveQuiz = (topic) => {
    setActiveMode('adaptive-quiz')
    setActiveTopic(topic)
    setQuizQuestionIndex(0)
    setQuizAnswer(null)
    setQuizScore(0)
    setQuizDifficulty('Mittel')
  }

  const handleQuizAnswer = (option) => {
    setQuizAnswer(option)
    if (option.correct) {
      setQuizScore(quizScore + 1)
      // Erhöhe Schwierigkeit bei richtiger Antwort
      if (quizDifficulty === 'Mittel') setQuizDifficulty('Schwer')
    }
  }

  const handleNextQuizQuestion = () => {
    if (quizQuestionIndex < adaptiveQuizQuestions[activeTopic].length - 1) {
      setQuizQuestionIndex(quizQuestionIndex + 1)
      setQuizAnswer(null)
    } else {
      setActiveMode(null)
    }
  }

  const startFlashcards = () => {
    setActiveMode('flashcards')
    setFlashcardIndex(0)
    setFlashcardFlipped(false)
    setFlashcardRating(null)
  }

  const handleFlashcardFlip = () => {
    setFlashcardFlipped(!flashcardFlipped)
  }

  const handleFlashcardRating = (rating) => {
    setFlashcardRating(rating)
    // Schwierige Karten werden häufiger wiederholt
    if (rating === 'Schwer' && flashcardIndex < flashcards.length - 1) {
      // Karte bleibt im Pool
    }
    setTimeout(() => {
      if (flashcardIndex < flashcards.length - 1) {
        setFlashcardIndex(flashcardIndex + 1)
        setFlashcardFlipped(false)
        setFlashcardRating(null)
      } else {
        setActiveMode(null)
      }
    }, 1000)
  }

  const startRoleplay = () => {
    setActiveMode('roleplay')
    setRoleplayScenario(roleplayScenarios[0])
    setRoleplayAnswer(null)
  }

  const handleRoleplayAnswer = (option) => {
    setRoleplayAnswer(option)
  }

  const startChallenge = () => {
    setActiveMode('challenge')
    setChallengeActive(true)
    setChallengeTime(300)
    setChallengeAnswer('')
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
    setActiveMode(null)
    setActiveTopic(null)
  }

  // Render verschiedene Modi
  if (activeMode === 'adaptive-quiz') {
    const questions = adaptiveQuizQuestions[activeTopic]
    const question = questions[quizQuestionIndex]
    
    return (
      <div className="practice-container">
        <div className="section-header">
          <button className="btn-back" onClick={handleBack}>← Zurück</button>
          <h2>Adaptives Quiz - {activeTopic}</h2>
          <p>Schwierigkeit: {quizDifficulty} | Punktestand: {quizScore}</p>
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
    const card = flashcards[flashcardIndex]
    
    return (
      <div className="practice-container">
        <div className="section-header">
          <button className="btn-back" onClick={handleBack}>← Zurück</button>
          <h2>Karteikarten</h2>
          <p>Karte {flashcardIndex + 1} von {flashcards.length}</p>
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
    const scenario = roleplayScenario
    
    return (
      <div className="practice-container">
        <div className="section-header">
          <button className="btn-back" onClick={handleBack}>← Zurück</button>
          <h2>Rollenspiel</h2>
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
                <button className="btn primary" onClick={handleBack}>Weiteres Szenario</button>
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  if (activeMode === 'challenge') {
    const challenge = challenges[0]
    const minutes = Math.floor(challengeTime / 60)
    const seconds = challengeTime % 60
    
    return (
      <div className="practice-container">
        <div className="section-header">
          <button className="btn-back" onClick={handleBack}>← Zurück</button>
          <h2>Herausforderung: {challenge.title}</h2>
          <p className="challenge-timer">⏱️ {minutes}:{seconds.toString().padStart(2, '0')}</p>
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
            <button className="btn primary" onClick={handleBack}>Antwort einreichen</button>
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
        <div className="insights-container">
          <div className="insights-grid">
            {learningInsights.performance.map((item, idx) => (
              <div key={idx} className="insight-card">
                <h3>{item.area}</h3>
                <div className="performance-bar">
                  <div className="performance-fill" style={{ width: `${item.score}%` }}></div>
                  <span className="performance-score">{item.score}%</span>
                </div>
                <p className="recommendation"><strong>Empfehlung:</strong> {item.recommendation}</p>
              </div>
            ))}
          </div>
        </div>
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
        { label: 'Karten starten', action: startFlashcards }
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
        { label: 'Herausforderung starten', action: startChallenge }
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



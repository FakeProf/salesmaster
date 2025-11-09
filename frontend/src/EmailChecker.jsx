import { useState } from "react";

export default function EmailChecker() {
  const [email, setEmail] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleCheck = async (e) => {
    e.preventDefault();
    setLoading(true);
    setResult(null);
    
    try {
      const res = await fetch("/.netlify/functions/check-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      
      const data = await res.json();
      setResult(data);
    } catch (err) {
      setResult({ 
        valid: false, 
        message: `Fehler beim Prüfen: ${err.message}` 
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="email-checker-container">
      <div className="section-header">
        <h2>E-Mail-Server-Prüfung</h2>
        <p>Prüfe, ob eine E-Mail-Adresse einen erreichbaren Mailserver hat</p>
      </div>

      <div className="email-checker-card">
        <form onSubmit={handleCheck} className="email-checker-form">
          <div className="form-group">
            <label htmlFor="email-input">E-Mail-Adresse:</label>
            <input
              id="email-input"
              type="email"
              placeholder="z. B. name@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="email-input"
              required
              disabled={loading}
            />
          </div>
          <button
            type="submit"
            disabled={loading || !email}
            className="btn primary"
          >
            {loading ? "Prüfe..." : "Mailserver prüfen"}
          </button>
        </form>

        {result && (
          <div className={`result-box ${result.valid ? 'success' : 'error'}`}>
            <div className="result-header">
              {result.valid ? (
                <span className="result-icon">✅</span>
              ) : (
                <span className="result-icon">❌</span>
              )}
              <h3>{result.valid ? 'Mailserver gefunden' : 'Kein Mailserver gefunden'}</h3>
            </div>
            <p className="result-message">{result.message}</p>
            
            {result.valid && result.mx && (
              <div className="mx-details">
                <h4>MX-Server:</h4>
                <ul className="mx-list">
                  {result.mxDetails ? (
                    result.mxDetails.map((mx, idx) => (
                      <li key={idx}>
                        <strong>{mx.host}</strong> (Priorität: {mx.priority})
                      </li>
                    ))
                  ) : (
                    result.mx.map((host, idx) => (
                      <li key={idx}>{host}</li>
                    ))
                  )}
                </ul>
              </div>
            )}

            {result.domain && (
              <p className="result-domain">
                <small>Domain: {result.domain}</small>
              </p>
            )}
          </div>
        )}

        <div className="info-box">
          <h4>ℹ️ Hinweis</h4>
          <p>
            Dieses Tool prüft, ob für die angegebene E-Mail-Adresse ein Mailserver 
            (MX-Record) konfiguriert ist. Die E-Mail-Adresse wird nicht gespeichert 
            und nur zur technischen Prüfung verwendet.
          </p>
        </div>
      </div>
    </div>
  );
}


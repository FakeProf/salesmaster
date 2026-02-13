import { useState } from "react";
import { apiFetch, API_BASE } from "./api";

export default function EmailChecker() {
  const [email, setEmail] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleCheck = async (e) => {
    e.preventDefault();
    setLoading(true);
    setResult(null);

    if (!API_BASE) {
      setResult({ valid: false, message: "Backend nicht konfiguriert. Bitte VITE_API_URL setzen (z. B. http://localhost:4001)." });
      setLoading(false);
      return;
    }

    try {
      const res = await apiFetch("/api/check-email", {
        method: "POST",
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      setResult(data);
    } catch (err) {
      setResult({
        valid: false,
        message: `Fehler beim Prüfen: ${err.message}`,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="email-checker-container">
      <div className="section-header">
        <h2>E-Mail-Server-Prüfung</h2>
        <p>Prüft, ob eine E-Mail-Adresse einen erreichbaren Mailserver hat</p>
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
          <div className={`result-box ${result.valid ? "success" : "error"}`}>
            <div className="result-header">
              {result.valid ? (
                <span className="result-icon">✅</span>
              ) : (
                <span className="result-icon">❌</span>
              )}
              <h3>
                {result.valid
                  ? "Mailserver gefunden"
                  : "Kein Mailserver gefunden"}
              </h3>
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
          <p style={{ marginTop: '1em', fontWeight: 'bold', color: '#d97706' }}>
            ⚠️ Wichtig: Der Prefix (Teil vor dem @) wird <strong>nicht geprüft</strong>. 
            Bitte achten Sie darauf, dass Sie den Prefix selbst korrekt eingeben 
            (z. B. "mail@example.com" statt "ail@example.com").
          </p>
        </div>
      </div>
    </div>
  );
}


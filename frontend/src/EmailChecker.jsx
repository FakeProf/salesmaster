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
        <h2>E-Mail-Server- und Mailbox-Prüfung</h2>
        <p>Prüft Mailserver (MX) und ob die Mailbox existiert (SMTP)</p>
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
            {loading ? "Prüfe..." : "E-Mail prüfen"}
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

            {result.valid && result.mailboxExists !== undefined && (
              <p className="result-mailbox">
                <strong>Mailbox:</strong>{" "}
                {result.mailboxExists === true
                  ? "✅ Bestätigt"
                  : result.mailboxExists === false
                    ? "❌ Unbekannt oder abgelehnt"
                    : "⚠️ Prüfung nicht möglich"}
                {result.smtpMessage && (
                  <small className="smtp-detail"> ({result.smtpMessage})</small>
                )}
              </p>
            )}

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
            Prüft Mailserver (MX) und ob die Mailbox per SMTP existiert. Die
            E-Mail-Adresse wird nicht gespeichert und nur zur technischen
            Prüfung verwendet. Das Backend (VITE_API_URL) muss erreichbar sein.
          </p>
        </div>
      </div>
    </div>
  );
}


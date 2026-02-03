import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from './AuthContext';

export default function AuthModal({ onClose }) {
  const { loginWithEmail, register } = useAuth();
  const [tab, setTab] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const result = await loginWithEmail(email.trim(), password);
      if (result.ok) {
        onClose();
        return;
      }
      setError(result.error || 'Anmeldung fehlgeschlagen.');
    } catch (err) {
      setError('Ein Fehler ist aufgetreten. Bitte erneut versuchen.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');
    if (password.length < 6) {
      setError('Passwort muss mindestens 6 Zeichen haben.');
      return;
    }
    setLoading(true);
    try {
      const result = await register(email.trim(), password, name.trim());
      if (result.ok) {
        onClose();
        return;
      }
      setError(result.error || 'Registrierung fehlgeschlagen.');
    } catch (err) {
      setError('Ein Fehler ist aufgetreten. Bitte erneut versuchen.');
    } finally {
      setLoading(false);
    }
  };

  const modalContent = (
    <div className="auth-modal-overlay" onClick={onClose}>
      <div className="auth-modal" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="auth-modal-close" onClick={onClose} aria-label="Schließen">
          ×
        </button>
        <div className="auth-modal-tabs">
          <button
            type="button"
            className={tab === 'login' ? 'active' : ''}
            onClick={() => { setTab('login'); setError(''); }}
          >
            Anmelden
          </button>
          <button
            type="button"
            className={tab === 'register' ? 'active' : ''}
            onClick={() => { setTab('register'); setError(''); }}
          >
            Registrieren
          </button>
        </div>
        {error && <div className="auth-modal-error">{error}</div>}
        {tab === 'login' ? (
          <form onSubmit={handleLogin} className="auth-modal-form">
            <input
              type="email"
              placeholder="E-Mail"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
            <input
              type="password"
              placeholder="Passwort"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Wird angemeldet…' : 'Anmelden'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleRegister} className="auth-modal-form">
            <input
              type="email"
              placeholder="E-Mail"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
            <input
              type="password"
              placeholder="Passwort (min. 6 Zeichen)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              autoComplete="new-password"
            />
            <input
              type="text"
              placeholder="Name (optional)"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoComplete="name"
            />
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Wird registriert…' : 'Registrieren'}
            </button>
          </form>
        )}
      </div>
    </div>
  );

  if (!mounted || typeof document === 'undefined') return null;
  return createPortal(modalContent, document.body);
}

import React, { createContext, useContext, useState, useEffect } from 'react';
import { apiFetch } from './api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showAuthModal, setShowAuthModal] = useState(false);

  const loadUser = async () => {
    try {
      const res = await apiFetch('/auth/me');
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUser();
  }, []);

  const authErrorMessage = (isLive = false) =>
    isLive
      ? 'Backend nicht erreichbar. Anmeldung/Registrierung funktionieren nur, wenn ein Backend läuft und in den Build-Einstellungen die Variable VITE_API_URL auf die Backend-URL gesetzt ist.'
      : 'Server nicht erreichbar. Läuft das Backend (z. B. npm run dev im Backend-Ordner)?';

  const loginWithEmail = async (email, password) => {
    try {
      const res = await apiFetch('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      const contentType = res.headers.get('content-type') || '';
      if (contentType.includes('text/html')) {
        return { ok: false, error: authErrorMessage(!import.meta.env.VITE_API_URL) };
      }
      let data = {};
      try {
        data = await res.json();
      } catch (_) {
        const text = await res.text().catch(() => '');
        if (res.status === 502) {
          return { ok: false, error: 'Anmeldung fehlgeschlagen. (HTTP 502 – Backend-Funktion antwortet nicht. Bitte kurz warten und erneut versuchen; bei Wiederholung Netlify-Logs prüfen.)' };
        }
        const preview = text ? ` – Antwort: ${text.trim().slice(0, 80)}${text.length > 80 ? '…' : ''}` : '';
        console.error('Login response not JSON:', res.status, text.slice(0, 300));
        return { ok: false, error: `Anmeldung fehlgeschlagen. (HTTP ${res.status}${preview})` };
      }
      if (res.ok && data.user) {
        setUser(data.user);
        return { ok: true };
      }
      if (res.status === 502) {
        return { ok: false, error: 'Anmeldung fehlgeschlagen. (HTTP 502 – Backend-Funktion antwortet nicht. Bitte kurz warten und erneut versuchen; bei Wiederholung Netlify-Logs prüfen.)' };
      }
      const msg = data.error || 'Anmeldung fehlgeschlagen.';
      const detail = data.detail ? ` – ${data.detail}` : '';
      return { ok: false, error: (res.status >= 500 ? `${msg} (HTTP ${res.status})` : msg) + detail };
    } catch (err) {
      console.error('Login error:', err);
      const isLive = typeof window !== 'undefined' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1';
      return { ok: false, error: authErrorMessage(isLive) };
    }
  };

  const register = async (email, password, name = '') => {
    try {
      const res = await apiFetch('/auth/register', {
        method: 'POST',
        body: JSON.stringify({ email, password, name }),
      });
      const contentType = res.headers.get('content-type') || '';
      if (contentType.includes('text/html')) {
        return { ok: false, error: authErrorMessage(!import.meta.env.VITE_API_URL) };
      }
      let data = {};
      try {
        data = await res.json();
      } catch (_) {
        const text = await res.text().catch(() => '');
        if (res.status === 502) {
          return { ok: false, error: 'Registrierung fehlgeschlagen. (HTTP 502 – Backend-Funktion antwortet nicht. Bitte kurz warten und erneut versuchen; bei Wiederholung Netlify-Logs prüfen.)' };
        }
        const preview = text ? ` – Antwort: ${text.trim().slice(0, 80)}${text.length > 80 ? '…' : ''}` : '';
        console.error('Register response not JSON:', res.status, text.slice(0, 300));
        return { ok: false, error: `Registrierung fehlgeschlagen. (HTTP ${res.status}${preview})` };
      }
      if (res.ok && data.user) {
        setUser(data.user);
        return { ok: true };
      }
      if (res.status === 502) {
        return { ok: false, error: 'Registrierung fehlgeschlagen. (HTTP 502 – Backend-Funktion antwortet nicht. Bitte kurz warten und erneut versuchen; bei Wiederholung Netlify-Logs prüfen.)' };
      }
      const msg = data.error || 'Registrierung fehlgeschlagen.';
      const detail = data.detail ? ` – ${data.detail}` : '';
      return { ok: false, error: (res.status >= 500 ? `${msg} (HTTP ${res.status})` : msg) + detail };
    } catch (err) {
      console.error('Register error:', err);
      const isLive = typeof window !== 'undefined' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1';
      return { ok: false, error: authErrorMessage(isLive) };
    }
  };

  const logout = async () => {
    try {
      await apiFetch('/auth/logout', { method: 'POST' });
    } finally {
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider value={{
      user,
      loading,
      loginWithEmail,
      register,
      logout,
      refreshUser: loadUser,
      showAuthModal,
      setShowAuthModal,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

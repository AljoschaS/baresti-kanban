import { useState } from "react";
import { api } from "../api";
import barestiLogo from "../assets/baresti-logo.png";

// Login-Bildschirm: wird gezeigt, sobald mindestens eine Person ein
// Passwort hat und noch niemand eingeloggt ist.
export default function LoginForm({ onLoggedIn }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const { user } = await api.login(email.trim(), password);
      onLoggedIn(user);
    } catch (err) {
      setError(err.message || "Anmeldung fehlgeschlagen");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="login-shell">
      <form className="login-box" onSubmit={handleSubmit}>
        <img src={barestiLogo} alt="Baresti GmbH" className="login-logo" />
        <p className="login-subtitle">Bitte anmelden</p>
        <label className="login-field">
          <span>E-Mail</span>
          <input
            type="email"
            autoFocus
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="username"
          />
        </label>
        <label className="login-field">
          <span>Passwort</span>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
          />
        </label>
        {error && <div className="login-error">{error}</div>}
        <button type="submit" disabled={submitting}>
          {submitting ? "Anmelden..." : "Anmelden"}
        </button>
        <p className="login-hint">
          Passwort vergessen? Ein Teammitglied kann dir im Team-Bereich ein neues zuweisen.
        </p>
      </form>
    </div>
  );
}

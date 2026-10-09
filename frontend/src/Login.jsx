import { useState } from "react";
import { api } from "./api";

export default function Login({ onLogin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const data = await api("/login", { method: "POST", body: { email, password } });
      onLogin(data.token, data.user);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth">
      <aside className="auth-side">
        <div className="brand light">
          <span className="brand-mark" aria-hidden="true"><i /><i /><i /><i /></span>
          Workshop Registration
        </div>
        <div>
          <h1>Every seat counted, once.</h1>
          <p>Register attendees, see what is still open, and never promise the same last seat twice.</p>
        </div>
        <div className="pips" aria-hidden="true">
          {Array.from({ length: 24 }, (_, i) => <span key={i} className={i < 17 ? "pip on" : "pip"} />)}
        </div>
      </aside>

      <section className="auth-main">
        <form className="login-box" onSubmit={submit}>
          <div>
            <h2>Sign in</h2>
            <p className="muted">Use the account your administrator created for you.</p>
          </div>
          <label>Email
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="username" required />
          </label>
          <label>Password
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" required />
          </label>
          {error && <p className="error">{error}</p>}
          <button disabled={busy}>{busy ? "Signing in..." : "Sign in"}</button>
        </form>
      </section>
    </div>
  );
}
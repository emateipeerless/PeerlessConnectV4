import { FormEvent, useState } from "react";
import { LoadingSpinner } from "../LoadingSpinner";

interface CreatorLoginPageProps {
  loading: boolean;
  error: string | null;
  onLogin: (username: string, password: string) => void;
  onClose: () => void;
}

export function CreatorLoginPage({ loading, error, onLogin, onClose }: CreatorLoginPageProps) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const trimmed = username.trim();
    if (!trimmed || !password) return;
    onLogin(trimmed, password);
  }

  return (
    <div className="admin-panel">
      <div className="card">
        <header className="admin-panel__header">
          <div>
            <h1>Admin sign in</h1>
            <p>Sign in to load your view structure and create a new standard user.</p>
          </div>
          <button type="button" className="secondary-button" onClick={onClose}>
            Close
          </button>
        </header>
        <form onSubmit={handleSubmit}>
          <label htmlFor="creator-username">Username</label>
          <input
            id="creator-username"
            type="text"
            autoComplete="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            disabled={loading}
          />
          <label htmlFor="creator-password">Password</label>
          <input
            id="creator-password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={loading}
          />
          <button type="submit" disabled={loading || !username.trim() || !password}>
            Continue
          </button>
        </form>
        {error && <p className="message error">{error}</p>}
      </div>
      {loading && (
        <div className="page-overlay" aria-busy="true">
          <LoadingSpinner label="Signing in..." size="lg" />
        </div>
      )}
    </div>
  );
}

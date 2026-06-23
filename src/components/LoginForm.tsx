import { FormEvent, useState } from "react";
import { LoadingSpinner } from "./LoadingSpinner";

interface LoginFormProps {
  loading: boolean;
  error: string | null;
  onLogin: (username: string, password: string) => void;
}

export function LoginForm({ loading, error, onLogin }: LoginFormProps) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const trimmedUsername = username.trim();
    if (!trimmedUsername || !password) {
      return;
    }
    onLogin(trimmedUsername, password);
  }

  return (
    <div className="login-page">
      {loading && (
        <div className="login-overlay" aria-busy="true" aria-label="Signing in">
          <LoadingSpinner label="Signing in..." size="lg" />
        </div>
      )}

      <div className="login-card">
        <header>
          <h1>Peerless Connect</h1>
          <p>Sign in to view your devices</p>
        </header>

        <form onSubmit={handleSubmit}>
          <label htmlFor="username">Username</label>
          <input
            id="username"
            type="text"
            autoComplete="username"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            disabled={loading}
          />

          <label htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            disabled={loading}
          />

          <button type="submit" disabled={loading || !username.trim() || !password}>
            Sign in
          </button>
        </form>

        {error && <p className="message error">{error}</p>}
      </div>
    </div>
  );
}

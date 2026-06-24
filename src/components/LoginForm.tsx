import { FormEvent, useState } from "react";
import { isSsoConfigured } from "../config/sso";
import { BrandLogo } from "./BrandLogo";
import { LoadingSpinner } from "./LoadingSpinner";
import { MicrosoftLoginButton } from "./MicrosoftLoginButton";

interface LoginFormProps {
  loading: boolean;
  error: string | null;
  onLogin: (username: string, password: string) => void;
  ssoLoading?: boolean;
}

export function LoginForm({ loading, error, onLogin, ssoLoading }: LoginFormProps) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const showSso = isSsoConfigured();
  const busy = loading || Boolean(ssoLoading);

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
      {busy && (
        <div className="login-overlay" aria-busy="true" aria-label="Signing in">
          <LoadingSpinner label="Signing in..." size="lg" />
        </div>
      )}

      <div className="login-card">
        <header className="login-card__header">
          <BrandLogo variant="login" />
          <p>Sign in to view your devices</p>
        </header>

        {showSso && (
          <>
            <MicrosoftLoginButton disabled={busy} />
            <div className="login-divider" role="separator">
              <span>or use email and password</span>
            </div>
          </>
        )}

        <form onSubmit={handleSubmit}>
          <label htmlFor="username">Username</label>
          <input
            id="username"
            type="text"
            autoComplete="username"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            disabled={busy}
          />

          <label htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            disabled={busy}
          />

          <button type="submit" disabled={busy || !username.trim() || !password}>
            Sign in
          </button>
        </form>

        {error && <p className="message error">{error}</p>}
      </div>
    </div>
  );
}

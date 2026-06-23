import { FormEvent, useState } from "react";
import { LoadingSpinner } from "./LoadingSpinner";

interface OnboardingPageProps {
  email: string;
  submitting: boolean;
  error: string | null;
  onSubmit: (payload: {
    firstName: string;
    lastName: string;
    phone: string;
    password: string;
  }) => void;
}

export function OnboardingPage({ email, submitting, error, onSubmit }: OnboardingPageProps) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!firstName.trim() || !lastName.trim() || !phone.trim() || !password) return;
    if (password !== confirmPassword) return;
    onSubmit({
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      phone: phone.trim(),
      password,
    });
  }

  const passwordsMatch = !confirmPassword || password === confirmPassword;

  return (
    <div className="login-page">
      {submitting && (
        <div className="login-overlay" aria-busy="true">
          <LoadingSpinner label="Saving your profile..." size="lg" />
        </div>
      )}
      <div className="login-card onboarding-card">
        <header>
          <h1>Complete your account</h1>
          <p>Set up your profile for {email}</p>
        </header>
        <form onSubmit={handleSubmit}>
          <label htmlFor="first-name">First name</label>
          <input
            id="first-name"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            disabled={submitting}
          />
          <label htmlFor="last-name">Last name</label>
          <input
            id="last-name"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            disabled={submitting}
          />
          <label htmlFor="phone">Phone number</label>
          <input
            id="phone"
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            disabled={submitting}
          />
          <label htmlFor="new-password">New password</label>
          <input
            id="new-password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={submitting}
          />
          <label htmlFor="confirm-password">Confirm password</label>
          <input
            id="confirm-password"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            disabled={submitting}
          />
          {!passwordsMatch && <p className="message error">Passwords do not match.</p>}
          <button
            type="submit"
            disabled={
              submitting ||
              !firstName.trim() ||
              !lastName.trim() ||
              !phone.trim() ||
              !password ||
              !passwordsMatch
            }
          >
            Complete setup
          </button>
        </form>
        {error && <p className="message error">{error}</p>}
      </div>
    </div>
  );
}

import { BrandLogo } from "./BrandLogo";
import { ThemeToggle } from "./ThemeToggle";

interface AppTopBarProps {
  username: string;
  onAdmin: () => void;
  onLogout: () => void;
}

export function AppTopBar({ username, onAdmin, onLogout }: AppTopBarProps) {
  return (
    <header className="app-top-bar" aria-label="Application toolbar">
      <div className="app-top-bar__brand">
        <BrandLogo variant="topbar" />
        <p className="app-top-bar__subtitle">Signed in as {username}</p>
      </div>

      <div className="app-top-bar__end">
        <ThemeToggle />
        <button type="button" className="admin-button" onClick={onAdmin}>
          Admin
        </button>
        <button type="button" className="logout-button" onClick={onLogout}>
          Sign out
        </button>
      </div>
    </header>
  );
}

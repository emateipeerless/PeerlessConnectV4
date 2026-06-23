import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type Theme = "light" | "dark";

const STORAGE_KEY = "peerless-connect-theme";

interface ThemeContextValue {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
  /** When false, theme follows OS preference only (login / onboarding). */
  customizationEnabled: boolean;
  setCustomizationEnabled: (enabled: boolean) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

function getSystemTheme(): Theme {
  return window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
}

function readStoredTheme(): Theme {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "light" || stored === "dark") return stored;
  } catch {
    /* private browsing */
  }
  return getSystemTheme();
}

function applyTheme(theme: Theme) {
  document.documentElement.setAttribute("data-theme", theme);
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [customizationEnabled, setCustomizationEnabled] = useState(false);
  const [theme, setThemeState] = useState<Theme>(() => getSystemTheme());

  const setTheme = useCallback(
    (next: Theme) => {
      if (!customizationEnabled) return;
      setThemeState(next);
      applyTheme(next);
      try {
        localStorage.setItem(STORAGE_KEY, next);
      } catch {
        /* ignore */
      }
    },
    [customizationEnabled],
  );

  const toggleTheme = useCallback(() => {
    setTheme(theme === "dark" ? "light" : "dark");
  }, [setTheme, theme]);

  useEffect(() => {
    if (!customizationEnabled) {
      const syncSystem = () => {
        const system = getSystemTheme();
        setThemeState(system);
        applyTheme(system);
      };

      syncSystem();
      const mq = window.matchMedia("(prefers-color-scheme: light)");
      mq.addEventListener("change", syncSystem);
      return () => mq.removeEventListener("change", syncSystem);
    }

    const saved = readStoredTheme();
    setThemeState(saved);
    applyTheme(saved);
  }, [customizationEnabled]);

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  const value = useMemo(
    () => ({
      theme,
      setTheme,
      toggleTheme,
      customizationEnabled,
      setCustomizationEnabled,
    }),
    [theme, setTheme, toggleTheme, customizationEnabled],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return ctx;
}

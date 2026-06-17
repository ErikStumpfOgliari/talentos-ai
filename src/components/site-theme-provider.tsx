"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { Moon, Sun } from "lucide-react";

type SiteTheme = "light" | "dark";

type SiteThemeContextValue = {
  setTheme: (theme: SiteTheme) => void;
  theme: SiteTheme;
  toggleTheme: () => void;
};

const THEME_STORAGE_KEY = "aptelys-theme";

const SiteThemeContext = createContext<SiteThemeContextValue>({
  setTheme: () => undefined,
  theme: "light",
  toggleTheme: () => undefined,
});

function applyTheme(theme: SiteTheme) {
  document.documentElement.dataset.colorTheme = theme;
  document.body.dataset.colorTheme = theme;
  document.documentElement.classList.toggle("theme-dark", theme === "dark");
  document.documentElement.classList.toggle("theme-light", theme === "light");
  document.body.classList.toggle("theme-dark", theme === "dark");
  document.body.classList.toggle("theme-light", theme === "light");
  document.documentElement.style.colorScheme = theme;
}

export function SiteThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<SiteTheme>("light");

  const setTheme = useCallback((nextTheme: SiteTheme) => {
    applyTheme(nextTheme);
    setThemeState(nextTheme);
  }, []);

  const toggleTheme = useCallback(() => {
    setThemeState((currentTheme) => {
      const nextTheme = currentTheme === "dark" ? "light" : "dark";
      applyTheme(nextTheme);
      window.localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
      return nextTheme;
    });
  }, []);

  useEffect(() => {
    const storedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);

    if (storedTheme === "dark" || storedTheme === "light") {
      applyTheme(storedTheme);
      const timeout = window.setTimeout(() => setThemeState(storedTheme), 0);
      return () => window.clearTimeout(timeout);
    }

    return undefined;
  }, []);

  useEffect(() => {
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
    applyTheme(theme);
  }, [theme]);

  const value = useMemo(
    () => ({
      setTheme,
      theme,
      toggleTheme,
    }),
    [setTheme, theme, toggleTheme],
  );

  return <SiteThemeContext.Provider value={value}>{children}</SiteThemeContext.Provider>;
}

export function useSiteTheme() {
  return useContext(SiteThemeContext);
}

export function ThemeToggle({ className = "" }: { className?: string }) {
  const { theme, toggleTheme } = useSiteTheme();
  const isDark = theme === "dark";

  return (
    <button
      aria-label={isDark ? "Ativar modo claro" : "Ativar modo escuro"}
      className={`theme-toggle ${className}`}
      data-no-translate
      data-theme={theme}
      onClick={toggleTheme}
      type="button"
    >
      <span className="theme-toggle-icon" aria-hidden="true">
        <Sun className="theme-toggle-sun h-4 w-4" />
        <Moon className="theme-toggle-moon h-4 w-4" />
      </span>
      <span className="sr-only">{isDark ? "Ativar modo claro" : "Ativar modo escuro"}</span>
    </button>
  );
}

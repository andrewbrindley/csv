import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { ThemeProvider as SCThemeProvider } from "styled-components";
import { getTheme } from "../theme";

const ThemeModeContext = createContext({ mode: "light", setMode: () => {}, toggle: () => {} });

const STORAGE_KEY = "ingestr.theme";

function getInitialMode() {
  if (typeof window === "undefined") return "light";
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === "light" || stored === "dark") return stored;
  } catch (_) {}
  // Respect system preference on first load.
  if (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches) {
    return "dark";
  }
  return "light";
}

export function ThemeProvider({ children }) {
  const [mode, setMode] = useState(getInitialMode);

  useEffect(() => {
    try { window.localStorage.setItem(STORAGE_KEY, mode); } catch (_) {}
    if (typeof document !== "undefined") {
      document.documentElement.dataset.theme = mode;
    }
  }, [mode]);

  const value = useMemo(
    () => ({ mode, setMode, toggle: () => setMode((m) => (m === "dark" ? "light" : "dark")) }),
    [mode]
  );

  const theme = useMemo(() => getTheme(mode), [mode]);

  return (
    <ThemeModeContext.Provider value={value}>
      <SCThemeProvider theme={theme}>{children}</SCThemeProvider>
    </ThemeModeContext.Provider>
  );
}

export function useThemeMode() {
  return useContext(ThemeModeContext);
}

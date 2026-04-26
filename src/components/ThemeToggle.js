import React from "react";
import { IconButton } from "../styles";
import { useThemeMode } from "./ThemeContext";

export default function ThemeToggle() {
  const { mode, toggle } = useThemeMode();
  const isDark = mode === "dark";
  return (
    <IconButton
      onClick={toggle}
      title={isDark ? "Switch to light mode" : "Switch to dark mode"}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
    >
      {isDark ? "☼" : "☾"}
    </IconButton>
  );
}

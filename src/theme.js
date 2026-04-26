/**
 * ingestr design tokens.
 *
 * Single source of truth. Every styled-component reads from here via the
 * styled-components ThemeProvider. Switching `mode` between "light" and
 * "dark" should be the only thing required to flip the entire UI.
 */

const accent = {
  // Violet — distinctive, not the default Bootstrap blue.
  base: "#6366f1",      // indigo-500
  hover: "#4f46e5",     // indigo-600
  pressed: "#4338ca",   // indigo-700
  soft: "#eef2ff",      // indigo-50
  softHover: "#e0e7ff", // indigo-100
  ring: "rgba(99, 102, 241, 0.18)",
  fg: "#ffffff",
};

const accentDark = {
  ...accent,
  soft: "rgba(99, 102, 241, 0.12)",
  softHover: "rgba(99, 102, 241, 0.18)",
  ring: "rgba(129, 140, 248, 0.28)",
};

// Status palette — muted, intentional. No bright Bootstrap reds.
const status = {
  success: { fg: "#15803d", bg: "#f0fdf4", border: "#bbf7d0" },
  warning: { fg: "#a16207", bg: "#fefce8", border: "#fde68a" },
  danger:  { fg: "#b91c1c", bg: "#fef2f2", border: "#fecaca" },
  info:    { fg: "#1d4ed8", bg: "#eff6ff", border: "#bfdbfe" },
  ai:      { fg: "#5b21b6", bg: "#f5f3ff", border: "#ddd6fe" },
  neutral: { fg: "#475569", bg: "#f8fafc", border: "#e2e8f0" },
};

const statusDark = {
  success: { fg: "#86efac", bg: "rgba(34, 197, 94, 0.10)",  border: "rgba(34, 197, 94, 0.32)" },
  warning: { fg: "#fde047", bg: "rgba(234, 179, 8, 0.10)",  border: "rgba(234, 179, 8, 0.32)" },
  danger:  { fg: "#fca5a5", bg: "rgba(239, 68, 68, 0.10)",  border: "rgba(239, 68, 68, 0.32)" },
  info:    { fg: "#93c5fd", bg: "rgba(59, 130, 246, 0.10)", border: "rgba(59, 130, 246, 0.32)" },
  ai:      { fg: "#c4b5fd", bg: "rgba(139, 92, 246, 0.12)", border: "rgba(139, 92, 246, 0.32)" },
  neutral: { fg: "#cbd5e1", bg: "rgba(148, 163, 184, 0.08)", border: "rgba(148, 163, 184, 0.24)" },
};

export const lightTheme = {
  mode: "light",
  colors: {
    // Surfaces
    bg: "#fafaf9",        // page background — warm off-white
    surface: "#ffffff",   // cards, inputs
    surfaceAlt: "#f5f5f4", // hover, subtle blocks
    surfaceMuted: "#f9fafb",
    // Text
    fg: "#0a0a0c",         // near-black
    fgMuted: "#52525b",    // body secondary
    fgFaint: "#a1a1aa",    // captions
    // Borders
    border: "#e7e5e4",
    borderStrong: "#d6d3d1",
    // Focus ring
    focusRing: accent.ring,
    accent,
    status,
    // Special
    overlay: "rgba(10, 10, 12, 0.45)",
    codeBg: "#f4f4f5",
  },
};

export const darkTheme = {
  mode: "dark",
  colors: {
    bg: "#0a0a0c",
    surface: "#111114",
    surfaceAlt: "#18181b",
    surfaceMuted: "#1c1c20",
    fg: "#fafafa",
    fgMuted: "#a1a1aa",
    fgFaint: "#71717a",
    border: "#27272a",
    borderStrong: "#3f3f46",
    focusRing: accentDark.ring,
    accent: accentDark,
    status: statusDark,
    overlay: "rgba(0, 0, 0, 0.65)",
    codeBg: "#18181b",
  },
};

// Shared, mode-independent tokens.
export const tokens = {
  font: {
    sans: `"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`,
    mono: `"JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace`,
  },
  // 4px spacing scale.
  space: (n) => `${n * 4}px`,
  radius: {
    xs: "4px",
    sm: "6px",
    md: "8px",
    lg: "12px",
    pill: "999px",
  },
  shadow: {
    none: "none",
    sm: "0 1px 2px rgba(0, 0, 0, 0.04)",
    md: "0 1px 3px rgba(0, 0, 0, 0.08), 0 1px 2px rgba(0, 0, 0, 0.04)",
    lg: "0 10px 15px -3px rgba(0, 0, 0, 0.08), 0 4px 6px -2px rgba(0, 0, 0, 0.04)",
    // Dark-mode shadows are weaker (inset-style depth from borders does the work).
    smDark: "0 1px 2px rgba(0, 0, 0, 0.4)",
    mdDark: "0 1px 3px rgba(0, 0, 0, 0.6)",
    lgDark: "0 12px 24px rgba(0, 0, 0, 0.5)",
  },
  motion: {
    fast: "120ms cubic-bezier(0.4, 0, 0.2, 1)",
    base: "180ms cubic-bezier(0.4, 0, 0.2, 1)",
    slow: "260ms cubic-bezier(0.4, 0, 0.2, 1)",
  },
  // Mobile-first breakpoints.
  bp: {
    sm: "@media (min-width: 640px)",
    md: "@media (min-width: 1024px)",
    lg: "@media (min-width: 1280px)",
    // Height-based (some panes need it).
    shortViewport: "@media (max-height: 900px)",
  },
  zIndex: {
    sticky: 100,
    dropdown: 1000,
    modal: 2000,
    tooltip: 3000,
  },
};

export function getTheme(mode) {
  return mode === "dark"
    ? { ...darkTheme, ...tokens, shadow: { sm: tokens.shadow.smDark, md: tokens.shadow.mdDark, lg: tokens.shadow.lgDark } }
    : { ...lightTheme, ...tokens, shadow: { sm: tokens.shadow.sm, md: tokens.shadow.md, lg: tokens.shadow.lg } };
}

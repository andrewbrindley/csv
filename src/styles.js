import styled, { css } from "styled-components";

/**
 * ingestr — visual layer.
 *
 * Every styled-component pulls colour, spacing, typography, motion, and
 * breakpoints from the theme provided by ThemeProvider (see theme.js +
 * components/ThemeContext.js).
 *
 * Component shapes, prop signatures, and exports have not changed. Only the
 * visual values have. Layout, sizing, behaviour, and DOM are preserved.
 */

const focus = css`
  outline: none;
  box-shadow: 0 0 0 3px ${({ theme }) => theme.colors.focusRing};
`;

export const Btn = styled.button`
  padding: 8px 16px;
  border-radius: ${({ theme }) => theme.radius.sm};
  font-size: 13px;
  font-family: inherit;
  font-weight: 500;
  border: 1px solid transparent;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 120px;
  transition: background ${({ theme }) => theme.motion.fast},
              border-color ${({ theme }) => theme.motion.fast},
              color ${({ theme }) => theme.motion.fast},
              transform 80ms cubic-bezier(0.4, 0, 0.2, 1);
  transform: translateY(0);

  &:focus-visible {
    ${focus}
  }

  ${(p) =>
    p.variant === "primary"
      ? css`
          background: ${({ theme }) => theme.colors.accent.base};
          color: ${({ theme }) => theme.colors.accent.fg};
          border-color: ${({ theme }) => theme.colors.accent.base};

          &:hover:not(:disabled) {
            background: ${({ theme }) => theme.colors.accent.hover};
            border-color: ${({ theme }) => theme.colors.accent.hover};
          }

          &:disabled {
            background: ${({ theme }) => theme.colors.borderStrong};
            border-color: ${({ theme }) => theme.colors.borderStrong};
            color: ${({ theme }) => theme.colors.fgFaint};
            cursor: not-allowed;
            transform: none;
          }
        `
      : css`
          background: ${({ theme }) => theme.colors.surface};
          color: ${({ theme }) => theme.colors.fg};
          border-color: ${({ theme }) => theme.colors.border};

          &:hover:not(:disabled) {
            background: ${({ theme }) => theme.colors.surfaceAlt};
            border-color: ${({ theme }) => theme.colors.borderStrong};
          }
        `}

  &:active:not(:disabled) {
    transform: translateY(1px);
  }
`;

export const Card = styled.div`
  background: ${({ theme }) => theme.colors.surface};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radius.md};
  box-shadow: ${({ theme }) => theme.shadow.sm};
  padding: 20px 24px;
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
  color: ${({ theme }) => theme.colors.fg};

  ${({ theme }) => theme.bp.shortViewport} {
    height: auto;
    min-height: 100%;
    overflow: visible;
  }
`;

export const SectionTitle = styled.h3`
  margin: 4px 0 8px;
  font-size: 15px;
  font-weight: 600;
  letter-spacing: -0.01em;
  color: ${({ theme }) => theme.colors.fg};
`;

export const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
  margin-top: 0;
  font-size: 13px;
  table-layout: auto;
  color: ${({ theme }) => theme.colors.fg};
`;

export const Th = styled.th`
  text-align: left;
  padding: 10px 12px;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  background: ${({ theme }) => theme.colors.surfaceMuted};
  position: sticky;
  top: 0;
  z-index: 20;
  font-weight: 500;
  font-size: 11px;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: ${({ theme }) => theme.colors.fgMuted};
  white-space: nowrap;
  text-overflow: ellipsis;
  overflow: visible;
  min-width: 150px;

  &:hover {
    z-index: 50;
  }
`;

export const Td = styled.td`
  padding: 8px 12px;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  vertical-align: middle;
  background: ${({ theme }) => theme.colors.surface};
  height: 32px;
  box-sizing: border-box;
  white-space: nowrap;
  color: ${({ theme }) => theme.colors.fg};
`;

const statusFg = (theme, key) => theme.colors.status[key].fg;
const statusBg = (theme, key) => theme.colors.status[key].bg;
const statusBd = (theme, key) => theme.colors.status[key].border;

export const StatusBadge = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 3px 10px;
  border-radius: ${({ theme }) => theme.radius.pill};
  font-size: 10.5px;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  border: 1px solid transparent;

  ${(p) =>
    p.kind === "direct" &&
    css`
      color: ${({ theme }) => statusFg(theme, "success")};
      background: ${({ theme }) => statusBg(theme, "success")};
      border-color: ${({ theme }) => statusBd(theme, "success")};
    `}
  ${(p) =>
    p.kind === "ai" &&
    css`
      color: ${({ theme }) => statusFg(theme, "ai")};
      background: ${({ theme }) => statusBg(theme, "ai")};
      border-color: ${({ theme }) => statusBd(theme, "ai")};
    `}
  ${(p) =>
    p.kind === "confirm" &&
    css`
      color: ${({ theme }) => statusFg(theme, "warning")};
      background: ${({ theme }) => statusBg(theme, "warning")};
      border-color: ${({ theme }) => statusBd(theme, "warning")};
    `}
  ${(p) =>
    p.kind === "none" &&
    css`
      color: ${({ theme }) => statusFg(theme, "danger")};
      background: ${({ theme }) => statusBg(theme, "danger")};
      border-color: ${({ theme }) => statusBd(theme, "danger")};
    `}

  ${(p) =>
    p.status === "ok" &&
    css`
      color: ${({ theme }) => statusFg(theme, "success")};
      background: ${({ theme }) => statusBg(theme, "success")};
      border-color: ${({ theme }) => statusBd(theme, "success")};
    `}
  ${(p) =>
    p.status === "warn" &&
    css`
      color: ${({ theme }) => statusFg(theme, "warning")};
      background: ${({ theme }) => statusBg(theme, "warning")};
      border-color: ${({ theme }) => statusBd(theme, "warning")};
    `}
  ${(p) =>
    p.status === "bad" &&
    css`
      color: ${({ theme }) => statusFg(theme, "danger")};
      background: ${({ theme }) => statusBg(theme, "danger")};
      border-color: ${({ theme }) => statusBd(theme, "danger")};
    `}
  ${(p) =>
    p.status === "pending" &&
    css`
      color: ${({ theme }) => statusFg(theme, "neutral")};
      background: ${({ theme }) => statusBg(theme, "neutral")};
      border-color: ${({ theme }) => statusBd(theme, "neutral")};
    `}
`;

export const ErrorBanner = styled.div`
  margin-top: 8px;
  padding: 8px 12px;
  border-radius: ${({ theme }) => theme.radius.sm};
  background: ${({ theme }) => statusBg(theme, "danger")};
  border: 1px solid ${({ theme }) => statusBd(theme, "danger")};
  color: ${({ theme }) => statusFg(theme, "danger")};
  font-size: 12px;
`;

export const PiiTag = styled.span`
  margin-left: 6px;
  padding: 1px 6px;
  border-radius: ${({ theme }) => theme.radius.pill};
  font-size: 9px;
  font-weight: 600;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  background: ${({ theme }) => statusBg(theme, "warning")};
  color: ${({ theme }) => statusFg(theme, "warning")};
  border: 1px solid ${({ theme }) => statusBd(theme, "warning")};
`;

export const CellPill = styled.div`
  width: 100%;
  padding: 4px 8px;
  border-radius: ${({ theme }) => theme.radius.sm};
  font-size: 13px;
  transition: all ${({ theme }) => theme.motion.base};
  border: 1px solid transparent;
  color: ${({ theme }) => theme.colors.fg};

  ${(p) =>
    p.status === "ok" &&
    css`
      background: ${({ theme }) => statusBg(theme, "success")};
      border-color: ${({ theme }) => statusBd(theme, "success")};
      color: ${({ theme }) => statusFg(theme, "success")};
      &:focus-within {
        border-color: ${({ theme }) => statusFg(theme, "success")};
        ${focus}
      }
    `}

  ${(p) =>
    p.status === "warn" &&
    css`
      background: ${({ theme }) => statusBg(theme, "warning")};
      border-color: ${({ theme }) => statusBd(theme, "warning")};
      color: ${({ theme }) => statusFg(theme, "warning")};
      &:focus-within {
        border-color: ${({ theme }) => statusFg(theme, "warning")};
      }
    `}

  ${(p) =>
    p.status === "bad" &&
    css`
      background: ${({ theme }) => statusBg(theme, "danger")};
      border-color: ${({ theme }) => statusBd(theme, "danger")};
      color: ${({ theme }) => statusFg(theme, "danger")};
      &:focus-within {
        border-color: ${({ theme }) => statusFg(theme, "danger")};
        ${focus}
      }
    `}

  ${(p) =>
    p.status === "neutral" &&
    css`
      background: ${({ theme }) => statusBg(theme, "neutral")};
      border-color: ${({ theme }) => statusBd(theme, "neutral")};
      color: ${({ theme }) => statusFg(theme, "neutral")};
      &:focus-within {
        border-color: ${({ theme }) => theme.colors.borderStrong};
      }
    `}
`;

export const CellText = styled.span`
  display: inline-block;
  width: 100%;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  cursor: pointer;
  font-size: 12px;
  padding: 2px 4px;
`;

export const Main = styled.main`
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
  min-height: 0;
  overflow: hidden;
  background: ${({ theme }) => theme.colors.bg};
`;

export const Header = styled.header`
  height: 64px;
  background: ${({ theme }) => theme.colors.surface};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 16px;
  flex-shrink: 0;
  position: sticky;
  top: 0;
  z-index: ${({ theme }) => theme.zIndex.sticky};
  gap: 12px;
  color: ${({ theme }) => theme.colors.fg};

  ${({ theme }) => theme.bp.sm} {
    padding: 0 24px;
  }
`;

export const HeaderSub = styled.div`
  font-size: 12px;
  color: ${({ theme }) => theme.colors.fgMuted};
  margin-top: 2px;
`;

export const Content = styled.div`
  flex: 1;
  padding: 16px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  min-height: 0;
  scrollbar-gutter: stable;
  background: ${({ theme }) => theme.colors.bg};

  ${({ theme }) => theme.bp.sm} {
    padding: 24px;
  }

  ${({ theme }) => theme.bp.shortViewport} {
    overflow-y: auto;
    height: auto;
    display: block;
  }
`;

/**
 * The historical "logo dot" — kept for backward compatibility, but restyled
 * as a square rounded mark in the accent colour. New code should prefer
 * <Brand /> below.
 */
export const LogoDot = styled.div`
  width: 28px;
  height: 28px;
  border-radius: ${({ theme }) => theme.radius.sm};
  background: ${({ theme }) => theme.colors.accent.base};
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.accent.fg};
  font-size: 14px;
  flex-shrink: 0;
  letter-spacing: -0.02em;
`;

/**
 * ingestr wordmark. Always renders the brand consistently.
 */
export const Brand = styled.div`
  display: inline-flex;
  align-items: baseline;
  font-family: ${({ theme }) => theme.font.sans};
  font-weight: 700;
  font-size: 18px;
  letter-spacing: -0.025em;
  color: ${({ theme }) => theme.colors.fg};
  user-select: none;

  &::before {
    content: "ingestr";
  }

  &::after {
    content: ".";
    color: ${({ theme }) => theme.colors.accent.base};
    margin-left: 1px;
  }
`;

/* Tooltip Components */
export const TooltipContainer = styled.div`
  display: inline-flex;
  margin-left: 6px;
  position: relative;
  cursor: help;
`;

export const TooltipCard = styled.div`
  background: ${({ theme }) => theme.colors.surface};
  border: 1px solid ${({ theme }) => theme.colors.border};
  box-shadow: ${({ theme }) => theme.shadow.lg};
  border-radius: ${({ theme }) => theme.radius.sm};
  overflow: hidden;
  font-size: 13px;
  text-align: left;
  color: ${({ theme }) => theme.colors.fg};
`;

export const TooltipHeader = styled.div`
  background: ${({ theme }) => theme.colors.surfaceMuted};
  padding: 8px 12px;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  font-weight: 600;
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

export const TooltipBody = styled.div`
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 10px;
`;

export const TooltipSection = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
`;

export const TooltipLabel = styled.div`
  font-size: 10.5px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.fgFaint};
  text-transform: uppercase;
  letter-spacing: 0.06em;
`;

export const CodeBadge = styled.span`
  display: inline-block;
  background: ${({ theme }) => theme.colors.codeBg};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radius.xs};
  padding: 2px 6px;
  font-family: ${({ theme }) => theme.font.mono};
  font-size: 11px;
  color: ${({ theme }) => theme.colors.fgMuted};
  margin-right: 4px;
  margin-bottom: 4px;
`;

export const ToolHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.fg};
`;

export const UploadIcon = styled.span`
  font-size: 20px;
`;

export const WizardBar = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  margin: 10px 0 24px;
  font-size: 14px;
  color: ${({ theme }) => theme.colors.fgMuted};
  flex-wrap: wrap;

  ${({ theme }) => theme.bp.sm} {
    flex-wrap: nowrap;
  }
`;

export const StepCircle = styled.div`
  width: 28px;
  height: 28px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  font-size: 13px;
  transition: background ${({ theme }) => theme.motion.fast},
              border-color ${({ theme }) => theme.motion.fast},
              color ${({ theme }) => theme.motion.fast};

  ${({ active, done, theme }) =>
    active
      ? css`
          background: ${theme.colors.accent.base};
          color: ${theme.colors.accent.fg};
          border: 2px solid ${theme.colors.accent.base};
        `
      : done
      ? css`
          background: ${theme.colors.accent.soft};
          color: ${theme.colors.accent.base};
          border: 2px solid ${theme.colors.accent.base};
        `
      : css`
          background: ${theme.colors.surface};
          color: ${theme.colors.fgMuted};
          border: 2px solid ${theme.colors.borderStrong};
        `}
`;

export const StepLabel = styled.span`
  color: ${({ theme }) => theme.colors.fgMuted};
`;

export const StepLine = styled.div`
  flex: 1;
  height: 1px;
  background: ${({ theme }) => theme.colors.border};
  min-width: 16px;
`;

export const SmallNote = styled.div`
  font-size: 11px;
  color: ${({ theme }) => theme.colors.fgMuted};
  margin-top: 4px;
`;

export const Row = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 16px;
  margin: 8px 0;
  flex-wrap: wrap;

  ${({ theme }) => theme.bp.md} {
    flex-wrap: nowrap;
  }
`;

export const Col = styled.div`
  flex: ${(p) => p.flex || 1};
  min-width: 0;
`;

export const ButtonRow = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 24px;
  flex-wrap: wrap;
`;

export const DropZone = styled.div`
  border: 1.5px dashed ${({ theme }) => theme.colors.borderStrong};
  border-radius: ${({ theme }) => theme.radius.md};
  padding: 32px 24px;
  text-align: center;
  font-size: 13px;
  color: ${({ theme }) => theme.colors.fgMuted};
  background: ${(p) =>
    p.drag ? p.theme.colors.accent.soft : p.theme.colors.surfaceMuted};
  border-color: ${(p) =>
    p.drag ? p.theme.colors.accent.base : p.theme.colors.borderStrong};
  cursor: pointer;
  transition: background ${({ theme }) => theme.motion.fast},
              border-color ${({ theme }) => theme.motion.fast};

  &:hover {
    background: ${({ theme }) => theme.colors.accent.soft};
    border-color: ${({ theme }) => theme.colors.accent.base};
    color: ${({ theme }) => theme.colors.fg};
  }
`;

export const DZMain = styled.div`
  margin-bottom: 6px;
  color: ${({ theme }) => theme.colors.fg};
`;

export const DZHint = styled.div`
  font-size: 11px;
  color: ${({ theme }) => theme.colors.fgFaint};
`;

export const CellInner = styled.div`
  position: relative;
  display: flex;
  align-items: center;
  width: 100%;
`;

export const CellInput = styled.input`
  width: 100%;
  font-family: inherit;
  font-size: 13px;
  line-height: inherit;
  padding: 8px 12px;
  border-radius: ${({ theme }) => theme.radius.xs};
  border: none;
  background: transparent;
  outline: none;
  color: inherit;

  &:focus-visible {
    ${focus}
  }
`;

export const CellSelect = styled.select`
  width: 100%;
  font-family: inherit;
  font-size: 13px;
  line-height: inherit;
  padding: 8px 24px 8px 12px;
  border-radius: ${({ theme }) => theme.radius.xs};
  border: none;
  background: transparent;
  appearance: none;
  outline: none;
  cursor: pointer;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%2371717a'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='m19 9-7 7-7-7'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 8px center;
  background-size: 14px;
  color: inherit;
`;

export const CellControl = styled.div`
  flex: 1 1 auto;
  min-width: 0;
`;

export const TemplateTabBtn = styled.button`
  padding: 8px 14px;
  border-radius: ${({ theme }) => theme.radius.md};
  border: 1px solid ${({ theme }) => theme.colors.border};
  background: ${({ theme }) => theme.colors.surface};
  color: ${({ theme }) => theme.colors.fgMuted};
  font-size: 13px;
  font-family: inherit;
  cursor: pointer;
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 8px;
  transition: all ${({ theme }) => theme.motion.fast};

  &:hover {
    background: ${({ theme }) => theme.colors.surfaceAlt};
    border-color: ${({ theme }) => theme.colors.borderStrong};
    color: ${({ theme }) => theme.colors.fg};
  }

  &:focus-visible {
    ${focus}
  }

  ${(p) =>
    p.active &&
    css`
      background: ${({ theme }) => theme.colors.accent.base};
      color: ${({ theme }) => theme.colors.accent.fg};
      border-color: ${({ theme }) => theme.colors.accent.base};
      font-weight: 600;

      &:hover {
        background: ${({ theme }) => theme.colors.accent.hover};
        border-color: ${({ theme }) => theme.colors.accent.hover};
        color: ${({ theme }) => theme.colors.accent.fg};
      }
    `}
`;

export const StatusDot = styled.span`
  width: 8px;
  height: 8px;
  border-radius: 50%;
  display: inline-block;
  background: ${(p) => p.color || p.theme.colors.borderStrong};
  box-shadow: 0 0 0 3px ${(p) => (p.color ? `${p.color}22` : "transparent")};
`;

export const RemoveTabBtn = styled.span`
  margin-left: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 14px;
  height: 14px;
  border-radius: ${({ theme }) => theme.radius.xs};
  font-size: 10px;
  color: inherit;
  opacity: 0.5;
  transition: all ${({ theme }) => theme.motion.fast};

  &:hover {
    background: ${({ theme }) => theme.colors.surfaceAlt};
    opacity: 1;
    color: ${({ theme }) => statusFg(theme, "danger")};
  }
`;

export const ResetAction = styled.button`
  background: transparent;
  border: 1px solid ${({ theme }) => theme.colors.border};
  color: ${({ theme }) => theme.colors.fgMuted};
  font-size: 10px;
  font-weight: 600;
  font-family: inherit;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  cursor: pointer;
  padding: 3px 8px;
  border-radius: ${({ theme }) => theme.radius.xs};
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all ${({ theme }) => theme.motion.fast};
  margin-left: 2px;

  &:hover {
    color: ${({ theme }) => theme.colors.fg};
    border-color: ${({ theme }) => theme.colors.borderStrong};
    background: ${({ theme }) => theme.colors.surfaceAlt};
  }
`;

export const FixedTableContainer = styled.div`
  flex: 1;
  min-height: 0;
  overflow: auto;
  overflow-x: auto;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radius.md};
  background: ${({ theme }) => theme.colors.surface};

  ${({ theme }) => theme.bp.shortViewport} {
    flex: none;
    min-height: 400px;
    height: auto;
    max-height: none;
    overflow-x: auto;
    overflow-y: visible;
    display: block;
  }

  &::-webkit-scrollbar {
    width: 8px;
    height: 8px;
  }
  &::-webkit-scrollbar-track {
    background: ${({ theme }) => theme.colors.surfaceMuted};
  }
  &::-webkit-scrollbar-thumb {
    background: ${({ theme }) => theme.colors.borderStrong};
    border-radius: ${({ theme }) => theme.radius.xs};
  }
  &::-webkit-scrollbar-thumb:hover {
    background: ${({ theme }) => theme.colors.fgFaint};
  }
`;

export const SourceTag = styled.span`
  position: absolute;
  right: 4px;
  top: 50%;
  transform: translateY(-50%);
  font-size: 9.5px;
  font-weight: 700;
  letter-spacing: 0.06em;
  color: ${({ theme }) => theme.colors.fgFaint};
  text-transform: uppercase;

  ${(p) =>
    p.kind === "ai" &&
    css`
      color: ${({ theme }) => theme.colors.accent.base};
    `}
  ${(p) =>
    p.kind === "user" &&
    css`
      color: ${({ theme }) => statusFg(theme, "danger")};
    `}
`;

export const UserProfile = styled.div`
  position: relative;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 4px 8px;
  border-radius: ${({ theme }) => theme.radius.md};
  cursor: pointer;
  transition: background ${({ theme }) => theme.motion.fast},
              border-color ${({ theme }) => theme.motion.fast};
  background: ${({ theme }) => theme.colors.surfaceAlt};
  border: 1px solid ${({ theme }) => theme.colors.border};

  &:hover {
    background: ${({ theme }) => theme.colors.surfaceMuted};
    border-color: ${({ theme }) => theme.colors.borderStrong};
  }
`;

export const UserAvatar = styled.div`
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: ${({ theme }) => theme.colors.accent.base};
  display: flex;
  align-items: center;
  justify-content: center;
  color: ${({ theme }) => theme.colors.accent.fg};
  font-weight: 600;
  font-size: 12px;
  overflow: hidden;
  flex-shrink: 0;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
`;

export const ProfileInfo = styled.div`
  display: flex;
  flex-direction: column;
  padding-right: 4px;

  span:first-child {
    font-size: 13px;
    font-weight: 600;
    color: ${({ theme }) => theme.colors.fg};
    line-height: 1.2;
  }

  span:last-child {
    font-size: 11px;
    color: ${({ theme }) => theme.colors.fgMuted};
  }

  /* Hide the role label on small screens to keep header compact. */
  @media (max-width: 640px) {
    display: none;
  }
`;

export const DropdownMenu = styled.div`
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  width: 200px;
  background: ${({ theme }) => theme.colors.surface};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radius.md};
  box-shadow: ${({ theme }) => theme.shadow.lg};
  padding: 6px;
  display: flex;
  flex-direction: column;
  gap: 2px;
  z-index: ${({ theme }) => theme.zIndex.dropdown};
`;

export const DropdownItem = styled.button`
  width: 100%;
  padding: 8px 10px;
  border: none;
  background: transparent;
  text-align: left;
  font-size: 13px;
  font-family: inherit;
  color: ${({ theme }) => theme.colors.fg};
  border-radius: ${({ theme }) => theme.radius.sm};
  cursor: pointer;
  transition: background ${({ theme }) => theme.motion.fast};

  &:hover {
    background: ${({ theme }) => theme.colors.surfaceAlt};
  }

  ${(p) =>
    p.variant === "danger" &&
    css`
      color: ${({ theme }) => statusFg(theme, "danger")};
      &:hover {
        background: ${({ theme }) => statusBg(theme, "danger")};
      }
    `}
`;

export const IconButton = styled.button`
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: ${({ theme }) => theme.colors.surface};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radius.md};
  cursor: pointer;
  transition: all ${({ theme }) => theme.motion.fast};
  color: ${({ theme }) => theme.colors.fgMuted};
  font-family: inherit;
  flex-shrink: 0;

  &:hover {
    background: ${({ theme }) => theme.colors.surfaceAlt};
    color: ${({ theme }) => theme.colors.fg};
    border-color: ${({ theme }) => theme.colors.borderStrong};
  }

  &:focus-visible {
    ${focus}
  }

  ${(p) =>
    p.variant === "danger" &&
    css`
      color: ${({ theme }) => statusFg(theme, "danger")};
      background: ${({ theme }) => statusBg(theme, "danger")};
      border-color: ${({ theme }) => statusBd(theme, "danger")};
      &:hover {
        background: ${({ theme }) => statusBg(theme, "danger")};
        border-color: ${({ theme }) => statusFg(theme, "danger")};
        color: ${({ theme }) => statusFg(theme, "danger")};
      }
    `}
`;

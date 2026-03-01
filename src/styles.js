import styled, { css } from "styled-components";

export const Btn = styled.button`
  padding: 8px 16px;
  border-radius: 4px;
  font-size: 13px;
  border: none;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 120px;
  transition: background 0.12s ease, transform 0.08s ease;
  transform: translateY(0);

  ${(p) =>
    p.variant === "primary"
      ? css`
          background: #007bff;
          color: #fff;

          &:disabled {
            background: #9ca3ff;
            cursor: not-allowed;
            transform: none;
          }
        `
      : css`
          background: #e5e7eb;
          color: #374151;
        `}

  &:active:not(:disabled) {
    transform: translateY(1px);
  }
`;

export const Card = styled.div`
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06);
  padding: 20px 24px;
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;

  @media (max-height: 900px) {
    height: auto;
    min-height: 100%;
    overflow: visible;
  }
`;

export const SectionTitle = styled.h3`
  margin: 4px 0 8px;
  font-size: 16px;
  font-weight: 600;
`;

export const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
  margin-top: 0px;
  font-size: 13px;
  table-layout: auto; /* Allow columns to expand to fit text */
`;

export const Th = styled.th`
  text-align: left;
  padding: 8px;
  border-bottom: 1px solid #e5e7eb;
  background: #f9fafb;
  position: sticky;
  top: 0;
  z-index: 20;
  font-weight: 500;
  white-space: nowrap;
  text-overflow: ellipsis;
  overflow: visible;
  min-width: 150px; /* Default stable width */

  &:hover {
    z-index: 50;
  }
`;

export const Td = styled.td`
  padding: 6px 8px;
  border-bottom: 1px solid #f3f4f6;
  vertical-align: middle;
  background: #fff;
  height: 32px;
  box-sizing: border-box;
  white-space: nowrap;
`;

export const StatusBadge = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.3px;
  text-transform: uppercase;

  ${(p) =>
    p.kind === "direct" &&
    css`
      background: #dcfce7;
      color: #15803d;
      border: 1px solid #bbf7d0;
    `}
  ${(p) =>
    p.kind === "ai" &&
    css`
      background: #dbeafe;
      color: #1e40af;
      border: 1px solid #bfdbfe;
    `}
  ${(p) =>
    p.kind === "confirm" &&
    css`
      background: #fef3c7;
      color: #b45309;
      border: 1px solid #fde68a;
    `}
  ${(p) =>
    p.kind === "none" &&
    css`
      background: #fee2e2;
      color: #b91c1c;
      border: 1px solid #fecaca;
    `}
  
  /* Additional status mappings for job history */
  ${(p) =>
    p.status === "ok" &&
    css`
      background: #dcfce7;
      color: #166534;
      border: 1px solid #bbf7d0;
    `}

  ${(p) =>
    p.status === "warn" &&
    css`
      background: #fffbeb; 
      color: #92400e; 
      border: 1px solid #fde68a;
    `}

  ${(p) =>
    p.status === "bad" &&
    css`
      background: #fef2f2; 
      color: #991b1b; 
      border: 1px solid #fecaca;
    `}

  ${(p) =>
    p.status === "pending" &&
    css`
      background: #f1f5f9; 
      color: #475569; 
      border: 1px solid #e2e8f0;
    `}
`;

export const ErrorBanner = styled.div`
  margin-top: 8px;
  padding: 8px 12px;
  border-radius: 6px;
  background: #fef2f2;
  border: 1px solid #fecaca;
  color: #b91c1c;
  font-size: 12px;
`;

export const PiiTag = styled.span`
  margin-left: 6px;
  padding: 1px 6px;
  border-radius: 999px;
  font-size: 9px;
  font-weight: 500;
  background: #fef3c7;
  color: #92400e;
  text-transform: uppercase;
`;

export const CellPill = styled.div`
  width: 100%;
  padding: 4px 8px;
  border-radius: 6px;
  font-size: 13px;
  transition: all 0.2s ease;
  border: 1px solid transparent;

  ${(p) =>
    p.status === "ok" &&
    css`
      background: #f0fdf4;
      border-color: #dcfce7;
      color: #166534;
      &:focus-within {
        border-color: #16a34a;
        box-shadow: 0 0 0 2px rgba(22, 163, 74, 0.1);
      }
    `}

  ${(p) =>
    p.status === "warn" &&
    css`
      background: #fffbeb;
      border-color: #fef3c7;
      color: #92400e;
      &:focus-within {
        border-color: #d97706;
      }
    `}

  ${(p) =>
    p.status === "bad" &&
    css`
      background: #fef2f2;
      border-color: #fee2e2;
      color: #991b1b;
      &:focus-within {
        border-color: #dc2626;
        box-shadow: 0 0 0 2px rgba(220, 38, 38, 0.1);
      }
    `}

   ${(p) =>
    p.status === "neutral" &&
    css`
      background: #f8fafc;
      border-color: #e2e8f0;
      color: #475569;
       &:focus-within {
        border-color: #94a3b8;
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
`;

export const Header = styled.header`
  height: 64px;
  background: #fff;
  border-bottom: 1px solid #e5e7eb;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 24px;
  flex-shrink: 0;
  position: sticky;
  top: 0;
  z-index: 100;
`;

export const HeaderSub = styled.div`
  font-size: 12px;
  color: #6b7280;
  margin-top: 2px;
`;

export const Content = styled.div`
  flex: 1;
  padding: 24px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  min-height: 0;
  scrollbar-gutter: stable;

  @media (max-height: 900px) {
    overflow-y: auto;
    height: auto;
    display: block;
  }
`;

export const LogoDot = styled.div`
  width: 32px;
  height: 32px;
  border-radius: 8px;
  background: #2563eb;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  color: #fff;
  font-size: 18px;
  flex-shrink: 0;
`;

/* Tooltip Components */
export const TooltipContainer = styled.div`
  display: inline-flex;
  margin-left: 6px;
  position: relative;
  cursor: help;
`;

export const TooltipCard = styled.div`
  background: #fff;
  border: 1px solid #e5e7eb;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
  border-radius: 6px;
  overflow: hidden;
  font-size: 13px;
  text-align: left;
  color: #374151;
`;

export const TooltipHeader = styled.div`
  background: #f9fafb;
  padding: 8px 12px;
  border-bottom: 1px solid #e5e7eb;
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
  font-size: 11px;
  font-weight: 600;
  color: #9ca3af;
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

export const CodeBadge = styled.span`
  display: inline-block;
  background: #f3f4f6;
  border: 1px solid #e5e7eb;
  border-radius: 4px;
  padding: 2px 5px;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 11px;
  color: #4b5563;
  margin-right: 4px;
  margin-bottom: 4px;
`;

export const ToolHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
  font-weight: 600;
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
  color: #6b7280;
`;

export const StepCircle = styled.div`
  width: 28px;
  height: 28px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;

  ${({ active, done }) =>
    active
      ? css`
          background: #2563eb;
          color: #fff;
          border: 2px solid #2563eb;
        `
      : done
        ? css`
          background: #e5f3ff;
          color: #2563eb;
          border: 2px solid #2563eb;
        `
        : css`
          background: #fff;
          color: #6b7280;
          border: 2px solid #d1d5db;
        `}
`;

export const StepLabel = styled.span``;

export const StepLine = styled.div`
  flex: 1;
  height: 1px;
  background: #d1d5db;
`;

export const SmallNote = styled.div`
  font-size: 11px;
  color: #6b7280;
  margin-top: 4px;
`;

export const Row = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 16px;
  margin: 8px 0;
`;

export const Col = styled.div`
  flex: ${(p) => p.flex || 1};
`;

export const ButtonRow = styled.div`
  margin-top: auto;
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 24px;
`;

export const DropZone = styled.div`
  border: 2px dashed #cbd5e1;
  border-radius: 6px;
  padding: 24px;
  text-align: center;
  font-size: 13px;
  color: #6b7280;
  background: ${(p) => (p.drag ? "#f1f5ff" : "#f9fafb")};
  cursor: pointer;
  transition: background 0.15s, border-color 0.15s;
`;

export const DZMain = styled.div`
  margin-bottom: 6px;
`;

export const DZHint = styled.div`
  font-size: 11px;
  color: #9ca3af;
`;

export const CellInner = styled.div`
  position: relative;
  display: flex;
  align-items: center;
  width: 100%;
`; // Removed padding-right: 26px

export const CellInput = styled.input`
  width: 100%;
  font-family: inherit; /* Ensure font matches static text */
  font-size: 13px;
  line-height: inherit; 
  padding: 8px 12px;
  border-radius: 2px;
  border: none;
  background: transparent;
  outline: none;
  color: inherit;
`;

export const CellSelect = styled.select`
  width: 100%;
  font-family: inherit; /* Ensure font matches static text */
  font-size: 13px;
  line-height: inherit;
  padding: 8px 24px 8px 12px;
  border-radius: 2px;
  border: none;
  background: transparent;
  appearance: none;
  outline: none;
  cursor: pointer;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%236b7280'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='m19 9-7 7-7-7'/%3E%3C/svg%3E");
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
  padding: 8px 16px;
  border-radius: 8px;
  border: 1.5px solid #e2e8f0;
  background: #ffffff;
  color: #64748b;
  font-size: 13px;
  cursor: pointer;
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 8px;
  transition: all 0.15s ease;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);

  &:hover {
    background: #f8fafc;
    border-color: #cbd5e1;
    transform: translateY(-1px);
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.08);
    color: #334155;
  }

  ${(p) =>
    p.active &&
    css`
      background: #2563eb;
      color: #ffffff;
      border-color: #2563eb;
      box-shadow: 0 2px 6px rgba(37, 99, 235, 0.25);
      font-weight: 600;
      
      &:hover {
        background: #1d4ed8;
        border-color: #1d4ed8;
        transform: translateY(-1px);
        box-shadow: 0 3px 8px rgba(37, 99, 235, 0.3);
        color: #ffffff;
      }
    `}
`;

export const StatusDot = styled.span`
  width: 9px;
  height: 9px;
  border-radius: 50%;
  display: inline-block;
  background: ${(p) => p.color || "#cbd5e1"};
  box-shadow: 0 0 0 2px ${(p) => (p.color ? `${p.color}20` : "#cbd5e120")};
`;

export const RemoveTabBtn = styled.span`
  margin-left: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 14px;
  height: 14px;
  border-radius: 4px;
  font-size: 10px;
  color: inherit;
  opacity: 0.5;
  transition: all 0.15s ease;
  
  &:hover {
    background: rgba(0, 0, 0, 0.1);
    opacity: 1;
    color: #ef4444;
  }
`;

export const ResetAction = styled.button`
  background: transparent;
  border: 1px solid #cbd5e1;
  color: #64748b;
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  cursor: pointer;
  padding: 3px 8px;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s ease;
  margin-left: 2px;
  
  &:hover {
    color: #334155;
    border-color: #94a3b8;
    background: #f8fafc;
    transform: translateY(-1px);
    box-shadow: 0 1px 2px rgba(0,0,0,0.05);
  }
  
  &:active {
    transform: translateY(0);
  }
`;

export const FixedTableContainer = styled.div`
  flex: 1;
  min-height: 0;
  overflow: auto;
  overflow-x: auto;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  background: #fff;
  
  @media (max-height: 900px) {
    flex: none;
    min-height: 400px;
    height: auto;
    max-height: none;
    overflow-x: auto;
    overflow-y: visible;
    display: block;
  }

  &::-webkit-scrollbar {
    width: 6px;
    height: 6px;
  }
  &::-webkit-scrollbar-track {
    background: #f1f5f9;
  }
  &::-webkit-scrollbar-thumb {
    background: #cbd5e1;
    border-radius: 3px;
  }
`;

export const SourceTag = styled.span`
  position: absolute;
  right: 4px;
  top: 50%;
  transform: translateY(-50%);
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.5px;
  color: #94a3b8;
  
  ${(p) =>
    p.kind === "ai" &&
    css`
      color: #2563eb;
    `}
  ${(p) =>
    p.kind === "user" &&
    css`
      color: #b91c1c;
    `}
`;

export const UserProfile = styled.div`
  position: relative;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 4px 8px;
  border-radius: 8px;
  cursor: pointer;
  transition: background 0.15s;
  background: #f8fafc;
  border: 1px solid #e2e8f0;

  &:hover {
    background: #f1f5f9;
  }
`;

export const UserAvatar = styled.div`
  width: 30px;
  height: 30px;
  border-radius: 50%;
  background: #2563eb;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-weight: 600;
  font-size: 13px;
  overflow: hidden;

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
    color: #1e293b;
    line-height: 1.2;
  }
  
  span:last-child {
    font-size: 11px;
    color: #64748b;
  }
`;

export const DropdownMenu = styled.div`
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  width: 180px;
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
  padding: 6px;
  display: flex;
  flex-direction: column;
  gap: 2px;
  z-index: 1000;
`;

export const DropdownItem = styled.button`
  width: 100%;
  padding: 8px 12px;
  border: none;
  background: transparent;
  text-align: left;
  font-size: 13px;
  color: #1e293b;
  border-radius: 6px;
  cursor: pointer;
  transition: background 0.15s;

  &:hover {
    background: #f1f5f9;
  }

  ${p => p.variant === 'danger' && css`
    color: #ef4444;
    &:hover { background: #fee2e2; }
  `}
`;

export const IconButton = styled.button`
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.15s;
  color: #64748b;

  &:hover {
    background: #f1f5f9;
    color: #1e293b;
    border-color: #cbd5e1;
  }

  ${p => p.variant === 'danger' && css`
    color: #ef4444;
    background: #fef2f2;
    border-color: #fecaca;
    &:hover { background: #fee2e2; }
  `}
`;





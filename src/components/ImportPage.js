import React, {
  useState,
  useMemo,
  useCallback,
  Fragment,
} from "react";
import styled, { createGlobalStyle, css } from "styled-components";

/* ---------- Config / API helpers ---------- */

const API_BASE = "http://localhost:5000/api";
const DEFAULT_TENANT_ID = "demo-tenant";
const DEFAULT_USER_ID = "demo-user";

/**
 * Local default templates.
 * Backend can override these by returning templates.
 */
const TEMPLATES = {
  People: {
    key: "People",
    label: "People (Candidates/Employees)",
    keywords: [
      "firstname",
      "surname",
      "employee",
      "candidate",
      "dob",
      "email",
      "gender",
    ],
    fields: [
      {
        key: "type",
        label: "Type",
        required: true,
        allowed: ["Candidate", "Employee"],
        isPii: false,
      },
      {
        key: "id",
        label: "Candidate/Employee No",
        required: true,
        allowed: null,
        isPii: false,
      },
      {
        key: "title",
        label: "Title",
        required: true,
        allowed: ["Mr", "Ms", "Mrs", "Miss", "Dr"],
        isPii: false,
      },
      {
        key: "firstName",
        label: "First Name",
        required: true,
        allowed: null,
        isPii: false,
      },
      {
        key: "surname",
        label: "Surname",
        required: true,
        allowed: null,
        isPii: false,
      },
      {
        key: "gender",
        label: "Gender",
        required: true,
        allowed: ["M", "F", "Male", "Female", "Other"],
        isPii: false,
      },
      {
        key: "dob",
        label: "DOB",
        required: true,
        allowed: null,
        isPii: false,
      },
      {
        key: "email",
        label: "Email",
        required: true,
        allowed: null,
        isPii: false,
      },
    ],
  },
  Bookings: {
    key: "Bookings",
    label: "Bookings (Assessment Appointments)",
    keywords: [
      "booking",
      "appointment",
      "assessment",
      "date",
      "time",
      "location",
      "clinic",
      "provider",
    ],
    fields: [
      {
        key: "bookingRef",
        label: "Booking Reference",
        required: true,
        allowed: null,
        isPii: false,
      },
      {
        key: "personNumber",
        label: "Candidate/Employee No",
        required: true,
        allowed: null,
        isPii: false,
      },
      {
        key: "assessmentName",
        label: "Assessment Name",
        required: true,
        allowed: null,
        isPii: false,
      },
      {
        key: "assessmentDate",
        label: "Assessment Date",
        required: true,
        allowed: null,
        isPii: false,
      },
      {
        key: "locationName",
        label: "Location",
        required: true,
        allowed: null,
        isPii: false,
      },
      {
        key: "providerName",
        label: "Provider Name",
        required: true,
        allowed: null,
        isPii: false,
      },
      {
        key: "status",
        label: "Booking Status",
        required: false,
        allowed: ["Pending", "Booked", "Completed", "Cancelled"],
        isPii: false,
      },
    ],
  },
  PatientData: {
    key: "PatientData",
    label: "Patient Data",
    keywords: [
      "patient",
      "candidate",
      "employee",
      "assessment",
      "test",
      "block",
      "status",
      "notes",
    ],
    fields: [
      {
        key: "patientId",
        label: "Candidate/Employee No",
        required: true,
        allowed: null,
        isPii: false,
      },
      {
        key: "assessmentName",
        label: "Assessment Name",
        required: true,
        allowed: null,
        isPii: false,
      },
      {
        key: "blockName",
        label: "Block",
        required: false,
        allowed: null,
        isPii: false,
      },
      {
        key: "tests",
        label: "Tests",
        required: true,
        allowed: null,
        isPii: false,
      },
      {
        key: "status",
        label: "Status",
        required: true,
        allowed: ["Pending", "In Progress", "Completed", "Cancelled"],
        isPii: false,
      },
      {
        key: "notes",
        label: "Clinical Notes",
        required: false,
        allowed: null,
        isPii: false,
      },
    ],
  },
};

const TEMPLATE_KEYS = Object.keys(TEMPLATES);
const DEFAULT_TEMPLATE_KEY = "PatientData";

async function apiPost(path, body, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`POST ${path} failed with ${res.status}: ${txt}`);
  }
  return res.json();
}

/* ---------- CSV helpers ---------- */

function splitCsvLine(line) {
  const result = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === "," && !inQuotes) {
      result.push(current);
      current = "";
    } else {
      current += ch;
    }
  }
  result.push(current);
  return result.map((v) => v.trim());
}

function parseCsv(text) {
  if (!text) return { headers: [], rows: [] };
  const lines = text.split(/\r?\n/).filter((l) => l.trim() !== "");
  if (!lines.length) return { headers: [], rows: [] };

  const headers = splitCsvLine(lines[0]);
  const rows = [];

  for (let i = 1; i < lines.length; i++) {
    const cols = splitCsvLine(lines[i]);
    if (cols.length === 1 && cols[0] === "") continue;
    const row = {};
    headers.forEach((h, idx) => {
      row[h] = cols[idx] != null ? cols[idx] : "";
    });
    rows.push(row);
  }

  return { headers, rows };
}

function detectTemplateForHeaders(headers) {
  if (!headers || !headers.length) return DEFAULT_TEMPLATE_KEY;
  const normHeaders = headers.map((h) => (h || "").toLowerCase());
  let bestKey = DEFAULT_TEMPLATE_KEY;
  let bestScore = -Infinity;

  TEMPLATE_KEYS.forEach((key) => {
    const tpl = TEMPLATES[key];
    let score = 0;

    (tpl.keywords || []).forEach((kw) => {
      if (normHeaders.some((h) => h.includes(kw))) score += 2;
    });

    (tpl.fields || []).forEach((f) => {
      const label = (f.label || "").toLowerCase();
      if (normHeaders.some((h) => h.includes(label))) score += 1;
    });

    if (score > bestScore) {
      bestScore = score;
      bestKey = key;
    }
  });

  return bestKey;
}

/* ---------- Global styles ---------- */

const Global = createGlobalStyle`
  * { box-sizing: border-box; }

  body {
    margin: 0;
    background: #f4f6fb;
    font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  }
`;

/* ---------- Layout ---------- */

const Shell = styled.div`
  display: flex;
  height: 100vh;
`;

const SideNav = styled.aside`
  width: 64px;
  background: #14213d;
  color: #fff;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 10px 0;
  gap: 12px;
`;

const NavIcon = styled.div`
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border: 2px solid #47b3ff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  cursor: pointer;
  opacity: ${(p) => (p.active ? 1 : 0.7)};
  transition: background 0.15s, border-color 0.15s, opacity 0.15s, transform 0.1s;

  ${(p) =>
    p.active &&
    css`
      background: #47b3ff;
      border-color: #fff;
      transform: translateY(-1px);
    `}

  &:hover {
    opacity: 1;
  }
`;

const LogoDot = styled.div`
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: #47b3ff;
  margin-top: auto;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
`;

const Main = styled.main`
  flex: 1;
  display: flex;
  flex-direction: column;
`;

const Header = styled.header`
  padding: 16px 24px;
  font-size: 20px;
  font-weight: 600;
  border-bottom: 1px solid #dde3f0;
  background: #fff;
  display: flex;
  align-items: center;
  justify-content: space-between;
`;

const HeaderSub = styled.div`
  font-size: 13px;
  color: #6b7280;
`;

const Content = styled.div`
  flex: 1;
  padding: 24px;
  display: flex;
  flex-direction: column;
  min-height: 0;
`;

const Card = styled.div`
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06);
  padding: 24px 32px;
  display: flex;
  flex-direction: column;
  height: 100%;
`;

/* ---------- Shared UI atoms ---------- */

const ToolHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
  font-weight: 600;
`;

const UploadIcon = styled.span`
  font-size: 20px;
`;

const WizardBar = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  margin: 10px 0 24px;
  font-size: 14px;
  color: #6b7280;
`;

const StepCircle = styled.div`
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

const StepLabel = styled.span``;

const StepLine = styled.div`
  flex: 1;
  height: 1px;
  background: #d1d5db;
`;

const SectionTitle = styled.h3`
  margin: 8px 0 4px;
  font-size: 16px;
  font-weight: 600;
`;

const SmallNote = styled.div`
  font-size: 11px;
  color: #6b7280;
  margin-top: 4px;
`;

const Row = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 16px;
  margin: 8px 0;
`;

const Col = styled.div`
  flex: ${(p) => p.flex || 1};
`;

const ButtonRow = styled.div`
  margin-top: auto;
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 24px;
`;

const Btn = styled.button`
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

const ErrorBanner = styled.div`
  margin-top: 8px;
  padding: 8px 12px;
  border-radius: 6px;
  background: #fef2f2;
  border: 1px solid #fecaca;
  color: #b91c1c;
  font-size: 12px;
`;

const InfoBanner = styled.div`
  margin-top: 8px;
  padding: 8px 12px;
  border-radius: 6px;
  background: #eff6ff;
  border: 1px solid #bfdbfe;
  color: #1d4ed8;
  font-size: 12px;
`;

const PiiTag = styled.span`
  margin-left: 6px;
  padding: 1px 6px;
  border-radius: 999px;
  font-size: 9px;
  font-weight: 500;
  background: #fef3c7;
  color: #92400e;
  text-transform: uppercase;
`;

/* ---------- Upload ---------- */

const DropZone = styled.div`
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

const DZMain = styled.div`
  margin-bottom: 6px;
`;

const DZHint = styled.div`
  font-size: 11px;
  color: #9ca3af;
`;

/* ---------- Table ---------- */

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
  margin-top: 10px;
  font-size: 13px;
  table-layout: fixed;
`;

const Th = styled.th`
  text-align: left;
  padding: 8px;
  border-bottom: 1px solid #e5e7eb;
  background: #f9fafb;
  position: sticky;
  top: 0;
  z-index: 1;
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const Td = styled.td`
  padding: 6px 8px;
  border-bottom: 1px solid #f3f4f6;
  vertical-align: middle;
  background: #fff;
  height: 32px;
  box-sizing: border-box;
`;

const CellInner = styled.div`
  position: relative;
  display: flex;
  align-items: center;
  width: 100%;
  padding-right: 26px;
`;

const CellControl = styled.div`
  flex: 1 1 auto;
  min-width: 0;
`;

const CellPill = styled.div`
  width: 100%;
  padding: 1px;
  border-radius: 3px;
  background: ${(p) =>
    p.status === "ok"
      ? "#f3fbf4"
      : p.status === "warn"
        ? "#fffaf0"
        : p.status === "bad"
          ? "#ffecec"
          : "#ffffff"};
  border: 1px solid
    ${(p) =>
    p.status === "bad"
      ? "#fecaca"
      : p.status === "warn"
        ? "#fde68a"
        : "#d1d5db"};
`;

const CellText = styled.span`
  display: inline-block;
  width: 100%;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  cursor: pointer;
  font-size: 12px;
  padding: 2px 4px;
`;

const CellInput = styled.input`
  width: 100%;
  font-size: 12px;
  padding: 2px 4px;
  border-radius: 2px;
  border: none;
  background: transparent;
  outline: none;
`;

const CellSelect = styled.select`
  width: 100%;
  font-size: 12px;
  padding: 2px 20px 2px 4px;
  border-radius: 2px;
  border: none;
  background: transparent;
  appearance: none;
  outline: none;
  cursor: pointer;
  background-image: linear-gradient(45deg, transparent 50%, #6b7280 50%),
    linear-gradient(135deg, #6b7280 50%, transparent 50%);
  background-position: calc(100% - 11px) 7px, calc(100% - 6px) 7px;
  background-size: 5px 5px, 5px 5px;
  background-repeat: no-repeat;
`;

const MappingTag = styled.span`
  padding: 3px 8px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 500;
  white-space: nowrap;

  ${(p) =>
    p.kind === "direct" &&
    css`
      background: #e7fbe7;
      color: #166534;
    `}
  ${(p) =>
    p.kind === "ai" &&
    css`
      background: #dbeafe;
      color: #1d4ed8;
    `}
  ${(p) =>
    p.kind === "confirm" &&
    css`
      background: #fff8dd;
      color: #854d0e;
    `}
  ${(p) =>
    p.kind === "none" &&
    css`
      background: #fee2e2;
      color: #b91c1c;
    `}
`;

const SourceTag = styled.span`
  position: absolute;
  right: 4px;
  top: 50%;
  transform: translateY(-50%);
  font-size: 9px;
  border-radius: 999px;
  padding: 1px 4px;
  opacity: 0.8;
  white-space: nowrap;

  ${(p) =>
    p.kind === "ai" &&
    css`
      background: #dbeafe;
      color: #1d4ed8;
    `}
  ${(p) =>
    p.kind === "user" &&
    css`
      background: #fee2e2;
      color: #b91c1c;
    `}
`;

/* ---------- Helper ---------- */

function getTagKind(cell) {
  if (!cell) return null;
  if (cell.source !== "ai" && cell.source !== "user") return null;

  const prev = cell.prev;
  const curr = cell.value;

  if (prev === undefined || prev === null) {
    return curr ? cell.source : null;
  }
  if (String(prev) === String(curr)) return null;
  return cell.source;
}

/* ---------- Main component ---------- */

// ... (imports remain)
export default function ImportPage() {
  // ... (rest of the component)

  // Import wizard state
  const [step, setStep] = useState(1);

  const [templatesByKey, setTemplatesByKey] = useState(TEMPLATES);
  const [selectedTemplateKey, setSelectedTemplateKey] = useState(null);

  const tpl =
    selectedTemplateKey && templatesByKey[selectedTemplateKey]
      ? templatesByKey[selectedTemplateKey]
      : null;
  const tplNotEmpty = !!(tpl && tpl.fields && tpl.fields.length);

  const [fileName, setFileName] = useState("");
  const [drag, setDrag] = useState(false);
  const [csvHeaders, setCsvHeaders] = useState([]);
  const [csvRows, setCsvRows] = useState([]);
  const [mapping, setMapping] = useState({});
  const [mappingSrc, setMappingSrc] = useState({});
  const [headerAiBusy, setHeaderAiBusy] = useState(false);
  const [grid, setGrid] = useState([]);
  const [rawRows, setRawRows] = useState([]);
  const [rowErrors, setRowErrors] = useState({});
  const [editing, setEditing] = useState({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [processingSummary, setProcessingSummary] = useState(null);
  const [aiSummary, setAiSummary] = useState({
    totalPromptTokens: 0,
    totalCompletionTokens: 0,
    totalEstimatedCost: 0,
  });

  /* ---------- Derived ---------- */

  // Only required fields must be mapped; optional ones (like Block) can be blank.
  const mappingComplete = useMemo(() => {
    if (!tplNotEmpty || !tpl) return false;

    const requiredFields = (tpl.fields || []).filter((f) => f.required);
    if (!requiredFields.length) return false;

    const headersUsed = requiredFields
      .map((f) => mapping[f.key])
      .filter(Boolean);

    if (headersUsed.length !== requiredFields.length) return false;
    if (!headersUsed.every((h) => csvHeaders.includes(h))) return false;

    return new Set(headersUsed).size === headersUsed.length;
  }, [tplNotEmpty, tpl, mapping, csvHeaders]);

  const headersHaveDup = useMemo(() => {
    if (!tplNotEmpty || !tpl) return false;
    const requiredFields = (tpl.fields || []).filter((f) => f.required);
    const headersUsed = requiredFields
      .map((f) => mapping[f.key])
      .filter(Boolean);
    return (
      headersUsed.length > 0 &&
      new Set(headersUsed).size !== headersUsed.length
    );
  }, [tplNotEmpty, tpl, mapping]);

  const gridHasBad = useMemo(() => {
    if (!tplNotEmpty || !grid.length || !tpl) return false;
    return grid.some((row) =>
      tpl.fields.some((f) => row[f.key]?.status === "bad")
    );
  }, [tplNotEmpty, tpl, grid]);

  const buildGridFromRows = useCallback(
    (rows, backendRowErrors = {}, oldGrid = null, fromAiClean = false) => {
      if (!tpl || !tpl.fields) return [];
      return rows.map((row, i) => {
        const idx = row.__rowIndex ?? i;
        const errorsForRow =
          (backendRowErrors && backendRowErrors[String(idx)]) || [];
        const outRow = { __rowIndex: idx };

        tpl.fields.forEach((f) => {
          const fieldKey = f.key;
          const value =
            row[fieldKey] !== undefined && row[fieldKey] !== null
              ? String(row[fieldKey])
              : "";
          let status = "ok";
          if (f.required && (value === "" || value.trim().length === 0)) {
            status = "bad";
          }
          if (errorsForRow.includes(fieldKey)) {
            status = "bad";
          }

          let source = "csv";
          let prev = null;
          const prevRow = oldGrid && oldGrid[i];
          const prevCell = prevRow && prevRow[fieldKey];

          if (fromAiClean && prevCell) {
            const prevVal =
              prevCell.value !== undefined && prevCell.value !== null
                ? String(prevCell.value)
                : "";
            if (prevCell.source === "user") {
              source = "user";
              prev = prevCell.prev ?? prevVal;
            } else if (prevVal !== value) {
              source = "ai";
              prev = prevVal;
            } else {
              source = prevCell.source || "csv";
              prev = prevCell.prev ?? null;
            }
          } else if (prevCell && prevCell.source === "user") {
            const prevVal =
              prevCell.value !== undefined && prevCell.value !== null
                ? String(prevCell.value)
                : "";
            source = "user";
            prev = prevCell.prev ?? prevVal;
          }

          outRow[fieldKey] = {
            value,
            status,
            source,
            prev,
          };
        });

        return outRow;
      });
    },
    [tpl]
  );

  /* ---------- File handling / upload ---------- */

  const applyServerTemplates = useCallback((serverTemplates) => {
    if (!serverTemplates) return;

    let next = {};

    // If it's already an object keyed by template key
    if (!Array.isArray(serverTemplates) && typeof serverTemplates === "object") {
      Object.entries(serverTemplates).forEach(([key, t]) => {
        if (!t) return;
        const k = t.key || t.templateKey || t.template_key || key;
        if (!k) return;
        next[k] = {
          key: k,
          label: t.label || t.templateLabel || k,
          keywords: t.keywords || [],
          fields: t.fields || t.columns || [],
        };
      });
    } else if (Array.isArray(serverTemplates)) {
      serverTemplates.forEach((t) => {
        if (!t) return;
        const k = t.key || t.templateKey || t.template_key;
        if (!k) return;
        next[k] = {
          key: k,
          label: t.label || t.templateLabel || k,
          keywords: t.keywords || [],
          fields: t.fields || t.columns || [],
        };
      });
    }

    if (Object.keys(next).length) {
      setTemplatesByKey(next);
    }
  }, []);

  const handleFiles = async (fileList) => {
    const file = fileList?.[0];
    if (!file) return;

    setError(null);
    setBusy(true);

    try {
      // Parse CSV on the frontend for rows/headers used later in goToValues.
      const csvText = await file.text();
      const parsed = parseCsv(csvText);
      setCsvHeaders(parsed.headers || []);
      setCsvRows(parsed.rows || []);

      // Upload CSV to backend for parsing + header-mapping
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch(`${API_BASE}/import/upload`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const txt = await res.text();
        console.error("Upload failed:", res.status, txt);
        throw new Error(`Upload failed with status ${res.status}`);
      }

      const contentType = res.headers.get("content-type") || "";
      if (!contentType.includes("application/json")) {
        const txt = await res.text();
        console.error("Upload returned non-JSON:", contentType, txt);
        throw new Error("Upload endpoint did not return JSON.");
      }

      const data = await res.json();
      console.log("Upload response:", data);

      setFileName(file.name);

      // If backend gives canonical headers, prefer them.
      if (Array.isArray(data.headers)) {
        setCsvHeaders(data.headers);
      }

      // If backend sends templates, let that override local defaults.
      applyServerTemplates(
        data.templatesByKey || data.templates || data.TEMPLATES
      );

      // Template detection: prefer backend value, fall back to heuristic.
      const detectedKey =
        data.detected_template ||
        data.templateKey ||
        data.template_key ||
        detectTemplateForHeaders(parsed.headers || []);
      setSelectedTemplateKey(detectedKey);

      // Suggested mapping + sources from backend if present.
      if (data.suggested_mapping) {
        setMapping(data.suggested_mapping);
      } else if (data.mapping) {
        setMapping(data.mapping);
      } else {
        setMapping({});
      }

      if (data.mapping_sources) {
        setMappingSrc(data.mapping_sources);
      } else if (data.mappingSources) {
        setMappingSrc(data.mappingSources);
      } else {
        setMappingSrc({});
      }

      // Reset Step 2+ state
      setGrid([]);
      setRawRows([]);
      setRowErrors({});
      setProcessingSummary(null);
      setAiSummary({
        totalPromptTokens: 0,
        totalCompletionTokens: 0,
        totalEstimatedCost: 0,
      });

      // Move to mapping step
      setStep(2);
    } catch (e) {
      console.error("handleFiles error:", e);
      const msg =
        e && e.message && e.message.includes("did not return JSON")
          ? e.message
          : "Failed to upload CSV or build header mappings. Check /api/import/upload.";
      setError(msg);
    } finally {
      setBusy(false);
    }
  };

  const onDrop = (e) => {
    e.preventDefault();
    setDrag(false);
    handleFiles(e.dataTransfer.files);
  };

  const goToValues = async () => {
    if (!tplNotEmpty || !tpl || !csvHeaders.length || !csvRows.length) return;
    setBusy(true);
    setError(null);

    try {
      const tplFields = tpl.fields || [];
      const rows = csvRows.map((csvRow, idx) => {
        const row = { __rowIndex: idx };
        tplFields.forEach((f) => {
          const header = mapping[f.key];
          if (
            header &&
            Object.prototype.hasOwnProperty.call(csvRow, header)
          ) {
            row[f.key] = csvRow[header];
          } else {
            row[f.key] = "";
          }
        });

        // Default Block to "Block1" if empty and field exists
        const blockField = tplFields.find((f) => f.key === "blockName");
        if (blockField && !row.blockName) {
          row.blockName = "Block1";
        }

        return row;
      });

      setRawRows(rows);

      const data = await apiPost("/import/ai/clean", {
        tenantId: DEFAULT_TENANT_ID,
        userId: DEFAULT_USER_ID,
        templateKey: tpl.key,
        rows,
        useAi: false,
      });

      console.log("ai/clean (validate) response:", data);

      const cleaned =
        data.outputRows ||
        data.rows ||
        data.cleanedRows ||
        data.output_rows ||
        [];
      const backendRowErrors =
        data.rowErrors ||
        data.row_errors ||
        data.errorsByRow ||
        data.errors_by_row ||
        {};
      const aiUsage = data.aiUsage || data.ai_usage || null;

      setRawRows(cleaned);
      setRowErrors(backendRowErrors);

      const newGrid = buildGridFromRows(
        cleaned,
        backendRowErrors,
        null,
        false
      );
      setGrid(newGrid);

      if (aiUsage) {
        setAiSummary((prev) => ({
          totalPromptTokens:
            (prev.totalPromptTokens || 0) +
            (aiUsage.promptTokens ||
              aiUsage.prompt_tokens ||
              aiUsage.totalPromptTokens ||
              0),
          totalCompletionTokens:
            (prev.totalCompletionTokens || 0) +
            (aiUsage.completionTokens ||
              aiUsage.completion_tokens ||
              aiUsage.totalCompletionTokens ||
              0),
          totalEstimatedCost:
            (prev.totalEstimatedCost || 0) +
            (aiUsage.estimatedCost ||
              aiUsage.estimated_cost ||
              aiUsage.totalEstimatedCost ||
              0),
        }));
      }

      setStep(3);
    } catch (e) {
      console.error(e);
      setError(
        "Failed to build preview grid. Check mapping and /api/import/ai/clean implementation."
      );
    } finally {
      setBusy(false);
    }
  };

  const aiCleanAll = async () => {
    if (!tplNotEmpty || !tpl || !rawRows.length) return;
    setBusy(true);
    setError(null);

    try {
      const data = await apiPost("/import/ai/clean", {
        tenantId: DEFAULT_TENANT_ID,
        userId: DEFAULT_USER_ID,
        templateKey: tpl.key,
        rows: rawRows,
        useAi: true,
      });

      console.log("ai/clean (AI) response:", data);

      const cleaned =
        data.outputRows ||
        data.rows ||
        data.cleanedRows ||
        data.output_rows ||
        [];
      const backendRowErrors =
        data.rowErrors ||
        data.row_errors ||
        data.errorsByRow ||
        data.errors_by_row ||
        {};
      const aiUsage = data.aiUsage || data.ai_usage || null;

      setRawRows(cleaned);
      setRowErrors(backendRowErrors);

      const newGrid = buildGridFromRows(
        cleaned,
        backendRowErrors,
        grid,
        true
      );
      setGrid(newGrid);

      if (aiUsage) {
        setAiSummary((prev) => ({
          totalPromptTokens:
            (prev.totalPromptTokens || 0) +
            (aiUsage.promptTokens ||
              aiUsage.prompt_tokens ||
              aiUsage.totalPromptTokens ||
              0),
          totalCompletionTokens:
            (prev.totalCompletionTokens || 0) +
            (aiUsage.completionTokens ||
              aiUsage.completion_tokens ||
              aiUsage.totalCompletionTokens ||
              0),
          totalEstimatedCost:
            (prev.totalEstimatedCost || 0) +
            (aiUsage.estimatedCost ||
              aiUsage.estimated_cost ||
              aiUsage.totalEstimatedCost ||
              0),
        }));
      }
    } catch (e) {
      console.error(e);
      setError(
        "AI clean failed. Ensure /api/import/ai/clean is wired to the backend logic."
      );
    } finally {
      setBusy(false);
    }
  };

  // NOTE: no DB /import/jobs call anymore — we just compute a local summary
  const confirmImport = () => {
    if (!tplNotEmpty || !tpl || !rawRows.length) return;
    setError(null);

    const totalRows = rawRows.length;

    // Rough summary for the UI — all rows "imported"
    let aiCells = 0;
    let userCells = 0;

    if (grid.length && tpl && tpl.fields) {
      grid.forEach((row) => {
        tpl.fields.forEach((f) => {
          const cell = row[f.key];
          const tagKind = getTagKind(cell);
          if (tagKind === "ai") aiCells += 1;
          else if (tagKind === "user") userCells += 1;
        });
      });
    }

    const summary = {
      templateLabel: tpl.label,
      totalRows,
      created: totalRows,
      updated: 0,
      failed: 0,
      aiCells,
      userCells,
      aiTokens: aiSummary.totalPromptTokens || 0,
      aiEstimatedCost: aiSummary.totalEstimatedCost || 0,
    };

    setProcessingSummary(summary);
    setStep(4);
  };

  /* ---------- Grid editing ---------- */

  const cellKey = (rowIndex, fieldKey) => `${rowIndex}-${fieldKey}`;

  const startEdit = (rowIndex, fieldKey) => {
    const id = cellKey(rowIndex, fieldKey);
    const cell = grid[rowIndex]?.[fieldKey];
    const currentValue = cell ? cell.value : "";
    setEditing((e) => ({ ...e, [id]: currentValue }));
  };

  const updateEdit = (rowIndex, fieldKey, newVal) => {
    const id = cellKey(rowIndex, fieldKey);
    setEditing((e) => ({ ...e, [id]: newVal }));
  };

  const applyCellUpdate = (rowIndex, fieldKey, rawVal) => {
    if (!tpl) return;

    const newGrid = [...grid];
    const oldRow = newGrid[rowIndex] || {};
    const oldCell =
      oldRow[fieldKey] || {
        value: "",
        status: "bad",
        source: "csv",
        prev: null,
      };

    const value = rawVal == null ? "" : String(rawVal);
    const required = tpl.fields.find((f) => f.key === fieldKey)?.required;
    const status = required && !value.trim() ? "bad" : "ok";

    const updatedCell = {
      ...oldCell,
      value,
      status,
      source: "user",
      prev: oldCell.prev ?? oldCell.value ?? "",
    };

    newGrid[rowIndex] = { ...oldRow, [fieldKey]: updatedCell };
    setGrid(newGrid);

    setRawRows((prevRows) => {
      const copy = [...prevRows];
      if (!copy[rowIndex]) {
        copy[rowIndex] = { __rowIndex: rowIndex };
      }
      copy[rowIndex] = {
        ...copy[rowIndex],
        [fieldKey]: value,
      };
      return copy;
    });
  };

  const commitEdit = (rowIndex, fieldKey) => {
    const id = cellKey(rowIndex, fieldKey);
    const newVal =
      editing[id] !== undefined
        ? editing[id]
        : grid[rowIndex]?.[fieldKey]?.value || "";
    applyCellUpdate(rowIndex, fieldKey, newVal);
    setEditing((prev) => {
      const copy = { ...prev };
      delete copy[id];
      return copy;
    });
  };

  /* ---------- AI header mapping ---------- */

  const handleAiMapHeaders = async () => {
    if (!tplNotEmpty || !tpl || !csvHeaders.length) return;

    setError(null);
    setHeaderAiBusy(true);

    try {
      // Flatten current mapping into the shape the backend expects
      const currentMapping = (tpl.fields || []).map((f) => ({
        templateKey: f.key,
        matchedHeader: mapping[f.key] || null,
      }));

      const data = await apiPost("/import/ai/header-mapping", {
        tenantId: DEFAULT_TENANT_ID,
        userId: DEFAULT_USER_ID,
        templateKey: tpl.key,
        uploadedHeaders: csvHeaders,
        currentMapping,
      });

      const nextMapping = { ...mapping };
      const nextSrc = { ...mappingSrc };

      // Shape 1: { mappings: [{ templateKey, matchedHeader, ... }] }
      if (Array.isArray(data.mappings)) {
        data.mappings.forEach((m) => {
          if (!m || !m.templateKey || !m.matchedHeader) return;
          nextMapping[m.templateKey] = m.matchedHeader;
          nextSrc[m.templateKey] = "ai";
        });
      }

      // Shape 2: { mapping: { fieldKey: header, ... } }
      if (data.mapping && typeof data.mapping === "object") {
        Object.entries(data.mapping).forEach(([fieldKey, header]) => {
          if (!header) return;
          nextMapping[fieldKey] = header;
          nextSrc[fieldKey] = "ai";
        });
      }

      setMapping(nextMapping);
      setMappingSrc(nextSrc);

      if (data.aiUsage || data.ai_usage) {
        const aiUsage = data.aiUsage || data.ai_usage;
        setAiSummary((prev) => ({
          totalPromptTokens:
            (prev.totalPromptTokens || 0) +
            (aiUsage.promptTokens ||
              aiUsage.prompt_tokens ||
              aiUsage.totalPromptTokens ||
              0),
          totalCompletionTokens:
            (prev.totalCompletionTokens || 0) +
            (aiUsage.completionTokens ||
              aiUsage.completion_tokens ||
              aiUsage.totalCompletionTokens ||
              0),
          totalEstimatedCost:
            (prev.totalEstimatedCost || 0) +
            (aiUsage.estimatedCost ||
              aiUsage.estimated_cost ||
              aiUsage.totalEstimatedCost ||
              0),
        }));
      }
    } catch (e) {
      console.error(e);
      setError(
        "AI header mapping failed. Check /api/import/ai/header-mapping on the backend."
      );
    } finally {
      setHeaderAiBusy(false);
    }
  };

  /* ---------- Template selector banner ---------- */

  const TemplateBanner = () =>
    tplNotEmpty && tpl ? (
      <div
        style={{
          padding: "10px 14px",
          background: "#eef6ff",
          border: "1px solid #c7e2ff",
          borderRadius: 6,
          marginBottom: 16,
          fontSize: 13,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <span>
          Detected template: <b>{tpl.label}</b>
        </span>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <select
            value={selectedTemplateKey || ""}
            onChange={(e) => {
              const newKey = e.target.value;
              const t = templatesByKey[newKey];
              setSelectedTemplateKey(newKey);
              if (!t) return;
              // Reset mapping + downstream state when template changes
              setMapping({});
              setMappingSrc({});
              setGrid([]);
              setRawRows([]);
              setRowErrors({});
              setAiSummary({
                totalPromptTokens: 0,
                totalCompletionTokens: 0,
                totalEstimatedCost: 0,
              });
            }}
            style={{ padding: "4px 8px", fontSize: 13, borderRadius: 4 }}
          >
            <option value="" disabled>
              Select template…
            </option>
            {Object.values(templatesByKey).map((t) => (
              <option key={t.key} value={t.key}>
                {t.label}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={handleAiMapHeaders}
            disabled={headerAiBusy || !csvHeaders.length}
            style={{
              padding: "4px 10px",
              fontSize: 12,
              borderRadius: 4,
              border: "1px solid #3b82f6",
              background: headerAiBusy ? "#bfdbfe" : "#3b82f6",
              color: "#fff",
              cursor:
                headerAiBusy || !csvHeaders.length ? "default" : "pointer",
              opacity: headerAiBusy || !csvHeaders.length ? 0.7 : 1,
              whiteSpace: "nowrap",
            }}
          >
            {headerAiBusy ? "Mapping..." : "AI Map headers"}
          </button>
        </div>
      </div>
    ) : null;

  /* ---------- Import steps ---------- */

  const step1 = (
    <Card>
      <ToolHeader>
        <UploadIcon>⤴</UploadIcon>
        Data Import Tool
      </ToolHeader>

      <WizardBar>
        <StepCircle active>1</StepCircle>
        <StepLabel>Select File</StepLabel>
        <StepLine />
        <StepCircle>2</StepCircle>
        <StepLabel>Validate</StepLabel>
        <StepLine />
        <StepCircle>3</StepCircle>
        <StepLabel>Confirm</StepLabel>
        <StepLine />
        <StepCircle>4</StepCircle>
        <StepLabel>Process</StepLabel>
      </WizardBar>

      <SectionTitle>Upload CSV File</SectionTitle>
      <SmallNote>
        We’ll detect the most likely template and mark PII for safe downstream
        processing.
      </SmallNote>

      <DropZone
        drag={drag}
        onDragOver={(e) => {
          e.preventDefault();
          setDrag(true);
        }}
        onDragLeave={() => setDrag(false)}
        onDrop={onDrop}
        onClick={() => document.getElementById("fileInput")?.click()}
      >
        <DZMain>
          Drag &amp; drop a CSV file here, or <b>click to select</b>.
        </DZMain>
        <DZHint>Any CSV with headers is fine.</DZHint>
        {fileName && (
          <SmallNote>
            Selected: <b>{fileName}</b>
          </SmallNote>
        )}
      </DropZone>

      <input
        id="fileInput"
        type="file"
        accept=".csv"
        style={{ display: "none" }}
        onChange={(e) => {
          const files = e.target.files;
          if (!files || !files.length) return;
          handleFiles(files);
          e.target.value = "";
        }}
      />

      {error && <ErrorBanner>{error}</ErrorBanner>}

      <ButtonRow>
        <Btn
          variant="secondary"
          onClick={() => {
            window.location.reload();
          }}
        >
          Cancel
        </Btn>
        <Btn
          variant="primary"
          disabled={!csvHeaders.length || busy}
          onClick={() => setStep(2)}
        >
          {busy ? "Uploading..." : "Next"}
        </Btn>
      </ButtonRow>
    </Card>
  );

  const step2 = (
    <Card>
      <ToolHeader>
        <UploadIcon>⤴</UploadIcon>
        Data Import Tool
      </ToolHeader>

      <WizardBar>
        <StepCircle done>1</StepCircle>
        <StepLabel>Select File</StepLabel>
        <StepLine />
        <StepCircle active>2</StepCircle>
        <StepLabel>Validate</StepLabel>
        <StepLine />
        <StepCircle>3</StepCircle>
        <StepLabel>Confirm</StepLabel>
        <StepLine />
        <StepCircle>4</StepCircle>
        <StepLabel>Process</StepLabel>
      </WizardBar>

      <SectionTitle>Validate Headers</SectionTitle>
      {tplNotEmpty && tpl && <TemplateBanner />}

      {!csvHeaders.length && (
        <SmallNote>No CSV loaded. Go back and upload a file.</SmallNote>
      )}

      {csvHeaders.length > 0 && tpl && tpl.fields?.length > 0 && (
        <Fragment>
          <SmallNote>
            Green = exact match, yellow = manual/AI, red = not mapped. Each CSV
            column can only be used once. Optional fields (like Block) can stay
            unmapped.
          </SmallNote>
          <Table>
            <thead>
              <tr>
                <Th style={{ width: "35%" }}>Expected Header</Th>
                <Th style={{ width: "35%" }}>Uploaded Header</Th>
                <Th>Mapping Status</Th>
              </tr>
            </thead>
            <tbody>
              {tpl.fields.map((f) => {
                const selected = mapping[f.key] || "";
                const src = mappingSrc[f.key] || "none";

                let kind = "none";
                let label = "Not mapped";

                if (selected) {
                  if (src === "direct") {
                    kind = "direct";
                    label = "Exact match";
                  } else if (src === "ai") {
                    kind = "ai";
                    label = "AI match – review";
                  } else {
                    kind = "confirm";
                    label = "Mapped – review";
                  }
                } else if (!f.required) {
                  kind = "confirm";
                  label = "Optional – not mapped";
                }

                return (
                  <tr key={f.key}>
                    <Td>
                      {f.label}
                      {f.required ? " *" : ""}
                      {f.isPii && <PiiTag>PII</PiiTag>}
                    </Td>
                    <Td>
                      <CellPill status={selected || !f.required ? "ok" : "bad"}>
                        <CellSelect
                          value={selected}
                          onChange={(e) => {
                            const v = e.target.value;
                            setMapping((m) => ({ ...m, [f.key]: v }));
                            setMappingSrc((s) => ({
                              ...s,
                              [f.key]: v ? "manual" : "none",
                            }));
                          }}
                        >
                          <option value="">
                            {f.required ? "(not mapped)" : "(optional)"}
                          </option>
                          {csvHeaders.map((h) => {
                            const inUse = Object.entries(mapping).some(
                              ([k, v]) => k !== f.key && v === h
                            );
                            return (
                              <option key={h} value={h} disabled={inUse}>
                                {h}
                                {inUse ? " (in use)" : ""}
                              </option>
                            );
                          })}
                        </CellSelect>
                      </CellPill>
                    </Td>
                    <Td>
                      <MappingTag kind={kind}>{label}</MappingTag>
                    </Td>
                  </tr>
                );
              })}
            </tbody>
          </Table>

          {headersHaveDup && (
            <SmallNote style={{ color: "#b91c1c", marginTop: 6 }}>
              Duplicate column usage — each CSV column can only be mapped once
              for required fields.
            </SmallNote>
          )}
        </Fragment>
      )}

      {error && <ErrorBanner>{error}</ErrorBanner>}

      <ButtonRow>
        <Btn variant="secondary" onClick={() => setStep(1)}>
          Back
        </Btn>
        <Btn
          variant="primary"
          disabled={!mappingComplete || !csvHeaders.length || busy}
          onClick={goToValues}
        >
          {busy ? "Building preview..." : "Next"}
        </Btn>
      </ButtonRow>
    </Card>
  );

  const step3 = (
    <div
      style={{
        flex: 1,
        minHeight: 0,
        display: "flex",
        flexDirection: "column",
      }}
    >
      <Card style={{ flex: 1, minHeight: 0, overflow: "hidden" }}>
        <ToolHeader>
          <UploadIcon>⤴</UploadIcon>
          Data Import Tool
        </ToolHeader>

        <WizardBar>
          <StepCircle done>1</StepCircle>
          <StepLabel>Select File</StepLabel>
          <StepLine />
          <StepCircle done>2</StepCircle>
          <StepLabel>Validate</StepLabel>
          <StepLine />
          <StepCircle active>3</StepCircle>
          <StepLabel>Confirm</StepLabel>
          <StepLine />
          <StepCircle>4</StepCircle>
          <StepLabel>Process</StepLabel>
        </WizardBar>

        <SectionTitle>Confirm Values</SectionTitle>
        <SmallNote>
          Green = valid, yellow = borderline, red = invalid. AI changes are
          tagged “AI”; manual edits are tagged “✎”. All heavy lifting (PII,
          validation rules, GPT) happens server-side.
        </SmallNote>

        <Row
          style={{
            justifyContent: "space-between",
            marginTop: 8,
            alignItems: "center",
            height: 36,
          }}
        >
          <SmallNote
            style={{
              maxWidth: "60%",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {gridHasBad
              ? "Some values are still invalid. Fix manually or run AI Clean."
              : "All fields pass validation according to the backend rules."}
          </SmallNote>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {(aiSummary.totalPromptTokens > 0 ||
              aiSummary.totalEstimatedCost > 0) && (
                <SmallNote style={{ marginTop: 0 }}>
                  AI usage: {aiSummary.totalPromptTokens} tokens (~$
                  {aiSummary.totalEstimatedCost.toFixed(4)})
                </SmallNote>
              )}
            <Btn
              variant="secondary"
              disabled={busy || !grid.length}
              onClick={aiCleanAll}
            >
              {busy ? "Cleaning..." : "✨ AI Clean All"}
            </Btn>
          </div>
        </Row>

        <div
          style={{
            border: "1px solid #e5e7eb",
            borderRadius: 6,
            marginTop: 12,
            flex: 1,
            minHeight: 0,
            overflowY: "auto",
            overflowX: "hidden",
            scrollbarGutter: "stable",
          }}
        >
          {tpl && tpl.fields && grid.length > 0 ? (
            <Table>
              <thead>
                <tr>
                  <Th style={{ width: 40 }}>#</Th>
                  {tpl.fields.map((f) => (
                    <Th key={f.key}>
                      {f.label}
                      {f.required ? " *" : ""}
                      {f.isPii && <PiiTag>PII</PiiTag>}
                    </Th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {grid.map((row, i) => (
                  <tr key={i}>
                    <Td>{i + 1}</Td>
                    {tpl.fields.map((f) => {
                      const cell =
                        row[f.key] || {
                          value: "",
                          status: "bad",
                          source: "csv",
                          prev: null,
                        };

                      const status = cell.status || "ok";
                      const id = `${i}-${f.key}`;
                      const isEditing = Object.prototype.hasOwnProperty.call(
                        editing,
                        id
                      );
                      const title =
                        cell.source === "ai" && cell.prev !== undefined
                          ? `Original: ${cell.prev || "(blank)"}`
                          : undefined;

                      const isEnum =
                        Array.isArray(f.allowed) && f.allowed.length > 0;

                      return (
                        <Td key={f.key}>
                          <CellInner>
                            <CellControl>
                              <CellPill status={status}>
                                {isEnum ? (
                                  isEditing ? (
                                    <CellSelect
                                      value={editing[id]}
                                      onChange={(e) => {
                                        const value = e.target.value;
                                        updateEdit(i, f.key, value);
                                        applyCellUpdate(i, f.key, value);
                                      }}
                                      onBlur={() => commitEdit(i, f.key)}
                                    >
                                      <option value="">(blank)</option>
                                      {f.allowed.map((opt) => (
                                        <option key={opt} value={opt}>
                                          {opt}
                                        </option>
                                      ))}
                                    </CellSelect>
                                  ) : (
                                    <CellText
                                      onClick={() => startEdit(i, f.key)}
                                    >
                                      {cell.value || <em>(blank)</em>}
                                    </CellText>
                                  )
                                ) : isEditing ? (
                                  <CellInput
                                    value={editing[id]}
                                    onChange={(e) =>
                                      updateEdit(i, f.key, e.target.value)
                                    }
                                    onBlur={() => commitEdit(i, f.key)}
                                    onKeyDown={(e) =>
                                      e.key === "Enter" && commitEdit(i, f.key)
                                    }
                                    autoFocus
                                  />
                                ) : (
                                  <CellText
                                    onClick={() => startEdit(i, f.key)}
                                  >
                                    {cell.value || <em>(blank)</em>}
                                  </CellText>
                                )}
                              </CellPill>
                            </CellControl>

                            {!isEditing &&
                              (() => {
                                const tagKind = getTagKind(cell);
                                if (!tagKind) return null;
                                return (
                                  <SourceTag kind={tagKind} title={title}>
                                    {tagKind === "ai" ? "AI" : "✎"}
                                  </SourceTag>
                                );
                              })()}
                          </CellInner>
                        </Td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </Table>
          ) : (
            <SmallNote style={{ padding: 12 }}>
              No preview grid available yet. Go back and confirm your header
              mappings.
            </SmallNote>
          )}
        </div>

        {error && <ErrorBanner>{error}</ErrorBanner>}

        <ButtonRow>
          <Btn variant="secondary" onClick={() => setStep(2)}>
            Back
          </Btn>
          <Btn
            variant="primary"
            disabled={!grid.length || busy || gridHasBad}
            onClick={confirmImport}
          >
            {busy ? "Submitting." : "Confirm Import"}
          </Btn>
        </ButtonRow>
      </Card>
    </div>
  );

  const step4 = (
    <Card>
      <ToolHeader>
        <UploadIcon>⤴</UploadIcon>
        Data Import Tool
      </ToolHeader>

      <WizardBar>
        <StepCircle done>1</StepCircle>
        <StepLabel>Select File</StepLabel>
        <StepLine />
        <StepCircle done>2</StepCircle>
        <StepLabel>Validate</StepLabel>
        <StepLine />
        <StepCircle done>3</StepCircle>
        <StepLabel>Confirm</StepLabel>
        <StepLine />
        <StepCircle active>4</StepCircle>
        <StepLabel>Process</StepLabel>
      </WizardBar>

      <SectionTitle>Import Complete</SectionTitle>
      <SmallNote>
        All rows have been validated and imported successfully based on the
        current template and rules.
      </SmallNote>

      <Row style={{ marginTop: 12 }}>
        <Col flex={1.1}>
          <div
            style={{
              border: "1px solid #e5e7eb",
              borderRadius: 6,
              padding: "10px 14px",
              background: "#f9fafb",
              fontSize: 12,
            }}
          >
            {processingSummary ? (
              <>
                <div style={{ marginBottom: 6 }}>
                  <b>Template:</b>{" "}
                  {processingSummary.templateLabel ||
                    processingSummary.template ||
                    "-"}
                </div>
                <div>
                  <b>Total rows:</b>{" "}
                  {processingSummary.totalRows ??
                    processingSummary.rows ??
                    0}
                </div>
                <div>
                  <b>Created:</b>{" "}
                  {processingSummary.created ??
                    processingSummary.inserted ??
                    processingSummary.totalRows ??
                    0}
                </div>
                <div>
                  <b>Updated (duplicate keys):</b>{" "}
                  {processingSummary.updated ?? 0}
                </div>
                <div>
                  <b>Failed / not imported:</b>{" "}
                  {processingSummary.failed ??
                    processingSummary.errors ??
                    0}
                </div>
                <div style={{ marginTop: 6 }}>
                  <b>AI-adjusted cells:</b>{" "}
                  {processingSummary.aiCells ?? 0} |{" "}
                  <b>User-edited cells:</b>{" "}
                  {processingSummary.userCells ?? 0}
                </div>

                {processingSummary.duplicateKeys?.length > 0 && (
                  <div style={{ marginTop: 8 }}>
                    <b>Duplicate keys detected:</b>{" "}
                    {processingSummary.duplicateKeys.join(", ")}
                  </div>
                )}

                {processingSummary.inferredIds?.length > 0 && (
                  <div style={{ marginTop: 4 }}>
                    <b>Inferred numeric IDs:</b>{" "}
                    {processingSummary.inferredIds.join(", ")}
                  </div>
                )}

                {(processingSummary.aiTokens != null ||
                  processingSummary.aiEstimatedCost != null) && (
                    <div style={{ marginTop: 6 }}>
                      <b>AI tokens (job):</b>{" "}
                      {processingSummary.aiTokens ?? 0} |{" "}
                      <b>Est. cost:</b> $
                      {(
                        processingSummary.aiEstimatedCost ?? 0
                      ).toFixed(4)}
                    </div>
                  )}
              </>
            ) : (
              <div style={{ fontSize: 12 }}>
                All rows have been processed successfully.
              </div>
            )}
          </div>
        </Col>
      </Row>

      {error && <ErrorBanner>{error}</ErrorBanner>}

      <ButtonRow>
        <Btn variant="secondary" onClick={() => setStep(3)}>
          Back
        </Btn>
        <Btn
          variant="primary"
          onClick={() => {
            setStep(1);
            setGrid([]);
            setCsvHeaders([]);
            setCsvRows([]);
            setRawRows([]);
            setRowErrors({});
            setMapping({});
            setMappingSrc({});
            setSelectedTemplateKey(null);
            setProcessingSummary(null);
            setFileName("");
            setTemplatesByKey(TEMPLATES);
            setAiSummary({
              totalPromptTokens: 0,
              totalCompletionTokens: 0,
              totalEstimatedCost: 0,
            });
          }}
        >
          Done
        </Btn>
      </ButtonRow>
    </Card>
  );

  const importView =
    step === 1 ? step1 : step === 2 ? step2 : step === 3 ? step3 : step4;

  const headerSubtitle =
    "CSV import with AI-assisted normalisation and strict PII controls.";

  return (
    <>
      <Global />
      <Shell>
        <SideNav>
          <NavIcon active title="Import">
            ⇪
          </NavIcon>
          <LogoDot>A</LogoDot>
        </SideNav>
        <Main>
          <Header>
            <div>Admin Centre</div>
            <HeaderSub>{headerSubtitle}</HeaderSub>
          </Header>
          <Content>{importView}</Content>
        </Main>
      </Shell>
    </>
  );
};
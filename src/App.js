import React, { useState, useMemo, useCallback, Fragment, useRef, useEffect } from "react";
import ReactDOM from "react-dom";
import styled, { createGlobalStyle, css } from "styled-components";
import SearchDashboard from "./components/SearchDashboard";
import TemplateBuilder from "./components/TemplateBuilder";
import Spinner from "./components/Spinner";
import Step1Upload from "./components/wizard/Step1Upload";
import Step2Map from "./components/wizard/Step2Map";
import Step3Preview from "./components/wizard/Step3Preview";
import Step4Process from "./components/wizard/Step4Process";
import { getTagKind, emptyAiSummary } from "./utils/helpers";

/* ---------- Config / API helpers ---------- */

import { API_BASE, DEFAULT_USER_ID } from "./config";
import {
  Btn,
  Card,
  SectionTitle,
  Table,
  Th,
  Td,
  StatusBadge,
  ErrorBanner,
  PiiTag,
  CellPill,
  CellText,
  CellInput,
  CellSelect,
  ToolHeader,
  UploadIcon,
  WizardBar,
  StepCircle,
  StepLabel,
  StepLine,
  SmallNote,
  Row,
  Col,
  ButtonRow,
  DropZone,
  DZMain,
  DZHint,
  CellInner,
  CellControl,
  TemplateTabBtn,
  StatusDot,
  RemoveTabBtn,
  ResetAction,
  Main,
  Header,
  HeaderSub,
  Content,
  LogoDot,
  TooltipContainer,
  TooltipCard,
  TooltipHeader,
  TooltipBody,
  TooltipSection,
  TooltipLabel,
  CodeBadge,
  FixedTableContainer,
  SourceTag,
  UserProfile,
  UserAvatar,
  ProfileInfo,
  DropdownMenu,
  DropdownItem,
  IconButton
} from "./styles";
import TenantSelector from "./components/TenantSelector";
import SavedDataViewer from "./components/SavedDataViewer";
import JobHistory from "./components/JobHistory";
import WebhookSettings from "./components/WebhookSettings";
import ApiKeys from "./components/ApiKeys";
import AuditLogs from "./components/AuditLogs";
import UserManagement from "./components/UserManagement";
import ApiDocs from "./components/ApiDocs";
import GraphQLPlayground from "./components/GraphQLPlayground";

import { UserProvider, useUser } from "./components/UserContext";
import RoleGate from "./components/RoleGate";

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
      { key: "type", label: "Type", required: true, allowed: ["Candidate", "Employee"], isPii: false },
      { key: "id", label: "Candidate/Employee No", required: true, allowed: null, isPii: true, identifier: true },
      { key: "title", label: "Title", required: true, allowed: ["Mr", "Ms", "Mrs", "Miss", "Dr"], isPii: false },
      { key: "firstName", label: "First Name", required: true, allowed: null, isPii: false },
      { key: "surname", label: "Surname", required: true, allowed: null, isPii: false },
      { key: "gender", label: "Gender", required: true, allowed: ["M", "F", "Male", "Female", "Other"], isPii: false },
      { key: "dob", label: "DOB", required: true, allowed: null, isPii: false },
      { key: "email", label: "Email", required: true, allowed: null, isPii: false },
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
      { key: "bookingRef", label: "Booking Reference", required: true, allowed: null, isPii: false, identifier: true },
      { key: "personNumber", label: "Candidate/Employee No", required: true, allowed: null, isPii: true, identifier: true },
      { key: "assessmentName", label: "Assessment Name", required: true, allowed: null, isPii: false },
      { key: "assessmentDate", label: "Assessment Date", required: true, allowed: null, isPii: false },
      { key: "locationName", label: "Location", required: true, allowed: null, isPii: false },
      { key: "providerName", label: "Provider Name", required: true, allowed: null, isPii: false },
      { key: "status", label: "Booking Status", required: false, allowed: ["Pending", "Booked", "Completed", "Cancelled"], isPii: false },
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
      { key: "patientId", label: "Candidate/Employee No", required: true, allowed: null, isPii: true, identifier: true },
      { key: "assessmentName", label: "Assessment Name", required: true, allowed: null, isPii: false },
      { key: "blockName", label: "Block", required: false, allowed: null, isPii: false },
      { key: "tests", label: "Tests", required: true, allowed: null, isPii: false },
      { key: "status", label: "Status", required: true, allowed: ["Pending", "In Progress", "Completed", "Cancelled"], isPii: false },
      { key: "notes", label: "Clinical Notes", required: false, allowed: null, isPii: false },
    ],
  },
};

const TEMPLATE_KEYS = Object.keys(TEMPLATES);
const DEFAULT_TEMPLATE_KEY = "PatientData";



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
      } else if (inQuotes && line[i + 1] === ",") {
        inQuotes = false;
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
  if (!headers.length) return { headers: [], rows: [] };

  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = splitCsvLine(lines[i]);
    if (cols.every((col) => col === "")) continue;

    const row = {};
    headers.forEach((h, idx) => {
      row[h] = idx < cols.length && cols[idx] != null ? cols[idx] : "";
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
  
  @keyframes pulse {
    0% { transform: scale(1); opacity: 1; }
    50% { transform: scale(1.2); opacity: 0.7; }
    100% { transform: scale(1); opacity: 1; }
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













































const Portal = ({ children }) => {
  return ReactDOM.createPortal(children, document.body);
};







/* ---------- Main component ---------- */

export default function App() {
  const { user, loading, logout, isAdmin, isEditor, isViewer, getRoleForTenant, authFetch } = useUser();
  // Tenant state
  const [selectedTenantId, setSelectedTenantId] = useState("acme-corp");
  const [tenants, setTenants] = useState([]);
  const [jobHistory, setJobHistory] = useState([]);
  const [isTenantLoading, setIsTenantLoading] = useState(false);
  const [currentTab, setCurrentTab] = useState("history");
  const [profileOpen, setProfileOpen] = useState(false);

  // These are used for Step 3, they will be initialized based on selectedTemplateKey
  const [grid, setGrid] = useState([]);
  const [rawRows, setRawRows] = useState([]);
  const [rowErrors, setRowErrors] = useState({});
  const [editing, setEditing] = useState({});
  const [previewPage, setPreviewPage] = useState(1);
  const [step, setStep] = useState(1);
  const [busy, setBusy] = useState(false);
  const [headerAiBusy, setHeaderAiBusy] = useState(false);
  const [aiDetectBusy, setAiDetectBusy] = useState(false);
  const [saveBusy, setSaveBusy] = useState(false);
  const [error, setError] = useState(null);
  const [file, setFile] = useState(null);
  const [fileName, setFileName] = useState("");
  const [csvHeaders, setCsvHeaders] = useState([]);
  const [csvRows, setCsvRows] = useState([]);
  const [drag, setDrag] = useState(false);
  const [templatesByKey, setTemplatesByKey] = useState(TEMPLATES);
  const [detectedTemplateKeys, setDetectedTemplateKeys] = useState([]);
  const [selectedTemplateKey, setSelectedTemplateKey] = useState(null);
  const [allowMultiTemplates, setAllowMultiTemplates] = useState(true);
  const [mappingsByTemplate, setMappingsByTemplate] = useState({});
  const [mapping, setMapping] = useState({});
  const [mappingSrc, setMappingSrc] = useState({});
  const [ignoredRequirements, setIgnoredRequirements] = useState({});
  const [previewByTemplate, setPreviewByTemplate] = useState({});
  const [previewBusyKey, setPreviewBusyKey] = useState(null);
  const [processingSummary, setProcessingSummary] = useState(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [activeJobId, setActiveJobId] = useState(null);
  const [showTechnicalDetails, setShowTechnicalDetails] = useState(false);
  const [includePiiInAi, setIncludePiiInAi] = useState(true);
  const [fillMissing, setFillMissing] = useState(false);
  const [cleanValidValues, setCleanValidValues] = useState(false);
  const [aiSummary, setAiSummary] = useState(emptyAiSummary());

  // Derived
  const tpl =
    selectedTemplateKey && templatesByKey[selectedTemplateKey]
      ? templatesByKey[selectedTemplateKey]
      : null;
  const tplNotEmpty = !!(tpl && tpl.fields && tpl.fields.length);

  const fetchTenants = useCallback(async () => {
    try {
      const res = await authFetch(`${API_BASE}/tenants`);
      if (!res.ok) throw new Error(`Fetch tenants failed: ${res.status}`);
      const data = await res.json();
      if (data.tenants) setTenants(data.tenants);
    } catch (err) {
      console.error("Failed to fetch tenants:", err);
    }
  }, [authFetch]);

  const fetchJobHistory = useCallback(async (tId) => {
    if (!tId) return;
    try {
      const res = await authFetch(`${API_BASE}/jobs?tenantId=${tId}`);
      if (!res.ok) throw new Error(`Fetch job history failed: ${res.status}`);
      const data = await res.json();
      if (data.jobs) setJobHistory(data.jobs);
    } catch (err) {
      console.error("Failed to fetch job history:", err);
    }
  }, [authFetch]);


  // Handle tenant change with artificial delay for UX

  const handleTenantChange = (newId) => {
    if (newId === selectedTenantId) return;
    setIsTenantLoading(true);

    // Simulate page reload / context switch
    setTimeout(() => {
      setSelectedTenantId(newId);
      // We keep loading true for a split second after setting ID to let effects run, 
      // but mostly the timeout itself is the visual indicator.
      setIsTenantLoading(false);
    }, 800); // 0.8s delay
  };

  // Reset wizard when tenant changes
  React.useEffect(() => {
    setStep(1);
    setFileName("");
    setCsvHeaders([]);
    setCsvRows([]);
    setMapping({});
    setMappingSrc({});
    setDetectedTemplateKeys([]);
    setMappingsByTemplate({});
    setPreviewByTemplate({});
    setGrid([]);
    setRawRows([]);
    setRowErrors({});
    setEditing({});
    setAiSummary(emptyAiSummary());
    setError(null);

    setIgnoredRequirements({}); // Reset ignored requirements
  }, [selectedTenantId]);



  const PREVIEW_PAGE_SIZE = 50;

  const resetImportState = useCallback(() => {
    setFileName("");
    setCsvHeaders([]);
    setCsvRows([]);
    setRawRows([]);
    setGrid([]);
    setRowErrors({});
    setEditing({});
    setMapping({});
    setMappingSrc({});
    setSelectedTemplateKey(null);
    setDetectedTemplateKeys([]);
    setMappingsByTemplate({});
    setPreviewByTemplate({});
    setProcessingSummary(null);
    // setTemplatesByKey(TEMPLATES); // FIX: Don't reset templates, they are tenant-global
    setAiSummary(emptyAiSummary());
    setError(null);
    setHeaderAiBusy(false);
    setSaveBusy(false);
    setSaveSuccess(false);
    setActiveJobId(null);
    setShowTechnicalDetails(false);
    setSaveSuccess(false);
    setActiveJobId(null);
    setShowTechnicalDetails(false);
    setPreviewPage(1);
  }, []);

  /* ---------- Derived ---------- */

  const mappingComplete = useMemo(() => {
    if (!tplNotEmpty || !tpl) return false;

    const requiredFields = (tpl.fields || []).filter((f) => f.required);
    if (!requiredFields.length) return false;

    const headersUsed = requiredFields.map((f) => mapping[f.key]).filter(Boolean);

    if (headersUsed.length !== requiredFields.length) return false;
    if (!headersUsed.every((h) => csvHeaders.includes(h))) return false;

    return new Set(headersUsed).size === headersUsed.length;
  }, [tplNotEmpty, tpl, mapping, csvHeaders]);

  const headersHaveDup = useMemo(() => {
    if (!tplNotEmpty || !tpl) return false;
    const requiredFields = (tpl.fields || []).filter((f) => f.required);
    const headersUsed = requiredFields.map((f) => mapping[f.key]).filter(Boolean);
    return headersUsed.length > 0 && new Set(headersUsed).size !== headersUsed.length;
  }, [tplNotEmpty, tpl, mapping]);

  const gridHasBad = useMemo(() => {
    if (!tplNotEmpty || !grid.length || !tpl) return false;
    return grid.some((row) => tpl.fields.some((f) => row[f.key]?.status === "bad"));
  }, [tplNotEmpty, tpl, grid]);

  /* ---------- Validation Helper ---------- */

  const isTemplateComplete = useCallback(
    (tKey, checkDataQuality = false) => {
      const t = templatesByKey[tKey];
      if (!t || !t.fields) return false;

      // Get mapping for this template
      let map = {};
      if (tKey === selectedTemplateKey) {
        map = mapping;
      } else {
        map = mappingsByTemplate[tKey]?.mapping || {};
      }

      // Check required fields are mapped
      const required = t.fields.filter((f) => f.required);
      if (!required.length) return true; // No required fields, so it's complete


      // Check headers: all required fields must be mapped OR ignored
      const headersMapped = required.every((f) => {
        const isMapped = !!map[f.key];
        const isIgnored = !!ignoredRequirements[tKey]?.[f.key];
        return isMapped || isIgnored;
      });

      if (!headersMapped) return false;

      // If we're only checking headers (step 2), stop here
      if (!checkDataQuality) return true;

      // For step 3, also check preview data quality
      const preview = previewByTemplate[tKey];
      if (!preview || !preview.grid || !preview.grid.length) {
        return false; // No preview in step 3 = incomplete
      }

      // Check if any row has bad status or empty required fields
      const hasDataErrors = preview.grid.some((row) =>
        t.fields.some((f) => {
          const cell = row[f.key];
          if (f.required && (!cell?.value || !cell.value.trim())) return true;
          return cell?.status === "bad";
        })
      );

      return !hasDataErrors;
    },

    [templatesByKey, mapping, mappingsByTemplate, selectedTemplateKey, previewByTemplate, ignoredRequirements]
  );

  /* ---------- Derived ---------- */

  const allDetectedTemplatesComplete = useMemo(() => {
    const list = detectedTemplateKeys.length > 0 ? detectedTemplateKeys : (selectedTemplateKey ? [selectedTemplateKey] : []);
    console.log("DEBUG allDetectedTemplatesComplete:", {
      list,
      detectedTemplateKeys,
      selectedTemplateKey,
      step
    });

    if (!list.length) {
      console.log("DEBUG: No templates in list, returning false");
      return false;
    }

    // In step 2, check headers only; in step 3, check data too
    const checkData = step === 3;
    const results = list.map((key) => {
      const complete = isTemplateComplete(key, checkData);
      console.log(`DEBUG: Template ${key} complete:`, complete);
      return complete;
    });

    const allComplete = results.every(Boolean);
    console.log("DEBUG: allComplete:", allComplete);
    return allComplete;
  }, [detectedTemplateKeys, selectedTemplateKey, isTemplateComplete, step]);

  /* ---------- Grid builder (tpl-arg, not closure) ---------- */

  const buildGridFromRows = useCallback(
    (tplArg, rows, backendRowErrors = {}, oldGrid = null, fromAiClean = false) => {
      if (!tplArg || !tplArg.fields) return [];
      return (rows || []).map((row, i) => {
        const idx = row.__rowIndex ?? i;
        const errorsForRow =
          (backendRowErrors && backendRowErrors[String(idx)]) || [];
        const outRow = { __rowIndex: idx };

        tplArg.fields.forEach((f) => {
          const fieldKey = f.key;
          const value =
            row[fieldKey] !== undefined && row[fieldKey] !== null
              ? String(row[fieldKey])
              : "";

          let status = "ok";
          const valTrim = value.trim();

          // 1. Required check
          if (f.required && !valTrim) status = "bad";

          // 2. Allowed values (Enum) check
          if (f.allowed && f.allowed.length > 0 && status !== "bad") {
            // If we have a value, it MUST be in the allowed list
            // (If empty and optional, we skip this. If empty and required, it's already bad)
            if (valTrim && !f.allowed.includes(valTrim)) {
              status = "bad";
            }
          }

          // 3. Backend errors
          if (errorsForRow.includes(fieldKey)) status = "bad";

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

          outRow[fieldKey] = { value, status, source, prev };
        });

        return outRow;
      });
    },
    []
  );

  /* ---------- Templates (server override) ---------- */

  const applyServerTemplates = useCallback((serverTemplates) => {
    if (!serverTemplates) return;
    console.log("App: applyServerTemplates called with:", serverTemplates.length, "items");

    const normalizeFields = (fields) => {
      if (!Array.isArray(fields)) return fields;
      return fields.map((f) => ({
        ...f,
        isPii: f.isPii !== undefined ? f.isPii : f.is_pii || false,
      }));
    };

    const next = {};

    if (!Array.isArray(serverTemplates) && typeof serverTemplates === "object") {
      Object.entries(serverTemplates).forEach(([key, t]) => {
        if (!t) return;
        const k = t.key || t.templateKey || t.template_key || key;
        if (!k) return;
        next[k] = {
          ...t,
          key: k,
          label: t.label || t.templateLabel || k,
          keywords: t.keywords || [],
          fields: normalizeFields(t.fields || t.columns || []),
        };
      });

    } else if (Array.isArray(serverTemplates)) {
      serverTemplates.forEach((t) => {
        if (!t) return;
        const k = t.key || t.templateKey || t.template_key;
        if (!k) return;

        // Ensure label is populated
        const bestLabel = t.label || t.templateLabel || t.name || k;

        next[k] = {
          ...t,
          key: k,
          label: bestLabel,
          templateLabel: bestLabel, // normalize this too
          keywords: t.keywords || [],
          fields: normalizeFields(t.fields || t.columns || []),
        };
      });
    }

    console.log("App: Merging valid templates:", Object.keys(next));

    // MERGE with existing templates instead of replacing
    if (Object.keys(next).length) {
      setTemplatesByKey((prev) => {
        const merged = { ...prev, ...next };
        console.log("App: Final templatesByKey keys:", Object.keys(merged));
        return merged;
      });
    }
  }, []);

  // Fetch templates from backend whenever tenant changes

  const fetchTemplates = useCallback((tId) => {
    if (!tId) return;
    console.log("Fetching templates for tenant:", tId);

    authFetch(`${API_BASE}/templates?tenantId=${tId}`)
      .then((res) => {
        if (!res.ok) throw new Error(`Template fetch failed: ${res.status}`);
        return res.json();
      })
      .then((data) => {
        if (data.error) {
          console.error("Template fetch error:", data.error);
          return;
        }

        if (data.templates) {
          console.log("DEBUG: Fetched templates:", data.templates.map(t => t.templateKey || t.key));
          applyServerTemplates(data.templates);
        }
      })
      .catch((err) => {
        console.error("App: Failed to load templates", err);
        setTemplatesByKey(TEMPLATES);
        setError(`Failed to load templates: ${err.message}`);
      });
  }, [applyServerTemplates, authFetch]);
  useEffect(() => {
    if (!user) return;
    fetchTenants();
  }, [user]);

  useEffect(() => {
    if (!user) return;
    fetchTemplates(selectedTenantId);
    fetchJobHistory(selectedTenantId);
  }, [selectedTenantId, user]);

  /* ---------- Preview builder (per-template) ---------- */

  const buildPreviewForTemplate = useCallback(
    async (templateKey, mappingForTemplate, forcedContext = null) => {
      const tplArg = templatesByKey[templateKey];
      if (!tplArg?.fields?.length) {
        return { error: `Unknown templateKey: ${templateKey} ` };
      }
      if (!csvRows.length) {
        return { error: "No CSV rows loaded." };
      }

      const required = (tplArg.fields || []).filter((f) => f.required);

      const missing = required.filter((f) => {
        const isMapped = !!mappingForTemplate?.[f.key];
        // It's allowed to be missing if we explicitly ignored it
        const isIgnored = !!ignoredRequirements[templateKey]?.[f.key];
        return !isMapped && !isIgnored;
      });

      if (missing.length) {
        return {
          error: `Missing required mappings for: ${missing.map((f) => f.label).join(", ")} `,
        };
      }

      // Build template-shaped rows from CSV
      const rows = csvRows
        .map((csvRow, idx) => {
          const out = { __rowIndex: idx };
          tplArg.fields.forEach((f) => {
            const header = mappingForTemplate[f.key];
            // If header is missing/ignored, we just pass "", which will be flagged as empty/required later
            out[f.key] =
              header && Object.prototype.hasOwnProperty.call(csvRow, header)
                ? (csvRow[header] ?? "")
                : "";
          });
          return out;
        })
      // SUBSET: Don't drop rows with empty values if the user explicitly ignored fields. 
      // We want to show the rows so they can manually enter data if desired.
      // .filter((r) =>
      //   tplArg.fields.some((f) => String(r[f.key] ?? "").trim() !== "")
      // );

      const res = await authFetch(`${API_BASE}/import/ai/clean`, {
        method: "POST",
        body: JSON.stringify({
          tenantId: selectedTenantId,
          userId: DEFAULT_USER_ID,
          templateKey,
          rows,
          useAi: false,
          fullDatasetContext: forcedContext || Object.entries(previewByTemplate).map(([key, p]) => ({
            templateKey: key,
            rows: p.rawRows || []
          })),
        }),
      });
      if (!res.ok) throw new Error("AI Clean failed");
      let finalData = await res.json();

      // NEW: Async threshold handling for large files
      if (finalData.async && finalData.jobId) {
        let isDone = false;
        while (!isDone) {
          // Poll every 1.5 seconds
          await new Promise((resolve) => setTimeout(resolve, 1500));
          const jobRes = await authFetch(`${API_BASE}/jobs/${finalData.jobId}`);
          if (!jobRes.ok) throw new Error("Failed to poll preview job");

          const jobData = await jobRes.json();
          const job = jobData.job;
          if (job && job.status === "done") {
            isDone = true;
            finalData = job.preview_result || {};
          } else if (job && job.status === "error") {
            throw new Error(`Async preview failed: ${job.error || "Unknown error"}`);
          }
        }
      }

      const cleaned =
        finalData.outputRows || finalData.rows || finalData.cleanedRows || finalData.output_rows || [];
      const backendRowErrors =
        finalData.rowErrors || finalData.row_errors || finalData.errorsByRow || finalData.errors_by_row || {};

      const newGrid = buildGridFromRows(tplArg, cleaned, backendRowErrors, null, false);

      return { tplArg, cleaned, backendRowErrors, newGrid };
    },
    [templatesByKey, csvRows, buildGridFromRows, ignoredRequirements, selectedTenantId]
  );

  /* ---------- Optimization: Background Pre-fetch in Step 3 ---------- */

  useEffect(() => {
    // Only run in Step 3 (Confirm)
    if (step !== 3 || !detectedTemplateKeys.length) return;

    const prefetch = async () => {
      // Find missing previews for BACKGROUND tabs (not the selected one)
      const missingKeys = detectedTemplateKeys.filter(key =>
        key !== selectedTemplateKey &&
        (!previewByTemplate[key] || !previewByTemplate[key].grid)
      );

      if (!missingKeys.length) return;

      console.log("Background pre-fetching previews for:", missingKeys);

      for (const key of missingKeys) {
        // Double check if it was filled by a previous iteration or race
        if (previewByTemplate[key]?.grid) continue;

        const mapData = mappingsByTemplate[key];
        const map = mapData?.mapping || {};

        try {
          const res = await buildPreviewForTemplate(key, map);

          if (!res || res.error) {
            console.warn(`Background build failed for ${key}:`, res?.error);
            continue;
          }

          setPreviewByTemplate((prev) => ({
            ...prev,
            [key]: {
              grid: res.newGrid,
              rawRows: res.cleaned,
              rowErrors: res.backendRowErrors,
              aiSummary: emptyAiSummary(),
            },
          }));
        } catch (err) {
          console.error(`Error pre-fetching ${key}:`, err);
        }
      }
    };

    // Use a small timeout to let the UI settle / let primary render finish
    const t = setTimeout(prefetch, 500);
    return () => clearTimeout(t);
  }, [step, detectedTemplateKeys, selectedTemplateKey]); // Re-run if selection changes (prioritize others)

  const handleFiles = async (fileList) => {
    const file = fileList?.[0];
    if (!file) return;

    resetImportState();
    setError(null);
    setBusy(true);

    try {
      // Parse CSV on the frontend (used for all per-template subsets)
      const csvText = await file.text();
      const parsed = parseCsv(csvText);
      setCsvHeaders(parsed.headers || []);
      setCsvRows(parsed.rows || []);

      // Upload CSV to backend (optional server parsing / mapping suggestions)
      const formData = new FormData();
      formData.append("file", file);

      let res;
      try {
        res = await fetch(`${API_BASE}/import/upload`, {
          method: "POST",
          body: formData,
        });
      } catch (e) {
        if (e instanceof TypeError && String(e.message || "").includes("fetch")) {
          throw new Error(
            `Network error: Unable to reach ${API_BASE}/import/upload.Check your connection and CORS settings.`
          );
        }
        throw e;
      }

      if (!res.ok) {
        const txt = await res.text();
        console.error("Upload failed:", res.status, txt);
        throw new Error(`Upload failed with status ${res.status} `);
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

      // Prefer backend headers if provided
      if (Array.isArray(data.headers)) {
        setCsvHeaders(data.headers);
      }

      // DO NOT apply templates from upload response. 
      // Rely solely on fetchTemplates() (Global DB State) to avoid overwriting custom templates with partial data.
      // applyServerTemplates(data.templatesByKey || data.templates || data.TEMPLATES);

      // Detected template(s)
      const detectedKey =
        data.detected_template ||
        data.templateKey ||
        data.template_key ||
        detectTemplateForHeaders(parsed.headers || []);

      const detectedKeys =
        data.detectedTemplateKeys ||
        data.detected_template_keys ||
        (detectedKey ? [detectedKey] : []);

      setDetectedTemplateKeys(Array.isArray(detectedKeys) ? detectedKeys : []);
      setSelectedTemplateKey(detectedKey);

      // Suggested mapping for the detectedKey (single-template upload response)
      const suggestedMapping = data.suggested_mapping || data.mapping || {};
      const suggestedSrc = data.mapping_sources || data.mappingSources || {};

      setMapping(suggestedMapping || {});
      setMappingSrc(suggestedSrc || {});

      // Store mapping in per-template map
      setMappingsByTemplate((prev) => ({
        ...prev,
        [detectedKey]: {
          mapping: suggestedMapping || {},
          mappingSrc: suggestedSrc || {},
        },
      }));

      // Previews and Step 3 state are already reset by resetImportState() at the start

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

  /* ---------- Template switching (works in Step 2 and Step 3) ---------- */

  const saveCurrentTemplateState = useCallback(() => {
    if (!selectedTemplateKey) return;

    // Save mapping
    setMappingsByTemplate((prev) => ({
      ...prev,
      [selectedTemplateKey]: { mapping, mappingSrc },
    }));

    // Save preview (if we have one)
    setPreviewByTemplate((prev) => ({
      ...prev,
      [selectedTemplateKey]: {
        grid,
        rawRows,
        rowErrors,
        aiSummary,
      },
    }));
  }, [selectedTemplateKey, mapping, mappingSrc, grid, rawRows, rowErrors, aiSummary]);

  const loadTemplateState = useCallback(
    async (newKey) => {
      if (!newKey || newKey === selectedTemplateKey) return;

      saveCurrentTemplateState();

      const storedMap = mappingsByTemplate[newKey] || {};
      const nextMapping = storedMap.mapping || {};
      const nextMappingSrc = storedMap.mappingSrc || {};

      setSelectedTemplateKey(newKey);
      setMapping(nextMapping);
      setMappingSrc(nextMappingSrc);
      setEditing({});
      setError(null);

      // Always clear current view state first (avoids showing wrong subset momentarily)
      setGrid([]);
      setRawRows([]);
      setRowErrors({});
      setAiSummary(emptyAiSummary());
      setPreviewPage(1);

      // If we are not in Step 3, don't auto-build the preview.
      if (step !== 3) return;

      // Restore cached preview if available
      const cached = previewByTemplate[newKey];
      if (cached?.grid?.length) {
        setGrid(cached.grid);
        setRawRows(cached.rawRows || []);
        setRowErrors(cached.rowErrors || {});
        setAiSummary(cached.aiSummary || emptyAiSummary());
        return;
      }

      // Otherwise build preview if possible; if not, show a useful message.
      setPreviewBusyKey(newKey);

      try {
        const res = await buildPreviewForTemplate(newKey, nextMapping);
        if (res.error) {
          setError(res.error);
          return;
        }

        setGrid(res.newGrid);
        setRawRows(res.cleaned);
        setRowErrors(res.backendRowErrors);
        setAiSummary(emptyAiSummary());

        setPreviewByTemplate((prev) => ({
          ...prev,
          [newKey]: {
            grid: res.newGrid,
            rawRows: res.cleaned,
            rowErrors: res.backendRowErrors,
            aiSummary: emptyAiSummary(),
          },
        }));
      } catch (e) {
        console.error(e);
        setError("Failed to build preview for selected template.");
      } finally {
        setPreviewBusyKey(null);
      }
    },
    [
      selectedTemplateKey,
      saveCurrentTemplateState,
      mappingsByTemplate,
      previewByTemplate,
      step,
      buildPreviewForTemplate,
    ]
  );

  const removeTemplate = useCallback(
    (keyToRemove, e) => {
      e.stopPropagation();
      setDetectedTemplateKeys((prev) => {
        const next = prev.filter((k) => k !== keyToRemove);
        if (selectedTemplateKey === keyToRemove) {
          if (next.length > 0) {
            loadTemplateState(next[0]);
          } else {
            setSelectedTemplateKey(null);
          }
        }
        return next;
      });
    },
    [selectedTemplateKey, loadTemplateState]
  );

  /* ---------- Step transitions ---------- */

  const goToValues = async () => {
    // 1. Basic check
    if (!csvRows.length) {
      setError("No CSV rows found. Please check your file content.");
      return;
    }

    setBusy(true);
    setError(null);

    try {
      // 2. Consolidate all mappings (current + stored)
      const allMaps = { ...mappingsByTemplate };
      if (selectedTemplateKey) {
        allMaps[selectedTemplateKey] = { mapping, mappingSrc };
      }

      // 3. Identify which templates have actual mappings
      // (We filter those that have at least one mapped field or are the active one)
      const keysToProcess = Object.keys(allMaps);
      if (selectedTemplateKey && !keysToProcess.includes(selectedTemplateKey)) {
        keysToProcess.push(selectedTemplateKey);
      }

      const newPreviews = {};

      // 3b. Construct a full session context upfront (pre-mapping rows for all keys)
      // This ensures that even the first template being built sees context for the others.
      const fullSessionContext = keysToProcess.map((tk) => {
        const t = templatesByKey[tk];
        const m = allMaps[tk]?.mapping || {};
        if (!t) return null;
        const rows = csvRows.map((csvRow, idx) => {
          const out = { __rowIndex: idx };
          t.fields.forEach((f) => {
            const h = m[f.key];
            out[f.key] = h && Object.prototype.hasOwnProperty.call(csvRow, h) ? (csvRow[h] ?? "") : "";
          });
          return out;
        });
        return { templateKey: tk, rows };
      }).filter(Boolean);

      // 4. Build preview for ALL templates that have a mapping
      // This ensures validation runs upfront for everything.
      for (const tKey of keysToProcess) {
        const mapObj = allMaps[tKey]?.mapping || {};

        const res = await buildPreviewForTemplate(tKey, mapObj, fullSessionContext);
        if (res.error) {
          console.warn(`Preview validation failed for ${tKey}: ${res.error}`);
        }

        if (res.newGrid) {
          newPreviews[tKey] = {
            grid: res.newGrid,
            rawRows: res.cleaned,
            rowErrors: res.backendRowErrors,
            aiSummary: emptyAiSummary(),
          };
        }
      }

      // 5. Update state
      // We need to ensure the CURRENT view state (grid/rawRows) matches the selected template
      // If selectedTemplateKey is in newPreviews, set it.
      if (selectedTemplateKey && newPreviews[selectedTemplateKey]) {
        const p = newPreviews[selectedTemplateKey];
        setGrid(p.grid);
        setRawRows(p.rawRows);
        setRowErrors(p.rowErrors);
        setAiSummary(p.aiSummary);
      }

      setPreviewByTemplate((prev) => ({
        ...prev,
        ...newPreviews,
      }));

      // 6. Save current mapping state too (since we constructed it manually)
      setMappingsByTemplate(allMaps);

      setStep(3);
    } catch (e) {
      console.error(e);
      setError(
        "Failed to build preview grid. Check specific template mappings."
      );
    } finally {
      setBusy(false);
    }
  };

  /* ---------- AI Cleaning ---------- */

  const aiCleanAll = async () => {
    if (!tpl || !rawRows.length) return;

    setBusy(true);
    setError(null);

    try {
      // Extract only the current page's rows
      const PREVIEW_PAGE_SIZE = 50;
      // We need to use previewPage from state. 
      // Fortunately previewPage is a primitive state in App.js but wait, App.js has previewPage? 
      // Yes, Wait, no. App.js doesn't have previewPage. App.js passes `previewPage` inside `previewByTemplate`.
      const pData = previewByTemplate[tpl.key];
      const page = pData?.previewPage || 1;
      const startIndex = (page - 1) * PREVIEW_PAGE_SIZE;
      const endIndex = startIndex + PREVIEW_PAGE_SIZE;
      const currentPageRows = rawRows.slice(startIndex, endIndex);

      const res = await authFetch(`${API_BASE}/import/ai/clean`, {
        method: "POST",
        body: JSON.stringify({
          tenantId: selectedTenantId,
          userId: DEFAULT_USER_ID,
          templateKey: tpl.key,
          rows: currentPageRows, // Only send current page
          useAi: true,
          includePiiInAi,
          settings: {
            onlyFixInvalid: !cleanValidValues,
            preferNeutralPlaceholders: !fillMissing,
            ensureNoEmptyValues: fillMissing,
          },
          fullDatasetContext: Object.entries(previewByTemplate).map(([key, p]) => ({
            templateKey: key,
            rows: p.rawRows || []
          })),
          headerMapping: mapping,
          fieldSamples: {},
        }),
      });
      if (!res.ok) throw new Error("AI Clean failed");
      let finalData = await res.json();

      if (finalData.async && finalData.jobId) {
        let isDone = false;
        while (!isDone) {
          await new Promise((resolve) => setTimeout(resolve, 1500));
          const jobRes = await authFetch(`${API_BASE}/jobs/${finalData.jobId}`);
          if (!jobRes.ok) throw new Error("Failed to poll preview job");

          const jobData = await jobRes.json();
          const job = jobData.job;
          if (job && job.status === "done") {
            isDone = true;
            finalData = job.preview_result || {};
          } else if (job && job.status === "error") {
            throw new Error(`Async preview failed: ${job.error || "Unknown error"}`);
          }
        }
      }

      const cleaned =
        finalData.outputRows || finalData.rows || finalData.cleanedRows || finalData.output_rows || [];
      const backendRowErrors =
        finalData.rowErrors || finalData.row_errors || finalData.errorsByRow || finalData.errors_by_row || {};
      const aiUsage = finalData.aiUsage || finalData.ai_usage || null;

      // Build a partial grid just for the cleaned rows
      const partialGrid = buildGridFromRows(tpl, cleaned, backendRowErrors, grid.slice(startIndex, endIndex), true);

      // Merge the updated page back into the full arrays
      const newRawRows = [...rawRows];
      const newGrid = [...grid];
      const newRowErrors = { ...rowErrors };

      // Clear old errors for this specific page
      for (let i = startIndex; i < endIndex; i++) {
        delete newRowErrors[String(i)];
      }

      cleaned.forEach((r, idx) => {
        const targetGlobalIndex = r.__rowIndex !== undefined ? r.__rowIndex : startIndex + idx;
        newRawRows[targetGlobalIndex] = r;
        newGrid[targetGlobalIndex] = partialGrid[idx];
      });

      // Merge in the backend row errors
      Object.entries(backendRowErrors).forEach(([rowIndexStr, errs]) => {
        newRowErrors[rowIndexStr] = errs;
      });

      setRawRows(newRawRows);
      setRowErrors(newRowErrors);
      setGrid(newGrid);

      if (aiUsage) {
        const delta = {
          prompt:
            aiUsage.promptTokens ||
            aiUsage.prompt_tokens ||
            aiUsage.totalPromptTokens ||
            0,
          completion:
            aiUsage.completionTokens ||
            aiUsage.completion_tokens ||
            aiUsage.totalCompletionTokens ||
            0,
          cost:
            aiUsage.estimatedCost ||
            aiUsage.estimated_cost ||
            aiUsage.totalEstimatedCost ||
            0,
        };

        setAiSummary((prev) => {
          const p = prev || emptyAiSummary();
          return {
            totalPromptTokens: (p.totalPromptTokens || 0) + delta.prompt,
            totalCompletionTokens: (p.totalCompletionTokens || 0) + delta.completion,
            totalEstimatedCost: (p.totalEstimatedCost || 0) + delta.cost,
          };
        });

        // Update preview cache separately
        setPreviewByTemplate((cachePrev) => {
          const prevForTpl = cachePrev[tpl.key] || {};
          const p = prevForTpl.aiSummary || emptyAiSummary();
          return {
            ...cachePrev,
            [tpl.key]: {
              grid: newGrid,
              rawRows: cleaned,
              rowErrors: backendRowErrors,
              aiSummary: {
                totalPromptTokens: (p.totalPromptTokens || 0) + delta.prompt,
                totalCompletionTokens: (p.totalCompletionTokens || 0) + delta.completion,
                totalEstimatedCost: (p.totalEstimatedCost || 0) + delta.cost,
              },
            },
          };
        });
      }
    } catch (e) {
      console.error(e);
      setError("AI clean failed. Ensure /api/import/ai/clean is wired to the backend logic.");
    } finally {
      setBusy(false);
    }
  };


  /* ---------- Async Ingestion (Step 4 Process) ---------- */



  const validateAllTemplates = useCallback(() => {
    // Check if all detected templates are ready
    if (detectedTemplateKeys.length > 0) {
      const missing = detectedTemplateKeys.filter(k => !previewByTemplate[k] && k !== selectedTemplateKey);
      if (missing.length > 0) {
        // Find labels for missing templates
        const missingLabels = missing.map(k => templatesByKey[k]?.label || k).join(", ");
        return `Please map and preview all detected templates before finishing. Missing: ${missingLabels}`;
      }
    } else {
      // Single template fallback
      if (!tplNotEmpty || !tpl || !rawRows.length) return "No data to import.";
    }

    // Capture current state to use alongside previewByTemplate
    const currentState = {
      grid,
      rawRows,
      rowErrors,
      aiSummary
    };

    // Merge current state into the map for calculation
    const finalPreviews = { ...previewByTemplate };
    if (selectedTemplateKey) {
      finalPreviews[selectedTemplateKey] = currentState;
    }

    // Check for validation errors in ALL templates
    for (const [key, pData] of Object.entries(finalPreviews)) {
      // Only check templates that are actually detected/active
      if (detectedTemplateKeys.length > 0 && !detectedTemplateKeys.includes(key)) continue;

      const pGrid = pData.grid || [];
      const pTpl = templatesByKey[key];

      if (pGrid.length && pTpl) {
        // Check for ANY bad status OR missing required values
        const hasBad = pGrid.some(row => pTpl.fields.some(f => {
          const cell = row[f.key];
          // 1. Check explicit error status
          if (cell?.status === "bad") return true;
          // 2. Check strict requiredness (if not already marked bad)
          if (f.required) {
            const val = cell?.value;
            if (val === undefined || val === null || String(val).trim() === "") {
              return true;
            }
          }
          return false;
        }));

        if (hasBad) {
          return `Template '${pTpl.label}' has validation errors (all mandatory fields must be populated). Please fix them before finishing.`;
        }
      }
    }

    return null; // No errors
  }, [detectedTemplateKeys, previewByTemplate, templatesByKey, tplNotEmpty, tpl, rawRows, grid, rowErrors, aiSummary, selectedTemplateKey]);

  const handleAsyncIngestion = async () => {
    // 0. Ensure current state is saved first
    saveCurrentTemplateState();

    // 0b. Validate EVERYTHING before starting
    const validationError = validateAllTemplates();
    if (validationError) {
      setError(validationError);
      return;
    }

    // 0c. Fire-and-forget: save confirmed header→field mappings for Tier-2 tenant memory.
    // Build alias list from all confirmed mappingsByTemplate.
    try {
      const aliases = [];
      Object.entries(mappingsByTemplate).forEach(([tKey, tState]) => {
        const tMapping = tState?.mapping || {};
        Object.entries(tMapping).forEach(([fieldKey, uploadedHeader]) => {
          if (uploadedHeader) {
            aliases.push({ templateKey: tKey, fieldKey, uploadedHeader });
          }
        });
      });
      if (aliases.length > 0) {
        authFetch(`${API_BASE}/import/save-header-aliases`, {
          method: "POST",
          body: JSON.stringify({ tenantId: selectedTenantId, aliases }),
        }).catch(() => {/* non-critical, ignore */ });
      }
    } catch (e) { /* non-critical */ }

    // Determine which templates to process
    let templatesToProcess = [];
    if (detectedTemplateKeys.length > 0) {
      templatesToProcess = detectedTemplateKeys;
    } else if (tpl && tpl.key) {
      templatesToProcess = [tpl.key];
    }

    if (templatesToProcess.length === 0) return;

    setSaveBusy(true);
    setSaveSuccess(false);
    setError(null);

    // We need the latest preview data, which includes the just-saved current state
    // However, react state update might not be immediate. 
    // Ideally we merge current state locally.
    const effectivePreviews = { ...previewByTemplate };
    if (selectedTemplateKey && grid.length > 0) {
      effectivePreviews[selectedTemplateKey] = {
        grid: [...grid], // current active grid
        rawRows: [...rawRows],
        rowErrors: { ...rowErrors },
        aiSummary: { ...aiSummary }
      };
    }

    try {
      const uploadIds = [];
      let totalRowCount = 0;
      let combinedLabel = "";

      // 1. DUMP EACH TEMPLATE SEPARATELY
      for (const tKey of templatesToProcess) {
        // Get data for this template
        const pData = effectivePreviews[tKey];
        if (!pData || !pData.grid || pData.grid.length === 0) {
          console.warn(`Skipping empty template ${tKey}`);
          continue;
        }

        const currentTpl = templatesByKey[tKey] || (tpl && tpl.key === tKey ? tpl : null);
        if (!currentTpl) {
          console.warn(`Template definition not found for ${tKey}`);
          continue;
        }

        // Transform grid to cleaned rows
        const cleanedRows = pData.grid.map(row => {
          const cleanRow = {};
          Object.keys(row).forEach(key => {
            if (key !== '__rowIndex') {
              cleanRow[key] = row[key]?.value || '';
            }
          });
          return cleanRow;
        });

        console.log(`Dumping cleaned data for ${tKey} (${cleanedRows.length} rows)...`);
        const dumpResRaw = await authFetch(`${API_BASE}/import/dump`, {
          method: "POST",
          body: JSON.stringify({
            tenantId: selectedTenantId,
            templateKey: tKey,
            rows: cleanedRows,
            fileName: fileName || "uploaded_file.csv"
          })
        });
        if (!dumpResRaw.ok) throw new Error("Dump failed");
        const dumpRes = await dumpResRaw.json();

        uploadIds.push(dumpRes.uploadId);
        totalRowCount += (dumpRes.rowCount || cleanedRows.length);
        combinedLabel += (combinedLabel ? ", " : "") + currentTpl.label;
      }

      if (uploadIds.length === 0) {
        throw new Error("No data to import.");
      }

      // 2. TRIGGER ONE JOB WITH ALL UPLOADS
      console.log("Triggering ingestion job in multi-template mode...", uploadIds);
      const jobResRaw = await authFetch(`${API_BASE}/import/trigger-job`, {
        method: "POST",
        body: JSON.stringify({
          tenantId: selectedTenantId,
          uploadIds: uploadIds
        })
      });
      if (!jobResRaw.ok) throw new Error("Trigger job failed");
      const jobRes = await jobResRaw.json();

      console.log("Job triggered. JobId:", jobRes.jobId);
      setActiveJobId(jobRes.jobId);

      setProcessingSummary({
        isAsync: true,
        uploadId: uploadIds[0], // fallback for logging
        uploadIds: uploadIds,   // keep track of all
        jobId: jobRes.jobId,
        templateLabel: templatesToProcess.length > 1 ? "Multiple Templates" : combinedLabel,
        rowCount: totalRowCount,
        fileName: fileName || "uploaded_file.csv",
        status: "Pending",
        database: "csv",
        collection: "raw_uploads"
      });

      setSaveSuccess(true);
      setStep(4);

    } catch (e) {
      console.error("Async ingestion failed:", e);
      setError("Failed to start ingestion: " + (e.message || "Unknown error"));
    } finally {
      setSaveBusy(false);
    }
  };

  /* ---------- Confirm Import (local summary only) ---------- */

  const confirmImport = () => {
    // Local check (should match async check for consistency)
    const valError = validateAllTemplates();
    if (valError) {
      setError(valError);
      return;
    }

    setError(null);

    // Aggregate summary across ALL templates
    // If no multi-template, use current 'rawRows'/'grid' state as fallback (or ensure current is in previewByTemplate)

    // Ensure current state is saved to previewByTemplate before calculating
    const currentState = {
      grid,
      rawRows,
      rowErrors,
      aiSummary
    };

    // Merge current state into the map for calculation
    const finalPreviews = { ...previewByTemplate };
    if (selectedTemplateKey) {
      finalPreviews[selectedTemplateKey] = currentState;
    }

    // Double check (redundant but safe)
    for (const [key, pData] of Object.entries(finalPreviews)) {
      const pGrid = pData.grid || [];
      const pTpl = templatesByKey[key];
      if (pGrid.length && pTpl) {
        const hasBad = pGrid.some(row => pTpl.fields.some(f => row[f.key]?.status === "bad"));
        if (hasBad) {
          setError(`Template '${pTpl.label}' has validation errors. Please fix them before finishing.`);
          return;
        }
      }
    }

    let totalRows = 0;
    let totalCreated = 0;
    let totalAiCells = 0;
    let totalUserCells = 0;
    let totalAiTokens = 0;
    let totalAiCost = 0;

    Object.entries(finalPreviews).forEach(([key, pData]) => {
      const pRows = pData.rawRows || [];
      const pGrid = pData.grid || [];
      const pTpl = templatesByKey[key];
      const pAi = pData.aiSummary || emptyAiSummary();

      totalRows += pRows.length;
      totalCreated += pRows.length;
      totalAiTokens += (pAi.totalPromptTokens || 0);
      totalAiCost += (pAi.totalEstimatedCost || 0);

      if (pGrid.length && pTpl && pTpl.fields) {
        pGrid.forEach((row) => {
          pTpl.fields.forEach((f) => {
            const cell = row[f.key];
            const tagKind = getTagKind(cell);
            if (tagKind === "ai") totalAiCells += 1;
            else if (tagKind === "user") totalUserCells += 1;
          });
        });
      }
    });

    // Generate random scenarios for logging
    const logCount = 8; // Generate 8 mock logs
    const mockLogs = [];
    const statuses = ["Imported", "Imported", "Imported", "Skipped", "Failed"];
    const operations = ["Create User", "Update Record", "Validate Field", "Check Duplicate"];

    for (let i = 0; i < logCount; i++) {
      const s = statuses[Math.floor(Math.random() * statuses.length)];
      const op = operations[Math.floor(Math.random() * operations.length)];
      let msg = "Record processed successfully";
      if (s === "Skipped") msg = "Duplicate record found - skipping import";
      if (s === "Failed") msg = "Validation error: invalid format for required field";

      mockLogs.push({
        id: i + 1,
        time: new Date().toLocaleTimeString(),
        operation: op,
        status: s,
        message: msg
      });
    }

    const summary = {
      templateLabel: detectedTemplateKeys.length > 1 ? "Multiple Templates" : (tpl?.label || "Unknown"),
      totalRows,
      created: totalCreated,
      updated: 0,
      failed: 0,
      aiCells: totalAiCells,
      userCells: totalUserCells,
      aiTokens: totalAiTokens,
      aiEstimatedCost: totalAiCost,
      logs: mockLogs
    };

    setProcessingSummary(summary);
    setStep(4);
  };

  /* ---------- Grid editing ---------- */

  const cellKey = (rowIndex, fieldKey) => `${rowIndex} -${fieldKey} `;

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

    const value = rawVal == null ? "" : String(rawVal);

    // Update grid cell object
    const newGrid = [...grid];
    const oldRow = newGrid[rowIndex] || {};
    const oldCell =
      oldRow[fieldKey] || { value: "", status: "bad", source: "csv", prev: null };

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

    // Update rawRows (plain rows) to match
    const newRawRows = [...rawRows];
    if (!newRawRows[rowIndex]) newRawRows[rowIndex] = { __rowIndex: rowIndex };
    newRawRows[rowIndex] = { ...newRawRows[rowIndex], [fieldKey]: value };

    setGrid(newGrid);
    setRawRows(newRawRows);

    // keep cache in sync
    setPreviewByTemplate((prev) => ({
      ...prev,
      [tpl.key]: {
        grid: newGrid,
        rawRows: newRawRows,
        rowErrors,
        aiSummary,
      },
    }));
  };

  const commitEdit = (rowIndex, fieldKey) => {
    const id = cellKey(rowIndex, fieldKey);
    const newVal =
      editing[id] !== undefined ? editing[id] : grid[rowIndex]?.[fieldKey]?.value || "";
    applyCellUpdate(rowIndex, fieldKey, newVal);
    setEditing((prev) => {
      const copy = { ...prev };
      delete copy[id];
      return copy;
    });
  };

  /* ---------- AI header mapping (single template) ---------- */

  const handleAiMapHeaders = async () => {
    if (!tplNotEmpty || !tpl || !csvHeaders.length) return;

    setError(null);
    setHeaderAiBusy(true);

    try {
      const currentMapping = (tpl.fields || []).map((f) => ({
        templateKey: f.key,
        matchedHeader: mapping[f.key] || null,
      }));

      const templateFields = (tpl.fields || []).map((f) => ({
        key: f.key,
        label: f.label,
        required: f.required || false,
        isPii: f.isPii || false,
        allowedValues: Array.isArray(f.allowed) && f.allowed.length > 0 ? f.allowed : null,
        description: f.label,
      }));

      const sampleRows = csvRows
        .slice(0, Math.min(5, csvRows.length))
        .map((row) => {
          const sample = {};
          csvHeaders.forEach((header) => {
            sample[header] = row[header] || "";
          });
          return sample;
        });

      const res = await authFetch(`${API_BASE}/import/ai/header-mapping`, {
        method: "POST",
        body: JSON.stringify({
          tenantId: selectedTenantId,
          userId: DEFAULT_USER_ID,
          templateKey: tpl.key,
          templateLabel: tpl.label,
          templateKeywords: tpl.keywords || [],
          uploadedHeaders: csvHeaders,
          templateFields,
          sampleData: sampleRows,
          currentMapping,
        }),
      });
      if (!res.ok) throw new Error("AI Header Mapping failed");
      const data = await res.json();

      const nextMapping = { ...mapping };
      const nextSrc = { ...mappingSrc };

      if (Array.isArray(data.mappings)) {
        data.mappings.forEach((m) => {
          if (!m || !m.templateKey || !m.matchedHeader) return;

          // Rule: AI only applies to REQUIRED fields
          // Rule: AI never overrides MATCHED (direct) or MANUAL
          const field = (tpl.fields || []).find(f => f.key === m.templateKey);
          if (!field || !field.required) return;

          const currentSrc = mappingSrc[m.templateKey];
          if (currentSrc === "direct" || currentSrc === "manual") return;

          nextMapping[m.templateKey] = m.matchedHeader;
          nextSrc[m.templateKey] = "ai";
        });
      }

      if (data.mapping && typeof data.mapping === "object") {
        Object.entries(data.mapping).forEach(([fieldKey, header]) => {
          if (!header) return;

          // Same rules apply
          const field = (tpl.fields || []).find(f => f.key === fieldKey);
          if (!field || !field.required) return;

          const currentSrc = mappingSrc[fieldKey];
          if (currentSrc === "direct" || currentSrc === "manual") return;

          nextMapping[fieldKey] = header;
          nextSrc[fieldKey] = "ai";
        });
      }

      setMapping(nextMapping);
      setMappingSrc(nextSrc);

      // persist mapping per template
      if (tpl?.key) {
        setMappingsByTemplate((prev) => ({
          ...prev,
          [tpl.key]: { mapping: nextMapping, mappingSrc: nextSrc },
        }));
      }

      if (data.aiUsage || data.ai_usage) {
        const usage = data.aiUsage || data.ai_usage;
        setAiSummary((prev) => ({
          totalPromptTokens:
            (prev.totalPromptTokens || 0) +
            (usage.promptTokens || usage.prompt_tokens || usage.totalPromptTokens || 0),
          totalCompletionTokens:
            (prev.totalCompletionTokens || 0) +
            (usage.completionTokens ||
              usage.completion_tokens ||
              usage.totalCompletionTokens ||
              0),
          totalEstimatedCost:
            (prev.totalEstimatedCost || 0) +
            (usage.estimatedCost || usage.estimated_cost || usage.totalEstimatedCost || 0),
        }));
      }
    } catch (e) {
      console.error(e);
      setError("AI header mapping failed. Check /api/import/ai/header-mapping on the backend.");
    } finally {
      setHeaderAiBusy(false);
    }
  };

  /* ---------- AI detect and map (multi-template) ---------- */

  const handleAiDetectAndMap = async () => {
    if (!csvHeaders.length) return;

    setError(null);
    setAiDetectBusy(true);

    try {
      const sampleRows = csvRows
        .slice(0, Math.min(5, csvRows.length))
        .map((row) => {
          const sample = {};
          csvHeaders.forEach((header) => {
            sample[header] = row[header] || "";
          });
          return sample;
        });

      const res = await authFetch(`${API_BASE}/import/ai/detect-and-map`, {
        method: "POST",
        body: JSON.stringify({
          tenantId: selectedTenantId,
          userId: DEFAULT_USER_ID,
          templateKey: selectedTemplateKey,
          uploadedHeaders: csvHeaders,
          sampleData: sampleRows,
          allowMultiTemplates: allowMultiTemplates,
        }),
      });
      if (!res.ok) throw new Error("AI Detect & Map failed");
      const data = await res.json();


      console.log("AI Detect & Map response:", data);

      const dKeys = data.detectedTemplateKeys || data.detected_template_keys || [];
      const results = data.results || {};

      if (Array.isArray(dKeys) && dKeys.length > 0) {
        setDetectedTemplateKeys(dKeys);

        const newMappingsByTemplate = {};

        dKeys.forEach((tKey) => {
          const result = results[tKey];
          if (result && Array.isArray(result.mappings)) {
            const mapObj = {};
            const srcObj = {};
            result.mappings.forEach((m) => {
              if (!m || !m.templateKey || !m.matchedHeader) return;
              mapObj[m.templateKey] = m.matchedHeader;
              srcObj[m.templateKey] = m.source || "ai";
            });
            newMappingsByTemplate[tKey] = { mapping: mapObj, mappingSrc: srcObj };
          }
        });

        setMappingsByTemplate((prev) => ({ ...prev, ...newMappingsByTemplate }));

        // Select first detected template and load its mappings
        const primaryKey = dKeys[0];
        if (templatesByKey[primaryKey]) {
          setSelectedTemplateKey(primaryKey);

          const stored = newMappingsByTemplate[primaryKey] || {};
          setMapping(stored.mapping || {});
          setMappingSrc(stored.mappingSrc || {});

          // Reset previews because mappings changed
          setPreviewByTemplate({});
          setGrid([]);
          setRawRows([]);
          setRowErrors({});
          setEditing({});
          setAiSummary(emptyAiSummary());
        }
      } else if (data.detectedTemplateKey) {
        const newKey = data.detectedTemplateKey;
        if (templatesByKey[newKey]) {
          setSelectedTemplateKey(newKey);
          setPreviewByTemplate({});
          setGrid([]);
          setRawRows([]);
          setRowErrors({});
          setEditing({});
          setAiSummary(emptyAiSummary());
        }
      }

      if (data.aiUsage) {
        setAiSummary((prev) => ({
          totalPromptTokens: (prev.totalPromptTokens || 0) + (data.aiUsage.promptTokens || 0),
          totalCompletionTokens:
            (prev.totalCompletionTokens || 0) + (data.aiUsage.completionTokens || 0),
          totalEstimatedCost:
            (prev.totalEstimatedCost || 0) + (data.aiUsage.estimatedCost || 0),
        }));
      }
    } catch (e) {
      console.error(e);
      setError("AI detection failed. Check /api/import/ai/detect-and-map.");
    } finally {
      setAiDetectBusy(false);
    }
  };

  const toggleIgnoreRequirement = useCallback((templateKey, fieldKey, shouldIgnore) => {
    setIgnoredRequirements((prev) => {
      const next = { ...prev };
      if (!next[templateKey]) {
        next[templateKey] = {};
      }

      if (shouldIgnore) {
        next[templateKey][fieldKey] = true;
        // Keep the mapping - user may still want to see which header was selected
        // even if they're opting for manual entry
      } else {
        delete next[templateKey][fieldKey];
        if (Object.keys(next[templateKey]).length === 0) {
          delete next[templateKey];
        }
      }

      return next;
    });
  }, [selectedTemplateKey]);

  /* ---------- Template selector banner ---------- */

  /* ---------- Template selector banner ---------- */

  // Tier-1 normalisation smash — mirrors the backend normalise_header_string
  const normaliseHeader = (s) => (s || "").toLowerCase().replace(/[^a-z0-9]/g, "");

  const autoMapTemplate = (tKey, currentMap = {}) => {
    const t = templatesByKey[tKey];
    if (!t || !t.fields || !csvHeaders.length) return { mapping: currentMap, mappingSrc: {} };

    const newMap = { ...currentMap };
    const newSrc = {};

    // Pre-compute normalised CSV headers
    const normHeaders = csvHeaders.map(h => ({ orig: h, norm: normaliseHeader(h) }));
    const usedOrig = new Set(Object.values(newMap).filter(Boolean));

    t.fields.forEach(f => {
      if (newMap[f.key]) return; // already mapped

      const fLabelNorm = normaliseHeader(f.label);
      const fKeyNorm = normaliseHeader(f.key);

      // T1: Normalisation smash — exact match after stripping all formatting
      let match = normHeaders.find(
        h => !usedOrig.has(h.orig) && (h.norm === fLabelNorm || h.norm === fKeyNorm)
      );

      // Fallback: substring containment (client-side only, no DB access)
      if (!match) {
        match = normHeaders.find(
          h => !usedOrig.has(h.orig) && (h.norm.includes(fLabelNorm) || fLabelNorm.includes(h.norm))
        );
      }

      if (match) {
        newMap[f.key] = match.orig;
        newSrc[f.key] = "T1-auto";
        usedOrig.add(match.orig);
      }
    });

    return { mapping: newMap, mappingSrc: newSrc };
  };

  const addTemplate = (key) => {
    if (!key) return;

    // Auto-map immediately upon adding
    const { mapping: autoMap, mappingSrc: autoSrc } = autoMapTemplate(key);

    if (!detectedTemplateKeys.includes(key)) {
      setDetectedTemplateKeys((prev) => [...prev, key]);
    }

    // Save the auto-mapping to state
    setMappingsByTemplate(prev => ({
      ...prev,
      [key]: {
        mapping: autoMap,
        mappingSrc: autoSrc
      }
    }));

    // Switch to it
    setSelectedTemplateKey(key);
    // Load state explicitly (though we just set it in mappingsByTemplate, loadTemplateState reads from it)
    // Actually loadTemplateState might overwrite if we don't handle it carefully.
    // Let's just set local state directly here to ensure it sticks.
    setMapping(autoMap);
    setMappingSrc(autoSrc);

    // Reset previews
    setPreviewByTemplate(prev => {
      const copy = { ...prev };
      delete copy[key];
      return copy;
    });
    setGrid([]);
    setRawRows([]);
    setRowErrors({});
    setEditing({});
    setAiSummary(emptyAiSummary());
  };

  /* ---------- Steps ---------- */

  /* ---------- Steps ---------- */




  const handleResetData = async () => {
    if (!window.confirm(`WARNING: This will delete ALL data (records, jobs, uploads) for tenant '${selectedTenantId}'.\n\nThis cannot be undone. Are you sure?`)) {
      return;
    }

    const pwd = window.prompt("To confirm, please type 'secret-reset':");
    if (pwd !== "secret-reset") {
      if (pwd) alert("Incorrect confirmation code.");
      return;
    }

    try {
      setBusy(true);
      const res = await fetch(`${API_BASE}/admin/reset-data?tenantId=${selectedTenantId}&password=${pwd}`, {
        method: "DELETE"
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "Reset failed");

      alert(`Reset Complete for ${selectedTenantId}.\n\nDeleted:\n- Tenant Data: ${data.deleted?.tenant_data}\n- Jobs: ${data.deleted?.jobs}\n- Records: ${data.deleted?.records}`);

      // Reset local state
      resetImportState();

    } catch (e) {
      console.error(e);
      alert("Reset Error: " + e.message);
    } finally {
      setBusy(false);
    }
  };

  /* ---------- Render ---------- */

  const importView = (
    <Fragment>
      {step === 1 && (
        <Step1Upload
          fileName={fileName}
          csvHeaders={csvHeaders}
          error={error}
          busy={busy}
          onFileSelect={handleFiles}
          onNext={() => setStep(2)}
          onCancel={() => window.location.reload()}
        />
      )}

      {step === 2 && (
        <Step2Map
          tpl={tpl}
          tplNotEmpty={tplNotEmpty}
          csvHeaders={csvHeaders}
          mapping={mapping}
          mappingSrc={mappingSrc}
          setMapping={setMapping}
          setMappingSrc={setMappingSrc}
          ignoredRequirements={ignoredRequirements}
          setIgnoredRequirements={setIgnoredRequirements}
          mappingsByTemplate={mappingsByTemplate}
          setMappingsByTemplate={setMappingsByTemplate}
          headerAiBusy={headerAiBusy}
          aiDetectBusy={aiDetectBusy}

          handleAiMapHeaders={handleAiMapHeaders}
          toggleIgnoreRequirement={toggleIgnoreRequirement}
          mappingComplete={allDetectedTemplatesComplete}
          onBack={() => setStep(1)}
          onNext={goToValues}
          error={error}
          templatesByKey={templatesByKey}
          detectedTemplateKeys={detectedTemplateKeys}
          selectedTemplateKey={selectedTemplateKey}
          allowMultiTemplates={allowMultiTemplates}
          setAllowMultiTemplates={setAllowMultiTemplates}
          handleAiDetectAndMap={handleAiDetectAndMap}
          addTemplate={addTemplate}
          loadTemplateState={loadTemplateState}
          removeTemplate={removeTemplate}
          isTemplateComplete={isTemplateComplete}
          step={step}
        />
      )}

      {step === 3 && (
        <Step3Preview
          tpl={tpl}
          tplNotEmpty={tplNotEmpty}
          grid={grid}
          rowErrors={rowErrors}
          previewPage={previewPage}
          setPreviewPage={setPreviewPage}
          PREVIEW_PAGE_SIZE={PREVIEW_PAGE_SIZE}
          startEdit={startEdit}
          updateEdit={updateEdit}
          commitEdit={commitEdit}
          editing={editing}
          onBack={() => {
            saveCurrentTemplateState();
            setStep(2);
          }}
          onNext={saveSuccess ? confirmImport : handleAsyncIngestion}
          allTemplatesValid={allDetectedTemplatesComplete}
          gridHasBad={gridHasBad}
          saveBusy={saveBusy}
          error={error}
          templatesByKey={templatesByKey}
          detectedTemplateKeys={detectedTemplateKeys}
          selectedTemplateKey={selectedTemplateKey}
          allowMultiTemplates={allowMultiTemplates}
          setAllowMultiTemplates={setAllowMultiTemplates}
          handleAiDetectAndMap={handleAiDetectAndMap}
          addTemplate={addTemplate}
          loadTemplateState={loadTemplateState}
          removeTemplate={removeTemplate}
          isTemplateComplete={isTemplateComplete}
          step={step}
          csvHeaders={csvHeaders}
          headerAiBusy={headerAiBusy}
          aiDetectBusy={aiDetectBusy}
          cleanBusy={busy}
          aiCleanAll={aiCleanAll}
          includePii={includePiiInAi}
          setIncludePii={setIncludePiiInAi}
          ensureNoEmpty={fillMissing}
          setEnsureNoEmpty={setFillMissing}
          cleanValidValues={cleanValidValues}
          setCleanValidValues={setCleanValidValues}
        />
      )}

      {step === 4 && (
        <Step4Process
          processingSummary={processingSummary}
          onReset={() => {
            resetImportState();
            setStep(1);
          }}
          activeJobId={activeJobId}
          showTechnicalDetails={showTechnicalDetails}
          setShowTechnicalDetails={setShowTechnicalDetails}
        />
      )}
    </Fragment>
  );

  const tabTitles = {
    import: "Import Data",
    history: "Ingestion History",
    search: "Search Data",
    templates: "Template Builder",
    webhooks: "Webhook Settings",
    apikeys: "API Keys",
    audit: "Audit Logs",
    docs: "API Documentation",
    graphql: "GraphQL Playground",
    users: "User Management",
  };

  const handleQuickLogin = () => {
    // In this auto-login POC, we just refresh or simulate a login
    window.localStorage.setItem("user-id", DEFAULT_USER_ID);
    window.location.reload();
  };


  if (loading) return null;

  return (
    <>
      <Global />
      <Shell>
        <SideNav>
          <RoleGate requiredRole="EDITOR" tenantId={selectedTenantId}>
            <NavIcon
              active={currentTab === "import"}
              onClick={() => setCurrentTab("import")}
              title="Import Tool"
            >
              ⇪
            </NavIcon>
          </RoleGate>
          <NavIcon
            active={currentTab === "history"}
            onClick={() => setCurrentTab("history")}
            title="Job History"
          >
            🕒
          </NavIcon>
          <NavIcon
            active={currentTab === "search"}
            onClick={() => setCurrentTab("search")}
            title="Search Data"
          >
            🔍
          </NavIcon>
          <RoleGate requiredRole="ADMIN" tenantId={selectedTenantId}>
            <NavIcon
              active={currentTab === "templates"}
              onClick={() => setCurrentTab("templates")}
              title="Templates"
            >
              ⚙️
            </NavIcon>
            <NavIcon
              active={currentTab === "webhooks"}
              onClick={() => setCurrentTab("webhooks")}
              title="Webhooks"
            >
              🔗
            </NavIcon>
            <NavIcon
              active={currentTab === "apikeys"}
              onClick={() => setCurrentTab("apikeys")}
              title="API Keys"
            >
              🔑
            </NavIcon>
            <NavIcon
              active={currentTab === "audit"}
              onClick={() => setCurrentTab("audit")}
              title="Audit Logs"
            >
              📋
            </NavIcon>
            <NavIcon
              active={currentTab === "docs"}
              onClick={() => setCurrentTab("docs")}
              title="API Documentation"
            >
              📚
            </NavIcon>
            <NavIcon
              active={currentTab === "graphql"}
              onClick={() => setCurrentTab("graphql")}
              title="GraphQL Playground"
            >
              ⬡
            </NavIcon>
            <NavIcon
              active={currentTab === "users"}
              onClick={() => setCurrentTab("users")}
              title="User Management"
            >
              👥
            </NavIcon>
          </RoleGate>
        </SideNav>
        <Main>
          <Header>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <LogoDot>A</LogoDot>
              <div style={{ fontSize: 18, fontWeight: 700, color: "#1e293b" }}>
                {tabTitles[currentTab] || "Admin Centre"}
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              {isAdmin(selectedTenantId) && (
                <IconButton
                  variant="danger"
                  onClick={handleResetData}
                  title="Reset Global Data"
                >
                  🗑️
                </IconButton>
              )}

              <TenantSelector
                selectedTenantId={selectedTenantId}
                onTenantChange={handleTenantChange}
                tenants={tenants}
                isLoading={isTenantLoading}
              />

              {user ? (
                <UserProfile onClick={() => setProfileOpen(!profileOpen)}>
                  <UserAvatar>
                    {user.picture ? (
                      <img
                        src={user.picture}
                        alt={user.name}
                        style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }}
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <span>{user.name?.[0] || "U"}</span>
                    )}
                  </UserAvatar>
                  <ProfileInfo>
                    <span>{user.name}</span>
                    <span>{getRoleForTenant(selectedTenantId)}{user.isSuperAdmin ? ' ★' : ''}</span>
                  </ProfileInfo>
                  <span style={{ fontSize: 10, color: "#94a3b8" }}>▼</span>

                  {profileOpen && (
                    <DropdownMenu onClick={(e) => e.stopPropagation()}>
                      {user.email && (
                        <DropdownItem style={{ cursor: 'default', opacity: 0.7, fontSize: 12 }}>
                          {user.email}
                        </DropdownItem>
                      )}
                      <DropdownItem onClick={logout} variant="danger">
                        Logout
                      </DropdownItem>
                    </DropdownMenu>
                  )}
                </UserProfile>
              ) : (
                <Btn
                  variant="primary"
                  onClick={handleQuickLogin}
                  style={{ minWidth: 80, height: 36 }}
                >
                  Login
                </Btn>
              )}
            </div>
          </Header>
          <Content>
            {/* Persistent Views */}
            <div style={{ display: currentTab === "import" ? "flex" : "none", flex: 1, overflow: "hidden", flexDirection: "column" }}>
              {importView}

            </div>

            {currentTab === "history" && (
              <div style={{ display: "flex", flex: 1, overflowY: "auto", flexDirection: "column" }}>
                <JobHistory key={selectedTenantId} tenantId={selectedTenantId} />
              </div>
            )}

            <div style={{ display: currentTab === "search" ? "flex" : "none", flex: 1, overflow: "hidden", flexDirection: "column" }}>
              <SearchDashboard key={selectedTenantId} tenantId={selectedTenantId} active={currentTab === "search"} templates={Object.values(templatesByKey)} />
            </div>

            {currentTab === "templates" && (
              <div style={{ display: "flex", flex: 1, overflow: "hidden", flexDirection: "column", minHeight: 0, height: '100%' }}>
                <TemplateBuilder key={selectedTenantId} tenantId={selectedTenantId} onUpdate={() => fetchTemplates(selectedTenantId)} />
              </div>
            )}

            {currentTab === "webhooks" && (
              <div style={{ display: "flex", flex: 1, overflowY: "auto", flexDirection: "column" }}>
                <WebhookSettings key={selectedTenantId} tenantId={selectedTenantId} />
              </div>
            )}

            {currentTab === "apikeys" && (
              <div style={{ display: "flex", flex: 1, overflowY: "auto", flexDirection: "column" }}>
                <ApiKeys key={selectedTenantId} tenantId={selectedTenantId} />
              </div>
            )}

            {currentTab === "audit" && (
              <div style={{ display: "flex", flex: 1, overflowY: "auto", flexDirection: "column" }}>
                <AuditLogs key={selectedTenantId} tenantId={selectedTenantId} />
              </div>
            )}

            {currentTab === "docs" && (
              <div style={{ display: "flex", flex: 1, overflowY: "auto", flexDirection: "column", height: "100%" }}>
                <ApiDocs key={selectedTenantId} tenantId={selectedTenantId} />
              </div>
            )}

            {currentTab === "graphql" && (
              <div style={{ display: "flex", flex: 1, overflowY: "auto", flexDirection: "column", height: "100%" }}>
                <GraphQLPlayground key={selectedTenantId} tenantId={selectedTenantId} />
              </div>
            )}

            {currentTab === "users" && (
              <div style={{ display: "flex", flex: 1, overflowY: "auto", flexDirection: "column" }}>
                <UserManagement key={selectedTenantId} tenantId={selectedTenantId} />
              </div>
            )}
          </Content>
        </Main>
      </Shell>
      {isTenantLoading && <Spinner overlay={true} />} {/* Global overlay spinner */}
    </>
  );
}
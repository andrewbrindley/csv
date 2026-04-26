import React, { useEffect, useState, useCallback } from "react";
import styled from "styled-components";
import { API_BASE } from "../config";
import { useUser } from "./UserContext";
import { Table, Th, Td } from "../styles";

const Wrap = styled.div`
  margin-top: 8px;
  margin-bottom: 24px;
  border: 1px solid var(--border, #e2e8f0);
  border-radius: 10px;
  overflow: hidden;
  background: var(--surface, #fff);
`;

const Header = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 16px;
  background: var(--bg, #fff7f7);
  border-bottom: 1px solid var(--border, #fee2e2);
`;

const Title = styled.div`
  font-size: 14px;
  font-weight: 700;
  color: #991b1b;
  display: flex;
  align-items: center;
  gap: 10px;
`;

const Count = styled.span`
  background: #fee2e2;
  color: #991b1b;
  font-weight: 700;
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 10px;
`;

const ErrorText = styled.div`
  color: #b91c1c;
  font-size: 12px;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 520px;
`;

const Scroll = styled.div`
  overflow-x: auto;
`;

const Empty = styled.div`
  padding: 16px;
  font-size: 13px;
  color: #64748b;
`;

export default function FailedRecordsTable({ tenantId, jobId, expectedCount = 0 }) {
  const { authFetch } = useUser();
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchFailed = useCallback(() => {
    if (!jobId) return;
    setLoading(true);
    setError(null);
    authFetch(
      `${API_BASE}/jobs/${jobId}/records?status=error&tenantId=${encodeURIComponent(tenantId)}`
    )
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((json) => setRecords(json.records || []))
      .catch((e) => setError(e.message || "Failed to load"))
      .finally(() => setLoading(false));
  }, [jobId, tenantId, authFetch]);

  useEffect(() => {
    fetchFailed();
  }, [fetchFailed]);

  if (loading && !records.length && expectedCount === 0) return null;
  if (!loading && !records.length && expectedCount === 0) return null;

  const dataKeys = Array.from(
    new Set(
      records.flatMap((r) =>
        Object.keys(r.data || {}).filter(
          (k) => !k.startsWith("__") && !k.startsWith("_parent")
        )
      )
    )
  ).slice(0, 6);

  const handleDownload = () => {
    window.open(
      `${API_BASE}/jobs/${jobId}/export-errors?tenantId=${encodeURIComponent(tenantId)}`,
      "_blank"
    );
  };

  return (
    <Wrap>
      <Header>
        <Title>
          Failed Records
          <Count>{records.length || expectedCount}</Count>
        </Title>
        <button
          onClick={handleDownload}
          style={{
            background: "transparent",
            border: "1px solid var(--border, #e2e8f0)",
            padding: "6px 12px",
            borderRadius: 6,
            fontSize: 12,
            cursor: "pointer",
            color: "var(--fg, #0f172a)",
          }}
        >
          Download CSV
        </button>
      </Header>

      {loading ? (
        <Empty>Loading failed records…</Empty>
      ) : error ? (
        <Empty style={{ color: "#b91c1c" }}>Could not load failed records: {error}</Empty>
      ) : !records.length ? (
        <Empty>No failed records returned by the server.</Empty>
      ) : (
        <Scroll>
          <Table>
            <thead>
              <tr>
                <Th style={{ width: 60 }}>Row</Th>
                <Th style={{ width: 110 }}>Template</Th>
                <Th style={{ minWidth: 280 }}>Error</Th>
                {dataKeys.map((k) => (
                  <Th key={k}>{k}</Th>
                ))}
              </tr>
            </thead>
            <tbody>
              {records.map((r) => (
                <tr key={r._id || r.rowIndex}>
                  <Td style={{ fontWeight: 600 }}>{r.rowIndex ?? "—"}</Td>
                  <Td style={{ fontSize: 12 }}>{r.templateKey || "—"}</Td>
                  <Td>
                    <ErrorText title={r.error || ""}>{r.error || "—"}</ErrorText>
                  </Td>
                  {dataKeys.map((k) => (
                    <Td key={k} style={{ fontSize: 12, maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis" }}>
                      {(() => {
                        const v = (r.data || {})[k];
                        if (v === null || v === undefined) return "";
                        if (typeof v === "object") return v.label || v.id || JSON.stringify(v);
                        return String(v);
                      })()}
                    </Td>
                  ))}
                </tr>
              ))}
            </tbody>
          </Table>
        </Scroll>
      )}
    </Wrap>
  );
}

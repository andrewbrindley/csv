import React, { useState, useEffect, useCallback } from "react";
import { useUser } from "./UserContext";
import styled from "styled-components";
import { API_BASE } from "../config";
import { SectionTitle, Btn, Table, Th, Td } from "../styles";

const DataGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 16px;
  margin-top: 16px;
`;

const DataCard = styled.div`
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 12px;
  font-size: 12px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
`;

const CardHeader = styled.div`
  display: flex;
  justify-content: space-between;
  margin-bottom: 8px;
  border-bottom: 1px solid #f1f5f9;
  padding-bottom: 4px;
`;

const TemplateBadge = styled.span`
  background: #e0f2fe;
  color: #0369a1;
  padding: 2px 6px;
  border-radius: 4px;
  font-weight: 600;
  font-size: 10px;
`;

const OperationBadge = styled.span`
  background: ${props => props.operation === 'created' ? '#d1fae5' : '#dbeafe'};
  color: ${props => props.operation === 'created' ? '#065f46' : '#1e40af'};
  padding: 2px 6px;
  border-radius: 4px;
  font-weight: 600;
  font-size: 9px;
  text-transform: uppercase;
`;

const Timestamp = styled.span`
  color: #94a3b8;
  font-size: 10px;
`;

const TemplateSectionHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 0 8px 0;
  margin-top: 20px;
  border-bottom: 2px solid #e2e8f0;
  margin-bottom: 0;
`;

const TemplateLabel = styled.div`
  font-size: 14px;
  font-weight: 700;
  color: #1e293b;
`;

const RecordCount = styled.span`
  font-size: 11px;
  color: #64748b;
  background: #f1f5f9;
  padding: 2px 7px;
  border-radius: 10px;
`;

// Render one table for one template's records
function TemplateTable({ templateKey, records }) {
    // Build column list from union of all keys in this group
    const allKeys = Array.from(
        new Set(records.flatMap(r => Object.keys(r.data || {}).filter(k => !k.startsWith("__") && !k.startsWith("_parent"))))
    );

    const formatVal = (val) => {
        if (val === null || val === undefined) return "";
        if (typeof val === "object") {
            if (val.label) return val.label;
            if (val.id) return val.id;
            return JSON.stringify(val);
        }
        return String(val);
    };

    return (
        <div style={{ overflowX: "auto", marginBottom: 24 }}>
            <Table>
                <thead>
                    <tr>
                        <Th style={{ width: 60 }}>Op</Th>
                        <Th style={{ width: 130 }}>Timestamp</Th>
                        {allKeys.map(key => <Th key={key}>{key}</Th>)}
                    </tr>
                </thead>
                <tbody>
                    {records.map((item) => (
                        <tr key={item.id}>
                            <Td>
                                {item.__operation && (
                                    <OperationBadge operation={item.__operation}>
                                        {item.__operation === 'created' ? 'New' : 'Edit'}
                                    </OperationBadge>
                                )}
                            </Td>
                            <Td style={{ fontSize: 11, color: "#64748b", whiteSpace: "nowrap" }}>
                                {new Date(item.timestamp).toLocaleString()}
                            </Td>
                            {allKeys.map(key => (
                                <Td key={key} style={{ fontSize: 12 }}>
                                    {formatVal((item.data || {})[key])}
                                </Td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </Table>
        </div>
    );
}


export default function SavedDataViewer({ tenantId, jobId }) {
    const { authFetch } = useUser();
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [viewMode, setViewMode] = useState("card"); // "card" | "table"
    const [activeTab, setActiveTab] = useState(null);
    const [page, setPage] = useState(1);
    const PAGE_SIZE = 50;

    const fetchData = useCallback(() => {
        setLoading(true);
        let url = `${API_BASE}/data?tenantId=${tenantId}`;
        if (jobId) url += `&jobId=${jobId}`;

        authFetch(url)
            .then((res) => res.json())
            .then((json) => {
                setData(json.data || []);
            })
            .catch((err) => console.error("Failed to fetch data:", err))
            .finally(() => setLoading(false));
    }, [tenantId, jobId, authFetch]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    if (loading && !data.length) return <div>Loading saved data...</div>;
    if (!data.length) {
        return (
            <div style={{ color: "#94a3b8", fontSize: "13px", marginTop: "16px" }}>
                {jobId ? "No records found processed by this job." : "No data saved for this tenant yet."}
            </div>
        );
    }

    const groupedByTemplate = data.reduce((acc, item) => {
        const tpl = item.templateKey || "Unknown";
        if (!acc[tpl]) acc[tpl] = [];
        acc[tpl].push(item);
        return acc;
    }, {});
    const templateKeys = Object.keys(groupedByTemplate);
    // Default activeTab to first template key once data loads
    const currentTab = activeTab && groupedByTemplate[activeTab] ? activeTab : templateKeys[0];

    // For card/table pagination we still page the flat list
    const pagedData = data.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

    return (
        <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <label style={{ fontSize: 13, display: "flex", alignItems: "center", gap: 6, cursor: "pointer", userSelect: "none" }}>
                        <input
                            type="checkbox"
                            checked={viewMode === "table"}
                            onChange={(e) => { setViewMode(e.target.checked ? "table" : "card"); setPage(1); }}
                        />
                        Table View
                    </label>
                </div>
            </div>

            {viewMode === "table" ? (
                /* ── TABLE MODE: tabbed per template ── */
                <div>
                    {/* Tab Bar */}
                    <div style={{ display: 'flex', gap: 4, borderBottom: '2px solid #e2e8f0', marginBottom: 0, marginTop: 16 }}>
                        {templateKeys.map(tplKey => (
                            <button
                                key={tplKey}
                                onClick={() => setActiveTab(tplKey)}
                                style={{
                                    padding: '8px 16px',
                                    border: 'none',
                                    borderBottom: currentTab === tplKey ? '2px solid #2563eb' : '2px solid transparent',
                                    marginBottom: '-2px',
                                    background: 'none',
                                    cursor: 'pointer',
                                    fontWeight: currentTab === tplKey ? 700 : 500,
                                    color: currentTab === tplKey ? '#2563eb' : '#64748b',
                                    fontSize: 13,
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 6,
                                    transition: 'color 0.15s',
                                }}
                            >
                                {tplKey}
                                <span style={{
                                    background: currentTab === tplKey ? '#dbeafe' : '#f1f5f9',
                                    color: currentTab === tplKey ? '#1d4ed8' : '#64748b',
                                    borderRadius: 10, padding: '1px 7px', fontSize: 11, fontWeight: 600
                                }}>
                                    {groupedByTemplate[tplKey].length}
                                </span>
                            </button>
                        ))}
                    </div>
                    {/* Active Tab Table */}
                    {currentTab && (
                        <TemplateTable
                            key={currentTab}
                            templateKey={currentTab}
                            records={groupedByTemplate[currentTab]}
                        />
                    )}
                </div>
            ) : (
                /* ── CARD MODE: paginated flat list ── */
                <>
                    {data.length > PAGE_SIZE && (
                        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, margin: "12px 0" }}>
                            <Btn variant="secondary" disabled={page === 1} onClick={() => setPage(p => Math.max(1, p - 1))} style={{ padding: "4px 8px", fontSize: 11 }}>
                                &larr; Prev
                            </Btn>
                            <span style={{ fontSize: 12, lineHeight: "24px" }}>
                                Page {page} of {Math.ceil(data.length / PAGE_SIZE)}
                            </span>
                            <Btn variant="secondary" disabled={page >= Math.ceil(data.length / PAGE_SIZE)} onClick={() => setPage(p => p + 1)} style={{ padding: "4px 8px", fontSize: 11 }}>
                                Next &rarr;
                            </Btn>
                        </div>
                    )}
                    <DataGrid>
                        {pagedData.map((item) => (
                            <DataCard key={item.id}>
                                <CardHeader>
                                    <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                                        <TemplateBadge>{item.templateKey}</TemplateBadge>
                                        {item.__operation && (
                                            <OperationBadge operation={item.__operation}>
                                                {item.__operation === 'created' ? 'New' : 'Edit'}
                                            </OperationBadge>
                                        )}
                                    </div>
                                    <Timestamp>{new Date(item.timestamp).toLocaleString()}</Timestamp>
                                </CardHeader>
                                <div style={{ display: "grid", gridTemplateColumns: "1fr 1.5fr", gap: "4px" }}>
                                    {Object.entries(item.data).filter(([k]) => !k.startsWith("__") && !k.startsWith("_parent")).map(([key, val]) => {
                                        let displayVal = String(val);
                                        if (typeof val === "object" && val !== null) {
                                            if (val.label) displayVal = val.label;
                                            else if (val.id) displayVal = val.id;
                                            else displayVal = JSON.stringify(val);
                                        }
                                        return (
                                            <React.Fragment key={key}>
                                                <div style={{ fontWeight: 600, color: "#64748b" }}>{key}:</div>
                                                <div style={{ color: "#334155", overflow: "hidden", textOverflow: "ellipsis" }}>{displayVal}</div>
                                            </React.Fragment>
                                        );
                                    })}
                                </div>
                            </DataCard>
                        ))}
                    </DataGrid>
                </>
            )}
        </div>
    );
}

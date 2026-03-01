import React, { useState, useEffect, useCallback } from "react";
import styled from "styled-components";
import { API_BASE } from "../config";
import { useUser } from "./UserContext";
import { Btn, Card, SectionTitle, Table, Th, Td } from "../styles";
import Spinner from "./Spinner";

const DeleteBtn = styled.button`
  background: none;
  border: none;
  cursor: pointer;
  padding: 4px 6px;
  color: #ef4444;
  opacity: 0.65;
  font-size: 15px;
  border-radius: 4px;
  transition: opacity 0.15s, background 0.15s;
  &:hover { opacity: 1; background: #fee2e2; }
`;

const GroupHeader = styled.div`
  padding: 8px 16px;
  background: #f8fafc;
  border-bottom: 1px solid #e2e8f0;
  font-size: 12px;
  font-weight: 700;
  color: #475569;
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

const EmptyState = styled.div`
  padding: 48px 24px;
  text-align: center;
  color: #94a3b8;
  font-size: 14px;
  line-height: 1.6;
`;

export default function HeaderAliases({ tenantId }) {
    const { authFetch } = useUser();
    const [aliases, setAliases] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [deletingKey, setDeletingKey] = useState(null); // "tplKey:fieldKey:header"

    const fetchAliases = useCallback(() => {
        if (!tenantId) return;
        setLoading(true);
        setError(null);
        authFetch(`${API_BASE}/header-aliases?tenantId=${encodeURIComponent(tenantId)}`)
            .then(r => r.json())
            .then(data => {
                if (data.error) throw new Error(data.error);
                setAliases(data.aliases || []);
            })
            .catch(e => setError(e.message))
            .finally(() => setLoading(false));
    }, [tenantId, authFetch]);

    useEffect(() => { fetchAliases(); }, [fetchAliases]);

    const handleDelete = async (alias) => {
        const key = `${alias.templateKey}:${alias.fieldKey}:${alias.uploadedHeader}`;
        setDeletingKey(key);
        try {
            const res = await authFetch(`${API_BASE}/header-aliases`, {
                method: "DELETE",
                body: JSON.stringify({
                    tenantId,
                    templateKey: alias.templateKey,
                    fieldKey: alias.fieldKey,
                    uploadedHeader: alias.uploadedHeader,
                }),
            });
            const data = await res.json();
            if (data.error) throw new Error(data.error);
            setAliases(prev => prev.filter(a =>
                !(a.templateKey === alias.templateKey &&
                    a.fieldKey === alias.fieldKey &&
                    a.uploadedHeader === alias.uploadedHeader)
            ));
        } catch (e) {
            setError(e.message);
        } finally {
            setDeletingKey(null);
        }
    };

    // Group by templateKey
    const grouped = {};
    for (const a of aliases) {
        if (!grouped[a.templateKey]) grouped[a.templateKey] = [];
        grouped[a.templateKey].push(a);
    }

    return (
        <Card style={{ position: "relative" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <SectionTitle style={{ marginBottom: 0 }}>Header Memory (T2 Aliases)</SectionTitle>
                <Btn onClick={fetchAliases}>Refresh</Btn>
            </div>

            {loading && <Spinner />}

            {error && (
                <div style={{ padding: 12, background: "#fee2e2", color: "#991b1b", borderRadius: 6, marginBottom: 16 }}>
                    {error}
                </div>
            )}

            {!loading && aliases.length === 0 && (
                <EmptyState>
                    <div style={{ fontSize: 32, marginBottom: 12 }}>🧠</div>
                    <div><strong>No header aliases yet.</strong></div>
                    <div style={{ marginTop: 6, color: "#94a3b8" }}>
                        Aliases are saved automatically each time you complete an import.<br />
                        They allow the system to recognise your column names in future uploads.
                    </div>
                </EmptyState>
            )}

            {!loading && aliases.length > 0 && (
                <div style={{ border: "1px solid #e2e8f0", borderRadius: 8, overflow: "hidden" }}>
                    {Object.entries(grouped).map(([tplKey, items]) => (
                        <div key={tplKey}>
                            <GroupHeader>{tplKey}</GroupHeader>
                            <Table style={{ marginTop: 0 }}>
                                <thead>
                                    <tr>
                                        <Th>Field</Th>
                                        <Th>Recognised As</Th>
                                        <Th>Last Confirmed</Th>
                                        <Th style={{ width: 48 }}></Th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {items.map(alias => {
                                        const key = `${alias.templateKey}:${alias.fieldKey}:${alias.uploadedHeader}`;
                                        const isDeleting = deletingKey === key;
                                        return (
                                            <tr key={key}>
                                                <Td style={{ fontWeight: 500 }}>{alias.fieldKey}</Td>
                                                <Td>
                                                    <code style={{
                                                        background: "#f1f5f9",
                                                        padding: "2px 7px",
                                                        borderRadius: 4,
                                                        fontSize: 12,
                                                        color: "#334155",
                                                    }}>
                                                        {alias.uploadedHeader}
                                                    </code>
                                                </Td>
                                                <Td style={{ fontSize: 12, color: "#64748b" }}>
                                                    {alias.confirmedAt
                                                        ? new Date(alias.confirmedAt).toLocaleString()
                                                        : "—"}
                                                </Td>
                                                <Td>
                                                    <DeleteBtn
                                                        onClick={() => handleDelete(alias)}
                                                        disabled={isDeleting}
                                                        title="Remove this alias"
                                                    >
                                                        {isDeleting ? "…" : "🗑️"}
                                                    </DeleteBtn>
                                                </Td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </Table>
                        </div>
                    ))}
                    <div style={{ padding: "8px 16px", fontSize: 12, color: "#94a3b8", borderTop: "1px solid #f1f5f9" }}>
                        {aliases.length} alias{aliases.length !== 1 ? "es" : ""} saved for this tenant
                    </div>
                </div>
            )}
        </Card>
    );
}

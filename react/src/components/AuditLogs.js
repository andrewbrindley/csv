import React, { useState, useEffect } from "react";
import styled from "styled-components";
import { useUser } from "./UserContext";
import { API_BASE } from "../config";
import {
    Card,
    SectionTitle,
    Table,
    Th,
    Td,
    ErrorBanner,
    CodeBadge
} from "../styles";

import Spinner from "./Spinner";

export default function AuditLogs({ tenantId }) {
    const { authFetch } = useUser();
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        fetchLogs();
    }, [tenantId]);

    const fetchLogs = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await authFetch(`${API_BASE}/audit-logs?tenantId=${tenantId}&limit=100`);
            if (!res.ok) throw new Error("Failed to fetch audit logs");
            const data = await res.json();
            setLogs(data.logs || []);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ padding: 20 }}>
            <Card>
                <SectionTitle>Audit Logs</SectionTitle>
                <p style={{ color: "#64748b", margin: "0 0 20px 0" }}>
                    History of critical actions performed in the <strong>{tenantId}</strong> tenant.
                </p>

                {error && <ErrorBanner>{error}</ErrorBanner>}

                <div style={{ position: "relative", minHeight: 200 }}>
                    {loading && <Spinner />}
                    {!loading && logs.length === 0 ? (
                        <div style={{ textAlign: "center", padding: 40, color: "#64748b" }}>
                            No audit logs recorded yet.
                        </div>
                    ) : (
                        <Table>
                            <thead>
                                <tr>
                                    <Th>Timestamp</Th>
                                    <Th>User ID</Th>
                                    <Th>Action</Th>
                                    <Th>Target ID</Th>
                                    <Th>Details</Th>
                                </tr>
                            </thead>
                            <tbody>
                                {logs.map((log) => (
                                    <tr key={log._id}>
                                        <Td style={{ whiteSpace: "nowrap" }}>{new Date(log.timestamp).toLocaleString()}</Td>
                                        <Td>{log.userId}</Td>
                                        <Td><strong>{log.action}</strong></Td>
                                        <Td>{log.targetId ? <CodeBadge>{log.targetId}</CodeBadge> : "-"}</Td>
                                        <Td style={{ fontSize: 12, color: "#475569" }}>
                                            {JSON.stringify(log.details)}
                                        </Td>
                                    </tr>
                                ))}
                            </tbody>
                        </Table>
                    )}
                </div>
            </Card>
        </div>
    );
}

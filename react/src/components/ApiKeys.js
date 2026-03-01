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
    Btn,
    Row,
    ErrorBanner,
    CodeBadge
} from "../styles";

const Input = styled.input`
  width: 100%;
  padding: 7px 10px;
  font-size: 13px;
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  outline: none;
  &:focus { border-color: #2563eb; box-shadow: 0 0 0 2px #dbeafe; }
`;

const WarningBox = styled.div`
  background: #fff3cd;
  color: #856404;
  padding: 12px;
  border-radius: 4px;
  border: 1px solid #ffeeba;
  margin-bottom: 20px;
`;

const KeyDisplay = styled.div`
  background: #f8f9fa;
  padding: 15px;
  border: 1px solid #dee2e6;
  border-radius: 4px;
  margin-top: 15px;
  word-break: break-all;
  font-family: monospace;
  font-size: 14px;
`;

export default function ApiKeys({ tenantId }) {
    const { authFetch } = useUser();
    const [keys, setKeys] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const [newKeyName, setNewKeyName] = useState("");
    const [creating, setCreating] = useState(false);
    const [generatedKey, setGeneratedKey] = useState(null);

    useEffect(() => {
        fetchKeys();
        setGeneratedKey(null); // Clear any generated key on tenant swap
        setNewKeyName("");
    }, [tenantId]);

    const fetchKeys = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await authFetch(`${API_BASE}/keys?tenantId=${tenantId}`);
            if (!res.ok) {
                const text = await res.text();
                throw new Error(`Failed to fetch API keys: Status ${res.status} - ${text}`);
            }
            const data = JSON.parse(await res.text() || "{}");
            setKeys(data.keys || []);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleCreate = async () => {
        if (!newKeyName.trim()) return;
        setCreating(true);
        setError(null);
        setGeneratedKey(null);

        try {
            const res = await authFetch(`${API_BASE}/keys`, {
                method: "POST",
                body: JSON.stringify({ tenantId, name: newKeyName.trim() })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Failed to create key");

            setGeneratedKey(data.key.rawKey);
            setNewKeyName("");
            fetchKeys();
        } catch (err) {
            setError(err.message);
        } finally {
            setCreating(false);
        }
    };

    const handleRevoke = async (keyId) => {
        if (!window.confirm("Are you sure you want to revoke this key? Any integrations using it will break instantly.")) {
            return;
        }

        try {
            const res = await authFetch(`${API_BASE}/keys/${keyId}?tenantId=${tenantId}`, {
                method: "DELETE"
            });
            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || "Failed to revoke key");
            }
            fetchKeys();
        } catch (err) {
            setError(err.message);
        }
    };

    return (
        <div style={{ padding: 20 }}>
            <Card>
                <SectionTitle>API Keys</SectionTitle>
                <p style={{ color: "#64748b", margin: "0 0 20px 0" }}>
                    Manage API keys for programmatic access to the <strong>{tenantId}</strong> tenant.
                </p>

                {error && <ErrorBanner>{error}</ErrorBanner>}

                <Row style={{ marginBottom: 20, gap: 10 }}>
                    <Input
                        type="text"
                        placeholder="Key Name (e.g. Production Jenkins)"
                        value={newKeyName}
                        onChange={(e) => setNewKeyName(e.target.value)}
                        style={{ width: 300 }}
                    />
                    <Btn variant="primary" onClick={handleCreate} disabled={creating || !newKeyName.trim()}>
                        {creating ? "Creating..." : "Generate New Key"}
                    </Btn>
                </Row>

                {generatedKey && (
                    <WarningBox>
                        <strong>Warning:</strong> This is your new API key. Please copy it now as it will not be shown again!
                        <KeyDisplay>{generatedKey}</KeyDisplay>
                    </WarningBox>
                )}

                {loading ? (
                    <div>Loading keys...</div>
                ) : keys.length === 0 ? (
                    <div style={{ padding: 20, textAlign: "center", color: "#64748b" }}>
                        No active API keys found.
                    </div>
                ) : (
                    <Table>
                        <thead>
                            <tr>
                                <Th>Name</Th>
                                <Th>Prefix</Th>
                                <Th>Created</Th>
                                <Th>Last Used</Th>
                                <Th style={{ width: 100 }}>Actions</Th>
                            </tr>
                        </thead>
                        <tbody>
                            {keys.map(k => (
                                <tr key={k._id}>
                                    <Td><strong>{k.name}</strong></Td>
                                    <Td><CodeBadge>{k.preview}</CodeBadge></Td>
                                    <Td>{new Date(k.createdAt).toLocaleDateString()}</Td>
                                    <Td>{k.lastUsedAt ? new Date(k.lastUsedAt).toLocaleString() : "Never"}</Td>
                                    <Td>
                                        <Btn variant="danger" onClick={() => handleRevoke(k._id)} style={{ padding: "4px 8px", fontSize: 12 }}>
                                            Revoke
                                        </Btn>
                                    </Td>
                                </tr>
                            ))}
                        </tbody>
                    </Table>
                )}
            </Card>
        </div>
    );
}

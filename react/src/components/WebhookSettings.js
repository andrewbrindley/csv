import React, { useState, useEffect, useCallback } from "react";
import { useUser } from "./UserContext";
import styled from "styled-components";
import { API_BASE } from "../config";
import { Btn, Card, SectionTitle, StatusBadge } from "../styles";
import Spinner from "./Spinner";

// ── Styled helpers ────────────────────────────────────────────────────────────

const Grid = styled.div`
  display: grid;
  gap: 12px;
`;

const WebhookCard = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 16px;
  padding: 16px 20px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  transition: box-shadow 0.15s;
  &:hover { box-shadow: 0 2px 8px rgba(0,0,0,0.07); }
`;

const WebhookMeta = styled.div`
  flex: 1;
  min-width: 0;
`;

const WebhookName = styled.div`
  font-weight: 600;
  font-size: 14px;
  color: #1e293b;
  margin-bottom: 2px;
`;

const WebhookUrl = styled.div`
  font-size: 12px;
  color: #64748b;
  font-family: monospace;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const TagRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin-top: 6px;
`;

const Tag = styled.span`
  background: #e0f2fe;
  color: #0369a1;
  border-radius: 4px;
  font-size: 11px;
  padding: 2px 7px;
  font-weight: 500;
`;

const OauthTag = styled(Tag)`
  background: #fef9c3;
  color: #854d0e;
`;

const Actions = styled.div`
  display: flex;
  gap: 6px;
  align-items: center;
  flex-shrink: 0;
`;

const FormPanel = styled.div`
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  padding: 24px;
  margin-top: 4px;
`;

const FormRow = styled.div`
  display: grid;
  grid-template-columns: 140px 1fr;
  align-items: flex-start;
  gap: 8px;
  margin-bottom: 14px;
`;

const Label = styled.label`
  font-size: 13px;
  font-weight: 500;
  color: #374151;
  padding-top: 7px;
`;

const Input = styled.input`
  width: 100%;
  padding: 7px 10px;
  font-size: 13px;
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  outline: none;
  &:focus { border-color: #2563eb; box-shadow: 0 0 0 2px #dbeafe; }
`;

const Toggle = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background: none;
  border: none;
  cursor: pointer;
  padding: 0;
  font-size: 13px;
  color: #374151;
  font-weight: 500;
`;

const TogglePill = styled.span`
  width: 38px;
  height: 22px;
  border-radius: 11px;
  background: ${p => p.on ? "#22c55e" : "#cbd5e1"};
  position: relative;
  transition: background 0.2s;
  flex-shrink: 0;
  &::after {
    content: "";
    position: absolute;
    top: 3px;
    left: ${p => p.on ? "19px" : "3px"};
    width: 16px;
    height: 16px;
    border-radius: 50%;
    background: #fff;
    transition: left 0.2s;
    box-shadow: 0 1px 3px rgba(0,0,0,0.2);
  }
`;

const CheckRow = styled.label`
  display: flex;
  align-items: center;
  gap: 7px;
  font-size: 13px;
  color: #374151;
  margin-bottom: 6px;
  cursor: pointer;
  user-select: none;
`;

const Collapsible = styled.div`
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  overflow: hidden;
  margin-top: 4px;
`;

const CollapseHeader = styled.button`
  width: 100%;
  text-align: left;
  background: #f8fafc;
  border: none;
  padding: 10px 14px;
  font-size: 13px;
  font-weight: 600;
  color: #374151;
  cursor: pointer;
  display: flex;
  justify-content: space-between;
  align-items: center;
  &:hover { background: #f1f5f9; }
`;

const CollapseBody = styled.div`
  padding: 16px;
  border-top: 1px solid #e2e8f0;
`;

const ErrMsg = styled.div`
  color: #ef4444;
  font-size: 12px;
  margin-top: 8px;
`;

// ── Constants ─────────────────────────────────────────────────────────────────



const EMPTY_FORM = {
    name: "",
    url: "",
    active: true,
    entityTypes: [],    // empty = all
    oauth: {
        enabled: false,
        tokenUrl: "",
        clientId: "",
        clientSecret: "",
        scope: "",
    },
};

// ── Component ─────────────────────────────────────────────────────────────────


export default function WebhookSettings({ tenantId }) {
    const { authFetch } = useUser();
    const [webhooks, setWebhooks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [formMode, setFormMode] = useState(null); // null | "create" | webhookId
    const [form, setForm] = useState(EMPTY_FORM);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);
    const [oauthOpen, setOauthOpen] = useState(false);
    const [allEntityTypes, setAllEntityTypes] = useState([]);
    const [testResult, setTestResult] = useState(null);

    // ── Fetch ────────────────────────────────────────────────────────────────────

    const fetchWebhooks = useCallback(() => {
        setLoading(true);
        authFetch(`${API_BASE}/webhooks?tenantId=${tenantId}`)
            .then(r => r.json())
            .then(data => setWebhooks(data.webhooks || []))
            .catch(err => console.error("Failed to fetch webhooks:", err))
            .finally(() => setLoading(false));
    }, [tenantId, authFetch]);

    useEffect(() => { fetchWebhooks(); }, [fetchWebhooks]);

    // Fetch all templates (system + custom) to build entity type list
    useEffect(() => {
        if (!tenantId) return;
        authFetch(`${API_BASE}/templates?tenantId=${tenantId}`)
            .then(r => r.json())
            .then(data => {
                const types = (data.templates || []).map(t => {
                    const key = t.templateKey || t.key || "";
                    const label = t.templateLabel || t.label || key;
                    return { key, label };
                }).filter(t => t.key);
                setAllEntityTypes(types);
            })
            .catch(err => console.error("Failed to fetch templates for webhooks:", err));
    }, [tenantId, authFetch]);

    // ── Form helpers ─────────────────────────────────────────────────────────────

    const openCreate = () => {
        setForm(EMPTY_FORM);
        setFormMode("create");
        setOauthOpen(false);
        setError(null);
    };

    const openEdit = (wh) => {
        setForm({
            name: wh.name || "",
            url: wh.url || "",
            active: wh.active !== false,
            entityTypes: wh.entityTypes || [],
            oauth: {
                enabled: !!(wh.oauth?.enabled),
                tokenUrl: wh.oauth?.tokenUrl || "",
                clientId: wh.oauth?.clientId || "",
                clientSecret: wh.oauth?.clientSecret || "",
                scope: wh.oauth?.scope || "",
            },
        });
        setFormMode(wh.webhookId);
        setOauthOpen(!!(wh.oauth?.enabled));
        setError(null);
    };

    const closeForm = () => {
        setFormMode(null);
        setError(null);
    };

    const setField = (k, v) => setForm(f => ({ ...f, [k]: v }));
    const setOauth = (k, v) => setForm(f => ({ ...f, oauth: { ...f.oauth, [k]: v } }));

    const toggleEntityType = (et) => {
        setForm(f => {
            const has = f.entityTypes.includes(et);
            return {
                ...f,
                entityTypes: has ? f.entityTypes.filter(x => x !== et) : [...f.entityTypes, et]
            };
        });
    };

    // ── Save ─────────────────────────────────────────────────────────────────────

    const handleSave = async () => {
        if (!form.url.trim()) { setError("URL is required."); return; }
        setSaving(true);
        setError(null);
        try {
            const body = { ...form, tenantId };
            if (formMode === "create") {
                const res = await authFetch(`${API_BASE}/webhooks`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(body),
                });
                if (!res.ok) throw new Error(await res.text());
            } else {
                const res = await authFetch(`${API_BASE}/webhooks/${formMode}`, {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(body),
                });
                if (!res.ok) throw new Error(await res.text());
            }
            closeForm();
            fetchWebhooks();
        } catch (e) {
            setError(e.message || "Save failed.");
        } finally {
            setSaving(false);
        }
    };

    // ── Toggle active shortcut ───────────────────────────────────────────────────

    const handleToggleActive = async (wh) => {
        await authFetch(`${API_BASE}/webhooks/${wh.webhookId}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ active: !wh.active }),
        });
        fetchWebhooks();
    };

    // ── Delete ───────────────────────────────────────────────────────────────────

    const handleDelete = async (webhookId) => {
        if (!window.confirm("Delete this webhook?")) return;
        await authFetch(`${API_BASE}/webhooks/${webhookId}`, { method: "DELETE" });
        fetchWebhooks();
    };

    // ── Test ─────────────────────────────────────────────────────────────────────

    const handleTest = async (wh) => {
        setTestResult({ id: wh.webhookId, msg: "Testing..." });
        try {
            const res = await authFetch(`${API_BASE}/webhooks/test`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ url: wh.url, tenantId })
            });
            const data = await res.json();
            if (data.success) {
                setTestResult({ id: wh.webhookId, msg: `Success! (${data.status_code})`, ok: true });
            } else {
                setTestResult({ id: wh.webhookId, msg: `Failed (${data.status_code}): ${data.response}`, ok: false });
            }
            setTimeout(() => setTestResult(null), 5000);
        } catch (e) {
            setTestResult({ id: wh.webhookId, msg: `Error: ${e.message}`, ok: false });
            setTimeout(() => setTestResult(null), 5000);
        }
    };

    // ── Render ───────────────────────────────────────────────────────────────────

    return (
        <Card style={{ position: "relative" }}>
            {loading && <Spinner />}

            <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", marginBottom: 8 }}>
                <Btn onClick={openCreate} disabled={formMode !== null}>+ Add Webhook</Btn>
            </div>

            {/* ── Create / Edit Form ── */}
            {formMode !== null && (
                <FormPanel>
                    <div style={{ fontWeight: 600, fontSize: 14, color: "#1e293b", marginBottom: 18 }}>
                        {formMode === "create" ? "New Webhook" : "Edit Webhook"}
                    </div>

                    <FormRow>
                        <Label>Name</Label>
                        <Input
                            placeholder="My Endpoint"
                            value={form.name}
                            onChange={e => setField("name", e.target.value)}
                        />
                    </FormRow>

                    <FormRow>
                        <Label>URL *</Label>
                        <Input
                            placeholder="https://your-server.com/hooks"
                            value={form.url}
                            onChange={e => setField("url", e.target.value)}
                        />
                    </FormRow>

                    <FormRow>
                        <Label>Entity Types</Label>
                        <div>
                            <div style={{ fontSize: 12, color: "#64748b", marginBottom: 6 }}>
                                Leave all unchecked to fire for every entity type.
                            </div>
                            {allEntityTypes.map(et => (
                                <CheckRow key={et.key}>
                                    <input
                                        type="checkbox"
                                        checked={form.entityTypes.includes(et.key)}
                                        onChange={() => toggleEntityType(et.key)}
                                    />
                                    {et.label}
                                </CheckRow>
                            ))}
                        </div>
                    </FormRow>

                    <FormRow>
                        <Label>Active</Label>
                        <Toggle type="button" onClick={() => setField("active", !form.active)}>
                            <TogglePill on={form.active} />
                            {form.active ? "Enabled" : "Disabled"}
                        </Toggle>
                    </FormRow>

                    {/* OAuth section */}
                    <div style={{ marginBottom: 14 }}>
                        <Collapsible>
                            <CollapseHeader onClick={() => setOauthOpen(o => !o)}>
                                <span>🔐 OAuth 2.0 (optional)</span>
                                <span style={{ fontSize: 11, color: "#64748b" }}>{oauthOpen ? "▲ hide" : "▼ show"}</span>
                            </CollapseHeader>
                            {oauthOpen && (
                                <CollapseBody>
                                    <CheckRow style={{ marginBottom: 14 }}>
                                        <input
                                            type="checkbox"
                                            checked={form.oauth.enabled}
                                            onChange={e => setOauth("enabled", e.target.checked)}
                                        />
                                        Enable OAuth 2.0 client credentials
                                    </CheckRow>
                                    {form.oauth.enabled && (
                                        <>
                                            <FormRow>
                                                <Label>Token URL</Label>
                                                <Input
                                                    placeholder="https://auth.example.com/token"
                                                    value={form.oauth.tokenUrl}
                                                    onChange={e => setOauth("tokenUrl", e.target.value)}
                                                />
                                            </FormRow>
                                            <FormRow>
                                                <Label>Client ID</Label>
                                                <Input
                                                    value={form.oauth.clientId}
                                                    onChange={e => setOauth("clientId", e.target.value)}
                                                />
                                            </FormRow>
                                            <FormRow>
                                                <Label>Client Secret</Label>
                                                <Input
                                                    type="password"
                                                    value={form.oauth.clientSecret}
                                                    onChange={e => setOauth("clientSecret", e.target.value)}
                                                />
                                            </FormRow>
                                            <FormRow>
                                                <Label>Scope</Label>
                                                <Input
                                                    placeholder="openid profile (optional)"
                                                    value={form.oauth.scope}
                                                    onChange={e => setOauth("scope", e.target.value)}
                                                />
                                            </FormRow>
                                        </>
                                    )}
                                </CollapseBody>
                            )}
                        </Collapsible>
                    </div>

                    {error && <ErrMsg>{error}</ErrMsg>}

                    <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 4 }}>
                        <Btn onClick={closeForm} style={{ background: "#f1f5f9", color: "#374151" }}>Cancel</Btn>
                        <Btn onClick={handleSave} disabled={saving}>
                            {saving ? "Saving…" : "Save Webhook"}
                        </Btn>
                    </div>
                </FormPanel>
            )}

            {/* ── Webhook List ── */}
            <Grid style={{ marginTop: formMode !== null ? 20 : 0 }}>
                {!loading && webhooks.length === 0 && (
                    <div style={{ textAlign: "center", color: "#94a3b8", padding: "32px 0", fontSize: 14 }}>
                        No webhooks configured yet. Click <strong>+ Add Webhook</strong> to get started.
                    </div>
                )}

                {webhooks.map(wh => (
                    <React.Fragment key={wh.webhookId}>
                        <WebhookCard>
                            <div style={{ paddingTop: 2 }}>
                                <Toggle type="button" onClick={() => handleToggleActive(wh)} title={wh.active ? "Click to disable" : "Click to enable"}>
                                    <TogglePill on={wh.active} />
                                </Toggle>
                            </div>

                            <WebhookMeta>
                                <WebhookName>{wh.name || wh.url}</WebhookName>
                                <WebhookUrl>{wh.url}</WebhookUrl>
                                <TagRow>
                                    {(wh.entityTypes || []).length === 0
                                        ? <Tag>All entity types</Tag>
                                        : (wh.entityTypes || []).map(et => <Tag key={et}>{et}</Tag>)
                                    }
                                    {wh.oauth?.enabled && <OauthTag>OAuth 2.0</OauthTag>}
                                    <StatusBadge
                                        status={wh.active ? "ok" : "pending"}
                                        style={{ fontSize: 10, padding: "1px 7px" }}
                                    >
                                        {wh.active ? "active" : "inactive"}
                                    </StatusBadge>
                                </TagRow>
                            </WebhookMeta>

                            <Actions>
                                <Btn
                                    onClick={() => handleTest(wh)}
                                    style={{ fontSize: 12, padding: "5px 12px", background: "#f8fafc", color: "#2563eb", border: "1px solid #bfdbfe" }}
                                >
                                    Test
                                </Btn>
                                <Btn
                                    onClick={() => openEdit(wh)}
                                    disabled={formMode !== null}
                                    style={{ fontSize: 12, padding: "5px 12px" }}
                                >
                                    Edit
                                </Btn>
                                <Btn
                                    onClick={() => handleDelete(wh.webhookId)}
                                    style={{ fontSize: 12, padding: "5px 12px", background: "#fee2e2", color: "#ef4444", border: "1px solid #fca5a5" }}
                                >
                                    Delete
                                </Btn>
                            </Actions>
                        </WebhookCard>
                        {testResult && testResult.id === wh.webhookId && (
                            <div style={{ fontSize: 12, padding: "8px 16px", color: testResult.ok ? "#166534" : "#991b1b", background: testResult.ok ? "#dcfce7" : "#fee2e2", borderRadius: 4, marginTop: -8, marginBottom: 8 }}>
                                {testResult.msg}
                            </div>
                        )}
                    </React.Fragment>
                ))}
            </Grid>
        </Card>
    );
}

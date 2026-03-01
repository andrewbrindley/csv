import React, { useState, useEffect, useCallback } from 'react';
import { API_BASE } from "../config";
import { useUser } from "./UserContext";
import styled from 'styled-components';
import TemplateSpreadsheet from './TemplateSpreadsheet';

// --- Styled Components ---
const Container = styled.div`
  padding: 24px;
  background: #f8fafc;
  min-height: 100%;
`;

const Card = styled.div`
  background: white;
  border-radius: 12px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
  padding: 24px;
  margin-bottom: 24px;
`;

const SectionTitle = styled.h2`
  font-size: 18px;
  font-weight: 600;
  color: #1e293b;
  margin: 0;
`;

const Button = styled.button`
  padding: 8px 16px;
  border-radius: 6px;
  border: 1px solid #e2e8f0;
  background: white;
  color: #475569;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  
  &:hover {
    background: #f1f5f9;
    color: #1e293b;
  }
`;

const PrimaryButton = styled(Button)`
  background: #2563eb;
  color: white;
  border: none;
  
  &:hover {
    background: #1d4ed8;
    color: white;
  }
`;

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
  margin-top: 16px;
`;

const Th = styled.th`
  text-align: left;
  padding: 12px 16px;
  border-bottom: 1px solid #e2e8f0;
  color: #64748b;
  font-size: 13px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

const Td = styled.td`
  padding: 16px;
  border-bottom: 1px solid #f1f5f9;
  color: #334155;
  font-size: 14px;
`;

const Badge = styled.span`
  display: inline-block;
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 11px;
  font-weight: 600;
  
  ${props => props.type === 'custom' ? `background: #dbeafe; color: #1e40af;` : `background: #f1f5f9; color: #64748b;`}
`;

const ActionBtn = styled.button`
  background: none;
  border: none;
  cursor: pointer;
  padding: 4px;
  opacity: 0.6;
  transition: opacity 0.2s;
  
  &:hover { opacity: 1; }
`;

const Spinner = () => (
    <div style={{ display: "flex", justifyContent: "center", padding: "20px" }}>
        <div style={{
            width: "24px", height: "24px", border: "3px solid #e2e8f0",
            borderTopColor: "#3b82f6", borderRadius: "50%", animation: "spin 1s linear infinite"
        }} />
        <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
    </div>
);


export default function TemplateBuilder({ tenantId, onUpdate }) {
    const { authFetch } = useUser();
    const [templates, setTemplates] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [view, setView] = useState('list'); // 'list', 'create', 'edit'
    const [editingTemplate, setEditingTemplate] = useState(null);

    const fetchTemplates = useCallback(() => {
        setLoading(true);
        setError(null);

        authFetch(`${API_BASE}/templates?tenantId=${tenantId}`)
            .then(res => res.json())
            .then(data => {
                if (data.error) {
                    setError(data.error);
                    return;
                }

                if (!data.templates || !Array.isArray(data.templates)) {
                    setError("Invalid API response: expected {templates: [...]}");
                    console.error("Invalid response format:", data);
                    return;
                }

                setTemplates(data.templates);
            })
            .catch(err => {
                console.error("Failed to fetch templates:", err);
                setError(err.message);
            })
            .finally(() => setLoading(false));
    }, [tenantId, authFetch]);

    useEffect(() => {
        if (tenantId) fetchTemplates();
    }, [tenantId, fetchTemplates]);

    // Download a blank CSV template with just the header row
    const downloadTemplateCsv = (tpl) => {
        const fields = tpl.fields || [];
        const headers = fields.map(f => f.label || f.key);
        const csvContent = headers.join(',') + '\n';
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        const filename = (tpl.templateLabel || tpl.label || tpl.templateKey || tpl.key || 'template')
            .replace(/[^a-z0-9]/gi, '_').toLowerCase();
        link.href = url;
        link.download = `${filename}_template.csv`;
        link.click();
        URL.revokeObjectURL(url);
    };

    // Handle Create/Edit Actions
    const handleCreate = () => {
        setEditingTemplate(null);
        setView('create');
    };

    const handleEdit = (tpl) => {
        setEditingTemplate(tpl);
        setView('edit');
    };

    const handleSaveComplete = () => {
        setView('list');
        fetchTemplates();
        if (onUpdate) onUpdate();
    };

    const handleDelete = async (templateKey) => {
        if (!window.confirm(`Are you sure you want to delete template '${templateKey}'? This cannot be undone.`)) {
            return;
        }

        const deleteRequest = async (force = false) => {
            try {
                const res = await authFetch(`${API_BASE}/templates/${templateKey}?tenantId=${tenantId}&force=${force}`, {
                    method: "DELETE"
                });
                const data = await res.json();

                if (!res.ok) {
                    if (res.status === 409 && !force) {
                        // Data exists - ask to force delete
                        if (window.confirm(`${data.error}\n\nDo you want to force delete this template AND ALL associated data? This cannot be undone.`)) {
                            await deleteRequest(true); // Retry with force=true
                        }
                    } else {
                        alert(`Error: ${data.error || "Failed to delete template"}`);
                    }
                    return;
                }

                alert(data.message);
                fetchTemplates(); // Refresh list
                if (onUpdate) onUpdate();
            } catch (err) {
                console.error("Failed to delete template:", err);
                alert(`Failed to delete template: ${err.message}`);
            }
        };

        await deleteRequest(false);
    };

    const handleLock = async (template) => {
        try {
            const res = await authFetch(`${API_BASE}/templates/${template.templateKey}?tenantId=${tenantId}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    tenantId,
                    locked: !template.locked
                })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Failed to update lock status");
            fetchTemplates();
            if (onUpdate) onUpdate();
        } catch (err) {
            console.error("Failed to toggle lock:", err);
            alert(err.message);
        }
    };

    // Filter templates - default templates use 'key', custom use 'templateKey' + have _id
    const customTemplates = templates.filter(t => t._id);
    const defaultTemplates = templates.filter(t => !t._id);

    // --- Render Form View ---
    if (view === 'create' || view === 'edit' || view === 'view') {
        return (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, height: '100%', overflow: 'hidden' }}>
                <TemplateSpreadsheet
                    tenantId={tenantId}
                    template={editingTemplate}
                    existingTemplates={templates}
                    onSave={handleSaveComplete}
                    onCancel={() => setView('list')}
                    readOnly={view === 'view'}
                />
            </div>
        );
    }

    // --- Render List View ---
    return (
        <Container>
            <Card style={{ position: "relative" }}>
                {loading && <div style={{ position: 'absolute', top: 10, right: 10 }}><Spinner /></div>}

                <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", marginBottom: 8 }}>
                    <div style={{ display: "flex", gap: 8 }}>
                        <Button onClick={fetchTemplates}>Refresh</Button>
                        <PrimaryButton onClick={handleCreate}>+ New Template</PrimaryButton>
                    </div>
                </div>

                {error && (
                    <div style={{ padding: 12, background: "#fee2e2", color: "#991b1b", borderRadius: 6, marginBottom: 16 }}>
                        Error: {error}
                    </div>
                )}

                {templates.length === 0 && !loading && (
                    <div style={{ padding: 40, textAlign: "center", color: "#64748b" }}>
                        No templates found. Create your first template to get started!
                    </div>
                )}

                {templates.length > 0 && (
                    <Table>
                        <thead>
                            <tr>
                                <Th>Template Name</Th>
                                <Th>Type</Th>
                                <Th>Fields</Th>
                                <Th>Created</Th>
                                <Th>Actions</Th>
                            </tr>
                        </thead>
                        <tbody>
                            {templates
                                .sort((a, b) => {
                                    // Custom first
                                    if (!!a._id !== !!b._id) return !!b._id - !!a._id;
                                    // Then alphabetical
                                    return (a.templateLabel || a.label || "").localeCompare(b.templateLabel || b.label || "");
                                })
                                .map(tpl => {
                                    const isCustom = !!tpl._id;
                                    const label = tpl.templateLabel || tpl.label || tpl.templateKey || tpl.key;
                                    const key = tpl.templateKey || tpl.key;
                                    const created = tpl.createdAt ? new Date(tpl.createdAt).toLocaleDateString() : "—";

                                    return (
                                        <tr key={key}>
                                            <Td style={{ fontWeight: 500 }}>
                                                {label}
                                                {(tpl.locked || !isCustom) && <span style={{ marginLeft: 6 }} title="Locked">🔒</span>}
                                            </Td>
                                            <Td>
                                                <Badge type={isCustom ? 'custom' : 'system'}>
                                                    {isCustom ? 'Custom' : 'System'}
                                                </Badge>
                                            </Td>
                                            <Td>{tpl.fields?.length || 0} fields</Td>
                                            <Td style={{ fontSize: 12, color: "#64748b" }}>{created}</Td>
                                            <Td>
                                                <div style={{ display: "flex", gap: 8 }}>
                                                    {/* Download button — available for all templates */}
                                                    <ActionBtn
                                                        onClick={() => downloadTemplateCsv(tpl)}
                                                        title={`Download blank CSV template for '${label}'`}
                                                    >
                                                        ⬇️
                                                    </ActionBtn>

                                                    {isCustom ? (
                                                        <>
                                                            <ActionBtn
                                                                onClick={() => handleLock(tpl)}
                                                                title={tpl.locked ? "Unlock" : "Lock"}
                                                            >
                                                                {tpl.locked ? "🔓" : "🔒"}
                                                            </ActionBtn>
                                                            <ActionBtn
                                                                onClick={() => handleEdit(tpl)}
                                                                title="Edit"
                                                                disabled={tpl.locked}
                                                                style={tpl.locked ? { opacity: 0.3, cursor: "not-allowed" } : {}}
                                                            >
                                                                ✏️
                                                            </ActionBtn>
                                                            <ActionBtn
                                                                onClick={() => handleDelete(tpl.templateKey)}
                                                                title="Delete"
                                                                disabled={tpl.locked}
                                                                style={tpl.locked ? { opacity: 0.3, cursor: "not-allowed" } : { color: "#ef4444" }}
                                                            >
                                                                🗑️
                                                            </ActionBtn>
                                                        </>
                                                    ) : (
                                                        <ActionBtn
                                                            onClick={() => {
                                                                setEditingTemplate(tpl);
                                                                setView('view');
                                                            }}
                                                            title="View System Template"
                                                        >
                                                            👁️
                                                        </ActionBtn>
                                                    )}
                                                </div>
                                            </Td>
                                        </tr>
                                    );
                                })}
                        </tbody>
                    </Table>
                )}
            </Card>
        </Container>
    );
}

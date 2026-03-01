import React, { useState, useEffect } from 'react';
import { useUser } from "./UserContext";
import styled from 'styled-components';
import FieldEditor from './FieldEditor';

// --- Styled Components ---
const FormContainer = styled.div`
  padding: 20px;
  background: white;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
  max-width: 800px;
  margin: 0 auto;
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
  padding-bottom: 16px;
  border-bottom: 1px solid #eee;
`;

const Title = styled.h2`
  margin: 0;
  font-size: 20px;
  color: #1e293b;
`;

const SectionTitle = styled.h3`
  font-size: 16px;
  color: #334155;
  margin: 24px 0 16px 0;
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const FormGroup = styled.div`
  margin-bottom: 16px;
`;

const Label = styled.label`
  display: block;
  font-size: 14px;
  font-weight: 500;
  color: #475569;
  margin-bottom: 8px;
`;

const Input = styled.input`
  width: 100%;
  padding: 10px;
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  font-size: 14px;
  &:focus {
    outline: none;
    border-color: #3b82f6;
    box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.1);
  }
  &:disabled {
    background: #f1f5f9;
    cursor: not-allowed;
  }
`;

const TextArea = styled.textarea`
  width: 100%;
  padding: 10px;
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  font-size: 14px;
  min-height: 80px;
  font-family: inherit;
  &:focus {
    outline: none;
    border-color: #3b82f6;
  }
`;

const Button = styled.button`
  padding: 10px 20px;
  border-radius: 6px;
  border: none;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  
  ${props => props.variant === 'primary' ? `
    background: #2563eb;
    color: white;
    &:hover { background: #1d4ed8; }
    &:disabled { background: #94a3b8; cursor: not-allowed; }
  ` : props.variant === 'danger' ? `
    background: #ef4444;
    color: white;
    &:hover { background: #dc2626; }
  ` : `
    background: #f1f5f9;
    color: #475569;
    &:hover { background: #e2e8f0; }
  `}
`;

const FieldList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

const FieldItem = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  
  &:hover {
    border-color: #cbd5e1;
  }
`;

const Badge = styled.span`
  display: inline-block;
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 11px;
  font-weight: 600;
  margin-left: 8px;
  
  ${props => props.type === 'required' ? `background: #fee2e2; color: #991b1b;` : ''}
  ${props => props.type === 'identifier' ? `background: #dbeafe; color: #1e40af;` : ''}
  ${props => props.type === 'pii' ? `background: #fef3c7; color: #92400e;` : ''}
`;

const API_BASE = "http://localhost:5000/api";


export default function TemplateForm({ tenantId, template, onSave, onCancel }) {
    const { authFetch } = useUser();
    const [formData, setFormData] = useState({
        templateKey: '',
        templateLabel: '',
        description: '', // We don't really have a description field in backend yet, using label or keywords?
        keywords: '',
        fields: []
    });

    const [editingField, setEditingField] = useState(null); // null = new, object = editing, -1 = not editing
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    // Initialize form if editing existing template
    useEffect(() => {
        if (template) {
            setFormData({
                templateKey: template.templateKey || template.key,
                templateLabel: template.templateLabel || template.label,
                keywords: (template.keywords || []).join(', '),
                fields: template.fields || []
            });
        }
    }, [template]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleSaveField = (fieldData) => {
        setFormData(prev => {
            const newFields = [...prev.fields];
            const existingIndex = newFields.findIndex(f => f.key === fieldData.key);

            if (existingIndex >= 0) {
                // Update existing
                newFields[existingIndex] = fieldData;
            } else {
                // Add new
                newFields.push(fieldData);
            }
            return { ...prev, fields: newFields };
        });
        setEditingField(null); // Close editor
    };

    const handleDeleteField = (fieldKey) => {
        if (window.confirm('Remove this field?')) {
            setFormData(prev => ({
                ...prev,
                fields: prev.fields.filter(f => f.key !== fieldKey)
            }));
        }
    };

    const handleSubmit = async () => {
        // Validation
        if (!formData.templateKey || !formData.templateLabel) {
            setError("Template Key and Label are required");
            return;
        }
        if (formData.fields.length === 0) {
            setError("At least one field is required");
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const payload = {
                tenantId,
                templateKey: formData.templateKey,
                templateLabel: formData.templateLabel,
                keywords: formData.keywords.split(',').map(s => s.trim()).filter(Boolean),
                fields: formData.fields
            };

            const isEdit = !!template;
            const url = isEdit
                ? `${API_BASE}/templates/${formData.templateKey}`
                : `${API_BASE}/templates`;

            const method = isEdit ? 'PUT' : 'POST';

            console.log(`Submitting template (${method}):`, payload);

            const res = await authFetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || 'Failed to save template');
            }

            alert('Template saved successfully!');
            onSave(); // Refresh list at parent
        } catch (err) {
            console.error(err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <FormContainer>
            <Header>
                <Title>{template ? 'Edit Template' : 'Create New Template'}</Title>
                <div style={{ display: 'flex', gap: 12 }}>
                    <Button onClick={onCancel}>Cancel</Button>
                    <Button variant="primary" onClick={handleSubmit} disabled={loading}>
                        {loading ? 'Saving...' : 'Save Template'}
                    </Button>
                </div>
            </Header>

            {error && (
                <div style={{ padding: '12px', background: '#fee2e2', color: '#991b1b', borderRadius: '6px', marginBottom: '24px' }}>
                    Error: {error}
                </div>
            )}

            <div style={{ display: 'flex', gap: 24 }}>
                <div style={{ flex: 1 }}>
                    <FormGroup>
                        <Label>Template Key (ID)</Label>
                        <Input
                            name="templateKey"
                            value={formData.templateKey}
                            onChange={handleChange}
                            placeholder="e.g. Invoices, Orders"
                            disabled={!!template} // Cannot format key of existing template
                        />
                        <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>
                            Unique identifier used in API (alphanumeric only)
                        </div>
                    </FormGroup>
                </div>
                <div style={{ flex: 1 }}>
                    <FormGroup>
                        <Label>Display Label</Label>
                        <Input
                            name="templateLabel"
                            value={formData.templateLabel}
                            onChange={handleChange}
                            placeholder="e.g. Invoices (Accounts Payable)"
                        />
                    </FormGroup>
                </div>
            </div>

            <FormGroup>
                <Label>Keywords (comma separated)</Label>
                <TextArea
                    name="keywords"
                    value={formData.keywords}
                    onChange={handleChange}
                    placeholder="invoice, bill, payment, vendor..."
                    style={{ minHeight: '60px' }}
                />
            </FormGroup>

            <SectionTitle>
                Fields ({formData.fields.length})
                <Button
                    onClick={() => setEditingField({})}
                    style={{ fontSize: 12, padding: '6px 12px' }}
                >
                    + Add Field
                </Button>
            </SectionTitle>

            {/* Field Editor Area */}
            {editingField && (
                <FieldEditor
                    field={editingField.key ? editingField : {}}
                    onSave={handleSaveField}
                    onCancel={() => setEditingField(null)}
                />
            )}

            {/* Field List */}
            <FieldList>
                {formData.fields.length === 0 ? (
                    <div style={{ padding: 24, textAlign: 'center', color: '#64748b', background: '#f8fafc', borderRadius: 8 }}>
                        No fields defined yet. Add your first field!
                    </div>
                ) : (
                    formData.fields.map((field, idx) => (
                        <FieldItem key={idx}>
                            <div>
                                <strong style={{ color: '#1e293b' }}>{field.label}</strong>
                                <span style={{ marginLeft: 8, fontFamily: 'monospace', color: '#64748b', background: '#e2e8f0', padding: '2px 6px', borderRadius: 4, fontSize: 12 }}>
                                    {field.key}
                                </span>
                                <div style={{ marginTop: 4, fontSize: 12, color: '#64748b' }}>
                                    {field.pattern}
                                    {field.required && <Badge type="required">Required</Badge>}
                                    {field.identifier && <Badge type="identifier">ID</Badge>}
                                    {field.is_pii && <Badge type="pii">PII</Badge>}
                                </div>
                            </div>
                            <div style={{ display: 'flex', gap: 8 }}>
                                <Button
                                    style={{ padding: '4px 8px' }}
                                    onClick={() => setEditingField(field)}
                                    title="Edit Field"
                                >
                                    ✏️
                                </Button>
                                <Button
                                    variant="danger"
                                    style={{ padding: '4px 8px' }}
                                    onClick={() => handleDeleteField(field.key)}
                                    title="Delete Field"
                                >
                                    🗑️
                                </Button>
                            </div>
                        </FieldItem>
                    ))
                )}
            </FieldList>

        </FormContainer>
    );
}

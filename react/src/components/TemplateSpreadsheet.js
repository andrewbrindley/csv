import React, { useState, useEffect } from 'react';
import { API_BASE } from "../config";
import { useUser } from "./UserContext";
import styled from 'styled-components';
import ColumnDrawer from './ColumnDrawer';

import DataTypeIcon from './DataTypeIcon';
import { keyframes, css } from 'styled-components';

// --- Styled Components ---
const Container = styled.div`
  display: flex;
  flex-direction: column;
  flex: 1;
  height: 100%;
  min-height: 0;
  background: #f8fafc;
  overflow: hidden;
`;

const TopBar = styled.div`
  background: white;
  border-bottom: 1px solid #e2e8f0;
  padding: 16px 24px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  box-shadow: 0 1px 2px rgba(0,0,0,0.05);
  flex-shrink: 0;
`;

const BackBtn = styled.button`
  background: none;
  border: none;
  color: #64748b;
  font-weight: 500;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  &:hover { color: #1e293b; }
`;

const TitleInput = styled.input`
  font-size: 20px;
  font-weight: 600;
  border: 1px solid transparent;
  border-radius: 4px;
  padding: 6px 12px;
  background: transparent;
  color: #1e293b;
  width: 500px; /* Increased width */
  transition: all 0.2s;
  text-overflow: ellipsis;
  
  &:focus {
    outline: none;
    background: white;
    border-color: #3b82f6;
    box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.1);
  }
  &:hover:not(:disabled) {
    background: white;
    border-color: #e2e8f0;
  }
  &:disabled {
    cursor: default;
    color: #0f172a;
    background: transparent;
    border-color: transparent;
  }
`;

const Button = styled.button`
  padding: 8px 16px;
  border-radius: 6px;
  border: 1px solid #e2e8f0;
  background: white;
  color: #475569;
  font-weight: 500;
  cursor: pointer;
  
  &:hover { background: #f1f5f9; }
  &:disabled { opacity: 0.5; cursor: not-allowed; }
`;

const PrimaryButton = styled(Button)`
  background: #2563eb;
  color: white;
  border: none;
  &:hover { background: #1d4ed8; }
`;

const ScrollContainer = styled.div`
  flex: 1;
  overflow-y: auto;
  overflow-x: auto;
  padding: 24px;
  min-height: 0;
  display: flex;
  flex-direction: column;
  // align-items: center;  <-- REMOVED: Causes left-overflow on wide tables
  width: 100%;
`;

// "TableContainer" style
const Spreadsheet = styled.div`
  display: inline-block;
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
  overflow: hidden; /* For border radius */
  min-width: fit-content;
  margin: 0 auto 24px auto; /* Safe centering */
  flex-shrink: 0; /* Prevent shrinking if width is tight */
`;

const Row = styled.div`
  display: flex;
  border-bottom: 1px solid #e5e7eb;
  &:last-child { border-bottom: none; }
`;

const IndexCell = styled.div`
  width: 50px;
  min-width: 50px;
  height: 56px; /* Explicit Header Height */
  background: #f9fafb;
  border-right: 1px solid #e5e7eb;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #9ca3af;
  font-size: 12px;
  font-weight: 500;
  user-select: none;
  flex-shrink: 0;
  position: sticky;
  left: 0;
  z-index: 5;
`;

const HeaderCell = styled.div`
  width: 250px;
  min-width: 250px;
  height: 56px; /* Explicit Height */
  padding: 0 16px; /* Horizontal padding only, vertical managed by flex */
  border-right: 1px solid #e5e7eb;
  background: #f9fafb;
  cursor: pointer;
  transition: background 0.2s;
  position: relative;
  display: flex;
  flex-direction: column;
  justify-content: center;
  white-space: nowrap;

  &:hover {
    background: ${props => props.readOnly ? '#f1f5f9' : '#f3f4f6'};
  }
  
  ${props => props.isSelected && !props.readOnly && `
    background: #eff6ff;
    box-shadow: inset 0 -2px 0 #3b82f6;
  `}
`;

const Cell = styled.div`
  width: 250px;
  min-width: 250px;
  height: 56px; /* Match Header Height */
  padding: 0 16px;
  border-right: 1px solid #f3f4f6;
  font-size: 13px;
  color: #374151;
  background: white;
  display: flex;
  align-items: center;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const AddColumnBtn = styled.button`
  width: 40px;
  border: none;
  background: #f9fafb;
  font-size: 18px;
  color: #9ca3af;
  cursor: pointer;
  border-right: 1px solid #e5e7eb; 
  display: flex;
  align-items: center;
  justify-content: center;
  &:hover { color: #3b82f6; background: #eff6ff; }
`;

const Label = styled.div`
  font-weight: 600;
  font-size: 13px;
  color: #374151;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  white-space: nowrap; /* Prevent header wrapping */
`;

const Key = styled.div`
  font-size: 11px;
  color: #9ca3af;
  margin-top: 4px;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
`;

// --- Animations ---
const fadeIn = keyframes`
  from { opacity: 0; transform: translateY(-10px); }
  to { opacity: 1; transform: translateY(0); }
`;

const AnimatedRow = styled(Row)`
  animation: ${fadeIn} 0.3s ease-out forwards;
  animation-delay: ${props => props.delay}s;
  opacity: 0; // Start invisible for animation
`;


// Basic Spinner Component
const SpinnerOverlay = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(255, 255, 255, 0.8);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 10;
  flex-direction: column;
  gap: 16px;
  color: #6366f1;
  font-weight: 500;
`;

const SpinnerIcon = styled.div`
  width: 40px;
  height: 40px;
  border: 4px solid #e0e7ff;
  border-top-color: #6366f1;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  
  @keyframes spin {
    to { transform: rotate(360deg); }
  }
`;


export default function TemplateSpreadsheet({ tenantId, template, existingTemplates = [], onSave, onCancel, readOnly = false }) {
    const { authFetch } = useUser();
    // Robust title initialization
    const initialTitle = template?.templateLabel || template?.label || template?.templateKey || template?.key || 'Untitled Template';
    const [title, setTitle] = useState(initialTitle);

    // Key removed from UI - auto-generated from title on save
    const [fields, setFields] = useState(template?.fields || []);
    const [selectedField, setSelectedField] = useState(null); // Key of selected field
    const [pendingField, setPendingField] = useState(null); // For new field being created
    const [drawerOpen, setDrawerOpen] = useState(false);

    const [loading, setLoading] = useState(false);
    const [visualizing, setVisualizing] = useState(false); // New state for AI viz
    const [mockData, setMockData] = useState(null); // New state for AI viz result
    const [draggedFieldKey, setDraggedFieldKey] = useState(null);

    const handleDragStart = (e, key) => {
        if (readOnly) return;
        setDraggedFieldKey(key);
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', key);
    };

    const handleDragOver = (e) => {
        if (readOnly) return;
        e.preventDefault(); // Necessary to allow dropping
        e.dataTransfer.dropEffect = 'move';
    };

    const handleDrop = (e, targetKey) => {
        if (readOnly) return;
        e.preventDefault();
        if (draggedFieldKey === targetKey) return;

        const sourceIndex = fields.findIndex(f => f.key === draggedFieldKey);
        const targetIndex = fields.findIndex(f => f.key === targetKey);

        if (sourceIndex >= 0 && targetIndex >= 0) {
            const newFields = [...fields];
            const [movedField] = newFields.splice(sourceIndex, 1);
            newFields.splice(targetIndex, 0, movedField);
            setFields(newFields);
        }
        setDraggedFieldKey(null);
    };

    // Ensure at least one field exists to start (only for new templates)
    useEffect(() => {
        if (!readOnly && fields.length === 0) {
            const initialField = { key: 'field1', label: 'Field 1', pattern: 'string' };
            setFields([initialField]);
            setSelectedField('field1');
            setDrawerOpen(true);
        }
    }, [fields.length, readOnly]);

    const handleAddColumn = () => {
        if (readOnly) return;
        // Generate a random internal key to avoid collisions
        const newKey = `col_${Math.random().toString(36).substr(2, 9)}`;

        let baseLabel = "New Field";
        let label = baseLabel;
        let counter = 1;
        while (fields.some(f => f.label === label)) {
            label = `${baseLabel} ${counter}`;
            counter++;
        }

        const newField = {
            key: newKey,
            label: label,
            pattern: 'string'
        };
        // Do NOT add to fields yet. Wait for save.
        setPendingField(newField);
        setSelectedField(null);
        setDrawerOpen(true);
    };

    // Wrapper to handle saving from Drawer
    const onDrawerSave = (newFieldData) => {
        // Validation: Check for duplicate labels
        // Exclude current field being edited (if updating) from check
        const duplicate = fields.find(f =>
            (selectedField ? f.key !== selectedField : true) &&
            f.label.trim().toLowerCase() === newFieldData.label.trim().toLowerCase()
        );

        if (duplicate) {
            alert(`A column with the label "${newFieldData.label}" already exists. Please choose a unique name.`);
            return;
        }

        if (selectedField) {
            // Updating existing field
            setFields(prev => prev.map(f => f.key === selectedField ? newFieldData : f));
            // Renaming key handling
            if (newFieldData.key !== selectedField) {
                setSelectedField(newFieldData.key);
            }
        } else {
            // Adding new field
            setFields(prev => [...prev, newFieldData]);
        }

        setDrawerOpen(false); // Close drawer on save
        setPendingField(null);
    };

    const onDrawerDelete = (fieldKey) => {
        if (fields.length <= 1) {
            alert("Template must have at least one field.");
            return;
        }
        if (window.confirm("Delete this column?")) {
            setFields(prev => prev.filter(f => f.key !== fieldKey));
            setDrawerOpen(false);
            setSelectedField(null);
        }
    };

    const handleVisualize = async () => {
        if (fields.length === 0) return;
        setVisualizing(true);
        setMockData(null); // Clear previous data
        try {
            const res = await authFetch(`${API_BASE}/ai/generate_mock_data`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ fields })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to generate data');
            setMockData(data.data);
        } catch (err) {
            alert("Error generating mock data: " + err.message);
        } finally {
            setVisualizing(false);
        }
    };

    const handleSaveTemplate = async () => {
        if (!title) {
            alert("Please provide a Template Name.");
            return;
        }

        // Ensure at least one identifier
        if (!fields.some(f => f.identifier)) {
            alert("Please mark at least one field as a Unique Identifier (🔑).");
            return;
        }

        setLoading(true);
        try {
            // Auto-generate key from title if not present (custom templates)
            // For system templates (which shouldn't be edited here anyway), we keep the existing key
            const generatedKey = title.toLowerCase().replace(/[^a-z0-9]/g, '');
            const finalKey = template?.templateKey || generatedKey;

            const payload = {
                tenantId,
                templateKey: finalKey,
                templateLabel: title,
                fields: fields,
                keywords: template?.keywords || []
            };

            const isEdit = !!template;
            const url = isEdit
                ? `${API_BASE}/templates/${template.templateKey}`
                : `${API_BASE}/templates`;

            const method = isEdit ? 'PUT' : 'POST';

            const res = await authFetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error);

            onSave();
        } catch (err) {
            alert(`Error saving template: ${err.message}`);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Container>
            <TopBar>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    <BackBtn onClick={onCancel}>
                        <span>←</span> Back
                    </BackBtn>
                    <div>
                        <TitleInput
                            value={title}
                            onChange={(e) => !readOnly && setTitle(e.target.value)}
                            placeholder="Template Name"
                            disabled={readOnly}
                            title={readOnly ? "Template name cannot be edited" : "Edit template name"}
                        />
                        {readOnly && <span style={{ fontSize: 12, color: '#64748b', marginLeft: 8 }}>(Read-Only)</span>}
                    </div>
                </div>
                <div style={{ display: 'flex', gap: 12 }}>
                    <Button onClick={onCancel}>Close</Button>
                    <Button onClick={handleVisualize} disabled={visualizing} style={{ borderColor: '#8b5cf6', color: '#7c3aed', background: '#f5f3ff' }}>
                        {visualizing ? 'Generating... 🔮' : 'Visualise 🪄'}
                    </Button>
                    {!readOnly && (
                        <PrimaryButton onClick={handleSaveTemplate} disabled={loading}>
                            {loading ? 'Saving...' : 'Save Template'}
                        </PrimaryButton>
                    )}
                </div>
            </TopBar>

            <ScrollContainer>
                {readOnly ? (
                    <div style={{ marginBottom: 16, color: '#64748b', fontSize: 13 }}>
                        👁️ Click any column header to inspect its settings.
                    </div>
                ) : (
                    <div style={{ marginBottom: 16, color: '#64748b', fontSize: 13 }}>
                        💡 Click a header to edit column properties. Drag headers to reorder.
                    </div>
                )}

                <Spreadsheet>
                    {/* Header Row */}
                    <Row>
                        <IndexCell>#</IndexCell>
                        {fields.map(field => (
                            <HeaderCell
                                key={field.key}
                                isSelected={selectedField === field.key}
                                readOnly={readOnly}
                                draggable={!readOnly}
                                onDragStart={(e) => handleDragStart(e, field.key)}
                                onDragOver={handleDragOver}
                                onDrop={(e) => handleDrop(e, field.key)}
                                onClick={() => {
                                    setSelectedField(field.key);
                                    setPendingField(null);
                                    setDrawerOpen(true);
                                }}
                                style={{ opacity: draggedFieldKey === field.key ? 0.4 : 1 }}
                            >
                                <Label>
                                    <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                        <DataTypeIcon type={field.pattern} />
                                        {field.label}
                                    </span>
                                    <div style={{ display: 'flex', gap: 4 }}>
                                        {field.identifier && <span title="Unique Identifier">🔑</span>}
                                        {field.required && !field.identifier && <span style={{ color: 'red' }} title="Required">*</span>}
                                        {field.is_pii && (
                                            <span title="PII Field" style={{ display: "flex", alignItems: "center", color: "#64748b" }}>
                                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
                                                    <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z" />
                                                </svg>
                                            </span>
                                        )}
                                    </div>
                                </Label>
                            </HeaderCell>
                        ))}
                        {!readOnly && <AddColumnBtn onClick={handleAddColumn} title="Add Column">+</AddColumnBtn>}
                    </Row>

                    {/* Loading State - Spinner Overlay */}
                    {visualizing && (
                        <SpinnerOverlay>
                            <SpinnerIcon />
                            <span>Generating sample data...</span>
                        </SpinnerOverlay>
                    )}

                    {/* AI Mock Data or Empty Rows */}
                    {!visualizing && (mockData || Array.from({ length: 5 })).map((row, i) => (
                        <AnimatedRow key={i} delay={i * 0.05} style={{ opacity: 1, animation: 'none' }}>
                            <IndexCell>{i + 1}</IndexCell>
                            {fields.map(f => (
                                <Cell key={f.key}>
                                    {row ? row[f.key] : ''}
                                </Cell>
                            ))}
                            {/* Empty cell for add button alignment */}
                            {!readOnly && <Cell style={{ width: 40, minWidth: 40, borderRight: 'none', background: '#f8fafc' }} />}
                        </AnimatedRow>
                    ))}

                    {!mockData && Array.from({ length: 10 }).map((_, i) => (
                        <Row key={`empty-${i}`}>
                            <IndexCell>{i + 6}</IndexCell>
                            {fields.map(f => (
                                <Cell key={f.key} style={{ color: '#e2e8f0' }}>&nbsp;</Cell>
                            ))}
                            {!readOnly && <Cell style={{ width: 40, minWidth: 40, borderRight: 'none', background: '#f8fafc' }} />}
                        </Row>
                    ))}

                </Spreadsheet>
            </ScrollContainer>

            {
                drawerOpen && (
                    <ColumnDrawer
                        field={selectedField ? fields.find(f => f.key === selectedField) : pendingField}
                        existingTemplates={existingTemplates}
                        currentTemplateKey={template?.templateKey}
                        onSave={onDrawerSave}
                        onDelete={onDrawerDelete}
                        onClose={() => setDrawerOpen(false)}
                        readOnly={readOnly}
                    />
                )
            }
        </Container >
    );
}

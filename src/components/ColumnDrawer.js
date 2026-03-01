import React, { useState, useEffect } from 'react';
import styled from 'styled-components';

// --- Styled Components ---
const DrawerOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.3);
  z-index: 50;
  display: flex;
  justify-content: flex-end;
`;

const DrawerContainer = styled.div`
  width: 450px;
  background: white;
  height: 100%;
  box-shadow: -2px 0 8px rgba(0,0,0,0.1);
  display: flex;
  flex-direction: column;
  animation: slideIn 0.3s ease-out;

  @keyframes slideIn {
    from { transform: translateX(100%); }
    to { transform: translateX(0); }
  }
`;

const Header = styled.div`
  padding: 20px;
  border-bottom: 1px solid #e2e8f0;
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const Title = styled.h2`
  margin: 0;
  font-size: 18px;
  color: #1e293b;
`;

const CloseBtn = styled.button`
  background: none;
  border: none;
  font-size: 24px;
  color: #64748b;
  cursor: pointer;
  &:hover { color: #1e293b; }
`;

const Content = styled.div`
  flex: 1;
  padding: 20px;
  overflow-y: auto;
`;

const Footer = styled.div`
  padding: 20px;
  border-top: 1px solid #e2e8f0;
  background: #f8fafc;
  display: flex;
  justify-content: flex-end;
  gap: 12px;
`;

const FormGroup = styled.div`
  margin-bottom: 20px;
`;

const Label = styled.label`
  display: block;
  font-size: 13px;
  font-weight: 600;
  color: #475569;
  margin-bottom: 6px;
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
`;

const Select = styled.select`
  width: 100%;
  padding: 10px;
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  font-size: 14px;
  background: white;
  &:focus {
    outline: none;
    border-color: #3b82f6;
  }
`;

const CheckboxRow = styled.label`
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  margin-bottom: 8px;
  cursor: pointer;
  
  &:hover {
    border-color: #cbd5e1;
  }
`;

const Button = styled.button`
  padding: 10px 20px;
  border-radius: 6px;
  border: none;
  font-weight: 500;
  cursor: pointer;
  
  ${props => props.variant === 'primary' ? `
    background: #2563eb;
    color: white;
    &:hover { background: #1d4ed8; }
  ` : props.variant === 'danger' ? `
    background: white;
    color: #ef4444;
    border: 1px solid #ef4444;
    &:hover { background: #fee2e2; }
  ` : `
    background: white;
    color: #475569;
    border: 1px solid #cbd5e1;
    &:hover { background: #f1f5f9; }
  `}
`;

const TagContainer = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  padding: 8px;
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  min-height: 42px;
  background: white;
  
  &:focus-within {
    border-color: #3b82f6;
    box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.1);
  }
`;

const Tag = styled.span`
  background: #e2e8f0;
  color: #1e293b;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 13px;
  display: flex;
  align-items: center;
  gap: 6px;
`;

const TagRemove = styled.span`
  cursor: pointer;
  color: #64748b;
  font-weight: bold;
  &:hover { color: #ef4444; }
`;

const TagInput = styled.input`
  border: none;
  outline: none;
  flex: 1;
  min-width: 60px;
  font-size: 14px;
  padding: 4px 0;
`;

// Helper Component for Tag Inputs
function ChipInput({ values = [], onChange, placeholder }) {
    const [input, setInput] = useState('');

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' || e.key === ',') {
            e.preventDefault();
            const val = input.trim();
            if (val && !values.includes(val)) {
                onChange([...values, val]);
                setInput('');
            }
        } else if (e.key === 'Backspace' && !input && values.length > 0) {
            onChange(values.slice(0, -1));
        }
    };

    const removeTag = (index) => {
        onChange(values.filter((_, i) => i !== index));
    };

    return (
        <TagContainer onClick={() => document.getElementById('tag-input')?.focus()}>
            {values.map((v, i) => (
                <Tag key={i}>
                    {v}
                    <TagRemove onClick={(e) => { e.stopPropagation(); removeTag(i); }}>×</TagRemove>
                </Tag>
            ))}
            <TagInput
                id="tag-input"
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={values.length === 0 ? placeholder : ''}
            />
        </TagContainer>
    );
}

// Field Types with Icons
const FIELD_TYPES = [
    { value: 'string', label: '🔤 Text (String)' },
    { value: 'integer', label: '🔢 Number (Integer)' },
    { value: 'date', label: '📆 Date (DD-MM-YYYY)' },
    { value: 'email', label: '📧 Email Address' },
    { value: 'phone', label: '📞 Phone Number' },
    { value: 'enum', label: '🔽 Single Select (Dropdown)' },
    { value: 'boolean', label: '✅ Yes/No (Boolean)' },
    { value: 'reference', label: '🔗 Relationship (Link)' }
];

const DATE_FORMATS = [
    { value: 'DD-MM-YYYY', label: 'DD-MM-YYYY (e.g. 31-12-2023)' },
    { value: 'MM-DD-YYYY', label: 'MM-DD-YYYY (e.g. 12-31-2023)' },
    { value: 'YYYY-MM-DD', label: 'YYYY-MM-DD (e.g. 2023-12-31)' },
];

const NORMALIZATION_OPTS = [
    { value: '', label: 'None' },
    { value: 'titlecase', label: 'Title Case (e.g. John Smith)' },
    { value: 'lowercase', label: 'Lower Case (e.g. john@acme.com)' },
    { value: 'uppercase', label: 'Upper Case (e.g. ABC-123)' },
    { value: 'trim', label: 'Trim Whitespace Only' },
];

export default function ColumnDrawer({ field, existingTemplates = [], currentTemplateKey, onSave, onDelete, onClose, readOnly }) {
    // ... state ...

    // Helper: Detect if selecting targetKey would create a cycle (Target -> ... -> Current)
    const detectCycle = (targetKey) => {
        if (!currentTemplateKey) return false; // New template has no incoming edges yet
        if (targetKey === currentTemplateKey) return true; // Direct self-reference

        // Build adjacency list for the graph of templates
        const graph = {};
        existingTemplates.forEach(t => {
            const tKey = t.templateKey || t.key;
            if (!graph[tKey]) graph[tKey] = [];

            // Add edges for existing Reference fields
            if (t.fields) {
                t.fields.forEach(f => {
                    if (f.pattern === 'reference' && f.targetTemplate) {
                        graph[tKey].push(f.targetTemplate);
                    }
                });
            }
        });

        // BFS to check if we can reach currentTemplateKey from targetKey
        const queue = [targetKey];
        const visited = new Set();

        while (queue.length > 0) {
            const current = queue.shift();
            if (current === currentTemplateKey) return true; // Cycle detected!

            if (!visited.has(current)) {
                visited.add(current);
                const neighbors = graph[current] || [];
                neighbors.forEach(neighbor => queue.push(neighbor));
            }
        }

        return false;
    };
    const [data, setData] = useState({
        key: '',
        label: '',
        pattern: 'string',
        required: false,
        identifier: false,
        is_pii: false,
        allowed: [],
        keywords: [],
        targetTemplate: '',
        targetField: '',
        dateFormat: 'DD-MM-YYYY',
        normalize: '',
        sequence: null,
        ...field
    });

    // Initialize/Normalize Data
    useEffect(() => {
        if (field) {
            // System templates store relationship config as a nested object: field.relationship.targetTemplate
            // Custom templates store it flat: field.targetTemplate
            // Unwrap both so the UI always uses flat targetTemplate/targetField
            const rel = field.relationship || {};
            setData(prev => ({
                ...prev,
                ...field,
                // Ensure arrays
                allowed: Array.isArray(field.allowed) ? field.allowed : (field.allowed ? [field.allowed] : []),
                keywords: Array.isArray(field.keywords) ? field.keywords : (field.synonyms ? field.synonyms : []), // Handle legacy synonyms key
                sequence: field.sequence || null,
                // Unwrap nested relationship config (system templates)
                targetTemplate: field.targetTemplate || rel.targetTemplate || '',
                targetField: field.targetField || rel.targetField || '',
            }));
        }
    }, [field]);

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    // Special handler for Auto-Increment Toggle
    const handleSequenceChange = (e) => {
        setData(prev => ({
            ...prev,
            sequence: e.target.checked ? "+1" : null
        }));
    }

    const handleSave = () => {
        if (!data.label || !data.key) {
            alert("Label and Key are required.");
            return;
        }

        const processed = { ...data };

        // Clean up based on type
        if (processed.pattern !== 'enum') {
            processed.allowed = null;
        }
        if (processed.pattern !== 'date') {
            processed.dateFormat = null;
        }
        if (processed.pattern !== 'reference') {
            processed.targetTemplate = null;
            processed.targetField = null;
        }
        if (processed.pattern !== 'integer') {
            processed.sequence = null;
        }

        // Map UI "keywords" back to "synonyms" if your backend expects that
        // The user request said "Populates the synonyms array", so let's stick to 'synonyms' in the output object
        // But keep 'keywords' in state if that's what we used. 
        // Actually earlier code used 'synonyms' in TEMPLATES, so let's standardise on 'synonyms'
        processed.synonyms = processed.keywords; // map back
        delete processed.keywords; // clean up temp state key if differing

        onSave(processed);
    };

    // Get fields of selected target template
    const selectedTemplateObj = existingTemplates.find(t => (t.templateKey || t.key) === data.targetTemplate);
    const targetFields = selectedTemplateObj ? selectedTemplateObj.fields : [];

    return (
        <DrawerOverlay onClick={onClose}>
            <DrawerContainer onClick={e => e.stopPropagation()}>
                <Header>
                    <Title>{readOnly ? 'View Column' : field?.key ? 'Edit Column' : 'New Column'}</Title>
                    <CloseBtn onClick={onClose}>×</CloseBtn>
                </Header>

                <Content>
                    <FormGroup>
                        <Label>Column Label (Header)</Label>
                        <Input
                            name="label"
                            value={data.label}
                            onChange={(e) => {
                                handleChange(e);
                                if (!field?.key && !data.key) {
                                    const genKey = e.target.value
                                        .toLowerCase()
                                        .replace(/[^a-z0-9]/g, '')
                                        .slice(0, 20);
                                    setData(prev => ({ ...prev, key: genKey }));
                                }
                            }}
                            placeholder="e.g. Employee ID"
                            autoFocus={!readOnly}
                            disabled={readOnly}
                        />
                    </FormGroup>



                    <FormGroup>
                        <Label>Description / Tooltip</Label>
                        <textarea
                            name="description"
                            value={data.description || ''}
                            onChange={handleChange}
                            disabled={readOnly}
                            placeholder="Explain what this field is for (e.g. 'Enter full legal name')..."
                            style={{
                                width: '100%',
                                padding: 10,
                                border: '1px solid #cbd5e1',
                                borderRadius: 6,
                                minHeight: 60,
                                fontSize: 13,
                                fontFamily: 'inherit'
                            }}
                        />
                    </FormGroup>

                    <div style={{ display: 'flex', gap: 10 }}>
                        <FormGroup style={{ flex: 1 }}>
                            <Label>Default Value</Label>
                            <Input
                                name="defaultValue"
                                value={data.defaultValue || ''}
                                onChange={handleChange}
                                disabled={readOnly}
                                placeholder="e.g. Pending"
                            />
                        </FormGroup>
                        <FormGroup style={{ width: 100 }}>
                            <Label>&nbsp;</Label>
                            <CheckboxRow style={readOnly ? { cursor: 'default', opacity: 0.7 } : { justifyContent: 'center' }}>
                                <input type="checkbox" name="trim" checked={!!data.trim} onChange={handleChange} disabled={readOnly} />
                                <div style={{ fontSize: 13 }}>Trim</div>
                            </CheckboxRow>
                        </FormGroup>
                    </div>

                    <div style={{ borderTop: '1px solid #e2e8f0', margin: '20px 0' }}></div>

                    <FormGroup>
                        <Label>Data Type</Label>
                        <Select name="pattern" value={data.pattern} onChange={handleChange} disabled={readOnly}>
                            {FIELD_TYPES.map(t => (
                                <option key={t.value} value={t.value}>{t.label}</option>
                            ))}
                        </Select>
                    </FormGroup>

                    {/* TYPE SPECIFIC CONTROLS */}

                    {data.pattern === 'string' && (
                        <div style={{ background: '#f8fafc', padding: 12, borderRadius: 6, marginBottom: 20, border: '1px solid #e2e8f0' }}>
                            <Label style={{ color: '#475569', fontSize: 12, marginBottom: 8 }}>TEXT VALIDATION RULES</Label>

                            <div style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
                                <div style={{ flex: 1 }}>
                                    <Label style={{ fontSize: 11 }}>Min Length</Label>
                                    <Input type="number" name="minLength" value={data.minLength || ''} onChange={handleChange} disabled={readOnly} placeholder="0" />
                                </div>
                                <div style={{ flex: 1 }}>
                                    <Label style={{ fontSize: 11 }}>Max Length</Label>
                                    <Input type="number" name="maxLength" value={data.maxLength || ''} onChange={handleChange} disabled={readOnly} placeholder="255" />
                                </div>
                            </div>

                            <FormGroup style={{ marginBottom: 0 }}>
                                <Label style={{ fontSize: 11 }}>Input Pattern (Mask)</Label>
                                <Select name="mask" value={data.mask || ''} onChange={handleChange} disabled={readOnly}>
                                    <option value="">Any Text (Default)</option>
                                    <option value="alphanumeric">Alphanumeric Only (A-Z, 0-9)</option>
                                    <option value="letters">Letters Only (A-Z)</option>
                                    <option value="no_special">No Special Characters</option>
                                    <option value="uppercase">Uppercase Only (Auto-convert)</option>
                                </Select>
                            </FormGroup>
                        </div>
                    )}

                    {data.pattern === 'integer' && (
                        <div style={{ background: '#f8fafc', padding: 12, borderRadius: 6, marginBottom: 20, border: '1px solid #e2e8f0' }}>
                            <Label style={{ color: '#475569', fontSize: 12, marginBottom: 8 }}>NUMBER RULES</Label>

                            <CheckboxRow style={{ marginBottom: 10 }}>
                                <input type="checkbox" name="allowDecimals" checked={!!data.allowDecimals} onChange={handleChange} disabled={readOnly} />
                                <div>Allow Decimals (Float)</div>
                            </CheckboxRow>

                            <div style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
                                <div style={{ flex: 1 }}>
                                    <Label style={{ fontSize: 11 }}>Min Value</Label>
                                    <Input type="number" name="minValue" value={data.minValue || ''} onChange={handleChange} disabled={readOnly} />
                                </div>
                                <div style={{ flex: 1 }}>
                                    <Label style={{ fontSize: 11 }}>Max Value</Label>
                                    <Input type="number" name="maxValue" value={data.maxValue || ''} onChange={handleChange} disabled={readOnly} />
                                </div>
                            </div>

                            <CheckboxRow style={{ marginBottom: 0 }}>
                                <input type="checkbox" name="allowNegative" checked={!!data.allowNegative} onChange={handleChange} disabled={readOnly} />
                                <div>Allow Negative Numbers</div>
                            </CheckboxRow>

                            <div style={{ borderTop: '1px solid #e2e8f0', margin: '10px 0' }}></div>

                            <CheckboxRow style={readOnly ? { cursor: 'default', opacity: 0.7 } : { marginBottom: 0 }}>
                                <input
                                    type="checkbox"
                                    checked={!!data.sequence}
                                    onChange={handleSequenceChange}
                                    disabled={readOnly || data.allowDecimals}
                                />
                                <div>
                                    <div>Auto-Increment ID</div>
                                    <div style={{ fontSize: 11, color: '#64748b' }}>System generates sequential IDs (+1)</div>
                                </div>
                            </CheckboxRow>
                        </div>
                    )}

                    {data.pattern === 'enum' && (
                        <div style={{ background: '#f8fafc', padding: 12, borderRadius: 6, marginBottom: 20, border: '1px solid #e2e8f0' }}>
                            <FormGroup>
                                <Label>Allowed Values (Options)</Label>
                                {readOnly ? (
                                    <div style={{ padding: 10, background: '#fff', border: '1px solid #cbd5e1', borderRadius: 6 }}>
                                        {data.allowed?.join(', ') || '(None)'}
                                    </div>
                                ) : (
                                    <ChipInput
                                        values={data.allowed}
                                        onChange={vals => setData(prev => ({ ...prev, allowed: vals }))}
                                        placeholder="Type option & hit Enter..."
                                    />
                                )}
                            </FormGroup>

                            <div style={{ display: 'flex', gap: 10 }}>
                                <CheckboxRow style={{ flex: 1, marginBottom: 0 }}>
                                    <input type="checkbox" name="caseSensitive" checked={!!data.caseSensitive} onChange={handleChange} disabled={readOnly} />
                                    <div style={{ fontSize: 13 }}>Case Sensitive</div>
                                </CheckboxRow>
                                <CheckboxRow style={{ flex: 1, marginBottom: 0 }}>
                                    <input type="checkbox" name="allowNew" checked={!!data.allowNew} onChange={handleChange} disabled={readOnly} />
                                    <div style={{ fontSize: 13 }}>Allow New Values</div>
                                </CheckboxRow>
                            </div>
                        </div>
                    )}

                    {data.pattern === 'date' && (
                        <div style={{ background: '#f8fafc', padding: 12, borderRadius: 6, marginBottom: 20, border: '1px solid #e2e8f0' }}>
                            <FormGroup>
                                <Label>Expected Format</Label>
                                <Select name="dateFormat" value={data.dateFormat || 'DD-MM-YYYY'} onChange={handleChange} disabled={readOnly}>
                                    {DATE_FORMATS.map(f => (
                                        <option key={f.value} value={f.value}>{f.label}</option>
                                    ))}
                                </Select>
                            </FormGroup>

                            <FormGroup style={{ marginBottom: 0 }}>
                                <Label>Date Logic</Label>
                                <Select name="dateRange" value={data.dateRange || ''} onChange={handleChange} disabled={readOnly}>
                                    <option value="">Any Date</option>
                                    <option value="past">Must be in the Past (e.g. DOB)</option>
                                    <option value="future">Must be in the Future (e.g. Expiry)</option>
                                    <option value="recent_30">Within last 30 days</option>
                                    <option value="recent_365">Within last 365 days</option>
                                </Select>
                            </FormGroup>
                        </div>
                    )}

                    {data.pattern === 'email' && (
                        <div style={{ background: '#f8fafc', padding: 12, borderRadius: 6, marginBottom: 20, border: '1px solid #e2e8f0' }}>
                            <Label style={{ color: '#475569', fontSize: 12, marginBottom: 8 }}>EMAIL RULES</Label>

                            <CheckboxRow style={{ marginBottom: 10 }}>
                                <input type="checkbox" name="blockFreeEmail" checked={!!data.blockFreeEmail} onChange={handleChange} disabled={readOnly} />
                                <div>Block Free Providers (gmail, etc)</div>
                            </CheckboxRow>

                            <FormGroup style={{ marginBottom: 0 }}>
                                <Label style={{ fontSize: 11 }}>Domain Whitelist (comma separated)</Label>
                                <Input
                                    name="domainWhitelist"
                                    value={data.domainWhitelist || ''}
                                    onChange={handleChange}
                                    disabled={readOnly}
                                    placeholder="e.g. acme.com, partners.org"
                                />
                            </FormGroup>
                        </div>
                    )}

                    {(data.pattern === 'reference' || data.pattern === 'relationship') && (
                        <div style={{ background: '#eff6ff', padding: 12, borderRadius: 6, marginBottom: 20, border: '1px solid #dbeafe' }}>
                            <Label style={{ color: '#1e40af' }}>🔗 Relationship Config</Label>

                            <FormGroup style={{ marginBottom: 12 }}>
                                <Label style={{ fontSize: 12 }}>Link to Template</Label>
                                <Select name="targetTemplate" value={data.targetTemplate} onChange={handleChange} disabled={readOnly}>
                                    <option value="">-- Select Template --</option>
                                    {existingTemplates.map(t => {
                                        const tKey = t.templateKey || t.key;
                                        const isCycle = detectCycle(tKey);
                                        return (
                                            <option
                                                key={tKey}
                                                value={tKey}
                                                disabled={isCycle}
                                                style={isCycle ? { color: '#cbd5e1' } : {}}
                                            >
                                                {t.templateLabel || t.label || tKey}
                                                {isCycle ? ' (Circular Dep)' : ''}
                                            </option>
                                        );
                                    })}
                                </Select>
                            </FormGroup>

                            <FormGroup style={{ marginBottom: 0 }}>
                                <Label style={{ fontSize: 12 }}>Match using Field</Label>
                                <Select
                                    name="targetField"
                                    value={data.targetField}
                                    onChange={handleChange}
                                    disabled={!data.targetTemplate || readOnly}
                                >
                                    <option value="">-- Select Field --</option>
                                    {targetFields.map(f => (
                                        <option key={f.key} value={f.key}>
                                            {f.label} ({f.key}) {f.identifier ? '🔑' : ''}
                                        </option>
                                    ))}
                                </Select>
                            </FormGroup>
                        </div>
                    )}

                    <div style={{ borderTop: '1px solid #e2e8f0', margin: '20px 0' }}></div>

                    {/* VALIDATION & NORMALIZATION */}
                    <FormGroup>
                        <Label>Validation & Formatting</Label>

                        <CheckboxRow style={readOnly ? { cursor: 'default', opacity: 0.7 } : {}}>
                            <input type="checkbox" name="required" checked={data.required} onChange={handleChange} disabled={readOnly} />
                            <div>
                                <div>Required Field</div>
                                <div style={{ fontSize: 11, color: '#64748b' }}>Cannot be empty</div>
                            </div>
                        </CheckboxRow>

                        <CheckboxRow style={readOnly ? { cursor: 'default', opacity: 0.7 } : {}}>
                            <input type="checkbox" name="identifier" checked={data.identifier} onChange={handleChange} disabled={readOnly} />
                            <div>
                                <div>Unique Identifier 🔑</div>
                                <div style={{ fontSize: 11, color: '#64748b' }}>Primary key (e.g. ID number)</div>
                            </div>
                        </CheckboxRow>

                        <CheckboxRow style={Object.assign(
                            data.is_pii ? { borderColor: '#f59e0b', background: '#fffbeb' } : {},
                            readOnly ? { cursor: 'default', opacity: 0.7 } : {}
                        )}>
                            <input type="checkbox" name="is_pii" checked={data.is_pii} onChange={handleChange} disabled={readOnly} />
                            <div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                    Sensitive Data (PII)
                                    <span style={{ display: "flex", alignItems: "center", color: "#b45309" }}>
                                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
                                            <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z" />
                                        </svg>
                                    </span>
                                </div>
                                <div style={{ fontSize: 11, color: '#b45309' }}>Contains personal information</div>
                            </div>
                        </CheckboxRow>


                    </FormGroup>



                </Content>

                <Footer>
                    {!readOnly && field?.key && (
                        <Button variant="danger" onClick={() => onDelete(field.key)} style={{ marginRight: 'auto' }}>
                            Delete
                        </Button>
                    )}
                    <Button onClick={onClose}>{readOnly ? 'Close' : 'Cancel'}</Button>
                    {!readOnly && <Button variant="primary" onClick={handleSave}>Save Column</Button>}
                </Footer>
            </DrawerContainer>
        </DrawerOverlay>
    );
}

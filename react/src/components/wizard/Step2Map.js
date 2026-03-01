import React, { Fragment } from "react";
import {
    Card,
    ToolHeader,
    UploadIcon,
    WizardBar,
    StepCircle,
    StepLabel,
    StepLine,
    SectionTitle,
    SmallNote,
    FixedTableContainer,
    Table,
    Th,
    ResetAction,
    Td,
    CellPill,
    CellSelect,
    ButtonRow,
    Btn,
    ErrorBanner
} from "../../styles";
import FieldTooltip from "../FieldTooltip";
import TemplateBanner from "./TemplateBanner";

export default function Step2Map({
    tpl,
    tplNotEmpty,
    csvHeaders,
    mapping,
    mappingSrc,
    setMapping,
    setMappingSrc,
    ignoredRequirements,
    setIgnoredRequirements,
    mappingsByTemplate,
    setMappingsByTemplate,
    headerAiBusy,

    aiDetectBusy,
    handleAiMapHeaders,
    toggleIgnoreRequirement,
    mappingComplete,
    onBack,
    onNext,
    // Props for TemplateBanner
    templatesByKey,
    detectedTemplateKeys,
    selectedTemplateKey,
    allowMultiTemplates,
    setAllowMultiTemplates,
    handleAiDetectAndMap,
    addTemplate,
    loadTemplateState,
    removeTemplate,
    isTemplateComplete,
    step,
    error


}) {
    return (
        <Card>

            <WizardBar>
                <StepCircle done>1</StepCircle>
                <StepLabel>Select File</StepLabel>
                <StepLine />
                <StepCircle active>2</StepCircle>
                <StepLabel>Validate</StepLabel>
                <StepLine />
                <StepCircle>3</StepCircle>
                <StepLabel>Confirm</StepLabel>
                <StepLine />
                <StepCircle>4</StepCircle>
                <StepLabel>Process</StepLabel>
            </WizardBar>

            <SectionTitle>Validate Headers</SectionTitle>

            {error && <ErrorBanner>{error}</ErrorBanner>}

            {tplNotEmpty && tpl ? (
                <TemplateBanner
                    tplNotEmpty={tplNotEmpty}
                    tpl={tpl}
                    templatesByKey={templatesByKey}
                    detectedTemplateKeys={detectedTemplateKeys}
                    selectedTemplateKey={selectedTemplateKey}
                    csvHeaders={csvHeaders}
                    headerAiBusy={headerAiBusy}
                    aiDetectBusy={aiDetectBusy}
                    allowMultiTemplates={allowMultiTemplates}
                    setAllowMultiTemplates={setAllowMultiTemplates}
                    handleAiDetectAndMap={handleAiDetectAndMap}
                    addTemplate={addTemplate}
                    loadTemplateState={loadTemplateState}
                    removeTemplate={removeTemplate}
                    isTemplateComplete={isTemplateComplete}
                    step={step}
                />
            ) : (
                /* Fallback when NO templates are selected but we have CSV headers */
                csvHeaders.length > 0 && (
                    <div style={{ padding: 20, textAlign: "center", background: "#f8fafc", borderRadius: 8, border: "1px dashed #cbd5e1", margin: "20px 0" }}>
                        <h4 style={{ margin: "0 0 10px 0", color: "#64748b" }}>No Templates Selected</h4>
                        <p style={{ fontSize: 13, color: "#94a3b8", marginBottom: 15 }}>
                            Please select at least one template to map your data against.
                        </p>
                        <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
                            <select
                                onChange={(e) => {
                                    if (e.target.value) {
                                        addTemplate(e.target.value);
                                    }
                                }}
                                value=""
                                style={{
                                    padding: "8px 12px",
                                    borderRadius: 4,
                                    border: "1px solid #cbd5e1",
                                    fontSize: 13,
                                    minWidth: 200
                                }}
                            >
                                <option value="">+ Add Template</option>
                                {Object.values(templatesByKey).map(t => (
                                    <option key={t.key} value={t.key}>{t.label}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                )
            )}

            {!csvHeaders.length && (
                <SmallNote>No CSV loaded. Go back and upload a file.</SmallNote>
            )}

            {csvHeaders.length > 0 && tpl && tpl.fields?.length > 0 && (
                <Fragment>
                    <FixedTableContainer>
                        <Table>
                            <thead>
                                <tr>
                                    <Th style={{ width: "35%", background: "#fff", borderBottom: "2px solid #f1f5f9" }}>
                                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                            <span>Expected Header</span>
                                            <ResetAction
                                                onClick={() => {
                                                    setIgnoredRequirements((prev) => {
                                                        const next = { ...prev };
                                                        delete next[tpl.key];
                                                        return next;
                                                    });
                                                }}
                                                title="Reset all fields to template defaults"
                                            >
                                                <span>↺</span>
                                            </ResetAction>
                                        </div>
                                    </Th>
                                    <Th style={{ width: "35%", background: "#fff", borderBottom: "2px solid #f1f5f9" }}>Uploaded Header</Th>
                                    <Th style={{ background: "#fff", borderBottom: "2px solid #f1f5f9" }}>
                                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                                            <span>Mapping Status</span>
                                            {/* Map Headers Button (formerly AI Map) */}

                                            <button
                                                type="button"
                                                onClick={handleAiMapHeaders}
                                                disabled={headerAiBusy || aiDetectBusy || !csvHeaders.length}
                                                style={{
                                                    height: 32, // standard button height
                                                    padding: "0 16px", // wider padding
                                                    fontSize: 13, // readable font size
                                                    fontWeight: 600,
                                                    borderRadius: 4,
                                                    border: "none",
                                                    background: headerAiBusy ? "#93c5fd" : "#7c3aed",
                                                    color: "#fff",
                                                    cursor: headerAiBusy || aiDetectBusy || !csvHeaders.length ? "default" : "pointer",
                                                    display: "flex",
                                                    alignItems: "center",
                                                    gap: 6, // gap for icon
                                                    opacity: (aiDetectBusy || !csvHeaders.length) ? 0.5 : 1,
                                                    minWidth: 140,
                                                    justifyContent: "center"
                                                }}
                                                title={`Auto-map columns for '${tpl.label}'`}
                                            >
                                                <span>✨</span>
                                                {headerAiBusy ? "Thinking..." : "Map Headers"}
                                            </button>
                                        </div>
                                    </Th>
                                </tr>
                            </thead>
                            <tbody>
                                {(() => {
                                    const usedValues = new Set(Object.values(mapping).filter(v => v));
                                    return tpl.fields.map((f) => {
                                        const selected = mapping[f.key] || "";
                                        const src = mappingSrc[f.key] || "none";
                                        const isPresent = csvHeaders.includes(selected);

                                        const isIgnored = !!ignoredRequirements[tpl.key]?.[f.key];
                                        const isValid = selected && isPresent;
                                        const isAi = src === "ai";

                                        let kind = "neutral";
                                        let label = "";

                                        if (isValid) {
                                            kind = "direct";
                                            label = "Matched";
                                        } else if (f.required) {
                                            if (isIgnored) {
                                                kind = "neutral";
                                                label = "Ignored (Manual Entry)"; // Explicit label as requested
                                                // If strict mode is validation-blocking, maybe color it differently? 
                                                // But effectively if strict mode is on, isIgnored is treated as incomplete.
                                            } else {
                                                kind = "none";
                                                label = "Required";
                                            }
                                        }


                                        return (
                                            <tr key={f.key} style={{ transition: "background 0.15s" }}>
                                                <Td style={{ fontWeight: 500, color: "#334155" }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                                        {/* Allow user to opt-out of required fields (Manual Entry) */}
                                                        {f.required && (

                                                            <input
                                                                type="checkbox"
                                                                title="Uncheck to enter data manually later"
                                                                checked={!isIgnored}
                                                                onChange={(e) =>
                                                                    toggleIgnoreRequirement(tpl.key, f.key, !e.target.checked)
                                                                }
                                                                style={{ cursor: "pointer", margin: 0 }}
                                                            />
                                                        )}

                                                        <span>
                                                            {f.label}
                                                            {f.required && (
                                                                <span style={{ color: "#ef4444", marginLeft: 2 }}>
                                                                    *
                                                                </span>
                                                            )}
                                                        </span>
                                                        <FieldTooltip field={f} />
                                                    </div>
                                                </Td>
                                                <Td>
                                                    <CellPill status={kind === "none" ? "bad" : isValid ? "ok" : "neutral"}>
                                                        <CellSelect
                                                            value={selected}
                                                            onChange={(e) => {
                                                                const v = e.target.value;

                                                                const nextMap = { ...mapping, [f.key]: v };
                                                                // Set to MANUAL if user changes it
                                                                const nextSrc = { ...mappingSrc, [f.key]: v ? "manual" : "none" };

                                                                setMapping(nextMap);
                                                                setMappingSrc(nextSrc);

                                                                if (tpl?.key) {
                                                                    setMappingsByTemplate((prev) => ({
                                                                        ...prev,
                                                                        [tpl.key]: { mapping: nextMap, mappingSrc: nextSrc },
                                                                    }));
                                                                }
                                                            }}
                                                            style={{ background: "transparent", border: "none", width: "100%" }}
                                                        >
                                                            <option value="">(Select Header)</option>
                                                            {csvHeaders.map((h) => {
                                                                const isUsed = usedValues.has(h) && h !== selected;
                                                                return (
                                                                    <option key={h} value={h} disabled={isUsed} style={{ color: isUsed ? "#cbd5e1" : "inherit" }}>
                                                                        {h} {isUsed ? "(Mapped)" : ""}
                                                                    </option>
                                                                );
                                                            })}
                                                        </CellSelect>
                                                    </CellPill>
                                                </Td>
                                                <Td>
                                                    {label && (
                                                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                                            <span
                                                                style={{
                                                                    fontSize: 11,
                                                                    fontWeight: 600,
                                                                    color:
                                                                        kind === "direct"
                                                                            ? "#16a34a"
                                                                            : kind === "none"
                                                                                ? "#ef4444"
                                                                                : "#64748b",
                                                                    textTransform: "uppercase",
                                                                    letterSpacing: 0.5,
                                                                }}
                                                            >
                                                                {label}
                                                            </span>
                                                            {isAi && (
                                                                <span title="AI Connected" style={{ fontSize: 12 }}>
                                                                    🤖
                                                                </span>
                                                            )}
                                                        </div>
                                                    )}
                                                </Td>
                                            </tr>
                                        );
                                    });
                                })()}
                            </tbody>
                        </Table>
                    </FixedTableContainer>
                </Fragment>
            )}

            <ButtonRow>
                <Btn variant="secondary" onClick={onBack} disabled={headerAiBusy || aiDetectBusy}>
                    Back
                </Btn>
                <Btn
                    variant="primary"

                    disabled={headerAiBusy || aiDetectBusy || !mappingComplete}
                    onClick={onNext}
                >
                    Next
                </Btn>
            </ButtonRow>
        </Card>
    );
}

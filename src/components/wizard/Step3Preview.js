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
    Td,
    CellInner,
    CellControl,
    CellInput,
    CellSelect,
    ButtonRow,
    Btn,
    ErrorBanner,
    SourceTag
} from "../../styles";
import FieldTooltip from "../FieldTooltip";
import TemplateBanner from "./TemplateBanner";
import { getTagKind } from "../../utils/helpers";

export default function Step3Preview({
    tpl,
    tplNotEmpty,
    grid,
    rowErrors,
    previewPage,
    setPreviewPage,
    PREVIEW_PAGE_SIZE,
    startEdit,
    updateEdit,
    commitEdit,
    applyCellUpdate,
    editing,
    onBack,
    onNext,
    gridHasBad,
    saveBusy,
    error,
    // TemplateBanner props
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
    allTemplatesValid,
    // Extra props for Banner if needed
    csvHeaders,
    headerAiBusy,
    aiDetectBusy,
    cleanBusy,
    aiCleanAll,
    // AI Options
    includePii,
    setIncludePii,
    ensureNoEmpty,
    setEnsureNoEmpty,
    cleanValidValues,
    setCleanValidValues
}) {
    const pageStart = (previewPage - 1) * PREVIEW_PAGE_SIZE;
    const pageEnd = pageStart + PREVIEW_PAGE_SIZE;
    const pageRows = grid.slice(pageStart, pageEnd);


    return (
        <Card>

            <WizardBar>
                <StepCircle done>1</StepCircle>
                <StepLabel>Select File</StepLabel>
                <StepLine />
                <StepCircle done>2</StepCircle>
                <StepLabel>Validate</StepLabel>
                <StepLine />
                <StepCircle active>3</StepCircle>
                <StepLabel>Confirm</StepLabel>
                <StepLine />
                <StepCircle>4</StepCircle>
                <StepLabel>Process</StepLabel>
            </WizardBar>

            <SectionTitle>Preview &amp; Confirm</SectionTitle>
            {tplNotEmpty && tpl && (
                <TemplateBanner
                    tplNotEmpty={tplNotEmpty}
                    tpl={tpl}
                    templatesByKey={templatesByKey}
                    detectedTemplateKeys={detectedTemplateKeys}
                    selectedTemplateKey={selectedTemplateKey}
                    csvHeaders={csvHeaders} // Needed for banner controls
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
            )}

            {/* AI Controls Toolbar */}
            {grid.length > 0 && (
                <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", marginBottom: 12, padding: "0 4px", gap: 16 }}>
                    <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "#334155", cursor: "pointer" }}>
                        <input
                            type="checkbox"
                            checked={includePii}
                            onChange={(e) => setIncludePii(e.target.checked)}
                        />
                        Include PII in AI Clean
                    </label>
                    <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "#334155", cursor: "pointer" }}>
                        <input
                            type="checkbox"
                            checked={ensureNoEmpty}
                            onChange={(e) => setEnsureNoEmpty(e.target.checked)}
                        />
                        Ensure no empty values
                    </label>
                    <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "#334155", cursor: "pointer" }}>
                        <input
                            type="checkbox"
                            checked={cleanValidValues}
                            onChange={(e) => setCleanValidValues(e.target.checked)}
                        />
                        Clean valid values
                    </label>

                    <button
                        onClick={aiCleanAll}
                        disabled={cleanBusy}
                        style={{
                            padding: "6px 16px",
                            border: "1px solid #cbd5e1",
                            background: "linear-gradient(to bottom, #ffffff, #f8fafc)",
                            borderRadius: 6,
                            cursor: cleanBusy ? "default" : "pointer",
                            color: "#334155",
                            display: "flex",
                            alignItems: "center",
                            gap: 6,
                            fontWeight: 500,
                            boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
                            minWidth: 150,
                            justifyContent: "center"
                        }}
                        title="Uses AI to clean the currently visible 50 rows"
                    >
                        <span>✨</span>
                        {cleanBusy ? "Cleaning..." : "AI Clean Page"}
                    </button>
                </div>
            )}

            {grid.length > 0 && tpl && tpl.fields?.length > 0 ? (
                <Fragment>
                    <FixedTableContainer>
                        <Table>
                            <thead>
                                <tr>
                                    <Th style={{ width: 50, minWidth: 50, maxWidth: 50, textAlign: "center", position: "sticky", left: 0, zIndex: 2 }}>#</Th>
                                    {tpl.fields.map((f) => {
                                        let colWidth = 180; // default
                                        const lowerKey = f.key.toLowerCase();
                                        const lowerLabel = f.label.toLowerCase();

                                        if (lowerKey.includes("id") || lowerKey.includes("no") || lowerLabel.includes("no")) colWidth = 120;
                                        if (lowerKey.includes("status") || lowerLabel.includes("status")) colWidth = 140;
                                        if (lowerKey.includes("note") || lowerLabel.includes("note")) colWidth = 350;
                                        if (lowerKey.includes("test") || lowerLabel.includes("test")) colWidth = 200;
                                        if (lowerKey.includes("assessment") || lowerLabel.includes("assessment")) colWidth = 250;

                                        return (
                                            <Th key={f.key} style={{ minWidth: colWidth }}>
                                                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                                    <span>
                                                        {f.label}
                                                        {f.required && (
                                                            <span style={{ color: "#ef4444", marginLeft: 2 }}>*</span>
                                                        )}
                                                    </span>
                                                    {f.isPii && (
                                                        <span title="PII Field" style={{ display: "flex", alignItems: "center", color: "#64748b" }}>
                                                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
                                                                <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z" />
                                                            </svg>
                                                        </span>
                                                    )}
                                                    <FieldTooltip field={f} />
                                                </div>
                                            </Th>
                                        );
                                    })}
                                </tr>
                            </thead>
                            <tbody>
                                {pageRows.map((row) => { // Use pageRows instead of full grid
                                    return (
                                        <tr key={row.__rowIndex}>
                                            <Td style={{ textAlign: "center", color: "#94a3b8", fontSize: 11, background: "#f8fafc", position: "sticky", left: 0, zIndex: 1 }}>
                                                {row.__rowIndex + 1}
                                            </Td>
                                            {tpl.fields.map((f) => {
                                                const cell = row[f.key] || {};
                                                const kind = getTagKind(cell);
                                                const cellId = `${row.__rowIndex} -${f.key} `;
                                                const isEditing = editing[cellId] !== undefined;

                                                let style = {};
                                                if (cell.status === "bad") {
                                                    style = { background: "#fef2f2", border: "1px solid #fecaca" };
                                                } else {
                                                    // Default to green for valid
                                                    style = { background: "#f0fdf4", border: "1px solid #bbf7d0" };
                                                }

                                                const isEnum = f.allowed && f.allowed.length > 0;

                                                return (
                                                    <Td key={f.key} style={{ padding: 0 }}>
                                                        <CellInner
                                                            status={cell.status}
                                                            style={style}
                                                            onClick={() => !isEditing && !isEnum && startEdit(row.__rowIndex, f.key)}
                                                            title={cell.validationError || ""} // Show error tooltip
                                                        >
                                                            {isEnum ? (
                                                                // Always-on dropdown for enum fields. Commits immediately
                                                                // on change so the cell turns green without a blur step.
                                                                <CellControl>
                                                                    <CellSelect
                                                                        value={cell.value || ""}
                                                                        onChange={(e) =>
                                                                            applyCellUpdate
                                                                                ? applyCellUpdate(row.__rowIndex, f.key, e.target.value)
                                                                                : (updateEdit(row.__rowIndex, f.key, e.target.value), commitEdit(row.__rowIndex, f.key))
                                                                        }
                                                                    >
                                                                        <option value="">(Select)</option>
                                                                        {f.allowed.map((val) => (
                                                                            <option key={val} value={val}>
                                                                                {val}
                                                                            </option>
                                                                        ))}
                                                                    </CellSelect>
                                                                </CellControl>
                                                            ) : isEditing ? (
                                                                <CellControl>
                                                                    <CellInput
                                                                        autoFocus
                                                                        value={editing[cellId]}
                                                                        onChange={(e) => updateEdit(row.__rowIndex, f.key, e.target.value)}
                                                                        onBlur={() => commitEdit(row.__rowIndex, f.key)}
                                                                        onKeyDown={(e) => {
                                                                            if (e.key === "Enter") commitEdit(row.__rowIndex, f.key);
                                                                        }}
                                                                    />
                                                                </CellControl>
                                                            ) : (
                                                                <span
                                                                    title={cell.value}
                                                                    style={{
                                                                        padding: "8px 12px",
                                                                        display: "block",
                                                                        width: "100%",
                                                                        whiteSpace: "nowrap",
                                                                        overflow: "hidden",
                                                                        textOverflow: "ellipsis",
                                                                        fontSize: 13,
                                                                        fontFamily: "inherit",
                                                                        lineHeight: "inherit",
                                                                        color: cell.status === "bad" ? "#ef4444" : "inherit"
                                                                    }}
                                                                >
                                                                    {cell.value || <span style={{ color: "#cbd5e1" }}>(empty)</span>}
                                                                </span>
                                                            )}
                                                            {/* Error icon/indicator */}
                                                            {/* Source Badge (AI/User) */}
                                                            {kind && !isEditing && cell.status !== "bad" && (
                                                                <SourceTag
                                                                    kind={kind}
                                                                    title={cell.prev ? `Original value: ${cell.prev}` : `Source: ${kind === "ai" ? "AI Clean" : "Manual Edit"}`}
                                                                    style={{
                                                                        position: "absolute",
                                                                        right: 4,
                                                                        bottom: 2,
                                                                        cursor: "help"
                                                                    }}
                                                                >
                                                                    {kind === "ai" ? "AI" : "User"}
                                                                </SourceTag>
                                                            )}
                                                        </CellInner>
                                                    </Td>
                                                );
                                            })}
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </Table>
                    </FixedTableContainer>
                    {/* Pagination Controls moved to below table */}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 12, padding: "0 4px" }}>
                        <SmallNote style={{ marginTop: 0 }}>
                            Showing <b>{pageRows.length}</b> of <b>{grid.length}</b> rows.
                        </SmallNote>
                        <div style={{ display: "flex", gap: 8 }}>
                            <button
                                disabled={previewPage === 1}
                                onClick={() => setPreviewPage(p => p - 1)}
                                style={{
                                    padding: "4px 12px",
                                    border: "1px solid #cbd5e1",
                                    background: previewPage === 1 ? "#f1f5f9" : "#fff",
                                    borderRadius: 4,
                                    cursor: previewPage === 1 ? "default" : "pointer",
                                    color: previewPage === 1 ? "#94a3b8" : "#334155"
                                }}
                            >
                                &larr; Prev
                            </button>
                            <button
                                disabled={previewPage === Math.ceil(grid.length / PREVIEW_PAGE_SIZE)}
                                onClick={() => setPreviewPage(p => p + 1)}
                                style={{
                                    padding: "4px 12px",
                                    border: "1px solid #cbd5e1",
                                    background: previewPage === Math.ceil(grid.length / PREVIEW_PAGE_SIZE) ? "#f1f5f9" : "#fff",
                                    borderRadius: 4,
                                    cursor: previewPage === Math.ceil(grid.length / PREVIEW_PAGE_SIZE) ? "default" : "pointer",
                                    color: previewPage === Math.ceil(grid.length / PREVIEW_PAGE_SIZE) ? "#94a3b8" : "#334155"
                                }}
                            >
                                Next &rarr;
                            </button>
                        </div>
                    </div>
                </Fragment>
            ) : (
                <SmallNote>No data to preview.</SmallNote>
            )}

            {error && <ErrorBanner>{error}</ErrorBanner>}

            <ButtonRow>
                <Btn variant="secondary" onClick={onBack}>
                    Back
                </Btn>
                <Btn
                    variant="primary"
                    disabled={!allTemplatesValid || saveBusy}
                    onClick={onNext}
                >
                    Confirm Import
                </Btn>
            </ButtonRow>
        </Card>
    );
}

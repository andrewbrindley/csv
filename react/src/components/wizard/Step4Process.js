import React from "react";
import {
    Card,
    ToolHeader,
    UploadIcon,
    WizardBar,
    StepCircle,
    StepLabel,
    StepLine,
    SectionTitle,
    ButtonRow,
    Btn,
    CodeBadge
} from "../../styles";

export default function Step4Process({
    processingSummary,
    onReset,
    activeJobId,
    showTechnicalDetails,
    setShowTechnicalDetails
}) {
    return (
        <Card>

            <WizardBar>
                <StepCircle done>1</StepCircle>
                <StepLabel>Select File</StepLabel>
                <StepLine />
                <StepCircle done>2</StepCircle>
                <StepLabel>Validate</StepLabel>
                <StepLine />
                <StepCircle done>3</StepCircle>
                <StepLabel>Confirm</StepLabel>
                <StepLine />
                <StepCircle active>4</StepCircle>
                <StepLabel>Process</StepLabel>
            </WizardBar>

            <SectionTitle>Processing Started</SectionTitle>

            {processingSummary && (
                <div style={{ padding: 20, background: "#f0fdf4", borderRadius: 8, border: "1px solid #bbf7d0", marginBottom: 20 }}>
                    <div style={{ fontSize: 16, fontWeight: 600, color: "#15803d", marginBottom: 12, display: "flex", alignItems: "center", gap: 10 }}>
                        <span>Import Job Queued</span>
                        {activeJobId && (
                            <CodeBadge style={{ fontSize: 12, color: "#166534", background: "#dcfce7", border: "1px solid #86efac" }}>
                                Job ID: {activeJobId}
                            </CodeBadge>
                        )}
                    </div>
                    <div style={{ fontSize: 14, color: "#334155", lineHeight: 1.6 }}>
                        Your data has been submitted for processing. This may take some time depending on the file size.
                        <br />
                        You can track progress in the <b>Job History</b> tab.
                    </div>
                    <div style={{ marginTop: 12, display: "none" }}> {/* Hiding immediate counts as they are async */}
                        <div style={{ background: "#fff", padding: 10, borderRadius: 6, border: "1px solid #dcfce7" }}>
                            <div style={{ fontSize: 12, color: "#64748b" }}>Created</div>
                            <div style={{ fontSize: 18, fontWeight: 700, color: "#15803d" }}>{processingSummary.created}</div>
                        </div>
                    </div>
                </div>
            )}

            {/* Technical Details Toggle */}
            {processingSummary && processingSummary.logs && processingSummary.logs.length > 0 && (
                <div style={{ marginBottom: 20 }}>
                    <button
                        onClick={() => setShowTechnicalDetails(!showTechnicalDetails)}
                        style={{
                            background: "none",
                            border: "none",
                            color: "#64748b",
                            fontSize: 13,
                            textDecoration: "underline",
                            cursor: "pointer",
                            padding: 0
                        }}
                    >
                        {showTechnicalDetails ? "Hide Technical Logs" : "Show Technical Logs"}
                    </button>

                    {showTechnicalDetails && (
                        <div style={{ marginTop: 10, background: "#1e293b", color: "#f1f5f9", padding: 12, borderRadius: 6, maxHeight: 200, overflowY: "auto", fontSize: 12, fontFamily: "monospace" }}>
                            {processingSummary.logs.map((log) => (
                                <div key={log.id} style={{ marginBottom: 4, display: "flex", gap: 8 }}>
                                    <span style={{ color: "#64748b" }}>[{log.time}]</span>
                                    <span style={{ color: log.status === "Skipped" ? "#f59e0b" : log.status === "Failed" ? "#ef4444" : "#10b981" }}>
                                        {log.status.toUpperCase()}
                                    </span>
                                    <span>{log.message}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            <ButtonRow>
                <Btn variant="primary" onClick={onReset}>
                    Start New Import
                </Btn>
            </ButtonRow>
        </Card>
    );
}

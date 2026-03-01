import React from "react";
import {
    StatusDot,
    TemplateTabBtn,
    RemoveTabBtn
} from "../../styles";

export default function TemplateBanner({
    tplNotEmpty,
    tpl,
    templatesByKey,
    detectedTemplateKeys,
    selectedTemplateKey,
    csvHeaders,
    headerAiBusy,
    aiDetectBusy,
    allowMultiTemplates,
    setAllowMultiTemplates,
    handleAiDetectAndMap,
    addTemplate,
    loadTemplateState,
    removeTemplate,
    isTemplateComplete,
    step
}) {
    if (!tplNotEmpty || !tpl) return null;




    const availableTemplates = Object.values(templatesByKey).filter(
        (t) => !detectedTemplateKeys.includes(t.key)
    );

    return (
        <div
            style={{
                padding: "16px",
                background: "#f8fafc",
                border: "1px solid #e2e8f0",
                borderRadius: 8,
                marginBottom: 20,
                fontSize: 13,
                boxShadow: "0 1px 2px rgba(0,0,0,0.02)"
            }}
        >
            {/* Top Row: Global Controls (Add Template, Multi-Mode, Auto-Detect) */
                step !== 3 && (
                    <div
                        style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            marginBottom: detectedTemplateKeys.length > 0 ? 12 : 0,
                            paddingBottom: detectedTemplateKeys.length > 0 ? 12 : 0,
                            borderBottom: detectedTemplateKeys.length > 0 ? "1px solid #e2e8f0" : "none",
                        }}
                    >
                        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                            <span style={{ fontSize: 14, fontWeight: 600, color: "#0f172a" }}>
                                Active Templates
                            </span>

                            <div style={{ display: "flex", gap: 8 }}>
                                <select
                                    value={""}
                                    onChange={(e) => addTemplate(e.target.value)}
                                    style={{
                                        padding: "6px 10px",
                                        fontSize: 13,
                                        borderRadius: 6,
                                        minWidth: 160,
                                        border: "1px solid #cbd5e1",
                                        background: "#fff"
                                    }}
                                >
                                    <option value="" disabled>
                                        + Add Template...
                                    </option>
                                    {availableTemplates.map((t) => (
                                        <option key={t.key} value={t.key}>
                                            {t.label}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                            <button
                                type="button"
                                onClick={handleAiDetectAndMap}
                                disabled={headerAiBusy || aiDetectBusy || !csvHeaders.length}
                                style={{
                                    height: 34,
                                    padding: "0 14px",
                                    fontSize: 13,
                                    fontWeight: 500,
                                    borderRadius: 6,
                                    border: "1px solid #cbd5e1",
                                    background: "#fff",
                                    color: "#475569",
                                    cursor: headerAiBusy || aiDetectBusy || !csvHeaders.length ? "default" : "pointer",
                                    opacity: (headerAiBusy || !csvHeaders.length) ? 0.5 : 1,
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 6,
                                    transition: "all 0.15s ease",
                                    minWidth: 200,
                                    justifyContent: "center"
                                }}
                                title="Let AI scan the whole file to guess templates"
                            >
                                <span>🤖</span>
                                {aiDetectBusy ? "Scanning..." : "Auto-Detect Templates"}
                            </button>

                            <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "#334155", cursor: "pointer", fontWeight: 500 }}>
                                <input
                                    type="checkbox"
                                    checked={allowMultiTemplates}
                                    onChange={(e) => setAllowMultiTemplates(e.target.checked)}
                                    style={{ cursor: "pointer", width: 14, height: 14 }}
                                />
                                <span>Multi-template Mode</span>
                            </label>
                        </div>
                    </div>
                )}

            {/* Middle Row: Active Template Tabs */}

            <div
                style={{
                    display: "flex",
                    gap: 8,
                    flexWrap: "wrap",
                    marginBottom: 16
                }}
            >
                {(detectedTemplateKeys.length > 0 ? detectedTemplateKeys : [selectedTemplateKey]).map((key) => {
                    const t = templatesByKey[key];
                    if (!t) return null;
                    const isActive = key === selectedTemplateKey;
                    const isComplete = isTemplateComplete(key, step === 3);

                    return (
                        <TemplateTabBtn
                            key={key}
                            type="button"
                            active={isActive}
                            onClick={() => loadTemplateState(key)}
                        >
                            <StatusDot color={isComplete ? "#16a34a" : "#ca8a04"} />
                            {t.label}
                            {detectedTemplateKeys.includes(key) && (
                                <RemoveTabBtn onClick={(e) => removeTemplate(key, e)}>✕</RemoveTabBtn>
                            )}
                        </TemplateTabBtn>
                    );
                })}
            </div>
        </div>
    );
}

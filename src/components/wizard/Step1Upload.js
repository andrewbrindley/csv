import React, { useState } from "react";
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
    DropZone,
    DZMain,
    DZHint,
    ErrorBanner,
    ButtonRow,
    Btn
} from "../../styles";

export default function Step1Upload({
    fileName,
    csvHeaders, // checking length to enable Next
    error,
    busy,
    onFileSelect,
    onNext,
    onCancel
}) {
    const [drag, setDrag] = useState(false);

    const onDrop = (e) => {
        e.preventDefault();
        setDrag(false);
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            onFileSelect(e.dataTransfer.files);
            e.dataTransfer.clearData();
        }
    };

    return (
        <Card>

            <WizardBar>
                <StepCircle active>1</StepCircle>
                <StepLabel>Select File</StepLabel>
                <StepLine />
                <StepCircle>2</StepCircle>
                <StepLabel>Validate</StepLabel>
                <StepLine />
                <StepCircle>3</StepCircle>
                <StepLabel>Confirm</StepLabel>
                <StepLine />
                <StepCircle>4</StepCircle>
                <StepLabel>Process</StepLabel>
            </WizardBar>

            <SectionTitle>Upload CSV File</SectionTitle>
            <SmallNote>
                We’ll detect the most likely template and mark PII for safe downstream processing.
            </SmallNote>

            <DropZone
                drag={drag}
                onDragOver={(e) => {
                    e.preventDefault();
                    setDrag(true);
                }}
                onDragLeave={() => setDrag(false)}
                onDrop={onDrop}
                onClick={() => document.getElementById("fileInput")?.click()}
            >
                <DZMain>
                    Drag &amp; drop a CSV file here, or <b>click to select</b>.
                </DZMain>
                <DZHint>Any CSV with headers is fine.</DZHint>
                {fileName && (
                    <SmallNote>
                        Selected: <b>{fileName}</b>
                    </SmallNote>
                )}
            </DropZone>

            <input
                id="fileInput"
                type="file"
                accept=".csv"
                style={{ display: "none" }}
                onChange={(e) => {
                    const files = e.target.files;
                    if (!files || !files.length) return;
                    onFileSelect(files);
                    e.target.value = "";
                }}
            />

            {error && <ErrorBanner>{error}</ErrorBanner>}

            <ButtonRow>
                <Btn variant="secondary" onClick={onCancel}>
                    Cancel
                </Btn>
                <Btn
                    variant="primary"
                    disabled={!csvHeaders?.length || busy}
                    onClick={onNext}
                >
                    Next
                </Btn>
            </ButtonRow>
        </Card>
    );
}

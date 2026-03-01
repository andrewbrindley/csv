import React, { useState, useRef, Fragment } from "react";
import ReactDOM from "react-dom";
import {
    TooltipContainer,
    TooltipCard,
    TooltipHeader,
    TooltipBody,
    TooltipSection,
    TooltipLabel,
    CodeBadge
} from "../styles";

const Portal = ({ children }) => {
    return ReactDOM.createPortal(children, document.body);
};

export default function FieldTooltip({ field }) {
    const [visible, setVisible] = useState(false);
    const [coords, setCoords] = useState({ top: 0, left: 0 });
    const containerRef = useRef(null);

    if (!field) return null;

    const handleMouseEnter = () => {
        if (containerRef.current) {
            const rect = containerRef.current.getBoundingClientRect();
            setCoords({
                top: rect.top - 8,
                left: rect.left + rect.width / 2,
            });
            setVisible(true);
        }
    };

    const handleMouseLeave = () => {
        setVisible(false);
    };

    return (
        <Fragment>
            <TooltipContainer
                ref={containerRef}
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
            >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" width="15" height="15" style={{ opacity: 0.7 }}>
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 101 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
            </TooltipContainer>

            {visible && (
                <Portal>
                    <div
                        style={{
                            position: "fixed",
                            top: coords.top,
                            left: coords.left,
                            transform: "translate(-50%, -100%)",
                            zIndex: 9999,
                            pointerEvents: "none",
                        }}
                    >
                        <TooltipCard style={{ width: "280px" }}>
                            <TooltipHeader>
                                {field.label}
                                {field.required && <span style={{ color: "#ef4444", fontSize: 10, background: "#fee2e2", padding: "1px 4px", borderRadius: 4 }}>REQ</span>}
                            </TooltipHeader>
                            <TooltipBody>
                                <TooltipSection>
                                    {field.description || "No description available."}
                                </TooltipSection>

                                {(field.allowed || (field.pattern && field.pattern !== "string")) && (
                                    <TooltipSection>
                                        <TooltipLabel>Format</TooltipLabel>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                            {/* Pattern Label */}
                                            <div>
                                                {field.allowed
                                                    ? `One of: ${field.allowed.join(", ")}`
                                                    : field.pattern === "date"
                                                        ? `Date (${field.dateFormat || "DD-MM-YYYY"})`
                                                        : field.pattern === "email"
                                                            ? "Email Address"
                                                            : field.pattern === "integer"
                                                                ? "Number"
                                                                : field.pattern === "relationship"
                                                                    ? "Linked Record ID"
                                                                    : "Text"}
                                            </div>

                                            {/* Detailed Rules */}
                                            {(field.minLength || field.maxLength) && (
                                                <div style={{ color: '#64748b', fontSize: 11 }}>
                                                    Length: {field.minLength || 0} - {field.maxLength || 'Any'} chars
                                                </div>
                                            )}
                                            {field.mask && (
                                                <div style={{ color: '#64748b', fontSize: 11 }}>
                                                    Mask: {field.mask === 'alphanumeric' ? 'Alphanumeric' :
                                                        field.mask === 'letters' ? 'Letters Only' :
                                                            field.mask === 'uppercase' ? 'Uppercase' : field.mask}
                                                </div>
                                            )}
                                            {(field.minValue || field.maxValue) && (
                                                <div style={{ color: '#64748b', fontSize: 11 }}>
                                                    Range: {field.minValue || '-∞'} to {field.maxValue || '+∞'}
                                                </div>
                                            )}
                                            {field.pattern === 'integer' && (
                                                <div style={{ color: '#64748b', fontSize: 11 }}>
                                                    {field.allowDecimals ? 'Decimals allowed' : 'Whole numbers only'}
                                                    {field.allowNegative ? ', Negatives allowed' : ''}
                                                </div>
                                            )}
                                            {field.dateRange && (
                                                <div style={{ color: '#64748b', fontSize: 11 }}>
                                                    Rule: {field.dateRange === 'past' ? 'Must be in past' :
                                                        field.dateRange === 'future' ? 'Must be in future' :
                                                            field.dateRange === 'recent_30' ? 'Last 30 days' : field.dateRange}
                                                </div>
                                            )}
                                            {field.pattern === 'email' && (
                                                <div style={{ color: '#64748b', fontSize: 11 }}>
                                                    {field.blockFreeEmail && <div>🚫 Free providers blocked</div>}
                                                    {field.domainWhitelist && <div>Allowed: {field.domainWhitelist}</div>}
                                                </div>
                                            )}
                                            {field.pattern === 'relationship' && field.relationship && (
                                                <div style={{ color: '#64748b', fontSize: 11 }}>
                                                    → {field.relationship.targetTemplate} ({field.relationship.targetField || 'id'})
                                                </div>
                                            )}
                                        </div>
                                    </TooltipSection>
                                )}

                                {field.examples && field.examples.length > 0 && (
                                    <TooltipSection>
                                        <TooltipLabel>Examples</TooltipLabel>
                                        <div>
                                            {field.examples.map(ex => <CodeBadge key={ex}>{ex}</CodeBadge>)}
                                        </div>
                                    </TooltipSection>
                                )}
                            </TooltipBody>
                        </TooltipCard>
                    </div>
                </Portal>
            )}
        </Fragment>
    );
}

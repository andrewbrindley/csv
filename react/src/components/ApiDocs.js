import React from 'react';
import styled from 'styled-components';
import { Card, SectionTitle, CodeBadge } from '../styles';
import { API_BASE } from '../config';

const IframeContainer = styled.div`
  width: 100%;
  height: calc(100vh - 200px);
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  overflow: hidden;
  background: white;
`;

const StyledIframe = styled.iframe`
  width: 100%;
  height: 100%;
  border: none;
`;

export default function ApiDocs({ tenantId }) {
    // Assuming the Flask backend Swagger UI is served at /api/docs
    // We need to use the base URL from API_BASE but strip off any trailing /api/v1 
    // since flasgger usually serves at the root /api/docs

    // Extract the host from API_BASE
    const urlObj = new URL(API_BASE, window.location.origin);
    const swaggerUrl = `${urlObj.origin}/apidocs`;

    return (
        <div style={{ padding: 20, height: '100%', display: 'flex', flexDirection: 'column' }}>
            <Card style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                <SectionTitle>API Documentation</SectionTitle>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                    <p style={{ color: "#64748b", margin: 0 }}>
                        Interactive REST API documentation. Use the API Keys tab to generate a key for authentication.
                        Your current Tenant ID is:
                    </p>
                    <CodeBadge style={{ fontSize: '14px', padding: '4px 8px', marginBottom: 0, fontWeight: 'bold' }}>
                        {tenantId}
                    </CodeBadge>
                    <button
                        onClick={() => { navigator.clipboard.writeText(tenantId); alert("Tenant ID copied!"); }}
                        style={{ background: 'none', border: 'none', color: '#2563eb', cursor: 'pointer', fontSize: '13px', padding: 0, textDecoration: 'underline' }}
                    >
                        Copy
                    </button>
                </div>
                <IframeContainer>
                    <StyledIframe
                        src={swaggerUrl}
                        title="Swagger API Documentation"
                    />
                </IframeContainer>
            </Card>
        </div>
    );
}

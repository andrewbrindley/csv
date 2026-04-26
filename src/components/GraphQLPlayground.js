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

const DEFAULT_QUERY = `# Welcome to ingestr's GraphQL playground.
# The schema is built dynamically from your tenant's templates.
# Hit the Play button or Cmd/Ctrl + Enter to run.

{
  people {
    id
    firstName
    surname
    email
  }
  bookings {
    bookingRef
    personNumber
    locationName
  }
}
`;

export default function GraphQLPlayground({ tenantId }) {
    // Extract the host from API_BASE
    const urlObj = new URL(API_BASE, window.location.origin);

    // The GraphiQL interface needs the tenantId in the URL to contextually load the schema.
    // We also seed a default query via ?query=... so the editor isn't empty on load.
    const graphqlUrl =
        `${urlObj.origin}/graphql?tenantId=${encodeURIComponent(tenantId)}` +
        `&query=${encodeURIComponent(DEFAULT_QUERY)}`;

    return (
        <div style={{ padding: 20, height: '100%', display: 'flex', flexDirection: 'column' }}>
            <Card style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                <SectionTitle>GraphQL Playground</SectionTitle>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                    <p style={{ color: "#64748b", margin: 0 }}>
                        Interactive GraphiQL playground. Explore your Graph schema and run queries.
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
                        src={graphqlUrl}
                        title="GraphQL Playground"
                    />
                </IframeContainer>
            </Card>
        </div>
    );
}
